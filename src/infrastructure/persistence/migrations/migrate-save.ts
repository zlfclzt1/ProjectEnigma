import type { ContentRegistry } from "../../../content/registry";
import type { GameState, PersistedGameState } from "../../../domain/game-state";
import { migrateV2ToV3 } from "./migrate-v2-to-v3";

export interface SaveMigrationResult {
  readonly state: GameState;
  readonly migrated: boolean;
}

export function migrateSave(
  persisted: PersistedGameState,
  content: ContentRegistry,
): SaveMigrationResult {
  if (persisted.saveVersion === 3) {
    return { state: structuredClone(persisted), migrated: false };
  }
  if (persisted.saveVersion === 2) {
    return { state: migrateV2ToV3(persisted, content), migrated: true };
  }
  const unsupported: never = persisted;
  throw new Error(
    `不支持的存档版本：${String((unsupported as { saveVersion?: unknown }).saveVersion)}`,
  );
}
