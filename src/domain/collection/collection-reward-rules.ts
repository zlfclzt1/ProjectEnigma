import type { ContentRegistry } from "../../content/registry";
import type {
  CollectionRewardCondition,
  CollectionRewardDefinition,
} from "../../content/schemas/collection-reward";
import type { GameState } from "../game-state";
import type {
  CollectionRewardId,
  DisplayRecordId,
  ItemDefinitionId,
  ManagementFeatureId,
} from "../shared/ids";

export interface CollectionRewardEligibility {
  readonly reward: CollectionRewardDefinition;
  readonly acquiredItemCount: number;
  readonly totalItemCount: number;
  readonly completionPercent: number;
  readonly conditionMet: boolean;
  readonly claimed: boolean;
  readonly claimable: boolean;
}

export interface ClaimedCollectionBenefits {
  readonly managementFeatureIds: readonly ManagementFeatureId[];
  readonly displayRecordIds: readonly DisplayRecordId[];
}

export function evaluateCollectionReward(
  state: GameState,
  content: ContentRegistry,
  rewardId: CollectionRewardId,
): CollectionRewardEligibility {
  const reward = content.collectionRewardById.get(rewardId);
  if (!reward) throw new Error("收藏奖励不存在。");

  const itemIds = getCollectionRewardItemIds(content, reward.condition);
  const acquiredItemCount = [...itemIds].filter(
    (itemId) => state.collection.items[itemId] !== undefined,
  ).length;
  const totalItemCount = itemIds.size;
  const completionPercent = totalItemCount === 0 ? 0 : (acquiredItemCount / totalItemCount) * 100;
  const conditionMet = completionPercent >= reward.condition.minimumPercent;
  const claimed = state.collection.claimedRewardIds.includes(reward.id);

  return {
    reward,
    acquiredItemCount,
    totalItemCount,
    completionPercent,
    conditionMet,
    claimed,
    claimable: conditionMet && !claimed,
  };
}

export function getClaimedCollectionBenefits(
  state: GameState,
  content: ContentRegistry,
): ClaimedCollectionBenefits {
  const managementFeatureIds = new Set<ManagementFeatureId>();
  const displayRecordIds = new Set<DisplayRecordId>();

  for (const rewardId of state.collection.claimedRewardIds) {
    const reward = content.collectionRewardById.get(rewardId);
    if (!reward) continue;
    for (const effect of reward.effects) {
      if (effect.type === "management-unlock") managementFeatureIds.add(effect.featureId);
      if (effect.type === "display-record") displayRecordIds.add(effect.recordId);
    }
  }

  return {
    managementFeatureIds: [...managementFeatureIds].sort(),
    displayRecordIds: [...displayRecordIds].sort(),
  };
}

export function hasManagementFeature(
  state: GameState,
  content: ContentRegistry,
  featureId: ManagementFeatureId,
): boolean {
  return getClaimedCollectionBenefits(state, content).managementFeatureIds.includes(featureId);
}

export function getCollectionRewardItemIds(
  content: ContentRegistry,
  condition: CollectionRewardCondition,
): ReadonlySet<ItemDefinitionId> {
  if (condition.type === "item-set-completion") {
    return new Set(content.itemSetById.get(condition.itemSetId)?.itemIds ?? []);
  }

  const dungeonIds =
    condition.type === "dungeon-completion"
      ? new Set([condition.dungeonId])
      : new Set(content.dungeons.map((dungeon) => dungeon.id));
  const itemIds = new Set<ItemDefinitionId>();
  for (const dungeon of content.dungeons) {
    if (!dungeonIds.has(dungeon.id)) continue;
    for (const encounterId of dungeon.route) {
      const lootTable = content.getLootTableForEncounter(encounterId);
      for (const entry of lootTable?.items ?? []) itemIds.add(entry.itemId);
    }
  }
  return itemIds;
}
