import { describe, expect, it } from "vitest";
import {
  acceptMemberQuest,
  claimMemberQuest,
  completeMemberQuest,
  createEmptyMemberQuestState,
  recordMemberQuestEncounterVictory,
} from "../../src/domain/member/member-quest-state";
import { asBrandedId } from "../../src/domain/shared/ids";

const questId = asBrandedId<"QuestId">("rfc_power_to_destroy");

describe("member quest state", () => {
  it("tracks accepted, completed, and claimed states without duplicate transitions", () => {
    const state = createEmptyMemberQuestState();

    acceptMemberQuest(state, questId, 1_000);
    recordMemberQuestEncounterVictory(state, questId, asBrandedId<"EncounterId">("oggleflint"));
    recordMemberQuestEncounterVictory(state, questId, asBrandedId<"EncounterId">("oggleflint"));
    expect(state.entries[questId]).toMatchObject({
      status: "accepted",
      encounterVictoryIds: ["oggleflint"],
    });
    expect(() => acceptMemberQuest(state, questId, 1_001)).toThrow(/已经接取或完成过/);

    completeMemberQuest(state, questId, 2_000);
    expect(state.entries[questId]).toMatchObject({ status: "completed", completedAt: 2_000 });
    expect(() => completeMemberQuest(state, questId, 2_001)).toThrow(/不能重复完成/);

    claimMemberQuest(state, questId, 3_000);
    expect(state.entries[questId]).toMatchObject({ status: "claimed", claimedAt: 3_000 });
    expect(() => claimMemberQuest(state, questId, 3_001)).toThrow(/已经领取过/);
  });

  it("keeps the same quest independent between two members", () => {
    const first = createEmptyMemberQuestState();
    const second = createEmptyMemberQuestState();

    acceptMemberQuest(first, questId, 1_000);
    completeMemberQuest(first, questId, 2_000);

    expect(first.entries[questId]?.status).toBe("completed");
    expect(second.entries[questId]).toBeUndefined();
    acceptMemberQuest(second, questId, 3_000);
    expect(second.entries[questId]?.status).toBe("accepted");
  });
});
