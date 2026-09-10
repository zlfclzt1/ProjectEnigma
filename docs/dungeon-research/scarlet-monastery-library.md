# 血色修道院：图书馆（Scarlet Monastery Library）资料清单

- 内容 ID：`scarlet_monastery_library`
- 研究阶段：D10.A
- 目标版本：`classic-2019-phase-6`
- 核对日期：2026-09-09
- 状态：资料清单完成，等待 D10.B 录入装备与掉落

## 版本与产品边界

本清单采用 2019 经典旧世血色修道院图书馆分区资料。经典攻略建议等级为 29–39；本游戏按既定阶段顺序在墓地之后解锁，并以 12 分钟左右的完整路线为目标。图书馆是军械库和大教堂的钥匙来源，但当前放置模型不维护背包任务物品，因此击败奥法师杜安后直接满足后续分区的内容解锁条件，不单独发放或消耗血色十字军钥匙。

普通怪、世界掉落、书页、钥匙和不可装备的使用物品不进入装备图鉴。所有收益仍只来自玩家主动安排的远征；解锁图书馆不会自动产生经验、资金、任务或装备收益。

## Boss 与路线

| 顺序 | Encounter ID | Boss | 路线分类 | 说明 |
|---:|---|---|---|---|
| 1 | `scarlet_library_houndmaster_loksey` | 驯犬者洛克希（Houndmaster Loksey） | optional | 侧室 Boss；携带三只精英猎犬，低生命时使用 Bloodlust |
| 2 | `scarlet_library_arcanist_doan` | 奥法师杜安（Arcanist Doan） | required | 最终 Boss；奥术爆炸、沉默、变形与 Detonation |

洛克希保留为显式普通可选节点：玩家可以为两件专属装备主动选择完整路线，也可以跳过侧室直取杜安。杜安是分区首通目标；其房间中的血色十字军钥匙只通过后续分区解锁表达，不作为可分配战利品。

## Boss 专属装备池

Classic Wowhead 与 AtlasLootClassic 在图书馆列出 7 件 Boss 专属物品，其中 3456 Dog Whistle 没有装备栏位，是带使用效果的非装备物品。当前装备库只录入其余 6 件真实装备：

| Boss | 物品 ID | 装备 | 栏位 |
|---|---:|---|---|
| Houndmaster Loksey | 7710 | Loksey's Training Stick | 双手法杖 |
| Houndmaster Loksey | 7756 | Dog Training Gloves | 皮甲手套 |
| Arcanist Doan | 7714 | Hypnotic Blade | 主手匕首 |
| Arcanist Doan | 7713 | Illusionary Rod | 双手法杖 |
| Arcanist Doan | 7712 | Mantle of Doan | 布甲肩部 |
| Arcanist Doan | 7711 | Robe of Doan | 布甲胸部 |

所有拥有专属装备池的 Boss 首轮保证掉落一件装备，池内权重先采用等权基线；真实原始掉率只用于后续相对权重核对。3456 Dog Whistle、7146 Scarlet Key、普通怪 BoE 和世界掉落均不进入 Boss 装备池，也不用于填充图鉴数量。

## 分区任务与真实奖励

图书馆有两条以馆内书籍为目标的独立任务。当前轻量任务系统不模拟点击书籍和阵营限制，可将两者压缩为成员实际参加并完成图书馆远征；奖励保持各自真实来源和选择关系：

| 经典任务 | 轻量完成条件 | 奖励 | 录入建议 |
|---|---|---|---|
| Compendium of the Fallen | 完整通关图书馆 | 7747 Vile Protector、17508 Forcestone Buckler、7749 Omega Orb 三选一 | 录入；部落阵营限制不模拟 |
| Mythology of the Titans | 完整通关图书馆 | 7746 Explorers' League Commendation | 录入；联盟阵营限制不模拟 |

任务 1049 的 Classic 数据实际引用 17508 Forcestone Buckler；7748 是另一条无任务来源的同名旧记录，不应录入。四件任务奖励只通过成员任务领取，不进入洛克希或杜安的掉落表。

跨图书馆、军械库和大教堂三个分区的 `In the Name of the Light` 与 `Into The Scarlet Monastery` 继续延后到 D12，在大教堂阶段统一实现，避免图书馆首通提前发放阶段终点奖励。

## 机制候选

- Houndmaster Loksey：三只精英猎犬形成多目标压力，使用 `crowd_control` 或 `area_damage` 建议机制；Bloodlust 作为输出与坦克压力的一部分，不增加实时集火指令。
- Arcanist Doan：Detonation 要求全队散开，使用 `ranged_damage` 或治疗压力抽象；Arcane Explosion、Polymorph 与 Silence 使用 `interrupt` / `magic_dispel` 建议机制表达。
- 图书馆普通怪：大量远程施法者适合视线拉怪与打断，但当前不增加普通怪逐组路线节点，只体现在总耗时和杜安前的能力需求中。

第一版不实现实时站位、视线、钥匙背包或书籍交互。机制继续通过可解释的推荐能力影响成功率，不把单一工具职业设为硬性出发条件。

## 来源

1. [Wowhead Classic 血色修道院攻略](https://www.wowhead.com/classic/guide/scarlet-monastery-dungeon-strategy-wow-classic)：图书馆等级区间、Boss 顺序、机制、钥匙与 Boss 掉落汇总。
2. [Wowhead Classic 堕落者纲要](https://www.wowhead.com/classic/quest=1049/compendium-of-the-fallen)：任务目标与 7747、17508、7749 三选一奖励。
3. [Wowhead Classic 泰坦神话](https://www.wowhead.com/classic/quest=1050/mythology-of-the-titans)：任务目标与 7746 固定奖励。
4. [AtlasLootClassic 数据仓库](https://github.com/Hoizame/AtlasLootClassic/blob/master/AtlasLootClassic_DungeonsAndRaids/data.lua)：交叉核对洛克希、杜安与专属物品 ID。
5. Wowhead Classic 物品 XML：D10.B 逐件核对物品等级、需求等级、品质、图标、栏位与常驻属性。

## D10.A 验收清单

- [x] 两个 Boss 完成 required/optional 路线分类。
- [x] 6 件 Boss 专属装备完成 ID 与来源交叉核对。
- [x] Dog Whistle、Scarlet Key、普通怪 BoE 和世界掉落明确排除。
- [x] 两条分区任务及 4 件真实奖励完成 ID 和选择关系核对。
- [x] 17508 与无来源同名记录 7748 的边界已确认。
- [x] 跨三个分区任务延后至 D12，不在图书馆重复发放。
- [x] 所有来源标记为 `classic-2019-phase-6`，没有探索赛季或重制数据。
