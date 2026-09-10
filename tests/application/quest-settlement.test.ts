import { describe, expect, it } from "vitest";
import { claimMemberDungeonQuestsCommand } from "../../src/application/commands/claim-member-dungeon-quests";
import { getQuestSettlementView } from "../../src/application/queries/get-quest-settlement-view";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { createNewGame } from "../../src/domain/guild/new-game";
import { asBrandedId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { FakeClock } from "../helpers/runtime-fakes";

const content = loadBrowserContentRegistry();
const questId = asBrandedId<"QuestId">("rfc_returning_lost_satchel");
const wishlistItemId = asBrandedId<"ItemDefinitionId">("15453");

function completedState() {
  const state = createNewGame({
    slotId: asBrandedId<"SaveSlotId">("quest-settlement"),
    content,
    contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
    clock: new FakeClock(1_000),
    ids: new LocalIdGenerator(),
    random: new SeededRandomSource("quest-settlement"),
  });
  const members = Object.values(state.members).slice(0, 2);
  for (const member of members) {
    member.quests.entries[questId] = {
      questId,
      status: "completed",
      acceptedAt: 1_000,
      completedAt: 2_000,
      encounterVictoryIds: [],
    };
  }
  members[0]!.wishlist.entries.push({
    itemDefinitionId: wishlistItemId,
    acceptableRandomSuffixIds: [],
  });
  return { state, members };
}

describe("quest settlement", () => {
  it("recommends rewards from wishlists and settles several member quests together", async () => {
    const { state, members } = completedState();
    const view = getQuestSettlementView(
      state,
      content,
      members.map((member) => member.id),
    );

    expect(view.entries).toHaveLength(2);
    expect(view.entries.find((entry) => entry.memberId === members[0]!.id)).toMatchObject({
      recommendedItemId: wishlistItemId,
      choices: expect.arrayContaining([
        expect.objectContaining({
          id: wishlistItemId,
          recommended: true,
          reasons: expect.arrayContaining(["愿望单目标"]),
        }),
      ]),
    });

    const results = await claimMemberDungeonQuestsCommand(
      { content, clock: new FakeClock(3_000) },
      view.entries.map((entry) => ({
        memberId: entry.memberId,
        questId: entry.questId,
        itemDefinitionId: entry.recommendedItemId,
      })),
    ).execute(state);

    expect(results).toHaveLength(2);
    expect(
      members.every(
        (member) => state.members[member.id]!.quests.entries[questId]?.status === "claimed",
      ),
    ).toBe(true);
  });
});
