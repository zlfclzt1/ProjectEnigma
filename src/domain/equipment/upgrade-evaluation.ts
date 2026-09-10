import type { ContentRegistry } from "../../content/registry";
import type { CombatCapability, CombatCapabilityValues } from "../combat/combat-profile";
import { buildCombatProfile } from "../combat/formula-pipeline";
import type { CombatStatId, FormulaModifier } from "../combat/formula-context";
import type { StatContribution } from "../combat/stat-contribution";
import type { GameState } from "../game-state";
import type { Member } from "../member/member";
import type { ItemInstanceId } from "../shared/ids";
import { candidateEquipmentSlots, equipItem, EquipmentRuleError } from "./equipment";
import type { EquipmentSlot } from "./equipment-slot";
import type { ItemInstance } from "./item-instance";
import { resolveItemInstance } from "./resolve-item-instance";

export interface UpgradeEvaluationContext {
  readonly modifiers?: readonly FormulaModifier[];
}

export interface CombatStatChange {
  readonly statId: CombatStatId;
  readonly before: number;
  readonly after: number;
  readonly delta: number;
}

export type UpgradeEvaluation =
  | {
      readonly equippable: false;
      readonly reasons: readonly string[];
    }
  | {
      readonly equippable: true;
      readonly replacementSlot: EquipmentSlot;
      readonly displacedItemInstanceIds: readonly ItemInstanceId[];
      readonly capabilitiesBefore: CombatCapabilityValues;
      readonly capabilitiesAfter: CombatCapabilityValues;
      readonly capabilityChanges: CombatCapabilityValues;
      readonly statChanges: readonly CombatStatChange[];
      readonly primaryResponsibilityBefore: number;
      readonly primaryResponsibilityAfter: number;
      readonly primaryResponsibilityDelta: number;
      readonly recommendationScore: number;
      readonly reasons: readonly string[];
    };

export function evaluateUpgrade(
  member: Member,
  candidate: ItemInstance,
  state: Pick<GameState, "itemInstances">,
  content: ContentRegistry,
  context: UpgradeEvaluationContext = {},
): UpgradeEvaluation {
  let definition;
  try {
    definition = resolveItemInstance(candidate, content).definition;
  } catch {
    return { equippable: false, reasons: ["找不到候选装备定义或随机词缀。"] };
  }
  const spec = content.specById.get(member.progression.specId);
  const formula = spec ? content.combatProfileById.get(spec.combatProfileId) : undefined;
  if (!spec || !formula) return { equippable: false, reasons: ["成员缺少有效战斗配置。"] };

  const before = buildCombatProfile(
    { member, content, itemInstances: state.itemInstances, modifiers: context.modifiers },
    formula,
  );
  const candidates: Extract<UpgradeEvaluation, { equippable: true }>[] = [];
  let failureReasons: readonly string[] = ["该成员不能装备这件物品。"];
  for (const slot of candidateEquipmentSlots(definition)) {
    try {
      const equipped = equipItem(
        member,
        candidate,
        { content, itemInstances: state.itemInstances },
        slot,
      );
      const after = buildCombatProfile(
        {
          member: equipped.member,
          content,
          itemInstances: state.itemInstances,
          modifiers: context.modifiers,
        },
        formula,
      );
      const capabilityChanges = capabilityDelta(before.capabilities, after.capabilities);
      const primaryResponsibilityBefore = primaryResponsibility(before.capabilities, spec.role);
      const primaryResponsibilityAfter = primaryResponsibility(after.capabilities, spec.role);
      const primaryResponsibilityDelta = primaryResponsibilityAfter - primaryResponsibilityBefore;
      const recommendationScore = recommendation(
        spec.role,
        primaryResponsibilityDelta,
        capabilityChanges,
      );
      const statChanges = equipmentStatChanges(before.diagnostics, after.diagnostics);
      candidates.push({
        equippable: true,
        replacementSlot: slot,
        displacedItemInstanceIds: equipped.displacedItemInstanceIds,
        capabilitiesBefore: before.capabilities,
        capabilitiesAfter: after.capabilities,
        capabilityChanges,
        statChanges,
        primaryResponsibilityBefore,
        primaryResponsibilityAfter,
        primaryResponsibilityDelta,
        recommendationScore,
        reasons: describeUpgrade(
          spec.role,
          primaryResponsibilityDelta,
          capabilityChanges,
          statChanges,
        ),
      });
    } catch (error) {
      if (error instanceof EquipmentRuleError) failureReasons = error.failureCodes;
      else throw error;
    }
  }
  if (candidates.length === 0) return { equippable: false, reasons: failureReasons };
  return candidates.sort(
    (left, right) =>
      right.recommendationScore - left.recommendationScore ||
      right.primaryResponsibilityDelta - left.primaryResponsibilityDelta ||
      left.replacementSlot.localeCompare(right.replacementSlot),
  )[0]!;
}

function capabilityDelta(
  before: CombatCapabilityValues,
  after: CombatCapabilityValues,
): CombatCapabilityValues {
  return {
    survivability: after.survivability - before.survivability,
    threat: after.threat - before.threat,
    healing: after.healing - before.healing,
    damage: after.damage - before.damage,
  };
}

function primaryResponsibility(
  capabilities: CombatCapabilityValues,
  role: "tank" | "healer" | "dps",
): number {
  if (role === "tank") return Math.sqrt(capabilities.survivability * capabilities.threat);
  return role === "healer" ? capabilities.healing : capabilities.damage;
}

function recommendation(
  role: "tank" | "healer" | "dps",
  primaryDelta: number,
  changes: CombatCapabilityValues,
): number {
  if (role === "tank") return primaryDelta + changes.damage * 0.15;
  if (role === "healer") {
    return primaryDelta + changes.survivability * 0.05 + changes.damage * 0.1;
  }
  return primaryDelta + changes.survivability * 0.05;
}

function equipmentStatTotals(
  diagnostics: readonly StatContribution[],
): Partial<Record<CombatStatId, number>> {
  const totals: Partial<Record<CombatStatId, number>> = {};
  for (const contribution of diagnostics) {
    if (contribution.stage !== "equipment" || !contribution.statId) continue;
    totals[contribution.statId] = (totals[contribution.statId] ?? 0) + contribution.amount;
  }
  return totals;
}

function equipmentStatChanges(
  beforeDiagnostics: readonly StatContribution[],
  afterDiagnostics: readonly StatContribution[],
): readonly CombatStatChange[] {
  const before = equipmentStatTotals(beforeDiagnostics);
  const after = equipmentStatTotals(afterDiagnostics);
  const ids = new Set<CombatStatId>([
    ...(Object.keys(before) as CombatStatId[]),
    ...(Object.keys(after) as CombatStatId[]),
  ]);
  return [...ids]
    .map((statId) => ({
      statId,
      before: before[statId] ?? 0,
      after: after[statId] ?? 0,
      delta: (after[statId] ?? 0) - (before[statId] ?? 0),
    }))
    .filter((change) => change.delta !== 0)
    .sort((left, right) => left.statId.localeCompare(right.statId));
}

function describeUpgrade(
  role: "tank" | "healer" | "dps",
  primaryDelta: number,
  capabilityChanges: CombatCapabilityValues,
  statChanges: readonly CombatStatChange[],
): readonly string[] {
  const roleLabel = { tank: "坦克", healer: "治疗", dps: "输出" }[role];
  const reasons = [`${roleLabel}主职责变化 ${signed(primaryDelta)}`];
  const largestCapability = (
    Object.entries(capabilityChanges) as [CombatCapability, number][]
  ).sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]))[0];
  if (largestCapability && largestCapability[1] !== 0) {
    reasons.push(`${largestCapability[0]} ${signed(largestCapability[1])}`);
  }
  const largestStat = [...statChanges].sort(
    (left, right) => Math.abs(right.delta) - Math.abs(left.delta),
  )[0];
  if (largestStat) reasons.push(`${largestStat.statId} ${signed(largestStat.delta)}`);
  return reasons;
}

function signed(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}
