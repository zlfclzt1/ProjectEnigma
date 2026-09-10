import { describe, expect, it } from "vitest";
import { startExpeditionCommand } from "../../src/application/commands/start-expedition";
import { getCombatReportsView } from "../../src/application/queries/get-combat-reports-view";
import { getLootView } from "../../src/application/queries/get-loot-view";
import { settleDueActivitiesCommand } from "../../src/application/services/settlement-service";
import { browserContentModules, loadBrowserContentRegistry } from "../../src/content/manifest";
import { loadContentRegistry, type ContentRegistry } from "../../src/content/registry";
import { createNewGame } from "../../src/domain/guild/new-game";
import { asBrandedId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { FakeClock } from "../helpers/runtime-fakes";

const content = loadBrowserContentRegistry();

async function setup(registry: ContentRegistry = content) {
  const clock = new FakeClock(1_000);
  const state = createNewGame({
    slotId: asBrandedId<"SaveSlotId">("loot-report-query"),
    content: registry,
    contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
    clock,
    ids: new LocalIdGenerator(),
    random: new SeededRandomSource("loot-report-query"),
  });
  for (const member of Object.values(state.members)) member.progression.level = 45;
  const memberIds = Object.values(state.members).map((member) => member.id);
  const activity = await startExpeditionCommand(
    { content: registry, clock },
    {
      dungeonId: asBrandedId<"DungeonId">("ragefire_chasm"),
      participantIds: memberIds,
      requestedRuns: 2,
    },
  ).execute(state);
  for (const run of activity.runPlans) for (const stage of run.stages) stage.successRoll = 0;
  return { clock, state, activity, memberIds };
}

function contentWithTwoRagefireDrops(): ContentRegistry {
  const modules = structuredClone(browserContentModules) as Record<string, unknown>;
  const key = Object.keys(modules).find((path) =>
    path.endsWith("/content/loot-tables/ragefire-chasm.json"),
  );
  if (!key) throw new Error("Expected ragefire loot content");
  const file = modules[key] as {
    lootTables: Array<{ id: string; guaranteedEquipmentDrops: number }>;
  };
  const table = file.lootTables.find((entry) => entry.id === "ragefire_chasm_common_equipment");
  if (!table) throw new Error("Expected ragefire common equipment table");
  table.guaranteedEquipmentDrops = 2;
  return loadContentRegistry(modules);
}

function contentWithRagefireSuffixes(): ContentRegistry {
  const modules = structuredClone(browserContentModules) as Record<string, unknown>;
  const key = Object.keys(modules).find((path) =>
    path.endsWith("/content/items/ragefire-chasm.json"),
  );
  if (!key) throw new Error("Expected ragefire item content");
  const file = modules[key] as {
    items: Array<{ id: string; randomSuffixIds?: string[] }>;
  };
  for (const item of file.items.filter((entry) => entry.id.startsWith("154"))) {
    item.randomSuffixIds = ["prototype_of_readiness"];
  }
  return loadContentRegistry(modules);
}

describe("loot and combat report queries", () => {
  it("locks mid-run loot and unlocks it with participant-only upgrade comparisons", async () => {
    const { clock, state, activity, memberIds } = await setup();
    clock.set(activity.nextSettlementAt);
    await settleDueActivitiesCommand({ content, clock }).execute(state);

    const locked = getLootView(state, content);
    expect(locked.pending).toHaveLength(1);
    expect(locked.lockedCount).toBe(1);
    expect(locked.pending[0]?.candidates.map((candidate) => candidate.memberId)).toEqual(
      expect.arrayContaining(memberIds),
    );
    expect(locked.pending[0]?.item.iconUrl).toContain("wow.zamimg.com");

    clock.set(24 * 60 * 60 * 1_000);
    await settleDueActivitiesCommand({ content, clock }).execute(state);
    const unlocked = getLootView(state, content);

    expect(unlocked.pending).toHaveLength(8);
    expect(unlocked.lockedCount).toBe(0);
    expect(unlocked.pending.every((entry) => entry.candidates.length === memberIds.length)).toBe(
      true,
    );
    expect(
      unlocked.pending.some((entry) =>
        entry.candidates.some(
          (candidate) => candidate.equippable && typeof candidate.primaryDelta === "number",
        ),
      ),
    ).toBe(true);
  });

  it("rebuilds factual reports and playful logs from settled activity data", async () => {
    const { clock, state } = await setup();
    clock.set(24 * 60 * 60 * 1_000);
    await settleDueActivitiesCommand({ content, clock }).execute(state);

    const reports = getCombatReportsView(state, content).reports;

    expect(reports).toHaveLength(8);
    expect(reports[0]).toMatchObject({
      dungeonName: "怒焰裂谷",
      outcome: "victory",
      outcomeLabel: "胜利",
      formulaVersion: "classic-light-v1",
    });
    expect(reports[0]!.members).toHaveLength(5);
    expect(reports[0]!.logs.length).toBeGreaterThan(0);
    expect(reports[0]!.totals.damage).toBeGreaterThan(0);
    expect(reports[0]!.rewards.itemNames).toHaveLength(1);
  });

  it("projects every item from a multi-drop settlement into loot and reports", async () => {
    const multiDropContent = contentWithTwoRagefireDrops();
    const { clock, state, activity } = await setup(multiDropContent);
    clock.set(activity.nextSettlementAt);
    await settleDueActivitiesCommand({ content: multiDropContent, clock }).execute(state);

    const loot = getLootView(state, multiDropContent);
    const reports = getCombatReportsView(state, multiDropContent).reports;

    expect(loot.pending).toHaveLength(2);
    expect(loot.lockedCount).toBe(2);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.rewards.itemNames).toHaveLength(2);
  });

  it("uses the same resolved suffix name in loot and combat reports", async () => {
    const suffixContent = contentWithRagefireSuffixes();
    const { clock, state, activity } = await setup(suffixContent);
    clock.set(activity.nextSettlementAt);
    await settleDueActivitiesCommand({ content: suffixContent, clock }).execute(state);

    const loot = getLootView(state, suffixContent);
    const reports = getCombatReportsView(state, suffixContent).reports;

    expect(loot.pending).toHaveLength(1);
    expect(loot.pending[0]!.item.name).toMatch(/^整备之/);
    expect(loot.pending[0]!.item.randomSuffix?.stats).toEqual([
      expect.objectContaining({ id: "staminaPoints", value: "+1" }),
    ]);
    expect(reports[0]!.rewards.itemNames).toEqual([loot.pending[0]!.item.name]);
  });
});
