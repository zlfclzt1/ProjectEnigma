<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { RouterView } from "vue-router";
import type { V2ClientBootstrapResult } from "./client-bootstrap";
import { useGameStore } from "../stores/game-store";
import CreateGuildPage from "../ui/pages/CreateGuildPage.vue";

const props = defineProps<{
  bootstrap: () => Promise<V2ClientBootstrapResult | null>;
  createNewGame: (guildName: string) => Promise<V2ClientBootstrapResult>;
  legacySaveNotice?: string | null;
}>();

const game = useGameStore();
let timer: number | undefined;

async function startTimer(): Promise<void> {
  if (timer !== undefined) return;
  await game.tick();
  timer = window.setInterval(() => void game.tick(), 1_000);
}

async function createGuild(guildName: string): Promise<void> {
  if (await game.createNewGame(() => props.createNewGame(guildName))) await startTimer();
}

onMounted(async () => {
  if (await game.initialize(props.bootstrap)) await startTimer();
});

onUnmounted(() => {
  if (timer !== undefined) window.clearInterval(timer);
});
</script>

<template>
  <CreateGuildPage
    v-if="game.status === 'needs-setup'"
    :error="game.error?.message ?? null"
    :legacy-save-notice="props.legacySaveNotice ?? null"
    @create="createGuild"
  />
  <RouterView v-slot="{ Component }">
    <component
      v-if="game.status !== 'needs-setup'"
      :is="Component"
      :diagnostics="game.diagnostics"
      :error="game.error?.message ?? null"
      :loading="game.status === 'idle' || game.status === 'loading'"
      :legacy-save-notice="props.legacySaveNotice ?? null"
    />
  </RouterView>
</template>
