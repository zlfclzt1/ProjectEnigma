import { z } from "zod";
import {
  brandedContentIdSchema,
  localizedTextSchema,
  nonNegativeIntegerSchema,
  probabilitySchema,
} from "./common";
import { contentAttributionSchema } from "./content-source";

const professionIdSchema = brandedContentIdSchema<"ProfessionDefinitionId">();
const facilityIdSchema = brandedContentIdSchema<"ProfessionFacilityId">();
const gatheringSiteIdSchema = brandedContentIdSchema<"GatheringSiteId">();
const recipeIdSchema = brandedContentIdSchema<"RecipeId">();
const itemIdSchema = brandedContentIdSchema<"ItemDefinitionId">();
const effectIdSchema = brandedContentIdSchema<"ConsumableEffectId">();
const enchantmentIdSchema = brandedContentIdSchema<"EnchantmentId">();
const serviceIdSchema = brandedContentIdSchema<"ServiceId">();
const dungeonIdSchema = brandedContentIdSchema<"DungeonId">();

export const professionAvailabilitySchema = z.enum(["available", "preview", "unobtainable"]);

export const professionSourceSchema = z
  .object({
    type: z.enum(["trainer", "vendor", "drop", "quest", "reputation", "profession", "design"]),
    sourceId: z.string().trim().min(1).optional(),
    cost: nonNegativeIntegerSchema.optional(),
    faction: z.string().trim().min(1).optional(),
    requiredSkill: nonNegativeIntegerSchema.optional(),
    reason: z.string().trim().min(1).optional(),
  })
  .strict();

export const skillRuleSchema = z
  .object({
    min: nonNegativeIntegerSchema,
    max: nonNegativeIntegerSchema,
    chance: probabilitySchema,
  })
  .strict()
  .refine(({ max, min }) => max >= min, "技能提升最大值不能小于最小值");

export const skillGainRuleSchema = z
  .object({
    orange: skillRuleSchema,
    yellow: skillRuleSchema,
    green: skillRuleSchema,
    gray: skillRuleSchema,
    overrides: z
      .array(
        z
          .object({
            skillMin: nonNegativeIntegerSchema,
            skillMax: nonNegativeIntegerSchema,
            gain: skillRuleSchema,
          })
          .strict()
          .refine(({ skillMax, skillMin }) => skillMax >= skillMin, "技能范围无效"),
      )
      .default([]),
  })
  .strict();
export type SkillGainRule = z.infer<typeof skillGainRuleSchema>;
export type SkillRule = z.infer<typeof skillRuleSchema>;

export const professionTrainingTierSchema = z
  .object({
    id: z.string().trim().min(1),
    rank: z.number().int().positive(),
    name: localizedTextSchema,
    skillCap: nonNegativeIntegerSchema,
    cost: nonNegativeIntegerSchema,
    requiredMemberLevel: nonNegativeIntegerSchema.optional(),
    availability: professionAvailabilitySchema,
  })
  .strict();

export const professionDefinitionSchema = z
  .object({
    id: professionIdSchema,
    kind: z.enum(["primary", "secondary"]),
    status: professionAvailabilitySchema,
    name: localizedTextSchema,
    maxSkill: nonNegativeIntegerSchema,
    trainingTiers: z.array(professionTrainingTierSchema).min(1),
    facilityId: facilityIdSchema.optional(),
    sources: z.array(professionSourceSchema).min(1),
  })
  .strict();

export const professionFacilityDefinitionSchema = z
  .object({
    id: facilityIdSchema,
    professionId: professionIdSchema,
    status: professionAvailabilitySchema,
    levels: z
      .array(
        z
          .object({
            level: z.number().int().positive(),
            cost: nonNegativeIntegerSchema,
            requiredGuildClear: z
              .object({ dungeonId: dungeonIdSchema, count: z.number().int().positive() })
              .strict()
              .optional(),
            unlockedSkillCap: nonNegativeIntegerSchema.optional(),
            unlockedRecipeTags: z.array(z.string().trim().min(1)).default([]),
            unlockedGatheringSiteIds: z.array(gatheringSiteIdSchema).default([]),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const quantityRangeSchema = z
  .object({ min: z.number().int().positive(), max: z.number().int().positive() })
  .strict()
  .refine(({ max, min }) => max >= min, "数量最大值不能小于最小值");

export const gatheringOutputSchema = z
  .object({
    itemId: itemIdSchema,
    quantity: quantityRangeSchema,
    chance: probabilitySchema,
    guaranteed: z.boolean().default(false),
  })
  .strict();

export const gatheringSiteDefinitionSchema = z
  .object({
    id: gatheringSiteIdSchema,
    professionId: professionIdSchema,
    facilityId: facilityIdSchema,
    status: professionAvailabilitySchema,
    name: localizedTextSchema,
    requiredSkill: nonNegativeIntegerSchema,
    requiredTrainingRank: z.number().int().positive().optional(),
    durationSeconds: z.number().int().positive(),
    batchLimit: z.number().int().positive(),
    outputs: z.array(gatheringOutputSchema).min(1),
    skillGain: skillGainRuleSchema,
    sources: z.array(professionSourceSchema).min(1),
  })
  .strict();

export const recipeOutputSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("material-stack"),
      itemId: itemIdSchema,
      quantity: quantityRangeSchema,
      chance: probabilitySchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("item-instance"),
      itemId: itemIdSchema,
      quantity: quantityRangeSchema,
      chance: probabilitySchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("enchantment"),
      enchantmentId: enchantmentIdSchema,
      charges: quantityRangeSchema.optional(),
      chance: probabilitySchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("consumable-effect"),
      effectId: effectIdSchema,
      charges: quantityRangeSchema,
      chance: probabilitySchema,
    })
    .strict(),
  z
    .object({ type: z.literal("service"), serviceId: serviceIdSchema, chance: probabilitySchema })
    .strict(),
]);

export const recipeLearningSchema = z
  .object({
    cost: nonNegativeIntegerSchema,
    sources: z.array(professionSourceSchema).min(1),
    requiredRecipeIds: z.array(recipeIdSchema).default([]),
  })
  .strict();

export const recipeDefinitionSchema = z
  .object({
    id: recipeIdSchema,
    professionId: professionIdSchema,
    facilityId: facilityIdSchema,
    status: professionAvailabilitySchema,
    category: z.enum(["refining", "crafting", "enchanting", "service"]),
    name: localizedTextSchema,
    requiredSkill: nonNegativeIntegerSchema,
    requiredTrainingRank: z.number().int().positive().optional(),
    input: z.array(
      z.object({ itemId: itemIdSchema, quantityPerBatch: z.number().int().positive() }).strict(),
    ),
    output: z.array(recipeOutputSchema).min(1),
    durationSeconds: z.number().int().positive(),
    batchLimit: z.number().int().positive(),
    skillGain: skillGainRuleSchema,
    learning: recipeLearningSchema,
    sources: z.array(professionSourceSchema).min(1),
  })
  .strict();

export const consumableEffectDefinitionSchema = z
  .object({
    id: effectIdSchema,
    status: professionAvailabilitySchema,
    channels: z
      .array(
        z
          .object({
            channel: z.enum(["stability", "efficiency", "exploration"]),
            value: z.number().finite(),
            diminishingGroup: z.string().trim().min(1).optional(),
          })
          .strict(),
      )
      .min(1),
    maxContribution: z.number().finite().optional(),
  })
  .strict();

export const supplyPlanDefinitionSchema = z
  .object({
    id: brandedContentIdSchema<"SupplyPlanId">(),
    name: localizedTextSchema,
    editable: z.boolean().default(true),
    entries: z.array(
      z
        .object({
          itemId: itemIdSchema,
          quantityPerRun: z.number().int().positive(),
          effectId: effectIdSchema.optional(),
        })
        .strict(),
    ),
  })
  .strict();

export const professionDefinitionFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    attribution: contentAttributionSchema,
    professions: z.array(professionDefinitionSchema).min(1),
  })
  .strict();
export const professionFacilityFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    attribution: contentAttributionSchema,
    professionFacilities: z.array(professionFacilityDefinitionSchema).min(1),
  })
  .strict();
export const gatheringSiteFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    attribution: contentAttributionSchema,
    gatheringSites: z.array(gatheringSiteDefinitionSchema).min(1),
  })
  .strict();
export const recipeFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    attribution: contentAttributionSchema,
    recipes: z.array(recipeDefinitionSchema).min(1),
  })
  .strict();
export const consumableEffectFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    attribution: contentAttributionSchema,
    consumableEffects: z.array(consumableEffectDefinitionSchema).min(1),
  })
  .strict();
export const supplyPlanFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    attribution: contentAttributionSchema,
    supplyPlans: z.array(supplyPlanDefinitionSchema).min(1),
  })
  .strict();

export type ProfessionDefinition = z.infer<typeof professionDefinitionSchema>;
export type ProfessionFacilityDefinition = z.infer<typeof professionFacilityDefinitionSchema>;
export type GatheringSiteDefinition = z.infer<typeof gatheringSiteDefinitionSchema>;
export type RecipeDefinition = z.infer<typeof recipeDefinitionSchema>;
export type ConsumableEffectDefinition = z.infer<typeof consumableEffectDefinitionSchema>;
export type SupplyPlanDefinition = z.infer<typeof supplyPlanDefinitionSchema>;
