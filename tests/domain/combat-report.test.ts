import { describe, expect, it } from "vitest";
import { startExpeditionCommand } from "../../src/application/commands/start-expedition";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import type { ExpeditionActivity } from "../../src/domain/activity/activity";
import { generateCombatReport } from "../../src/domain/combat/report-generator";
import { createNewGame } from "../../src/domain/guild/new-game";
import { asBrandedId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { FakeClock } from "../helpers/runtime-fakes";

const content = loadBrowserContentRegistry();

async function activityFixture(): Promise<ExpeditionActivity> {
  const state = createNewGame({
    slotId: asBrandedId<"SaveSlotId">("report_slot"),
    content,
    contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
    clock: new FakeClock(1_000),
    ids: new LocalIdGenerator(),
    random: new SeededRandomSource("report-fixture"),
  });
  const activity = await startExpeditionCommand(
    { content, clock: new FakeClock(2_000) },
    {
      dungeonId: asBrandedId<"DungeonId">("ragefire_chasm"),
      participantIds: Object.values(state.members).map((member) => member.id),
      requestedRuns: 1,
    },
  ).execute(state);
  return activity;
}

describe("deterministic structured combat reports", () => {
  it("keeps member sums consistent with team totals and victory health", async () => {
    const activity = await activityFixture();
    const stage = activity.runPlans[0]!.stages[0]!;
    const encounter = content.encounterById.get(stage.encounterId)!;
    const request = {
      activity,
      stage,
      encounter,
      runNumber: 1,
      outcome: "victory" as const,
      settledAt: activity.nextSettlementAt,
      rewards: {
        experienceFractionByMember: {},
        funds: encounter.funds,
        firstKillBonus: encounter.firstKillBonus,
        itemInstanceIds: [],
      },
    };

    const report = generateCombatReport(request);

    expect(generateCombatReport(request)).toEqual(report);
    expect(report.formulaVersion).toBe("classic-light-v1");
    expect(report.startedProbability).toBe(stage.probability);
    expect(report.actualDurationSeconds).toBe(stage.durationSeconds);
    expect(report.totals.damage).toBe(report.parameters.equivalentHealth);
    expect(report.members.reduce((sum, member) => sum + member.damage, 0)).toBe(
      report.totals.damage,
    );
    expect(report.members.reduce((sum, member) => sum + member.healing, 0)).toBe(
      report.totals.healing,
    );
    expect(report.members.reduce((sum, member) => sum + member.damageTaken, 0)).toBe(
      report.totals.damageTaken,
    );
    expect(report.members.every((member) => !member.defeated)).toBe(true);
    expect(report.events[0]).toEqual({ type: "encounter-outcome", outcome: "victory" });
  });

  it("produces deterministic defeat progress, casualties, and no invented rewards", async () => {
    const activity = await activityFixture();
    const stage = activity.runPlans[0]!.stages[0]!;
    const encounter = content.encounterById.get(stage.encounterId)!;
    const report = generateCombatReport({
      activity,
      stage,
      encounter,
      runNumber: 1,
      outcome: "defeat",
      settledAt: activity.nextSettlementAt,
      rewards: {
        experienceFractionByMember: {},
        funds: 0,
        firstKillBonus: 0,
        itemInstanceIds: [],
      },
    });

    expect(report.totals.damage).toBeLessThan(report.parameters.equivalentHealth);
    expect(report.members.some((member) => member.defeated)).toBe(true);
    expect(report.events.some((event) => event.type === "member-defeated")).toBe(true);
    expect(report.rewards).toEqual({
      experienceFractionByMember: {},
      funds: 0,
      firstKillBonus: 0,
      itemInstanceIds: [],
    });
  });
});
