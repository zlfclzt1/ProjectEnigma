import { createPinia } from "pinia";
import { createApp } from "vue";
import App from "./app/App.vue";
import { loadOrCreateV2Client } from "./app/client-bootstrap";
import { router } from "./app/router";
import { loadBrowserContentRegistry } from "./content/manifest";
import { IndexedDbSaveRepository } from "./infrastructure/persistence/indexeddb-save-repository";
import { BrowserClock } from "./infrastructure/time/browser-clock";
import { inspectLegacyV1Save } from "./infrastructure/persistence/legacy-v1-save";

const saves = new IndexedDbSaveRepository();
const content = loadBrowserContentRegistry();
const clock = new BrowserClock();
const legacySaveNotice = inspectLegacyV1Save(window.localStorage);

createApp(App, {
  bootstrap: () => loadOrCreateV2Client({ saves, content, clock }),
  legacySaveNotice: legacySaveNotice.message ?? null,
})
  .use(createPinia())
  .use(router)
  .mount("#app");
