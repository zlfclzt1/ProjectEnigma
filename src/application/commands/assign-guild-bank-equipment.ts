import type { ContentRegistry } from "../../content/registry";
import { equipItem } from "../../domain/equipment/equipment";
import { equipmentSellValue } from "../../domain/equipment/item-value";
import type { GameState } from "../../domain/game-state";
import { withdrawEquipmentFromGuildBank } from "../../domain/inventory/guild-bank-rules";
import { resolveItemInstance } from "../../domain/equipment/resolve-item-instance";
import type { EquipmentSlot } from "../../domain/equipment/equipment-slot";
import type { GameCommand } from "../services/game-session";
import type { MemberId } from "../../domain/shared/ids";
import type { ItemInstanceId } from "../../domain/shared/ids";
import { recordEconomyEvent } from "../../domain/economy/economy-ledger";

export interface AssignGuildBankEquipmentResult {
  readonly memberId: MemberId;
  readonly equippedItemInstanceId: ItemInstanceId;
  readonly equippedSlot: EquipmentSlot;
  readonly soldItemInstanceIds: readonly ItemInstanceId[];
  readonly saleProceeds: number;
}

export function assignGuildBankEquipmentCommand(
  content: ContentRegistry,
  instanceId: ItemInstanceId,
  memberId: MemberId,
  preferredSlot?: EquipmentSlot,
): GameCommand<AssignGuildBankEquipmentResult> {
  return {
    type: "assign-guild-bank-equipment",
    execute(draft) {
      return assignGuildBankEquipment(draft, content, instanceId, memberId, preferredSlot);
    },
  };
}

export function assignGuildBankEquipment(
  state: GameState,
  content: ContentRegistry,
  instanceId: ItemInstanceId,
  memberId: MemberId,
  preferredSlot?: EquipmentSlot,
): AssignGuildBankEquipmentResult {
  if (!state.guildBank.equipmentInstanceIds.includes(instanceId)) {
    throw new Error("公会仓库中没有该装备。");
  }
  const member = state.members[memberId];
  if (!member) throw new Error("找不到该成员。");
  const instance = state.itemInstances[instanceId];
  if (!instance) throw new Error("公会仓库装备数据不完整。");
  let equipped;
  try {
    equipped = equipItem(
      member,
      instance,
      { content, itemInstances: state.itemInstances },
      preferredSlot,
    );
  } catch {
    throw new Error("该成员没有资格装备这件物品。");
  }

  let saleProceeds = 0;
  for (const displacedId of equipped.displacedItemInstanceIds) {
    const displaced = state.itemInstances[displacedId];
    if (!displaced) throw new Error("被替换的装备数据不完整。");
    saleProceeds += equipmentSellValue(resolveItemInstance(displaced, content).definition);
    delete state.itemInstances[displacedId];
  }
  state.guildBank = withdrawEquipmentFromGuildBank(state.guildBank, instanceId);
  state.members[memberId] = equipped.member;
  state.itemInstances[instanceId] = equipped.equippedInstance;
  state.guild.funds += saleProceeds;
  if (saleProceeds > 0)
    recordEconomyEvent(state, {
      kind: "gold-income",
      source: "equipment-replacement-sale",
      amount: saleProceeds,
    });
  return {
    memberId,
    equippedItemInstanceId: instanceId,
    equippedSlot: equipped.equippedSlot,
    soldItemInstanceIds: equipped.displacedItemInstanceIds,
    saleProceeds,
  };
}

export function sellGuildBankEquipmentCommand(
  content: ContentRegistry,
  instanceId: ItemInstanceId,
): GameCommand<number> {
  return {
    type: "sell-guild-bank-equipment",
    execute(draft) {
      return sellGuildBankEquipment(draft, content, instanceId);
    },
  };
}

export function sellGuildBankEquipment(
  state: GameState,
  content: ContentRegistry,
  instanceId: ItemInstanceId,
): number {
  if (!state.guildBank.equipmentInstanceIds.includes(instanceId)) {
    throw new Error("公会仓库中没有该装备。");
  }
  const instance = state.itemInstances[instanceId];
  if (!instance) throw new Error("公会仓库装备数据不完整。");
  const value = equipmentSellValue(resolveItemInstance(instance, content).definition);
  state.guildBank = withdrawEquipmentFromGuildBank(state.guildBank, instanceId);
  delete state.itemInstances[instanceId];
  state.guild.funds += value;
  recordEconomyEvent(state, { kind: "gold-income", source: "equipment-sale", amount: value });
  return value;
}
