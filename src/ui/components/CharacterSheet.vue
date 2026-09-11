<script setup lang="ts">
import { computed } from "vue";
import type {
  EquipmentSlotView,
  MemberDetailView,
} from "../../application/queries/get-members-view";
import { CHARACTER_SHEET_SLOT_NAMES } from "../../application/queries/get-members-view";
import EquipmentSlot from "./EquipmentSlot.vue";

const props = defineProps<{ member: MemberDetailView }>();
const byId = computed(() => new Map(props.member.equipment.map((slot) => [slot.id, slot])));
type CharacterSlotId = EquipmentSlotView["id"];
const leftIds = [
  "head",
  "neck",
  "shoulder",
  "back",
  "chest",
  "shirt",
  "tabard",
  "wrist",
] as const satisfies readonly CharacterSlotId[];
const rightIds = [
  "hands",
  "waist",
  "legs",
  "feet",
  "ring1",
  "ring2",
  "trinket1",
  "trinket2",
] as const satisfies readonly CharacterSlotId[];
const bottomIds = ["mainHand", "offHand", "ranged"] as const satisfies readonly CharacterSlotId[];
const slots = (ids: readonly CharacterSlotId[]): EquipmentSlotView[] =>
  ids.map((id) => {
    const existing = byId.value.get(id);
    if (existing) return existing;
    return {
      id,
      name: CHARACTER_SHEET_SLOT_NAMES[id as keyof typeof CHARACTER_SHEET_SLOT_NAMES] ?? id,
    };
  });
const sheetClass = computed(() => `class-${props.member.classId}`);
</script>

<template>
  <section class="character-sheet" :class="sheetClass" aria-label="角色装备面板">
    <header class="paperdoll-heading">
      <div>
        <span class="eyebrow">Classic Era · 角色面板</span>
        <h3>{{ member.name }}</h3>
        <p>{{ member.raceName }} {{ member.className }} · {{ member.specName }}</p>
      </div>
      <div class="heading-level">
        <strong>等级 {{ member.level }}</strong>
        <span>装等 {{ member.itemLevel.toFixed(1) }}</span>
      </div>
    </header>
    <div class="paperdoll-body">
      <div class="slot-column left" aria-label="左侧装备槽">
        <EquipmentSlot v-for="slot in slots(leftIds)" :key="slot.id" :slot="slot" side="left" />
      </div>
      <div class="portrait" aria-hidden="true">
        <div class="portrait-halo" />
        <div class="class-silhouette">
          <div class="silhouette-head" />
          <div class="silhouette-body" />
          <div class="silhouette-arm silhouette-arm-left" />
          <div class="silhouette-arm silhouette-arm-right" />
          <div class="silhouette-leg silhouette-leg-left" />
          <div class="silhouette-leg silhouette-leg-right" />
        </div>
        <div class="portrait-caption">
          <strong>{{ member.className }}</strong
          ><span>{{ member.roleName }}</span>
        </div>
      </div>
      <div class="slot-column right" aria-label="右侧装备槽">
        <EquipmentSlot v-for="slot in slots(rightIds)" :key="slot.id" :slot="slot" side="right" />
      </div>
    </div>
    <div class="bottom-slots" aria-label="武器与远程装备槽">
      <EquipmentSlot v-for="slot in slots(bottomIds)" :key="slot.id" :slot="slot" side="bottom" />
    </div>
  </section>
</template>

<style scoped>
.character-sheet {
  --gold: #c6a15a;
  position: relative;
  overflow: hidden;
  padding: 14px;
  border: 1px solid #80643a;
  border-radius: 4px;
  background:
    linear-gradient(
      90deg,
      rgb(255 255 255 / 2%),
      transparent 20%,
      transparent 80%,
      rgb(255 255 255 / 2%)
    ),
    radial-gradient(circle at 50% 38%, #292a29 0%, #16191b 44%, #0b0e10 100%);
  box-shadow:
    inset 0 0 0 1px #2f2b25,
    inset 0 0 44px rgb(0 0 0 / 72%),
    0 20px 55px rgb(0 0 0 / 28%);
}
.character-sheet::before,
.character-sheet::after {
  position: absolute;
  width: 22px;
  height: 22px;
  border-color: var(--gold);
  content: "";
  opacity: 0.8;
}
.character-sheet::before {
  top: 6px;
  left: 6px;
  border-top: 1px solid;
  border-left: 1px solid;
}
.character-sheet::after {
  right: 6px;
  bottom: 6px;
  border-right: 1px solid;
  border-bottom: 1px solid;
}
.paperdoll-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  padding: 6px 8px 12px;
  border-bottom: 1px solid #4a3b25;
}
.eyebrow {
  color: #a88b55;
  font-size: 0.58rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.paperdoll-heading h3 {
  margin: 4px 0 2px;
  color: #f1e0b8;
  font-family: Georgia, serif;
  font-size: 1.35rem;
  font-weight: 600;
}
.paperdoll-heading p {
  margin: 0;
  color: #9e927d;
  font-size: 0.7rem;
}
.heading-level {
  display: grid;
  gap: 3px;
  color: #b7a174;
  font-size: 0.68rem;
  text-align: right;
}
.heading-level strong {
  color: #e5c77f;
  font-size: 0.78rem;
}
.paperdoll-body {
  display: grid;
  grid-template-columns: minmax(174px, 1fr) minmax(220px, 1.2fr) minmax(174px, 1fr);
  gap: 14px;
  padding: 15px 7px 12px;
}
.slot-column {
  display: grid;
  align-content: start;
  gap: 6px;
}
.portrait {
  position: relative;
  display: grid;
  min-height: 410px;
  place-items: center;
  align-content: center;
  overflow: hidden;
  border: 1px solid rgb(133 112 73 / 35%);
  border-radius: 3px;
  background:
    linear-gradient(180deg, transparent 0 74%, rgb(199 157 78 / 8%) 100%),
    radial-gradient(ellipse at center, rgb(48 56 60 / 58%), transparent 67%);
}
.portrait::before,
.portrait::after {
  position: absolute;
  inset: 10px;
  border: 1px solid rgb(180 148 86 / 14%);
  content: "";
  pointer-events: none;
}
.portrait::after {
  inset: 18px;
  border-color: rgb(180 148 86 / 8%);
}
.portrait-halo {
  position: absolute;
  width: 210px;
  height: 290px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgb(94 132 151 / 22%), transparent 68%);
  filter: blur(5px);
}
.class-silhouette {
  position: relative;
  width: 148px;
  height: 284px;
  color: #9eb8c1;
  filter: drop-shadow(0 0 16px rgb(131 165 174 / 28%));
  opacity: 0.68;
}
.silhouette-head {
  position: absolute;
  top: 3px;
  left: 57px;
  width: 34px;
  height: 42px;
  border-radius: 48% 48% 44% 44%;
  background: currentColor;
}
.silhouette-body {
  position: absolute;
  top: 39px;
  left: 38px;
  width: 72px;
  height: 128px;
  border-radius: 42% 42% 18% 18%;
  background: linear-gradient(90deg, transparent 0 12%, currentColor 12% 88%, transparent 88%);
  clip-path: polygon(28% 0, 72% 0, 100% 20%, 85% 100%, 15% 100%, 0 20%);
}
.silhouette-arm,
.silhouette-leg {
  position: absolute;
  display: block;
  background: currentColor;
  transform-origin: top center;
}
.silhouette-arm {
  top: 52px;
  width: 22px;
  height: 119px;
  border-radius: 14px;
}
.silhouette-arm-left {
  left: 25px;
  transform: rotate(8deg);
}
.silhouette-arm-right {
  right: 25px;
  transform: rotate(-8deg);
}
.silhouette-leg {
  top: 153px;
  width: 27px;
  height: 130px;
  border-radius: 12px 12px 8px 8px;
}
.silhouette-leg-left {
  left: 43px;
  transform: rotate(2deg);
}
.silhouette-leg-right {
  right: 43px;
  transform: rotate(-2deg);
}
.portrait-caption {
  position: absolute;
  bottom: 18px;
  display: grid;
  gap: 3px;
  color: #b8a57d;
  text-align: center;
}
.portrait-caption strong {
  color: #ead39b;
  font-family: Georgia, serif;
  font-size: 0.85rem;
}
.portrait-caption span {
  font-size: 0.64rem;
}
.bottom-slots {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 10px 7px 3px;
  border-top: 1px solid #4a3b25;
}
@media (max-width: 820px) {
  .paperdoll-body {
    grid-template-columns: minmax(142px, 1fr) minmax(170px, 1fr) minmax(142px, 1fr);
    gap: 8px;
  }
  .portrait {
    min-height: 380px;
  }
}
@media (max-width: 640px) {
  .paperdoll-heading {
    align-items: flex-start;
    flex-direction: column;
  }
  .heading-level {
    text-align: left;
  }
  .paperdoll-body {
    grid-template-columns: 1fr 1fr;
  }
  .portrait {
    grid-column: 1 / -1;
    grid-row: 1;
    min-height: 250px;
  }
  .class-silhouette {
    transform: scale(0.72);
  }
  .slot-column.left {
    grid-column: 1;
    grid-row: 2;
  }
  .slot-column.right {
    grid-column: 2;
    grid-row: 2;
  }
}
</style>
