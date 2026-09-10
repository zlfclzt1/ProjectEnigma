// @vitest-environment jsdom

import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { loadOrCreateV2Client } from "../../src/app/client-bootstrap";
import { browserContentModules } from "../../src/content/manifest";
import { loadContentRegistry } from "../../src/content/registry";
import { asBrandedId } from "../../src/domain/shared/ids";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { useGameStore } from "../../src/stores/game-store";
import { useUiStore } from "../../src/stores/ui-store";
import DungeonsPage from "../../src/ui/pages/DungeonsPage.vue";
import { FakeClock } from "../helpers/runtime-fakes";

function routeContent() {
  const modules = structuredClone(browserContentModules) as Record<string, unknown>;
  const key = Object.keys(modules).find((path) =>
    path.endsWith("/content/dungeons/ragefire-chasm.json"),
  );
  if (!key) throw new Error("Expected Ragefire Chasm dungeon content");
  const dungeon = (
    modules[key] as {
      dungeons: Array<{ route: Array<{ id: string }>; routeVariants?: unknown[] }>;
    }
  ).dungeons[0]!;
  dungeon.routeVariants = [
    {
      id: "normal_route",
      name: { zhCN: "完整路线" },
      description: { zhCN: "挑战全部主要首领。" },
      requiredNodeIds: dungeon.route.map((node) => node.id),
    },
    {
      id: "shortcut_route",
      name: { zhCN: "捷径路线" },
      description: { zhCN: "跳过中段守卫。" },
      requiredNodeIds: [dungeon.route[0]!.id, dungeon.route.at(-1)!.id],
    },
  ];
  return loadContentRegistry(modules);
}

describe("named dungeon route UI", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("selects a named route before departure and shows it on the activity", async () => {
    const content = routeContent();
    const game = useGameStore();
    await game.initialize(() =>
      loadOrCreateV2Client({
        saves: new MemorySaveRepository(),
        content,
        clock: new FakeClock(1_000),
        slotId: asBrandedId<"SaveSlotId">("named-route-ui"),
        seed: "named-route-ui",
      }),
    );
    await game.execute({
      type: "prepare-named-route-ui",
      execute(draft) {
        for (const member of Object.values(draft.members)) member.progression.level = 45;
      },
    });
    const wrapper = mount(DungeonsPage);
    await flushPromises();
    for (const checkbox of wrapper.findAll('.member-options input[type="checkbox"]')) {
      await checkbox.setValue(true);
    }

    const radios = wrapper.findAll<HTMLInputElement>('.route-variants input[type="radio"]');
    expect(radios).toHaveLength(2);
    expect(radios[0]!.element.checked).toBe(true);
    expect(wrapper.findAll(".boss-route li")).toHaveLength(4);
    await radios[1]!.setValue(true);
    expect(useUiStore().selectedRouteVariantId).toBe("shortcut_route");
    expect(wrapper.findAll(".boss-route li")).toHaveLength(2);

    await wrapper.get(".party-preview > button").trigger("click");
    await flushPromises();
    expect(game.activities!.active[0]).toMatchObject({
      routeVariantName: "捷径路线",
      totalEncounterCount: 2,
    });
  });
});
