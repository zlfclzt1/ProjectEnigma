import { z } from "zod";
import {
  brandedContentIdSchema,
  levelSchema,
  localizedTextSchema,
  nonNegativeIntegerSchema,
} from "./common";
import { contentAttributionSchema } from "./content-source";

const questIdSchema = brandedContentIdSchema<"QuestId">();
const dungeonIdSchema = brandedContentIdSchema<"DungeonId">();
const encounterIdSchema = brandedContentIdSchema<"EncounterId">();
const classIdSchema = brandedContentIdSchema<"ClassId">();
const itemDefinitionIdSchema = brandedContentIdSchema<"ItemDefinitionId">();

export const dungeonQuestCompletionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("encounter-victories"),
      encounterIds: z
        .array(encounterIdSchema)
        .min(1)
        .refine((ids) => new Set(ids).size === ids.length, "任务目标不能重复引用同一首领"),
    })
    .strict(),
  z.object({ type: z.literal("dungeon-clear") }).strict(),
]);

export const dungeonQuestDefinitionSchema = z
  .object({
    id: questIdSchema,
    name: localizedTextSchema,
    description: localizedTextSchema,
    dungeonId: dungeonIdSchema,
    eligibility: z
      .object({
        minimumLevel: levelSchema,
        allowedClassIds: z
          .array(classIdSchema)
          .refine((ids) => new Set(ids).size === ids.length, "任务职业限制不能重复")
          .default([]),
      })
      .strict(),
    completion: dungeonQuestCompletionSchema,
    rewards: z
      .object({
        experienceFraction: z.number().finite().nonnegative().max(2),
        funds: nonNegativeIntegerSchema,
        itemChoiceIds: z
          .array(itemDefinitionIdSchema)
          .min(1)
          .refine((ids) => new Set(ids).size === ids.length, "任务奖励不能重复引用同一装备"),
      })
      .strict(),
  })
  .strict();

export const dungeonQuestDefinitionFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    attribution: contentAttributionSchema,
    quests: z.array(dungeonQuestDefinitionSchema).min(1),
  })
  .strict();

export type DungeonQuestCompletion = z.infer<typeof dungeonQuestCompletionSchema>;
export type DungeonQuestDefinition = z.infer<typeof dungeonQuestDefinitionSchema>;
