<script setup lang="ts">
import type { DungeonOptionView } from "../../application/queries/get-dungeons-view";
import type { DungeonId } from "../../domain/shared/ids";

defineProps<{
  dungeons: readonly DungeonOptionView[];
  selectedId: DungeonId | null;
}>();

defineEmits<{ select: [dungeonId: DungeonId] }>();

function durationLabel(seconds: number): string {
  return `${Math.round(seconds / 60)} 分钟`;
}
</script>

<template>
  <div class="dungeon-selector">
    <button
      v-for="dungeon in dungeons"
      :key="dungeon.id"
      type="button"
      :class="{ selected: dungeon.id === selectedId, locked: !dungeon.unlocked }"
      :aria-pressed="dungeon.id === selectedId"
      @click="$emit('select', dungeon.id)"
    >
      <span>{{ dungeon.unlocked ? "可出发" : "未解锁" }}</span>
      <strong>{{ dungeon.name }}</strong>
      <small
        >等级 {{ dungeon.minimumLevel }}+ · 推荐 {{ dungeon.recommendedLevel }} ·
        {{ dungeon.encounterCount }} 位 Boss</small
      >
      <small
        >{{ dungeon.minimumMembers }}–{{ dungeon.maximumMembers }} 人 · 基础
        {{ durationLabel(dungeon.baseDurationSeconds) }}</small
      >
      <em>{{ dungeon.unlockHint }}</em>
    </button>
  </div>
</template>

<style scoped>
.dungeon-selector {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(205px, 1fr));
  gap: 9px;
}
button {
  display: grid;
  gap: 5px;
  padding: 14px;
  border: 1px solid #37332c;
  border-radius: 8px;
  color: #bdb19c;
  background: #111416;
  text-align: left;
  cursor: pointer;
}
button:hover,
button.selected {
  border-color: #a47c3b;
  background: #211c14;
}
button.locked {
  filter: saturate(0.45);
}
button > span {
  color: #69a66e;
  font-size: 0.62rem;
  font-weight: 850;
  letter-spacing: 0.1em;
}
button.locked > span {
  color: #a7655d;
}
strong {
  color: #ead8b6;
  font-family: Georgia, serif;
  font-size: 1.03rem;
}
small {
  color: #8c8375;
  font-size: 0.66rem;
}
em {
  margin-top: 4px;
  color: #b08b4a;
  font-size: 0.64rem;
  font-style: normal;
}
</style>
