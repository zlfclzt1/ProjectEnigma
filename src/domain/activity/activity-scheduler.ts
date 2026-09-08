import type { GameStateV2 } from "../game-state";
import type { ActivityId, MemberId } from "../shared/ids";
import type { IdGenerator } from "../../application/ports/id-generator";
import type { RandomSource } from "../../application/ports/random-source";
import type { Activity, ActivityStatus } from "./activity";
import type { ActivityStartRequest, ActivityValidationIssue } from "./activity-handler";
import type { ActivityRegistry } from "./activity-registry";

export type StartActivityResult<ManagedActivity extends Activity> =
  | { readonly status: "started"; readonly activity: ManagedActivity }
  | { readonly status: "rejected"; readonly issues: readonly ActivityValidationIssue[] };

export type FinishActivityResult =
  | { readonly status: "finished"; readonly activity: Activity }
  | { readonly status: "not-found"; readonly activityId: ActivityId }
  | { readonly status: "already-terminal"; readonly activity: Activity };

const TERMINAL_STATUSES = new Set<ActivityStatus>(["completed", "failed", "cancelled"]);

export class ActivityScheduler {
  constructor(private readonly registry: ActivityRegistry) {}

  start<Request extends ActivityStartRequest, ManagedActivity extends Activity>(
    state: GameStateV2,
    request: Request,
    now: number,
    runtime: { readonly ids: IdGenerator; readonly random: RandomSource },
  ): StartActivityResult<ManagedActivity> {
    const commonIssues = validateCommonStartRules(state, request);
    if (commonIssues.length > 0) return { status: "rejected", issues: commonIssues };

    const handler = this.registry.get<Request, ManagedActivity>(request.type);
    const context = { state: structuredClone(state), now, ...runtime };
    const validation = handler.validateStart(context, request);
    if (!validation.ok) return { status: "rejected", issues: validation.issues };

    const activity = handler.create(context, request);
    const creationIssues = validateCreatedActivity(state, request, activity);
    if (creationIssues.length > 0) return { status: "rejected", issues: creationIssues };

    state.activities[activity.id] = structuredClone(activity);
    for (const memberId of activity.participantIds) {
      state.members[memberId]!.activeActivityId = activity.id;
    }
    return { status: "started", activity: structuredClone(activity) };
  }

  finish(
    state: GameStateV2,
    activityId: ActivityId,
    terminalStatus: Extract<ActivityStatus, "completed" | "failed" | "cancelled">,
    completedAt: number,
  ): FinishActivityResult {
    const activity = state.activities[activityId];
    if (!activity) return { status: "not-found", activityId };
    if (TERMINAL_STATUSES.has(activity.status)) {
      return { status: "already-terminal", activity: structuredClone(activity) };
    }

    activity.status = terminalStatus;
    activity.completedAt = completedAt;
    for (const memberId of activity.participantIds) {
      const member = state.members[memberId];
      if (member?.activeActivityId === activity.id) delete member.activeActivityId;
    }

    if (terminalStatus === "completed") {
      state.history.completedActivityCount += 1;
      if (activity.type === "expedition") state.history.completedExpeditionCount += 1;
    } else if (terminalStatus === "failed") {
      state.history.failedActivityCount += 1;
    } else {
      state.history.cancelledActivityCount += 1;
    }

    return { status: "finished", activity: structuredClone(activity) };
  }

  due(state: GameStateV2, now: number): Activity[] {
    return Object.values(state.activities)
      .filter(
        (activity) =>
          (activity.status === "active" || activity.status === "scheduled") &&
          activity.nextSettlementAt <= now,
      )
      .sort(
        (left, right) =>
          left.nextSettlementAt - right.nextSettlementAt || left.id.localeCompare(right.id),
      )
      .map((activity) => structuredClone(activity));
  }
}

function validateCommonStartRules(
  state: GameStateV2,
  request: ActivityStartRequest,
): ActivityValidationIssue[] {
  const issues: ActivityValidationIssue[] = [];
  if (request.participantIds.length === 0) {
    issues.push({ code: "participants.empty", message: "活动至少需要一名参与成员。" });
  }

  const seen = new Set<MemberId>();
  for (const memberId of request.participantIds) {
    if (seen.has(memberId)) {
      issues.push({
        code: "participants.duplicate",
        message: "同一成员不能在同一活动中重复出现。",
        memberId,
      });
      continue;
    }
    seen.add(memberId);

    const member = state.members[memberId];
    if (!member) {
      issues.push({ code: "member.not-found", message: "参与成员不存在。", memberId });
    } else if (member.activeActivityId) {
      issues.push({ code: "member.busy", message: "成员正在参加其他活动。", memberId });
    }
  }
  return issues;
}

function validateCreatedActivity(
  state: GameStateV2,
  request: ActivityStartRequest,
  activity: Activity,
): ActivityValidationIssue[] {
  const issues: ActivityValidationIssue[] = [];
  if (activity.type !== request.type) {
    issues.push({ code: "activity.type-mismatch", message: "活动处理器返回了错误类型。" });
  }
  if (state.activities[activity.id]) {
    issues.push({ code: "activity.id-conflict", message: "活动 ID 已存在。" });
  }
  if (activity.status !== "active" && activity.status !== "scheduled") {
    issues.push({ code: "activity.invalid-status", message: "新活动必须处于待开始或进行中。" });
  }
  if (!sameMembers(activity.participantIds, request.participantIds)) {
    issues.push({
      code: "activity.participants-mismatch",
      message: "活动参与成员与开始请求不一致。",
    });
  }
  return issues;
}

function sameMembers(left: readonly MemberId[], right: readonly MemberId[]): boolean {
  return left.length === right.length && left.every((memberId, index) => memberId === right[index]);
}
