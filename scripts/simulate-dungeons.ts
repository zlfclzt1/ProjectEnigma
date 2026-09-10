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
import { asBrandedId, type DungeonId } from "../src/domain/shared/ids";
import { LocalIdGenerator } from "../src/infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../src/infrastructure/random/seeded-random-source";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const fixturePath = path.join(projectRoot, "tests/fixtures/v2-dungeon-balance.json");
const samples = Number(process.argv.find((argument) => /^\d+$/.test(argument)) ?? 100_000);
const partyVariants = 100;
const legacyBaselineDungeonIds = new Set([
  "ragefire_chasm",
  "wailing_caverns",
  "deadmines",
  "shadowfang_keep",
]);

function contentRegistry(): ContentRegistry {
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

function gearedState(content: ContentRegistry, level: number, seed: string): GameState {
  const state = createNewGame({
    slotId: asBrandedId<"SaveSlotId">(`simulation_${seed}`),
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
        id: asBrandedId<"ItemInstanceId">(`sim_${seed}_${member.id}_${definition.id}`),
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

function withoutTank(state: GameState, content: ContentRegistry): GameState {
  const clone = structuredClone(state);
  const tank = Object.values(clone.members).find(
    (member) => content.specById.get(member.progression.specId)?.role === "tank",
  );
  if (!tank) throw new Error("标准模拟队缺少坦克。");
  const replacement = content.specs.find(
    (spec) => spec.classId === tank.identity.classId && spec.role === "dps",
  );
  tank.progression.specId =
    replacement?.id ?? content.specs.find((spec) => spec.role === "dps")!.id;
  tank.identity.classId = content.specById.get(tank.progression.specId)!.classId;
  return clone;
}

function percentile(values: readonly number[], ratio: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio))]!;
}

function scenario(
  content: ContentRegistry,
  dungeonId: DungeonId,
  level: number,
  mode: "standard" | "no-tank",
) {
  const previews = Array.from({ length: partyVariants }, (_, index) => {
    let state = gearedState(content, level, `${dungeonId}:${mode}:${level}:${index}`);
    if (mode === "no-tank") state = withoutTank(state, content);
    const memberIds = Object.values(state.members).map((member) => member.id);
    const result = getPartyPreview(state, content, dungeonId, memberIds);
    if (!result.ok) throw new Error(result.issues.map((issue) => issue.message).join(" "));
    return result.preview;
  });
  const random = new SeededRandomSource(`simulation:${dungeonId}:${mode}:${level}:${samples}`);
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
  const probabilities = previews.map((preview) => preview.clearProbability);
  const durations = previews.map((preview) => preview.durationSeconds);
  return {
    level,
    equipment: "best-compatible-real-drops-at-level",
    simulatedRuns: samples,
    simulatedClearRate: cleared / samples,
    previewClearProbability: {
      mean: probabilities.reduce((sum, value) => sum + value, 0) / probabilities.length,
      p10: percentile(probabilities, 0.1),
      p50: percentile(probabilities, 0.5),
      p90: percentile(probabilities, 0.9),
    },
    durationSeconds: {
      mean: durations.reduce((sum, value) => sum + value, 0) / durations.length,
      p10: percentile(durations, 0.1),
      p50: percentile(durations, 0.5),
      p90: percentile(durations, 0.9),
    },
    wipeCounts,
  };
}

const content = contentRegistry();
const output = {
  schemaVersion: 1,
  formulaVersion: "classic-light-v1",
  samplesPerScenario: samples,
  partyVariants,
  dungeons: content.dungeons
    .filter((dungeon) => legacyBaselineDungeonIds.has(dungeon.id))
    .map((dungeon) => ({
      id: dungeon.id,
      recommendedStandard: scenario(content, dungeon.id, dungeon.recommendedLevel, "standard"),
      recommendedNoTank: scenario(content, dungeon.id, dungeon.recommendedLevel, "no-tank"),
      maxLevelStandard: scenario(content, dungeon.id, 45, "standard"),
    })),
};
const serialized = `${JSON.stringify(output, null, 2)}\n`;
if (process.argv.includes("--write")) {
  fs.writeFileSync(fixturePath, serialized);
  console.log(`已写入 ${path.relative(projectRoot, fixturePath)}。`);
} else if (process.argv.includes("--check")) {
  const existing = fs.readFileSync(fixturePath, "utf8");
  if (existing !== serialized) throw new Error("V2 四副本平衡基线已漂移，请核对后执行 --write。");
  console.log(`V2 四副本 ${samples.toLocaleString()} 样本基线一致。`);
} else console.log(serialized);
