import { describe, expect, it } from "vitest";
import { startExpeditionCommand } from "../../src/application/commands/start-expedition";
import {
  SettlementService,
  settleDueActivitiesCommand,
} from "../../src/application/services/settlement-service";
import { GameSession } from "../../src/application/services/game-session";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import type { ExpeditionActivity } from "../../src/domain/activity/activity";
import { createNewGame } from "../../src/domain/guild/new-game";
import { asBrandedId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { FakeClock } from "../helpers/runtime-fakes";

const content = loadBrowserContentRegistry();
const dungeonId = asBrandedId<"DungeonId">("ragefire_chasm");

function newState(seed = "settlement-test") {
  return createNewGame({
    slotId: asBrandedId<"SaveSlotId">("slot_1"),
    content,
    contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
    clock: new FakeClock(1_000),
    ids: new LocalIdGenerator(),
    random: new SeededRandomSource(seed),
  });
}

async function startExpedition(
  state = newState(),
  participantIds = Object.values(state.members).map((member) => member.id),
  requestedRuns = 1,
  startedAt = 2_000,
): Promise<ExpeditionActivity> {
  const created = await startExpeditionCommand(
    { content, clock: new FakeClock(startedAt) },
    { dungeonId, participantIds, requestedRuns },
  ).execute(state);
  return state.activities[created.id] as ExpeditionActivity;
}

function forceAll(activity: ExpeditionActivity, outcome: "victory" | "defeat"): void {
  for (const stage of activity.runPlans.flatMap((run) => run.stages)) {
    stage.probability = 0.5;
    stage.successRoll = outcome === "victory" ? 0 : 0.99;
  }
}

describe("expedition settlement", () => {
  it("settles one boss at a time and never rewards the same node twice", async () => {
    const state = newState();
    const activity = await startExpedition(state);
    forceAll(activity, "victory");
    const service = new SettlementService(content);
    const fundsBefore = state.guild.funds;
    const experienceBefore = Object.values(state.members).map(
      (member) => member.progression.experience,
    );

    const first = service.settleDueActivities(state, activity.nextSettlementAt);

    expect(first.settled).toHaveLength(1);
    expect(first.settled[0]).toMatchObject({
      activityId: activity.id,
      encounterId: "oggleflint",
      outcome: "victory",
    });
    expect(activity.runPlans[0]!.stages[0]!.status).toBe("victory");
    const firstReport = activity.runPlans[0]!.stages[0]!.report!;
    expect(first.settled[0]!.reportId).toBe(firstReport.id);
    expect(firstReport.outcome).toBe("victory");
    expect(firstReport.rewards.funds).toBe(10);
    expect(firstReport.rewards.firstKillBonus).toBe(20);
    expect(firstReport.rewards.itemInstanceIds).toEqual(first.settled[0]!.itemInstanceIds);
    expect(activity.activeEncounterIndex).toBe(1);
    expect(state.guild.funds).toBe(fundsBefore + 10 + 20);
    expect(Object.values(state.pendingLoot)).toHaveLength(1);
    expect(Object.values(state.itemInstances)).toHaveLength(86);
    expect(
      Object.values(state.members).some(
        (member, index) => member.progression.experience > experienceBefore[index]!,
      ),
    ).toBe(true);

    const rewardSnapshot = {
      funds: state.guild.funds,
      loot: structuredClone(state.pendingLoot),
      items: structuredClone(state.itemInstances),
      victories: structuredClone(state.history.encounterVictoryCounts),
      report: structuredClone(firstReport),
    };
    expect(service.settleDueActivities(state, first.settled[0]!.settledAt).settled).toEqual([]);
    expect(state.guild.funds).toBe(rewardSnapshot.funds);
    expect(state.pendingLoot).toEqual(rewardSnapshot.loot);
    expect(state.itemInstances).toEqual(rewardSnapshot.items);
    expect(state.history.encounterVictoryCounts).toEqual(rewardSnapshot.victories);
    expect(activity.runPlans[0]!.stages[0]!.report).toEqual(rewardSnapshot.report);
  });

  it("keeps earlier boss experience, funds, and loot when the party wipes later", async () => {
    const state = newState();
    const activity = await startExpedition(state);
    forceAll(activity, "victory");
    activity.runPlans[0]!.stages[1]!.successRoll = 0.99;
    const service = new SettlementService(content);

    service.settleDueActivities(state, activity.nextSettlementAt);
    const afterFirstBoss = {
      funds: state.guild.funds,
      pendingLootCount: Object.values(state.pendingLoot).length,
      experience: Object.values(state.members).map((member) => ({
        level: member.progression.level,
        experience: member.progression.experience,
      })),
    };
    const wipe = service.settleDueActivities(state, activity.nextSettlementAt);

    expect(wipe.settled).toHaveLength(1);
    expect(wipe.settled[0]!.outcome).toBe("defeat");
    const wipeReport = activity.runPlans[0]!.stages[1]!.report!;
    expect(wipe.settled[0]!.reportId).toBe(wipeReport.id);
    expect(wipeReport.rewards).toEqual({
      experienceFractionByMember: {},
      funds: 0,
      firstKillBonus: 0,
      itemInstanceIds: [],
    });
    expect(wipeReport.members.some((member) => member.defeated)).toBe(true);
    expect(activity.status).toBe("failed");
    expect(state.guild.funds).toBe(afterFirstBoss.funds);
    expect(Object.values(state.pendingLoot)).toHaveLength(afterFirstBoss.pendingLootCount);
    expect(
      Object.values(state.members).map((member) => ({
        level: member.progression.level,
        experience: member.progression.experience,
      })),
    ).toEqual(afterFirstBoss.experience);
    expect(Object.values(state.members).every((member) => !member.activeActivityId)).toBe(true);
    expect(state.history.failedActivityCount).toBe(1);
  });

  it("catches up every overdue stage after reload and guarantees loot for every victory", async () => {
    const state = newState("offline-catch-up");
    const activity = await startExpedition(state, undefined, 2);
    forceAll(activity, "victory");
    const saves = new MemorySaveRepository();
    await saves.create(state);
    const restored = await GameSession.load(saves, state.slotId);
    if (!restored) throw new Error("Expected restored session");

    const result = await restored.execute(
      settleDueActivitiesCommand({ content, clock: new FakeClock(24 * 60 * 60 * 1_000) }),
    );

    expect(result.status).toBe("committed");
    if (result.status !== "committed") throw new Error("Expected committed settlement");
    expect(result.result.settled).toHaveLength(8);
    const settledState = restored.snapshot();
    const settledActivity = settledState.activities[activity.id] as ExpeditionActivity;
    expect(settledActivity.status).toBe("completed");
    expect(settledActivity.completedRuns).toBe(2);
    expect(Object.values(settledState.pendingLoot)).toHaveLength(8);
    expect(result.result.settled.every((event) => event.itemInstanceIds.length >= 1)).toBe(true);
    expect(
      settledActivity.runPlans
        .flatMap((run) => run.stages)
        .every((stage) => stage.report?.outcome === "victory"),
    ).toBe(true);
    expect(settledState.guild.funds).toBe(340);
    expect(Object.values(settledState.members).every((member) => !member.activeActivityId)).toBe(
      true,
    );
    expect(settledState.history.completedActivityCount).toBe(1);
    expect(settledState.history.completedExpeditionCount).toBe(1);

    const lootIds = Object.keys(settledState.pendingLoot);
    await restored.execute(
      settleDueActivitiesCommand({ content, clock: new FakeClock(24 * 60 * 60 * 1_000) }),
    );
    expect(Object.keys(restored.snapshot().pendingLoot)).toEqual(lootIds);
  });

  it("settles multiple teams with equal deadlines in stable activity-ID order", async () => {
    const state = newState("parallel-order");
    const members = Object.values(state.members);
    const first = await startExpedition(state, [members[0]!.id]);
    const second = await startExpedition(state, [members[1]!.id]);
    forceAll(first, "defeat");
    forceAll(second, "defeat");
    first.nextSettlementAt = 10_000;
    second.nextSettlementAt = 10_000;

    const summary = new SettlementService(content).settleDueActivities(state, 10_000);

    expect(summary.settled.map((event) => event.activityId)).toEqual(
      [first.id, second.id].sort((left, right) => left.localeCompare(right)),
    );
    expect(summary.settled.every((event) => event.outcome === "defeat")).toBe(true);
    expect(members[0]!.activeActivityId).toBeUndefined();
    expect(members[1]!.activeActivityId).toBeUndefined();
  });

  it("records each pending item as unbound loot eligible only to that activity's party", async () => {
    const state = newState();
    const participant = Object.values(state.members)[0]!;
    const activity = await startExpedition(state, [participant.id]);
    forceAll(activity, "victory");

    new SettlementService(content).settleDueActivities(state, activity.nextSettlementAt);

    const pending = Object.values(state.pendingLoot)[0]!;
    const item = state.itemInstances[pending.itemInstanceId]!;
    expect(pending.sourceActivityId).toBe(activity.id);
    expect(pending.eligibleMemberIds).toEqual([participant.id]);
    expect(item.bound).toBe(false);
    expect(item.ownerMemberId).toBeUndefined();
    expect(item.source).toMatchObject({
      type: "encounter",
      activityId: activity.id,
      dungeonId,
      encounterId: "oggleflint",
    });
  });
});
