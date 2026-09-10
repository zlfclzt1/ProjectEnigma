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

describe("quests page", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("lists member quests and accepts a task", async () => {
    const game = useGameStore();
    await game.initialize(() =>
      loadOrCreateV2Client({
        saves: new MemorySaveRepository(),
        content: loadBrowserContentRegistry(),
        clock: new FakeClock(1_000),
        slotId: asBrandedId<"SaveSlotId">("quests-page"),
        seed: "quests-page",
      }),
    );
    const wrapper = mount(QuestsPage);
    await flushPromises();

    expect(wrapper.text()).toContain("归还背包");
    expect(wrapper.text()).toContain("羽珠护腕 / 草原狮护腕");
    await wrapper.get(".quest-card button").trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("已接取");
    expect(
      game
        .memberDungeonQuests(game.members!.members[0]!.id)
        ?.quests.find((quest) => quest.id === "rfc_returning_lost_satchel")?.status,
    ).toBe("accepted");
  });
});
