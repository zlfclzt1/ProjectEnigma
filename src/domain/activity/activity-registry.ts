import type { Activity, ActivityType } from "./activity";
import type { ActivityHandler, ActivityStartRequest } from "./activity-handler";

export class ActivityHandlerAlreadyRegisteredError extends Error {
  constructor(readonly activityType: ActivityType) {
    super(`Activity handler already registered: ${activityType}`);
    this.name = "ActivityHandlerAlreadyRegisteredError";
  }
}

export class ActivityHandlerNotFoundError extends Error {
  constructor(readonly activityType: ActivityType) {
    super(`Activity handler not found: ${activityType}`);
    this.name = "ActivityHandlerNotFoundError";
  }
}

export class ActivityRegistry {
  private readonly handlers = new Map<ActivityType, unknown>();

  register<Request extends ActivityStartRequest, ManagedActivity extends Activity>(
    handler: ActivityHandler<Request, ManagedActivity>,
  ): void {
    if (this.handlers.has(handler.type)) {
      throw new ActivityHandlerAlreadyRegisteredError(handler.type);
    }
    this.handlers.set(handler.type, handler);
  }

  get<Request extends ActivityStartRequest, ManagedActivity extends Activity>(
    activityType: ManagedActivity["type"],
  ): ActivityHandler<Request, ManagedActivity> {
    const handler = this.handlers.get(activityType);
    if (!handler) throw new ActivityHandlerNotFoundError(activityType);
    return handler as ActivityHandler<Request, ManagedActivity>;
  }

  has(activityType: ActivityType): boolean {
    return this.handlers.has(activityType);
  }
}
