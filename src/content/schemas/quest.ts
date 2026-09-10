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
      excludedEncounterIds: z
        .array(encounterIdSchema)
        .min(1)
        .refine((ids) => new Set(ids).size === ids.length, "任务排除目标不能重复引用同一首领")
        .optional(),
    })
    .strict()
    .refine(
      ({ encounterIds, excludedEncounterIds }) =>
        !(excludedEncounterIds ?? []).some((encounterId) => encounterIds.includes(encounterId)),
      "任务目标与排除目标不能引用同一首领",
    ),
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
        fixedItemIds: z
          .array(itemDefinitionIdSchema)
          .refine((ids) => new Set(ids).size === ids.length, "任务固定奖励不能重复引用同一装备")
          .default([]),
        itemChoiceIds: z
          .array(itemDefinitionIdSchema)
          .refine((ids) => new Set(ids).size === ids.length, "任务可选奖励不能重复引用同一装备")
          .default([]),
      })
      .strict()
      .refine(
        (rewards) => rewards.fixedItemIds.length + rewards.itemChoiceIds.length > 0,
        "任务必须提供至少一件固定或可选装备奖励",
      )
      .refine(
        (rewards) =>
          rewards.fixedItemIds.every((itemId) => !rewards.itemChoiceIds.includes(itemId)),
        "任务固定奖励与可选奖励不能重复引用同一装备",
      ),
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
