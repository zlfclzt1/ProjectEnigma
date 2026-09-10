export interface PrimaryStatPoints {
  readonly strengthPoints?: number;
  readonly agilityPoints?: number;
  readonly staminaPoints?: number;
  readonly intellectPoints?: number;
  readonly spiritPoints?: number;
}

export interface DefensiveStats {
  readonly armorPoints?: number;
  readonly defenseSkillPoints?: number;
  readonly blockValuePoints?: number;
  readonly dodgePercent?: number;
  readonly parryPercent?: number;
  readonly blockPercent?: number;
}

export interface PhysicalCombatStats {
  readonly attackPowerPoints?: number;
  readonly rangedAttackPowerPoints?: number;
  readonly hitPercent?: number;
  readonly criticalStrikePercent?: number;
}

export interface SpellCombatStats {
  readonly spellPowerPoints?: number;
  readonly healingPowerPoints?: number;
  readonly arcaneSpellPowerPoints?: number;
  readonly fireSpellPowerPoints?: number;
  readonly frostSpellPowerPoints?: number;
  readonly natureSpellPowerPoints?: number;
  readonly shadowSpellPowerPoints?: number;
  readonly healthRegenPer5Seconds?: number;
  readonly manaRegenPer5Seconds?: number;
  readonly hitPercent?: number;
  readonly criticalStrikePercent?: number;
}

export interface WeaponStats {
  readonly damage: {
    readonly minimumPoints: number;
    readonly maximumPoints: number;
  };
  readonly speedSeconds: number;
}

export interface ResistancePoints {
  readonly arcanePoints?: number;
  readonly firePoints?: number;
  readonly frostPoints?: number;
  readonly naturePoints?: number;
  readonly shadowPoints?: number;
}

/**
 * Raw Classic item stats. Field names carry their units so point values,
 * percentages, seconds, and damage ranges cannot be silently mixed.
 */
export interface ClassicItemStats {
  readonly primary?: PrimaryStatPoints;
  readonly defense?: DefensiveStats;
  readonly physical?: PhysicalCombatStats;
  readonly spell?: SpellCombatStats;
  readonly weapon?: WeaponStats;
  readonly resistances?: ResistancePoints;
}

export const EMPTY_CLASSIC_ITEM_STATS: ClassicItemStats = Object.freeze({});
