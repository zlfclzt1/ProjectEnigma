// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import GameLayout from "../../src/ui/layouts/GameLayout.vue";

describe("V2 game layout", () => {
  it("renders loaded-save diagnostics without exposing mutable game state", () => {
    const wrapper = mount(GameLayout, {
      global: { stubs: { GameNavigation: true, RouterView: true } },
      props: {
        loading: false,
        error: null,
        legacySaveNotice: null,
        diagnostics: {
          origin: "loaded",
          slotId: "primary",
          saveVersion: 4,
          revision: 4,
          contentVersion: "classic-v1",
          guildName: "夜班公会",
          funds: 88,
          memberCount: 5,
          candidateCount: 3,
          activeActivityCount: 1,
          pendingLootCount: 2,
        },
      },
    });

    expect(wrapper.text()).toContain("夜班公会");
    expect(wrapper.find("h1").exists()).toBe(false);
    expect(wrapper.get(".version-mark").text()).toBe("V2");
    expect(wrapper.text()).toContain("88 G");
  });

  it("warns about an old save without offering to delete it", () => {
    const wrapper = mount(GameLayout, {
      global: { stubs: { GameNavigation: true, RouterView: true } },
      props: {
        loading: false,
        error: null,
        legacySaveNotice: "检测到旧版存档。V2 不迁移该存档，将创建一个全新的游戏。",
        diagnostics: null,
      },
    });

    expect(wrapper.text()).toContain("将创建一个全新的游戏");
    expect(wrapper.text()).toContain("旧存档仍保留在浏览器中");
  });
});
