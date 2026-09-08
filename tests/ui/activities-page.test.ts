// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { loadOrCreateV2Client } from "../../src/app/client-bootstrap";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { useGameStore } from "../../src/stores/game-store";
import ActivitiesPage from "../../src/ui/pages/ActivitiesPage.vue";
import { FakeClock } from "../helpers/runtime-fakes";

describe("activities page", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("shows multiple independent parties and their route progress", async () => {
    const game = useGameStore();
    await game.initialize(() =>
      loadOrCreateV2Client({
        saves: new MemorySaveRepository(),
        content: loadBrowserContentRegistry(),
        clock: new FakeClock(1_000),
        slotId: asBrandedId<"SaveSlotId">("activities-page"),
        seed: "activities-page",
      }),
    );
    const [first, second] = game.members!.members;
    const dungeonId = asBrandedId<"DungeonId">("ragefire_chasm");
    await game.startExpedition(dungeonId, [first!.id], 1);
    await game.startExpedition(dungeonId, [second!.id], 1);

    const wrapper = mount(ActivitiesPage);

    expect(wrapper.findAll(".expedition-card")).toHaveLength(2);
    expect(wrapper.text()).toContain("2 支队伍进行中");
    expect(wrapper.findAll(".boss-route")).toHaveLength(2);
    expect(wrapper.findAll(".boss-route li.active")).toHaveLength(2);
    expect(wrapper.text()).toMatch(/全通率 \d+\.\d{2}%/);
    expect(wrapper.text()).toContain("classic-light-v1");
  });
});
