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
  createLegacyGameStateV5Fixture,
  createLegacyGameStateV6Fixture,
  createLegacyGameStateV7Fixture,
  createLegacyGameStateV8Fixture,
  createLegacyGameStateV9Fixture,
  createLegacyGameStateV10Fixture,
  createItemInstanceFixture,
} from "../helpers/game-state-v2-factory";

const content = loadBrowserContentRegistry();

describe("save migrations", () => {
  it("migrates V2 capacity and complete first-kill routes into the current save", () => {
    const legacy = createLegacyGameStateV2Fixture();
    legacy.guild.memberCapacity = 20;
    legacy.guild.firstKillEncounterIds = [
      ...content.dungeonById
        .get(asBrandedId<"DungeonId">("deadmines"))!
        .route.map((node) => node.encounterId),
    ];

    const result = migrateSave(legacy, content);

    expect(result.migrated).toBe(true);
    expect(result.state.saveVersion).toBe(11);
    expect(
      Object.values(result.state.members).every((member) => member.wishlist.entries.length === 0),
    ).toBe(true);
    expect(result.state.guild).not.toHaveProperty("memberCapacity");
    expect(result.state.guild.purchasedUpgradeIds).toEqual(["guild_roster_15", "guild_roster_20"]);
    expect(result.state.history.dungeonClearCounts).toEqual({ deadmines: 1 });
  });

  it("migrates V3 item instances without inventing random suffixes", () => {
    const legacy = createLegacyGameStateV3Fixture();

    const result = migrateSave(legacy, content);

    expect(result.migrated).toBe(true);
    expect(result.state.saveVersion).toBe(11);
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
    expect(result.state.saveVersion).toBe(11);
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

  it("migrates V5 members with empty wishlist state", () => {
    const legacy = createLegacyGameStateV5Fixture();

    const result = migrateSave(legacy, content);

    expect(result.migrated).toBe(true);
    expect(result.state.saveVersion).toBe(11);
    expect(
      Object.values(result.state.members).every((member) => member.wishlist.entries.length === 0),
    ).toBe(true);
  });

  it("migrates V6 expedition capability snapshots from frozen member combat data", () => {
    const legacy = createLegacyGameStateV6Fixture();
    const activity = Object.values(legacy.activities)[0]!;
    if (activity.type !== "expedition") throw new Error("Expected expedition fixture");
    const member = Object.values(legacy.members)[0]!;
    activity.partySnapshot.members.push({
      memberId: member.id,
      classId: member.identity.classId,
      specId: member.progression.specId,
      personalityId: member.identity.personalityId,
      level: member.progression.level,
      equipment: {},
      combat: {
        formulaVersion: asBrandedId<"FormulaVersion">("classic-light-v1"),
        role: "tank",
        capabilities: { survivability: 9, threat: 4, healing: 1, damage: 2 },
        utility: { interruptScore: 0, dispelScore: 0, crowdControlScore: 0 },
      },
    });

    const result = migrateSave(legacy, content);

    expect(result.migrated).toBe(true);
    expect(result.state.saveVersion).toBe(11);
    const migrated = Object.values(result.state.activities)[0]!;
    if (migrated.type !== "expedition") throw new Error("Expected expedition fixture");
    expect(migrated.partySnapshot.capabilities.values.tanking).toBeGreaterThan(0);
    expect(migrated.partySnapshot.capabilities.contributions.tanking).toHaveLength(2);
  });

  it("migrates V7 expeditions with an empty optional route selection", () => {
    const legacy = createLegacyGameStateV7Fixture();

    const result = migrateSave(legacy, content);

    expect(result.migrated).toBe(true);
    expect(result.state.saveVersion).toBe(11);
    const activity = Object.values(result.state.activities)[0]!;
    if (activity.type !== "expedition") throw new Error("Expected expedition fixture");
    expect(activity.selectedOptionalNodeIds).toEqual([]);
  });

  it("migrates V8 expeditions with no revealed rare route nodes", () => {
    const legacy = createLegacyGameStateV8Fixture();

    const result = migrateSave(legacy, content);

    expect(result.migrated).toBe(true);
    expect(result.state.saveVersion).toBe(11);
    const activity = Object.values(result.state.activities)[0]!;
    if (activity.type !== "expedition") throw new Error("Expected expedition fixture");
    expect(activity.runPlans[0]!.rareNodeReveals).toEqual({});
  });

  it("migrates V9 members with empty independent quest progress", () => {
    const legacy = createLegacyGameStateV9Fixture();

    const result = migrateSave(legacy, content);

    expect(result.migrated).toBe(true);
    expect(result.state.saveVersion).toBe(11);
    expect(
      Object.values(result.state.members).every(
        (member) => Object.keys(member.quests.entries).length === 0,
      ),
    ).toBe(true);
    expect(
      Object.values(result.state.members).every(
        (member) => !("quests" in legacy.members[member.id]!),
      ),
    ).toBe(true);
  });

  it("migrates V10 expeditions with an empty member quest snapshot", () => {
    const legacy = createLegacyGameStateV10Fixture();

    const result = migrateSave(legacy, content);

    expect(result.migrated).toBe(true);
    expect(result.state.saveVersion).toBe(11);
    const activity = Object.values(result.state.activities)[0]!;
    if (activity.type !== "expedition") throw new Error("Expected expedition fixture");
    expect(activity.questSnapshots).toEqual([]);
  });

  it("keeps current collection state without reporting a migration", () => {
    const current = createLegacyGameStateV4Fixture();
    const migrated = migrateSave(current, content).state;
    migrated.collection.claimedRewardIds.push(
      asBrandedId<"CollectionRewardId">("prototype_global_catalog_ten_percent"),
    );
    Object.values(migrated.members)[0]!.wishlist.entries.push({
      itemDefinitionId: asBrandedId<"ItemDefinitionId">("14148"),
      preferredRandomSuffixId: asBrandedId<"RandomSuffixId">("prototype_of_readiness"),
      acceptableRandomSuffixIds: [asBrandedId<"RandomSuffixId">("prototype_of_readiness")],
    });

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
    expect(loaded.session.snapshot()).toMatchObject({ saveVersion: 11, revision: 1 });
    const persisted = await saves.load(legacy.slotId);
    expect(persisted?.saveVersion).toBe(11);
  });
});
