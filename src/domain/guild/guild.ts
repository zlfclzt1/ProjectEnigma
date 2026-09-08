import type { DungeonId, EncounterId } from "../shared/ids";

export interface GuildState {
  name: string;
  funds: number;
  memberCapacity: number;
  candidateCapacity: number;
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
}
