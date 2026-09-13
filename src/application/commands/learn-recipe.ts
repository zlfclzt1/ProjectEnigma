import type { ContentRegistry } from "../../content/registry";
import type { GameCommand } from "../services/game-session";
import {
  ensureFacilityLevel,
  ensureTrainingRank,
  ensureMemberProfessionState,
} from "../../domain/profession/profession-rules";
import type { MemberId, RecipeId } from "../../domain/shared/ids";
import { recordEconomyEvent } from "../../domain/economy/economy-ledger";

export function learnRecipeCommand(
  content: ContentRegistry,
  memberId: MemberId,
  recipeId: RecipeId,
): GameCommand<void> {
  return {
    type: "learn-recipe",
    execute(state) {
      const member = state.members[memberId];
      if (!member) throw new Error("找不到该成员。");
      const recipe = content.recipeById.get(recipeId);
      if (!recipe || recipe.status !== "available") throw new Error("该配方尚未开放。");
      const profession = ensureMemberProfessionState(member, recipe.professionId);
      ensureFacilityLevel(state, content, recipe.facilityId);
      ensureTrainingRank(member, recipe.professionId, recipe.requiredTrainingRank ?? 1);
      if (profession.learnedRecipeIds.includes(recipeId)) throw new Error("成员已经学习该配方。");
      if (profession.skill < recipe.requiredSkill)
        throw new Error("专业技能不足，无法学习该配方。");
      if (state.guild.funds < recipe.learning.cost)
        throw new Error(`公会资金不足，需要 ${recipe.learning.cost} G。`);
      for (const requiredId of recipe.learning.requiredRecipeIds) {
        if (!profession.learnedRecipeIds.includes(requiredId))
          throw new Error("尚未学习配方前置。");
      }
      profession.learnedRecipeIds.push(recipeId);
      state.guild.funds -= recipe.learning.cost;
      recordEconomyEvent(state, {
        kind: "gold-expense",
        source: "recipe-learning",
        amount: recipe.learning.cost,
      });
    },
  };
}
