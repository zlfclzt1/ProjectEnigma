export const LEVEL_CAP = 45;

export const SLOT_WEIGHTS = {
  head: 1.2,
  neck: 0.7,
  shoulder: 1,
  back: 0.7,
  chest: 1.25,
  wrist: 0.75,
  hands: 0.9,
  waist: 0.85,
  legs: 1.2,
  feet: 0.9,
  ring1: 0.65,
  ring2: 0.65,
  trinket1: 0.8,
  trinket2: 0.8,
  mainHand: 1.45,
  offHand: 0.8,
  ranged: 0.65,
};

export const SLOT_LABELS = {
  head: "头部",
  neck: "颈部",
  shoulder: "肩部",
  back: "披风",
  chest: "胸甲",
  wrist: "护腕",
  hands: "手套",
  waist: "腰带",
  legs: "腿部",
  feet: "鞋子",
  ring1: "戒指一",
  ring2: "戒指二",
  trinket1: "饰品一",
  trinket2: "饰品二",
  mainHand: "主手",
  offHand: "副手",
  ranged: "远程/圣物",
};

export function clamp(minimum, maximum, value) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededUnit(seed) {
  let value = hashString(String(seed));
  value += 0x6d2b79f5;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

export function pickSeeded(items, seed) {
  if (!items.length) return undefined;
  return items[Math.floor(seededUnit(seed) * items.length) % items.length];
}

export function weightedPick(items, seed, getWeight = (item) => item.weight ?? 1) {
  if (!items.length) return undefined;
  const total = items.reduce((sum, item) => sum + Math.max(0, getWeight(item)), 0);
  if (total <= 0) return pickSeeded(items, seed);
  let cursor = seededUnit(seed) * total;
  for (const item of items) {
    cursor -= Math.max(0, getWeight(item));
    if (cursor <= 0) return item;
  }
  return items.at(-1);
}

export function averageItemLevel(equipment) {
  let weightedLevels = 0;
  let totalWeight = 0;
  for (const [slot, weight] of Object.entries(SLOT_WEIGHTS)) {
    const item = equipment?.[slot];
    totalWeight += weight;
    if (item) weightedLevels += (item.itemLevel ?? 0) * weight;
  }
  return totalWeight > 0 ? weightedLevels / totalWeight : 0;
}

export function equipmentFactor(level, itemLevel) {
  return clamp(0.5, 1.75, 0.5 + itemLevel / (2 * Math.max(1, level)));
}

function personalityPowerMultiplier(member, dungeon, party) {
  switch (member.personalityId) {
    case "steady":
      return 1.08;
    case "impatient":
      return 0.92;
    case "competitive":
      if (member.level < dungeon.recommendedLevel) return 1.1;
      if (member.level >= dungeon.recommendedLevel + 5) return 0.95;
      return 1;
    case "sociable": {
      const uniqueClasses = new Set(party.map((candidate) => candidate.classId)).size;
      if (uniqueClasses === party.length) return 1.08;
      if (uniqueClasses <= Math.ceil(party.length / 2)) return 0.95;
      return 1.03;
    }
    case "clever":
      return member.level < dungeon.recommendedLevel
        ? 1 + Math.min(0.1, (dungeon.recommendedLevel - member.level) * 0.015)
        : 1;
    default:
      return 1;
  }
}

export function memberPower(member, dungeon, party) {
  const itemLevel = averageItemLevel(member.equipment);
  return (
    member.level *
    equipmentFactor(member.level, itemLevel) *
    personalityPowerMultiplier(member, dungeon, party)
  );
}

export function partyContribution(party, dungeon) {
  return party.reduce(
    (total, member) => {
      const power = memberPower(member, dungeon, party);
      if (member.role === "tank") {
        total.tank += power;
        total.damage += power * 0.35;
      } else if (member.role === "healer") {
        total.healing += power;
        total.damage += power * 0.2;
      } else {
        total.damage += power;
      }
      return total;
    },
    { tank: 0, healing: 0, damage: 0 },
  );
}

export function effectiveRatio(ratio, surplusEffect = 0.5) {
  const limited = clamp(0, 2.5, ratio);
  if (limited <= 1) return limited;
  return 1 + (limited - 1) * surplusEffect;
}

export function bossProbability(contribution, boss, dungeon) {
  const rawRatios = {
    tank: contribution.tank / boss.requirements.tank,
    healing: contribution.healing / boss.requirements.healing,
    damage: contribution.damage / boss.requirements.damage,
  };
  const settings = dungeon.probability;

  if (Object.values(rawRatios).every((ratio) => ratio >= settings.overpowerThreshold)) {
    return { probability: 1, rawRatios, readiness: 1.5 };
  }

  const geometricReadiness = Object.entries(boss.weights).reduce(
    (product, [role, weight]) =>
      product * effectiveRatio(rawRatios[role], settings.surplusEffect) ** weight,
    1,
  );
  const bottleneck = Math.min(...Object.values(rawRatios));
  const readiness =
    geometricReadiness * settings.geometricWeight + bottleneck * settings.bottleneckWeight;
  const probability = clamp(
    settings.minimum,
    settings.maximum,
    settings.base + settings.readinessMultiplier * readiness,
  );

  return { probability, rawRatios, readiness };
}

export function partyDurationModifier(party) {
  if (!party.length) return 1;
  const total = party.reduce((sum, member) => {
    if (member.personalityId === "steady") return sum + 1.08;
    if (member.personalityId === "impatient") return sum + 0.92;
    if (member.personalityId === "diligent") return sum + 1.05;
    return sum + 1;
  }, 0);
  return total / party.length;
}

export function stageDurationSeconds(contribution, boss, dungeon, party) {
  const damageRatio = boss.requirements.damage / Math.max(0.01, contribution.damage);
  const outputFactor = clamp(0.5, 1.5, damageRatio ** 0.6);
  const tankRatio = contribution.tank / boss.requirements.tank;
  const healingRatio = contribution.healing / boss.requirements.healing;
  const survivalFactor =
    1 + Math.max(0, 1 - tankRatio) * 0.25 + Math.max(0, 1 - healingRatio) * 0.25;
  const ratio = clamp(
    dungeon.duration.minimumRatio,
    dungeon.duration.maximumRatio,
    outputFactor * survivalFactor * partyDurationModifier(party),
  );
  return Math.round(boss.stageSeconds * ratio);
}

export function evaluateParty(party, dungeon) {
  const contribution = partyContribution(party, dungeon);
  const bosses = dungeon.bosses.map((boss) => {
    const evaluation = bossProbability(contribution, boss, dungeon);
    return {
      boss,
      ...evaluation,
      durationSeconds: stageDurationSeconds(contribution, boss, dungeon, party),
    };
  });
  return {
    contribution,
    bosses,
    clearProbability: bosses.reduce((product, result) => product * result.probability, 1),
    durationSeconds: bosses.reduce((sum, result) => sum + result.durationSeconds, 0),
  };
}

export function fullRunExperienceFraction(member, dungeon) {
  if (member.level >= LEVEL_CAP) return 0;
  if (dungeon.recommendedLevel <= member.level - 8) return 0;
  let fraction = clamp(
    0,
    2,
    0.5 * (1 + 0.08 * (dungeon.recommendedLevel - member.level)),
  );
  if (member.personalityId === "diligent") fraction *= 1.15;
  if (member.personalityId === "clever") fraction *= 0.9;
  return Math.min(2, fraction);
}

export function applyExperience(member, fraction) {
  if (member.level >= LEVEL_CAP || fraction <= 0) return { levels: 0, progress: 0 };
  const beforeLevel = member.level;
  const beforeProgress = member.experience;
  let progress = member.experience + fraction;
  while (progress >= 1 && member.level < LEVEL_CAP) {
    member.level += 1;
    progress -= 1;
  }
  if (member.level >= LEVEL_CAP) progress = 0;
  member.experience = progress;
  return {
    levels: member.level - beforeLevel,
    progress: member.experience - beforeProgress,
  };
}

export function formatPercent(value) {
  const percent = value * 100;
  if (percent > 0 && percent < 0.01) return `${percent.toFixed(4)}%`;
  return `${percent.toFixed(1)}%`;
}

export function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const minutesPart = Math.floor(seconds / 60);
  const secondsPart = seconds % 60;
  if (minutesPart <= 0) return `${secondsPart}秒`;
  return `${minutesPart}分${String(secondsPart).padStart(2, "0")}秒`;
}

export function sellValue(item) {
  if (!item || item.isStarter) return 0;
  const qualityMultiplier = {
    poor: 0.3,
    common: 0.6,
    uncommon: 1,
    rare: 2,
    epic: 4,
  }[item.quality ?? "common"];
  return Math.max(1, Math.floor((item.itemLevel * qualityMultiplier) / 2));
}

export function canEquip(member, item) {
  if (item.allowedClasses?.length && !item.allowedClasses.includes(member.classId)) return false;
  if (item.allowedRoles?.length && !item.allowedRoles.includes(member.role)) return false;
  if (item.armorType && item.armorType !== member.armorType) return false;
  if (item.slot === "offHand" && member.equipment?.mainHand?.twoHanded) return false;
  return Boolean(SLOT_WEIGHTS[item.slot]);
}

export function itemLevelGain(member, item) {
  if (!canEquip(member, item)) return Number.NEGATIVE_INFINITY;
  const before = averageItemLevel(member.equipment);
  const afterEquipment = { ...member.equipment, [item.slot]: item };
  if (item.twoHanded) afterEquipment.offHand = null;
  return averageItemLevel(afterEquipment) - before;
}

export function filterMembers(members, filters = {}) {
  return members.filter((member) => {
    const classMatches = !filters.classId || filters.classId === "all" || member.classId === filters.classId;
    const roleMatches = !filters.role || filters.role === "all" || member.role === filters.role;
    return classMatches && roleMatches;
  });
}
