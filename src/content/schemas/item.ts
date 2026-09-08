import { z } from "zod";
import {
  armorTypeSchema,
  brandedContentIdSchema,
  itemQualitySchema,
  levelSchema,
  localizedTextSchema,
  roleSchema,
} from "./common";
import { contentAttributionSchema } from "./content-source";

export const equipmentSlotSchema = z.enum([
  "head",
  "neck",
  "shoulder",
  "back",
  "chest",
  "wrist",
  "hands",
  "waist",
  "legs",
  "feet",
  "ring1",
  "ring2",
  "trinket1",
  "trinket2",
  "mainHand",
  "offHand",
  "ranged",
]);

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
  .strict();

export const itemDefinitionFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    attribution: contentAttributionSchema,
    items: z.array(itemDefinitionSchema).min(1),
  })
  .strict();

export type EquipmentSlot = z.infer<typeof equipmentSlotSchema>;
export type ItemDefinition = z.infer<typeof itemDefinitionSchema>;
