export interface RandomState {
  readonly seed: string;
  readonly counter: number;
}

export interface IdGeneratorState {
  readonly counter: number;
}
