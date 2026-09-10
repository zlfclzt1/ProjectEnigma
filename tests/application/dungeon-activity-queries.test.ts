import { describe, expect, it } from "vitest";
import { getActivitiesView } from "../../src/application/queries/get-activities-view";
import { getDungeonPlanningView } from "../../src/application/queries/get-dungeons-view";
import { browserContentModules, loadBrowserContentRegistry } from "../../src/content/manifest";
import { loadContentRegistry } from "../../src/content/registry";
import { createExpeditionActivityHandler } from "../../src/domain/dungeon/expedition-activity";
import { ActivityRegistry } from "../../src/domain/activity/activity-registry";
import { ActivityScheduler } from "../../src/domain/activity/activity-scheduler";
import type { ExpeditionActivity } from "../../src/domain/activity/activity";
import type { StartExpeditionRequest } from "../../src/domain/dungeon/expedition-activity";
import { createNewGame } from "../../src/domain/guild/new-game";
import { asBrandedId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { FakeClock } from "../helpers/runtime-fakes";

const content = loadBrowserContentRegistry();

function state() {
  return createNewGame({
    slotId: asBrandedId<"SaveSlotId">("dungeon-query"),
    content,
    contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
    clock: new FakeClock(1_000),
    ids: new LocalIdGenerator(),
    random: new SeededRandomSource("dungeon-query"),
  });
}

function contentWithMechanic(mechanicId: string, minimumValue = 99) {
  const modules = structuredClone(browserContentModules) as Record<string, unknown>;
  const encounterKey = Object.keys(modules).find((path) =>
    path.endsWith("/content/encounters/ragefire-chasm.json"),
  )!;
  const mechanicKey = Object.keys(modules).find((path) =>
    path.endsWith("/content/mechanics/classic.json"),
  )!;
  const encounters = (modules[encounterKey] as { encounters: Array<{ mechanicIds: string[] }> })
    .encounters;
  encounters[0]!.mechanicIds = [mechanicId];
  const mechanics = (
    modules[mechanicKey] as {
      mechanics: Array<{ id: string; requirements: Array<{ minimumValue: number }> }>;
    }
  ).mechanics;
  mechanics.find((mechanic) => mechanic.id === mechanicId)!.requirements[0]!.minimumValue =
    minimumValue;
  return loadContentRegistry(modules);
}

describe("dungeon and activity queries", () => {
  it("projects four dungeons, filter metadata, and exact party probabilities", () => {
    const game = state();
    const memberIds = Object.values(game.members).map((member) => member.id);
    const view = getDungeonPlanningView(
      game,
      content,
      asBrandedId<"DungeonId">("ragefire_chasm"),
      memberIds,
      2,
    );

    expect(view.dungeons).toHaveLength(4);
    expect(view.classOptions).toHaveLength(9);
    expect(view.roleOptions.map((role) => role.id)).toEqual(["tank", "healer", "dps"]);
    expect(view.selectedDungeon).toMatchObject({
      id: "ragefire_chasm",
      unlocked: true,
      maximumMembers: 5,
      encounterCount: 4,
      clearCount: 0,
    });
    expect(view.preview?.encounters).toHaveLength(4);
    expect(view.preview?.clearProbability).toBeGreaterThan(0);
    expect(view.preview?.clearProbability).toBeLessThanOrEqual(1);
    expect(view.preview?.encounters.every((boss) => boss.probability > 0)).toBe(true);
    expect(view.canStart).toBe(true);
  });

  it("projects route progress without exposing the mutable activity", () => {
    const game = state();
    const memberIds = Object.values(game.members).map((member) => member.id);
    const registry = new ActivityRegistry();
    registry.register(createExpeditionActivityHandler(content));
    const scheduler = new ActivityScheduler(registry);
    const started = scheduler.start<StartExpeditionRequest, ExpeditionActivity>(
      game,
      {
        type: "expedition",
        dungeonId: asBrandedId<"DungeonId">("ragefire_chasm"),
        participantIds: memberIds,
        requestedRuns: 1,
      },
      1_000,
      { ids: new LocalIdGenerator(game.ids), random: new SeededRandomSource("activity-view") },
    );
    expect(started.status).toBe("started");
    if (started.status !== "started") throw new Error("Expected expedition to start");

    const halfway =
      started.activity.nextSettlementAt -
      started.activity.runPlans[0]!.stages[0]!.durationSeconds * 500;
    const view = getActivitiesView(game, content, halfway);

    expect(view.active).toHaveLength(1);
    expect(view.active[0]).toMatchObject({
      dungeonName: "怒焰裂谷",
      participantCount: 5,
      currentRunNumber: 1,
      statusLabel: "进行中",
    });
    expect(view.active[0]!.route[0]?.status).toBe("active");
    expect(view.active[0]!.progressPercent).toBeGreaterThan(0);
    expect(view.active[0]).not.toHaveProperty("partySnapshot");
    expect(view.active[0]).not.toHaveProperty("runPlans");
  });

  it("explains soft mechanic penalties and hard Boss blockers", () => {
    const softContent = contentWithMechanic("test_recommended_magic_dispel");
    const softState = createNewGame({
      slotId: asBrandedId<"SaveSlotId">("soft-mechanic-query"),
      content: softContent,
      contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
      clock: new FakeClock(1_000),
      ids: new LocalIdGenerator(),
      random: new SeededRandomSource("soft-mechanic-query"),
    });
    const softView = getDungeonPlanningView(
      softState,
      softContent,
      asBrandedId<"DungeonId">("ragefire_chasm"),
      Object.values(softState.members).map((member) => member.id),
      1,
    );
    expect(softView.canStart).toBe(true);
    expect(softView.mechanicReadiness[0]).toMatchObject({
      encounterName: "奥格弗林特",
      name: "建议驱散魔法",
      type: "recommended",
      status: "missing",
      impactLabels: ["治疗压力 +15%", "胜率 -5 个百分点", "耗时 +5%"],
    });

    const hardContent = contentWithMechanic("test_required_interrupt");
    const hardState = createNewGame({
      slotId: asBrandedId<"SaveSlotId">("hard-mechanic-query"),
      content: hardContent,
      contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
      clock: new FakeClock(1_000),
      ids: new LocalIdGenerator(),
      random: new SeededRandomSource("hard-mechanic-query"),
    });
    const hardView = getDungeonPlanningView(
      hardState,
      hardContent,
      asBrandedId<"DungeonId">("ragefire_chasm"),
      Object.values(hardState.members).map((member) => member.id),
      1,
    );
    expect(hardView.canStart).toBe(false);
    expect(hardView.preview).toBeNull();
    expect(hardView.mechanicReadiness[0]).toMatchObject({
      encounterName: "奥格弗林特",
      name: "必须打断",
      type: "required",
      status: "missing",
    });
  });
});
