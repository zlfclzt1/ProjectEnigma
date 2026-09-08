# 新增经典旧世副本工作流

最后更新：2026-09-07

本文档说明如何为“神秘公会”新增一座可完整游玩的副本，包括资料调查、路线设计、掉落录入、装备适配、解锁、数值平衡、界面检查和测试。

适用范围：经典旧世五人副本。未来制作 10、20、25、40 人内容时仍可沿用同一数据结构，但需要额外校准人数与阵容需求。

## 1. 完成标准

一座副本只有满足以下条件，才算真正加入游戏：

- 出现在副本选择界面。
- 显示名称、解锁条件、推荐等级、Boss 数量和基础时间。
- 能选择任意符合队伍人数限制的空闲成员。
- 解锁后允许高级成员带低级成员进入。
- 出发前能显示每个 Boss 的精确通过率、全通率和预计耗时。
- 按路线逐个结算 Boss、经验、资金、日志和装备。
- 灭团后保留此前已经获得的奖励。
- 每个必打 Boss 至少有一个真实装备掉落。
- 所有装备都有物品 ID、中文名、物品等级、栏位、品质、适配规则和图标。
- 双手武器、护甲类型和职业限制符合当前装备规则。
- 新旧存档都能正常载入。
- 自动测试、JSON 校验和页面资源检查全部通过。

## 2. 去哪里查什么

不同资料源负责不同信息。不要只依赖一个攻略页面完成全部录入。

| 要查的数据 | 首选来源 | 用途 |
|---|---|---|
| Boss 名单、Boss 对应物品 ID | [AtlasLootClassic](https://github.com/Hoizame/AtlasLootClassic) | 快速确认经典版本 Boss 与掉落物品 ID |
| Boss 顺序、可选 Boss、稀有 Boss、最终 Boss | [Warcraft Wiki](https://warcraft.wiki.gg/) 的 Classic 专页 | 设计标准路线，识别零售版与经典版差异 |
| 物品中文名、物品等级、品质、类型、图标名 | [Wowhead Classic](https://www.wowhead.com/classic/) 物品 XML | 生成项目物品定义 |
| Boss 原始掉落比例 | Wowhead Classic Boss 或物品页面 | 多物品掉落池的相对权重参考 |
| 常规通关路线与大致长度 | Warcraft Wiki、Wowhead Classic 攻略 | 判断阶段划分与相对耗时 |
| 游戏内基础时间 | [总设计文档](./game-design-v0.1.md) | 最终采用的放置游戏计时参数 |
| 当前数据格式和数值尺度 | 已有副本 JSON、核心测试 | 保证新增内容与现有系统一致 |

### 2.1 AtlasLootClassic

经典地下城数据主要位于：

```text
AtlasLootClassic_DungeonsAndRaids/data.lua
```

原始数据文件：

```text
https://raw.githubusercontent.com/Hoizame/AtlasLootClassic/master/AtlasLootClassic_DungeonsAndRaids/data.lua
```

需要记录：

- 副本数据键，例如 `WailingCaverns`。
- Boss 英文名和 NPC ID。
- Boss 是否为 `rare`。
- Boss 对应的装备物品 ID。
- 任务物品、宠物、材料和普通垃圾物品，默认不要放入装备池。

定位副本的示例：

```bash
curl -L --max-time 30 -sS \
  "https://raw.githubusercontent.com/Hoizame/AtlasLootClassic/master/AtlasLootClassic_DungeonsAndRaids/data.lua" \
  | rg -n 'data\["BlackfathomDeeps"\]'
```

AtlasLoot 的主要价值是确认“哪个 Boss 对应哪些物品 ID”。它不决定本游戏的必掉规则、资金、经验或基础时间。

### 2.2 Warcraft Wiki

搜索时必须确认页面标题包含 `Classic`，或者页面内容明确描述大灾变以前的版本。

需要记录：

- 经典版本等级范围。
- 主线 Boss 顺序。
- 哪些 Boss 是可选、稀有或事件召唤。
- 标准完整路线是否必须回头、护送或触发事件。
- 最终 Boss 是谁。

例如：

- [死亡矿井（经典）](https://warcraft.wiki.gg/wiki/Deadmines_(Classic))
- [影牙城堡（经典）](https://warcraft.wiki.gg/wiki/Shadowfang_Keep_(Classic))
- [哀嚎洞穴](https://warcraft.wiki.gg/wiki/Wailing_Caverns)

注意：同名的零售版副本可能已经更换 Boss。录入前必须核对页面的版本说明和最终 Boss。

### 2.3 Wowhead Classic 物品 XML

已知物品 ID 后，可以使用中文 Classic XML：

```text
https://www.wowhead.com/classic/cn/item=物品ID&xml
```

例如阿鲁高法袍：

```text
https://www.wowhead.com/classic/cn/item=6324&xml
```

重点读取：

```xml
<name>中文名</name>
<level>物品等级</level>
<quality id="3">稀有</quality>
<class>护甲或武器</class>
<subclass>布甲、皮甲、锁甲、盾、法杖等</subclass>
<icon>inv_chest_cloth_31</icon>
<inventorySlot>胸部</inventorySlot>
```

`htmlTooltip` 还可以用于核对：

- 拾取绑定状态。
- 需求等级。
- 原始力量、敏捷、智力、耐力、精神等属性。
- 武器速度、伤害和双手类型。

当前战斗公式只使用物品等级，但原始属性未来会显示在物品提示中，因此调查时应保留来源。

### 2.4 图标地址

XML 中的图标名可以拼成图片地址：

```text
https://wow.zamimg.com/images/wow/icons/large/图标名.jpg
```

检查示例：

```bash
curl -I --max-time 15 \
  "https://wow.zamimg.com/images/wow/icons/large/inv_chest_cloth_31.jpg"
```

应返回 `200`。如果远程图标暂时无法加载，界面会回退到本地通用栏位图标，但真实装备仍必须填写 `iconName`。

## 3. 开始前先确定的策划参数

在查几十件物品之前，先确定副本范围：

1. 副本是否属于当前 1–45 级阶段。
2. 是否忽略联盟、部落阵营限制。
3. 标准路线包含哪些 Boss。
4. 可选 Boss 是否固定加入本游戏路线。
5. 稀有 Boss 是否暂时排除。
6. 解锁等级与推荐等级。
7. 前置副本是全部需要，还是满足任意一个即可。
8. 基础时间。
9. 最低、最高和推荐队伍人数。

第一版建议：

- 固定出现的主要 Boss 纳入路线。
- 稀有刷新 Boss 暂不纳入必打路线。
- 路线过长时保留标志性 Boss，不为增加数量而拆分普通小怪。
- 有两个阶段的同一 Boss，可以合并为一个路线节点，例如“斯尼德的伐木机与斯尼德”。

## 4. 创建副本数据

文件位置：

```text
data/dungeons/<dungeon_id>.json
```

示例骨架：

```json
{
  "id": "blackfathom_deeps",
  "name": "黑暗深渊",
  "minimumLevel": 18,
  "recommendedLevel": 24,
  "defaultUnlocked": false,
  "unlock": {
    "requiredAnyDungeonIds": ["deadmines", "wailing_caverns"]
  },
  "members": {
    "minimum": 1,
    "maximum": 5,
    "recommended": 5
  },
  "duration": {
    "baseSeconds": 1440,
    "minimumRatio": 0.5,
    "maximumRatio": 1.8
  },
  "probability": {
    "minimum": 0.05,
    "maximum": 0.99,
    "base": 0.05,
    "readinessMultiplier": 0.93,
    "surplusEffect": 0.5,
    "geometricWeight": 0.7,
    "bottleneckWeight": 0.3,
    "overpowerThreshold": 1.5
  },
  "bosses": []
}
```

### 4.1 字段含义

`minimumLevel` 是公会永久解锁条件之一，不是每名参战成员的硬性进入等级。

副本解锁后，低级成员可以被高级成员带入，并按照等级差影响成功率、经验和耗时。

解锁前置有两种：

```json
{
  "requiredDungeonIds": ["必须全部通关的副本"]
}
```

```json
{
  "requiredAnyDungeonIds": ["通关任意一个即可的副本"]
}
```

副本解锁后会写入：

```text
state.guild.unlockedDungeonIds
```

即使以后移出高等级成员，副本也不会重新锁定。

### 4.2 Boss 节点

每个 Boss 至少需要：

```json
{
  "id": "bfd_example_boss",
  "name": "示例首领",
  "stageSeconds": 180,
  "requirements": {
    "tank": 23,
    "healing": 23,
    "damage": 82
  },
  "weights": {
    "tank": 0.35,
    "healing": 0.35,
    "damage": 0.3
  },
  "experienceShare": 0.15,
  "funds": 20,
  "firstKillBonus": 40,
  "lootPool": "bfd_example_boss"
}
```

约束：

- Boss ID 必须全项目唯一，使用副本缩写前缀。
- `lootPool` 同样使用副本缩写，避免不同副本重名。
- 所有 `stageSeconds` 之和必须等于 `duration.baseSeconds`。
- 所有 `experienceShare` 之和应为 `1.0`。
- `weights` 中坦克、治疗、输出之和必须为 `1.0`。
- 最终 Boss 通常承担更长阶段时间和更高资金奖励。

## 5. 基础时间与路线分段

不要直接把真实游戏的 45 分钟照搬进放置游戏。

基础时间以总设计文档为准，真实攻略时间只用于判断副本之间的相对长度。目前已确定：

| 副本 | 基础时间 |
|---|---:|
| 怒焰裂谷 | 10 分钟 |
| 死亡矿井 | 24 分钟 |
| 哀嚎洞穴 | 28 分钟 |
| 影牙城堡 | 14 分钟 |
| 黑暗深渊 | 24 分钟 |

分配原则：

- 小怪密集或需要绕路的阶段更长。
- 最终 Boss 阶段通常最长。
- 护送、开门、爆破等事件计入对应 Boss 的阶段时间。
- 强队仍应能够压缩到基础时间的 50%。

检查阶段总和：

```bash
jq '[.bosses[].stageSeconds] | add' data/dungeons/blackfathom_deeps.json
```

结果必须等于 `duration.baseSeconds`。

## 6. 创建掉落池

文件位置：

```text
data/loot/<dungeon_id>.json
```

示例：

```json
{
  "pools": [
    {
      "id": "bfd_example_boss",
      "guaranteedEquipmentDrops": 1,
      "items": [
        { "itemId": 12345, "weight": 0.6 },
        { "itemId": 12346, "weight": 0.4 }
      ]
    }
  ]
}
```

规则：

- 每个路线 Boss 都必须有对应掉落池。
- 每次成功击杀固定生成一件装备。
- `weight` 是本游戏池内相对权重，不等于原始游戏的绝对掉率。
- 原始掉率可以先归一化，再作为相对权重。
- 不默认加入宠物、钥匙、任务信件、材料、配方和垃圾物品。
- 没有专属装备的 Boss 可以使用真实任务奖励或副本通用装备池，但必须在数据和文档中说明来源。
- 不允许再加入带“测试装备”名称的玩家可见物品。

第一批实现可以每个 Boss 只录入一件真实装备，保证系统完整可玩；下一轮再扩充完整掉落池。

## 7. 录入物品定义

当前物品定义位于：

```text
src/content.js
```

示例：

```js
{
  id: 6324,
  name: "阿鲁高法袍",
  englishName: "Robes of Arugal",
  iconName: "inv_chest_cloth_31",
  quality: "rare",
  itemLevel: 29,
  slot: "chest",
  armorType: "cloth",
  allowedClasses: ["priest", "mage", "warlock"],
  allowedRoles: ["healer", "dps"],
  description: "大法师阿鲁高的掉落。原始属性仅展示，战斗效果只使用物品等级。"
}
```

### 7.1 品质映射

| 数据库 quality ID | 项目值 |
|---:|---|
| 0 | `poor` |
| 1 | `common` |
| 2 | `uncommon` |
| 3 | `rare` |
| 4 | `epic` |

### 7.2 栏位映射

| 数据库栏位 | 项目值 |
|---|---|
| 头部 | `head` |
| 颈部 | `neck` |
| 肩部 | `shoulder` |
| 背部 | `back` |
| 胸部 | `chest` |
| 手腕 | `wrist` |
| 手 | `hands` |
| 腰部 | `waist` |
| 腿部 | `legs` |
| 脚 | `feet` |
| 手指 | `ring1` |
| 饰品 | `trinket1` |
| 单手、主手、双手 | `mainHand` |
| 副手、盾牌 | `offHand` |
| 弓、枪、魔杖、圣物 | `ranged` |

当前戒指与饰品的第二栏位由装备系统后续完善。新增物品时先使用 `ring1` 或 `trinket1`，不要自行增加未注册栏位。

### 7.3 双手武器

双手锤、双手斧、双手剑和法杖必须增加：

```js
twoHanded: true
```

分配双手武器后，系统会清空并处理副手。双手武器状态下不能直接分配盾牌或其他副手装备。

### 7.4 护甲与职业适配

当前项目采用简化的 60 级版本护甲规则：

- 布甲：法师、牧师、术士。
- 皮甲：猎人、盗贼、萨满祭司、德鲁伊。
- 锁甲：战士、圣骑士。
- 披风、戒指等无护甲类型物品可以将 `armorType` 设为 `null`。

`allowedClasses` 决定职业是否能装备，`allowedRoles` 决定当前固定专精是否适合分配。

注意区分：

- “职业能够装备”与“属性适合该专精”不是同一件事。
- 自动分配会依据这些标签筛选候选人。
- 不要为了让物品有人拿而允许战士穿布甲。

## 8. 注册内容文件

在 `src/content.js` 的 `loadContent()` 中：

1. 增加副本 JSON 的 `fetch`。
2. 增加掉落 JSON 的 `fetch`。
3. 把副本加入 `dungeons` 数组。
4. 把新增物品数组合并到 `items`。

当前界面会自动读取：

```text
content.dungeons
content.dungeonById
content.lootPools
content.itemById
```

只要完成注册，副本选择界面、首杀总数、行动路线和掉落分配不需要再写死副本名称。

长期优化方向：将物品定义从 `src/content.js` 迁移到 `data/items/*.json`，避免物品库继续膨胀。

## 9. 添加战斗日志

在 `src/content.js` 的 `LOG_TEMPLATES` 中加入副本 ID：

```js
blackfathom_deeps: [
  "{member} 坚称水下神殿没有迷路，只有尚未发现的捷径。",
  "{healer} 要求大家不要碰祭坛。{tank} 已经把所有祭坛碰了一遍。",
]
```

可以使用：

- `{tank}`：队伍坦克名。
- `{healer}`：队伍治疗名。
- `{member}`：本次种子选中的随机成员名。

日志只负责展示，不影响概率、耗时、经验、资金和掉落。

## 10. 数值平衡

使用以下标准队作为第一轮基准：

```text
1 坦克 + 1 治疗 + 3 输出
成员等级 = 副本推荐等级
平均物品等级 = 副本推荐等级
性格 = 无战力修正
```

目标：

- 推荐等级标准队全通率约 75%–90%。
- 预计耗时在基础时间的 90%–110% 内。
- 明显超模的队伍最终能达到 100% 并压缩到 50% 时间。
- 没有坦克或没有治疗仍可出发，但成功率明显下降。
- 完整通关约两次提升一级。

如果 Boss 数量更多，即使单个 Boss 通过率相同，全通率也会因为连乘而下降。八 Boss 副本通常需要比四 Boss 副本略高的单 Boss 通过率。

不要通过减少 Boss 数量掩盖数值问题，应调整：

- `requirements`
- `readinessMultiplier`
- Boss 三项 `weights`

## 11. 自动测试

必须更新或新增以下测试：

### 11.1 内容完整性

`tests/content.test.mjs` 应验证：

- 新副本出现在 `content.dungeons`。
- Boss 阶段时间之和等于基础时间。
- 每个 Boss 都存在掉落池。
- 每个掉落物品 ID 都存在于物品库。
- 每件真实掉落都配置 `iconName`。

### 11.2 数值测试

`tests/core.test.mjs` 应验证：

- 推荐等级标准队的全通率在目标范围内。
- 推荐等级标准队预计耗时接近基础时间。
- 高等级队伍能够压缩时间。

### 11.3 状态机测试

`tests/game.test.mjs` 应验证：

- 未满足条件时副本不能出发。
- 满足等级和前置条件后永久解锁。
- 解锁后低级成员可以被带入。
- 行动记录保存正确的 `dungeonId` 和副本名。
- 离线结算使用所选副本的 Boss 路线，而不是默认副本。
- 双手武器和副手处理正确。

## 12. 完整验证命令

语法与测试：

```bash
node --check src/app.js
node --check src/content.js
node --check src/core.js
node --check src/game.js
npm test
git diff --check
```

JSON 校验：

```bash
for dungeon_file in data/dungeons/*.json data/loot/*.json; do
  jq empty "$dungeon_file"
done
```

本地运行：

```bash
npm run serve
```

手动验收：

1. 打开副本页面，确认新副本可见。
2. 确认未解锁副本显示正确前置和等级。
3. 完成前置副本后确认新副本自动解锁。
4. 选择新副本和队伍，检查 Boss 通过率与时间。
5. 出发后检查行动页路线节点数量和名称。
6. 完成一个 Boss，检查资金、经验、日志和掉落。
7. 检查装备中文名、品质颜色、物品等级和图标。
8. 分配双手武器，确认副手被清空。
9. 刷新页面，确认行动、解锁和装备仍然存在。
10. 使用窄屏检查副本卡片和路线布局。

## 13. 常见错误

### 使用了零售版资料

表现：死亡矿井出现凡妮莎或影牙城堡出现高弗雷领主。

处理：改用标题明确带 `(Classic)` 的页面，并与 AtlasLootClassic 数据交叉核对。

### 每个 Boss 都复制同一个通用装备池

表现：装备有名字和图标，但失去 Boss 身份感。

处理：优先使用 Boss 专属装备；没有专属装备时才能使用明确标记来源的副本共享池。

### 图标字段存在但图片打不开

表现：界面回退到通用 SVG 图标。

处理：检查 XML 中的 `icon` 值和 CDN 地址是否返回 200，尤其注意下划线和数字格式。

### 阶段时间与基础时间不一致

表现：页面显示基础 24 分钟，但标准队实际路线明显不是 24 分钟。

处理：用 `jq` 汇总所有 `stageSeconds`，并加入内容测试。

### 把解锁等级当成个人进入门槛

表现：高级成员无法带低级成员。

处理：`minimumLevel` 只用于公会解锁。出发时不要逐个拒绝低级成员。

### Boss ID 重名

表现：首杀、日志或掉落被另一个副本覆盖。

处理：所有 Boss 和掉落池 ID 使用副本缩写，例如 `bfd_gelihast`。

### 双手武器仍保留副手

处理：确认物品带有 `twoHanded: true`，并为分配流程增加回归测试。

## 14. 新副本提交前检查表

- [ ] 确认是经典旧世版本资料。
- [ ] 确认标准路线和最终 Boss。
- [ ] 排除或明确处理稀有 Boss。
- [ ] 填写解锁等级、推荐等级和前置副本。
- [ ] 基础时间与总设计文档一致。
- [ ] Boss 阶段时间之和等于基础时间。
- [ ] Boss 经验占比之和为 1.0。
- [ ] 每个 Boss 有唯一 ID 和掉落池。
- [ ] 每个掉落物品都有真实物品 ID。
- [ ] 中文名、品质、物品等级、栏位和图标已从 Classic 数据核对。
- [ ] 护甲、职业、定位和双手武器规则正确。
- [ ] 推荐等级标准队概率和耗时通过测试。
- [ ] 解锁后可以带低级成员。
- [ ] 添加副本主题战斗日志。
- [ ] 页面手动验收完成。
- [ ] `npm test`、JSON 校验和 `git diff --check` 全部通过。
