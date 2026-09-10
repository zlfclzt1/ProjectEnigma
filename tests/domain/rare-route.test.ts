import { describe, expect, it } from "vitest";
import type { DungeonRouteNode } from "../../src/content/schemas/dungeon";
import type { ExpeditionRunPlan } from "../../src/domain/activity/activity";
import { lockRareRouteSpawns, revealRareRouteNodes } from "../../src/domain/dungeon/rare-route";
import { asBrandedId } from "../../src/domain/shared/ids";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";

const route: DungeonRouteNode[] = [
  {
    id: asBrandedId<"DungeonRouteNodeId">("required_boss"),
    type: "required",
    encounterId: asBrandedId<"EncounterId">("required_boss"),
  },
  {
    id: asBrandedId<"DungeonRouteNodeId">("rare_boss"),
    type: "rare",
    encounterId: asBrandedId<"EncounterId">("rare_boss"),
    spawnProbability: 0.5,
  },
];
const rareNodeId = asBrandedId<"DungeonRouteNodeId">("rare_boss");

describe("rare route spawn locks", () => {
  it("is deterministic for a run seed and records only rare nodes", () => {
    const first = lockRareRouteSpawns(route, new SeededRandomSource("activity:run:1"));
    const second = lockRareRouteSpawns(route, new SeededRandomSource("activity:run:1"));

    expect(first).toEqual(second);
    expect(Object.keys(first)).toEqual(["rare_boss"]);
    expect(typeof first[rareNodeId]).toBe("boolean");
  });

  it("lets consecutive run seeds resolve independently", () => {
    const outcomes = Array.from({ length: 5 }, (_, index) =>
      lockRareRouteSpawns(route, new SeededRandomSource(`activity:run:${index + 1}`)),
    ).map((locks) => locks[rareNodeId]);

    expect(new Set(outcomes).size).toBeGreaterThan(1);
  });

  it("allows at most one rare boss from the same spawn group", () => {
    const groupedRoute: DungeonRouteNode[] = [
      route[0]!,
      ...["azshir", "fallen_champion", "ironspine"].map((id, index) => ({
        id: asBrandedId<"DungeonRouteNodeId">(id),
        type: "rare" as const,
        encounterId: asBrandedId<"EncounterId">(id),
        spawnProbability: index === 2 ? 0.34 : 0.33,
        spawnGroup: "graveyard_rare",
      })),
    ];

    for (let index = 0; index < 100; index += 1) {
      const locks = lockRareRouteSpawns(
        groupedRoute,
        new SeededRandomSource(`graveyard:run:${index}`),
      );
      expect(Object.values(locks).filter(Boolean)).toHaveLength(1);
    }
  });

  it("reveals a locked outcome only when progress reaches the rare node", () => {
    const run = {
      rareNodeSpawns: { [rareNodeId]: true },
      rareNodeReveals: {},
    } as ExpeditionRunPlan;

    expect(revealRareRouteNodes(run, route, route[0]!.id)).toEqual([]);
    expect(run.rareNodeReveals).toEqual({});
    expect(revealRareRouteNodes(run, route, rareNodeId)).toEqual([
      { nodeId: rareNodeId, outcome: "spawned" },
    ]);
    expect(revealRareRouteNodes(run, route, rareNodeId)).toEqual([]);
    expect(run.rareNodeReveals).toEqual({ [rareNodeId]: "spawned" });
  });
});
