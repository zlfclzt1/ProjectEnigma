# 玛拉顿（Maraudon）资料清单

- 内容 ID：`maraudon`
- 研究阶段：D16.A
- 目标版本：`classic-2019-phase-6`
- 核对日期：2026-09-10
- 状态：资料清单完成，等待 D16.B 装备与掉落录入

## 版本与产品边界

本清单采用 2019 经典怀旧服最终阶段的玛拉顿资料。原版资料将完整副本定位为约 46–55 级内容；本游戏在祖尔法拉克首通、等级上限提高到 60 后解锁，以 45 级最低出发、49 级推荐队伍和约 29 分钟完整路线为首版目标。

玛拉顿由橙色入口、紫色入口和两翼汇合后的瀑布深层构成。当前放置游戏保留一座副本定义，不建立自由路线编辑器：两侧主干首领和通往瑟莱德丝公主的深层首领按稳定顺序结算，有独立装备价值的岔路 Boss 作为普通可选节点，收割者麦什洛克作为随机稀有节点。玩家未主动选择的可选节点不会产生经验、资金、任务进度或掉落。

普通怪 BoE、世界掉落、材料、配方、任务物品、消耗品和塞雷布拉斯节杖的传送功能不进入装备系统。所有经验、资金、掉落、任务进度和离线结算仍只来自玩家主动安排的远征。

## Boss、事件与路线

| 顺序 | Encounter ID | Boss / 事件 | 路线分类 | 说明 |
|---:|---|---|---|---|
| 1 | `maraudon_pariahs_instructions` | 贱民的指引（The Pariah's Instructions） | optional | 压缩无名预言者与五可汗的副本入口任务线；只有主动勾选才推进天选者印记任务，不建立护符或宝石背包 |
| 2 | `maraudon_noxxion` | 诺克赛恩（Noxxion） | required | 橙色入口主干；周期分裂为多个诺克赛恩幼体，强调多目标清理与自然伤害恢复 |
| 3 | `maraudon_razorlash` | 锐刺鞭笞者（Razorlash） | optional | 橙色入口岔路 Boss；击退与横扫造成坦克稳定和范围恢复压力 |
| 4 | `maraudon_lord_vyletongue` | 维利塔恩（Lord Vyletongue） | required | 紫色入口主干；潜行萨特与两名随从形成控制、毒素和打断压力 |
| 5 | `maraudon_meshlok_the_harvester` | 收割者麦什洛克（Meshlok the Harvester） | rare | 邪恶洞穴中的随机稀有首领；活动开始时按种子决定是否出现，不计入主线首通 |
| 6 | `maraudon_celebras_the_cursed` | 被诅咒的塞雷布拉斯（Celebras the Cursed） | required | 两翼汇合节点；根须、纠缠和树人随从强调驱散、打断与范围伤害 |
| 7 | `maraudon_landslide` | 兰斯利德（Landslide） | required | 深层主干；高护甲、战争践踏与召唤小石元素形成持久承伤和多目标压力 |
| 8 | `maraudon_tinkerer_gizlock` | 工匠吉兹洛克（Tinkerer Gizlock） | optional | 岔路地精 Boss；龙息、炸弹和远程攻击强调打断与范围恢复 |
| 9 | `maraudon_rotgrip` | 洛特格里普（Rotgrip） | optional | 地下水域中的白色鳄鱼；撕裂流血和高近战伤害形成单坦克持续治疗压力 |
| 10 | `maraudon_princess_theradras` | 瑟莱德丝公主（Princess Theradras） | required | 最终 Boss；尘土力场、击退、范围伤害与高生命值构成主线终战，击败后记录玛拉顿首通 |

诺克赛恩、维利塔恩、被诅咒的塞雷布拉斯、兰斯利德和瑟莱德丝公主构成主线首通。锐刺鞭笞者、工匠吉兹洛克、洛特格里普与贱民的指引必须在出发前主动勾选。收割者麦什洛克使用活动种子随机出现；若出现则按正常 Encounter 结算，但不阻挡主线全通。

首版不为橙色、紫色入口建立命名路线变体。一次活动仍按稳定顺序覆盖两翼主干，普通可选节点用于表达岔路；这样既保留完整主要 Boss，又不会让玩家为首通必须清理所有支路。

## Boss 专属装备池

AtlasLootClassic 与 Wowhead Classic XML 交叉核对出 34 件非世界装备：常驻 Boss 31 件，随机稀有 Boss 3 件。玛拉顿没有需要录入的随机词缀装备。

| Boss | 物品 ID | 装备 | 栏位 |
|---|---:|---|---|
| Noxxion | 17746 | 诺克赛恩的镣铐 | 板甲护腕 |
| Noxxion | 17744 | 诺克赛恩之心 | 饰品 |
| Noxxion | 17745 | 诺克赛恩魔杖 | 魔杖 |
| Razorlash | 17749 | 树皮肩铠 | 皮甲肩部 |
| Razorlash | 17748 | 腐藤便鞋 | 布甲脚部 |
| Razorlash | 17750 | 绿瘤束带 | 布甲腰部 |
| Razorlash | 17751 | 藤蔓护腿 | 皮甲腿部 |
| Lord Vyletongue | 17755 | 萨特之鬃 | 布甲腰部 |
| Lord Vyletongue | 17754 | 恶魔欺诈者护腿 | 锁甲腿部 |
| Lord Vyletongue | 17752 | 萨特之刺 | 单手匕首 |
| Meshlok the Harvester | 17767 | 花苗头饰 | 锁甲头部 |
| Meshlok the Harvester | 17741 | 自然的拥抱 | 布甲胸部 |
| Meshlok the Harvester | 17742 | 蘑菇护甲 | 皮甲胸部 |
| Celebras the Cursed | 17740 | 抚慰者头饰 | 皮甲头部 |
| Celebras the Cursed | 17739 | 丛林守护者披风 | 背部 |
| Celebras the Cursed | 17738 | 塞雷布拉斯之爪 | 副手拳套 |
| Landslide | 17734 | 山脉头盔 | 板甲头部 |
| Landslide | 17736 | 石钳护手 | 锁甲手部 |
| Landslide | 17737 | 云石 | 副手物品 |
| Landslide | 17943 | 石拳 | 主手锤 |
| Tinkerer Gizlock | 17718 | 吉兹洛克的高科技圆盾 | 盾牌 |
| Tinkerer Gizlock | 17717 | 超射程精密步枪 | 枪械 |
| Tinkerer Gizlock | 17719 | 发明家的聚焦剑 | 单手剑 |
| Rotgrip | 17732 | 洛特格里普衬肩 | 布甲肩部 |
| Rotgrip | 17728 | 白鳄长靴 | 皮甲脚部 |
| Rotgrip | 17730 | 鳄齿利斧 | 双手斧 |
| Princess Theradras | 17780 | 无尽黑暗之刃 | 主手匕首 |
| Princess Theradras | 17715 | 瑟莱德丝之眼 | 布甲头部 |
| Princess Theradras | 17707 | 碎玉之心 | 项链 |
| Princess Theradras | 17714 | 岩石公主护腕 | 锁甲护腕 |
| Princess Theradras | 17711 | 元素石脊护腿 | 板甲腿部 |
| Princess Theradras | 17713 | 黑石戒指 | 戒指 |
| Princess Theradras | 17710 | 焦石飞镖 | 主手匕首 |
| Princess Theradras | 17766 | 瑟莱德丝公主的节杖 | 双手锤 |

所有拥有装备池的 Boss 每次胜利保证掉落一件装备，池内按 Classic 公开掉落率录入相对权重。无尽黑暗之刃保留其史诗品质和低权重，但不额外增加第二次独立掉落判定。贱民的指引只用于成员任务，不建立公共 Boss 装备池。

诺克赛恩的酸液、维利塔恩掉落的塞雷布拉斯钻石、塞雷布拉斯节杖相关物品、五可汗宝石和无名预言者护符均属于任务或通行用途，不作为可分配装备掉落。普通怪 BoE 与世界掉落也全部排除。

## 成员副本任务与奖励

只录入具有可培养装备奖励、且能由已建模路线稳定判断完成的任务。阵营差异不模拟；共同目标和奖励合并为中立成员任务。

| 经典任务 | 轻量完成条件 | 装备奖励 | 录入决定 |
|---|---|---|---|
| Vyletongue Corruption（7029） | 主动安排并完成橙色入口的诺克赛恩与锐刺鞭笞者节点，压缩净化邪恶藤蔓过程 | 17768 树种之环 / 17778 山艾束腰 / 17770 枝爪护手 三选一 | 录入；需要明确选择橙色支路，不允许只刷最终 Boss 自动完成 |
| The Pariah's Instructions（7067） | 主动安排“贱民的指引”可选事件，压缩无名预言者与五可汗护符流程 | 17774 天选者印记 | 录入；任务物品不入背包，事件本身无公共战利品 |
| Twisted Evils（7028） | 主动完成紫色入口的维利塔恩与被诅咒的塞雷布拉斯，压缩收集瑟莱德丝水晶雕像过程 | 17775 聪颖长袍 / 17776 轻环头盔 / 17777 无情链甲 / 17779 巨石肩铠 四选一 | 录入；以清理紫色主干表达足够的实例内收集进度 |
| Corruption of Earth and Seed（7065） | 击败瑟莱德丝公主 | 17705 痛击之刃 / 17753 绿色守护者之弓 / 17743 苏醒之杖 三选一 | 录入；最终 Boss 胜利即可确定完成 |
| Legends of Maraudon（7044） | 击败诺克赛恩与维利塔恩取得组件，再击败被诅咒的塞雷布拉斯 | 17191 塞雷布拉斯节杖 | 排除；核心价值是副本传送，不是成员战斗培养装备，当前系统也没有钥匙或传送物品栏 |
| Seed of Life、Shadowshard Fragments、Khan Hratha 等 | 与实例外地区、普通怪材料或后续交付有关 | 无直接可培养装备或只有消耗品 | 排除；不模拟副本外步骤、普通怪材料和消耗品 |

成员任务仍需参战成员主动接取、完成和领取；任务奖励直接进入该成员装备候选，不进入公共待分配区。可选事件和可选 Boss 未被玩家安排时，不会为了任务而在离线期间自动补做。

## 机制候选

- 诺克赛恩：分裂阶段使用 `area_damage` 和额外治疗需求表达，不新增必须等待的实时无敌阶段。
- 锐刺鞭笞者：横扫与击退强调坦克稳定和范围恢复，以 `area_damage` 表达。
- 维利塔恩：两名随从使用 `crowd_control`，毒素与暗影法术使用 `poison_dispel`、`interrupt` 表达。
- 收割者麦什洛克：孢子与自然伤害作为轻量随机稀有战，使用 `poison_dispel` 和范围恢复压力。
- 被诅咒的塞雷布拉斯：树人随从使用 `area_damage`，纠缠根须使用 `magic_dispel`，治疗之触使用 `interrupt`。
- 兰斯利德：高护甲、战争践踏和小石元素使用坦克需求、`area_damage` 与持久输出表达。
- 工匠吉兹洛克：龙息、闪光炸弹与枪击使用 `interrupt`、`area_damage` 和远程伤害优势表达。
- 洛特格里普：流血撕咬和高近战伤害提高坦克与单体治疗需求，不实现水下移动。
- 瑟莱德丝公主：尘土力场、击退与群体伤害强调坦克、治疗、远程输出和 `area_damage`；不模拟位置碰撞。
- 贱民的指引：作为短时可选任务事件，使用多目标和控制需求表达五可汗流程，不产生 Boss 装备。

第一版不实现副本内实时寻路、两入口传送、塞雷布拉斯节杖物品、瀑布跳跃、水下移动、击退位置、藤蔓交互、任务物品背包或普通怪材料计数。

## 解锁与阶段衔接

- 解锁条件：祖尔法拉克主线首通。
- 最低等级：45；推荐等级：49。
- 推荐人数：5；允许人数沿用普通五人副本规则。
- 主路线目标耗时：约 22 分钟；所有普通可选节点全开后约 29 分钟，仍受高等级碾压最短耗时下限保护。
- 首通效果：解锁阿塔哈卡神庙；不自动安排下一次活动，也不发放后台收益。
- 重复挑战：首通后永久可刷，Boss 掉落、成员任务和图鉴继续正常结算。

## 来源

1. [Wowhead Classic 玛拉顿攻略](https://www.wowhead.com/classic/guide/maraudon-dungeon-strategy-wow-classic)：路线、Boss 顺序、可选/稀有边界、机制、任务入口和 Boss 装备归属。
2. [Wowhead Classic 玛拉顿任务列表](https://www.wowhead.com/classic/zone=2100/maraudon#quests)：任务目标、阵营边界与奖励候选。
3. [AtlasLootClassic 数据仓库](https://github.com/Hoizame/AtlasLootClassic/blob/master/AtlasLootClassic_DungeonsAndRaids/data.lua)：交叉核对 15 个 Boss/任务记录、9 张装备掉落表和 34 件 Boss 装备。
4. Wowhead Classic 中文物品 XML：34 件 Boss 装备和 11 件任务奖励的中文名、品质、栏位、图标、需求等级与常驻属性。

## D16.A 验收清单

- [x] 10 个路线节点完成 required/optional/rare 分类，最终 Boss 与主线首通定义明确。
- [x] 橙色、紫色入口和瀑布深层在单一副本定义中的压缩方式明确。
- [x] 34 件 Boss 装备完成 AtlasLootClassic 与 Classic XML 交叉核对。
- [x] 收割者麦什洛克按随机稀有节点处理，其 3 件独特装备全部保留。
- [x] 11 件成员任务奖励完成 XML 核对，四条任务均可由主动安排的路线稳定判断完成。
- [x] 任务物品、世界掉落、普通怪 BoE、材料、配方、消耗品和传送权能明确排除。
- [x] 解锁关系、等级、人数、耗时和首通后的重复挑战边界明确。
- [x] 所有正式内容使用 `classic-2019-phase-6`，没有探索赛季或后续版本数据。
