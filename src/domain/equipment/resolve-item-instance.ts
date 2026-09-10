import type { ContentRegistry } from "../../content/registry";
import type { ItemDefinition } from "../../content/schemas/item";
import type { ItemSuffixDefinition, ItemSuffixTier } from "../../content/schemas/item-suffix";
import type { LocalizedText } from "../../content/schemas/common";
import type { ClassicItemStats } from "./stats";
import type { ItemInstance } from "./item-instance";

export type ItemInstanceResolutionFailureCode =
  | "missing-definition"
  | "missing-random-suffix"
  | "random-suffix-not-allowed"
  | "random-suffix-tier-not-found";

export class ItemInstanceResolutionError extends Error {
  constructor(readonly code: ItemInstanceResolutionFailureCode) {
    super(`无法解析装备实例：${code}`);
    this.name = "ItemInstanceResolutionError";
  }
}

export interface ResolvedItemInstance {
  readonly instance: ItemInstance;
  readonly baseDefinition: ItemDefinition;
  readonly randomSuffix?: ItemSuffixDefinition;
  readonly suffixTier?: ItemSuffixTier;
  readonly definition: ItemDefinition;
}

export function resolveItemInstance(
  instance: ItemInstance,
  content: ContentRegistry,
): ResolvedItemInstance {
  const baseDefinition = content.itemById.get(instance.definitionId);
  if (!baseDefinition) throw new ItemInstanceResolutionError("missing-definition");

  if (!instance.randomSuffixId) {
    return {
      instance,
      baseDefinition,
      definition: cloneDefinition(baseDefinition, baseDefinition.name, baseDefinition.stats),
    };
  }

  const randomSuffix = content.itemSuffixById.get(instance.randomSuffixId);
  if (!randomSuffix) throw new ItemInstanceResolutionError("missing-random-suffix");
  if (!baseDefinition.randomSuffixIds?.includes(randomSuffix.id)) {
    throw new ItemInstanceResolutionError("random-suffix-not-allowed");
  }
  const suffixTier = randomSuffix.tiers.find(
    (tier) =>
      tier.minimumItemLevel <= baseDefinition.itemLevel &&
      baseDefinition.itemLevel <= tier.maximumItemLevel,
  );
  if (!suffixTier) throw new ItemInstanceResolutionError("random-suffix-tier-not-found");

  return {
    instance,
    baseDefinition,
    randomSuffix,
    suffixTier,
    definition: cloneDefinition(
      baseDefinition,
      applyNameTemplate(baseDefinition.name, randomSuffix.nameTemplate),
      mergeItemStats(baseDefinition.stats, suffixTier.stats),
    ),
  };
}

function cloneDefinition(
  definition: ItemDefinition,
  name: LocalizedText,
  stats: ClassicItemStats,
): ItemDefinition {
  return {
    ...definition,
    name: { ...name },
    stats,
    restrictions: {
      allowedClassIds: [...definition.restrictions.allowedClassIds],
      allowedRoles: [...definition.restrictions.allowedRoles],
    },
    icon: structuredClone(definition.icon),
    description: { ...definition.description },
    ...(definition.randomSuffixIds
      ? { randomSuffixIds: [...definition.randomSuffixIds] }
      : { randomSuffixIds: undefined }),
  };
}

function applyNameTemplate(
  base: LocalizedText,
  template: ItemSuffixDefinition["nameTemplate"],
): LocalizedText {
  return {
    zhCN: template.zhCN.replace("{base}", base.zhCN),
    ...(base.enUS && template.enUS ? { enUS: template.enUS.replace("{base}", base.enUS) } : {}),
  };
}

export function mergeItemStats(
  base: ClassicItemStats,
  bonus: Omit<ClassicItemStats, "weapon">,
): ClassicItemStats {
  const primary = mergeNumericGroup(base.primary, bonus.primary);
  const defense = mergeNumericGroup(base.defense, bonus.defense);
  const physical = mergeNumericGroup(base.physical, bonus.physical);
  const spell = mergeNumericGroup(base.spell, bonus.spell);
  const resistances = mergeNumericGroup(base.resistances, bonus.resistances);
  return {
    ...(primary ? { primary } : {}),
    ...(defense ? { defense } : {}),
    ...(physical ? { physical } : {}),
    ...(spell ? { spell } : {}),
    ...(base.weapon ? { weapon: structuredClone(base.weapon) } : {}),
    ...(resistances ? { resistances } : {}),
  };
}

function mergeNumericGroup<Group extends object>(base?: Group, bonus?: Group): Group | undefined {
  if (!base && !bonus) return undefined;
  const baseValues = (base ?? {}) as Record<string, number>;
  const bonusValues = (bonus ?? {}) as Record<string, number>;
  return Object.fromEntries(
    [...new Set([...Object.keys(baseValues), ...Object.keys(bonusValues)])].map((key) => [
      key,
      (baseValues[key] ?? 0) + (bonusValues[key] ?? 0),
    ]),
  ) as Group;
}
