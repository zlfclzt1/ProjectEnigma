import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";

const content = loadBrowserContentRegistry();

describe("Classic 采矿与锻造目录", () => {
  it("covers every Classic mineral node without open-world competition", () => {
    const siteIds = content.gatheringSites
      .filter((site) => site.professionId === "mining" && site.status === "available")
      .map((site) => site.id);
    expect(siteIds).toEqual(
      expect.arrayContaining([
        "copper-vein-zone",
        "tin-vein-zone",
        "silver-vein-zone",
        "iron-deposit-zone",
        "gold-vein-zone",
        "mithril-deposit-zone",
        "truesilver-vein-zone",
        "thorium-vein-zone",
        "dark-iron-deposit-zone",
      ]),
    );
    expect(siteIds).toHaveLength(9);
  });

  it("keeps the complete Classic smelting and blacksmithing catalog executable", () => {
    const miningRecipes = content.recipes.filter(
      (recipe) => recipe.professionId === "mining" && recipe.status === "available",
    );
    const blacksmithingRecipes = content.recipes.filter(
      (recipe) => recipe.professionId === "blacksmithing" && recipe.status === "available",
    );
    expect(miningRecipes.map((recipe) => recipe.id)).toEqual(
      expect.arrayContaining([
        "smelt_copper_bar",
        "smelt_bronze_bar",
        "smelt_steel_bar",
        "smelt_dark_iron_bar",
        "smelt_enchanted_thorium_bar",
        "smelt_elementium_bar",
      ]),
    );
    expect(miningRecipes).toHaveLength(13);
    expect(blacksmithingRecipes).toHaveLength(227);
    expect(
      blacksmithingRecipes.every((recipe) =>
        recipe.output.every(
          (output) => output.type === "item-instance" || output.type === "material-stack",
        ),
      ),
    ).toBe(true);
  });
});
