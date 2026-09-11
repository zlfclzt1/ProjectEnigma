import { z } from "zod";
import { brandedContentIdSchema, localizedTextSchema, nonNegativeIntegerSchema } from "./common";
import { contentAttributionSchema, contentSourceSchema } from "./content-source";

const completionPercentSchema = z.number().int().min(1).max(100);

export const collectionRewardConditionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("encounter-victory"),
      encounterId: brandedContentIdSchema<"EncounterId">(),
    })
    .strict(),
  z
    .object({
      type: z.literal("dungeon-completion"),
      dungeonId: brandedContentIdSchema<"DungeonId">(),
      minimumPercent: completionPercentSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("item-set-completion"),
      itemSetId: brandedContentIdSchema<"ItemSetId">(),
      minimumPercent: completionPercentSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("item-sets-completion"),
      itemSetIds: z
        .array(brandedContentIdSchema<"ItemSetId">())
        .min(2)
        .refine((ids) => new Set(ids).size === ids.length, "多套装条件不能重复引用同一套装"),
      minimumPercent: completionPercentSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("global-completion"),
      minimumPercent: completionPercentSchema,
    })
    .strict(),
]);

export const collectionRewardEffectSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("guild-funds"),
      amount: nonNegativeIntegerSchema.refine((amount) => amount > 0, "资金奖励必须大于零"),
    })
    .strict(),
  z
    .object({
      type: z.literal("management-unlock"),
      featureId: brandedContentIdSchema<"ManagementFeatureId">(),
    })
    .strict(),
  z
    .object({
      type: z.literal("display-record"),
      recordId: brandedContentIdSchema<"DisplayRecordId">(),
    })
    .strict(),
]);

export const collectionRewardDefinitionSchema = z
  .object({
    id: brandedContentIdSchema<"CollectionRewardId">(),
    name: localizedTextSchema,
    description: localizedTextSchema,
    condition: collectionRewardConditionSchema,
    effects: z.array(collectionRewardEffectSchema).min(1),
    source: contentSourceSchema,
  })
  .strict()
  .superRefine((reward, context) => {
    const keys = reward.effects.map((effect) => {
      if (effect.type === "guild-funds") return effect.type;
      return effect.type === "management-unlock"
        ? `${effect.type}:${effect.featureId}`
        : `${effect.type}:${effect.recordId}`;
    });
    if (new Set(keys).size !== keys.length) {
      context.addIssue({
        code: "custom",
        path: ["effects"],
        message: "收藏奖励不能重复配置同一效果",
      });
    }
  });

export const collectionRewardDefinitionFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    attribution: contentAttributionSchema,
    collectionRewards: z.array(collectionRewardDefinitionSchema).min(1),
  })
  .strict();

export type CollectionRewardCondition = z.infer<typeof collectionRewardConditionSchema>;
export type CollectionRewardEffect = z.infer<typeof collectionRewardEffectSchema>;
export type CollectionRewardDefinition = z.infer<typeof collectionRewardDefinitionSchema>;
