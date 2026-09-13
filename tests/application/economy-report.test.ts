import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { createNewGame } from "../../src/domain/guild/new-game";
import { asBrandedId } from "../../src/domain/shared/ids";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { FakeClock } from "../helpers/runtime-fakes";
import { recordEconomyEvent } from "../../src/domain/economy/economy-ledger";
import { getEconomyReport } from "../../src/application/queries/get-economy-report";
import { organizeGuildBankCommand } from "../../src/application/commands/organize-guild-bank";

const content = loadBrowserContentRegistry();

function state() {
  return createNewGame({
    slotId: asBrandedId("economy-report"),
    content,
    contentVersion: asBrandedId("classic-v1"),
    clock: new FakeClock(1_000),
    ids: new LocalIdGenerator(),
    random: new SeededRandomSource("economy-report"),
  });
}

describe("economy report and guild bank operations", () => {
  it("aggregates gold and material flow by kind/source", () => {
    const draft = state();
    recordEconomyEvent(draft, {
      kind: "gold-income",
      source: "expedition-reward",
      amount: 50,
      occurredAt: 1_000,
    });
    recordEconomyEvent(draft, {
      kind: "gold-expense",
      source: "recipe-learning",
      amount: 20,
      occurredAt: 2_000,
    });
    recordEconomyEvent(draft, {
      kind: "material-output",
      source: "gathering",
      itemId: asBrandedId("profession_copper_ore"),
      quantity: 4,
      occurredAt: 2_000,
    });
    recordEconomyEvent(draft, {
      kind: "material-input",
      source: "crafting",
      itemId: asBrandedId("profession_copper_ore"),
      quantity: 1,
      occurredAt: 3_000,
    });
    const report = getEconomyReport(draft, 2_000, 3_000);
    expect(report.goldIncome).toBe(0);
    expect(report.goldExpense).toBe(20);
    expect(report.goldNet).toBe(-20);
    expect(report.materialNet).toEqual([{ itemId: "profession_copper_ore", quantity: 3 }]);
    expect(report.bySource[0]?.source).toBe("recipe-learning");
    expect(report.bySource[0]?.amount).toBe(20);
    expect(report.bySource[0]?.quantity).toBe(0);
    expect(report.supply.downgradeRate).toBe(0);
    expect(report.professionActivities.total).toBe(0);
  });

  it("organizes stacks and equipment deterministically", () => {
    const draft = state();
    draft.guildBank.stackCounts = {
      profession_rough_stone: 2,
      profession_copper_ore: 1,
    } as never;
    const equipment = Object.values(draft.itemInstances).slice(0, 2);
    draft.guildBank.equipmentInstanceIds = equipment.map((item) => item.id).reverse();
    expect(organizeGuildBankCommand(content).execute(draft)).toBe(true);
    expect(Object.keys(draft.guildBank.stackCounts)).toEqual([
      "profession_rough_stone",
      "profession_copper_ore",
    ]);
    expect(draft.guildBank.equipmentInstanceIds).toHaveLength(2);
  });
});
