import { describe, expect, it } from "vitest";
import { getOverviewView } from "../../src/application/queries/get-overview-view";
import { getRecruitmentView } from "../../src/application/queries/get-recruitment-view";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { createNewGame } from "../../src/domain/guild/new-game";
import { asBrandedId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { FakeClock } from "../helpers/runtime-fakes";

const content = loadBrowserContentRegistry();

function state() {
  return createNewGame({
    slotId: asBrandedId<"SaveSlotId">("ui-query"),
    content,
    contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
    clock: new FakeClock(1_000),
    ids: new LocalIdGenerator(),
    random: new SeededRandomSource("ui-query"),
  });
}

describe("Vue view queries", () => {
  it("projects recruitment facts without leaking candidate domain objects", () => {
    const view = getRecruitmentView(state(), content, 1_000);

    expect(view).toMatchObject({
      candidateCount: 3,
      candidateCapacity: 10,
      memberCount: 5,
      memberCapacity: 10,
      funds: 100,
      paidRefreshCost: 100,
      canPaidRefresh: true,
      remainingMilliseconds: 30 * 60 * 1_000,
    });
    expect(view.candidates).toHaveLength(3);
    for (const candidate of view.candidates) {
      expect(candidate.level).toBe(10);
      expect(candidate.itemLevel).toBe(10);
      expect(candidate.className).not.toBe("未知职业");
      expect(["tank", "healer", "dps"]).toContain(candidate.role);
      expect(candidate.personalityBenefit.length).toBeGreaterThan(0);
      expect(candidate.personalityDrawback.length).toBeGreaterThan(0);
      expect(candidate).not.toHaveProperty("identity");
      expect(candidate).not.toHaveProperty("progression");
    }
  });

  it("projects overview counts and only active activities", () => {
    const view = getOverviewView(state(), content);
    expect(view).toMatchObject({
      guildName: "神秘公会",
      funds: 100,
      memberCount: 5,
      idleMemberCount: 5,
      activeMemberCount: 0,
      candidateCount: 3,
      pendingLootCount: 0,
    });
    expect(view.activities).toEqual([]);
  });
});
