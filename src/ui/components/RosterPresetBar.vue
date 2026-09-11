<script setup lang="ts">
import { computed, ref } from "vue";
import type {
  RosterPresetMemberView,
  RosterPresetView,
} from "../../application/queries/get-roster-presets-view";
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
  saveCurrent: [];
  updateCurrent: [];
  manage: [];
}>();

const selectedPreset = computed(
  () => props.presets.find((preset) => preset.id === props.selectedPresetId) ?? null,
);
const inspectedPresetId = ref<RosterPresetId | null>(null);
const allPresetsOpen = ref(false);
const presetSearch = ref("");
const inspectedPreset = computed(
  () => props.presets.find((preset) => preset.id === inspectedPresetId.value) ?? null,
);
const displayedPresets = computed(() => props.presets.slice(0, 4));
const filteredPresets = computed(() => {
  const needle = presetSearch.value.trim().toLocaleLowerCase();
  return props.presets.filter(
    (preset) => !needle || preset.name.toLocaleLowerCase().includes(needle),
  );
});

function prioritizedMembers(preset: RosterPresetView): RosterPresetMemberView[] {
  return [...preset.members].sort(
    (left, right) => Number(right.active || right.departed) - Number(left.active || left.departed),
  );
}

function visibleMembers(preset: RosterPresetView): readonly RosterPresetMemberView[] {
  if (preset.members.length <= 5) return preset.members;
  return prioritizedMembers(preset).slice(0, 6);
}

function hiddenMemberCount(preset: RosterPresetView): number {
  return Math.max(0, preset.members.length - visibleMembers(preset).length);
}

function roleCount(preset: RosterPresetView, role: RosterPresetMemberView["role"]): number {
  return preset.members.filter((member) => !member.departed && member.role === role).length;
}

function exceptionMembers(preset: RosterPresetView): readonly RosterPresetMemberView[] {
  return preset.members.filter((member) => member.active || member.departed);
}

function selectPreset(presetId: RosterPresetId): void {
  emit("select", presetId);
  allPresetsOpen.value = false;
  presetSearch.value = "";
}
</script>

<template>
  <section class="preset-bar panel">
    <div class="preset-heading">
      <div>
        <h3>固定队伍</h3>
        <p>点击队伍即可切换当前阵容。</p>
      </div>
      <div class="preset-heading-actions">
        <button
          v-if="presets.length > 4"
          type="button"
          class="quiet all-presets-button"
          @click="allPresetsOpen = true"
        >
          全部固定队（{{ presets.length }}）
        </button>
        <button type="button" class="quiet" @click="emit('manage')">管理固定队伍</button>
      </div>
    </div>
    <div v-if="presets.length" class="preset-list" aria-label="选择固定队伍">
      <article
        v-for="preset in displayedPresets"
        :key="preset.id"
        class="preset-card"
        :class="{ selected: preset.id === selectedPresetId }"
      >
        <button
          type="button"
          class="preset-option"
          :class="{ selected: preset.id === selectedPresetId }"
          :aria-pressed="preset.id === selectedPresetId"
          :disabled="pending"
          @click="selectPreset(preset.id)"
        >
          <span class="preset-option-heading">
            <strong>{{ preset.name }}</strong>
            <small>
              {{ preset.members.length }} 人
              <em v-if="preset.activeCount">· {{ preset.activeCount }} 人忙</em>
              <em v-if="preset.departedCount" class="departed"
                >· {{ preset.departedCount }} 人离队</em
              >
            </small>
          </span>
          <span v-if="preset.members.length <= 10" class="preset-members">
            <span
              v-for="member in visibleMembers(preset)"
              :key="member.id"
              :class="{ active: member.active, departed: member.departed }"
            >
              {{ member.name }}
              <em v-if="member.active">忙</em>
              <em v-else-if="member.departed">离队</em>
            </span>
            <span v-if="hiddenMemberCount(preset)" class="more-members">
              +{{ hiddenMemberCount(preset) }} 人
            </span>
          </span>
          <span v-else class="large-roster-summary">
            <span class="role-counts">
              <span>坦克 {{ roleCount(preset, "tank") }}</span>
              <span>治疗 {{ roleCount(preset, "healer") }}</span>
              <span>输出 {{ roleCount(preset, "dps") }}</span>
            </span>
            <span v-if="exceptionMembers(preset).length" class="exception-members">
              <span
                v-for="member in exceptionMembers(preset)"
                :key="member.id"
                :class="{ active: member.active, departed: member.departed }"
              >
                {{ member.name }} · {{ member.active ? "忙" : "离队" }}
              </span>
            </span>
            <span v-else class="all-available">全员可用</span>
          </span>
        </button>
        <button
          v-if="preset.members.length > 5"
          type="button"
          class="view-roster"
          @click="inspectedPresetId = preset.id"
        >
          查看完整名单
        </button>
      </article>
    </div>
    <p v-else class="empty-presets">还没有保存固定队伍。</p>
    <div class="preset-actions">
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

    <div v-if="allPresetsOpen" class="roster-backdrop" @click.self="allPresetsOpen = false">
      <section
        class="all-presets-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="all-presets-title"
      >
        <header>
          <div>
            <h3 id="all-presets-title">全部固定队伍</h3>
            <p>共 {{ presets.length }} 支队伍，点击任意队伍立即切换。</p>
          </div>
          <button type="button" class="quiet" @click="allPresetsOpen = false">关闭</button>
        </header>
        <label class="preset-search">
          <span>搜索队伍</span>
          <input v-model="presetSearch" type="search" placeholder="输入队伍名称" />
        </label>
        <div class="all-presets-list">
          <button
            v-for="preset in filteredPresets"
            :key="preset.id"
            type="button"
            class="all-presets-option"
            :class="{ selected: preset.id === selectedPresetId }"
            :disabled="pending"
            @click="selectPreset(preset.id)"
          >
            <span>
              <strong>{{ preset.name }}</strong>
              <small>
                {{ preset.members.length }} 人 · 坦克 {{ roleCount(preset, "tank") }} · 治疗
                {{ roleCount(preset, "healer") }} · 输出 {{ roleCount(preset, "dps") }}
              </small>
            </span>
            <span class="all-presets-status">
              <em v-if="preset.activeCount">{{ preset.activeCount }} 人忙</em>
              <em v-if="preset.departedCount" class="departed"
                >{{ preset.departedCount }} 人离队</em
              >
              <em v-if="!preset.activeCount && !preset.departedCount" class="available"
                >全员可用</em
              >
            </span>
          </button>
          <p v-if="filteredPresets.length === 0" class="empty-presets">没有匹配的固定队伍。</p>
        </div>
      </section>
    </div>

    <div v-if="inspectedPreset" class="roster-backdrop" @click.self="inspectedPresetId = null">
      <section
        class="roster-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fixed-roster-title"
      >
        <header>
          <div>
            <h3 id="fixed-roster-title">{{ inspectedPreset.name }}</h3>
            <p>
              {{ inspectedPreset.members.length }} 人
              <span v-if="inspectedPreset.activeCount">
                · {{ inspectedPreset.activeCount }} 人活动中
              </span>
              <span v-if="inspectedPreset.departedCount">
                · {{ inspectedPreset.departedCount }} 人已离队
              </span>
            </p>
          </div>
          <button type="button" class="quiet" @click="inspectedPresetId = null">关闭</button>
        </header>
        <div class="full-roster">
          <article
            v-for="member in prioritizedMembers(inspectedPreset)"
            :key="member.id"
            :class="{ active: member.active, departed: member.departed }"
          >
            <span>
              <strong>{{ member.name }}</strong>
              <small v-if="!member.departed">
                {{ member.className }} · {{ member.roleName }} · LV {{ member.level }}
              </small>
              <small v-else>保存时名称：{{ member.nameAtSave }}</small>
            </span>
            <em v-if="member.active">活动中</em>
            <em v-else-if="member.departed">已离队</em>
            <em v-else class="available">可用</em>
          </article>
        </div>
      </section>
    </div>
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
.preset-heading-actions {
  display: flex;
  align-items: center;
  gap: 7px;
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
.preset-list {
  display: flex;
  align-items: stretch;
  gap: 8px;
  margin-top: 12px;
  overflow: hidden;
  padding: 1px;
}
.preset-card {
  display: grid;
  flex: 1 1 0;
  min-width: 0;
  grid-template-rows: 1fr auto;
  overflow: hidden;
  border: 1px solid #403a31;
  border-radius: 6px;
  background: #0b0e10;
}
.preset-card:hover,
.preset-card.selected {
  border-color: #a27c3c;
  background: #211d16;
}
.preset-option {
  display: grid;
  gap: 8px;
  width: 100%;
  min-width: 0;
  padding: 9px 10px;
  border: 0;
  border-radius: 0;
  color: #cdbb98;
  background: transparent;
  text-align: left;
}
.preset-option:hover,
.preset-option.selected {
  background: transparent;
}
.preset-option-heading {
  display: grid;
  gap: 2px;
}
.preset-option-heading > strong {
  overflow: hidden;
  color: #e0cfaf;
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preset-option-heading > small {
  color: #81796c;
  font-size: 0.56rem;
}
.preset-option-heading em {
  color: #d29b58;
  font-style: normal;
}
.preset-option-heading em.departed {
  color: #a56d65;
}
.preset-members {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.preset-members > span {
  padding: 3px 5px;
  border: 1px solid #35312a;
  border-radius: 4px;
  color: #a99d89;
  background: #151616;
  font-size: 0.55rem;
}
.preset-members > span.active {
  border-color: #6a4b2b;
  color: #e1ad69;
  background: #281c10;
}
.preset-members > span.departed {
  border-color: #513934;
  color: #aa7770;
  background: #211413;
}
.preset-members > span.more-members {
  color: #c0aa7d;
  background: #242018;
}
.preset-members em {
  margin-left: 2px;
  font-size: 0.49rem;
  font-style: normal;
  font-weight: 800;
}
.large-roster-summary {
  display: grid;
  gap: 7px;
}
.role-counts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}
.role-counts > span {
  padding: 5px 4px;
  color: #ad9f86;
  background: #151716;
  font-size: 0.55rem;
  text-align: center;
}
.exception-members {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-height: 42px;
  overflow: auto;
}
.exception-members > span {
  padding: 3px 5px;
  border: 1px solid #513934;
  border-radius: 4px;
  color: #aa7770;
  background: #211413;
  font-size: 0.52rem;
}
.exception-members > span.active {
  border-color: #6a4b2b;
  color: #e1ad69;
  background: #281c10;
}
.all-available {
  color: #75a77b;
  font-size: 0.57rem;
}
.view-roster {
  width: 100%;
  padding: 6px 9px;
  border: 0;
  border-top: 1px solid #35312a;
  border-radius: 0;
  color: #aa956d;
  background: #151512;
  font-size: 0.56rem;
}
.view-roster:hover {
  color: #dfc58f;
  background: #252017;
}
.empty-presets {
  margin: 10px 0 0;
  padding: 10px;
  border: 1px dashed #3b3831;
  color: #81796c;
  background: #0b0e10;
  font-size: 0.64rem;
  text-align: center;
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
.roster-backdrop {
  position: fixed;
  z-index: 60;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgb(0 0 0 / 78%);
}
.roster-dialog {
  width: min(760px, 100%);
  max-height: calc(100vh - 36px);
  overflow: hidden;
  border: 1px solid #5c503d;
  border-radius: 10px;
  background: #111416;
  box-shadow: 0 24px 70px #000;
}
.roster-dialog > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 15px 17px;
  border-bottom: 1px solid #37332c;
}
.roster-dialog h3,
.roster-dialog p {
  margin: 0;
}
.roster-dialog h3 {
  color: #e0cda7;
  font-size: 1.1rem;
}
.roster-dialog p {
  margin-top: 3px;
  color: #8f8575;
  font-size: 0.63rem;
}
.full-roster {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 6px;
  max-height: min(70vh, 620px);
  overflow: auto;
  padding: 14px;
}
.full-roster article {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 9px;
  border-left: 2px solid #456b4a;
  background: #0b0e10;
}
.full-roster article.active {
  border-left-color: #b17d38;
  background: #1e170e;
}
.full-roster article.departed {
  border-left-color: #8c5048;
  background: #1b1111;
}
.full-roster article > span {
  display: grid;
  min-width: 0;
  gap: 2px;
}
.full-roster strong {
  overflow: hidden;
  color: #d8c9ab;
  font-size: 0.66rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.full-roster small {
  color: #80786b;
  font-size: 0.55rem;
}
.full-roster em {
  flex: 0 0 auto;
  color: #d5a35f;
  font-size: 0.55rem;
  font-style: normal;
}
.full-roster em.available {
  color: #77ac7d;
}
.full-roster article.departed em {
  color: #b8736a;
}
.all-presets-dialog {
  width: min(680px, 100%);
  max-height: calc(100vh - 36px);
  overflow: hidden;
  border: 1px solid #5c503d;
  border-radius: 10px;
  background: #111416;
  box-shadow: 0 24px 70px #000;
}
.all-presets-dialog > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 15px 17px;
  border-bottom: 1px solid #37332c;
}
.all-presets-dialog h3,
.all-presets-dialog p {
  margin: 0;
}
.all-presets-dialog h3 {
  color: #e0cda7;
  font-size: 1.1rem;
}
.all-presets-dialog p {
  margin-top: 3px;
  color: #8f8575;
  font-size: 0.63rem;
}
.preset-search {
  display: grid;
  gap: 4px;
  padding: 12px 17px;
  color: #8f8575;
  font-size: 0.6rem;
}
.preset-search input {
  min-width: 0;
  padding: 8px 9px;
  border: 1px solid #514a3d;
  border-radius: 5px;
  color: #e2d5bb;
  background: #090c0e;
  font: inherit;
}
.all-presets-list {
  display: grid;
  gap: 6px;
  max-height: min(60vh, 520px);
  overflow: auto;
  padding: 0 17px 17px;
}
.all-presets-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 10px 11px;
  border: 1px solid #35312a;
  border-radius: 6px;
  color: #cdbb98;
  background: #0b0e10;
  text-align: left;
}
.all-presets-option:hover,
.all-presets-option.selected {
  border-color: #a27c3c;
  background: #211d16;
}
.all-presets-option > span:first-child {
  display: grid;
  min-width: 0;
  gap: 3px;
}
.all-presets-option strong {
  overflow: hidden;
  color: #e0cfaf;
  font-size: 0.7rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.all-presets-option small {
  color: #81796c;
  font-size: 0.57rem;
}
.all-presets-status {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
}
.all-presets-status em {
  padding: 3px 5px;
  border-radius: 4px;
  color: #d29b58;
  background: #281c10;
  font-size: 0.53rem;
  font-style: normal;
  font-weight: 800;
}
.all-presets-status em.departed {
  color: #b8736a;
  background: #211413;
}
.all-presets-status em.available {
  color: #77ac7d;
  background: #17251a;
}
@media (max-width: 650px) {
  .preset-heading {
    align-items: flex-start;
    flex-direction: column;
  }
  .preset-heading-actions {
    width: 100%;
    flex-wrap: wrap;
  }
  .preset-heading-actions button {
    flex: 1 1 auto;
  }
}
</style>
