import { z } from "zod";
import { brandedContentIdSchema, localizedTextSchema } from "./common";
import { contentAttributionSchema } from "./content-source";

const capabilityIdSchema = brandedContentIdSchema<"CapabilityId">();

export const capabilityCategorySchema = z.enum([
  "primary-role",
  "interrupt",
  "dispel",
  "control",
  "area-damage",
  "ranged-damage",
]);

export const capabilityDefinitionSchema = z
  .object({
    id: capabilityIdSchema,
    name: localizedTextSchema,
    description: localizedTextSchema,
    category: capabilityCategorySchema,
  })
  .strict();

export const capabilityDefinitionFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    attribution: contentAttributionSchema,
    capabilities: z.array(capabilityDefinitionSchema).min(1),
  })
  .strict();

export type CapabilityCategory = z.infer<typeof capabilityCategorySchema>;
export type CapabilityDefinition = z.infer<typeof capabilityDefinitionSchema>;
