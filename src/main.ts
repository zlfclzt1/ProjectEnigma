import { createPinia } from "pinia";
import { createApp } from "vue";
import App from "./app/App.vue";
import { createV2Client, loadExistingV2Client } from "./app/client-bootstrap";
import { router } from "./app/router";
import { loadBrowserContentRegistry } from "./content/manifest";
import { IndexedDbSaveRepository } from "./infrastructure/persistence/indexeddb-save-repository";
import { BrowserClock } from "./infrastructure/time/browser-clock";
import { inspectLegacyV1Save } from "./infrastructure/persistence/legacy-v1-save";
import {
  HttpSaveRepository,
  readDesktopRuntime,
} from "./infrastructure/persistence/http-save-repository";

const desktopRuntime = readDesktopRuntime();
const saves = desktopRuntime
  ? new HttpSaveRepository(desktopRuntime)
  : new IndexedDbSaveRepository();
const content = loadBrowserContentRegistry();
const clock = new BrowserClock();
const legacySaveNotice = inspectLegacyV1Save(window.localStorage);

createApp(App, {
  bootstrap: () => loadExistingV2Client({ saves, content, clock }),
  createNewGame: (guildName: string) => createV2Client({ saves, content, clock }, guildName),
  legacySaveNotice: desktopRuntime ? null : (legacySaveNotice.message ?? null),
})
  .use(createPinia())
  .use(router)
  .mount("#app");
