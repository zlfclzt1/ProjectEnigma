<script setup lang="ts">
import { ref } from "vue";
import { useGameStore } from "../../stores/game-store";
import ActivitySummary from "../components/ActivitySummary.vue";
import GuildUpgradePanel from "../components/GuildUpgradePanel.vue";

const game = useGameStore();
const showGuildUpgradePanel = ref(false);

async function purchaseNextUpgrade(): Promise<void> {
  const upgrade = game.guildUpgrades?.nextUpgrade;
  if (!upgrade) return;
  await game.purchaseGuildUpgrade(upgrade.id);
}
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

    <div class="summary-grid">
      <button
        class="summary-card member-capacity-card"
        :class="{ purchasable: game.guildUpgrades?.hasPurchasableUpgrade }"
        type="button"
        @click="showGuildUpgradePanel = true"
      >
        <span class="summary-label">公会成员</span>
        <strong class="summary-value">
          {{ game.overview.memberCount }} / {{ game.overview.memberCapacity }}
        </strong>
        <span v-if="game.guildUpgrades?.hasPurchasableUpgrade" class="upgrade-badge">可扩建</span>
        <span v-else class="card-action">查看扩建</span>
      </button>
      <div class="summary-card">
        <span class="summary-label">空闲成员</span>
        <strong class="summary-value">{{ game.overview.idleMemberCount }}</strong>
      </div>
      <div class="summary-card">
        <span class="summary-label">出勤成员</span>
        <strong class="summary-value">{{ game.overview.activeMemberCount }}</strong>
      </div>
      <div class="summary-card">
        <span class="summary-label">候选区</span>
        <strong class="summary-value">
          {{ game.overview.candidateCount }} / {{ game.overview.candidateCapacity }}
        </strong>
      </div>
      <div class="summary-card">
        <span class="summary-label">待分配装备</span>
        <strong class="summary-value">{{ game.overview.pendingLootCount }}</strong>
      </div>
      <div class="summary-card">
        <span class="summary-label">已完成副本</span>
        <strong class="summary-value">{{ game.overview.completedExpeditionCount }}</strong>
      </div>
    </div>

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

    <GuildUpgradePanel
      v-if="showGuildUpgradePanel && game.guildUpgrades"
      :view="game.guildUpgrades"
      :busy="game.commandPending"
      @close="showGuildUpgradePanel = false"
      @purchase="purchaseNextUpgrade"
    />
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
.summary-card {
  position: relative;
  padding: 17px;
  border: 1px solid #343129;
  border-radius: 8px;
  background: #121518;
  text-align: left;
}
.summary-grid button {
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.member-capacity-card {
  transition:
    border-color 120ms ease,
    transform 120ms ease;
}
.member-capacity-card:hover {
  border-color: #80622f;
  transform: translateY(-1px);
}
.member-capacity-card.purchasable {
  border-color: #b78b40;
  box-shadow: inset 0 0 24px #8a612418;
}
.summary-label {
  display: block;
  color: #908675;
  font-size: 0.76rem;
}
.summary-value {
  display: block;
  margin-top: 7px;
  color: #eadbbd;
  font-size: 1.3rem;
  font-weight: 800;
}
.card-action,
.upgrade-badge {
  display: block;
  margin-top: 8px;
  font-size: 0.68rem;
  font-weight: 800;
}
.card-action {
  color: #817766;
}
.upgrade-badge {
  color: #f2cc72;
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
