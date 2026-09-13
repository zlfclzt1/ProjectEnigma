import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { RawContentModules } from "../src/content/loader";
import { loadContentRegistry } from "../src/content/registry";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const contentRoot = path.join(projectRoot, "content");

function discoverJsonFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return discoverJsonFiles(filePath);
    return entry.isFile() && entry.name.endsWith(".json") ? [filePath] : [];
  });
}

const modules: RawContentModules = Object.fromEntries(
  discoverJsonFiles(contentRoot).map((filePath) => [
    path.relative(projectRoot, filePath).split(path.sep).join("/"),
    JSON.parse(fs.readFileSync(filePath, "utf8")),
  ]),
);
const content = loadContentRegistry(modules);
const availableMiningSites = new Set<string>(
  content.gatheringSites
    .filter((site) => site.professionId === "mining" && site.status === "available")
    .map((site) => site.id),
);
const expectedMiningSites = [
  "copper-vein-zone",
  "tin-vein-zone",
  "silver-vein-zone",
  "iron-deposit-zone",
  "gold-vein-zone",
  "mithril-deposit-zone",
  "truesilver-vein-zone",
  "thorium-vein-zone",
  "dark-iron-deposit-zone",
];
const availableMiningRecipes = new Set<string>(
  content.recipes
    .filter((recipe) => recipe.professionId === "mining" && recipe.status === "available")
    .map((recipe) => recipe.id),
);
const expectedMiningRecipes = [
  "smelt_copper_bar",
  "smelt_tin_bar",
  "smelt_bronze_bar",
  "smelt_silver_bar",
  "smelt_iron_bar",
  "smelt_gold_bar",
  "smelt_steel_bar",
  "smelt_mithril_bar",
  "smelt_truesilver_bar",
  "smelt_thorium_bar",
  "smelt_dark_iron_bar",
  "smelt_enchanted_thorium_bar",
  "smelt_elementium_bar",
];
const blacksmithRecipes = content.recipes.filter(
  (recipe) => recipe.professionId === "blacksmithing" && recipe.status === "available",
);
const missingSites = expectedMiningSites.filter((id) => !availableMiningSites.has(id));
const missingRecipes = expectedMiningRecipes.filter((id) => !availableMiningRecipes.has(id));
if (missingSites.length || missingRecipes.length || blacksmithRecipes.length < 227) {
  console.error(
    JSON.stringify(
      {
        missingSites,
        missingRecipes,
        blacksmithRecipeCount: blacksmithRecipes.length,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} else {
  console.log(
    `Classic 采矿/锻造内容审计通过：采集矿类 ${availableMiningSites.size}，熔炼配方 ${availableMiningRecipes.size}，锻造配方 ${blacksmithRecipes.length}。`,
  );
}
