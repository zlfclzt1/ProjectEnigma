import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CLASS_DEFINITIONS,
  EQUIPMENT_SLOT_IDS,
  LOG_TEMPLATES,
  NAME_PARTS,
  PERSONALITIES,
  ROLE_LABELS,
  loadContent,
} from "../../src/content.js";
import {
  adaptLegacyContent,
  loadBrowserLegacyContent,
  type LegacyContent,
} from "../../src/content/legacy-content-adapter";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { GuildGame } from "../../src/game.js";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));

async function loadOldContent() {
  const fixtures = new Map<string, unknown>();
  for (const directory of ["data/dungeons", "data/loot"]) {
    for (const name of fs.readdirSync(path.join(projectRoot, directory))) {
      if (!name.endsWith(".json")) continue;
      fixtures.set(
        `./${directory}/${name}`,
        JSON.parse(fs.readFileSync(path.join(projectRoot, directory, name), "utf8")),
      );
    }
  }
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const fixture = fixtures.get(String(url));
    if (!fixture) throw new Error(`Missing old content fixture: ${String(url)}`);
    return { json: async () => structuredClone(fixture) } as Response;
  };
  try {
    return await loadContent();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function sortedItems(items: readonly { id: string | number }[]) {
  return [...items].sort((left, right) => String(left.id).localeCompare(String(right.id)));
}

function normalizedLootPools(pools: Map<string, { id: string; items: unknown[] }>) {
  return [...pools.values()]
    .map((pool) => ({
      ...pool,
      items: pool.items.map((entry) => {
        const semanticEntry = { ...(entry as Record<string, unknown>) };
        delete semanticEntry.name;
        return semanticEntry;
      }),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

class MemoryStorage {
  readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("legacy content adapter", () => {
  it("reconstructs every legacy definition from the validated registry", async () => {
    const adapted = adaptLegacyContent(loadBrowserContentRegistry());
    const old = await loadOldContent();

    expect(adapted.roleLabels).toEqual(ROLE_LABELS);
    expect(adapted.classes).toEqual(CLASS_DEFINITIONS);
    expect(adapted.personalities).toEqual(PERSONALITIES);
    expect(adapted.nameParts).toEqual(NAME_PARTS);
    expect(adapted.logTemplates).toEqual(LOG_TEMPLATES);
    expect(adapted.equipmentSlotIds).toEqual(EQUIPMENT_SLOT_IDS);
    expect(adapted.dungeons).toEqual(old.dungeons);
    expect(adapted.dungeon).toEqual(old.dungeon);
    expect(sortedItems(adapted.items)).toEqual(sortedItems(old.items));
    expect(normalizedLootPools(adapted.lootPools)).toEqual(normalizedLootPools(old.lootPools));
    expect(adapted.hiddenCharacters).toEqual([
      {
        id: "fairbanks",
        legacyId: "费厄泼赖",
        name: "费厄泼赖",
        classId: "warlock",
        specId: "warlock_affliction",
        personalityId: "clever",
        appearance: { chance: 0.01, uniquePerSave: true },
      },
    ]);
  });

  it("lets the legacy game consume injected member and log definitions", () => {
    const base = loadBrowserLegacyContent();
    const content: LegacyContent = {
      ...base,
      classes: base.classes.map((entry) => ({ ...entry, name: `注册表·${entry.name}` })),
      personalities: base.personalities.map((entry) => ({
        ...entry,
        name: `注册表·${entry.name}`,
      })),
      nameParts: { first: ["注册表"], second: ["成员"] },
      hiddenCharacters: [],
      logTemplates: { ...base.logTemplates, start: ["注册表提供的出发日志。"] },
    };
    const game = new GuildGame(content, new MemoryStorage(), 1_000_000);

    expect(
      game.state.members.every((member: { className: string }) =>
        member.className.startsWith("注册表·"),
      ),
    ).toBe(true);
    expect(
      game.state.candidates.every((member: { name: string }) =>
        member.name.startsWith("注册表·成员"),
      ),
    ).toBe(true);
    expect(
      game.state.members.every((member: { personalityName: string }) =>
        member.personalityName.startsWith("注册表·"),
      ),
    ).toBe(true);

    const expedition = game.startExpedition(
      game.state.members.map((member: { id: string }) => member.id),
      1,
      1_000_001,
    );
    const startLog = (expedition as unknown as { logs: Array<{ text: string }> }).logs[0];
    expect(startLog.text).toBe("注册表提供的出发日志。");
  });
});
