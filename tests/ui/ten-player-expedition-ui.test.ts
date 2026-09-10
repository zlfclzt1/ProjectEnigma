// @vitest-environment jsdom

import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { loadOrCreateV2Client } from "../../src/app/client-bootstrap";
import { browserContentModules } from "../../src/content/manifest";
import type { ContentRegistry } from "../../src/content/registry";
import { loadContentRegistry } from "../../src/content/registry";
import type { GameState } from "../../src/domain/game-state";
import { asBrandedId } from "../../src/domain/shared/ids";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { useGameStore } from "../../src/stores/game-store";
import { useUiStore } from "../../src/stores/ui-store";
import ActiveExpeditionCard from "../../src/ui/components/ActiveExpeditionCard.vue";
import DungeonsPage from "../../src/ui/pages/DungeonsPage.vue";
import { FakeClock } from "../helpers/runtime-fakes";

function tenPlayerContent(): ContentRegistry {
  const modules = structuredClone(browserContentModules) as Record<string, unknown>;
  const key = Object.keys(modules).find((path) =>
    path.endsWith("/content/dungeons/ragefire-chasm.json"),
  );
  if (!key) throw new Error("Expected Ragefire Chasm dungeon content");
  const file = modules[key] as {
    dungeons: Array<{ members: { minimum: number; recommended: number; maximum: number } }>;
  };
  file.dungeons[0]!.members = { minimum: 5, recommended: 10, maximum: 10 };
  return loadContentRegistry(modules);
}

function appendMemberClones(state: GameState, count: number): void {
  const originals = Object.values(state.members);
  for (let index = 0; index < count; index += 1) {
    const source = originals[index % originals.length]!;
    const id = asBrandedId<"MemberId">(`ui_raid_member_${index + 6}`);
    state.members[id] = {
      ...structuredClone(source),
      id,
      identity: {
        ...structuredClone(source.identity),
        name: `${source.identity.name}·替补${index + 1}`,
      },
      equipment: {},
      activeActivityId: undefined,
    };
  }
}

describe("ten-player expedition UI", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("selects ten from a larger sorted roster and renders the full activity roster", async () => {
    const content = tenPlayerContent();
    const game = useGameStore();
    await game.initialize(() =>
      loadOrCreateV2Client({
        saves: new MemorySaveRepository(),
        content,
        clock: new FakeClock(1_000),
        slotId: asBrandedId<"SaveSlotId">("ten-player-expedition-ui"),
        seed: "ten-player-expedition-ui",
      }),
    );
    await game.execute({
      type: "prepare-ten-player-roster",
      execute(draft) {
        appendMemberClones(draft, 6);
        for (const member of Object.values(draft.members)) member.progression.level = 45;
      },
    });

    const wrapper = mount(DungeonsPage);
    await flushPromises();
    const ui = useUiStore();
    const sortSelect = wrapper.findAll(".party-builder .filter-bar select")[2]!;
    await sortSelect.setValue("role");
    expect(ui.partyFilters.sortBy).toBe("role");

    const checkboxes = wrapper.findAll<HTMLInputElement>('.member-options input[type="checkbox"]');
    expect(checkboxes).toHaveLength(11);
    for (const checkbox of checkboxes.slice(0, 10)) await checkbox.setValue(true);
    expect(ui.selectedPartyMemberIds).toHaveLength(10);
    expect(wrapper.get(".party-builder header > strong").text()).toBe("10 / 10 人");
    expect(checkboxes[10]!.attributes("disabled")).toBeDefined();

    await wrapper.get(".party-preview > button").trigger("click");
    await flushPromises();
    expect(game.activities!.active[0]!.participantCount).toBe(10);
    expect(game.activities!.active[0]!.memberNames).toHaveLength(10);

    const card = mount(ActiveExpeditionCard, { props: { activity: game.activities!.active[0]! } });
    expect(card.text()).toContain("10 人");
    for (const name of game.activities!.active[0]!.memberNames) {
      expect(card.get(".members").text()).toContain(name);
    }
  });
});
