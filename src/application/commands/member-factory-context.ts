import type { Clock } from "../ports/clock";
import type { IdGenerator } from "../ports/id-generator";
import type { RandomSource } from "../ports/random-source";
import type { ContentRegistry } from "../../content/registry";
import type { GameState } from "../../domain/game-state";
import { claimedHiddenCharacterIds, knownMemberNames } from "../../domain/guild/recruitment";
import type { MemberFactoryContext } from "../../domain/member/member-factory";

export function memberFactoryContext(
  state: GameState,
  content: ContentRegistry,
  clock: Clock,
  ids: IdGenerator,
  random: RandomSource,
): MemberFactoryContext {
  return {
    content,
    clock,
    ids,
    random,
    usedNames: knownMemberNames(state),
    claimedHiddenCharacterIds: claimedHiddenCharacterIds(state),
  };
}
