<script setup lang="ts">
import { computed, ref } from "vue";
import { useGameStore } from "../../stores/game-store";

const game = useGameStore();
const selectedDungeonId = ref<string>("");
const archive = computed(() => game.dungeonDevelopment);
const selectedDungeon = computed(() => {
  const dungeons = archive.value?.dungeons ?? [];
  return dungeons.find((entry) => entry.id === selectedDungeonId.value) ?? dungeons[0] ?? null;
});

function progressPercent(points: number, total: number): number {
  return total > 0 ? Math.min(100, (points / total) * 100) : 0;
}
</script>

<template>
  <section v-if="archive" class="page-stack">
    <header class="page-heading">
      <div>
        <p class="kicker">公会远征档案室</p>
        <h2>副本开发档案</h2>
        <p class="subtitle">委托会随副本路线自动调查，完成后永久改善对应副本的收益。</p>
      </div>
      <span
        >{{ archive.completedCommissionCount }} / {{ archive.totalCommissionCount }} 项已开发</span
      >
    </header>

    <nav class="dungeon-tabs" aria-label="副本开发档案">
      <button
        v-for="dungeon in archive.dungeons"
        :key="dungeon.id"
        type="button"
        :class="{ active: dungeon.id === selectedDungeon?.id }"
        @click="selectedDungeonId = dungeon.id"
      >
        <span>{{ dungeon.name }}</span>
        <small
          >开发 {{ dungeon.level }} 级 · {{ dungeon.completedCount }}/{{
            dungeon.totalCount
          }}</small
        >
      </button>
    </nav>

    <article v-if="selectedDungeon" class="archive-card">
      <header class="development-heading">
        <div>
          <span>{{ selectedDungeon.unlocked ? "已开放调查" : "副本尚未解锁" }}</span>
          <h3>{{ selectedDungeon.name }} · 开发 {{ selectedDungeon.level }} 级</h3>
        </div>
        <strong>{{ selectedDungeon.points }} / {{ selectedDungeon.totalPoints }} 点</strong>
      </header>

      <div class="progress" :aria-label="`${selectedDungeon.name}开发进度`">
        <i
          :style="{
            width: `${progressPercent(selectedDungeon.points, selectedDungeon.totalPoints)}%`,
          }"
        />
      </div>

      <dl class="benefits">
        <div>
          <dt>副本经验效率</dt>
          <dd>+{{ selectedDungeon.experienceBonusPercent }}%</dd>
        </div>
        <div>
          <dt>额外普通掉落</dt>
          <dd>+{{ selectedDungeon.extraLootPercent }}%</dd>
        </div>
        <div>
          <dt>下一开发等级</dt>
          <dd>
            {{
              selectedDungeon.nextLevelPoints === undefined
                ? "已完成全部开发"
                : `${selectedDungeon.nextLevelPoints} 点`
            }}
          </dd>
        </div>
      </dl>

      <section class="commission-list">
        <article
          v-for="commission in selectedDungeon.commissions"
          :key="commission.id"
          class="commission"
          :data-status="commission.status"
        >
          <header>
            <div>
              <span>{{ commission.statusLabel }} · {{ commission.points }} 开发点</span>
              <h4>{{ commission.name }}</h4>
            </div>
            <strong>{{ commission.progressLabel }}</strong>
          </header>
          <p>{{ commission.description }}</p>
          <dl>
            <div>
              <dt>调查方向</dt>
              <dd>{{ commission.objectiveLabel }}</dd>
            </div>
            <div v-if="commission.classRequirement">
              <dt>队伍条件</dt>
              <dd>{{ commission.classRequirement }}</dd>
            </div>
          </dl>
          <details v-if="commission.rewardItems.length">
            <summary>已确认装备与永久掉落位置</summary>
            <ul>
              <li v-for="item in commission.rewardItems" :key="item.id">
                <span>{{ item.name }} · 装等 {{ item.itemLevel }}</span>
                <small>{{ item.bossName }}</small>
              </li>
            </ul>
          </details>
          <p v-else class="unknown-reward">开发装备尚未确认</p>
        </article>
      </section>
    </article>
  </section>
</template>

<style scoped>
.page-stack {
  display: grid;
  gap: 18px;
}
.page-heading,
.development-heading,
.commission header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 14px;
}
.page-heading h2,
.development-heading h3,
.commission h4 {
  margin: 3px 0 0;
  color: #f0dfbf;
  font-family: Georgia, serif;
}
.page-heading h2 {
  font-size: 2rem;
}
.page-heading > span,
.subtitle {
  color: #8f8575;
  font-size: 0.72rem;
}
.subtitle {
  margin: 5px 0 0;
}
.kicker {
  margin: 0;
  color: #9b7438;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
}
.dungeon-tabs {
  display: flex;
  gap: 7px;
  padding-bottom: 3px;
  overflow-x: auto;
}
.dungeon-tabs button {
  display: grid;
  flex: 0 0 auto;
  gap: 3px;
  min-width: 160px;
  padding: 10px 12px;
  border: 1px solid #3c382f;
  border-radius: 7px;
  color: #b8aa92;
  background: #111416;
  text-align: left;
  cursor: pointer;
}
.dungeon-tabs button.active {
  border-color: #a67d39;
  background: #211d16;
}
.dungeon-tabs small {
  color: #776f62;
}
.archive-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid #51452f;
  border-radius: 9px;
  background: #111416;
}
.development-heading span,
.commission header span {
  color: #b48743;
  font-size: 0.63rem;
  font-weight: 800;
}
.development-heading > strong {
  color: #e3bd64;
}
.progress {
  height: 7px;
  overflow: hidden;
  border-radius: 6px;
  background: #28251f;
}
.progress i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #80602d, #dab65e);
}
.benefits {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
  margin: 0;
}
.benefits div,
.commission dl div {
  padding: 10px;
  background: #0b0e10;
}
dt {
  color: #756e62;
  font-size: 0.61rem;
}
dd {
  margin: 3px 0 0;
  color: #d3c2a2;
  font-size: 0.74rem;
}
.commission-list {
  display: grid;
  gap: 9px;
}
.commission {
  display: grid;
  gap: 9px;
  padding: 13px;
  border: 1px solid #38342d;
  background: #0d1012;
}
.commission[data-status="completed"] {
  border-color: #52633f;
}
.commission[data-status="clue"] {
  opacity: 0.76;
}
.commission header > strong {
  color: #bda36e;
  font-size: 0.67rem;
}
.commission p {
  margin: 0;
  color: #918777;
  font-size: 0.7rem;
  line-height: 1.5;
}
.commission dl {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  margin: 0;
}
details {
  color: #b89451;
  font-size: 0.68rem;
}
summary {
  cursor: pointer;
}
details ul {
  display: grid;
  gap: 5px;
  padding: 0;
  margin: 8px 0 0;
  list-style: none;
}
details li {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 9px;
  color: #d4c3a4;
  background: #080b0c;
}
details small {
  color: #877b69;
}
.unknown-reward {
  color: #70695f !important;
  font-style: italic;
}
@media (max-width: 720px) {
  .page-heading,
  .development-heading,
  .commission header {
    align-items: stretch;
    flex-direction: column;
  }
  .benefits,
  .commission dl {
    grid-template-columns: 1fr;
  }
}
</style>
