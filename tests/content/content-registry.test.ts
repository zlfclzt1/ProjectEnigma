import { describe, expect, it } from "vitest";
import { ContentValidationError, loadContentModules } from "../../src/content/loader";
import { browserContentModules, loadBrowserContentRegistry } from "../../src/content/manifest";
import { loadContentRegistry } from "../../src/content/registry";
import { asBrandedId } from "../../src/domain/shared/ids";

function clonedModules(): Record<string, unknown> {
  return structuredClone(browserContentModules) as Record<string, unknown>;
}

function moduleAt(modules: Record<string, unknown>, suffix: string): Record<string, unknown> {
  const key = Object.keys(modules).find((path) => path.endsWith(suffix));
  if (!key) throw new Error(`Missing fixture module ${suffix}`);
  return modules[key] as Record<string, unknown>;
}

describe("validated automatic content registry", () => {
  it("discovers every JSON file through Vite and exposes read-only indexes and queries", () => {
    const registry = loadBrowserContentRegistry();

    const discoveredPaths = Object.keys(browserContentModules);
    expect(discoveredPaths.length).toBeGreaterThan(0);
    expect(discoveredPaths.every((path) => path.endsWith(".json"))).toBe(true);
    expect(discoveredPaths.some((path) => path.endsWith("/content/logs/common.json"))).toBe(true);
    expect(registry.itemById.size).toBe(registry.items.length);
    expect(registry.dungeonById.size).toBe(registry.dungeons.length);
    expect(registry.encounterById.size).toBe(registry.encounters.length);
    expect(
      registry.getEncountersForDungeon(asBrandedId<"DungeonId">("ragefire_chasm")),
    ).toHaveLength(4);
    expect(
      registry.getLootTableForEncounter(asBrandedId<"EncounterId">("taragaman_the_hungerer"))
        ?.items,
    ).toHaveLength(3);
    expect("set" in registry.itemById).toBe(false);
    expect(Object.isFrozen(registry.items)).toBe(true);
  });

  it("reports schema failures with the content file and precise field path", () => {
    const modules = clonedModules();
    const file = moduleAt(modules, "/content/loot-tables/ragefire-chasm.json");
    const lootTables = file.lootTables as Array<{ items: Array<{ weight: number }> }>;
    lootTables[0].items[0].weight = 0;

    expect(() => loadContentModules(modules)).toThrowError(
      /content\/loot-tables\/ragefire-chasm\.json:lootTables\[0\]\.items\[0\]\.weight/,
    );
  });

  it("reports duplicate IDs and invalid references with actionable locations", () => {
    const modules = clonedModules();
    const itemFile = moduleAt(modules, "/content/items/ragefire-chasm.json");
    const items = itemFile.items as Array<Record<string, unknown>>;
    items.push(structuredClone(items[0]));
    const encounterFile = moduleAt(modules, "/content/encounters/ragefire-chasm.json");
    const encounters = encounterFile.encounters as Array<{ lootTableId: string }>;
    encounters[0].lootTableId = "missing_loot_table";

    try {
      loadContentRegistry(modules);
      throw new Error("Expected content validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ContentValidationError);
      expect(String(error)).toContain("content/items/ragefire-chasm.json:items[11].id");
      expect(String(error)).toContain(
        "content/encounters/ragefire-chasm.json:encounters[0].lootTableId",
      );
      expect(String(error)).toContain("无效引用 ID: missing_loot_table");
    }
  });

  it("rejects route duration drift, unlock cycles and placeholder equipment names", () => {
    const modules = clonedModules();
    const dungeonFile = moduleAt(modules, "/content/dungeons/ragefire-chasm.json");
    const dungeons = dungeonFile.dungeons as Array<Record<string, unknown>>;
    dungeons[0].duration = { baseSeconds: 601, minimumRatio: 0.5, maximumRatio: 1.8 };
    dungeons[0].unlock = { requiredDungeonIds: ["shadowfang_keep"] };
    const itemFile = moduleAt(modules, "/content/items/ragefire-chasm.json");
    const items = itemFile.items as Array<{ name: { zhCN: string } }>;
    items[0].name.zhCN = "测试装备·被诅咒的魔刃";

    expect(() => loadContentRegistry(modules)).toThrowError(/路线阶段总时长 600 秒/);
    expect(() => loadContentRegistry(modules)).toThrowError(/副本解锁关系存在循环/);
    expect(() => loadContentRegistry(modules)).toThrowError(/测试占位符/);
  });
});
