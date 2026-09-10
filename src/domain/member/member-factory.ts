import type { Clock } from "../../application/ports/clock";
import type { IdGenerator } from "../../application/ports/id-generator";
import type { RandomSource } from "../../application/ports/random-source";
import type { ContentRegistry } from "../../content/registry";
import type { RoleDefinition } from "../../content/schemas/member-definitions";
import { EQUIPMENT_SLOTS } from "../equipment/equipment-slot";
import type { ItemInstance } from "../equipment/item-instance";
import { asBrandedId } from "../shared/ids";
import type { HiddenCharacterId, MemberId, RaceId } from "../shared/ids";
import type { EquipmentSlot } from "../equipment/equipment-slot";
import type { Candidate, Member, MemberIdentity, MemberProgression } from "./member";

export interface MemberFactoryContext {
  readonly content: ContentRegistry;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly random: RandomSource;
  readonly usedNames: Set<string>;
  readonly claimedHiddenCharacterIds: Set<HiddenCharacterId>;
}

export interface CreateMemberOptions {
  readonly forcedRole?: RoleDefinition["id"];
  readonly allowHidden?: boolean;
}

interface GeneratedProfile {
  readonly identity: MemberIdentity;
  readonly progression: MemberProgression;
}

export interface GeneratedMember {
  readonly member: Member;
  readonly itemInstances: readonly ItemInstance[];
}

function randomEntry<Value>(
  context: MemberFactoryContext,
  values: readonly Value[],
  tag: string,
): Value {
  if (values.length === 0) throw new Error(`无法从空内容集合中选择：${tag}`);
  const index = Math.floor(context.random.next(tag) * values.length);
  return values[Math.min(index, values.length - 1)];
}

function selectHiddenCharacter(context: MemberFactoryContext) {
  for (const character of context.content.hiddenCharacters) {
    if (character.appearance.uniquePerSave && context.claimedHiddenCharacterIds.has(character.id)) {
      continue;
    }
    if (context.usedNames.has(character.name.zhCN)) continue;
    if (context.random.next("hidden-character") < character.appearance.chance) {
      if (character.appearance.uniquePerSave) {
        context.claimedHiddenCharacterIds.add(character.id);
      }
      return character;
    }
  }
  return undefined;
}

function createUniqueName(context: MemberFactoryContext): string {
  const pool = context.content.namePoolByLocale.get("zh-CN");
  if (!pool) throw new Error("缺少 zh-CN 随机姓名定义");
  const availableNames = pool.names.filter((name) => !context.usedNames.has(name));
  if (availableNames.length === 0) throw new Error("zh-CN 随机姓名池已耗尽");
  const name = randomEntry(context, availableNames, "member-name");
  context.usedNames.add(name);
  return name;
}

function createProfile(
  context: MemberFactoryContext,
  { forcedRole, allowHidden = true }: CreateMemberOptions,
): GeneratedProfile {
  const hidden = allowHidden && !forcedRole ? selectHiddenCharacter(context) : undefined;
  const spec = hidden
    ? context.content.specById.get(hidden.specId)
    : randomEntry(
        context,
        context.content.specs.filter((entry) => !forcedRole || entry.role === forcedRole),
        `spec-${forcedRole ?? "any"}`,
      );
  if (!spec) throw new Error(`隐藏角色 ${hidden?.id ?? "unknown"} 缺少专精定义`);
  const classDefinition = context.content.classById.get(spec.classId);
  if (!classDefinition) throw new Error(`专精 ${spec.id} 缺少职业定义`);
  const personalityId = hidden
    ? hidden.personalityId
    : randomEntry(context, context.content.personalities, "personality").id;
  const name = hidden ? hidden.name.zhCN : createUniqueName(context);
  if (hidden) context.usedNames.add(name);
  const raceId = randomEntry(context, classDefinition.raceIds, `race-${classDefinition.id}`);

  return {
    identity: {
      name,
      raceId: raceId as RaceId,
      classId: classDefinition.id,
      personalityId,
      ...(hidden ? { hiddenCharacterId: hidden.id } : {}),
    },
    progression: { level: 10, experience: 0, specId: spec.id },
  };
}

export function starterDefinitionIdFor(
  context: MemberFactoryContext,
  classId: MemberIdentity["classId"],
  slot: (typeof EQUIPMENT_SLOTS)[number],
) {
  const armorType = context.content.classById.get(classId)?.armorType;
  const definitions = context.content.items.filter(
    (item) =>
      item.isStarter &&
      item.slot === slot &&
      (item.armorType === undefined || item.armorType === armorType),
  );
  if (definitions.length !== 1) {
    throw new Error(`初始装备定义不唯一：职业 ${classId}，栏位 ${slot}`);
  }
  return definitions[0].id;
}

export function createStarterItemForMember(
  context: MemberFactoryContext,
  memberId: MemberId,
  classId: MemberIdentity["classId"],
  slot: EquipmentSlot,
): ItemInstance {
  return {
    id: asBrandedId<"ItemInstanceId">(context.ids.next("item")),
    definitionId: starterDefinitionIdFor(context, classId, slot),
    ownerMemberId: memberId,
    bound: true,
    acquiredAt: context.clock.now(),
    source: { type: "starter" },
    enchantmentIds: [],
  };
}

function createMemberFromProfile(
  context: MemberFactoryContext,
  profile: GeneratedProfile,
): GeneratedMember {
  const memberId = asBrandedId<"MemberId">(context.ids.next("member"));
  const equipment: Member["equipment"] = {};
  const itemInstances = EQUIPMENT_SLOTS.map((slot) => {
    const item = createStarterItemForMember(context, memberId, profile.identity.classId, slot);
    equipment[slot] = item.id;
    return item;
  });
  return {
    member: {
      id: memberId,
      identity: structuredClone(profile.identity),
      progression: structuredClone(profile.progression),
      equipment,
      professionIds: [],
      riding: { skillRank: 0, learnedMountIds: [] },
      wishlist: { entries: [] },
      joinedAt: context.clock.now(),
    },
    itemInstances,
  };
}

export function createMember(
  context: MemberFactoryContext,
  options: CreateMemberOptions = {},
): GeneratedMember {
  const profile = createProfile(context, options);
  return createMemberFromProfile(context, profile);
}

export function createMemberFromCandidate(
  context: MemberFactoryContext,
  candidate: Candidate,
): GeneratedMember {
  return createMemberFromProfile(context, {
    identity: candidate.identity,
    progression: candidate.progression,
  });
}

export function createCandidate(context: MemberFactoryContext): Candidate {
  const profile = createProfile(context, {});
  return {
    id: asBrandedId<"CandidateId">(context.ids.next("candidate")),
    ...profile,
    offeredAt: context.clock.now(),
  };
}
