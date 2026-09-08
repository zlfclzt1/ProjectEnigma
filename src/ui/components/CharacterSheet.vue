<script setup lang="ts">
import { computed } from "vue";
import type {
  EquipmentSlotView,
  MemberDetailView,
} from "../../application/queries/get-members-view";
import EquipmentSlot from "./EquipmentSlot.vue";

const props = defineProps<{ member: MemberDetailView }>();
const byId = computed(() => new Map(props.member.equipment.map((slot) => [slot.id, slot])));
const leftIds = ["head", "neck", "shoulder", "back", "chest", "wrist"] as const;
const rightIds = ["hands", "waist", "legs", "feet", "ring1", "ring2"] as const;
const bottomIds = ["trinket1", "trinket2", "mainHand", "offHand", "ranged"] as const;
const slots = (ids: readonly EquipmentSlotView["id"][]) =>
  ids.map((id) => byId.value.get(id)!).filter(Boolean);
</script>

<template>
  <section class="character-sheet">
    <div class="slot-column left">
      <EquipmentSlot v-for="slot in slots(leftIds)" :key="slot.id" :slot="slot" />
    </div>
    <div class="portrait">
      <div class="portrait-rune">{{ member.name.slice(0, 1) }}</div>
      <strong>{{ member.name }}</strong>
      <span>{{ member.raceName }} {{ member.className }}</span>
      <span>等级 {{ member.level }} · 装等 {{ member.itemLevel.toFixed(1) }}</span>
    </div>
    <div class="slot-column right">
      <EquipmentSlot v-for="slot in slots(rightIds)" :key="slot.id" :slot="slot" />
    </div>
    <div class="bottom-slots">
      <EquipmentSlot v-for="slot in slots(bottomIds)" :key="slot.id" :slot="slot" />
    </div>
  </section>
</template>

<style scoped>
.character-sheet {
  display: grid;
  grid-template-columns: minmax(150px, 1fr) minmax(170px, 1.1fr) minmax(150px, 1fr);
  gap: 10px;
  padding: 16px;
  border: 2px ridge #745c33;
  border-radius: 10px;
  background: radial-gradient(circle at center, #25231d, #0d1012 68%);
  box-shadow: inset 0 0 50px #000b;
}
.slot-column {
  display: grid;
  gap: 6px;
}
.right :deep(.equipment-slot) {
  flex-direction: row-reverse;
  text-align: right;
}
.right :deep(.tooltip-panel) {
  right: 0;
  left: auto;
}
.portrait {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  min-height: 300px;
  color: #a99d87;
  text-align: center;
}
.portrait-rune {
  display: grid;
  width: 116px;
  height: 116px;
  margin-bottom: 16px;
  place-items: center;
  border: 3px double #a67d39;
  border-radius: 50%;
  color: #e9ca82;
  background: radial-gradient(circle, #473b27, #151719 68%);
  font-family: Georgia, serif;
  font-size: 3.8rem;
  box-shadow: 0 0 30px #c28a2730;
}
.portrait strong {
  color: #f0dfbf;
  font-family: Georgia, serif;
  font-size: 1.2rem;
}
.portrait span {
  margin-top: 4px;
  font-size: 0.75rem;
}
.bottom-slots {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
}
.bottom-slots :deep(.slot-copy) {
  display: none;
}
.bottom-slots :deep(.equipment-slot) {
  justify-content: center;
}
@media (max-width: 760px) {
  .character-sheet {
    grid-template-columns: 1fr 1fr;
  }
  .portrait {
    grid-column: 1 / -1;
    grid-row: 1;
    min-height: 180px;
  }
  .bottom-slots {
    grid-template-columns: repeat(5, 1fr);
  }
}
</style>
