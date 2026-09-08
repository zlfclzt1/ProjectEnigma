import type { SaveRepository } from "../ports/save-repository";
import type { GameStateV2 } from "../../domain/game-state";
import type { SaveSlotId } from "../../domain/shared/ids";

export interface GameCommand<Result> {
  readonly type: string;
  execute(draft: GameStateV2): Result | Promise<Result>;
}

export type CommandExecutionResult<Result> =
  | {
      readonly status: "committed";
      readonly result: Result;
      readonly state: GameStateV2;
    }
  | {
      readonly status: "conflict";
      readonly expectedRevision: number;
      readonly actualRevision: number;
    }
  | { readonly status: "not-found"; readonly expectedRevision: number };

export class GameSession {
  private executionQueue: Promise<void> = Promise.resolve();

  private constructor(
    private readonly saves: SaveRepository,
    private state: GameStateV2,
  ) {}

  static fromState(saves: SaveRepository, state: GameStateV2): GameSession {
    return new GameSession(saves, structuredClone(state));
  }

  static async load(saves: SaveRepository, slotId: SaveSlotId): Promise<GameSession | null> {
    const state = await saves.load(slotId);
    return state ? new GameSession(saves, state) : null;
  }

  snapshot(): GameStateV2 {
    return structuredClone(this.state);
  }

  execute<Result>(command: GameCommand<Result>): Promise<CommandExecutionResult<Result>> {
    const execution = this.executionQueue.then(() => this.executeNow(command));
    this.executionQueue = execution.then(
      () => undefined,
      () => undefined,
    );
    return execution;
  }

  private async executeNow<Result>(
    command: GameCommand<Result>,
  ): Promise<CommandExecutionResult<Result>> {
    const baseState = this.state;
    const draft = structuredClone(baseState);
    const result = await command.execute(draft);
    const saveResult = await this.saves.save(draft, baseState.revision);

    if (saveResult.status === "conflict") return saveResult;
    if (saveResult.status === "not-found") return saveResult;

    this.state = structuredClone(saveResult.state);
    return {
      status: "committed",
      result,
      state: structuredClone(saveResult.state),
    };
  }
}
