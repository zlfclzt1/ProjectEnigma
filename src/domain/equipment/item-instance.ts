import type {
  ActivityId,
  DungeonId,
  EnchantmentId,
  EncounterId,
  ItemDefinitionId,
  ItemInstanceId,
  MemberId,
  PendingLootId,
  RandomSuffixId,
  RecipeId,
} from "../shared/ids";

export type ItemAcquisitionSource =
  | { type: "starter" }
  | {
      type: "encounter";
      activityId: ActivityId;
      dungeonId: DungeonId;
      encounterId: EncounterId;
    }
  | { type: "crafting"; activityId: ActivityId; recipeId: RecipeId }
  | { type: "grant"; reasonId: string };

export interface ItemInstance {
  id: ItemInstanceId;
  definitionId: ItemDefinitionId;
  randomSuffixId?: RandomSuffixId;
  ownerMemberId?: MemberId;
  bound: boolean;
  acquiredAt: number;
  source: ItemAcquisitionSource;
  enchantmentIds: EnchantmentId[];
}

export interface PendingLoot {
  id: PendingLootId;
  itemInstanceId: ItemInstanceId;
  sourceActivityId: ActivityId;
  eligibleMemberIds: MemberId[];
  acquiredAt: number;
}
