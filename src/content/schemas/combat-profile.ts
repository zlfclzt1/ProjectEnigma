import { z } from "zod";
import { COMBAT_CAPABILITIES } from "../../domain/combat/combat-profile";
import { COMBAT_STAT_IDS } from "../../domain/combat/formula-context";
import type { CombatFormulaConfig } from "../../domain/combat/formula-context";
import { brandedContentIdSchema, roleSchema } from "./common";
import { contentAttributionSchema } from "./content-source";

const finiteNonNegativeSchema = z.number().finite().nonnegative();
const finitePositiveSchema = z.number().finite().positive();
const combatCapabilitySchema = z.enum(COMBAT_CAPABILITIES);
const combatStatIdSchema = z.enum(COMBAT_STAT_IDS);
const formulaVersionSchema = brandedContentIdSchema<"FormulaVersion">();
const combatProfileIdSchema = brandedContentIdSchema<"CombatProfileId">();
const specIdSchema = brandedContentIdSchema<"SpecId">();

const capabilityValuesSchema = z
  .object({
    survivability: finiteNonNegativeSchema,
    threat: finiteNonNegativeSchema,
    healing: finiteNonNegativeSchema,
    damage: finiteNonNegativeSchema,
  })
  .strict();

const levelCurveSchema = z
  .object({
    base: finiteNonNegativeSchema,
    perLevel: finiteNonNegativeSchema,
  })
  .strict()
  .refine((curve) => curve.base > 0 || curve.perLevel > 0, "等级曲线不能恒为零");

const derivedStatRuleSchema = z
  .object({
    sourceStatId: combatStatIdSchema,
    targetStatId: combatStatIdSchema,
    multiplier: finitePositiveSchema,
  })
  .strict()
  .refine((rule) => rule.sourceStatId !== rule.targetStatId, "派生属性不能写回自身");

const linearWeightsSchema = z
  .object({
    survivability: z.partialRecord(combatStatIdSchema, finiteNonNegativeSchema),
    threat: z.partialRecord(combatStatIdSchema, finiteNonNegativeSchema),
    healing: z.partialRecord(combatStatIdSchema, finiteNonNegativeSchema),
    damage: z.partialRecord(combatStatIdSchema, finiteNonNegativeSchema),
  })
  .strict();

const hitThresholdStrategySchema = z
  .object({
    strategyId: z.literal("hit-threshold"),
    capability: combatCapabilitySchema,
    statId: z.enum(["physicalHitPercent", "spellHitPercent"]),
    capPercent: finitePositiveSchema,
    bonusAtCap: finiteNonNegativeSchema,
  })
  .strict();

const shieldTankStrategySchema = z
  .object({
    strategyId: z.literal("shield-tank"),
    armorExpected: finitePositiveSchema,
    blockValueExpected: finitePositiveSchema,
    survivabilityBonus: finiteNonNegativeSchema,
    threatBonus: finiteNonNegativeSchema,
  })
  .strict();

const weaponDamageStrategySchema = z
  .object({
    strategyId: z.literal("weapon-damage"),
    capability: z.enum(["damage", "threat"]),
    weaponType: z.enum(["melee", "ranged"]),
    expectedDamagePerSecond: finitePositiveSchema,
    bonusWeight: finiteNonNegativeSchema,
  })
  .strict();

const manaSustainStrategySchema = z
  .object({
    strategyId: z.literal("mana-sustain"),
    capability: z.enum(["healing", "damage"]),
    intellectExpected: finitePositiveSchema,
    spiritExpected: finitePositiveSchema,
    bonusWeight: finiteNonNegativeSchema,
  })
  .strict();

export const combatStrategyConfigSchema = z.discriminatedUnion("strategyId", [
  hitThresholdStrategySchema,
  shieldTankStrategySchema,
  weaponDamageStrategySchema,
  manaSustainStrategySchema,
]);

export const combatProfileDefinitionSchema = z
  .object({
    id: combatProfileIdSchema,
    specId: specIdSchema,
    formulaVersion: formulaVersionSchema,
    role: roleSchema,
    baseCapabilityPerLevel: capabilityValuesSchema,
    minimumFactors: capabilityValuesSchema,
    classBaseStats: z.partialRecord(combatStatIdSchema, levelCurveSchema),
    expectedStatsAtLevel: z.partialRecord(combatStatIdSchema, levelCurveSchema),
    derivedStatRules: z.array(derivedStatRuleSchema),
    linearWeights: linearWeightsSchema,
    strategies: z.array(combatStrategyConfigSchema),
  })
  .strict()
  .superRefine((profile, context) => {
    for (const capability of COMBAT_CAPABILITIES) {
      for (const [statId, weight] of Object.entries(profile.linearWeights[capability])) {
        if (weight === 0) continue;
        if (!profile.expectedStatsAtLevel[statId as keyof typeof profile.expectedStatsAtLevel]) {
          context.addIssue({
            code: "custom",
            path: ["linearWeights", capability, statId],
            message: "非零属性权重必须配置对应的等级期望值",
          });
        }
      }
    }
  });

export const combatProfileDefinitionFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    attribution: contentAttributionSchema,
    combatProfiles: z.array(combatProfileDefinitionSchema).min(1),
  })
  .strict();

export type CombatProfileDefinition = z.infer<typeof combatProfileDefinitionSchema> &
  CombatFormulaConfig;
