<script setup lang="ts">
import { computed } from "vue";
import type { RosterPresetView } from "../../application/queries/get-roster-presets-view";
import type { RosterPresetId } from "../../domain/shared/ids";

const props = defineProps<{
  presets: readonly RosterPresetView[];
  selectedPresetId: RosterPresetId | null;
  selectedMemberCount: number;
  maximumPresets: number;
  pending: boolean;
}>();

const emit = defineEmits<{
  select: [presetId: RosterPresetId | null];
  apply: [];
  saveCurrent: [];
  updateCurrent: [];
  manage: [];
}>();

const selectedPreset = computed(
  () => props.presets.find((preset) => preset.id === props.selectedPresetId) ?? null,
);
</script>

<template>
  <section class="preset-bar panel">
    <div class="preset-heading">
      <div>
        <h3>固定队伍</h3>
        <p>快速套用常用阵容；完整编辑器支持 1–40 人。</p>
      </div>
      <button type="button" class="quiet" @click="emit('manage')">管理固定队伍</button>
    </div>
    <div class="preset-actions">
      <select
        aria-label="选择固定队伍"
        :value="selectedPresetId ?? ''"
        @change="
          emit(
            'select',
            (($event.target as HTMLSelectElement).value || null) as RosterPresetId | null,
          )
        "
      >
        <option value="">选择一支固定队伍</option>
        <option v-for="preset in presets" :key="preset.id" :value="preset.id">
          {{ preset.name }}（{{ preset.members.length }} 人）
        </option>
      </select>
      <button type="button" :disabled="pending || !selectedPreset" @click="emit('apply')">
        套用
      </button>
      <button
        type="button"
        :disabled="pending || selectedMemberCount === 0 || presets.length >= maximumPresets"
        @click="emit('saveCurrent')"
      >
        保存当前阵容
      </button>
      <button
        type="button"
        class="quiet"
        :disabled="pending || !selectedPreset || selectedMemberCount === 0"
        @click="emit('updateCurrent')"
      >
        用当前阵容更新
      </button>
    </div>
    <p v-if="selectedPreset" class="preset-status">
      {{ selectedPreset.members.length }} 人
      <span v-if="selectedPreset.activeCount">· {{ selectedPreset.activeCount }} 人活动中</span>
      <span v-if="selectedPreset.departedCount">· {{ selectedPreset.departedCount }} 人已离队</span>
    </p>
    <p v-else-if="presets.length === 0" class="preset-status">还没有保存固定队伍。</p>
  </section>
</template>

<style scoped>
.panel {
  padding: 14px 16px;
  border: 1px solid #37332c;
  border-radius: 8px;
  background: #111416;
}
.preset-heading,
.preset-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.preset-heading h3,
.preset-heading p,
.preset-status {
  margin: 0;
}
.preset-heading h3 {
  color: #ddcaa6;
}
.preset-heading p,
.preset-status {
  color: #81796c;
  font-size: 0.68rem;
}
.preset-heading p {
  margin-top: 3px;
}
.preset-actions {
  justify-content: flex-start;
  margin-top: 12px;
  flex-wrap: wrap;
}
select {
  min-width: min(300px, 100%);
  padding: 8px;
  border: 1px solid #514a3d;
  border-radius: 6px;
  color: #e2d5bb;
  background: #0b0e10;
}
button {
  padding: 8px 11px;
  border: 1px solid #9b793f;
  border-radius: 6px;
  color: #1b160f;
  background: #c99b4d;
  font-weight: 800;
  cursor: pointer;
}
button.quiet {
  color: #cdbb98;
  background: #1b1b18;
  border-color: #514a3d;
}
button:disabled {
  color: #777066;
  background: #282620;
  border-color: #403c34;
  cursor: not-allowed;
}
.preset-status {
  margin-top: 8px;
  color: #b08e67;
}
@media (max-width: 650px) {
  .preset-heading {
    align-items: flex-start;
    flex-direction: column;
  }
  .preset-actions > select {
    flex: 1 1 100%;
  }
}
</style>
