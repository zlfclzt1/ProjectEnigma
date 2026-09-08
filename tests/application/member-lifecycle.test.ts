import { describe, expect, it } from "vitest";
import { dismissMemberCommand } from "../../src/application/commands/dismiss-member";
import {
  generateCandidateCommand,
  settleCandidateGenerationCommand,
} from "../../src/application/commands/generate-candidate";
import { recruitMemberCommand } from "../../src/application/commands/recruit-member";
import { rejectCandidateCommand } from "../../src/application/commands/reject-candidate";
import { respecMemberCommand } from "../../src/application/commands/respec-member";
import { GameSession } from "../../src/application/services/game-session";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { EQUIPMENT_SLOTS } from "../../src/domain/equipment/equipment-slot";
import { createNewGame } from "../../src/domain/guild/new-game";
import {
  PAID_CANDIDATE_COST,
  RECRUIT_INTERVAL_MS,
  RESPEC_COST,
} from "../../src/domain/guild/recruitment";
import { asBrandedId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import {
  createGameStateV2Fixture,
  createItemInstanceFixture,
} from "../helpers/game-state-v2-factory";
import { FakeClock } from "../helpers/runtime-fakes";

const content = loadBrowserContentRegistry();

function newState(seed = "member-lifecycle") {
  return createNewGame({
    slotId: asBrandedId<"SaveSlotId">("slot_1"),
    content,
    contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
    clock: new FakeClock(1_000),
    ids: new LocalIdGenerator(),
    random: new SeededRandomSource(seed),
  });
}

async function createSession(state = newState()) {
  const saves = new MemorySaveRepository();
  await saves.create(state);
  return { saves, session: GameSession.fromState(saves, state) };
}

describe("candidate generation", () => {
  it("fills one slot every 30 minutes, stops at capacity, and does not accumulate while full", async () => {
    const { session } = await createSession();
    const fillAt = 1_000 + 7 * RECRUIT_INTERVAL_MS;
    const fillResult = await session.execute(
      settleCandidateGenerationCommand({ content, clock: new FakeClock(fillAt) }),
    );
    expect(fillResult.status).toBe("committed");
    if (fillResult.status !== "committed") throw new Error("Expected committed generation");
    expect(fillResult.result).toHaveLength(7);
    expect(Object.values(session.snapshot().candidates)).toHaveLength(10);
    expect(session.snapshot().recruitment.nextCandidateAt).toBeUndefined();

    const muchLater = fillAt + 24 * 60 * 60 * 1_000;
    const stopped = await session.execute(
      settleCandidateGenerationCommand({ content, clock: new FakeClock(muchLater) }),
    );
    if (stopped.status !== "committed") throw new Error("Expected committed generation check");
    expect(stopped.result).toEqual([]);
    const rejectedId = Object.values(session.snapshot().candidates)[0]!.id;
    await session.execute(rejectCandidateCommand(new FakeClock(muchLater), rejectedId));
    expect(session.snapshot().recruitment.nextCandidateAt).toBe(muchLater + RECRUIT_INTERVAL_MS);

    const beforeDue = await session.execute(
      settleCandidateGenerationCommand({
        content,
        clock: new FakeClock(muchLater + RECRUIT_INTERVAL_MS - 1),
      }),
    );
    if (beforeDue.status !== "committed") throw new Error("Expected committed generation check");
    expect(beforeDue.result).toEqual([]);
    const atDue = await session.execute(
      settleCandidateGenerationCommand({
        content,
        clock: new FakeClock(muchLater + RECRUIT_INTERVAL_MS),
      }),
    );
    if (atDue.status !== "committed") throw new Error("Expected committed generation");
    expect(atDue.result).toHaveLength(1);
    expect(Object.values(session.snapshot().candidates)).toHaveLength(10);
    expect(session.snapshot().recruitment.nextCandidateAt).toBeUndefined();
  });

  it("spends guild funds to immediately create one visible candidate", async () => {
    const { session } = await createSession();
    const before = session.snapshot();
    const result = await session.execute(
      generateCandidateCommand({ content, clock: new FakeClock(2_000) }),
    );

    expect(result.status).toBe("committed");
    if (result.status !== "committed") throw new Error("Expected committed paid generation");
    expect(result.result.offeredAt).toBe(2_000);
    expect(session.snapshot().guild.funds).toBe(before.guild.funds - PAID_CANDIDATE_COST);
    expect(Object.values(session.snapshot().candidates)).toHaveLength(4);
    await expect(
      session.execute(generateCandidateCommand({ content, clock: new FakeClock(2_001) })),
    ).rejects.toThrow(/资金不足/);
  });
});

describe("member recruitment and dismissal", () => {
  it("promotes a candidate into a new member with a complete starter equipment set", async () => {
    const state = newState();
    const candidate = Object.values(state.candidates)[0]!;
    const candidateIdentity = structuredClone(candidate.identity);
    const { session } = await createSession(state);

    const result = await session.execute(
      recruitMemberCommand({ content, clock: new FakeClock(3_000) }, candidate.id),
    );

    expect(result.status).toBe("committed");
    if (result.status !== "committed") throw new Error("Expected committed recruitment");
    expect(result.result.member.identity).toEqual(candidateIdentity);
    expect(result.result.member.joinedAt).toBe(3_000);
    expect(Object.keys(result.result.member.equipment)).toHaveLength(EQUIPMENT_SLOTS.length);
    expect(result.result.itemInstances).toHaveLength(EQUIPMENT_SLOTS.length);
    expect(Object.values(session.snapshot().members)).toHaveLength(6);
    expect(session.snapshot().candidates[candidate.id]).toBeUndefined();
    expect(
      result.result.itemInstances.every(
        (item) => item.ownerMemberId === result.result.member.id && item.bound,
      ),
    ).toBe(true);
  });

  it("enforces member capacity and restarts a stopped recruitment timer after hiring", async () => {
    const state = newState();
    state.guild.memberCapacity = 5;
    const candidateId = Object.values(state.candidates)[0]!.id;
    const { session } = await createSession(state);
    await expect(
      session.execute(recruitMemberCommand({ content, clock: new FakeClock(3_000) }, candidateId)),
    ).rejects.toThrow(/人数已达上限/);
    expect(session.snapshot()).toEqual(state);

    const roomState = newState("full-candidate-room");
    const fullSession = (await createSession(roomState)).session;
    await fullSession.execute(
      settleCandidateGenerationCommand({
        content,
        clock: new FakeClock(1_000 + 7 * RECRUIT_INTERVAL_MS),
      }),
    );
    const fullCandidateId = Object.values(fullSession.snapshot().candidates)[0]!.id;
    const hiredAt = 99_000_000;
    await fullSession.execute(
      recruitMemberCommand({ content, clock: new FakeClock(hiredAt) }, fullCandidateId),
    );
    expect(fullSession.snapshot().recruitment.nextCandidateAt).toBe(hiredAt + RECRUIT_INTERVAL_MS);
  });

  it("removes idle members and their owned equipment, but never removes a busy member", async () => {
    const idleState = newState();
    const idleMember = Object.values(idleState.members)[0]!;
    const ownedIds = Object.values(idleState.itemInstances)
      .filter((item) => item.ownerMemberId === idleMember.id)
      .map((item) => item.id);
    const { session } = await createSession(idleState);
    await session.execute(dismissMemberCommand(idleMember.id));
    const dismissed = session.snapshot();
    expect(dismissed.members[idleMember.id]).toBeUndefined();
    expect(ownedIds.every((id) => !dismissed.itemInstances[id])).toBe(true);

    const busyState = newState("busy-dismissal");
    const busyMember = Object.values(busyState.members)[0]!;
    busyMember.activeActivityId = asBrandedId<"ActivityId">("activity_busy");
    const busySession = (await createSession(busyState)).session;
    await expect(busySession.execute(dismissMemberCommand(busyMember.id))).rejects.toThrow(
      /活动中的成员/,
    );
    expect(busySession.snapshot()).toEqual(busyState);
  });
});

describe("member respec", () => {
  it("charges the fixed fee, uses equip rules, sells incompatible gear, and fills empty slots", async () => {
    const state = createGameStateV2Fixture({
      guild: {
        ...createGameStateV2Fixture().guild,
        funds: 400,
      },
      activities: {},
    });
    const member = Object.values(state.members)[0]!;
    delete member.activeActivityId;
    member.progression.specId = asBrandedId<"SpecId">("warrior_arms");
    const weapon = createItemInstanceFixture({
      id: asBrandedId<"ItemInstanceId">("dps_weapon"),
      definitionId: asBrandedId<"ItemDefinitionId">("5187"),
      ownerMemberId: member.id,
      bound: true,
    });
    state.itemInstances[weapon.id] = weapon;
    member.equipment.mainHand = weapon.id;
    const { session } = await createSession(state);

    const result = await session.execute(
      respecMemberCommand(
        { content, clock: new FakeClock(5_000) },
        member.id,
        asBrandedId<"SpecId">("warrior_protection"),
      ),
    );

    expect(result.status).toBe("committed");
    if (result.status !== "committed") throw new Error("Expected committed respec");
    expect(result.result.changed).toBe(true);
    expect(result.result.soldItemInstanceIds).toEqual([weapon.id]);
    expect(result.result.saleProceeds).toBe(6);
    const changed = session.snapshot();
    const changedMember = changed.members[member.id]!;
    expect(changed.guild.funds).toBe(400 - RESPEC_COST + 6);
    expect(changedMember.progression.specId).toBe("warrior_protection");
    expect(changed.itemInstances[weapon.id]).toBeUndefined();
    expect(Object.keys(changedMember.equipment)).toHaveLength(EQUIPMENT_SLOTS.length);
    expect(
      Object.values(changedMember.equipment).every(
        (id) => content.itemById.get(changed.itemInstances[id]!.definitionId)?.isStarter,
      ),
    ).toBe(true);
  });

  it("rejects respec for busy members, other classes, and insufficient funds", async () => {
    const state = createGameStateV2Fixture();
    const member = Object.values(state.members)[0]!;
    const { session } = await createSession(state);
    await expect(
      session.execute(
        respecMemberCommand(
          { content, clock: new FakeClock(5_000) },
          member.id,
          asBrandedId<"SpecId">("warrior_arms"),
        ),
      ),
    ).rejects.toThrow(/活动中的成员/);

    const idleState = createGameStateV2Fixture({ activities: {} });
    const idleMember = Object.values(idleState.members)[0]!;
    delete idleMember.activeActivityId;
    const idleSession = (await createSession(idleState)).session;
    await expect(
      idleSession.execute(
        respecMemberCommand(
          { content, clock: new FakeClock(5_000) },
          idleMember.id,
          asBrandedId<"SpecId">("mage_fire"),
        ),
      ),
    ).rejects.toThrow(/该职业/);
    await expect(
      idleSession.execute(
        respecMemberCommand(
          { content, clock: new FakeClock(5_000) },
          idleMember.id,
          asBrandedId<"SpecId">("warrior_arms"),
        ),
      ),
    ).rejects.toThrow(/资金不足/);
  });
});
