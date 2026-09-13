import type { ItemInstance } from "../equipment/item-instance";
import type { ItemDefinitionId, ItemInstanceId } from "../shared/ids";
import type { GuildBank } from "./guild-bank";

export interface GuildBankCapacityPolicy {
  canAddStack(bank: GuildBank, definitionId: ItemDefinitionId, quantity: number): boolean;
  canAddEquipment(bank: GuildBank, instanceId: ItemInstanceId): boolean;
}

export interface GuildBankSlotPolicy {
  readonly capacitySlots: number;
  readonly stackLimitByItemId: ReadonlyMap<ItemDefinitionId, number>;
}

export function guildBankSlotUsage(
  bank: GuildBank,
  stackLimitByItemId: ReadonlyMap<ItemDefinitionId, number>,
): number {
  const stackSlots = [
    ...new Set([
      ...Object.keys(bank.stackCounts),
      ...Object.keys(bank.reservedOutputStackCounts ?? {}),
    ]),
  ].reduce((total, rawId) => {
    const itemId = rawId as ItemDefinitionId;
    const stackLimit = stackLimitByItemId.get(itemId) ?? 1;
    const quantity =
      (bank.stackCounts[itemId] ?? 0) + (bank.reservedOutputStackCounts?.[itemId] ?? 0);
    return total + Math.ceil(quantity / Math.max(1, stackLimit));
  }, 0);
  return stackSlots + bank.equipmentInstanceIds.length + (bank.reservedEquipmentSlots ?? 0);
}

export function slotCapacityPolicy(policy: GuildBankSlotPolicy): GuildBankCapacityPolicy {
  return {
    canAddStack(bank, definitionId, quantity) {
      const next = {
        ...bank,
        stackCounts: {
          ...bank.stackCounts,
          [definitionId]: (bank.stackCounts[definitionId] ?? 0) + quantity,
        },
      };
      return guildBankSlotUsage(next, policy.stackLimitByItemId) <= policy.capacitySlots;
    },
    canAddEquipment(bank) {
      return guildBankSlotUsage(bank, policy.stackLimitByItemId) + 1 <= policy.capacitySlots;
    },
  };
}

export const unlimitedGuildBankCapacity: GuildBankCapacityPolicy = {
  canAddStack: () => true,
  canAddEquipment: () => true,
};

export function reserveEquipmentSlots(
  bank: GuildBank,
  quantity: number,
  stackLimitByItemId: ReadonlyMap<ItemDefinitionId, number> = new Map(),
): GuildBank {
  positiveInteger(quantity);
  const capacity = bank.capacitySlots ?? Number.MAX_SAFE_INTEGER;
  if (guildBankSlotUsage(bank, stackLimitByItemId) + quantity > capacity) {
    throw new Error("公会仓库容量不足。");
  }
  return {
    ...bank,
    reservedEquipmentSlots: (bank.reservedEquipmentSlots ?? 0) + quantity,
  };
}

export function releaseReservedEquipmentSlots(bank: GuildBank, quantity: number): GuildBank {
  positiveInteger(quantity);
  const current = bank.reservedEquipmentSlots ?? 0;
  if (current < quantity) throw new Error("公会仓库预留装备槽位不足。");
  const remaining = current - quantity;
  return {
    ...bank,
    ...(remaining > 0
      ? { reservedEquipmentSlots: remaining }
      : { reservedEquipmentSlots: undefined }),
  };
}

export function commitReservedEquipmentSlot(bank: GuildBank): GuildBank {
  return releaseReservedEquipmentSlots(bank, 1);
}

export function reserveOutputStack(
  bank: GuildBank,
  definitionId: ItemDefinitionId,
  quantity: number,
  stackLimitByItemId: ReadonlyMap<ItemDefinitionId, number> = new Map(),
): GuildBank {
  positiveInteger(quantity);
  const next: GuildBank = {
    ...bank,
    reservedOutputStackCounts: {
      ...(bank.reservedOutputStackCounts ?? {}),
      [definitionId]: (bank.reservedOutputStackCounts?.[definitionId] ?? 0) + quantity,
    },
  };
  if (
    (bank.capacitySlots ?? Number.MAX_SAFE_INTEGER) < guildBankSlotUsage(next, stackLimitByItemId)
  ) {
    throw new Error("公会仓库没有足够空间容纳活动产物。");
  }
  return next;
}

export function releaseReservedOutputStack(
  bank: GuildBank,
  definitionId: ItemDefinitionId,
  quantity: number,
): GuildBank {
  positiveInteger(quantity);
  const current = bank.reservedOutputStackCounts?.[definitionId] ?? 0;
  if (current < quantity) throw new Error("公会仓库预留产物不足。");
  const reservedOutputStackCounts = { ...(bank.reservedOutputStackCounts ?? {}) };
  const remaining = current - quantity;
  if (remaining === 0) delete reservedOutputStackCounts[definitionId];
  else reservedOutputStackCounts[definitionId] = remaining;
  return {
    ...bank,
    ...(Object.keys(reservedOutputStackCounts).length > 0
      ? { reservedOutputStackCounts }
      : { reservedOutputStackCounts: undefined }),
  };
}

export function commitReservedOutputStack(
  bank: GuildBank,
  definitionId: ItemDefinitionId,
  quantity: number,
  capacity: GuildBankCapacityPolicy = unlimitedGuildBankCapacity,
): GuildBank {
  return addStackToGuildBank(
    releaseReservedOutputStack(bank, definitionId, quantity),
    definitionId,
    quantity,
    capacity,
  );
}

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

export function availableStackCount(bank: GuildBank, definitionId: ItemDefinitionId): number {
  return (bank.stackCounts[definitionId] ?? 0) - (bank.reservedStackCounts?.[definitionId] ?? 0);
}

export function reserveStackFromGuildBank(
  bank: GuildBank,
  definitionId: ItemDefinitionId,
  quantity: number,
): GuildBank {
  positiveInteger(quantity);
  if (availableStackCount(bank, definitionId) < quantity) throw new Error("公会仓库材料不足。");
  return {
    ...bank,
    reservedStackCounts: {
      ...(bank.reservedStackCounts ?? {}),
      [definitionId]: (bank.reservedStackCounts?.[definitionId] ?? 0) + quantity,
    },
  };
}

export function releaseReservedStack(
  bank: GuildBank,
  definitionId: ItemDefinitionId,
  quantity: number,
): GuildBank {
  positiveInteger(quantity);
  const current = bank.reservedStackCounts?.[definitionId] ?? 0;
  if (current < quantity) throw new Error("公会仓库预留材料不足。");
  const reservedStackCounts = { ...(bank.reservedStackCounts ?? {}) };
  const remaining = current - quantity;
  if (remaining === 0) delete reservedStackCounts[definitionId];
  else reservedStackCounts[definitionId] = remaining;
  return { ...bank, reservedStackCounts };
}

export function commitReservedStack(
  bank: GuildBank,
  definitionId: ItemDefinitionId,
  quantity: number,
): GuildBank {
  const released = releaseReservedStack(bank, definitionId, quantity);
  return removeStackFromGuildBank(released, definitionId, quantity);
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
