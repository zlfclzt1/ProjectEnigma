<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { RouterView } from "vue-router";
import type { V2ClientBootstrapResult } from "./client-bootstrap";
import { useGameStore } from "../stores/game-store";

const props = defineProps<{
  bootstrap: () => Promise<V2ClientBootstrapResult>;
  legacySaveNotice?: string | null;
}>();

const game = useGameStore();
let timer: number | undefined;

onMounted(async () => {
  if (!(await game.initialize(props.bootstrap))) return;
  await game.tick();
  timer = window.setInterval(() => void game.tick(), 1_000);
});

onUnmounted(() => {
  if (timer !== undefined) window.clearInterval(timer);
});
</script>

<template>
  <RouterView v-slot="{ Component }">
    <component
      :is="Component"
      :diagnostics="game.diagnostics"
      :error="game.error?.message ?? null"
      :loading="game.status === 'idle' || game.status === 'loading'"
      :legacy-save-notice="props.legacySaveNotice ?? null"
    />
  </RouterView>
</template>
