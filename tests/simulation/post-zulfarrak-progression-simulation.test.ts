import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { simulatePostZulfarrakProgression } from "../../scripts/post-zulfarrak-progression-simulation";
import baseline from "../fixtures/post-zulfarrak-progression-baseline.json";

describe("post-Zul'Farrak progression simulation", () => {
  it("reaches the Upper Blackrock Spire content target deterministically", () => {
    const content = loadBrowserContentRegistry();
    const config = {
      seed: "post-zulfarrak-test",
      managementActionsPerDay: 4,
      maxDays: 30,
    } as const;
    const first = simulatePostZulfarrakProgression(content, config);
    const second = simulatePostZulfarrakProgression(content, config);

    expect(second).toEqual(first);
    expect(first.status).toBe("target-reached");
    expect(first.targetDungeonId).toBe("upper_blackrock_spire");
    expect(first.targetReached).toBe(true);
    expect(first.daysToTarget).not.toBeNull();
    expect(first.levelCap).toBe(60);
    expect(first.highestAvailableRecommendedLevel).toBe(60);
    expect(first.minimumCoreLevel).toBeGreaterThanOrEqual(45);
    expect(first.maximumCoreLevel).toBeLessThanOrEqual(60);
    expect(first.activitiesStarted).toBeGreaterThan(0);
    expect(first.attemptedDungeonRuns).toBeGreaterThan(0);
    expect(first.attemptedDungeonIds).toContain("zulfarrak");
    expect(first.attemptedDungeonIds).toContain("maraudon");
    expect(first.attemptedDungeonIds).toContain("sunken_temple");
    expect(first.attemptedDungeonIds).toContain("blackrock_depths_detention_block");
    expect(first.attemptedDungeonIds).toContain("blackrock_depths_shadowforge_city");
    expect(first.attemptedDungeonIds).toContain("dire_maul_east");
    expect(first.attemptedDungeonIds).toContain("dire_maul_west");
    expect(first.attemptedDungeonIds).toContain("dire_maul_north");
    expect(first.attemptedDungeonIds).toContain("scholomance");
    expect(first.attemptedDungeonIds).toContain("stratholme_live");
    expect(first.attemptedDungeonIds).toContain("stratholme_undead");
    expect(first.attemptedDungeonIds).toContain("lower_blackrock_spire");
    expect(first.attemptedDungeonIds).toContain("upper_blackrock_spire");
    expect(first.recruitedMemberCount).toBe(5);
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
    expect(baseline.highestAvailableRecommendedLevel).toBe(60);
    expect(baseline.policy.levelCap).toBe(60);
    expect(baseline.policy.oldContent).toBe("all-nineteen-current-dungeons-remain-repeatable");
    expect(baseline.policy.expectedStop).toBe(
      "target-reached-at-upper-blackrock-spire-stage-complete",
    );
    expect(baseline.policy.offlineIncome).toBe("none-outside-player-scheduled-activities");
    for (const scenario of baseline.scenarios) {
      expect(scenario.outcomes["target-reached"]).toBe(baseline.sampleCount);
      expect(scenario.outcomes["content-cap"]).toBe(0);
      expect(scenario.minimumCoreLevel.p50).toBeGreaterThanOrEqual(45);
      expect(scenario.maximumCoreLevel.p90).toBeLessThanOrEqual(60);
      expect(scenario.activitiesStarted.p50).toBeGreaterThan(0);
      expect(scenario.boostedRunCount.p50).toBe(1);
      expect(scenario.lootAssignments.p50 + scenario.lootSales.p50).toBeGreaterThan(0);
    }
  });
});
