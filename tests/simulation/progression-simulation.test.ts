import { describe, expect, it } from "vitest";
import baseline from "../fixtures/progression-baseline.json";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { simulateProgression } from "../../scripts/progression-simulation";

describe("progression simulation", () => {
  it("is deterministic and stops at the current four-dungeon content cap", () => {
    const config = {
      seed: "progression-test",
      managementActionsPerDay: 4,
      maxDays: 30,
    } as const;
    const first = simulateProgression(loadBrowserContentRegistry(), config);
    const second = simulateProgression(loadBrowserContentRegistry(), config);

    expect(second).toEqual(first);
    expect(first.status).toBe("content-cap");
    expect(first.daysToTarget).toBeNull();
    expect(first.minimumCoreLevel).toBeLessThan(45);
    expect(first.attemptedDungeonRuns).toBeGreaterThan(0);
    expect(Object.keys(first.dungeonAttempts)).toEqual(
      expect.arrayContaining(["deadmines", "ragefire_chasm", "shadowfang_keep", "wailing_caverns"]),
    );
  });

  it("keeps 4, 5, and 6 daily-management scenarios in the committed baseline", () => {
    expect(baseline.schemaVersion).toBe(1);
    expect(baseline.targetLevel).toBe(45);
    expect(baseline.requestedRuns).toBe(3);
    expect(baseline.policy.offlineIncome).toBe("none-outside-player-scheduled-activities");
    expect(baseline.scenarios.map((scenario) => scenario.managementActionsPerDay)).toEqual([
      4, 5, 6,
    ]);
    for (const scenario of baseline.scenarios) {
      expect(scenario.outcomes["target-reached"]).toBe(0);
      expect(scenario.outcomes["content-cap"]).toBe(baseline.sampleCount);
      expect(scenario.daysToTarget).toBeNull();
      expect(scenario.minimumCoreLevel.p50).toBeLessThan(45);
    }
  });
});
