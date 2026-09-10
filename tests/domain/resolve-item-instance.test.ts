import { describe, expect, it } from "vitest";
import { browserContentModules } from "../../src/content/manifest";
import { loadContentRegistry, type ContentRegistry } from "../../src/content/registry";
import {
  ItemInstanceResolutionError,
  mergeItemStats,
  resolveItemInstance,
} from "../../src/domain/equipment/resolve-item-instance";
import { asBrandedId } from "../../src/domain/shared/ids";
import { createItemInstanceFixture } from "../helpers/game-state-v2-factory";

function contentWithPrototypeSuffix(itemId = "14148"): ContentRegistry {
  const modules = structuredClone(browserContentModules) as Record<string, unknown>;
  const key = Object.keys(modules).find((path) =>
    path.endsWith("/content/items/ragefire-chasm.json"),
  );
  if (!key) throw new Error("Expected ragefire item content");
  const file = modules[key] as {
    items: Array<{ id: string; randomSuffixIds?: string[] }>;
  };
  const item = file.items.find((entry) => entry.id === itemId);
  if (!item) throw new Error(`Expected item ${itemId}`);
  item.randomSuffixIds = ["prototype_of_readiness"];
  return loadContentRegistry(modules);
}

function expectResolutionFailure(
  operation: () => unknown,
  code: ItemInstanceResolutionError["code"],
): void {
  try {
    operation();
    throw new Error("Expected item instance resolution to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(ItemInstanceResolutionError);
    expect((error as ItemInstanceResolutionError).code).toBe(code);
  }
}

describe("effective item instance resolution", () => {
  it("merges the localized suffix name and tier stats without mutating static content", () => {
    const content = contentWithPrototypeSuffix();
    const instance = createItemInstanceFixture({
      definitionId: asBrandedId<"ItemDefinitionId">("14148"),
      randomSuffixId: asBrandedId<"RandomSuffixId">("prototype_of_readiness"),
    });
    const baseBefore = structuredClone(content.itemById.get(instance.definitionId)!);

    const resolved = resolveItemInstance(instance, content);

    expect(resolved.definition.name).toEqual({
      zhCN: "整备之水晶腕轮",
      enUS: "Crystalline Cuffs of Readiness",
    });
    expect(resolved.definition.stats).toEqual({
      primary: { intellectPoints: 1, spiritPoints: 2, staminaPoints: 1 },
      defense: { armorPoints: 14 },
    });
    expect(resolved.definition.itemLevel).toBe(18);
    expect(resolved.definition.slot).toBe("wrist");
    expect(resolved.definition.armorType).toBe("cloth");
    expect(resolved.definition.restrictions).toEqual(baseBefore.restrictions);
    expect(resolved.randomSuffix?.id).toBe("prototype_of_readiness");
    expect(resolved.suffixTier).toMatchObject({ minimumItemLevel: 1, maximumItemLevel: 20 });
    expect(content.itemById.get(instance.definitionId)).toEqual(baseBefore);
    expect(resolved.definition).not.toBe(resolved.baseDefinition);
    expect(resolved.definition.stats).not.toBe(resolved.baseDefinition.stats);
  });

  it("returns an isolated equivalent definition for an instance without a suffix", () => {
    const content = contentWithPrototypeSuffix();
    const instance = createItemInstanceFixture({
      definitionId: asBrandedId<"ItemDefinitionId">("14148"),
    });

    const resolved = resolveItemInstance(instance, content);

    expect(resolved.randomSuffix).toBeUndefined();
    expect(resolved.suffixTier).toBeUndefined();
    expect(resolved.definition).toEqual(resolved.baseDefinition);
    expect(resolved.definition).not.toBe(resolved.baseDefinition);
  });

  it("rejects missing definitions, unknown suffixes, and suffixes outside the item pool", () => {
    const content = contentWithPrototypeSuffix();
    expectResolutionFailure(
      () =>
        resolveItemInstance(
          createItemInstanceFixture({
            definitionId: asBrandedId<"ItemDefinitionId">("missing_item"),
          }),
          content,
        ),
      "missing-definition",
    );
    expectResolutionFailure(
      () =>
        resolveItemInstance(
          createItemInstanceFixture({
            definitionId: asBrandedId<"ItemDefinitionId">("14148"),
            randomSuffixId: asBrandedId<"RandomSuffixId">("missing_suffix"),
          }),
          content,
        ),
      "missing-random-suffix",
    );
    expectResolutionFailure(
      () =>
        resolveItemInstance(
          createItemInstanceFixture({
            definitionId: asBrandedId<"ItemDefinitionId">("14145"),
            randomSuffixId: asBrandedId<"RandomSuffixId">("prototype_of_readiness"),
          }),
          content,
        ),
      "random-suffix-not-allowed",
    );
  });

  it("adds matching numeric groups and preserves base weapon data", () => {
    const base = {
      primary: { staminaPoints: 2 },
      spell: { spellPowerPoints: 3 },
      weapon: {
        damage: { minimumPoints: 4, maximumPoints: 8 },
        speedSeconds: 2,
      },
    } as const;

    const merged = mergeItemStats(base, {
      primary: { staminaPoints: 1, intellectPoints: 2 },
      spell: { healingPowerPoints: 4 },
    });

    expect(merged).toEqual({
      primary: { staminaPoints: 3, intellectPoints: 2 },
      spell: { spellPowerPoints: 3, healingPowerPoints: 4 },
      weapon: base.weapon,
    });
    expect(merged.weapon).not.toBe(base.weapon);
  });
});
