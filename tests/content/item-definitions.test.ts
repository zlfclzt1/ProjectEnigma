import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadContent } from "../../src/content.js";
import {
  equipmentSlotSchema,
  itemDefinitionSchema,
  itemDefinitionFileSchema,
  type EquipmentSlot,
  type ItemDefinition,
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

async function loadLegacyContent() {
  const fixtures = new Map<string, unknown>();
  for (const directory of ["data/dungeons", "data/loot"]) {
    const directoryPath = path.join(projectRoot, directory);
    for (const name of fs.readdirSync(directoryPath).filter((entry) => entry.endsWith(".json"))) {
      fixtures.set(
        `./${directory}/${name}`,
        JSON.parse(fs.readFileSync(path.join(directoryPath, name), "utf8")),
      );
    }
  }
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const fixture = fixtures.get(String(url));
    if (!fixture) throw new Error(`Missing legacy fixture: ${String(url)}`);
    return { json: async () => structuredClone(fixture) } as Response;
  };
  try {
    return await loadContent();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function toLegacyShape(item: ItemDefinition) {
  return {
    id: Number(item.id),
    name: item.name.zhCN,
    ...(item.name.enUS ? { englishName: item.name.enUS } : {}),
    iconName: item.icon.kind === "database" ? item.icon.name : undefined,
    quality: item.quality,
    itemLevel: item.itemLevel,
    slot: item.slot,
    armorType: item.armorType ?? null,
    allowedClasses: item.restrictions.allowedClassIds,
    allowedRoles: item.restrictions.allowedRoles,
    description: item.description.zhCN,
    ...(item.twoHanded ? { twoHanded: true } : {}),
  };
}

describe("migrated item definitions", () => {
  it("preserves all 34 legacy dungeon and quest items", async () => {
    const legacy = await loadLegacyContent();
    const actual = migratedItems
      .filter((item) => !item.isStarter)
      .map(toLegacyShape)
      .sort((left, right) => left.id - right.id);
    const expected = [...legacy.items].sort((left, right) => Number(left.id) - Number(right.id));

    expect(actual).toEqual(expected);
    expect(actual).toHaveLength(34);
    expect(actual.every((item) => item.iconName)).toBe(true);
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

  it("keeps IDs unique and reserves an empty version-zero stat payload", () => {
    const ids = migratedItems.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(migratedItems.every((item) => Object.keys(item.stats).length === 0)).toBe(true);
  });

  it("requires two-handed weapons to occupy the main-hand slot", () => {
    const starterOffHand = migratedItems.find((item) => item.id === "starter_off_hand")!;
    expect(() => itemDefinitionSchema.parse({ ...starterOffHand, twoHanded: true })).toThrow(
      /双手武器必须使用主手栏位/,
    );
  });
});
