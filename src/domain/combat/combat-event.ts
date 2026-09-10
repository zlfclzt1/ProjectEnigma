import type { DungeonRouteNodeId, MemberId } from "../shared/ids";

export type CombatEvent =
  | {
      readonly type: "encounter-outcome";
      readonly outcome: "victory" | "defeat";
    }
  | {
      readonly type: "top-damage";
      readonly memberId: MemberId;
      readonly damage: number;
    }
  | {
      readonly type: "top-healing";
      readonly memberId: MemberId;
      readonly healing: number;
    }
  | {
      readonly type: "member-defeated";
      readonly memberId: MemberId;
    }
  | {
      readonly type: "rare-encounter-revealed";
      readonly routeNodeId: DungeonRouteNodeId;
    };
