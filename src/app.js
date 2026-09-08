import {
  SLOT_LABELS,
  averageItemLevel,
  filterMembers,
  formatDuration,
  formatPercent,
  itemLevelGain,
  sellValue,
} from "./core.js";
import { loadBrowserLegacyContent } from "./content/legacy-content-adapter.ts";
import { GuildGame } from "./game.js";

const app = document.querySelector("#app");
const debugMode = new URLSearchParams(location.search).get("debug") === "1";
let content;
let game;
let currentTab = "overview";
let selectedDungeonId = "ragefire_chasm";
let selectedParty = new Set();
let queueCount = 1;
let openMemberId = null;
const rosterFilters = { classId: "all", role: "all" };
const dungeonFilters = { classId: "all", role: "all" };
let toastMessage = "";
let toastTimer;

const EQUIPMENT_LAYOUT = {
  left: ["head", "neck", "shoulder", "back", "chest", "shirt", "tabard", "wrist"],
  right: ["hands", "waist", "legs", "feet", "ring1", "ring2", "trinket1", "trinket2"],
  weapons: ["mainHand", "offHand", "ranged"],
};

const COSMETIC_SLOT_LABELS = {
  shirt: "衬衣",
  tabard: "战袍",
};

const SLOT_GLYPHS = {
  head: "盔",
  neck: "坠",
  shoulder: "肩",
  back: "氅",
  chest: "甲",
  shirt: "衣",
  tabard: "袍",
  wrist: "腕",
  hands: "手",
  waist: "带",
  legs: "腿",
  feet: "靴",
  ring1: "戒",
  ring2: "戒",
  trinket1: "饰",
  trinket2: "饰",
  mainHand: "主",
  offHand: "副",
  ranged: "远",
};

const STARTER_ICON_PATHS = {
  head: '<path d="M7 26V14C7 8 11 4 16 4s9 4 9 10v12h-6v-8h-6v8H7Z"/>',
  neck: '<path d="M8 5c1 8 3 11 8 14 5-3 7-6 8-14l-3-1c-1 6-2 8-5 11-3-3-4-5-5-11L8 5Z"/><circle cx="16" cy="22" r="5"/>',
  shoulder: '<path d="M3 22c2-8 6-12 13-12s11 4 13 12l-7 3-6-7-6 7-7-3Z"/>',
  back: '<path d="M10 5h12l5 22H5l5-22Zm3 4-3 14h12L19 9h-6Z"/>',
  chest: '<path d="m10 5 6 3 6-3 6 7-5 4v11H9V16l-5-4 6-7Z"/>',
  shirt: '<path d="m10 6 6 3 6-3 5 6-5 3v12H10V15l-5-3 5-6Z"/>',
  tabard: '<path d="M10 4h12v24l-6-4-6 4V4Zm3 5v10h6V9h-6Z"/>',
  wrist: '<path d="M7 9h18l-3 14H10L7 9Zm5 4-1 6h10l-1-6h-8Z"/>',
  hands: '<path d="M8 14V6h4v7h1V4h4v9h1V5h4v9h1V8h4v10c0 6-4 9-10 9-7 0-12-5-12-11v-2h3Z"/>',
  waist: '<path d="M3 11h26v10H3V11Zm10 2v6h6v-6h-6Z"/>',
  legs: '<path d="M8 4h16l-1 11 3 13h-8l-2-10-2 10H6l3-13L8 4Z"/>',
  feet: '<path d="M9 5h9v13l8 4v5H7v-8l2-3V5Z"/>',
  ring1: '<path d="M16 4 7 11l3 17h12l3-17-9-7Zm0 6 4 3-2 9h-4l-2-9 4-3Z"/>',
  ring2: '<path d="M16 4 7 11l3 17h12l3-17-9-7Zm0 6 4 3-2 9h-4l-2-9 4-3Z"/>',
  trinket1: '<path d="m16 3 10 9-4 16H10L6 12l10-9Zm0 6-4 5 4 8 4-8-4-5Z"/>',
  trinket2: '<path d="m16 3 10 9-4 16H10L6 12l10-9Zm0 6-4 5 4 8 4-8-4-5Z"/>',
  mainHand: '<path d="m23 3 5 5-8 8-3-3 6-10ZM5 23l8-8 4 4-8 8H5v-4Z"/>',
  offHand: '<path d="m16 3 11 5v8c0 7-4 11-11 14C9 27 5 23 5 16V8l11-5Zm0 6-5 2v5c0 3 2 6 5 8 3-2 5-5 5-8v-5l-5-2Z"/>',
  ranged: '<path d="M25 4c2 7 0 16-7 23l-3-3c6-6 8-12 6-18l4-2ZM7 5l20 20-2 2L5 7l2-2Zm0 20c5-1 9-3 13-7l3 3c-5 5-10 7-16 8v-4Z"/>',
};

const ARMOR_TYPE_LABELS = {
  cloth: "布甲",
  leather: "皮甲",
  mail: "锁甲",
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  toastMessage = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMessage = "";
    render();
  }, 3200);
  render();
}

function getClassDefinition(classId) {
  return content.classes.find((entry) => entry.id === classId);
}

function getPersonality(personalityId) {
  return content.personalities.find((entry) => entry.id === personalityId);
}

function roleBadge(role) {
  return `<span class="role-badge role-${role}">${content.roleLabels[role]}</span>`;
}

function memberStatus(member) {
  return member.status === "idle" ? "空闲" : "副本中";
}

function timeUntil(timestamp) {
  if (timestamp == null) return "候选区已满";
  return formatDuration(Math.ceil((timestamp - Date.now()) / 1000));
}

function classFilterOptions(selectedValue) {
  return [
    `<option value="all" ${selectedValue === "all" ? "selected" : ""}>全部职业</option>`,
    ...content.classes.map(
      (entry) =>
        `<option value="${entry.id}" ${selectedValue === entry.id ? "selected" : ""}>${escapeHtml(entry.name)}</option>`,
    ),
  ].join("");
}

function roleFilterOptions(selectedValue) {
  return [
    ["all", "全部定位"],
    ["tank", "坦克"],
    ["healer", "治疗"],
    ["dps", "输出"],
  ]
    .map(
      ([value, label]) =>
        `<option value="${value}" ${selectedValue === value ? "selected" : ""}>${label}</option>`,
    )
    .join("");
}

function filterBar(scope, filters, members, resultCount) {
  return `
    <div class="filter-bar">
      <div class="field"><label>职业</label><select data-action="member-filter" data-filter-scope="${scope}" data-filter-key="classId">${classFilterOptions(filters.classId)}</select></div>
      <div class="field"><label>定位</label><select data-action="member-filter" data-filter-scope="${scope}" data-filter-key="role">${roleFilterOptions(filters.role)}</select></div>
      <button class="button secondary" data-action="clear-filters" data-filter-scope="${scope}" ${filters.classId === "all" && filters.role === "all" ? "disabled" : ""}>清除筛选</button>
      <span class="muted">显示 ${resultCount}/${members.length} 人</span>
    </div>`;
}

function navButton(id, icon, label, count = "") {
  return `
    <button class="nav-button ${currentTab === id ? "active" : ""}" data-action="tab" data-tab="${id}">
      <span>${icon}</span><span>${label}</span>
      ${count !== "" ? `<span class="nav-count">${count}</span>` : ""}
    </button>`;
}

function pageHeading(title, description, action = "") {
  return `
    <div class="page-heading">
      <div><h2>${title}</h2><p>${description}</p></div>
      ${action}
    </div>`;
}

function genericItemIcon(slot) {
  const paths = STARTER_ICON_PATHS[slot];
  if (!paths) return `<span class="wow-slot-glyph">${SLOT_GLYPHS[slot] ?? "物"}</span>`;
  return `<svg class="starter-item-icon" viewBox="0 0 32 32" aria-hidden="true">${paths}</svg>`;
}

function itemIconMarkup(item, slot) {
  const fallback = item
    ? genericItemIcon(slot)
    : `<span class="wow-slot-glyph">${SLOT_GLYPHS[slot] ?? "物"}</span>`;
  if (!item?.iconName) return fallback;
  const iconUrl = `https://wow.zamimg.com/images/wow/icons/large/${encodeURIComponent(item.iconName)}.jpg`;
  return `<img class="database-item-icon" data-item-icon src="${iconUrl}" alt="" loading="lazy" referrerpolicy="no-referrer">${fallback}`;
}

function equipmentSlot(member, slot, side = "right") {
  const item = member.equipment[slot];
  const slotLabel = SLOT_LABELS[slot] ?? COSMETIC_SLOT_LABELS[slot];
  const quality = item?.quality ?? "empty";
  const itemName = item?.name ?? "空栏位";
  const armorLabel = item?.armorType ? ARMOR_TYPE_LABELS[item.armorType] ?? item.armorType : "";
  const icon = `<span class="wow-slot-icon" aria-hidden="true">${itemIconMarkup(item, slot)}</span>`;
  const copy = `
    <span class="wow-slot-copy">
      <small>${slotLabel}</small>
      <strong>${escapeHtml(itemName)}</strong>
    </span>`;
  const tooltip = item
    ? `<span class="wow-item-tooltip" role="tooltip">
        <strong class="quality-${quality}">${escapeHtml(item.name)}</strong>
        <span>${slotLabel}${armorLabel ? ` · ${escapeHtml(armorLabel)}` : ""}${item.twoHanded ? " · 双手" : ""}</span>
        <span>物品等级 ${item.itemLevel}${item.bound ? " · 已绑定" : ""}</span>
        ${item.description ? `<em>${escapeHtml(item.description)}</em>` : ""}
      </span>`
    : `<span class="wow-item-tooltip" role="tooltip"><strong>空栏位</strong><span>${slotLabel}${COSMETIC_SLOT_LABELS[slot] ? " · 外观栏位" : ""}</span></span>`;

  return `<div class="wow-equipment-slot ${side} quality-${quality}" tabindex="0" aria-label="${escapeHtml(slotLabel)}：${escapeHtml(itemName)}">
    ${side === "left" ? `${copy}${icon}` : `${icon}${copy}`}
    ${tooltip}
  </div>`;
}

function characterSheet(member, personality, specs) {
  const roleSymbol = member.role === "tank" ? "盾" : member.role === "healer" ? "愈" : "刃";
  const classSigil = member.className.slice(0, 1);
  const itemLevel = averageItemLevel(member.equipment).toFixed(1);
  return `
    <div class="character-sheet-overlay">
      <button class="character-sheet-backdrop" data-action="close-member" aria-label="关闭角色面板"></button>
      <section class="character-sheet class-${member.classId}" role="dialog" aria-modal="true" aria-labelledby="character-name-${member.id}">
        <div class="character-sheet-header">
          <div>
            <span class="character-sheet-kicker">角色信息</span>
            <h3 id="character-name-${member.id}">${member.hiddenId ? "✦ " : ""}${escapeHtml(member.name)}</h3>
            <p>${member.level}级 ${escapeHtml(member.race)} ${escapeHtml(member.className)}</p>
          </div>
          <button class="character-sheet-close" data-action="close-member" aria-label="关闭">×</button>
        </div>

        <div class="character-sheet-body">
          <div class="wow-equipment-column wow-equipment-left">
            ${EQUIPMENT_LAYOUT.left.map((slot) => equipmentSlot(member, slot, "left")).join("")}
          </div>

          <div class="wow-paperdoll">
            <div class="paperdoll-glow"></div>
            <div class="paperdoll-level">${member.level}</div>
            <div class="paperdoll-figure" aria-hidden="true">
              <div class="paperdoll-head"></div>
              <div class="paperdoll-shoulders"></div>
              <div class="paperdoll-body"></div>
              <div class="paperdoll-sigil">${escapeHtml(classSigil)}</div>
            </div>
            <div class="paperdoll-nameplate">
              <strong>${escapeHtml(member.specName)} ${escapeHtml(member.className)}</strong>
              <span><b>${roleSymbol}</b> ${content.roleLabels[member.role]} · ${memberStatus(member)}</span>
            </div>
            <div class="paperdoll-stats">
              <div><span>平均物品等级</span><strong>${itemLevel}</strong></div>
              <div><span>护甲类型</span><strong>${ARMOR_TYPE_LABELS[member.armorType] ?? member.armorType}</strong></div>
              <div><span>经验进度</span><strong>${Math.floor(member.experience * 100)}%</strong></div>
              <div><span>性格</span><strong>${escapeHtml(member.personalityName)}</strong></div>
            </div>
          </div>

          <div class="wow-equipment-column wow-equipment-right">
            ${EQUIPMENT_LAYOUT.right.map((slot) => equipmentSlot(member, slot, "right")).join("")}
          </div>

          <div class="wow-weapon-row">
            ${EQUIPMENT_LAYOUT.weapons.map((slot) => equipmentSlot(member, slot, "weapon")).join("")}
          </div>
        </div>

        <div class="character-sheet-footer">
          <div class="character-trait">
            <span>性格特质 · ${escapeHtml(member.personalityName)}</span>
            <strong>${escapeHtml(personality.benefit)}</strong>
            <small>${escapeHtml(personality.drawback)}</small>
          </div>
          <div class="character-actions">
            <div class="field"><label>更改专精 · 300资金</label><select id="respec-${member.id}">${specs}</select></div>
            <button class="button" data-action="respec" data-member-id="${member.id}">确认转专精</button>
            <button class="button danger" data-action="dismiss" data-member-id="${member.id}" ${member.status !== "idle" ? "disabled" : ""}>移出公会</button>
          </div>
        </div>
      </section>
    </div>`;
}

function overviewPage() {
  const state = game.state;
  const active = state.expeditions.filter((expedition) => expedition.status === "active");
  const idleCount = state.members.filter((member) => member.status === "idle").length;
  const firstKills = state.guild.firstKills.length;
  const totalBosses = content.dungeons.reduce((sum, dungeon) => sum + dungeon.bosses.length, 0);
  const recentLogs = state.expeditions
    .flatMap((expedition) => expedition.logs.map((log) => ({ ...log, expedition })))
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, 8);

  return `
    ${pageHeading("公会总览", "安排今天的副本、检查招募进度，然后决定谁配得到那件新装备。")}
    <div class="grid three">
      <section class="card stat-card"><div class="card-body"><span>公会成员</span><strong>${state.members.length}/${state.guild.capacity}</strong><small class="muted">${idleCount} 人空闲</small></div></section>
      <section class="card stat-card"><div class="card-body"><span>进行中的队伍</span><strong>${active.length}</strong><small class="muted">成员不可重复参团</small></div></section>
      <section class="card stat-card"><div class="card-body"><span>副本首杀</span><strong>${firstKills}/${totalBosses}</strong><small class="muted">每个 Boss 首杀都有额外资金</small></div></section>
    </div>
    <div class="grid two" style="margin-top:16px">
      <section class="card">
        <div class="card-header"><h3>正在进行</h3><button class="button secondary" data-action="tab" data-tab="dungeon">组织队伍</button></div>
        <div class="card-body">
          ${active.length ? active.map(compactExpedition).join("") : `<div class="empty-state">暂时没有队伍出发。四座地下城正在安静地等待第一批冒险者。</div>`}
        </div>
      </section>
      <section class="card">
        <div class="card-header"><h3>公会动态</h3><span class="muted">最新 ${recentLogs.length} 条</span></div>
        <div class="card-body">
          ${recentLogs.length ? `<ul class="log-list">${recentLogs.map((entry) => `<li><span class="log-time">${new Date(entry.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>${escapeHtml(entry.text)}</li>`).join("")}</ul>` : `<div class="empty-state">第一支队伍出发后，这里会出现一些非常可靠的战斗记录。</div>`}
        </div>
      </section>
    </div>`;
}

function compactExpedition(expedition) {
  const stage = expedition.currentRun.stages[expedition.stageIndex];
  const remaining = Math.max(0, Math.ceil((expedition.stageEndAt - Date.now()) / 1000));
  return `
    <div class="expedition-card">
      <div class="button-row" style="justify-content:space-between;align-items:center">
        <strong>${escapeHtml(expedition.dungeonName)} · 第 ${expedition.currentRun.number}/${expedition.requestedRuns} 场</strong>
        <span class="status-badge">${escapeHtml(stage.bossName)}</span>
      </div>
      <div class="progress-track" style="margin-top:12px"><div class="progress-bar" data-live-expedition-progress="${expedition.id}" style="width:${stageProgress(expedition)}%"></div></div>
      <p class="muted" style="margin-bottom:0">当前阶段剩余 <span data-live-expedition-remaining="${expedition.id}">${formatDuration(remaining)}</span></p>
    </div>`;
}

function rosterPage() {
  const filteredMembers = filterMembers(game.state.members, rosterFilters);
  const rows = filteredMembers
    .slice()
    .sort((left, right) => right.level - left.level || left.name.localeCompare(right.name))
    .map((member) => {
      const personality = getPersonality(member.personalityId);
      const classDefinition = getClassDefinition(member.classId);
      const specs = classDefinition.specs
        .map(
          (spec) =>
            `<option value="${spec.id}" ${spec.id === member.specId ? "selected" : ""}>${escapeHtml(spec.name)} · ${content.roleLabels[spec.role]}</option>`,
        )
        .join("");
      return `
        <article class="member-row">
          <div>
            <div class="member-name">${member.hiddenId ? "✦ " : ""}${escapeHtml(member.name)}</div>
            <div class="member-meta">${escapeHtml(member.race)} · ${escapeHtml(member.className)} · ${escapeHtml(member.specName)}</div>
          </div>
          <div>${roleBadge(member.role)}</div>
          <div><strong>${member.level}级</strong><div class="member-meta">经验 ${Math.floor(member.experience * 100)}%</div></div>
          <div><strong>装等 ${averageItemLevel(member.equipment).toFixed(1)}</strong><div class="member-meta">${memberStatus(member)}</div></div>
          <div><strong>${escapeHtml(member.personalityName)}</strong><div class="member-meta">${escapeHtml(personality.benefit)}</div></div>
          <details data-member-details="${member.id}" ${openMemberId === member.id ? "open" : ""}>
            <summary class="button secondary">管理</summary>
            ${characterSheet(member, personality, specs)}
          </details>
        </article>`;
    })
    .join("");

  return `
    ${pageHeading("公会成员", "专精决定定位；装备属性负责展示，实际战斗力由等级与综合装等计算。")}
    ${filterBar("roster", rosterFilters, game.state.members, filteredMembers.length)}
    <div class="member-list">${rows || `<div class="empty-state">没有符合当前职业与定位条件的成员。</div>`}</div>`;
}

function recruitPage() {
  const state = game.state;
  const full = state.candidates.length >= 10;
  return `
    ${pageHeading(
      "招募大厅",
      "候选人不会自动离开。每30分钟出现一人，也可以支付固定资金立即找来一位新人。",
      `<button class="button" data-action="generate-candidate" ${full || state.guild.funds < 100 ? "disabled" : ""}>立即出现一人 · 100资金</button>`,
    )}
    <div class="notice">下一名候选人：<strong data-live-recruit-countdown>${timeUntil(state.nextRecruitAt)}</strong>　候选区 ${state.candidates.length}/10</div>
    <div class="candidate-list">
      ${state.candidates
        .map((candidate) => {
          const personality = getPersonality(candidate.personalityId);
          return `
            <article class="candidate-card">
              <div>
                <div class="candidate-name">${candidate.hiddenId ? "✦ 隐藏角色 · " : ""}${escapeHtml(candidate.name)}</div>
                <div class="candidate-facts">
                  <span>${escapeHtml(candidate.race)}</span><span>${escapeHtml(candidate.className)}</span><span>${escapeHtml(candidate.specName)}</span>
                  ${roleBadge(candidate.role)}<span>10级</span><span>装等 ${averageItemLevel(candidate.equipment).toFixed(1)}</span>
                </div>
                <p class="muted"><strong>${escapeHtml(candidate.personalityName)}</strong>：${escapeHtml(personality.benefit)}；${escapeHtml(personality.drawback)}</p>
              </div>
              <div class="button-row" style="align-content:start">
                <button class="button" data-action="recruit" data-candidate-id="${candidate.id}" ${state.members.length >= state.guild.capacity ? "disabled" : ""}>招募</button>
                <button class="button secondary" data-action="reject-candidate" data-candidate-id="${candidate.id}">拒绝</button>
              </div>
            </article>`;
        })
        .join("")}
    </div>`;
}

function dungeonPage() {
  let selectedDungeon = content.dungeonById.get(selectedDungeonId) ?? content.dungeon;
  if (!game.isDungeonUnlocked(selectedDungeon.id)) {
    selectedDungeon = content.dungeons.find((dungeon) => game.isDungeonUnlocked(dungeon.id)) ?? content.dungeon;
    selectedDungeonId = selectedDungeon.id;
  }
  const idleMembers = game.state.members.filter((member) => member.status === "idle");
  const filteredIdleMembers = filterMembers(idleMembers, dungeonFilters);
  selectedParty = new Set([...selectedParty].filter((id) => idleMembers.some((member) => member.id === id)));
  const selectedMembers = [...selectedParty]
    .map((id) => game.state.members.find((member) => member.id === id))
    .filter(Boolean);
  const preview = selectedMembers.length
    ? game.previewParty([...selectedParty], selectedDungeon.id)
    : null;
  const roleCounts = selectedMembers.reduce(
    (counts, member) => ({ ...counts, [member.role]: counts[member.role] + 1 }),
    { tank: 0, healer: 0, dps: 0 },
  );

  return `
    ${pageHeading("副本与组队", "阵容没有硬性坦奶输出限制；每个Boss都会根据三种贡献给出精确通过率。")}
    <div class="dungeon-selector">
      ${content.dungeons
        .map(
          (dungeon) => {
            const unlocked = game.isDungeonUnlocked(dungeon.id);
            const prerequisites = [
              ...(dungeon.unlock?.requiredDungeonIds ?? []),
              ...(dungeon.unlock?.requiredAnyDungeonIds ?? []),
            ]
              .map((id) => content.dungeonById.get(id)?.name)
              .filter(Boolean)
              .join("或");
            return `
            <button class="dungeon-choice ${dungeon.id === selectedDungeon.id ? "active" : ""} ${unlocked ? "" : "locked"}" data-action="select-dungeon" data-dungeon-id="${dungeon.id}" ${unlocked ? "" : "disabled"}>
              <span>${escapeHtml(dungeon.name)}</span>
              <strong>${unlocked ? `推荐${dungeon.recommendedLevel}级 · 可带低级成员` : `未解锁 · 需通关${escapeHtml(prerequisites)} · 公会有人达到${dungeon.minimumLevel}级`}</strong>
              <small>${dungeon.bosses.length}个Boss · 基础${formatDuration(dungeon.duration.baseSeconds)}</small>
            </button>`;
          },
        )
        .join("")}
    </div>
    <div class="grid two">
      <section class="card">
        <div class="card-header"><h3>选择成员 · ${selectedMembers.length}/${selectedDungeon.members.maximum}</h3><span class="muted">副本已解锁，成员等级不限</span></div>
        <div class="card-body">
          ${filterBar("dungeon", dungeonFilters, idleMembers, filteredIdleMembers.length)}
          <div class="party-picker">
            ${filteredIdleMembers
              .map(
                (member) => `
                  <label class="party-option">
                    <input type="checkbox" data-action="toggle-party" data-member-id="${member.id}" ${selectedParty.has(member.id) ? "checked" : ""} ${!selectedParty.has(member.id) && selectedParty.size >= selectedDungeon.members.maximum ? "disabled" : ""} />
                    <strong>${escapeHtml(member.name)}</strong>
                    <div class="member-meta">${escapeHtml(member.className)} · ${escapeHtml(member.specName)}</div>
                    <div class="candidate-facts">${roleBadge(member.role)}<span>${member.level}级</span><span>装等 ${averageItemLevel(member.equipment).toFixed(1)}</span></div>
                  </label>`,
              )
              .join("") || `<div class="empty-state">没有符合当前筛选条件的空闲成员。</div>`}
          </div>
        </div>
      </section>
      <section class="card">
        <div class="card-header"><h3>${escapeHtml(selectedDungeon.name)}</h3><span class="status-badge">基础${formatDuration(selectedDungeon.duration.baseSeconds)}</span></div>
        <div class="card-body">
          ${preview ? partyPreview(preview, roleCounts) : `<div class="empty-state">选择成员后，这里会显示每个Boss的精确通过率。</div>`}
          <div class="form-row" style="margin-top:18px">
            <div class="field"><label for="queue-count">连续挑战</label><select id="queue-count" data-action="queue-count"><option value="1" ${queueCount === 1 ? "selected" : ""}>1次</option><option value="2" ${queueCount === 2 ? "selected" : ""}>2次</option><option value="3" ${queueCount === 3 ? "selected" : ""}>3次</option></select></div>
            <button class="button" data-action="start-expedition" ${selectedMembers.length === 0 ? "disabled" : ""}>派出队伍</button>
          </div>
        </div>
      </section>
    </div>`;
}

function partyPreview(preview, roleCounts) {
  return `
    <div class="detail-grid">
      <div><span>阵容</span><strong>${roleCounts.tank}坦 / ${roleCounts.healer}治疗 / ${roleCounts.dps}输出</strong></div>
      <div><span>全通率</span><strong>${formatPercent(preview.clearProbability)}</strong></div>
      <div><span>坦克贡献</span><strong>${preview.contribution.tank.toFixed(1)}</strong></div>
      <div><span>治疗贡献</span><strong>${preview.contribution.healing.toFixed(1)}</strong></div>
      <div><span>输出贡献</span><strong>${preview.contribution.damage.toFixed(1)}</strong></div>
      <div><span>预计耗时</span><strong>${formatDuration(preview.durationSeconds)}</strong></div>
    </div>
    <div class="probability-grid">
      ${preview.bosses
        .map(
          (result) => `
            <div class="probability-row">
              <span>${escapeHtml(result.boss.name)}</span>
              <strong>${formatPercent(result.probability)}</strong>
              <div class="progress-track"><div class="progress-bar ${result.probability < 0.6 ? "red" : result.probability >= 0.9 ? "green" : ""}" style="width:${result.probability * 100}%"></div></div>
            </div>`,
        )
        .join("")}
    </div>`;
}

function stageProgress(expedition) {
  if (expedition.status !== "active") return 100;
  const total = expedition.stageEndAt - expedition.stageStartedAt;
  return Math.max(0, Math.min(100, ((Date.now() - expedition.stageStartedAt) / total) * 100));
}

function activePage() {
  const expeditions = game.state.expeditions.slice().reverse();
  return `
    ${pageHeading("副本行动", "副本按Boss节点逐段结算。刷新或关闭网页不会改变已经锁定的结果。")}
    <div class="expedition-list">
      ${expeditions.length ? expeditions.map(expeditionCard).join("") : `<div class="empty-state">还没有副本记录。</div>`}
    </div>`;
}

function expeditionCard(expedition) {
  const active = expedition.status === "active";
  const stage = expedition.currentRun?.stages[expedition.stageIndex];
  const members = expedition.memberIds
    .map((id) => game.state.members.find((member) => member.id === id)?.name)
    .filter(Boolean)
    .join("、");
  const statusText = active ? "进行中" : expedition.status === "failed" ? `止步于 ${expedition.failedBossName}` : "队列完成";
  const currentRemaining = active ? Math.max(0, Math.ceil((expedition.stageEndAt - Date.now()) / 1000)) : 0;
  return `
    <article class="card expedition-card">
      <div class="button-row" style="justify-content:space-between;align-items:center">
        <div><strong>${escapeHtml(expedition.dungeonName)}</strong><div class="member-meta">${escapeHtml(members)}</div></div>
        <span class="status-badge">${escapeHtml(statusText)}</span>
      </div>
      <div class="route">
        ${expedition.currentRun.stages
          .map((routeStage, index) => {
            const className = routeStage.status === "success" ? "done" : routeStage.status === "failed" ? "failed" : active && index === expedition.stageIndex ? "current" : "";
            return `<div class="route-node ${className}">${escapeHtml(routeStage.bossName)}<br>${formatPercent(routeStage.probability)}</div>`;
          })
          .join("")}
      </div>
      ${active ? `<div class="progress-track"><div class="progress-bar" data-live-expedition-progress="${expedition.id}" style="width:${stageProgress(expedition)}%"></div></div><p class="muted">第 ${expedition.currentRun.number}/${expedition.requestedRuns} 场 · ${escapeHtml(stage.bossName)} · 剩余 <span data-live-expedition-remaining="${expedition.id}">${formatDuration(currentRemaining)}</span></p>` : `<p class="muted">已完成 ${expedition.runsCompleted}/${expedition.requestedRuns} 场</p>`}
      ${debugMode && active ? `<div class="debug-panel"><strong>开发工具</strong><div class="button-row" style="margin-top:8px"><button class="button secondary" data-action="debug-finish-stage" data-expedition-id="${expedition.id}">立即完成下一阶段</button></div></div>` : ""}
      <ul class="log-list">${expedition.logs
        .slice()
        .reverse()
        .map((log) => `<li><span class="log-time">${new Date(log.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>${escapeHtml(log.text)}</li>`)
        .join("")}</ul>
    </article>`;
}

function lootPage() {
  const pending = game.state.pendingLoot;
  return `
    ${pageHeading(
      "战利品分配",
      "装备只能交给击败对应Boss时在场且符合装备限制的成员；分配后立即绑定并换装。",
      `<button class="button" data-action="auto-assign" ${pending.length ? "" : "disabled"}>自动分配全部</button>`,
    )}
    <div class="loot-list">
      ${pending.length ? pending.map(lootCard).join("") : `<div class="empty-state">目前没有待分配装备。装备委员会可以暂时休会。</div>`}
    </div>`;
}

function lootCard(loot) {
  const eligible = game.eligibleMembers(loot);
  const locked = game.isLootLocked(loot);
  const options = eligible
    .map((member) => {
      const gain = itemLevelGain(member, loot.item);
      return `<option value="${member.id}">${escapeHtml(member.name)} · 提升 ${gain.toFixed(2)} 装等</option>`;
    })
    .join("");
  return `
    <article class="loot-card">
      <div class="loot-item-summary">
        <div class="loot-item-icon quality-${loot.item.quality}">${itemIconMarkup(loot.item, loot.item.slot)}</div>
        <div>
          <div class="loot-name ${loot.item.quality}"><strong>${escapeHtml(loot.item.name)}</strong> · 物品等级 ${loot.item.itemLevel}</div>
          <div class="loot-facts"><span>${SLOT_LABELS[loot.item.slot]}</span><span>来自 ${escapeHtml(loot.sourceBossName)}</span><span>第 ${loot.runNumber} 场</span><span>出售 ${sellValue(loot.item)} 资金</span>${locked ? `<span>队列结束后可分配</span>` : ""}</div>
          <p class="muted">${escapeHtml(loot.item.description)}</p>
        </div>
      </div>
      <div class="form-row" style="align-content:start">
        <div class="field"><label>符合资格的成员</label><select id="loot-member-${loot.id}" ${eligible.length && !locked ? "" : "disabled"}>${options || `<option>无人能够装备</option>`}</select></div>
        <button class="button" data-action="assign-loot" data-loot-id="${loot.id}" ${eligible.length && !locked ? "" : "disabled"}>分配</button>
        <button class="button secondary" data-action="sell-loot" data-loot-id="${loot.id}" ${locked ? "disabled" : ""}>出售</button>
      </div>
    </article>`;
}

function renderSignature() {
  const state = game.state;
  return JSON.stringify({
    funds: state.guild.funds,
    candidates: state.candidates.map((candidate) => candidate.id),
    members: state.members.map((member) => [
      member.id,
      member.level,
      member.experience,
      member.status,
      member.specId,
      averageItemLevel(member.equipment),
    ]),
    loot: state.pendingLoot.map((entry) => entry.id),
    expeditions: state.expeditions.map((expedition) => [
      expedition.id,
      expedition.status,
      expedition.stageIndex,
      expedition.runsCompleted,
      expedition.currentRun?.number,
    ]),
  });
}

function updateLiveElements() {
  const recruitCountdown = document.querySelector("[data-live-recruit-countdown]");
  if (recruitCountdown) recruitCountdown.textContent = timeUntil(game.state.nextRecruitAt);
  for (const expedition of game.state.expeditions.filter((entry) => entry.status === "active")) {
    document
      .querySelectorAll(`[data-live-expedition-progress="${CSS.escape(expedition.id)}"]`)
      .forEach((element) => {
        element.style.width = `${stageProgress(expedition)}%`;
      });
    const remaining = Math.max(0, Math.ceil((expedition.stageEndAt - Date.now()) / 1000));
    document
      .querySelectorAll(`[data-live-expedition-remaining="${CSS.escape(expedition.id)}"]`)
      .forEach((element) => {
        element.textContent = formatDuration(remaining);
      });
  }
}

function tick() {
  const before = renderSignature();
  game.settle();
  const after = renderSignature();
  if (before !== after) render({ settle: false });
  else updateLiveElements();
}

function render({ settle = true } = {}) {
  if (settle) game.settle();
  const state = game.state;
  const activeCount = state.expeditions.filter((entry) => entry.status === "active").length;
  const pages = {
    overview: overviewPage,
    roster: rosterPage,
    recruit: recruitPage,
    dungeon: dungeonPage,
    active: activePage,
    loot: lootPage,
  };
  const page = pages[currentTab] ?? overviewPage;
  app.innerHTML = `
    <header class="game-header">
      <div class="brand-mark">M</div>
      <div class="brand-copy"><h1>${escapeHtml(state.guild.name)}</h1><p>经典旧世地下城 · 本地存档</p></div>
      <div class="resource-strip">
        <div class="resource-pill"><span>公会资金</span><strong>${state.guild.funds}</strong></div>
        <div class="resource-pill"><span>成员</span><strong>${state.members.length}/${state.guild.capacity}</strong></div>
      </div>
    </header>
    <div class="game-layout">
      <nav class="game-nav">
        ${navButton("overview", "⌂", "总览")}
        ${navButton("roster", "♟", "成员", state.members.length)}
        ${navButton("recruit", "+", "招募", state.candidates.length)}
        ${navButton("dungeon", "⚔", "副本")}
        ${navButton("active", "◴", "行动", activeCount)}
        ${navButton("loot", "◇", "战利品", state.pendingLoot.length)}
        ${debugMode ? `<button class="nav-button" data-action="reset-game"><span>↻</span><span>重置存档</span></button>` : ""}
      </nav>
      <main class="game-main">${page()}</main>
    </div>
    ${toastMessage ? `<div class="toast">${escapeHtml(toastMessage)}</div>` : ""}`;
}

function handleAction(target) {
  const action = target.dataset.action;
  if (!action) return;
  try {
    if (action === "tab") {
      currentTab = target.dataset.tab;
    } else if (action === "select-dungeon") {
      if (game.isDungeonUnlocked(target.dataset.dungeonId)) {
        selectedDungeonId = target.dataset.dungeonId;
        selectedParty.clear();
      }
    } else if (action === "member-filter") {
      const filters = target.dataset.filterScope === "roster" ? rosterFilters : dungeonFilters;
      filters[target.dataset.filterKey] = target.value;
    } else if (action === "clear-filters") {
      const filters = target.dataset.filterScope === "roster" ? rosterFilters : dungeonFilters;
      filters.classId = "all";
      filters.role = "all";
    } else if (action === "close-member") {
      openMemberId = null;
    } else if (action === "queue-count") {
      queueCount = Number(target.value);
    } else if (action === "toggle-party") {
      const id = target.dataset.memberId;
      if (target.checked) selectedParty.add(id);
      else selectedParty.delete(id);
    } else if (action === "start-expedition") {
      game.startExpedition([...selectedParty], queueCount, Date.now(), selectedDungeonId);
      selectedParty.clear();
      currentTab = "active";
      showToast(`队伍已经出发，连续挑战 ${queueCount} 次。`);
      return;
    } else if (action === "generate-candidate") {
      const candidate = game.generateCandidate();
      showToast(`${candidate.name} 出现在招募大厅。`);
      return;
    } else if (action === "recruit") {
      const member = game.recruit(target.dataset.candidateId);
      showToast(`${member.name} 已加入公会。`);
      return;
    } else if (action === "reject-candidate") {
      game.rejectCandidate(target.dataset.candidateId);
    } else if (action === "dismiss") {
      const member = game.state.members.find((entry) => entry.id === target.dataset.memberId);
      if (member && confirm(`确定让 ${member.name} 离开公会吗？绑定装备不会返还。`)) {
        game.dismissMember(member.id);
        selectedParty.delete(member.id);
      }
    } else if (action === "respec") {
      const member = game.state.members.find((entry) => entry.id === target.dataset.memberId);
      const specId = document.querySelector(`#respec-${CSS.escape(target.dataset.memberId)}`)?.value;
      if (member && specId && specId !== member.specId && confirm(`确定花费300资金让 ${member.name} 更改专精吗？不适配装备将自动出售。`)) {
        game.respecMember(member.id, specId);
        showToast(`${member.name} 已完成专精转换。`);
        return;
      }
    } else if (action === "debug-finish-stage") {
      game.forceCompleteNextStage(target.dataset.expeditionId);
    } else if (action === "assign-loot") {
      const lootId = target.dataset.lootId;
      const memberId = document.querySelector(`#loot-member-${CSS.escape(lootId)}`)?.value;
      const member = game.assignLoot(lootId, memberId);
      showToast(`装备已分配给 ${member.name}，旧装备已处理。`);
      return;
    } else if (action === "sell-loot") {
      const value = game.sellLoot(target.dataset.lootId);
      showToast(`装备已出售，公会获得 ${value} 资金。`);
      return;
    } else if (action === "auto-assign") {
      const result = game.autoAssignAll();
      showToast(`自动分配完成：装备 ${result.assigned} 件，出售 ${result.sold} 件。`);
      return;
    } else if (action === "reset-game") {
      if (confirm("确定清除当前原型存档并重新开始吗？")) {
        game.reset();
        selectedParty.clear();
        currentTab = "overview";
      }
    }
    render();
  } catch (error) {
    showToast(error.message ?? "操作失败。");
  }
}

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (target && !["INPUT", "SELECT"].includes(target.tagName)) handleAction(target);
});

app.addEventListener("change", (event) => {
  if (event.target.matches('input[data-action="toggle-party"], select[data-action]')) {
    handleAction(event.target);
  }
});

app.addEventListener(
  "error",
  (event) => {
    if (event.target.matches?.("img[data-item-icon]")) event.target.remove();
  },
  true,
);

app.addEventListener(
  "toggle",
  (event) => {
    if (!event.target.matches("details[data-member-details]")) return;
    const memberId = event.target.dataset.memberDetails;
    if (event.target.open) openMemberId = memberId;
    else if (openMemberId === memberId) openMemberId = null;
  },
  true,
);

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !openMemberId) return;
  openMemberId = null;
  render();
});

try {
  content = loadBrowserLegacyContent();
  game = new GuildGame(content);
  render();
  setInterval(tick, 1000);
} catch (error) {
  console.error(error);
  app.innerHTML = `<div class="loading-screen"><div class="notice error"><strong>原型加载失败</strong><br>${escapeHtml(error.message)}</div></div>`;
}
