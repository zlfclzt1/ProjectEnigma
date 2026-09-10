// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { EquippedItemView } from "../../src/application/queries/get-members-view";
import ItemTooltip from "../../src/ui/components/ItemTooltip.vue";

describe("item tooltip", () => {
  it("shows the resolved random suffix and its bonus stats", () => {
    const item: EquippedItemView = {
      instanceId: "item_1",
      definitionId: "14148",
      name: "整备之水晶腕轮",
      quality: "uncommon",
      itemLevel: 18,
      requiredLevel: 13,
      armorType: "cloth",
      twoHanded: false,
      description: "测试装备",
      stats: [
        { id: "staminaPoints", label: "耐力", value: "+1", numericValue: 1 },
        { id: "intellectPoints", label: "智力", value: "+1", numericValue: 1 },
      ],
      randomSuffix: {
        name: "整备之",
        stats: [{ id: "staminaPoints", label: "耐力", value: "+1", numericValue: 1 }],
      },
      acquisitionSource: "怒焰裂谷 · 奥格弗林特",
      statsSource: "Wowhead Classic · 2026-09-08",
      requirements: ["需要等级 13"],
    };

    const wrapper = mount(ItemTooltip, { props: { item } });

    expect(wrapper.text()).toContain("整备之水晶腕轮");
    expect(wrapper.text()).toContain("随机词缀：整备之");
    expect(wrapper.get(".suffix-details").text()).toContain("耐力 +1");
  });
});
