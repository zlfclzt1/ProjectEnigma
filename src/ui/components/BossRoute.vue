<script setup lang="ts">
interface BossRouteStage {
  readonly id: string;
  readonly name: string;
  readonly status?: "pending" | "active" | "victory" | "defeat";
  readonly probability: number;
  readonly durationSeconds: number;
}

defineProps<{ stages: readonly BossRouteStage[] }>();

function probabilityLabel(probability: number): string {
  return `${(probability * 100).toFixed(2)}%`;
}

function durationLabel(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
</script>

<template>
  <ol class="boss-route">
    <li v-for="(stage, index) in stages" :key="stage.id" :class="stage.status ?? 'preview'">
      <span>{{ index + 1 }}</span>
      <div>
        <strong>{{ stage.name }}</strong>
        <small>胜率 {{ probabilityLabel(stage.probability) }}</small>
      </div>
      <time>{{ durationLabel(stage.durationSeconds) }}</time>
      <em v-if="stage.status">{{
        { pending: "等待", active: "交战中", victory: "击败", defeat: "灭团" }[stage.status]
      }}</em>
    </li>
  </ol>
</template>

<style scoped>
.boss-route {
  display: grid;
  gap: 4px;
  padding: 0;
  margin: 0;
  list-style: none;
}
li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-left: 2px solid #49443a;
  background: #0a0d0f;
}
li > span {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border: 1px solid #504a3e;
  border-radius: 50%;
  color: #8e8576;
  font-size: 0.62rem;
}
li > div {
  display: grid;
}
strong {
  color: #d9cdb7;
  font-size: 0.72rem;
}
small,
time {
  color: #817a6f;
  font-size: 0.62rem;
}
time {
  font-variant-numeric: tabular-nums;
}
em {
  min-width: 42px;
  color: #8f8779;
  font-size: 0.62rem;
  font-style: normal;
  text-align: right;
}
li.active {
  border-left-color: #d19b42;
  background: #211b12;
}
li.active em {
  color: #e8bd61;
}
li.victory {
  border-left-color: #5e9d65;
}
li.victory em {
  color: #77bd7d;
}
li.defeat {
  border-left-color: #a75249;
}
li.defeat em {
  color: #d4776c;
}
</style>
