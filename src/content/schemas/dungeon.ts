import { z } from "zod";
import {
  brandedContentIdSchema,
  levelSchema,
  localizedTextSchema,
  nonNegativeIntegerSchema,
  positiveWeightSchema,
  probabilitySchema,
} from "./common";
import { contentAttributionSchema } from "./content-source";

const dungeonIdSchema = brandedContentIdSchema<"DungeonId">();
const encounterIdSchema = brandedContentIdSchema<"EncounterId">();
const lootTableIdSchema = brandedContentIdSchema<"LootTableId">();
const itemDefinitionIdSchema = brandedContentIdSchema<"ItemDefinitionId">();
const mechanicIdSchema = brandedContentIdSchema<"MechanicId">();

const contentFileBaseSchema = z
  .object({ schemaVersion: z.literal(1), attribution: contentAttributionSchema })
  .strict();

export const dungeonDefinitionSchema = z
  .object({
    id: dungeonIdSchema,
    name: localizedTextSchema,
    minimumLevel: levelSchema,
    recommendedLevel: levelSchema,
    defaultUnlocked: z.boolean(),
    unlock: z
      .object({
        requiredDungeonIds: z.array(dungeonIdSchema).optional(),
        requiredAnyDungeonIds: z.array(dungeonIdSchema).optional(),
      })
      .strict()
      .optional(),
    members: z
      .object({
        minimum: z.number().int().positive(),
        maximum: z.number().int().positive(),
        recommended: z.number().int().positive(),
      })
      .strict()
      .refine(
        ({ minimum, recommended, maximum }) => minimum <= recommended && recommended <= maximum,
        "队伍人数必须满足 minimum <= recommended <= maximum",
      ),
    duration: z
      .object({
        baseSeconds: z.number().int().positive(),
        minimumRatio: z.number().finite().positive(),
        maximumRatio: z.number().finite().positive(),
      })
      .strict()
      .refine(
        ({ minimumRatio, maximumRatio }) => minimumRatio <= maximumRatio,
        "耗时比例上下限无效",
      ),
    probability: z
      .object({
        minimum: probabilitySchema,
        maximum: probabilitySchema,
        base: probabilitySchema,
        readinessMultiplier: z.number().finite().nonnegative(),
        surplusEffect: z.number().finite().nonnegative(),
        geometricWeight: probabilitySchema,
        bottleneckWeight: probabilitySchema,
        overpowerThreshold: z.number().finite().positive(),
      })
      .strict()
      .refine(({ minimum, maximum }) => minimum <= maximum, "概率上下限无效"),
    combatTuning: z
      .object({
        bossProbabilityMaximum: probabilitySchema,
        requirementMultipliers: z
          .object({
            tank: z.number().finite().positive(),
            healing: z.number().finite().positive(),
            damage: z.number().finite().positive(),
          })
          .strict(),
      })
      .strict(),
    route: z.array(encounterIdSchema).min(1),
  })
  .strict();

export const dungeonDefinitionFileSchema = contentFileBaseSchema.safeExtend({
  dungeons: z.array(dungeonDefinitionSchema).min(1),
});

export const encounterDefinitionSchema = z
  .object({
    id: encounterIdSchema,
    dungeonId: dungeonIdSchema,
    name: localizedTextSchema,
    stageSeconds: z.number().int().positive(),
    requirements: z
      .object({
        tank: positiveWeightSchema,
        healing: positiveWeightSchema,
        damage: positiveWeightSchema,
      })
      .strict(),
    weights: z
      .object({
        tank: probabilitySchema,
        healing: probabilitySchema,
        damage: probabilitySchema,
      })
      .strict()
      .refine(
        ({ tank, healing, damage }) => Math.abs(tank + healing + damage - 1) < 1e-9,
        "Boss 能力权重之和必须为 1",
      ),
    experienceShare: probabilitySchema,
    funds: nonNegativeIntegerSchema,
    firstKillBonus: nonNegativeIntegerSchema,
    lootTableId: lootTableIdSchema.optional(),
    mechanicIds: z.array(mechanicIdSchema).default([]),
  })
  .strict();

export const encounterDefinitionFileSchema = contentFileBaseSchema.safeExtend({
  encounters: z.array(encounterDefinitionSchema).min(1),
});

export const lootTableSchema = z
  .object({
    id: lootTableIdSchema,
    guaranteedEquipmentDrops: z.number().int().positive(),
    sourceType: brandedContentIdSchema<"LootSourceType">().optional(),
    items: z
      .array(z.object({ itemId: itemDefinitionIdSchema, weight: positiveWeightSchema }).strict())
      .min(1),
  })
  .strict();

export const lootTableFileSchema = contentFileBaseSchema.safeExtend({
  lootTables: z.array(lootTableSchema).min(1),
});

export type DungeonDefinition = z.infer<typeof dungeonDefinitionSchema>;
export type EncounterDefinition = z.infer<typeof encounterDefinitionSchema>;
export type LootTable = z.infer<typeof lootTableSchema>;
