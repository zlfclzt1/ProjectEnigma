<script setup lang="ts">
import type { EquippedItemView } from "../../application/queries/get-members-view";

defineProps<{ item: EquippedItemView }>();
</script>

<template>
  <div class="item-tooltip" role="tooltip">
    <strong :class="`quality-${item.quality}`">{{ item.name }}</strong>
    <div class="item-meta">
      <span>物品等级 {{ item.itemLevel }}</span
      ><span v-if="item.twoHanded">双手</span>
    </div>
    <p v-for="stat in item.stats" :key="stat.id" class="stat-line">
      <span>{{ stat.label }}</span
      ><b>{{ stat.value }}</b>
    </p>
    <section v-if="item.randomSuffix" class="suffix-details">
      <span>随机词缀：{{ item.randomSuffix.name }}</span>
      <small v-for="stat in item.randomSuffix.stats" :key="stat.id">
        {{ stat.label }} {{ stat.value }}
      </small>
    </section>
    <p v-if="item.stats.length === 0" class="muted">无额外属性</p>
    <div class="requirements">
      <span v-for="requirement in item.requirements" :key="requirement">{{ requirement }}</span>
    </div>
    <p class="description">{{ item.description }}</p>
    <footer>
      <span>来源：{{ item.acquisitionSource }}</span>
      <span>属性：{{ item.statsSource }}</span>
    </footer>
  </div>
</template>

<style scoped>
.item-tooltip {
  width: min(320px, 82vw);
  padding: 14px;
  border: 1px solid #81704c;
  border-radius: 6px;
  color: #eee5d4;
  background: #090b0d;
  box-shadow: 0 18px 50px #000d;
  font-size: 0.78rem;
  text-align: left;
}
.item-tooltip > strong {
  display: block;
  margin-bottom: 6px;
  font-size: 0.95rem;
}
.quality-poor {
  color: #9d9d9d;
}
.quality-common {
  color: #fff;
}
.quality-uncommon {
  color: #1eff00;
}
.quality-rare {
  color: #4897ff;
}
.quality-epic {
  color: #b76cff;
}
.item-meta,
.stat-line {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.item-meta {
  margin-bottom: 9px;
  color: #a69b88;
}
.stat-line {
  margin: 4px 0;
  color: #73c879;
}
.stat-line b {
  font-weight: 700;
}
.requirements {
  display: grid;
  gap: 3px;
  margin-top: 9px;
  color: #d3cab8;
}
.suffix-details {
  display: grid;
  gap: 3px;
  padding: 7px;
  margin-top: 8px;
  border-left: 2px solid #8d7650;
  color: #cbb786;
  background: #17140f;
}
.suffix-details small {
  color: #73c879;
}
.description {
  color: #d6b768;
  line-height: 1.45;
}
.muted,
footer {
  color: #827a6d;
}
footer {
  display: grid;
  gap: 3px;
  padding-top: 8px;
  border-top: 1px solid #292721;
  font-size: 0.68rem;
}
</style>
