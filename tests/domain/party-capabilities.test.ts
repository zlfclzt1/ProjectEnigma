import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import type { CombatProfile } from "../../src/domain/combat/combat-profile";
import { aggregatePartyCapabilities } from "../../src/domain/combat/party-capabilities";
import { asBrandedId } from "../../src/domain/shared/ids";

const content = loadBrowserContentRegistry();

function profile(memberId: string, role: CombatProfile["role"], damage = 4): CombatProfile {
  return {
    formulaVersion: asBrandedId<"FormulaVersion">("classic-light-v1"),
    memberId: asBrandedId<"MemberId">(memberId),
    role,
    capabilities: { survivability: 9, threat: 4, healing: 5, damage },
    utility: { interruptScore: 0, dispelScore: 0, crowdControlScore: 0 },
    diagnostics: [],
  };
}

describe("party capability snapshots", () => {
  it("combines spec/level progression with equipment-derived role capability", () => {
    const tank = profile("tank", "tank");
    const rogue = profile("rogue", "dps");
    const snapshot = aggregatePartyCapabilities(
      content,
      [
        {
          memberId: tank.memberId,
          specId: asBrandedId<"SpecId">("warrior_protection"),
          level: 10,
        },
        {
          memberId: rogue.memberId,
          specId: asBrandedId<"SpecId">("rogue_combat"),
          level: 9,
        },
      ],
      [tank, rogue],
    );

    expect(snapshot.values.tanking).toBe(7);
    expect(snapshot.values.damage).toBe(5);
    expect(snapshot.values.interrupt).toBe(1);
    expect(snapshot.contributions.damage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ memberId: rogue.memberId, source: "progression", value: 1 }),
        expect.objectContaining({ memberId: rogue.memberId, source: "combat-profile", value: 4 }),
      ]),
    );
  });

  it("unlocks progression entries at their minimum level", () => {
    const rogue = profile("rogue", "dps");
    const below = aggregatePartyCapabilities(
      content,
      [
        {
          memberId: rogue.memberId,
          specId: asBrandedId<"SpecId">("rogue_combat"),
          level: 9,
        },
      ],
      [rogue],
    );
    const ready = aggregatePartyCapabilities(
      content,
      [
        {
          memberId: rogue.memberId,
          specId: asBrandedId<"SpecId">("rogue_combat"),
          level: 10,
        },
      ],
      [rogue],
    );

    expect(below.values.interrupt).toBeUndefined();
    expect(ready.values.interrupt).toBe(1);
    expect(ready.values.crowd_control).toBe(1);
  });
});
