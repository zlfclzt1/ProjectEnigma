import type { Clock } from "../ports/clock";
import type { GameCommand } from "../services/game-session";
import type { ContentRegistry } from "../../content/registry";
import type { ExpeditionActivity } from "../../domain/activity/activity";
import { ActivityRegistry } from "../../domain/activity/activity-registry";
import { ActivityScheduler } from "../../domain/activity/activity-scheduler";
import {
  createExpeditionActivityHandler,
  type StartExpeditionRequest,
} from "../../domain/dungeon/expedition-activity";
import { LocalIdGenerator } from "../../infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../../infrastructure/random/seeded-random-source";
import type { ActivityValidationIssue } from "../../domain/activity/activity-handler";

export class StartExpeditionError extends Error {
  constructor(readonly issues: readonly ActivityValidationIssue[]) {
    super(issues.map((issue) => issue.message).join(" "));
    this.name = "StartExpeditionError";
  }
}

export function startExpeditionCommand(
  dependencies: { readonly content: ContentRegistry; readonly clock: Clock },
  request: Omit<StartExpeditionRequest, "type">,
): GameCommand<ExpeditionActivity> {
  return {
    type: "start-expedition",
    execute(draft) {
      const ids = new LocalIdGenerator(draft.ids);
      const random = new SeededRandomSource(draft.random);
      const registry = new ActivityRegistry();
      registry.register(createExpeditionActivityHandler(dependencies.content));
      const scheduler = new ActivityScheduler(registry);
      const result = scheduler.start<StartExpeditionRequest, ExpeditionActivity>(
        draft,
        { ...request, type: "expedition" },
        dependencies.clock.now(),
        { ids, random },
      );
      if (result.status === "rejected") throw new StartExpeditionError(result.issues);
      draft.ids = ids.snapshot();
      draft.random = random.snapshot();
      return result.activity;
    },
  };
}
