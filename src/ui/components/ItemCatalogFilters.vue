<script setup lang="ts">
import type { DungeonCatalogView } from "../../application/queries/get-item-catalog-view";
import type { EquipmentSlot } from "../../domain/equipment/equipment-slot";

export type CatalogAcquiredFilter = "all" | "acquired" | "missing";
export type CatalogQualityFilter = "" | "poor" | "common" | "uncommon" | "rare" | "epic";

defineProps<{
  dungeons: readonly DungeonCatalogView[];
  encounterOptions: readonly { readonly id: string; readonly name: string }[];
  setOptions: readonly { readonly id: string; readonly name: string }[];
  setFilterUnlocked: boolean;
  suffixOptions: readonly { readonly id: string; readonly name: string }[];
  dungeonId: string;
  encounterId: string;
  itemSetId: string;
  suffixId: string;
  quality: CatalogQualityFilter;
  slot: "" | EquipmentSlot;
  acquired: CatalogAcquiredFilter;
}>();

const emit = defineEmits<{
  "update:dungeonId": [value: string];
  "update:encounterId": [value: string];
  "update:itemSetId": [value: string];
  "update:suffixId": [value: string];
  "update:quality": [value: CatalogQualityFilter];
  "update:slot": [value: "" | EquipmentSlot];
  "update:acquired": [value: CatalogAcquiredFilter];
}>();

const slotOptions: readonly { readonly id: EquipmentSlot; readonly name: string }[] = [
  { id: "head", name: "头部" },
  { id: "neck", name: "颈部" },
  { id: "shoulder", name: "肩部" },
  { id: "back", name: "背部" },
  { id: "chest", name: "胸部" },
  { id: "wrist", name: "手腕" },
  { id: "hands", name: "手部" },
  { id: "waist", name: "腰部" },
  { id: "legs", name: "腿部" },
  { id: "feet", name: "脚部" },
  { id: "ring1", name: "戒指" },
  { id: "trinket1", name: "饰品" },
  { id: "mainHand", name: "主手" },
  { id: "offHand", name: "副手" },
  { id: "ranged", name: "远程" },
];
</script>

<template>
  <section class="catalog-filters" aria-label="装备图鉴筛选">
    <label>
      <span>副本</span>
      <select
        :value="dungeonId"
        @change="emit('update:dungeonId', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">全部副本</option>
        <option v-for="dungeon in dungeons" :key="dungeon.id" :value="dungeon.id">
          {{ dungeon.name }}{{ dungeon.unlocked ? "" : "（未解锁）" }}
        </option>
      </select>
    </label>
    <label>
      <span>Boss</span>
      <select
        :value="encounterId"
        @change="emit('update:encounterId', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">全部 Boss</option>
        <option v-for="encounter in encounterOptions" :key="encounter.id" :value="encounter.id">
          {{ encounter.name }}
        </option>
      </select>
    </label>
    <label>
      <span>套装</span>
      <select
        :value="itemSetId"
        :disabled="!setFilterUnlocked"
        :title="setFilterUnlocked ? undefined : '完成对应收藏奖励后解锁套装筛选'"
        @change="emit('update:itemSetId', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">{{ setFilterUnlocked ? "全部套装" : "完成收藏奖励后解锁" }}</option>
        <option v-for="set in setOptions" :key="set.id" :value="set.id">{{ set.name }}</option>
      </select>
    </label>
    <label>
      <span>词缀</span>
      <select
        :value="suffixId"
        @change="emit('update:suffixId', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">全部词缀</option>
        <option v-for="suffix in suffixOptions" :key="suffix.id" :value="suffix.id">
          {{ suffix.name }}
        </option>
      </select>
    </label>
    <label>
      <span>品质</span>
      <select
        :value="quality"
        @change="
          emit('update:quality', ($event.target as HTMLSelectElement).value as CatalogQualityFilter)
        "
      >
        <option value="">全部品质</option>
        <option value="poor">粗糙</option>
        <option value="common">普通</option>
        <option value="uncommon">优秀</option>
        <option value="rare">精良</option>
        <option value="epic">史诗</option>
      </select>
    </label>
    <label>
      <span>装备栏</span>
      <select
        :value="slot"
        @change="
          emit('update:slot', ($event.target as HTMLSelectElement).value as '' | EquipmentSlot)
        "
      >
        <option value="">全部栏位</option>
        <option v-for="option in slotOptions" :key="option.id" :value="option.id">
          {{ option.name }}
        </option>
      </select>
    </label>
    <label>
      <span>收藏状态</span>
      <select
        :value="acquired"
        @change="
          emit(
            'update:acquired',
            ($event.target as HTMLSelectElement).value as CatalogAcquiredFilter,
          )
        "
      >
        <option value="all">全部</option>
        <option value="acquired">已获得</option>
        <option value="missing">未获得</option>
      </select>
    </label>
  </section>
</template>

<style scoped>
.catalog-filters {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 9px;
  padding: 12px;
  border: 1px solid #3d382f;
  border-radius: 8px;
  background: #101315;
}
label {
  display: grid;
  gap: 4px;
  min-width: 0;
  color: #8f8575;
  font-size: 0.65rem;
}
select {
  width: 100%;
  min-width: 0;
  padding: 8px;
  border: 1px solid #4a4439;
  border-radius: 5px;
  color: #ddd0b8;
  background: #090c0e;
}
@media (max-width: 760px) {
  .catalog-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 430px) {
  .catalog-filters {
    grid-template-columns: 1fr;
  }
}
</style>
