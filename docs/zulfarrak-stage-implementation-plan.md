# 10–45 级祖尔法拉克阶段实施计划

- 文档状态：已完成并通过发布门禁
- 最后更新：2026-09-09
- 关联设计：[游戏设计文档 v0.2](./game-design-v0.1.md)
- 前置架构记录：[V2 架构重构可执行计划](./refactor-execution-plan-v2.md)
- 内容流程：[新增经典旧世副本工作流](./adding-dungeon-workflow.md)

本文档将祖尔法拉克阶段拆成可以独立实现、验证和提交的小任务。所有任务已按顺序完成；专业、仓库、坐骑、拍卖行、PVP 和正式团队副本仍不属于本计划。

发布基线：15 座副本、94 个路线 Encounter、380 个单元与组件测试、10 个 Playwright E2E；副本、进度、装备属性、掉落来源和内容完整性基线均已通过自动校验。

## 1. 最终交付目标

完成本计划后，游戏应具备：

- 从 10 级到 45 级的完整副本成长路线。
- 当前四座副本加十一座新增副本，共十五座可重复挑战的经典旧世副本。
- 2019 经典怀旧服最终阶段口径的主要 Boss 和非世界掉落装备。
- 支持无装备掉落、单件掉落和多件掉落的 Boss 掉落规则。
- 原版随机词缀、最终属性计算和确定性词缀生成。
- 副本解锁后可查看的装备图鉴、套装进度、收藏完成率和收藏奖励。
- 当前专精限定的成员装备愿望单。
- 永远可用的手动分配，以及玩家主动触发的一键自动处理。
- 职业、专精和等级驱动的队伍能力检查与 Boss 机制。
- 必打、普通可选和随机稀有三种路线节点。
- 每名成员独立接取、完成和领取奖励的轻量副本任务。
- 开局三次、升级后五次的连续挑战。
- 出发前逐成员经验预览和队伍等级差惩罚。
- 一支正常核心队在中位模拟中约 5–8 天首通祖尔法拉克。
- 祖尔法拉克首通记录、一次性奖励和首通后的持续刷装与收藏玩法。

## 2. 明确不在本计划内

- 45–60 级内容。
- 熔火之心及其他团队副本。
- 采集、制造、公会仓库和拍卖行。
- 坐骑与骑术。
- 完整世界任务、区域移动和阵营任务链。
- 世界随机掉落。
- 成员请假、满意度、退会和公会关系模拟。
- DKP、核心成员优先级和个人金币。
- 实时战斗动画和逐技能循环。
- Boss 定向速刷路线。
- 无玩家安排的被动收入或无限自动刷本。

发现上述需求时，应记录到后续路线，不得夹带进当前任务。

## 3. 执行规则

### 3.1 一个任务一个 commit

- 每个编号任务完成后创建一个独立 commit。
- commit 只包含该任务需要的代码、数据、测试和直接相关文档。
- 不在内容录入任务中顺手修改全局战斗公式。
- 不在领域任务中进行大规模视觉改版。
- 不提交未通过本任务验收的半成品。
- 建议 commit 标题可以微调，但应保持任务语义清晰。

### 3.2 每个 commit 都必须可运行

- 任何中间提交都必须通过类型检查和相关测试。
- 内容格式迁移需要兼容已有内容，或在同一提交中完成全部机械迁移。
- 存档结构变化必须提供迁移测试；不能只修改新游戏工厂。
- 随机行为必须由注入的随机源或活动种子驱动，不得直接调用非确定性全局随机数。
- 页面不能直接修改持久状态，继续通过 Application Command 和 Query View 执行。

### 3.3 不混合风险

以下工作原则上拆成不同任务：

```text
Schema 与领域能力
内容数据导入
UI 接入
数值平衡
```

如果某个最小功能必须跨层才能可用，可以在同一任务加入最薄的垂直闭环，但不得同时批量导入副本或重做视觉设计。

### 3.4 工作区安全

- 开始任务前执行 `git status --short --branch`。
- 保留用户已有和无关修改。
- 不使用破坏性 Git 命令清理工作区。
- 内容调查产生的临时文件不得混入提交。
- 每个内容事实必须保存来源元数据，不能只在 commit message 中说明来源。

## 4. 全程验证

每个任务至少运行直接相关的测试和：

```bash
npm run typecheck
git diff --check
```

完成一个阶段时运行：

```bash
npm run format:check
npm run lint
npm run typecheck
npm run validate:content
npm run item-stats:audit
npm test
npm run baseline:check
npm run build
```

涉及完整玩家流程、路由或关键页面时增加：

```bash
npm run test:e2e
```

## 5. 依赖顺序

```text
设计冻结与基线
  ↓
正确掉落语义
  ↓
随机词缀与最终装备属性
  ↓
装备图鉴、套装与收藏
  ↓
愿望单与自动分配
  ↓
队伍能力与 Boss 机制
  ↓
普通可选和随机稀有路线
  ↓
成员级副本任务
  ↓
黑暗深渊垂直切片
  ↓
其余十座副本分批导入
  ↓
祖尔法拉克阶段平衡与发布验收
```

不得先批量录入完整装备池，再补装备图鉴和自动处理，否则玩家流程和测试夹具会承受不必要的返工。

## 6. 阶段 0：设计、审计和进度基线

### 任务 0.1：提交正式设计与实施计划

目标：冻结本轮产品决定，为后续任务提供唯一执行入口。

修改：

- `docs/game-design-v0.1.md`
- `docs/zulfarrak-stage-implementation-plan.md`
- `docs/refactor-execution-plan-v2.md`
- `README.md`

验收：

- 正式设计与实施计划互相链接。
- 旧 V2 计划明确说明原阶段 7 已被新顺序取代。
- 文档不再宣称所有 Boss 必掉装备或真实属性只用于展示。
- `git diff --check` 通过。

建议 commit：

```text
docs: define zulfarrak stage roadmap
```

### 任务 0.2：建立内容版本与来源政策

目标：将“2019 经典怀旧服最终阶段”变成可审计规则，而不是口头约定。

修改建议：

- 新增 `docs/classic-content-source-policy.md`。
- 扩展内容来源字段或校验规则，能够标记目标版本、资料提供方、调查日期和人工平衡覆盖。
- 明确排除探索赛季、前夕改动、后续重制和世界掉落。

测试：

- 内容来源 Schema 测试。
- 非初始真实装备缺少有效来源时校验失败。
- 平衡覆盖不会覆盖真实来源本身。

建议 commit：

```text
docs: freeze classic content source policy
```

### 任务 0.3：生成当前四副本掉落来源审计

目标：找出当前 Boss 池中属于任务奖励、公共补偿或无真实专属来源的装备。

新增建议：

- `scripts/audit-loot-sources.ts`
- `docs/generated/current-loot-source-audit.md`
- 对应脚本测试或内容契约测试。

要求：

- 按副本和 Boss 列出每件物品。
- 标记 `boss-drop`、`quest-reward`、`world-drop`、`design-placeholder`。
- 本任务只审计，不修改掉落和数值。

建议 commit：

```text
chore: audit current dungeon loot sources
```

### 任务 0.4：建立 10–45 级进度模拟骨架

目标：在新增内容之前固定“一周祖尔法拉克”的测量方法。

新增建议：

- `scripts/simulate-progression.ts`
- `tests/fixtures/progression-baseline.json`
- 进度模拟测试。

首个模拟场景：

- 开局五名 10 级成员。
- 每天管理 4、5、6 次三组场景。
- 使用当前最多三次连续挑战。
- 采用合理而非完美的队伍选择。
- 输出核心队达到 45 级所需天数、总副本次数、失败次数、资金和平均装等。

当前内容不足以到达祖尔法拉克，因此本任务只建立可扩展模拟器和四副本基线，不宣称已经满足最终节奏。

建议 commit：

```text
test: add progression simulation baseline
```

阶段 0 门禁：

- 内容口径、当前数据缺口和进度测量方法都有书面及自动化依据。
- 不再依赖人工记忆判断某件装备属于 Boss 还是任务。

## 7. 阶段 1：正确的 Boss 掉落语义

### 任务 1.1：允许 Encounter 没有装备掉落表

目标：表达“击败 Boss 但只获得经验和资金”。

修改建议：

- `src/content/schemas/dungeon.ts`
- Encounter 和注册表相关类型。
- `tests/content/dungeon-definitions.test.ts`
- `tests/content/content-registry.test.ts`

要求：

- `lootTableId` 可以缺省。
- 有掉落表时引用必须存在。
- 无掉落表不是内容错误。
- 现有内容行为不变。

建议 commit：

```text
feat: allow encounters without equipment loot
```

### 任务 1.2：结算无装备掉落的 Boss

目标：领域结算正确处理没有掉落表的胜利。

修改建议：

- `src/domain/dungeon/expedition-settlement.ts`
- `tests/domain/expedition-settlement.test.ts`
- 战报奖励测试。

验收：

- Boss 胜利仍发经验和资金。
- 不生成 `ItemInstance` 或 `PendingLoot`。
- 战报装备列表为空。
- 首杀和副本进度照常记录。

建议 commit：

```text
feat: settle bosses with no equipment drops
```

### 任务 1.3：验证单件和多件保证掉落

目标：固定同一真实装备池产生一件或多件装备的规则。

修改建议：

- `src/domain/dungeon/loot-generation.ts`
- `tests/domain/expedition-settlement.test.ts`
- `tests/application/loot-report-queries.test.ts`

要求：

- 保持当前权重归一化选择。
- 多次掉落使用独立且稳定的随机标签。
- 固定种子下结果可复现。
- 不在本任务调整任何正式掉率。

建议 commit：

```text
test: lock guaranteed equipment drop semantics
```

阶段 1 门禁：

- 领域层可以正确表达 0、1、2 件装备掉落。
- 当前四副本结果在内容未迁移前保持兼容。

## 8. 阶段 2：随机词缀与最终装备实例

### 任务 2.1：定义随机词缀 ID、Schema 和内容文件

目标：建立独立于基础装备的随机词缀内容模型。

新增建议：

- `content/item-suffixes/*.json`
- `src/content/schemas/item-suffix.ts`
- `RandomSuffixId`。
- Schema 测试。

字段至少包括：

```text
词缀 ID
本地化名称模板
允许的物品等级或词缀档位
最终属性增量
相对权重
来源元数据
```

本任务只加入最小测试词缀，不批量导入正式数据。

建议 commit：

```text
feat: define random item suffix content
```

### 任务 2.2：在内容注册表索引并校验词缀池

目标：让基础物品能够引用可用词缀及相对权重。

修改建议：

- `src/content/manifest.ts`
- `src/content/registry.ts`
- `src/content/schemas/item.ts`
- 注册表和物品内容测试。

要求：

- 没有随机词缀的物品无需额外配置。
- 随机词缀物品必须至少引用一个有效词缀。
- 权重必须为正。
- 词缀档位必须覆盖该物品需要的等级。

建议 commit：

```text
feat: register item suffix pools
```

### 任务 2.3：扩展装备实例并迁移存档

目标：装备实例持久保存已经抽到的词缀结果。

修改建议：

- `src/domain/equipment/item-instance.ts`
- `src/domain/game-state.ts`
- `src/infrastructure/persistence/migrations/*`
- 测试 fixture 和迁移测试。

要求：

- 旧装备迁移后没有随机词缀。
- 新实例可以保存 `randomSuffixId`。
- 存档加载、保存和刷新后词缀不变化。
- 不提前加入装备图鉴或愿望单字段。

建议 commit：

```text
feat: persist random item suffixes
```

### 任务 2.4：统一解析最终装备名称和属性

目标：所有消费者通过一个领域函数获得基础物品加词缀后的结果。

新增建议：

- `src/domain/equipment/resolve-item-instance.ts`
- 领域测试。

要求：

- 合并名称、属性和可装备限制所需信息。
- 不原地修改静态内容定义。
- 战斗公式、装备比较、Tooltip 和战报不得分别重复合并逻辑。

建议 commit：

```text
feat: resolve effective item instance stats
```

### 任务 2.5：掉落时确定性抽取随机词缀

目标：只有实际生成装备实例时才确定词缀。

修改建议：

- `src/domain/dungeon/loot-generation.ts`
- 掉落领域测试。

验收：

- 同一个活动、阶段和掉落序号产生相同词缀。
- 不同掉落序号使用独立随机标签。
- 没有词缀池的物品不受影响。
- 刷新、重新查询和离线结算不重新抽取。

建议 commit：

```text
feat: roll deterministic item suffixes
```

### 任务 2.6：接入装备视图与战斗计算

目标：所有玩家可见和战斗相关数据使用最终装备实例。

修改建议：

- 成员、战利品和战报 Query。
- 装备比较和战斗公式输入。
- `ItemTooltip.vue`、`EquipmentSlot.vue`、`LootCard.vue`。
- Query、领域和 UI 测试。

要求：

- 最终名称包含词缀。
- Tooltip 显示词缀属性。
- 主职责能力和升级比较使用合并后的真实属性。
- 未带词缀的现有装备结果不变。

建议 commit：

```text
feat: use item suffixes in combat and ui
```

阶段 2 门禁：

- 随机词缀拥有单一解析入口。
- 生成、持久化、展示和战力计算结果一致。
- 固定种子测试能够证明结果可复现。

## 9. 阶段 3：装备图鉴、套装与收藏

### 任务 3.1：定义套装与收藏奖励内容

目标：为装备图鉴提供套装和里程碑数据。

新增建议：

- `content/item-sets/*.json`
- `content/collection-rewards/*.json`
- 对应 Schema、ID 和测试。

要求：

- 套装引用基础物品 ID，不引用具体词缀实例。
- 奖励条件可以按副本、套装或全局完成率配置。
- 奖励第一阶段只允许一次性资金、管理解锁和展示记录。
- 不发放不可替代的毕业战斗装备。

建议 commit：

```text
feat: define item sets and collection rewards
```

### 任务 3.2：持久化装备发现历史

目标：出售或替换装备后仍然保留收藏记录。

修改建议：

- `GameState` 历史或独立 CollectionState。
- 新游戏工厂和存档迁移。
- 迁移与领域测试。

至少记录：

```text
曾获得的基础物品 ID
基础物品获得次数
每件基础物品曾见过的随机词缀 ID
已领取收藏奖励 ID
```

基础收藏完成度不要求集齐全部词缀。

建议 commit：

```text
feat: persist item collection history
```

### 任务 3.3：在装备获得入口更新收藏

目标：所有来源使用同一规则记录发现历史。

修改建议：

- Boss 掉落生成或结算入口。
- 未来任务和制造可复用的收藏记录服务。
- 领域与应用测试。

要求：

- 同一装备重复获得增加次数但不重复新增 ID。
- 随机词缀发现独立记录。
- 出售未分配装备不删除记录。
- 本任务不发放收藏奖励。

建议 commit：

```text
feat: record acquired items in collection
```

### 任务 3.4：实现装备图鉴 Query

目标：提供不依赖 Vue 的完整图鉴视图模型。

新增建议：

- `src/application/queries/get-item-catalog-view.ts`
- Query 测试。

视图至少包含：

- 已解锁副本的全部 Boss 装备。
- Boss 来源、相对权重和可能词缀。
- 是否获得、获得次数和见过的词缀。
- 套装进度、分副本完成率和全局完成率。
- 可领取与已领取的收藏奖励。

未解锁副本只显示副本名称和锁定状态，不泄露装备详情。

建议 commit：

```text
feat: query item collection catalog
```

### 任务 3.5：增加装备图鉴页面

目标：通过独立路由浏览副本掉落、套装和收藏进度。

新增建议：

- `ItemCatalogPage.vue`
- 副本、Boss、套装和词缀筛选组件。
- 导航、UI 和 E2E 测试。

要求：

- 支持按副本、Boss、品质、装备栏和是否获得筛选。
- 不在组件中重新计算掉率或完成度。
- 移动端可用。
- 点击物品可以查看完整 Tooltip。

建议 commit：

```text
feat: add item collection catalog page
```

### 任务 3.6：实现收藏奖励领取

目标：提供明确且幂等的一次性奖励领取流程。

修改建议：

- 收藏资格规则。
- Application Command。
- 图鉴页面领取交互。
- 应用和 UI 测试。

验收：

- 未满足条件不能领取。
- 同一奖励不能重复领取。
- 资金或管理解锁通过事务提交。
- 并发存档冲突沿用 GameSession 行为。

建议 commit：

```text
feat: claim collection milestone rewards
```

### 任务 3.7：修正怒焰裂谷 Boss 掉落语义

目标：移除被错误挂到 Boss 身上的任务奖励，保留真实 Boss 专属装备池。

验收：

- 奥格弗林特和巴扎兰没有专属装备池。
- 饥饿者塔拉加曼和祈求者耶戈什保留完整专属装备池与相对权重。
- 任务奖励物品继续保留定义，但不通过 Boss 掉落。

建议 commit：

```text
fix: correct ragefire chasm boss loot
```

### 任务 3.8：补齐哀嚎洞穴装备池

目标：补齐当前正式路线 Boss 的全部可穿戴专属装备和相对权重。

建议 commit：

```text
data: complete wailing caverns boss loot
```

### 任务 3.9：补齐死亡矿井装备池

目标：补齐当前正式路线 Boss 的全部可穿戴专属装备，并正确区分斯尼德的伐木机与斯尼德。

建议 commit：

```text
data: complete deadmines boss loot
```

### 任务 3.10：补齐影牙城堡装备池

目标：补齐当前正式路线 Boss 的全部可穿戴专属装备和相对权重。

建议 commit：

```text
data: complete shadowfang keep boss loot
```

阶段 3 门禁：

- 玩家能在副本解锁后查看完整掉落规划。
- 收藏进度与当前是否持有装备无关。
- 奖励不会产生重复领取漏洞。

## 10. 阶段 4：愿望单与可控自动分配

### 任务 4.1：定义成员愿望单状态并迁移存档

目标：为每名成员保存基础物品、首选词缀和可接受词缀。

修改建议：

- Member 或独立 WishlistState。
- 新游戏工厂、存档迁移和 fixture。
- 迁移测试。

本任务只保存数据，不实现分配优先级。

建议 commit：

```text
feat: persist member item wishlists
```

### 任务 4.2：实现愿望单资格规则

目标：只有当前专精主职责适用的物品可以加入愿望单。

新增建议：

- `src/domain/equipment/wishlist-rules.ts`
- 领域测试。

验收：

- 职业不能装备时拒绝。
- 不符合当前专精主职责时拒绝。
- 词缀必须属于该基础物品的词缀池。
- 重复目标更新而不是创建重复项。

建议 commit：

```text
feat: validate member item wishlists
```

### 任务 4.3：实现愿望单命令与成员页面

目标：玩家可以从已解锁图鉴中维护成员目标。

修改建议：

- 添加、更新和删除愿望单 Command。
- Member Detail Query。
- 成员详情愿望单面板。
- 应用和 UI 测试。

要求：

- 可选择首选和多个可接受词缀。
- 显示物品来源副本和 Boss。
- 不允许选择锁定副本中的物品。

建议 commit：

```text
feat: manage member item wishlists
```

### 任务 4.4：在转专精流程处理失效愿望

目标：转专精不会留下不再适用的隐藏优先级。

修改建议：

- 转专精预览 Query。
- `respec-member` Command。
- 成员详情确认界面和测试。

验收：

- 确认前列出将移除的愿望项目。
- 取消转专精时不修改愿望单。
- 提交转专精时原子清理失效项目。

建议 commit：

```text
feat: clear invalid wishlists on respec
```

### 任务 4.5：实现纯自动分配排序器

目标：将分配决策从 Command 和 UI 中提取为可穷举测试的纯函数。

排序规则：

```text
精确首选词缀
→ 可接受词缀
→ 主职责战力提升
→ 对应栏位当前更弱
→ 入会时间更早
→ 稳定成员 ID
```

要求：

- 未命中愿望词缀的实际升级仍参与普通比较。
- 没有提升时返回出售建议。
- 不加入核心成员优先级或随机决胜。
- 测试覆盖每一级平手规则。

建议 commit：

```text
feat: rank loot assignments with wishlists
```

### 任务 4.6：增加一键自动处理预览

目标：执行前展示每件剩余战利品的建议结果和理由。

新增建议：

- 批量分配 Preview Query。
- 战利品页面预览对话框。
- Query 和 UI 测试。

预览至少显示：

- 分配对象或出售。
- 是否命中愿望单。
- 新旧装备及主职责变化。
- 处理后的连锁影响；前一件装备分配后，后一件必须基于更新后的模拟装备计算。

建议 commit：

```text
feat: preview automatic loot resolution
```

### 任务 4.7：提交批量自动处理命令

目标：按预览顺序在一个事务中处理所有剩余战利品。

验收：

- 玩家必须主动确认。
- 命令重新计算而不是盲信客户端预览。
- 任意规则错误时整批不提交。
- 手动分配入口始终保留。
- 结果摘要与实际装备、资金一致。

建议 commit：

```text
feat: resolve remaining loot automatically
```

阶段 4 门禁：

- 完整掉落池不会迫使玩家逐件处理所有垃圾装备。
- 自动分配透明、可预测、可测试，且永远由玩家主动触发。

## 11. 阶段 5：队伍能力与 Boss 机制

### 任务 5.1：定义能力和机制内容 Schema

目标：用内容描述成员能力和 Boss 需求。

新增建议：

- `content/capabilities/*.json`
- `content/mechanics/*.json`
- 对应 Schema、ID、注册表和测试。

机制至少支持：

```text
required 或 recommended
所需能力 ID
最低能力值
缺失时影响的坦克、治疗、输出、胜率或耗时参数
玩家可见说明
战报模板标签
```

建议 commit：

```text
feat: define party capabilities and mechanics
```

### 任务 5.2：录入职业专精等级能力

目标：成员根据职业、专精和当前等级自动获得能力。

要求：

- 覆盖九职业当前所有正式专精。
- 第一批包含打断、驱散、控制、范围伤害、远程伤害及基础职责能力。
- 不增加技能购买或个人技能栏。
- 本任务只录入能力数据，不修改 Boss。

建议 commit：

```text
data: add classic spec capability progression
```

### 任务 5.3：聚合队伍能力快照

目标：从成员等级、专精和装备快照计算队伍能力。

新增建议：

- `src/domain/combat/party-capabilities.ts`
- 领域测试。

要求：

- 计算结果在活动创建时固化。
- 中途升级、换装或转专精不影响已经出发的活动。
- 能力来源和贡献可解释。

建议 commit：

```text
feat: aggregate expedition party capabilities
```

### 任务 5.4：将推荐和必需机制接入队伍评估

目标：机制影响出发资格、胜率和耗时。

修改建议：

- `party-evaluation.ts`
- 对应机制策略文件。
- 领域测试。

验收：

- 缺少必需能力时返回明确阻塞原因。
- 缺少推荐能力时可以出发，但产生可配置惩罚。
- 同一机制不会重复施加。
- 没有机制的现有 Encounter 结果不变。

建议 commit：

```text
feat: evaluate encounter mechanic requirements
```

### 任务 5.5：在组队预览解释机制影响

目标：玩家在出发前理解为什么胜率或耗时发生变化。

修改建议：

- Dungeon Planning Query。
- Party Preview 组件。
- Query 和 UI 测试。

要求：

- 显示满足、缺失和部分满足的机制。
- 显示具体概率、职责压力或耗时变化。
- 硬性阻塞说明对应到具体 Boss。

建议 commit：

```text
feat: explain dungeon mechanic readiness
```

### 任务 5.6：将机制结果写入结构化战报

目标：战报说明队伍如何处理或未处理 Boss 机制。

修改建议：

- CombatReport 结构和迁移兼容策略。
- 报告生成器与日志渲染。
- 战报 Query、UI 和持久化测试。

建议 commit：

```text
feat: report encounter mechanic outcomes
```

阶段 5 门禁：

- 当前四副本在未配置新机制时基线不漂移。
- 测试 Encounter 可以证明软惩罚和硬门槛均可扩展。

## 12. 阶段 6：普通可选与随机稀有路线

### 任务 6.1：定义规范化路线节点

目标：将简单 Encounter ID 数组扩展为显式路线节点。

节点类型：

```text
required
optional
rare
```

稀有节点额外包含出现概率；普通可选节点包含玩家可见说明。Schema 可以暂时兼容旧字符串数组并规范化为 required 节点，避免同一提交批量迁移所有内容。

建议 commit：

```text
feat: define normalized dungeon route nodes
```

### 任务 6.2：迁移当前四副本路线内容

目标：把现有路线机械转换为显式 required 节点，不改变玩法和数值。

验收：

- 当前四副本 Boss 顺序不变。
- 平衡 fixture 不漂移。
- 完成迁移后移除仅为旧字符串数组存在的兼容解析。

建议 commit：

```text
data: normalize existing dungeon routes
```

### 任务 6.3：支持普通可选 Boss 选择

目标：玩家为一次连续挑战选择要包含的普通可选节点。

修改建议：

- StartExpeditionRequest。
- 活动快照和验证规则。
- Domain 和 Application 测试。

要求：

- 只能选择当前副本定义的 optional 节点。
- 同一队列所有轮次使用同一选择。
- required 节点不能取消。
- 选择结果持久化到活动，不依赖临时 UI Store。

建议 commit：

```text
feat: select optional dungeon encounters
```

### 任务 6.4：确定性生成并隐藏稀有 Boss

目标：每轮独立锁定稀有节点是否出现，但不在出发前泄露。

要求：

- 使用活动种子、轮次和节点 ID 生成稳定判定。
- 连续五轮可以产生不同结果。
- Planning Query 只能访问概率，不能访问锁定结果。
- 活动 Query 在推进到节点前也不能通过精确 ETA 间接泄露结果。

建议 commit：

```text
feat: lock hidden rare boss spawns
```

### 任务 6.5：结算可选和稀有节点

目标：活动调度器正确跳过未选可选节点和未出现稀有节点。

验收：

- 跳过节点不发经验、资金或装备。
- 出现的稀有 Boss 正常产生战报和掉落。
- 稀有 Boss 失败可以结束当前挑战，但不影响主线首通定义。
- 主线全通只要求 required 节点全部胜利。

建议 commit：

```text
feat: settle optional and rare encounters
```

### 任务 6.6：增加路线选择和不泄密预览

目标：副本页面支持普通可选 Boss，并正确表达稀有 Boss 不确定性。

要求：

- 普通可选 Boss 显示额外耗时、胜率和掉落入口。
- 稀有 Boss 显示出现概率、条件胜率和额外耗时范围。
- 主路线显示精确耗时；总耗时在稀有节点揭晓前显示范围。
- 任务需要可选 Boss 时显示提醒，但不自动勾选。

建议 commit：

```text
feat: configure optional dungeon routes
```

### 任务 6.7：在活动页揭晓稀有 Boss

目标：推进到对应节点时以明确事件展示稀有 Boss 出现或未出现。

验收：

- 刷新前后揭晓状态一致。
- 未到节点前不显示锁定结果。
- 已跳过的稀有节点不会重复判定。
- 战报和趣味日志可引用稀有出现事件。

建议 commit：

```text
feat: reveal rare bosses during expeditions
```

### 任务 6.8：增加五次连续挑战公会升级

目标：通过明确的公会里程碑将连续挑战上限从三次提高到五次。

修改建议：

- Guild Upgrade 内容。
- 队列上限领域规则和 Query。
- 副本页面选项。
- 领域、应用和 UI 测试。

初始建议在首次通关任一血色修道院分区后开放购买，费用由进度模拟确定。本任务不得同时调整经验曲线。

建议 commit：

```text
feat: unlock five-run expedition queues
```

阶段 6 门禁：

- 路线选择、稀有隐藏和连续挑战都由活动快照保证确定性。
- UI 不会通过剩余时间或预览数据泄露未揭晓稀有结果。

## 13. 阶段 7：成员级副本任务

### 任务 7.1：定义副本任务内容 Schema

目标：描述轻量任务、成员条件、完成条件和奖励选择。

新增建议：

- `content/quests/*.json`
- `src/content/schemas/quest.ts`
- Quest ID、注册表和测试。

支持的完成条件：

```text
击败指定 Boss
击败指定普通可选 Boss
完整通关指定副本
```

第一阶段不支持稀有 Boss 必做任务、跑腿、阵营和复杂前置链。

建议 commit：

```text
feat: define member dungeon quest content
```

### 任务 7.2：持久化成员任务进度

目标：每名成员独立保存已接取、已完成和已领取任务。

修改建议：

- Member QuestState 或独立规范化状态。
- 新游戏工厂、存档迁移和 fixture。
- 迁移测试。

要求：

- 同一成员不能重复完成和领取。
- 不同成员可以独立完成同一任务。
- 候选人不携带公会任务进度。

建议 commit：

```text
feat: persist member dungeon quests
```

### 任务 7.3：实现接取任务命令和查询

目标：会长可以为符合条件的成员接取已解锁副本任务。

验收：

- 副本未解锁时不能接取。
- 等级和职业限制由内容配置检查。
- 已接、已完成或已领取任务不能重复接取。
- Query 显示任务目标、奖励和所需可选 Boss。

建议 commit：

```text
feat: accept member dungeon quests
```

### 任务 7.4：将已接任务自动带入活动快照

目标：出发时自动包含每名参战成员符合当前副本的已接任务。

要求：

- 玩家不需要每次重新勾选任务。
- 未参战成员不能获得进度。
- 活动开始后新接任务不进入已经出发的队伍。
- Planning Query 提醒哪些成员任务需要尚未勾选的可选 Boss。

建议 commit：

```text
feat: carry accepted quests into expeditions
```

### 任务 7.5：按 Encounter 结果推进成员任务

目标：Boss 胜利和主线全通时幂等更新参与者任务。

验收：

- 失败前已经满足的 Boss 条件保留。
- 完整通关条件只在 required 节点全部胜利后完成。
- 重复结算不会重复完成。
- 连续挑战后续轮次不会重复完成同一一次性任务。

建议 commit：

```text
feat: progress member quests from expeditions
```

### 任务 7.6：实现成员专属任务奖励

目标：完成任务后从真实奖励中为该成员选择一项。

修改建议：

- `ItemAcquisitionSource` 增加 quest 来源。
- 奖励预览和领取 Command。
- 收藏记录复用。
- 应用测试。

要求：

- 奖励不能进入公共待分配区。
- 只能装备给完成任务的成员。
- 多选一只领取一次。
- 替换装备按现有出售规则处理。

建议 commit：

```text
feat: claim member quest rewards
```

### 任务 7.7：增加副本任务页面与组队提示

目标：玩家能查看、接取、跟踪和领取任务奖励。

允许实现为独立页面，或作为成员详情和副本页的组合面板；选择后必须保持 Query 与 Command 边界。

E2E 流程：

```text
成员接取任务
→ 组队页自动显示携带任务
→ 勾选所需可选 Boss
→ 完成副本
→ 领取成员专属奖励
→ 图鉴记录更新
```

建议 commit：

```text
feat: add dungeon quest management ui
```

### 任务 7.8：迁移当前伪装成 Boss 掉落的任务奖励

目标：根据阶段 0 审计，将当前公共补偿池中的真实任务奖励迁回任务系统。

要求：

- 每项迁移都引用对应任务和奖励来源。
- 无专属装备池的 Boss 改为无装备掉落。
- 不在本任务修改其他 Boss 的概率和战斗需求。
- 更新当前四副本掉落与任务测试。

建议 commit：

```text
data: restore dungeon quest reward sources
```

阶段 7 门禁：

- Boss 掉落、任务奖励和世界掉落语义完全分离。
- 同一任务可以由不同成员独立完成，但同一成员不能重复领取。

## 14. 阶段 8：内容生产工具升级

### 任务 8.1：更新新增副本工作流

目标：让内容作者按新系统完整录入副本。

更新 `docs/adding-dungeon-workflow.md`，至少覆盖：

- 2019 最终阶段资料口径。
- 必打、普通可选和随机稀有节点。
- 0、1、2 件保证掉落。
- Boss 池与任务奖励分离。
- 随机词缀池和套装。
- 成员副本任务。
- 队伍能力与 Boss 机制。
- 图鉴与收藏验证。
- 进度和平衡模拟。

建议 commit：

```text
docs: expand dungeon content workflow
```

### 任务 8.2：增加副本完整度审计脚本

目标：自动发现遗漏引用和不符合产品口径的内容。

新增建议：

- `scripts/audit-dungeon-content.ts`
- 内容审计测试。

输出至少包括：

- 路线中的所有 Encounter。
- 每个 Boss 是否有合法掉落或明确无掉落。
- 每件装备的来源和词缀池。
- 可选、稀有节点配置。
- 任务奖励与 Boss 池重复项。
- 未引用装备、掉落表、任务或套装。

建议 commit：

```text
chore: audit dungeon content completeness
```

### 任务 8.3：增加单副本平衡模拟入口

目标：内容作者无需修改全局脚本即可模拟新副本。

要求：

- 推荐队、无坦队、无治疗队、越级队、满级碾压队和速带队。
- 输出主路线、可选路线和稀有条件结果。
- 固定样本数和种子。
- 只有显式 `--write` 才能更新 fixture。

建议 commit：

```text
test: add reusable dungeon balance simulation
```

阶段 8 门禁：

- 新增副本前可以自动检查结构完整性和基础平衡。
- 内容遗漏不会只依赖人工试玩发现。

## 15. 阶段 9：十一座副本内容生产

### 15.1 每座副本统一拆分模板

每座副本必须拆成以下四个独立任务和 commit，不得把调查、数据、玩法和平衡一次性混在一起。

#### 子任务 A：资料清单

产出：

- Boss 与路线清单。
- 必打、普通可选、随机稀有分类。
- 每个 Boss 的全部非世界装备。
- 随机词缀和套装引用。
- 副本任务与奖励。
- 机制候选及资料来源。

只提交调查文档或机器可读 manifest，不修改正式内容。

建议 commit 模板：

```text
docs: research <dungeon> content
```

#### 子任务 B：装备与掉落数据

产出：

- 装备定义。
- 随机词缀引用。
- 套装关系。
- Boss 掉落表和相对权重。

验证物品属性、图标、来源和 Boss 关系。本任务不加入路线、任务或平衡数值。

建议 commit 模板：

```text
data: add <dungeon> items and loot
```

#### 子任务 C：副本、路线、任务和机制

产出：

- Dungeon 和 Encounter 定义。
- 必打、普通可选及随机稀有路线。
- 成员副本任务。
- Boss 机制引用。
- 趣味日志模板。

本任务使用保守的初始战斗需求，不更新全局基线。

建议 commit 模板：

```text
feat: add <dungeon> expedition content
```

#### 子任务 D：平衡与玩家流程验收

产出：

- 固定种子平衡 fixture。
- 解锁、经验、资金、耗时和掉落测试。
- 组队预览、任务、图鉴和结算集成测试。
- 必要时增加一条 E2E，但不重复已有通用流程。

建议 commit 模板：

```text
balance: calibrate <dungeon> progression
```

### 15.2 副本执行顺序

严格按以下顺序执行。一个副本的 A–D 全部通过后，才开始同批下一座副本。

| 内容 ID | 批次 | 副本 | 主要验证目标 |
|---|---|---|---|
| D05 | 垂直切片 | 黑暗深渊 | 首次完整验证新装备、路线、任务和机制系统 |
| D06 | 第一批 | 暴风城监狱 | 短时副本和同等级分叉 |
| D07 | 第一批 | 诺莫瑞根 | 长路线、普通可选与机制密度 |
| D08 | 第一批 | 剃刀沼泽 | 速带和中等级装备成长 |
| D09 | 第二批 | 血色修道院：墓地 | 多分区副本的独立解锁起点 |
| D10 | 第二批 | 血色修道院：图书馆 | 分区任务和愿望单刷装 |
| D11 | 第二批 | 血色修道院：军械库 | 高价值装备池与连续挑战 |
| D12 | 第二批 | 血色修道院：大教堂 | 分区阶段终点与公会扩建 |
| D13 | 第三批 | 剃刀高地 | 高等级机制和恢复压力 |
| D14 | 第三批 | 奥达曼 | 45 级前长副本与最终扩建资格 |
| D15 | 阶段终局 | 祖尔法拉克 | 阶段主线、收藏和总体节奏验收 |

例如 D05 必须产生四个独立提交：

```text
D05.A 黑暗深渊资料清单
D05.B 黑暗深渊装备与掉落
D05.C 黑暗深渊路线、任务与机制
D05.D 黑暗深渊平衡与验收
```

### 15.3 每个内容批次的门禁

完成垂直切片、第一批、第二批、第三批和阶段终局时分别执行一次完整验证，并更新：

- 全副本内容审计。
- 物品属性审计。
- 十万样本副本平衡基线。
- 10–45 级进度模拟基线。
- README 当前开放内容。

如果某座新副本需要修改通用调度器、存档 Repository 或内容加载器，应先停止内容任务，把架构缺口拆成独立基础任务，不得在副本提交中临时打补丁。

## 16. 阶段 10：祖尔法拉克阶段系统验收

### 任务 10.1：校准逐成员经验与速带衰减

目标：允许带小号，但避免满级成员带四名低级成员成为永久最优策略。

要求：

- 出发前逐成员显示预计经验。
- 队伍最高与最低等级差过大时产生可配置衰减。
- 高等级成员刷低级本获得极少或零经验。
- 低等级成员仍能从速带中获益。
- 单次副本升级上限保持可配置。

只修改经验公式和进度 fixture，不调整 Boss 战斗需求。

建议 commit：

```text
balance: calibrate boosted dungeon experience
```

### 任务 10.2：校准碾压耗时下限

目标：强队明显缩短低级副本耗时，但不能瞬间完成。

要求：

- 掉落不因碾压而减少。
- 每座副本保留内容配置的最短耗时比例。
- Preview、活动快照和实际结算一致。
- 坐骑尚未接入，不预留虚假的坐骑加成 UI。

建议 commit：

```text
balance: calibrate overlevel dungeon durations
```

### 任务 10.3：实现祖尔法拉克首通里程碑

目标：完成 45 级阶段主线终点，但不终止游戏。

验收：

- 首次击败最终 Boss 记录“45 级时代毕业”。
- 一次性资金和收藏奖励幂等发放。
- 重复通关不会重复发首通奖励。
- 首通后副本、招募、刷装、任务和收藏继续可用。
- 45 级仍不保存溢出经验。

建议 commit：

```text
feat: complete the zulfarrak stage milestone
```

### 任务 10.4：完成一周进度平衡

目标：满足最终节奏指标。

模拟场景：

- 每天管理 4、5、6 次。
- 不同职业构成和正常招募随机性。
- 手动合理分配与一键自动分配。
- 三次队列到五次队列的升级过程。
- 普通可选 Boss、随机稀有 Boss 和任务经验。
- 至少一个速带新人场景。

目标指标：

- 中位核心队在约 5–8 天首通祖尔法拉克。
- 较低频或较差随机场景通常在约 10–14 天完成。
- 不要求全公会达到 45 级。
- 不依赖付费刷新候选人或极端阵容才能完成。

本任务只调整内容配置和明确归属的平衡参数，不新增玩法。

建议 commit：

```text
balance: tune one-week zulfarrak progression
```

### 任务 10.5：增加完整阶段 E2E 验收

状态：已完成。完整流程覆盖于 `tests/e2e/zulfarrak-stage.spec.ts`。

目标：覆盖从新游戏到阶段终点的关键产品语义，而非在真实时间中运行一周。

E2E 至少覆盖：

```text
新游戏
→ 招募与扩建
→ 接取成员任务
→ 配置普通可选 Boss
→ 出发并离线结算
→ 遭遇随机稀有 Boss
→ 获得随机词缀装备
→ 手动分配一件装备
→ 按愿望单自动处理剩余装备
→ 更新装备图鉴和套装进度
→ 解锁五次连续挑战
→ 首通祖尔法拉克
→ 刷新后继续游玩
```

建议 commit：

```text
test: cover complete zulfarrak stage flow
```

### 任务 10.6：发布前文档与审计收尾

状态：已完成。README、正式设计、新增副本工作流与本计划已同步到发布状态，生成审计无漂移。

更新：

- README 当前玩法与开放副本。
- 游戏设计中已经验证的数值。
- 新增副本工作流。
- 全副本内容审计和装备属性审计。
- 已知限制和 45–60 级后续入口。

完整运行所有验证命令，不在本任务修改玩法或平衡。

建议 commit：

```text
docs: finalize the zulfarrak stage release
```

## 17. 最终发布门禁

截至 2026-09-09，以下发布条件已全部满足：

- 十五座副本全部可以解锁、组队、结算和重复挑战。
- 所有主要 Boss 的非世界装备均可通过正确来源获得。
- 无专属装备池的 Boss 不再凭空掉落任务奖励。
- 随机词缀生成、存档、展示和战力计算一致。
- 装备图鉴、套装进度和收藏奖励完整工作。
- 愿望单与自动分配覆盖完整掉落池，手动分配始终可用。
- 普通可选和随机稀有路线不会破坏离线确定性。
- 副本任务按成员独立且不可重复领取。
- 机制检查可以解释胜率、耗时和出发阻塞。
- 三次和五次连续挑战都通过离线结算测试。
- 一周进度目标通过固定场景模拟，不依赖人工感觉。
- 全部格式、Lint、类型、内容、单元、E2E、审计、基线和构建命令通过。

## 18. 后续版本入口

完成本计划后，下一份计划应从以下顺序展开：

```text
45–60 级升级与五人副本
→ 满级五人本和团本前装备
→ 熔火之心团队副本原型
→ 专业、材料、公会仓库和消耗品
→ 完整熔火之心
→ 黑翼之巢
→ 安其拉
→ 纳克萨玛斯
```

在熔火之心原型证明 40 人名单、小队编组、关键职责和多 Boss 进度确实好玩之前，不提前投入完整拍卖行、复杂专业经济或成员社会模拟。
