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
import RosterPresetBar from "../../src/ui/components/RosterPresetBar.vue";
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
    await wrapper.get(".party-summary button").trigger("click");

    expect(wrapper.get(".dungeon-selector").text()).toContain("怒焰裂谷");
    expect(wrapper.findAll(".dungeon-option")).toHaveLength(27);
    expect(wrapper.findAll(".dungeon-section")).toHaveLength(6);
    expect(wrapper.text()).toContain("10–45 级成长副本");
    expect(wrapper.text()).toContain("45–60 级进阶副本");
    expect(wrapper.text()).toContain("60 级团本前准备 · 厄运之槌分支");
    await wrapper.findAll(".section-toggle")[1]!.trigger("click");
    expect(wrapper.findAll(".dungeon-option")).toHaveLength(22);
    await wrapper.findAll(".section-toggle")[1]!.trigger("click");
    await wrapper.findAll(".dungeon-option")[1]!.trigger("click");
    expect(useUiStore().selectedDungeonId).toBe("wailing_caverns");

    await wrapper.get('.selector-filters input[type="search"]').setValue("黑石深渊");
    expect(wrapper.get(".selector-heading").text()).toContain("2 个副本");
    expect(wrapper.findAll(".dungeon-option")).toHaveLength(2);
    await wrapper.get('.selector-filters input[type="search"]').setValue("");
    await wrapper.get(".dungeon-section .dungeon-option").trigger("click");
    expect(useUiStore().selectedDungeonId).toBe("ragefire_chasm");

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
    expect(wrapper.get(".success-badge.ready").text()).toMatch(/\d+\.\d{2}%/);
    expect(wrapper.get(".party-preview").text()).toMatch(/全通 \d+\.\d{2}%/);
    const runsSelect = wrapper.find(".page-heading select");
    await runsSelect.setValue("2");

    expect(useUiStore().requestedExpeditionRuns).toBe(2);
    expect(wrapper.text()).toContain("全通");
    expect(wrapper.text()).toMatch(/胜率 \d+\.\d{2}%/);
    expect(wrapper.findAll(".boss-route li")).toHaveLength(4);
    const startButton = wrapper.find(".party-preview > button");
    expect(startButton.attributes("disabled")).toBeUndefined();
    expect(wrapper.get(".quest-summary").text()).toContain("调查 2 项可推进");
    expect(wrapper.get(".quest-summary").text()).toContain("首次开发战利品");

    await startButton.trigger("click");
    await flushPromises();

    expect(game.activities?.active).toHaveLength(1);
    expect(game.activities?.active[0]?.requestedRuns).toBe(2);
    expect(useUiStore().selectedPartyMemberIds).toEqual([]);
    expect(wrapper.text()).toContain("可以继续组织另一支队伍");
    expect(wrapper.findAll('.member-options input[type="checkbox"][disabled]')).toHaveLength(5);
    expect(game.activities?.active[0]?.developmentEvents).toEqual([]);
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
          levelCap: 45,
          contribution: { tank: 1, healing: 1, damage: 3 },
          encounters: [],
          clearProbability: 0.8,
          durationSeconds: 600,
          durationRange: { minimumSeconds: 600, maximumSeconds: 720 },
          experience: [
            {
              memberId: asBrandedId<"MemberId">("member_1"),
              memberName: "铁锤",
              currentLevel: 10,
              experienceFraction: 0.7,
              boostMultiplier: 0.7,
              projectedLevel: 10,
              projectedExperience: 0.7,
            },
          ],
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
    expect(wrapper.text()).toContain("铁锤");
    expect(wrapper.text()).toContain("等级差衰减 70%");
    expect(wrapper.text()).toContain("+0.70 级");
    await wrapper.find('.route-options input[type="checkbox"]').setValue(true);
    expect(wrapper.emitted("toggleOptional")?.[0]).toEqual(["optional_taragaman"]);
  });

  it("keeps the Scarlet Library Loksey route visible without a party preview", async () => {
    const game = useGameStore();
    await game.initialize(() =>
      loadOrCreateV2Client({
        saves: new MemorySaveRepository(),
        content: loadBrowserContentRegistry(),
        clock: new FakeClock(1_000),
        slotId: asBrandedId<"SaveSlotId">("scarlet-library-route-ui"),
        seed: "scarlet-library-route-ui",
      }),
    );
    const dungeonId = asBrandedId<"DungeonId">("scarlet_monastery_library");
    await game.execute({
      type: "unlock-scarlet-library-for-ui-test",
      execute(draft) {
        draft.guild.unlockedDungeonIds = [
          ...new Set([...draft.guild.unlockedDungeonIds, dungeonId]),
        ];
      },
    });
    const ui = useUiStore();
    ui.selectDungeon(dungeonId);

    const wrapper = mount(DungeonsPage);
    await flushPromises();

    expect(wrapper.find(".party-preview .placeholder").exists()).toBe(true);
    expect(wrapper.get(".route-config").text()).toContain("驯犬者洛克希");
    await wrapper.get('.route-config input[type="checkbox"]').setValue(true);
    expect(ui.selectedOptionalNodeIds).toEqual(["scarlet_library_houndmaster_loksey"]);
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

  it("saves and reapplies the current party as a named fixed team", async () => {
    const game = useGameStore();
    await game.initialize(() =>
      loadOrCreateV2Client({
        saves: new MemorySaveRepository(),
        content: loadBrowserContentRegistry(),
        clock: new FakeClock(1_000),
        slotId: asBrandedId<"SaveSlotId">("fixed-team-page"),
        seed: "fixed-team-page",
      }),
    );
    const wrapper = mount(DungeonsPage);
    await flushPromises();
    await wrapper.get(".party-summary button").trigger("click");
    const ui = useUiStore();
    const checkboxes = wrapper.findAll<HTMLInputElement>('.party-builder input[type="checkbox"]');
    for (const checkbox of checkboxes) await checkbox.setValue(true);

    await wrapper.get(".preset-actions button:nth-of-type(1)").trigger("click");
    const nameDialog = wrapper.get(".name-dialog");
    expect(nameDialog.get("input").element.value).toBe("固定队伍 1");
    await nameDialog.get("input").setValue("怒焰常驻队");
    await nameDialog.trigger("submit");
    await flushPromises();

    expect(game.rosterPresets?.presets[0]?.name).toBe("怒焰常驻队");
    expect(game.rosterPresets?.presets[0]?.members).toHaveLength(5);
    ui.clearParty();
    await wrapper.get(".preset-option").trigger("click");
    expect(ui.selectedPartyMemberIds).toHaveLength(5);
    expect(wrapper.text()).toContain("已切换至“怒焰常驻队”");
  });

  it("keeps an oversized fixed team intact and surfaces the start issue", async () => {
    const game = useGameStore();
    await game.initialize(() =>
      loadOrCreateV2Client({
        saves: new MemorySaveRepository(),
        content: loadBrowserContentRegistry(),
        clock: new FakeClock(1_000),
        slotId: asBrandedId<"SaveSlotId">("fixed-team-reduction"),
        seed: "fixed-team-reduction",
      }),
    );
    await game.execute({
      type: "add-fixed-team-members",
      execute(draft) {
        const originals = Object.values(draft.members);
        for (let index = 0; index < 5; index += 1) {
          const source = originals[index]!;
          const id = asBrandedId<"MemberId">(`reduction_member_${index}`);
          draft.members[id] = {
            ...structuredClone(source),
            id,
            identity: { ...structuredClone(source.identity), name: `减员候选 ${index + 1}` },
            equipment: {},
            activeActivityId: undefined,
          };
        }
      },
    });
    const allIds = game.dungeonPlanning(null, [], 1)!.members.map((member) => member.id);
    const created = await game.createRosterPreset("十人名单", allIds);
    if (!created.ok) throw new Error("Expected fixed team creation");
    const wrapper = mount(DungeonsPage);
    await flushPromises();
    await wrapper.get(".preset-option").trigger("click");
    expect(useUiStore().selectedPartyMemberIds).toHaveLength(10);
    expect(wrapper.get(".party-summary").text()).toContain("10 人");
    expect(wrapper.get(".party-preview .issues").text()).toContain("最多选择 5 名成员");
    expect(wrapper.get(".party-preview > button").attributes("disabled")).toBeDefined();
  });

  it("shows busy members before selecting a fixed team", async () => {
    const presetId = asBrandedId<"RosterPresetId">("busy-team");
    const memberId = asBrandedId<"MemberId">("busy-member");
    const wrapper = mount(RosterPresetBar, {
      props: {
        presets: [
          {
            id: presetId,
            name: "晚班小队",
            members: [
              {
                id: memberId,
                name: "铁锤",
                nameAtSave: "铁锤",
                departed: false,
                active: true,
                classId: asBrandedId<"ClassId">("warrior"),
                className: "战士",
                role: "tank",
                roleName: "坦克",
                level: 20,
              },
            ],
            currentMemberIds: [memberId],
            departedCount: 0,
            activeCount: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        ],
        selectedPresetId: null,
        selectedMemberCount: 0,
        maximumPresets: 10,
        pending: false,
      },
    });

    expect(wrapper.get(".preset-option").text()).toContain("1 人忙");
    expect(wrapper.get(".preset-members .active").text()).toContain("铁锤 忙");
    await wrapper.get(".preset-option").trigger("click");
    expect(wrapper.emitted("select")?.[0]).toEqual([presetId]);
  });

  it("summarizes a forty-player fixed team and exposes its full roster", async () => {
    const presetId = asBrandedId<"RosterPresetId">("raid-team");
    const roles = ["tank", "healer", "dps"] as const;
    const members = Array.from({ length: 40 }, (_, index) => {
      const role = roles[index % roles.length]!;
      return {
        id: asBrandedId<"MemberId">(`raid-member-${index + 1}`),
        name: `团员 ${index + 1}`,
        nameAtSave: `团员 ${index + 1}`,
        departed: index === 1,
        active: index === 0,
        classId: asBrandedId<"ClassId">("warrior"),
        className: "战士",
        role,
        roleName: { tank: "坦克", healer: "治疗", dps: "输出" }[role],
        level: 60,
      };
    });
    const wrapper = mount(RosterPresetBar, {
      props: {
        presets: [
          {
            id: presetId,
            name: "熔火之心一团",
            members,
            currentMemberIds: members
              .filter((member) => !member.departed)
              .map((member) => member.id),
            departedCount: 1,
            activeCount: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        ],
        selectedPresetId: null,
        selectedMemberCount: 0,
        maximumPresets: 10,
        pending: false,
      },
    });

    expect(wrapper.find(".preset-members").exists()).toBe(false);
    expect(wrapper.get(".large-roster-summary").text()).toContain("坦克 14");
    expect(wrapper.get(".large-roster-summary").text()).toContain("治疗 12");
    expect(wrapper.get(".large-roster-summary").text()).toContain("输出 13");
    expect(wrapper.get(".exception-members").text()).toContain("团员 1 · 忙");
    expect(wrapper.get(".exception-members").text()).toContain("团员 2 · 离队");

    await wrapper.get(".view-roster").trigger("click");
    expect(wrapper.findAll(".full-roster article")).toHaveLength(40);
  });

  it("keeps more than four fixed teams discoverable in an all-teams panel", async () => {
    const presets = Array.from({ length: 5 }, (_, index) => {
      const memberId = asBrandedId<"MemberId">(`saved-team-member-${index + 1}`);
      return {
        id: asBrandedId<"RosterPresetId">(`saved-team-${index + 1}`),
        name: `固定队 ${index + 1}`,
        members: [
          {
            id: memberId,
            name: `成员 ${index + 1}`,
            nameAtSave: `成员 ${index + 1}`,
            departed: false,
            active: false,
            classId: asBrandedId<"ClassId">("warrior"),
            className: "战士",
            role: "tank" as const,
            roleName: "坦克",
            level: 20,
          },
        ],
        currentMemberIds: [memberId],
        departedCount: 0,
        activeCount: 0,
        createdAt: index,
        updatedAt: index,
      };
    });
    const wrapper = mount(RosterPresetBar, {
      props: {
        presets,
        selectedPresetId: null,
        selectedMemberCount: 0,
        maximumPresets: 10,
        pending: false,
      },
    });

    expect(wrapper.findAll(".preset-card")).toHaveLength(4);
    expect(wrapper.get(".all-presets-button").text()).toContain("全部固定队（5）");
    await wrapper.get(".all-presets-button").trigger("click");
    expect(wrapper.findAll(".all-presets-option")).toHaveLength(5);
    await wrapper.get(".all-presets-option:nth-child(5)").trigger("click");
    expect(wrapper.emitted("select")?.[0]).toEqual(["saved-team-5"]);
  });
});
