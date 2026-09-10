# 剃刀高地（Razorfen Downs）资料清单

- 内容 ID：`razorfen_downs`
- 研究阶段：D13.A
- 目标版本：`classic-2019-phase-6`
- 核对日期：2026-09-09
- 状态：资料清单完成，等待 D13.B 装备与掉落录入

## 版本与产品边界

本清单采用 2019 经典怀旧服最终阶段的剃刀高地资料。经典资料将副本定位在约 37–47 级；本游戏在血色修道院大教堂首通后解锁，以 24 分钟左右的完整路线、较高恢复压力和疾病处理价值为目标。

普通怪 BoE、世界掉落、材料、配方、任务物品和专业训练不进入 Boss 装备池。所有收益仍只来自玩家主动安排的远征；解锁副本、出现任务或满足任务条件本身不会自动产生经验、资金或装备。

法瑟蕾丝夫人只在经典旧世第六阶段天灾入侵期间出现。目标内容版本明确采用 `classic-2019-phase-6`，且她拥有两件独特装备，因此作为低概率随机稀有节点保留；界面和资料说明必须明确其限时事件来源，不能把她描述成常驻主线 Boss。

## Boss 与路线

剃刀高地原版入口有左右分路，放置路线采用稳定的线性结算顺序，保留蜘蛛锣、骨堆、护送仪式、螺旋坡和最终 Boss 等主要节点，不模拟实时寻路或回头路。

| 顺序 | Encounter ID | Boss / 事件 | 路线分类 | 说明 |
|---:|---|---|---|---|
| 1 | `razorfen_downs_tutenkash` | 图特卡什（Tuten'kash） | required | 敲响蜘蛛锣并清理蛛群后召唤；毒、诅咒和蛛网压力 |
| 2 | `razorfen_downs_lady_faltheress` | 法瑟蕾丝夫人（Lady Falther'ess） | rare | 第六阶段天灾入侵稀有事件；不计入主线首通 |
| 3 | `razorfen_downs_mordresh_fire_eye` | 火眼莫德雷斯（Mordresh Fire Eye） | required | 骨堆旁骷髅群、火球打断和范围火焰 |
| 4 | `razorfen_downs_plaguemaw_the_rotting` | 腐烂的普雷莫尔（Plaguemaw the Rotting） | optional | 保护 Belnistrasz 完成仪式的普通可选护送事件 |
| 5 | `razorfen_downs_glutton` | 暴食者（Glutton） | required | 疾病云与狂怒带来持续治疗和坦克压力 |
| 6 | `razorfen_downs_ragglesnout` | 拉戈斯诺特（Ragglesnout） | rare | 常驻随机稀有 Boss；精神控制、治疗和暗影法术 |
| 7 | `razorfen_downs_amnennar_the_coldbringer` | 寒冰之王亚门纳尔（Amnennar the Coldbringer） | required | 最终 Boss；冰霜新星、寒冰箭和召唤冰霜幽灵 |

图特卡什、火眼莫德雷斯、暴食者和寒冰之王亚门纳尔构成主线首通。腐烂的普雷莫尔必须由玩家出发前主动勾选，未安排护送时不产生任何离线收益。拉戈斯诺特和法瑟蕾丝夫人都使用活动种子确定是否出现，出发前只展示概率和额外耗时范围。

## Boss 专属装备池

AtlasLootClassic 与 Wowhead Classic 交叉核对出 20 件非世界装备：常驻 Boss 18 件，天灾入侵稀有 Boss 2 件。

| Boss | 物品 ID | 装备 | 栏位 |
|---|---:|---|---|
| Tuten'kash | 10776 | 蜘蛛银丝斗篷 | 背部 |
| Tuten'kash | 10775 | 图特卡什的甲壳 | 板甲胸部 |
| Tuten'kash | 10777 | 蜘蛛手套 | 皮甲手套 |
| Mordresh Fire Eye | 10769 | 莫德雷斯之眼 | 项链 |
| Mordresh Fire Eye | 10771 | 死亡法师腰带 | 布甲腰部 |
| Mordresh Fire Eye | 10770 | 莫德雷斯的颅骨 | 副手物品 |
| Glutton | 10774 | 血皮护肩 | 皮甲肩部 |
| Glutton | 10772 | 暴食者之斧 | 单手斧 |
| Ragglesnout | 10768 | 野猪人勇士腰带 | 锁甲腰部 |
| Ragglesnout | 10767 | 野猪之盾 | 盾牌 |
| Ragglesnout | 10758 | 石猪剑 | 双手剑 |
| Amnennar the Coldbringer | 10763 | 冰铁之盔 | 板甲头部 |
| Amnennar the Coldbringer | 10762 | 巫妖法袍 | 布甲胸部 |
| Amnennar the Coldbringer | 10764 | 死寒护甲 | 锁甲胸部 |
| Amnennar the Coldbringer | 10761 | 寒怒匕首 | 单手匕首 |
| Amnennar the Coldbringer | 10765 | 白骨手指 | 皮甲手套 |
| Plaguemaw the Rotting | 10766 | 瘟疫短枝 | 法师限定魔杖 |
| Plaguemaw the Rotting | 10760 | 野猪之拳 | 皮甲手套 |
| Lady Falther'ess | 23178 | 法瑟蕾丝夫人的披肩 | 背部 |
| Lady Falther'ess | 23177 | 法瑟蕾丝夫人的手指 | 魔杖 |

所有拥有专属装备池的 Boss 首轮保证掉落一件装备，池内先采用等权基线。任务奖励、普通怪 BoE（如 Freezing Shard、Manslayer）和天灾入侵区域外掉落不混入上述 Boss 池。

## 成员副本任务与奖励

当前成员任务模型要求装备奖励，但只支持从奖励列表选择一件。`Bring the Light` 与 `Bring the End` 的 Classic 任务数据均把 10823 和 10824 标记为同时发放，而不是二选一，因此 D13.B 前需要拆出一个独立基础提交，使任务可以同时声明固定装备奖励与可选装备奖励。

| 经典任务 | 轻量完成条件 | 装备奖励 | 录入决定 |
|---|---|---|---|
| Extinguishing the Idol（3525） | 完成腐烂的普雷莫尔护送仪式 | 10710 龙爪戒指 | 录入；以可选 Encounter 胜利表达护送完成 |
| Bring the Light（3636） / Bring the End（3341） | 击败寒冰之王亚门纳尔 | 10823 征服者之剑和 10824 琥珀之光，两件同时获得 | 合并为中立成员任务；阵营与任务物品不模拟 |
| A Host of Evil（6626） | 击杀副本入口附近普通怪 | 只有经验和银币 | 排除；目标不在正式副本路线且无装备奖励 |
| Scourge of the Downs（3523） | 找到 Belnistrasz | 护送前置，无独立装备奖励 | 排除；不单独模拟接任务跑腿 |
| An Unholy Alliance（6522） | 击杀副本外的 Ambassador Malcin | 17039、17042、17043 三选一 | 排除；目标位于实例外，不由剃刀高地远征完成 |

任务奖励只由实际参战成员主动接取、完成并领取，不进入公共待分配战利品区。护送任务不会因为玩家选择普通主路线而自动推进。

## 机制候选

- 蜘蛛锣事件：蛛群与蛛网适合用 `area_damage` 和 `curse_dispel` 表达路线稳定性。
- 火眼莫德雷斯：骨堆骷髅群需要 `area_damage`，火球和范围火焰需要 `interrupt`。
- 腐烂的普雷莫尔护送：仪式期间持续刷怪，使用 `area_damage` 和额外治疗需求表达保护 NPC，不增加实时护送操作。
- 暴食者：疾病云使 `disease_dispel` 有明确价值，狂怒提高坦克与持续恢复压力。
- 拉戈斯诺特：精神控制与治疗使用 `magic_dispel`、`interrupt` 表达，缺少能力时延长战斗并增加治疗需求。
- 寒冰之王亚门纳尔：冰霜新星、寒冰箭与冰霜幽灵使用 `interrupt`、`area_damage` 表达最终战多目标恢复压力。
- 法瑟蕾丝夫人：女妖控制和法术压力复用 `magic_dispel` 或 `interrupt`，保持软推荐而非职业硬门槛。

普通怪疾病较多且常成群出现，因此本副本应让 `disease_dispel` 和 `area_damage` 在预览与战报中持续体现价值。第一版不实现站位、仇恨列表、护送 NPC 血条、实时敲锣、任务物品背包或限时世界事件日历。

## 来源

1. [Wowhead Classic 剃刀高地攻略](https://www.wowhead.com/classic/guide/razorfen-downs-dungeon-strategy-wow-classic)：等级区间、Boss 路线、机制、拉戈斯诺特稀有标记与 18 件常驻 Boss 装备。
2. [Wowhead Classic 剃刀高地任务攻略](https://www.wowhead.com/classic/guide/classic-wow-razorfen-downs-dungeon-quests)：任务列表、目标与奖励候选。
3. [AtlasLootClassic 数据仓库](https://github.com/Hoizame/AtlasLootClassic/blob/master/AtlasLootClassic_DungeonsAndRaids/data.lua)：交叉核对 7 个 Boss、20 件装备及法瑟蕾丝夫人的 `scourgeInvasion` 标记。
4. [Wowhead Classic Bring the Light](https://www.wowhead.com/classic/quest=3636/bring-the-light) 与 [Bring the End](https://www.wowhead.com/classic/quest=3341/bring-the-end)：任务数据中的 `itemrewards` 同时列出 10823 与 10824。
5. [Warcraft Wiki：Lady Falther'ess](https://warcraft.wiki.gg/wiki/Lady_Falther%27ess)：天灾入侵限时来源、囚禁形态与剃刀高地归属。
6. Wowhead Classic 中文物品 XML：20 件 Boss 装备和 3 件任务奖励的中文名、品质、栏位、图标、需求等级与常驻属性。

## D13.A 验收清单

- [x] 7 个路线节点完成 required/optional/rare 分类，最终 Boss 与主线首通定义明确。
- [x] 18 件常驻 Boss 装备完成 Classic XML 和 AtlasLootClassic 交叉核对。
- [x] 法瑟蕾丝夫人的第六阶段限时边界与 2 件独特装备完成核对。
- [x] 3 件任务奖励完成 XML 核对，确认 10823 与 10824 为同时发放。
- [x] 副本外任务、普通怪 BoE、材料、配方与任务物品明确排除。
- [x] 固定多件任务奖励的架构缺口已识别，要求在 D13.B 前独立解决。
- [x] 所有正式内容使用 `classic-2019-phase-6`，没有探索赛季或后续版本数据。
