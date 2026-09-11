<script setup lang="ts">
import { RouterView } from "vue-router";
import type { V2ClientDiagnostics } from "../../stores/game-store";
import GameNavigation from "../components/GameNavigation.vue";

defineProps<{
  diagnostics: V2ClientDiagnostics | null;
  error: string | null;
  loading: boolean;
  legacySaveNotice?: string | null;
}>();
</script>

<template>
  <main class="v2-shell">
    <span class="version-mark" aria-label="版本 V2">V2</span>
    <header class="masthead">
      <div v-if="diagnostics" class="guild-meta">
        <strong>{{ diagnostics.guildName }}</strong>
        <span>{{ diagnostics.funds }} G · {{ diagnostics.memberCount }} 名成员</span>
      </div>
    </header>

    <GameNavigation v-if="diagnostics" />

    <section v-if="legacySaveNotice" class="legacy-notice" role="status">
      <strong>新版公会账本</strong>
      <span>{{ legacySaveNotice }}旧存档仍保留在浏览器中，不会被删除。</span>
    </section>

    <section v-if="loading" class="status-card" aria-live="polite">
      <span class="rune">羽</span>
      <div>
        <h2>正在翻阅公会账本</h2>
        <p>加载存档与内容注册表……</p>
      </div>
    </section>

    <section v-else-if="error && !diagnostics" class="status-card error" role="alert">
      <span class="rune">!</span>
      <div>
        <h2>账本被地精锁住了</h2>
        <p>{{ error }}</p>
      </div>
    </section>

    <template v-else-if="diagnostics">
      <div v-if="error" class="command-error" role="alert">{{ error }}</div>
      <RouterView />
    </template>
  </main>
</template>

<style scoped>
:global(*) {
  box-sizing: border-box;
}
:global(body) {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  color: #eadbbd;
  background: #090b0d;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}
.v2-shell {
  width: min(960px, calc(100% - 32px));
  margin: 0 auto;
  padding: 64px 0;
}
.version-mark {
  position: fixed;
  right: 10px;
  bottom: 8px;
  z-index: 10;
  color: #9d927f;
  font-size: 0.625rem;
  letter-spacing: 0.08em;
  opacity: 0.35;
  pointer-events: none;
  user-select: none;
}
.masthead {
  display: flex;
  align-items: end;
  justify-content: flex-end;
  gap: 20px;
  padding-bottom: 18px;
  margin-bottom: 32px;
  border-bottom: 1px solid #52452f;
}
.guild-meta {
  display: grid;
  gap: 4px;
  text-align: right;
}
.guild-meta strong {
  color: #e7d8ba;
}
.guild-meta span {
  color: #9d927f;
  font-size: 0.8rem;
}
.status-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 22px;
  border: 1px solid #564829;
  border-radius: 10px;
  background: linear-gradient(135deg, #1c1b18, #101315);
  box-shadow: 0 18px 60px #0008;
}
.status-card h2,
.status-card p {
  margin: 0;
}
.status-card p {
  margin-top: 5px;
  color: #bcb09a;
}
.status-card.error {
  border-color: #8c3f36;
}
.rune {
  display: grid;
  flex: 0 0 48px;
  height: 48px;
  place-items: center;
  border: 1px solid #a67d39;
  border-radius: 50%;
  color: #f2cc72;
  font-family: Georgia, serif;
  font-size: 1.5rem;
}
.command-error {
  margin-bottom: 18px;
  padding: 12px 14px;
  border: 1px solid #8c3f36;
  border-radius: 7px;
  color: #e3aaa1;
  background: #251311;
}
.legacy-notice {
  display: grid;
  gap: 3px;
  margin-bottom: 18px;
  padding: 12px 14px;
  border: 1px solid #80622f;
  border-radius: 7px;
  color: #c3b497;
  background: #211b12;
  font-size: 0.74rem;
}
.legacy-notice strong {
  color: #e6bd63;
}
@media (max-width: 620px) {
  .v2-shell {
    padding-top: 28px;
  }
  .masthead {
    align-items: start;
    flex-direction: column;
  }
  .guild-meta {
    text-align: left;
  }
}
</style>
