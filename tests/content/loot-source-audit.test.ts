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
    expect(audit.rows).toHaveLength(82);
    expect(audit.lootTableCounts).toEqual({
      "boss-drop": 71,
      "quest-reward": 0,
      "world-drop": 0,
      "design-placeholder": 0,
    });
    expect(audit.encounterCounts["no-equipment"]).toBe(11);
    expect(audit.questRewards).toHaveLength(24);
    expect(audit.bossQuestRewardOverlap).toEqual([]);
    expect(
      audit.rows.filter((row) => row.category === "no-equipment").map((row) => row.encounterId),
    ).toEqual([
      "bfd_lorgus_jett",
      "bfd_baron_aquanis",
      "oggleflint",
      "bazzalan",
      "razorfen_kraul_roogug",
      "stockade_targorr_the_dread",
      "stockade_kam_deepfury",
      "stockade_hamhock",
      "stockade_bazil_thredd",
      "stockade_dextren_ward",
      "uldaman_obsidian_sentinel",
    ]);
    expect(audit.unusedLootTableIds).toEqual([]);

    const report = renderLootSourceAudit(audit);
    expect(report).toContain("无装备掉落 11");
    expect(report).toContain("成员副本任务：24，不同任务奖励装备：54");
    expect(report).toContain("奥格弗林特（oggleflint） | — | 无装备掉落");
    expect(report).toContain("毁灭之力（rfc_power_to_destroy）");
  });

  it("keeps member quest rewards out of every boss loot table", () => {
    const registry = loadBrowserContentRegistry();
    const questRewardIds = new Set(
      registry.quests.flatMap((quest) =>
        [...quest.rewards.fixedItemIds, ...quest.rewards.itemChoiceIds].map(String),
      ),
    );
    const bossDropIds = new Set(
      registry.lootTables
        .filter((table) => classifyLootSource(table) === "boss-drop")
        .flatMap((table) => table.items.map(({ itemId }) => String(itemId))),
    );

    expect([...questRewardIds].filter((itemId) => bossDropIds.has(itemId))).toEqual([]);
  });
});
