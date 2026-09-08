# V1 旧内容资产清单

> 本文件由 `scripts/audit-legacy-content.mjs` 生成，请勿手工修改。

## 汇总

| 内容 | 数量 |
|---|---|
| 职业 | 9 |
| 专精 | 28 |
| 性格 | 6 |
| 隐藏角色 | 1 |
| 装备栏位 | 17 |
| 物品定义 | 34 |
| 副本 | 4 |
| Boss 路线节点 | 27 |
| 掉落池 | 26 |
| 日志模板键 | 9 |

## 职业与专精

| 职业 ID | 职业 | 护甲 | 专精 |
|---|---|---|---|
| warrior | 战士 | mail | warrior_protection（防护/tank）、warrior_arms（武器/dps）、warrior_fury（狂怒/dps） |
| paladin | 圣骑士 | mail | paladin_protection（防护/tank）、paladin_holy（神圣/healer）、paladin_retribution（惩戒/dps） |
| hunter | 猎人 | leather | hunter_beast_mastery（野兽控制/dps）、hunter_marksmanship（射击/dps）、hunter_survival（生存/dps） |
| rogue | 盗贼 | leather | rogue_assassination（刺杀/dps）、rogue_combat（战斗/dps）、rogue_subtlety（敏锐/dps） |
| priest | 牧师 | cloth | priest_discipline（戒律/healer）、priest_holy（神圣/healer）、priest_shadow（暗影/dps） |
| shaman | 萨满祭司 | leather | shaman_restoration（恢复/healer）、shaman_elemental（元素/dps）、shaman_enhancement（增强/dps） |
| mage | 法师 | cloth | mage_arcane（奥术/dps）、mage_fire（火焰/dps）、mage_frost（冰霜/dps） |
| warlock | 术士 | cloth | warlock_affliction（痛苦/dps）、warlock_demonology（恶魔学识/dps）、warlock_destruction（毁灭/dps） |
| druid | 德鲁伊 | leather | druid_feral_tank（野性（守护）/tank）、druid_restoration（恢复/healer）、druid_balance（平衡/dps）、druid_feral_dps（野性（猛攻）/dps） |

## 性格

| ID | 名称 | 优点 | 缺点 |
|---|---|---|---|
| steady | 稳重 | 成功率贡献 +8% | 副本耗时贡献 +8% |
| impatient | 急躁 | 副本耗时贡献 -8% | 成功率贡献 -8% |
| diligent | 勤奋 | 个人经验 +15% | 副本耗时贡献 +5% |
| competitive | 好胜 | 越级副本战力 +10% | 碾压低级副本战力 -5% |
| sociable | 合群 | 职业丰富时战力最高 +8% | 重复职业过多时战力 -5% |
| clever | 机智 | 降低越级战力惩罚 | 个人经验 -10% |

## 隐藏角色

| 名称 | 职业 | 专精 | 性格 | 出现规则 | 当前实现 |
|---|---|---|---|---|---|
| 费厄泼赖 | warlock | warlock_affliction | clever | 每次随机生成候选人时 1%，同一存档唯一 | src/game.js:createMember |

## 初始装备

当前初始装备由 `src/game.js:createStarterItem` 在运行时生成，每名成员拥有完整装备栏，物品等级固定为 10，护甲栏位使用成员护甲类型。V2 迁移时需要将这些动态定义改为稳定内容 ID。

| 栏位 ID | 显示名称 |
|---|---|
| head | 头部 |
| neck | 颈部 |
| shoulder | 肩部 |
| back | 披风 |
| chest | 胸甲 |
| wrist | 护腕 |
| hands | 手套 |
| waist | 腰带 |
| legs | 腿部 |
| feet | 鞋子 |
| ring1 | 戒指一 |
| ring2 | 戒指二 |
| trinket1 | 饰品一 |
| trinket2 | 饰品二 |
| mainHand | 主手 |
| offHand | 副手 |
| ranged | 远程/圣物 |

## 副本与 Boss

### 怒焰裂谷（ragefire_chasm）

推荐等级：13；基础时间：600 秒；Boss：4。

| 顺序 | Boss ID | 名称 | 阶段秒数 | 掉落池 |
|---|---|---|---|---|
| 1 | oggleflint | 奥格弗林特 | 120 | ragefire_chasm_common_equipment |
| 2 | taragaman_the_hungerer | 饥饿者塔拉加曼 | 150 | taragaman_the_hungerer |
| 3 | jergosh_the_invoker | 祈求者耶戈什 | 150 | jergosh_the_invoker |
| 4 | bazzalan | 巴扎兰 | 180 | ragefire_chasm_common_equipment |

### 哀嚎洞穴（wailing_caverns）

推荐等级：17；基础时间：1680 秒；Boss：8。

| 顺序 | Boss ID | 名称 | 阶段秒数 | 掉落池 |
|---|---|---|---|---|
| 1 | wc_lady_anacondra | 安娜科德拉 | 180 | wc_lady_anacondra |
| 2 | wc_lord_cobrahn | 考布莱恩领主 | 180 | wc_lord_cobrahn |
| 3 | wc_kresh | 克雷什 | 120 | wc_kresh |
| 4 | wc_lord_pythas | 皮萨斯领主 | 180 | wc_lord_pythas |
| 5 | wc_skum | 斯卡姆 | 180 | wc_skum |
| 6 | wc_lord_serpentis | 瑟芬迪斯领主 | 240 | wc_lord_serpentis |
| 7 | wc_verdan | 永生者沃尔丹 | 240 | wc_verdan |
| 8 | wc_mutanus | 吞噬者穆坦努斯 | 360 | wc_mutanus |

### 死亡矿井（deadmines）

推荐等级：18；基础时间：1440 秒；Boss：7。

| 顺序 | Boss ID | 名称 | 阶段秒数 | 掉落池 |
|---|---|---|---|---|
| 1 | dm_rhahkzor | 拉克佐 | 180 | dm_rhahkzor |
| 2 | dm_sneed | 斯尼德的伐木机与斯尼德 | 210 | dm_sneed |
| 3 | dm_gilnid | 基尔尼格 | 180 | dm_gilnid |
| 4 | dm_mr_smite | 重拳先生 | 210 | dm_mr_smite |
| 5 | dm_captain_greenskin | 绿皮队长 | 210 | dm_captain_greenskin |
| 6 | dm_edwin_vancleef | 艾德温·范克里夫 | 210 | dm_edwin_vancleef |
| 7 | dm_cookie | 曲奇 | 240 | dm_cookie |

### 影牙城堡（shadowfang_keep）

推荐等级：22；基础时间：840 秒；Boss：8。

| 顺序 | Boss ID | 名称 | 阶段秒数 | 掉落池 |
|---|---|---|---|---|
| 1 | sfk_rethilgore | 雷希戈尔 | 90 | sfk_rethilgore |
| 2 | sfk_razorclaw | 屠夫拉佐克劳 | 90 | sfk_razorclaw |
| 3 | sfk_baron_silverlaine | 席瓦莱恩男爵 | 90 | sfk_baron_silverlaine |
| 4 | sfk_commander_springvale | 指挥官斯普林瓦尔 | 90 | sfk_commander_springvale |
| 5 | sfk_odo | 盲眼守卫奥杜 | 90 | sfk_odo |
| 6 | sfk_fenrus | 吞噬者芬鲁斯 | 120 | sfk_fenrus |
| 7 | sfk_wolf_master_nandos | 狼王南杜斯 | 120 | sfk_wolf_master_nandos |
| 8 | sfk_archmage_arugal | 大法师阿鲁高 | 150 | sfk_archmage_arugal |

## 掉落池

| 掉落池 ID | 保证装备数 | 物品 ID（权重） |
|---|---|---|
| taragaman_the_hungerer | 1 | 14145（0.1948）、14148（0.3913）、14149（0.4139） |
| jergosh_the_invoker | 1 | 14151（0.1938）、14150（0.3977）、14147（0.4085） |
| ragefire_chasm_common_equipment | 1 | 15452（1）、15453（1）、15449（1）、15450（1）、15451（1） |
| wc_lady_anacondra | 1 | 10412（1） |
| wc_lord_cobrahn | 1 | 6460（1） |
| wc_kresh | 1 | 13245（1） |
| wc_lord_pythas | 1 | 6472（1） |
| wc_skum | 1 | 6449（1） |
| wc_lord_serpentis | 1 | 6469（1） |
| wc_verdan | 1 | 6631（1） |
| wc_mutanus | 1 | 6627（1） |
| dm_rhahkzor | 1 | 5187（1） |
| dm_sneed | 1 | 5194（1） |
| dm_gilnid | 1 | 5199（1） |
| dm_mr_smite | 1 | 7230（1） |
| dm_captain_greenskin | 1 | 5201（1） |
| dm_edwin_vancleef | 1 | 5191（1） |
| dm_cookie | 1 | 5198（1） |
| sfk_rethilgore | 1 | 5254（1） |
| sfk_razorclaw | 1 | 1292（1） |
| sfk_baron_silverlaine | 1 | 6321（1） |
| sfk_commander_springvale | 1 | 6320（1） |
| sfk_odo | 1 | 6318（1） |
| sfk_fenrus | 1 | 6340（1） |
| sfk_wolf_master_nandos | 1 | 6314（1） |
| sfk_archmage_arugal | 1 | 6324（1） |

## 物品定义

| ID | 中文名 | 物品等级 | 品质 | 栏位 | 图标 | 被掉落池引用 |
|---|---|---|---|---|---|---|
| 14145 | 被诅咒的魔刃 | 18 | uncommon | mainHand | inv_weapon_shortblade_12 | taragaman_the_hungerer |
| 14148 | 水晶腕轮 | 18 | uncommon | wrist | inv_bracer_13 | taragaman_the_hungerer |
| 14149 | 地下斗篷 | 18 | uncommon | back | inv_misc_cape_18 | taragaman_the_hungerer |
| 14151 | 咏唱之刃 | 18 | uncommon | mainHand | inv_weapon_shortblade_25 | jergosh_the_invoker |
| 14150 | 唤魔者长袍 | 18 | uncommon | chest | inv_chest_cloth_24 | jergosh_the_invoker |
| 14147 | 洞穴护腕 | 18 | uncommon | wrist | inv_bracer_07 | jergosh_the_invoker |
| 15452 | 羽珠护腕 | 18 | uncommon | wrist | inv_bracer_08 | ragefire_chasm_common_equipment |
| 15453 | 草原狮护腕 | 18 | uncommon | wrist | inv_bracer_07 | ragefire_chasm_common_equipment |
| 15449 | 苍白长裤 | 18 | uncommon | legs | inv_pants_14 | ragefire_chasm_common_equipment |
| 15450 | 泥泞护腿 | 18 | uncommon | legs | inv_pants_07 | ragefire_chasm_common_equipment |
| 15451 | 石像鬼护腿 | 18 | uncommon | legs | inv_pants_03 | ragefire_chasm_common_equipment |
| 10412 | 尖牙腰带 | 21 | uncommon | waist | inv_belt_30 | wc_lady_anacondra |
| 6460 | 考布莱恩的腰带 | 24 | rare | waist | inv_belt_03 | wc_lord_cobrahn |
| 13245 | 克雷什之背 | 20 | rare | offHand | inv_shield_18 | wc_kresh |
| 6472 | 毒蛇之刺 | 24 | rare | mainHand | inv_wand_10 | wc_lord_pythas |
| 6449 | 发光的蜥蜴披风 | 22 | rare | back | inv_chest_cloth_15 | wc_skum |
| 6469 | 毒蛇 | 24 | rare | ranged | inv_weapon_bow_10 | wc_lord_serpentis |
| 6631 | 生命之根 | 25 | rare | mainHand | inv_staff_25 | wc_verdan |
| 6627 | 穆坦努斯的胸甲 | 28 | rare | chest | inv_chest_plate08 | wc_mutanus |
| 5187 | 拉克佐之锤 | 20 | common | mainHand | inv_hammer_09 | dm_rhahkzor |
| 5194 | 工头战斧 | 23 | rare | mainHand | inv_throwingaxe_06 | dm_sneed |
| 5199 | 铁匠短裤 | 21 | uncommon | legs | inv_pants_02 | dm_gilnid |
| 7230 | 重拳先生的大锤 | 23 | rare | mainHand | inv_hammer_09 | dm_mr_smite |
| 5201 | 火石法杖 | 23 | rare | mainHand | inv_staff_13 | dm_captain_greenskin |
| 5191 | 残酷倒钩 | 24 | rare | mainHand | inv_sword_24 | dm_edwin_vancleef |
| 5198 | 曲奇的搅汤棒 | 22 | rare | ranged | inv_staff_02 | dm_cookie |
| 5254 | 皱褶肩甲 | 20 | common | shoulder | inv_shoulder_08 | sfk_rethilgore |
| 1292 | 屠夫的切肉刀 | 25 | rare | mainHand | inv_axe_23 | sfk_razorclaw |
| 6321 | 席瓦莱恩家族徽记 | 26 | rare | ring1 | inv_belt_29 | sfk_baron_silverlaine |
| 6320 | 指挥官纹章盾 | 28 | rare | offHand | inv_shield_03 | sfk_commander_springvale |
| 6318 | 奥杜之杖 | 26 | rare | mainHand | inv_staff_27 | sfk_odo |
| 6340 | 芬鲁斯的外皮 | 26 | uncommon | back | inv_misc_pelt_wolf_02 | sfk_fenrus |
| 6314 | 狼王斗篷 | 27 | uncommon | back | inv_misc_cape_10 | sfk_wolf_master_nandos |
| 6324 | 阿鲁高法袍 | 29 | rare | chest | inv_chest_cloth_31 | sfk_archmage_arugal |

## 日志模板

| 模板键 | 条数 |
|---|---|
| start | 3 |
| wailing_caverns | 3 |
| deadmines | 3 |
| shadowfang_keep | 3 |
| oggleflint | 3 |
| taragaman_the_hungerer | 3 |
| jergosh_the_invoker | 3 |
| bazzalan | 3 |
| failure | 4 |

## 校验结果

- 未发现重复 ID、缺失掉落引用、缺失图标或阶段时间错误。
