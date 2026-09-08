import type { Clock, Timestamp } from "../../application/ports/clock";

export class BrowserClock implements Clock {
  now(): Timestamp {
    return Date.now();
  }
}
