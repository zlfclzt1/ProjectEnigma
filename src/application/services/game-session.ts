import type { SaveRepository } from "../ports/save-repository";
import type { GameState } from "../../domain/game-state";
import type { SaveSlotId } from "../../domain/shared/ids";

export interface GameCommand<Result> {
  readonly type: string;
  execute(draft: GameState): Result | Promise<Result>;
}

export type CommandExecutionResult<Result> =
  | {
      readonly status: "committed";
      readonly result: Result;
      readonly state: GameState;
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
    private state: GameState,
  ) {}

  static fromState(saves: SaveRepository, state: GameState): GameSession {
    return new GameSession(saves, structuredClone(state));
  }

  static async load(saves: SaveRepository, slotId: SaveSlotId): Promise<GameSession | null> {
    const state = await saves.load(slotId);
    if (!state) return null;
    if (state.saveVersion !== 3) throw new Error("旧版存档必须先经过迁移才能创建游戏会话。");
    return new GameSession(saves, state);
  }

  snapshot(): GameState {
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
