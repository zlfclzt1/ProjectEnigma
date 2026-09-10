import type { ExpeditionActivity } from "../../src/domain/activity/activity";
import type { ItemInstance } from "../../src/domain/equipment/item-instance";
import {
  GAME_STATE_SAVE_VERSION,
  type GameState,
  type LegacyGameStateV2,
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
    joinedAt: 1_000,
    ...overrides,
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
    },
    runPlans: [
      {
        runNumber: 1,
        seed: "run-seed",
        experienceFractionByMember: { [asBrandedId<"MemberId">("member_1")]: 0.5 },
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
  const current = createGameStateFixture();
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
