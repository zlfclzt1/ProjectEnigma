// @vitest-environment jsdom

import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it } from "vitest";
import { asBrandedId } from "../../src/domain/shared/ids";
import { useUiStore } from "../../src/stores/ui-store";
import GameNavigation from "../../src/ui/components/GameNavigation.vue";

describe("game navigation", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("switches pages without clearing UI selections", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/overview", component: { template: "<div />" } },
        { path: "/recruitment", component: { template: "<div />" } },
        { path: "/members", component: { template: "<div />" } },
        { path: "/dungeons", component: { template: "<div />" } },
        { path: "/activities", component: { template: "<div />" } },
        { path: "/loot", component: { template: "<div />" } },
        { path: "/catalog", component: { template: "<div />" } },
        { path: "/reports", component: { template: "<div />" } },
      ],
    });
    await router.push("/overview");
    await router.isReady();
    const ui = useUiStore();
    ui.selectDungeon(asBrandedId<"DungeonId">("deadmines"));
    const wrapper = mount(GameNavigation, { global: { plugins: [router] } });

    await wrapper.findAll("a")[1]!.trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.path).toBe("/recruitment");
    expect(ui.selectedDungeonId).toBe("deadmines");

    await wrapper.findAll("a")[3]!.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/dungeons");

    await wrapper.findAll("a")[4]!.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/activities");

    await wrapper.findAll("a")[5]!.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/loot");

    await wrapper.findAll("a")[6]!.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/catalog");

    await wrapper.findAll("a")[7]!.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/reports");
  });
});
