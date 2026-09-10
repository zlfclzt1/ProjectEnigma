import { describe, expect, it } from "vitest";
import { purchaseGuildUpgradeCommand } from "../../src/application/commands/purchase-guild-upgrade";
import { getGuildUpgradeView } from "../../src/application/queries/get-guild-upgrade-view";
import { GameSession } from "../../src/application/services/game-session";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import {
  getExpeditionRunCapacity,
  getMemberCapacity,
} from "../../src/domain/guild/guild-upgrade-rules";
import { asBrandedId } from "../../src/domain/shared/ids";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { createGameStateFixture } from "../helpers/game-state-v2-factory";

const content = loadBrowserContentRegistry();
const firstUpgradeId = asBrandedId<"GuildUpgradeId">("guild_roster_15");
const secondUpgradeId = asBrandedId<"GuildUpgradeId">("guild_roster_20");
const thirdUpgradeId = asBrandedId<"GuildUpgradeId">("guild_roster_25");
const deadminesId = asBrandedId<"DungeonId">("deadmines");
const shadowfangId = asBrandedId<"DungeonId">("shadowfang_keep");
const cathedralId = asBrandedId<"DungeonId">("scarlet_monastery_cathedral");
const queueUpgradeId = asBrandedId<"GuildUpgradeId">("expedition_queue_5");

async function sessionFor(state = createGameStateFixture()) {
  const saves = new MemorySaveRepository();
  await saves.create(state);
  return GameSession.fromState(saves, state);
}

describe("guild upgrades", () => {
  it("projects only the next upgrade with exact requirement and funding progress", () => {
    const state = createGameStateFixture();
    state.guild.funds = 120;

    expect(getGuildUpgradeView(state, content)).toMatchObject({
      memberCapacity: 10,
      atCurrentMaximum: false,
      hasPurchasableUpgrade: false,
      nextUpgrade: {
        id: "guild_roster_15",
        cost: 500,
        targetMemberCapacity: 15,
        requirements: [{ dungeonId: "deadmines", current: 0, target: 1, met: false }],
        blockedReasons: ["死亡矿井完整通关 0/1", "公会资金还缺 380 G"],
      },
    });

    state.history.dungeonClearCounts[deadminesId] = 1;
    state.guild.funds = 500;
    expect(getGuildUpgradeView(state, content).nextUpgrade?.canPurchase).toBe(true);
  });

  it("requires strict purchase order while honoring clears earned in advance", async () => {
    const state = createGameStateFixture();
    state.guild.funds = 2_500;
    state.history.dungeonClearCounts[deadminesId] = 1;
    state.history.dungeonClearCounts[shadowfangId] = 1;
    const session = await sessionFor(state);

    await expect(
      session.execute(purchaseGuildUpgradeCommand(content, secondUpgradeId)),
    ).rejects.toThrow(/按顺序/);
    const first = await session.execute(purchaseGuildUpgradeCommand(content, firstUpgradeId));
    expect(first.status).toBe("committed");
    expect(first.status === "committed" ? first.result.memberCapacity : 0).toBe(15);
    expect(getGuildUpgradeView(session.snapshot(), content).nextUpgrade?.id).toBe(secondUpgradeId);

    const second = await session.execute(purchaseGuildUpgradeCommand(content, secondUpgradeId));
    expect(second.status).toBe("committed");
    expect(session.snapshot().guild.funds).toBe(500);
    expect(getMemberCapacity(session.snapshot(), content)).toBe(20);
    expect(getGuildUpgradeView(session.snapshot(), content).nextUpgrade?.id).toBe(thirdUpgradeId);
  });

  it("unlocks the 25-member expansion after a Cathedral clear and still requires funds", async () => {
    const state = createGameStateFixture();
    state.guild.funds = 6_000;
    state.guild.purchasedUpgradeIds = [firstUpgradeId, secondUpgradeId];
    state.history.dungeonClearCounts[cathedralId] = 1;
    const session = await sessionFor(state);

    const result = await session.execute(purchaseGuildUpgradeCommand(content, thirdUpgradeId));

    expect(result.status).toBe("committed");
    expect(getMemberCapacity(session.snapshot(), content)).toBe(25);
    expect(session.snapshot().guild.funds).toBe(2_000);
    expect(getGuildUpgradeView(session.snapshot(), content).atCurrentMaximum).toBe(true);
  });

  it("never charges twice when the same upgrade is requested concurrently", async () => {
    const state = createGameStateFixture();
    state.guild.funds = 1_000;
    state.history.dungeonClearCounts[deadminesId] = 1;
    const session = await sessionFor(state);
    const command = purchaseGuildUpgradeCommand(content, firstUpgradeId);

    const results = await Promise.allSettled([session.execute(command), session.execute(command)]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(session.snapshot().guild.funds).toBe(500);
    expect(session.snapshot().guild.purchasedUpgradeIds).toEqual([firstUpgradeId]);
  });

  it("purchases the five-run queue independently after the Shadowfang milestone", async () => {
    const state = createGameStateFixture();
    state.guild.funds = 1_000;
    state.history.dungeonClearCounts[shadowfangId] = 1;
    const session = await sessionFor(state);

    const result = await session.execute(purchaseGuildUpgradeCommand(content, queueUpgradeId));

    expect(result.status).toBe("committed");
    expect(result.status === "committed" ? result.result.expeditionRunCapacity : 0).toBe(5);
    expect(getExpeditionRunCapacity(session.snapshot(), content)).toBe(5);
    expect(session.snapshot().guild.funds).toBe(0);
  });
});
