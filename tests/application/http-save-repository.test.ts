// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  HttpSaveRepository,
  readDesktopRuntime,
} from "../../src/infrastructure/persistence/http-save-repository";
import { asBrandedId } from "../../src/domain/shared/ids";
import type { GameState } from "../../src/domain/game-state";

afterEach(() => {
  vi.unstubAllGlobals();
  delete window.__AZEROTH_DESKTOP__;
});

describe("HttpSaveRepository", () => {
  it("reads the injected desktop token and authenticates loopback requests", async () => {
    window.__AZEROTH_DESKTOP__ = { token: "launch-secret" };
    const state = { slotId: "primary", revision: 4 } as unknown as GameState;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(state), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const runtime = readDesktopRuntime();
    expect(runtime).toEqual({ token: "launch-secret" });
    await expect(
      new HttpSaveRepository(runtime!).load(asBrandedId<"SaveSlotId">("primary")),
    ).resolves.toEqual(state);
    expect(fetchMock).toHaveBeenCalledWith("/api/save/primary", {
      headers: { "X-Azeroth-Token": "launch-secret" },
    });
  });

  it("maps revision conflicts to the save repository contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ actualRevision: 8 }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const repository = new HttpSaveRepository({ token: "secret" });
    const state = { slotId: "primary", revision: 7 } as unknown as GameState;

    await expect(repository.save(state, 7)).resolves.toEqual({
      status: "conflict",
      expectedRevision: 7,
      actualRevision: 8,
    });
  });
});
