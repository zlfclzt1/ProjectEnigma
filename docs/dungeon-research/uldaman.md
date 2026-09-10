# 奥达曼（Uldaman）资料清单

- 内容 ID：`uldaman`
- 研究阶段：D14.A
- 目标版本：`classic-2019-phase-6`
- 核对日期：2026-09-09
- 状态：资料清单完成，等待 D14.B 装备、随机词缀与掉落录入

## 版本与产品边界

本清单采用 2019 经典怀旧服最终阶段的奥达曼资料。原版资料将其定位为约 40–45 级的长路线副本；本游戏在剃刀高地首通后解锁，以 30 分钟左右的完整路线、石像高护甲、多目标控制和最终 Boss 持久战为目标。

普通怪 BoE、世界掉落、弹药、药水、材料、配方、任务物品和副本外洞穴内容不进入 Boss 装备池。挖掘专家舒尔弗拉格位于实例入口外，不能作为副本内随机稀有 Boss；奥达曼实例内没有需要录入的随机稀有 Boss。所有收益仍只来自玩家主动安排的远征。

原版联盟不会与失踪的矮人交战，但本游戏不模拟阵营。为了保留完整路线与三名首领的六件独特装备，巴尔洛戈、埃瑞克和奥拉夫统一建模为一场“失踪的矮人”遭遇，对所有公会开放。

## Boss 与路线

奥达曼有前后两个入口和大量岔路。放置路线采用从正门到诺甘农圆盘的稳定顺序，不模拟实时寻路、开门物品背包或阵营差异。

| 顺序 | Encounter ID | Boss / 事件 | 路线分类 | 说明 |
|---:|---|---|---|---|
| 1 | `uldaman_lost_dwarves` | 失踪的矮人（Baelog、Eric、Olaf） | required | 三首领连续战；保留各自独立掉落池并在一次遭遇内结算 |
| 2 | `uldaman_revelosh` | 鲁维罗什（Revelosh） | required | 闪电链与两名石窟咀嚼者；掉落索尔之杖任务组件 |
| 3 | `uldaman_ironaya` | 艾隆纳亚（Ironaya） | optional | 合成史前法杖后开启密室；高护甲、击退与战争践踏 |
| 4 | `uldaman_obsidian_sentinel` | 黑曜石哨兵（Obsidian Sentinel） | optional | 后门附近的法师任务首领；只有任务物品 8053，没有装备池 |
| 5 | `uldaman_ancient_stone_keeper` | 古代的石头看守者（Ancient Stone Keeper） | required | 高护甲、减速和沉默沙暴 |
| 6 | `uldaman_galgann_firehammer` | 加加恩·火锤（Galgann Firehammer） | required | 两名地质学家随从、火焰增幅和范围火焰 |
| 7 | `uldaman_grimlok` | 格瑞姆洛克（Grimlok） | required | 三名随从、缩小、嗜血和闪电链 |
| 8 | `uldaman_archaedas` | 阿扎达斯（Archaedas） | required | 最终 Boss；分阶段唤醒土灵守卫和精英守卫 |

失踪的矮人、鲁维罗什、古代的石头看守者、加加恩、格瑞姆洛克和阿扎达斯构成主线首通。艾隆纳亚和黑曜石哨兵必须由玩家出发前主动勾选；未安排时不会产生经验、资金、任务推进或装备。副本没有随机稀有节点。

## Boss 专属装备池

AtlasLootClassic 与 Wowhead Classic 交叉核对出 25 件非世界装备。失踪的矮人虽然合并为一个 Encounter，掉落结算仍保留三名首领各一件保证装备的原版语义，因此该遭遇合计保证 3 件装备；其他拥有装备池的 Boss 保证 1 件。黑曜石哨兵的 8053 是任务物品“黑曜石能量源”，不创建装备掉落表。

| Boss | 物品 ID | 装备 | 栏位 |
|---|---:|---|---|
| Eric “The Swift” | 9394 | 海盗角盔 | 板甲头部 |
| Eric “The Swift” | 9398 | 穿旧的跑鞋 | 皮甲脚部 |
| Baelog | 9401 | 盗匪长剑 | 单手剑 |
| Baelog | 9400 | 巴尔洛戈的短弓 | 弓 |
| Olaf | 9404 | 奥拉夫之盾 | 盾牌 |
| Olaf | 9403 | 破碎的海盗之盾 | 盾牌 |
| Revelosh | 9389 | 鲁恩乌的肩甲 | 皮甲肩部，随机词缀 |
| Revelosh | 9388 | 鲁恩乌的臂甲 | 锁甲护腕，随机词缀 |
| Revelosh | 9390 | 鲁恩乌的手套 | 布甲手套，随机词缀 |
| Revelosh | 9387 | 鲁恩乌的长靴 | 板甲脚部，随机词缀 |
| Ironaya | 9409 | 艾隆纳亚的护腕 | 锁甲护腕，随机词缀 |
| Ironaya | 9407 | 石纹护腿 | 布甲腿部 |
| Ironaya | 9408 | 铁头棒 | 双手法杖 |
| Ancient Stone Keeper | 9410 | 山壁之拳 | 板甲手套，随机词缀 |
| Ancient Stone Keeper | 9411 | 石片肩铠 | 锁甲肩部 |
| Galgann Firehammer | 11310 | 烈焰先知衬肩 | 布甲肩部 |
| Galgann Firehammer | 9412 | 加加恩的火枪 | 枪械 |
| Galgann Firehammer | 11311 | 灰烬之鳞 | 背部 |
| Galgann Firehammer | 9419 | 加加恩的火锤 | 单手锤 |
| Grimlok | 9415 | 格瑞姆洛克的部族法衣 | 布甲胸部 |
| Grimlok | 9416 | 格瑞姆洛克之矛 | 双手长柄武器 |
| Grimlok | 9414 | 油腻的护腿 | 皮甲腿部 |
| Archaedas | 11118 | 阿扎达斯之石 | 戒指，随机词缀 |
| Archaedas | 9413 | 轰石之锤 | 双手锤 |
| Archaedas | 9418 | 斩石者 | 双手剑 |

弹药 9399、药水 2459 和 1177、任务组件 7741、7670 与 8053 均不进入装备池。普通怪 BoE、远古宝箱绿装和副本外挖掘专家掉落也全部排除。

## 随机词缀

7 件装备在 Classic Tooltip 中明确标记“随机附魔”：9389、9388、9390、9387、9409、9410、11118。D14.B 使用每件装备自己的词缀池，按 Wowhead Classic 页面公开的相对出现率录入；同名词缀在不同基础物品上的权重不能强行共用。

当前词缀 Schema 只能为一个物品等级档位保存确定属性，无法表达页面上同一词缀的 `8–9` 这类细小数值浮动。D14.B 采用区间上限作为该物品等级的确定属性，并在来源覆盖中明确记录；词缀种类和相对权重保持原版页面数据。这样掉落、存档、图鉴、愿望单与战力计算仍拥有唯一且稳定的最终结果，不在内容任务中扩张装备实例协议。

## 成员副本任务与奖励

只录入由实例内已建模路线能够确定完成、且奖励可装备物品的任务。阵营差异不模拟；联盟与部落修复项链的最终奖励属性相同，因此合并为中立任务并使用一个共享装备定义。

| 经典任务 | 轻量完成条件 | 装备奖励 | 录入决定 |
|---|---|---|---|
| The Hidden Chamber（2240） | 击败失踪的矮人、鲁维罗什和艾隆纳亚并进入密室 | 9626 矮人冲锋斧 / 9627 探险者联盟徽记 二选一 | 录入；以三个 Encounter 胜利表达钥匙与开门流程 |
| The Lost Tablets of Will（1139） | 击败加加恩并取得房间内的意志石板 | 6723 勇气勋章 | 录入；固定奖励 |
| Restoring the Necklace / Necklace Recovery（2204 / 2341） | 完成失踪的矮人、鲁维罗什、加加恩、格瑞姆洛克和阿扎达斯路线 | 7673 / 7888（同属性项链） | 合并为中立任务；录入一个固定奖励定义 |
| Power in Uldaman（1956） | 击败黑曜石哨兵并取得 8053 | 最终只有经验；职业链装备在更早的副本外步骤发放 | 排除；8053 不是装备 |
| The Platinum Discs（2278） | 击败阿扎达斯后聆听圆盘 | 药水和 14 格容器 | 排除；当前系统不模拟背包容量和消耗品 |
| Solution to Doom、Power Stones、Reclaimed Treasures、Agmond's Fate | 收集实例外洞穴或野外物品 | 多件装备候选 | 排除；目标不能由奥达曼实例路线确定完成 |
| Uldaman Reagent Run | 收集蘑菇 | 药水 / 配方 | 排除；无装备奖励 |

## 机制候选

- 失踪的矮人：三目标战，使用 `crowd_control` 和坦克承伤表达控制巴尔洛戈、优先击杀埃瑞克。
- 鲁维罗什：闪电链和两个随从使用 `interrupt`、`area_damage` 表达。
- 艾隆纳亚：高护甲、正面顺劈、战争践踏和击退强调坦克稳定与物理输出压力。
- 黑曜石哨兵：两次召唤黑曜石碎片，使用 `area_damage` 表达阶段转火。
- 古代的石头看守者：沙暴减速与沉默，使用 `interrupt` 或范围恢复压力表达。
- 加加恩：火焰增幅和地质学家范围伤害使用 `magic_dispel`、`crowd_control`、`interrupt`。
- 格瑞姆洛克：三名随从和缩小效果使用 `crowd_control`、`magic_dispel`、`area_damage`。
- 阿扎达斯：持续唤醒守卫和 20% 精英阶段使用 `area_damage`，并提高坦克、治疗和持久输出需求。

第一版不实现阵营友善、钥匙背包、双入口寻路、实时开门、击退位置、阶段血量、圆盘对话或容器容量。

## 公会扩建

奥达曼主线首通后开放第四次成员容量扩建：`guild_roster_30`，顺序 40，费用 10,000 G，成员上限从 25 提升至 30。解锁资格本身不自动扣款，也不产生离线收益。

## 来源

1. [Wowhead Classic 奥达曼攻略](https://www.wowhead.com/classic/guide/uldaman-dungeon-strategy-wow-classic)：Boss 路线、机制、失踪的矮人阵营差异、装备归属与随机属性标记。
2. [Wowhead Classic 奥达曼任务攻略](https://www.wowhead.com/classic/guide/classic-wow-uldaman-dungeon-quests)：任务目标、实例内外边界与装备奖励。
3. [AtlasLootClassic 数据仓库](https://github.com/Hoizame/AtlasLootClassic/blob/master/AtlasLootClassic_DungeonsAndRaids/data.lua)：交叉核对 10 个首领记录、25 件装备和任务物品归属。
4. Wowhead Classic 中文物品 XML：25 件 Boss 装备和 5 个任务奖励 ID 的中文名、品质、栏位、图标、需求等级与常驻属性。
5. Wowhead Classic 7 件随机属性物品页面：逐件核对随机词缀种类、属性区间和公开相对出现率。

## D14.A 验收清单

- [x] 8 个路线节点完成 required/optional 分类，最终 Boss 与主线首通定义明确。
- [x] 失踪的矮人按一场三首领遭遇、三份独立保证掉落处理。
- [x] 25 件 Boss 装备完成 Classic XML 与 AtlasLootClassic 交叉核对。
- [x] 7 件随机属性装备的词缀来源与当前 Schema 映射策略明确。
- [x] 黑曜石哨兵的 8053 已确认是任务物品而非装备。
- [x] 3 条实例内装备任务完成目标与奖励核对；副本外、材料、消耗品和容器任务明确排除。
- [x] 第四次公会扩建的费用、容量和前置首通已确认。
- [x] 所有正式内容使用 `classic-2019-phase-6`，没有探索赛季或后续版本数据。
