import { z } from "zod";
import { brandedContentIdSchema, localizedTextSchema, nonNegativeIntegerSchema } from "./common";
import { contentAttributionSchema } from "./content-source";

const guildUpgradeIdSchema = brandedContentIdSchema<"GuildUpgradeId">();
const guildUpgradeTrackIdSchema = brandedContentIdSchema<"GuildUpgradeTrackId">();
const dungeonIdSchema = brandedContentIdSchema<"DungeonId">();

export const guildUpgradeRequirementSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("dungeon-clear-count"),
      dungeonId: dungeonIdSchema,
      count: z.number().int().positive(),
    })
    .strict(),
]);

export const guildUpgradeEffectSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("member-capacity"),
      value: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      type: z.literal("expedition-run-capacity"),
      value: z.number().int().min(1).max(5),
    })
    .strict(),
]);

export const guildUpgradeDefinitionSchema = z
  .object({
    id: guildUpgradeIdSchema,
    trackId: guildUpgradeTrackIdSchema,
    order: z.number().int().positive(),
    name: localizedTextSchema,
    description: localizedTextSchema,
    cost: nonNegativeIntegerSchema,
    requirements: z.array(guildUpgradeRequirementSchema).min(1),
    effects: z.array(guildUpgradeEffectSchema).min(1),
  })
  .strict();

export const guildUpgradeDefinitionFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    attribution: contentAttributionSchema,
    guildUpgrades: z.array(guildUpgradeDefinitionSchema).min(1),
  })
  .strict();

export type GuildUpgradeRequirement = z.infer<typeof guildUpgradeRequirementSchema>;
export type GuildUpgradeEffect = z.infer<typeof guildUpgradeEffectSchema>;
export type GuildUpgradeDefinition = z.infer<typeof guildUpgradeDefinitionSchema>;
