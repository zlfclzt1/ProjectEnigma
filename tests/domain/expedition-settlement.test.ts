import { describe, expect, it } from "vitest";
import { startExpeditionCommand } from "../../src/application/commands/start-expedition";
import {
  SettlementService,
  settleDueActivitiesCommand,
} from "../../src/application/services/settlement-service";
import { GameSession } from "../../src/application/services/game-session";
import { browserContentModules, loadBrowserContentRegistry } from "../../src/content/manifest";
import { loadContentRegistry, type ContentRegistry } from "../../src/content/registry";
import type { ExpeditionActivity } from "../../src/domain/activity/activity";
import { createNewGame } from "../../src/domain/guild/new-game";
import { asBrandedId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { FakeClock } from "../helpers/runtime-fakes";

const content = loadBrowserContentRegistry();
const dungeonId = asBrandedId<"DungeonId">("ragefire_chasm");

function newState(seed = "settlement-test", registry: ContentRegistry = content) {
  return createNewGame({
    slotId: asBrandedId<"SaveSlotId">("slot_1"),
    content: registry,
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
  registry: ContentRegistry = content,
): Promise<ExpeditionActivity> {
  const created = await startExpeditionCommand(
    { content: registry, clock: new FakeClock(startedAt) },
    { dungeonId, participantIds, requestedRuns },
  ).execute(state);
  return state.activities[created.id] as ExpeditionActivity;
}

function contentWithoutRagefireLoot(): ContentRegistry {
  const modules = structuredClone(browserContentModules) as Record<string, unknown>;
  const key = Object.keys(modules).find((path) =>
    path.endsWith("/content/encounters/ragefire-chasm.json"),
  );
  if (!key) throw new Error("Expected ragefire encounter content");
  const file = modules[key] as { encounters: Array<{ lootTableId?: string }> };
  for (const encounter of file.encounters) delete encounter.lootTableId;
  return loadContentRegistry(modules);
}

function contentWithRagefireDropCount(count: number): ContentRegistry {
  const modules = structuredClone(browserContentModules) as Record<string, unknown>;
  const key = Object.keys(modules).find((path) =>
    path.endsWith("/content/loot-tables/ragefire-chasm.json"),
  );
  if (!key) throw new Error("Expected ragefire loot content");
  const file = modules[key] as {
    lootTables: Array<{ id: string; guaranteedEquipmentDrops: number }>;
  };
  const table = file.lootTables.find((entry) => entry.id === "taragaman_the_hungerer");
  if (!table) throw new Error("Expected Taragaman equipment table");
  table.guaranteedEquipmentDrops = count;
  return loadContentRegistry(modules);
}

function contentWithRareTaragaman(spawnProbability: number): ContentRegistry {
  const modules = structuredClone(browserContentModules) as Record<string, unknown>;
  const key = Object.keys(modules).find((path) =>
    path.endsWith("/content/dungeons/ragefire-chasm.json"),
  );
  if (!key) throw new Error("Expected ragefire dungeon content");
  const route = (
    modules[key] as {
      dungeons: Array<{
        route: Array<{
          id: string;
          type: "required" | "rare";
          encounterId: string;
          spawnProbability?: number;
        }>;
      }>;
    }
  ).dungeons[0]!.route;
  const index = route.findIndex((node) => node.encounterId === "taragaman_the_hungerer");
  const [taragaman] = route.splice(index, 1);
  route.push({
    ...taragaman!,
    type: "rare",
    spawnProbability,
  });
  return loadContentRegistry(modules);
}

function forceAll(activity: ExpeditionActivity, outcome: "victory" | "defeat"): void {
  for (const stage of activity.runPlans.flatMap((run) => run.stages)) {
    stage.probability = 0.5;
    stage.successRoll = outcome === "victory" ? 0 : 0.99;
  }
}

describe("expedition settlement", () => {
  it("skips absent rare nodes without rewards and settles spawned rare loot normally", async () => {
    const absentContent = contentWithRareTaragaman(0);
    const absentState = newState("absent-rare", absentContent);
    const absentActivity = await startExpedition(
      absentState,
      Object.values(absentState.members).map((member) => member.id),
      1,
      2_000,
      absentContent,
    );
    forceAll(absentActivity, "victory");
    const absentFundsBefore = absentState.guild.funds;
    const absent = new SettlementService(absentContent).settleDueActivities(
      absentState,
      Number.MAX_SAFE_INTEGER,
    );
    expect(absentActivity.runPlans[0]!.stages.map((stage) => stage.encounterId)).not.toContain(
      "taragaman_the_hungerer",
    );
    expect(absent.settled).toHaveLength(3);
    expect(absentState.guild.firstKillEncounterIds).not.toContain("taragaman_the_hungerer");
    expect(absentState.guild.funds - absentFundsBefore).toBe(135);

    const spawnedContent = contentWithRareTaragaman(1);
    const spawnedState = newState("spawned-rare", spawnedContent);
    const spawnedActivity = await startExpedition(
      spawnedState,
      Object.values(spawnedState.members).map((member) => member.id),
      1,
      2_000,
      spawnedContent,
    );
    forceAll(spawnedActivity, "victory");
    const spawned = new SettlementService(spawnedContent).settleDueActivities(
      spawnedState,
      Number.MAX_SAFE_INTEGER,
    );
    const rare = spawned.settled.find((result) => result.encounterId === "taragaman_the_hungerer")!;
    expect(rare.itemInstanceIds).toHaveLength(1);
    expect(spawnedActivity.runPlans[0]!.stages.at(-1)).toMatchObject({
      encounterId: "taragaman_the_hungerer",
      routeNodeType: "rare",
      status: "victory",
      report: { outcome: "victory" },
    });
  });

  it("keeps required-route completion when a spawned rare Boss wipes the party", async () => {
    const rareContent = contentWithRareTaragaman(1);
    const state = newState("rare-wipe", rareContent);
    const activity = await startExpedition(
      state,
      Object.values(state.members).map((member) => member.id),
      1,
      2_000,
      rareContent,
    );
    forceAll(activity, "victory");
    activity.runPlans[0]!.stages.at(-1)!.successRoll = 0.99;

    new SettlementService(rareContent).settleDueActivities(state, Number.MAX_SAFE_INTEGER);

    expect(activity.status).toBe("failed");
    expect(activity.runPlans[0]!.mainRouteCompleted).toBe(true);
    expect(state.history.dungeonClearCounts[dungeonId]).toBe(1);
    expect(
      state.history.encounterVictoryCounts[asBrandedId<"EncounterId">("taragaman_the_hungerer")],
    ).toBeUndefined();
  });
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
    expect(first.settled[0]!.itemInstanceIds).toEqual([]);
    expect(Object.values(state.pendingLoot)).toHaveLength(0);
    expect(Object.values(state.itemInstances)).toHaveLength(85);
    const second = service.settleDueActivities(state, activity.nextSettlementAt);
    expect(second.settled[0]).toMatchObject({
      encounterId: "taragaman_the_hungerer",
      outcome: "victory",
    });
    expect(Object.values(state.pendingLoot)).toHaveLength(1);
    const acquiredInstance = state.itemInstances[second.settled[0]!.itemInstanceIds[0]!]!;
    expect(state.collection.items[acquiredInstance.definitionId]).toEqual({
      acquisitionCount: 1,
      seenRandomSuffixIds: acquiredInstance.randomSuffixId ? [acquiredInstance.randomSuffixId] : [],
    });
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
      collection: structuredClone(state.collection),
    };
    expect(service.settleDueActivities(state, first.settled[0]!.settledAt).settled).toEqual([]);
    expect(state.guild.funds).toBe(rewardSnapshot.funds);
    expect(state.pendingLoot).toEqual(rewardSnapshot.loot);
    expect(state.itemInstances).toEqual(rewardSnapshot.items);
    expect(state.history.encounterVictoryCounts).toEqual(rewardSnapshot.victories);
    expect(activity.runPlans[0]!.stages[0]!.report).toEqual(rewardSnapshot.report);
    expect(state.collection).toEqual(rewardSnapshot.collection);
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
    expect(state.history.dungeonClearCounts[dungeonId] ?? 0).toBe(0);
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
    expect(Object.values(settledState.pendingLoot)).toHaveLength(4);
    expect(
      result.result.settled
        .filter((event) => event.itemInstanceIds.length > 0)
        .map((event) => event.encounterId),
    ).toEqual([
      "taragaman_the_hungerer",
      "jergosh_the_invoker",
      "taragaman_the_hungerer",
      "jergosh_the_invoker",
    ]);
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
    expect(settledState.history.dungeonClearCounts[dungeonId]).toBe(2);

    const lootIds = Object.keys(settledState.pendingLoot);
    await restored.execute(
      settleDueActivitiesCommand({ content, clock: new FakeClock(24 * 60 * 60 * 1_000) }),
    );
    expect(Object.keys(restored.snapshot().pendingLoot)).toEqual(lootIds);
    expect(restored.snapshot().history.dungeonClearCounts[dungeonId]).toBe(2);
  });

  it("settles victorious bosses without equipment loot while preserving all other rewards", async () => {
    const noLootContent = contentWithoutRagefireLoot();
    const state = newState("no-equipment-loot", noLootContent);
    const members = Object.values(state.members);
    const initialItemCount = Object.values(state.itemInstances).length;
    const initialFunds = state.guild.funds;
    const initialProgress = members.map(
      (member) => member.progression.level + member.progression.experience,
    );
    const activity = await startExpedition(
      state,
      members.map((member) => member.id),
      1,
      2_000,
      noLootContent,
    );
    forceAll(activity, "victory");

    const summary = new SettlementService(noLootContent).settleDueActivities(
      state,
      Number.MAX_SAFE_INTEGER,
    );

    expect(activity.status).toBe("completed");
    expect(summary.settled).toHaveLength(4);
    expect(summary.settled.every((event) => event.outcome === "victory")).toBe(true);
    expect(summary.settled.every((event) => event.itemInstanceIds.length === 0)).toBe(true);
    expect(Object.values(state.itemInstances)).toHaveLength(initialItemCount);
    expect(Object.values(state.pendingLoot)).toHaveLength(0);
    expect(state.collection.items).toEqual({});
    expect(state.guild.funds).toBeGreaterThan(initialFunds);
    expect(
      members.every(
        (member, index) =>
          member.progression.level + member.progression.experience > initialProgress[index]!,
      ),
    ).toBe(true);
    expect(state.guild.firstKillEncounterIds).toEqual(
      noLootContent.dungeonById.get(dungeonId)!.route.map((node) => node.encounterId),
    );
    expect(state.history.dungeonClearCounts[dungeonId]).toBe(1);
    expect(
      activity.runPlans[0]!.stages.every(
        (stage) => stage.report?.rewards.itemInstanceIds.length === 0,
      ),
    ).toBe(true);
  });

  it("settles every guaranteed equipment drop from a multi-drop table", async () => {
    const multiDropContent = contentWithRagefireDropCount(2);
    const state = newState("multi-equipment-loot", multiDropContent);
    const activity = await startExpedition(
      state,
      Object.values(state.members).map((member) => member.id),
      1,
      2_000,
      multiDropContent,
    );
    forceAll(activity, "victory");

    const result = new SettlementService(multiDropContent).settleDueActivities(
      state,
      Number.MAX_SAFE_INTEGER,
    );

    const taragaman = result.settled.find(
      (event) => event.encounterId === "taragaman_the_hungerer",
    )!;
    expect(taragaman.itemInstanceIds).toHaveLength(2);
    expect(Object.values(state.pendingLoot)).toHaveLength(3);
    expect(activity.runPlans[0]!.stages[1]!.report?.rewards.itemInstanceIds).toEqual(
      taragaman.itemInstanceIds,
    );
  });

  it("keeps completed run counts when a later repeated run wipes", async () => {
    const state = newState("clear-count-before-wipe");
    const activity = await startExpedition(state, undefined, 2);
    forceAll(activity, "victory");
    activity.runPlans[1]!.stages[0]!.successRoll = 0.99;

    new SettlementService(content).settleDueActivities(state, 24 * 60 * 60 * 1_000);

    expect(activity.status).toBe("failed");
    expect(activity.completedRuns).toBe(1);
    expect(state.history.dungeonClearCounts[dungeonId]).toBe(1);
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

    new SettlementService(content).settleDueActivities(state, Number.MAX_SAFE_INTEGER);

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
      encounterId: "taragaman_the_hungerer",
    });
  });
});
