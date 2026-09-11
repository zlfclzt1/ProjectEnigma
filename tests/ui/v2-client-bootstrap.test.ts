import { describe, expect, it } from "vitest";
import {
  createV2Client,
  loadExistingV2Client,
  loadOrCreateV2Client,
} from "../../src/app/client-bootstrap";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { asBrandedId } from "../../src/domain/shared/ids";
import { MemorySaveRepository } from "../../src/infrastructure/persistence/memory-save-repository";
import { FakeClock } from "../helpers/runtime-fakes";

describe("V2 client bootstrap", () => {
  it("creates the primary save once and loads it on the next launch", async () => {
    const saves = new MemorySaveRepository();
    const dependencies = {
      saves,
      content: loadBrowserContentRegistry(),
      clock: new FakeClock(1_000),
      slotId: asBrandedId<"SaveSlotId">("ui-test"),
      seed: "ui-bootstrap",
    };

    const created = await loadOrCreateV2Client(dependencies);
    expect(created.origin).toBe("created");
    expect(created.session.snapshot()).toMatchObject({ saveVersion: 14, revision: 0 });
    expect(Object.values(created.session.snapshot().members)).toHaveLength(5);
    expect(Object.values(created.session.snapshot().candidates)).toHaveLength(3);

    const loaded = await loadOrCreateV2Client(dependencies);
    expect(loaded.origin).toBe("loaded");
    expect(loaded.session.snapshot()).toEqual(created.session.snapshot());
  });

  it("keeps first launch empty until the player chooses a guild name", async () => {
    const saves = new MemorySaveRepository();
    const dependencies = {
      saves,
      content: loadBrowserContentRegistry(),
      clock: new FakeClock(1_000),
      slotId: asBrandedId<"SaveSlotId">("named-ui-test"),
      seed: "named-ui-bootstrap",
    };

    await expect(loadExistingV2Client(dependencies)).resolves.toBeNull();
    const created = await createV2Client(dependencies, "  银松议会  ");
    expect(created.session.snapshot().guild.name).toBe("银松议会");
    await expect(loadExistingV2Client(dependencies)).resolves.toMatchObject({ origin: "loaded" });
  });
});
