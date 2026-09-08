import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  dungeonDefinitionFileSchema,
  encounterDefinitionFileSchema,
  lootTableFileSchema,
  type DungeonDefinition,
  type EncounterDefinition,
  type LootTable,
} from "../../src/content/schemas/dungeon";
import { itemDefinitionFileSchema } from "../../src/content/schemas/item";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const fileNames = [
  "ragefire-chasm.json",
  "wailing-caverns.json",
  "deadmines.json",
  "shadowfang-keep.json",
];

function readJson(relativePath: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, relativePath), "utf8"));
}

const dungeons = fileNames.flatMap(
  (name) => dungeonDefinitionFileSchema.parse(readJson(`content/dungeons/${name}`)).dungeons,
);
const encounters = fileNames.flatMap(
  (name) => encounterDefinitionFileSchema.parse(readJson(`content/encounters/${name}`)).encounters,
);
const lootTables = fileNames.flatMap(
  (name) => lootTableFileSchema.parse(readJson(`content/loot-tables/${name}`)).lootTables,
);
const itemIds = new Set(
  fs
    .readdirSync(path.join(projectRoot, "content/items"))
    .filter((name) => name.endsWith(".json"))
    .flatMap((name) =>
      itemDefinitionFileSchema
        .parse(readJson(`content/items/${name}`))
        .items.map((item) => item.id),
    ),
);

function toLegacyDungeon(
  dungeon: DungeonDefinition,
  encounterById: Map<string, EncounterDefinition>,
) {
  return {
    id: dungeon.id,
    name: dungeon.name.zhCN,
    minimumLevel: dungeon.minimumLevel,
    recommendedLevel: dungeon.recommendedLevel,
    defaultUnlocked: dungeon.defaultUnlocked,
    ...(dungeon.unlock ? { unlock: dungeon.unlock } : {}),
    members: dungeon.members,
    duration: dungeon.duration,
    probability: dungeon.probability,
    bosses: dungeon.route.map((id) => {
      const encounter = encounterById.get(id);
      if (!encounter) throw new Error(`Missing encounter ${id}`);
      return {
        id: encounter.id,
        name: encounter.name.zhCN,
        stageSeconds: encounter.stageSeconds,
        requirements: encounter.requirements,
        weights: encounter.weights,
        experienceShare: encounter.experienceShare,
        funds: encounter.funds,
        firstKillBonus: encounter.firstKillBonus,
        lootPool: encounter.lootTableId,
      };
    }),
  };
}

function normalizedLootTable(table: LootTable) {
  return {
    id: table.id,
    guaranteedEquipmentDrops: table.guaranteedEquipmentDrops,
    ...(table.sourceType ? { sourceType: table.sourceType } : {}),
    items: table.items.map((item) => ({ itemId: Number(item.itemId), weight: item.weight })),
  };
}

describe("split dungeon content", () => {
  it("preserves all four legacy dungeon and encounter definitions", () => {
    const encounterById = new Map(encounters.map((encounter) => [encounter.id, encounter]));
    const actual = dungeons.map((dungeon) => toLegacyDungeon(dungeon, encounterById));
    const expected = fileNames.map((name) =>
      readJson(`data/dungeons/${name.replaceAll("-", "_")}`),
    );

    expect(actual).toEqual(expected);
    expect(dungeons).toHaveLength(4);
    expect(encounters).toHaveLength(27);
  });

  it("preserves the semantic legacy loot table data without duplicate item names", () => {
    const actual = lootTables.map(normalizedLootTable);
    const expected = fileNames.flatMap((name) => {
      const legacy = readJson(`data/loot/${name.replaceAll("-", "_")}`) as {
        pools: Array<{
          id: string;
          guaranteedEquipmentDrops?: number;
          sourceType?: string;
          items: Array<{ itemId: number; weight: number }>;
        }>;
      };
      return legacy.pools.map((pool) => ({
        id: pool.id,
        guaranteedEquipmentDrops: pool.guaranteedEquipmentDrops ?? 1,
        ...(pool.sourceType ? { sourceType: pool.sourceType } : {}),
        items: pool.items.map(({ itemId, weight }) => ({ itemId, weight })),
      }));
    });

    expect(actual).toEqual(expected);
    expect(lootTables).toHaveLength(26);
  });

  it("keeps all routes, loot references, item references and stage budgets valid", () => {
    const dungeonIds = new Set(dungeons.map((dungeon) => dungeon.id));
    const encounterById = new Map(encounters.map((encounter) => [encounter.id, encounter]));
    const lootTableIds = new Set(lootTables.map((table) => table.id));

    expect(dungeonIds.size).toBe(dungeons.length);
    expect(encounterById.size).toBe(encounters.length);
    expect(lootTableIds.size).toBe(lootTables.length);
    for (const dungeon of dungeons) {
      const route = dungeon.route.map((id) => encounterById.get(id));
      expect(route.every(Boolean)).toBe(true);
      expect(route.reduce((sum, encounter) => sum + (encounter?.stageSeconds ?? 0), 0)).toBe(
        dungeon.duration.baseSeconds,
      );
      for (const encounter of route) {
        expect(encounter?.dungeonId).toBe(dungeon.id);
        expect(lootTableIds.has(encounter!.lootTableId)).toBe(true);
        expect(encounter?.mechanicIds).toEqual([]);
      }
    }
    for (const table of lootTables) {
      for (const item of table.items) expect(itemIds.has(item.itemId)).toBe(true);
    }
  });
});
