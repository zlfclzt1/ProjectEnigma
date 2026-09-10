import { createNewGameSession } from "../application/commands/create-new-game";
import type { Clock } from "../application/ports/clock";
import type { SaveRepository } from "../application/ports/save-repository";
import { GameSession } from "../application/services/game-session";
import type { ContentRegistry } from "../content/registry";
import { LocalIdGenerator } from "../infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../infrastructure/random/seeded-random-source";
import { asBrandedId, type ContentVersion, type SaveSlotId } from "../domain/shared/ids";
import { migrateSave } from "../infrastructure/persistence/migrations/migrate-save";

export interface V2ClientBootstrapDependencies {
  readonly saves: SaveRepository;
  readonly content: ContentRegistry;
  readonly clock: Clock;
  readonly slotId?: SaveSlotId;
  readonly contentVersion?: ContentVersion;
  readonly seed?: string;
}

export type V2ClientOrigin = "created" | "loaded";

export interface V2ClientBootstrapResult {
  readonly session: GameSession;
  readonly origin: V2ClientOrigin;
  readonly content: ContentRegistry;
  readonly clock: Clock;
}

const DEFAULT_SLOT_ID = asBrandedId<"SaveSlotId">("primary");
const DEFAULT_CONTENT_VERSION = asBrandedId<"ContentVersion">("classic-v1");

export async function loadOrCreateV2Client(
  dependencies: V2ClientBootstrapDependencies,
): Promise<V2ClientBootstrapResult> {
  const slotId = dependencies.slotId ?? DEFAULT_SLOT_ID;
  const persisted = await dependencies.saves.load(slotId);
  if (persisted) {
    const migration = migrateSave(persisted, dependencies.content);
    let state = migration.state;
    if (migration.migrated) {
      const saved = await dependencies.saves.save(state, persisted.revision);
      if (saved.status === "conflict") {
        throw new Error("存档迁移时检测到其他会话更新，请刷新页面重试。");
      }
      if (saved.status === "not-found") throw new Error("存档迁移时原存档已不存在。");
      state = saved.state;
    }
    return {
      session: GameSession.fromState(dependencies.saves, state),
      origin: "loaded",
      content: dependencies.content,
      clock: dependencies.clock,
    };
  }

  const session = await createNewGameSession({
    saves: dependencies.saves,
    slotId,
    content: dependencies.content,
    contentVersion: dependencies.contentVersion ?? DEFAULT_CONTENT_VERSION,
    clock: dependencies.clock,
    ids: new LocalIdGenerator(),
    random: new SeededRandomSource(
      dependencies.seed ?? `browser-new-game:${slotId}:${dependencies.clock.now()}`,
    ),
  });
  return {
    session,
    origin: "created",
    content: dependencies.content,
    clock: dependencies.clock,
  };
}
