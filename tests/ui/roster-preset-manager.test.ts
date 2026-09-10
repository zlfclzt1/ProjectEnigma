// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { PartyMemberOptionView } from "../../src/application/queries/get-dungeons-view";
import { asBrandedId } from "../../src/domain/shared/ids";
import RosterPresetManager from "../../src/ui/components/RosterPresetManager.vue";

function member(index: number): PartyMemberOptionView {
  const role = index % 5 === 0 ? "tank" : index % 5 === 1 ? "healer" : "dps";
  return {
    id: asBrandedId<"MemberId">(`manager_member_${index}`),
    name: `团队成员 ${String(index).padStart(2, "0")}`,
    level: 60,
    itemLevel: 60,
    classId: asBrandedId<"ClassId">(role === "tank" ? "warrior" : "mage"),
    className: role === "tank" ? "战士" : "法师",
    specName: "测试专精",
    role,
    roleName: role === "tank" ? "坦克" : role === "healer" ? "治疗" : "输出",
    active: false,
  };
}

describe("roster preset manager", () => {
  it("searches, filters, batch-selects, and caps a large roster at 40 members", async () => {
    const members = Array.from({ length: 45 }, (_, index) => member(index + 1));
    const wrapper = mount(RosterPresetManager, {
      props: {
        open: true,
        directory: {
          presets: [],
          defaultName: "固定队伍 1",
          maximumPresets: 10,
          maximumMembers: 40,
        },
        members,
        classOptions: [
          { id: asBrandedId<"ClassId">("warrior"), name: "战士" },
          { id: asBrandedId<"ClassId">("mage"), name: "法师" },
        ],
        roleOptions: [
          { id: "tank", name: "坦克" },
          { id: "healer", name: "治疗" },
          { id: "dps", name: "输出" },
        ],
        pending: false,
      },
    });

    expect(wrapper.findAll(".member-grid label")).toHaveLength(45);
    await wrapper.findAll(".selection-tools button")[0]!.trigger("click");
    expect(wrapper.get(".selection-tools strong").text()).toBe("40 / 40 人");
    expect(
      wrapper.findAll<HTMLInputElement>('.member-grid input[type="checkbox"]:checked'),
    ).toHaveLength(40);

    await wrapper.get('input[aria-label="搜索成员"]').setValue("团队成员 45");
    expect(wrapper.findAll(".member-grid label")).toHaveLength(1);
    await wrapper.findAll(".selection-tools button")[1]!.trigger("click");
    await wrapper.get('input[aria-label="搜索成员"]').setValue("");
    await wrapper.get('select[aria-label="按职责筛选"]').setValue("tank");
    expect(wrapper.findAll(".member-grid label")).toHaveLength(9);
    await wrapper.findAll(".selection-tools button")[0]!.trigger("click");
    await wrapper.get(".editor footer button").trigger("click");

    const event = wrapper.emitted("create")?.[0];
    expect(event?.[0]).toBe("固定队伍 1");
    expect(event?.[1]).toHaveLength(9);
  });
});
