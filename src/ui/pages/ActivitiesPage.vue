<script setup lang="ts">
import { computed } from "vue";
import { useGameStore } from "../../stores/game-store";
import ActiveExpeditionCard from "../components/ActiveExpeditionCard.vue";

const game = useGameStore();
const hasPendingQuestSettlement = computed(
  () =>
    (game.questSettlement(game.members?.members.map((member) => member.id) ?? [])?.entries.length ??
      0) > 0,
);
</script>

<template>
  <section v-if="game.activities" class="page-stack">
    <header class="page-heading">
      <div>
        <p class="kicker">活动调度台</p>
        <h2>副本活动</h2>
      </div>
      <span>{{ game.activities.active.length }} 支队伍进行中</span>
    </header>

    <section>
      <h3>正在进行</h3>
      <div v-if="game.activities.active.length" class="activity-grid">
        <ActiveExpeditionCard
          v-for="activity in game.activities.active"
          :key="activity.id"
          :activity="activity"
          :show-settlement-link="hasPendingQuestSettlement"
        />
      </div>
      <p v-else class="empty">暂时没有队伍在副本里。会长可以去作战室组织一支。</p>
    </section>

    <section v-if="game.activities.history.length">
      <h3>最近结束</h3>
      <div class="activity-grid history">
        <ActiveExpeditionCard
          v-for="activity in game.activities.history"
          :key="activity.id"
          :activity="activity"
          :show-settlement-link="hasPendingQuestSettlement"
        />
      </div>
    </section>
  </section>
</template>

<style scoped>
.page-stack {
  display: grid;
  gap: 25px;
}
.page-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
}
.page-heading h2 {
  margin: 3px 0 0;
  color: #f0dfbf;
  font-family: Georgia, serif;
  font-size: 2rem;
}
.page-heading > span {
  color: #a09788;
  font-size: 0.75rem;
}
.kicker {
  margin: 0;
  color: #9b7438;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
}
h3 {
  color: #d7c4a2;
}
.activity-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 10px;
}
.history {
  opacity: 0.82;
}
.empty {
  padding: 28px;
  border: 1px dashed #39352e;
  color: #908675;
  text-align: center;
}
</style>
