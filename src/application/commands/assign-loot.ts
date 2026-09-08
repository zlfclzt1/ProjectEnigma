import type { GameCommand } from "../services/game-session";
import type { ContentRegistry } from "../../content/registry";
import { equipItem } from "../../domain/equipment/equipment";
import { equipmentSellValue } from "../../domain/equipment/item-value";
import type { ItemInstance } from "../../domain/equipment/item-instance";
import type { EquipmentSlot } from "../../domain/equipment/equipment-slot";
import type { GameStateV2 } from "../../domain/game-state";
import type { ActivityId, ItemInstanceId, MemberId, PendingLootId } from "../../domain/shared/ids";

export interface AssignLootResult {
  readonly memberId: MemberId;
  readonly equippedItemInstanceId: ItemInstanceId;
  readonly equippedSlot: ReturnType<typeof equipItem>["equippedSlot"];
  readonly soldItemInstanceIds: readonly ItemInstance["id"][];
  readonly saleProceeds: number;
}

export function assignLootCommand(
  content: ContentRegistry,
  pendingLootId: PendingLootId,
  memberId: MemberId,
): GameCommand<AssignLootResult> {
  return {
    type: "assign-loot",
    execute(draft) {
      return assignLoot(draft, content, pendingLootId, memberId);
    },
  };
}

export function assignLoot(
  state: GameStateV2,
  content: ContentRegistry,
  pendingLootId: PendingLootId,
  memberId: MemberId,
  preferredSlot?: EquipmentSlot,
): AssignLootResult {
  const pending = state.pendingLoot[pendingLootId];
  if (!pending) throw new Error("该战利品已经被处理。");
  assertLootUnlocked(state, pending.sourceActivityId);
  const member = state.members[memberId];
  if (!member || !pending.eligibleMemberIds.includes(memberId)) {
    throw new Error("该成员没有资格装备这件物品。");
  }
  const instance = state.itemInstances[pending.itemInstanceId];
  if (!instance) throw new Error("战利品装备实例不存在。");

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
    const definition = displaced ? content.itemById.get(displaced.definitionId) : undefined;
    if (!displaced || !definition) throw new Error("被替换的装备数据不完整。");
    saleProceeds += equipmentSellValue(definition);
    delete state.itemInstances[displacedId];
  }

  state.members[memberId] = equipped.member;
  state.itemInstances[instance.id] = equipped.equippedInstance;
  delete state.pendingLoot[pendingLootId];
  state.guild.funds += saleProceeds;
  return {
    memberId,
    equippedItemInstanceId: instance.id,
    equippedSlot: equipped.equippedSlot,
    soldItemInstanceIds: equipped.displacedItemInstanceIds,
    saleProceeds,
  };
}

export function assertLootUnlocked(state: GameStateV2, sourceActivityId: ActivityId): void {
  const source = state.activities[sourceActivityId];
  if (source?.status === "active" || source?.status === "scheduled") {
    throw new Error("该队伍的连续副本尚未结束，暂时不能处理装备。");
  }
}
