<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { DungeonOptionView } from "../../application/queries/get-dungeons-view";
import type { DungeonId } from "../../domain/shared/ids";

type LevelBand = "all" | "1-19" | "20-29" | "30-39" | "40-49" | "50+";

const props = defineProps<{
  dungeons: readonly DungeonOptionView[];
  selectedId: DungeonId | null;
  selectedMemberLevels: readonly number[];
}>();

const emit = defineEmits<{ select: [dungeonId: DungeonId] }>();

const open = ref(false);
const search = ref("");
const levelBand = ref<LevelBand>("all");
const previewId = ref<DungeonId | null>(null);
const lockedExpanded = ref(false);

const selectedDungeon = computed(
  () => props.dungeons.find((dungeon) => dungeon.id === props.selectedId) ?? null,
);
const previewDungeon = computed(
  () => props.dungeons.find((dungeon) => dungeon.id === previewId.value) ?? selectedDungeon.value,
);

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

const recommendedDungeons = computed(() =>
  props.dungeons.filter((dungeon) => matchesFilters(dungeon) && recommendedForParty(dungeon)),
);
const availableDungeons = computed(() =>
  props.dungeons.filter(
    (dungeon) => matchesFilters(dungeon) && dungeon.unlocked && !recommendedForParty(dungeon),
  ),
);
const lockedDungeons = computed(() =>
  props.dungeons.filter((dungeon) => matchesFilters(dungeon) && !dungeon.unlocked),
);
const resultCount = computed(
  () =>
    recommendedDungeons.value.length + availableDungeons.value.length + lockedDungeons.value.length,
);
const showLockedEntries = computed(
  () => lockedExpanded.value || search.value.trim().length > 0 || levelBand.value !== "all",
);

function familyLabel(dungeon: DungeonOptionView): string | null {
  if (dungeon.name.startsWith("血色修道院")) return "血色修道院";
  if (dungeon.name.startsWith("黑石深渊")) return "黑石深渊";
  return null;
}

function openSelector(): void {
  previewId.value = props.selectedId ?? props.dungeons[0]?.id ?? null;
  search.value = "";
  levelBand.value = "all";
  lockedExpanded.value = false;
  open.value = true;
}

function confirmSelection(): void {
  if (!previewDungeon.value) return;
  emit("select", previewDungeon.value.id);
  open.value = false;
}

watch(
  () => props.selectedId,
  (selectedId) => {
    if (!open.value) previewId.value = selectedId;
  },
);
</script>

<template>
  <section class="dungeon-selector">
    <article
      v-if="selectedDungeon"
      class="current-dungeon"
      :class="{ locked: !selectedDungeon.unlocked }"
    >
      <div class="current-copy">
        <span class="status">{{
          selectedDungeon.unlocked ? "当前副本 · 可出发" : "当前副本 · 未解锁"
        }}</span>
        <h3>{{ selectedDungeon.name }}</h3>
        <div class="current-meta">
          <span>等级 {{ selectedDungeon.minimumLevel }}+</span>
          <span>推荐 {{ selectedDungeon.recommendedLevel }}</span>
          <span>{{ selectedDungeon.minimumMembers }}–{{ selectedDungeon.maximumMembers }} 人</span>
          <span>{{ selectedDungeon.encounterCount }} 位 Boss</span>
          <span>基础 {{ durationLabel(selectedDungeon.baseDurationSeconds) }}</span>
          <span>通关 {{ selectedDungeon.clearCount }} 次</span>
        </div>
        <p>{{ selectedDungeon.unlockHint }}</p>
      </div>
      <button type="button" class="switch-button" @click="openSelector">切换副本</button>
    </article>

    <div v-if="open" class="selector-backdrop" @click.self="open = false">
      <section
        class="selector-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dungeon-selector-title"
      >
        <header class="dialog-heading">
          <div>
            <p class="kicker">副本档案</p>
            <h3 id="dungeon-selector-title">选择副本</h3>
          </div>
          <button type="button" class="quiet close-button" @click="open = false">关闭</button>
        </header>

        <div class="selector-filters">
          <label>
            <span>搜索</span>
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
          <span class="result-count">{{ resultCount }} 个结果</span>
        </div>

        <div class="selector-body">
          <nav class="dungeon-list" aria-label="副本列表">
            <section v-if="recommendedDungeons.length" class="dungeon-section">
              <header>
                <strong>适合当前阵容</strong>
                <small>已选成员均达到最低等级</small>
              </header>
              <button
                v-for="dungeon in recommendedDungeons"
                :key="dungeon.id"
                type="button"
                class="dungeon-option"
                :class="{ selected: dungeon.id === previewDungeon?.id }"
                @click="previewId = dungeon.id"
              >
                <span class="option-title">
                  <strong>{{ dungeon.name }}</strong>
                  <span class="option-aside">
                    <em v-if="familyLabel(dungeon)">{{ familyLabel(dungeon) }}</em>
                    <b
                      v-if="dungeon.partyPreview"
                      class="party-preview-badge"
                      :class="{ ready: dungeon.partyPreview.clearProbability !== null }"
                      >{{
                        dungeon.partyPreview.clearProbability !== null
                          ? `基础全通 ${(dungeon.partyPreview.clearProbability * 100).toFixed(2)}%`
                          : dungeon.partyPreview.message
                      }}</b
                    >
                  </span>
                </span>
                <small
                  >推荐 {{ dungeon.recommendedLevel }} · {{ dungeon.minimumMembers }}–{{
                    dungeon.maximumMembers
                  }}
                  人 · 通关 {{ dungeon.clearCount }} 次</small
                >
              </button>
            </section>

            <section v-if="availableDungeons.length" class="dungeon-section">
              <header>
                <strong>已解锁</strong>
                <small>{{
                  selectedMemberLevels.length
                    ? "当前阵容有人未达到最低等级"
                    : "选择成员后显示适合项"
                }}</small>
              </header>
              <button
                v-for="dungeon in availableDungeons"
                :key="dungeon.id"
                type="button"
                class="dungeon-option"
                :class="{ selected: dungeon.id === previewDungeon?.id }"
                @click="previewId = dungeon.id"
              >
                <span class="option-title">
                  <strong>{{ dungeon.name }}</strong>
                  <span class="option-aside">
                    <em v-if="familyLabel(dungeon)">{{ familyLabel(dungeon) }}</em>
                    <b
                      v-if="dungeon.partyPreview"
                      class="party-preview-badge"
                      :class="{ ready: dungeon.partyPreview.clearProbability !== null }"
                      >{{
                        dungeon.partyPreview.clearProbability !== null
                          ? `基础全通 ${(dungeon.partyPreview.clearProbability * 100).toFixed(2)}%`
                          : dungeon.partyPreview.message
                      }}</b
                    >
                  </span>
                </span>
                <small
                  >推荐 {{ dungeon.recommendedLevel }} · {{ dungeon.minimumMembers }}–{{
                    dungeon.maximumMembers
                  }}
                  人 · 通关 {{ dungeon.clearCount }} 次</small
                >
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
                  :class="{ selected: dungeon.id === previewDungeon?.id }"
                  @click="previewId = dungeon.id"
                >
                  <span class="option-title">
                    <strong>{{ dungeon.name }}</strong>
                    <span class="option-aside">
                      <em v-if="familyLabel(dungeon)">{{ familyLabel(dungeon) }}</em>
                      <b
                        v-if="dungeon.partyPreview"
                        class="party-preview-badge"
                        :class="{ ready: dungeon.partyPreview.clearProbability !== null }"
                        >{{
                          dungeon.partyPreview.clearProbability !== null
                            ? `基础全通 ${(dungeon.partyPreview.clearProbability * 100).toFixed(2)}%`
                            : dungeon.partyPreview.message
                        }}</b
                      >
                    </span>
                  </span>
                  <small>推荐 {{ dungeon.recommendedLevel }} · {{ dungeon.unlockHint }}</small>
                </button>
              </template>
            </section>

            <p v-if="resultCount === 0" class="empty">没有符合条件的副本。</p>
          </nav>

          <aside
            v-if="previewDungeon"
            class="dungeon-detail"
            :class="{ locked: !previewDungeon.unlocked }"
          >
            <div>
              <span class="status">{{ previewDungeon.unlocked ? "可出发" : "未解锁" }}</span>
              <h4>{{ previewDungeon.name }}</h4>
              <p>{{ previewDungeon.unlockHint }}</p>
            </div>
            <dl>
              <div>
                <dt>最低等级</dt>
                <dd>{{ previewDungeon.minimumLevel }}</dd>
              </div>
              <div>
                <dt>推荐等级</dt>
                <dd>{{ previewDungeon.recommendedLevel }}</dd>
              </div>
              <div>
                <dt>队伍人数</dt>
                <dd>{{ previewDungeon.minimumMembers }}–{{ previewDungeon.maximumMembers }}</dd>
              </div>
              <div>
                <dt>首领数量</dt>
                <dd>{{ previewDungeon.encounterCount }}</dd>
              </div>
              <div>
                <dt>基础耗时</dt>
                <dd>{{ durationLabel(previewDungeon.baseDurationSeconds) }}</dd>
              </div>
              <div>
                <dt>完整通关</dt>
                <dd>{{ previewDungeon.clearCount }} 次</dd>
              </div>
            </dl>
            <section v-if="previewDungeon.partyPreview" class="party-preview-detail">
              <span>当前阵容 · 基础全通</span>
              <strong v-if="previewDungeon.partyPreview.clearProbability !== null">
                {{ (previewDungeon.partyPreview.clearProbability * 100).toFixed(2) }}%
              </strong>
              <strong v-else class="unavailable">{{ previewDungeon.partyPreview.message }}</strong>
              <small v-if="previewDungeon.partyPreview.durationSeconds !== null">
                预计 {{ durationLabel(previewDungeon.partyPreview.durationSeconds) }} ·
                {{ previewDungeon.partyPreview.message }}
              </small>
            </section>
            <button type="button" class="confirm-button" @click="confirmSelection">
              {{
                previewDungeon.id === selectedId
                  ? "保持当前副本"
                  : previewDungeon.unlocked
                    ? "选择这个副本"
                    : "查看这个副本"
              }}
            </button>
          </aside>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.dungeon-selector {
  min-width: 0;
}
.current-dungeon {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 18px;
  border: 1px solid #4a4133;
  border-radius: 8px;
  background: linear-gradient(100deg, #171611, #111416 70%);
}
.current-dungeon.locked {
  border-color: #513934;
  filter: saturate(0.7);
}
.current-copy {
  min-width: 0;
}
.status {
  color: #69a66e;
  font-size: 0.62rem;
  font-weight: 850;
  letter-spacing: 0.1em;
}
.locked .status {
  color: #a7655d;
}
h3,
h4,
p {
  margin: 0;
}
.current-dungeon h3 {
  margin-top: 3px;
  color: #ead8b6;
  font-family: Georgia, serif;
  font-size: 1.35rem;
}
.current-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 13px;
  margin-top: 8px;
  color: #9d9281;
  font-size: 0.67rem;
}
.current-copy > p {
  margin-top: 7px;
  color: #b08b4a;
  font-size: 0.65rem;
}
button {
  font: inherit;
}
.switch-button,
.confirm-button {
  flex: 0 0 auto;
  padding: 9px 13px;
  border: 1px solid #9b793f;
  border-radius: 6px;
  color: #1b160f;
  background: #c99b4d;
  font-weight: 800;
  cursor: pointer;
}
.selector-backdrop {
  position: fixed;
  z-index: 48;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgb(0 0 0 / 78%);
}
.selector-dialog {
  width: min(1000px, 100%);
  max-height: calc(100vh - 36px);
  overflow: hidden;
  border: 1px solid #5c503d;
  border-radius: 10px;
  background: #111416;
  box-shadow: 0 24px 70px #000;
}
.dialog-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid #37332c;
}
.dialog-heading .kicker {
  color: #9b7438;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.15em;
}
.dialog-heading h3 {
  margin-top: 2px;
  color: #e0cda7;
  font-size: 1.3rem;
}
.quiet {
  padding: 7px 11px;
  border: 1px solid #514a3d;
  border-radius: 6px;
  color: #cdbb98;
  background: #1b1b18;
  cursor: pointer;
}
.selector-filters {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 160px auto;
  align-items: end;
  gap: 10px;
  padding: 12px 18px;
  border-bottom: 1px solid #302e29;
  background: #0e1112;
}
.selector-filters label {
  display: grid;
  gap: 4px;
  color: #8f8575;
  font-size: 0.63rem;
}
.selector-filters input,
.selector-filters select {
  min-width: 0;
  padding: 9px;
  border: 1px solid #514a3d;
  border-radius: 6px;
  color: #e2d5bb;
  background: #090c0e;
}
.result-count {
  padding-bottom: 9px;
  color: #8f8575;
  font-size: 0.66rem;
}
.selector-body {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
  min-height: 520px;
  max-height: calc(100vh - 180px);
}
.dungeon-list {
  overflow: auto;
  padding: 14px;
  border-right: 1px solid #37332c;
}
.dungeon-section {
  display: grid;
  gap: 6px;
  margin-bottom: 16px;
}
.dungeon-section > header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 0 3px 3px;
}
.dungeon-section > header strong,
.section-toggle strong {
  color: #d6c29d;
  font-size: 0.75rem;
}
.dungeon-section > header small,
.section-toggle small {
  color: #756e63;
  font-size: 0.58rem;
}
.dungeon-option {
  display: grid;
  gap: 5px;
  width: 100%;
  padding: 10px 11px;
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.option-title strong {
  color: #ded1b8;
  font-size: 0.76rem;
}
.option-title em {
  padding: 3px 5px;
  border-radius: 4px;
  color: #a99065;
  background: #272117;
  font-size: 0.53rem;
  font-style: normal;
}
.option-aside {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
}
.party-preview-badge {
  padding: 3px 5px;
  border-radius: 4px;
  color: #c59583;
  background: #321c17;
  font-size: 0.54rem;
  font-weight: 750;
  white-space: nowrap;
}
.party-preview-badge.ready {
  color: #9ccd9f;
  background: #18301e;
}
.dungeon-option > small {
  overflow: hidden;
  color: #81796c;
  font-size: 0.6rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.section-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  font-size: 0.6rem;
  font-style: normal;
}
.dungeon-detail {
  display: grid;
  align-content: start;
  gap: 16px;
  padding: 22px;
  background: linear-gradient(150deg, #171711, #101314 65%);
}
.dungeon-detail h4 {
  margin-top: 5px;
  color: #ead8b6;
  font-family: Georgia, serif;
  font-size: 1.45rem;
}
.dungeon-detail p {
  margin-top: 7px;
  color: #b08b4a;
  font-size: 0.67rem;
  line-height: 1.5;
}
dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  margin: 0;
}
dl > div {
  padding: 9px;
  border: 1px solid #302e29;
  border-radius: 6px;
  background: #0b0e10;
}
dt {
  color: #776f64;
  font-size: 0.57rem;
}
dd {
  margin: 3px 0 0;
  color: #d6c29d;
  font-size: 0.72rem;
  font-weight: 800;
}
.party-preview-detail {
  display: grid;
  gap: 4px;
  padding: 13px;
  border: 1px solid #466343;
  border-radius: 7px;
  background: #111f14;
}
.party-preview-detail > span {
  color: #84ad85;
  font-size: 0.61rem;
  font-weight: 800;
  letter-spacing: 0.06em;
}
.party-preview-detail > strong {
  color: #b7d8ac;
  font-family: Georgia, serif;
  font-size: 1.55rem;
}
.party-preview-detail > strong.unavailable {
  color: #d09a87;
  font-family: inherit;
  font-size: 0.86rem;
}
.party-preview-detail > small {
  color: #7e9b7c;
  font-size: 0.6rem;
}
.confirm-button {
  width: 100%;
}
.empty {
  padding: 45px 12px;
  color: #81796c;
  text-align: center;
}
@media (max-width: 700px) {
  .current-dungeon {
    align-items: stretch;
    flex-direction: column;
  }
  .switch-button {
    width: 100%;
  }
  .selector-filters {
    grid-template-columns: minmax(0, 1fr) 125px;
  }
  .result-count {
    display: none;
  }
  .selector-body {
    display: block;
    overflow: auto;
  }
  .dungeon-list {
    max-height: 45vh;
    border-right: 0;
    border-bottom: 1px solid #37332c;
  }
  .dungeon-detail {
    min-height: auto;
  }
}
</style>
