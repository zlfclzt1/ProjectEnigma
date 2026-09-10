import { describe, expect, it } from "vitest";
import { loadOrCreateV2Client } from "../../src/app/client-bootstrap";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";
import { migrateSave } from "../../src/infrastructure/persistence/migrations/migrate-save";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { FakeClock } from "../helpers/runtime-fakes";
import { createLegacyGameStateV2Fixture } from "../helpers/game-state-v2-factory";

const content = loadBrowserContentRegistry();

describe("save migrations", () => {
  it("migrates V2 capacity and complete first-kill routes into V3 facts", () => {
    const legacy = createLegacyGameStateV2Fixture();
    legacy.guild.memberCapacity = 20;
    legacy.guild.firstKillEncounterIds = [
      ...content.dungeonById.get(asBrandedId<"DungeonId">("deadmines"))!.route,
    ];

    const result = migrateSave(legacy, content);

    expect(result.migrated).toBe(true);
    expect(result.state.saveVersion).toBe(3);
    expect(result.state.guild).not.toHaveProperty("memberCapacity");
    expect(result.state.guild.purchasedUpgradeIds).toEqual(["guild_roster_15", "guild_roster_20"]);
    expect(result.state.history.dungeonClearCounts).toEqual({ deadmines: 1 });
  });

  it("persists an automatic V2 migration during client bootstrap", async () => {
    const legacy = createLegacyGameStateV2Fixture();
    const saves = new MemorySaveRepository([legacy]);

    const loaded = await loadOrCreateV2Client({
      saves,
      content,
      clock: new FakeClock(2_000),
      slotId: legacy.slotId,
    });

    expect(loaded.origin).toBe("loaded");
    expect(loaded.session.snapshot()).toMatchObject({ saveVersion: 3, revision: 1 });
    const persisted = await saves.load(legacy.slotId);
    expect(persisted?.saveVersion).toBe(3);
  });
});
