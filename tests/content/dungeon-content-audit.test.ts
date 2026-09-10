import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import {
  auditDungeonContent,
  renderDungeonContentAudit,
} from "../../scripts/dungeon-content-audit";

describe("dungeon content audit", () => {
  it("lists every route node and preserves optional/rare semantics", () => {
    const audit = auditDungeonContent(loadBrowserContentRegistry());
    expect(audit.routes).toHaveLength(36);
    expect(audit.routes.filter((row) => row.nodeType === "optional")).toHaveLength(2);
    expect(audit.routes.filter((row) => row.nodeType === "rare")).toHaveLength(0);
    expect(
      audit.routes.some(
        (row) => row.encounterId === "oggleflint" && row.guaranteedEquipmentDrops === 0,
      ),
    ).toBe(true);
  });

  it("finds no orphan loot tables or quest reward overlap", () => {
    const audit = auditDungeonContent(loadBrowserContentRegistry());
    expect(audit.unusedLootTableIds).toEqual([]);
    expect(audit.questRewardBossOverlap).toEqual([]);
    expect(renderDungeonContentAudit(audit)).toContain("任务奖励与 Boss 掉落重复：0");
  });
});
