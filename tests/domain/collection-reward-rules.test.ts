import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import {
  evaluateCollectionReward,
  getClaimedCollectionBenefits,
  hasManagementFeature,
} from "../../src/domain/collection/collection-reward-rules";
import { asBrandedId } from "../../src/domain/shared/ids";
import { createGameStateFixture } from "../helpers/game-state-v2-factory";

const content = loadBrowserContentRegistry();

function acquire(state: ReturnType<typeof createGameStateFixture>, ...itemIds: string[]): void {
  for (const itemId of itemIds) {
    state.collection.items[asBrandedId<"ItemDefinitionId">(itemId)] = {
      acquisitionCount: 1,
      seenRandomSuffixIds: [],
    };
  }
}

describe("collection reward rules", () => {
  it("evaluates dungeon, set, and global progress from permanent discovery history", () => {
    const state = createGameStateFixture();
    acquire(state, "10412", "6460", "13245", "6472");

    expect(
      evaluateCollectionReward(
        state,
        content,
        asBrandedId<"CollectionRewardId">("prototype_wailing_caverns_half_catalog"),
      ),
    ).toMatchObject({
      acquiredItemCount: 4,
      totalItemCount: 8,
      completionPercent: 50,
      conditionMet: true,
      claimed: false,
      claimable: true,
    });
    expect(
      evaluateCollectionReward(
        state,
        content,
        asBrandedId<"CollectionRewardId">("prototype_wailing_collection_set"),
      ),
    ).toMatchObject({ totalItemCount: 2, completionPercent: 100, conditionMet: true });
    expect(
      evaluateCollectionReward(
        state,
        content,
        asBrandedId<"CollectionRewardId">("prototype_global_catalog_ten_percent"),
      ),
    ).toMatchObject({ acquiredItemCount: 4, totalItemCount: 34, conditionMet: true });
  });

  it("derives management and display unlocks only from claimed reward ids", () => {
    const state = createGameStateFixture();
    state.collection.claimedRewardIds.push(
      asBrandedId<"CollectionRewardId">("prototype_wailing_collection_set"),
      asBrandedId<"CollectionRewardId">("prototype_global_catalog_ten_percent"),
    );

    expect(getClaimedCollectionBenefits(state, content)).toEqual({
      managementFeatureIds: ["catalog_set_filter"],
      displayRecordIds: ["collector_first_steps"],
    });
    expect(
      hasManagementFeature(
        state,
        content,
        asBrandedId<"ManagementFeatureId">("catalog_set_filter"),
      ),
    ).toBe(true);
  });
});
