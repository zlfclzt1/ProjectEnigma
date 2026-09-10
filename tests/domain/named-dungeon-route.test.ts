import { describe, expect, it } from "vitest";
import { startExpeditionCommand } from "../../src/application/commands/start-expedition";
import { getDungeonPlanningView } from "../../src/application/queries/get-dungeons-view";
import { SettlementService } from "../../src/application/services/settlement-service";
import { browserContentModules } from "../../src/content/manifest";
import { loadContentRegistry } from "../../src/content/registry";
import type { DungeonDefinition } from "../../src/content/schemas/dungeon";
import { routeForVariant } from "../../src/domain/dungeon/dungeon-route";
import { createNewGame } from "../../src/domain/guild/new-game";
import { asBrandedId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { FakeClock } from "../helpers/runtime-fakes";

const dungeonId = asBrandedId<"DungeonId">("ragefire_chasm");
const normalRouteId = asBrandedId<"DungeonRouteVariantId">("normal_route");
const shortcutRouteId = asBrandedId<"DungeonRouteVariantId">("shortcut_route");

function routeContent() {
  const modules = structuredClone(browserContentModules) as Record<string, unknown>;
  const key = Object.keys(modules).find((path) =>
    path.endsWith("/content/dungeons/ragefire-chasm.json"),
  );
  if (!key) throw new Error("Expected Ragefire Chasm dungeon content");
  const dungeon = (
    modules[key] as {
      dungeons: Array<{
        route: Array<{ id: string }>;
        routeVariants?: unknown[];
      }>;
    }
  ).dungeons[0]!;
  dungeon.routeVariants = [
    {
      id: normalRouteId,
      name: { zhCN: "完整路线" },
      description: { zhCN: "依次挑战全部主要首领。" },
      requiredNodeIds: dungeon.route.map((node) => node.id),
    },
    {
      id: shortcutRouteId,
      name: { zhCN: "捷径路线" },
      description: { zhCN: "跳过中段守卫，直接前往终点。" },
      requiredNodeIds: [dungeon.route[0]!.id, dungeon.route.at(-1)!.id],
    },
  ];
  return loadContentRegistry(modules);
}

function newState(content: ReturnType<typeof routeContent>) {
  const state = createNewGame({
    slotId: asBrandedId<"SaveSlotId">("named-route"),
    content,
    contentVersion: asBrandedId<"ContentVersion">("classic-2019-phase-6"),
    clock: new FakeClock(1_000),
    ids: new LocalIdGenerator(),
    random: new SeededRandomSource("named-route"),
  });
  for (const member of Object.values(state.members)) member.progression.level = 45;
  return state;
}

describe("named dungeon routes", () => {
  it("requires a valid stable route ID and freezes only that route into the activity", async () => {
    const content = routeContent();
    const state = newState(content);
    const participantIds = Object.values(state.members).map((member) => member.id);

    expect(() =>
      startExpeditionCommand(
        { content, clock: new FakeClock(2_000) },
        { dungeonId, participantIds, requestedRuns: 1 },
      ).execute(state),
    ).toThrowError(/选择一条副本路线/);
    expect(() =>
      startExpeditionCommand(
        { content, clock: new FakeClock(2_000) },
        {
          dungeonId,
          participantIds,
          requestedRuns: 1,
          routeVariantId: asBrandedId<"DungeonRouteVariantId">("missing_route"),
        },
      ).execute(state),
    ).toThrowError(/路线不存在/);

    const activity = await startExpeditionCommand(
      { content, clock: new FakeClock(2_000) },
      { dungeonId, participantIds, requestedRuns: 1, routeVariantId: shortcutRouteId },
    ).execute(state);
    expect(activity.routeVariantId).toBe(shortcutRouteId);
    expect(activity.runPlans[0]!.stages.map((stage) => stage.routeNodeId)).toEqual([
      "oggleflint",
      "bazzalan",
    ]);

    const persisted = state.activities[activity.id];
    if (persisted?.type !== "expedition") throw new Error("Expected expedition");
    for (const stage of persisted.runPlans[0]!.stages) stage.successRoll = 0;
    new SettlementService(content).settleDueActivities(state, Number.MAX_SAFE_INTEGER);
    expect(persisted.status).toBe("completed");
    expect(state.history.dungeonClearCounts[dungeonId]).toBe(1);
  });

  it("defaults planning to the first variant and recalculates the selected route", () => {
    const content = routeContent();
    const state = newState(content);
    const participantIds = Object.values(state.members).map((member) => member.id);
    const normal = getDungeonPlanningView(state, content, dungeonId, participantIds, 1);
    const shortcut = getDungeonPlanningView(
      state,
      content,
      dungeonId,
      participantIds,
      1,
      [],
      shortcutRouteId,
    );

    expect(normal.selectedRouteVariantId).toBe(normalRouteId);
    expect(normal.routeVariants).toEqual([
      expect.objectContaining({ id: normalRouteId, selected: true }),
      expect.objectContaining({ id: shortcutRouteId, selected: false }),
    ]);
    expect(normal.preview?.encounters).toHaveLength(4);
    expect(shortcut.selectedRouteVariantId).toBe(shortcutRouteId);
    expect(shortcut.preview?.encounters).toHaveLength(2);
  });

  it("keeps optional and rare nodes available in every named variant", () => {
    const dungeon = {
      route: [
        { id: "first", type: "required", encounterId: "first" },
        { id: "normal_only", type: "required", encounterId: "normal_only" },
        {
          id: "optional_boss",
          type: "optional",
          encounterId: "optional_boss",
          description: { zhCN: "可选" },
        },
        {
          id: "rare_boss",
          type: "rare",
          encounterId: "rare_boss",
          spawnProbability: 0.2,
        },
      ],
      routeVariants: [
        {
          id: shortcutRouteId,
          name: { zhCN: "捷径" },
          description: { zhCN: "捷径" },
          requiredNodeIds: ["first"],
        },
      ],
    } as unknown as DungeonDefinition;

    expect(routeForVariant(dungeon, shortcutRouteId).map((node) => node.id)).toEqual([
      "first",
      "optional_boss",
      "rare_boss",
    ]);
  });
});
