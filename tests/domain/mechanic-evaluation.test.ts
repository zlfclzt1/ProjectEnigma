import { describe, expect, it } from "vitest";
import { getPartyPreview } from "../../src/application/queries/get-party-preview";
import { browserContentModules } from "../../src/content/manifest";
import { loadContentRegistry } from "../../src/content/registry";
import { createNewGame } from "../../src/domain/guild/new-game";
import { asBrandedId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { FakeClock } from "../helpers/runtime-fakes";

function clonedModules(): Record<string, unknown> {
  return structuredClone(browserContentModules) as Record<string, unknown>;
}

function moduleAt(modules: Record<string, unknown>, suffix: string): Record<string, unknown> {
  const key = Object.keys(modules).find((path) => path.endsWith(suffix));
  if (!key) throw new Error(`Missing fixture module ${suffix}`);
  return modules[key] as Record<string, unknown>;
}

function stateFor(content: ReturnType<typeof loadContentRegistry>) {
  return createNewGame({
    slotId: asBrandedId<"SaveSlotId">("slot_mechanics"),
    content,
    contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
    clock: new FakeClock(1_000),
    ids: new LocalIdGenerator(),
    random: new SeededRandomSource("mechanic-test"),
  });
}

function attachMechanics(mechanicIds: string[], minimumValue = 99) {
  const modules = clonedModules();
  const encounterFile = moduleAt(modules, "/content/encounters/ragefire-chasm.json");
  const encounters = encounterFile.encounters as Array<{ mechanicIds: string[] }>;
  encounters[0].mechanicIds = mechanicIds;
  const mechanicFile = moduleAt(modules, "/content/mechanics/classic.json");
  const mechanics = mechanicFile.mechanics as Array<{
    id: string;
    requirements: Array<{ minimumValue: number }>;
  }>;
  for (const mechanic of mechanics) mechanic.requirements[0].minimumValue = minimumValue;
  return loadContentRegistry(modules);
}

describe("encounter mechanic evaluation", () => {
  it("blocks departure when a required capability is missing", () => {
    const content = attachMechanics(["test_required_interrupt"]);
    const state = stateFor(content);
    const result = getPartyPreview(
      state,
      content,
      asBrandedId<"DungeonId">("ragefire_chasm"),
      Object.values(state.members).map((member) => member.id),
    );

    expect(result).toMatchObject({
      ok: false,
      issues: [
        {
          code: "mechanic.required-missing",
          encounterId: "oggleflint",
        },
      ],
    });
    if (result.ok) throw new Error("Expected missing required mechanic");
    expect(result.issues[0]!.message).toContain("必须打断");
    expect(result.issues[0]!.message).toContain("打断");
  });

  it("applies recommended penalties to probability, healing pressure, and duration", () => {
    const baselineContent = loadContentRegistry(clonedModules());
    const content = attachMechanics(["test_recommended_magic_dispel"]);
    const baselineState = stateFor(baselineContent);
    const state = stateFor(content);
    const memberIds = Object.values(state.members).map((member) => member.id);
    const baseline = getPartyPreview(
      baselineState,
      baselineContent,
      asBrandedId<"DungeonId">("ragefire_chasm"),
      memberIds,
    );
    const penalized = getPartyPreview(
      state,
      content,
      asBrandedId<"DungeonId">("ragefire_chasm"),
      memberIds,
    );
    if (!baseline.ok || !penalized.ok) throw new Error("Expected valid previews");

    expect(penalized.preview.encounters[0]!.probability).toBeLessThan(
      baseline.preview.encounters[0]!.probability,
    );
    expect(penalized.preview.encounters[0]!.rawRatios.healing).toBeLessThan(
      baseline.preview.encounters[0]!.rawRatios.healing,
    );
    expect(penalized.preview.encounters[0]!.durationSeconds).toBeGreaterThan(
      baseline.preview.encounters[0]!.durationSeconds,
    );
    expect(penalized.preview.encounters[0]!.mechanics.mechanics[0]).toMatchObject({
      mechanicId: "test_recommended_magic_dispel",
      satisfied: false,
      appliedEffects: { healingMultiplier: 1.15, probabilityModifier: -0.05 },
    });
  });

  it("applies a repeated mechanic ID only once", () => {
    const once = attachMechanics(["test_recommended_magic_dispel"]);
    const repeated = attachMechanics([
      "test_recommended_magic_dispel",
      "test_recommended_magic_dispel",
    ]);
    const onceState = stateFor(once);
    const repeatedState = stateFor(repeated);
    const memberIds = Object.values(onceState.members).map((member) => member.id);
    const oncePreview = getPartyPreview(
      onceState,
      once,
      asBrandedId<"DungeonId">("ragefire_chasm"),
      memberIds,
    );
    const repeatedPreview = getPartyPreview(
      repeatedState,
      repeated,
      asBrandedId<"DungeonId">("ragefire_chasm"),
      memberIds,
    );
    if (!oncePreview.ok || !repeatedPreview.ok) throw new Error("Expected valid previews");

    expect(repeatedPreview.preview.encounters[0]).toEqual(oncePreview.preview.encounters[0]);
  });
});
