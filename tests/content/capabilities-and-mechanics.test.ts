import { describe, expect, it } from "vitest";
import { loadContentModules } from "../../src/content/loader";
import { browserContentModules, loadBrowserContentRegistry } from "../../src/content/manifest";
import { loadContentRegistry } from "../../src/content/registry";
import { asBrandedId } from "../../src/domain/shared/ids";

function clonedModules(): Record<string, unknown> {
  return structuredClone(browserContentModules) as Record<string, unknown>;
}

function moduleAt(modules: Record<string, unknown>, suffix: string): Record<string, unknown> {
  const key = Object.keys(modules).find((path) => path.endsWith(suffix));
  if (!key) throw new Error(`Missing fixture module ${suffix}`);
  return modules[key] as Record<string, unknown>;
}

describe("party capability and encounter mechanic content", () => {
  it("loads capability and mechanic indexes without changing current encounters", () => {
    const registry = loadBrowserContentRegistry();

    expect(registry.capabilityById.size).toBe(11);
    expect(registry.mechanicById.size).toBe(22);
    expect(registry.capabilityById.get(asBrandedId<"CapabilityId">("interrupt"))?.category).toBe(
      "interrupt",
    );
    expect(
      registry.mechanicById.get(asBrandedId<"MechanicId">("test_required_interrupt"))?.type,
    ).toBe("required");
    expect(
      registry.encounters
        .filter((encounter) => encounter.dungeonId === "ragefire_chasm")
        .every((encounter) => encounter.mechanicIds.length === 0),
    ).toBe(true);
  });

  it("rejects missing capability and encounter mechanic references", () => {
    const missingCapabilityModules = clonedModules();
    const mechanicFile = moduleAt(missingCapabilityModules, "/content/mechanics/classic.json");
    const mechanics = mechanicFile.mechanics as Array<{
      requirements: Array<{ capabilityId: string }>;
    }>;
    mechanics[0].requirements[0].capabilityId = "missing_capability";
    expect(() => loadContentRegistry(missingCapabilityModules)).toThrowError(
      /不存在的队伍能力.*missing_capability/s,
    );

    const missingMechanicModules = clonedModules();
    const encounterFile = moduleAt(
      missingMechanicModules,
      "/content/encounters/ragefire-chasm.json",
    );
    const encounters = encounterFile.encounters as Array<{ mechanicIds: string[] }>;
    encounters[0].mechanicIds = ["missing_mechanic"];
    expect(() => loadContentRegistry(missingMechanicModules)).toThrowError(
      /不存在的首领机制.*missing_mechanic/s,
    );
  });

  it("requires soft mechanics to define effects and rejects duplicate requirements", () => {
    const missingEffectsModules = clonedModules();
    const mechanicFile = moduleAt(missingEffectsModules, "/content/mechanics/classic.json");
    const mechanics = mechanicFile.mechanics as Array<{
      type: string;
      missingEffects?: Record<string, number>;
      requirements: Array<{ capabilityId: string; minimumValue: number }>;
    }>;
    delete mechanics[1].missingEffects;
    expect(() => loadContentModules(missingEffectsModules)).toThrowError(
      /推荐机制必须配置缺失时的影响/,
    );

    const duplicateModules = clonedModules();
    const duplicateFile = moduleAt(duplicateModules, "/content/mechanics/classic.json");
    const duplicateMechanics = duplicateFile.mechanics as Array<{
      requirements: Array<{ capabilityId: string; minimumValue: number }>;
    }>;
    duplicateMechanics[0].requirements.push({ capabilityId: "interrupt", minimumValue: 2 });
    expect(() => loadContentModules(duplicateModules)).toThrowError(
      /同一机制不能重复要求同一种能力/,
    );
  });
});
