<script setup lang="ts">
import { computed, ref } from "vue";
import { MAX_GUILD_NAME_LENGTH } from "../../domain/guild/new-game";

defineProps<{ error: string | null; legacySaveNotice?: string | null }>();

const emit = defineEmits<{ create: [guildName: string] }>();
const guildName = ref("");
const characterCount = computed(() => [...guildName.value].length);

function submit(): void {
  if (!guildName.value.trim() || characterCount.value > MAX_GUILD_NAME_LENGTH) return;
  emit("create", guildName.value);
}
</script>

<template>
  <main class="founding-page">
    <section class="founding-card">
      <span class="seal" aria-hidden="true">羽</span>
      <p class="eyebrow">艾泽拉斯公会志</p>
      <h1>建立你的公会</h1>
      <p class="intro">从一支五人小队开始，书写属于你的公会远征史。</p>
      <p v-if="legacySaveNotice" class="legacy-notice">
        {{ legacySaveNotice }}旧存档仍保留在浏览器中。
      </p>
      <form @submit.prevent="submit">
        <label for="guild-name">公会名称</label>
        <input
          id="guild-name"
          v-model="guildName"
          name="guildName"
          type="text"
          autocomplete="off"
          autofocus
          :maxlength="MAX_GUILD_NAME_LENGTH"
          placeholder="为你的公会命名"
        />
        <div class="field-meta">
          <span v-if="error" class="error" role="alert">{{ error }}</span>
          <span v-else>名称将记录在公会编年史中。</span>
          <span>{{ characterCount }} / {{ MAX_GUILD_NAME_LENGTH }}</span>
        </div>
        <button type="submit" :disabled="!guildName.trim()">开始远征</button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.founding-page {
  display: grid;
  min-width: 320px;
  min-height: 100vh;
  padding: 28px;
  place-items: center;
  color: #eadbbd;
  background:
    radial-gradient(circle at 50% 18%, #52351955, transparent 38%),
    linear-gradient(145deg, #090b0d, #14100c 55%, #090b0d);
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}
.founding-card {
  width: min(520px, 100%);
  padding: 48px;
  border: 1px solid #72592f;
  border-radius: 14px;
  background: linear-gradient(145deg, #201b15, #101315);
  box-shadow: 0 28px 90px #000a;
  text-align: center;
}
.seal {
  display: grid;
  width: 64px;
  height: 64px;
  margin: 0 auto 24px;
  place-items: center;
  border: 1px solid #c2923f;
  border-radius: 50%;
  color: #f0c969;
  background: #16130f;
  box-shadow: 0 0 28px #bc7e2733;
  font-family: Georgia, serif;
  font-size: 1.65rem;
}
.eyebrow {
  margin: 0 0 10px;
  color: #c8a45f;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
}
h1 {
  margin: 0;
  color: #f0dfbb;
  font-family: Georgia, "Songti SC", serif;
  font-size: clamp(2rem, 7vw, 3rem);
  font-weight: 500;
}
.intro {
  margin: 16px auto 34px;
  color: #b8ab94;
  line-height: 1.7;
}
.legacy-notice {
  margin: -16px auto 28px;
  padding: 12px 14px;
  border: 1px solid #665537;
  border-radius: 7px;
  color: #c3b496;
  background: #11100dcc;
  font-size: 0.78rem;
  line-height: 1.6;
  text-align: left;
}
form,
label {
  display: grid;
}
form {
  gap: 10px;
  text-align: left;
}
label {
  color: #d5c19b;
  font-size: 0.82rem;
}
input {
  width: 100%;
  padding: 14px 15px;
  border: 1px solid #5e5038;
  border-radius: 7px;
  outline: none;
  color: #f1e2c5;
  background: #0b0d0f;
  font: inherit;
}
input:focus {
  border-color: #b98a3c;
  box-shadow: 0 0 0 3px #b98a3c22;
}
.field-meta {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  min-height: 1.4em;
  color: #877c6a;
  font-size: 0.7rem;
}
.error {
  color: #e3aaa1;
}
button {
  margin-top: 12px;
  padding: 13px 20px;
  border: 1px solid #c79b4b;
  border-radius: 7px;
  color: #1a140a;
  background: linear-gradient(#e1b75e, #b98532);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
button:disabled {
  cursor: not-allowed;
  filter: grayscale(0.65);
  opacity: 0.55;
}
@media (max-width: 560px) {
  .founding-page {
    padding: 16px;
  }
  .founding-card {
    padding: 34px 22px;
  }
}
</style>
