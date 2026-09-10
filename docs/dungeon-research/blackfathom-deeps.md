# 黑暗深渊（Blackfathom Deeps）资料清单

- 内容 ID：`blackfathom_deeps`
- 研究阶段：D05.A
- 目标版本：`classic-2019-phase-6`
- 核对日期：2026-09-09
- 状态：资料清单完成，等待 D05.B 录入装备与掉落

## 版本边界

本清单只采用 2019 经典旧世五人副本资料。探索赛季（Season of Discovery）把黑暗深渊改造成升级团队副本，新增的套装、饰品、机制和 Boss 掉落全部排除，不得混入正式内容。

## 副本与路线

经典资料将黑暗深渊列为 24–32 级区间，最低进入等级约为 15；本项目的推荐等级、耗时、成功率和解锁条件属于设计值，待 D05.C/D 录入。主线候选顺序如下：

| 顺序 | Encounter ID | Boss | 路线分类 | 备注 |
|---:|---|---|---|---|
| 1 | `bfd_ghamoo_ra` | 加摩拉（Ghamoo-Ra） | required | 龟洞入口主线 |
| 2 | `bfd_lady_sarevess` | 瑟拉维斯（Lady Sarevess） | required | 纳迦区域主线 |
| 3 | `bfd_gelihast` | 格里哈斯特（Gelihast） | required | 暮光信徒区域 |
| 4 | `bfd_lorgus_jett` | 洛古斯·杰特（Lorgus Jett） | optional | 普通可选 Boss；需要单独确认经典路线位置 |
| 5 | `bfd_baron_aquanis` | 阿奎尼斯男爵（Baron Aquanis） | optional | 部落任务相关 Boss |
| 6 | `bfd_old_serrakis` | 老年克尔里斯（Old Serra'kis） | required | 深水区域主线 |
| 7 | `bfd_twilight_lord_kelris` | 梦游者克尔里斯（Twilight Lord Kelris） | required | 黑暗深渊任务核心目标 |
| 8 | `bfd_akumai` | 阿库麦尔（Aku'mai） | required | 最终 Boss |

Lorgus Jett 的具体路线位置和是否作为普通可选节点，需在 D05.C 录入前再次用经典副本路线资料核对；不得引用探索赛季版本的路线或机制。

## Boss 专属装备候选

以下清单来自 Classic Wowhead 的黑暗深渊 Boss 掉落汇总。这里只保留装备，不录入世界掉落、绑定拾取以外的 BoE 推荐列表、背包、任务物品和材料。D05.B 必须为每件装备补齐稳定物品 ID、属性、图标和第二来源交叉核对。

| Boss | 装备候选 |
|---|---|
| Ghamoo-Ra | Tortoise Armor；Ghamoo-ra's Bind |
| Lady Sarevess | Naga Battle Gloves；Darkwater Talwar；Naga Heartpiercer |
| Gelihast | Algae Fists；Reef Axe |
| Twilight Lord Kelris | Rod of the Sleepwalker；Gaze Dreamer Pants |
| Old Serra'kis | Glowing Thresher Cape；Bands of Serra'kis；Bite of Serra'kis |
| Aku'mai | Leech Pants；Moss Cinch；Strike of the Hydra |

原始汇总没有为 Lorgus Jett 和 Baron Aquanis 列出经典五人副本专属装备；初始实现应允许这两个节点无装备掉落，不能把探索赛季新增物品或任务奖励伪装成 Boss 掉落。

### 明确排除

- Wowhead 的 Noteworthy BoE 列表：Axe of the Enforcer、Grimclaw、Doomspike、Evocator's Blade、Crested Scepter、Staff of the Friar、Staff of the Blessed Seer、Onyx Claymore、Ring of Precision、Tree Bark Jacket、Martyr's Chain。它们属于世界/绑定类型候选，不进入当前副本专属装备池。
- Strange Water Globe、Lorgalis Manuscript、Twilight Pendant、Corrupted Brain Stem 等任务物品不进入装备图鉴。
- Season of Discovery 的升级团队副本套装、首饰、武器、职业套装和新 Boss 机制全部排除。

## 任务候选

经典任务资料中与副本直接相关的内容很多带有阵营、前置链和跑腿步骤。本项目只抽取“成员主动安排副本活动即可完成”的轻量目标：

| 任务 ID（暂定） | 经典任务 | 轻量完成条件 | 奖励处理 |
|---|---|---|---|
| `bfd_blackfathom_villainy` | Blackfathom Villainy | 击败 Twilight Lord Kelris | Arctic Buckler / Gravestone Scepter 二选一 |
| `bfd_twilight_falls` | Twilight Falls | 完成黑暗深渊主线并击败指定区域 Boss | Nimbus Boots / Heartwood Girdle 二选一 |
| `bfd_barons_aquanis` | Baron Aquanis | 击败 Baron Aquanis | Outlaw Sabre / Witch's Finger 二选一；仅在保留可选 Boss 时启用 |

阵营限制、任务书籍、拾取材料和声望奖励在当前轻量系统中不模拟。D05.C 只应录入 1–2 个最有培养价值、能由副本结算直接判断的任务，避免把跑腿链硬塞进副本任务状态。

## 机制候选

经典五人副本机制只用于内容叙事和战斗能力检查，不复刻探索赛季的团队技能：

- Ghamoo-Ra：护甲削弱/持续伤害候选。
- Lady Sarevess：纳迦水域与远程压力候选。
- Twilight Lord Kelris：睡眠/暗影控制候选。
- Aku'mai：最终 Boss 的持续恢复压力候选。

每个机制在 D05.C 只引用已有 `mechanics` Schema；若需要新能力字段，应先拆成架构任务，不能在本副本提交中硬编码。

## 来源

1. [Wowhead Classic 黑暗深渊副本攻略与 Boss 掉落汇总](https://www.wowhead.com/classic/guide/blackfathom-deeps-dungeon-strategy-wow-classic)：路线区间、经典 Boss 专属装备候选和 BoE 排除项。
2. [Wowhead Classic 黑暗深渊任务攻略](https://www.wowhead.com/classic/guide/classic-wow-blackfathom-deeps-dungeon-quests)：任务目标、任务奖励和阵营/前置链信息。
3. [Wowhead Classic 副本总览](https://www.wowhead.com/classic/guide/classic-dungeons-overview)：推荐等级区间和经典 Encounter 清单。
4. [AtlasLootClassic 数据仓库](https://github.com/Hoizame/AtlasLootClassic/blob/master/AtlasLootClassic_DungeonsAndRaids/data.lua)：D05.B 录入前用于掉落关系和物品 ID 的第二来源交叉核对。

## D05.B 验收清单

- [ ] 15 件 Boss 专属装备候选逐件核对稳定 ID。
- [ ] Lorgus Jett、Baron Aquanis 是否无装备掉落有第二来源记录。
- [ ] 任务奖励与 Boss 掉落池没有重复物品。
- [ ] 所有装备均使用 `classic-2019-phase-6` 的来源元数据。
- [ ] 探索赛季新增内容未进入正式内容文件。
