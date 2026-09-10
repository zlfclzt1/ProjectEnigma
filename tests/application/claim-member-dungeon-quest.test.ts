import { describe, expect, it } from "vitest";
import { claimMemberDungeonQuestCommand } from "../../src/application/commands/claim-member-dungeon-quest";
import { acceptMemberDungeonQuestCommand } from "../../src/application/commands/accept-member-dungeon-quest";
import { completeMemberQuest } from "../../src/domain/member/member-quest-state";
import { createNewGame } from "../../src/domain/guild/new-game";
import { asBrandedId } from "../../src/domain/shared/ids";
import { browserContentModules, loadBrowserContentRegistry } from "../../src/content/manifest";
import { loadContentRegistry } from "../../src/content/registry";
import { GameSession } from "../../src/application/services/game-session";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { FakeClock } from "../helpers/runtime-fakes";

const content = loadBrowserContentRegistry();
const questId = asBrandedId<"QuestId">("rfc_returning_lost_satchel");
const firstItemId = asBrandedId<"ItemDefinitionId">("15452");
const secondItemId = asBrandedId<"ItemDefinitionId">("15453");

function newState() {
  return createNewGame({
    slotId: asBrandedId<"SaveSlotId">("claim-quest"),
    content,
    contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
    clock: new FakeClock(1_000),
    ids: new LocalIdGenerator(),
    random: new SeededRandomSource("claim-quest"),
  });
}

describe("claim member dungeon quest", () => {
  it("equips exactly one selected reward to the completing member and records collection", async () => {
    const state = newState();
    const member = Object.values(state.members)[0]!;
    member.identity.classId = asBrandedId<"ClassId">("mage");
    member.progression.specId = asBrandedId<"SpecId">("mage_frost");
    const saves = new MemorySaveRepository();
    await saves.create(state);
    const session = GameSession.fromState(saves, state);
    await session.execute(
      acceptMemberDungeonQuestCommand({ content, clock: new FakeClock(2_000) }, member.id, questId),
    );
    await session.execute({
      type: "mark-quest-complete",
      execute(draft) {
        completeMemberQuest(draft.members[member.id]!.quests, questId, 3_000);
      },
    });

    const result = await session.execute(
      claimMemberDungeonQuestCommand(
        { content, clock: new FakeClock(4_000) },
        member.id,
        questId,
        firstItemId,
      ),
    );
    expect(result.status).toBe("committed");
    const snapshot = session.snapshot();
    const updated = snapshot.members[member.id]!;
    expect(updated.quests.entries[questId]).toMatchObject({ status: "claimed", claimedAt: 4_000 });
    expect(Object.values(snapshot.itemInstances).some((item) => item.source.type === "quest")).toBe(
      true,
    );
    expect(snapshot.collection.items[firstItemId]?.acquisitionCount).toBe(1);
    expect(
      Object.values(updated.equipment).some(
        (id) => snapshot.itemInstances[id!]?.definitionId === firstItemId,
      ),
    ).toBe(true);
    await expect(
      session.execute(
        claimMemberDungeonQuestCommand(
          { content, clock: new FakeClock(5_000) },
          member.id,
          questId,
          secondItemId,
        ),
      ),
    ).rejects.toThrow(/尚未完成或奖励已经领取/);
  });

  it("rejects an item outside the reward choice and an ineligible member", async () => {
    const state = newState();
    const member = Object.values(state.members)[0]!;
    member.quests.entries[questId] = {
      questId,
      status: "completed",
      acceptedAt: 1_000,
      completedAt: 2_000,
      encounterVictoryIds: [],
    };
    const command = claimMemberDungeonQuestCommand(
      { content, clock: new FakeClock(3_000) },
      member.id,
      questId,
      asBrandedId<"ItemDefinitionId">("14145"),
    );
    expect(() => command.execute(state)).toThrow(/任务提供的装备/);
  });

  it("grants every fixed reward, equips eligible gear, and sells unusable fixed gear", async () => {
    const modules = structuredClone(browserContentModules) as Record<string, unknown>;
    const questPath = Object.keys(modules).find((path) =>
      path.endsWith("/content/quests/ragefire-chasm.json"),
    )!;
    const quest = (
      modules[questPath] as {
        quests: Array<{
          id: string;
          rewards: { fixedItemIds?: string[]; itemChoiceIds: string[] };
        }>;
      }
    ).quests.find((candidate) => candidate.id === questId)!;
    quest.rewards.fixedItemIds = ["15453"];
    quest.rewards.itemChoiceIds = ["15452"];
    const fixedContent = loadContentRegistry(modules);
    const state = createNewGame({
      slotId: asBrandedId<"SaveSlotId">("claim-fixed-quest"),
      content: fixedContent,
      contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
      clock: new FakeClock(1_000),
      ids: new LocalIdGenerator(),
      random: new SeededRandomSource("claim-fixed-quest"),
    });
    const member = Object.values(state.members)[0]!;
    member.identity.classId = asBrandedId<"ClassId">("mage");
    member.progression.specId = asBrandedId<"SpecId">("mage_frost");
    member.quests.entries[questId] = {
      questId,
      status: "completed",
      acceptedAt: 1_000,
      completedAt: 2_000,
      encounterVictoryIds: [],
    };
    const initialItemCount = Object.keys(state.itemInstances).length;
    const initialFunds = state.guild.funds;

    const result = await claimMemberDungeonQuestCommand(
      { content: fixedContent, clock: new FakeClock(3_000) },
      member.id,
      questId,
      firstItemId,
    ).execute(state);

    expect(result.itemDefinitionIds).toEqual(["15453", "15452"]);
    expect(result.itemInstanceIds).toHaveLength(1);
    expect(result.saleProceeds).toBeGreaterThan(0);
    expect(state.collection.items[firstItemId]?.acquisitionCount).toBe(1);
    expect(state.collection.items[secondItemId]?.acquisitionCount).toBe(1);
    expect(Object.values(state.itemInstances)).toHaveLength(initialItemCount);
    expect(state.guild.funds).toBe(initialFunds + result.saleProceeds);
  });
});
