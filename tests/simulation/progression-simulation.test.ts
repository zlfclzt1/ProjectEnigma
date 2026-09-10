import { describe, expect, it } from "vitest";
import baseline from "../fixtures/progression-baseline.json";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { simulateProgression } from "../../scripts/progression-simulation";

describe("progression simulation", () => {
  it("is deterministic and reaches level 45 with the current content", () => {
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
    expect(first.minimumCoreLevel).toBe(45);
    expect(first.attemptedDungeonRuns).toBeGreaterThan(0);
    expect(Object.keys(first.dungeonAttempts)).toEqual(
      expect.arrayContaining(["deadmines", "ragefire_chasm", "shadowfang_keep"]),
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
      expect(scenario.outcomes["target-reached"]).toBe(baseline.sampleCount);
      expect(scenario.outcomes["content-cap"]).toBe(0);
      expect(scenario.daysToTarget).not.toBeNull();
      expect(scenario.minimumCoreLevel.p50).toBe(45);
    }
    expect(baseline.scenarios[0]!.daysToTarget!.p50).toBe(8);
    expect(baseline.scenarios[1]!.daysToTarget!.p50).toBe(6);
    expect(baseline.scenarios[2]!.daysToTarget!.p50).toBe(6);
  });
});
