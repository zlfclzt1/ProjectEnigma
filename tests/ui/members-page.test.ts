// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { loadOrCreateV2Client } from "../../src/app/client-bootstrap";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { useGameStore } from "../../src/stores/game-store";
import { useUiStore } from "../../src/stores/ui-store";
import MembersPage from "../../src/ui/pages/MembersPage.vue";
import { FakeClock } from "../helpers/runtime-fakes";

describe("members page", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("combines class and role filters and keeps them after the page remounts", async () => {
    const game = useGameStore();
    await game.initialize(() =>
      loadOrCreateV2Client({
        saves: new MemorySaveRepository(),
        content: loadBrowserContentRegistry(),
        clock: new FakeClock(1_000),
        slotId: asBrandedId<"SaveSlotId">("members-page"),
        seed: "members-page",
      }),
    );
    const target = game.members!.members[0]!;
    const expectedCount = game.members!.members.filter(
      (member) => member.classId === target.classId && member.role === target.role,
    ).length;
    const mountPage = () =>
      mount(MembersPage, {
        global: {
          stubs: { RouterLink: { template: "<a><slot /></a>" } },
        },
      });

    let wrapper = mountPage();
    expect(wrapper.findAll(".member-card")).toHaveLength(5);

    const selects = wrapper.findAll("select");
    await selects[0]!.setValue(target.classId);
    await selects[1]!.setValue(target.role);

    expect(wrapper.findAll(".member-card")).toHaveLength(expectedCount);
    expect(useUiStore().memberFilters).toEqual({ classId: target.classId, role: target.role });

    wrapper.unmount();
    wrapper = mountPage();
    const remountedSelects = wrapper.findAll("select");
    expect(remountedSelects[0]!.element.value).toBe(target.classId);
    expect(remountedSelects[1]!.element.value).toBe(target.role);
    expect(wrapper.findAll(".member-card")).toHaveLength(expectedCount);
  });
});
