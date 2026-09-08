import type { CombatStrategy } from "./combat-strategy";
import type { CombatStrategyConfig } from "../formula-context";

type Config<Id extends CombatStrategyConfig["strategyId"]> = Extract<
  CombatStrategyConfig,
  { strategyId: Id }
>;

function nonNegativeRatio(value: number, expected: number): number {
  return expected > 0 ? Math.max(0, value / expected) : 0;
}

export const hitThresholdStrategy: CombatStrategy<Config<"hit-threshold">> = {
  strategyId: "hit-threshold",
  evaluate(config, stats) {
    const ratio = Math.min(1, nonNegativeRatio(stats[config.statId], config.capPercent));
    return [
      {
        capability: config.capability,
        amount: ratio * config.bonusAtCap,
        sourceId: config.strategyId,
        description: `${config.statId} 达到阈值的 ${(ratio * 100).toFixed(1)}%`,
      },
    ];
  },
};

export const shieldTankStrategy: CombatStrategy<Config<"shield-tank">> = {
  strategyId: "shield-tank",
  evaluate(config, stats, context) {
    if (!context.hasShield) return [];
    const armorRatio = Math.min(2, nonNegativeRatio(stats.armorPoints, config.armorExpected));
    const blockRatio = Math.min(
      2,
      nonNegativeRatio(stats.blockValuePoints, config.blockValueExpected),
    );
    const combined = armorRatio * 0.6 + blockRatio * 0.4;
    return [
      {
        capability: "survivability",
        amount: combined * config.survivabilityBonus,
        sourceId: config.strategyId,
        description: "装备盾牌带来的护甲与格挡协同",
      },
      {
        capability: "threat",
        amount: combined * config.threatBonus,
        sourceId: config.strategyId,
        description: "装备盾牌带来的稳定仇恨能力",
      },
    ];
  },
};

export const weaponDamageStrategy: CombatStrategy<Config<"weapon-damage">> = {
  strategyId: "weapon-damage",
  evaluate(config, stats) {
    const statId =
      config.weaponType === "melee" ? "meleeWeaponDamagePerSecond" : "rangedWeaponDamagePerSecond";
    return [
      {
        capability: config.capability,
        amount:
          nonNegativeRatio(stats[statId], config.expectedDamagePerSecond) * config.bonusWeight,
        sourceId: config.strategyId,
        description: `${config.weaponType} 武器伤害策略`,
      },
    ];
  },
};

export const manaSustainStrategy: CombatStrategy<Config<"mana-sustain">> = {
  strategyId: "mana-sustain",
  evaluate(config, stats) {
    const intellect = nonNegativeRatio(stats.intellectPoints, config.intellectExpected);
    const spirit = nonNegativeRatio(stats.spiritPoints, config.spiritExpected);
    return [
      {
        capability: config.capability,
        amount: (intellect * 0.55 + spirit * 0.45) * config.bonusWeight,
        sourceId: config.strategyId,
        description: "智力与精神共同提供法力续航",
      },
    ];
  },
};

export const BUILTIN_COMBAT_STRATEGIES = [
  hitThresholdStrategy,
  shieldTankStrategy,
  weaponDamageStrategy,
  manaSustainStrategy,
] as const satisfies readonly CombatStrategy[];
