// @vitest-environment jsdom
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { loadOrCreateV2Client } from "../../src/app/client-bootstrap";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { FakeClock } from "../helpers/runtime-fakes";
import { useGameStore } from "../../src/stores/game-store";
import QuestsPage from "../../src/ui/pages/QuestsPage.vue";

describe("dungeon development archive", () => {
  beforeEach(() => setActivePinia(createPinia()));

  async function setup(seed: string) {
    const game = useGameStore();
    await game.initialize(() =>
      loadOrCreateV2Client({
        saves: new MemorySaveRepository(),
        content: loadBrowserContentRegistry(),
        clock: new FakeClock(1_000),
        slotId: asBrandedId<"SaveSlotId">(seed),
        seed,
      }),
    );
    return game;
  }

  it("shows fuzzy clues without task-management controls", async () => {
    await setup("development-archive-clues");
    const wrapper = mount(QuestsPage);
    await flushPromises();

    expect(wrapper.text()).toContain("副本开发档案");
    expect(wrapper.text()).toContain("未查明的远征线索");
    expect(wrapper.text()).not.toContain("归还背包");
    expect(wrapper.text()).not.toContain("接取");
    expect(wrapper.text()).not.toContain("领取奖励");
    expect(wrapper.find(".approve-button").exists()).toBe(false);
  });

  it("reveals completed commissions, permanent bonuses, and Boss drop assignments", async () => {
    const game = await setup("development-archive-complete");
    await game.execute({
      type: "prepare-development-archive",
      execute(draft) {
        const satchelId = asBrandedId<"QuestId">("rfc_returning_lost_satchel");
        const powerId = asBrandedId<"QuestId">("rfc_power_to_destroy");
        draft.dungeonDevelopment.entries[satchelId] = {
          questId: satchelId,
          status: "completed",
          discoveredAt: 1_500,
          completedAt: 2_000,
          completionEncounterId: asBrandedId<"EncounterId">("oggleflint"),
          encounterVictoryIds: [asBrandedId<"EncounterId">("oggleflint")],
        };
        draft.dungeonDevelopment.entries[powerId] = {
          questId: powerId,
          status: "completed",
          discoveredAt: 1_500,
          completedAt: 2_500,
          completionEncounterId: asBrandedId<"EncounterId">("bazzalan"),
          encounterVictoryIds: [],
        };
      },
    });
    const wrapper = mount(QuestsPage);
    await flushPromises();

    expect(wrapper.text()).toContain("归还背包");
    expect(wrapper.text()).toContain("毁灭之力");
    expect(wrapper.text()).toContain("开发 5 级");
    expect(wrapper.text()).toContain("+20%");
    expect(wrapper.text()).toContain("+15%");
    const details = wrapper.findAll(".commission details")[0]!;
    await details.find("summary").trigger("click");
    expect(details.text()).toContain("奥格弗林特");
    expect(details.text()).toContain("羽珠护腕");
  });
});
