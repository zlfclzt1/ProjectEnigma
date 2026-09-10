# 祖尔法拉克（Zul'Farrak）资料清单

- 内容 ID：`zulfarrak`
- 研究阶段：D15.A
- 目标版本：`classic-2019-phase-6`
- 核对日期：2026-09-09
- 状态：资料清单完成，等待 D15.B 装备与掉落录入

## 版本与产品边界

本清单采用 2019 经典怀旧服最终阶段的祖尔法拉克资料。原版资料将其定位为约 44–54 级副本；本游戏在奥达曼首通后解锁，等级上限仍为 45，以 24 分钟左右的完整路线、百人斩持久恢复压力和“45 级时代毕业”首通为目标。

普通怪 BoE、世界掉落、材料、配方、任务物品和副本外祖尔祭坛内容不进入 Boss 装备池。所有经验、资金、掉落、任务进度和离线结算都必须来自玩家主动安排的远征。

反击者桑萨斯和保护者迦萨斯可在原版中合成鞭笞者苏萨斯。两把单手剑是 Boss 真实掉落，必须录入；合成后的装备不是 Boss 直接掉落，当前又没有物品合成协议，因此本阶段不创建鞭笞者苏萨斯实例，但在图鉴中保留两件前置装备的独立收藏记录。

## Boss 与路线

祖尔法拉克的百人斩楼梯战实际包含释放俘虏、多波怪物、耐克鲁姆与暗影祭司塞瑟斯，以及可主动触发的布莱背叛。放置路线保留关键结算节点，不模拟实时站位、开门、敲锣或与 NPC 逐句对话。

| 顺序 | Encounter ID | Boss / 事件 | 路线分类 | 说明 |
|---:|---|---|---|---|
| 1 | `zulfarrak_zerillis` | 泽雷利斯（Zerillis） | rare | 在副本内巡逻的随机稀有首领；有一件独特装备 |
| 2 | `zulfarrak_antusul` | 安图苏尔（Antu'sul） | required | 召唤苏利萨孽生蛇与仆从，治疗图腾和治疗波需要快速转火与打断 |
| 3 | `zulfarrak_sandarr_dunereaver` | 沙怒守护者（Sandarr Dunereaver） | rare | 随机稀有首领；只掉落任务材料，没有装备池 |
| 4 | `zulfarrak_theka_the_martyr` | 殉教者塞卡（Theka the Martyr） | required | 甲虫房任务首领；低血量时短暂免疫物理与暗影伤害并召唤甲虫 |
| 5 | `zulfarrak_witch_doctor_zumrah` | 巫医祖穆拉恩（Witch Doctor Zum'rah） | required | 治疗、暗影法术、图腾和墓地僵尸造成打断与多目标压力 |
| 6 | `zulfarrak_dustwraith` | 灰尘怨灵（Dustwraith） | rare | 随机稀有首领；有一件独特装备 |
| 7 | `zulfarrak_sandfury_executioner` | 沙怒刍鬼者（Sandfury Executioner） | required | 获取钥匙并释放楼梯上的俘虏；只掉落任务钥匙 |
| 8 | `zulfarrak_nekrum_and_sezzziz` | 耐克鲁姆·食尸者与暗影祭司塞瑟斯 | required | 百人斩最后一波的双首领战；掉落使用塞瑟斯的真实装备池 |
| 9 | `zulfarrak_sergeant_bly` | 布莱中士（Sergeant Bly） | optional | 百人斩后由玩家主动选择对话发起的背叛战；只提供探水棒任务目标 |
| 10 | `zulfarrak_hydromancer_velratha` | 水占师维蕾萨（Hydromancer Velratha） | required | 深渊王冠与第二块摩沙鲁石板的任务首领；没有装备池 |
| 11 | `zulfarrak_gahzrilla` | 加兹瑞拉（Gahz'rilla） | optional | 需要副本外获得祖尔法拉克之槌并在水池敲锣召唤；本游戏以出发前主动勾选表达 |
| 12 | `zulfarrak_chief_ukorz` | 乌克兹·沙顶与卢兹鲁（Chief Ukorz Sandscalp and Ruuzlu） | required | 最终 Boss；双目标顺劈与狂暴压力，击败后记录主线首通 |

安图苏尔、殉教者塞卡、巫医祖穆拉恩、沙怒刍鬼者、耐克鲁姆与塞瑟斯、水占师维蕾萨、乌克兹与卢兹鲁构成主线首通。加兹瑞拉和布莱中士必须在出发前主动勾选，未安排时不产生任何离线收益。泽雷利斯、沙怒守护者和灰尘怨灵使用活动种子确定是否出现，不计入主线首通。

## Boss 专属装备池

AtlasLootClassic 与 Wowhead Classic 交叉核对出 19 件非世界装备：常驻 Boss 17 件，随机稀有 Boss 2 件。祖尔法拉克没有需要录入的随机词缀装备。

| Boss | 物品 ID | 装备 | 栏位 |
|---|---:|---|---|
| Antu'sul | 9640 | 虎钳夹口 | 板甲手套 |
| Antu'sul | 9641 | 活力护符 | 项链 |
| Antu'sul | 9639 | 安图苏尔之手 | 单手锤 |
| Antu'sul | 9379 | 反击者桑萨斯 | 单手剑 |
| Witch Doctor Zum'rah | 18083 | 苏玛赞护手 | 布甲手套 |
| Witch Doctor Zum'rah | 18082 | 祖穆拉恩的能量法杖 | 双手法杖 |
| Shadowpriest Sezz'ziz | 9470 | 大坏蛋面具 | 布甲头部 |
| Shadowpriest Sezz'ziz | 9473 | 霉运巫毒之皮 | 皮甲胸部 |
| Shadowpriest Sezz'ziz | 9474 | 霉运巫毒之裙 | 皮甲腿部 |
| Shadowpriest Sezz'ziz | 9475 | 魔鬼割皮刀 | 双手长柄武器 |
| Dustwraith | 12471 | 沙漠行者藤条 | 副手物品 |
| Gahz'rilla | 9469 | 加兹瑞拉鳞片护甲 | 锁甲胸部 |
| Gahz'rilla | 9467 | 加兹瑞拉之牙 | 拳套 |
| Chief Ukorz Sandscalp | 9479 | 狂乱者的拥抱 | 皮甲头部 |
| Chief Ukorz Sandscalp | 9476 | 大坏蛋肩甲 | 板甲肩部 |
| Chief Ukorz Sandscalp | 9478 | 撕裂之锯 | 单手斧 |
| Chief Ukorz Sandscalp | 9477 | 酋长的执行者 | 双手法杖 |
| Chief Ukorz Sandscalp | 11086 | 保护者迦萨斯 | 单手剑 |
| Zerillis | 12470 | 沙行者护足 | 皮甲脚部 |

所有拥有专属装备池的 Boss 首轮保证掉落一件装备，池内根据公开掉落率录入相对权重。殉教者塞卡的巨魔之汗、沙怒守护者的巨魔调和剂、耐克鲁姆的勋章、沙怒刍鬼者的钥匙、布莱的探水棒和维蕾萨的王冠与石板都是普通物品或任务物品，不建立装备掉落表。

## 成员副本任务与奖励

只录入由已建模路线能够确定完成、且奖励可直接用于成员培养的装备任务。阵营差异和任务物品背包不模拟。

| 经典任务 | 轻量完成条件 | 装备奖励 | 录入决定 |
|---|---|---|---|
| Tiara of the Deep（2846） | 击败水占师维蕾萨并取得深渊王冠 | 9527 幻法之杖 / 9531 晶岩肩铠二选一 | 录入；以维蕾萨 Encounter 胜利表达取得王冠 |
| Divino-matic Rod（2768） | 完成百人斩并主动挑战布莱中士 | 9533 石工兄弟会之戒 / 9534 工程学协会头盔二选一 | 录入；要求楼梯事件和布莱可选 Encounter 胜利 |
| Gahz'rilla（2770） | 召唤并击败加兹瑞拉 | 11122 棍子上的胡萝卜 | 暂不录入；装备的唯一效果是坐骑时移动速度，用户已明确本阶段不需要坐骑系统 |
| The Prophecy of Mosh'aru（3527） | 击败塞卡和维蕾萨取得两块石板 | 只有经验与银币 | 排除；无装备奖励 |
| Nekrum's Medallion（2991） | 击败耐克鲁姆取得勋章 | 只有经验与银币 | 排除；无装备奖励 |
| Scarab Shells、Troll Temper、The Spider God 等 | 收集普通怪材料或继续副本外任务链 | 无直接可培养装备 | 排除；不模拟普通怪物品收集与副本外步骤 |

任务奖励只由实际参战成员主动接取、完成并领取，不进入公共待分配战利品区。加兹瑞拉或布莱的任务不会因为玩家只选择主线路线而自动推进。

## 机制候选

- 安图苏尔：仆从与孽生蛇使用 `area_damage`，治疗图腾和治疗波使用 `interrupt`。
- 殉教者塞卡：低血量免疫阶段以延长战斗表达，召唤的甲虫使用 `area_damage`，不新增“魔法伤害”硬门槛。
- 巫医祖穆拉恩：暗影箭、治疗和图腾使用 `interrupt`，墓地僵尸使用 `area_damage`。
- 百人斩：多波怪物与 NPC 存活使用 `area_damage`、`crowd_control` 和额外治疗需求，不模拟 NPC 血条。
- 耐克鲁姆与暗影祭司塞瑟斯：双首领、治疗和暗影法术使用 `crowd_control`、`interrupt` 表达击杀顺序和打断压力。
- 布莱中士：五人小队背叛使用 `crowd_control` 和 `area_damage`，作为高成本任务支路。
- 水占师维蕾萨：冰霜法术使用 `interrupt` 和远程伤害优势表达。
- 加兹瑞拉：冻结、冰锥与击飞使用 `magic_dispel`、远程伤害和较高治疗需求表达。
- 乌克兹与卢兹鲁：双目标顺劈、狂暴姿态与收尾压力强调坦克、治疗、`crowd_control` 和持久输出。
- 泽雷利斯：冰霜射击与网使用 `magic_dispel` 或远程伤害表达；沙怒守护者与灰尘怨灵保持轻量稀有战。

第一版不实现实时楼梯波次、NPC 血条、任务物品背包、祖尔法拉克之槌、敲锣交互、击飞位置、物品合成、坐骑加速或副本外祖尔祭坛任务链。

## 阶段终局

首次击败乌克兹·沙顶与卢兹鲁后，在阶段 10.3 记录“45 级时代毕业”并发放一次性公会资金与收藏奖励。D15.C 只负责提供可追踪的最终 Boss 首通记录，不提前实现里程碑发奖。首通后祖尔法拉克仍可重复安排，装备、任务、图鉴、招募和其他副本继续可用。

## 来源

1. [Wowhead Classic 祖尔法拉克攻略](https://www.wowhead.com/classic/guide/zulfarrak-dungeon-strategy-wow-classic)：Boss 路线、楼梯事件、召唤条件、机制与常驻 Boss 装备。
2. [Wowhead Classic 祖尔法拉克任务攻略](https://www.wowhead.com/classic/guide/classic-wow-zulfarrak-dungeon-quests)：任务目标、实例内外边界与装备奖励。
3. [AtlasLootClassic 数据仓库](https://github.com/Hoizame/AtlasLootClassic/blob/master/AtlasLootClassic_DungeonsAndRaids/data.lua)：交叉核对 13 个首领/事件记录、7 张装备掉落表、19 件 Boss 装备与 3 名随机稀有首领。
4. Wowhead Classic 中文物品 XML：19 件 Boss 装备和 4 件任务奖励的中文名、品质、栏位、图标、需求等级与常驻属性。

## D15.A 验收清单

- [x] 12 个路线节点完成 required/optional/rare 分类，最终 Boss 与主线首通定义明确。
- [x] 百人斩事件、耐克鲁姆与塞瑟斯双首领、布莱背叛之间的结算边界明确。
- [x] 19 件 Boss 装备完成 Classic XML 与 AtlasLootClassic 交叉核对。
- [x] 塞卡、沙怒守护者、耐克鲁姆、刍鬼者、布莱与维蕾萨的非装备物品已明确排除。
- [x] 泽雷利斯、沙怒守护者和灰尘怨灵按随机稀有节点处理，只有实际装备掉落的稀有首领创建掉落表。
- [x] 4 件成员任务奖励完成 XML 核对；胡萝卜、普通怪收集与副本外任务链明确排除。
- [x] 反击者桑萨斯、保护者迦萨斯与合成后装备的阶段边界已记录。
- [x] 所有正式内容使用 `classic-2019-phase-6`，没有探索赛季或后续版本数据。
