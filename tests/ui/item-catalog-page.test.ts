// @vitest-environment jsdom

import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { loadOrCreateV2Client } from "../../src/app/client-bootstrap";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { browserContentModules } from "../../src/content/manifest";
import { loadContentRegistry } from "../../src/content/registry";
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

function contentWithSecondSource() {
  const modules = structuredClone(browserContentModules) as Record<string, unknown>;
  const key = Object.keys(modules).find((path) =>
    path.endsWith("/content/loot-tables/deadmines.json"),
  );
  if (!key) throw new Error("Expected Deadmines loot content");
  const file = modules[key] as {
    lootTables: Array<{ id: string; items: Array<{ itemId: string; weight: number }> }>;
  };
  file.lootTables
    .find((entry) => entry.id === "dm_rhahkzor")!
    .items.push({ itemId: "14148", weight: 100 });
  return loadContentRegistry(modules);
}

describe("item catalog page", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("filters unlocked loot and keeps planned max-level sets hidden", async () => {
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
    expect(wrapper.findAll(".set-card")).toHaveLength(0);
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
    expect(wrapper.text()).not.toContain("成套归档");
  });

  it("shows every unlocked source for one base item", async () => {
    const registry = contentWithSecondSource();
    const clock = new FakeClock(1_000);
    const state = createNewGame({
      slotId: asBrandedId<"SaveSlotId">("multi-source-catalog-page"),
      content: registry,
      contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
      clock,
      ids: new LocalIdGenerator(),
      random: new SeededRandomSource("multi-source-catalog-page"),
    });
    state.guild.unlockedDungeonIds.push(asBrandedId<"DungeonId">("deadmines"));
    const game = useGameStore();
    await game.initialize(() =>
      loadOrCreateV2Client({
        saves: new MemorySaveRepository([state]),
        content: registry,
        clock,
        slotId: state.slotId,
      }),
    );
    const wrapper = mount(ItemCatalogPage);
    await flushPromises();
    const item = wrapper
      .findAll(".catalog-item")
      .find((entry) => entry.text().includes("水晶腕轮"))!;
    await item.get(".item-summary").trigger("click");

    expect(item.get(".sources").text()).toContain("怒焰裂谷 · 饥饿者塔拉加曼");
    expect(item.get(".sources").text()).toContain("死亡矿井 · 拉克佐");
  });
});
