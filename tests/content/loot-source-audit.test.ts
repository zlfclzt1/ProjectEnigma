import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";
import {
  auditLootSources,
  classifyLootSource,
  renderLootSourceAudit,
} from "../../scripts/loot-source-audit";

describe("loot source audit", () => {
  it("classifies explicit source types and keeps legacy boss tables compatible", () => {
    const registry = loadBrowserContentRegistry();
    expect(
      classifyLootSource(registry.lootTableById.get(asBrandedId("taragaman_the_hungerer"))!),
    ).toBe("boss-drop");
    expect(
      classifyLootSource(
        registry.lootTableById.get(asBrandedId("ragefire_chasm_common_equipment"))!,
      ),
    ).toBe("quest-reward");
  });

  it("reports the current quest rewards assigned to two ragefire encounters", () => {
    const audit = auditLootSources(loadBrowserContentRegistry());
    expect(audit.rows).toHaveLength(27);
    expect(audit.lootTableCounts).toEqual({
      "boss-drop": 25,
      "quest-reward": 1,
      "world-drop": 0,
      "design-placeholder": 0,
    });
    expect(audit.encounterCounts["quest-reward"]).toBe(2);
    expect(audit.distinctItemCounts["quest-reward"]).toBe(5);
    expect(
      audit.rows.filter((row) => row.category === "quest-reward").map((row) => row.encounterId),
    ).toEqual(["oggleflint", "bazzalan"]);
    expect(audit.unusedLootTableIds).toEqual([]);

    const report = renderLootSourceAudit(audit);
    expect(report).toContain("15452 羽珠护腕");
    expect(report).toContain("任务系统完成后，应移除这些掉落引用");
  });
});
