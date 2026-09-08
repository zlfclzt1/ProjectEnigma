export const EQUIPMENT_SLOTS = [
  "head",
  "neck",
  "shoulder",
  "back",
  "chest",
  "wrist",
  "hands",
  "waist",
  "legs",
  "feet",
  "ring1",
  "ring2",
  "trinket1",
  "trinket2",
  "mainHand",
  "offHand",
  "ranged",
] as const;

export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];
