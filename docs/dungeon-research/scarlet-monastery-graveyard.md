# 血色修道院：墓地（Scarlet Monastery Graveyard）资料清单

- 内容 ID：`scarlet_monastery_graveyard`
- 研究阶段：D09.A
- 目标版本：`classic-2019-phase-6`
- 核对日期：2026-09-09
- 状态：资料清单完成，等待 D09.B 录入装备与掉落

## 版本与产品边界

本清单采用 2019 经典旧世血色修道院墓地分区资料。墓地属于四个独立分区中的低等级起点，经典资料建议等级约 26–36；当前游戏不模拟阵营、钥匙、跨地图交付、节日 Boss、世界掉落或普通怪掉落。血色修道院的跨分区任务奖励要等 D12 阶段终点统一处理。

墓地路线保留 Interrogator Vishas 与 Bloodmage Thalnos 两个必经 Boss，并保留 Azshir、Fallen Champion、Ironspine 三选一的随机稀有节点。稀有节点的结果在活动快照中确定；玩家没有主动安排的稀有 Boss 不产生离线收益。

## Boss 与路线

| 顺序 | Encounter ID | Boss | 路线分类 | 说明 |
|---:|---|---|---|---|
| 1 | `scarlet_gy_interrogator_vishas` | 审讯官维萨斯（Interrogator Vishas） | required | 起始房间首领；近战与随从压力 |
| 2 | `scarlet_gy_azshir_the_sleepless` | 不眠的阿齐尔（Azshir the Sleepless） | rare | 三个墓地稀有之一；恐惧与吸取生命 |
| 3 | `scarlet_gy_fallen_champion` | 堕落的勇士（Fallen Champion） | rare | 三个墓地稀有之一；顺劈近战 |
| 4 | `scarlet_gy_ironspine` | 铁脊（Ironspine） | rare | 三个墓地稀有之一；毒云与诅咒 |
| 5 | `scarlet_gy_bloodmage_thalnos` | 血法师萨尔诺斯（Bloodmage Thalnos） | required | 最终 Boss；暗影、火焰范围压力 |

经典资料说明墓地每次通常只出现三个稀有中的一个；本游戏将其表达为三个同一位置的 `rare` 节点，并在路线选择时保持最多一个稀有结果。Scorn、无头骑士等事件/节日内容不进入 Classic 2019 常驻装备池。

## Boss 专属装备池

以下 13 件为经典墓地 Boss 的非世界掉落装备，D09.B 应逐件通过 Classic XML 核对名称、图标、属性、需求等级和物品 ID，并使用 Classic 攻略与 AtlasLootClassic 交叉核对。

| Boss | 物品 ID | 装备 |
|---|---:|---|
| Interrogator Vishas | 7683 | Bloody Brass Knuckles |
| Interrogator Vishas | 7682 | Torturing Poker |
| Bloodmage Thalnos | 7684 | Bloodmage Mantle |
| Bloodmage Thalnos | 7685 | Orb of the Forgotten Seer |
| Azshir the Sleepless | 7708 | Necrotic Wand |
| Azshir the Sleepless | 7731 | Ghostshard Talisman |
| Azshir the Sleepless | 7709 | Blighted Leggings |
| Fallen Champion | 7690 | Ebon Vise |
| Fallen Champion | 7691 | Embalmed Shroud |
| Fallen Champion | 7689 | Morbid Dawn |
| Ironspine | 7686 | Ironspine's Eye |
| Ironspine | 7688 | Ironspine's Ribcage |
| Ironspine | 7687 | Ironspine's Fist |

所有拥有专属装备池的 Boss 首轮保证掉落一件，池内初始使用等权权重。普通怪装备、BoE、材料和 Scorn/节日物品排除；任务奖励不进入 Boss 掉落池。

## 任务与奖励候选

墓地直接关联的主要任务是 Horde 的 Vorrel's Revenge。该任务原版包含墓地内接取、跨区域击杀和塔伦米尔交付；当前系统可压缩为成员实际参与 Vishas 节点后完成，奖励保留真实选择：

| 经典任务 | 轻量完成条件 | 奖励 | 录入建议 |
|---|---|---|---|
| Vorrel's Revenge | 参与击败 Interrogator Vishas | 7751 Vorrel's Boots；7750 Mantle of Woe / 4643 Grimsteel Cape 二选一 | D09.C 优先录入 |
| In the Name of the Light | 跨墓地、图书馆、军械库和大教堂击败指定 Boss | 6829 Sword of Serenity、6830 Bonebiter、6948? Black Menace、? Orb of Lorica | 延后至 D12，不能在墓地分区单独结算 |
| Into The Scarlet Monastery | 跨四个分区击败主要 Boss | Sword of Omen、Prophetic Cane、Dragon's Blood Necklace | 延后至 D12，作为阶段任务 |

`In the Name of the Light` 与 `Into The Scarlet Monastery` 的完整奖励 ID 需在正式录入前逐件 XML 核对；D09 只录入 Vorrel's Revenge，避免把跨分区奖励错误归入墓地。

## 机制候选

- Vishas：Shadow Word: Pain、Immolation 与随从，使用坦克/治疗压力建议机制。
- Azshir：恐惧、Call of the Grave、Soul Siphon，使用打断与魔法驱散建议机制。
- Fallen Champion：Cleave，使用坦克承伤与站位抽象压力。
- Ironspine：Poison Cloud、Curse of Weakness，使用治疗压力与魔法驱散建议机制。
- Thalnos：Shadow Bolt、Fire Nova/范围伤害，使用打断与治疗压力建议机制。

第一版不实现实时站位、恐惧路径或墓地小怪刷新；机制必须通过现有 `recommended` 能力模型表达，D09.D 再以固定种子校准 10 分钟目标。

## 来源

1. [Wowhead Classic 血色修道院攻略](https://www.wowhead.com/classic/guide/scarlet-monastery-dungeon-strategy-wow-classic)：墓地 Boss、稀有刷新、机制与装备列表。
2. [Wowhead Classic 血色修道院任务攻略](https://www.wowhead.com/classic/guide/classic-wow-scarlet-monastery-dungeon-quests)：Vorrel's Revenge 与跨分区任务边界。
3. [Warcraft Wiki 血色修道院墓地](https://warcraft.wiki.gg/wiki/Scarlet_Monastery_Graveyard)：Boss 分类、等级区间和装备归属交叉核对。

## D09.A 验收清单

- [x] 2 个必经 Boss 与 3 个互斥随机稀有 Boss 完成路线分类。
- [x] 13 件 Boss 专属装备完成 Classic XML 核对。
- [x] Vorrel's Revenge 奖励完成 XML 核对并保持任务/Boss 来源分离。
- [x] 跨四分区任务延后至 D12，不在墓地重复发放。
- [x] Scorn、无头骑士、普通怪 BoE、节日与世界掉落已排除。
- [x] 所有来源标记为 `classic-2019-phase-6`，没有探索赛季或重制数据。
