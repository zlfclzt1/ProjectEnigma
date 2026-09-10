<script setup lang="ts">
import { nextTick, ref, watch } from "vue";

const props = defineProps<{ open: boolean; defaultName: string; pending: boolean }>();
const emit = defineEmits<{ confirm: [name: string]; close: [] }>();
const name = ref("");
const input = ref<HTMLInputElement | null>(null);

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    name.value = props.defaultName;
    await nextTick();
    input.value?.select();
  },
);
</script>

<template>
  <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
    <form
      class="modal name-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="roster-preset-name-title"
      @submit.prevent="emit('confirm', name)"
    >
      <h3 id="roster-preset-name-title">保存当前阵容</h3>
      <p>使用默认名称，或输入一个容易辨认的队伍名称。</p>
      <label>
        <span>队伍名称</span>
        <input ref="input" v-model="name" maxlength="30" />
      </label>
      <footer>
        <button type="button" class="quiet" :disabled="pending" @click="emit('close')">取消</button>
        <button type="submit" :disabled="pending || !name.trim()">
          {{ pending ? "保存中……" : "保存" }}
        </button>
      </footer>
    </form>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  z-index: 50;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgb(0 0 0 / 72%);
}
.modal {
  width: min(420px, 100%);
  padding: 20px;
  border: 1px solid #5c503d;
  border-radius: 9px;
  background: #131516;
  box-shadow: 0 20px 60px #000;
}
h3 {
  margin: 0;
  color: #e0cda7;
}
p {
  margin: 6px 0 16px;
  color: #8e8576;
  font-size: 0.72rem;
}
label {
  display: grid;
  gap: 6px;
  color: #a99c87;
  font-size: 0.7rem;
}
input {
  padding: 10px;
  border: 1px solid #514a3d;
  border-radius: 6px;
  color: #e5d9c2;
  background: #090c0e;
}
footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
}
button {
  padding: 8px 13px;
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
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
