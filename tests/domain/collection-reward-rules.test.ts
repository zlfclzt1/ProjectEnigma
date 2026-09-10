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

const valorItemIds = ["16730", "16731", "16732", "16733", "16734", "16735", "16736", "16737"];

describe("collection reward rules", () => {
  it("evaluates dungeon, set, and global progress from permanent discovery history", () => {
    const state = createGameStateFixture();
    acquire(
      state,
      "10412",
      "6460",
      "13245",
      "6472",
      "6449",
      "6469",
      "6631",
      "6627",
      "5404",
      "10410",
      "6465",
      "6681",
      "7683",
      "7710",
      "19507",
      "10776",
      "10775",
      "9389",
      "9388",
      "9390",
      "9640",
      ...valorItemIds,
    );

    expect(
      evaluateCollectionReward(
        state,
        content,
        asBrandedId<"CollectionRewardId">("prototype_wailing_caverns_half_catalog"),
      ),
    ).toMatchObject({
      acquiredItemCount: 11,
      totalItemCount: 21,
      completionPercent: (11 / 21) * 100,
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
    ).toMatchObject({ totalItemCount: 8, completionPercent: 100, conditionMet: true });
    expect(
      evaluateCollectionReward(
        state,
        content,
        asBrandedId<"CollectionRewardId">("prototype_global_catalog_ten_percent"),
      ),
    ).toMatchObject({ acquiredItemCount: 21, totalItemCount: 210, conditionMet: true });
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

  it("derives the stage milestone from permanent final-boss victory history", () => {
    const state = createGameStateFixture();
    const rewardId = asBrandedId<"CollectionRewardId">("zulfarrak_level_45_graduation");

    expect(evaluateCollectionReward(state, content, rewardId)).toMatchObject({
      totalItemCount: 1,
      completionPercent: 0,
      conditionMet: false,
      claimable: false,
    });

    state.history.encounterVictoryCounts[asBrandedId<"EncounterId">("zulfarrak_chief_ukorz")] = 1;
    expect(evaluateCollectionReward(state, content, rewardId)).toMatchObject({
      acquiredItemCount: 1,
      totalItemCount: 1,
      completionPercent: 100,
      conditionMet: true,
      claimable: true,
    });
  });
});
