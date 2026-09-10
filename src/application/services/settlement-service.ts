import type { Clock } from "../ports/clock";
import type { GameCommand } from "./game-session";
import type { ContentRegistry } from "../../content/registry";
import { ActivityRegistry } from "../../domain/activity/activity-registry";
import { ActivityScheduler } from "../../domain/activity/activity-scheduler";
import type { ExpeditionActivity } from "../../domain/activity/activity";
import type { GameState } from "../../domain/game-state";
import {
  settleNextExpeditionStage,
  type ExpeditionSettlementResult,
} from "../../domain/dungeon/expedition-settlement";
import { LocalIdGenerator } from "../../infrastructure/ids/local-id-generator";

export interface SettlementSummary {
  readonly settled: readonly Extract<ExpeditionSettlementResult, { status: "settled" }>[];
}

export class SettlementService {
  private readonly scheduler = new ActivityScheduler(new ActivityRegistry());

  constructor(private readonly content: ContentRegistry) {}

  settleDueActivities(state: GameState, now: number): SettlementSummary {
    const ids = new LocalIdGenerator(state.ids);
    const settled: Extract<ExpeditionSettlementResult, { status: "settled" }>[] = [];

    while (true) {
      const activity = this.scheduler
        .due(state, now)
        .find((candidate): candidate is ExpeditionActivity => candidate.type === "expedition");
      if (!activity) break;
      const liveActivity = state.activities[activity.id] as ExpeditionActivity;
      const result = settleNextExpeditionStage(
        state,
        this.content,
        this.scheduler,
        liveActivity,
        now,
        ids,
      );
      if (result.status !== "settled") {
        throw new Error(`到期活动 ${activity.id} 无法结算：${result.status}`);
      }
      settled.push(result);
    }

    if (settled.length > 0) state.ids = ids.snapshot();
    return { settled };
  }
}

export function settleDueActivitiesCommand(dependencies: {
  readonly content: ContentRegistry;
  readonly clock: Clock;
}): GameCommand<SettlementSummary> {
  return {
    type: "settle-due-activities",
    execute(draft) {
      return new SettlementService(dependencies.content).settleDueActivities(
        draft,
        dependencies.clock.now(),
      );
    },
  };
}
