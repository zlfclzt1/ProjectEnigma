import type { Clock } from "../ports/clock";
import type { GameCommand } from "../services/game-session";
import { removeCandidate, resumeRecruitmentTimer } from "../../domain/guild/recruitment";
import type { CandidateId } from "../../domain/shared/ids";

export function rejectCandidateCommand(
  clock: Clock,
  candidateId: CandidateId,
): GameCommand<boolean> {
  return {
    type: "reject-candidate",
    execute(draft) {
      if (!draft.candidates[candidateId]) return false;
      removeCandidate(draft, candidateId);
      resumeRecruitmentTimer(draft, clock.now());
      return true;
    },
  };
}
