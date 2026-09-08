<script setup lang="ts">
import type { EquipmentSlotView } from "../../application/queries/get-members-view";
import ItemTooltip from "./ItemTooltip.vue";

defineProps<{ slot: EquipmentSlotView }>();
</script>

<template>
  <div class="equipment-slot" :class="{ empty: !slot.item }" :aria-label="slot.name">
    <div class="icon-frame" :class="slot.item ? `quality-${slot.item.quality}` : ''">
      <img v-if="slot.item?.iconUrl" :src="slot.item.iconUrl" :alt="slot.item.name" />
      <span v-else>{{ slot.name.slice(0, 1) }}</span>
    </div>
    <div class="slot-copy">
      <small>{{ slot.name }}</small>
      <strong v-if="slot.item">{{ slot.item.name }}</strong>
      <em v-else>空</em>
    </div>
    <ItemTooltip v-if="slot.item" :item="slot.item" class="tooltip-panel" />
  </div>
</template>

<style scoped>
.equipment-slot {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 5px;
  border: 1px solid #38342c;
  border-radius: 6px;
  background: #111315;
}
.equipment-slot:hover {
  z-index: 20;
  border-color: #82683c;
}
.icon-frame {
  display: grid;
  flex: 0 0 42px;
  width: 42px;
  height: 42px;
  place-items: center;
  overflow: hidden;
  border: 2px solid #555;
  border-radius: 4px;
  color: #786f60;
  background: radial-gradient(circle, #2a2925, #0a0c0e);
}
.icon-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.icon-frame.quality-uncommon {
  border-color: #279b32;
}
.icon-frame.quality-rare {
  border-color: #357fcb;
}
.icon-frame.quality-epic {
  border-color: #8e49bd;
}
.slot-copy {
  display: grid;
  min-width: 0;
}
.slot-copy small {
  color: #7f776a;
  font-size: 0.6rem;
}
.slot-copy strong {
  overflow: hidden;
  color: #d8ccb5;
  font-size: 0.7rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.slot-copy em {
  color: #59544b;
  font-size: 0.7rem;
}
.empty {
  opacity: 0.72;
}
.tooltip-panel {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  display: none;
  z-index: 50;
}
.equipment-slot:hover .tooltip-panel,
.equipment-slot:focus-within .tooltip-panel {
  display: block;
}
</style>
