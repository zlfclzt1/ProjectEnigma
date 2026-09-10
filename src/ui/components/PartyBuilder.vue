<script setup lang="ts">
import { computed } from "vue";
import type { PartyMemberOptionView } from "../../application/queries/get-dungeons-view";
import type { ClassId, MemberId } from "../../domain/shared/ids";
import type { MemberRole } from "../../application/queries/get-members-view";
import MemberFilterBar from "./MemberFilterBar.vue";
import { sortMembers, type MemberSortKey } from "../member-list-sorting";

const props = defineProps<{
  members: readonly PartyMemberOptionView[];
  selectedMemberIds: readonly MemberId[];
  maximumMembers: number;
  classId: ClassId | null;
  role: MemberRole | null;
  sortBy: MemberSortKey;
  classOptions: readonly { readonly id: ClassId; readonly name: string }[];
  roleOptions: readonly { readonly id: MemberRole; readonly name: string }[];
}>();

const emit = defineEmits<{
  toggle: [memberId: MemberId];
  "update:classId": [classId: ClassId | null];
  "update:role": [role: MemberRole | null];
  "update:sortBy": [sortBy: MemberSortKey];
}>();

const filteredMembers = computed(() =>
  sortMembers(
    props.members.filter(
      (member) =>
        (!props.classId || member.classId === props.classId) &&
        (!props.role || member.role === props.role),
    ),
    props.sortBy,
  ),
);

function selected(memberId: MemberId): boolean {
  return props.selectedMemberIds.includes(memberId);
}

function disabled(member: PartyMemberOptionView): boolean {
  return (
    member.active ||
    (!selected(member.id) && props.selectedMemberIds.length >= props.maximumMembers)
  );
}
</script>

<template>
  <section class="party-builder panel">
    <header>
      <div>
        <h3>组织阵容</h3>
        <p>同一成员同时只能参加一支队伍。</p>
      </div>
      <strong>{{ selectedMemberIds.length }} / {{ maximumMembers }} 人</strong>
    </header>
    <MemberFilterBar
      :class-id="classId"
      :role="role"
      :sort-by="sortBy"
      :class-options="classOptions"
      :role-options="roleOptions"
      @update:class-id="emit('update:classId', $event)"
      @update:role="emit('update:role', $event)"
      @update:sort-by="emit('update:sortBy', $event)"
    />
    <div class="member-options">
      <label
        v-for="member in filteredMembers"
        :key="member.id"
        :class="{ selected: selected(member.id), unavailable: member.active }"
      >
        <input
          type="checkbox"
          :checked="selected(member.id)"
          :disabled="disabled(member)"
          @change="$emit('toggle', member.id)"
        />
        <span class="role" :data-role="member.role">{{ member.roleName }}</span>
        <span class="member-copy">
          <strong>{{ member.name }}</strong>
          <small>{{ member.className }} · {{ member.specName }}</small>
        </span>
        <span class="power"
          >LV {{ member.level }}<small>装等 {{ member.itemLevel.toFixed(1) }}</small></span
        >
        <em v-if="member.active">活动中</em>
      </label>
    </div>
    <p v-if="filteredMembers.length === 0" class="empty">没有符合筛选条件的成员。</p>
  </section>
</template>

<style scoped>
.panel {
  padding: 16px;
  border: 1px solid #37332c;
  border-radius: 8px;
  background: #111416;
}
header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
h3,
p {
  margin: 0;
}
h3 {
  color: #ddcaa6;
}
header p {
  margin-top: 3px;
  color: #81796c;
  font-size: 0.7rem;
}
header > strong {
  color: #e8c367;
}
.member-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
  gap: 7px;
  margin-top: 12px;
}
.member-options > label {
  position: relative;
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  padding: 10px;
  border: 1px solid #302e29;
  border-radius: 6px;
  background: #0b0e10;
  cursor: pointer;
}
.member-options > label.selected {
  border-color: #a27c3c;
  background: #211d16;
}
.member-options > label.unavailable {
  cursor: not-allowed;
  opacity: 0.45;
}
input {
  accent-color: #c89543;
}
.role {
  padding: 4px 6px;
  border-radius: 4px;
  color: #deb08d;
  background: #48271f;
  font-size: 0.58rem;
}
.role[data-role="tank"] {
  color: #9bc9ef;
  background: #1d3548;
}
.role[data-role="healer"] {
  color: #9bd6a0;
  background: #1e3a25;
}
.member-copy,
.power {
  display: grid;
  min-width: 0;
}
.member-copy strong {
  overflow: hidden;
  color: #ded1b8;
  font-size: 0.76rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.member-copy small,
.power small {
  color: #7f776b;
  font-size: 0.6rem;
}
.power {
  color: #d8b25a;
  font-size: 0.7rem;
  text-align: right;
}
em {
  position: absolute;
  top: 4px;
  right: 5px;
  color: #72a7d0;
  font-size: 0.55rem;
  font-style: normal;
}
.empty {
  padding: 20px;
  color: #8b8273;
  text-align: center;
}
</style>
