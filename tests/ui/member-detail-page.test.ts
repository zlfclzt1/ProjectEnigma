// @vitest-environment jsdom

import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it } from "vitest";
import { loadOrCreateV2Client } from "../../src/app/client-bootstrap";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { useGameStore } from "../../src/stores/game-store";
import MemberDetailPage from "../../src/ui/pages/MemberDetailPage.vue";
import { FakeClock } from "../helpers/runtime-fakes";

describe("member detail page", () => {
  beforeEach(() => setActivePinia(createPinia()));

  async function setup(testId: string) {
    const game = useGameStore();
    await game.initialize(() =>
      loadOrCreateV2Client({
        saves: new MemorySaveRepository(),
        content: loadBrowserContentRegistry(),
        clock: new FakeClock(1_000),
        slotId: asBrandedId<"SaveSlotId">(testId),
        seed: testId,
      }),
    );
    const member = game.members!.members.find((entry) =>
      game.memberDetail(entry.id)!.availableSpecs.some((spec) => !spec.current),
    )!;
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/members", component: { template: "<div>成员列表</div>" } },
        { path: "/members/:memberId", component: MemberDetailPage },
      ],
    });
    await router.push(`/members/${member.id}`);
    await router.isReady();
    const wrapper = mount(MemberDetailPage, { global: { plugins: [router] } });
    return { game, member, router, wrapper };
  }

  it("renders a complete character sheet and manages an idle member", async () => {
    const { game, member, router, wrapper } = await setup("member-detail-page");
    await game.execute({
      type: "fund-member-detail-test",
      execute(draft) {
        draft.guild.funds = 1_000;
      },
    });
    await flushPromises();

    expect(wrapper.findAll(".equipment-slot")).toHaveLength(17);
    expect(wrapper.text()).toContain("classic-light-v1");
    expect(wrapper.text()).toContain("派生战斗能力");
    expect(wrapper.text()).toContain("战斗属性贡献");
    expect(wrapper.text()).toContain("需要等级");
    expect(wrapper.text()).toContain("来源：");
    expect(wrapper.text()).toContain("属性：");
    expect(wrapper.text()).toMatch(/游戏设计数据|Wowhead Classic/);

    const detail = game.memberDetail(member.id)!;
    const alternative = detail.availableSpecs.find((spec) => !spec.current)!;
    await wrapper.find(".management select").setValue(alternative.id);
    const buttons = wrapper.findAll(".management-row button");
    await buttons[0]!.trigger("click");
    await flushPromises();

    expect(game.snapshot?.guild.funds).toBe(700);
    expect(game.memberDetail(member.id)?.availableSpecs.find((spec) => spec.current)?.id).toBe(
      alternative.id,
    );

    await buttons[1]!.trigger("click");
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
    const confirmButton = wrapper
      .findAll('[role="dialog"] button')
      .find((button) => button.text().includes("确认移出"))!;
    await confirmButton.trigger("click");
    await flushPromises();

    expect(game.members?.members).toHaveLength(4);
    expect(game.memberDetail(member.id)).toBeNull();
    expect(router.currentRoute.value.path).toBe("/members");
  });

  it("disables member management while the member is active", async () => {
    const { game, member, wrapper } = await setup("active-member-detail-page");
    await game.execute({
      type: "mark-member-active-for-ui-test",
      execute(draft) {
        draft.members[member.id]!.activeActivityId = asBrandedId<"ActivityId">("activity_busy");
      },
    });
    await flushPromises();

    expect(wrapper.find(".management select").attributes("disabled")).toBeDefined();
    expect(
      wrapper
        .findAll(".management-row button")
        .every((button) => button.attributes("disabled") !== undefined),
    ).toBe(true);
    expect(wrapper.text()).toContain("活动中的成员不能更改专精或移出公会");
  });
});
