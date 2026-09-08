import { z } from "zod";
import { brandedContentIdSchema } from "./common";
import { contentAttributionSchema } from "./content-source";

const parameterSchema = z.enum(["tank", "healer", "member"]);
const templateVariablePattern = /\{([a-z][a-z0-9_-]*)\}/g;

const logScopeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("global") }).strict(),
  z
    .object({ type: z.literal("dungeon"), dungeonId: brandedContentIdSchema<"DungeonId">() })
    .strict(),
  z
    .object({ type: z.literal("encounter"), encounterId: brandedContentIdSchema<"EncounterId">() })
    .strict(),
]);

export const logTemplateGroupSchema = z
  .object({
    id: brandedContentIdSchema<"LogTemplateId">(),
    eventType: z.enum([
      "expedition-start",
      "encounter-victory",
      "encounter-failure",
      "dungeon-flavor",
    ]),
    scope: logScopeSchema,
    availableParameters: z.array(parameterSchema),
    templates: z.array(z.string().trim().min(1)).min(1),
  })
  .strict()
  .superRefine((group, context) => {
    const allowed = new Set(group.availableParameters);
    group.templates.forEach((template, templateIndex) => {
      for (const match of template.matchAll(templateVariablePattern)) {
        if (!allowed.has(match[1] as z.infer<typeof parameterSchema>)) {
          context.addIssue({
            code: "custom",
            path: ["templates", templateIndex],
            message: `模板变量 {${match[1]}} 未在 availableParameters 中声明`,
          });
        }
      }
    });
  });

export const logTemplateFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    attribution: contentAttributionSchema,
    locale: z.literal("zh-CN"),
    groups: z.array(logTemplateGroupSchema).min(1),
  })
  .strict();

export type LogTemplateGroup = z.infer<typeof logTemplateGroupSchema>;
