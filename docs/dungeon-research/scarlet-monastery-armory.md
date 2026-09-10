# 血色修道院：军械库（Scarlet Monastery Armory）资料清单

- 内容 ID：`scarlet_monastery_armory`
- 研究阶段：D11.A
- 目标版本：`classic-2019-phase-6`
- 核对日期：2026-09-09
- 状态：资料清单完成，等待 D11.B 录入装备与掉落

## 版本与产品边界

本清单采用 2019 经典旧世血色修道院军械库分区资料。经典攻略建议等级为 32–42；本游戏按既定分区顺序在图书馆首通后解锁，并以 16 分钟左右的完整路线为目标。原版需要图书馆杜安房间中的血色十字军钥匙开门，当前放置模型不维护背包任务物品，因此使用图书馆首通作为等价门禁，不单独发放或消耗钥匙。

普通怪 BoE、世界掉落、布料、钥匙和非装备物品不进入 Boss 装备池。所有收益仍只来自玩家主动安排的远征；解锁军械库不会自动产生经验、资金、任务或装备收益。

## Boss 与路线

| 顺序 | Encounter ID | Boss | 路线分类 | 说明 |
|---:|---|---|---|---|
| 1 | `scarlet_armory_herod` | 赫洛德（Herod） | required | 分区唯一 Boss；旋风斩期间魔法免疫，死亡后大量血色预备兵冲入房间 |

军械库是短而连续的单线分区，没有需要独立建模的可选 Boss 或稀有 Boss。普通怪的多目标拉怪、巡逻和逃跑压力体现在总耗时与赫洛德机制需求中，不拆成额外路线节点。

## Boss 专属装备池

Classic Wowhead 与 AtlasLootClassic 均列出赫洛德的 4 件专属可装备掉落：

| 物品 ID | 装备 | 栏位 | 已核对常驻属性 |
|---:|---|---|---|
| 7719 | Raging Berserker's Helm | 锁甲头部 | 213 护甲、13 力量、8 耐力、1% 近战与远程暴击 |
| 7718 | Herod's Shoulder | 锁甲肩部 | 196 护甲、6 力量、15 耐力 |
| 10330 | Scarlet Leggings | 锁甲腿部 | 233 护甲、20 力量、10 耐力、血色十字军链甲套装部件 |
| 7717 | Ravager | 双手斧 | 104–157 伤害、3.50 攻速；触发型旋风效果不进入当前常驻属性模型 |

4 件装备均由 Wowhead Classic XML 逐件核对物品等级、需求等级、品质、图标、栏位和属性。所有拥有专属装备池的 Boss 首轮保证掉落一件装备，池内权重先采用等权基线；真实原始掉率只用于后续相对权重核对。

23192 Tabard of the Scarlet Crusade 来自赫洛德死亡后出现的 Scarlet Trainee，不是赫洛德的 Boss 掉落，因此排除。血色套装其余普通怪 BoE、世界掉落和非装备物品也不用于填充军械库图鉴数量。

## 分区任务

军械库没有需要在 D11 独立录入的分区装备奖励任务。跨图书馆、军械库和大教堂三个分区的 `In the Name of the Light` 与 `Into The Scarlet Monastery` 继续延后到 D12，在大教堂阶段统一实现；这样不会因军械库首通提前发放阶段终点奖励，也不会重复记录同一任务来源。

## 机制候选

- 赫洛德的 Whirlwind、Cleave、Enrage 与 Rushing Charge 形成近战生存压力；旋风期间魔法免疫意味着近战需要撤离、法系需要等待，不把任何单一职业设为硬门槛。
- 赫洛德死亡后超过二十名 Scarlet Trainee 冲入房间，使用 `area_damage` 推荐能力表达收尾效率与治疗压力。
- 军械库普通怪多为两到三只成组，包含施法、治疗、巡逻与低生命逃跑单位；可用 `crowd_control` 或 `interrupt` 表达连续拉怪稳定性，但第一版不增加逐组普通怪节点。

第一版不实现实时站位、魔法免疫阶段循环、仇恨列表、逃跑追击、钥匙背包或战袍收藏。机制继续通过可解释的推荐能力影响成功率，路线保持单个必打 Encounter。

## 来源

1. [Wowhead Classic 血色修道院攻略](https://www.wowhead.com/classic/guide/scarlet-monastery-dungeon-strategy-wow-classic)：军械库等级区间、单 Boss 路线、赫洛德技能、死亡后预备兵与掉落汇总。
2. [AtlasLootClassic 数据仓库](https://github.com/Hoizame/AtlasLootClassic/blob/master/AtlasLootClassic_DungeonsAndRaids/data.lua)：交叉核对赫洛德、4 件专属装备 ID，以及 23192 属于普通怪列表。
3. Wowhead Classic 物品 XML：7719、7718、10330、7717 的物品等级、需求等级、品质、图标、栏位与常驻属性。

## D11.A 验收清单

- [x] 赫洛德确认为唯一 required 路线节点。
- [x] 4 件 Boss 专属装备完成 ID、来源与属性交叉核对。
- [x] Scarlet Trainee 战袍、普通怪 BoE、世界掉落和非装备物品明确排除。
- [x] 军械库无独立装备任务；跨三个分区任务延后至 D12。
- [x] 图书馆首通作为钥匙门禁的等价表达已确认。
- [x] 所有来源标记为 `classic-2019-phase-6`，没有探索赛季或重制数据。
