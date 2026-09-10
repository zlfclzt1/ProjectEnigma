// @vitest-environment jsdom

import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { loadOrCreateV2Client } from "../../src/app/client-bootstrap";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { useGameStore } from "../../src/stores/game-store";
import { useUiStore } from "../../src/stores/ui-store";
import DungeonsPage from "../../src/ui/pages/DungeonsPage.vue";
import PartyPreview from "../../src/ui/components/PartyPreview.vue";
import { FakeClock } from "../helpers/runtime-fakes";

describe("dungeons page", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("switches all dungeons, filters the roster, previews exact odds, and starts repeated runs", async () => {
    const game = useGameStore();
    await game.initialize(() =>
      loadOrCreateV2Client({
        saves: new MemorySaveRepository(),
        content: loadBrowserContentRegistry(),
        clock: new FakeClock(1_000),
        slotId: asBrandedId<"SaveSlotId">("dungeons-page"),
        seed: "dungeons-page",
      }),
    );
    const wrapper = mount(DungeonsPage);
    await flushPromises();

    expect(wrapper.findAll(".dungeon-selector button")).toHaveLength(9);
    await wrapper.findAll(".dungeon-selector button")[1]!.trigger("click");
    expect(useUiStore().selectedDungeonId).not.toBeNull();
    await wrapper.findAll(".dungeon-selector button")[0]!.trigger("click");

    const target = game.dungeonPlanning(useUiStore().selectedDungeonId, [], 1)!.members[0]!;
    const filterSelects = wrapper.findAll(".party-builder .filter-bar select");
    await filterSelects[0]!.setValue(target.classId);
    await filterSelects[1]!.setValue(target.role);
    await filterSelects[2]!.setValue("role");
    const expectedFiltered = game
      .dungeonPlanning(useUiStore().selectedDungeonId, [], 1)!
      .members.filter(
        (member) => member.classId === target.classId && member.role === target.role,
      ).length;
    expect(wrapper.findAll(".member-options > label")).toHaveLength(expectedFiltered);
    expect(useUiStore().partyFilters.sortBy).toBe("role");

    await filterSelects[0]!.setValue("");
    await filterSelects[1]!.setValue("");
    for (const checkbox of wrapper.findAll('.member-options input[type="checkbox"]')) {
      await checkbox.setValue(true);
    }
    const runsSelect = wrapper.find(".page-heading select");
    await runsSelect.setValue("2");

    expect(useUiStore().requestedExpeditionRuns).toBe(2);
    expect(wrapper.text()).toContain("全通");
    expect(wrapper.text()).toMatch(/胜率 \d+\.\d{2}%/);
    expect(wrapper.findAll(".boss-route li")).toHaveLength(4);
    const startButton = wrapper.find(".party-preview > button");
    expect(startButton.attributes("disabled")).toBeUndefined();

    await startButton.trigger("click");
    await flushPromises();

    expect(game.activities?.active).toHaveLength(1);
    expect(game.activities?.active[0]?.requestedRuns).toBe(2);
    expect(useUiStore().selectedPartyMemberIds).toEqual([]);
    expect(wrapper.text()).toContain("可以继续组织另一支队伍");
    expect(wrapper.findAll('.member-options input[type="checkbox"][disabled]')).toHaveLength(5);
  });

  it("renders mechanic readiness, exact requirements, and applied effects", () => {
    const wrapper = mount(PartyPreview, {
      props: {
        dungeon: null,
        preview: null,
        issues: ["奥格弗林特的机制尚未满足。"],
        requestedRuns: 1,
        canStart: false,
        pending: false,
        optionalRoutes: [],
        rareRoutes: [],
        questRouteWarnings: [
          {
            memberId: asBrandedId<"MemberId">("member_1"),
            memberName: "铁锤",
            questId: asBrandedId<"QuestId">("quest_1"),
            questName: "寻找遗物",
            optionalNodeIds: [asBrandedId<"DungeonRouteNodeId">("optional_1")],
            bossNames: ["可选首领"],
            message: "铁锤的任务“寻找遗物”需要挑战可选首领可选首领。",
          },
        ],
        mechanicReadiness: [
          {
            id: "test_recommended_magic_dispel",
            encounterId: "oggleflint",
            encounterName: "奥格弗林特",
            name: "建议驱散魔法",
            description: "缺少魔法驱散会增加治疗压力并拖慢战斗。",
            type: "recommended",
            status: "partial",
            requirements: [
              {
                capabilityName: "驱散魔法",
                currentValue: 1,
                minimumValue: 2,
                satisfied: false,
              },
            ],
            impactLabels: ["治疗压力 +15%", "胜率 -5 个百分点", "耗时 +5%"],
          },
        ],
      },
    });

    expect(wrapper.text()).toContain("奥格弗林特 · 建议驱散魔法");
    expect(wrapper.text()).toContain("部分满足");
    expect(wrapper.text()).toContain("驱散魔法 1.0/2.0");
    expect(wrapper.text()).toContain("治疗压力 +15% · 胜率 -5 个百分点 · 耗时 +5%");
    expect(wrapper.text()).toContain("请手动勾选后再出发");
    expect(wrapper.find("button").attributes("disabled")).toBeDefined();
  });

  it("renders and toggles optional routes while presenting rare ranges", async () => {
    const wrapper = mount(PartyPreview, {
      props: {
        dungeon: null,
        preview: {
          formulaVersion: "classic-light-v1",
          contribution: { tank: 1, healing: 1, damage: 3 },
          encounters: [],
          clearProbability: 0.8,
          durationSeconds: 600,
          durationRange: { minimumSeconds: 600, maximumSeconds: 720 },
        },
        issues: [],
        requestedRuns: 2,
        canStart: true,
        pending: false,
        mechanicReadiness: [],
        optionalRoutes: [
          {
            id: asBrandedId<"DungeonRouteNodeId">("optional_taragaman"),
            encounterId: "taragaman_the_hungerer",
            name: "饥饿者塔拉加曼",
            description: "绕行熔岩通道挑战饥饿者。",
            selected: false,
            probability: 0.82,
            durationSeconds: 120,
            lootItemCount: 3,
          },
        ],
        rareRoutes: [
          {
            id: asBrandedId<"DungeonRouteNodeId">("rare_bazzalan"),
            encounterId: "bazzalan",
            name: "巴扎兰",
            spawnProbability: 0.35,
            conditionalProbability: 0.75,
            durationSeconds: 60,
            lootItemCount: 0,
          },
        ],
      },
    });

    expect(wrapper.text()).toContain("可选 · 饥饿者塔拉加曼");
    expect(wrapper.text()).toContain("出现率 35.00%");
    expect(wrapper.text()).toContain("20:00–24:00");
    await wrapper.find('.route-options input[type="checkbox"]').setValue(true);
    expect(wrapper.emitted("toggleOptional")?.[0]).toEqual(["optional_taragaman"]);
  });

  it("unlocks the fourth and fifth run options through the visible guild upgrade", async () => {
    const game = useGameStore();
    await game.initialize(() =>
      loadOrCreateV2Client({
        saves: new MemorySaveRepository(),
        content: loadBrowserContentRegistry(),
        clock: new FakeClock(1_000),
        slotId: asBrandedId<"SaveSlotId">("five-run-upgrade-page"),
        seed: "five-run-upgrade-page",
      }),
    );
    await game.execute({
      type: "prepare-five-run-upgrade",
      execute(draft) {
        draft.guild.funds = 1_000;
        draft.history.dungeonClearCounts[asBrandedId<"DungeonId">("shadowfang_keep")] = 1;
      },
    });
    const wrapper = mount(DungeonsPage);
    await flushPromises();

    expect(wrapper.findAll(".page-heading select option")).toHaveLength(3);
    expect(wrapper.get(".run-upgrade").text()).toContain("远征补给车");
    expect(wrapper.get(".run-upgrade button").attributes("disabled")).toBeUndefined();

    await wrapper.get(".run-upgrade button").trigger("click");
    await flushPromises();

    expect(wrapper.findAll(".page-heading select option")).toHaveLength(5);
    expect(wrapper.find(".run-upgrade").exists()).toBe(false);
    await wrapper.get(".page-heading select").setValue("5");
    expect(useUiStore().requestedExpeditionRuns).toBe(5);
  });
});
