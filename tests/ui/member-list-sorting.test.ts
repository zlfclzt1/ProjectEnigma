import { describe, expect, it } from "vitest";
import { sortMembers } from "../../src/ui/member-list-sorting";

const members = [
  { name: "低级输出", role: "dps" as const, level: 12, itemLevel: 15 },
  { name: "高装治疗", role: "healer" as const, level: 10, itemLevel: 24 },
  { name: "高级坦克", role: "tank" as const, level: 18, itemLevel: 20 },
  { name: "高级输出", role: "dps" as const, level: 18, itemLevel: 21 },
];

describe("member list sorting", () => {
  it("sorts roles as tank, healer, then damage", () => {
    expect(sortMembers(members, "role").map((member) => member.role)).toEqual([
      "tank",
      "healer",
      "dps",
      "dps",
    ]);
  });

  it("sorts levels and item levels from high to low", () => {
    expect(sortMembers(members, "level").map((member) => member.name)).toEqual([
      "高级输出",
      "高级坦克",
      "低级输出",
      "高装治疗",
    ]);
    expect(sortMembers(members, "itemLevel").map((member) => member.name)).toEqual([
      "高装治疗",
      "高级输出",
      "高级坦克",
      "低级输出",
    ]);
  });

  it("keeps the source order for the default option", () => {
    const sorted = sortMembers(members, "default");
    expect(sorted).toEqual(members);
    expect(sorted).not.toBe(members);
  });
});
