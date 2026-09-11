<script setup lang="ts">
import type { EquipmentSlotView } from "../../application/queries/get-members-view";
import ItemTooltip from "./ItemTooltip.vue";

withDefaults(
  defineProps<{
    slot: EquipmentSlotView;
    side?: "left" | "right" | "bottom";
  }>(),
  { side: "left" },
);
const isVirtual = (id: EquipmentSlotView["id"]): boolean => id === "shirt" || id === "tabard";
</script>

<template>
  <div
    :class="[
      isVirtual(slot.id) ? 'paperdoll-slot' : 'equipment-slot',
      { empty: !slot.item },
      `side-${side}`,
    ]"
    :data-slot="slot.id"
    :aria-label="slot.name"
  >
    <div class="icon-frame" :class="slot.item ? `quality-${slot.item.quality}` : ''">
      <img v-if="slot.item?.iconUrl" :src="slot.item.iconUrl" :alt="slot.item.name" />
      <span v-else class="empty-glyph">{{
        slot.id === "shirt" ? "衬" : slot.id === "tabard" ? "袍" : ""
      }}</span>
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
.equipment-slot,
.paperdoll-slot {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 56px;
  padding: 3px 4px;
  border: 1px solid #4d4537;
  border-radius: 3px;
  background: linear-gradient(180deg, #1a1b1a, #0c0e10);
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 45%);
}
.equipment-slot:hover,
.paperdoll-slot:hover {
  z-index: 20;
  border-color: #c69e59;
  background: linear-gradient(180deg, #24231e, #101113);
}
.icon-frame {
  display: grid;
  flex: 0 0 48px;
  width: 48px;
  height: 48px;
  place-items: center;
  overflow: hidden;
  border: 2px solid #655c4b;
  border-radius: 2px;
  color: #786f60;
  background: radial-gradient(circle at 40% 30%, #34332e, #111315 72%);
  box-shadow: inset 0 0 10px rgb(0 0 0 / 68%);
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
  color: #9c8c6f;
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
  opacity: 0.9;
}
.empty .icon-frame {
  border-color: #4d463a;
  background: radial-gradient(circle, #242522, #0b0d0f 74%);
}
.empty-glyph {
  color: #76694f;
  font-size: 0.7rem;
  opacity: 0.8;
}
.side-right {
  flex-direction: row-reverse;
  text-align: right;
}
.side-right .slot-copy {
  justify-items: end;
}
.side-right .tooltip-panel {
  right: 0;
  left: auto;
}
.side-bottom {
  justify-content: center;
  min-height: 62px;
}
.side-bottom .slot-copy {
  display: grid;
}
.side-bottom .slot-copy small {
  font-size: 0.62rem;
}
@media (max-width: 640px) {
  .equipment-slot,
  .paperdoll-slot {
    min-height: 52px;
  }
  .icon-frame {
    flex-basis: 42px;
    width: 42px;
    height: 42px;
  }
  .slot-copy strong {
    max-width: 92px;
  }
}
.tooltip-panel {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  display: none;
  z-index: 50;
}
.equipment-slot:hover .tooltip-panel,
.equipment-slot:focus-within .tooltip-panel,
.paperdoll-slot:hover .tooltip-panel,
.paperdoll-slot:focus-within .tooltip-panel {
  display: block;
}
</style>
