import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { ActivityRegistry } from "../../src/domain/activity/activity-registry";
import { ActivityScheduler } from "../../src/domain/activity/activity-scheduler";
import type { ExpeditionActivity } from "../../src/domain/activity/activity";
import {
  createExpeditionActivityHandler,
  type StartExpeditionRequest,
} from "../../src/domain/dungeon/expedition-activity";
import { evaluateExpeditionParty } from "../../src/domain/dungeon/party-evaluation";
import { createNewGame } from "../../src/domain/guild/new-game";
import { asBrandedId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { FakeClock } from "../helpers/runtime-fakes";

const content = loadBrowserContentRegistry();

function previewAtLevel(dungeonId: (typeof content.dungeons)[number]["id"], level: number) {
  const state = createNewGame({
    slotId: asBrandedId<"SaveSlotId">(`duration_${dungeonId}_${level}`),
    content,
    contentVersion: asBrandedId<"ContentVersion">("classic-2019-phase-6"),
    clock: new FakeClock(1_000),
    ids: new LocalIdGenerator(),
    random: new SeededRandomSource(`duration:${dungeonId}:${level}`),
  });
  for (const member of Object.values(state.members)) member.progression.level = level;
  const result = evaluateExpeditionParty(
    state,
    content,
    dungeonId,
    Object.values(state.members).map((member) => member.id),
  );
  if (!result.ok) throw new Error(result.issues.map((issue) => issue.message).join(" "));
  return result.preview;
}

describe("overlevel dungeon durations", () => {
  it("shortens every low-level dungeon without crossing its configured floor", () => {
    const lowLevelDungeons = content.dungeons.filter((dungeon) => dungeon.recommendedLevel <= 34);
    expect(lowLevelDungeons.length).toBeGreaterThanOrEqual(6);

    for (const dungeon of lowLevelDungeons) {
      const recommended = previewAtLevel(dungeon.id, dungeon.recommendedLevel);
      const maxLevel = previewAtLevel(dungeon.id, 45);
      const requiredStageSeconds = dungeon.route
        .filter((node) => node.type === "required")
        .reduce((sum, node) => sum + content.encounterById.get(node.encounterId)!.stageSeconds, 0);

      expect(maxLevel.durationSeconds, dungeon.id).toBeLessThan(recommended.durationSeconds * 0.8);
      expect(maxLevel.durationSeconds, dungeon.id).toBeGreaterThanOrEqual(
        Math.max(requiredStageSeconds, dungeon.duration.baseSeconds) *
          dungeon.duration.minimumRatio,
      );
    }
  });

  it("freezes the same stage durations used by preview into the activity plan", async () => {
    const dungeon = content.dungeonById.get(asBrandedId<"DungeonId">("deadmines"))!;
    const state = createNewGame({
      slotId: asBrandedId<"SaveSlotId">("duration_snapshot"),
      content,
      contentVersion: asBrandedId<"ContentVersion">("classic-2019-phase-6"),
      clock: new FakeClock(1_000),
      ids: new LocalIdGenerator(),
      random: new SeededRandomSource("duration-snapshot"),
    });
    for (const member of Object.values(state.members)) member.progression.level = 45;
    const memberIds = Object.values(state.members).map((member) => member.id);
    const preview = evaluateExpeditionParty(state, content, dungeon.id, memberIds);
    if (!preview.ok) throw new Error("Expected a valid duration preview");

    const registry = new ActivityRegistry();
    registry.register(createExpeditionActivityHandler(content));
    const scheduler = new ActivityScheduler(registry);
    state.guild.unlockedDungeonIds.push(dungeon.id);
    const result = scheduler.start<StartExpeditionRequest, ExpeditionActivity>(
      state,
      {
        type: "expedition",
        dungeonId: dungeon.id,
        participantIds: memberIds,
        requestedRuns: 1,
      },
      2_000,
      { ids: new LocalIdGenerator(), random: new SeededRandomSource("duration-start") },
    );
    if (result.status === "rejected") throw new Error("Expected expedition to start");

    expect(result.activity.runPlans[0]!.stages.map((stage) => stage.durationSeconds)).toEqual(
      preview.preview.encounters.map((encounter) => encounter.durationSeconds),
    );
  });
});
