import { describe, expect, it } from "vitest";
import { autoAssignLootCommand } from "../../src/application/commands/auto-assign-loot";
import { recruitMemberCommand } from "../../src/application/commands/recruit-member";
import { startExpeditionCommand } from "../../src/application/commands/start-expedition";
import { GameSession } from "../../src/application/services/game-session";
import { settleDueActivitiesCommand } from "../../src/application/services/settlement-service";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { createNewGame } from "../../src/domain/guild/new-game";
import { asBrandedId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { FakeClock } from "../helpers/runtime-fakes";

const content = loadBrowserContentRegistry();

describe("complete V2 gameplay flow", () => {
  it("recruits, runs two independent parties, settles offline, distributes loot, and reloads", async () => {
    const slotId = asBrandedId<"SaveSlotId">("complete-flow");
    const initial = createNewGame({
      slotId,
      content,
      contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
      clock: new FakeClock(1_000),
      ids: new LocalIdGenerator(),
      random: new SeededRandomSource("complete-v2-flow"),
    });
    const originalMemberIds = Object.values(initial.members).map((member) => member.id);
    for (const memberId of originalMemberIds) initial.members[memberId]!.progression.level = 45;
    const saves = new MemorySaveRepository();
    await saves.create(initial);
    const session = GameSession.fromState(saves, initial);

    const candidate = Object.values(session.snapshot().candidates)[0]!;
    const recruitment = await session.execute(
      recruitMemberCommand({ content, clock: new FakeClock(2_000) }, candidate.id),
    );
    expect(recruitment.status).toBe("committed");
    if (recruitment.status !== "committed") throw new Error("Expected recruitment");
    const recruitedMemberId = recruitment.result.member.id;

    const firstParty = await session.execute(
      startExpeditionCommand(
        { content, clock: new FakeClock(3_000) },
        {
          dungeonId: asBrandedId<"DungeonId">("ragefire_chasm"),
          participantIds: originalMemberIds,
          requestedRuns: 1,
        },
      ),
    );
    const secondParty = await session.execute(
      startExpeditionCommand(
        { content, clock: new FakeClock(3_001) },
        {
          dungeonId: asBrandedId<"DungeonId">("ragefire_chasm"),
          participantIds: [recruitedMemberId],
          requestedRuns: 1,
        },
      ),
    );
    expect(firstParty.status).toBe("committed");
    expect(secondParty.status).toBe("committed");
    if (firstParty.status !== "committed" || secondParty.status !== "committed") {
      throw new Error("Expected both expeditions");
    }
    expect(firstParty.result.id).not.toBe(secondParty.result.id);
    expect(
      new Set([...firstParty.result.participantIds, ...secondParty.result.participantIds]).size,
    ).toBe(6);

    const offlineSettlement = await session.execute(
      settleDueActivitiesCommand({
        content,
        clock: new FakeClock(24 * 60 * 60 * 1_000),
      }),
    );
    expect(offlineSettlement.status).toBe("committed");
    if (offlineSettlement.status !== "committed") throw new Error("Expected settlement");
    expect(
      offlineSettlement.result.settled.filter(
        (event) => event.activityId === firstParty.result.id && event.outcome === "victory",
      ),
    ).toHaveLength(4);
    const lootBeforeDistribution = Object.keys(session.snapshot().pendingLoot).length;
    expect(lootBeforeDistribution).toBeGreaterThanOrEqual(4);

    const distribution = await session.execute(autoAssignLootCommand(content));
    expect(distribution.status).toBe("committed");
    if (distribution.status !== "committed") throw new Error("Expected loot distribution");
    expect(distribution.result.locked).toBe(0);
    expect(distribution.result.assigned).toBeGreaterThan(0);
    expect(distribution.result.assigned + distribution.result.sold).toBe(lootBeforeDistribution);
    expect(Object.keys(session.snapshot().pendingLoot)).toHaveLength(0);

    const beforeReload = session.snapshot();
    const restored = await GameSession.load(saves, slotId);
    expect(restored).not.toBeNull();
    expect(restored!.snapshot()).toEqual(beforeReload);
    expect(Object.values(restored!.snapshot().members)).toHaveLength(6);
    expect(
      Object.values(restored!.snapshot().members).every((member) => !member.activeActivityId),
    ).toBe(true);
  });
});
