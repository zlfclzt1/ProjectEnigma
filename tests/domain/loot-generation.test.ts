import { describe, expect, it } from "vitest";
import { browserContentModules, loadBrowserContentRegistry } from "../../src/content/manifest";
import { loadContentRegistry, type ContentRegistry } from "../../src/content/registry";
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
    const content = loadBrowserContentRegistry();
    const activity = createExpeditionActivityFixture();
    const stage = activity.runPlans[0]!.stages[0]!;
    stage.lootSeed = "loot-2";

    const single = generateGuaranteedLoot(
      activity,
      stage,
      lootTable(1),
      content,
      10_000,
      new LocalIdGenerator(),
    );
    const multi = generateGuaranteedLoot(
      activity,
      stage,
      lootTable(2),
      content,
      10_000,
      new LocalIdGenerator(),
    );
    const repeated = generateGuaranteedLoot(
      activity,
      stage,
      lootTable(2),
      content,
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

  it("rolls item suffixes deterministically per drop and leaves items without pools untouched", () => {
    const suffixContent = contentWithTwoPrototypeSuffixes();
    const activity = createExpeditionActivityFixture();
    const stage = activity.runPlans[0]!.stages[0]!;
    stage.lootSeed = "suffix-seed-3";
    const table: LootTable = {
      id: asBrandedId<"LootTableId">("suffix_test_loot"),
      guaranteedEquipmentDrops: 2,
      items: [{ itemId: asBrandedId<"ItemDefinitionId">("15452"), weight: 1 }],
    };

    const first = generateGuaranteedLoot(
      activity,
      stage,
      table,
      suffixContent,
      10_000,
      new LocalIdGenerator(),
    );
    const repeated = generateGuaranteedLoot(
      activity,
      stage,
      table,
      suffixContent,
      10_000,
      new LocalIdGenerator(),
    );
    const withoutPool = generateGuaranteedLoot(
      activity,
      stage,
      table,
      loadBrowserContentRegistry(),
      10_000,
      new LocalIdGenerator(),
    );

    expect(first).toEqual(repeated);
    expect(first.map((drop) => drop.instance.randomSuffixId)).toEqual([
      "prototype_of_readiness",
      "prototype_of_focus",
    ]);
    expect(withoutPool.every((drop) => drop.instance.randomSuffixId === undefined)).toBe(true);
    expect(withoutPool.map((drop) => drop.instance.definitionId)).toEqual(
      first.map((drop) => drop.instance.definitionId),
    );
  });
});

function contentWithTwoPrototypeSuffixes(): ContentRegistry {
  const modules = structuredClone(browserContentModules) as Record<string, unknown>;
  const itemKey = Object.keys(modules).find((path) =>
    path.endsWith("/content/items/ragefire-chasm.json"),
  );
  const suffixKey = Object.keys(modules).find((path) =>
    path.endsWith("/content/item-suffixes/prototype.json"),
  );
  if (!itemKey || !suffixKey) throw new Error("Expected suffix test content");
  const itemFile = modules[itemKey] as {
    items: Array<{ id: string; randomSuffixIds?: string[] }>;
  };
  const suffixFile = modules[suffixKey] as {
    itemSuffixes: Array<{
      id: string;
      nameTemplate: { zhCN: string; enUS?: string };
      relativeWeight: number;
    }>;
  };
  const item = itemFile.items.find((entry) => entry.id === "15452");
  const sourceSuffix = suffixFile.itemSuffixes[0];
  if (!item || !sourceSuffix) throw new Error("Expected prototype suffix and test item");
  suffixFile.itemSuffixes.push({
    ...structuredClone(sourceSuffix),
    id: "prototype_of_focus",
    nameTemplate: { zhCN: "专注之{base}", enUS: "{base} of Focus" },
  });
  item.randomSuffixIds = ["prototype_of_readiness", "prototype_of_focus"];
  return loadContentRegistry(modules);
}
