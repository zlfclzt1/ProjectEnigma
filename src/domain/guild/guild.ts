import type { DungeonId, EncounterId, GuildUpgradeId, SupplyPlanId } from "../shared/ids";
import type { GuildProfessionFacilities } from "../profession/profession-state";
import type { GuildSupplyPlan } from "./supply-plan";

export interface GuildState {
  name: string;
  funds: number;
  candidateCapacity: number;
  purchasedUpgradeIds: GuildUpgradeId[];
  unlockedDungeonIds: DungeonId[];
  firstKillEncounterIds: EncounterId[];
  professionFacilities?: GuildProfessionFacilities;
  supplyPlans?: Record<SupplyPlanId, GuildSupplyPlan>;
}

export interface RecruitmentState {
  nextCandidateAt?: number;
}

export interface HistorySummary {
  completedActivityCount: number;
  failedActivityCount: number;
  cancelledActivityCount: number;
  completedExpeditionCount: number;
  encounterVictoryCounts: Record<EncounterId, number>;
  dungeonClearCounts: Record<DungeonId, number>;
}
