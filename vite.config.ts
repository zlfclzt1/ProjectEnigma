import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [vue()],
  server: {
    port: 4173,
  },
  preview: {
    port: 4173,
  },
});
