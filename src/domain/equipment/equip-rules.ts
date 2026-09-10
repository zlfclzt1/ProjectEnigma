import type { ContentRegistry } from "../../content/registry";
import type { ItemDefinition } from "../../content/schemas/item";
import type { Member } from "../member/member";
import type { ItemInstance } from "./item-instance";
import { resolveItemInstance } from "./resolve-item-instance";
import { canEquipArmorType } from "./armor-proficiency";

export type EquipFailureCode =
  | "definition-mismatch"
  | "member-busy"
  | "class-restricted"
  | "role-restricted"
  | "armor-type-mismatch"
  | "owned-by-another-member"
  | "invalid-bound-owner"
  | "two-handed-main-hand";

export interface EquipFailure {
  readonly code: EquipFailureCode;
  readonly message: string;
}

export interface EquipEligibility {
  readonly allowed: boolean;
  readonly failures: readonly EquipFailure[];
}

export interface EquipRuleContext {
  readonly content: ContentRegistry;
  readonly itemInstances: Readonly<Record<string, ItemInstance>>;
}

function currentMainHandDefinition(member: Member, context: EquipRuleContext) {
  const instanceId = member.equipment.mainHand;
  if (!instanceId) return undefined;
  const instance = context.itemInstances[instanceId];
  return instance ? resolveItemInstance(instance, context.content).definition : undefined;
}

export function evaluateEquipEligibility(
  member: Member,
  instance: ItemInstance,
  definition: ItemDefinition,
  context: EquipRuleContext,
): EquipEligibility {
  const failures: EquipFailure[] = [];
  const classDefinition = context.content.classById.get(member.identity.classId);
  const spec = context.content.specById.get(member.progression.specId);

  if (instance.definitionId !== definition.id) {
    failures.push({ code: "definition-mismatch", message: "装备实例与物品定义不一致。" });
  }
  if (member.activeActivityId) {
    failures.push({ code: "member-busy", message: "参加活动中的成员不能更换装备。" });
  }
  if (
    definition.restrictions.allowedClassIds.length > 0 &&
    !definition.restrictions.allowedClassIds.includes(member.identity.classId)
  ) {
    failures.push({ code: "class-restricted", message: "该职业不能装备这件物品。" });
  }
  if (
    definition.restrictions.allowedRoles.length > 0 &&
    (!spec || !definition.restrictions.allowedRoles.includes(spec.role))
  ) {
    failures.push({ code: "role-restricted", message: "当前专精定位不能装备这件物品。" });
  }
  if (
    definition.armorType &&
    !canEquipArmorType(
      member.identity.classId,
      member.progression.level,
      classDefinition?.armorType,
      definition.armorType,
    )
  ) {
    failures.push({ code: "armor-type-mismatch", message: "护甲类型与职业不匹配。" });
  }
  if (instance.ownerMemberId && instance.ownerMemberId !== member.id) {
    failures.push({
      code: "owned-by-another-member",
      message: "这件装备已经属于另一名成员。",
    });
  }
  if (instance.bound && !instance.ownerMemberId) {
    failures.push({ code: "invalid-bound-owner", message: "绑定装备缺少所属成员。" });
  }
  if (definition.slot === "offHand" && currentMainHandDefinition(member, context)?.twoHanded) {
    failures.push({
      code: "two-handed-main-hand",
      message: "装备双手主手武器时不能装备副手物品。",
    });
  }

  return { allowed: failures.length === 0, failures: Object.freeze(failures) };
}
