import { describe, expect, it } from "vitest";
import { browserContentModules } from "../../src/content/manifest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import { loadContentRegistry } from "../../src/content/registry";
import {
  evaluateWishlistTarget,
  upsertWishlistTarget,
} from "../../src/domain/equipment/wishlist-rules";
import { asBrandedId } from "../../src/domain/shared/ids";
import { createMemberFixture } from "../helpers/game-state-v2-factory";

const content = loadBrowserContentRegistry();

function contentWithPrototypeSuffix() {
  const modules = structuredClone(browserContentModules) as Record<string, unknown>;
  const key = Object.keys(modules).find((path) =>
    path.endsWith("/content/items/ragefire-chasm.json"),
  );
  if (!key) throw new Error("Expected ragefire item content");
  const file = modules[key] as {
    items: Array<{ id: string; randomSuffixIds?: string[] }>;
  };
  const item = file.items.find((candidate) => candidate.id === "14148");
  if (!item) throw new Error("Expected Crystal Cuffs");
  item.randomSuffixIds = ["prototype_of_readiness"];
  return loadContentRegistry(modules);
}

describe("member wishlist rules", () => {
  it("rejects items the current class cannot equip", () => {
    const result = evaluateWishlistTarget(
      createMemberFixture(),
      {
        itemDefinitionId: asBrandedId<"ItemDefinitionId">("6324"),
        acceptableRandomSuffixIds: [],
      },
      content,
    );

    expect(result.allowed).toBe(false);
    expect(result.failures.map((failure) => failure.code)).toEqual([
      "class-restricted",
      "role-restricted",
    ]);
  });

  it("rejects items outside the current specialization's primary role", () => {
    const result = evaluateWishlistTarget(
      createMemberFixture(),
      {
        itemDefinitionId: asBrandedId<"ItemDefinitionId">("872"),
        acceptableRandomSuffixIds: [],
      },
      content,
    );

    expect(result.allowed).toBe(false);
    expect(result.failures.map((failure) => failure.code)).toContain("role-restricted");
  });

  it("requires preferred and acceptable suffixes to belong to the base item", () => {
    const registry = contentWithPrototypeSuffix();
    const member = createMemberFixture({
      identity: {
        ...createMemberFixture().identity,
        classId: asBrandedId<"ClassId">("priest"),
      },
      progression: {
        ...createMemberFixture().progression,
        specId: asBrandedId<"SpecId">("priest_holy"),
      },
    });
    const invalid = asBrandedId<"RandomSuffixId">("missing_suffix");

    expect(
      evaluateWishlistTarget(
        member,
        {
          itemDefinitionId: asBrandedId<"ItemDefinitionId">("14148"),
          preferredRandomSuffixId: invalid,
          acceptableRandomSuffixIds: [invalid],
        },
        registry,
      ).failures.map((failure) => failure.code),
    ).toEqual(["invalid-preferred-suffix", "invalid-acceptable-suffix"]);
  });

  it("updates an existing base-item target instead of creating a duplicate", () => {
    const registry = contentWithPrototypeSuffix();
    const member = createMemberFixture({
      identity: {
        ...createMemberFixture().identity,
        classId: asBrandedId<"ClassId">("priest"),
      },
      progression: {
        ...createMemberFixture().progression,
        specId: asBrandedId<"SpecId">("priest_holy"),
      },
    });
    const itemDefinitionId = asBrandedId<"ItemDefinitionId">("14148");
    const suffixId = asBrandedId<"RandomSuffixId">("prototype_of_readiness");

    upsertWishlistTarget(member, { itemDefinitionId, acceptableRandomSuffixIds: [] }, registry);
    upsertWishlistTarget(
      member,
      {
        itemDefinitionId,
        preferredRandomSuffixId: suffixId,
        acceptableRandomSuffixIds: [suffixId, suffixId],
      },
      registry,
    );

    expect(member.wishlist.entries).toEqual([
      {
        itemDefinitionId: "14148",
        preferredRandomSuffixId: "prototype_of_readiness",
        acceptableRandomSuffixIds: ["prototype_of_readiness"],
      },
    ]);
  });
});
