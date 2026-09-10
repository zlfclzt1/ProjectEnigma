// @vitest-environment jsdom

import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { loadOrCreateV2Client } from "../../src/app/client-bootstrap";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { useGameStore } from "../../src/stores/game-store";
import OverviewPage from "../../src/ui/pages/OverviewPage.vue";
import { FakeClock } from "../helpers/runtime-fakes";

describe("overview page guild expansion", () => {
  beforeEach(() => setActivePinia(createPinia()));

  async function initializeGame() {
    const game = useGameStore();
    await game.initialize(() =>
      loadOrCreateV2Client({
        saves: new MemorySaveRepository(),
        content: loadBrowserContentRegistry(),
        clock: new FakeClock(1_000),
        slotId: asBrandedId<"SaveSlotId">("overview-upgrade-page"),
        seed: "overview-upgrade-page",
      }),
    );
    return game;
  }

  it("shows the next locked expansion and exact missing conditions", async () => {
    await initializeGame();
    const wrapper = mount(OverviewPage);

    await wrapper.find(".member-capacity-card").trigger("click");

    expect(wrapper.get('[role="dialog"]').text()).toContain("第一次公会扩建");
    expect(wrapper.get('[role="dialog"]').text()).not.toContain("第二次公会扩建");
    expect(wrapper.get('[role="dialog"]').text()).toContain("死亡矿井完整通关");
    expect(wrapper.get('[role="dialog"]').text()).toContain("公会资金还缺 400 G");
    expect(wrapper.get(".purchase-button").attributes("disabled")).toBeDefined();
  });

  it("highlights an available expansion and refreshes to the next strict step after purchase", async () => {
    const game = await initializeGame();
    await game.execute({
      type: "prepare-guild-upgrade-ui-test",
      execute(draft) {
        draft.guild.funds = 2_000;
        draft.history.dungeonClearCounts[asBrandedId<"DungeonId">("deadmines")] = 1;
      },
    });
    const wrapper = mount(OverviewPage);

    expect(wrapper.find(".member-capacity-card").classes()).toContain("purchasable");
    expect(wrapper.text()).toContain("可扩建");
    await wrapper.find(".member-capacity-card").trigger("click");
    await wrapper.get(".purchase-button").trigger("click");
    await flushPromises();

    expect(game.overview?.memberCapacity).toBe(15);
    expect(game.snapshot?.guild.funds).toBe(1_500);
    expect(wrapper.get('[role="dialog"]').text()).toContain("第二次公会扩建");
    expect(wrapper.get('[role="dialog"]').text()).toContain("15 → 20 人");
    expect(wrapper.get(".purchase-button").attributes("disabled")).toBeDefined();
  });

  it("shows the current-version maximum after both expansions are owned", async () => {
    const game = await initializeGame();
    await game.execute({
      type: "prepare-maximum-guild-capacity-ui-test",
      execute(draft) {
        draft.guild.purchasedUpgradeIds = [
          asBrandedId<"GuildUpgradeId">("guild_roster_15"),
          asBrandedId<"GuildUpgradeId">("guild_roster_20"),
        ];
      },
    });
    const wrapper = mount(OverviewPage);

    await wrapper.find(".member-capacity-card").trigger("click");

    expect(wrapper.get('[role="dialog"]').text()).toContain("当前版本已达最大容量：20 人");
    expect(wrapper.find(".purchase-button").exists()).toBe(false);
  });
});
