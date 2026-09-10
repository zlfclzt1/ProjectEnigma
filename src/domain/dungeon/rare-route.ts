import type { RandomSource } from "../../application/ports/random-source";
import type { DungeonRouteNode } from "../../content/schemas/dungeon";
import type { DungeonRouteNodeId } from "../shared/ids";
import type { ExpeditionRunPlan } from "../activity/activity";

export type RareRouteSpawnLocks = Readonly<Partial<Record<DungeonRouteNodeId, boolean>>>;
export type RareRouteRevealOutcome = "spawned" | "absent";
export type RareRouteReveals = Partial<Record<DungeonRouteNodeId, RareRouteRevealOutcome>>;

export interface RareRouteRevealEvent {
  readonly nodeId: DungeonRouteNodeId;
  readonly outcome: RareRouteRevealOutcome;
}

export function lockRareRouteSpawns(
  route: readonly DungeonRouteNode[],
  random: RandomSource,
): RareRouteSpawnLocks {
  return Object.freeze(
    Object.fromEntries(
      route.flatMap((node) =>
        node.type === "rare"
          ? [[node.id, random.next(`rare:${node.id}`) < node.spawnProbability]]
          : [],
      ),
    ) as Partial<Record<DungeonRouteNodeId, boolean>>,
  );
}

export function revealRareRouteNodes(
  run: ExpeditionRunPlan,
  route: readonly DungeonRouteNode[],
  throughNodeId?: DungeonRouteNodeId,
): readonly RareRouteRevealEvent[] {
  const stopIndex = throughNodeId
    ? route.findIndex((node) => node.id === throughNodeId)
    : route.length - 1;
  if (stopIndex < 0) return [];

  const reveals = (run.rareNodeReveals ??= {});
  const events: RareRouteRevealEvent[] = [];
  for (const node of route.slice(0, stopIndex + 1)) {
    if (node.type !== "rare" || reveals[node.id]) continue;
    const outcome = run.rareNodeSpawns?.[node.id] === true ? "spawned" : "absent";
    reveals[node.id] = outcome;
    events.push({ nodeId: node.id, outcome });
  }
  return events;
}
