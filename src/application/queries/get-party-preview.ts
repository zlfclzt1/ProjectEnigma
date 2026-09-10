import type { ContentRegistry } from "../../content/registry";
import type { GameState } from "../../domain/game-state";
import type { DungeonId, MemberId } from "../../domain/shared/ids";
import {
  evaluateExpeditionParty,
  type PartyPreviewResult,
} from "../../domain/dungeon/party-evaluation";

export function getPartyPreview(
  state: GameState,
  content: ContentRegistry,
  dungeonId: DungeonId,
  memberIds: readonly MemberId[],
): PartyPreviewResult {
  return evaluateExpeditionParty(state, content, dungeonId, memberIds);
}
