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

  it("manually assigns to a participant and automatically resolves the remaining loot", async () => {
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
    const firstCard = wrapper.findAll(".loot-card")[0]!;
    expect(wrapper.findAll(".loot-card")).toHaveLength(4);
    for (const [index, loot] of game.loot!.pending.entries()) {
      expect(wrapper.findAll(".loot-card")[index]!.find(".item-icon").classes()).toContain(
        `quality-${loot.item.quality}`,
      );
    }
    expect(firstCard.findAll("select option")).toHaveLength(5);
    expect(firstCard.text()).toContain("仅本次参战成员");
    expect(firstCard.text()).toContain("主职责");
    expect(firstCard.findAll(".upgrade-comparison")).toHaveLength(4);

    await firstCard.find("footer button").trigger("click");
    await flushPromises();
    expect(game.loot?.pending).toHaveLength(3);
    expect(wrapper.text()).toContain("立即穿上");

    await wrapper.find(".page-heading button").trigger("click");
    await flushPromises();
    expect(game.loot?.pending).toHaveLength(0);
    expect(wrapper.text()).toContain("自动分配完成");
  });
});
