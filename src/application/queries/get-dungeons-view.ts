import type { ContentRegistry } from "../../content/registry";
import type { GameState } from "../../domain/game-state";
import { averageEquippedItemLevel } from "../../domain/equipment/item-level";
import type {
  DungeonId,
  DungeonRouteNodeId,
  DungeonRouteVariantId,
  GuildUpgradeId,
  ItemDefinitionId,
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
import {
  DEFAULT_DUNGEON_EXPERIENCE_CONFIG,
  projectExpeditionExperience,
} from "../../domain/dungeon/expedition-activity";
import { getMemberLevelCap } from "../../domain/member/member-level-cap";
import {
  getDungeonDevelopmentSummary,
  unlockedDevelopmentItemsByEncounter,
} from "../../domain/dungeon/dungeon-development";
import type { ItemInstance } from "../../domain/equipment/item-instance";
import { asBrandedId } from "../../domain/shared/ids";
import { evaluateUpgrade } from "../../domain/equipment/upgrade-evaluation";
import { equipmentSellValue } from "../../domain/equipment/item-value";

export interface DungeonOptionView {
  readonly id: DungeonId;
  readonly name: string;
  readonly minimumLevel: number;
  readonly recommendedLevel: number;
  readonly minimumMembers: number;
  readonly maximumMembers: number;
  readonly recommendedMembers: number;
  readonly recommendedRoleCounts: {
    readonly tank: number;
    readonly healer: number;
    readonly dps: number;
  };
  readonly baseDurationSeconds: number;
  readonly encounterCount: number;
  readonly clearCount: number;
  readonly unlocked: boolean;
  readonly unlockHint: string;
  readonly partyPreview: DungeonPartyPreviewSummary | null;
}

export interface DungeonPartyPreviewSummary {
  readonly clearProbability: number | null;
  readonly durationSeconds: number | null;
  readonly message: string;
}

export interface DungeonRouteSelectionInput {
  readonly optionalNodeIds: readonly DungeonRouteNodeId[];
  readonly routeVariantId: DungeonRouteVariantId | null;
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
  readonly levelCap: number;
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
  readonly experience: readonly {
    readonly memberId: MemberId;
    readonly memberName: string;
    readonly currentLevel: number;
    readonly experienceFraction: number;
    readonly boostMultiplier: number;
    readonly projectedLevel: number;
    readonly projectedExperience: number;
  }[];
  readonly yields: {
    readonly experienceLevelsPerHour: number;
    readonly saleValuePerHour: number;
    readonly upgradeChancePerHour: number;
    readonly recommendedItem: {
      readonly id: ItemDefinitionId;
      readonly name: string;
      readonly itemLevel: number;
      readonly bossNames: readonly string[];
    } | null;
    readonly rewardPool: readonly {
      readonly id: ItemDefinitionId;
      readonly name: string;
      readonly itemLevel: number;
      readonly bossNames: readonly string[];
    }[];
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

export interface DungeonRouteVariantView {
  readonly id: DungeonRouteVariantId;
  readonly name: string;
  readonly description: string;
  readonly selected: boolean;
  readonly completionReward?: {
    readonly guaranteedEquipmentDrops: number;
    readonly itemCount: number;
    readonly itemNames: readonly string[];
  };
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
  readonly selectedRouteVariantId: DungeonRouteVariantId | null;
  readonly routeVariants: readonly DungeonRouteVariantView[];
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

function dungeonPartyPreview(
  state: GameState,
  content: ContentRegistry,
  dungeon: ContentRegistry["dungeons"][number],
  selectedMemberIds: readonly MemberId[],
  routeSelection?: DungeonRouteSelectionInput,
): DungeonPartyPreviewSummary | null {
  if (selectedMemberIds.length === 0) return null;
  if (selectedMemberIds.length < dungeon.members.minimum) {
    return {
      clearProbability: null,
      durationSeconds: null,
      message: `人数不足，还需 ${dungeon.members.minimum - selectedMemberIds.length} 人`,
    };
  }
  if (selectedMemberIds.length > dungeon.members.maximum) {
    return {
      clearProbability: null,
      durationSeconds: null,
      message: `人数超限，需减少 ${selectedMemberIds.length - dungeon.members.maximum} 人`,
    };
  }
  const result = getPartyPreview(
    state,
    content,
    dungeon.id,
    selectedMemberIds,
    routeSelection?.optionalNodeIds ?? [],
    [],
    routeSelection?.routeVariantId ?? dungeon.routeVariants?.[0]?.id,
  );
  if (!result.ok) {
    return {
      clearProbability: null,
      durationSeconds: null,
      message: result.issues.some((issue) => issue.code === "mechanic.required-missing")
        ? "缺少关键机制"
        : (result.issues[0]?.message ?? "无法生成预览"),
    };
  }
  return {
    clearProbability: result.preview.clearProbability,
    durationSeconds: result.preview.durationSeconds,
    message: "标准路线，不含可选首领",
  };
}

function dungeonOptions(
  state: GameState,
  content: ContentRegistry,
  selectedMemberIds: readonly MemberId[],
  routeSelections: Readonly<Record<string, DungeonRouteSelectionInput>> = {},
): DungeonOptionView[] {
  return content.dungeons
    .map((dungeon) => ({
      id: dungeon.id,
      name: dungeon.name.zhCN,
      minimumLevel: dungeon.minimumLevel,
      recommendedLevel: dungeon.recommendedLevel,
      minimumMembers: dungeon.members.minimum,
      maximumMembers: dungeon.members.maximum,
      recommendedMembers: dungeon.members.recommended,
      recommendedRoleCounts: dungeon.members.recommendedRoles ?? {
        tank: 1,
        healer: 1,
        dps: Math.max(0, dungeon.members.recommended - 2),
      },
      baseDurationSeconds: dungeon.duration.baseSeconds,
      encounterCount: dungeon.route.length,
      clearCount: state.history.dungeonClearCounts[dungeon.id] ?? 0,
      unlocked: state.guild.unlockedDungeonIds.includes(dungeon.id),
      unlockHint: unlockHint(state, content, dungeon),
      partyPreview: dungeonPartyPreview(
        state,
        content,
        dungeon,
        selectedMemberIds,
        routeSelections[dungeon.id],
      ),
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
  routeVariantId: DungeonRouteVariantId | null = null,
  routeSelections: Readonly<Record<string, DungeonRouteSelectionInput>> = {},
): DungeonPlanningView {
  const dungeons = dungeonOptions(state, content, selectedMemberIds, routeSelections);
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
  const questRouteWarnings: QuestRouteWarningView[] = [];
  let routeVariants: DungeonRouteVariantView[] = [];
  let selectedRouteVariantId: DungeonRouteVariantId | null = null;
  const maximumRuns = getExpeditionRunCapacity(state, content);
  const nextRunUpgrade = getNextGuildUpgrade(state, content, EXPEDITION_RUN_CAPACITY_TRACK_ID);
  const runUpgradeEligibility = nextRunUpgrade ? evaluateGuildUpgrade(state, nextRunUpgrade) : null;

  if (!selectedDungeon) issues.push("没有可用的副本内容。");
  else {
    const dungeonDefinition = content.dungeonById.get(selectedDungeon.id)!;
    selectedRouteVariantId =
      dungeonDefinition.routeVariants?.find((variant) => variant.id === routeVariantId)?.id ??
      dungeonDefinition.routeVariants?.[0]?.id ??
      null;
    routeVariants = (dungeonDefinition.routeVariants ?? []).map((variant) => ({
      id: variant.id,
      name: variant.name.zhCN,
      description: variant.description.zhCN,
      selected: variant.id === selectedRouteVariantId,
      ...(variant.completionReward
        ? {
            completionReward: (() => {
              const table = content.lootTableById.get(variant.completionReward.lootTableId)!;
              return {
                guaranteedEquipmentDrops: table.guaranteedEquipmentDrops,
                itemCount: table.items.length,
                itemNames: table.items.map(
                  ({ itemId }) => content.itemById.get(itemId)?.name.zhCN ?? itemId,
                ),
              };
            })(),
          }
        : {}),
    }));
    const selectedOptionalIds = new Set(selectedOptionalNodeIds);
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
        [],
        selectedRouteVariantId ?? undefined,
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
            [],
            selectedRouteVariantId ?? undefined,
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
          selectedRouteVariantId ?? undefined,
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
        const development = getDungeonDevelopmentSummary(state, content, selectedDungeon.id);
        const experience = projectExpeditionExperience(
          state,
          content,
          selectedDungeon.id,
          selectedMemberIds,
          result.preview.encounters.reduce(
            (sum, encounter) =>
              sum + (content.encounterById.get(encounter.encounterId)?.experienceShare ?? 0),
            0,
          ),
          requestedRuns,
          DEFAULT_DUNGEON_EXPERIENCE_CONFIG,
          development.experienceMultiplier,
        ).map((projection) => {
          const member = state.members[projection.memberId]!;
          return {
            ...projection,
            memberName: member.identity.name,
            currentLevel: member.progression.level,
          };
        });
        preview = {
          formulaVersion: result.preview.formulaVersion,
          levelCap: getMemberLevelCap(state, content),
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
          experience,
          yields: projectYieldPreview(
            state,
            content,
            selectedDungeon.id,
            selectedMemberIds,
            result.preview.encounters,
            result.preview.durationSeconds,
            requestedRuns,
            result.preview.clearProbability,
            experience.reduce((sum, member) => sum + member.experienceFraction, 0),
            development.extraLootChance,
            dungeonDefinition.routeVariants?.find(
              (variant) => variant.id === selectedRouteVariantId,
            ),
          ),
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
    selectedRouteVariantId,
    routeVariants,
    optionalRoutes,
    rareRoutes,
    preview,
    mechanicReadiness,
    issues: [...new Set(issues)],
    canStart: issues.length === 0 && preview !== null,
  };
}

function projectYieldPreview(
  state: GameState,
  content: ContentRegistry,
  dungeonId: DungeonId,
  memberIds: readonly MemberId[],
  encounters: readonly { readonly encounterId: string; readonly probability: number }[],
  durationSeconds: number,
  requestedRuns: number,
  clearProbability: number,
  totalProjectedExperience: number,
  extraLootChance: number,
  routeVariant:
    NonNullable<ContentRegistry["dungeons"][number]["routeVariants"]>[number] | undefined,
): PartyPreviewView["yields"] {
  const unlocked = unlockedDevelopmentItemsByEncounter(state, content, dungeonId);
  const rewardSources = new Map<
    ItemDefinitionId,
    { readonly score: number; readonly bossNames: Set<string> }
  >();
  let expectedSaleValuePerRun = 0;
  let noUpgradePerRun = 1;
  for (const preview of encounters) {
    const encounter = content.encounterById.get(
      preview.encounterId as ContentRegistry["encounters"][number]["id"],
    );
    if (!encounter) continue;
    const table = encounter.lootTableId
      ? content.lootTableById.get(encounter.lootTableId)
      : undefined;
    const baseItems = table?.items ?? [];
    const unlockedWeight =
      baseItems.length > 0
        ? baseItems.reduce((sum, entry) => sum + entry.weight, 0) / baseItems.length
        : 1;
    const pool = [
      ...baseItems,
      ...(unlocked[encounter.id] ?? [])
        .filter((itemId) => !baseItems.some((entry) => entry.itemId === itemId))
        .map((itemId) => ({ itemId, weight: unlockedWeight })),
    ];
    if (pool.length === 0) continue;
    const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let upgradeWeight = 0;
    let averageSaleValue = 0;
    for (const entry of pool) {
      const definition = content.itemById.get(entry.itemId);
      if (!definition) continue;
      const score = previewItemScore(state, content, memberIds, entry.itemId);
      if (score > 0) upgradeWeight += entry.weight;
      averageSaleValue += equipmentSellValue(definition) * (entry.weight / totalWeight);
      const source = rewardSources.get(entry.itemId) ?? { score, bossNames: new Set<string>() };
      source.bossNames.add(encounter.name.zhCN);
      rewardSources.set(entry.itemId, source);
    }
    const dropCount = (table?.guaranteedEquipmentDrops ?? 1) + extraLootChance;
    expectedSaleValuePerRun += preview.probability * averageSaleValue * dropCount;
    const upgradePerDrop = upgradeWeight / totalWeight;
    const encounterUpgradeChance =
      preview.probability * (1 - Math.pow(1 - upgradePerDrop, dropCount));
    noUpgradePerRun *= 1 - encounterUpgradeChance;
  }
  if (routeVariant?.completionReward) {
    const table = content.lootTableById.get(routeVariant.completionReward.lootTableId)!;
    const totalWeight = table.items.reduce((sum, entry) => sum + entry.weight, 0);
    let upgradeWeight = 0;
    let averageSaleValue = 0;
    for (const entry of table.items) {
      const definition = content.itemById.get(entry.itemId);
      if (!definition) continue;
      const score = previewItemScore(state, content, memberIds, entry.itemId);
      if (score > 0) upgradeWeight += entry.weight;
      averageSaleValue += equipmentSellValue(definition) * (entry.weight / totalWeight);
      const source = rewardSources.get(entry.itemId) ?? { score, bossNames: new Set<string>() };
      source.bossNames.add(routeVariant.name.zhCN + "完成奖励");
      rewardSources.set(entry.itemId, source);
    }
    expectedSaleValuePerRun += clearProbability * averageSaleValue * table.guaranteedEquipmentDrops;
    const upgradePerDrop = upgradeWeight / totalWeight;
    const routeUpgradeChance =
      clearProbability * (1 - Math.pow(1 - upgradePerDrop, table.guaranteedEquipmentDrops));
    noUpgradePerRun *= 1 - routeUpgradeChance;
  }
  const rewardPool = [...rewardSources.entries()]
    .map(([itemId, entry]) => {
      const item = content.itemById.get(itemId)!;
      return {
        id: itemId,
        name: item.name.zhCN,
        itemLevel: item.itemLevel,
        bossNames: [...entry.bossNames],
        score: entry.score,
      };
    })
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));
  const runSeconds = Math.max(1, durationSeconds);
  const runsPerHour = 3_600 / runSeconds;
  const upgradeChancePerRun = 1 - noUpgradePerRun;
  const recommended = rewardPool[0];
  return {
    experienceLevelsPerHour:
      (totalProjectedExperience / Math.max(1, requestedRuns)) * runsPerHour * clearProbability,
    saleValuePerHour: expectedSaleValuePerRun * runsPerHour,
    upgradeChancePerHour: 1 - Math.pow(1 - upgradeChancePerRun, runsPerHour),
    recommendedItem: recommended
      ? {
          id: recommended.id,
          name: recommended.name,
          itemLevel: recommended.itemLevel,
          bossNames: recommended.bossNames,
        }
      : null,
    rewardPool: rewardPool.map((item) => ({
      id: item.id,
      name: item.name,
      itemLevel: item.itemLevel,
      bossNames: item.bossNames,
    })),
  };
}

function previewItemScore(
  state: GameState,
  content: ContentRegistry,
  memberIds: readonly MemberId[],
  itemId: ItemDefinitionId,
): number {
  const synthetic: ItemInstance = {
    id: asBrandedId<"ItemInstanceId">(`yield-preview:${itemId}`),
    definitionId: itemId,
    bound: false,
    acquiredAt: state.updatedAt,
    source: { type: "grant", reasonId: "yield-preview" },
    enchantmentIds: [],
  };
  let best = 0;
  for (const memberId of memberIds) {
    const member = state.members[memberId];
    if (!member) continue;
    let evaluation;
    try {
      evaluation = evaluateUpgrade(member, synthetic, state, content);
    } catch {
      continue;
    }
    if (evaluation.equippable && evaluation.primaryResponsibilityDelta > 1e-9) {
      best = Math.max(best, evaluation.recommendationScore);
    }
  }
  return best;
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
