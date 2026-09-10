import { describe, expect, it } from "vitest";
import { startExpeditionCommand } from "../../src/application/commands/start-expedition";
import { getActivitiesView } from "../../src/application/queries/get-activities-view";
import { getCombatReportsView } from "../../src/application/queries/get-combat-reports-view";
import { getLootView } from "../../src/application/queries/get-loot-view";
import { SettlementService } from "../../src/application/services/settlement-service";
import { browserContentModules, loadBrowserContentRegistry } from "../../src/content/manifest";
import type { ContentRegistry } from "../../src/content/registry";
import { loadContentRegistry } from "../../src/content/registry";
import type { ExpeditionActivity } from "../../src/domain/activity/activity";
import type { GameState } from "../../src/domain/game-state";
import { createNewGame } from "../../src/domain/guild/new-game";
import { asBrandedId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { FakeClock } from "../helpers/runtime-fakes";

const baseContent = loadBrowserContentRegistry();
const dungeonId = asBrandedId<"DungeonId">("ragefire_chasm");

function tenPlayerContent(): ContentRegistry {
  const modules = structuredClone(browserContentModules) as Record<string, unknown>;
  const key = Object.keys(modules).find((path) =>
    path.endsWith("/content/dungeons/ragefire-chasm.json"),
  );
  if (!key) throw new Error("Expected Ragefire Chasm dungeon content");
  const file = modules[key] as {
    dungeons: Array<{ members: { minimum: number; recommended: number; maximum: number } }>;
  };
  file.dungeons[0]!.members = { minimum: 5, recommended: 10, maximum: 10 };
  return loadContentRegistry(modules);
}

function newState(content: ContentRegistry): GameState {
  return createNewGame({
    slotId: asBrandedId<"SaveSlotId">("ten-player-expedition"),
    content,
    contentVersion: asBrandedId<"ContentVersion">("classic-2019-phase-6"),
    clock: new FakeClock(1_000),
    ids: new LocalIdGenerator(),
    random: new SeededRandomSource("ten-player-expedition"),
  });
}

function appendMemberClones(state: GameState, count: number): void {
  const originals = Object.values(state.members);
  for (let index = 0; index < count; index += 1) {
    const source = originals[index % originals.length]!;
    const id = asBrandedId<"MemberId">(`raid_member_${index + 6}`);
    state.members[id] = {
      ...structuredClone(source),
      id,
      identity: {
        ...structuredClone(source.identity),
        name: `${source.identity.name}·二队${index + 1}`,
      },
      equipment: {},
      activeActivityId: undefined,
    };
  }
}

describe("ten-player expedition support", () => {
  it("preserves all ten members through snapshots, settlement, reports, and loot eligibility", async () => {
    const content = tenPlayerContent();
    const state = newState(content);
    appendMemberClones(state, 5);
    for (const member of Object.values(state.members)) member.progression.level = 45;
    const participantIds = Object.values(state.members).map((member) => member.id);

    const activity = await startExpeditionCommand(
      { content, clock: new FakeClock(2_000) },
      { dungeonId, participantIds, requestedRuns: 1 },
    ).execute(state);

    expect(activity.participantIds).toEqual(participantIds);
    expect(activity.partySnapshot.members.map((member) => member.memberId)).toEqual(participantIds);
    expect(Object.keys(activity.runPlans[0]!.experienceFractionByMember)).toHaveLength(10);
    expect(
      participantIds.every((memberId) => state.members[memberId]!.activeActivityId === activity.id),
    ).toBe(true);

    const persisted = state.activities[activity.id] as ExpeditionActivity;
    for (const stage of persisted.runPlans[0]!.stages) stage.successRoll = 0;
    new SettlementService(content).settleDueActivities(state, Number.MAX_SAFE_INTEGER);

    expect(persisted.status).toBe("completed");
    expect(participantIds.every((memberId) => !state.members[memberId]!.activeActivityId)).toBe(
      true,
    );
    expect(
      persisted.runPlans[0]!.stages.every((stage) => stage.report?.members.length === 10),
    ).toBe(true);
    expect(getActivitiesView(state, content, Number.MAX_SAFE_INTEGER).history[0]).toMatchObject({
      participantCount: 10,
      memberNames: participantIds.map((memberId) => state.members[memberId]!.identity.name),
    });
    expect(getCombatReportsView(state, content).reports[0]!.members).toHaveLength(10);
    const loot = getLootView(state, content).pending;
    expect(loot.length).toBeGreaterThan(0);
    expect(loot.every((entry) => entry.candidates.length === 10)).toBe(true);
  });

  it("uses the content-defined maximum without changing five-player results", async () => {
    const content = tenPlayerContent();
    const state = newState(content);
    appendMemberClones(state, 6);
    const participantIds = Object.values(state.members).map((member) => member.id);

    expect(() =>
      startExpeditionCommand(
        { content, clock: new FakeClock(2_000) },
        { dungeonId, participantIds, requestedRuns: 1 },
      ).execute(state),
    ).toThrowError(
      expect.objectContaining({
        name: "StartExpeditionError",
        issues: expect.arrayContaining([expect.objectContaining({ code: "party.too-large" })]),
      }),
    );

    const fiveIds = participantIds.slice(0, 5);
    const baseState = structuredClone(state);
    const baseActivity = await startExpeditionCommand(
      { content: baseContent, clock: new FakeClock(3_000) },
      { dungeonId, participantIds: fiveIds, requestedRuns: 1 },
    ).execute(baseState);
    const genericActivity = await startExpeditionCommand(
      { content, clock: new FakeClock(3_000) },
      { dungeonId, participantIds: fiveIds, requestedRuns: 1 },
    ).execute(state);

    expect(genericActivity.partySnapshot.contribution).toEqual(
      baseActivity.partySnapshot.contribution,
    );
    expect(genericActivity.partySnapshot.clearProbability).toBe(
      baseActivity.partySnapshot.clearProbability,
    );
    expect(genericActivity.partySnapshot.durationSeconds).toBe(
      baseActivity.partySnapshot.durationSeconds,
    );
  });
});
