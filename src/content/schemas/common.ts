import { z } from "zod";
import type { BrandedId } from "../../domain/shared/ids";

export const CONTENT_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

export const contentIdSchema = z
  .string()
  .trim()
  .min(1, "内容 ID 不能为空")
  .max(120, "内容 ID 不能超过 120 个字符")
  .regex(CONTENT_ID_PATTERN, "内容 ID 只能包含小写字母、数字、下划线和连字符");

export function brandedContentIdSchema<Name extends string>() {
  return contentIdSchema.transform((value) => value as BrandedId<Name>);
}

export const levelSchema = z.number().int().min(1).max(255);
export const nonNegativeIntegerSchema = z.number().int().nonnegative();
export const positiveWeightSchema = z.number().finite().positive();
export const probabilitySchema = z.number().finite().min(0).max(1);

export const roleSchema = z.enum(["tank", "healer", "dps"]);
export const itemQualitySchema = z.enum(["poor", "common", "uncommon", "rare", "epic"]);
export const armorTypeSchema = z.enum(["cloth", "leather", "mail", "plate"]);

export const localizedTextSchema = z
  .object({
    zhCN: z.string().trim().min(1),
    enUS: z.string().trim().min(1).optional(),
  })
  .strict();

export type LocalizedText = z.infer<typeof localizedTextSchema>;
