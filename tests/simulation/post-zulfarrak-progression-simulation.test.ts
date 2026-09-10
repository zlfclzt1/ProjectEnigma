import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { simulatePostZulfarrakProgression } from "../../scripts/post-zulfarrak-progression-simulation";
import baseline from "../fixtures/post-zulfarrak-progression-baseline.json";

describe("post-Zul'Farrak progression simulation", () => {
  it("keeps old dungeons useful but reports the real content cap", () => {
    const content = loadBrowserContentRegistry();
    const config = {
      seed: "post-zulfarrak-test",
      managementActionsPerDay: 4,
      maxDays: 30,
    } as const;
    const first = simulatePostZulfarrakProgression(content, config);
    const second = simulatePostZulfarrakProgression(content, config);

    expect(second).toEqual(first);
    expect(first.status).toBe("content-cap");
    expect(first.targetDungeonId).toBe("upper_blackrock_spire");
    expect(first.targetReached).toBe(false);
    expect(first.daysToTarget).toBeNull();
    expect(first.levelCap).toBe(60);
    expect(first.highestAvailableRecommendedLevel).toBe(49);
    expect(first.minimumCoreLevel).toBeGreaterThan(45);
    expect(first.maximumCoreLevel).toBeLessThan(60);
    expect(first.activitiesStarted).toBeGreaterThan(0);
    expect(first.attemptedDungeonRuns).toBeGreaterThan(0);
    expect(first.attemptedDungeonIds).toContain("zulfarrak");
    expect(first.attemptedDungeonIds).toContain("maraudon");
    expect(first.recruitedMemberCount).toBe(1);
    expect(first.boostedRunCount).toBe(1);
    expect(first.lootAssignments + first.lootSales).toBeGreaterThan(0);
    expect(first.unscheduledFundsDelta).toBe(0);
  });

  it("commits an independent schema v1 baseline for the 45+ boundary", () => {
    expect(baseline.schemaVersion).toBe(1);
    expect(baseline.startingState).toBe("zulfarrak-graduated-core-five-at-level-45");
    expect(baseline.target).toEqual({
      type: "dungeon-first-clear",
      dungeonId: "upper_blackrock_spire",
    });
    expect(baseline.highestAvailableRecommendedLevel).toBe(49);
    expect(baseline.policy.levelCap).toBe(60);
    expect(baseline.policy.oldContent).toBe("all-fifteen-dungeons-remain-repeatable");
    expect(baseline.policy.offlineIncome).toBe("none-outside-player-scheduled-activities");
    for (const scenario of baseline.scenarios) {
      expect(scenario.outcomes["content-cap"]).toBe(baseline.sampleCount);
      expect(scenario.outcomes["target-reached"]).toBe(0);
      expect(scenario.minimumCoreLevel.p50).toBe(57);
      expect(scenario.maximumCoreLevel.p90).toBeLessThan(60);
      expect(scenario.activitiesStarted.p50).toBeGreaterThan(0);
      expect(scenario.boostedRunCount.p50).toBe(1);
      expect(scenario.lootAssignments.p50 + scenario.lootSales.p50).toBeGreaterThan(0);
    }
  });
});
