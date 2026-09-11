// @vitest-environment jsdom

import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { loadOrCreateV2Client } from "../../src/app/client-bootstrap";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { useGameStore } from "../../src/stores/game-store";
import LootPage from "../../src/ui/pages/LootPage.vue";
import { FakeClock } from "../helpers/runtime-fakes";

describe("loot page", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("groups loot by encounter and applies assignment or sale immediately after confirmation", async () => {
    const game = useGameStore();
    const clock = new FakeClock(1_000);
    await game.initialize(() =>
      loadOrCreateV2Client({
        saves: new MemorySaveRepository(),
        content: loadBrowserContentRegistry(),
        clock,
        slotId: asBrandedId<"SaveSlotId">("loot-page"),
        seed: "loot-page",
      }),
    );
    await game.execute({
      type: "prepare-loot-page-test",
      execute(draft) {
        for (const member of Object.values(draft.members)) member.progression.level = 45;
      },
    });
    const memberIds = game.members!.members.map((member) => member.id);
    await game.startExpedition(asBrandedId<"DungeonId">("ragefire_chasm"), memberIds, 1);
    await game.execute({
      type: "guarantee-loot-page-test",
      execute(draft) {
        const activity = Object.values(draft.activities)[0]!;
        if (activity.type !== "expedition") throw new Error("Expected expedition");
        for (const stage of activity.runPlans[0]!.stages) stage.successRoll = 0;
      },
    });
    clock.set(24 * 60 * 60 * 1_000);
    await game.tick();
    await game.execute({
      type: "ensure-equippable-loot-page-test",
      execute(draft) {
        const pending = Object.values(draft.pendingLoot)[0]!;
        const member = draft.members[pending.eligibleMemberIds[0]!]!;
        const currentMainHand = draft.itemInstances[member.equipment.mainHand!]!;
        draft.itemInstances[pending.itemInstanceId]!.definitionId = currentMainHand.definitionId;
      },
    });

    const wrapper = mount(LootPage);
    expect(wrapper.findAll(".queue-entry")).toHaveLength(4);
    expect(wrapper.text()).toContain("活动掉落");
    expect(wrapper.text()).toContain("掉落自");
    const queueNames = wrapper.findAll(".queue-entry").map((entry) => entry.text());
    const assignEntry = wrapper
      .findAll(".queue-entry")
      .find((entry) => !entry.text().includes("出售"))!;
    await assignEntry.trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("主职责提升");
    expect(wrapper.findAll(".candidate-row").length).toBeGreaterThan(0);
    expect(wrapper.findAll(".upgrade-comparison")).toHaveLength(4);

    const candidate = wrapper.findAll(".candidate-row")[0]!;
    const candidateName = candidate.find("strong").text();
    await candidate.trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("确认立即分配");
    await wrapper
      .findAll(".modal button")
      .find((button) => !button.classes("secondary"))!
      .trigger("click");
    await flushPromises();
    expect(game.loot?.pending).toHaveLength(3);
    expect(wrapper.text()).toContain(`${candidateName} 获得了`);
    expect(wrapper.find(".queue-entry.selected").text()).toContain(queueNames[2]!);

    await wrapper.find(".sell-button").trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("确认出售装备");
    await wrapper
      .findAll(".modal button")
      .find((button) => !button.classes("secondary"))!
      .trigger("click");
    await flushPromises();
    expect(game.loot?.pending).toHaveLength(2);
  });
});
