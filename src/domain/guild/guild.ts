import type { DungeonId, EncounterId, GuildUpgradeId } from "../shared/ids";

export interface GuildState {
  name: string;
  funds: number;
  candidateCapacity: number;
  purchasedUpgradeIds: GuildUpgradeId[];
  unlockedDungeonIds: DungeonId[];
  firstKillEncounterIds: EncounterId[];
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
