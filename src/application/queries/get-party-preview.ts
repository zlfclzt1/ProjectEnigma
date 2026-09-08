import type { ContentRegistry } from "../../content/registry";
import type { GameStateV2 } from "../../domain/game-state";
import type { DungeonId, MemberId } from "../../domain/shared/ids";
import {
  evaluateExpeditionParty,
  type PartyPreviewResult,
} from "../../domain/dungeon/party-evaluation";

export function getPartyPreview(
  state: GameStateV2,
  content: ContentRegistry,
  dungeonId: DungeonId,
  memberIds: readonly MemberId[],
): PartyPreviewResult {
  return evaluateExpeditionParty(state, content, dungeonId, memberIds);
}
