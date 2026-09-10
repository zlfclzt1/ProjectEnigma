import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import {
  BASE_MEMBER_CAPACITY,
  getMemberCapacity,
} from "../../src/domain/guild/guild-upgrade-rules";
import { asBrandedId } from "../../src/domain/shared/ids";
import { createGameStateFixture } from "../helpers/game-state-v2-factory";

describe("guild upgrade rules", () => {
  it("derives member capacity only from purchased upgrade definitions", () => {
    const content = loadBrowserContentRegistry();
    const state = createGameStateFixture();

    expect(getMemberCapacity(state, content)).toBe(BASE_MEMBER_CAPACITY);
    state.guild.purchasedUpgradeIds.push(asBrandedId<"GuildUpgradeId">("guild_roster_15"));
    expect(getMemberCapacity(state, content)).toBe(15);
    state.guild.purchasedUpgradeIds.push(asBrandedId<"GuildUpgradeId">("guild_roster_20"));
    expect(getMemberCapacity(state, content)).toBe(20);
  });
});
