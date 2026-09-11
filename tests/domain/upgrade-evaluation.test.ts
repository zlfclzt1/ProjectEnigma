import { describe, expect, it } from "vitest";
import { browserContentModules, loadBrowserContentRegistry } from "../../src/content/manifest";
import { loadContentRegistry } from "../../src/content/registry";
import type { ContentRegistry } from "../../src/content/registry";
import type { ItemDefinition } from "../../src/content/schemas/item";
import { evaluateUpgrade } from "../../src/domain/equipment/upgrade-evaluation";
import { asBrandedId } from "../../src/domain/shared/ids";
import { createItemInstanceFixture, createMemberFixture } from "../helpers/game-state-v2-factory";

const content = loadBrowserContentRegistry();

function item(id: string): ItemDefinition {
  const definition = content.itemById.get(asBrandedId<"ItemDefinitionId">(id));
  if (!definition) throw new Error(`Missing item ${id}`);
  return definition;
}

function registryWithItems(items: readonly ItemDefinition[]): ContentRegistry {
  return {
    ...content,
    itemById: new Map([...content.itemById, ...items.map((entry) => [entry.id, entry] as const)]),
  } as unknown as ContentRegistry;
}

describe("combat-stat upgrade evaluation", () => {
  it("returns slot, four capability deltas, stat changes, score, and explanations", () => {
    const member = createMemberFixture({
      equipment: { back: asBrandedId<"ItemInstanceId">("old_back") },
    });
    const oldBack = createItemInstanceFixture({
      id: asBrandedId<"ItemInstanceId">("old_back"),
      definitionId: asBrandedId<"ItemDefinitionId">("starter_back"),
      ownerMemberId: member.id,
    });
    const candidate = createItemInstanceFixture({
      id: asBrandedId<"ItemInstanceId">("new_back"),
      definitionId: asBrandedId<"ItemDefinitionId">("14149"),
      ownerMemberId: undefined,
      bound: false,
    });
    const result = evaluateUpgrade(
      member,
      candidate,
      { itemInstances: { [oldBack.id]: oldBack, [candidate.id]: candidate } },
      content,
    );

    expect(result.equippable).toBe(true);
    if (!result.equippable) throw new Error("Expected equippable upgrade");
    expect(result.replacementSlot).toBe("back");
    expect(result.displacedItemInstanceIds).toEqual([oldBack.id]);
    expect(Object.keys(result.capabilityChanges)).toEqual([
      "survivability",
      "threat",
      "healing",
      "damage",
    ]);
    expect(result.primaryResponsibilityDelta).toBeGreaterThan(0);
    expect(result.primaryResponsibilityPercent).toBeGreaterThan(0);
    expect(result.recommendationScore).toBeGreaterThan(0);
    expect(result.statChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ statId: "strengthPoints", delta: 2 }),
        expect.objectContaining({ statId: "armorPoints", delta: 12 }),
      ]),
    );
    expect(result.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("chooses the weaker interchangeable ring slot by actual combat outcome", () => {
    const member = createMemberFixture({
      equipment: {
        ring1: asBrandedId<"ItemInstanceId">("strong_ring"),
        ring2: asBrandedId<"ItemInstanceId">("starter_ring"),
      },
    });
    const strongRing = createItemInstanceFixture({
      id: asBrandedId<"ItemInstanceId">("strong_ring"),
      definitionId: asBrandedId<"ItemDefinitionId">("6321"),
      ownerMemberId: member.id,
    });
    const starterRing = createItemInstanceFixture({
      id: asBrandedId<"ItemInstanceId">("starter_ring"),
      definitionId: asBrandedId<"ItemDefinitionId">("starter_ring2"),
      ownerMemberId: member.id,
    });
    const candidate = createItemInstanceFixture({
      id: asBrandedId<"ItemInstanceId">("candidate_ring"),
      definitionId: asBrandedId<"ItemDefinitionId">("6321"),
      ownerMemberId: undefined,
      bound: false,
    });
    const result = evaluateUpgrade(
      member,
      candidate,
      {
        itemInstances: {
          [strongRing.id]: strongRing,
          [starterRing.id]: starterRing,
          [candidate.id]: candidate,
        },
      },
      content,
    );

    expect(result.equippable && result.replacementSlot).toBe("ring2");
  });

  it("accounts for both displaced items when evaluating a two-handed weapon", () => {
    const member = createMemberFixture({
      progression: {
        level: 20,
        experience: 0,
        specId: asBrandedId<"SpecId">("warrior_arms"),
      },
      equipment: {
        mainHand: asBrandedId<"ItemInstanceId">("old_main"),
        offHand: asBrandedId<"ItemInstanceId">("old_off"),
      },
    });
    const oldMain = createItemInstanceFixture({
      id: asBrandedId<"ItemInstanceId">("old_main"),
      definitionId: asBrandedId<"ItemDefinitionId">("starter_main_hand"),
      ownerMemberId: member.id,
    });
    const oldOff = createItemInstanceFixture({
      id: asBrandedId<"ItemInstanceId">("old_off"),
      definitionId: asBrandedId<"ItemDefinitionId">("starter_off_hand"),
      ownerMemberId: member.id,
    });
    const candidate = createItemInstanceFixture({
      id: asBrandedId<"ItemInstanceId">("two_hander"),
      definitionId: asBrandedId<"ItemDefinitionId">("5187"),
      ownerMemberId: undefined,
      bound: false,
    });
    const result = evaluateUpgrade(
      member,
      candidate,
      {
        itemInstances: {
          [oldMain.id]: oldMain,
          [oldOff.id]: oldOff,
          [candidate.id]: candidate,
        },
      },
      content,
    );

    expect(result.equippable).toBe(true);
    if (!result.equippable) throw new Error("Expected two-handed upgrade");
    expect(result.displacedItemInstanceIds).toEqual([oldMain.id, oldOff.id]);
    expect(result.primaryResponsibilityDelta).toBeGreaterThan(0);
  });

  it("prefers stronger real stats even when the useful item has a lower item level", () => {
    const base = item("starter_cloth_chest");
    const strong = {
      ...base,
      id: asBrandedId<"ItemDefinitionId">("low_level_strong_stats"),
      itemLevel: 5,
      stats: { spell: { spellPowerPoints: 40 } },
    } satisfies ItemDefinition;
    const weak = {
      ...base,
      id: asBrandedId<"ItemDefinitionId">("high_level_wrong_stats"),
      itemLevel: 60,
      stats: { resistances: { firePoints: 40 } },
    } satisfies ItemDefinition;
    const testContent = registryWithItems([strong, weak]);
    const member = createMemberFixture({
      identity: {
        ...createMemberFixture().identity,
        classId: asBrandedId<"ClassId">("warlock"),
      },
      progression: {
        level: 40,
        experience: 0,
        specId: asBrandedId<"SpecId">("warlock_destruction"),
      },
      equipment: {},
    });
    const strongInstance = createItemInstanceFixture({
      id: asBrandedId<"ItemInstanceId">("strong"),
      definitionId: strong.id,
      ownerMemberId: undefined,
      bound: false,
    });
    const weakInstance = createItemInstanceFixture({
      id: asBrandedId<"ItemInstanceId">("weak"),
      definitionId: weak.id,
      ownerMemberId: undefined,
      bound: false,
    });
    const itemInstances = { strong: strongInstance, weak: weakInstance };
    const strongResult = evaluateUpgrade(member, strongInstance, { itemInstances }, testContent);
    const weakResult = evaluateUpgrade(member, weakInstance, { itemInstances }, testContent);

    expect(strongResult.equippable && weakResult.equippable).toBe(true);
    if (!strongResult.equippable || !weakResult.equippable) throw new Error("Expected results");
    expect(strongResult.primaryResponsibilityDelta).toBeGreaterThan(
      weakResult.primaryResponsibilityDelta,
    );
    expect(strongResult.primaryResponsibilityDelta).toBeGreaterThan(0);
    expect(weakResult.primaryResponsibilityDelta).toBe(0);
  });

  it("includes random suffix stats in upgrade deltas and recommendation scores", () => {
    const modules = structuredClone(browserContentModules) as Record<string, unknown>;
    const key = Object.keys(modules).find((path) =>
      path.endsWith("/content/items/ragefire-chasm.json"),
    );
    if (!key) throw new Error("Expected ragefire item content");
    const file = modules[key] as {
      items: Array<{ id: string; randomSuffixIds?: string[] }>;
    };
    file.items.find((entry) => entry.id === "14148")!.randomSuffixIds = ["prototype_of_readiness"];
    const suffixContent = loadContentRegistry(modules);
    const member = createMemberFixture({
      identity: {
        ...createMemberFixture().identity,
        classId: asBrandedId<"ClassId">("mage"),
      },
      progression: {
        level: 18,
        experience: 0,
        specId: asBrandedId<"SpecId">("mage_arcane"),
      },
      equipment: {},
    });
    const plain = createItemInstanceFixture({
      id: asBrandedId<"ItemInstanceId">("plain_wrist"),
      definitionId: asBrandedId<"ItemDefinitionId">("14148"),
      ownerMemberId: undefined,
      bound: false,
    });
    const suffixed = createItemInstanceFixture({
      ...plain,
      id: asBrandedId<"ItemInstanceId">("suffixed_wrist"),
      randomSuffixId: asBrandedId<"RandomSuffixId">("prototype_of_readiness"),
    });
    const instances = { [plain.id]: plain, [suffixed.id]: suffixed };

    const plainResult = evaluateUpgrade(member, plain, { itemInstances: instances }, suffixContent);
    const suffixResult = evaluateUpgrade(
      member,
      suffixed,
      { itemInstances: instances },
      suffixContent,
    );

    expect(plainResult.equippable && suffixResult.equippable).toBe(true);
    if (!plainResult.equippable || !suffixResult.equippable) {
      throw new Error("Expected both wrist variants to be equippable");
    }
    expect(suffixResult.statChanges).toContainEqual(
      expect.objectContaining({ statId: "staminaPoints", delta: 1 }),
    );
    expect(suffixResult.capabilityChanges.survivability).toBeGreaterThan(
      plainResult.capabilityChanges.survivability,
    );
    expect(suffixResult.recommendationScore).toBeGreaterThan(plainResult.recommendationScore);
  });
});
