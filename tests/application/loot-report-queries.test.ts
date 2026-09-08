import { describe, expect, it } from "vitest";
import { startExpeditionCommand } from "../../src/application/commands/start-expedition";
import { getCombatReportsView } from "../../src/application/queries/get-combat-reports-view";
import { getLootView } from "../../src/application/queries/get-loot-view";
import { settleDueActivitiesCommand } from "../../src/application/services/settlement-service";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { createNewGame } from "../../src/domain/guild/new-game";
import { asBrandedId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { FakeClock } from "../helpers/runtime-fakes";

const content = loadBrowserContentRegistry();

async function setup() {
  const clock = new FakeClock(1_000);
  const state = createNewGame({
    slotId: asBrandedId<"SaveSlotId">("loot-report-query"),
    content,
    contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
    clock,
    ids: new LocalIdGenerator(),
    random: new SeededRandomSource("loot-report-query"),
  });
  for (const member of Object.values(state.members)) member.progression.level = 45;
  const memberIds = Object.values(state.members).map((member) => member.id);
  const activity = await startExpeditionCommand(
    { content, clock },
    {
      dungeonId: asBrandedId<"DungeonId">("ragefire_chasm"),
      participantIds: memberIds,
      requestedRuns: 2,
    },
  ).execute(state);
  for (const run of activity.runPlans) for (const stage of run.stages) stage.successRoll = 0;
  return { clock, state, activity, memberIds };
}

describe("loot and combat report queries", () => {
  it("locks mid-run loot and unlocks it with participant-only upgrade comparisons", async () => {
    const { clock, state, activity, memberIds } = await setup();
    clock.set(activity.nextSettlementAt);
    await settleDueActivitiesCommand({ content, clock }).execute(state);

    const locked = getLootView(state, content);
    expect(locked.pending).toHaveLength(1);
    expect(locked.lockedCount).toBe(1);
    expect(locked.pending[0]?.candidates.map((candidate) => candidate.memberId)).toEqual(
      expect.arrayContaining(memberIds),
    );
    expect(locked.pending[0]?.item.iconUrl).toContain("wow.zamimg.com");

    clock.set(24 * 60 * 60 * 1_000);
    await settleDueActivitiesCommand({ content, clock }).execute(state);
    const unlocked = getLootView(state, content);

    expect(unlocked.pending).toHaveLength(8);
    expect(unlocked.lockedCount).toBe(0);
    expect(unlocked.pending.every((entry) => entry.candidates.length === memberIds.length)).toBe(
      true,
    );
    expect(
      unlocked.pending.some((entry) =>
        entry.candidates.some(
          (candidate) => candidate.equippable && typeof candidate.primaryDelta === "number",
        ),
      ),
    ).toBe(true);
  });

  it("rebuilds factual reports and playful logs from settled activity data", async () => {
    const { clock, state } = await setup();
    clock.set(24 * 60 * 60 * 1_000);
    await settleDueActivitiesCommand({ content, clock }).execute(state);

    const reports = getCombatReportsView(state, content).reports;

    expect(reports).toHaveLength(8);
    expect(reports[0]).toMatchObject({
      dungeonName: "怒焰裂谷",
      outcome: "victory",
      outcomeLabel: "胜利",
      formulaVersion: "classic-light-v1",
    });
    expect(reports[0]!.members).toHaveLength(5);
    expect(reports[0]!.logs.length).toBeGreaterThan(0);
    expect(reports[0]!.totals.damage).toBeGreaterThan(0);
    expect(reports[0]!.rewards.itemNames).toHaveLength(1);
  });
});
