import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LocalIdGenerator } from "../../src/infrastructure/ids/local-id-generator";
import { SeededRandomSource } from "../../src/infrastructure/random/seeded-random-source";
import { FakeClock, FixedRandomSource, SequentialIdGenerator } from "../helpers/runtime-fakes";

describe("deterministic runtime ports", () => {
  it("replays a random stream from its saved state", () => {
    const original = new SeededRandomSource("guild-save");
    const first = original.next("recruit");
    const checkpoint = original.snapshot();
    const expectedNext = original.next("loot");

    const restored = new SeededRandomSource(checkpoint);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(1);
    expect(restored.next("loot")).toBe(expectedNext);
    expect(restored.snapshot()).toEqual(original.snapshot());
  });

  it("continues local identifiers from a saved counter", () => {
    const ids = new LocalIdGenerator({ counter: 41 });
    expect(ids.next("member")).toBe("member_42");
    expect(ids.snapshot()).toEqual({ counter: 42 });
    expect(() => ids.next("Invalid Prefix")).toThrow(/无效的 ID 前缀/);
  });

  it("provides controllable test doubles", () => {
    const clock = new FakeClock(1_000);
    clock.advance(250);
    expect(clock.now()).toBe(1_250);
    clock.set(2_000);
    expect(clock.now()).toBe(2_000);

    const random = new FixedRandomSource([0.1, 0.9]);
    expect(random.next()).toBe(0.1);
    expect(random.next()).toBe(0.9);
    expect(() => random.next()).toThrow(/序列已用尽/);

    const ids = new SequentialIdGenerator();
    expect(ids.next("loot")).toBe("loot_1");
    expect(ids.next("member")).toBe("member_2");
  });
});

describe("domain runtime boundary", () => {
  it("keeps system time, randomness and browser APIs outside the domain", () => {
    const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
    const domainRoot = path.join(projectRoot, "src/domain");
    const forbidden = [
      ["Date.now", /\bDate\.now\s*\(/],
      ["Math.random", /\bMath\.random\s*\(/],
      ["window", /\bwindow\b/],
      ["document", /\bdocument\b/],
      ["localStorage", /\blocalStorage\b/],
      ["indexedDB", /\bindexedDB\b/],
    ] as const;

    const files = fs
      .readdirSync(domainRoot, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
      .map((entry) => path.join(entry.parentPath, entry.name));

    for (const file of files) {
      const source = fs.readFileSync(file, "utf8");
      for (const [name, pattern] of forbidden) {
        expect(source, `${path.relative(projectRoot, file)} must not use ${name}`).not.toMatch(
          pattern,
        );
      }
    }
  });
});
