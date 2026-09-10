import { z } from "zod";
import type { ClassicItemStats } from "../../domain/equipment/stats";

const pointsSchema = z.number().finite().nonnegative();
const signedPointsSchema = z.number().finite();
const percentSchema = z.number().finite().min(0).max(100);

export const primaryStatPointsSchema = z
  .object({
    strengthPoints: pointsSchema.optional(),
    agilityPoints: pointsSchema.optional(),
    staminaPoints: pointsSchema.optional(),
    intellectPoints: pointsSchema.optional(),
    spiritPoints: signedPointsSchema.optional(),
  })
  .strict();

export const defensiveStatsSchema = z
  .object({
    armorPoints: pointsSchema.optional(),
    defenseSkillPoints: pointsSchema.optional(),
    blockValuePoints: pointsSchema.optional(),
    dodgePercent: percentSchema.optional(),
    parryPercent: percentSchema.optional(),
    blockPercent: percentSchema.optional(),
  })
  .strict();

export const physicalCombatStatsSchema = z
  .object({
    attackPowerPoints: pointsSchema.optional(),
    rangedAttackPowerPoints: pointsSchema.optional(),
    hitPercent: percentSchema.optional(),
    criticalStrikePercent: percentSchema.optional(),
  })
  .strict();

export const spellCombatStatsSchema = z
  .object({
    spellPowerPoints: pointsSchema.optional(),
    healingPowerPoints: pointsSchema.optional(),
    manaRegenPer5Seconds: pointsSchema.optional(),
    hitPercent: percentSchema.optional(),
    criticalStrikePercent: percentSchema.optional(),
  })
  .strict();

export const weaponStatsSchema = z
  .object({
    damage: z
      .object({ minimumPoints: pointsSchema, maximumPoints: pointsSchema })
      .strict()
      .refine(
        ({ minimumPoints, maximumPoints }) => minimumPoints <= maximumPoints,
        "武器最低伤害不能高于最高伤害",
      ),
    speedSeconds: z.number().finite().positive(),
  })
  .strict();

export const resistancePointsSchema = z
  .object({
    arcanePoints: pointsSchema.optional(),
    firePoints: pointsSchema.optional(),
    frostPoints: pointsSchema.optional(),
    naturePoints: pointsSchema.optional(),
    shadowPoints: pointsSchema.optional(),
  })
  .strict();

export const classicItemStatsSchema: z.ZodType<ClassicItemStats> = z
  .object({
    primary: primaryStatPointsSchema.optional(),
    defense: defensiveStatsSchema.optional(),
    physical: physicalCombatStatsSchema.optional(),
    spell: spellCombatStatsSchema.optional(),
    weapon: weaponStatsSchema.optional(),
    resistances: resistancePointsSchema.optional(),
  })
  .strict();
