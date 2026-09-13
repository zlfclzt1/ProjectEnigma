import fs from "node:fs";
import path from "node:path";

type SourceItem = {
  itemId: number;
  name: string;
  icon?: string;
  class?: string;
  subclass?: string;
  quality?: string;
  itemLevel?: number;
  requiredLevel?: number;
  slot?: string;
  contentPhase?: number;
  createdBy?: Array<{
    requiredSkill?: number;
    category?: string;
    reagents?: Array<{ itemId: number; amount: number }>;
    amount?: [number, number];
  }>;
};

const projectRoot = path.resolve(new URL("..", import.meta.url).pathname);
const sourcePath = process.env.CLASSIC_ITEMS_JSON ?? "/tmp/wow-classic-items/data/json/data.json";
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8")) as SourceItem[];
const existingItems = new Map<string, { kind?: string }>();
for (const file of fs.readdirSync(path.join(projectRoot, "content/items"))) {
  if (!file.endsWith(".json")) continue;
  if (file === "classic-blacksmithing-catalog.json") continue;
  const json = JSON.parse(fs.readFileSync(path.join(projectRoot, "content/items", file), "utf8"));
  for (const item of json.items ?? []) existingItems.set(String(item.id), item);
}

const canonicalAliases: Record<number, string> = {
  2840: "profession_copper_bar",
  2841: "profession_bronze_bar",
  2842: "profession_silver_bar",
  3575: "profession_iron_bar",
  3576: "profession_tin_bar",
  3577: "profession_gold_bar",
  3859: "profession_steel_bar",
  3860: "profession_mithril_bar",
  6037: "profession_truesilver_bar",
  11371: "profession_dark_iron_bar",
  12359: "profession_thorium_bar",
  2775: "profession_silver_ore",
  2776: "profession_gold_ore",
  3857: "profession_coal",
  7911: "profession_truesilver_ore",
  11370: "profession_dark_iron_ore",
  2862: "profession_rough_sharpening_stone",
  2863: "profession_coarse_sharpening_stone",
  2871: "profession_heavy_sharpening_stone",
  3486: "profession_heavy_grinding_stone",
  7964: "profession_solid_grinding_stone",
  12655: "profession_enchanted_thorium_bar",
};

const blacksmithRecipes = source
  .flatMap((item) =>
    (item.createdBy ?? [])
      .filter(
        (recipe) =>
          recipe.category === "Blacksmithing" &&
          (recipe.requiredSkill ?? 0) <= 300 &&
          item.itemId < 20_000 &&
          (item.contentPhase === undefined || item.contentPhase <= 6),
      )
      .map((recipe, index) => ({ item, recipe, index })),
  )
  .filter(({ item }) => item.name.length > 0);

const itemIds = new Set<number>();
for (const { item, recipe } of blacksmithRecipes) {
  itemIds.add(item.itemId);
  for (const reagent of recipe.reagents ?? []) itemIds.add(reagent.itemId);
}

function itemId(numericId: number): string {
  return canonicalAliases[numericId] ?? `profession_classic_${numericId}`;
}

function quality(value: string | undefined): string {
  return (
    (
      {
        Poor: "poor",
        Common: "common",
        Uncommon: "uncommon",
        Rare: "rare",
        Epic: "epic",
        Legendary: "legendary",
      } as Record<string, string>
    )[value ?? "Common"] ?? "common"
  );
}

function equipmentSlot(slot: string | undefined): string | null {
  return (
    (
      {
        Head: "head",
        Shoulder: "shoulder",
        Chest: "chest",
        Wrist: "wrist",
        Hands: "hands",
        Waist: "waist",
        Legs: "legs",
        Feet: "feet",
        Neck: "neck",
        Back: "back",
        Finger: "finger",
        Trinket: "trinket",
        "Main Hand": "mainHand",
        "Off Hand": "offHand",
        "One-Hand": "mainHand",
        "Two-Hand": "mainHand",
        Shield: "offHand",
        "Held In Off-hand": "offHand",
        Ranged: "ranged",
      } as Record<string, string>
    )[slot ?? ""] ?? null
  );
}

function isEquipment(item: SourceItem): boolean {
  return (
    Boolean(item.class === "Armor" || item.class === "Weapon") && equipmentSlot(item.slot) !== null
  );
}

const generatedItems = [...itemIds]
  .map((numericId) => source.find((item) => item.itemId === numericId))
  .filter((item): item is SourceItem => Boolean(item))
  .filter((item) => !existingItems.has(itemId(item.itemId)))
  .map((item) => {
    const equipment = isEquipment(item);
    const id = itemId(item.itemId);
    return {
      id,
      kind: equipment ? "equipment" : "material",
      name: { zhCN: `${item.name}（Classic 配方目录）`, enUS: item.name },
      ...(equipment ? {} : { stackLimit: 20 }),
      itemLevel: Math.max(1, item.itemLevel ?? 1),
      ...(item.requiredLevel ? { requiredLevel: item.requiredLevel } : {}),
      quality: quality(item.quality),
      slot: equipment ? equipmentSlot(item.slot) : "none",
      ...(equipment && item.subclass
        ? {
            armorType: (
              { Cloth: "cloth", Leather: "leather", Mail: "mail", Plate: "plate" } as Record<
                string,
                string
              >
            )[item.subclass],
          }
        : {}),
      twoHanded: item.slot === "Two-Hand",
      restrictions: { allowedClassIds: [], allowedRoles: [] },
      icon: { kind: "generic-slot" },
      description: {
        zhCN: `Classic 锻造配方目录条目，原版物品 ID ${item.itemId}。`,
        enUS: `Classic blacksmithing catalog item ${item.itemId}.`,
      },
      stats: {},
      statsSource: {
        kind: "source-fact",
        provider: "wowhead-classic",
        gameVersion: "classic-2019-phase-6",
        externalId: id,
        url: `https://www.wowhead.com/classic/item=${item.itemId}`,
        verifiedAt: "2026-09-13",
        notes: equipment
          ? "Classic 锻造配方产物目录条目；暂不进入常驻属性模型。"
          : "Classic 锻造配方材料目录条目。",
      },
    };
  });

const recipes = blacksmithRecipes.map(({ item, recipe, index }) => ({
  id: `classic_blacksmithing_${item.itemId}_${index + 1}`,
  professionId: "blacksmithing",
  facilityId: "blacksmith-forge",
  status: "available",
  category: "crafting",
  name: { zhCN: `锻造：${item.name}`, enUS: item.name },
  requiredSkill: recipe.requiredSkill ?? 1,
  requiredTrainingRank: Math.min(4, Math.max(1, Math.ceil((recipe.requiredSkill ?? 1) / 75))),
  input: (recipe.reagents ?? []).map((reagent) => ({
    itemId: itemId(reagent.itemId),
    quantityPerBatch: reagent.amount,
  })),
  output: [
    {
      type: isEquipment(item) ? "item-instance" : "material-stack",
      itemId: itemId(item.itemId),
      quantity: { min: recipe.amount?.[0] ?? 1, max: recipe.amount?.[1] ?? 1 },
      chance: 1,
    },
  ],
  durationSeconds: Math.max(30, 60 + (recipe.requiredSkill ?? 1) * 3),
  batchLimit: 20,
  skillGain: {
    orange: { min: 1, max: 1, chance: 1 },
    yellow: { min: 1, max: 1, chance: 0.75 },
    green: { min: 1, max: 1, chance: 0.2 },
    gray: { min: 0, max: 0, chance: 0 },
  },
  learning: {
    cost: 0,
    sources: [{ type: "profession", sourceId: "classic-blacksmithing-catalog" }],
    requiredRecipeIds: [],
  },
  sources: [{ type: "profession", sourceId: "classic-blacksmithing-catalog" }],
}));

fs.writeFileSync(
  path.join(projectRoot, "content/items/classic-blacksmithing-catalog.json"),
  `${JSON.stringify({ schemaVersion: 1, attribution: { sources: [{ kind: "source-fact", provider: "wowhead-classic", gameVersion: "classic-2019-phase-6", externalId: "skill=164", url: "https://www.wowhead.com/classic/skill=164/blacksmithing", verifiedAt: "2026-09-13", notes: "Classic 2019 Phase 6 锻造配方及其材料/产物目录。" }], balanceOverrides: [] }, items: generatedItems }, null, 2)}\n`,
);
fs.writeFileSync(
  path.join(projectRoot, "content/recipes/classic-blacksmithing-complete.json"),
  `${JSON.stringify({ schemaVersion: 1, attribution: { sources: [{ kind: "source-fact", provider: "wowhead-classic", gameVersion: "classic-2019-phase-6", externalId: "skill=164", url: "https://www.wowhead.com/classic/skill=164/blacksmithing", verifiedAt: "2026-09-13", notes: "Classic 2019 Phase 6 锻造配方目录；配方时长为本项目放置模型参数。" }], balanceOverrides: [] }, recipes }, null, 2)}\n`,
);
console.log(`已生成锻造配方 ${recipes.length} 条、补充物品 ${generatedItems.length} 条。`);
