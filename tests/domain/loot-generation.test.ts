import { describe, expect, it } from "vitest";
import type { LootTable } from "../../src/content/schemas/dungeon";
import { generateGuaranteedLoot } from "../../src/domain/dungeon/loot-generation";
import { asBrandedId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { createExpeditionActivityFixture } from "../helpers/game-state-v2-factory";

function lootTable(guaranteedEquipmentDrops: number): LootTable {
  return {
    id: asBrandedId<"LootTableId">("deterministic_test_loot"),
    guaranteedEquipmentDrops,
    items: [
      { itemId: asBrandedId<"ItemDefinitionId">("item_a"), weight: 1 },
      { itemId: asBrandedId<"ItemDefinitionId">("item_b"), weight: 1 },
    ],
  };
}

describe("guaranteed equipment loot generation", () => {
  it("keeps one-drop and multi-drop rolls independent, stable, and reproducible", () => {
    const activity = createExpeditionActivityFixture();
    const stage = activity.runPlans[0]!.stages[0]!;
    stage.lootSeed = "loot-2";

    const single = generateGuaranteedLoot(
      activity,
      stage,
      lootTable(1),
      10_000,
      new LocalIdGenerator(),
    );
    const multi = generateGuaranteedLoot(
      activity,
      stage,
      lootTable(2),
      10_000,
      new LocalIdGenerator(),
    );
    const repeated = generateGuaranteedLoot(
      activity,
      stage,
      lootTable(2),
      10_000,
      new LocalIdGenerator(),
    );

    expect(single).toHaveLength(1);
    expect(multi).toHaveLength(2);
    expect(multi).toEqual(repeated);
    expect(multi[0]!.instance.definitionId).toBe(single[0]!.instance.definitionId);
    expect(multi.map((drop) => drop.instance.definitionId)).toEqual(["item_b", "item_a"]);
    expect(multi.map((drop) => drop.instance.id)).toEqual(["item_1", "item_3"]);
    expect(multi.map((drop) => drop.pending.id)).toEqual(["pending-loot_2", "pending-loot_4"]);
    expect(multi.every((drop) => drop.pending.itemInstanceId === drop.instance.id)).toBe(true);
    expect(multi.every((drop) => drop.pending.eligibleMemberIds !== activity.participantIds)).toBe(
      true,
    );
    expect(multi.map((drop) => drop.pending.eligibleMemberIds)).toEqual([
      activity.participantIds,
      activity.participantIds,
    ]);
  });
});
