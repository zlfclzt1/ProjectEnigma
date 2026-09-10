<script setup lang="ts">
import type { ExpeditionActivityView } from "../../application/queries/get-activities-view";
import BossRoute from "./BossRoute.vue";

defineProps<{ activity: ExpeditionActivityView; showSettlementLink?: boolean }>();

function remainingLabel(milliseconds: number | undefined): string {
  if (milliseconds === undefined) return "已结算";
  const seconds = Math.ceil(milliseconds / 1_000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
</script>

<template>
  <article class="expedition-card" :data-status="activity.status">
    <header>
      <div>
        <span>{{ activity.statusLabel }}</span>
        <h3>{{ activity.dungeonName }}</h3>
        <p>
          第 {{ activity.currentRunNumber }} / {{ activity.requestedRuns }} 次 ·
          {{ activity.participantCount }} 人<span v-if="activity.routeVariantName">
            · {{ activity.routeVariantName }}</span
          >
        </p>
      </div>
      <time>{{ remainingLabel(activity.remainingMilliseconds) }}</time>
    </header>
    <div class="progress" :aria-label="`路线进度 ${activity.progressPercent.toFixed(1)}%`">
      <i :style="{ width: `${activity.progressPercent}%` }" />
    </div>
    <p class="members">{{ activity.memberNames.join(" · ") }}</p>
    <BossRoute :stages="activity.route" />
    <ul v-if="activity.rareEvents.length" class="rare-events" aria-label="稀有首领动态">
      <li v-for="event in activity.rareEvents" :key="event.id" :data-outcome="event.outcome">
        第 {{ event.runNumber }} 次 · {{ event.text }}
      </li>
    </ul>
    <ul
      v-if="activity.developmentEvents.length"
      class="development-events"
      aria-label="远征调查动态"
    >
      <li v-for="event in activity.developmentEvents" :key="event.id" :data-type="event.type">
        第 {{ event.runNumber }} 次 · {{ event.text }}
        <strong v-if="event.lootCount">开发战利品 ×{{ event.lootCount }}</strong>
      </li>
    </ul>
    <footer>
      <div>
        <span>全通率 {{ (activity.clearProbability * 100).toFixed(2) }}%</span>
        <span>公式 {{ activity.formulaVersion }}</span>
      </div>
    </footer>
  </article>
</template>

<style scoped>
.expedition-card {
  padding: 16px;
  border: 1px solid #403a30;
  border-radius: 8px;
  background: #111416;
}
header,
footer {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
}
footer > div {
  display: flex;
  gap: 12px;
}
footer a {
  color: #d2a653;
  font-weight: 800;
  text-decoration: none;
}
header span {
  color: #d19f48;
  font-size: 0.62rem;
  font-weight: 850;
}
h3 {
  margin: 3px 0;
  color: #e5d2af;
  font-family: Georgia, serif;
}
header p,
.members {
  margin: 0;
  color: #8d8475;
  font-size: 0.68rem;
}
time {
  color: #edc25f;
  font-size: 1.35rem;
  font-variant-numeric: tabular-nums;
  font-weight: 850;
}
.progress {
  height: 5px;
  margin: 12px 0;
  overflow: hidden;
  border-radius: 4px;
  background: #292722;
}
.progress i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #805d29, #d2a348);
}
.members {
  margin-bottom: 10px;
}
.rare-events {
  display: grid;
  gap: 4px;
  padding: 0;
  margin: 10px 0 0;
  list-style: none;
}
.rare-events li {
  padding: 7px 9px;
  border-left: 2px solid #635b50;
  background: #0c0f11;
  color: #9b9386;
  font-size: 0.64rem;
}
.rare-events li[data-outcome="spawned"] {
  border-left-color: #8f6fb2;
  color: #c4a8df;
}
.development-events {
  display: grid;
  gap: 4px;
  padding: 0;
  margin: 10px 0 0;
  list-style: none;
}
.development-events li {
  padding: 7px 9px;
  border-left: 2px solid #6a5835;
  background: #12100c;
  color: #ae9e82;
  font-size: 0.64rem;
}
.development-events li[data-type="completed"] {
  border-left-color: #c69745;
  color: #dfc080;
}
.development-events strong {
  margin-left: 5px;
  color: #edc968;
}
footer {
  margin-top: 10px;
  color: #777064;
  font-size: 0.62rem;
}
.expedition-card[data-status="completed"] header span {
  color: #69a86f;
}
.expedition-card[data-status="failed"] header span {
  color: #c76c62;
}
</style>
