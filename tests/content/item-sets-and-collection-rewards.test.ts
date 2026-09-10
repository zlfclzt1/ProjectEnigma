import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { browserContentModules } from "../../src/content/manifest";
import { loadContentRegistry } from "../../src/content/registry";
import {
  collectionRewardDefinitionFileSchema,
  collectionRewardDefinitionSchema,
} from "../../src/content/schemas/collection-reward";
import {
  itemSetDefinitionFileSchema,
  itemSetDefinitionSchema,
} from "../../src/content/schemas/item-set";
import type {
  CollectionRewardId,
  DisplayRecordId,
  ItemSetId,
  ManagementFeatureId,
} from "../../src/domain/shared/ids";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const itemSetFile = itemSetDefinitionFileSchema.parse(
  JSON.parse(fs.readFileSync(path.join(projectRoot, "content/item-sets/prototype.json"), "utf8")),
);
const rewardFile = collectionRewardDefinitionFileSchema.parse(
  JSON.parse(
    fs.readFileSync(path.join(projectRoot, "content/collection-rewards/prototype.json"), "utf8"),
  ),
);

function clonedModules(): Record<string, unknown> {
  return structuredClone(browserContentModules) as Record<string, unknown>;
}

function moduleAt(modules: Record<string, unknown>, suffix: string): Record<string, unknown> {
  const key = Object.keys(modules).find((candidate) => candidate.endsWith(suffix));
  if (!key) throw new Error(`Missing fixture module ${suffix}`);
  return modules[key] as Record<string, unknown>;
}

describe("item sets and collection reward content", () => {
  it("loads branded base-item sets and the three supported milestone conditions", () => {
    const set = itemSetFile.itemSets[0]!;
    const setId: ItemSetId = set.id;
    expect(setId).toBe("prototype_wailing_caverns_collection");
    expect(set.itemIds).toEqual(["10412", "6460"]);

    expect(rewardFile.collectionRewards.map((reward) => reward.condition.type)).toEqual([
      "dungeon-completion",
      "item-set-completion",
      "global-completion",
    ]);
    const rewardId: CollectionRewardId = rewardFile.collectionRewards[0]!.id;
    expect(rewardId).toBe("prototype_wailing_caverns_half_catalog");

    const managementEffect = rewardFile.collectionRewards[1]!.effects[0]!;
    expect(managementEffect.type).toBe("management-unlock");
    if (managementEffect.type !== "management-unlock") throw new Error("Unexpected effect");
    const featureId: ManagementFeatureId = managementEffect.featureId;
    expect(featureId).toBe("catalog_set_filter");

    const displayEffect = rewardFile.collectionRewards[2]!.effects[0]!;
    expect(displayEffect.type).toBe("display-record");
    if (displayEffect.type !== "display-record") throw new Error("Unexpected effect");
    const recordId: DisplayRecordId = displayEffect.recordId;
    expect(recordId).toBe("collector_first_steps");
  });

  it("registers sets and rewards with validated item, dungeon, and set references", () => {
    const registry = loadContentRegistry(browserContentModules);

    expect(registry.itemSetById.size).toBe(1);
    expect(registry.collectionRewardById.size).toBe(4);
    expect(
      registry.collectionRewardById.get("zulfarrak_level_45_graduation" as CollectionRewardId),
    ).toMatchObject({
      name: { zhCN: "45 级时代毕业" },
      condition: {
        type: "encounter-victory",
        encounterId: "zulfarrak_chief_ukorz",
      },
      effects: [
        { type: "guild-funds", amount: 1000 },
        { type: "management-unlock", featureId: "level_cap_60" },
        { type: "display-record", recordId: "level_45_era_graduate" },
      ],
    });
    expect(registry.itemSetById.get(itemSetFile.itemSets[0]!.id)?.itemIds).toEqual([
      "10412",
      "6460",
    ]);
    expect("set" in registry.itemSetById).toBe(false);
    expect("set" in registry.collectionRewardById).toBe(false);
    expect(Object.isFrozen(registry.itemSets)).toBe(true);
    expect(Object.isFrozen(registry.collectionRewards)).toBe(true);
  });

  it("rejects undersized or duplicate sets and unsupported reward effects", () => {
    const set = itemSetFile.itemSets[0]!;
    expect(() => itemSetDefinitionSchema.parse({ ...set, itemIds: [set.itemIds[0]] })).toThrow(
      /至少需要两个基础物品/,
    );
    expect(() =>
      itemSetDefinitionSchema.parse({ ...set, itemIds: [set.itemIds[0], set.itemIds[0]] }),
    ).toThrow(/不能重复引用/);

    const reward = rewardFile.collectionRewards[0]!;
    expect(() =>
      collectionRewardDefinitionSchema.parse({
        ...reward,
        effects: [{ type: "item-grant", itemId: "10412" }],
      }),
    ).toThrow();
    expect(() =>
      collectionRewardDefinitionSchema.parse({
        ...reward,
        condition: { ...reward.condition, minimumPercent: 0 },
      }),
    ).toThrow();
    expect(() =>
      collectionRewardDefinitionSchema.parse({
        ...reward,
        effects: [reward.effects[0], reward.effects[0]],
      }),
    ).toThrow(/不能重复配置同一效果/);
  });

  it("reports missing base items, dungeons, and item sets with precise references", () => {
    const missingItemModules = clonedModules();
    const missingItemFile = moduleAt(missingItemModules, "/content/item-sets/prototype.json");
    const missingItemSets = missingItemFile.itemSets as Array<{ itemIds: string[] }>;
    missingItemSets[0]!.itemIds[0] = "missing_item";
    expect(() => loadContentRegistry(missingItemModules)).toThrowError(
      /itemSets\[0\]\.itemIds\[0\].*不存在的基础物品.*missing_item/s,
    );

    const missingDungeonModules = clonedModules();
    const missingDungeonFile = moduleAt(
      missingDungeonModules,
      "/content/collection-rewards/prototype.json",
    );
    const missingDungeonRewards = missingDungeonFile.collectionRewards as Array<{
      condition: { dungeonId?: string };
    }>;
    missingDungeonRewards[0]!.condition.dungeonId = "missing_dungeon";
    expect(() => loadContentRegistry(missingDungeonModules)).toThrowError(
      /condition\.dungeonId.*不存在的副本.*missing_dungeon/s,
    );

    const missingSetModules = clonedModules();
    const missingSetFile = moduleAt(
      missingSetModules,
      "/content/collection-rewards/prototype.json",
    );
    const missingSetRewards = missingSetFile.collectionRewards as Array<{
      condition: { itemSetId?: string };
    }>;
    missingSetRewards[1]!.condition.itemSetId = "missing_set";
    expect(() => loadContentRegistry(missingSetModules)).toThrowError(
      /condition\.itemSetId.*不存在的套装.*missing_set/s,
    );

    const missingEncounterModules = clonedModules();
    const missingEncounterFile = moduleAt(
      missingEncounterModules,
      "/content/collection-rewards/zulfarrak-stage.json",
    );
    const missingEncounterRewards = missingEncounterFile.collectionRewards as Array<{
      condition: { encounterId?: string };
    }>;
    missingEncounterRewards[0]!.condition.encounterId = "missing_encounter";
    expect(() => loadContentRegistry(missingEncounterModules)).toThrowError(
      /condition\.encounterId.*不存在的首领战.*missing_encounter/s,
    );
  });
});
