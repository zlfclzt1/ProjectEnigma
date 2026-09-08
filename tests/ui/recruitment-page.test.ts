// @vitest-environment jsdom

import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { loadOrCreateV2Client } from "../../src/app/client-bootstrap";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { useGameStore } from "../../src/stores/game-store";
import RecruitmentPage from "../../src/ui/pages/RecruitmentPage.vue";
import { FakeClock } from "../helpers/runtime-fakes";

describe("recruitment page", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("shows exact candidate facts and executes paid refresh through the game store", async () => {
    const game = useGameStore();
    const clock = new FakeClock(1_000);
    await game.initialize(() =>
      loadOrCreateV2Client({
        saves: new MemorySaveRepository(),
        content: loadBrowserContentRegistry(),
        clock,
        slotId: asBrandedId<"SaveSlotId">("recruitment-page"),
        seed: "recruitment-page",
      }),
    );
    const wrapper = mount(RecruitmentPage);

    expect(wrapper.text()).toContain("职业、专精、定位和入会装等均为准确数据");
    expect(wrapper.findAll("article.candidate-card")).toHaveLength(3);
    expect(wrapper.text()).toContain("10.0");
    expect(wrapper.text()).toContain("30:00");

    await wrapper.find(".toolbar button").trigger("click");
    await flushPromises();
    expect(game.recruitment?.candidateCount).toBe(4);
    expect(game.recruitment?.funds).toBe(0);
    expect(wrapper.findAll("article.candidate-card")).toHaveLength(4);
  });
});
