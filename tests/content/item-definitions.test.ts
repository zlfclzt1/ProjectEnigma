import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  equipmentSlotSchema,
  itemDefinitionSchema,
  itemDefinitionFileSchema,
  type EquipmentSlot,
} from "../../src/content/schemas/item";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const itemRoot = path.join(projectRoot, "content/items");
const itemFiles = fs
  .readdirSync(itemRoot)
  .filter((name) => name.endsWith(".json"))
  .sort()
  .map((name) => ({
    name,
    content: itemDefinitionFileSchema.parse(
      JSON.parse(fs.readFileSync(path.join(itemRoot, name), "utf8")),
    ),
  }));
const migratedItems = itemFiles.flatMap((file) => file.content.items);

describe("item definitions", () => {
  it("loads all 176 current dungeon and quest items with stable IDs and database icons", () => {
    const dungeonItems = migratedItems.filter((item) => !item.isStarter);

    expect(dungeonItems).toHaveLength(176);
    expect(dungeonItems.map((item) => item.id)).toEqual(
      expect.arrayContaining(["14149", "15451", "15452", "6324"]),
    );
    expect(dungeonItems.every((item) => item.icon.kind === "database")).toBe(true);
    expect(dungeonItems.every((item) => item.name.zhCN.length > 0)).toBe(true);
    expect(migratedItems.every((item) => item.randomSuffixIds === undefined)).toBe(true);
  });

  it("replaces dynamic starter definitions with stable IDs for every slot and armor type", () => {
    const starterItems = migratedItems.filter((item) => item.isStarter);
    const armorSlots = new Set<EquipmentSlot>([
      "head",
      "shoulder",
      "chest",
      "wrist",
      "hands",
      "waist",
      "legs",
      "feet",
    ]);
    const armorTypes = ["cloth", "leather", "mail", "plate"];

    expect(starterItems).toHaveLength(41);
    for (const slot of equipmentSlotSchema.options) {
      const definitions = starterItems.filter((item) => item.slot === slot);
      if (armorSlots.has(slot)) {
        expect(definitions.map((item) => item.armorType).sort()).toEqual(armorTypes);
      } else {
        expect(definitions).toHaveLength(1);
        expect(definitions[0].armorType).toBeUndefined();
      }
      expect(definitions.every((item) => item.icon.kind === "generic-slot")).toBe(true);
    }
  });

  it("keeps IDs unique and attributes every imported stat payload", () => {
    const ids = migratedItems.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(migratedItems.every((item) => Object.keys(item.stats).length > 0)).toBe(true);
    expect(
      migratedItems
        .filter((item) => !item.isStarter)
        .every(
          (item) =>
            item.statsSource.provider === "wowhead-classic" &&
            item.statsSource.gameVersion === "classic-2019-phase-6" &&
            item.statsSource.externalId === item.id &&
            /^2026-09-0[89]$/.test(item.statsSource.verifiedAt),
        ),
    ).toBe(true);
    expect(
      migratedItems
        .filter((item) => item.isStarter)
        .every(
          (item) =>
            item.statsSource.provider === "manual" &&
            item.statsBalanceOverride?.fields.includes("stats"),
        ),
    ).toBe(true);
  });

  it("requires two-handed weapons to occupy the main-hand slot", () => {
    const starterOffHand = migratedItems.find((item) => item.id === "starter_off_hand")!;
    expect(() => itemDefinitionSchema.parse({ ...starterOffHand, twoHanded: true })).toThrow(
      /双手武器必须使用主手栏位/,
    );
  });

  it("allows an optional non-empty suffix pool with unique references", () => {
    const item = migratedItems.find((entry) => entry.id === "14149")!;
    expect(
      itemDefinitionSchema.parse({ ...item, randomSuffixIds: ["prototype_of_readiness"] })
        .randomSuffixIds,
    ).toEqual(["prototype_of_readiness"]);
    expect(() => itemDefinitionSchema.parse({ ...item, randomSuffixIds: [] })).toThrow();
    expect(() =>
      itemDefinitionSchema.parse({
        ...item,
        randomSuffixIds: ["prototype_of_readiness", "prototype_of_readiness"],
      }),
    ).toThrow(/不能重复/);
  });
});
