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

export interface AppliedCollectionReward {
  readonly rewardId: CollectionRewardId;
  readonly awardedFunds: number;
  readonly unlockedManagementFeatureIds: readonly ManagementFeatureId[];
  readonly unlockedDisplayRecordIds: readonly DisplayRecordId[];
}

export function evaluateCollectionReward(
  state: GameState,
  content: ContentRegistry,
  rewardId: CollectionRewardId,
): CollectionRewardEligibility {
  const reward = content.collectionRewardById.get(rewardId);
  if (!reward) throw new Error("收藏奖励不存在。");

  if (reward.condition.type === "encounter-victory") {
    const victoryCount = state.history.encounterVictoryCounts[reward.condition.encounterId] ?? 0;
    const claimed = state.collection.claimedRewardIds.includes(reward.id);
    return {
      reward,
      acquiredItemCount: victoryCount > 0 ? 1 : 0,
      totalItemCount: 1,
      completionPercent: victoryCount > 0 ? 100 : 0,
      conditionMet: victoryCount > 0,
      claimed,
      claimable: victoryCount > 0 && !claimed,
    };
  }

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

export function applyCollectionReward(
  state: GameState,
  content: ContentRegistry,
  rewardId: CollectionRewardId,
): AppliedCollectionReward {
  const eligibility = evaluateCollectionReward(state, content, rewardId);
  if (eligibility.claimed) throw new Error("这项收藏奖励已经领取。");
  if (!eligibility.conditionMet) throw new Error("尚未满足这项收藏奖励的领取条件。");

  let awardedFunds = 0;
  const unlockedManagementFeatureIds: ManagementFeatureId[] = [];
  const unlockedDisplayRecordIds: DisplayRecordId[] = [];
  for (const effect of eligibility.reward.effects) {
    if (effect.type === "guild-funds") {
      state.guild.funds += effect.amount;
      awardedFunds += effect.amount;
    } else if (effect.type === "management-unlock") {
      unlockedManagementFeatureIds.push(effect.featureId);
    } else {
      unlockedDisplayRecordIds.push(effect.recordId);
    }
  }

  state.collection.claimedRewardIds.push(eligibility.reward.id);
  state.collection.claimedRewardIds.sort();
  return {
    rewardId: eligibility.reward.id,
    awardedFunds,
    unlockedManagementFeatureIds,
    unlockedDisplayRecordIds,
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
  if (condition.type === "encounter-victory") return new Set();
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
    for (const node of dungeon.route) {
      const encounterId = node.encounterId;
      const lootTable = content.getLootTableForEncounter(encounterId);
      for (const entry of lootTable?.items ?? []) itemIds.add(entry.itemId);
    }
  }
  return itemIds;
}
