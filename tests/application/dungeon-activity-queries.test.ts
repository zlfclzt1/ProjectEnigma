import { describe, expect, it } from "vitest";
import { getActivitiesView } from "../../src/application/queries/get-activities-view";
import { getDungeonPlanningView } from "../../src/application/queries/get-dungeons-view";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
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
});
