import type { Clock } from "../ports/clock";
import type { GameCommand } from "../services/game-session";
import type { ContentRegistry } from "../../content/registry";
import {
  candidateCount,
  PAID_CANDIDATE_COST,
  RECRUIT_INTERVAL_MS,
  resumeRecruitmentTimer,
  stopRecruitmentTimerIfFull,
} from "../../domain/guild/recruitment";
import { createCandidate } from "../../domain/member/member-factory";
import type { Candidate } from "../../domain/member/member";
import { LocalIdGenerator } from "../../infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../../infrastructure/random/seeded-random-source";
import { memberFactoryContext } from "./member-factory-context";

export function generateCandidateCommand(dependencies: {
  readonly content: ContentRegistry;
  readonly clock: Clock;
}): GameCommand<Candidate> {
  return {
    type: "generate-candidate",
    execute(draft) {
      if (candidateCount(draft) >= draft.guild.candidateCapacity) {
        throw new Error("候选区已经满员。");
      }
      if (draft.guild.funds < PAID_CANDIDATE_COST) {
        throw new Error(`公会资金不足，需要 ${PAID_CANDIDATE_COST}。`);
      }
      const ids = new LocalIdGenerator(draft.ids);
      const random = new SeededRandomSource(draft.random);
      const candidate = createCandidate(
        memberFactoryContext(draft, dependencies.content, dependencies.clock, ids, random),
      );
      draft.guild.funds -= PAID_CANDIDATE_COST;
      draft.candidates[candidate.id] = candidate;
      draft.ids = ids.snapshot();
      draft.random = random.snapshot();
      stopRecruitmentTimerIfFull(draft);
      return structuredClone(candidate);
    },
  };
}

export function settleCandidateGenerationCommand(dependencies: {
  readonly content: ContentRegistry;
  readonly clock: Clock;
}): GameCommand<readonly Candidate[]> {
  return {
    type: "settle-candidate-generation",
    execute(draft) {
      const now = dependencies.clock.now();
      resumeRecruitmentTimer(draft, now);
      if (draft.recruitment.nextCandidateAt === undefined) return [];
      const ids = new LocalIdGenerator(draft.ids);
      const random = new SeededRandomSource(draft.random);
      const generated: Candidate[] = [];
      while (
        candidateCount(draft) < draft.guild.candidateCapacity &&
        draft.recruitment.nextCandidateAt !== undefined &&
        draft.recruitment.nextCandidateAt <= now
      ) {
        const offeredAt = draft.recruitment.nextCandidateAt;
        const candidate = createCandidate(
          memberFactoryContext(draft, dependencies.content, { now: () => offeredAt }, ids, random),
        );
        draft.candidates[candidate.id] = candidate;
        generated.push(structuredClone(candidate));
        draft.recruitment.nextCandidateAt += RECRUIT_INTERVAL_MS;
      }
      stopRecruitmentTimerIfFull(draft);
      if (generated.length > 0) {
        draft.ids = ids.snapshot();
        draft.random = random.snapshot();
      }
      return generated;
    },
  };
}
