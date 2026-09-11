import {
  GAME_STATE_SAVE_VERSION,
  type GameState,
  type LegacyGameStateV13,
} from "../../../domain/game-state";

export function migrateV13ToV14(legacy: LegacyGameStateV13): GameState {
  const cloned = structuredClone(legacy);
  const members = Object.fromEntries(
    Object.entries(cloned.members).map(([memberId, member]) => {
      const { wishlist: _wishlist, ...current } = member;
      void _wishlist;
      return [memberId, current];
    }),
  ) as GameState["members"];
  return { ...cloned, saveVersion: GAME_STATE_SAVE_VERSION, members };
}
