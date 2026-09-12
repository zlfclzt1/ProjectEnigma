<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";
import { useGameStore } from "../../stores/game-store";
import ActiveExpeditionCard from "../components/ActiveExpeditionCard.vue";
import GuildUpgradePanel from "../components/GuildUpgradePanel.vue";

const game = useGameStore();
const showGuildUpgradePanel = ref(false);

const activeActivities = computed(() => game.activities?.active ?? []);
const recentActivities = computed(() => game.activities?.history.slice(0, 3) ?? []);
const pendingLootCount = computed(() => game.loot?.unlockedCount ?? 0);
const pendingLootTotal = computed(() => game.overview?.pendingLootCount ?? 0);
const attentionCount = computed(
  () =>
    pendingLootCount.value +
    (game.recruitment?.candidateCount ?? 0) +
    Number(Boolean(game.guildUpgrades?.hasPurchasableUpgrade)),
);
const dungeonProgress = computed(() => {
  const dungeons = game.dungeonDevelopment?.dungeons ?? [];
  const unlocked = dungeons.filter((dungeon) => dungeon.unlocked);
  return {
    unlocked: unlocked.length,
    total: dungeons.length,
    next: dungeons.find((dungeon) => !dungeon.unlocked) ?? null,
  };
});
const averageMemberLevel = computed(() => {
  const members = game.members?.members ?? [];
  if (members.length === 0) return 0;
  return (
    Math.round((members.reduce((sum, member) => sum + member.level, 0) / members.length) * 10) / 10
  );
});

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
        <p class="page-subtitle">公会经营驾驶舱</p>
      </div>
      <div class="funds-display">
        <span>公会资金</span>
        <strong>{{ game.overview.funds }} G</strong>
      </div>
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
        <span class="summary-label">成员状态</span>
        <strong class="summary-value"
          >{{ game.overview.idleMemberCount }} / {{ game.overview.activeMemberCount }}</strong
        >
        <span class="card-detail">空闲 / 出勤</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">进行中队伍</span>
        <strong class="summary-value">{{ activeActivities.length }}</strong>
        <span class="card-detail">正在远征</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">候选区</span>
        <strong class="summary-value">
          {{ game.overview.candidateCount }} / {{ game.overview.candidateCapacity }}
        </strong>
      </div>
      <div class="summary-card">
        <span class="summary-label">待分配装备</span>
        <strong class="summary-value">{{ pendingLootTotal }}</strong>
        <span class="card-detail">
          {{ pendingLootCount }} 件可处理<span v-if="pendingLootTotal > pendingLootCount"
            >，其余锁定</span
          >
        </span>
      </div>
      <div class="summary-card">
        <span class="summary-label">已完成副本</span>
        <strong class="summary-value">{{ game.overview.completedExpeditionCount }}</strong>
        <span class="card-detail">累计完成</span>
      </div>
    </div>

    <div class="dashboard-grid">
      <section class="dashboard-panel attention-panel">
        <div class="section-heading">
          <div>
            <p class="section-kicker">行动队列</p>
            <h3>需要处理</h3>
          </div>
          <span>{{ attentionCount }} 项提醒</span>
        </div>
        <div class="attention-grid">
          <RouterLink v-if="pendingLootCount" to="/loot" class="attention-card">
            <span class="attention-icon">装</span>
            <span>
              <strong>待分配装备</strong>
              <small>{{ pendingLootCount }} 件装备等待处理</small>
            </span>
            <em>前往分装 →</em>
          </RouterLink>
          <RouterLink
            v-if="game.recruitment?.candidateCount"
            to="/recruitment"
            class="attention-card"
          >
            <span class="attention-icon">招</span>
            <span>
              <strong>候选人待招募</strong>
              <small
                >{{ game.recruitment.candidateCount }} /
                {{ game.recruitment.candidateCapacity }} 名候选人</small
              >
            </span>
            <em>前往招募 →</em>
          </RouterLink>
          <button
            v-if="game.guildUpgrades?.hasPurchasableUpgrade"
            type="button"
            class="attention-card"
            @click="showGuildUpgradePanel = true"
          >
            <span class="attention-icon">扩</span>
            <span>
              <strong>公会可以扩建</strong>
              <small>{{ game.guildUpgrades.nextUpgrade?.name }}</small>
            </span>
            <em>查看扩建 →</em>
          </button>
          <RouterLink v-if="activeActivities.length" to="/activities" class="attention-card">
            <span class="attention-icon">行</span>
            <span>
              <strong>远征正在进行</strong>
              <small>{{ activeActivities.length }} 支队伍在路上</small>
            </span>
            <em>查看活动 →</em>
          </RouterLink>
        </div>
        <p
          v-if="
            !pendingLootCount &&
            !game.recruitment?.candidateCount &&
            !game.guildUpgrades?.hasPurchasableUpgrade &&
            !activeActivities.length
          "
          class="empty compact-empty"
        >
          当前没有紧急事项，公会运转良好。
        </p>
      </section>

      <section class="dashboard-panel progress-panel">
        <div class="section-heading">
          <div>
            <p class="section-kicker">长期目标</p>
            <h3>公会进展</h3>
          </div>
          <RouterLink to="/dungeons">查看副本 →</RouterLink>
        </div>
        <div class="progress-block">
          <div class="progress-label">
            <span>副本解锁</span>
            <strong>{{ dungeonProgress.unlocked }} / {{ dungeonProgress.total }}</strong>
          </div>
          <div class="progress-track">
            <i
              :style="{
                width: `${dungeonProgress.total ? (dungeonProgress.unlocked / dungeonProgress.total) * 100 : 0}%`,
              }"
            />
          </div>
          <small v-if="dungeonProgress.next">下一目标：{{ dungeonProgress.next.name }}</small>
          <small v-else>所有副本均已解锁。</small>
        </div>
        <div class="progress-facts">
          <div>
            <span>成员平均等级</span>
            <strong>Lv {{ averageMemberLevel }}</strong>
          </div>
          <div>
            <span>扩建次数</span>
            <strong>{{ game.guildUpgrades?.purchasedCount ?? 0 }}</strong>
          </div>
        </div>
      </section>
    </div>

    <section>
      <div class="section-heading">
        <div>
          <p class="section-kicker">实时动态</p>
          <h3>正在进行</h3>
        </div>
        <RouterLink v-if="activeActivities.length" to="/activities">活动调度台 →</RouterLink>
      </div>
      <div v-if="activeActivities.length" class="activity-list">
        <ActiveExpeditionCard
          v-for="activity in activeActivities"
          :key="activity.id"
          :activity="activity"
          show-settlement-link
        />
      </div>
      <div v-else class="empty activity-empty">
        <strong>当前没有远征队伍</strong>
        <span>组织一支队伍，继续推进副本进度。</span>
        <RouterLink to="/dungeons">组织副本 →</RouterLink>
      </div>
    </section>

    <section v-if="recentActivities.length" class="recent-section">
      <div class="section-heading">
        <div>
          <p class="section-kicker">公会记录</p>
          <h3>最近完成</h3>
        </div>
        <RouterLink to="/activities">查看全部记录 →</RouterLink>
      </div>
      <div class="recent-list">
        <RouterLink
          v-for="activity in recentActivities"
          :key="activity.id"
          to="/activities"
          class="recent-card"
          :data-status="activity.status"
        >
          <span class="recent-status">{{ activity.statusLabel }}</span>
          <strong>{{ activity.dungeonName }}</strong>
          <small>
            {{ activity.completedRuns }} / {{ activity.requestedRuns }} 次完成 ·
            {{ activity.participantCount }} 名成员
          </small>
          <em>查看详情 →</em>
        </RouterLink>
      </div>
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
  gap: 24px;
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
.page-subtitle {
  margin: 4px 0 0;
  color: #81796c;
  font-size: 0.68rem;
}
.funds-display {
  display: grid;
  gap: 3px;
  text-align: right;
}
.funds-display span {
  color: #908675;
  font-size: 0.65rem;
}
.funds-display strong {
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
.upgrade-badge,
.card-detail {
  display: block;
  margin-top: 8px;
  font-size: 0.68rem;
  font-weight: 800;
}
.card-detail {
  color: #817766;
  font-weight: 500;
}
.card-action {
  color: #817766;
}
.upgrade-badge {
  color: #f2cc72;
}
.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(260px, 0.75fr);
  gap: 12px;
}
.dashboard-panel {
  min-width: 0;
  padding: 15px;
  border: 1px solid #343129;
  border-radius: 8px;
  background: #121518;
}
.section-kicker {
  margin: 0 0 3px;
  color: #9b7438;
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.section-heading h3 {
  margin: 0;
  color: #ddcaa6;
  font-size: 1rem;
}
.section-heading span,
.empty {
  color: #958a77;
}
.section-heading > a {
  color: #c99b4d;
  font-size: 0.65rem;
  font-weight: 800;
  text-decoration: none;
}
.attention-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
  margin-top: 12px;
}
.attention-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 9px;
  min-width: 0;
  padding: 11px;
  border: 1px solid #3a352c;
  border-radius: 7px;
  color: #cdbb98;
  background: #0b0e10;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}
.attention-card:hover {
  border-color: #9b793f;
  background: #1b1914;
}
.attention-card > span:not(.attention-icon) {
  display: grid;
  min-width: 0;
  gap: 3px;
}
.attention-card strong {
  overflow: hidden;
  color: #decba8;
  font-size: 0.7rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.attention-card small {
  overflow: hidden;
  color: #81796c;
  font-size: 0.59rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.attention-card em {
  grid-column: 2;
  color: #c99b4d;
  font-size: 0.58rem;
  font-style: normal;
  font-weight: 800;
}
.attention-icon {
  display: grid;
  width: 27px;
  height: 27px;
  place-items: center;
  border: 1px solid #5b4930;
  border-radius: 5px;
  color: #e0b86b;
  background: #211a11;
  font-size: 0.7rem;
  font-weight: 850;
}
.compact-empty {
  margin-top: 12px;
  padding: 15px;
}
.progress-panel {
  display: grid;
  align-content: start;
  gap: 16px;
}
.progress-block {
  display: grid;
  gap: 8px;
}
.progress-label,
.progress-facts {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
.progress-label {
  color: #a99d88;
  font-size: 0.68rem;
}
.progress-label strong {
  color: #dec38b;
}
.progress-track {
  height: 6px;
  overflow: hidden;
  border-radius: 5px;
  background: #292722;
}
.progress-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #805d29, #d2a348);
}
.progress-block small {
  color: #81796c;
  font-size: 0.61rem;
}
.progress-facts {
  padding-top: 12px;
  border-top: 1px solid #302e29;
}
.progress-facts div {
  display: grid;
  gap: 4px;
}
.progress-facts span {
  color: #81796c;
  font-size: 0.6rem;
}
.progress-facts strong {
  color: #dec38b;
  font-size: 0.88rem;
}
.activity-list {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}
.activity-empty {
  display: grid;
  justify-items: center;
  gap: 7px;
  margin-top: 12px;
}
.activity-empty strong {
  color: #d9c59f;
  font-size: 0.8rem;
}
.activity-empty span {
  font-size: 0.68rem;
}
.activity-empty a {
  margin-top: 4px;
  color: #d2a653;
  font-size: 0.68rem;
  font-weight: 800;
  text-decoration: none;
}
.recent-section {
  padding-top: 2px;
}
.recent-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}
.recent-card {
  display: grid;
  gap: 5px;
  min-width: 0;
  padding: 12px;
  border: 1px solid #343129;
  border-radius: 7px;
  color: inherit;
  background: #121518;
  text-decoration: none;
}
.recent-card:hover {
  border-color: #80622f;
  background: #1b1914;
}
.recent-status {
  color: #69a86f;
  font-size: 0.59rem;
  font-weight: 800;
}
.recent-card[data-status="failed"] .recent-status {
  color: #c76c62;
}
.recent-card[data-status="cancelled"] .recent-status {
  color: #9b9386;
}
.recent-card strong {
  overflow: hidden;
  color: #decba8;
  font-size: 0.74rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.recent-card small {
  color: #81796c;
  font-size: 0.6rem;
}
.recent-card em {
  color: #c99b4d;
  font-size: 0.58rem;
  font-style: normal;
  font-weight: 800;
}
.empty {
  padding: 22px;
  border: 1px dashed #38342d;
  border-radius: 8px;
  text-align: center;
}
@media (max-width: 760px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  .recent-list {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 520px) {
  .page-heading {
    align-items: flex-start;
    flex-direction: column;
  }
  .funds-display {
    text-align: left;
  }
  .attention-grid {
    grid-template-columns: 1fr;
  }
}
</style>
