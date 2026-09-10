# 副本内容完整度审计

生成日期：2026-09-10

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
| 黑石深渊：禁闭区（blackrock_depths_detention_block） | brd_detention_high_interrogator_gerstahn | required | 审讯官格斯塔恩（brd_detention_high_interrogator_gerstahn） | boss_drop:brd_detention_high_interrogator_gerstahn | 1 | 11626 黑雾斗篷、11624 肯提克护肩、22240 凋零绝望胫甲、11625 奴役之球 |
| 黑石深渊：禁闭区（blackrock_depths_detention_block） | brd_detention_lord_roccor | optional | 洛考尔（brd_detention_lord_roccor） | boss_drop:brd_detention_lord_roccor | 1 | 22234 失落希望衬肩、11632 土渣护肩、11631 石壳盾牌、22397 凶猛神像 |
| 黑石深渊：禁闭区（blackrock_depths_detention_block） | brd_detention_houndmaster_grebmar | optional | 驯犬者格雷布玛尔（brd_detention_houndmaster_grebmar） | boss_drop:brd_detention_houndmaster_grebmar | 1 | 11623 灵法斗篷、11627 铁索胫甲、11628 驯犬者长弓、11629 驯犬者步枪 |
| 黑石深渊：禁闭区（blackrock_depths_detention_block） | brd_detention_ring_of_law | required | 秩序竞技场（brd_detention_ring_of_law） | 无装备掉落 | 0 | — |
| 黑石深渊：禁闭区（blackrock_depths_detention_block） | brd_detention_arena_gorosh | rare（0.16666666666666666） | 修行者高罗什（brd_detention_arena_gorosh） | boss_drop:brd_detention_arena_gorosh | 1 | 11726 野蛮角斗士链甲、22271 狂乱魔法护腿、22257 血块指环、22266 火焰荆棘 |
| 黑石深渊：禁闭区（blackrock_depths_detention_block） | brd_detention_arena_grizzle | rare（0.16666666666666666） | 格里兹尔（brd_detention_arena_grizzle） | boss_drop:brd_detention_arena_grizzle | 1 | 11722 破铁肩甲、11703 石墙腰带、22270 冒犯之靴、11702 格里兹尔的剥皮斧 |
| 黑石深渊：禁闭区（blackrock_depths_detention_block） | brd_detention_arena_eviscerator | rare（0.16666666666666666） | 剜眼者（brd_detention_arena_eviscerator） | boss_drop:brd_detention_arena_eviscerator | 1 | 11685 碎鳞护肩、11679 透红护臂、11686 野兽怒气腰带、11730 野蛮角斗士护手 |
| 黑石深渊：禁闭区（blackrock_depths_detention_block） | brd_detention_arena_okthor | rare（0.16666666666666666） | 破坏者奥科索尔（brd_detention_arena_okthor） | boss_drop:brd_detention_arena_okthor | 1 | 11665 食人魔先知之拳、11662 奥科索尔腰带、11728 野蛮角斗士护腿、11824 巨石指环 |
| 黑石深渊：禁闭区（blackrock_depths_detention_block） | brd_detention_arena_anubshiah | rare（0.16666666666666666） | 阿努希尔（brd_detention_arena_anubshiah） | boss_drop:brd_detention_arena_anubshiah | 1 | 11678 阿努希尔之壳、11677 腐烂斗篷、11675 蛛魔长靴、11731 野蛮角斗士护胫 |
| 黑石深渊：禁闭区（blackrock_depths_detention_block） | brd_detention_arena_hedrum | rare（0.16666666666666666） | 爬行者赫杜姆（brd_detention_arena_hedrum） | boss_drop:brd_detention_arena_hedrum | 1 | 11633 巨蛛甲壳、11634 丝网手套、11635 钩牙匕首、11729 野蛮角斗士头盔 |
| 黑石深渊：禁闭区（blackrock_depths_detention_block） | brd_detention_pyromancer_loregrain | rare（0.18） | 控火师罗格雷恩（brd_detention_pyromancer_loregrain） | boss_drop:brd_detention_pyromancer_loregrain | 1 | 11747 烈焰行者长袍、11749 灼鳞护腿、11748 燃烧手杖、11750 引火手杖 |
| 黑石深渊：禁闭区（blackrock_depths_detention_block） | brd_detention_black_vault | optional | 黑色宝库（brd_detention_black_vault） | boss_drop:brd_detention_black_vault | 1 | 22256 法术塑能裹手、22205 黑钢护腕、22255 岩浆指环、22254 永恒光明魔杖、11923 恩赐之锤、11945 黑铁戒指〔词缀〕、11946 火蛋白石项链〔词缀〕 |
| 黑石深渊：禁闭区（blackrock_depths_detention_block） | brd_detention_watchman_doomgrip | optional | 卫兵杜格瑞普（brd_detention_watchman_doomgrip） | boss_drop:brd_detention_watchman_doomgrip | 1 | 22205 黑钢护腕、22255 岩浆指环、22256 法术塑能裹手、22254 永恒光明魔杖 |
| 黑石深渊：禁闭区（blackrock_depths_detention_block） | brd_detention_warder_stilgiss | optional | 典狱官斯迪尔基斯（brd_detention_warder_stilgiss） | boss_drop:brd_detention_warder_stilgiss | 1 | 11782 北地衬肩、22241 黑暗守望者肩甲、11783 寒钢束腰、11784 仲裁者之刃 |
| 黑石深渊：禁闭区（blackrock_depths_detention_block） | brd_detention_verek | rare（0.35） | 维雷克（brd_detention_verek） | boss_drop:brd_detention_verek | 1 | 11755 维雷克的镣铐、22242 维雷克的束缚 |
| 黑石深渊：禁闭区（blackrock_depths_detention_block） | brd_detention_fineous_darkvire | required | 弗诺斯·达克维尔（brd_detention_fineous_darkvire） | boss_drop:brd_detention_fineous_darkvire | 1 | 11839 大石匠的眼镜、22223 工头的面甲、11842 首席测量员的衬肩、11841 主设计师的长裤 |
| 黑石深渊：禁闭区（blackrock_depths_detention_block） | brd_detention_lord_incendius | optional | 伊森迪奥斯（brd_detention_lord_incendius） | boss_drop:brd_detention_lord_incendius | 1 | 11766 焰纹护腕、11764 灰鳞护臂、11765 焚铁护腕、11767 琥珀臂甲、11768 易然护腕 |
| 黑石深渊：禁闭区（blackrock_depths_detention_block） | brd_detention_baelgar | optional | 贝尔加（brd_detention_baelgar） | boss_drop:brd_detention_baelgar | 1 | 11807 燃心腰带、11802 火浪护腿、11805 燃石战锤、11803 熔岩之力 |
| 黑石深渊：暗炉城（blackrock_depths_shadowforge_city） | brd_shadowforge_general_angerforge | optional | 安格弗将军（brd_shadowforge_general_angerforge） | boss_drop:brd_shadowforge_general_angerforge | 1 | 11820 盛饰护甲、11821 战争护腿、11810 意志之力、11817 安格弗的剑、11816 安格弗的战斧、11841 主设计师的长裤 |
| 黑石深渊：暗炉城（blackrock_depths_shadowforge_city） | brd_shadowforge_golem_lord_argelmach | optional | 傀儡统帅阿格曼奇（brd_shadowforge_golem_lord_argelmach） | boss_drop:brd_shadowforge_golem_lord_argelmach | 1 | 11823 渊博褶裙、11822 全法长靴、11669 阿格曼奇之戒、11819 复苏之风 |
| 黑石深渊：暗炉城（blackrock_depths_shadowforge_city） | brd_shadowforge_hurley_blackbreath | optional | 霍尔雷·黑须（brd_shadowforge_hurley_blackbreath） | boss_drop:brd_shadowforge_hurley_blackbreath | 1 | 11735 怒气眼罩、18043 煤工长靴、22275 火苔长靴、18044 霍尔雷的酒杯 |
| 黑石深渊：暗炉城（blackrock_depths_shadowforge_city） | brd_shadowforge_ribbly_screwspigot | optional | 雷布里·斯库比格特（brd_shadowforge_ribbly_screwspigot） | 无装备掉落 | 0 | — |
| 黑石深渊：暗炉城（blackrock_depths_shadowforge_city） | brd_shadowforge_plugger_spazzring | optional | 普拉格（brd_shadowforge_plugger_spazzring） | boss_drop:brd_shadowforge_plugger_spazzring | 1 | 12793 普拉格的外套、12791 酒吧凶器 |
| 黑石深渊：暗炉城（blackrock_depths_shadowforge_city） | brd_shadowforge_phalanx | required | 法拉克斯（brd_shadowforge_phalanx） | boss_drop:brd_shadowforge_phalanx | 1 | 22212 石傀儡肩铠、11745 法拉克斯之拳、11744 血拳、11743 石拳 |
| 黑石深渊：暗炉城（blackrock_depths_shadowforge_city） | brd_shadowforge_ambassador_flamelash | required | 弗莱拉斯大使（brd_shadowforge_ambassador_flamelash） | boss_drop:brd_shadowforge_ambassador_flamelash | 1 | 11808 烈焰之环、11812 火灵斗篷、11814 熔岩之拳、11832 博学坠饰、11809 烈焰之怒 |
| 黑石深渊：暗炉城（blackrock_depths_shadowforge_city） | brd_shadowforge_panzor | rare（0.32） | 无敌的潘佐尔（brd_shadowforge_panzor） | boss_drop:brd_shadowforge_panzor | 1 | 22245 煤烟护足、11787 岩壳长靴、11785 石傀儡之盾、11786 大地之石 |
| 黑石深渊：暗炉城（blackrock_depths_shadowforge_city） | brd_shadowforge_seven | required | 七贤（brd_shadowforge_seven） | boss_drop:brd_shadowforge_seven | 1 | 11925 幽灵面罩、11926 死灵胸甲、11929 鬼灵护腿、11927 永恒守护者腿铠、11920 鬼魂镰刀、11923 恩赐之锤、11922 血蚀之刃、11921 磐石巨锤 |
| 黑石深渊：暗炉城（blackrock_depths_shadowforge_city） | brd_shadowforge_lyceum | required | 讲学厅（brd_shadowforge_lyceum） | 无装备掉落 | 0 | — |
| 黑石深渊：暗炉城（blackrock_depths_shadowforge_city） | brd_shadowforge_magmus | required | 玛格姆斯（brd_shadowforge_magmus） | boss_drop:brd_shadowforge_magmus | 1 | 11746 石颅头盔、11935 玛格姆斯之石、22395 怒气图腾、22400 真言圣契、22208 熔岩石锤 |
| 黑石深渊：暗炉城（blackrock_depths_shadowforge_city） | brd_shadowforge_princess_moira | optional | 茉艾拉·铜须公主（brd_shadowforge_princess_moira） | boss_drop:brd_shadowforge_princess_moira | 1 | 12557 乌钢肩甲、12554 传令官之手、12556 高阶女祭司之靴、12553 迅捷长靴 |
| 黑石深渊：暗炉城（blackrock_depths_shadowforge_city） | brd_shadowforge_emperor_dagran_thaurissan | required | 达格兰·索瑞森大帝（brd_shadowforge_emperor_dagran_thaurissan） | boss_drop:brd_shadowforge_emperor_dagran_thaurissan | 1 | 11684 反对者、11933 帝王宝石、11930 皇帝的新斗篷、11924 皇冠法袍、22204 名望护腕、22207 追猎腰带、11934 皇帝徽记、11815 正义之手、11928 索瑞森皇家节杖、11931 恐怖复仇者、11932 智慧手杖 |
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
| 玛拉顿（maraudon） | maraudon_pariahs_instructions | optional | 贱民的指引（maraudon_pariahs_instructions） | 无装备掉落 | 0 | — |
| 玛拉顿（maraudon） | maraudon_noxxion | required | 诺克赛恩（maraudon_noxxion） | boss_drop:maraudon_noxxion | 1 | 17746 诺克赛恩的镣铐、17744 诺克赛恩之心、17745 诺克赛恩魔杖 |
| 玛拉顿（maraudon） | maraudon_razorlash | optional | 锐刺鞭笞者（maraudon_razorlash） | boss_drop:maraudon_razorlash | 1 | 17749 树皮肩铠、17748 腐藤便鞋、17750 绿瘤束带、17751 藤蔓护腿 |
| 玛拉顿（maraudon） | maraudon_lord_vyletongue | required | 维利塔恩（maraudon_lord_vyletongue） | boss_drop:maraudon_lord_vyletongue | 1 | 17755 萨特之鬃、17754 恶魔欺诈者护腿、17752 萨特之刺 |
| 玛拉顿（maraudon） | maraudon_meshlok_the_harvester | rare（0.12） | 收割者麦什洛克（maraudon_meshlok_the_harvester） | boss_drop:maraudon_meshlok_the_harvester | 1 | 17767 花苗头饰、17741 自然的拥抱、17742 蘑菇护甲 |
| 玛拉顿（maraudon） | maraudon_celebras_the_cursed | required | 被诅咒的塞雷布拉斯（maraudon_celebras_the_cursed） | boss_drop:maraudon_celebras_the_cursed | 1 | 17740 抚慰者头饰、17739 丛林守护者披风、17738 塞雷布拉斯之爪 |
| 玛拉顿（maraudon） | maraudon_landslide | required | 兰斯利德（maraudon_landslide） | boss_drop:maraudon_landslide | 1 | 17734 山脉头盔、17736 石钳护手、17737 云石、17943 石拳 |
| 玛拉顿（maraudon） | maraudon_tinkerer_gizlock | optional | 工匠吉兹洛克（maraudon_tinkerer_gizlock） | boss_drop:maraudon_tinkerer_gizlock | 1 | 17718 吉兹洛克的高科技圆盾、17717 超射程精密步枪、17719 发明家的聚焦剑 |
| 玛拉顿（maraudon） | maraudon_rotgrip | optional | 洛特格里普（maraudon_rotgrip） | boss_drop:maraudon_rotgrip | 1 | 17732 洛特格里普衬肩、17728 白鳄长靴、17730 鳄齿利斧 |
| 玛拉顿（maraudon） | maraudon_princess_theradras | required | 瑟莱德丝公主（maraudon_princess_theradras） | boss_drop:maraudon_princess_theradras | 1 | 17780 无尽黑暗之刃、17715 瑟莱德丝之眼、17707 碎玉之心、17714 岩石公主护腕、17711 元素石脊护腿、17713 黑石戒指、17710 焦石飞镖、17766 瑟莱德丝公主的节杖 |
| 怒焰裂谷（ragefire_chasm） | oggleflint | required | 奥格弗林特（oggleflint） | 无装备掉落 | 0 | — |
| 怒焰裂谷（ragefire_chasm） | taragaman_the_hungerer | required | 饥饿者塔拉加曼（taragaman_the_hungerer） | boss_drop:taragaman_the_hungerer | 1 | 14145 被诅咒的魔刃、14148 水晶腕轮、14149 地下斗篷 |
| 怒焰裂谷（ragefire_chasm） | jergosh_the_invoker | required | 祈求者耶戈什（jergosh_the_invoker） | boss_drop:jergosh_the_invoker | 1 | 14151 咏唱之刃、14150 唤魔者长袍、14147 洞穴护腕 |
| 怒焰裂谷（ragefire_chasm） | bazzalan | required | 巴扎兰（bazzalan） | 无装备掉落 | 0 | — |
| 剃刀高地（razorfen_downs） | razorfen_downs_tutenkash | required | 图特卡什（razorfen_downs_tutenkash） | boss_drop:razorfen_downs_tutenkash | 1 | 10776 蜘蛛银丝斗篷、10775 图特卡什的甲壳、10777 蜘蛛手套 |
| 剃刀高地（razorfen_downs） | razorfen_downs_lady_faltheress | rare（0.08） | 法瑟蕾丝夫人（razorfen_downs_lady_faltheress） | boss_drop:razorfen_downs_lady_faltheress | 1 | 23178 法瑟蕾丝夫人的衬肩、23177 法瑟蕾丝夫人的手指 |
| 剃刀高地（razorfen_downs） | razorfen_downs_mordresh_fire_eye | required | 火眼莫德雷斯（razorfen_downs_mordresh_fire_eye） | boss_drop:razorfen_downs_mordresh_fire_eye | 1 | 10769 莫德雷斯之眼、10771 死亡法师腰带、10770 莫德雷斯的颅骨 |
| 剃刀高地（razorfen_downs） | razorfen_downs_plaguemaw_the_rotting | optional | 腐烂的普雷莫尔（razorfen_downs_plaguemaw_the_rotting） | boss_drop:razorfen_downs_plaguemaw_the_rotting | 1 | 10766 瘟疫短枝、10760 野猪之拳 |
| 剃刀高地（razorfen_downs） | razorfen_downs_glutton | required | 暴食者（razorfen_downs_glutton） | boss_drop:razorfen_downs_glutton | 1 | 10774 血皮护肩、10772 暴食者之斧 |
| 剃刀高地（razorfen_downs） | razorfen_downs_ragglesnout | rare（0.16） | 拉戈斯诺特（razorfen_downs_ragglesnout） | boss_drop:razorfen_downs_ragglesnout | 1 | 10768 野猪人勇士腰带、10767 野猪之盾、10758 石猪剑 |
| 剃刀高地（razorfen_downs） | razorfen_downs_amnennar_the_coldbringer | required | 寒冰之王亚门纳尔（razorfen_downs_amnennar_the_coldbringer） | boss_drop:razorfen_downs_amnennar_the_coldbringer | 1 | 10763 冰铁之盔、10762 巫妖法袍、10764 死寒护甲、10761 寒怒匕首、10765 白骨手指 |
| 剃刀沼泽（razorfen_kraul） | razorfen_kraul_roogug | optional | 鲁古格（razorfen_kraul_roogug） | 无装备掉落 | 0 | — |
| 剃刀沼泽（razorfen_kraul） | razorfen_kraul_aggem_thorncurse | required | 阿格姆·荆棘诅咒（razorfen_kraul_aggem_thorncurse） | boss_drop:razorfen_kraul_aggem_thorncurse | 1 | 6681 棘刺 |
| 剃刀沼泽（razorfen_kraul） | razorfen_kraul_death_speaker_jargba | required | 死亡之语者·贾格巴（razorfen_kraul_death_speaker_jargba） | boss_drop:razorfen_kraul_death_speaker_jargba | 1 | 6682 亡语者长袍、6685 亡语者衬肩、2816 死亡之语者节杖 |
| 剃刀沼泽（razorfen_kraul） | razorfen_kraul_overlord_ramtusk | required | 主宰拉姆塔斯（razorfen_kraul_overlord_ramtusk） | boss_drop:razorfen_kraul_overlord_ramtusk | 1 | 6686 长牙头盔、6687 尸体制造者 |
| 剃刀沼泽（razorfen_kraul） | razorfen_kraul_agathelos_the_raging | required | 暴怒的阿迦赛罗斯（razorfen_kraul_agathelos_the_raging） | boss_drop:razorfen_kraul_agathelos_the_raging | 1 | 6690 野兽护腿、6691 猪牙匕首 |
| 剃刀沼泽（razorfen_kraul） | razorfen_kraul_blind_hunter | rare（0.16） | 盲眼猎手（razorfen_kraul_blind_hunter） | boss_drop:razorfen_kraul_blind_hunter | 1 | 6695 冥骨护符、6696 夜行者之弓、6697 蝙蝠之翼 |
| 剃刀沼泽（razorfen_kraul） | razorfen_kraul_charlga_razorflank | required | 卡尔加·刺肋（razorfen_kraul_charlga_razorflank） | boss_drop:razorfen_kraul_charlga_razorflank | 1 | 6693 阿迦玛甘之握、6692 分叉斧、6694 阿迦玛甘之心 |
| 剃刀沼泽（razorfen_kraul） | razorfen_kraul_earthcaller_halmgar | rare（0.12） | 召地者哈穆加（razorfen_kraul_earthcaller_halmgar） | boss_drop:razorfen_kraul_earthcaller_halmgar | 1 | 6688 轻风头饰、6689 风灵法杖 |
| 血色修道院：军械库（scarlet_monastery_armory） | scarlet_armory_herod | required | 赫洛德（scarlet_armory_herod） | boss_drop:scarlet_armory_herod | 1 | 7719 狂暴者头盔、7718 赫洛德的护肩、10330 血色十字军护腿、7717 破坏者 |
| 血色修道院：大教堂（scarlet_monastery_cathedral） | scarlet_cathedral_high_inquisitor_fairbanks | optional | 大检察官法尔班克斯（scarlet_cathedral_high_inquisitor_fairbanks） | boss_drop:scarlet_cathedral_high_inquisitor_fairbanks | 1 | 19507 审讯者披肩、19508 烙印皮护腕、19509 生锈的锁甲战靴 |
| 血色修道院：大教堂（scarlet_monastery_cathedral） | scarlet_cathedral_commander_mograine | required | 血色十字军指挥官莫格莱尼（scarlet_cathedral_commander_mograine） | boss_drop:scarlet_cathedral_commander_mograine | 1 | 7724 神圣护手、10330 血色十字军护腿、7726 血色指挥官之盾、7723 莫格莱尼的力量 |
| 血色修道院：大教堂（scarlet_monastery_cathedral） | scarlet_cathedral_high_inquisitor_whitemane | required | 大检察官怀特迈恩（scarlet_cathedral_high_inquisitor_whitemane） | boss_drop:scarlet_cathedral_high_inquisitor_whitemane | 1 | 7720 主教之冠、7722 圣使护符、7721 公正之手 |
| 血色修道院：墓地（scarlet_monastery_graveyard） | scarlet_gy_interrogator_vishas | required | 审讯官维萨斯（scarlet_gy_interrogator_vishas） | boss_drop:scarlet_gy_interrogator_vishas | 1 | 7683 染血的手指虎、7682 烙铁棍 |
| 血色修道院：墓地（scarlet_monastery_graveyard） | scarlet_gy_azshir_the_sleepless | rare（0.33） | 不眠的阿齐尔（scarlet_gy_azshir_the_sleepless） | boss_drop:scarlet_gy_azshir_the_sleepless | 1 | 7708 腐坏魔杖、7731 鬼魅碎片护符、7709 荒芜护腿 |
| 血色修道院：墓地（scarlet_monastery_graveyard） | scarlet_gy_fallen_champion | rare（0.33） | 堕落的勇士（scarlet_gy_fallen_champion） | boss_drop:scarlet_gy_fallen_champion | 1 | 7690 乌木钳、7691 裹尸布、7689 恐怖黎明 |
| 血色修道院：墓地（scarlet_monastery_graveyard） | scarlet_gy_ironspine | rare（0.34） | 铁脊（scarlet_gy_ironspine） | boss_drop:scarlet_gy_ironspine | 1 | 7686 铁脊死灵之眼、7688 铁脊死灵之肋、7687 铁脊死灵之拳 |
| 血色修道院：墓地（scarlet_monastery_graveyard） | scarlet_gy_bloodmage_thalnos | required | 血法师萨尔诺斯（scarlet_gy_bloodmage_thalnos） | boss_drop:scarlet_gy_bloodmage_thalnos | 1 | 7684 血法师衬肩、7685 遗忘先知宝珠 |
| 血色修道院：图书馆（scarlet_monastery_library） | scarlet_library_houndmaster_loksey | optional | 驯犬者洛克希（scarlet_library_houndmaster_loksey） | boss_drop:scarlet_library_houndmaster_loksey | 1 | 7710 洛克希的教鞭、7756 驯犬手套 |
| 血色修道院：图书馆（scarlet_monastery_library） | scarlet_library_arcanist_doan | required | 奥法师杜安（scarlet_library_arcanist_doan） | boss_drop:scarlet_library_arcanist_doan | 1 | 7714 催眠之刃、7713 幻影法杖、7712 杜安的衬肩、7711 杜安法袍 |
| 影牙城堡（shadowfang_keep） | sfk_rethilgore | required | 雷希戈尔（sfk_rethilgore） | boss_drop:sfk_rethilgore | 1 | 5254 皱褶肩甲 |
| 影牙城堡（shadowfang_keep） | sfk_razorclaw | required | 屠夫拉佐克劳（sfk_razorclaw） | boss_drop:sfk_razorclaw | 1 | 1292 屠夫的切肉刀、6226 鲜血围裙、6633 屠夫的剔骨刀 |
| 影牙城堡（shadowfang_keep） | sfk_baron_silverlaine | required | 席瓦莱恩男爵（sfk_baron_silverlaine） | boss_drop:sfk_baron_silverlaine | 1 | 6321 席瓦莱恩家族徽记、6323 巴隆的节杖 |
| 影牙城堡（shadowfang_keep） | sfk_commander_springvale | required | 指挥官斯普林瓦尔（sfk_commander_springvale） | boss_drop:sfk_commander_springvale | 1 | 6320 指挥官纹章盾、3191 曲刃战斧 |
| 影牙城堡（shadowfang_keep） | sfk_odo | required | 盲眼守卫奥杜（sfk_odo） | boss_drop:sfk_odo | 1 | 6318 奥杜之杖、6319 盲者束带 |
| 影牙城堡（shadowfang_keep） | sfk_fenrus | required | 吞噬者芬鲁斯（sfk_fenrus） | boss_drop:sfk_fenrus | 1 | 6340 芬鲁斯的外皮、3230 黑狼护腕 |
| 影牙城堡（shadowfang_keep） | sfk_wolf_master_nandos | required | 狼王南杜斯（sfk_wolf_master_nandos） | boss_drop:sfk_wolf_master_nandos | 1 | 3748 猎豹衬肩、6314 狼王斗篷 |
| 影牙城堡（shadowfang_keep） | sfk_archmage_arugal | required | 大法师阿鲁高（sfk_archmage_arugal） | boss_drop:sfk_archmage_arugal | 1 | 6324 阿鲁高法袍、6392 阿鲁高的腰带、6220 流星碎片 |
| 阿塔哈卡神庙（sunken_temple） | sunken_temple_atalalarion | optional | 阿塔拉利恩（sunken_temple_atalalarion） | boss_drop:sunken_temple_atalalarion | 1 | 10800 暗水护腕、10798 阿塔拉利恩的牙环、10799 刺头之矛 |
| 阿塔哈卡神庙（sunken_temple） | sunken_temple_balcony_minibosses | required | 环廊六首领（sunken_temple_balcony_minibosses） | boss_drop:sunken_temple_balcony_minibosses | 6 | 10783 阿塔莱肩甲、10784 阿塔莱胸甲、10787 阿塔莱手套、10788 阿塔莱束带、10785 阿塔莱护腿、10786 阿塔莱长靴 |
| 阿塔哈卡神庙（sunken_temple） | sunken_temple_spawn_of_hakkar | optional | 哈卡的后代（sunken_temple_spawn_of_hakkar） | boss_drop:sunken_temple_spawn_of_hakkar | 1 | 10801 滑鳞长靴、10802 翼膜披风 |
| 阿塔哈卡神庙（sunken_temple） | sunken_temple_avatar_of_hakkar | optional | 哈卡的化身（sunken_temple_avatar_of_hakkar） | boss_drop:sunken_temple_avatar_of_hakkar | 1 | 12462 风蛇的拥抱、10843 羽毛斗篷、10845 战士的拥抱、10842 风鳞布裙、10846 溅血胫甲、10838 哈卡之力、10844 哈卡之塔 |
| 阿塔哈卡神庙（sunken_temple） | sunken_temple_jammalan_the_prophet | required | 预言者迦玛兰（sunken_temple_jammalan_the_prophet） | boss_drop:sunken_temple_jammalan_the_prophet | 1 | 10806 阿塔莱预言者法衣、10808 阿塔莱预言者手套、10807 阿塔莱预言者褶裙 |
| 阿塔哈卡神庙（sunken_temple） | sunken_temple_ogom_the_wretched | required | 可悲的奥戈姆（sunken_temple_ogom_the_wretched） | boss_drop:sunken_temple_ogom_the_wretched | 1 | 10805 食尸者、10803 奥戈姆之刃、10804 诅咒之拳 |
| 阿塔哈卡神庙（sunken_temple） | sunken_temple_dreamscythe_and_weaver | required | 德姆塞卡尔与德拉维沃尔（sunken_temple_dreamscythe_and_weaver） | boss_drop:sunken_temple_dreamscythe_and_weaver | 2 | 12465 夜幕披风、12466 黎明尖塔束带、12464 血火之爪、10797 喷火者、12463 龙牙之剑、12243 烟熏之爪、10795 龙爪指环、10796 火石 |
| 阿塔哈卡神庙（sunken_temple） | sunken_temple_morphaz_and_hazzas | required | 摩弗拉斯与哈扎斯（sunken_temple_morphaz_and_hazzas） | boss_drop:sunken_temple_morphaz_and_hazzas | 2 | 12465 夜幕披风、12466 黎明尖塔束带、12464 血火之爪、10797 喷火者、12463 龙牙之剑、12243 烟熏之爪、10795 龙爪指环、10796 火石 |
| 阿塔哈卡神庙（sunken_temple） | sunken_temple_shade_of_eranikus | required | 伊兰尼库斯的阴影（sunken_temple_shade_of_eranikus） | boss_drop:sunken_temple_shade_of_eranikus | 1 | 10847 龙之召唤、10833 伊兰尼库斯之角、10829 巨龙之眼、10836 侵蚀魔棒、10835 至高徽记之盾、10837 伊兰尼库斯之牙、10828 恐惧龙指 |
| 暴风城监狱（the_stockade） | stockade_targorr_the_dread | required | 可怕的塔格尔（stockade_targorr_the_dread） | 无装备掉落 | 0 | — |
| 暴风城监狱（the_stockade） | stockade_kam_deepfury | required | 卡姆·深怒（stockade_kam_deepfury） | 无装备掉落 | 0 | — |
| 暴风城监狱（the_stockade） | stockade_hamhock | required | 哈姆霍克（stockade_hamhock） | 无装备掉落 | 0 | — |
| 暴风城监狱（the_stockade） | stockade_bazil_thredd | required | 巴基尔·斯瑞德（stockade_bazil_thredd） | 无装备掉落 | 0 | — |
| 暴风城监狱（the_stockade） | stockade_dextren_ward | required | 迪克斯特·瓦德（stockade_dextren_ward） | 无装备掉落 | 0 | — |
| 暴风城监狱（the_stockade） | stockade_bruegal_ironknuckle | rare（0.22） | 布鲁高·铁拳（stockade_bruegal_ironknuckle） | boss_drop:stockade_bruegal_ironknuckle | 1 | 2941 监狱骨片、2942 铁指虎、3228 弯曲护腕 |
| 奥达曼（uldaman） | uldaman_lost_dwarves | required | 失踪的矮人（uldaman_lost_dwarves） | boss_drop:uldaman_lost_dwarves | 3 | 9394 海盗角盔、9398 穿旧的跑鞋、9401 盗匪长剑、9400 巴尔洛戈的短弓、9404 奥拉夫之盾、9403 破碎的海盗之盾 |
| 奥达曼（uldaman） | uldaman_revelosh | required | 鲁维罗什（uldaman_revelosh） | boss_drop:uldaman_revelosh | 1 | 9389 鲁恩乌的肩甲〔词缀〕、9388 鲁恩乌的臂甲〔词缀〕、9390 鲁恩乌的手套〔词缀〕、9387 鲁恩乌的长靴〔词缀〕 |
| 奥达曼（uldaman） | uldaman_ironaya | optional | 艾隆纳亚（uldaman_ironaya） | boss_drop:uldaman_ironaya | 1 | 9409 艾隆纳亚的护腕〔词缀〕、9407 石纹护腿、9408 铁头棒 |
| 奥达曼（uldaman） | uldaman_obsidian_sentinel | optional | 黑曜石哨兵（uldaman_obsidian_sentinel） | 无装备掉落 | 0 | — |
| 奥达曼（uldaman） | uldaman_ancient_stone_keeper | required | 古代的石头看守者（uldaman_ancient_stone_keeper） | boss_drop:uldaman_ancient_stone_keeper | 1 | 9410 山壁之拳〔词缀〕、9411 石片肩铠 |
| 奥达曼（uldaman） | uldaman_galgann_firehammer | required | 加加恩·火锤（uldaman_galgann_firehammer） | boss_drop:uldaman_galgann_firehammer | 1 | 11310 烈焰先知衬肩、9412 加加恩的火枪、11311 灰烬之鳞、9419 加加恩的火锤 |
| 奥达曼（uldaman） | uldaman_grimlok | required | 格瑞姆洛克（uldaman_grimlok） | boss_drop:uldaman_grimlok | 1 | 9415 格瑞姆洛克的部族法衣、9416 格瑞姆洛克之矛、9414 油腻的护腿 |
| 奥达曼（uldaman） | uldaman_archaedas | required | 阿扎达斯（uldaman_archaedas） | boss_drop:uldaman_archaedas | 1 | 11118 阿扎达斯之石〔词缀〕、9413 轰石之锤、9418 斩石者 |
| 哀嚎洞穴（wailing_caverns） | wc_lady_anacondra | required | 安娜科德拉（wc_lady_anacondra） | boss_drop:wc_lady_anacondra | 1 | 10412 尖牙腰带、5404 坚硬的肩垫 |
| 哀嚎洞穴（wailing_caverns） | wc_lord_cobrahn | required | 考布莱恩领主（wc_lord_cobrahn） | boss_drop:wc_lord_cobrahn | 1 | 6460 考布莱恩的腰带、10410 尖牙护腿、6465 水蛇法袍 |
| 哀嚎洞穴（wailing_caverns） | wc_kresh | required | 克雷什（wc_kresh） | boss_drop:wc_kresh | 1 | 6447 破旧的龟壳盾牌、13245 克雷什之背 |
| 哀嚎洞穴（wailing_caverns） | wc_lord_pythas | required | 皮萨斯领主（wc_lord_pythas） | boss_drop:wc_lord_pythas | 1 | 6472 毒蛇之刺、6473 尖牙铠甲 |
| 哀嚎洞穴（wailing_caverns） | wc_skum | required | 斯卡姆（wc_skum） | boss_drop:wc_skum | 1 | 6449 发光的蜥蜴披风、6448 尾钉 |
| 哀嚎洞穴（wailing_caverns） | wc_lord_serpentis | required | 瑟芬迪斯领主（wc_lord_serpentis） | boss_drop:wc_lord_serpentis | 1 | 6469 毒蛇、5970 毒蛇手套、10411 尖牙足垫、6459 野蛮锁靴 |
| 哀嚎洞穴（wailing_caverns） | wc_verdan | required | 永生者沃尔丹（wc_verdan） | boss_drop:wc_verdan | 1 | 6630 淡云圆盾、6631 生命之根、6629 蜘蛛斗篷 |
| 哀嚎洞穴（wailing_caverns） | wc_mutanus | required | 吞噬者穆坦努斯（wc_mutanus） | boss_drop:wc_mutanus | 1 | 6461 粘液覆盖的垫肩、6627 穆坦努斯的胸甲、6463 深渊之戒 |
| 祖尔法拉克（zulfarrak） | zulfarrak_zerillis | rare（0.14） | 泽雷利斯（zulfarrak_zerillis） | boss_drop:zulfarrak_zerillis | 1 | 12470 沙行者护足 |
| 祖尔法拉克（zulfarrak） | zulfarrak_antusul | required | 安图苏尔（zulfarrak_antusul） | boss_drop:zulfarrak_antusul | 1 | 9640 虎钳夹口、9641 活力护符、9639 安图苏尔之手、9379 反击者桑萨斯 |
| 祖尔法拉克（zulfarrak） | zulfarrak_sandarr_dunereaver | rare（0.12） | 沙怒守护者（zulfarrak_sandarr_dunereaver） | 无装备掉落 | 0 | — |
| 祖尔法拉克（zulfarrak） | zulfarrak_theka_the_martyr | required | 殉教者塞卡（zulfarrak_theka_the_martyr） | 无装备掉落 | 0 | — |
| 祖尔法拉克（zulfarrak） | zulfarrak_witch_doctor_zumrah | required | 巫医祖穆拉恩（zulfarrak_witch_doctor_zumrah） | boss_drop:zulfarrak_witch_doctor_zumrah | 1 | 18083 苏玛赞护手、18082 祖穆拉恩的能量法杖 |
| 祖尔法拉克（zulfarrak） | zulfarrak_dustwraith | rare（0.12） | 灰尘怨灵（zulfarrak_dustwraith） | boss_drop:zulfarrak_dustwraith | 1 | 12471 沙漠行者藤条 |
| 祖尔法拉克（zulfarrak） | zulfarrak_sandfury_executioner | required | 沙怒刽子手与百人斩（zulfarrak_sandfury_executioner） | 无装备掉落 | 0 | — |
| 祖尔法拉克（zulfarrak） | zulfarrak_nekrum_and_sezzziz | required | 耐克鲁姆·食尸者与暗影祭司塞瑟斯（zulfarrak_nekrum_and_sezzziz） | boss_drop:zulfarrak_nekrum_and_sezzziz | 1 | 9470 大坏蛋面具、9473 霉运巫毒之皮、9474 霉运巫毒之裙、9475 魔鬼割皮刀 |
| 祖尔法拉克（zulfarrak） | zulfarrak_sergeant_bly | optional | 布莱中士（zulfarrak_sergeant_bly） | 无装备掉落 | 0 | — |
| 祖尔法拉克（zulfarrak） | zulfarrak_hydromancer_velratha | required | 水占师维蕾萨（zulfarrak_hydromancer_velratha） | 无装备掉落 | 0 | — |
| 祖尔法拉克（zulfarrak） | zulfarrak_gahzrilla | optional | 加兹瑞拉（zulfarrak_gahzrilla） | boss_drop:zulfarrak_gahzrilla | 1 | 9469 加兹瑞拉鳞片护甲、9467 加兹瑞拉之牙 |
| 祖尔法拉克（zulfarrak） | zulfarrak_chief_ukorz | required | 乌克兹·沙顶与卢兹鲁（zulfarrak_chief_ukorz） | boss_drop:zulfarrak_chief_ukorz | 1 | 9479 狂乱者的拥抱、9476 大坏蛋肩甲、9478 撕裂之锯、9477 酋长的执行者、11086 保护者迦萨斯 |

## 引用完整度

- 副本路线节点：144。
- 副本任务：52。
- 套装：9。
- 未被路线引用的掉落表：0。
- 未被掉落、任务或套装引用的非初始装备：0。
- 未关联有效副本的任务：0。
- 未被收藏奖励引用的套装：dungeon_set_1_beaststalker、dungeon_set_1_devout、dungeon_set_1_dreadmist、dungeon_set_1_elements、dungeon_set_1_lightforge、dungeon_set_1_magister、dungeon_set_1_shadowcraft、dungeon_set_1_wildheart。
- 任务奖励与 Boss 掉落重复：0。

## 结论

- 当前任务奖励与 Boss 掉落池没有重复装备。
- 当前没有未被路线引用的掉落表。
