<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { RosterPresetView } from "../../application/queries/get-roster-presets-view";
import type { MemberId } from "../../domain/shared/ids";

const props = defineProps<{
  open: boolean;
  preset: RosterPresetView | null;
  maximumMembers: number;
}>();
const emit = defineEmits<{ apply: [memberIds: readonly MemberId[]]; close: [] }>();
const selectedIds = ref<MemberId[]>([]);
const search = ref("");
const role = ref<"tank" | "healer" | "dps" | null>(null);
const members = computed(() => props.preset?.members.filter((member) => !member.departed) ?? []);
const filtered = computed(() => {
  const needle = search.value.trim().toLocaleLowerCase();
  return members.value.filter(
    (member) =>
      (!needle || member.name.toLocaleLowerCase().includes(needle)) &&
      (!role.value || member.role === role.value),
  );
});

function toggle(memberId: MemberId): void {
  selectedIds.value = selectedIds.value.includes(memberId)
    ? selectedIds.value.filter((id) => id !== memberId)
    : selectedIds.value.length < props.maximumMembers
      ? [...selectedIds.value, memberId]
      : selectedIds.value;
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      selectedIds.value = [];
      search.value = "";
      role.value = null;
    }
  },
);
</script>

<template>
  <div v-if="open && preset" class="modal-backdrop" @click.self="emit('close')">
    <section
      class="modal reduction"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reduction-title"
    >
      <header>
        <div>
          <p>套用 {{ preset.name }}</p>
          <h3 id="reduction-title">选择本次参战成员</h3>
        </div>
        <strong>{{ selectedIds.length }} / {{ maximumMembers }} 人</strong>
      </header>
      <p class="explanation">
        该固定队伍超过当前活动人数上限。减员只影响本次阵容，不会修改固定队伍。
      </p>
      <div class="filters">
        <input v-model="search" aria-label="搜索预设成员" placeholder="搜索成员姓名" />
        <select v-model="role" aria-label="按职责筛选预设成员">
          <option :value="null">全部职责</option>
          <option value="tank">坦克</option>
          <option value="healer">治疗</option>
          <option value="dps">输出</option>
        </select>
      </div>
      <div class="members">
        <label
          v-for="member in filtered"
          :key="member.id"
          :class="{ selected: selectedIds.includes(member.id) }"
        >
          <input
            type="checkbox"
            :checked="selectedIds.includes(member.id)"
            :disabled="!selectedIds.includes(member.id) && selectedIds.length >= maximumMembers"
            @change="toggle(member.id)"
          />
          <span
            ><strong>{{ member.name }}</strong
            ><small
              >{{ member.className }} · {{ member.roleName
              }}<em v-if="member.active"> · 活动中</em></small
            ></span
          >
        </label>
      </div>
      <p v-if="preset.departedCount" class="warning">
        另有 {{ preset.departedCount }} 名已离队成员不会载入。
      </p>
      <footer>
        <button type="button" class="quiet" @click="emit('close')">取消</button
        ><button
          type="button"
          :disabled="selectedIds.length === 0"
          @click="emit('apply', selectedIds)"
        >
          套用所选成员
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  z-index: 55;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgb(0 0 0 / 78%);
}
.modal {
  width: min(760px, 100%);
  max-height: calc(100vh - 36px);
  overflow: auto;
  padding: 18px;
  border: 1px solid #5c503d;
  border-radius: 9px;
  background: #111416;
  box-shadow: 0 22px 65px #000;
}
header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 10px;
}
header p,
h3,
.explanation {
  margin: 0;
}
header p {
  color: #9b7438;
  font-size: 0.65rem;
  font-weight: 800;
}
h3 {
  color: #e0cda7;
}
header > strong {
  color: #d8b25a;
}
.explanation {
  margin-top: 7px;
  color: #8e8576;
  font-size: 0.7rem;
}
.filters {
  display: grid;
  grid-template-columns: 1fr 150px;
  gap: 8px;
  margin: 14px 0 9px;
}
input,
select {
  padding: 9px;
  border: 1px solid #514a3d;
  border-radius: 6px;
  color: #e5d9c2;
  background: #090c0e;
}
.members {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 6px;
  max-height: 430px;
  overflow: auto;
}
.members label {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 9px;
  border: 1px solid #302e29;
  border-radius: 6px;
  background: #0b0e10;
  cursor: pointer;
}
.members label.selected {
  border-color: #a27c3c;
  background: #211d16;
}
.members span {
  display: grid;
}
.members strong {
  color: #ded1b8;
  font-size: 0.73rem;
}
.members small {
  color: #7f776b;
  font-size: 0.58rem;
}
em {
  color: #72a7d0;
  font-style: normal;
}
.warning {
  color: #c49280;
  font-size: 0.68rem;
}
footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
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
  opacity: 0.45;
  cursor: not-allowed;
}
@media (max-width: 560px) {
  .filters {
    grid-template-columns: 1fr;
  }
}
</style>
