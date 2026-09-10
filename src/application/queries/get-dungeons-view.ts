import type { ContentRegistry } from "../../content/registry";
import type { GameState } from "../../domain/game-state";
import { averageEquippedItemLevel } from "../../domain/equipment/item-level";
import type { DungeonId, MemberId } from "../../domain/shared/ids";
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
  readonly preview: PartyPreviewView | null;
  readonly issues: readonly string[];
  readonly canStart: boolean;
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

  if (!selectedDungeon) issues.push("没有可用的副本内容。");
  else {
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
    if (!Number.isInteger(requestedRuns) || requestedRuns < 1 || requestedRuns > 3) {
      issues.push("连续副本次数必须为 1–3 次。");
    }

    if (selectedMemberIds.length > 0 && !selectedMembers.some((member) => !member)) {
      const result = getPartyPreview(state, content, selectedDungeon.id, selectedMemberIds);
      if (result.ok) {
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
        };
      } else issues.push(...result.issues.map((issue) => issue.message));
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
    preview,
    issues: [...new Set(issues)],
    canStart: issues.length === 0 && preview !== null,
  };
}
