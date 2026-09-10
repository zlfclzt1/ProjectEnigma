import type { ArmorType } from "../../content/schemas/member-definitions";
import type { ClassId } from "../shared/ids";

const ARMOR_RANK: Readonly<Record<ArmorType, number>> = {
  cloth: 1,
  leather: 2,
  mail: 3,
  plate: 4,
};

/** Classic classes may wear every lighter armor category they are proficient with. */
export function canEquipArmorType(
  classId: ClassId,
  level: number,
  baseArmorType: ArmorType | undefined,
  itemArmorType: ArmorType,
): boolean {
  if (!baseArmorType) return false;
  const promotedArmorType =
    level >= 40 && (classId === "warrior" || classId === "paladin")
      ? "plate"
      : level >= 40 && (classId === "hunter" || classId === "shaman")
        ? "mail"
        : baseArmorType;
  return ARMOR_RANK[itemArmorType] <= ARMOR_RANK[promotedArmorType];
}
