import type { ItemDefinitionId, ItemInstanceId } from "../shared/ids";

export interface GuildBank {
  stackCounts: Record<ItemDefinitionId, number>;
  equipmentInstanceIds: ItemInstanceId[];
}
