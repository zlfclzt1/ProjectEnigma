// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import CreateGuildPage from "../../src/ui/pages/CreateGuildPage.vue";

describe("CreateGuildPage", () => {
  it("starts empty and submits the player's chosen guild name", async () => {
    const wrapper = mount(CreateGuildPage, { props: { error: null, legacySaveNotice: null } });
    const input = wrapper.get<HTMLInputElement>("#guild-name");
    const button = wrapper.get<HTMLButtonElement>("button[type='submit']");

    expect(input.attributes("placeholder")).toBe("为你的公会命名");
    expect(input.element.value).toBe("");
    expect(button.element.disabled).toBe(true);

    await input.setValue("  银松议会  ");
    await wrapper.get("form").trigger("submit");
    expect(wrapper.emitted("create")).toEqual([["  银松议会  "]]);
  });

  it("shows launcher creation errors", () => {
    const wrapper = mount(CreateGuildPage, {
      props: { error: "无法创建桌面存档", legacySaveNotice: null },
    });
    expect(wrapper.get("[role='alert']").text()).toBe("无法创建桌面存档");
  });
});
