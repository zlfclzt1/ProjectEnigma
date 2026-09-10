import { z } from "zod";

export const contentSourceProviderSchema = z.enum([
  "wowhead-classic",
  "atlasloot-classic",
  "warcraft-wiki",
  "manual",
]);

export const contentGameVersionSchema = z.enum(["classic-2019-phase-6"]);

export const contentSourceSchema = z
  .object({
    kind: z.enum(["source-fact", "design-decision"]),
    provider: contentSourceProviderSchema,
    gameVersion: contentGameVersionSchema.optional(),
    externalId: z.string().trim().min(1).optional(),
    url: z.url().optional(),
    verifiedAt: z.iso.date(),
    notes: z.string().trim().min(1).max(1_000).optional(),
  })
  .strict()
  .superRefine((source, context) => {
    if (source.kind === "source-fact" && source.provider === "manual") {
      context.addIssue({
        code: "custom",
        path: ["provider"],
        message: "真实资料必须注明外部提供方",
      });
    }
    if (source.kind === "source-fact" && !source.url) {
      context.addIssue({
        code: "custom",
        path: ["url"],
        message: "真实资料必须提供来源 URL",
      });
    }
    if (source.kind === "source-fact" && !source.gameVersion) {
      context.addIssue({
        code: "custom",
        path: ["gameVersion"],
        message: "真实资料必须注明经典内容版本",
      });
    }
    if (source.kind === "design-decision" && source.provider !== "manual") {
      context.addIssue({
        code: "custom",
        path: ["provider"],
        message: "游戏设计决定必须使用 manual 提供方",
      });
    }
  });

export const balanceOverrideSchema = z
  .object({
    fields: z
      .array(z.string().trim().min(1))
      .min(1)
      .refine((fields) => new Set(fields).size === fields.length, "覆盖字段不能重复"),
    reason: z.string().trim().min(1).max(1_000),
    decidedAt: z.iso.date(),
  })
  .strict();

export const contentAttributionSchema = z
  .object({
    sources: z.array(contentSourceSchema).min(1),
    balanceOverrides: z.array(balanceOverrideSchema).default([]),
  })
  .strict();

export type ContentSource = z.infer<typeof contentSourceSchema>;
export type BalanceOverride = z.infer<typeof balanceOverrideSchema>;
export type ContentAttribution = z.infer<typeof contentAttributionSchema>;
