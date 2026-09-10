import { describe, expect, it } from "vitest";
import type {
  ActivityHandler,
  ActivityStartContext,
  ActivityStartRequest,
} from "../../src/domain/activity/activity-handler";
import {
  ActivityHandlerAlreadyRegisteredError,
  ActivityHandlerNotFoundError,
  ActivityRegistry,
} from "../../src/domain/activity/activity-registry";
import { ActivityScheduler } from "../../src/domain/activity/activity-scheduler";
import type { TrainingActivity } from "../../src/domain/activity/activity";
import { asBrandedId } from "../../src/domain/shared/ids";
import { createGameStateFixture, createMemberFixture } from "../helpers/game-state-v2-factory";
import { FixedRandomSource, SequentialIdGenerator } from "../helpers/runtime-fakes";

interface TrainingRequest extends ActivityStartRequest {
  readonly type: "training";
  readonly durationMs: number;
}

function trainingHandler(
  activityId = "training_1",
): ActivityHandler<TrainingRequest, TrainingActivity> {
  return {
    type: "training",
    validateStart(_context, request) {
      return request.durationMs > 0
        ? { ok: true }
        : { ok: false, issues: [{ code: "duration.invalid", message: "训练时间无效。" }] };
    },
    create(context: ActivityStartContext, request: TrainingRequest) {
      return {
        id: asBrandedId<"ActivityId">(activityId),
        type: "training",
        participantIds: [...request.participantIds],
        status: "active",
        createdAt: context.now,
        startedAt: context.now,
        nextSettlementAt: context.now + request.durationMs,
        seed: "training-seed",
        contentVersion: context.state.contentVersion,
        trainingDefinitionId: asBrandedId<"TrainingDefinitionId">("apprentice_riding"),
      };
    },
  };
}

function setup(activityId?: string) {
  const registry = new ActivityRegistry();
  registry.register(trainingHandler(activityId));
  return { registry, scheduler: new ActivityScheduler(registry) };
}

function runtime() {
  return { ids: new SequentialIdGenerator(), random: new FixedRandomSource([0]) };
}

describe("ActivityRegistry", () => {
  it("rejects duplicate handlers and reports missing handlers", () => {
    const registry = new ActivityRegistry();
    registry.register(trainingHandler());
    expect(() => registry.register(trainingHandler("training_2"))).toThrow(
      ActivityHandlerAlreadyRegisteredError,
    );
    expect(() => registry.get("gathering")).toThrow(ActivityHandlerNotFoundError);
  });
});

describe("ActivityScheduler", () => {
  it("atomically starts an activity and occupies every participant", () => {
    const state = createGameStateFixture({ activities: {} });
    const firstMember = Object.values(state.members)[0]!;
    delete firstMember.activeActivityId;
    const secondMember = createMemberFixture({ id: asBrandedId<"MemberId">("member_2") });
    state.members[secondMember.id] = secondMember;
    const { scheduler } = setup();

    const result = scheduler.start<TrainingRequest, TrainingActivity>(
      state,
      {
        type: "training",
        participantIds: [firstMember.id, secondMember.id],
        durationMs: 60_000,
      },
      2_000,
      runtime(),
    );

    expect(result.status).toBe("started");
    expect(state.activities[asBrandedId<"ActivityId">("training_1")]).toMatchObject({
      type: "training",
      nextSettlementAt: 62_000,
    });
    expect(firstMember.activeActivityId).toBe("training_1");
    expect(secondMember.activeActivityId).toBe("training_1");
  });

  it("rejects an invalid multi-member activity without partially occupying members", () => {
    const state = createGameStateFixture({ activities: {} });
    const freeMember = Object.values(state.members)[0]!;
    delete freeMember.activeActivityId;
    const missingMemberId = asBrandedId<"MemberId">("missing");
    const { scheduler } = setup();

    const result = scheduler.start<TrainingRequest, TrainingActivity>(
      state,
      {
        type: "training",
        participantIds: [freeMember.id, missingMemberId],
        durationMs: 60_000,
      },
      2_000,
      runtime(),
    );

    expect(result).toMatchObject({
      status: "rejected",
      issues: [{ code: "member.not-found", memberId: missingMemberId }],
    });
    expect(freeMember.activeActivityId).toBeUndefined();
    expect(state.activities).toEqual({});
  });

  it("rejects busy, duplicate, and handler-specific invalid requests", () => {
    const state = createGameStateFixture();
    const member = Object.values(state.members)[0]!;
    const { scheduler } = setup();

    expect(
      scheduler.start<TrainingRequest, TrainingActivity>(
        state,
        { type: "training", participantIds: [member.id, member.id], durationMs: 60_000 },
        2_000,
        runtime(),
      ),
    ).toMatchObject({
      status: "rejected",
      issues: [{ code: "member.busy" }, { code: "participants.duplicate" }],
    });

    delete member.activeActivityId;
    expect(
      scheduler.start<TrainingRequest, TrainingActivity>(
        state,
        { type: "training", participantIds: [member.id], durationMs: 0 },
        2_000,
        runtime(),
      ),
    ).toEqual({
      status: "rejected",
      issues: [{ code: "duration.invalid", message: "训练时间无效。" }],
    });
    expect(member.activeActivityId).toBeUndefined();
  });

  it.each([
    ["completed", "completedActivityCount"],
    ["failed", "failedActivityCount"],
    ["cancelled", "cancelledActivityCount"],
  ] as const)("releases participants when an activity is %s", (terminalStatus, counter) => {
    const state = createGameStateFixture();
    const member = Object.values(state.members)[0]!;
    const activityId = member.activeActivityId!;
    const { scheduler } = setup();

    const result = scheduler.finish(state, activityId, terminalStatus, 5_000);

    expect(result.status).toBe("finished");
    expect(member.activeActivityId).toBeUndefined();
    expect(state.activities[activityId]!.status).toBe(terminalStatus);
    expect(state.activities[activityId]!.completedAt).toBe(5_000);
    expect(state.history[counter]).toBe(1);
    const repeated = scheduler.finish(state, activityId, terminalStatus, 6_000);
    expect(repeated.status).toBe("already-terminal");
    expect(state.history[counter]).toBe(1);
  });

  it("sorts due activities by settlement time and then stable ID", () => {
    const first = createGameStateFixture().activities[asBrandedId<"ActivityId">("activity_1")]!;
    const second = structuredClone(first);
    const third = structuredClone(first);
    first.id = asBrandedId<"ActivityId">("activity_b");
    first.nextSettlementAt = 20;
    second.id = asBrandedId<"ActivityId">("activity_c");
    second.nextSettlementAt = 10;
    third.id = asBrandedId<"ActivityId">("activity_a");
    third.nextSettlementAt = 20;
    const state = createGameStateFixture({
      activities: { [first.id]: first, [second.id]: second, [third.id]: third },
    });
    const { scheduler } = setup();

    expect(scheduler.due(state, 20).map((activity) => activity.id)).toEqual([
      "activity_c",
      "activity_a",
      "activity_b",
    ]);
  });
});
