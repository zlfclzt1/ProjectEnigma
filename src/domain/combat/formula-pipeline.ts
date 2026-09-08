import { COMBAT_CAPABILITIES, type CombatProfile } from "./combat-profile";
import {
  COMBAT_STAT_IDS,
  emptyCombatStatBlock,
  evaluateLevelCurve,
  type CombatFormulaConfig,
  type CombatFormulaContext,
  type CombatStatBlock,
  type CombatStatId,
  type ResolvedCombatFormulaContext,
} from "./formula-context";
import type { StatContribution } from "./stat-contribution";
import { CombatStrategyRegistry } from "./strategies/strategy-registry";

type MutableCombatCapabilityValues = Record<(typeof COMBAT_CAPABILITIES)[number], number>;

export function buildCombatProfile(
  context: CombatFormulaContext,
  config: CombatFormulaConfig,
  strategies = new CombatStrategyRegistry(),
): CombatProfile {
  const spec = context.content.specById.get(context.member.progression.specId);
  if (!spec) throw new Error(`成员 ${context.member.id} 缺少专精定义。`);
  if (spec.role !== config.role) throw new Error(`战斗配置定位与专精 ${spec.id} 不一致。`);

  const resolved = resolveContext(context);
  const diagnostics: StatContribution[] = [];
  const stats = aggregateStats(resolved, config, diagnostics);
  applyDerivedStats(stats, config, diagnostics);

  const factorAdditions = zeroCapabilities();
  for (const capability of COMBAT_CAPABILITIES) {
    for (const [statId, weight] of Object.entries(config.linearWeights[capability]) as [
      CombatStatId,
      number,
    ][]) {
      if (!Number.isFinite(weight)) throw new Error(`属性权重无效：${capability}.${statId}`);
      const expected = evaluateLevelCurve(
        config.expectedStatsAtLevel[statId],
        context.member.progression.level,
      );
      const normalized = expected > 0 ? stats[statId] / expected : 0;
      const amount = normalized * weight;
      factorAdditions[capability] += amount;
      diagnostics.push({
        stage: "linear-weight",
        capability,
        statId,
        sourceId: `linear:${capability}:${statId}`,
        rawValue: stats[statId],
        normalizedValue: normalized,
        weight,
        amount,
        description: `${statId} 对 ${capability} 的线性贡献`,
      });
    }
  }

  for (const strategyConfig of config.strategies) {
    for (const contribution of strategies.evaluate(strategyConfig, stats, resolved)) {
      factorAdditions[contribution.capability] += contribution.amount;
      diagnostics.push({
        stage: "strategy",
        capability: contribution.capability,
        sourceId: contribution.sourceId,
        amount: contribution.amount,
        description: contribution.description,
      });
    }
  }

  const capabilities = zeroCapabilities();
  for (const capability of COMBAT_CAPABILITIES) {
    const base = config.baseCapabilityPerLevel[capability] * context.member.progression.level;
    const factor = Math.max(config.minimumFactors[capability], 1 + factorAdditions[capability]);
    let value = base * factor;
    diagnostics.push({
      stage: "class-base",
      capability,
      sourceId: `base:${capability}`,
      rawValue: base,
      amount: base,
      description: `等级与职业提供的 ${capability} 基础能力`,
    });
    for (const modifier of context.modifiers ?? []) {
      if (modifier.capability !== capability) continue;
      const before = value;
      value *= modifier.multiplier;
      diagnostics.push({
        stage: "modifier",
        capability,
        sourceId: modifier.id,
        amount: value - before,
        description: modifier.description,
      });
    }
    capabilities[capability] = finiteNonNegative(value, capability);
  }

  return {
    formulaVersion: config.formulaVersion,
    memberId: context.member.id,
    role: config.role,
    capabilities,
    utility: { interruptScore: 0, dispelScore: 0, crowdControlScore: 0 },
    diagnostics,
  };
}

function resolveContext(context: CombatFormulaContext): ResolvedCombatFormulaContext {
  const equippedDefinitions = Object.values(context.member.equipment).map((instanceId) => {
    const instance = context.itemInstances[instanceId];
    const definition = instance ? context.content.itemById.get(instance.definitionId) : undefined;
    if (!definition) throw new Error(`成员 ${context.member.id} 装备数据不完整。`);
    return definition;
  });
  const offHandId = context.member.equipment.offHand;
  const offHandInstance = offHandId ? context.itemInstances[offHandId] : undefined;
  const offHand = offHandInstance
    ? context.content.itemById.get(offHandInstance.definitionId)
    : undefined;
  return {
    ...context,
    equippedDefinitions,
    hasShield: Boolean(offHand?.stats.defense?.blockValuePoints),
  };
}

function aggregateStats(
  context: ResolvedCombatFormulaContext,
  config: CombatFormulaConfig,
  diagnostics: StatContribution[],
): CombatStatBlock {
  const stats = emptyCombatStatBlock();
  for (const statId of COMBAT_STAT_IDS) {
    const value = evaluateLevelCurve(
      config.classBaseStats[statId],
      context.member.progression.level,
    );
    stats[statId] += value;
    if (value !== 0) {
      diagnostics.push({
        stage: "class-base",
        statId,
        sourceId: `class-base:${statId}`,
        rawValue: value,
        amount: value,
        description: `职业与等级提供的 ${statId}`,
      });
    }
  }
  for (const definition of context.equippedDefinitions) {
    const itemStats = flattenItemStats(definition);
    for (const statId of COMBAT_STAT_IDS) {
      const value = itemStats[statId];
      stats[statId] += value;
      if (value !== 0) {
        diagnostics.push({
          stage: "equipment",
          statId,
          sourceId: `item:${definition.id}`,
          rawValue: value,
          amount: value,
          description: `${definition.name.zhCN} 提供的 ${statId}`,
        });
      }
    }
  }
  return stats;
}

function flattenItemStats(
  definition: ResolvedCombatFormulaContext["equippedDefinitions"][number],
): CombatStatBlock {
  const stats = emptyCombatStatBlock();
  const raw = definition.stats;
  Object.assign(stats, raw.primary ?? {});
  if (raw.defense) {
    Object.assign(stats, raw.defense);
  }
  if (raw.physical) {
    stats.attackPowerPoints = raw.physical.attackPowerPoints ?? 0;
    stats.rangedAttackPowerPoints = raw.physical.rangedAttackPowerPoints ?? 0;
    stats.physicalHitPercent = raw.physical.hitPercent ?? 0;
    stats.physicalCriticalStrikePercent = raw.physical.criticalStrikePercent ?? 0;
  }
  if (raw.spell) {
    stats.spellPowerPoints = raw.spell.spellPowerPoints ?? 0;
    stats.healingPowerPoints = raw.spell.healingPowerPoints ?? 0;
    stats.spellHitPercent = raw.spell.hitPercent ?? 0;
    stats.spellCriticalStrikePercent = raw.spell.criticalStrikePercent ?? 0;
  }
  if (raw.weapon) {
    const average = (raw.weapon.damage.minimumPoints + raw.weapon.damage.maximumPoints) / 2;
    const dps = average / raw.weapon.speedSeconds;
    if (definition.slot === "ranged") {
      stats.rangedWeaponAverageDamagePoints = average;
      stats.rangedWeaponDamagePerSecond = dps;
    } else {
      stats.meleeWeaponAverageDamagePoints = average;
      stats.meleeWeaponDamagePerSecond = dps;
    }
  }
  const resistances = raw.resistances;
  stats.arcaneResistancePoints = resistances?.arcanePoints ?? 0;
  stats.fireResistancePoints = resistances?.firePoints ?? 0;
  stats.frostResistancePoints = resistances?.frostPoints ?? 0;
  stats.natureResistancePoints = resistances?.naturePoints ?? 0;
  stats.shadowResistancePoints = resistances?.shadowPoints ?? 0;
  return stats;
}

function applyDerivedStats(
  stats: CombatStatBlock,
  config: CombatFormulaConfig,
  diagnostics: StatContribution[],
): void {
  for (const rule of config.derivedStatRules) {
    const amount = stats[rule.sourceStatId] * rule.multiplier;
    stats[rule.targetStatId] += amount;
    diagnostics.push({
      stage: "derived-stat",
      statId: rule.targetStatId,
      sourceId: `derived:${rule.sourceStatId}:${rule.targetStatId}`,
      rawValue: stats[rule.sourceStatId],
      weight: rule.multiplier,
      amount,
      description: `${rule.sourceStatId} 派生为 ${rule.targetStatId}`,
    });
  }
}

function zeroCapabilities(): MutableCombatCapabilityValues {
  return { survivability: 0, threat: 0, healing: 0, damage: 0 };
}

function finiteNonNegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} 战斗能力结果无效。`);
  return value;
}
