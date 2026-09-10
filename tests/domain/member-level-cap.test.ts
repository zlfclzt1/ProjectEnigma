import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import {
  applyMemberExperience,
  BASE_MEMBER_LEVEL_CAP,
  EXTENDED_MEMBER_LEVEL_CAP,
  getMemberLevelCap,
} from "../../src/domain/member/member-level-cap";
import { asBrandedId } from "../../src/domain/shared/ids";
import { createGameStateFixture } from "../helpers/game-state-v2-factory";

const content = loadBrowserContentRegistry();
const graduationRewardId = asBrandedId<"CollectionRewardId">("zulfarrak_level_45_graduation");

describe("member level cap", () => {
  it("keeps new guilds capped at 45 and derives the level-60 unlock from an existing claim", () => {
    const state = createGameStateFixture();

    expect(getMemberLevelCap(state, content)).toBe(BASE_MEMBER_LEVEL_CAP);

    state.collection.claimedRewardIds.push(graduationRewardId);
    expect(getMemberLevelCap(state, content)).toBe(EXTENDED_MEMBER_LEVEL_CAP);
  });

  it("applies experience against the supplied cap without retaining overflow", () => {
    const state = createGameStateFixture();
    const member = Object.values(state.members)[0]!;

    member.progression = { level: 44, experience: 0.8, specId: member.progression.specId };
    expect(applyMemberExperience(member, 1, BASE_MEMBER_LEVEL_CAP)).toBeCloseTo(0.2);
    expect(member.progression).toMatchObject({ level: 45, experience: 0 });

    expect(applyMemberExperience(member, 1.25, EXTENDED_MEMBER_LEVEL_CAP)).toBe(1.25);
    expect(member.progression).toMatchObject({ level: 46, experience: 0.25 });

    member.progression.level = 59;
    member.progression.experience = 0.75;
    expect(applyMemberExperience(member, 1, EXTENDED_MEMBER_LEVEL_CAP)).toBeCloseTo(0.25);
    expect(member.progression).toMatchObject({ level: 60, experience: 0 });

    member.progression.experience = 0.5;
    expect(applyMemberExperience(member, 1, EXTENDED_MEMBER_LEVEL_CAP)).toBe(0);
    expect(member.progression).toMatchObject({ level: 60, experience: 0 });
  });
});
