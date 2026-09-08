import type { FormulaVersion } from "../shared/ids";
import type { CombatProfile } from "./combat-profile";

export interface PartyCombatContribution {
  readonly tank: number;
  readonly healing: number;
  readonly damage: number;
}

export interface PartyCombatProfile {
  readonly formulaVersion: FormulaVersion;
  readonly members: readonly CombatProfile[];
  readonly contribution: PartyCombatContribution;
}

// CombatProfile 的四项能力保留细粒度成长空间；这里将其归一到当前副本需求使用的
// “同等级标准成员约等于等级值”量纲。新公式版本可替换这组显式校准值。
export const PARTY_CALIBRATION_BY_FORMULA_VERSION: Readonly<
  Record<string, PartyCombatContribution>
> = {
  "classic-light-v1": { tank: 0.67, healing: 0.67, damage: 0.76 },
};

export function buildPartyCombatProfile(members: readonly CombatProfile[]): PartyCombatProfile {
  if (members.length === 0) throw new Error("无法为空队伍生成战斗配置。");
  const formulaVersion = members[0]!.formulaVersion;
  if (members.some((member) => member.formulaVersion !== formulaVersion)) {
    throw new Error("同一队伍不能混用多个战斗公式版本。");
  }
  const calibration = PARTY_CALIBRATION_BY_FORMULA_VERSION[formulaVersion];
  if (!calibration) throw new Error(`战斗公式 ${formulaVersion} 缺少队伍能力校准。`);

  const contribution = members.reduce<PartyCombatContribution>(
    (total, member) => ({
      tank:
        total.tank +
        (member.role === "tank"
          ? Math.sqrt(member.capabilities.survivability * member.capabilities.threat) *
            calibration.tank
          : 0),
      healing:
        total.healing +
        (member.role === "healer" ? member.capabilities.healing * calibration.healing : 0),
      damage: total.damage + member.capabilities.damage * calibration.damage,
    }),
    { tank: 0, healing: 0, damage: 0 },
  );

  if (Object.values(contribution).some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error("队伍战斗能力结果无效。");
  }
  return { formulaVersion, members: [...members], contribution };
}
