# 暴风城监狱（The Stockade）资料清单

- 内容 ID：`the_stockade`
- 研究阶段：D06.A
- 目标版本：`classic-2019-phase-6`
- 核对日期：2026-09-09
- 状态：资料清单完成，等待 D06.B 录入装备与掉落

## 版本与产品边界

本清单采用 2019 经典旧世暴风城监狱五人副本资料。原版副本位于联盟主城，但当前游戏不模拟阵营进入限制；任务中的联盟身份、前置链、收集头颅和击杀普通怪步骤，会在成员任务系统中压缩成可由副本活动直接判断的目标。

## 路线与 Boss

暴风城监狱是短时、分叉路线副本。五名常驻 Boss 作为主路线节点，布鲁高·铁拳作为确定性预生成、活动中延迟揭晓的随机稀有节点。

| 顺序 | Encounter ID | Boss | 路线分类 | 说明 |
|---:|---|---|---|---|
| 1 | `stockade_targorr_the_dread` | 可怕的塔格尔（Targorr the Dread） | required | 东侧囚室首领；What Comes Around 任务目标 |
| 2 | `stockade_kam_deepfury` | 卡姆·深怒（Kam Deepfury） | required | 黑铁矮人首领；The Fury Runs Deep 任务目标 |
| 3 | `stockade_hamhock` | 哈姆霍克（Hamhock） | required | 闪电与近战范围压力 |
| 4 | `stockade_bazil_thredd` | 巴基尔·斯瑞德（Bazil Thredd） | required | The Stockade Riots 任务目标 |
| 5 | `stockade_dextren_ward` | 迪克斯特·瓦德（Dextren Ward） | required | Crime and Punishment 任务目标 |
| 6 | `stockade_bruegal_ironknuckle` | 布鲁高·铁拳（Bruegal Ironknuckle） | rare | 原版稀有 Boss；本游戏随机出现，不作为任务必做目标 |

正式路线结算顺序属于放置玩法设计值；D06.C 应保持完整主要 Boss 路线，不实现定向速刷分支。

## Boss 装备池

经典攻略明确指出普通 Boss 主要掉落普通随机绿装，只有稀有 Boss 布鲁高·铁拳可靠掉落有培养价值的专属装备。世界/随机绿装当前排除，因此五名常驻 Boss 应明确为无装备掉落。

| Boss | 物品 ID | 装备 |
|---|---:|---|
| Bruegal Ironknuckle | 2941 | Prison Shank |
| Bruegal Ironknuckle | 2942 | Iron Knuckles |
| Bruegal Ironknuckle | 3228 | Jimmied Handcuffs |

这三件装备在 D06.B 逐件通过 Wowhead Classic XML 核对属性、图标、需求等级和来源；掉落表必须显式使用 `sourceType: boss_drop`。

## 任务与奖励候选

任务资料列出八条相关任务，其中三条只有经验/银币，四条提供有培养价值的装备二选一。当前成员任务系统优先录入能绑定主要 Boss、奖励有明确成长价值的任务。

| 经典任务 | 目标 | 奖励 | 录入建议 |
|---|---|---|---|
| The Stockade Riots | 击败 Bazil Thredd | 经验与资金 | 可作为无装备奖励能力开放后的候选；当前 Schema 要求装备奖励，暂不录入 |
| Quell The Uprising | 击杀迪菲亚囚犯 | 经验与资金 | 当前不模拟普通怪计数，排除 |
| The Color of Blood | 收集红色毛纺面罩 | 经验与资金 | 当前不模拟任务物品，排除 |
| What Comes Around... | 击败 Targorr | 3400 Lucine Longsword / 1317 Hardened Root Staff | D06.C 优先录入 |
| The Fury Runs Deep | 击败 Kam Deepfury | 3562 Belt of Vindication / 1264 Headbasher | D06.C 优先录入 |
| Crime and Punishment | 击败 Dextren Ward | 2033 Ambassador's Boots / 2906 Darkshire Mail Leggings | D06.C 优先录入 |

任务奖励必须只由成员任务系统发放，不能进入五名无专属装备 Boss 的公共掉落池。

## 机制候选

- Targorr、Kam、Dextren：多个囚犯随从，适合映射为控制能力建议机制。
- Hamhock：Chain Lightning，适合映射为治疗压力或魔法驱散建议机制。
- Bazil Thredd：Smoke Bomb，适合映射为命中/输出时间损失，但第一版可只保留日志表现。
- Bruegal Ironknuckle：稀有出现本身即为主要差异，不额外叠加复杂机制。

D06.C 只使用现有能力与机制模型；若控制能力缺少可复用字段，先用保守的坦克/治疗需求表示，不在内容中硬编码职业名单。

## 来源

1. [Wowhead Classic 暴风城监狱攻略](https://www.wowhead.com/classic/guide/the-stockade-dungeon-strategy-wow-classic)：Boss 清单、稀有标记、机制摘要与三件专属装备。
2. [Wowhead Classic 暴风城监狱任务攻略](https://www.wowhead.com/classic/guide/classic-wow-the-stockade-dungeon-quests)：任务等级、Boss/任务物品目标和装备奖励选择。
3. [AtlasLootClassic 数据仓库](https://github.com/Hoizame/AtlasLootClassic/blob/master/AtlasLootClassic_DungeonsAndRaids/data.lua)：D06.B 录入前交叉核对稀有 Boss 装备池与物品 ID。

## D06.B 验收清单

- [ ] 三件 Bruegal Ironknuckle 专属装备完成 XML 核对。
- [ ] 六件任务奖励装备完成 XML 核对。
- [ ] 五名常驻 Boss 不创建设计占位或世界掉落装备池。
- [ ] 任务奖励与稀有 Boss 掉落池没有重复。
- [ ] 所有来源标记为 `classic-2019-phase-6`，没有零售或后续重制数据。
