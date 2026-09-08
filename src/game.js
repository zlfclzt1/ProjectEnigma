import {
  LEVEL_CAP,
  SLOT_LABELS,
  SLOT_WEIGHTS,
  applyExperience,
  averageItemLevel,
  canEquip,
  evaluateParty,
  fullRunExperienceFraction,
  itemLevelGain,
  pickSeeded,
  seededUnit,
  sellValue,
  weightedPick,
} from "./core.js";
import {
  CLASS_DEFINITIONS,
  EQUIPMENT_SLOT_IDS,
  LOG_TEMPLATES,
  NAME_PARTS,
  PERSONALITIES,
  getClassDefinition,
  getSpecDefinition,
} from "./content.js";

export const SAVE_KEY = "mystery-guild-master-save-v1";
const RECRUIT_INTERVAL_MS = 30 * 60 * 1000;
const MAX_CANDIDATES = 10;
const LEGACY_LOOT_REPLACEMENTS = {
  prototype_rfc_mail_feet: 15451,
  prototype_rfc_cloth_waist: 15452,
  prototype_rfc_leather_hands: 15453,
  prototype_rfc_back: 14149,
};
const LEGACY_ITEM_ICON_NAMES = {
  prototype_rfc_mail_feet: "inv_boots_plate_05",
  prototype_rfc_cloth_waist: "inv_belt_04",
  prototype_rfc_leather_hands: "inv_gauntlets_05",
  prototype_rfc_back: "inv_misc_cape_10",
};

function nextId(state, prefix) {
  state.nextId += 1;
  return `${prefix}_${state.nextId}`;
}

function nextRandom(state, tag = "random") {
  state.randomCounter += 1;
  return seededUnit(`${state.seed}:${tag}:${state.randomCounter}`);
}

function randomEntry(state, entries, tag) {
  return entries[Math.floor(nextRandom(state, tag) * entries.length) % entries.length];
}

function getDungeon(content, dungeonId) {
  return (
    content.dungeonById?.get(dungeonId) ??
    content.dungeons?.find((dungeon) => dungeon.id === dungeonId) ??
    content.dungeon
  );
}

function createStarterItem(member, slot) {
  const armorSlots = new Set(["head", "shoulder", "chest", "wrist", "hands", "waist", "legs", "feet"]);
  return {
    id: `starter_${member.id}_${slot}`,
    name: `入门${SLOT_LABELS[slot]}`,
    quality: "common",
    itemLevel: 10,
    slot,
    armorType: armorSlots.has(slot) ? member.armorType : null,
    allowedClasses: [],
    allowedRoles: [],
    description: "公会为新人准备的基础装备。",
    isStarter: true,
    bound: true,
  };
}

function equipStarterSet(member) {
  member.equipment = {};
  for (const slot of EQUIPMENT_SLOT_IDS) {
    member.equipment[slot] = createStarterItem(member, slot);
  }
}

function allKnownNames(state) {
  return new Set([
    ...state.members.map((member) => member.name),
    ...state.candidates.map((candidate) => candidate.name),
  ]);
}

function createNormalName(state) {
  const known = allKnownNames(state);
  const base = `${randomEntry(state, NAME_PARTS.first, "name-first")}·${randomEntry(
    state,
    NAME_PARTS.second,
    "name-second",
  )}`;
  if (!known.has(base)) return base;
  let suffix = 2;
  while (known.has(`${base}${suffix}`)) suffix += 1;
  return `${base}${suffix}`;
}

function roleSpecs(role) {
  return CLASS_DEFINITIONS.flatMap((classDefinition) =>
    classDefinition.specs
      .filter((spec) => !role || spec.role === role)
      .map((spec) => ({ classDefinition, spec })),
  );
}

function hiddenAlreadyExists(state) {
  return [...state.members, ...state.candidates].some((member) => member.hiddenId === "费厄泼赖");
}

function createMember(state, { forcedRole, allowHidden = true } = {}) {
  const hidden = allowHidden && !forcedRole && !hiddenAlreadyExists(state) && nextRandom(state, "hidden") < 0.01;
  let classDefinition;
  let spec;
  let name;
  let personality;
  let hiddenId = null;

  if (hidden) {
    classDefinition = getClassDefinition("warlock");
    spec = classDefinition.specs.find((entry) => entry.id === "warlock_affliction");
    name = "费厄泼赖";
    personality = PERSONALITIES.find((entry) => entry.id === "clever");
    hiddenId = "费厄泼赖";
  } else {
    const choice = randomEntry(state, roleSpecs(forcedRole), `spec-${forcedRole ?? "any"}`);
    classDefinition = choice.classDefinition;
    spec = choice.spec;
    name = createNormalName(state);
    personality = randomEntry(state, PERSONALITIES, "personality");
  }

  const member = {
    id: nextId(state, "member"),
    hiddenId,
    name,
    race: randomEntry(state, classDefinition.races, "race"),
    classId: classDefinition.id,
    className: classDefinition.name,
    armorType: classDefinition.armorType,
    specId: spec.id,
    specName: spec.name,
    role: spec.role,
    personalityId: personality.id,
    personalityName: personality.name,
    level: 10,
    experience: 0,
    status: "idle",
    expeditionId: null,
    equipment: {},
  };
  equipStarterSet(member);
  return member;
}

function createInitialState(now, content) {
  const state = {
    version: 1,
    seed: `${now}-${Math.floor(Math.random() * 1_000_000)}`,
    nextId: 0,
    randomCounter: 0,
    guild: {
      name: "神秘公会",
      funds: 100,
      capacity: 10,
      firstKills: [],
      milestones: [],
      unlockedDungeonIds: (content.dungeons ?? [content.dungeon])
        .filter((dungeon) => dungeon.defaultUnlocked)
        .map((dungeon) => dungeon.id),
    },
    members: [],
    candidates: [],
    nextRecruitAt: now + RECRUIT_INTERVAL_MS,
    expeditions: [],
    pendingLoot: [],
    createdAt: now,
    lastSavedAt: now,
  };

  state.members.push(createMember(state, { forcedRole: "tank", allowHidden: false }));
  state.members.push(createMember(state, { forcedRole: "healer", allowHidden: false }));
  state.members.push(createMember(state, { forcedRole: "dps", allowHidden: false }));
  state.members.push(createMember(state, { forcedRole: "dps", allowHidden: false }));
  state.members.push(createMember(state, { forcedRole: "dps", allowHidden: false }));
  state.candidates.push(createMember(state));
  state.candidates.push(createMember(state));
  state.candidates.push(createMember(state));
  return state;
}

function createLog(state, expedition, type, bossId, success, timestamp) {
  const members = expedition.memberIds
    .map((id) => state.members.find((member) => member.id === id))
    .filter(Boolean);
  const tank = members.find((member) => member.role === "tank")?.name ?? "临时坦克";
  const healer = members.find((member) => member.role === "healer")?.name ?? "不存在的治疗";
  const member = pickSeeded(members, `${expedition.currentRun.seed}:${bossId}:log-member`)?.name ?? "某位成员";
  const templates = success
    ? LOG_TEMPLATES[bossId] ?? LOG_TEMPLATES[expedition.dungeonId] ?? LOG_TEMPLATES.start
    : LOG_TEMPLATES.failure;
  const template = pickSeeded(templates, `${expedition.currentRun.seed}:${bossId}:log-template:${success}`);
  return {
    id: nextId(state, "log"),
    type,
    timestamp,
    text: template.replaceAll("{tank}", tank).replaceAll("{healer}", healer).replaceAll("{member}", member),
  };
}

function createStartLog(state, expedition, timestamp) {
  const members = expedition.memberIds
    .map((id) => state.members.find((member) => member.id === id))
    .filter(Boolean);
  const tank = members.find((member) => member.role === "tank")?.name ?? "临时坦克";
  const healer = members.find((member) => member.role === "healer")?.name ?? "不存在的治疗";
  const template = pickSeeded(LOG_TEMPLATES.start, `${expedition.currentRun.seed}:start-log`);
  expedition.logs.push({
    id: nextId(state, "log"),
    type: "start",
    timestamp,
    text: template.replaceAll("{tank}", tank).replaceAll("{healer}", healer),
  });
}

function beginRun(state, content, expedition, startAt) {
  const dungeon = getDungeon(content, expedition.dungeonId);
  const members = expedition.memberIds
    .map((id) => state.members.find((member) => member.id === id))
    .filter(Boolean);
  const evaluation = evaluateParty(members, dungeon);
  const seed = `${state.seed}:expedition:${expedition.id}:run:${expedition.runsCompleted + 1}:${nextRandom(
    state,
    "run-seed",
  )}`;
  const fullExperienceByMember = Object.fromEntries(
    members.map((member) => [member.id, fullRunExperienceFraction(member, dungeon)]),
  );

  expedition.currentRun = {
    number: expedition.runsCompleted + 1,
    seed,
    startedAt: startAt,
    fullExperienceByMember,
    contribution: evaluation.contribution,
    clearProbability: evaluation.clearProbability,
    durationSeconds: evaluation.durationSeconds,
    stages: evaluation.bosses.map((result) => ({
      bossId: result.boss.id,
      bossName: result.boss.name,
      probability: result.probability,
      rawRatios: result.rawRatios,
      durationSeconds: result.durationSeconds,
      successRoll: seededUnit(`${seed}:${result.boss.id}:success`),
      lootSeed: `${seed}:${result.boss.id}:loot`,
      status: "pending",
    })),
  };
  expedition.stageIndex = 0;
  expedition.stageStartedAt = startAt;
  expedition.stageEndAt = startAt + expedition.currentRun.stages[0].durationSeconds * 1000;
  createStartLog(state, expedition, startAt);
}

function finishExpedition(state, expedition, status, timestamp) {
  expedition.status = status;
  expedition.completedAt = timestamp;
  expedition.stageEndAt = null;
  expedition.remainingRuns = 0;
  for (const memberId of expedition.memberIds) {
    const member = state.members.find((candidate) => candidate.id === memberId);
    if (!member) continue;
    member.status = "idle";
    member.expeditionId = null;
  }
}

function createPendingLoot(state, content, expedition, stage, boss) {
  const pool = content.lootPools.get(boss.lootPool);
  const poolEntry = weightedPick(pool?.items ?? [], stage.lootSeed);
  const item = poolEntry ? content.itemById.get(String(poolEntry.itemId)) : undefined;
  if (!item) return;
  state.pendingLoot.push({
    id: nextId(state, "loot"),
    itemId: item.id,
    item: { ...item },
    sourceBossId: boss.id,
    sourceBossName: boss.name,
    expeditionId: expedition.id,
    runNumber: expedition.currentRun.number,
    eligibleMemberIds: [...expedition.memberIds],
    createdAt: expedition.stageEndAt,
  });
}

function settleStage(state, content, expedition) {
  const dungeon = getDungeon(content, expedition.dungeonId);
  const stage = expedition.currentRun.stages[expedition.stageIndex];
  const boss = dungeon.bosses.find((candidate) => candidate.id === stage.bossId);
  const timestamp = expedition.stageEndAt;
  const success = stage.successRoll < stage.probability;
  stage.status = success ? "success" : "failed";
  stage.resolvedAt = timestamp;

  if (!success) {
    expedition.logs.push(createLog(state, expedition, "failure", boss.id, false, timestamp));
    expedition.failedBossName = boss.name;
    finishExpedition(state, expedition, "failed", timestamp);
    return;
  }

  const firstKill = !state.guild.firstKills.includes(boss.id);
  if (firstKill) state.guild.firstKills.push(boss.id);
  state.guild.funds += boss.funds + (firstKill ? boss.firstKillBonus : 0);

  for (const memberId of expedition.memberIds) {
    const member = state.members.find((candidate) => candidate.id === memberId);
    if (!member || member.level >= LEVEL_CAP) continue;
    const fullFraction = expedition.currentRun.fullExperienceByMember[memberId] ?? 0;
    applyExperience(member, fullFraction * boss.experienceShare);
  }

  createPendingLoot(state, content, expedition, stage, boss);
  expedition.logs.push(createLog(state, expedition, "boss-success", boss.id, true, timestamp));

  const lastStage = expedition.stageIndex === expedition.currentRun.stages.length - 1;
  if (!lastStage) {
    expedition.stageIndex += 1;
    expedition.stageStartedAt = timestamp;
    expedition.stageEndAt =
      timestamp + expedition.currentRun.stages[expedition.stageIndex].durationSeconds * 1000;
    return;
  }

  expedition.runsCompleted += 1;
  if (expedition.remainingRuns > 0) {
    expedition.remainingRuns -= 1;
    beginRun(state, content, expedition, timestamp);
    return;
  }
  finishExpedition(state, expedition, "completed", timestamp);
}

function settleRecruitment(state, now) {
  if (state.candidates.length >= MAX_CANDIDATES) {
    state.nextRecruitAt = null;
    return;
  }
  if (state.nextRecruitAt == null) state.nextRecruitAt = now + RECRUIT_INTERVAL_MS;
  while (state.candidates.length < MAX_CANDIDATES && state.nextRecruitAt <= now) {
    state.candidates.push(createMember(state));
    state.nextRecruitAt += RECRUIT_INTERVAL_MS;
  }
  if (state.candidates.length >= MAX_CANDIDATES) state.nextRecruitAt = null;
}

function settleExpeditions(state, content, now) {
  while (true) {
    const due = state.expeditions
      .filter(
        (expedition) =>
          expedition.status === "active" &&
          expedition.stageEndAt != null &&
          expedition.stageEndAt <= now,
      )
      .sort((left, right) => left.stageEndAt - right.stageEndAt)[0];
    if (!due) break;
    settleStage(state, content, due);
  }
}

function dungeonCleared(state, dungeon) {
  return dungeon.bosses.every((boss) => state.guild.firstKills.includes(boss.id));
}

function refreshDungeonUnlocks(state, content) {
  const dungeons = content.dungeons ?? [content.dungeon];
  const unlocked = new Set(state.guild.unlockedDungeonIds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const dungeon of dungeons) {
      if (unlocked.has(dungeon.id)) continue;
      const levelReady = state.members.some((member) => member.level >= dungeon.minimumLevel);
      const required = dungeon.unlock?.requiredDungeonIds ?? [];
      const requiredAny = dungeon.unlock?.requiredAnyDungeonIds ?? [];
      const requiredReady = required.every((id) => {
        const prerequisite = getDungeon(content, id);
        return prerequisite && dungeonCleared(state, prerequisite);
      });
      const requiredAnyReady =
        requiredAny.length === 0 ||
        requiredAny.some((id) => {
          const prerequisite = getDungeon(content, id);
          return prerequisite && dungeonCleared(state, prerequisite);
        });
      if (dungeon.defaultUnlocked || (levelReady && requiredReady && requiredAnyReady)) {
        unlocked.add(dungeon.id);
        changed = true;
      }
    }
  }
  state.guild.unlockedDungeonIds = [...unlocked];
}

function cleanLegacyEquippedItem(item) {
  if (!item || typeof item !== "object" || !String(item.id).startsWith("prototype_rfc_")) return;
  item.name = String(item.name ?? "绝版装备").replace(/^测试装备[·・]?/, "") || "绝版装备";
  item.description = "早期版本保留装备，已退出当前掉落池。";
  item.iconName = LEGACY_ITEM_ICON_NAMES[item.id] ?? item.iconName;
  item.isLegacy = true;
}

function migrateLegacyLoot(state, content) {
  for (const loot of state.pendingLoot) {
    const replacementId = LEGACY_LOOT_REPLACEMENTS[loot.itemId] ?? LEGACY_LOOT_REPLACEMENTS[loot.item?.id];
    const replacement = replacementId == null ? undefined : content.itemById.get(String(replacementId));
    if (!replacement) continue;
    loot.itemId = replacement.id;
    loot.item = { ...replacement };
  }

  for (const member of [...state.members, ...state.candidates]) {
    for (const item of Object.values(member.equipment ?? {})) cleanLegacyEquippedItem(item);
  }
}

function refreshSavedItemIcons(state, content) {
  const refreshItem = (item) => {
    if (!item || item.isStarter) return;
    const currentItem = content.itemById.get(String(item.id));
    if (currentItem?.iconName) item.iconName = currentItem.iconName;
  };

  for (const loot of state.pendingLoot) refreshItem(loot.item);
  for (const member of [...state.members, ...state.candidates]) {
    for (const item of Object.values(member.equipment ?? {})) refreshItem(item);
  }
}

function ensureStateShape(state, content, now) {
  state.nextId ??= 0;
  state.randomCounter ??= 0;
  state.guild.firstKills ??= [];
  state.guild.milestones ??= [];
  state.guild.unlockedDungeonIds ??= (content.dungeons ?? [content.dungeon])
    .filter((dungeon) => dungeon.defaultUnlocked)
    .map((dungeon) => dungeon.id);
  state.pendingLoot ??= [];
  state.expeditions ??= [];
  state.lastSavedAt ??= now;
  migrateLegacyLoot(state, content);
  refreshSavedItemIcons(state, content);
  refreshDungeonUnlocks(state, content);
  return state;
}

export class GuildGame {
  constructor(content, storage = globalThis.localStorage, now = Date.now()) {
    this.content = content;
    this.storage = storage;
    this.state = this.load(now);
    this.settle(now);
  }

  load(now) {
    try {
      const raw = this.storage?.getItem(SAVE_KEY);
      if (raw) return ensureStateShape(JSON.parse(raw), this.content, now);
    } catch (error) {
      console.warn("读取存档失败，将创建新公会。", error);
    }
    return createInitialState(now, this.content);
  }

  save(now = Date.now()) {
    this.state.lastSavedAt = now;
    this.storage?.setItem(SAVE_KEY, JSON.stringify(this.state));
  }

  settle(now = Date.now()) {
    settleRecruitment(this.state, now);
    settleExpeditions(this.state, this.content, now);
    refreshDungeonUnlocks(this.state, this.content);
    this.state.expeditions = this.state.expeditions.slice(-20);
    this.save(now);
  }

  reset(now = Date.now()) {
    this.state = createInitialState(now, this.content);
    this.save(now);
  }

  recruit(candidateId, now = Date.now()) {
    this.settle(now);
    if (this.state.members.length >= this.state.guild.capacity) {
      throw new Error("公会人数已达上限。请先扩建或移除成员。");
    }
    const index = this.state.candidates.findIndex((candidate) => candidate.id === candidateId);
    if (index < 0) throw new Error("这名候选人已经不在招募列表中。");
    const [member] = this.state.candidates.splice(index, 1);
    member.status = "idle";
    member.expeditionId = null;
    this.state.members.push(member);
    if (this.state.nextRecruitAt == null) this.state.nextRecruitAt = now + RECRUIT_INTERVAL_MS;
    this.save(now);
    return member;
  }

  rejectCandidate(candidateId, now = Date.now()) {
    const index = this.state.candidates.findIndex((candidate) => candidate.id === candidateId);
    if (index < 0) return;
    this.state.candidates.splice(index, 1);
    if (this.state.nextRecruitAt == null) this.state.nextRecruitAt = now + RECRUIT_INTERVAL_MS;
    this.save(now);
  }

  generateCandidate(now = Date.now()) {
    this.settle(now);
    if (this.state.candidates.length >= MAX_CANDIDATES) throw new Error("候选区已经满员。");
    if (this.state.guild.funds < 100) throw new Error("公会资金不足，需要 100。");
    this.state.guild.funds -= 100;
    const candidate = createMember(this.state);
    this.state.candidates.push(candidate);
    if (this.state.candidates.length >= MAX_CANDIDATES) this.state.nextRecruitAt = null;
    this.save(now);
    return candidate;
  }

  dismissMember(memberId, now = Date.now()) {
    const member = this.state.members.find((candidate) => candidate.id === memberId);
    if (!member) return;
    if (member.status !== "idle") throw new Error("副本中的成员不能被移出公会。");
    this.state.members = this.state.members.filter((candidate) => candidate.id !== memberId);
    this.save(now);
  }

  respecMember(memberId, specId, now = Date.now()) {
    const member = this.state.members.find((candidate) => candidate.id === memberId);
    if (!member) throw new Error("找不到该成员。");
    if (member.status !== "idle") throw new Error("副本中的成员不能更改专精。");
    if (this.state.guild.funds < 300) throw new Error("公会资金不足，需要 300。");
    const spec = getSpecDefinition(specId);
    if (!spec || spec.classId !== member.classId) throw new Error("该职业不能选择这个专精。");
    if (spec.id === member.specId) return;

    this.state.guild.funds -= 300;
    member.specId = spec.id;
    member.specName = spec.name;
    member.role = spec.role;
    for (const [slot, item] of Object.entries(member.equipment)) {
      if (!item || item.isStarter || canEquip(member, item)) continue;
      this.state.guild.funds += sellValue(item);
      member.equipment[slot] = createStarterItem(member, slot);
    }
    this.save(now);
  }

  previewParty(memberIds, dungeonId = this.content.dungeon.id) {
    const members = memberIds
      .map((id) => this.state.members.find((member) => member.id === id))
      .filter(Boolean);
    return evaluateParty(members, getDungeon(this.content, dungeonId));
  }

  isDungeonUnlocked(dungeonId) {
    return this.state.guild.unlockedDungeonIds.includes(dungeonId);
  }

  startExpedition(memberIds, queueCount = 1, now = Date.now(), dungeonId = this.content.dungeon.id) {
    this.settle(now);
    const dungeon = getDungeon(this.content, dungeonId);
    if (!dungeon || dungeon.id !== dungeonId) throw new Error("找不到该副本。");
    if (!this.isDungeonUnlocked(dungeonId)) throw new Error(`${dungeon.name}尚未解锁。`);
    const uniqueIds = [...new Set(memberIds)];
    if (uniqueIds.length < dungeon.members.minimum) {
      throw new Error("至少选择一名成员才能出发。");
    }
    if (uniqueIds.length > dungeon.members.maximum) {
      throw new Error(`${dungeon.name}最多允许 ${dungeon.members.maximum} 人。`);
    }
    if (queueCount < 1 || queueCount > 3) throw new Error("连续副本次数必须为 1–3 次。");
    const members = uniqueIds.map((id) => this.state.members.find((member) => member.id === id));
    if (members.some((member) => !member)) throw new Error("队伍中存在无效成员。");
    if (members.some((member) => member.status !== "idle")) {
      throw new Error("队伍中有成员正在参加其他副本。");
    }

    const expedition = {
      id: nextId(this.state, "expedition"),
      dungeonId: dungeon.id,
      dungeonName: dungeon.name,
      memberIds: uniqueIds,
      status: "active",
      requestedRuns: queueCount,
      remainingRuns: queueCount - 1,
      runsCompleted: 0,
      createdAt: now,
      logs: [],
      failedBossName: null,
    };
    this.state.expeditions.push(expedition);
    for (const member of members) {
      member.status = "expedition";
      member.expeditionId = expedition.id;
    }
    beginRun(this.state, this.content, expedition, now);
    this.save(now);
    return expedition;
  }

  forceCompleteNextStage(expeditionId, now = Date.now()) {
    const expedition = this.state.expeditions.find((entry) => entry.id === expeditionId);
    if (!expedition || expedition.status !== "active") return;
    expedition.stageEndAt = now;
    settleExpeditions(this.state, this.content, now);
    this.save(now);
  }

  eligibleMembers(loot) {
    return loot.eligibleMemberIds
      .map((id) => this.state.members.find((member) => member.id === id))
      .filter((member) => member && canEquip(member, loot.item));
  }

  isLootLocked(loot) {
    return this.state.expeditions.some(
      (expedition) => expedition.id === loot.expeditionId && expedition.status === "active",
    );
  }

  assignLoot(lootId, memberId, now = Date.now()) {
    const lootIndex = this.state.pendingLoot.findIndex((loot) => loot.id === lootId);
    if (lootIndex < 0) throw new Error("该战利品已经被处理。");
    const loot = this.state.pendingLoot[lootIndex];
    if (this.isLootLocked(loot)) {
      throw new Error("该队伍的连续副本尚未结束，暂时不能分配装备。");
    }
    const member = this.state.members.find((candidate) => candidate.id === memberId);
    if (!member || !loot.eligibleMemberIds.includes(member.id) || !canEquip(member, loot.item)) {
      throw new Error("该成员没有资格装备这件物品。");
    }
    const oldItem = member.equipment[loot.item.slot];
    this.state.guild.funds += sellValue(oldItem);
    member.equipment[loot.item.slot] = {
      ...loot.item,
      instanceId: nextId(this.state, "item"),
      bound: true,
      sourceBossName: loot.sourceBossName,
    };
    if (loot.item.twoHanded) {
      this.state.guild.funds += sellValue(member.equipment.offHand);
      member.equipment.offHand = null;
    }
    this.state.pendingLoot.splice(lootIndex, 1);
    this.save(now);
    return member;
  }

  sellLoot(lootId, now = Date.now()) {
    const lootIndex = this.state.pendingLoot.findIndex((loot) => loot.id === lootId);
    if (lootIndex < 0) return 0;
    const loot = this.state.pendingLoot[lootIndex];
    if (this.isLootLocked(loot)) {
      throw new Error("该队伍的连续副本尚未结束，暂时不能出售装备。");
    }
    this.state.pendingLoot.splice(lootIndex, 1);
    const value = sellValue(loot.item);
    this.state.guild.funds += value;
    this.save(now);
    return value;
  }

  autoAssignAll(now = Date.now()) {
    let assigned = 0;
    let sold = 0;
    for (const loot of [...this.state.pendingLoot]) {
      if (this.isLootLocked(loot)) continue;
      const eligible = this.eligibleMembers(loot)
        .map((member) => ({ member, gain: itemLevelGain(member, loot.item) }))
        .filter((entry) => entry.gain > 0)
        .sort(
          (left, right) =>
            right.gain - left.gain ||
            averageItemLevel(left.member.equipment) - averageItemLevel(right.member.equipment),
        );
      if (eligible.length) {
        this.assignLoot(loot.id, eligible[0].member.id, now);
        assigned += 1;
      } else {
        this.sellLoot(loot.id, now);
        sold += 1;
      }
    }
    this.save(now);
    return { assigned, sold };
  }
}
