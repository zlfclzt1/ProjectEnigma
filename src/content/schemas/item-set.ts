import { z } from "zod";
import { brandedContentIdSchema, localizedTextSchema } from "./common";
import { contentAttributionSchema, contentSourceSchema } from "./content-source";

export const itemSetDefinitionSchema = z
  .object({
    id: brandedContentIdSchema<"ItemSetId">(),
    name: localizedTextSchema,
    description: localizedTextSchema,
    status: z.enum(["planned", "active"]).default("active"),
    itemIds: z
      .array(brandedContentIdSchema<"ItemDefinitionId">())
      .min(2, "套装至少需要两个基础物品")
      .refine((ids) => new Set(ids).size === ids.length, "套装不能重复引用同一基础物品"),
    source: contentSourceSchema,
  })
  .strict();

export const itemSetDefinitionFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    attribution: contentAttributionSchema,
    itemSets: z.array(itemSetDefinitionSchema).min(1),
  })
  .strict();

export type ItemSetDefinition = z.infer<typeof itemSetDefinitionSchema>;
