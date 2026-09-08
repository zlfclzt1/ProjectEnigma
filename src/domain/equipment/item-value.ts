import type { ItemDefinition } from "../../content/schemas/item";

export function equipmentSellValue(definition: ItemDefinition): number {
  if (definition.isStarter) return 0;
  const qualityMultiplier = {
    poor: 0.3,
    common: 0.6,
    uncommon: 1,
    rare: 2,
    epic: 4,
  }[definition.quality];
  return Math.max(1, Math.floor((definition.itemLevel * qualityMultiplier) / 2));
}
