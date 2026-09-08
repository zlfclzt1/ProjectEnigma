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
import {
  balanceOverrideSchema,
  contentAttributionSchema,
  contentSourceSchema,
} from "./content-source";
import { classicItemStatsSchema } from "./item-stats";

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
    stats: classicItemStatsSchema,
    statsSource: contentSourceSchema,
    statsBalanceOverride: balanceOverrideSchema.optional(),
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
    if (item.stats.weapon && !["mainHand", "offHand", "ranged"].includes(item.slot)) {
      context.addIssue({
        code: "custom",
        path: ["stats", "weapon"],
        message: "武器伤害与速度只能配置在武器栏位",
      });
    }
    if (item.isStarter) {
      if (item.statsSource.kind !== "design-decision" || item.statsSource.provider !== "manual") {
        context.addIssue({
          code: "custom",
          path: ["statsSource"],
          message: "初始装备属性必须明确标记为 manual 游戏设计数据",
        });
      }
      if (!item.statsBalanceOverride?.fields.includes("stats")) {
        context.addIssue({
          code: "custom",
          path: ["statsBalanceOverride"],
          message: "初始装备必须为 stats 提供平衡覆盖说明",
        });
      }
    } else if (
      item.statsSource.kind !== "source-fact" ||
      item.statsSource.provider !== "wowhead-classic" ||
      item.statsSource.externalId !== item.id
    ) {
      context.addIssue({
        code: "custom",
        path: ["statsSource"],
        message: "真实装备属性必须引用同 ID 的 Wowhead Classic 资料",
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
