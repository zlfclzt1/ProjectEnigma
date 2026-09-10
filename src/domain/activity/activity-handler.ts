import type { GameState } from "../game-state";
import type { MemberId } from "../shared/ids";
import type { IdGenerator } from "../../application/ports/id-generator";
import type { RandomSource } from "../../application/ports/random-source";
import type { Activity, ActivityType } from "./activity";

export interface ActivityStartRequest {
  readonly type: ActivityType;
  readonly participantIds: readonly MemberId[];
}

export interface ActivityStartContext {
  readonly state: GameState;
  readonly now: number;
  readonly ids: IdGenerator;
  readonly random: RandomSource;
}

export interface ActivitySettlementContext {
  readonly state: GameState;
  readonly now: number;
}

export interface ActivityValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly memberId?: MemberId;
}

export type ActivityValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly issues: readonly ActivityValidationIssue[] };

export interface ActivitySettlementResult {
  readonly changed: boolean;
}

export interface ActivityHandler<
  Request extends ActivityStartRequest,
  ManagedActivity extends Activity,
> {
  readonly type: ManagedActivity["type"];
  validateStart(context: ActivityStartContext, request: Request): ActivityValidationResult;
  create(context: ActivityStartContext, request: Request): ManagedActivity;
  settle?(context: ActivitySettlementContext, activity: ManagedActivity): ActivitySettlementResult;
}
