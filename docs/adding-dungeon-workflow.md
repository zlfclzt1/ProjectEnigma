# 新增经典旧世副本工作流

最后更新：2026-09-08

本文档说明如何在当前 V2 架构中加入一座可完整游玩的经典旧世副本。目标是让新增副本主要由内容文件驱动，不修改活动调度器、通用副本页面或存档 Repository。

## 1. 完成标准

一座副本只有同时满足以下条件，才算完成：

- 自动出现在副本选择页面，并显示解锁、等级、人数、路线和基础时间。
- 能使用任意内容定义允许的人数出发，不在代码中写死五人。
- 出发前显示每个 Boss 的精确胜率、全通率和耗时。
- 路线按 Boss 逐段结算经验、资金、掉落和结构化战报。
- 灭团保留此前已经获得的奖励。
- 每个必打 Boss 至少关联一个真实装备掉落。
- 真实装备包含原版属性、需求、适配规则、图标和来源归属。
- 推荐等级标准阵容符合当前平衡曲线，非标准阵容有明确代价。
- 内容校验、装备审计、数值模拟、单元测试和生产构建全部通过。

## 2. 资料调查

不要只依赖一个攻略页面。不同来源负责不同事实：

| 数据 | 首选来源 | 记录内容 |
|---|---|---|
| Boss 与掉落物品 ID | AtlasLootClassic | 经典版本 Boss、稀有标记、装备 ID |
| Boss 路线与版本差异 | Warcraft Wiki Classic | 必打顺序、可选/稀有 Boss、事件触发 |
| 物品名称、等级、属性、图标 | Wowhead Classic XML | 中文名、物品等级、需求等级、原始属性、图标名 |
| 原始掉率 | Wowhead Classic | 作为内容池相对权重的参考 |
| 放置游戏时间和解锁 | 本项目设计文档 | 最终采用的基础时间和前置规则 |

AtlasLootClassic 原始数据常用入口：

```text
AtlasLootClassic_DungeonsAndRaids/data.lua
```

Wowhead Classic 中文物品 XML：

```text
https://www.wowhead.com/classic/cn/item=物品ID&xml
```

数据库图标地址：

```text
https://wow.zamimg.com/images/wow/icons/large/图标名.jpg
```

调查时为每条事实记录来源、外部 ID、核对日期和备注。游戏自行决定的必掉数量、资金、经验、时间和胜率调校必须标记为 `design-decision` 或 `balance-override`，不要伪装成原版事实。

## 3. 先确定策划参数

在录入装备前确定：

1. 最低等级与推荐等级。
2. 标准路线包含哪些 Boss；稀有 Boss 是否排除。
3. 前置副本需要全部完成还是满足任意一座。
4. 基础时间及最低/最高耗时比例。
5. 最低、推荐和最高成员数。
6. 推荐等级标准队的目标全通率。
7. 每个 Boss 的经验份额、资金与首杀奖励。

当前游戏忽略阵营进入限制。副本解锁是公会级永久状态；解锁后可以由高级成员带低级成员进入。

## 4. 内容文件

新增副本通常需要五类文件：

```text
content/dungeons/<dungeon-id>.json
content/encounters/<dungeon-id>.json
content/items/<dungeon-id>.json
content/loot-tables/<dungeon-id>.json
content/logs/dungeons/<dungeon-id>.json
```

`src/content/manifest.ts` 使用 `import.meta.glob("../../content/**/*.json")` 自动发现内容，不需要手工注册文件。文件目录决定使用哪个 Zod Schema；放错目录会在内容校验中报错。

### 4.1 Dungeon

参考 `content/dungeons/ragefire-chasm.json`。关键字段：

- `id`：稳定 snake_case ID。
- `minimumLevel` / `recommendedLevel`：解锁和展示等级。
- `defaultUnlocked`：是否新公会直接开放。
- `unlock.requiredDungeonIds`：要求全部前置副本通关。
- `unlock.requiredAnyDungeonIds`：要求任意一个前置副本通关。
- `members.minimum/recommended/maximum`：数据驱动的人数限制。
- `duration`：基础时间与 50% 等压缩/延长边界。
- `probability` / `combatTuning`：副本级概率调校。
- `route`：按结算顺序列出 Encounter ID。

### 4.2 Encounter

参考 `content/encounters/ragefire-chasm.json`。每个路线节点需要：

- 唯一 `id` 和正确的 `dungeonId`。
- `stageSeconds`；所有阶段之和应与 Dungeon 的 `baseSeconds` 一致。
- 坦克、治疗、输出三项 `requirements`。
- 三项和为 1 的 `weights`。
- `experienceShare`；整条路线的经验份额总和通常为 1。
- `funds`、`firstKillBonus` 和 `lootTableId`。
- 预留的 `mechanicIds`，五人本可暂为空数组。

### 4.3 Item

参考 `content/items/ragefire-chasm.json` 和 `src/content/schemas/item.ts`。

真实装备至少包含：

- 字符串物品 ID、中文名和可选英文名。
- 品质、物品等级、需求等级、栏位和双手标记。
- 护甲类型、允许职业和允许定位。
- `icon.kind: "database"` 与 Wowhead 图标名。
- 有明确单位的 `stats`。这些属性会真正参与战斗公式，不是纯展示字段。
- `statsSource`，通常为 `wowhead-classic`、外部物品 ID 和核对日期。
- 内容 `attribution`，说明 Boss/物品关系和任何平衡覆盖。

常见栏位包括 `head`、`neck`、`shoulder`、`back`、`chest`、`wrist`、`hands`、`waist`、`legs`、`feet`、`ring1`、`trinket1`、`mainHand`、`offHand`、`ranged`。戒指与饰品会由装备规则选择可替换的实际栏位。

不要通过放宽限制让战士穿布甲。职业可装备性和专精收益由 `evaluateEquipEligibility` 与 `evaluateUpgrade` 统一判断。

### 4.4 LootTable

参考 `content/loot-tables/ragefire-chasm.json`：

- 每个 Encounter 引用的 `lootTableId` 必须存在。
- `guaranteedEquipmentDrops` 是本游戏规则，不等于原版绝对掉率。
- `items[].weight` 是池内相对权重。
- 不默认录入钥匙、任务信件、材料、宠物或垃圾物品。
- 没有专属装备的 Boss 可以使用有据可查的任务奖励或副本公共池，但必须在来源备注中说明。

### 4.5 日志模板

日志只读取已经结算的事实，不参与概率、伤害或奖励计算。模板变量必须列入 `availableParameters`；内容校验会拒绝未声明变量。

优先增加 Dungeon 或 Encounter scope 的 `encounter-victory` / `dungeon-flavor` 模板。通用伤害、治疗、倒地和划水日志已经位于 `content/logs/combat-report.json`。

## 5. 数值平衡

第一轮基准：

```text
1 坦克 + 1 治疗 + 3 输出
成员等级 = 副本推荐等级
使用该等级可获得的最佳兼容真实掉落
```

目标：

- 推荐等级标准队全通率约 79%–84%。
- 推荐队耗时接近副本基础时间。
- 没有坦克或没有治疗仍允许进入，但全通率下降、耗时上升。
- 45 级标准队接近或达到 100%，耗时仍不得低于 `minimumRatio`。
- Boss 数量越多，单 Boss 概率需要相应提高，避免连乘后全通率过低。

优先调整内容中的 Encounter requirements、weights 和 Dungeon combatTuning。不要在 `party-evaluation.ts` 中为单个副本写分支。

运行 100,000 样本：

```bash
npm run simulate:dungeons
```

确认新曲线后，显式更新并检查基线：

```bash
npm run baseline:write
npm run baseline:check
```

## 6. 自动测试

至少新增或更新：

- `tests/content/dungeon-definitions.test.ts`：路线、阶段时间、掉落表和引用完整。
- `tests/content/item-definitions.test.ts`：ID、图标、需求、来源与真实属性完整。
- `tests/domain/v2-dungeon-balance.test.ts`：推荐队、无坦队、满级队和带人场景。
- Application/Store 测试：解锁、出发、离线结算、掉落资格和战报持久化。
- 必要时更新 `tests/e2e/expedition.spec.ts`，断言通用页面无需写死新副本。

若加入新副本必须修改以下文件，应先记录架构缺口：

```text
src/content/loader.ts
src/domain/activity/activity-scheduler.ts
src/ui/pages/DungeonsPage.vue
src/infrastructure/persistence/indexeddb-save-repository.ts
```

新增内容不应要求在这些通用模块中添加副本 ID 分支。

## 7. 完整验证

```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run validate:content
npm run item-stats:audit
npm run baseline:check
npm run build
npm run format:check
git diff --check
```

人工或浏览器验收：

1. 新副本自动出现在选择页，锁定提示正确。
2. 完成前置后永久解锁，刷新页面后仍保留。
3. 职业与定位筛选、任意合法人数、连续次数均可选择。
4. 每个 Boss 显示精确胜率，阶段耗时总和正确。
5. 活动页按路线推进，不出现实时战斗动画。
6. 灭团只结束当前活动，之前奖励仍存在。
7. Tooltip 显示真实属性、需求、来源和数据库图标。
8. 战利品只能选择本次参战成员，自动分配结果可解释。
9. 战报显示成员事实统计、奖励和趣味日志。
10. 刷新后活动、装备、解锁和战报仍存在。

## 8. 常见错误

- 使用零售版 Boss 或属性：回到 Classic 页面并与 AtlasLootClassic 交叉核对。
- ID 重复或引用错误：运行 `npm run validate:content`，按文件与字段路径修复。
- 图标名存在但无法访问：核对 XML 的 `<icon>`，不要把完整 URL 写入内容。
- `stageSeconds` 之和不等于基础时间：按路线重新分配时间。
- 把最低等级当成个人硬门槛：当前是公会解锁规则，解锁后允许带低级成员。
- 为新副本修改通用页面：先确认内容字段是否缺失，再扩展 Schema，而不是写副本特例。
- 只录物品等级：真实属性必须写入 `stats` 并通过装备属性审计。

## 9. 提交前检查表

- [ ] 五类内容文件已创建，ID 稳定且引用一致。
- [ ] 每个路线 Boss 有 Encounter、LootTable 和至少一件真实装备。
- [ ] 所有装备图标、需求、适配、属性与来源完整。
- [ ] 推荐队、非标准队、满级队和带人曲线已验证。
- [ ] 页面没有增加副本 ID 特例。
- [ ] 100,000 样本基线已检查。
- [ ] 单元、组件、E2E、内容审计和生产构建全部通过。
