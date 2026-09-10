import { describe, expect, it } from "vitest";
import { claimCollectionRewardCommand } from "../../src/application/commands/claim-collection-reward";
import { getItemCatalogView } from "../../src/application/queries/get-item-catalog-view";
import { GameSession } from "../../src/application/services/game-session";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { createGameStateFixture } from "../helpers/game-state-v2-factory";

const content = loadBrowserContentRegistry();
const fundsRewardId = asBrandedId<"CollectionRewardId">("prototype_wailing_caverns_half_catalog");
const managementRewardId = asBrandedId<"CollectionRewardId">("prototype_wailing_collection_set");

function acquire(state: ReturnType<typeof createGameStateFixture>, ...itemIds: string[]): void {
  for (const itemId of itemIds) {
    state.collection.items[asBrandedId<"ItemDefinitionId">(itemId)] = {
      acquisitionCount: 1,
      seenRandomSuffixIds: [],
    };
  }
}

describe("collection reward commands", () => {
  it("rejects missing rewards and unmet conditions without persisting partial effects", async () => {
    const state = createGameStateFixture();
    const saves = new MemorySaveRepository([state]);
    const session = GameSession.fromState(saves, state);

    await expect(
      session.execute(
        claimCollectionRewardCommand(content, asBrandedId<"CollectionRewardId">("missing_reward")),
      ),
    ).rejects.toThrow("收藏奖励不存在");
    await expect(
      session.execute(claimCollectionRewardCommand(content, fundsRewardId)),
    ).rejects.toThrow("尚未满足");

    expect(session.snapshot().guild.funds).toBe(100);
    expect(session.snapshot().collection.claimedRewardIds).toEqual([]);
    expect((await saves.load(state.slotId))?.revision).toBe(0);
  });

  it("commits funds and claimed state once even when the same claim is queued twice", async () => {
    const state = createGameStateFixture();
    acquire(state, "10412", "6460", "13245", "6472");
    const saves = new MemorySaveRepository([state]);
    const session = GameSession.fromState(saves, state);
    const command = claimCollectionRewardCommand(content, fundsRewardId);

    const results = await Promise.allSettled([session.execute(command), session.execute(command)]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(session.snapshot().guild.funds).toBe(350);
    expect(session.snapshot().collection.claimedRewardIds).toEqual([fundsRewardId]);
    await expect(session.execute(command)).rejects.toThrow("已经领取");
    expect(session.snapshot().guild.funds).toBe(350);
  });

  it("persists management unlocks and preserves GameSession save conflicts", async () => {
    const state = createGameStateFixture();
    state.guild.unlockedDungeonIds.push(asBrandedId<"DungeonId">("wailing_caverns"));
    acquire(state, "10412", "6460");
    const saves = new MemorySaveRepository([state]);
    const first = GameSession.fromState(saves, state);
    const stale = GameSession.fromState(saves, state);

    const claimed = await first.execute(claimCollectionRewardCommand(content, managementRewardId));
    expect(claimed).toMatchObject({
      status: "committed",
      result: { unlockedManagementFeatureIds: ["catalog_set_filter"] },
    });
    expect(getItemCatalogView(first.snapshot(), content).unlockedManagementFeatureIds).toEqual([
      "catalog_set_filter",
    ]);

    const conflict = await stale.execute(claimCollectionRewardCommand(content, managementRewardId));
    expect(conflict).toEqual({ status: "conflict", expectedRevision: 0, actualRevision: 1 });
    expect(stale.snapshot().collection.claimedRewardIds).toEqual([]);
    const persisted = await saves.load(state.slotId);
    if (!persisted || !("collection" in persisted)) throw new Error("Expected current save state");
    expect(persisted.collection.claimedRewardIds).toEqual([managementRewardId]);
  });
});
