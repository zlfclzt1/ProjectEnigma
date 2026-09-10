import type {
  DungeonDefinition,
  DungeonRouteNode,
  DungeonRouteVariant,
} from "../../content/schemas/dungeon";
import type { DungeonRouteVariantId } from "../shared/ids";

export function getDungeonRouteVariant(
  dungeon: DungeonDefinition,
  routeVariantId: DungeonRouteVariantId | undefined,
): DungeonRouteVariant | undefined {
  return dungeon.routeVariants?.find((variant) => variant.id === routeVariantId);
}

export function routeForVariant(
  dungeon: DungeonDefinition,
  routeVariantId: DungeonRouteVariantId | undefined,
): readonly DungeonRouteNode[] {
  const variant = getDungeonRouteVariant(dungeon, routeVariantId);
  if (!variant) return dungeon.route;
  const requiredNodeIds = new Set(variant.requiredNodeIds);
  return dungeon.route.filter((node) => node.type !== "required" || requiredNodeIds.has(node.id));
}
