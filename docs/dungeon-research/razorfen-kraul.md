# 剃刀沼泽（Razorfen Kraul）资料清单

- 内容 ID：`razorfen_kraul`
- 研究阶段：D08.A
- 目标版本：`classic-2019-phase-6`
- 核对日期：2026-09-09
- 状态：资料清单完成，等待 D08.B 录入装备与掉落

## 版本与产品边界

本清单采用 2019 经典旧世剃刀沼泽五人副本资料。副本位于南贫瘠之地，经典资料将其定位为约 30–40 级区间；当前游戏不模拟阵营、钥匙、护送、普通怪收集或职业任务链。世界掉落、普通怪掉落、任务物品和材料不进入 Boss 专属装备池。

剃刀沼泽是 D08 第一座中等级速带副本。正式路线保留主要 Boss 顺序，并把 Roogug 作为普通可选节点，把 Blind Hunter 与 Earthcaller Halmgar 作为随机稀有节点；玩家必须在出发前主动选择路线，未安排的节点不产生离线收益。

## Boss 与路线

| 顺序 | Encounter ID | Boss | 路线分类 | 说明 |
|---:|---|---|---|---|
| 1 | `razorfen_kraul_roogug` | 鲁古格（Roogug） | optional | 战士职业任务目标；无培养价值的专属 Boss 装备 |
| 2 | `razorfen_kraul_aggem_thorncurse` | 阿格姆·荆棘诅咒（Aggem Thorncurse） | required | 召唤野猪守卫；掉落 Thornspike |
| 3 | `razorfen_kraul_death_speaker_jargba` | 死亡之语者·贾格巴（Death Speaker Jargba） | required | 心灵控制与施法者随从；三件布甲/武器 |
| 4 | `razorfen_kraul_overlord_ramtusk` | 主宰拉姆塔斯（Overlord Ramtusk） | required | 高单体伤害与长矛手随从；两件装备 |
| 5 | `razorfen_kraul_agathelos_the_raging` | 暴怒的阿迦赛罗斯（Agathelos the Raging） | required | 坦克承伤检查；两件装备 |
| 6 | `razorfen_kraul_blind_hunter` | 盲眼猎手（Blind Hunter） | rare | 蝙蝠洞随机稀有 Boss；三件装备 |
| 7 | `razorfen_kraul_charlga_razorflank` | 卡尔加·刺肋（Charlga Razorflank） | required | 最终 Boss；三件装备与任务目标 |
| 8 | `razorfen_kraul_earthcaller_halmgar` | 召地者哈穆加（Earthcaller Halmgar） | rare | 平台随机稀有元素 Boss；两件装备 |

Wowhead 的 Classic 攻略将 Roogug 标为 optional，并将 Blind Hunter 标为 rare；Earthcaller Halmgar 也属于平台随机出现的稀有 Boss。当前路线顺序采用可解释的线性放置结算，不模拟地图绕路或实时巡逻。

## Boss 专属装备池

以下 16 件是 Classic Boss 掉落汇总中的非世界掉落装备。D08.B 应逐件通过 Classic XML 核对名称、图标、属性、需求等级和物品 ID，并使用 AtlasLootClassic 交叉核对 Boss 归属。

| Boss | 物品 ID | 装备 |
|---|---:|---|
| Aggem Thorncurse | 6681 | Thornspike |
| Death Speaker Jargba | 6682 | Death Speaker Mantle |
| Death Speaker Jargba | 6685 | Death Speaker Robes |
| Death Speaker Jargba | 2816 | Death Speaker Scepter |
| Overlord Ramtusk | 6686 | Tusken Helm |
| Overlord Ramtusk | 6687 | Corpsemaker |
| Agathelos the Raging | 6690 | Ferine Leggings |
| Agathelos the Raging | 6691 | Swinetusk Shank |
| Blind Hunter | 6695 | Stygian Bone Amulet |
| Blind Hunter | 6696 | Nightstalker Bow |
| Blind Hunter | 6697 | Batwing Mantle |
| Earthcaller Halmgar | 6688 | Whisperwind Headdress |
| Earthcaller Halmgar | 6689 | Wind Spirit Staff |
| Charlga Razorflank | 6693 | Agamaggan's Clutch |
| Charlga Razorflank | 6692 | Heart of Agamaggan |
| Charlga Razorflank | 6694 | Pronged Reaver |

Roogug 没有进入 Boss 专属装备池；6841 等职业任务物品在当前装备库边界外。普通怪/BoE 装备（例如 Staff of the Shade、Mantle of Thieves、Avenger's Armor、Pugilist Bracers、Plains Ring 等）同样不进入本阶段 Boss 掉落表。

所有拥有专属装备池的 Boss 首轮保证掉落一件，池内权重先采用等权基线；真实原始掉率仅用于后续相对权重核对，不宣称每件必掉。

## 任务与奖励候选

Classic 资料列出 7 条副本任务，包含阵营、护送、任务物品和职业任务。当前任务系统只录入可以由副本活动确定结算、且奖励有培养价值的任务：

| 经典任务 | 轻量完成条件 | 奖励 | 录入建议 |
|---|---|---|---|
| The Crone of the Kraul / A Vengeful Fate | 击败 Charlga Razorflank | 6684 Berylline Pads、6692 Stonefist Girdle、6693 Marbled Buckler（需进一步 XML 核对） | 优先录入；联盟/部落版本合并为中立任务 |
| Mortality Wanes | 完成副本并取得任务目标 | 6750 Snake Hoop、6751 Mourning Shawl、6752 Lancer Boots（需进一步 XML 核对） | 可录入；任务奖励不进入 Boss 池 |
| Willix the Importer | 完成 Willix 护送 | 6753 Monkey Ring、6754 Tiger Band、6755 Snake Hoop（需进一步 XML 核对） | 备选；当前不支持护送，若录入则压缩为全通目标 |
| Blueleaf Tubers | 普通怪/场景收集 | 容器奖励 | 当前排除，不模拟收集和容器随机内容 |
| Going, Going, Guano! | 收集 Kraul Guano | 经验与资金 | 当前排除，任务 Schema 需要装备奖励 |
| An Unholy Alliance | 副本内任务物品 | 后续任务链 | 当前排除，保留为未来任务链入口 |
| Warrior class quest | 击败 Roogug | 职业护甲任务物品 | 当前排除，不把职业任务物品视为装备库物品 |

任务奖励必须仅由成员任务领取；成员必须实际参战，且只有玩家主动安排的活动才会推进任务进度。

## 机制候选

- Roogug：周围小怪与元素随从，使用群体控制建议机制。
- Aggem Thorncurse：召唤野猪守卫，使用坦克/输出压力建议机制。
- Death Speaker Jargba：心灵控制与施法者随从，使用魔法驱散或打断建议机制。
- Overlord Ramtusk：长矛手旋风与高单体伤害，使用群体控制和坦克压力建议机制。
- Agathelos：高单体伤害，使用治疗压力建议机制。
- Blind Hunter：Sonic Burst 范围沉默，使用打断或远程能力建议机制。
- Charlga：Chain Bolt、Purity、Renew，使用打断和治疗压力建议机制。
- Earthcaller Halmgar：图腾与元素随从，使用群体控制建议机制。

第一版机制应继续复用现有能力模型，不增加位置、护送或实时点击模拟。D08.C 使用保守的初始需求，D08.D 再通过固定种子调整到 30–40 级速带目标。

## 来源

1. [Wowhead Classic 剃刀沼泽攻略](https://www.wowhead.com/classic/guide/razorfen-kraul-dungeon-strategy-wow-classic)：副本等级区间、Boss 顺序、optional/rare 标记、机制和 Boss 掉落汇总。
2. [Wowhead Classic 剃刀沼泽任务攻略](https://www.wowhead.com/classic/guide/classic-wow-razorfen-kraul-dungeon-quests)：7 条任务、等级、阵营、目标和奖励候选。
3. [AtlasLootClassic 数据仓库](https://github.com/Hoizame/AtlasLootClassic/blob/master/AtlasLootClassic_DungeonsAndRaids/data.lua)：D08.B 录入前交叉核对 Boss 与物品 ID。

## D08.A 验收清单

- [ ] 8 个路线节点完成 required/optional/rare 分类。
- [ ] 16 件 Boss 专属装备完成 Classic XML 核对。
- [ ] 计划录入的任务奖励逐件完成 Classic XML 核对。
- [ ] Roogug 职业任务物品、普通怪 BoE、容器和材料已排除。
- [ ] 两个随机稀有 Boss 的装备不出现在其他 Boss 池。
- [ ] 所有来源标记为 `classic-2019-phase-6`，没有探索赛季或重制数据。
