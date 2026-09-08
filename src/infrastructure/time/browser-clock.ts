import type { Clock, Timestamp } from "../../application/ports/clock";

export class BrowserClock implements Clock {
  now(): Timestamp {
    const injected = (globalThis as { __MYSTERY_TEST_NOW__?: unknown }).__MYSTERY_TEST_NOW__;
    return typeof injected === "number" && Number.isFinite(injected) ? injected : Date.now();
  }
}
