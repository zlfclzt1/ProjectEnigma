<script setup lang="ts">
import type { MemberRole } from "../../application/queries/get-members-view";
import type { ClassId } from "../../domain/shared/ids";

const props = defineProps<{
  classId: ClassId | null;
  role: MemberRole | null;
  classOptions: readonly { readonly id: ClassId; readonly name: string }[];
  roleOptions: readonly { readonly id: MemberRole; readonly name: string }[];
}>();

const emit = defineEmits<{
  "update:classId": [value: ClassId | null];
  "update:role": [value: MemberRole | null];
}>();

function updateClass(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  emit("update:classId", props.classOptions.find((option) => option.id === value)?.id ?? null);
}

function updateRole(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  emit("update:role", props.roleOptions.find((option) => option.id === value)?.id ?? null);
}
</script>

<template>
  <div class="filter-bar">
    <label>
      <span>职业</span>
      <select :value="classId ?? ''" @change="updateClass">
        <option value="">全部职业</option>
        <option v-for="option in classOptions" :key="option.id" :value="option.id">
          {{ option.name }}
        </option>
      </select>
    </label>
    <label>
      <span>定位</span>
      <select :value="role ?? ''" @change="updateRole">
        <option value="">全部定位</option>
        <option v-for="option in roleOptions" :key="option.id" :value="option.id">
          {{ option.name }}
        </option>
      </select>
    </label>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  gap: 10px;
  padding: 12px;
  border: 1px solid #343129;
  border-radius: 8px;
  background: #111416;
}
label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #948a79;
  font-size: 0.78rem;
}
select {
  min-width: 135px;
  padding: 8px 30px 8px 9px;
  border: 1px solid #4a4439;
  border-radius: 6px;
  color: #e2d4b9;
  background: #0b0e10;
}
@media (max-width: 520px) {
  .filter-bar {
    align-items: stretch;
    flex-direction: column;
  }
  label {
    justify-content: space-between;
  }
  select {
    flex: 1;
  }
}
</style>
