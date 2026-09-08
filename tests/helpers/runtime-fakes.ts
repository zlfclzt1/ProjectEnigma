import type { Clock, Timestamp } from "../../src/application/ports/clock";
import type { IdGenerator, IdGeneratorState } from "../../src/application/ports/id-generator";
import type { RandomSource, RandomState } from "../../src/application/ports/random-source";

export class FakeClock implements Clock {
  constructor(private current: Timestamp) {}

  now(): Timestamp {
    return this.current;
  }

  set(timestamp: Timestamp): void {
    this.current = timestamp;
  }

  advance(milliseconds: number): void {
    this.current += milliseconds;
  }
}

export class FixedRandomSource implements RandomSource {
  #counter = 0;

  constructor(private readonly values: readonly number[]) {
    if (values.some((value) => value < 0 || value >= 1)) {
      throw new Error("固定随机值必须位于 [0, 1) 区间。");
    }
  }

  next(): number {
    const value = this.values[this.#counter];
    if (value === undefined) throw new Error("固定随机序列已用尽。");
    this.#counter += 1;
    return value;
  }

  snapshot(): RandomState {
    return { seed: "fixed-test-sequence", counter: this.#counter };
  }
}

export class SequentialIdGenerator implements IdGenerator {
  #counter: number;

  constructor(initialCounter = 0) {
    this.#counter = initialCounter;
  }

  next(prefix: string): string {
    this.#counter += 1;
    return `${prefix}_${this.#counter}`;
  }

  snapshot(): IdGeneratorState {
    return { counter: this.#counter };
  }
}
