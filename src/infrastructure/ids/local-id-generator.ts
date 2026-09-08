import type { IdGenerator, IdGeneratorState } from "../../application/ports/id-generator";

const VALID_PREFIX = /^[a-z][a-z0-9_-]*$/;

export class LocalIdGenerator implements IdGenerator {
  #counter: number;

  constructor(initialState: IdGeneratorState = { counter: 0 }) {
    if (!Number.isSafeInteger(initialState.counter) || initialState.counter < 0) {
      throw new Error("ID 计数器必须是非负安全整数。");
    }
    this.#counter = initialState.counter;
  }

  next(prefix: string): string {
    if (!VALID_PREFIX.test(prefix)) {
      throw new Error(`无效的 ID 前缀：${prefix}`);
    }
    this.#counter += 1;
    return `${prefix}_${this.#counter}`;
  }

  snapshot(): IdGeneratorState {
    return { counter: this.#counter };
  }
}
