import { describe, expect, it } from "vitest";
import { browserContentModules, loadBrowserContentRegistry } from "../../src/content/manifest";
import { loadContentRegistry } from "../../src/content/registry";

function clonedModules(): Record<string, unknown> {
  return structuredClone(browserContentModules) as Record<string, unknown>;
}

function groupsIn(modules: Record<string, unknown>): Array<{
  id: string;
  parentId?: string;
  order: number;
  dungeonIds?: string[];
}> {
  const key = Object.keys(modules).find((path) =>
    path.endsWith("/content/dungeon-groups/classic.json"),
  );
  if (!key) throw new Error("Expected dungeon display groups");
  return (
    modules[key] as {
      groups: Array<{
        id: string;
        parentId?: string;
        order: number;
        dungeonIds?: string[];
      }>;
    }
  ).groups;
}

describe("dungeon display groups", () => {
  it("places every formal dungeon in exactly one ordered leaf group", () => {
    const content = loadBrowserContentRegistry();
    const groupedDungeonIds = content.dungeonDisplayGroups.flatMap(
      (group) => group.dungeonIds ?? [],
    );

    expect(content.dungeonDisplayGroups.map((group) => group.id)).toEqual([
      "growth_dungeons_10_45",
      "advanced_dungeons_45_60",
      "raid_prep_dungeons_60",
      "dire_maul_branch",
    ]);
    expect(new Set(groupedDungeonIds).size).toBe(content.dungeons.length);
    expect(groupedDungeonIds).toContain("blackrock_depths_shadowforge_city");
    expect(groupedDungeonIds).toContain("dire_maul_east");
  });

  it("rejects duplicate, missing, cyclic, and dangling group relationships", () => {
    const duplicate = clonedModules();
    groupsIn(duplicate)[1]!.dungeonIds!.push("ragefire_chasm");
    expect(() => loadContentRegistry(duplicate)).toThrow(/被多个展示分组引用/);

    const missing = clonedModules();
    groupsIn(missing)[0]!.dungeonIds!.shift();
    expect(() => loadContentRegistry(missing)).toThrow(/副本未加入任何叶级展示分组/);

    const cyclic = clonedModules();
    const cyclicGroups = groupsIn(cyclic);
    cyclicGroups[0]!.parentId = cyclicGroups[1]!.id;
    cyclicGroups[1]!.parentId = cyclicGroups[0]!.id;
    expect(() => loadContentRegistry(cyclic)).toThrow(/副本展示分组存在循环/);

    const dangling = clonedModules();
    groupsIn(dangling)[0]!.parentId = "missing_parent";
    expect(() => loadContentRegistry(dangling)).toThrow(/不存在的父展示分组/);
  });
});
