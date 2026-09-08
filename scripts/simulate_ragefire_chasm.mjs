import fs from "node:fs";

const dungeon = JSON.parse(
  fs.readFileSync(new URL("../data/dungeons/ragefire_chasm.json", import.meta.url), "utf8"),
);

const clamp = (minimum, maximum, value) => Math.min(maximum, Math.max(minimum, value));

function equipmentFactor(level, averageItemLevel) {
  return clamp(0.5, 1.75, 0.5 + averageItemLevel / (2 * level));
}

function memberPower(member) {
  return member.level * equipmentFactor(member.level, member.averageItemLevel);
}

function partyContribution(party) {
  return party.reduce(
    (total, member) => {
      const power = memberPower(member);
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

function effectiveRatio(ratio) {
  const limited = clamp(0, 2.5, ratio);
  if (limited <= 1) return limited;
  return 1 + (limited - 1) * dungeon.probability.surplusEffect;
}

function bossProbability(contribution, boss) {
  const rawRatios = {
    tank: contribution.tank / boss.requirements.tank,
    healing: contribution.healing / boss.requirements.healing,
    damage: contribution.damage / boss.requirements.damage,
  };

  if (Object.values(rawRatios).every((ratio) => ratio >= dungeon.probability.overpowerThreshold)) {
    return 1;
  }

  const geometricReadiness = Object.entries(boss.weights).reduce(
    (product, [role, weight]) => product * effectiveRatio(rawRatios[role]) ** weight,
    1,
  );
  const bottleneck = Math.min(...Object.values(rawRatios));
  const readiness =
    geometricReadiness * dungeon.probability.geometricWeight +
    bottleneck * dungeon.probability.bottleneckWeight;

  return clamp(
    dungeon.probability.minimum,
    dungeon.probability.maximum,
    dungeon.probability.base + dungeon.probability.readinessMultiplier * readiness,
  );
}

function stageDurationRatio(contribution, boss) {
  const damageRatio = boss.requirements.damage / contribution.damage;
  const outputFactor = clamp(0.5, 1.5, damageRatio ** 0.6);
  const tankRatio = contribution.tank / boss.requirements.tank;
  const healingRatio = contribution.healing / boss.requirements.healing;
  const survivalFactor =
    1 + Math.max(0, 1 - tankRatio) * 0.25 + Math.max(0, 1 - healingRatio) * 0.25;
  return clamp(
    dungeon.duration.minimumRatio,
    dungeon.duration.maximumRatio,
    outputFactor * survivalFactor,
  );
}

function createParty(roles, level = 10, averageItemLevel = 10) {
  return roles.map((role) => ({ role, level, averageItemLevel }));
}

const scenarios = [
  { name: "标准阵容", party: createParty(["tank", "healer", "dps", "dps", "dps"]) },
  { name: "双坦阵容", party: createParty(["tank", "tank", "healer", "dps", "dps"]) },
  { name: "双治疗阵容", party: createParty(["tank", "healer", "healer", "dps", "dps"]) },
  { name: "无坦阵容", party: createParty(["healer", "dps", "dps", "dps", "dps"]) },
  { name: "无治疗阵容", party: createParty(["tank", "dps", "dps", "dps", "dps"]) },
  {
    name: "45级碾压阵容",
    party: createParty(["tank", "healer", "dps", "dps", "dps"], 45, 45),
  },
];

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function simulateScenario(scenario, iterations, seed) {
  const contribution = partyContribution(scenario.party);
  const probabilities = dungeon.bosses.map((boss) => bossProbability(contribution, boss));
  const expectedSeconds = dungeon.bosses.reduce(
    (sum, boss) => sum + boss.stageSeconds * stageDurationRatio(contribution, boss),
    0,
  );
  const random = seededRandom(seed);
  let clears = 0;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let cleared = true;
    for (const probability of probabilities) {
      if (random() >= probability) {
        cleared = false;
        break;
      }
    }
    if (cleared) clears += 1;
  }

  return {
    name: scenario.name,
    contribution,
    probabilities,
    analyticClearRate: probabilities.reduce((product, probability) => product * probability, 1),
    simulatedClearRate: clears / iterations,
    expectedSeconds,
  };
}

const iterations = Number(process.argv[2] ?? 100000);
const results = scenarios.map((scenario, index) =>
  simulateScenario(scenario, iterations, 20260907 + index),
);

console.log(`怒焰裂谷数值模拟：每种阵容 ${iterations.toLocaleString()} 次`);
for (const result of results) {
  console.log(`\n${result.name}`);
  console.log(
    `  贡献 T/H/D: ${result.contribution.tank.toFixed(1)} / ${result.contribution.healing.toFixed(1)} / ${result.contribution.damage.toFixed(1)}`,
  );
  console.log(
    `  Boss通过率: ${result.probabilities.map((value) => `${(value * 100).toFixed(1)}%`).join(" / ")}`,
  );
  console.log(
    `  全通率: 理论 ${(result.analyticClearRate * 100).toFixed(2)}%，模拟 ${(result.simulatedClearRate * 100).toFixed(2)}%`,
  );
  console.log(`  预计耗时: ${(result.expectedSeconds / 60).toFixed(2)} 分钟`);
}
