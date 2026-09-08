import type { RawContentModules } from "./loader";
import { loadContentRegistry, type ContentRegistry } from "./registry";

export const browserContentModules: RawContentModules = import.meta.glob(
  "../../content/**/*.json",
  {
    eager: true,
    import: "default",
  },
);

export function loadBrowserContentRegistry(): ContentRegistry {
  return loadContentRegistry(browserContentModules);
}
