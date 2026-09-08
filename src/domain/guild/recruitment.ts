import type { ContentRegistry } from "../../content/registry";
import type { GameStateV2 } from "../game-state";
import type { CandidateId, HiddenCharacterId } from "../shared/ids";

export const RECRUIT_INTERVAL_MS = 30 * 60 * 1_000;
export const PAID_CANDIDATE_COST = 100;
export const RESPEC_COST = 300;

export function candidateCount(state: GameStateV2): number {
  return Object.keys(state.candidates).length;
}

export function memberCount(state: GameStateV2): number {
  return Object.keys(state.members).length;
}

export function resumeRecruitmentTimer(state: GameStateV2, now: number): void {
  if (
    candidateCount(state) < state.guild.candidateCapacity &&
    state.recruitment.nextCandidateAt === undefined
  ) {
    state.recruitment.nextCandidateAt = now + RECRUIT_INTERVAL_MS;
  }
}

export function stopRecruitmentTimerIfFull(state: GameStateV2): void {
  if (candidateCount(state) >= state.guild.candidateCapacity) {
    delete state.recruitment.nextCandidateAt;
  }
}

export function knownMemberNames(state: GameStateV2): Set<string> {
  return new Set([
    ...Object.values(state.members).map((member) => member.identity.name),
    ...Object.values(state.candidates).map((candidate) => candidate.identity.name),
  ]);
}

export function claimedHiddenCharacterIds(state: GameStateV2): Set<HiddenCharacterId> {
  const ids = new Set<HiddenCharacterId>();
  for (const profile of [...Object.values(state.members), ...Object.values(state.candidates)]) {
    if (profile.identity.hiddenCharacterId) ids.add(profile.identity.hiddenCharacterId);
  }
  return ids;
}

export function removeCandidate(state: GameStateV2, candidateId: CandidateId): void {
  delete state.candidates[candidateId];
}

export function ensureCandidateReferencesValid(
  state: GameStateV2,
  content: ContentRegistry,
  candidateId: CandidateId,
): void {
  const candidate = state.candidates[candidateId];
  if (!candidate) throw new Error("这名候选人已经不在招募列表中。");
  const spec = content.specById.get(candidate.progression.specId);
  if (!spec || spec.classId !== candidate.identity.classId) {
    throw new Error("候选人的职业或专精数据无效。");
  }
}
