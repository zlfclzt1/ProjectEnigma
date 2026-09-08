import type { ContentRegistry } from "../../content/registry";
import type { ItemDefinition } from "../../content/schemas/item";
import type { ItemInstance } from "../equipment/item-instance";
import type { Member } from "../member/member";
import type { FormulaVersion } from "../shared/ids";
import type { CombatCapability, CombatCapabilityValues } from "./combat-profile";

export const COMBAT_STAT_IDS = [
  "strengthPoints",
  "agilityPoints",
  "staminaPoints",
  "intellectPoints",
  "spiritPoints",
  "armorPoints",
  "defenseSkillPoints",
  "blockValuePoints",
  "dodgePercent",
  "parryPercent",
  "blockPercent",
  "attackPowerPoints",
  "rangedAttackPowerPoints",
  "physicalHitPercent",
  "physicalCriticalStrikePercent",
  "spellPowerPoints",
  "healingPowerPoints",
  "spellHitPercent",
  "spellCriticalStrikePercent",
  "meleeWeaponAverageDamagePoints",
  "meleeWeaponDamagePerSecond",
  "rangedWeaponAverageDamagePoints",
  "rangedWeaponDamagePerSecond",
  "arcaneResistancePoints",
  "fireResistancePoints",
  "frostResistancePoints",
  "natureResistancePoints",
  "shadowResistancePoints",
] as const;

export type CombatStatId = (typeof COMBAT_STAT_IDS)[number];
export type CombatStatBlock = Record<CombatStatId, number>;

export interface LevelCurve {
  readonly base: number;
  readonly perLevel: number;
}

export interface DerivedStatRule {
  readonly sourceStatId: CombatStatId;
  readonly targetStatId: CombatStatId;
  readonly multiplier: number;
}

export interface FormulaModifier {
  readonly id: string;
  readonly capability: CombatCapability;
  readonly multiplier: number;
  readonly description: string;
}

export type CombatStrategyConfig =
  | {
      readonly strategyId: "hit-threshold";
      readonly capability: CombatCapability;
      readonly statId: "physicalHitPercent" | "spellHitPercent";
      readonly capPercent: number;
      readonly bonusAtCap: number;
    }
  | {
      readonly strategyId: "shield-tank";
      readonly armorExpected: number;
      readonly blockValueExpected: number;
      readonly survivabilityBonus: number;
      readonly threatBonus: number;
    }
  | {
      readonly strategyId: "weapon-damage";
      readonly capability: "damage" | "threat";
      readonly weaponType: "melee" | "ranged";
      readonly expectedDamagePerSecond: number;
      readonly bonusWeight: number;
    }
  | {
      readonly strategyId: "mana-sustain";
      readonly capability: "healing" | "damage";
      readonly intellectExpected: number;
      readonly spiritExpected: number;
      readonly bonusWeight: number;
    };

export interface CombatFormulaConfig {
  readonly formulaVersion: FormulaVersion;
  readonly role: "tank" | "healer" | "dps";
  readonly baseCapabilityPerLevel: CombatCapabilityValues;
  readonly minimumFactors: CombatCapabilityValues;
  readonly classBaseStats: Partial<Record<CombatStatId, LevelCurve>>;
  readonly expectedStatsAtLevel: Partial<Record<CombatStatId, LevelCurve>>;
  readonly derivedStatRules: readonly DerivedStatRule[];
  readonly linearWeights: Readonly<Record<CombatCapability, Partial<Record<CombatStatId, number>>>>;
  readonly strategies: readonly CombatStrategyConfig[];
}

export interface CombatFormulaContext {
  readonly member: Member;
  readonly content: ContentRegistry;
  readonly itemInstances: Readonly<Record<string, ItemInstance>>;
  readonly modifiers?: readonly FormulaModifier[];
}

export interface ResolvedCombatFormulaContext extends CombatFormulaContext {
  readonly equippedDefinitions: readonly ItemDefinition[];
  readonly hasShield: boolean;
}

export function emptyCombatStatBlock(): CombatStatBlock {
  return Object.fromEntries(COMBAT_STAT_IDS.map((id) => [id, 0])) as CombatStatBlock;
}

export function evaluateLevelCurve(curve: LevelCurve | undefined, level: number): number {
  return curve ? curve.base + curve.perLevel * level : 0;
}
