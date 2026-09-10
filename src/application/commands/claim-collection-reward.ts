import type { ContentRegistry } from "../../content/registry";
import { evaluateCollectionReward } from "../../domain/collection/collection-reward-rules";
import type {
  CollectionRewardId,
  DisplayRecordId,
  ManagementFeatureId,
} from "../../domain/shared/ids";
import type { GameCommand } from "../services/game-session";

export interface ClaimCollectionRewardResult {
  readonly rewardId: CollectionRewardId;
  readonly awardedFunds: number;
  readonly remainingFunds: number;
  readonly unlockedManagementFeatureIds: readonly ManagementFeatureId[];
  readonly unlockedDisplayRecordIds: readonly DisplayRecordId[];
}

export function claimCollectionRewardCommand(
  content: ContentRegistry,
  rewardId: CollectionRewardId,
): GameCommand<ClaimCollectionRewardResult> {
  return {
    type: "claim-collection-reward",
    execute(draft) {
      const eligibility = evaluateCollectionReward(draft, content, rewardId);
      if (eligibility.claimed) throw new Error("这项收藏奖励已经领取。");
      if (!eligibility.conditionMet) throw new Error("尚未满足这项收藏奖励的领取条件。");

      let awardedFunds = 0;
      const unlockedManagementFeatureIds: ManagementFeatureId[] = [];
      const unlockedDisplayRecordIds: DisplayRecordId[] = [];
      for (const effect of eligibility.reward.effects) {
        if (effect.type === "guild-funds") {
          draft.guild.funds += effect.amount;
          awardedFunds += effect.amount;
        } else if (effect.type === "management-unlock") {
          unlockedManagementFeatureIds.push(effect.featureId);
        } else {
          unlockedDisplayRecordIds.push(effect.recordId);
        }
      }

      draft.collection.claimedRewardIds.push(eligibility.reward.id);
      draft.collection.claimedRewardIds.sort();
      return {
        rewardId: eligibility.reward.id,
        awardedFunds,
        remainingFunds: draft.guild.funds,
        unlockedManagementFeatureIds,
        unlockedDisplayRecordIds,
      };
    },
  };
}
