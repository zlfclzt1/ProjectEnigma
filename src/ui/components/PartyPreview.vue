<script setup lang="ts">
import type {
  DungeonOptionView,
  PartyPreviewView,
} from "../../application/queries/get-dungeons-view";
import BossRoute from "./BossRoute.vue";

defineProps<{
  dungeon: DungeonOptionView | null;
  preview: PartyPreviewView | null;
  issues: readonly string[];
  requestedRuns: number;
  canStart: boolean;
  pending: boolean;
}>();

defineEmits<{ start: [] }>();

function probabilityLabel(probability: number): string {
  return `${(probability * 100).toFixed(2)}%`;
}

function durationLabel(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
</script>

<template>
  <aside class="party-preview panel">
    <header>
      <div>
        <h3>出发预览</h3>
        <p v-if="preview">公式 {{ preview.formulaVersion }}</p>
      </div>
      <strong v-if="preview">全通 {{ probabilityLabel(preview.clearProbability) }}</strong>
    </header>

    <template v-if="preview">
      <dl class="metrics">
        <div>
          <dt>坦克</dt>
          <dd>{{ preview.contribution.tank.toFixed(2) }}</dd>
        </div>
        <div>
          <dt>治疗</dt>
          <dd>{{ preview.contribution.healing.toFixed(2) }}</dd>
        </div>
        <div>
          <dt>输出</dt>
          <dd>{{ preview.contribution.damage.toFixed(2) }}</dd>
        </div>
        <div>
          <dt>单次耗时</dt>
          <dd>{{ durationLabel(preview.durationSeconds) }}</dd>
        </div>
      </dl>
      <BossRoute :stages="preview.encounters" />
      <p class="total-time">
        连续 {{ requestedRuns }} 次预计占用
        <strong>{{ durationLabel(preview.durationSeconds * requestedRuns) }}</strong>
      </p>
    </template>
    <p v-else class="placeholder">选择成员后，会在这里显示每位 Boss 的精确胜率与固定出发耗时。</p>

    <ul v-if="issues.length" class="issues">
      <li v-for="issue in issues" :key="issue">{{ issue }}</li>
    </ul>
    <button type="button" :disabled="!canStart || pending" @click="$emit('start')">
      {{ pending ? "正在登记队伍……" : `出发：${dungeon?.name ?? "副本"}` }}
    </button>
  </aside>
</template>

<style scoped>
.panel {
  padding: 16px;
  border: 1px solid #51452f;
  border-radius: 8px;
  background: #12130f;
}
header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}
h3,
p {
  margin: 0;
}
h3 {
  color: #dfcca6;
}
header p {
  margin-top: 3px;
  color: #80786a;
  font-size: 0.66rem;
}
header > strong {
  color: #e6bd5d;
  font-size: 1.05rem;
}
.metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 5px;
  margin: 0 0 12px;
}
.metrics div {
  padding: 8px;
  background: #090c0d;
  text-align: center;
}
dt {
  color: #7e7669;
  font-size: 0.58rem;
}
dd {
  margin: 3px 0 0;
  color: #d9c9a9;
  font-size: 0.72rem;
  font-weight: 800;
}
.total-time,
.placeholder {
  margin-top: 12px;
  color: #948a79;
  font-size: 0.72rem;
  line-height: 1.5;
}
.total-time strong {
  color: #e2b85c;
}
.placeholder {
  padding: 35px 10px;
  text-align: center;
}
.issues {
  display: grid;
  gap: 3px;
  padding: 0;
  margin: 12px 0;
  color: #c97569;
  font-size: 0.68rem;
  list-style: none;
}
button {
  width: 100%;
  min-height: 42px;
  margin-top: 12px;
  border: 1px solid #b08743;
  border-radius: 6px;
  color: #18130c;
  background: #d4a653;
  font-weight: 850;
  cursor: pointer;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}
@media (max-width: 500px) {
  .metrics {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
