import { describe, expect, it } from "vitest";
import { loadContentModules } from "../../src/content/loader";
import { browserContentModules, loadBrowserContentRegistry } from "../../src/content/manifest";
import { loadContentRegistry } from "../../src/content/registry";

function clonedModules(): Record<string, unknown> {
  return structuredClone(browserContentModules) as Record<string, unknown>;
}

function moduleAt(modules: Record<string, unknown>, suffix: string): Record<string, unknown> {
  const key = Object.keys(modules).find((path) => path.endsWith(suffix));
  if (!key) throw new Error(`Missing fixture module ${suffix}`);
  return modules[key] as Record<string, unknown>;
}

describe("classic spec capability progression", () => {
  it("covers every formal spec and exposes stable progression indexes", () => {
    const registry = loadBrowserContentRegistry();
    expect(registry.specCapabilities).toHaveLength(registry.specs.length);
    expect(registry.specCapabilityById.size).toBe(registry.specCapabilities.length);
    expect(registry.specCapabilities.every((entry) => entry.entries.length > 0)).toBe(true);
    expect(
      registry.specCapabilities.find((entry) => entry.specId === "priest_holy")?.entries,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ capabilityId: "healing", minimumLevel: 1, value: 1 }),
      ]),
    );
  });

  it("rejects missing capability references and incomplete spec coverage", () => {
    const missingCapabilityModules = clonedModules();
    const file = moduleAt(missingCapabilityModules, "/content/spec-capabilities/classic.json");
    const entries = file.specCapabilities as Array<{
      entries: Array<{ capabilityId: string }>;
    }>;
    entries[0].entries[0].capabilityId = "missing_capability";
    expect(() => loadContentRegistry(missingCapabilityModules)).toThrowError(
      /不存在的队伍能力.*missing_capability/s,
    );

    const incompleteModules = clonedModules();
    const incompleteFile = moduleAt(incompleteModules, "/content/spec-capabilities/classic.json");
    const progressions = incompleteFile.specCapabilities as Array<{ specId: string }>;
    progressions.shift();
    expect(() => loadContentRegistry(incompleteModules)).toThrowError(/没有定义能力成长/);
  });

  it("rejects duplicate capability entries within one spec", () => {
    const modules = clonedModules();
    const file = moduleAt(modules, "/content/spec-capabilities/classic.json");
    const progressions = file.specCapabilities as Array<{
      entries: Array<{ capabilityId: string; minimumLevel: number; value: number }>;
    }>;
    progressions[0].entries.push({ capabilityId: "tanking", minimumLevel: 20, value: 2 });
    expect(() => loadContentModules(modules)).toThrowError(/同一专精的能力不能重复定义/);
  });
});
