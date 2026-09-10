// @vitest-environment jsdom
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { loadOrCreateV2Client } from "../../src/app/client-bootstrap";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { FakeClock } from "../helpers/runtime-fakes";
import { useGameStore } from "../../src/stores/game-store";
import QuestsPage from "../../src/ui/pages/QuestsPage.vue";

describe("quests page", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("groups guild quests and approves all eligible members in one action", async () => {
    const game = useGameStore();
    await game.initialize(() =>
      loadOrCreateV2Client({
        saves: new MemorySaveRepository(),
        content: loadBrowserContentRegistry(),
        clock: new FakeClock(1_000),
        slotId: asBrandedId<"SaveSlotId">("quests-page"),
        seed: "quests-page",
      }),
    );
    const wrapper = mount(QuestsPage);
    await flushPromises();

    expect(wrapper.text()).toContain("归还背包");
    expect(wrapper.text()).toContain("羽珠护腕 / 草原狮护腕");
    expect(wrapper.text()).toContain("公会联络人 · 艾琳");
    expect(wrapper.text()).toMatch(/申请|这趟让我去|顺路处理/);
    expect(wrapper.get(".status-board").text()).toContain("待批准");
    expect(wrapper.get(".approve-button").text()).toContain("批准选中申请（10）");
    await wrapper.get(".approve-button").trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("已批准 10 项成员任务");
    expect(
      game
        .memberDungeonQuests(game.members!.members[0]!.id)
        ?.quests.find((quest) => quest.id === "rfc_returning_lost_satchel")?.status,
    ).toBe("accepted");
    expect(game.dungeonQuestHall(game.members!.members.map((member) => member.id))?.totals).toEqual(
      {
        pendingApproval: 0,
        inProgress: 10,
        pendingClaim: 0,
      },
    );

    await wrapper.findAll(".status-board button")[1]!.trigger("click");
    await wrapper.findAll(".details-toggle")[0]!.trigger("click");
    await wrapper.findAll(".tracking-actions button")[0]!.trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("任务已暂缓跟踪");
    expect(
      game
        .memberDungeonQuests(game.members!.members[0]!.id)
        ?.quests.find((quest) => quest.id === "rfc_returning_lost_satchel")?.trackingPaused,
    ).toBe(true);
  });

  it("opens a settlement meeting with recommended rewards and claims them together", async () => {
    const game = useGameStore();
    await game.initialize(() =>
      loadOrCreateV2Client({
        saves: new MemorySaveRepository(),
        content: loadBrowserContentRegistry(),
        clock: new FakeClock(1_000),
        slotId: asBrandedId<"SaveSlotId">("quest-settlement-page"),
        seed: "quest-settlement-page",
      }),
    );
    const member = game.members!.members[0]!;
    await game.execute({
      type: "prepare-quest-settlement-page",
      execute(draft) {
        const questId = asBrandedId<"QuestId">("rfc_returning_lost_satchel");
        draft.members[member.id]!.quests.entries[questId] = {
          questId,
          status: "completed",
          acceptedAt: 1_000,
          completedAt: 2_000,
          encounterVictoryIds: [],
        };
      },
    });
    const wrapper = mount(QuestsPage);
    await wrapper.findAll(".status-board button")[2]!.trigger("click");
    await wrapper.get(".approve-button").trigger("click");

    const meeting = wrapper.get(".settlement-meeting");
    expect(meeting.text()).toContain("系统推荐");
    expect(meeting.text()).toContain(member.name);
    await meeting.get("footer .primary").trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("结算会完成");
    expect(
      game
        .memberDungeonQuests(member.id)
        ?.quests.find((quest) => quest.id === "rfc_returning_lost_satchel")?.status,
    ).toBe("claimed");
  });
});
