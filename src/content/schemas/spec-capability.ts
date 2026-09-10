import { z } from "zod";
import { brandedContentIdSchema, levelSchema } from "./common";
import { contentAttributionSchema } from "./content-source";

const capabilityIdSchema = brandedContentIdSchema<"CapabilityId">();
const specIdSchema = brandedContentIdSchema<"SpecId">();
const progressionIdSchema = brandedContentIdSchema<"SpecCapabilityProgressionId">();

const capabilityValueSchema = z.number().finite().positive();

export const specCapabilityEntrySchema = z
  .object({
    capabilityId: capabilityIdSchema,
    minimumLevel: levelSchema,
    value: capabilityValueSchema,
  })
  .strict();

export const specCapabilityProgressionSchema = z
  .object({
    id: progressionIdSchema,
    specId: specIdSchema,
    entries: z.array(specCapabilityEntrySchema).min(1),
  })
  .strict()
  .superRefine((progression, context) => {
    const capabilities = new Set<string>();
    for (const [index, entry] of progression.entries.entries()) {
      if (capabilities.has(entry.capabilityId)) {
        context.addIssue({
          code: "custom",
          path: ["entries", index, "capabilityId"],
          message: "同一专精的能力不能重复定义",
        });
      }
      capabilities.add(entry.capabilityId);
    }
  });

export const specCapabilityProgressionFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    attribution: contentAttributionSchema,
    specCapabilities: z.array(specCapabilityProgressionSchema).min(1),
  })
  .strict();

export type SpecCapabilityEntry = z.infer<typeof specCapabilityEntrySchema>;
export type SpecCapabilityProgression = z.infer<typeof specCapabilityProgressionSchema>;
