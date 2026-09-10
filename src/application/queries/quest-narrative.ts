import type { ContentRegistry } from "../../content/registry";
import type { DungeonQuestDefinition } from "../../content/schemas/quest";
import type { Member } from "../../domain/member/member";

export interface QuestPublisherView {
  readonly name: string;
  readonly location: string;
  readonly context: string;
  readonly sourceKind: "guild-liaison";
}

export function questPublisherView(
  content: ContentRegistry,
  quest: DungeonQuestDefinition,
): QuestPublisherView {
  const dungeonName = content.dungeonById.get(quest.dungeonId)?.name.zhCN ?? "未知地区";
  return {
    name: "公会联络人 · 艾琳",
    location: `公会任务大厅 · ${dungeonName}联络台`,
    context: `来自${dungeonName}周边的委托已由联络人核验目标与报酬，等待会长批准。`,
    sourceKind: "guild-liaison",
  };
}

export function memberQuestApplicationLine(
  member: Member,
  content: ContentRegistry,
  questName: string,
): string {
  const name = member.identity.name;
  switch (member.identity.personalityId) {
    case "steady":
      return `${name}：目标和退路都清楚，我愿意稳妥完成“${questName}”。`;
    case "impatient":
      return `${name}：别让委托在桌上落灰了，“${questName}”这趟让我去。`;
    case "diligent":
      return `${name}：我已经整理好目标记录，申请把“${questName}”一并完成。`;
    case "competitive":
      return `${name}：这份“${questName}”正适合证明我们的实力。`;
    case "sociable":
      return `${name}：只要大家同行，“${questName}”路上也能互相照应。`;
    case "clever":
      return `${name}：我看过路线，“${questName}”可以顺路处理，不必多走冤枉路。`;
    default: {
      const personality = content.personalityById.get(member.identity.personalityId)?.name.zhCN;
      return `${name}${personality ? `（${personality}）` : ""}申请接取“${questName}”。`;
    }
  }
}
