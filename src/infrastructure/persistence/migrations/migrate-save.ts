import type { ContentRegistry } from "../../../content/registry";
import type { GameState, PersistedGameState } from "../../../domain/game-state";
import { migrateV2ToV3 } from "./migrate-v2-to-v3";
import { migrateV3ToV4 } from "./migrate-v3-to-v4";
import { migrateV4ToV5 } from "./migrate-v4-to-v5";
import { migrateV5ToV6 } from "./migrate-v5-to-v6";

export interface SaveMigrationResult {
  readonly state: GameState;
  readonly migrated: boolean;
}

export function migrateSave(
  persisted: PersistedGameState,
  content: ContentRegistry,
): SaveMigrationResult {
  if (persisted.saveVersion === 6) {
    return { state: structuredClone(persisted), migrated: false };
  }
  if (persisted.saveVersion === 5) {
    return { state: migrateV5ToV6(persisted), migrated: true };
  }
  if (persisted.saveVersion === 4) {
    return { state: migrateV5ToV6(migrateV4ToV5(persisted, content)), migrated: true };
  }
  if (persisted.saveVersion === 3) {
    return {
      state: migrateV5ToV6(migrateV4ToV5(migrateV3ToV4(persisted), content)),
      migrated: true,
    };
  }
  if (persisted.saveVersion === 2) {
    return {
      state: migrateV5ToV6(
        migrateV4ToV5(migrateV3ToV4(migrateV2ToV3(persisted, content)), content),
      ),
      migrated: true,
    };
  }
  const unsupported: never = persisted;
  throw new Error(
    `不支持的存档版本：${String((unsupported as { saveVersion?: unknown }).saveVersion)}`,
  );
}
