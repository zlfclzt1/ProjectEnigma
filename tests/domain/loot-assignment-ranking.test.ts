import { describe, expect, it } from "vitest";
import {
  compareLootAssignmentCandidates,
  type LootAssignmentCandidate,
} from "../../src/domain/equipment/loot-assignment-ranking";
import { asBrandedId } from "../../src/domain/shared/ids";

function candidate(overrides: Partial<LootAssignmentCandidate> = {}): LootAssignmentCandidate {
  return {
    memberId: asBrandedId<"MemberId">("member_1"),
    primaryResponsibilityDelta: 1,
    primaryResponsibilityPercent: 5,
    replacementSlot: "back",
    displacedItemInstanceIds: [],
    reasons: [],
    ...overrides,
  };
}

describe("loot assignment ranking", () => {
  it("sorts by main-responsibility percentage and then stable member id", () => {
    expect(
      compareLootAssignmentCandidates(
        candidate({ primaryResponsibilityPercent: 8 }),
        candidate({ primaryResponsibilityPercent: 5 }),
      ),
    ).toBeLessThan(0);
    expect(
      compareLootAssignmentCandidates(
        candidate({ memberId: asBrandedId<"MemberId">("member_1") }),
        candidate({ memberId: asBrandedId<"MemberId">("member_2") }),
      ),
    ).toBeLessThan(0);
  });

  it("returns equality only when every stable ranking field matches", () => {
    expect(compareLootAssignmentCandidates(candidate(), candidate())).toBe(0);
  });
});
