import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { itemDefinitionFileSchema, type ItemDefinition } from "../src/content/schemas/item";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const itemRoot = path.join(projectRoot, "content/items");
const reportPath = path.join(projectRoot, "docs/generated/current-item-stat-audit.md");

function loadItems(): ItemDefinition[] {
  return fs
    .readdirSync(itemRoot)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .flatMap(
      (name) =>
        itemDefinitionFileSchema.parse(
          JSON.parse(fs.readFileSync(path.join(itemRoot, name), "utf8")),
        ).items,
    );
}

function statSummary(item: ItemDefinition): string {
  const parts: string[] = [];
  const primaryLabels = {
    strengthPoints: "力量",
    agilityPoints: "敏捷",
    staminaPoints: "耐力",
    intellectPoints: "智力",
    spiritPoints: "精神",
  } as const;
  for (const [key, label] of Object.entries(primaryLabels)) {
    const value = item.stats.primary?.[key as keyof typeof primaryLabels];
    if (value) parts.push(`${label} ${value}`);
  }
  const defense = item.stats.defense;
  if (defense?.armorPoints) parts.push(`护甲 ${defense.armorPoints}`);
  if (defense?.defenseSkillPoints) parts.push(`防御技能 ${defense.defenseSkillPoints}`);
  if (defense?.blockValuePoints) parts.push(`格挡值 ${defense.blockValuePoints}`);
  if (defense?.dodgePercent) parts.push(`闪避 ${defense.dodgePercent}%`);
  if (defense?.parryPercent) parts.push(`招架 ${defense.parryPercent}%`);
  if (defense?.blockPercent) parts.push(`格挡 ${defense.blockPercent}%`);
  const physical = item.stats.physical;
  if (physical?.attackPowerPoints) parts.push(`攻击强度 ${physical.attackPowerPoints}`);
  if (physical?.rangedAttackPowerPoints)
    parts.push(`远程攻击强度 ${physical.rangedAttackPowerPoints}`);
  if (physical?.hitPercent) parts.push(`物理命中 ${physical.hitPercent}%`);
  if (physical?.criticalStrikePercent) parts.push(`物理暴击 ${physical.criticalStrikePercent}%`);
  const spell = item.stats.spell;
  if (spell?.spellPowerPoints) parts.push(`法术强度 ${spell.spellPowerPoints}`);
  if (spell?.healingPowerPoints) parts.push(`治疗强度 ${spell.healingPowerPoints}`);
  if (spell?.hitPercent) parts.push(`法术命中 ${spell.hitPercent}%`);
  if (spell?.criticalStrikePercent) parts.push(`法术暴击 ${spell.criticalStrikePercent}%`);
  const weapon = item.stats.weapon;
  if (weapon) {
    parts.push(
      `伤害 ${weapon.damage.minimumPoints}–${weapon.damage.maximumPoints} / ${weapon.speedSeconds.toFixed(2)} 秒`,
    );
  }
  const resistanceLabels = {
    arcanePoints: "奥术抗性",
    firePoints: "火焰抗性",
    frostPoints: "冰霜抗性",
    naturePoints: "自然抗性",
    shadowPoints: "暗影抗性",
  } as const;
  for (const [key, label] of Object.entries(resistanceLabels)) {
    const value = item.stats.resistances?.[key as keyof typeof resistanceLabels];
    if (value) parts.push(`${label} ${value}`);
  }
  return parts.join("、") || "—";
}

function buildReport(): string {
  const items = loadItems();
  const realItems = items.filter((item) => !item.isStarter);
  const starterItems = items.filter((item) => item.isStarter);

  assert.equal(realItems.length, 158, "当前真实副本与任务装备数量应为 158");
  assert.equal(starterItems.length, 41, "当前初始装备定义数量应为 41");
  for (const item of realItems) {
    assert.ok(Object.keys(item.stats).length > 0, `${item.id} 缺少真实属性`);
    assert.equal(item.statsSource.kind, "source-fact", `${item.id} 属性来源不是事实资料`);
    assert.equal(item.statsSource.provider, "wowhead-classic", `${item.id} 未引用 Wowhead`);
    assert.equal(item.statsSource.externalId, item.id, `${item.id} 外部物品 ID 不匹配`);
  }
  for (const item of starterItems) {
    assert.ok(Object.keys(item.stats).length > 0, `${item.id} 缺少入门平衡属性`);
    assert.equal(item.statsSource.provider, "manual", `${item.id} 未标记 manual`);
    assert.ok(
      item.statsBalanceOverride?.fields.includes("stats"),
      `${item.id} 缺少 stats 平衡覆盖标记`,
    );
  }

  const lines = [
    "# 当前装备属性审计",
    "",
    "生成日期：2026-09-09",
    "",
    "## 结论",
    "",
    `- 真实副本与任务装备：${realItems.length} / ${realItems.length} 已录入有单位属性并引用 Wowhead Classic XML。`,
    `- 初始装备：${starterItems.length} / ${starterItems.length} 已录入本游戏平衡属性，并标记 manual 与 stats balance override。`,
    "- 未确认而猜测的真实属性：0 项。",
    "- 触发效果和套装效果不作为单件常驻属性写入；相关排除项记录在物品来源说明中。",
    "- Boss 与掉落关系已于 2026-09-09 对照 AtlasLootClassic；本游戏的必掉数量和公共任务奖励池继续作为平衡覆盖。",
    "",
    "## 真实装备",
    "",
    "| ID | 名称 | 需求等级 | 栏位 | 属性 | 来源 | 核对日期 |",
    "|---:|---|---:|---|---|---|---|",
    ...realItems
      .sort((left, right) => Number(left.id) - Number(right.id))
      .map(
        (item) =>
          `| ${item.id} | ${item.name.zhCN} | ${item.requiredLevel ?? "—"} | ${item.slot} | ${statSummary(item)} | ${item.statsSource.provider} | ${item.statsSource.verifiedAt} |`,
      ),
    "",
    "## 特殊说明",
    "",
    ...realItems
      .filter((item) => item.statsSource.notes)
      .map((item) => `- ${item.id} ${item.name.zhCN}：${item.statsSource.notes}`),
    "",
    "## 初始装备",
    "",
    "初始装备不是数据库同名物品。它们只用于确保 10 级新成员拥有可计算、可参与最低级副本的轻量属性基线。",
    "",
    "| ID | 栏位 | 护甲类型 | 平衡属性 | 来源 | 覆盖 |",
    "|---|---|---|---|---|---|",
    ...starterItems.map(
      (item) =>
        `| ${item.id} | ${item.slot} | ${item.armorType ?? "通用"} | ${statSummary(item)} | manual | stats |`,
    ),
  ];
  return `${lines.join("\n")}\n`;
}

const mode = process.argv[2] ?? "--check";
const report = buildReport();
if (mode === "--write") {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report);
  console.log(`已更新 ${path.relative(projectRoot, reportPath)}`);
} else if (mode === "--check") {
  assert.equal(
    fs.readFileSync(reportPath, "utf8"),
    report,
    "装备属性审计报告已变化；请显式运行 npm run item-stats:audit:write。",
  );
  console.log("装备属性审计通过：158 件真实装备与 41 件初始装备属性完整。");
} else {
  throw new Error(`未知参数：${mode}`);
}
