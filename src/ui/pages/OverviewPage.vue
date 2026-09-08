<script setup lang="ts">
import { useGameStore } from "../../stores/game-store";
import ActivitySummary from "../components/ActivitySummary.vue";

const game = useGameStore();
</script>

<template>
  <section v-if="game.overview" class="page-stack">
    <header class="page-heading">
      <div>
        <p class="kicker">会长办公室</p>
        <h2>{{ game.overview.guildName }}</h2>
      </div>
      <strong>{{ game.overview.funds }} G</strong>
    </header>

    <dl class="summary-grid">
      <div>
        <dt>公会成员</dt>
        <dd>{{ game.overview.memberCount }} / {{ game.overview.memberCapacity }}</dd>
      </div>
      <div>
        <dt>空闲成员</dt>
        <dd>{{ game.overview.idleMemberCount }}</dd>
      </div>
      <div>
        <dt>出勤成员</dt>
        <dd>{{ game.overview.activeMemberCount }}</dd>
      </div>
      <div>
        <dt>候选区</dt>
        <dd>{{ game.overview.candidateCount }} / {{ game.overview.candidateCapacity }}</dd>
      </div>
      <div>
        <dt>待分配装备</dt>
        <dd>{{ game.overview.pendingLootCount }}</dd>
      </div>
      <div>
        <dt>已完成副本</dt>
        <dd>{{ game.overview.completedExpeditionCount }}</dd>
      </div>
    </dl>

    <section>
      <div class="section-heading">
        <h3>正在进行</h3>
        <span>{{ game.overview.activities.length }} 支队伍</span>
      </div>
      <div v-if="game.overview.activities.length" class="activity-list">
        <ActivitySummary
          v-for="activity in game.overview.activities"
          :key="activity.id"
          :activity="activity"
          :now="game.now"
        />
      </div>
      <p v-else class="empty">目前没人出门。酒馆老板说这通常不是好兆头。</p>
    </section>
  </section>
</template>

<style scoped>
.page-stack {
  display: grid;
  gap: 28px;
}
.page-heading,
.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
}
.page-heading h2 {
  margin: 2px 0 0;
  color: #f0dfbf;
  font-family: Georgia, serif;
  font-size: 2rem;
}
.page-heading > strong {
  color: #f2cc72;
  font-size: 1.5rem;
}
.kicker {
  margin: 0;
  color: #9b7438;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  margin: 0;
}
.summary-grid div {
  padding: 17px;
  border: 1px solid #343129;
  border-radius: 8px;
  background: #121518;
}
dt {
  color: #908675;
  font-size: 0.76rem;
}
dd {
  margin: 7px 0 0;
  color: #eadbbd;
  font-size: 1.3rem;
  font-weight: 800;
}
.section-heading h3 {
  margin: 0;
}
.section-heading span,
.empty {
  color: #958a77;
}
.activity-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}
.empty {
  padding: 22px;
  border: 1px dashed #38342d;
  border-radius: 8px;
  text-align: center;
}
</style>
