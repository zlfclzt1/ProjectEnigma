// @vitest-environment jsdom

import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { loadOrCreateV2Client } from "../../src/app/client-bootstrap";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { recordAcquiredItem } from "../../src/domain/collection/item-collection";
import { createNewGame } from "../../src/domain/guild/new-game";
import { asBrandedId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { useGameStore } from "../../src/stores/game-store";
import ItemCatalogPage from "../../src/ui/pages/ItemCatalogPage.vue";
import { createItemInstanceFixture } from "../helpers/game-state-v2-factory";
import { FakeClock } from "../helpers/runtime-fakes";

const content = loadBrowserContentRegistry();

describe("item catalog page", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("filters unlocked loot, expands details, and shows set and reward progress", async () => {
    const clock = new FakeClock(1_000);
    const state = createNewGame({
      slotId: asBrandedId<"SaveSlotId">("item-catalog-page"),
      content,
      contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
      clock,
      ids: new LocalIdGenerator(),
      random: new SeededRandomSource("item-catalog-page"),
    });
    state.guild.unlockedDungeonIds.push(asBrandedId<"DungeonId">("wailing_caverns"));
    for (const [index, itemId] of ["10412", "6460"].entries()) {
      const instance = createItemInstanceFixture({
        id: asBrandedId<"ItemInstanceId">(`catalog_ui_${index}`),
        definitionId: asBrandedId<"ItemDefinitionId">(itemId),
        ownerMemberId: undefined,
        bound: false,
      });
      state.itemInstances[instance.id] = instance;
      recordAcquiredItem(state.collection, instance, content);
    }

    const game = useGameStore();
    await game.initialize(() =>
      loadOrCreateV2Client({
        saves: new MemorySaveRepository([state]),
        content,
        clock,
        slotId: state.slotId,
      }),
    );
    const wrapper = mount(ItemCatalogPage);
    await flushPromises();

    expect(wrapper.text()).toContain("装备图鉴");
    expect(wrapper.findAll(".dungeon-catalog")).toHaveLength(15);
    expect(wrapper.text()).not.toContain("狼王斗篷");
    expect(wrapper.text()).toContain("哀嚎洞穴收藏原型");
    expect(wrapper.text()).toContain("2 / 2 · 100.0%");
    const setSelect = wrapper.findAll(".catalog-filters select")[2]!;
    expect(setSelect.attributes("disabled")).toBeDefined();

    const dungeonSelect = wrapper.findAll(".catalog-filters select")[0]!;
    await dungeonSelect.setValue("wailing_caverns");
    expect(wrapper.findAll(".dungeon-catalog")).toHaveLength(1);
    expect(wrapper.findAll(".catalog-item")).toHaveLength(21);

    const acquiredSelect = wrapper.findAll(".catalog-filters select")[6]!;
    await acquiredSelect.setValue("acquired");
    expect(wrapper.findAll(".catalog-item")).toHaveLength(2);
    expect(wrapper.text()).toContain("当前筛选显示 2 条 Boss 掉落");

    const firstItem = wrapper.find(".catalog-item");
    expect(firstItem.find(".catalog-tooltip").exists()).toBe(false);
    await firstItem.find(".item-summary").trigger("click");
    expect(firstItem.find(".catalog-tooltip").exists()).toBe(true);
    expect(firstItem.text()).toContain("属性：Wowhead Classic");

    await acquiredSelect.setValue("all");
    const managementReward = wrapper
      .findAll(".reward-card")
      .find((card) => card.text().includes("成套归档"))!;
    await managementReward.find(".claim-reward").trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("收藏奖励已领取");
    expect(managementReward.text()).toContain("奖励效果已生效");
    expect(setSelect.attributes("disabled")).toBeUndefined();
    await setSelect.setValue("prototype_wailing_caverns_collection");
    expect(wrapper.findAll(".catalog-item")).toHaveLength(2);
    expect(game.snapshot?.collection.claimedRewardIds).toContain(
      "prototype_wailing_collection_set",
    );
  });
});
