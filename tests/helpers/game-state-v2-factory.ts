import type { ExpeditionActivity } from "../../src/domain/activity/activity";
import type { ItemInstance } from "../../src/domain/equipment/item-instance";
import {
  GAME_STATE_SAVE_VERSION,
  type GameState,
  type LegacyGameStateV2,
  type LegacyGameStateV3,
  type LegacyGameStateV4,
  type LegacyGameStateV5,
  type LegacyGameStateV6,
  type LegacyGameStateV7,
  type LegacyGameStateV8,
  type LegacyGameStateV9,
  type LegacyGameStateV10,
} from "../../src/domain/game-state";
import type { Member } from "../../src/domain/member/member";
import { asBrandedId } from "../../src/domain/shared/ids";

export function createMemberFixture(overrides: Partial<Member> = {}): Member {
  return {
    id: asBrandedId<"MemberId">("member_1"),
    identity: {
      name: "铁锤·队长",
      raceId: asBrandedId<"RaceId">("human"),
      classId: asBrandedId<"ClassId">("warrior"),
      personalityId: asBrandedId<"PersonalityId">("steady"),
    },
    progression: {
      level: 10,
      experience: 0,
      specId: asBrandedId<"SpecId">("warrior_protection"),
    },
    equipment: {},
    professionIds: [],
    riding: { skillRank: 0, learnedMountIds: [] },
    ...overrides,
    wishlist: overrides.wishlist ?? { entries: [] },
    quests: overrides.quests ?? { entries: {} },
    joinedAt: overrides.joinedAt ?? 1_000,
  };
}

export function createItemInstanceFixture(overrides: Partial<ItemInstance> = {}): ItemInstance {
  return {
    id: asBrandedId<"ItemInstanceId">("item_1"),
    definitionId: asBrandedId<"ItemDefinitionId">("starter_mail_head"),
    ownerMemberId: asBrandedId<"MemberId">("member_1"),
    bound: true,
    acquiredAt: 1_000,
    source: { type: "starter" },
    enchantmentIds: [],
    ...overrides,
  };
}

export function createExpeditionActivityFixture(
  overrides: Partial<ExpeditionActivity> = {},
): ExpeditionActivity {
  return {
    id: asBrandedId<"ActivityId">("activity_1"),
    type: "expedition",
    participantIds: [asBrandedId<"MemberId">("member_1")],
    status: "active",
    createdAt: 1_000,
    startedAt: 1_000,
    nextSettlementAt: 61_000,
    seed: "activity-seed",
    contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
    dungeonId: asBrandedId<"DungeonId">("ragefire_chasm"),
    selectedOptionalNodeIds: [],
    requestedRuns: 1,
    completedRuns: 0,
    activeRunIndex: 0,
    activeEncounterIndex: 0,
    partySnapshot: {
      formulaVersion: asBrandedId<"FormulaVersion">("legacy-item-level-v1"),
      members: [],
      contribution: { tank: 10, healing: 10, damage: 30 },
      clearProbability: 0.5,
      durationSeconds: 60,
      capabilities: { values: {}, contributions: {} },
    },
    runPlans: [
      {
        runNumber: 1,
        seed: "run-seed",
        experienceFractionByMember: { [asBrandedId<"MemberId">("member_1")]: 0.5 },
        rareNodeSpawns: {},
        rareNodeReveals: {},
        stages: [
          {
            encounterId: asBrandedId<"EncounterId">("oggleflint"),
            probability: 0.5,
            rawRatios: { tank: 1, healing: 1, damage: 1 },
            durationSeconds: 60,
            successRoll: 0.25,
            lootSeed: "loot-seed",
            status: "pending",
          },
        ],
      },
    ],
    questSnapshots: [],
    ...overrides,
  };
}

export function createGameStateFixture(overrides: Partial<GameState> = {}): GameState {
  const member = createMemberFixture();
  const item = createItemInstanceFixture();
  const activity = createExpeditionActivityFixture();
  member.equipment.head = item.id;
  member.activeActivityId = activity.id;

  return {
    slotId: asBrandedId<"SaveSlotId">("slot_1"),
    saveVersion: GAME_STATE_SAVE_VERSION,
    revision: 0,
    contentVersion: asBrandedId<"ContentVersion">("classic-v1"),
    guild: {
      name: "神秘公会",
      funds: 100,
      candidateCapacity: 10,
      purchasedUpgradeIds: [],
      unlockedDungeonIds: [asBrandedId<"DungeonId">("ragefire_chasm")],
      firstKillEncounterIds: [],
    },
    recruitment: { nextCandidateAt: 1_801_000 },
    members: { [member.id]: member },
    candidates: {},
    itemInstances: { [item.id]: item },
    activities: { [activity.id]: activity },
    pendingLoot: {},
    collection: { items: {}, claimedRewardIds: [] },
    guildBank: { stackCounts: {}, equipmentInstanceIds: [] },
    history: {
      completedActivityCount: 0,
      failedActivityCount: 0,
      cancelledActivityCount: 0,
      completedExpeditionCount: 0,
      encounterVictoryCounts: {},
      dungeonClearCounts: {},
    },
    random: { seed: "guild-seed", counter: 0 },
    ids: { counter: 3 },
    createdAt: 1_000,
    updatedAt: 1_000,
    ...overrides,
  };
}

export function createLegacyGameStateV2Fixture(
  overrides: Partial<LegacyGameStateV2> = {},
): LegacyGameStateV2 {
  const current = createLegacyGameStateV3Fixture();
  const { purchasedUpgradeIds: _purchasedUpgradeIds, ...guild } = current.guild;
  const { dungeonClearCounts: _dungeonClearCounts, ...history } = current.history;
  void _purchasedUpgradeIds;
  void _dungeonClearCounts;
  return {
    ...current,
    saveVersion: 2,
    guild: { ...guild, memberCapacity: 10 },
    history,
    ...overrides,
  };
}

export function createLegacyGameStateV4Fixture(
  overrides: Partial<LegacyGameStateV4> = {},
): LegacyGameStateV4 {
  const current = createLegacyGameStateV5Fixture();
  const { collection: _collection, ...legacy } = current;
  void _collection;
  return {
    ...legacy,
    saveVersion: 4,
    ...overrides,
  };
}

export function createLegacyGameStateV5Fixture(
  overrides: Partial<LegacyGameStateV5> = {},
): LegacyGameStateV5 {
  const current = createLegacyGameStateV6Fixture();
  const members = Object.fromEntries(
    Object.entries(current.members).map(([id, member]) => {
      const { wishlist: _wishlist, ...legacyMember } = member;
      void _wishlist;
      return [id, legacyMember];
    }),
  ) as LegacyGameStateV5["members"];
  return {
    ...current,
    saveVersion: 5,
    members,
    ...overrides,
  };
}

export function createLegacyGameStateV6Fixture(
  overrides: Partial<LegacyGameStateV6> = {},
): LegacyGameStateV6 {
  const current = createLegacyGameStateV7Fixture();
  const activities = Object.fromEntries(
    Object.entries(current.activities).map(([id, activity]) => {
      if (activity.type !== "expedition") return [id, activity];
      const { capabilities: _capabilities, ...partySnapshot } = activity.partySnapshot;
      void _capabilities;
      return [id, { ...activity, partySnapshot }];
    }),
  ) as LegacyGameStateV6["activities"];
  return {
    ...current,
    saveVersion: 6,
    activities,
    ...overrides,
  };
}

export function createLegacyGameStateV7Fixture(
  overrides: Partial<LegacyGameStateV7> = {},
): LegacyGameStateV7 {
  const current = createLegacyGameStateV8Fixture();
  const activities = Object.fromEntries(
    Object.entries(current.activities).map(([id, activity]) => {
      if (activity.type !== "expedition") return [id, activity];
      const { selectedOptionalNodeIds: _selectedOptionalNodeIds, ...legacyActivity } = activity;
      void _selectedOptionalNodeIds;
      return [id, legacyActivity];
    }),
  ) as LegacyGameStateV7["activities"];
  return {
    ...current,
    saveVersion: 7,
    activities,
    ...overrides,
  };
}

export function createLegacyGameStateV8Fixture(
  overrides: Partial<LegacyGameStateV8> = {},
): LegacyGameStateV8 {
  const current = createLegacyGameStateV9Fixture();
  const activities = Object.fromEntries(
    Object.entries(current.activities).map(([id, activity]) => {
      if (activity.type !== "expedition") return [id, activity];
      return [
        id,
        {
          ...activity,
          runPlans: activity.runPlans.map((run) => {
            const { rareNodeReveals: _rareNodeReveals, ...legacyRun } = run;
            void _rareNodeReveals;
            return legacyRun;
          }),
        },
      ];
    }),
  ) as LegacyGameStateV8["activities"];
  return {
    ...current,
    saveVersion: 8,
    activities,
    ...overrides,
  };
}

export function createLegacyGameStateV9Fixture(
  overrides: Partial<LegacyGameStateV9> = {},
): LegacyGameStateV9 {
  const current = createLegacyGameStateV10Fixture();
  const members = Object.fromEntries(
    Object.entries(current.members).map(([id, member]) => {
      const { quests: _quests, ...legacyMember } = member;
      void _quests;
      return [id, legacyMember];
    }),
  ) as LegacyGameStateV9["members"];
  return {
    ...current,
    saveVersion: 9,
    members,
    ...overrides,
  };
}

export function createLegacyGameStateV10Fixture(
  overrides: Partial<LegacyGameStateV10> = {},
): LegacyGameStateV10 {
  const current = createGameStateFixture();
  const activities = Object.fromEntries(
    Object.entries(current.activities).map(([id, activity]) => {
      if (activity.type !== "expedition") return [id, activity];
      const { questSnapshots: _questSnapshots, ...legacyActivity } = activity;
      void _questSnapshots;
      return [id, legacyActivity];
    }),
  ) as LegacyGameStateV10["activities"];
  return {
    ...current,
    saveVersion: 10,
    activities,
    ...overrides,
  };
}

export function createLegacyGameStateV3Fixture(
  overrides: Partial<LegacyGameStateV3> = {},
): LegacyGameStateV3 {
  const current = createLegacyGameStateV4Fixture();
  const itemInstances = Object.fromEntries(
    Object.entries(current.itemInstances).map(([id, instance]) => {
      const { randomSuffixId: _randomSuffixId, ...legacyInstance } = instance;
      void _randomSuffixId;
      return [id, legacyInstance];
    }),
  ) as LegacyGameStateV3["itemInstances"];
  return {
    ...current,
    saveVersion: 3,
    itemInstances,
    ...overrides,
  };
}
