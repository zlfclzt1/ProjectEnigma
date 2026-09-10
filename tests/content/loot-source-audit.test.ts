import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";
import {
  auditLootSources,
  classifyLootSource,
  renderLootSourceAudit,
} from "../../scripts/loot-source-audit";

describe("loot source audit", () => {
  it("keeps legacy boss tables compatible", () => {
    const registry = loadBrowserContentRegistry();
    expect(
      classifyLootSource(registry.lootTableById.get(asBrandedId("taragaman_the_hungerer"))!),
    ).toBe("boss-drop");
  });

  it("reports explicit no-equipment encounters without inventing loot", () => {
    const audit = auditLootSources(loadBrowserContentRegistry());
    expect(audit.rows).toHaveLength(28);
    expect(audit.lootTableCounts).toEqual({
      "boss-drop": 26,
      "quest-reward": 0,
      "world-drop": 0,
      "design-placeholder": 0,
    });
    expect(audit.encounterCounts["no-equipment"]).toBe(2);
    expect(
      audit.rows.filter((row) => row.category === "no-equipment").map((row) => row.encounterId),
    ).toEqual(["oggleflint", "bazzalan"]);
    expect(audit.unusedLootTableIds).toEqual([]);

    const report = renderLootSourceAudit(audit);
    expect(report).toContain("无装备掉落 2");
    expect(report).toContain("奥格弗林特（oggleflint） | — | 无装备掉落");
  });
});
