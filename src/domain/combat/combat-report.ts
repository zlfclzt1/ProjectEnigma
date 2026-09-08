import type {
  ActivityId,
  CombatReportId,
  DungeonId,
  EncounterId,
  FormulaVersion,
  ItemInstanceId,
  MemberId,
} from "../shared/ids";
import type { CombatEvent } from "./combat-event";

export interface CombatTotals {
  readonly damage: number;
  readonly healing: number;
  readonly damageTaken: number;
}

export interface MemberCombatReport extends CombatTotals {
  readonly memberId: MemberId;
  readonly role: "tank" | "healer" | "dps";
  readonly defeated: boolean;
  readonly contributionScore: number;
}

export interface CombatRewardReport {
  readonly experienceFractionByMember: Readonly<Partial<Record<MemberId, number>>>;
  readonly funds: number;
  readonly firstKillBonus: number;
  readonly itemInstanceIds: readonly ItemInstanceId[];
}

export interface CombatReport {
  readonly id: CombatReportId;
  readonly formulaVersion: FormulaVersion;
  readonly activityId: ActivityId;
  readonly dungeonId: DungeonId;
  readonly encounterId: EncounterId;
  readonly runNumber: number;
  readonly outcome: "victory" | "defeat";
  readonly startedProbability: number;
  readonly actualDurationSeconds: number;
  readonly settledAt: number;
  readonly seed: string;
  readonly parameters: {
    readonly equivalentHealth: number;
    readonly incomingDamageBudget: number;
  };
  readonly totals: CombatTotals;
  readonly members: readonly MemberCombatReport[];
  readonly events: readonly CombatEvent[];
  readonly rewards: CombatRewardReport;
}
