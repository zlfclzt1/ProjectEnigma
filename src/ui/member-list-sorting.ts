import type { MemberRole } from "../application/queries/get-members-view";

export type MemberSortKey = "default" | "role" | "level" | "itemLevel";

export const MEMBER_SORT_OPTIONS: readonly {
  readonly id: MemberSortKey;
  readonly name: string;
}[] = [
  { id: "default", name: "默认顺序" },
  { id: "role", name: "职责（坦克→治疗→输出）" },
  { id: "level", name: "等级（高→低）" },
  { id: "itemLevel", name: "装等（高→低）" },
];

interface SortableMember {
  readonly name: string;
  readonly role: MemberRole;
  readonly level: number;
  readonly itemLevel: number;
}

const ROLE_ORDER: Readonly<Record<MemberRole, number>> = {
  tank: 0,
  healer: 1,
  dps: 2,
};

function byName(left: SortableMember, right: SortableMember): number {
  return left.name.localeCompare(right.name, "zh-CN");
}

export function sortMembers<T extends SortableMember>(
  members: readonly T[],
  sortBy: MemberSortKey,
): T[] {
  const sorted = [...members];
  if (sortBy === "default") return sorted;

  return sorted.sort((left, right) => {
    if (sortBy === "role") {
      return (
        ROLE_ORDER[left.role] - ROLE_ORDER[right.role] ||
        right.level - left.level ||
        right.itemLevel - left.itemLevel ||
        byName(left, right)
      );
    }
    if (sortBy === "level") {
      return (
        right.level - left.level ||
        right.itemLevel - left.itemLevel ||
        ROLE_ORDER[left.role] - ROLE_ORDER[right.role] ||
        byName(left, right)
      );
    }
    return (
      right.itemLevel - left.itemLevel ||
      right.level - left.level ||
      ROLE_ORDER[left.role] - ROLE_ORDER[right.role] ||
      byName(left, right)
    );
  });
}
