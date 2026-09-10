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
  const locks: Partial<Record<DungeonRouteNodeId, boolean>> = {};
  const groups = new Map<string, Extract<DungeonRouteNode, { type: "rare" }>[]>();
  for (const node of route) {
    if (node.type !== "rare") continue;
    if (!node.spawnGroup) {
      locks[node.id] = random.next(`rare:${node.id}`) < node.spawnProbability;
      continue;
    }
    const nodes = groups.get(node.spawnGroup) ?? [];
    nodes.push(node);
    groups.set(node.spawnGroup, nodes);
  }
  for (const [group, nodes] of groups) {
    const roll = random.next(`rare-group:${group}`);
    let cumulative = 0;
    let selected: DungeonRouteNodeId | undefined;
    for (const node of nodes) {
      cumulative += node.spawnProbability;
      if (!selected && roll < cumulative) selected = node.id;
    }
    for (const node of nodes) locks[node.id] = node.id === selected;
  }
  return Object.freeze(locks);
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
