import { z } from "zod";
import { EQUIPMENT_SLOTS } from "../../domain/equipment/equipment-slot";
import type { EquipmentSlot as DomainEquipmentSlot } from "../../domain/equipment/equipment-slot";
import {
  armorTypeSchema,
  brandedContentIdSchema,
  itemQualitySchema,
  levelSchema,
  localizedTextSchema,
  roleSchema,
} from "./common";
import { contentAttributionSchema } from "./content-source";

export const equipmentSlotSchema = z.enum(EQUIPMENT_SLOTS);

export const itemIconSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("database"), name: z.string().trim().min(1) }).strict(),
  z.object({ kind: z.literal("generic-slot") }).strict(),
]);

export const equipRestrictionsSchema = z
  .object({
    allowedClassIds: z.array(brandedContentIdSchema<"ClassId">()).default([]),
    allowedRoles: z.array(roleSchema).default([]),
  })
  .strict();

export const itemDefinitionSchema = z
  .object({
    id: brandedContentIdSchema<"ItemDefinitionId">(),
    name: localizedTextSchema,
    itemLevel: levelSchema,
    requiredLevel: levelSchema.optional(),
    quality: itemQualitySchema,
    slot: equipmentSlotSchema,
    armorType: armorTypeSchema.optional(),
    twoHanded: z.boolean().default(false),
    restrictions: equipRestrictionsSchema,
    icon: itemIconSchema,
    description: localizedTextSchema,
    isStarter: z.boolean().default(false),
    stats: z.object({}).strict(),
  })
  .strict()
  .superRefine((item, context) => {
    if (item.twoHanded && item.slot !== "mainHand") {
      context.addIssue({
        code: "custom",
        path: ["twoHanded"],
        message: "双手武器必须使用主手栏位",
      });
    }
  });

export const itemDefinitionFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    attribution: contentAttributionSchema,
    items: z.array(itemDefinitionSchema).min(1),
  })
  .strict();

export type EquipmentSlot = DomainEquipmentSlot;
export type ItemDefinition = z.infer<typeof itemDefinitionSchema>;
