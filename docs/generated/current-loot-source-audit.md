# 当前四副本掉落来源审计

生成日期：2026-09-08

本报告只描述当前内容元数据和引用关系，不修改掉落、概率或装备属性。分类规则以掉落表 `sourceType` 为准；未填写时按现有兼容规则视为 Boss 专属掉落。

## 汇总

- 路线 Encounter：27。
- 掉落表：26。
- 掉落表分类：Boss 专属掉落 25，任务奖励 1，世界掉落 0，设计占位 0。
- Encounter 引用分类：Boss 专属掉落 25，任务奖励 2，世界掉落 0，设计占位 0。
- 不同装备分类：Boss 专属掉落 29，任务奖励 5，世界掉落 0，设计占位 0。
- 未显式填写 `sourceType` 的 Boss 掉落表：25。
- 未被路线 Encounter 引用的掉落表：0。

## 后续迁移候选

以下 Encounter 当前引用了非 Boss 来源装备。任务系统完成后，应移除这些掉落引用，并将装备迁回成员任务奖励：

- 怒焰裂谷 · 奥格弗林特（oggleflint）引用 任务奖励表 `ragefire_chasm_common_equipment`。
- 怒焰裂谷 · 巴扎兰（bazzalan）引用 任务奖励表 `ragefire_chasm_common_equipment`。

待迁移装备：15452 羽珠护腕、15453 草原狮护腕、15449 苍白长裤、15450 泥泞护腿、15451 石像鬼护腿。

## 逐副本明细

### 死亡矿井（deadmines）

| Encounter | 掉落表 | 分类 | 保证数量 | 装备 |
|---|---|---|---:|---|
| 拉克佐（dm_rhahkzor） | dm_rhahkzor | Boss 专属掉落（隐式） | 1 | 5187 拉克佐之锤 |
| 斯尼德的伐木机与斯尼德（dm_sneed） | dm_sneed | Boss 专属掉落（隐式） | 1 | 5194 工头战斧 |
| 基尔尼格（dm_gilnid） | dm_gilnid | Boss 专属掉落（隐式） | 1 | 5199 铁匠短裤 |
| 重拳先生（dm_mr_smite） | dm_mr_smite | Boss 专属掉落（隐式） | 1 | 7230 重拳先生的大锤 |
| 绿皮队长（dm_captain_greenskin） | dm_captain_greenskin | Boss 专属掉落（隐式） | 1 | 5201 火石法杖 |
| 艾德温·范克里夫（dm_edwin_vancleef） | dm_edwin_vancleef | Boss 专属掉落（隐式） | 1 | 5191 残酷倒钩 |
| 曲奇（dm_cookie） | dm_cookie | Boss 专属掉落（隐式） | 1 | 5198 曲奇的搅汤棒 |

### 怒焰裂谷（ragefire_chasm）

| Encounter | 掉落表 | 分类 | 保证数量 | 装备 |
|---|---|---|---:|---|
| 奥格弗林特（oggleflint） | ragefire_chasm_common_equipment | 任务奖励 | 1 | 15452 羽珠护腕、15453 草原狮护腕、15449 苍白长裤、15450 泥泞护腿、15451 石像鬼护腿 |
| 饥饿者塔拉加曼（taragaman_the_hungerer） | taragaman_the_hungerer | Boss 专属掉落（隐式） | 1 | 14145 被诅咒的魔刃、14148 水晶腕轮、14149 地下斗篷 |
| 祈求者耶戈什（jergosh_the_invoker） | jergosh_the_invoker | Boss 专属掉落（隐式） | 1 | 14151 咏唱之刃、14150 唤魔者长袍、14147 洞穴护腕 |
| 巴扎兰（bazzalan） | ragefire_chasm_common_equipment | 任务奖励 | 1 | 15452 羽珠护腕、15453 草原狮护腕、15449 苍白长裤、15450 泥泞护腿、15451 石像鬼护腿 |

### 影牙城堡（shadowfang_keep）

| Encounter | 掉落表 | 分类 | 保证数量 | 装备 |
|---|---|---|---:|---|
| 雷希戈尔（sfk_rethilgore） | sfk_rethilgore | Boss 专属掉落（隐式） | 1 | 5254 皱褶肩甲 |
| 屠夫拉佐克劳（sfk_razorclaw） | sfk_razorclaw | Boss 专属掉落（隐式） | 1 | 1292 屠夫的切肉刀 |
| 席瓦莱恩男爵（sfk_baron_silverlaine） | sfk_baron_silverlaine | Boss 专属掉落（隐式） | 1 | 6321 席瓦莱恩家族徽记 |
| 指挥官斯普林瓦尔（sfk_commander_springvale） | sfk_commander_springvale | Boss 专属掉落（隐式） | 1 | 6320 指挥官纹章盾 |
| 盲眼守卫奥杜（sfk_odo） | sfk_odo | Boss 专属掉落（隐式） | 1 | 6318 奥杜之杖 |
| 吞噬者芬鲁斯（sfk_fenrus） | sfk_fenrus | Boss 专属掉落（隐式） | 1 | 6340 芬鲁斯的外皮 |
| 狼王南杜斯（sfk_wolf_master_nandos） | sfk_wolf_master_nandos | Boss 专属掉落（隐式） | 1 | 6314 狼王斗篷 |
| 大法师阿鲁高（sfk_archmage_arugal） | sfk_archmage_arugal | Boss 专属掉落（隐式） | 1 | 6324 阿鲁高法袍 |

### 哀嚎洞穴（wailing_caverns）

| Encounter | 掉落表 | 分类 | 保证数量 | 装备 |
|---|---|---|---:|---|
| 安娜科德拉（wc_lady_anacondra） | wc_lady_anacondra | Boss 专属掉落（隐式） | 1 | 10412 尖牙腰带 |
| 考布莱恩领主（wc_lord_cobrahn） | wc_lord_cobrahn | Boss 专属掉落（隐式） | 1 | 6460 考布莱恩的腰带 |
| 克雷什（wc_kresh） | wc_kresh | Boss 专属掉落（隐式） | 1 | 13245 克雷什之背 |
| 皮萨斯领主（wc_lord_pythas） | wc_lord_pythas | Boss 专属掉落（隐式） | 1 | 6472 毒蛇之刺 |
| 斯卡姆（wc_skum） | wc_skum | Boss 专属掉落（隐式） | 1 | 6449 发光的蜥蜴披风 |
| 瑟芬迪斯领主（wc_lord_serpentis） | wc_lord_serpentis | Boss 专属掉落（隐式） | 1 | 6469 毒蛇 |
| 永生者沃尔丹（wc_verdan） | wc_verdan | Boss 专属掉落（隐式） | 1 | 6631 生命之根 |
| 吞噬者穆坦努斯（wc_mutanus） | wc_mutanus | Boss 专属掉落（隐式） | 1 | 6627 穆坦努斯的胸甲 |

## 审计结论

- 当前只有 `dungeon_quest_rewards` 被显式标记为任务奖励来源。
- 未标记 `sourceType` 的表暂按 Boss 专属掉落处理；后续完整度审计应要求新内容显式填写来源类型。
- 本报告不能替代外部资料核对。任务 7.8 迁移前仍需按经典内容来源政策确认每件装备的真实来源。
