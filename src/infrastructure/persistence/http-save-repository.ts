import {
  InvalidInitialRevisionError,
  SaveSlotAlreadyExistsError,
  type SaveRepository,
  type SaveResult,
} from "../../application/ports/save-repository";
import type { GameState, PersistedGameState } from "../../domain/game-state";
import type { SaveSlotId } from "../../domain/shared/ids";

export interface DesktopRuntimeConfig {
  readonly token: string;
}

declare global {
  interface Window {
    __AZEROTH_DESKTOP__?: DesktopRuntimeConfig;
  }
}

export function readDesktopRuntime(): DesktopRuntimeConfig | null {
  const config = window.__AZEROTH_DESKTOP__;
  return config?.token ? config : null;
}

export class HttpSaveRepository implements SaveRepository {
  constructor(private readonly runtime: DesktopRuntimeConfig) {}

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    return fetch(path, {
      ...init,
      headers: {
        "X-Azeroth-Token": this.runtime.token,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  }

  async load(slotId: SaveSlotId): Promise<PersistedGameState | null> {
    const response = await this.request(`/api/save/${encodeURIComponent(slotId)}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`无法读取桌面存档（${response.status}）。`);
    return (await response.json()) as PersistedGameState;
  }

  async create(initialState: GameState): Promise<void> {
    if (initialState.revision !== 0) throw new InvalidInitialRevisionError(initialState.revision);
    const response = await this.request(`/api/save/${encodeURIComponent(initialState.slotId)}`, {
      method: "POST",
      body: JSON.stringify(initialState),
    });
    if (response.status === 409) throw new SaveSlotAlreadyExistsError(initialState.slotId);
    if (!response.ok) throw new Error(`无法创建桌面存档（${response.status}）。`);
  }

  async save(state: GameState, expectedRevision: number): Promise<SaveResult> {
    const response = await this.request(
      `/api/save/${encodeURIComponent(state.slotId)}?expectedRevision=${expectedRevision}`,
      { method: "PUT", body: JSON.stringify(state) },
    );
    if (response.status === 404) return { status: "not-found", expectedRevision };
    if (response.status === 409) {
      const payload = (await response.json()) as { actualRevision: number };
      return { status: "conflict", expectedRevision, actualRevision: payload.actualRevision };
    }
    if (!response.ok) throw new Error(`无法写入桌面存档（${response.status}）。`);
    return { status: "saved", state: (await response.json()) as GameState };
  }
}
