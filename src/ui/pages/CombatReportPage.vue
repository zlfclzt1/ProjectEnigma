<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";
import type { CombatReportId } from "../../domain/shared/ids";
import { useGameStore } from "../../stores/game-store";
import MemberCombatTable from "../components/MemberCombatTable.vue";
import CombatEventList from "../components/CombatEventList.vue";

const game = useGameStore();
const route = useRoute();
const selected = computed(() => {
  const reportId = route.params.reportId;
  if (typeof reportId === "string") return game.combatReport(reportId as CombatReportId);
  return game.combatReports?.reports[0] ?? null;
});

function durationLabel(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
</script>

<template>
  <section v-if="game.combatReports" class="report-layout">
    <aside>
      <p class="kicker">战报档案</p>
      <h2>战斗记录</h2>
      <nav v-if="game.combatReports.reports.length">
        <RouterLink
          v-for="report in game.combatReports.reports"
          :key="report.id"
          :to="`/reports/${report.id}`"
          :class="{ selected: selected?.id === report.id }"
        >
          <span :data-outcome="report.outcome">{{ report.outcomeLabel }}</span>
          <strong>{{ report.encounterName }}</strong>
          <small>{{ report.dungeonName }} · 第 {{ report.runNumber }} 次</small>
        </RouterLink>
      </nav>
      <p v-else class="empty">还没有结算过 Boss，档案管理员正在假装整理文件。</p>
    </aside>

    <article v-if="selected" class="report-detail">
      <header>
        <div>
          <span :data-outcome="selected.outcome">{{ selected.outcomeLabel }}</span>
          <h3>{{ selected.encounterName }}</h3>
          <p>
            {{ selected.dungeonName }} · 第 {{ selected.runNumber }} 次 · 公式
            {{ selected.formulaVersion }}
          </p>
        </div>
        <strong>{{ (selected.startedProbability * 100).toFixed(2) }}%</strong>
      </header>
      <dl class="totals">
        <div>
          <dt>战前胜率</dt>
          <dd>{{ (selected.startedProbability * 100).toFixed(2) }}%</dd>
        </div>
        <div>
          <dt>耗时</dt>
          <dd>{{ durationLabel(selected.actualDurationSeconds) }}</dd>
        </div>
        <div>
          <dt>总伤害</dt>
          <dd>{{ selected.totals.damage.toLocaleString() }}</dd>
        </div>
        <div>
          <dt>总治疗</dt>
          <dd>{{ selected.totals.healing.toLocaleString() }}</dd>
        </div>
        <div>
          <dt>总承伤</dt>
          <dd>{{ selected.totals.damageTaken.toLocaleString() }}</dd>
        </div>
      </dl>

      <section class="panel">
        <h4>成员统计</h4>
        <MemberCombatTable :members="selected.members" />
      </section>
      <section v-if="selected.mechanics.length" class="panel mechanics">
        <h4>机制处理</h4>
        <article v-for="mechanic in selected.mechanics" :key="mechanic.id">
          <strong>{{ mechanic.name }}</strong>
          <span :data-satisfied="mechanic.satisfied">{{
            mechanic.satisfied ? "已处理" : "未完整处理"
          }}</span>
          <p>{{ mechanic.requirementLabels.join(" · ") }}</p>
          <small v-if="mechanic.impactLabels.length">{{ mechanic.impactLabels.join(" · ") }}</small>
          <small v-else>无额外惩罚 · {{ mechanic.reportTag }}</small>
        </article>
      </section>
      <section class="panel">
        <h4>副本日常</h4>
        <CombatEventList :logs="selected.logs" />
      </section>
      <section class="panel rewards">
        <h4>实际奖励</h4>
        <p>
          公会资金 +{{ selected.rewards.funds }} G<span v-if="selected.rewards.firstKillBonus">
            · 首杀 +{{ selected.rewards.firstKillBonus }} G</span
          >
        </p>
        <p v-if="selected.rewards.itemNames.length">
          掉落：{{ selected.rewards.itemNames.join("、") }}
        </p>
        <p v-if="selected.rewards.experience.length">
          经验：{{
            selected.rewards.experience
              .map((entry) => `${entry.memberName} +${entry.fraction.toFixed(2)} 级`)
              .join("；")
          }}
        </p>
      </section>
    </article>
  </section>
</template>

<style scoped>
.report-layout {
  display: grid;
  grid-template-columns: minmax(210px, 0.55fr) minmax(0, 1.45fr);
  align-items: start;
  gap: 14px;
}
aside,
.report-detail,
.panel {
  padding: 15px;
  border: 1px solid #39352e;
  border-radius: 8px;
  background: #111416;
}
.kicker {
  margin: 0;
  color: #9b7438;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.14em;
}
h2 {
  margin: 4px 0 14px;
  color: #efddbc;
  font-family: Georgia, serif;
}
nav {
  display: grid;
  gap: 5px;
}
nav a {
  display: grid;
  gap: 2px;
  padding: 9px;
  border: 1px solid #2e2c28;
  border-radius: 5px;
  color: inherit;
  background: #090c0e;
  text-decoration: none;
}
nav a.selected,
nav a:hover {
  border-color: #98743a;
}
nav span,
.report-detail header span {
  color: #6cb172;
  font-size: 0.6rem;
}
[data-outcome="defeat"] {
  color: #cb7065 !important;
}
nav strong {
  color: #d4c6ad;
  font-size: 0.72rem;
}
nav small {
  color: #7a7368;
  font-size: 0.59rem;
}
.report-detail {
  display: grid;
  gap: 12px;
}
.report-detail > header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
}
h3 {
  margin: 3px 0;
  color: #ead8b7;
  font-family: Georgia, serif;
  font-size: 1.55rem;
}
.report-detail header p {
  margin: 0;
  color: #827a6d;
  font-size: 0.67rem;
}
.report-detail header > strong {
  color: #e2b657;
  font-size: 1.3rem;
}
.totals {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 5px;
  margin: 0;
}
.totals div {
  padding: 9px;
  background: #090c0e;
  text-align: center;
}
dt {
  color: #777064;
  font-size: 0.58rem;
}
dd {
  margin: 3px 0 0;
  color: #d6c8af;
  font-size: 0.72rem;
  font-weight: 800;
}
.panel {
  padding: 12px;
  background: #0e1113;
}
h4 {
  margin: 0 0 10px;
  color: #cdb995;
}
.rewards p,
.empty {
  color: #948a79;
  font-size: 0.7rem;
  line-height: 1.5;
}
.mechanics article {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 3px 10px;
  padding: 8px 10px;
  border-left: 2px solid #a75249;
  background: #090c0e;
}
.mechanics article + article {
  margin-top: 5px;
}
.mechanics article strong {
  color: #d4c6ad;
  font-size: 0.72rem;
}
.mechanics article span {
  color: #cb7065;
  font-size: 0.62rem;
}
.mechanics article span[data-satisfied="true"] {
  color: #77bd7d;
}
.mechanics article p,
.mechanics article small {
  grid-column: 1 / -1;
  margin: 0;
  color: #8d8475;
  font-size: 0.62rem;
}
@media (max-width: 760px) {
  .report-layout {
    grid-template-columns: 1fr;
  }
  .totals {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
