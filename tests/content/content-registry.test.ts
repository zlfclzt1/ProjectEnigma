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
    expect(registry.itemSetById.size).toBe(registry.itemSets.length);
    expect(registry.itemSuffixById.size).toBe(registry.itemSuffixes.length);
    expect(registry.collectionRewardById.size).toBe(registry.collectionRewards.length);
    expect(registry.itemSetById.size).toBe(9);
    expect(registry.itemSuffixById.size).toBe(137);
    expect(registry.collectionRewardById.size).toBe(4);
    expect(registry.combatProfileById.size).toBe(28);
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
    expect("set" in registry.itemSetById).toBe(false);
    expect("set" in registry.itemSuffixById).toBe(false);
    expect("set" in registry.collectionRewardById).toBe(false);
    expect(Object.isFrozen(registry.items)).toBe(true);
    expect(Object.isFrozen(registry.itemSets)).toBe(true);
    expect(Object.isFrozen(registry.itemSuffixes)).toBe(true);
    expect(Object.isFrozen(registry.collectionRewards)).toBe(true);
  });

  it("rejects missing, mismatched, and malformed combat profile configuration", () => {
    const missingModules = clonedModules();
    const specFile = moduleAt(missingModules, "/content/specs/classic.json");
    const specs = specFile.specs as Array<{ combatProfileId: string }>;
    specs[0].combatProfileId = "missing_profile";
    expect(() => loadContentRegistry(missingModules)).toThrowError(/不存在的战斗配置/);

    const mismatchModules = clonedModules();
    const profileFile = moduleAt(mismatchModules, "/content/combat-profiles/classic-light-v1.json");
    const profiles = profileFile.combatProfiles as Array<{
      specId: string;
      linearWeights: { damage: Record<string, number> };
    }>;
    profiles[0].specId = "warrior_arms";
    expect(() => loadContentRegistry(mismatchModules)).toThrowError(/战斗配置属于专精/);

    const malformedModules = clonedModules();
    const malformedFile = moduleAt(
      malformedModules,
      "/content/combat-profiles/classic-light-v1.json",
    );
    const malformedProfiles = malformedFile.combatProfiles as Array<{
      linearWeights: { damage: Record<string, number> };
    }>;
    malformedProfiles[0].linearWeights.damage.fireResistancePoints = 0.1;
    expect(() => loadContentModules(malformedModules)).toThrowError(
      /非零属性权重必须配置对应的等级期望值/,
    );
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

  it("allows encounters without equipment loot tables", () => {
    const modules = clonedModules();
    const encounterFile = moduleAt(modules, "/content/encounters/ragefire-chasm.json");
    const encounters = encounterFile.encounters as Array<{ id: string; lootTableId?: string }>;
    delete encounters[0].lootTableId;

    const registry = loadContentRegistry(modules);
    const encounterId = asBrandedId<"EncounterId">(encounters[0].id);
    expect(registry.encounterById.get(encounterId)?.lootTableId).toBeUndefined();
    expect(registry.getLootTableForEncounter(encounterId)).toBeUndefined();
  });

  it("allows one member quest to track encounter victories across dungeons", () => {
    const modules = clonedModules();
    const questFile = moduleAt(modules, "/content/quests/ragefire-chasm.json");
    const quest = (
      questFile.quests as Array<{
        completion: { type: string; encounterIds?: string[] };
      }>
    )[0]!;
    quest.completion = {
      type: "encounter-victories",
      encounterIds: ["oggleflint", "dm_rhahkzor"],
    };

    expect(() => loadContentRegistry(modules)).not.toThrow();
  });

  it("indexes optional item suffix pools and validates references and item-level tiers", () => {
    const validModules = clonedModules();
    const validItemFile = moduleAt(validModules, "/content/items/ragefire-chasm.json");
    const validItems = validItemFile.items as Array<{
      id: string;
      randomSuffixIds?: string[];
    }>;
    validItems[0].randomSuffixIds = ["prototype_of_readiness"];
    const validRegistry = loadContentRegistry(validModules);
    const itemId = asBrandedId<"ItemDefinitionId">(validItems[0].id);
    expect(validRegistry.getRandomSuffixesForItem(itemId).map((suffix) => suffix.id)).toEqual([
      "prototype_of_readiness",
    ]);

    const missingModules = clonedModules();
    const missingItemFile = moduleAt(missingModules, "/content/items/ragefire-chasm.json");
    const missingItems = missingItemFile.items as Array<{ randomSuffixIds?: string[] }>;
    missingItems[0].randomSuffixIds = ["missing_suffix"];
    expect(() => loadContentRegistry(missingModules)).toThrowError(
      /items\[0\]\.randomSuffixIds\[0\].*不存在的随机词缀.*missing_suffix/s,
    );

    const uncoveredModules = clonedModules();
    const uncoveredItemFile = moduleAt(uncoveredModules, "/content/items/ragefire-chasm.json");
    const uncoveredItems = uncoveredItemFile.items as Array<{ randomSuffixIds?: string[] }>;
    uncoveredItems[0].randomSuffixIds = ["prototype_of_readiness"];
    const suffixFile = moduleAt(uncoveredModules, "/content/item-suffixes/prototype.json");
    const suffixes = suffixFile.itemSuffixes as Array<{
      tiers: Array<{ minimumItemLevel: number; maximumItemLevel: number }>;
    }>;
    suffixes[0].tiers = [
      { ...suffixes[0].tiers[0]!, maximumItemLevel: 17 },
      { ...suffixes[0].tiers[1]!, minimumItemLevel: 19 },
    ];
    expect(() => loadContentRegistry(uncoveredModules)).toThrowError(/没有覆盖物品等级 18 的档位/);
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
