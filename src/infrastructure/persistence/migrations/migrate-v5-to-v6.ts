import {
  GAME_STATE_SAVE_VERSION,
  type GameState,
  type LegacyGameStateV5,
} from "../../../domain/game-state";
import type { Member } from "../../../domain/member/member";

export function migrateV5ToV6(legacy: LegacyGameStateV5): GameState {
  const members = Object.fromEntries(
    Object.entries(legacy.members).map(([memberId, member]) => [
      memberId,
      { ...structuredClone(member), wishlist: { entries: [] } } satisfies Member,
    ]),
  ) as GameState["members"];
  return {
    ...structuredClone(legacy),
    saveVersion: GAME_STATE_SAVE_VERSION,
    members,
  };
}
