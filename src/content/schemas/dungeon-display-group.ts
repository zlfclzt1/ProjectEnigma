import { z } from "zod";
import { brandedContentIdSchema, localizedTextSchema, nonNegativeIntegerSchema } from "./common";
import { contentAttributionSchema } from "./content-source";

const groupIdSchema = brandedContentIdSchema<"DungeonDisplayGroupId">();

export const dungeonDisplayGroupDefinitionSchema = z
  .object({
    id: groupIdSchema,
    name: localizedTextSchema,
    order: nonNegativeIntegerSchema,
    parentId: groupIdSchema.optional(),
    dungeonIds: z
      .array(brandedContentIdSchema<"DungeonId">())
      .refine((ids) => new Set(ids).size === ids.length, "展示分组不能重复引用同一副本")
      .optional(),
  })
  .strict();

export const dungeonDisplayGroupDefinitionFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    attribution: contentAttributionSchema,
    groups: z.array(dungeonDisplayGroupDefinitionSchema).min(1),
  })
  .strict();

export type DungeonDisplayGroupDefinition = z.infer<typeof dungeonDisplayGroupDefinitionSchema>;
