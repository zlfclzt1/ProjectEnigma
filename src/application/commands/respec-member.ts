import type { Clock } from "../ports/clock";
import type { GameCommand } from "../services/game-session";
import type { ContentRegistry } from "../../content/registry";
import { evaluateEquipEligibility } from "../../domain/equipment/equip-rules";
import { EQUIPMENT_SLOTS, type EquipmentSlot } from "../../domain/equipment/equipment-slot";
import type { ItemInstance } from "../../domain/equipment/item-instance";
import { equipmentSellValue } from "../../domain/equipment/item-value";
import type { GameStateV2 } from "../../domain/game-state";
import {
  createStarterItemForMember,
  type MemberFactoryContext,
} from "../../domain/member/member-factory";
import type { Member } from "../../domain/member/member";
import { RESPEC_COST } from "../../domain/guild/recruitment";
import type { ItemInstanceId, MemberId, SpecId } from "../../domain/shared/ids";
import { LocalIdGenerator } from "../../infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../../infrastructure/random/seeded-random-source";
import { memberFactoryContext } from "./member-factory-context";

export interface RespecMemberResult {
  readonly changed: boolean;
  readonly soldItemInstanceIds: readonly ItemInstanceId[];
  readonly saleProceeds: number;
}

export function respecMemberCommand(
  dependencies: { readonly content: ContentRegistry; readonly clock: Clock },
  memberId: MemberId,
  specId: SpecId,
): GameCommand<RespecMemberResult> {
  return {
    type: "respec-member",
    execute(draft) {
      const member = draft.members[memberId];
      if (!member) throw new Error("找不到该成员。");
      if (member.activeActivityId) throw new Error("活动中的成员不能更改专精。");
      const spec = dependencies.content.specById.get(specId);
      if (!spec || spec.classId !== member.identity.classId) {
        throw new Error("该职业不能选择这个专精。");
      }
      if (spec.id === member.progression.specId) {
        return { changed: false, soldItemInstanceIds: [], saleProceeds: 0 };
      }
      if (draft.guild.funds < RESPEC_COST) {
        throw new Error(`公会资金不足，需要 ${RESPEC_COST}。`);
      }

      const ids = new LocalIdGenerator(draft.ids);
      const random = new SeededRandomSource(draft.random);
      const context = memberFactoryContext(
        draft,
        dependencies.content,
        dependencies.clock,
        ids,
        random,
      );
      member.progression.specId = spec.id;
      const soldItemInstanceIds: ItemInstanceId[] = [];
      let saleProceeds = 0;

      for (const [slot, instanceId] of Object.entries(member.equipment) as [
        EquipmentSlot,
        ItemInstanceId,
      ][]) {
        const instance = draft.itemInstances[instanceId];
        const definition = instance
          ? dependencies.content.itemById.get(instance.definitionId)
          : undefined;
        if (!instance || !definition) throw new Error("成员装备数据不完整。");
        const eligibility = evaluateEquipEligibility(member, instance, definition, {
          content: dependencies.content,
          itemInstances: draft.itemInstances,
        });
        if (eligibility.allowed) continue;
        saleProceeds += equipmentSellValue(definition);
        soldItemInstanceIds.push(instance.id);
        delete member.equipment[slot];
        delete draft.itemInstances[instance.id];
      }

      fillMissingStarterEquipment(member, draft.itemInstances, dependencies.content, context);
      draft.guild.funds = draft.guild.funds - RESPEC_COST + saleProceeds;
      draft.ids = ids.snapshot();
      return { changed: true, soldItemInstanceIds, saleProceeds };
    },
  };
}

function fillMissingStarterEquipment(
  member: Member,
  itemInstances: GameStateV2["itemInstances"] & Record<ItemInstanceId, ItemInstance>,
  content: ContentRegistry,
  context: MemberFactoryContext,
): void {
  for (const slot of EQUIPMENT_SLOTS) {
    if (member.equipment[slot]) continue;
    if (slot === "offHand") {
      const mainHandId = member.equipment.mainHand;
      const mainHand = mainHandId ? itemInstances[mainHandId] : undefined;
      if (mainHand && content.itemById.get(mainHand.definitionId)?.twoHanded) continue;
    }
    const starter = createStarterItemForMember(context, member.id, member.identity.classId, slot);
    itemInstances[starter.id] = starter;
    member.equipment[slot] = starter.id;
  }
}
