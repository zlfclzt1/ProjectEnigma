import { describe, expect, it } from "vitest";
import {
  compareLootAssignmentCandidates,
  type LootAssignmentCandidate,
} from "../../src/domain/equipment/loot-assignment-ranking";
import { asBrandedId } from "../../src/domain/shared/ids";

function candidate(overrides: Partial<LootAssignmentCandidate> = {}): LootAssignmentCandidate {
  return {
    memberId: asBrandedId<"MemberId">("member_1"),
    wishlistMatch: "none",
    primaryResponsibilityDelta: 1,
    currentSlotItemLevel: 20,
    joinedAt: 100,
    replacementSlot: "back",
    displacedItemInstanceIds: [],
    reasons: [],
    ...overrides,
  };
}

describe("loot assignment ranking", () => {
  it("applies each tie-break level in order", () => {
    const base = candidate();
    expect(
      compareLootAssignmentCandidates(candidate({ wishlistMatch: "preferred" }), base),
    ).toBeLessThan(0);
    expect(
      compareLootAssignmentCandidates(
        candidate({ wishlistMatch: "acceptable" }),
        candidate({ wishlistMatch: "none" }),
      ),
    ).toBeLessThan(0);
    expect(
      compareLootAssignmentCandidates(
        candidate({ primaryResponsibilityDelta: 2 }),
        candidate({ primaryResponsibilityDelta: 1 }),
      ),
    ).toBeLessThan(0);
    expect(
      compareLootAssignmentCandidates(
        candidate({ currentSlotItemLevel: 10 }),
        candidate({ currentSlotItemLevel: 20 }),
      ),
    ).toBeLessThan(0);
    expect(
      compareLootAssignmentCandidates(candidate({ joinedAt: 50 }), candidate({ joinedAt: 100 })),
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
