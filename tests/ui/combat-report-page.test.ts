// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it } from "vitest";
import { loadOrCreateV2Client } from "../../src/app/client-bootstrap";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { useGameStore } from "../../src/stores/game-store";
import CombatReportPage from "../../src/ui/pages/CombatReportPage.vue";
import { FakeClock } from "../helpers/runtime-fakes";

describe("combat report page", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("renders persisted facts, member statistics, rewards, and playful logs", async () => {
    const game = useGameStore();
    const clock = new FakeClock(1_000);
    const saves = new MemorySaveRepository();
    const slotId = asBrandedId<"SaveSlotId">("combat-report-page");
    await game.initialize(() =>
      loadOrCreateV2Client({
        saves,
        content: loadBrowserContentRegistry(),
        clock,
        slotId,
        seed: "combat-report-page",
      }),
    );
    await game.execute({
      type: "prepare-combat-report-page-test",
      execute(draft) {
        for (const member of Object.values(draft.members)) member.progression.level = 45;
      },
    });
    await game.startExpedition(
      asBrandedId<"DungeonId">("ragefire_chasm"),
      game.members!.members.map((member) => member.id),
      1,
    );
    await game.execute({
      type: "guarantee-combat-report-page-test",
      execute(draft) {
        const activity = Object.values(draft.activities)[0]!;
        if (activity.type !== "expedition") throw new Error("Expected expedition");
        for (const stage of activity.runPlans[0]!.stages) stage.successRoll = 0;
      },
    });
    clock.set(24 * 60 * 60 * 1_000);
    await game.tick();
    const reportId = game.combatReports!.reports[0]!.id;

    setActivePinia(createPinia());
    const restored = useGameStore();
    await restored.initialize(() =>
      loadOrCreateV2Client({ saves, content: loadBrowserContentRegistry(), clock, slotId }),
    );
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/reports", component: CombatReportPage },
        { path: "/reports/:reportId", component: CombatReportPage },
      ],
    });
    await router.push(`/reports/${reportId}`);
    await router.isReady();
    const wrapper = mount(CombatReportPage, { global: { plugins: [router] } });

    expect(wrapper.findAll("aside nav a")).toHaveLength(4);
    expect(wrapper.findAll("tbody tr")).toHaveLength(5);
    expect(wrapper.findAll(".combat-events li").length).toBeGreaterThan(0);
    expect(wrapper.text()).toContain("战前胜率");
    expect(wrapper.text()).toMatch(/\d+\.\d{2}%/);
    expect(wrapper.text()).toContain("实际奖励");
    expect(wrapper.text()).toContain("classic-light-v1");
    expect(restored.combatReport(reportId)?.id).toBe(reportId);
  });
});
