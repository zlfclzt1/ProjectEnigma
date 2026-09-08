export type Timestamp = number;

/** Supplies time to application and domain workflows. */
export interface Clock {
  now(): Timestamp;
}
