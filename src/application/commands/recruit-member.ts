import type { Clock } from "../ports/clock";
import type { GameCommand } from "../services/game-session";
import type { ContentRegistry } from "../../content/registry";
import { recordAcquiredItem } from "../../domain/collection/item-collection";
import {
  ensureCandidateReferencesValid,
  memberCount,
  removeCandidate,
  resumeRecruitmentTimer,
} from "../../domain/guild/recruitment";
import { getMemberCapacity } from "../../domain/guild/guild-upgrade-rules";
import {
  createMemberFromCandidate,
  type GeneratedMember,
} from "../../domain/member/member-factory";
import type { CandidateId } from "../../domain/shared/ids";
import { LocalIdGenerator } from "../../infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../../infrastructure/random/seeded-random-source";
import { memberFactoryContext } from "./member-factory-context";

export function recruitMemberCommand(
  dependencies: { readonly content: ContentRegistry; readonly clock: Clock },
  candidateId: CandidateId,
): GameCommand<GeneratedMember> {
  return {
    type: "recruit-member",
    execute(draft) {
      if (memberCount(draft) >= getMemberCapacity(draft, dependencies.content)) {
        throw new Error("公会人数已达上限。请先扩建或移除成员。");
      }
      ensureCandidateReferencesValid(draft, dependencies.content, candidateId);
      const candidate = draft.candidates[candidateId]!;
      const ids = new LocalIdGenerator(draft.ids);
      const random = new SeededRandomSource(draft.random);
      const generated = createMemberFromCandidate(
        memberFactoryContext(draft, dependencies.content, dependencies.clock, ids, random),
        candidate,
      );
      removeCandidate(draft, candidateId);
      draft.members[generated.member.id] = generated.member;
      for (const item of generated.itemInstances) {
        draft.itemInstances[item.id] = item;
        recordAcquiredItem(draft.collection, item, dependencies.content);
      }
      draft.ids = ids.snapshot();
      resumeRecruitmentTimer(draft, dependencies.clock.now());
      return structuredClone(generated);
    },
  };
}
