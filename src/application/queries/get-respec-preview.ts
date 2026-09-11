import type { ContentRegistry } from "../../content/registry";
import type { GameState } from "../../domain/game-state";
import type { MemberId, SpecId } from "../../domain/shared/ids";

export interface RespecPreviewView {
  readonly memberId: MemberId;
  readonly currentSpecId: SpecId;
  readonly targetSpecId: SpecId;
  readonly targetSpecName: string;
}

export function getRespecPreview(
  state: GameState,
  content: ContentRegistry,
  memberId: MemberId,
  targetSpecId: SpecId,
): RespecPreviewView | null {
  const member = state.members[memberId];
  if (!member) return null;
  const targetSpec = content.specById.get(targetSpecId);
  if (!targetSpec || targetSpec.classId !== member.identity.classId) return null;
  return {
    memberId,
    currentSpecId: member.progression.specId,
    targetSpecId: targetSpec.id,
    targetSpecName: targetSpec.name.zhCN,
  };
}
