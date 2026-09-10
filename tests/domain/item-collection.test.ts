import { describe, expect, it } from "vitest";
import { loadBrowserContentRegistry } from "../../src/content/manifest";
import {
  createEmptyCollectionState,
  recordAcquiredItem,
} from "../../src/domain/collection/item-collection";
import { asBrandedId } from "../../src/domain/shared/ids";
import { createItemInstanceFixture } from "../helpers/game-state-v2-factory";

const content = loadBrowserContentRegistry();

describe("item collection history", () => {
  it("counts repeated base items while recording each seen suffix only once", () => {
    const collection = createEmptyCollectionState();
    const plain = createItemInstanceFixture({
      definitionId: asBrandedId<"ItemDefinitionId">("14148"),
      ownerMemberId: undefined,
      bound: false,
    });
    const suffixed = createItemInstanceFixture({
      ...plain,
      id: asBrandedId<"ItemInstanceId">("suffixed_item"),
      randomSuffixId: asBrandedId<"RandomSuffixId">("prototype_of_readiness"),
    });

    recordAcquiredItem(collection, plain, content);
    recordAcquiredItem(collection, suffixed, content);
    recordAcquiredItem(collection, { ...suffixed, id: plain.id }, content);

    expect(collection).toEqual({
      items: {
        "14148": {
          acquisitionCount: 3,
          seenRandomSuffixIds: ["prototype_of_readiness"],
        },
      },
      claimedRewardIds: [],
    });
  });

  it("does not treat starter equipment as catalog discoveries", () => {
    const collection = createEmptyCollectionState();

    const result = recordAcquiredItem(collection, createItemInstanceFixture(), content);

    expect(result).toBeUndefined();
    expect(collection.items).toEqual({});
  });

  it("rejects an acquisition whose base definition is missing without mutating history", () => {
    const collection = createEmptyCollectionState();
    const missing = createItemInstanceFixture({
      definitionId: asBrandedId<"ItemDefinitionId">("missing_item"),
    });

    expect(() => recordAcquiredItem(collection, missing, content)).toThrow(/不存在的基础物品/);
    expect(collection).toEqual(createEmptyCollectionState());
  });
});
