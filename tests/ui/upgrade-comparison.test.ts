// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import UpgradeComparison from "../../src/ui/components/UpgradeComparison.vue";

describe("upgrade comparison", () => {
  it("marks a positive upgrade and formats its exact delta", () => {
    const wrapper = mount(UpgradeComparison, {
      props: { label: "伤害", current: 12.25, candidate: 15.5, unit: "%" },
    });

    expect(wrapper.classes()).toContain("gain");
    expect(wrapper.text()).toContain("+3.25%");
  });

  it("marks a downgrade without a misleading plus sign", () => {
    const wrapper = mount(UpgradeComparison, {
      props: { label: "生存", current: 18, candidate: 16.75 },
    });

    expect(wrapper.classes()).toContain("loss");
    expect(wrapper.text()).toContain("-1.25");
    expect(wrapper.text()).not.toContain("+-1.25");
  });
});
