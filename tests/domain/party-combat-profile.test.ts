import { describe, expect, it } from "vitest";
import type { CombatProfile } from "../../src/domain/combat/combat-profile";
import { buildPartyCombatProfile } from "../../src/domain/combat/party-combat-profile";
import { asBrandedId } from "../../src/domain/shared/ids";

function profile(
  id: string,
  role: CombatProfile["role"],
  capabilities: CombatProfile["capabilities"],
  formulaVersion = "classic-light-v1",
): CombatProfile {
  return {
    formulaVersion: asBrandedId<"FormulaVersion">(formulaVersion),
    memberId: asBrandedId<"MemberId">(id),
    role,
    capabilities,
    utility: { interruptScore: 0, dispelScore: 0, crowdControlScore: 0 },
    diagnostics: [],
  };
}

describe("party combat profile", () => {
  it("uses tank survivability and threat, healer output, and every member's damage", () => {
    const result = buildPartyCombatProfile([
      profile("tank", "tank", { survivability: 16, threat: 9, healing: 1, damage: 4 }),
      profile("healer", "healer", {
        survivability: 5,
        threat: 2,
        healing: 15,
        damage: 3,
      }),
      profile("dps", "dps", { survivability: 4, threat: 3, healing: 2, damage: 12 }),
    ]);

    expect(result.contribution.tank).toBeCloseTo(12 * 0.67);
    expect(result.contribution.healing).toBeCloseTo(15 * 0.67);
    expect(result.contribution.damage).toBeCloseTo(19 * 0.76);
  });

  it("rejects empty, mixed-version, and uncalibrated parties", () => {
    expect(() => buildPartyCombatProfile([])).toThrow(/空队伍/);
    expect(() =>
      buildPartyCombatProfile([
        profile("a", "dps", { survivability: 1, threat: 1, healing: 1, damage: 1 }),
        profile("b", "dps", { survivability: 1, threat: 1, healing: 1, damage: 1 }, "future-v2"),
      ]),
    ).toThrow(/混用多个/);
    expect(() =>
      buildPartyCombatProfile([
        profile(
          "future",
          "dps",
          { survivability: 1, threat: 1, healing: 1, damage: 1 },
          "future-v2",
        ),
      ]),
    ).toThrow(/缺少队伍能力校准/);
  });
});
