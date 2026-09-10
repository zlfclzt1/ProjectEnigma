# 诺莫瑞根（Gnomeregan）资料清单

- 内容 ID：`gnomeregan`
- 研究阶段：D07.A
- 目标版本：`classic-2019-phase-6`
- 核对日期：2026-09-09
- 状态：资料清单完成，等待 D07.B 录入装备与掉落

## 版本与范围

本清单采用 2019 经典旧世诺莫瑞根五人副本资料。探索赛季团队副本、后续重制事件、世界掉落、工程材料、图纸、钥匙、任务卡片与清洁区容器奖励均不进入当前装备池。

诺莫瑞根是本阶段第一座长路线、高机制密度副本。正式内容保留完整主要 Boss 路线、一个随机稀有 Boss，并用活动快照保证稀有结果确定性。后门钥匙不作为进入条件，当前也不实现 Boss 定向速刷。

## Boss 与路线

| 顺序 | Encounter ID | Boss | 路线分类 | 说明 |
|---:|---|---|---|---|
| 1 | `gnomeregan_grubbis` | 格鲁比斯（Grubbis） | required | 洞穴爆破事件；完整路线的起点 |
| 2 | `gnomeregan_viscous_fallout` | 粘性辐射尘（Viscous Fallout） | required | 毒性/自然伤害压力 |
| 3 | `gnomeregan_electrocutioner_6000` | 电刑器6000型（Electrocutioner 6000） | required | 电击与远程压力 |
| 4 | `gnomeregan_crowd_pummeler_9_60` | 群体打击者9-60（Crowd Pummeler 9-60） | required | 击退与坦克位置压力 |
| 5 | `gnomeregan_dark_iron_ambassador` | 黑铁大师（Dark Iron Ambassador） | rare | 原版随机稀有；不能作为任务必做目标 |
| 6 | `gnomeregan_mekgineer_thermaplugg` | 麦克尼尔·瑟玛普拉格（Mekgineer Thermaplugg） | required | 最终 Boss；炸弹与控制台机制候选 |

经典资料将 Grubbis 描述为洞穴事件触发 Boss。当前产品要求完整路线与主要 Boss，因此第一版作为 required 节点；若未来开放路线压缩，只能在出发前由玩家主动选择，不能产生无安排的离线收益。

## Boss 专属装备池

以下 15 件装备来自 Classic Wowhead Boss 掉落汇总。D07.B 逐件通过 Classic XML 核对属性、图标、需求等级和 Boss 来源，并使用 AtlasLootClassic 交叉核对。

| Boss | 物品 ID | 装备 |
|---|---:|---|
| Grubbis | 9445 | Grubbis Paws |
| Viscous Fallout | 9454 | Acidic Walkers |
| Viscous Fallout | 9452 | Hydrocane |
| Viscous Fallout | 9453 | Toxic Revenger |
| Electrocutioner 6000 | 9447 | Electrocutioner Lagnut |
| Electrocutioner 6000 | 9446 | Electrocutioner Leg |
| Electrocutioner 6000 | 9448 | Spidertank Oilrag |
| Crowd Pummeler 9-60 | 9449 | Manual Crowd Pummeler |
| Crowd Pummeler 9-60 | 9450 | Gnomebot Operating Boots |
| Dark Iron Ambassador | 9456 | Glass Shooter |
| Dark Iron Ambassador | 9457 | Royal Diplomatic Scepter |
| Dark Iron Ambassador | 9455 | Emissary Cuffs |
| Mekgineer Thermaplugg | 9458 | Thermaplugg's Central Core |
| Mekgineer Thermaplugg | 9459 | Thermaplugg's Left Arm |
| Mekgineer Thermaplugg | 9461 | Charged Gear |
| Mekgineer Thermaplugg | 9492 | Electromagnetic Gigaflux Reactivator |

最终 Boss 实际列出四件专属装备，因此总候选为 16 件。所有拥有专属池的 Boss 首轮保证掉落一件；原始掉率仅用于池内相对权重，不宣称每件必掉。

### 明确排除

- 4359、4361、4363、4364、4371、4377、4382 等工程材料。
- 4413、14639 等工程图纸。
- 6893 Workshop Key、9173 Goblin Transponder。
- Sparklematic-Wrapped Box 与清洁区随机容器内容。
- 探索赛季新增套装、饰品、职业物品和团队机制。

## 成员任务候选

诺莫瑞根任务很多，但大量依赖护送、普通怪收集、辐射样本、打孔卡和阵营链。第一版只录入 2–3 条能由副本活动直接确定、且奖励有培养价值的任务。

| 经典任务 | 轻量完成条件 | 奖励 | 建议 |
|---|---|---|---|
| The Grand Betrayal / Rig Wars | 击败 Mekgineer Thermaplugg | 9623 Civinad Robes / 9624 Triprunner Dungarees / 9625 Dual Reinforced Leggings | 优先录入；联盟与部落版本合并为中立成员任务 |
| Data Rescue | 完整通关诺莫瑞根 | 9605 Repairman's Cape / 9604 Mechanic's Pipehammer | 可录入；打孔卡链压缩为全通目标 |
| Gyrodrillmatic Excavationators | 完整通关或击败机械区主要 Boss | 9608 Shoni's Disarming Tool / 9609 Shilly Mitts | 备选；普通怪零件收集不模拟 |
| A Fine Mess | 护送 Kernobee | 9535 Fire-welded Bracers / 9536 Fairywing Mantle | 当前任务系统不支持护送，排除 |
| Grime-Encrusted Ring | 清洁机器交互 | 9538 Talvash's Gold Ring / 9588 Nogg's Gold Ring | 当前不支持交互与阵营分支，排除 |

任务奖励必须仅由成员任务领取，不进入 Boss 掉落表。成员必须实际参战，且只有玩家主动安排的活动才会推进进度。

## 机制候选

- Grubbis：洞穴事件与大量小怪，使用范围伤害或群体控制建议机制。
- Viscous Fallout：毒性辐射，使用毒药驱散建议机制。
- Electrocutioner 6000：电击，使用远程输出或魔法驱散建议机制。
- Crowd Pummeler 9-60：击退与践踏，使用坦克能力加权，不新增位置模拟。
- Mekgineer Thermaplugg：炸弹与控制台，使用范围伤害和打断建议机制；不实现实时点击控制台。

第一版机制应保持可解释、可模拟。不得因为长路线而堆叠多个硬性 required 机制，避免随机初始队伍完全无法出发。

## 来源

1. [Wowhead Classic 诺莫瑞根攻略](https://www.wowhead.com/classic/guide/gnomeregan-dungeon-strategy-wow-classic)：路线、六名 Boss、稀有标记、机制摘要与专属装备池。
2. [Wowhead Classic 诺莫瑞根任务攻略](https://www.wowhead.com/classic/guide/classic-wow-gnomeregan-dungeon-quests)：任务等级、阵营、完成方式和装备奖励选择。
3. [AtlasLootClassic 数据仓库](https://github.com/Hoizame/AtlasLootClassic/blob/master/AtlasLootClassic_DungeonsAndRaids/data.lua)：D07.B 录入前交叉核对 Boss 与物品 ID。

## D07.B 验收清单

- [ ] 16 件 Boss 专属装备逐件完成 Classic XML 核对。
- [ ] 计划录入的任务奖励逐件完成 Classic XML 核对。
- [ ] 随机稀有 Boss 的三件装备不出现在其他 Boss 池。
- [ ] 工程材料、图纸、钥匙、任务物品与世界掉落已排除。
- [ ] 所有来源为 `classic-2019-phase-6`，不含探索赛季内容。
