<script setup lang="ts">
import { computed, ref } from "vue";
import type { DungeonOptionView } from "../../application/queries/get-dungeons-view";
import type { DungeonId } from "../../domain/shared/ids";

type LevelBand = "all" | "1-19" | "20-29" | "30-39" | "40-49" | "50+";
type SortBy = "level" | "success" | "duration";

const props = defineProps<{
  dungeons: readonly DungeonOptionView[];
  selectedId: DungeonId | null;
  selectedMemberLevels: readonly number[];
}>();

const emit = defineEmits<{ select: [dungeonId: DungeonId] }>();

const search = ref("");
const levelBand = ref<LevelBand>("all");
const sortBy = ref<SortBy>("level");
const lockedExpanded = ref(false);

function durationLabel(seconds: number): string {
  return `${Math.round(seconds / 60)} 分钟`;
}

function matchesLevelBand(dungeon: DungeonOptionView): boolean {
  const level = dungeon.recommendedLevel;
  if (levelBand.value === "all") return true;
  if (levelBand.value === "1-19") return level < 20;
  if (levelBand.value === "20-29") return level >= 20 && level < 30;
  if (levelBand.value === "30-39") return level >= 30 && level < 40;
  if (levelBand.value === "40-49") return level >= 40 && level < 50;
  return level >= 50;
}

function matchesFilters(dungeon: DungeonOptionView): boolean {
  const needle = search.value.trim().toLocaleLowerCase();
  return (
    (!needle || dungeon.name.toLocaleLowerCase().includes(needle)) && matchesLevelBand(dungeon)
  );
}

function recommendedForParty(dungeon: DungeonOptionView): boolean {
  return (
    dungeon.unlocked &&
    props.selectedMemberLevels.length > 0 &&
    props.selectedMemberLevels.every((level) => level >= dungeon.minimumLevel)
  );
}

function sortValue(dungeon: DungeonOptionView): number {
  if (sortBy.value === "success") return dungeon.partyPreview?.clearProbability ?? -1;
  if (sortBy.value === "duration") {
    return dungeon.partyPreview?.durationSeconds ?? dungeon.baseDurationSeconds;
  }
  return dungeon.recommendedLevel;
}

function sortDungeons(dungeons: readonly DungeonOptionView[]): DungeonOptionView[] {
  return [...dungeons].sort((left, right) => {
    const difference = sortValue(left) - sortValue(right);
    if (difference !== 0) return sortBy.value === "success" ? -difference : difference;
    return left.recommendedLevel - right.recommendedLevel || left.name.localeCompare(right.name);
  });
}

const filteredDungeons = computed(() => props.dungeons.filter(matchesFilters));
const recommendedDungeons = computed(() =>
  sortDungeons(filteredDungeons.value.filter(recommendedForParty)),
);
const availableDungeons = computed(() =>
  sortDungeons(
    filteredDungeons.value.filter((dungeon) => dungeon.unlocked && !recommendedForParty(dungeon)),
  ),
);
const lockedDungeons = computed(() =>
  sortDungeons(filteredDungeons.value.filter((dungeon) => !dungeon.unlocked)),
);
const resultCount = computed(() => filteredDungeons.value.length);
const showLockedEntries = computed(
  () => lockedExpanded.value || search.value.trim().length > 0 || levelBand.value !== "all",
);

function familyLabel(dungeon: DungeonOptionView): string | null {
  if (dungeon.name.startsWith("血色修道院")) return "血色修道院";
  if (dungeon.name.startsWith("黑石深渊")) return "黑石深渊";
  return null;
}

function selectDungeon(dungeon: DungeonOptionView): void {
  emit("select", dungeon.id);
}
</script>

<template>
  <section class="dungeon-selector panel">
    <header class="selector-heading">
      <div>
        <p class="kicker">副本目录</p>
        <h3>选择目的地</h3>
      </div>
      <strong>{{ resultCount }} 个副本</strong>
    </header>

    <div class="selector-filters">
      <label>
        <span>搜索副本</span>
        <input v-model="search" type="search" placeholder="输入副本名称" />
      </label>
      <label>
        <span>推荐等级</span>
        <select v-model="levelBand">
          <option value="all">全部等级</option>
          <option value="1-19">1–19</option>
          <option value="20-29">20–29</option>
          <option value="30-39">30–39</option>
          <option value="40-49">40–49</option>
          <option value="50+">50+</option>
        </select>
      </label>
      <label>
        <span>排序</span>
        <select v-model="sortBy">
          <option value="level">推荐等级</option>
          <option value="success">成功率</option>
          <option value="duration">单次耗时</option>
        </select>
      </label>
    </div>

    <div class="list-caption">
      <span>当前队伍可比较的全通率</span>
      <small>点击副本即可切换</small>
    </div>

    <nav class="dungeon-list" aria-label="副本列表">
      <section v-if="recommendedDungeons.length" class="dungeon-section">
        <header>
          <strong>适合当前阵容</strong>
          <small>成员均达到最低等级</small>
        </header>
        <button
          v-for="dungeon in recommendedDungeons"
          :key="dungeon.id"
          type="button"
          class="dungeon-option"
          :class="{ selected: dungeon.id === selectedId }"
          @click="selectDungeon(dungeon)"
        >
          <span class="option-title">
            <strong>{{ dungeon.name }}</strong>
            <span class="option-aside">
              <em v-if="familyLabel(dungeon)">{{ familyLabel(dungeon) }}</em>
              <b
                v-if="dungeon.partyPreview"
                class="success-badge"
                :class="{ ready: dungeon.partyPreview.clearProbability !== null }"
              >
                {{
                  dungeon.partyPreview.clearProbability !== null
                    ? `${(dungeon.partyPreview.clearProbability * 100).toFixed(2)}%`
                    : "待组队"
                }}
              </b>
            </span>
          </span>
          <span class="option-metrics">
            <span>
              <small>耗时</small>
              <strong>{{
                durationLabel(dungeon.partyPreview?.durationSeconds ?? dungeon.baseDurationSeconds)
              }}</strong>
            </span>
            <span>
              <small>等级 / 人数</small>
              <strong
                >{{ dungeon.recommendedLevel }} · {{ dungeon.minimumMembers }}–{{
                  dungeon.maximumMembers
                }}</strong
              >
            </span>
          </span>
        </button>
      </section>

      <section v-if="availableDungeons.length" class="dungeon-section">
        <header>
          <strong>已解锁</strong>
          <small>{{
            selectedMemberLevels.length ? "当前阵容未完全达标" : "选择成员后显示适合项"
          }}</small>
        </header>
        <button
          v-for="dungeon in availableDungeons"
          :key="dungeon.id"
          type="button"
          class="dungeon-option"
          :class="{ selected: dungeon.id === selectedId }"
          @click="selectDungeon(dungeon)"
        >
          <span class="option-title">
            <strong>{{ dungeon.name }}</strong>
            <span class="option-aside">
              <em v-if="familyLabel(dungeon)">{{ familyLabel(dungeon) }}</em>
              <b
                v-if="dungeon.partyPreview"
                class="success-badge"
                :class="{ ready: dungeon.partyPreview.clearProbability !== null }"
              >
                {{
                  dungeon.partyPreview.clearProbability !== null
                    ? `${(dungeon.partyPreview.clearProbability * 100).toFixed(2)}%`
                    : "待组队"
                }}
              </b>
            </span>
          </span>
          <span class="option-metrics">
            <span>
              <small>耗时</small>
              <strong>{{
                durationLabel(dungeon.partyPreview?.durationSeconds ?? dungeon.baseDurationSeconds)
              }}</strong>
            </span>
            <span>
              <small>等级 / 人数</small>
              <strong
                >{{ dungeon.recommendedLevel }} · {{ dungeon.minimumMembers }}–{{
                  dungeon.maximumMembers
                }}</strong
              >
            </span>
          </span>
        </button>
      </section>

      <section v-if="lockedDungeons.length" class="dungeon-section locked-section">
        <button
          type="button"
          class="section-toggle"
          :aria-expanded="showLockedEntries"
          @click="lockedExpanded = !lockedExpanded"
        >
          <span
            ><strong>未解锁</strong><small>{{ lockedDungeons.length }} 个副本</small></span
          >
          <em>{{ showLockedEntries ? "收起" : "展开" }}</em>
        </button>
        <template v-if="showLockedEntries">
          <button
            v-for="dungeon in lockedDungeons"
            :key="dungeon.id"
            type="button"
            class="dungeon-option locked"
            :class="{ selected: dungeon.id === selectedId }"
            @click="selectDungeon(dungeon)"
          >
            <span class="option-title">
              <strong>{{ dungeon.name }}</strong>
              <span class="option-aside">
                <em v-if="familyLabel(dungeon)">{{ familyLabel(dungeon) }}</em>
                <b class="success-badge unavailable">未解锁</b>
              </span>
            </span>
            <span class="option-metrics">
              <span>
                <small>推荐等级</small>
                <strong>{{ dungeon.recommendedLevel }}</strong>
              </span>
              <span class="unlock-copy">{{ dungeon.unlockHint }}</span>
            </span>
          </button>
        </template>
      </section>

      <p v-if="resultCount === 0" class="empty">没有符合条件的副本。</p>
    </nav>
  </section>
</template>

<style scoped>
.panel {
  min-width: 0;
  padding: 14px;
  border: 1px solid #37332c;
  border-radius: 8px;
  background: #111416;
}
.selector-heading,
.dungeon-section > header,
.list-caption,
.option-title,
.option-metrics,
.option-aside,
.section-toggle {
  display: flex;
  align-items: center;
}
.selector-heading,
.list-caption,
.dungeon-section > header,
.option-title,
.section-toggle {
  justify-content: space-between;
  gap: 10px;
}
.selector-heading {
  margin-bottom: 12px;
}
.kicker {
  margin: 0;
  color: #9b7438;
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.14em;
}
h3,
p {
  margin: 0;
}
h3 {
  margin-top: 3px;
  color: #ead8b6;
  font-family: Georgia, serif;
  font-size: 1.3rem;
}
.selector-heading > strong {
  color: #a99573;
  font-size: 0.65rem;
  font-weight: 600;
}
.selector-filters {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) 110px 110px;
  gap: 7px;
  padding-bottom: 11px;
  border-bottom: 1px solid #302e29;
}
.selector-filters label {
  display: grid;
  gap: 4px;
  min-width: 0;
  color: #8f8575;
  font-size: 0.59rem;
}
.selector-filters input,
.selector-filters select {
  min-width: 0;
  padding: 8px 7px;
  border: 1px solid #514a3d;
  border-radius: 5px;
  color: #e2d5bb;
  background: #090c0e;
  font: inherit;
}
.list-caption {
  padding: 9px 2px 6px;
  color: #bda77a;
  font-size: 0.62rem;
}
.list-caption small {
  color: #776f64;
  font-size: 0.57rem;
}
.dungeon-list {
  display: grid;
  gap: 12px;
  max-height: min(68vh, 760px);
  overflow: auto;
  padding-right: 4px;
}
.dungeon-section {
  display: grid;
  gap: 5px;
}
.dungeon-section > header {
  padding: 0 2px 2px;
}
.dungeon-section > header strong,
.section-toggle strong {
  color: #d6c29d;
  font-size: 0.7rem;
}
.dungeon-section > header small,
.section-toggle small {
  color: #756e63;
  font-size: 0.55rem;
}
.dungeon-option {
  display: grid;
  gap: 7px;
  width: 100%;
  padding: 9px 10px;
  border: 1px solid #302e29;
  border-radius: 6px;
  color: #bdb19c;
  background: #0b0e10;
  text-align: left;
  cursor: pointer;
}
.dungeon-option:hover,
.dungeon-option.selected {
  border-color: #a27c3c;
  background: #211d16;
}
.dungeon-option.locked {
  filter: saturate(0.5);
}
.option-title {
  min-width: 0;
}
.option-title > strong {
  overflow: hidden;
  color: #ded1b8;
  font-size: 0.73rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.option-aside {
  flex: 0 0 auto;
  justify-content: flex-end;
  gap: 5px;
}
.option-aside em {
  padding: 3px 5px;
  border-radius: 4px;
  color: #a99065;
  background: #272117;
  font-size: 0.51rem;
  font-style: normal;
}
.success-badge {
  padding: 3px 5px;
  border-radius: 4px;
  color: #c59583;
  background: #321c17;
  font-size: 0.62rem;
  font-weight: 800;
  white-space: nowrap;
}
.success-badge.ready {
  color: #9ccd9f;
  background: #18301e;
}
.success-badge.unavailable {
  color: #b7a083;
  background: #29251e;
}
.option-metrics {
  align-items: end;
  gap: 12px;
  color: #81796c;
  font-size: 0.57rem;
}
.option-metrics > span {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.option-metrics small {
  color: #756e63;
  font-size: 0.52rem;
}
.option-metrics strong {
  color: #b5a486;
  font-size: 0.61rem;
  font-weight: 700;
}
.unlock-copy {
  overflow: hidden;
  max-width: 58%;
  color: #9d7869;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.section-toggle {
  width: 100%;
  padding: 9px 10px;
  border: 1px dashed #493b36;
  border-radius: 6px;
  color: #b69184;
  background: #171211;
  cursor: pointer;
}
.section-toggle > span {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.section-toggle em {
  color: #a98b7c;
  font-size: 0.58rem;
  font-style: normal;
}
.empty {
  padding: 45px 12px;
  color: #81796c;
  text-align: center;
}
@media (max-width: 820px) {
  .dungeon-list {
    max-height: none;
  }
}
@media (max-width: 560px) {
  .selector-filters {
    grid-template-columns: 1fr 1fr;
  }
  .selector-filters label:first-child {
    grid-column: 1 / -1;
  }
}
</style>
