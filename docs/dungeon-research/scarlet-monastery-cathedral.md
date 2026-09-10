# 血色修道院：大教堂（Scarlet Monastery Cathedral）资料清单

- 内容 ID：`scarlet_monastery_cathedral`
- 研究阶段：D12.A
- 目标版本：`classic-2019-phase-6`
- 核对日期：2026-09-09
- 状态：资料清单完成，等待跨副本任务基础能力与 D12.B 装备录入

## 版本与产品边界

本清单采用 2019 经典旧世血色修道院大教堂分区资料。经典攻略建议等级为 35–45；本游戏在军械库首通后解锁，并以 18 分钟左右的完整路线为目标。原版大教堂和军械库都需要血色十字军钥匙，当前放置模型继续使用图书馆至军械库的首通链表达门禁，不维护钥匙背包。

普通怪 BoE、世界掉落、布料、钥匙和非装备物品不进入 Boss 装备池。所有收益仍只来自玩家主动安排的远征；大教堂解锁、跨分区任务接取和公会扩建资格本身都不会自动产生经验、资金或装备收益。

## Boss 与路线

| 顺序 | Encounter ID | Boss | 路线分类 | 说明 |
|---:|---|---|---|---|
| 1 | `scarlet_cathedral_high_inquisitor_fairbanks` | 大检察官法尔班克斯（High Inquisitor Fairbanks） | optional | 隐藏在侧室后的可选 Boss；诅咒、恐惧、睡眠、护盾与治疗 |
| 2 | `scarlet_cathedral_commander_mograine` | 血色十字军指挥官莫格莱尼（Scarlet Commander Mograine） | required | 主线第一阶段；制裁、圣盾与近战爆发 |
| 3 | `scarlet_cathedral_high_inquisitor_whitemane` | 大检察官怀特迈恩（High Inquisitor Whitemane） | required | 主线最终阶段；群体沉睡后复活莫格莱尼，并治疗两人 |

法尔班克斯保留为显式普通可选节点，玩家可以为 3 件专属装备主动选择完整路线。莫格莱尼与怀特迈恩虽然属于一场连续剧情战，但分别拥有独立掉落表和任务目标，因此建模为两个连续 required Encounter；怀特迈恩是分区首通目标。

## Boss 专属装备池

AtlasLootClassic 与 Wowhead Classic 共列出 10 个 Boss 掉落条目，其中 10330 Scarlet Leggings 同时由赫洛德和莫格莱尼掉落，已经在 D11 录入。因此 D12.B 新增 9 件真实装备，并让莫格莱尼掉落表复用 10330：

| Boss | 物品 ID | 装备 | 栏位 |
|---|---:|---|---|
| High Inquisitor Fairbanks | 19507 | Inquisitor's Shawl | 布甲肩部 |
| High Inquisitor Fairbanks | 19508 | Branded Leather Bracers | 皮甲护腕 |
| High Inquisitor Fairbanks | 19509 | Dusty Mail Boots | 锁甲脚部 |
| Scarlet Commander Mograine | 7724 | Gauntlets of Divinity | 锁甲手套 |
| Scarlet Commander Mograine | 10330 | Scarlet Leggings | 锁甲腿部；复用军械库已录入定义 |
| Scarlet Commander Mograine | 7726 | Aegis of the Scarlet Commander | 盾牌 |
| Scarlet Commander Mograine | 7723 | Mograine's Might | 双手锤 |
| High Inquisitor Whitemane | 7720 | Whitemane's Chapeau | 布甲头部 |
| High Inquisitor Whitemane | 7722 | Triune Amulet | 项链 |
| High Inquisitor Whitemane | 7721 | Hand of Righteousness | 主手锤 |

所有新装备均由 Wowhead Classic XML 逐件核对物品等级、需求等级、品质、图标、栏位和常驻属性。拥有专属装备池的 Boss 首轮各保证掉落一件装备，池内权重先采用等权基线。法尔班克斯是普通可选而不是随机稀有 Boss；选择跳过时不会获得其装备、经验或资金。

## 跨分区成员任务与奖励

Classic 任务 `In the Name of the Light`（1053）与 `Into The Scarlet Monastery`（1048）都要求击败洛克希、赫洛德、莫格莱尼和怀特迈恩。它们实际跨图书馆、军械库和大教堂三个分区，不要求墓地 Boss；先前研究文档中的“跨四分区”表述在 D12 修正。

| 经典任务 | Encounter 目标 | 奖励选择 |
|---|---|---|
| In the Name of the Light | Loksey、Herod、Mograine、Whitemane | 6829 Sword of Serenity、6830 Bonebiter、6831 Black Menace、11262 Orb of Lorica 四选一 |
| Into The Scarlet Monastery | Loksey、Herod、Mograine、Whitemane | 6802 Sword of Omen、6803 Prophetic Cane、10711 Dragon's Blood Necklace 三选一 |

两条任务的 7 件奖励已通过 Wowhead Classic XML 的 `sourcemore` 字段确认任务 ID 和奖励归属。阵营、前置世界任务与交付地点仍不模拟，但每名成员必须主动接取，并亲自参加对应分区远征、累计四个 Encounter 胜利后才能领取；公会已有首通不能替代成员参与。

当前任务内容校验要求所有目标 Encounter 属于同一副本，活动快照也只收集当前副本任务，无法正确保存跨分区进度。按照实施计划的架构缺口规则，D12.B 前先拆出独立基础提交，支持任务以一个展示归属副本承载跨副本 Encounter 目标，并让每次相关远征都能推进同一任务。该基础能力必须保持确定性并补齐存档活动快照测试。

## 机制候选

- 法尔班克斯：Heal 需要 `interrupt`，Curse of Blood 可用 `curse_dispel` 表达；恐惧与睡眠合并为治疗压力，不要求特定职业。
- 莫格莱尼：Hammer of Justice、Divine Shield 与高近战爆发形成坦克和持续输出压力，可用 `ranged_damage` 表达圣盾与制裁期间仍能维持安全输出。
- 怀特迈恩：Deep Sleep 与 Scarlet Resurrection 是大教堂标志机制；使用 `interrupt` 表达复活后的治疗与护盾处理，失败时提高治疗需求、战斗时长和失败概率。
- 教堂内密集怪群若未清理会连锁引怪，使用 `crowd_control` 或 `area_damage` 表达路线稳定性，但不新增逐组普通怪节点。

第一版不实现实时站位、仇恨列表、睡眠动画、复活阶段血条、钥匙背包或世界任务链。机制继续通过推荐能力产生可解释的软影响，不把驱散诅咒或任何单一职业设为硬性出发条件。

## 公会扩建

大教堂首通解锁第三次成员容量扩建资格：花费 4,000 公会资金，将成员上限从 20 提升到 25。资格不会自动购买，仍由玩家在公会管理页面主动确认；不产生被动收益。该升级在 D12.C 与副本路线一同接入，并补齐顺序、资金和持久化测试。

## 来源

1. [Wowhead Classic 血色修道院攻略](https://www.wowhead.com/classic/guide/scarlet-monastery-dungeon-strategy-wow-classic)：大教堂等级区间、Boss 顺序、机制、隐藏房间与 Boss 掉落汇总。
2. [AtlasLootClassic 数据仓库](https://github.com/Hoizame/AtlasLootClassic/blob/master/AtlasLootClassic_DungeonsAndRaids/data.lua)：交叉核对法尔班克斯、莫格莱尼、怀特迈恩及 10 个掉落条目。
3. [Wowhead Classic 以圣光之名](https://www.wowhead.com/classic/quest=1053/in-the-name-of-the-light)：4 个 Encounter 目标与 4 件任务奖励。
4. [Wowhead Classic 深入血色修道院](https://www.wowhead.com/classic/quest=1048/into-the-scarlet-monastery)：4 个 Encounter 目标与 3 件任务奖励。
5. Wowhead Classic 物品 XML：9 件新增 Boss 装备与 7 件任务奖励的属性及来源字段。

## D12.A 验收清单

- [x] 法尔班克斯分类为 optional，莫格莱尼与怀特迈恩分类为连续 required。
- [x] 10 个 Boss 掉落条目完成归属核对，确认新增 9 件并复用 10330。
- [x] 普通怪 BoE、世界掉落、钥匙和非装备物品明确排除。
- [x] 两条跨分区任务的 4 个目标与 7 件奖励 ID 完成 XML 核对。
- [x] 任务实际跨三个分区、不要求墓地 Boss 的边界已修正。
- [x] 跨副本成员任务的现有架构缺口已识别并拆分为前置基础提交。
- [x] 第三次公会扩建的 25 人上限、4,000 资金和大教堂首通条件已确认。
- [x] 所有来源标记为 `classic-2019-phase-6`，没有探索赛季或重制数据。
