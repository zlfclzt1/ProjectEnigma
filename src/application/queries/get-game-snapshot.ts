import type { GameState } from "../../domain/game-state";
import type { GameSession } from "../services/game-session";

export function getGameSnapshot(session: GameSession): GameState {
  return session.snapshot();
}
