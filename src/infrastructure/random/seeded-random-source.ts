import type { RandomSource, RandomState } from "../../application/ports/random-source";

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seed: string): number {
  let value = hashString(seed);
  value += 0x6d2b79f5;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

export class SeededRandomSource implements RandomSource {
  readonly #seed: string;
  #counter: number;

  constructor(seedOrState: string | RandomState) {
    const state = typeof seedOrState === "string" ? { seed: seedOrState, counter: 0 } : seedOrState;
    if (!state.seed) throw new Error("随机种子不能为空。");
    if (!Number.isSafeInteger(state.counter) || state.counter < 0) {
      throw new Error("随机计数器必须是非负安全整数。");
    }
    this.#seed = state.seed;
    this.#counter = state.counter;
  }

  next(tag = "random"): number {
    this.#counter += 1;
    return seededUnit(`${this.#seed}:${tag}:${this.#counter}`);
  }

  snapshot(): RandomState {
    return { seed: this.#seed, counter: this.#counter };
  }
}
