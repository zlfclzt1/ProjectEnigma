import { z } from "zod";
import { brandedContentIdSchema, localizedTextSchema } from "./common";
import { contentAttributionSchema } from "./content-source";

const capabilityIdSchema = brandedContentIdSchema<"CapabilityId">();
const mechanicIdSchema = brandedContentIdSchema<"MechanicId">();
const positiveFiniteSchema = z.number().finite().positive();
const penaltyMultiplierSchema = z.number().finite().min(1);

export const mechanicRequirementSchema = z
  .object({
    capabilityId: capabilityIdSchema,
    minimumValue: positiveFiniteSchema,
  })
  .strict();

export const missingMechanicEffectsSchema = z
  .object({
    tankMultiplier: penaltyMultiplierSchema.optional(),
    healingMultiplier: penaltyMultiplierSchema.optional(),
    damageMultiplier: penaltyMultiplierSchema.optional(),
    probabilityModifier: z.number().finite().min(-1).max(0).optional(),
    durationMultiplier: penaltyMultiplierSchema.optional(),
  })
  .strict()
  .refine(
    (effects) => Object.values(effects).some((value) => value !== undefined),
    "机制缺失影响至少需要配置一个参数",
  );

export const mechanicDefinitionSchema = z
  .object({
    id: mechanicIdSchema,
    name: localizedTextSchema,
    type: z.enum(["required", "recommended"]),
    requirements: z.array(mechanicRequirementSchema).min(1),
    missingEffects: missingMechanicEffectsSchema.optional(),
    description: localizedTextSchema,
    reportTag: brandedContentIdSchema<"MechanicReportTag">(),
  })
  .strict()
  .superRefine((mechanic, context) => {
    const capabilityIds = new Set<string>();
    mechanic.requirements.forEach((requirement, index) => {
      if (capabilityIds.has(requirement.capabilityId)) {
        context.addIssue({
          code: "custom",
          path: ["requirements", index, "capabilityId"],
          message: "同一机制不能重复要求同一种能力",
        });
      }
      capabilityIds.add(requirement.capabilityId);
    });
    if (mechanic.type === "recommended" && !mechanic.missingEffects) {
      context.addIssue({
        code: "custom",
        path: ["missingEffects"],
        message: "推荐机制必须配置缺失时的影响",
      });
    }
  });

export const mechanicDefinitionFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    attribution: contentAttributionSchema,
    mechanics: z.array(mechanicDefinitionSchema).min(1),
  })
  .strict();

export type MechanicRequirement = z.infer<typeof mechanicRequirementSchema>;
export type MissingMechanicEffects = z.infer<typeof missingMechanicEffectsSchema>;
export type MechanicDefinition = z.infer<typeof mechanicDefinitionSchema>;
