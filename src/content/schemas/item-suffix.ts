import { z } from "zod";
import type { ClassicItemStats } from "../../domain/equipment/stats";
import { brandedContentIdSchema, levelSchema, positiveWeightSchema } from "./common";
import { contentAttributionSchema, contentSourceSchema } from "./content-source";
import {
  defensiveStatsSchema,
  physicalCombatStatsSchema,
  primaryStatPointsSchema,
  resistancePointsSchema,
  spellCombatStatsSchema,
} from "./item-stats";

const localizedNameTemplateSchema = z
  .object({
    zhCN: z.string().trim().min(1),
    enUS: z.string().trim().min(1).optional(),
  })
  .strict()
  .superRefine((template, context) => {
    for (const [locale, value] of Object.entries(template)) {
      if ((value.match(/\{base\}/g) ?? []).length !== 1) {
        context.addIssue({
          code: "custom",
          path: [locale],
          message: "随机词缀名称模板必须且只能包含一个 {base} 占位符",
        });
      }
    }
  });

export const randomSuffixStatsSchema: z.ZodType<Omit<ClassicItemStats, "weapon">> = z
  .object({
    primary: primaryStatPointsSchema.optional(),
    defense: defensiveStatsSchema.optional(),
    physical: physicalCombatStatsSchema.optional(),
    spell: spellCombatStatsSchema.optional(),
    resistances: resistancePointsSchema.optional(),
  })
  .strict()
  .refine(hasPositiveStat, "随机词缀档位必须至少提供一项正数属性增量");

export const itemSuffixTierSchema = z
  .object({
    minimumItemLevel: levelSchema,
    maximumItemLevel: levelSchema,
    stats: randomSuffixStatsSchema,
  })
  .strict()
  .refine(
    ({ minimumItemLevel, maximumItemLevel }) => minimumItemLevel <= maximumItemLevel,
    "随机词缀档位的最低物品等级不能高于最高物品等级",
  );

export const itemSuffixDefinitionSchema = z
  .object({
    id: brandedContentIdSchema<"RandomSuffixId">(),
    nameTemplate: localizedNameTemplateSchema,
    tiers: z.array(itemSuffixTierSchema).min(1),
    relativeWeight: positiveWeightSchema,
    source: contentSourceSchema,
  })
  .strict()
  .superRefine((suffix, context) => {
    const sorted = [...suffix.tiers].sort(
      (left, right) => left.minimumItemLevel - right.minimumItemLevel,
    );
    for (let index = 1; index < sorted.length; index += 1) {
      if (sorted[index]!.minimumItemLevel <= sorted[index - 1]!.maximumItemLevel) {
        context.addIssue({
          code: "custom",
          path: ["tiers"],
          message: "同一随机词缀的物品等级档位不能重叠",
        });
        break;
      }
    }
  });

export const itemSuffixDefinitionFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    attribution: contentAttributionSchema,
    itemSuffixes: z.array(itemSuffixDefinitionSchema).min(1),
  })
  .strict();

function hasPositiveStat(stats: Omit<ClassicItemStats, "weapon">): boolean {
  return Object.values(stats).some((group) =>
    Object.values(group ?? {}).some((value) => typeof value === "number" && value > 0),
  );
}

export type ItemSuffixTier = z.infer<typeof itemSuffixTierSchema>;
export type ItemSuffixDefinition = z.infer<typeof itemSuffixDefinitionSchema>;
