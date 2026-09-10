import type { ContentRegistry } from "../../content/registry";
import type { GameState } from "../../domain/game-state";
import { averageEquippedItemLevel } from "../../domain/equipment/item-level";
import type {
  DungeonId,
  DungeonRouteNodeId,
  GuildUpgradeId,
  MemberId,
  QuestId,
} from "../../domain/shared/ids";
import {
  evaluateGuildUpgrade,
  EXPEDITION_RUN_CAPACITY_TRACK_ID,
  getExpeditionRunCapacity,
  getNextGuildUpgrade,
} from "../../domain/guild/guild-upgrade-rules";
import { getPartyPreview } from "./get-party-preview";

export interface DungeonOptionView {
  readonly id: DungeonId;
  readonly name: string;
  readonly minimumLevel: number;
  readonly recommendedLevel: number;
  readonly minimumMembers: number;
  readonly maximumMembers: number;
  readonly recommendedMembers: number;
  readonly baseDurationSeconds: number;
  readonly encounterCount: number;
  readonly clearCount: number;
  readonly unlocked: boolean;
  readonly unlockHint: string;
}

export interface PartyMemberOptionView {
  readonly id: MemberId;
  readonly name: string;
  readonly level: number;
  readonly itemLevel: number;
  readonly classId: GameState["members"][MemberId]["identity"]["classId"];
  readonly className: string;
  readonly specName: string;
  readonly role: "tank" | "healer" | "dps";
  readonly roleName: string;
  readonly active: boolean;
  readonly activeActivityId?: string;
}

export interface PartyEncounterPreviewView {
  readonly id: string;
  readonly name: string;
  readonly probability: number;
  readonly durationSeconds: number;
  readonly tankRatio: number;
  readonly healingRatio: number;
  readonly damageRatio: number;
}

export interface PartyMechanicRequirementView {
  readonly capabilityName: string;
  readonly currentValue: number;
  readonly minimumValue: number;
  readonly satisfied: boolean;
}

export interface PartyMechanicReadinessView {
  readonly id: string;
  readonly encounterId: string;
  readonly encounterName: string;
  readonly name: string;
  readonly description: string;
  readonly type: "required" | "recommended";
  readonly status: "satisfied" | "partial" | "missing";
  readonly requirements: readonly PartyMechanicRequirementView[];
  readonly impactLabels: readonly string[];
}

export interface PartyPreviewView {
  readonly formulaVersion: string;
  readonly contribution: {
    readonly tank: number;
    readonly healing: number;
    readonly damage: number;
  };
  readonly encounters: readonly PartyEncounterPreviewView[];
  readonly clearProbability: number;
  readonly durationSeconds: number;
  readonly durationRange: {
    readonly minimumSeconds: number;
    readonly maximumSeconds: number;
  };
}

export interface OptionalRouteNodeView {
  readonly id: DungeonRouteNodeId;
  readonly encounterId: string;
  readonly name: string;
  readonly description: string;
  readonly selected: boolean;
  readonly probability: number | null;
  readonly durationSeconds: number | null;
  readonly lootItemCount: number;
}

export interface RareRouteNodeView {
  readonly id: DungeonRouteNodeId;
  readonly encounterId: string;
  readonly name: string;
  readonly spawnProbability: number;
  readonly conditionalProbability: number | null;
  readonly durationSeconds: number | null;
  readonly lootItemCount: number;
}

export interface ExpeditionRunCapacityUpgradeView {
  readonly id: GuildUpgradeId;
  readonly name: string;
  readonly description: string;
  readonly cost: number;
  readonly targetCapacity: number;
  readonly requirements: readonly {
    readonly label: string;
    readonly current: number;
    readonly target: number;
    readonly met: boolean;
  }[];
  readonly fundsAvailable: boolean;
  readonly canPurchase: boolean;
  readonly blockedReasons: readonly string[];
}

export interface QuestRouteWarningView {
  readonly memberId: MemberId;
  readonly memberName: string;
  readonly questId: QuestId;
  readonly questName: string;
  readonly optionalNodeIds: readonly DungeonRouteNodeId[];
  readonly bossNames: readonly string[];
  readonly message: string;
}

export interface DungeonPlanningView {
  readonly dungeons: readonly DungeonOptionView[];
  readonly selectedDungeon: DungeonOptionView | null;
  readonly members: readonly PartyMemberOptionView[];
  readonly classOptions: readonly {
    readonly id: PartyMemberOptionView["classId"];
    readonly name: string;
  }[];
  readonly roleOptions: readonly {
    readonly id: PartyMemberOptionView["role"];
    readonly name: string;
  }[];
  readonly selectedMemberIds: readonly MemberId[];
  readonly requestedRuns: number;
  readonly maximumRuns: number;
  readonly runCapacityUpgrade: ExpeditionRunCapacityUpgradeView | null;
  readonly questRouteWarnings: readonly QuestRouteWarningView[];
  readonly selectedOptionalNodeIds: readonly DungeonRouteNodeId[];
  readonly optionalRoutes: readonly OptionalRouteNodeView[];
  readonly rareRoutes: readonly RareRouteNodeView[];
  readonly preview: PartyPreviewView | null;
  readonly mechanicReadiness: readonly PartyMechanicReadinessView[];
  readonly issues: readonly string[];
  readonly canStart: boolean;
}

function lootItemCount(content: ContentRegistry, encounterId: string): number {
  return (
    content.getLootTableForEncounter(encounterId as ContentRegistry["encounters"][number]["id"])
      ?.items.length ?? 0
  );
}

function effectLabels(
  effects: NonNullable<ContentRegistry["mechanics"][number]["missingEffects"]> | undefined,
): string[] {
  if (!effects) return [];
  const labels: string[] = [];
  if (effects.tankMultiplier)
    labels.push(`坦克压力 +${Math.round((effects.tankMultiplier - 1) * 100)}%`);
  if (effects.healingMultiplier)
    labels.push(`治疗压力 +${Math.round((effects.healingMultiplier - 1) * 100)}%`);
  if (effects.damageMultiplier)
    labels.push(`输出需求 +${Math.round((effects.damageMultiplier - 1) * 100)}%`);
  if (effects.probabilityModifier)
    labels.push(`胜率 ${Math.round(effects.probabilityModifier * 100)} 个百分点`);
  if (effects.durationMultiplier)
    labels.push(`耗时 +${Math.round((effects.durationMultiplier - 1) * 100)}%`);
  return labels;
}

function mechanicView(
  content: ContentRegistry,
  encounterId: string,
  result: import("../../domain/dungeon/mechanic-evaluation").EncounterMechanicResult,
): PartyMechanicReadinessView {
  const encounter = content.encounterById.get(
    encounterId as ContentRegistry["encounters"][number]["id"],
  )!;
  const mechanic = content.mechanicById.get(result.mechanicId)!;
  const satisfiedCount = result.requirements.filter((entry) => entry.satisfied).length;
  return {
    id: result.mechanicId,
    encounterId,
    encounterName: encounter.name.zhCN,
    name: mechanic.name.zhCN,
    description: mechanic.description.zhCN,
    type: result.type,
    status: result.satisfied ? "satisfied" : satisfiedCount > 0 ? "partial" : "missing",
    requirements: result.requirements.map((requirement) => ({
      capabilityName:
        content.capabilityById.get(requirement.capabilityId)?.name.zhCN ?? requirement.capabilityId,
      currentValue: requirement.currentValue,
      minimumValue: requirement.minimumValue,
      satisfied: requirement.satisfied,
    })),
    impactLabels: effectLabels(result.appliedEffects),
  };
}

function unlockHint(
  state: GameState,
  content: ContentRegistry,
  dungeon: ContentRegistry["dungeons"][number],
): string {
  if (state.guild.unlockedDungeonIds.includes(dungeon.id)) return "已解锁";
  const required = dungeon.unlock?.requiredDungeonIds ?? [];
  const requiredAny = dungeon.unlock?.requiredAnyDungeonIds ?? [];
  const names = [...required, ...requiredAny].map(
    (id) => content.dungeonById.get(id)?.name.zhCN ?? id,
  );
  if (names.length === 0) return `需要至少一名 ${dungeon.minimumLevel} 级成员`;
  return `${requiredAny.length > 0 ? "通关其中一座" : "完成前置"}：${names.join("、")}`;
}

function dungeonOptions(state: GameState, content: ContentRegistry): DungeonOptionView[] {
  return content.dungeons
    .map((dungeon) => ({
      id: dungeon.id,
      name: dungeon.name.zhCN,
      minimumLevel: dungeon.minimumLevel,
      recommendedLevel: dungeon.recommendedLevel,
      minimumMembers: dungeon.members.minimum,
      maximumMembers: dungeon.members.maximum,
      recommendedMembers: dungeon.members.recommended,
      baseDurationSeconds: dungeon.duration.baseSeconds,
      encounterCount: dungeon.route.length,
      clearCount: state.history.dungeonClearCounts[dungeon.id] ?? 0,
      unlocked: state.guild.unlockedDungeonIds.includes(dungeon.id),
      unlockHint: unlockHint(state, content, dungeon),
    }))
    .sort(
      (left, right) =>
        Number(right.unlocked) - Number(left.unlocked) ||
        left.recommendedLevel - right.recommendedLevel,
    );
}

function partyMembers(state: GameState, content: ContentRegistry): PartyMemberOptionView[] {
  return Object.values(state.members)
    .map((member): PartyMemberOptionView => {
      const spec = content.specById.get(member.progression.specId)!;
      return {
        id: member.id,
        name: member.identity.name,
        level: member.progression.level,
        itemLevel: averageEquippedItemLevel(member, state.itemInstances, content),
        classId: member.identity.classId,
        className: content.classById.get(member.identity.classId)?.name.zhCN ?? "未知职业",
        specName: spec.name.zhCN,
        role: spec.role,
        roleName: content.roleById.get(spec.role)?.name.zhCN ?? spec.role,
        active: member.activeActivityId !== undefined,
        ...(member.activeActivityId ? { activeActivityId: member.activeActivityId } : {}),
      };
    })
    .sort(
      (left, right) =>
        Number(left.active) - Number(right.active) ||
        right.level - left.level ||
        left.name.localeCompare(right.name),
    );
}

export function getDungeonPlanningView(
  state: GameState,
  content: ContentRegistry,
  dungeonId: DungeonId | null,
  selectedMemberIds: readonly MemberId[],
  requestedRuns: number,
  selectedOptionalNodeIds: readonly DungeonRouteNodeId[] = [],
): DungeonPlanningView {
  const dungeons = dungeonOptions(state, content);
  const selectedDungeon =
    dungeons.find((dungeon) => dungeon.id === dungeonId) ??
    dungeons.find((dungeon) => dungeon.unlocked) ??
    dungeons[0] ??
    null;
  const members = partyMembers(state, content);
  const issues: string[] = [];
  let preview: PartyPreviewView | null = null;
  let mechanicReadiness: PartyMechanicReadinessView[] = [];
  let optionalRoutes: OptionalRouteNodeView[] = [];
  let rareRoutes: RareRouteNodeView[] = [];
  let questRouteWarnings: QuestRouteWarningView[] = [];
  const maximumRuns = getExpeditionRunCapacity(state, content);
  const nextRunUpgrade = getNextGuildUpgrade(state, content, EXPEDITION_RUN_CAPACITY_TRACK_ID);
  const runUpgradeEligibility = nextRunUpgrade ? evaluateGuildUpgrade(state, nextRunUpgrade) : null;

  if (!selectedDungeon) issues.push("没有可用的副本内容。");
  else {
    const dungeonDefinition = content.dungeonById.get(selectedDungeon.id)!;
    const selectedOptionalIds = new Set(selectedOptionalNodeIds);
    questRouteWarnings = selectedMemberIds.flatMap((memberId) => {
      const member = state.members[memberId];
      if (!member) return [];
      return Object.values(member.quests.entries).flatMap((progress) => {
        if (!progress || progress.status !== "accepted") return [];
        const quest = content.questById.get(progress.questId);
        if (!quest) return [];
        const encounterIds =
          quest.completion.type === "encounter-victories" ? quest.completion.encounterIds : [];
        if (
          quest.completion.type === "dungeon-clear"
            ? quest.dungeonId !== selectedDungeon.id
            : !encounterIds.some(
                (encounterId) =>
                  content.encounterById.get(encounterId)?.dungeonId === selectedDungeon.id,
              )
        ) {
          return [];
        }
        const missingNodes = dungeonDefinition.route.filter(
          (node) =>
            node.type === "optional" &&
            encounterIds.includes(node.encounterId) &&
            !selectedOptionalIds.has(node.id),
        );
        if (missingNodes.length === 0) return [];
        const bossNames = missingNodes.map(
          (node) => content.encounterById.get(node.encounterId)?.name.zhCN ?? node.encounterId,
        );
        return [
          {
            memberId,
            memberName: member.identity.name,
            questId: quest.id,
            questName: quest.name.zhCN,
            optionalNodeIds: missingNodes.map((node) => node.id),
            bossNames,
            message: `${member.identity.name}的任务“${quest.name.zhCN}”需要挑战可选首领${bossNames.join("、")}。`,
          },
        ];
      });
    });
    optionalRoutes = dungeonDefinition.route.flatMap((node) => {
      if (node.type !== "optional") return [];
      const encounter = content.encounterById.get(node.encounterId)!;
      return [
        {
          id: node.id,
          encounterId: encounter.id,
          name: encounter.name.zhCN,
          description: node.description.zhCN,
          selected: selectedOptionalIds.has(node.id),
          probability: null,
          durationSeconds: null,
          lootItemCount: lootItemCount(content, encounter.id),
        },
      ];
    });
    rareRoutes = dungeonDefinition.route.flatMap((node) => {
      if (node.type !== "rare") return [];
      const encounter = content.encounterById.get(node.encounterId)!;
      return [
        {
          id: node.id,
          encounterId: encounter.id,
          name: encounter.name.zhCN,
          spawnProbability: node.spawnProbability,
          conditionalProbability: null,
          durationSeconds: null,
          lootItemCount: lootItemCount(content, encounter.id),
        },
      ];
    });
    if (!selectedDungeon.unlocked) issues.push(`${selectedDungeon.name}尚未解锁。`);
    if (selectedMemberIds.length < selectedDungeon.minimumMembers) {
      issues.push(`至少选择 ${selectedDungeon.minimumMembers} 名成员。`);
    }
    if (selectedMemberIds.length > selectedDungeon.maximumMembers) {
      issues.push(`最多选择 ${selectedDungeon.maximumMembers} 名成员。`);
    }
    const selectedMembers = selectedMemberIds.map((id) =>
      members.find((member) => member.id === id),
    );
    if (selectedMembers.some((member) => !member)) issues.push("队伍中存在已经离开公会的成员。");
    if (selectedMembers.some((member) => member?.active))
      issues.push("队伍中有成员正在参加其他活动。");
    if (!Number.isInteger(requestedRuns) || requestedRuns < 1 || requestedRuns > maximumRuns) {
      issues.push(`连续副本次数必须为 1–${maximumRuns} 次。`);
    }

    if (selectedMemberIds.length > 0 && !selectedMembers.some((member) => !member)) {
      const result = getPartyPreview(
        state,
        content,
        selectedDungeon.id,
        selectedMemberIds,
        selectedOptionalNodeIds,
      );
      if (result.ok) {
        optionalRoutes = optionalRoutes.map((option) => {
          const optionSelection = option.selected
            ? selectedOptionalNodeIds
            : [...selectedOptionalNodeIds, option.id];
          const optionPreview = getPartyPreview(
            state,
            content,
            selectedDungeon.id,
            selectedMemberIds,
            optionSelection,
          );
          const encounter = optionPreview.ok
            ? optionPreview.preview.encounters.find((entry) => entry.routeNodeId === option.id)
            : undefined;
          return {
            ...option,
            probability: encounter?.probability ?? null,
            durationSeconds: encounter?.durationSeconds ?? null,
          };
        });
        const rareNodeIds = rareRoutes.map((route) => route.id);
        const rarePreview = getPartyPreview(
          state,
          content,
          selectedDungeon.id,
          selectedMemberIds,
          selectedOptionalNodeIds,
          rareNodeIds,
        );
        if (rarePreview.ok) {
          rareRoutes = rareRoutes.map((route) => {
            const encounter = rarePreview.preview.encounters.find(
              (entry) => entry.routeNodeId === route.id,
            );
            return {
              ...route,
              conditionalProbability: encounter?.probability ?? null,
              durationSeconds: encounter?.durationSeconds ?? null,
            };
          });
        }
        mechanicReadiness = result.preview.encounters.flatMap((encounter) =>
          encounter.mechanics.mechanics.map((mechanic) =>
            mechanicView(content, encounter.encounterId, mechanic),
          ),
        );
        preview = {
          formulaVersion: result.preview.formulaVersion,
          contribution: { ...result.preview.contribution },
          encounters: result.preview.encounters.map((encounter) => ({
            id: encounter.encounterId,
            name:
              content.encounterById.get(encounter.encounterId)?.name.zhCN ?? encounter.encounterId,
            probability: encounter.probability,
            durationSeconds: encounter.durationSeconds,
            tankRatio: encounter.rawRatios.tank,
            healingRatio: encounter.rawRatios.healing,
            damageRatio: encounter.rawRatios.damage,
          })),
          clearProbability: result.preview.clearProbability,
          durationSeconds: result.preview.durationSeconds,
          durationRange: {
            minimumSeconds: result.preview.durationSeconds,
            maximumSeconds:
              result.preview.durationSeconds +
              rareRoutes.reduce((sum, route) => sum + (route.durationSeconds ?? 0), 0),
          },
        };
      } else {
        issues.push(...result.issues.map((issue) => issue.message));
        mechanicReadiness = result.issues.flatMap((issue) =>
          issue.encounterId && issue.mechanic
            ? [mechanicView(content, issue.encounterId, issue.mechanic)]
            : [],
        );
      }
    }
  }

  return {
    dungeons,
    selectedDungeon,
    members,
    classOptions: content.classes.map((definition) => ({
      id: definition.id,
      name: definition.name.zhCN,
    })),
    roleOptions: content.roles.map((definition) => ({
      id: definition.id,
      name: definition.name.zhCN,
    })),
    selectedMemberIds: [...selectedMemberIds],
    requestedRuns,
    maximumRuns,
    runCapacityUpgrade:
      nextRunUpgrade && runUpgradeEligibility
        ? projectRunCapacityUpgrade(state, content, nextRunUpgrade, runUpgradeEligibility)
        : null,
    questRouteWarnings,
    selectedOptionalNodeIds: [...selectedOptionalNodeIds],
    optionalRoutes,
    rareRoutes,
    preview,
    mechanicReadiness,
    issues: [...new Set(issues)],
    canStart: issues.length === 0 && preview !== null,
  };
}

function projectRunCapacityUpgrade(
  state: GameState,
  content: ContentRegistry,
  upgrade: ContentRegistry["guildUpgrades"][number],
  eligibility: ReturnType<typeof evaluateGuildUpgrade>,
): ExpeditionRunCapacityUpgradeView {
  const requirements = eligibility.requirements.map(({ requirement, current, target, met }) => {
    const dungeonName =
      content.dungeonById.get(requirement.dungeonId)?.name.zhCN ?? requirement.dungeonId;
    return {
      label: `${dungeonName}完整通关`,
      current,
      target,
      met,
    };
  });
  const blockedReasons = requirements
    .filter((requirement) => !requirement.met)
    .map((requirement) => `${requirement.label} ${requirement.current}/${requirement.target}`);
  if (!eligibility.fundsAvailable) {
    blockedReasons.push(`公会资金还缺 ${upgrade.cost - state.guild.funds} G`);
  }
  return {
    id: upgrade.id,
    name: upgrade.name.zhCN,
    description: upgrade.description.zhCN,
    cost: upgrade.cost,
    targetCapacity:
      upgrade.effects.find((effect) => effect.type === "expedition-run-capacity")?.value ??
      getExpeditionRunCapacity(state, content),
    requirements,
    fundsAvailable: eligibility.fundsAvailable,
    canPurchase: eligibility.canPurchase,
    blockedReasons,
  };
}
