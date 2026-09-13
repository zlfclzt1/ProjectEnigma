import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { RawContentModules } from "../src/content/loader";
import { loadContentRegistry } from "../src/content/registry";
import {
  startCraftingCommand,
  startGatheringCommand,
} from "../src/application/commands/start-profession-activities";
import { learnProfessionCommand } from "../src/application/commands/learn-profession";
import { learnRecipeCommand } from "../src/application/commands/learn-recipe";
import { startExpeditionCommand } from "../src/application/commands/start-expedition";
import { SettlementService } from "../src/application/services/settlement-service";
import { createNewGame } from "../src/domain/guild/new-game";
import { guildBankSlotUsage } from "../src/domain/inventory/guild-bank-rules";
import { asBrandedId } from "../src/domain/shared/ids";
import { LocalIdGenerator } from "../src/infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../src/infrastructure/random/seeded-random-source";
import { FakeClock } from "../tests/helpers/runtime-fakes";
import { getEconomyReport } from "../src/application/queries/get-economy-report";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const contentRoot = path.join(projectRoot, "content");
function discoverJsonFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return discoverJsonFiles(filePath);
    return entry.isFile() && entry.name.endsWith(".json") ? [filePath] : [];
  });
}
const modules: RawContentModules = Object.fromEntries(
  discoverJsonFiles(contentRoot).map((filePath) => [
    path.relative(projectRoot, filePath).split(path.sep).join("/"),
    JSON.parse(fs.readFileSync(filePath, "utf8")),
  ]),
);
const content = loadContentRegistry(modules);
const ids = {
  mining: asBrandedId<"ProfessionDefinitionId">("mining"),
  blacksmithing: asBrandedId<"ProfessionDefinitionId">("blacksmithing"),
  copperOre: asBrandedId<"ItemDefinitionId">("profession_copper_ore"),
  copperBar: asBrandedId<"ItemDefinitionId">("profession_copper_bar"),
  stone: asBrandedId<"ItemDefinitionId">("profession_coarse_sharpening_stone"),
};

const state = createNewGame({
  slotId: asBrandedId<"SaveSlotId">("profession-economy"),
  content,
  contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
  clock: new FakeClock(1_000),
  ids: new LocalIdGenerator(),
  random: new SeededRandomSource("profession-economy-baseline"),
});
const [miner, smith] = Object.values(state.members);
if (!miner || !smith) throw new Error("新游戏未生成测试成员。");
const settlement = new SettlementService(content);
const stackLimits = new Map(content.items.map((item) => [item.id, item.stackLimit ?? 1]));
let clock = 2_000;
let peakSlots = guildBankSlotUsage(state.guildBank, stackLimits);
let gatheringRuns = 0;
let gatheringOre = 0;
let smeltingRuns = 0;
let barsProduced = 0;
let forgingRuns = 0;
let equipmentProduced = 0;

function refreshPeak(): void {
  peakSlots = Math.max(peakSlots, guildBankSlotUsage(state.guildBank, stackLimits));
}

function settle(): void {
  settlement.settleDueActivities(state, Number.MAX_SAFE_INTEGER);
  refreshPeak();
}

await learnProfessionCommand(content, miner.id, ids.mining).execute(state);
await learnProfessionCommand(content, smith.id, ids.blacksmithing).execute(state);
await learnRecipeCommand(content, miner.id, asBrandedId("smelt_copper_bar")).execute(state);
await learnRecipeCommand(content, smith.id, asBrandedId("forge_copper_bracers")).execute(state);
const fundsAfterProfessionSetup = state.guild.funds;

for (let run = 0; run < 5; run += 1) {
  const before = state.guildBank.stackCounts[ids.copperOre] ?? 0;
  await startGatheringCommand(
    { content, clock: new FakeClock(clock) },
    { participantIds: [miner.id], siteId: asBrandedId("copper-vein-zone"), quantity: 1 },
  ).execute(state);
  settle();
  gatheringRuns += 1;
  gatheringOre += (state.guildBank.stackCounts[ids.copperOre] ?? 0) - before;
  clock += 1_000;
}

const oreForSmelting = Math.min(20, state.guildBank.stackCounts[ids.copperOre] ?? 0);
if (oreForSmelting > 0) {
  await startCraftingCommand(
    { content, clock: new FakeClock(clock) },
    {
      participantIds: [miner.id],
      recipeId: asBrandedId("smelt_copper_bar"),
      quantity: oreForSmelting,
    },
  ).execute(state);
  settle();
  smeltingRuns = 1;
  barsProduced = state.guildBank.stackCounts[ids.copperBar] ?? 0;
}

const forgeBatches = Math.min(
  10,
  Math.floor((state.guildBank.stackCounts[ids.copperBar] ?? 0) / 2),
);
if (forgeBatches > 0) {
  await startCraftingCommand(
    { content, clock: new FakeClock(clock) },
    {
      participantIds: [smith.id],
      recipeId: asBrandedId("forge_copper_bracers"),
      quantity: forgeBatches,
    },
  ).execute(state);
  settle();
  forgingRuns = 1;
  equipmentProduced = state.guildBank.equipmentInstanceIds.length;
}

state.guildBank.stackCounts[ids.stone] = 2;
const expedition = await startExpeditionCommand(
  { content, clock: new FakeClock(clock) },
  {
    dungeonId: asBrandedId("ragefire_chasm"),
    participantIds: Object.values(state.members).map((member) => member.id),
    requestedRuns: 3,
    supplyPlanId: asBrandedId("standard-blacksmithing-supply"),
  },
).execute(state);
const expeditionActivity = state.activities[expedition.id];
if (!expeditionActivity || expeditionActivity.type !== "expedition")
  throw new Error("远征活动创建失败。");
for (const stage of expeditionActivity.runPlans.flatMap((run) => run.stages)) stage.successRoll = 0;
settle();
const supply = expeditionActivity.supplySnapshot;

const report = {
  scenario: "5 次采集 → 熔炼 → 锻造 → 3 轮远征",
  professions: { trained: 2, gatheringRuns, smeltingRuns, forgingRuns },
  production: {
    copperOre: gatheringOre,
    copperBars: barsProduced,
    equipmentInstances: equipmentProduced,
  },
  supply: supply
    ? {
        requestedRuns: supply.requestedRuns,
        allocated: supply.entries.reduce((sum, entry) => sum + entry.allocatedQuantity, 0),
        consumed: supply.entries.reduce((sum, entry) => sum + entry.consumedQuantity, 0),
        released: supply.entries.reduce((sum, entry) => sum + (entry.releasedQuantity ?? 0), 0),
        downgradeRate:
          supply.entries.reduce(
            (sum, entry) => sum + entry.requiredQuantity - entry.allocatedQuantity,
            0,
          ) /
          Math.max(
            1,
            supply.entries.reduce((sum, entry) => sum + entry.requiredQuantity, 0),
          ),
        channels: supply.channels,
      }
    : null,
  gold: {
    starting: 100,
    afterProfessionSetup: fundsAfterProfessionSetup,
    ending: state.guild.funds,
    professionSpend: 100 - fundsAfterProfessionSetup,
    expeditionIncome: state.guild.funds - fundsAfterProfessionSetup,
  },
  bank: {
    peakSlots,
    endingSlots: guildBankSlotUsage(state.guildBank, stackLimits),
    capacitySlots: state.guildBank.capacitySlots,
  },
  observation: (() => {
    const economy = getEconomyReport(state);
    return {
      professionActivities: economy.professionActivities,
      expedition: economy.expedition,
      supply: economy.supply,
      materialNet: economy.materialNet,
    };
  })(),
  invariants: {
    nonNegativeStacks: Object.values(state.guildBank.stackCounts).every(
      (quantity) => quantity >= 0,
    ),
    noReservedStacks: Object.values(state.guildBank.reservedStackCounts ?? {}).every(
      (quantity) => quantity === 0,
    ),
    noReservedEquipmentSlots: (state.guildBank.reservedEquipmentSlots ?? 0) === 0,
  },
};

if (
  !report.invariants.nonNegativeStacks ||
  !report.invariants.noReservedStacks ||
  !report.invariants.noReservedEquipmentSlots
) {
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(report, null, 2));
}
