# 副本内容完整度审计

生成日期：2026-09-09

本报告检查路线节点、Encounter、掉落来源、任务奖励、随机词缀和套装引用，不替代外部资料核对或数值平衡模拟。

## 路线与掉落

| 副本 | 节点 | 类型 | Encounter | 掉落来源 | 保证数量 | 装备 |
|---|---|---|---|---|---:|---|
| 黑暗深渊（blackfathom_deeps） | bfd_ghamoo_ra | required | 加摩拉（bfd_ghamoo_ra） | boss_drop:bfd_ghamoo_ra | 1 | 6907 海龟护甲、6908 加摩拉的绳索 |
| 黑暗深渊（blackfathom_deeps） | bfd_lady_sarevess | required | 瑟拉维斯（bfd_lady_sarevess） | boss_drop:bfd_lady_sarevess | 1 | 888 纳迦军用手套、11121 黑水刀、3078 纳迦穿心者 |
| 黑暗深渊（blackfathom_deeps） | bfd_gelihast | required | 格里哈斯特（bfd_gelihast） | boss_drop:bfd_gelihast | 1 | 6906 海藻手套、6905 暗礁战斧 |
| 黑暗深渊（blackfathom_deeps） | bfd_lorgus_jett | optional | 洛古斯·杰特（bfd_lorgus_jett） | 无装备掉落 | 0 | — |
| 黑暗深渊（blackfathom_deeps） | bfd_baron_aquanis | optional | 阿奎尼斯男爵（bfd_baron_aquanis） | 无装备掉落 | 0 | — |
| 黑暗深渊（blackfathom_deeps） | bfd_old_serrakis | required | 老年塞拉吉斯（bfd_old_serrakis） | boss_drop:bfd_old_serrakis | 1 | 6901 发光的蛇颈龙斗篷、6902 瑟拉吉斯指环、6904 瑟拉吉斯之刺 |
| 黑暗深渊（blackfathom_deeps） | bfd_twilight_lord_kelris | required | 梦游者克尔里斯（bfd_twilight_lord_kelris） | boss_drop:bfd_twilight_lord_kelris | 1 | 1155 梦游者魔棒、6903 凝望短裤 |
| 黑暗深渊（blackfathom_deeps） | bfd_akumai | required | 阿库麦尔（bfd_akumai） | boss_drop:bfd_akumai | 1 | 6909 海蛇之击、6910 吸血短裤、6911 苔藓腰带 |
| 死亡矿井（deadmines） | dm_rhahkzor | required | 拉克佐（dm_rhahkzor） | boss_drop:dm_rhahkzor | 1 | 872 切石者、5187 拉克佐之锤 |
| 死亡矿井（deadmines） | dm_sneeds_shredder | required | 斯尼德的伐木机（dm_sneeds_shredder） | boss_drop:dm_sneeds_shredder | 1 | 1937 电锯、2169 蜂鸣之刃 |
| 死亡矿井（deadmines） | dm_sneed | required | 斯尼德（dm_sneed） | boss_drop:dm_sneed | 1 | 5194 工头战斧、5195 金斑手套 |
| 死亡矿井（deadmines） | dm_gilnid | required | 基尔尼格（dm_gilnid） | boss_drop:dm_gilnid | 1 | 1156 豪华珠宝戒指、5199 铁匠短裤 |
| 死亡矿井（deadmines） | dm_mr_smite | required | 重拳先生（dm_mr_smite） | boss_drop:dm_mr_smite | 1 | 7230 重拳先生的大锤、5192 潜行者之刃、5196 重拳先生的战斧 |
| 死亡矿井（deadmines） | dm_captain_greenskin | required | 绿皮队长（dm_captain_greenskin） | boss_drop:dm_captain_greenskin | 1 | 5201 火石法杖、10403 黑暗迪菲亚腰带、5200 穿刺鱼叉 |
| 死亡矿井（deadmines） | dm_edwin_vancleef | required | 艾德温·范克里夫（dm_edwin_vancleef） | boss_drop:dm_edwin_vancleef | 1 | 5193 兄弟会斗篷、5202 海盗的罩衫、10399 黑暗迪菲亚护甲、5191 残酷倒钩 |
| 死亡矿井（deadmines） | dm_cookie | required | 曲奇（dm_cookie） | boss_drop:dm_cookie | 1 | 5198 曲奇的搅汤棒、5197 曲奇的吹火棍 |
| 诺莫瑞根（gnomeregan） | gnomeregan_grubbis | required | 格鲁比斯（gnomeregan_grubbis） | boss_drop:gnomeregan_grubbis | 1 | 9445 格鲁比斯的爪子 |
| 诺莫瑞根（gnomeregan） | gnomeregan_viscous_fallout | required | 粘性辐射尘（gnomeregan_viscous_fallout） | boss_drop:gnomeregan_viscous_fallout | 1 | 9454 酸性长靴、9452 水藤、9453 剧毒复仇者 |
| 诺莫瑞根（gnomeregan） | gnomeregan_electrocutioner_6000 | required | 电刑器6000型（gnomeregan_electrocutioner_6000） | boss_drop:gnomeregan_electrocutioner_6000 | 1 | 9447 电刑器腿杆、9446 电刑器的腿、9448 蜘蛛坦克油布 |
| 诺莫瑞根（gnomeregan） | gnomeregan_crowd_pummeler_9_60 | required | 群体打击者9-60（gnomeregan_crowd_pummeler_9_60） | boss_drop:gnomeregan_crowd_pummeler_9_60 | 1 | 9449 手动惩戒器、9450 侏儒机械人操作靴 |
| 诺莫瑞根（gnomeregan） | gnomeregan_dark_iron_ambassador | rare（0.18） | 黑铁大师（gnomeregan_dark_iron_ambassador） | boss_drop:gnomeregan_dark_iron_ambassador | 1 | 9456 玻璃枪、9457 皇家外交官节杖、9455 使者腕轮 |
| 诺莫瑞根（gnomeregan） | gnomeregan_mekgineer_thermaplugg | required | 麦克尼尔·瑟玛普拉格（gnomeregan_mekgineer_thermaplugg） | boss_drop:gnomeregan_mekgineer_thermaplugg | 1 | 9458 瑟玛普拉格的中央模组、9459 瑟玛普拉格的左臂、9461 充能齿轮、9492 电磁熔合激活器 |
| 怒焰裂谷（ragefire_chasm） | oggleflint | required | 奥格弗林特（oggleflint） | 无装备掉落 | 0 | — |
| 怒焰裂谷（ragefire_chasm） | taragaman_the_hungerer | required | 饥饿者塔拉加曼（taragaman_the_hungerer） | boss_drop:taragaman_the_hungerer | 1 | 14145 被诅咒的魔刃、14148 水晶腕轮、14149 地下斗篷 |
| 怒焰裂谷（ragefire_chasm） | jergosh_the_invoker | required | 祈求者耶戈什（jergosh_the_invoker） | boss_drop:jergosh_the_invoker | 1 | 14151 咏唱之刃、14150 唤魔者长袍、14147 洞穴护腕 |
| 怒焰裂谷（ragefire_chasm） | bazzalan | required | 巴扎兰（bazzalan） | 无装备掉落 | 0 | — |
| 剃刀沼泽（razorfen_kraul） | razorfen_kraul_roogug | optional | 鲁古格（razorfen_kraul_roogug） | 无装备掉落 | 0 | — |
| 剃刀沼泽（razorfen_kraul） | razorfen_kraul_aggem_thorncurse | required | 阿格姆·荆棘诅咒（razorfen_kraul_aggem_thorncurse） | boss_drop:razorfen_kraul_aggem_thorncurse | 1 | 6681 棘刺 |
| 剃刀沼泽（razorfen_kraul） | razorfen_kraul_death_speaker_jargba | required | 死亡之语者·贾格巴（razorfen_kraul_death_speaker_jargba） | boss_drop:razorfen_kraul_death_speaker_jargba | 1 | 6682 亡语者长袍、6685 亡语者衬肩、2816 死亡之语者节杖 |
| 剃刀沼泽（razorfen_kraul） | razorfen_kraul_overlord_ramtusk | required | 主宰拉姆塔斯（razorfen_kraul_overlord_ramtusk） | boss_drop:razorfen_kraul_overlord_ramtusk | 1 | 6686 长牙头盔、6687 尸体制造者 |
| 剃刀沼泽（razorfen_kraul） | razorfen_kraul_agathelos_the_raging | required | 暴怒的阿迦赛罗斯（razorfen_kraul_agathelos_the_raging） | boss_drop:razorfen_kraul_agathelos_the_raging | 1 | 6690 野兽护腿、6691 猪牙匕首 |
| 剃刀沼泽（razorfen_kraul） | razorfen_kraul_blind_hunter | rare（0.16） | 盲眼猎手（razorfen_kraul_blind_hunter） | boss_drop:razorfen_kraul_blind_hunter | 1 | 6695 冥骨护符、6696 夜行者之弓、6697 蝙蝠之翼 |
| 剃刀沼泽（razorfen_kraul） | razorfen_kraul_charlga_razorflank | required | 卡尔加·刺肋（razorfen_kraul_charlga_razorflank） | boss_drop:razorfen_kraul_charlga_razorflank | 1 | 6693 阿迦玛甘之握、6692 分叉斧、6694 阿迦玛甘之心 |
| 剃刀沼泽（razorfen_kraul） | razorfen_kraul_earthcaller_halmgar | rare（0.12） | 召地者哈穆加（razorfen_kraul_earthcaller_halmgar） | boss_drop:razorfen_kraul_earthcaller_halmgar | 1 | 6688 轻风头饰、6689 风灵法杖 |
| 血色修道院：墓地（scarlet_monastery_graveyard） | scarlet_gy_interrogator_vishas | required | 审讯官维萨斯（scarlet_gy_interrogator_vishas） | boss_drop:scarlet_gy_interrogator_vishas | 1 | 7683 染血的手指虎、7682 烙铁棍 |
| 血色修道院：墓地（scarlet_monastery_graveyard） | scarlet_gy_azshir_the_sleepless | rare（0.33） | 不眠的阿齐尔（scarlet_gy_azshir_the_sleepless） | boss_drop:scarlet_gy_azshir_the_sleepless | 1 | 7708 腐坏魔杖、7731 鬼魅碎片护符、7709 荒芜护腿 |
| 血色修道院：墓地（scarlet_monastery_graveyard） | scarlet_gy_fallen_champion | rare（0.33） | 堕落的勇士（scarlet_gy_fallen_champion） | boss_drop:scarlet_gy_fallen_champion | 1 | 7690 乌木钳、7691 裹尸布、7689 恐怖黎明 |
| 血色修道院：墓地（scarlet_monastery_graveyard） | scarlet_gy_ironspine | rare（0.34） | 铁脊（scarlet_gy_ironspine） | boss_drop:scarlet_gy_ironspine | 1 | 7686 铁脊死灵之眼、7688 铁脊死灵之肋、7687 铁脊死灵之拳 |
| 血色修道院：墓地（scarlet_monastery_graveyard） | scarlet_gy_bloodmage_thalnos | required | 血法师萨尔诺斯（scarlet_gy_bloodmage_thalnos） | boss_drop:scarlet_gy_bloodmage_thalnos | 1 | 7684 血法师衬肩、7685 遗忘先知宝珠 |
| 影牙城堡（shadowfang_keep） | sfk_rethilgore | required | 雷希戈尔（sfk_rethilgore） | boss_drop:sfk_rethilgore | 1 | 5254 皱褶肩甲 |
| 影牙城堡（shadowfang_keep） | sfk_razorclaw | required | 屠夫拉佐克劳（sfk_razorclaw） | boss_drop:sfk_razorclaw | 1 | 1292 屠夫的切肉刀、6226 鲜血围裙、6633 屠夫的剔骨刀 |
| 影牙城堡（shadowfang_keep） | sfk_baron_silverlaine | required | 席瓦莱恩男爵（sfk_baron_silverlaine） | boss_drop:sfk_baron_silverlaine | 1 | 6321 席瓦莱恩家族徽记、6323 巴隆的节杖 |
| 影牙城堡（shadowfang_keep） | sfk_commander_springvale | required | 指挥官斯普林瓦尔（sfk_commander_springvale） | boss_drop:sfk_commander_springvale | 1 | 6320 指挥官纹章盾、3191 曲刃战斧 |
| 影牙城堡（shadowfang_keep） | sfk_odo | required | 盲眼守卫奥杜（sfk_odo） | boss_drop:sfk_odo | 1 | 6318 奥杜之杖、6319 盲者束带 |
| 影牙城堡（shadowfang_keep） | sfk_fenrus | required | 吞噬者芬鲁斯（sfk_fenrus） | boss_drop:sfk_fenrus | 1 | 6340 芬鲁斯的外皮、3230 黑狼护腕 |
| 影牙城堡（shadowfang_keep） | sfk_wolf_master_nandos | required | 狼王南杜斯（sfk_wolf_master_nandos） | boss_drop:sfk_wolf_master_nandos | 1 | 3748 猎豹衬肩、6314 狼王斗篷 |
| 影牙城堡（shadowfang_keep） | sfk_archmage_arugal | required | 大法师阿鲁高（sfk_archmage_arugal） | boss_drop:sfk_archmage_arugal | 1 | 6324 阿鲁高法袍、6392 阿鲁高的腰带、6220 流星碎片 |
| 暴风城监狱（the_stockade） | stockade_targorr_the_dread | required | 可怕的塔格尔（stockade_targorr_the_dread） | 无装备掉落 | 0 | — |
| 暴风城监狱（the_stockade） | stockade_kam_deepfury | required | 卡姆·深怒（stockade_kam_deepfury） | 无装备掉落 | 0 | — |
| 暴风城监狱（the_stockade） | stockade_hamhock | required | 哈姆霍克（stockade_hamhock） | 无装备掉落 | 0 | — |
| 暴风城监狱（the_stockade） | stockade_bazil_thredd | required | 巴基尔·斯瑞德（stockade_bazil_thredd） | 无装备掉落 | 0 | — |
| 暴风城监狱（the_stockade） | stockade_dextren_ward | required | 迪克斯特·瓦德（stockade_dextren_ward） | 无装备掉落 | 0 | — |
| 暴风城监狱（the_stockade） | stockade_bruegal_ironknuckle | rare（0.22） | 布鲁高·铁拳（stockade_bruegal_ironknuckle） | boss_drop:stockade_bruegal_ironknuckle | 1 | 2941 监狱骨片、2942 铁指虎、3228 弯曲护腕 |
| 哀嚎洞穴（wailing_caverns） | wc_lady_anacondra | required | 安娜科德拉（wc_lady_anacondra） | boss_drop:wc_lady_anacondra | 1 | 10412 尖牙腰带、5404 坚硬的肩垫 |
| 哀嚎洞穴（wailing_caverns） | wc_lord_cobrahn | required | 考布莱恩领主（wc_lord_cobrahn） | boss_drop:wc_lord_cobrahn | 1 | 6460 考布莱恩的腰带、10410 尖牙护腿、6465 水蛇法袍 |
| 哀嚎洞穴（wailing_caverns） | wc_kresh | required | 克雷什（wc_kresh） | boss_drop:wc_kresh | 1 | 6447 破旧的龟壳盾牌、13245 克雷什之背 |
| 哀嚎洞穴（wailing_caverns） | wc_lord_pythas | required | 皮萨斯领主（wc_lord_pythas） | boss_drop:wc_lord_pythas | 1 | 6472 毒蛇之刺、6473 尖牙铠甲 |
| 哀嚎洞穴（wailing_caverns） | wc_skum | required | 斯卡姆（wc_skum） | boss_drop:wc_skum | 1 | 6449 发光的蜥蜴披风、6448 尾钉 |
| 哀嚎洞穴（wailing_caverns） | wc_lord_serpentis | required | 瑟芬迪斯领主（wc_lord_serpentis） | boss_drop:wc_lord_serpentis | 1 | 6469 毒蛇、5970 毒蛇手套、10411 尖牙足垫、6459 野蛮锁靴 |
| 哀嚎洞穴（wailing_caverns） | wc_verdan | required | 永生者沃尔丹（wc_verdan） | boss_drop:wc_verdan | 1 | 6630 淡云圆盾、6631 生命之根、6629 蜘蛛斗篷 |
| 哀嚎洞穴（wailing_caverns） | wc_mutanus | required | 吞噬者穆坦努斯（wc_mutanus） | boss_drop:wc_mutanus | 1 | 6461 粘液覆盖的垫肩、6627 穆坦努斯的胸甲、6463 深渊之戒 |

## 引用完整度

- 副本路线节点：61。
- 副本任务：15。
- 套装：1。
- 未被路线引用的掉落表：0。
- 未被掉落、任务或套装引用的非初始装备：0。
- 未关联有效副本的任务：0。
- 未被收藏奖励引用的套装：0。
- 任务奖励与 Boss 掉落重复：0。

## 结论

- 当前任务奖励与 Boss 掉落池没有重复装备。
- 当前没有未被路线引用的掉落表。
