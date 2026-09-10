import type { ContentRegistry } from "../../content/registry";
import type { CombatReport } from "../../domain/combat/combat-report";
import type { GameState } from "../../domain/game-state";
import type { CombatReportId } from "../../domain/shared/ids";
import { renderCombatLog } from "./render-combat-log";
import { resolveItemInstance } from "../../domain/equipment/resolve-item-instance";

export interface MemberCombatRowView {
  readonly memberId: string;
  readonly name: string;
  readonly role: "tank" | "healer" | "dps";
  readonly roleName: string;
  readonly damage: number;
  readonly healing: number;
  readonly damageTaken: number;
  readonly contributionScore: number;
  readonly defeated: boolean;
}

export interface CombatReportView {
  readonly id: CombatReportId;
  readonly activityId: string;
  readonly dungeonName: string;
  readonly encounterName: string;
  readonly runNumber: number;
  readonly outcome: "victory" | "defeat";
  readonly outcomeLabel: string;
  readonly startedProbability: number;
  readonly actualDurationSeconds: number;
  readonly settledAt: number;
  readonly formulaVersion: string;
  readonly totals: CombatReport["totals"];
  readonly members: readonly MemberCombatRowView[];
  readonly logs: readonly { readonly eventType: string; readonly text: string }[];
  readonly mechanics: readonly {
    readonly id: string;
    readonly name: string;
    readonly type: "required" | "recommended";
    readonly satisfied: boolean;
    readonly reportTag: string;
    readonly requirementLabels: readonly string[];
    readonly impactLabels: readonly string[];
  }[];
  readonly rewards: {
    readonly funds: number;
    readonly firstKillBonus: number;
    readonly itemNames: readonly string[];
    readonly experience: readonly { readonly memberName: string; readonly fraction: number }[];
  };
}

export interface CombatReportsView {
  readonly reports: readonly CombatReportView[];
}

function projectReport(
  state: GameState,
  content: ContentRegistry,
  report: CombatReport,
): CombatReportView {
  return {
    id: report.id,
    activityId: report.activityId,
    dungeonName: content.dungeonById.get(report.dungeonId)?.name.zhCN ?? report.dungeonId,
    encounterName: content.encounterById.get(report.encounterId)?.name.zhCN ?? report.encounterId,
    runNumber: report.runNumber,
    outcome: report.outcome,
    outcomeLabel: report.outcome === "victory" ? "胜利" : "灭团",
    startedProbability: report.startedProbability,
    actualDurationSeconds: report.actualDurationSeconds,
    settledAt: report.settledAt,
    formulaVersion: report.formulaVersion,
    totals: { ...report.totals },
    members: report.members
      .map((member) => ({
        memberId: member.memberId,
        name: state.members[member.memberId]?.identity.name ?? member.memberId,
        role: member.role,
        roleName: content.roleById.get(member.role)?.name.zhCN ?? member.role,
        damage: member.damage,
        healing: member.healing,
        damageTaken: member.damageTaken,
        contributionScore: member.contributionScore,
        defeated: member.defeated,
      }))
      .sort(
        (left, right) =>
          right.contributionScore - left.contributionScore || left.name.localeCompare(right.name),
      ),
    logs: renderCombatLog(report, state, content).map((entry) => ({
      eventType: entry.eventType,
      text: entry.text,
    })),
    mechanics: (report.mechanics ?? []).map((result) => {
      const mechanic = content.mechanicById.get(result.mechanicId);
      const effects = result.appliedEffects;
      return {
        id: result.mechanicId,
        name: mechanic?.name.zhCN ?? result.mechanicId,
        type: result.type,
        satisfied: result.satisfied,
        reportTag: result.reportTag,
        requirementLabels: result.requirements.map((requirement) => {
          const capability = content.capabilityById.get(requirement.capabilityId);
          return `${capability?.name.zhCN ?? requirement.capabilityId} ${requirement.currentValue.toFixed(1)}/${requirement.minimumValue.toFixed(1)}`;
        }),
        impactLabels: [
          ...(effects?.tankMultiplier
            ? [`坦克压力 +${Math.round((effects.tankMultiplier - 1) * 100)}%`]
            : []),
          ...(effects?.healingMultiplier
            ? [`治疗压力 +${Math.round((effects.healingMultiplier - 1) * 100)}%`]
            : []),
          ...(effects?.damageMultiplier
            ? [`输出需求 +${Math.round((effects.damageMultiplier - 1) * 100)}%`]
            : []),
          ...(effects?.probabilityModifier
            ? [`胜率 ${Math.round(effects.probabilityModifier * 100)} 个百分点`]
            : []),
          ...(effects?.durationMultiplier
            ? [`耗时 +${Math.round((effects.durationMultiplier - 1) * 100)}%`]
            : []),
        ],
      };
    }),
    rewards: {
      funds: report.rewards.funds,
      firstKillBonus: report.rewards.firstKillBonus,
      itemNames: report.rewards.itemInstanceIds.map((id) => {
        const instance = state.itemInstances[id];
        return instance
          ? resolveItemInstance(instance, content).definition.name.zhCN
          : "已分配装备";
      }),
      experience: Object.entries(report.rewards.experienceFractionByMember).map(
        ([memberId, fraction]) => ({
          memberName:
            state.members[memberId as keyof typeof state.members]?.identity.name ?? memberId,
          fraction: fraction ?? 0,
        }),
      ),
    },
  };
}

export function getCombatReportsView(
  state: GameState,
  content: ContentRegistry,
): CombatReportsView {
  const reports = Object.values(state.activities).flatMap((activity) =>
    activity.type === "expedition"
      ? activity.runPlans.flatMap((run) =>
          run.stages.flatMap((stage) =>
            stage.report ? [projectReport(state, content, stage.report)] : [],
          ),
        )
      : [],
  );
  return { reports: reports.sort((left, right) => right.settledAt - left.settledAt) };
}
