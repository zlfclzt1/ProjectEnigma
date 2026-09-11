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
const routeNodeIdSchema = brandedContentIdSchema<"DungeonRouteNodeId">();
const routeVariantIdSchema = brandedContentIdSchema<"DungeonRouteVariantId">();

const contentFileBaseSchema = z
  .object({ schemaVersion: z.literal(1), attribution: contentAttributionSchema })
  .strict();

const requiredRouteNodeSchema = z
  .object({
    id: routeNodeIdSchema,
    type: z.literal("required"),
    encounterId: encounterIdSchema,
  })
  .strict();

const optionalRouteNodeSchema = z
  .object({
    id: routeNodeIdSchema,
    type: z.literal("optional"),
    encounterId: encounterIdSchema,
    description: localizedTextSchema,
  })
  .strict();

const rareRouteNodeSchema = z
  .object({
    id: routeNodeIdSchema,
    type: z.literal("rare"),
    encounterId: encounterIdSchema,
    spawnProbability: probabilitySchema,
    spawnGroup: z.string().trim().min(1).optional(),
  })
  .strict();

export const dungeonRouteNodeSchema = z.discriminatedUnion("type", [
  requiredRouteNodeSchema,
  optionalRouteNodeSchema,
  rareRouteNodeSchema,
]);

const dungeonRouteVariantSchema = z
  .object({
    id: routeVariantIdSchema,
    name: localizedTextSchema,
    description: localizedTextSchema,
    requiredNodeIds: z.array(routeNodeIdSchema).min(1),
  })
  .strict()
  .refine(
    ({ requiredNodeIds }) => new Set(requiredNodeIds).size === requiredNodeIds.length,
    "命名路线不能重复引用同一必打节点",
  );

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
        recommendedRoles: z
          .object({
            tank: z.number().int().nonnegative(),
            healer: z.number().int().nonnegative(),
            dps: z.number().int().nonnegative(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .superRefine(({ minimum, recommended, maximum, recommendedRoles }, context) => {
        if (!(minimum <= recommended && recommended <= maximum)) {
          context.addIssue({
            code: "custom",
            message: "队伍人数必须满足 minimum <= recommended <= maximum",
          });
        }
        if (
          recommendedRoles &&
          recommendedRoles.tank + recommendedRoles.healer + recommendedRoles.dps !== recommended
        ) {
          context.addIssue({
            code: "custom",
            path: ["recommendedRoles"],
            message: "推荐职责人数之和必须等于推荐队伍人数",
          });
        }
      }),
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
    route: z.array(dungeonRouteNodeSchema).min(1),
    routeVariants: z.array(dungeonRouteVariantSchema).min(2).optional(),
  })
  .strict()
  .refine((dungeon) => dungeon.route.some((node) => node.type === "required"), {
    path: ["route"],
    message: "副本路线至少需要一个必打节点",
  })
  .superRefine((dungeon, context) => {
    const routeNodeById = new Map(dungeon.route.map((node) => [node.id, node]));
    const variantIds = new Set<string>();
    for (const [variantIndex, variant] of (dungeon.routeVariants ?? []).entries()) {
      if (variantIds.has(variant.id)) {
        context.addIssue({
          code: "custom",
          path: ["routeVariants", variantIndex, "id"],
          message: `命名路线 ID ${variant.id} 重复`,
        });
      }
      variantIds.add(variant.id);
      for (const [nodeIndex, nodeId] of variant.requiredNodeIds.entries()) {
        const node = routeNodeById.get(nodeId);
        if (node?.type === "required") continue;
        context.addIssue({
          code: "custom",
          path: ["routeVariants", variantIndex, "requiredNodeIds", nodeIndex],
          message: node ? "命名路线只能引用必打节点" : `命名路线引用了不存在的节点 ${nodeId}`,
        });
      }
    }
    const groupTotals = new Map<string, number>();
    for (const node of dungeon.route) {
      if (node.type !== "rare" || !node.spawnGroup) continue;
      groupTotals.set(
        node.spawnGroup,
        (groupTotals.get(node.spawnGroup) ?? 0) + node.spawnProbability,
      );
    }
    for (const [group, total] of groupTotals) {
      if (total <= 1 + 1e-9) continue;
      context.addIssue({
        code: "custom",
        path: ["route"],
        message: `稀有刷新组 ${group} 的概率之和不能超过 1`,
      });
    }
  });

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
export type DungeonRouteNode = z.infer<typeof dungeonRouteNodeSchema>;
export type DungeonRouteVariant = z.infer<typeof dungeonRouteVariantSchema>;
export type EncounterDefinition = z.infer<typeof encounterDefinitionSchema>;
export type LootTable = z.infer<typeof lootTableSchema>;
