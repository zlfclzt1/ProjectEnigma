import type { Clock } from "../ports/clock";
import type { GameCommand } from "./game-session";
import type { ContentRegistry } from "../../content/registry";
import { ActivityRegistry } from "../../domain/activity/activity-registry";
import { ActivityScheduler } from "../../domain/activity/activity-scheduler";
import type {
  ExpeditionActivity,
  GatheringActivity,
  CraftingActivity,
} from "../../domain/activity/activity";
import type { GameState } from "../../domain/game-state";
import {
  settleNextExpeditionStage,
  type ExpeditionSettlementResult,
} from "../../domain/dungeon/expedition-settlement";
import { LocalIdGenerator } from "../../infrastructure/ids/local-id-generator";
import {
  settleGatheringActivity,
  settleCraftingActivity,
} from "../../domain/profession/profession-activity";

export interface SettlementSummary {
  readonly settled: readonly Extract<ExpeditionSettlementResult, { status: "settled" }>[];
  readonly professionSettled: number;
}

export class SettlementService {
  private readonly scheduler = new ActivityScheduler(new ActivityRegistry());

  constructor(private readonly content: ContentRegistry) {}

  settleDueActivities(state: GameState, now: number): SettlementSummary {
    const ids = new LocalIdGenerator(state.ids);
    const settled: Extract<ExpeditionSettlementResult, { status: "settled" }>[] = [];
    let professionSettled = 0;

    while (true) {
      const activity = this.scheduler.due(state, now)[0];
      if (!activity) break;
      if (activity.type === "gathering") {
        const live = state.activities[activity.id] as GatheringActivity;
        if (settleGatheringActivity(state, this.content, live).changed) {
          this.scheduler.finish(state, live.id, "completed", now);
          professionSettled += 1;
        }
        continue;
      }
      if (activity.type === "crafting") {
        const live = state.activities[activity.id] as CraftingActivity;
        if (settleCraftingActivity(state, this.content, live, now).changed) {
          this.scheduler.finish(state, live.id, "completed", now);
          professionSettled += 1;
        }
        continue;
      }
      if (activity.type !== "expedition") continue;
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
    return { settled, professionSettled };
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
