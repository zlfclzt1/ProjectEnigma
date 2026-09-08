import type { SaveRepository } from "../ports/save-repository";
import { GameSession } from "../services/game-session";
import {
  createNewGame as createInitialGameState,
  type NewGameDependencies,
  type NewGameOptions,
} from "../../domain/guild/new-game";

export interface CreateNewGameDependencies extends NewGameDependencies {
  readonly saves: SaveRepository;
}

export async function createNewGameSession(
  dependencies: CreateNewGameDependencies,
  options: NewGameOptions = {},
): Promise<GameSession> {
  const state = createInitialGameState(dependencies, options);
  await dependencies.saves.create(state);
  return GameSession.fromState(dependencies.saves, state);
}
