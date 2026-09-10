import type { ContentRegistry } from "../../content/registry";
import { applyCollectionReward } from "../../domain/collection/collection-reward-rules";
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
      const applied = applyCollectionReward(draft, content, rewardId);
      return {
        ...applied,
        remainingFunds: draft.guild.funds,
      };
    },
  };
}
