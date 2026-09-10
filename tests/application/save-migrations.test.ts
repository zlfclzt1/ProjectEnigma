import { describe, expect, it } from "vitest";
import { loadOrCreateV2Client } from "../../src/app/client-bootstrap";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";
import { migrateSave } from "../../src/infrastructure/persistence/migrations/migrate-save";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { FakeClock } from "../helpers/runtime-fakes";
import {
  createLegacyGameStateV2Fixture,
  createLegacyGameStateV3Fixture,
  createLegacyGameStateV4Fixture,
  createItemInstanceFixture,
} from "../helpers/game-state-v2-factory";

const content = loadBrowserContentRegistry();

describe("save migrations", () => {
  it("migrates V2 capacity and complete first-kill routes into the current save", () => {
    const legacy = createLegacyGameStateV2Fixture();
    legacy.guild.memberCapacity = 20;
    legacy.guild.firstKillEncounterIds = [
      ...content.dungeonById.get(asBrandedId<"DungeonId">("deadmines"))!.route,
    ];

    const result = migrateSave(legacy, content);

    expect(result.migrated).toBe(true);
    expect(result.state.saveVersion).toBe(5);
    expect(result.state.guild).not.toHaveProperty("memberCapacity");
    expect(result.state.guild.purchasedUpgradeIds).toEqual(["guild_roster_15", "guild_roster_20"]);
    expect(result.state.history.dungeonClearCounts).toEqual({ deadmines: 1 });
  });

  it("migrates V3 item instances without inventing random suffixes", () => {
    const legacy = createLegacyGameStateV3Fixture();

    const result = migrateSave(legacy, content);

    expect(result.migrated).toBe(true);
    expect(result.state.saveVersion).toBe(5);
    expect(
      Object.values(result.state.itemInstances).every(
        (instance) => instance.randomSuffixId === undefined,
      ),
    ).toBe(true);
    expect(result.state.collection).toEqual({ items: {}, claimedRewardIds: [] });
  });

  it("migrates V4 held dungeon equipment into deterministic collection history", () => {
    const legacy = createLegacyGameStateV4Fixture();
    const first = createItemInstanceFixture({
      id: asBrandedId<"ItemInstanceId">("legacy_drop_1"),
      definitionId: asBrandedId<"ItemDefinitionId">("14148"),
      randomSuffixId: asBrandedId<"RandomSuffixId">("prototype_of_readiness"),
      ownerMemberId: undefined,
      bound: false,
    });
    const second = createItemInstanceFixture({
      ...first,
      id: asBrandedId<"ItemInstanceId">("legacy_drop_2"),
      randomSuffixId: undefined,
    });
    legacy.itemInstances[first.id] = first;
    legacy.itemInstances[second.id] = second;

    const result = migrateSave(legacy, content);

    expect(result.migrated).toBe(true);
    expect(result.state.saveVersion).toBe(5);
    expect(result.state.collection).toEqual({
      items: {
        "14148": {
          acquisitionCount: 2,
          seenRandomSuffixIds: ["prototype_of_readiness"],
        },
      },
      claimedRewardIds: [],
    });
    expect(result.state.collection.items).not.toHaveProperty("starter_mail_head");
  });

  it("keeps current collection state without reporting a migration", () => {
    const current = createLegacyGameStateV4Fixture();
    const migrated = migrateSave(current, content).state;
    migrated.collection.claimedRewardIds.push(
      asBrandedId<"CollectionRewardId">("prototype_global_catalog_ten_percent"),
    );

    const result = migrateSave(migrated, content);

    expect(result.migrated).toBe(false);
    expect(result.state).toEqual(migrated);
    expect(result.state).not.toBe(migrated);
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
    expect(loaded.session.snapshot()).toMatchObject({ saveVersion: 5, revision: 1 });
    const persisted = await saves.load(legacy.slotId);
    expect(persisted?.saveVersion).toBe(5);
  });
});
