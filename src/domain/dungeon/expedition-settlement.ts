import type { IdGenerator } from "../../application/ports/id-generator";
import type { ContentRegistry } from "../../content/registry";
import type { ActivityScheduler } from "../activity/activity-scheduler";
import type { ExpeditionActivity, ExpeditionEncounterPlan } from "../activity/activity";
import type { ItemInstance } from "../equipment/item-instance";
import type { GameStateV2 } from "../game-state";
import type { MemberId } from "../shared/ids";
import { experienceFractions } from "./expedition-activity";
import { generateGuaranteedLoot } from "./loot-generation";

export type ExpeditionSettlementResult =
  | {
      readonly status: "settled";
      readonly activityId: ExpeditionActivity["id"];
      readonly encounterId: ExpeditionEncounterPlan["encounterId"];
      readonly outcome: "victory" | "defeat";
      readonly settledAt: number;
      readonly itemInstanceIds: readonly ItemInstance["id"][];
    }
  | {
      readonly status: "not-due" | "not-active" | "invalid-stage";
      readonly activityId: ExpeditionActivity["id"];
    };

export function settleNextExpeditionStage(
  state: GameStateV2,
  content: ContentRegistry,
  scheduler: ActivityScheduler,
  activity: ExpeditionActivity,
  now: number,
  ids: IdGenerator,
): ExpeditionSettlementResult {
  if (activity.status !== "active") return { status: "not-active", activityId: activity.id };
  if (activity.nextSettlementAt > now) return { status: "not-due", activityId: activity.id };
  const run = activity.runPlans[activity.activeRunIndex];
  const stage = run?.stages[activity.activeEncounterIndex];
  if (!run || !stage || stage.status !== "pending") {
    return { status: "invalid-stage", activityId: activity.id };
  }
  const encounter = content.encounterById.get(stage.encounterId);
  const dungeon = content.dungeonById.get(activity.dungeonId);
  if (!encounter || !dungeon || encounter.dungeonId !== activity.dungeonId) {
    throw new Error(`副本活动 ${activity.id} 引用了不存在或不匹配的内容。`);
  }

  const settledAt = activity.nextSettlementAt;
  if (stage.successRoll >= stage.probability) {
    stage.status = "defeat";
    stage.settledAt = settledAt;
    scheduler.finish(state, activity.id, "failed", settledAt);
    return {
      status: "settled",
      activityId: activity.id,
      encounterId: encounter.id,
      outcome: "defeat",
      settledAt,
      itemInstanceIds: [],
    };
  }

  const lootTable = content.lootTableById.get(encounter.lootTableId);
  if (!lootTable) throw new Error(`首领 ${encounter.id} 缺少掉落表。`);
  const generatedLoot = generateGuaranteedLoot(activity, stage, lootTable, settledAt, ids);

  stage.status = "victory";
  stage.settledAt = settledAt;
  applyEncounterExperience(state, activity, encounter.experienceShare);
  const firstKill = !state.guild.firstKillEncounterIds.includes(encounter.id);
  state.guild.funds += encounter.funds + (firstKill ? encounter.firstKillBonus : 0);
  if (firstKill) state.guild.firstKillEncounterIds.push(encounter.id);
  state.history.encounterVictoryCounts[encounter.id] =
    (state.history.encounterVictoryCounts[encounter.id] ?? 0) + 1;
  for (const { instance, pending } of generatedLoot) {
    state.itemInstances[instance.id] = instance;
    state.pendingLoot[pending.id] = pending;
  }
  unlockEligibleDungeons(state, content);

  advanceAfterVictory(state, content, scheduler, activity, settledAt);
  return {
    status: "settled",
    activityId: activity.id,
    encounterId: encounter.id,
    outcome: "victory",
    settledAt,
    itemInstanceIds: generatedLoot.map(({ instance }) => instance.id),
  };
}

function applyEncounterExperience(
  state: GameStateV2,
  activity: ExpeditionActivity,
  experienceShare: number,
): void {
  const run = activity.runPlans[activity.activeRunIndex]!;
  for (const memberId of activity.participantIds) {
    const member = state.members[memberId];
    if (!member) continue;
    applyExperience(member, (run.experienceFractionByMember[memberId] ?? 0) * experienceShare);
  }
}

function applyExperience(member: GameStateV2["members"][MemberId], fraction: number): void {
  if (member.progression.level >= 45 || fraction <= 0) return;
  let experience = member.progression.experience + fraction;
  while (experience >= 1 && member.progression.level < 45) {
    member.progression.level += 1;
    experience -= 1;
  }
  member.progression.experience = member.progression.level >= 45 ? 0 : experience;
}

function advanceAfterVictory(
  state: GameStateV2,
  content: ContentRegistry,
  scheduler: ActivityScheduler,
  activity: ExpeditionActivity,
  settledAt: number,
): void {
  const run = activity.runPlans[activity.activeRunIndex]!;
  const nextStage = run.stages[activity.activeEncounterIndex + 1];
  if (nextStage) {
    activity.activeEncounterIndex += 1;
    activity.nextSettlementAt = settledAt + nextStage.durationSeconds * 1_000;
    return;
  }

  activity.completedRuns += 1;
  const nextRun = activity.runPlans[activity.activeRunIndex + 1];
  if (!nextRun) {
    scheduler.finish(state, activity.id, "completed", settledAt);
    return;
  }

  activity.activeRunIndex += 1;
  activity.activeEncounterIndex = 0;
  nextRun.experienceFractionByMember = experienceFractions(
    state,
    content,
    activity.dungeonId,
    activity.participantIds,
  );
  activity.nextSettlementAt = settledAt + nextRun.stages[0]!.durationSeconds * 1_000;
}

function unlockEligibleDungeons(state: GameStateV2, content: ContentRegistry): void {
  const unlocked = new Set(state.guild.unlockedDungeonIds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const dungeon of content.dungeons) {
      if (unlocked.has(dungeon.id)) continue;
      const levelReady = Object.values(state.members).some(
        (member) => member.progression.level >= dungeon.minimumLevel,
      );
      const required = dungeon.unlock?.requiredDungeonIds ?? [];
      const requiredAny = dungeon.unlock?.requiredAnyDungeonIds ?? [];
      const requiredReady = required.every((id) => dungeonCleared(state, content, id));
      const requiredAnyReady =
        requiredAny.length === 0 || requiredAny.some((id) => dungeonCleared(state, content, id));
      if (dungeon.defaultUnlocked || (levelReady && requiredReady && requiredAnyReady)) {
        unlocked.add(dungeon.id);
        changed = true;
      }
    }
  }
  state.guild.unlockedDungeonIds = [...unlocked];
}

function dungeonCleared(
  state: GameStateV2,
  content: ContentRegistry,
  dungeonId: ExpeditionActivity["dungeonId"],
): boolean {
  const dungeon = content.dungeonById.get(dungeonId);
  return Boolean(
    dungeon?.route.every((encounterId) => state.guild.firstKillEncounterIds.includes(encounterId)),
  );
}
