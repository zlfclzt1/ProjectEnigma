<script setup lang="ts">
import { ref } from "vue";
import type { CatalogItemView } from "../../application/queries/get-item-catalog-view";

defineProps<{ item: CatalogItemView }>();

const expanded = ref(false);

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function chanceChanged(item: CatalogItemView): boolean {
  return Math.abs(item.source.encounterDropChance - item.source.baseEncounterDropChance) > 0.0001;
}
</script>

<template>
  <article class="catalog-item" :class="{ acquired: item.acquired }">
    <button
      type="button"
      class="item-summary"
      :aria-expanded="expanded"
      :aria-label="`${item.name}，查看装备详情`"
      @click="expanded = !expanded"
    >
      <span class="item-icon" :class="`quality-${item.quality}`">
        <img v-if="item.iconUrl" :src="item.iconUrl" :alt="item.name" />
        <span v-else>{{ item.name.slice(0, 1) }}</span>
      </span>
      <span class="item-copy">
        <span class="source-badges">
          <em :data-kind="item.source.kind">
            {{ item.source.kind === "development" ? "调查解锁" : "基础掉落" }}
          </em>
          <em v-if="item.source.firstDevelopmentReward" data-kind="first-clear">
            首次开发战利品
          </em>
        </span>
        <strong :class="`quality-${item.quality}`">{{ item.name }}</strong>
        <small>{{ item.slotName }} · 物品等级 {{ item.itemLevel }}</small>
        <small v-if="item.source.kind === 'development'">
          当前单次 {{ percent(item.source.perDropChance) }} · 本场
          {{ percent(item.source.encounterDropChance) }}
        </small>
        <small v-else-if="chanceChanged(item)">
          基础本场 {{ percent(item.source.baseEncounterDropChance) }} · 当前
          {{ percent(item.source.encounterDropChance) }}
        </small>
        <small v-else>
          单次 {{ percent(item.source.perDropChance) }} · 本场
          {{ percent(item.source.encounterDropChance) }}
        </small>
      </span>
      <span class="collection-state" :class="{ missing: !item.acquired }">
        {{ item.acquired ? `已获得 ${item.acquisitionCount}` : "未获得" }}
      </span>
    </button>

    <section v-if="expanded" class="catalog-tooltip" role="region" :aria-label="`${item.name}详情`">
      <header>
        <strong :class="`quality-${item.quality}`">{{ item.name }}</strong>
        <span>{{ item.source.dungeonName }} · {{ item.source.encounterName }}</span>
      </header>
      <div class="item-meta">
        <span>物品等级 {{ item.itemLevel }}</span>
        <span>{{ item.slotName }}</span>
      </div>
      <p v-for="stat in item.statLines" :key="stat.id" class="stat-line">
        <span>{{ stat.label }}</span
        ><b>{{ stat.value }}</b>
      </p>
      <p v-if="item.statLines.length === 0" class="muted">无额外属性</p>
      <div class="requirements">
        <span v-for="requirement in item.requirements" :key="requirement">{{ requirement }}</span>
      </div>
      <p class="description">{{ item.description }}</p>
      <section v-if="item.source.developmentQuestNames.length" class="development-source">
        <strong>副本开发收益</strong>
        <span>调查解锁：{{ item.source.developmentQuestNames.join("、") }}</span>
        <span v-if="item.source.firstDevelopmentReward">曾作为首次开发战利品带回公会</span>
      </section>
      <section v-if="item.possibleRandomSuffixes.length" class="suffixes">
        <strong>可能随机词缀</strong>
        <span
          v-for="suffix in item.possibleRandomSuffixes"
          :key="suffix.id"
          :class="{ seen: item.seenRandomSuffixes.some((seen) => seen.id === suffix.id) }"
        >
          {{ suffix.name }}
          {{ item.seenRandomSuffixes.some((seen) => seen.id === suffix.id) ? "· 已见" : "" }}
        </span>
      </section>
      <section v-if="item.sources.length > 1" class="sources">
        <strong>全部已公开来源</strong>
        <span v-for="source in item.sources" :key="`${source.dungeonId}:${source.encounterId}`">
          {{ source.dungeonName }} · {{ source.encounterName }} ·
          {{ source.kind === "development" ? "调查解锁" : "基础掉落" }} · 本场
          {{ percent(source.encounterDropChance) }}
        </span>
      </section>
      <footer>
        <span>
          当前权重 {{ item.source.relativeWeight }} · 每场基础保证
          {{ item.source.guaranteedEquipmentDrops }} 件装备
        </span>
        <span>属性：{{ item.statsSource }}</span>
      </footer>
    </section>
  </article>
</template>

<style scoped>
.catalog-item {
  overflow: hidden;
  border: 1px solid #37342d;
  border-radius: 7px;
  background: #101315;
}
.catalog-item.acquired {
  border-color: #665536;
}
.item-summary {
  display: grid;
  width: 100%;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 0;
  color: inherit;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.item-summary:hover,
.item-summary:focus-visible {
  background: #191813;
  outline: none;
}
.item-icon {
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  overflow: hidden;
  border: 2px solid #777;
  border-radius: 5px;
  color: #d2c3a6;
  background: #20201c;
}
.item-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.item-icon.quality-common {
  border-color: #aaa;
}
.item-icon.quality-uncommon {
  border-color: #279b32;
}
.item-icon.quality-rare {
  border-color: #357fcb;
}
.item-icon.quality-epic {
  border-color: #8e49bd;
}
.item-copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}
.source-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.source-badges em {
  width: max-content;
  padding: 1px 5px;
  border: 1px solid #4b463c;
  border-radius: 999px;
  color: #918776;
  font-size: 0.54rem;
  font-style: normal;
  line-height: 1.35;
}
.source-badges em[data-kind="development"] {
  border-color: #775e2f;
  color: #d2ac5a;
  background: #261e10;
}
.source-badges em[data-kind="first-clear"] {
  border-color: #4f7255;
  color: #86c18d;
  background: #122017;
}
.item-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.item-copy small {
  color: #877f72;
  font-size: 0.63rem;
}
.quality-poor {
  color: #9d9d9d;
}
.quality-common {
  color: #fff;
}
.quality-uncommon {
  color: #45bd42;
}
.quality-rare {
  color: #5798ee;
}
.quality-epic {
  color: #b76cff;
}
.collection-state {
  color: #c5a55f;
  font-size: 0.65rem;
  white-space: nowrap;
}
.collection-state.missing {
  color: #736c60;
}
.catalog-tooltip {
  padding: 13px;
  border-top: 1px solid #3d382f;
  color: #eee5d4;
  background: #090b0d;
  font-size: 0.76rem;
}
.catalog-tooltip header,
.catalog-tooltip footer,
.development-source,
.suffixes,
.sources,
.requirements {
  display: grid;
  gap: 3px;
}
.catalog-tooltip header span,
.item-meta,
.muted,
.catalog-tooltip footer {
  color: #837b6e;
}
.item-meta,
.stat-line {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
.item-meta {
  margin: 8px 0;
}
.stat-line {
  margin: 4px 0;
  color: #73c879;
}
.requirements {
  margin-top: 9px;
  color: #d3cab8;
}
.description {
  color: #d6b768;
  line-height: 1.45;
}
.suffixes,
.development-source,
.sources {
  padding: 8px;
  border-left: 2px solid #806c48;
  color: #887f71;
  background: #17140f;
}
.suffixes strong,
.suffixes .seen,
.development-source strong,
.sources strong {
  color: #cbb786;
}
.development-source {
  border-left-color: #4f7255;
  color: #9cb69e;
  background: #111a14;
}
.catalog-tooltip footer {
  padding-top: 8px;
  border-top: 1px solid #292721;
  font-size: 0.65rem;
}
@media (max-width: 430px) {
  .item-summary {
    grid-template-columns: auto minmax(0, 1fr);
  }
  .collection-state {
    grid-column: 2;
  }
}
</style>
