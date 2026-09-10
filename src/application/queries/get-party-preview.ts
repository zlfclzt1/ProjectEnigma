import type { ContentRegistry } from "../../content/registry";
import type { GameState } from "../../domain/game-state";
import type { DungeonId, DungeonRouteNodeId, MemberId } from "../../domain/shared/ids";
import {
  evaluateExpeditionParty,
  type PartyPreviewResult,
} from "../../domain/dungeon/party-evaluation";

export function getPartyPreview(
  state: GameState,
  content: ContentRegistry,
  dungeonId: DungeonId,
  memberIds: readonly MemberId[],
  selectedOptionalNodeIds: readonly DungeonRouteNodeId[] = [],
  includedRareNodeIds: readonly DungeonRouteNodeId[] = [],
): PartyPreviewResult {
  return evaluateExpeditionParty(
    state,
    content,
    dungeonId,
    memberIds,
    selectedOptionalNodeIds,
    includedRareNodeIds,
  );
}
