import type { ContentRegistry } from "../../../content/registry";
import type {
  GameState,
  LegacyGameStateV12,
  LegacyGameStateV13,
  PersistedGameState,
} from "../../../domain/game-state";
import { migrateV2ToV3 } from "./migrate-v2-to-v3";
import { migrateV3ToV4 } from "./migrate-v3-to-v4";
import { migrateV4ToV5 } from "./migrate-v4-to-v5";
import { migrateV5ToV6 } from "./migrate-v5-to-v6";
import { migrateV6ToV7 } from "./migrate-v6-to-v7";
import { migrateV7ToV8 } from "./migrate-v7-to-v8";
import { migrateV8ToV9 } from "./migrate-v8-to-v9";
import { migrateV9ToV10 } from "./migrate-v9-to-v10";
import { migrateV10ToV11 } from "./migrate-v10-to-v11";
import { migrateV11ToV12 } from "./migrate-v11-to-v12";
import { migrateV12ToV13 } from "./migrate-v12-to-v13";
import { migrateV13ToV14 } from "./migrate-v13-to-v14";

export interface SaveMigrationResult {
  readonly state: GameState;
  readonly migrated: boolean;
}

export function migrateSave(
  persisted: PersistedGameState,
  content: ContentRegistry,
): SaveMigrationResult {
  if (persisted.saveVersion === 14) {
    return { state: structuredClone(persisted), migrated: false };
  }
  return { state: migrateV13ToV14(migrateToV13(persisted, content)), migrated: true };
}

function migrateToV13(
  persisted: Exclude<PersistedGameState, GameState>,
  content: ContentRegistry,
): LegacyGameStateV13 {
  if (persisted.saveVersion === 13) return persisted;
  return migrateV12ToV13(migrateToV12(persisted, content), content) as LegacyGameStateV13;
}

function migrateToV12(
  persisted: Exclude<PersistedGameState, GameState | LegacyGameStateV13>,
  content: ContentRegistry,
): LegacyGameStateV12 {
  if (persisted.saveVersion === 12) return persisted;
  if (persisted.saveVersion === 11) return migrateV11ToV12(persisted);
  if (persisted.saveVersion === 10) return migrateToV12(migrateV10ToV11(persisted), content);
  if (persisted.saveVersion === 9) return migrateToV12(migrateV9ToV10(persisted), content);
  if (persisted.saveVersion === 8) return migrateToV12(migrateV8ToV9(persisted), content);
  if (persisted.saveVersion === 7) return migrateToV12(migrateV7ToV8(persisted), content);
  if (persisted.saveVersion === 6) return migrateToV12(migrateV6ToV7(persisted, content), content);
  if (persisted.saveVersion === 5) return migrateToV12(migrateV5ToV6(persisted), content);
  if (persisted.saveVersion === 4) return migrateToV12(migrateV4ToV5(persisted, content), content);
  if (persisted.saveVersion === 3) return migrateToV12(migrateV3ToV4(persisted), content);
  if (persisted.saveVersion === 2) return migrateToV12(migrateV2ToV3(persisted, content), content);
  const unsupported: never = persisted;
  throw new Error(
    `不支持的存档版本：${String((unsupported as { saveVersion?: unknown }).saveVersion)}`,
  );
}
