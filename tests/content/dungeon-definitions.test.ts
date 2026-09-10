import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  dungeonDefinitionFileSchema,
  encounterDefinitionFileSchema,
  lootTableFileSchema,
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

describe("dungeon content", () => {
  it("defines the current four dungeons and all route encounters", () => {
    expect(dungeons).toHaveLength(4);
    expect(encounters).toHaveLength(28);
    expect(dungeons.map((dungeon) => dungeon.id)).toEqual(
      expect.arrayContaining(["ragefire_chasm", "deadmines", "wailing_caverns", "shadowfang_keep"]),
    );
    expect(dungeons.find((dungeon) => dungeon.id === "ragefire_chasm")).toMatchObject({
      minimumLevel: 8,
      recommendedLevel: 13,
      defaultUnlocked: true,
      members: { minimum: 1, maximum: 5, recommended: 5 },
      duration: { baseSeconds: 600, minimumRatio: 0.5 },
    });
  });

  it("defines complete weighted loot tables with stable item references", () => {
    expect(lootTables).toHaveLength(26);
    expect(lootTables.every((table) => table.guaranteedEquipmentDrops >= 1)).toBe(true);
    expect(
      lootTables.every(
        (table) =>
          table.items.length > 0 &&
          table.items.every((item) => item.weight > 0 && itemIds.has(item.itemId)),
      ),
    ).toBe(true);
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
        if (encounter?.lootTableId) expect(lootTableIds.has(encounter.lootTableId)).toBe(true);
        expect(encounter?.mechanicIds).toEqual([]);
      }
    }
    for (const table of lootTables) {
      for (const item of table.items) expect(itemIds.has(item.itemId)).toBe(true);
    }
  });
});
