import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPartyPreview } from "../src/application/queries/get-party-preview";
import type { ContentRegistry } from "../src/content/registry";
import { loadContentRegistry } from "../src/content/registry";
import { equipItem } from "../src/domain/equipment/equipment";
import type { ItemInstance } from "../src/domain/equipment/item-instance";
import { evaluateUpgrade } from "../src/domain/equipment/upgrade-evaluation";
import type { GameState } from "../src/domain/game-state";
import { createNewGame } from "../src/domain/guild/new-game";
import { asBrandedId, type DungeonId, type DungeonRouteNodeId } from "../src/domain/shared/ids";
import { LocalIdGenerator } from "../src/infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../src/infrastructure/random/seeded-random-source";

export type BalanceScenario =
  "standard" | "no-tank" | "no-healing" | "overlevel" | "max-level" | "speed-run";
export type RouteVariant = "required" | "with-optional" | "with-rare";

export interface DungeonSimulationResult {
  readonly dungeonId: string;
  readonly samplesPerScenario: number;
  readonly scenarios: Readonly<
    Record<BalanceScenario, Readonly<Record<RouteVariant, SimulationMetrics>>>
  >;
}

export interface SimulationMetrics {
  readonly level: number;
  readonly simulatedRuns: number;
  readonly clearRate: number;
  readonly previewClearProbability: number;
  readonly durationSeconds: number;
  readonly wipeCounts: Readonly<Record<string, number>>;
}

function gearedState(content: ContentRegistry, level: number, seed: string): GameState {
  const state = createNewGame({
    slotId: asBrandedId<"SaveSlotId">(`single_sim_${seed}`),
    content,
    contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
    clock: { now: () => 1_000 },
    ids: new LocalIdGenerator(),
    random: new SeededRandomSource(seed),
  });
  for (const member of Object.values(state.members)) {
    member.progression.level = level;
    for (const definition of content.items.filter(
      (item) => !item.isStarter && (item.requiredLevel ?? 1) <= level,
    )) {
      const instance: ItemInstance = {
        id: asBrandedId<"ItemInstanceId">(`single_${seed}_${member.id}_${definition.id}`),
        definitionId: definition.id,
        bound: false,
        acquiredAt: 1_000,
        source: { type: "grant", reasonId: "balance-simulation" },
        enchantmentIds: [],
      };
      state.itemInstances[instance.id] = instance;
      const evaluation = evaluateUpgrade(member, instance, state, content);
      if (
        evaluation.equippable &&
        evaluation.primaryResponsibilityDelta > 1e-9 &&
        evaluation.recommendationScore > 1e-9
      ) {
        const result = equipItem(
          member,
          instance,
          { content, itemInstances: state.itemInstances },
          evaluation.replacementSlot,
        );
        state.members[member.id] = result.member;
        state.itemInstances[instance.id] = result.equippedInstance;
      } else delete state.itemInstances[instance.id];
    }
  }
  return state;
}

function replaceRole(
  state: GameState,
  content: ContentRegistry,
  role: "tank" | "healer",
): GameState {
  const clone = structuredClone(state);
  const member = Object.values(clone.members).find(
    (candidate) => content.specById.get(candidate.progression.specId)?.role === role,
  );
  if (!member) throw new Error(`标准模拟队缺少${role === "tank" ? "坦克" : "治疗"}。`);
  const replacement =
    content.specs.find((spec) => spec.classId === member.identity.classId && spec.role === "dps") ??
    content.specs.find((spec) => spec.role === "dps");
  if (!replacement) throw new Error("内容没有可用输出专精。");
  member.progression.specId = replacement.id;
  member.identity.classId = content.specById.get(replacement.id)!.classId;
  return clone;
}

function routeSelection(content: ContentRegistry, dungeonId: DungeonId, variant: RouteVariant) {
  const dungeon = content.dungeonById.get(dungeonId)!;
  const rareNodes = dungeon.route.filter((node) => node.type === "rare");
  const groupedRareIds = new Set<DungeonRouteNodeId>();
  const groupRepresentatives: DungeonRouteNodeId[] = [];
  const groups = new Map<string, typeof rareNodes>();
  for (const node of rareNodes) {
    if (!node.spawnGroup) continue;
    groupedRareIds.add(node.id);
    const nodes = groups.get(node.spawnGroup) ?? [];
    groups.set(node.spawnGroup, [...nodes, node]);
  }
  for (const nodes of groups.values()) groupRepresentatives.push(nodes[0]!.id);
  return {
    optional:
      variant === "with-optional"
        ? dungeon.route.filter((node) => node.type === "optional").map((node) => node.id)
        : [],
    rare:
      variant === "with-rare"
        ? [
            ...groupRepresentatives,
            ...rareNodes.filter((node) => !groupedRareIds.has(node.id)).map((node) => node.id),
          ]
        : [],
    routeVariantId: dungeon.routeVariants?.[0]?.id,
  };
}

function scenarioLevel(recommendedLevel: number, scenario: BalanceScenario): number {
  if (scenario === "overlevel") return Math.max(1, recommendedLevel - 3);
  if (scenario === "max-level" || scenario === "speed-run") {
    return recommendedLevel > 45 ? 60 : 45;
  }
  return recommendedLevel;
}

function runScenario(
  content: ContentRegistry,
  dungeonId: DungeonId,
  scenario: BalanceScenario,
  variant: RouteVariant,
  samples: number,
  seed: string,
): SimulationMetrics {
  const dungeon = content.dungeonById.get(dungeonId);
  if (!dungeon) throw new Error(`未知副本 ${dungeonId}`);
  const level = scenarioLevel(dungeon.recommendedLevel, scenario);
  const previews = Array.from({ length: 5 }, (_, index) => {
    let state = gearedState(content, level, `${seed}:${scenario}:${variant}:${index}`);
    if (scenario === "no-tank") state = replaceRole(state, content, "tank");
    if (scenario === "no-healing") state = replaceRole(state, content, "healer");
    const memberIds = Object.values(state.members).map((member) => member.id);
    const selection = routeSelection(content, dungeonId, variant);
    const result = getPartyPreview(
      state,
      content,
      dungeonId,
      memberIds,
      selection.optional,
      selection.rare,
      selection.routeVariantId,
    );
    if (!result.ok) throw new Error(result.issues.map((issue) => issue.message).join(" "));
    return result.preview;
  });
  const random = new SeededRandomSource(`single:${seed}:${scenario}:${variant}:${samples}`);
  let cleared = 0;
  const wipeCounts: Record<string, number> = {};
  for (let sample = 0; sample < samples; sample += 1) {
    const preview = previews[sample % previews.length]!;
    let success = true;
    for (const encounter of preview.encounters) {
      if (random.next(`sample:${sample}:${encounter.encounterId}`) >= encounter.probability) {
        wipeCounts[encounter.encounterId] = (wipeCounts[encounter.encounterId] ?? 0) + 1;
        success = false;
        break;
      }
    }
    if (success) cleared += 1;
  }
  return {
    level,
    simulatedRuns: samples,
    clearRate: cleared / samples,
    previewClearProbability:
      previews.reduce((sum, preview) => sum + preview.clearProbability, 0) / previews.length,
    durationSeconds:
      previews.reduce((sum, preview) => sum + preview.durationSeconds, 0) / previews.length,
    wipeCounts,
  };
}

export function simulateDungeon(
  content: ContentRegistry,
  dungeonId: DungeonId,
  samples = 10_000,
  seed = "default",
): DungeonSimulationResult {
  const scenarios: BalanceScenario[] = [
    "standard",
    "no-tank",
    "no-healing",
    "overlevel",
    "max-level",
    "speed-run",
  ];
  const variants: RouteVariant[] = ["required", "with-optional", "with-rare"];
  return {
    dungeonId,
    samplesPerScenario: samples,
    scenarios: Object.fromEntries(
      scenarios.map((scenario) => [
        scenario,
        Object.fromEntries(
          variants.map((variant) => [
            variant,
            runScenario(content, dungeonId, scenario, variant, samples, seed),
          ]),
        ),
      ]),
    ) as DungeonSimulationResult["scenarios"],
  };
}

export function loadContentFromDisk(): ContentRegistry {
  const projectRoot = fileURLToPath(new URL("../", import.meta.url));
  const modules: Record<string, unknown> = {};
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(entryPath);
      else if (entry.name.endsWith(".json")) {
        modules[path.relative(projectRoot, entryPath)] = JSON.parse(
          fs.readFileSync(entryPath, "utf8"),
        );
      }
    }
  };
  visit(path.join(projectRoot, "content"));
  return loadContentRegistry(modules);
}
