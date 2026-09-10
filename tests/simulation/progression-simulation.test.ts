import { describe, expect, it } from "vitest";
import baseline from "../fixtures/progression-baseline.json";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { simulateProgression } from "../../scripts/progression-simulation";

describe("progression simulation", () => {
  it("is deterministic and reaches the Zul'Farrak first-clear milestone", () => {
    const config = {
      seed: "progression-test",
      managementActionsPerDay: 4,
      maxDays: 30,
    } as const;
    const first = simulateProgression(loadBrowserContentRegistry(), config);
    const second = simulateProgression(loadBrowserContentRegistry(), config);

    expect(second).toEqual(first);
    expect(first.status).toBe("target-reached");
    expect(first.daysToTarget).not.toBeNull();
    expect(first.targetDungeonId).toBe("zulfarrak");
    expect(first.minimumCoreLevel).toBeGreaterThanOrEqual(45);
    expect(first.minimumCoreLevel).toBeLessThanOrEqual(60);
    expect(first.minimumRosterLevel).toBeLessThan(45);
    expect(first.maximumRunsUsed).toBe(5);
    expect(first.queueUpgradePurchased).toBe(true);
    expect(first.recruitedMemberCount).toBe(1);
    expect(first.boostedRunCount).toBe(1);
    expect(first.questClaims).toBeGreaterThan(0);
    expect(first.optionalRouteActivities).toBeGreaterThan(0);
    expect(first.rareEncounterRuns).toBeGreaterThan(0);
    expect(first.autoLootActions).toBeGreaterThan(0);
    expect(first.manualLootActions).toBeGreaterThan(0);
    expect(first.attemptedDungeonRuns).toBeGreaterThan(0);
    expect(Object.keys(first.dungeonAttempts)).toEqual(
      expect.arrayContaining(["deadmines", "ragefire_chasm", "shadowfang_keep", "zulfarrak"]),
    );
  });

  it("keeps low-frequency and 4/5/6-action stage scenarios in the committed baseline", () => {
    expect(baseline.schemaVersion).toBe(2);
    expect(baseline.target).toEqual({ type: "dungeon-first-clear", dungeonId: "zulfarrak" });
    expect(baseline.requestedRuns).toBe("3-to-5");
    expect(baseline.policy.offlineIncome).toBe("none-outside-player-scheduled-activities");
    expect(baseline.scenarios.map((scenario) => scenario.managementActionsPerDay)).toEqual([
      3, 4, 5, 6,
    ]);
    for (const scenario of baseline.scenarios) {
      expect(scenario.outcomes["target-reached"]).toBe(baseline.sampleCount);
      expect(scenario.outcomes["content-cap"]).toBe(0);
      expect(scenario.daysToTarget).not.toBeNull();
      expect(scenario.maximumRunsUsed.p50).toBe(5);
      expect(scenario.recruitedMemberCount.p50).toBe(1);
      expect(scenario.boostedRunCount.p50).toBe(1);
      expect(scenario.questClaims.p50).toBeGreaterThan(0);
      expect(scenario.optionalRouteActivities.p50).toBeGreaterThan(0);
      expect(scenario.rareEncounterRuns.p50).toBeGreaterThan(0);
      expect(scenario.minimumRosterLevel.p50).toBeLessThan(45);
      expect(scenario.autoLootActions.p50).toBeGreaterThan(0);
      expect(scenario.manualLootActions.p50).toBeGreaterThan(0);
    }
    expect(baseline.scenarios[0]!.daysToTarget!.p50).toBeGreaterThanOrEqual(10);
    expect(baseline.scenarios[0]!.daysToTarget!.p90).toBeLessThanOrEqual(14);
    for (const scenario of baseline.scenarios.slice(1)) {
      expect(scenario.daysToTarget!.p50).toBeGreaterThanOrEqual(5);
      expect(scenario.daysToTarget!.p50).toBeLessThanOrEqual(8);
    }
  });
});
