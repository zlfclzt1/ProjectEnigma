import type { ContentRegistry } from "../../content/registry";
import type { ItemDefinitionId, RandomSuffixId } from "../shared/ids";
import type { Member, MemberWishlistEntry } from "../member/member";

export interface WishlistTargetInput {
  readonly itemDefinitionId: ItemDefinitionId;
  readonly preferredRandomSuffixId?: RandomSuffixId;
  readonly acceptableRandomSuffixIds: readonly RandomSuffixId[];
}

export type WishlistFailureCode =
  | "missing-item"
  | "starter-item"
  | "missing-class"
  | "missing-spec"
  | "class-restricted"
  | "role-restricted"
  | "armor-type-mismatch"
  | "invalid-preferred-suffix"
  | "invalid-acceptable-suffix";

export interface WishlistFailure {
  readonly code: WishlistFailureCode;
  readonly message: string;
}

export interface WishlistEligibility {
  readonly allowed: boolean;
  readonly failures: readonly WishlistFailure[];
}

export function evaluateWishlistTarget(
  member: Member,
  input: WishlistTargetInput,
  content: ContentRegistry,
): WishlistEligibility {
  const failures: WishlistFailure[] = [];
  const item = content.itemById.get(input.itemDefinitionId);
  if (!item) {
    return {
      allowed: false,
      failures: [{ code: "missing-item", message: "愿望单物品不存在。" }],
    };
  }
  if (item.isStarter) {
    failures.push({ code: "starter-item", message: "初始装备不能加入愿望单。" });
  }

  const classDefinition = content.classById.get(member.identity.classId);
  const spec = content.specById.get(member.progression.specId);
  if (!classDefinition) failures.push({ code: "missing-class", message: "成员职业不存在。" });
  if (!spec) failures.push({ code: "missing-spec", message: "成员当前专精不存在。" });

  if (
    item.restrictions.allowedClassIds.length > 0 &&
    !item.restrictions.allowedClassIds.includes(member.identity.classId)
  ) {
    failures.push({ code: "class-restricted", message: "当前职业不能装备这件物品。" });
  }
  if (
    item.restrictions.allowedRoles.length > 0 &&
    (!spec || !item.restrictions.allowedRoles.includes(spec.role))
  ) {
    failures.push({ code: "role-restricted", message: "这件物品不适合当前专精的主职责。" });
  }
  if (item.armorType && item.armorType !== classDefinition?.armorType) {
    failures.push({ code: "armor-type-mismatch", message: "护甲类型与当前职业不匹配。" });
  }

  const suffixIds = new Set(item.randomSuffixIds ?? []);
  if (input.preferredRandomSuffixId && !suffixIds.has(input.preferredRandomSuffixId)) {
    failures.push({
      code: "invalid-preferred-suffix",
      message: "首选词缀不属于这件基础物品的词缀池。",
    });
  }
  if (input.acceptableRandomSuffixIds.some((suffixId) => !suffixIds.has(suffixId))) {
    failures.push({
      code: "invalid-acceptable-suffix",
      message: "可接受词缀中包含不属于这件基础物品的词缀。",
    });
  }

  return { allowed: failures.length === 0, failures: Object.freeze(failures) };
}

export function upsertWishlistTarget(
  member: Member,
  input: WishlistTargetInput,
  content: ContentRegistry,
): MemberWishlistEntry {
  const eligibility = evaluateWishlistTarget(member, input, content);
  if (!eligibility.allowed) {
    throw new Error(eligibility.failures.map((failure) => failure.message).join(" "));
  }

  const entry: MemberWishlistEntry = {
    itemDefinitionId: input.itemDefinitionId,
    ...(input.preferredRandomSuffixId
      ? { preferredRandomSuffixId: input.preferredRandomSuffixId }
      : {}),
    acceptableRandomSuffixIds: [...new Set(input.acceptableRandomSuffixIds)].sort(),
  };
  const index = member.wishlist.entries.findIndex(
    (candidate) => candidate.itemDefinitionId === input.itemDefinitionId,
  );
  if (index >= 0) member.wishlist.entries[index] = entry;
  else member.wishlist.entries.push(entry);
  return entry;
}
