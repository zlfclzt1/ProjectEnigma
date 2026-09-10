import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import {
  buildExpeditionDevelopmentSnapshot,
  getDungeonDevelopmentSummary,
  rewardEncounterAssignments,
} from "../../src/domain/dungeon/dungeon-development";
import { createNewGame } from "../../src/domain/guild/new-game";
import { asBrandedId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { FakeClock } from "../helpers/runtime-fakes";

const content = loadBrowserContentRegistry();
const dungeonId = asBrandedId<"DungeonId">("ragefire_chasm");

function state() {
  return createNewGame({
    slotId: asBrandedId<"SaveSlotId">("dungeon-development"),
    content,
    contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
    clock: new FakeClock(1_000),
    ids: new LocalIdGenerator(),
    random: new SeededRandomSource("dungeon-development"),
  });
}

describe("dungeon development", () => {
  it("derives five per-dungeon levels and permanent bonuses from completed commissions", () => {
    const game = state();
    const satchelId = asBrandedId<"QuestId">("rfc_returning_lost_satchel");
    const powerId = asBrandedId<"QuestId">("rfc_power_to_destroy");
    expect(getDungeonDevelopmentSummary(game, content, dungeonId)).toMatchObject({
      level: 0,
      points: 0,
      totalPoints: 4,
      experienceMultiplier: 1,
      extraLootChance: 0,
    });

    game.dungeonDevelopment.entries[satchelId] = {
      questId: satchelId,
      status: "completed",
      discoveredAt: 1_500,
      completedAt: 2_000,
      completionEncounterId: asBrandedId<"EncounterId">("oggleflint"),
      encounterVictoryIds: [asBrandedId<"EncounterId">("oggleflint")],
    };
    game.dungeonDevelopment.entries[powerId] = {
      questId: powerId,
      status: "completed",
      discoveredAt: 2_000,
      completedAt: 3_000,
      completionEncounterId: asBrandedId<"EncounterId">("bazzalan"),
      encounterVictoryIds: [],
    };

    expect(getDungeonDevelopmentSummary(game, content, dungeonId)).toMatchObject({
      level: 5,
      points: 4,
      totalPoints: 4,
      experienceMultiplier: 1.2,
      extraLootChance: 0.15,
    });
  });

  it("assigns single-Boss and full-clear rewards to their permanent Boss pools", () => {
    const satchel = content.questById.get(asBrandedId<"QuestId">("rfc_returning_lost_satchel"))!;
    const power = content.questById.get(asBrandedId<"QuestId">("rfc_power_to_destroy"))!;

    expect([...rewardEncounterAssignments(satchel, content)]).toEqual([
      ["oggleflint", ["15452", "15453"]],
    ]);
    expect([...rewardEncounterAssignments(power, content)]).toEqual([
      ["bazzalan", ["15449", "15450", "15451"]],
    ]);
  });

  it("freezes bonuses and unlocked reward pools when an expedition departs", () => {
    const game = state();
    const members = Object.values(game.members).map((member) => member.id);
    const route = content.dungeonById.get(dungeonId)!.route;
    const first = buildExpeditionDevelopmentSnapshot(
      game,
      content,
      dungeonId,
      members,
      route.filter((node) => node.type === "required").map((node) => node.encounterId),
      [],
    );
    const satchelId = asBrandedId<"QuestId">("rfc_returning_lost_satchel");
    game.dungeonDevelopment.entries[satchelId] = {
      questId: satchelId,
      status: "completed",
      discoveredAt: 1_500,
      completedAt: 2_000,
      completionEncounterId: asBrandedId<"EncounterId">("oggleflint"),
      encounterVictoryIds: [asBrandedId<"EncounterId">("oggleflint")],
    };
    const second = buildExpeditionDevelopmentSnapshot(
      game,
      content,
      dungeonId,
      members,
      route.filter((node) => node.type === "required").map((node) => node.encounterId),
      [],
    );

    expect(first.level).toBe(0);
    expect(first.unlockedItemIdsByEncounter).toEqual({});
    expect(second.level).toBeGreaterThan(0);
    expect(second.unlockedItemIdsByEncounter[asBrandedId<"EncounterId">("oggleflint")]).toEqual([
      "15452",
      "15453",
    ]);
  });
});
