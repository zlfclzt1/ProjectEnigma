import type { GameStateV2 } from "../../domain/game-state";
import type { GameSession } from "../services/game-session";

export function getGameSnapshot(session: GameSession): GameStateV2 {
  return session.snapshot();
}
