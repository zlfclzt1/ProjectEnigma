import type { ItemInstance } from "../equipment/item-instance";
import type { ItemDefinitionId, ItemInstanceId } from "../shared/ids";
import type { GuildBank } from "./guild-bank";

export interface GuildBankCapacityPolicy {
  canAddStack(bank: GuildBank, definitionId: ItemDefinitionId, quantity: number): boolean;
  canAddEquipment(bank: GuildBank, instanceId: ItemInstanceId): boolean;
}

export const unlimitedGuildBankCapacity: GuildBankCapacityPolicy = {
  canAddStack: () => true,
  canAddEquipment: () => true,
};

function positiveInteger(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("仓库数量必须是正整数。");
  }
}

export function addStackToGuildBank(
  bank: GuildBank,
  definitionId: ItemDefinitionId,
  quantity: number,
  capacity: GuildBankCapacityPolicy = unlimitedGuildBankCapacity,
): GuildBank {
  positiveInteger(quantity);
  if (!capacity.canAddStack(bank, definitionId, quantity)) throw new Error("公会仓库容量不足。");
  return {
    ...bank,
    stackCounts: {
      ...bank.stackCounts,
      [definitionId]: (bank.stackCounts[definitionId] ?? 0) + quantity,
    },
  };
}

export function removeStackFromGuildBank(
  bank: GuildBank,
  definitionId: ItemDefinitionId,
  quantity: number,
): GuildBank {
  positiveInteger(quantity);
  const current = bank.stackCounts[definitionId] ?? 0;
  if (current < quantity) throw new Error("公会仓库材料不足。");
  const stackCounts = { ...bank.stackCounts };
  const remaining = current - quantity;
  if (remaining === 0) delete stackCounts[definitionId];
  else stackCounts[definitionId] = remaining;
  return { ...bank, stackCounts };
}

export function depositEquipmentInGuildBank(
  bank: GuildBank,
  instance: ItemInstance,
  capacity: GuildBankCapacityPolicy = unlimitedGuildBankCapacity,
): GuildBank {
  if (instance.ownerMemberId || instance.bound) {
    throw new Error("已绑定或已有归属的装备不能存入公会仓库。");
  }
  if (bank.equipmentInstanceIds.includes(instance.id)) throw new Error("装备已在公会仓库中。");
  if (!capacity.canAddEquipment(bank, instance.id)) throw new Error("公会仓库容量不足。");
  return { ...bank, equipmentInstanceIds: [...bank.equipmentInstanceIds, instance.id] };
}

export function withdrawEquipmentFromGuildBank(
  bank: GuildBank,
  instanceId: ItemInstanceId,
): GuildBank {
  if (!bank.equipmentInstanceIds.includes(instanceId)) throw new Error("公会仓库中没有该装备。");
  return {
    ...bank,
    equipmentInstanceIds: bank.equipmentInstanceIds.filter((id) => id !== instanceId),
  };
}
