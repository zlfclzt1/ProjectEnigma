// @vitest-environment jsdom

import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { loadOrCreateV2Client } from "../../src/app/client-bootstrap";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { useGameStore } from "../../src/stores/game-store";
import { useUiStore } from "../../src/stores/ui-store";
import DungeonsPage from "../../src/ui/pages/DungeonsPage.vue";
import { FakeClock } from "../helpers/runtime-fakes";

describe("dungeons page", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("switches all dungeons, filters the roster, previews exact odds, and starts repeated runs", async () => {
    const game = useGameStore();
    await game.initialize(() =>
      loadOrCreateV2Client({
        saves: new MemorySaveRepository(),
        content: loadBrowserContentRegistry(),
        clock: new FakeClock(1_000),
        slotId: asBrandedId<"SaveSlotId">("dungeons-page"),
        seed: "dungeons-page",
      }),
    );
    const wrapper = mount(DungeonsPage);
    await flushPromises();

    expect(wrapper.findAll(".dungeon-selector button")).toHaveLength(4);
    await wrapper.findAll(".dungeon-selector button")[1]!.trigger("click");
    expect(useUiStore().selectedDungeonId).not.toBeNull();
    await wrapper.findAll(".dungeon-selector button")[0]!.trigger("click");

    const target = game.dungeonPlanning(useUiStore().selectedDungeonId, [], 1)!.members[0]!;
    const filterSelects = wrapper.findAll(".party-builder .filter-bar select");
    await filterSelects[0]!.setValue(target.classId);
    await filterSelects[1]!.setValue(target.role);
    await filterSelects[2]!.setValue("role");
    const expectedFiltered = game
      .dungeonPlanning(useUiStore().selectedDungeonId, [], 1)!
      .members.filter(
        (member) => member.classId === target.classId && member.role === target.role,
      ).length;
    expect(wrapper.findAll(".member-options > label")).toHaveLength(expectedFiltered);
    expect(useUiStore().partyFilters.sortBy).toBe("role");

    await filterSelects[0]!.setValue("");
    await filterSelects[1]!.setValue("");
    for (const checkbox of wrapper.findAll('.member-options input[type="checkbox"]')) {
      await checkbox.setValue(true);
    }
    const runsSelect = wrapper.find(".page-heading select");
    await runsSelect.setValue("2");

    expect(useUiStore().requestedExpeditionRuns).toBe(2);
    expect(wrapper.text()).toContain("全通");
    expect(wrapper.text()).toMatch(/胜率 \d+\.\d{2}%/);
    expect(wrapper.findAll(".boss-route li")).toHaveLength(4);
    const startButton = wrapper.find(".party-preview > button");
    expect(startButton.attributes("disabled")).toBeUndefined();

    await startButton.trigger("click");
    await flushPromises();

    expect(game.activities?.active).toHaveLength(1);
    expect(game.activities?.active[0]?.requestedRuns).toBe(2);
    expect(useUiStore().selectedPartyMemberIds).toEqual([]);
    expect(wrapper.text()).toContain("可以继续组织另一支队伍");
    expect(wrapper.findAll('.member-options input[type="checkbox"][disabled]')).toHaveLength(5);
  });
});
