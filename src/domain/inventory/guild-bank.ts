import type { ItemDefinitionId, ItemInstanceId } from "../shared/ids";

export interface GuildBank {
  stackCounts: Record<ItemDefinitionId, number>;
  reservedStackCounts?: Record<ItemDefinitionId, number>;
  /** 尚未产出但已为活动锁定的堆叠物数量。 */
  reservedOutputStackCounts?: Record<ItemDefinitionId, number>;
  /** 制造活动已经占用、但尚未落库的独立装备槽位。 */
  reservedEquipmentSlots?: number;
  equipmentInstanceIds: ItemInstanceId[];
  capacitySlots?: number;
}
