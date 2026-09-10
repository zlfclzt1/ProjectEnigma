import { describe, expect, it } from "vitest";
import { browserContentModules, loadBrowserContentRegistry } from "../../src/content/manifest";
import { loadContentRegistry } from "../../src/content/registry";

function clonedModules(): Record<string, unknown> {
  return structuredClone(browserContentModules) as Record<string, unknown>;
}

function upgradeFile(modules: Record<string, unknown>): Record<string, unknown> {
  const key = Object.keys(modules).find((path) =>
    path.endsWith("/content/guild-upgrades/member-capacity.json"),
  );
  if (!key) throw new Error("Missing guild upgrade fixture");
  return modules[key] as Record<string, unknown>;
}

describe("guild upgrade content", () => {
  it("defines the current member-capacity track in strict order", () => {
    const upgrades = loadBrowserContentRegistry().guildUpgrades;

    expect(upgrades.map((upgrade) => upgrade.id)).toEqual(["guild_roster_15", "guild_roster_20"]);
    expect(upgrades.map((upgrade) => upgrade.cost)).toEqual([500, 1500]);
    expect(upgrades.map((upgrade) => upgrade.effects[0])).toEqual([
      { type: "member-capacity", value: 15 },
      { type: "member-capacity", value: 20 },
    ]);
  });

  it("rejects duplicate track order, decreasing capacity and missing dungeons", () => {
    const modules = clonedModules();
    const file = upgradeFile(modules);
    const upgrades = file.guildUpgrades as Array<Record<string, unknown>>;
    upgrades[1].order = 10;
    upgrades[1].effects = [{ type: "member-capacity", value: 10 }];
    upgrades[1].requirements = [
      { type: "dungeon-clear-count", dungeonId: "missing_dungeon", count: 1 },
    ];

    expect(() => loadContentRegistry(modules)).toThrowError(/顺序重复/);
    expect(() => loadContentRegistry(modules)).toThrowError(/成员容量必须严格递增/);
    expect(() => loadContentRegistry(modules)).toThrowError(/不存在的副本/);
  });
});
