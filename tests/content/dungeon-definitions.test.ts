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
  it("defines every current dungeon and all route encounters", () => {
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
      duration: { baseSeconds: 1200, minimumRatio: 0.5 },
    });
    expect(
      dungeons.every((dungeon) => dungeon.route.every((node) => node.type === "required")),
    ).toBe(true);
    expect(dungeons[0]!.route[0]).toMatchObject({
      id: expect.any(String),
      type: "required",
      encounterId: expect.any(String),
    });
  });

  it("accepts explicit optional and rare nodes and rejects legacy string routes", () => {
    const raw = readJson("content/dungeons/ragefire-chasm.json") as {
      dungeons: Array<{ route: unknown[] }>;
    };
    raw.dungeons[0]!.route = [
      { id: "oggleflint", type: "required", encounterId: "oggleflint" },
      {
        id: "optional_taragaman",
        type: "optional",
        encounterId: "taragaman_the_hungerer",
        description: { zhCN: "可选挑战" },
      },
      {
        id: "rare_jergosh",
        type: "rare",
        encounterId: "jergosh_the_invoker",
        spawnProbability: 0.25,
      },
    ];

    const parsed = dungeonDefinitionFileSchema.parse(raw).dungeons[0]!;
    expect(parsed.route).toEqual([
      expect.objectContaining({ id: "oggleflint", type: "required" }),
      expect.objectContaining({ id: "optional_taragaman", type: "optional" }),
      expect.objectContaining({ id: "rare_jergosh", type: "rare", spawnProbability: 0.25 }),
    ]);

    raw.dungeons[0]!.route = ["oggleflint"];
    expect(() => dungeonDefinitionFileSchema.parse(raw)).toThrow();

    raw.dungeons[0]!.route = [
      {
        id: "rare_only",
        type: "rare",
        encounterId: "oggleflint",
        spawnProbability: 0.5,
      },
    ];
    expect(() => dungeonDefinitionFileSchema.parse(raw)).toThrow(/至少需要一个必打节点/);
  });

  it("validates named route variants against required route nodes", () => {
    const raw = readJson("content/dungeons/ragefire-chasm.json") as {
      dungeons: Array<{ route: Array<{ id: string }>; routeVariants?: unknown[] }>;
    };
    raw.dungeons[0]!.routeVariants = [
      {
        id: "normal_route",
        name: { zhCN: "普通路线" },
        description: { zhCN: "挑战所有主要首领。" },
        requiredNodeIds: raw.dungeons[0]!.route.map((node) => node.id),
      },
      {
        id: "shortcut_route",
        name: { zhCN: "捷径路线" },
        description: { zhCN: "跳过部分首领。" },
        requiredNodeIds: [raw.dungeons[0]!.route[0]!.id],
      },
    ];
    expect(dungeonDefinitionFileSchema.parse(raw).dungeons[0]!.routeVariants).toHaveLength(2);

    (raw.dungeons[0]!.routeVariants[1] as { requiredNodeIds: string[] }).requiredNodeIds = [
      "missing_node",
    ];
    expect(() => dungeonDefinitionFileSchema.parse(raw)).toThrow(/不存在的节点/);
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
      const route = dungeon.route.map((node) => encounterById.get(node.encounterId));
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
