import type { Clock } from "../../application/ports/clock";
import type { IdGenerator } from "../../application/ports/id-generator";
import type { RandomSource } from "../../application/ports/random-source";
import type { ContentRegistry } from "../../content/registry";
import { createEmptyCollectionState, recordAcquiredItem } from "../collection/item-collection";
import type { ItemInstance } from "../equipment/item-instance";
import { GAME_STATE_SAVE_VERSION, type GameState } from "../game-state";
import { createCandidate, createMember, type MemberFactoryContext } from "../member/member-factory";
import type { Candidate, Member } from "../member/member";
import type {
  CandidateId,
  ContentVersion,
  ItemInstanceId,
  MemberId,
  SaveSlotId,
} from "../shared/ids";
import { RECRUIT_INTERVAL_MS } from "./recruitment";
import { createEmptyRosterPresetState } from "./roster-preset";
import { createEmptyDungeonDevelopmentState } from "../dungeon/dungeon-development";

export interface NewGameDependencies {
  readonly slotId: SaveSlotId;
  readonly content: ContentRegistry;
  readonly contentVersion: ContentVersion;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly random: RandomSource;
}

export interface NewGameOptions {
  readonly guildName?: string;
}

const INITIAL_ROLES = ["tank", "healer", "dps", "dps", "dps"] as const;

export function createNewGame(
  dependencies: NewGameDependencies,
  options: NewGameOptions = {},
): GameState {
  const createdAt = dependencies.clock.now();
  const factoryContext: MemberFactoryContext = {
    content: dependencies.content,
    clock: dependencies.clock,
    ids: dependencies.ids,
    random: dependencies.random,
    usedNames: new Set(),
    claimedHiddenCharacterIds: new Set(),
  };
  const members: Record<MemberId, Member> = {};
  const candidates: Record<CandidateId, Candidate> = {};
  const itemInstances: Record<ItemInstanceId, ItemInstance> = {};
  const collection = createEmptyCollectionState();

  for (const forcedRole of INITIAL_ROLES) {
    const generated = createMember(factoryContext, { forcedRole, allowHidden: false });
    members[generated.member.id] = generated.member;
    for (const item of generated.itemInstances) {
      itemInstances[item.id] = item;
      recordAcquiredItem(collection, item, dependencies.content);
    }
  }
  for (let index = 0; index < 3; index += 1) {
    const candidate = createCandidate(factoryContext);
    candidates[candidate.id] = candidate;
  }

  return {
    slotId: dependencies.slotId,
    saveVersion: GAME_STATE_SAVE_VERSION,
    revision: 0,
    contentVersion: dependencies.contentVersion,
    guild: {
      name: options.guildName?.trim() || "神秘公会",
      funds: 100,
      candidateCapacity: 10,
      purchasedUpgradeIds: [],
      unlockedDungeonIds: dependencies.content.dungeons
        .filter((dungeon) => dungeon.defaultUnlocked)
        .map((dungeon) => dungeon.id),
      firstKillEncounterIds: [],
    },
    recruitment: { nextCandidateAt: createdAt + RECRUIT_INTERVAL_MS },
    members,
    candidates,
    itemInstances,
    activities: {},
    pendingLoot: {},
    collection,
    guildBank: { stackCounts: {}, equipmentInstanceIds: [] },
    rosterPresets: createEmptyRosterPresetState(),
    dungeonDevelopment: createEmptyDungeonDevelopmentState(),
    history: {
      completedActivityCount: 0,
      failedActivityCount: 0,
      cancelledActivityCount: 0,
      completedExpeditionCount: 0,
      encounterVictoryCounts: {},
      dungeonClearCounts: {},
    },
    random: dependencies.random.snapshot(),
    ids: dependencies.ids.snapshot(),
    createdAt,
    updatedAt: createdAt,
  };
}
