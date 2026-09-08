# V2 架构重构可执行计划

最后更新：2026-09-07

关联设计：[长期可扩展架构重构方案](./architecture-refactor-plan-v2.md)

本文档把架构设计拆成后续 agent 可以逐项执行、验证和提交的实施任务。计划覆盖完整阶段 0–7，但每一步都必须保持游戏可启动、可游玩、可测试。

## 1. 最终交付目标

完成本计划后，项目应具备：

- TypeScript、Vite、Vue 3、Vue Router、Pinia、Zod、Vitest 和 Playwright 工具链。
- 与浏览器、Vue 和存档实现无关的纯领域规则。
- 自动发现、校验和索引的内容系统。
- `GameStateV2`、装备实例、公会仓库和 IndexedDB 存档。
- 可承载副本、采集、制造与训练的统一活动系统。
- 当前四座副本全部使用真实装备属性参与战斗计算。
- 数据驱动与策略代码结合的可扩展战斗公式系统。
- 结构化 Boss 战报和由战报生成的趣味日志。
- Vue 版本的现有核心页面，功能不低于当前原型。
- 一座新增验证副本，证明新增副本不需要修改核心加载器。
- 采矿、锻造和公会仓库的最小完整闭环。
- 骑术和一只坐骑的最小完整闭环。
- 一个仅用于测试的团队 Boss 机制，证明机制接口可扩展。
- 可替换的异步 `SaveRepository`，为未来云存档预留边界。

## 2. 执行规则

后续 agent 必须遵守以下规则。

### 2.1 一个任务一个 commit

- 每个编号任务完成后创建一个 commit。
- commit 只包含该任务相关文件。
- 不在执行过程中 squash；完整阶段稳定后再由用户决定是否合并。
- commit message 使用本文档给出的建议标题。
- 如果任务无法完成，不提交半成品。

### 2.2 每一步始终可运行

- 旧实现被冻结，新实现先并行建设。
- 在 Vue 完整接管之前，`index.html` 继续启动当前可玩版本。
- 新版界面先通过独立入口开发，不提前替换正式入口。
- 只有新版完整玩家流程通过后，才删除旧 `app.js`、`game.js`、`core.js` 和 `content.js`。
- 每个 commit 后至少执行当时已经存在的全部自动检查。

### 2.3 不混合三类风险

同一个任务中不要同时进行：

- 数据格式迁移。
- 战斗数值调整。
- UI 视觉改版。

例如导入真实属性时先验证数据，再单独修改战斗公式，再单独平衡成功率。

### 2.4 工作区安全

- 开始任务前执行 `git status --short --branch`。
- 保留用户已有或无关改动。
- 当前 `.DS_Store` 不属于重构内容，不要顺手加入 commit。
- 不使用破坏性 Git 命令清理工作区。
- 新依赖必须进入 `package.json` 和 lockfile。

### 2.5 每个任务的完成报告

后续 agent 完成任务后必须报告：

1. 实现了什么。
2. 修改了哪些关键文件。
3. 执行了哪些验证及结果。
4. commit hash 和标题。
5. 已知限制或下一任务的前置条件。

## 3. 长期目标目录

任务执行过程中逐步形成以下结构，不要求第一个提交就创建所有空目录：

```text
src/
  main.ts
  app/
  domain/
    shared/
    guild/
    member/
    equipment/
    combat/
    activity/
    dungeon/
    inventory/
    profession/
    mount/
  application/
    commands/
    queries/
    services/
    ports/
  content/
    schemas/
  infrastructure/
    persistence/
    time/
    random/
    ids/
  stores/
  ui/
    layouts/
    pages/
    components/

content/
  classes/
  specs/
  personalities/
  names/
  dungeons/
  encounters/
  items/
  loot-tables/
  logs/
  professions/
  recipes/
  mounts/

tests/
  fixtures/
  domain/
  application/
  content/
  components/
  e2e/
```

## 4. 全程验证命令

工具链逐步建立后，完整验证命令最终应为：

```bash
npm run format:check
npm run lint
npm run typecheck
npm run validate:content
npm test
npm run test:e2e
npm run build
```

早期任务中尚不存在的命令可以跳过，但一旦某个命令被加入，后续每个任务都必须继续执行。

浏览器人工验收使用固定桌面尺寸和一个窄屏尺寸，至少检查：

- 页面可以启动，无控制台错误。
- 招募、成员管理、副本组队、计时、战利品分配仍可使用。
- 页面切换不丢失当前选择，不自动弹回。
- 刷新后存档和活动状态正确恢复。

## 5. 阶段 0：冻结当前行为

### 任务 0.1：提交设计与执行文档

目标：先固定重构依据，避免后续 agent 擅自改变边界。

修改：

- `docs/architecture-refactor-plan-v2.md`
- `docs/refactor-execution-plan-v2.md`
- `README.md`

执行：

- 检查两个文档互相链接。
- 确认 README 同时提供两个入口。
- 不加入 `.DS_Store`。

验证：

```bash
git diff --check
npm test
```

建议 commit：

```text
docs: add executable v2 refactor plan
```

### 任务 0.2：建立四副本平衡基线

目标：保存重构前的关键数值，防止迁移过程中无意改变现有体验。

新增：

- `tests/fixtures/v1-dungeon-baselines.json`
- `scripts/capture-v1-baselines.mjs`
- `tests/baseline.test.mjs`

基线至少记录每座副本的：

- 推荐等级标准五人队定义。
- 每个 Boss 通过率。
- 全通率。
- 预计总耗时。
- 满级碾压队耗时下限。
- 一组非标准阵容结果。

要求：

- 捕获脚本只用于显式更新 fixture。
- 正常测试不能自动覆盖 fixture。
- 数值允许使用明确的误差范围，不能用大范围模糊断言。

验证：

```bash
node scripts/capture-v1-baselines.mjs --check
npm test
```

建议 commit：

```text
test: capture current dungeon balance baselines
```

### 任务 0.3：补齐当前玩家流程特征测试

目标：在拆分 `GuildGame` 前锁定已有行为。

扩展：

- `tests/game.test.mjs`
- 必要时新增 `tests/fixtures/legacy-state.json`

覆盖：

- 新游戏生成五名正式成员和三名候选人。
- 招募、拒绝、付费刷新和候选区满后停止积累。
- 转专精费用与不适配装备处理。
- 多队同时活动、单成员不可重复参加。
- 连续副本、途中灭团和已击败 Boss 奖励保留。
- 战利品只能分给本次参战成员。
- 自动分配和无法使用装备的出售。
- 页面关闭后的副本计时结算。
- 永久解锁和高级成员带低级成员。

验证：

```bash
npm test
```

建议 commit：

```text
test: lock current guild gameplay behavior
```

### 任务 0.4：生成当前内容资产清单

目标：在迁移内容前知道必须完整搬迁什么。

新增：

- `scripts/audit-legacy-content.mjs`
- `docs/generated/legacy-content-inventory.md`

清单包含：

- 职业、专精、性格和隐藏角色数量。
- 四座副本与全部 Boss ID。
- 所有掉落池及引用物品 ID。
- 所有真实装备、任务奖励和初始装备。
- 日志模板键。
- 重复 ID、缺失图标和无效引用。

生成文件必须由脚本稳定输出，同一内容重复执行不产生 diff。

验证：

```bash
node scripts/audit-legacy-content.mjs --check
npm test
```

建议 commit：

```text
chore: inventory legacy game content
```

阶段 0 验收：

- 当前玩法有明确回归基线。
- 后续迁移可以发现行为、内容或平衡意外变化。
- 正式游戏入口仍使用原实现。

## 6. 阶段 1：TypeScript 与质量工具链

### 任务 1.1：引入 Vite 和 TypeScript

目标：建立新代码工具链，但不切换当前业务实现。

安装：

```bash
npm install -D vite typescript
```

新增或修改：

- `package.json`
- lockfile
- `tsconfig.json`
- `vite.config.ts`
- `.gitignore`

脚本至少包含：

```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "typecheck": "tsc --noEmit"
}
```

要求：

- `strict: true`。
- 允许旧 JavaScript 暂不参加严格检查。
- `npm run dev` 启动的仍是当前游戏。
- 原有 `serve` 可暂时保留，README 将 Vite 标为推荐方式。

验证：

```bash
npm run typecheck
npm run build
npm test
```

建议 commit：

```text
build: add vite and strict typescript
```

### 任务 1.2：引入 Vitest 并保留旧测试

目标：新旧测试同时执行，避免一次性改写所有测试。

安装：

```bash
npm install -D vitest
```

修改：

- `package.json`
- `vite.config.ts`

脚本建议：

```json
{
  "test:legacy": "node --test tests/*.test.mjs",
  "test:unit": "vitest run",
  "test": "npm run test:legacy && npm run test:unit"
}
```

新增一个最小 TypeScript 测试，证明 Vitest 可以导入 `src/domain`。

验证：

```bash
npm test
npm run build
```

建议 commit：

```text
test: add vitest alongside legacy tests
```

### 任务 1.3：引入格式化与静态检查

目标：在大规模迁移前固定 TypeScript 和 Vue 代码质量标准。

安装 ESLint、TypeScript ESLint、Vue ESLint 插件和 Prettier；版本选择以安装时互相兼容的稳定版本为准。

新增：

- `eslint.config.js` 或当前推荐的扁平配置文件。
- `.prettierrc`
- `.prettierignore`

要求：

- 新 TypeScript 和 Vue 文件必须检查。
- 旧 JavaScript 可以暂时加入明确的忽略列表。
- 不在本任务机械格式化所有旧文件。

验证：

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

建议 commit：

```text
build: add linting and formatting checks
```

### 任务 1.4：建立基础端口和确定性工具

新增：

- `src/application/ports/clock.ts`
- `src/application/ports/random-source.ts`
- `src/application/ports/id-generator.ts`
- `src/infrastructure/time/browser-clock.ts`
- `src/infrastructure/random/seeded-random-source.ts`
- `src/infrastructure/ids/local-id-generator.ts`
- 对应 Vitest 测试。

要求：

- 领域层禁止直接调用 `Date.now()`、`Math.random()` 或浏览器 API。
- 随机源可从一个种子复现序列。
- 测试提供 FakeClock、FixedRandomSource 和 SequentialIdGenerator。
- 暂时不替换旧游戏中的随机逻辑。

建议 commit：

```text
feat: add deterministic runtime ports
```

阶段 1 验收：

- 原游戏可以通过 Vite 启动和构建。
- 新 TypeScript 代码在严格模式下通过。
- 旧 Node 测试和新 Vitest 测试共同运行。

## 7. 阶段 2：重建内容系统

### 任务 2.1：定义公共内容 ID 与 Schema 基础

安装：

```bash
npm install zod
```

新增：

- `src/domain/shared/ids.ts`
- `src/content/schemas/common.ts`
- `src/content/schemas/content-source.ts`
- `tests/content/schema-foundation.test.ts`

要求：

- 使用品牌化字符串类型区分 MemberId、DungeonId、ItemDefinitionId 等。
- 内容 Schema 拒绝空 ID、负权重、无效等级和未知品质。
- `ContentSource` 区分真实资料与本游戏平衡覆盖。

建议 commit：

```text
feat: define typed content identifiers and sources
```

### 任务 2.2：迁移职业、专精、性格和姓名内容

新增：

- `content/classes/*.json`
- `content/specs/*.json`
- `content/personalities/*.json`
- `content/names/zh-cn.json`
- 对应 Zod Schema。

要求：

- 搬迁当前全部数据，不在此任务修改数值。
- 隐藏角色定义独立保存，不把固定角色条件写死在招募服务。
- 专精定义预留 `combatProfileId`，此时可以先指向占位配置 ID。
- 通过等价测试对比旧 `CLASS_DEFINITIONS`、`PERSONALITIES` 和姓名片段。

建议 commit：

```text
refactor: move member definitions into validated content
```

### 任务 2.3：迁移装备定义

新增：

- `content/items/starter-items.json`
- `content/items/ragefire-chasm.json`
- `content/items/deadmines.json`
- `content/items/wailing-caverns.json`
- `content/items/shadowfang-keep.json`
- `src/content/schemas/item.ts`

本任务只迁移当前字段，真实属性在阶段 5 单独导入。

要求：

- 所有物品 ID 唯一。
- 保存中文名、英文名、物品等级、品质、栏位、护甲或武器类型、职业限制、图标和来源。
- 初始装备使用稳定的定义 ID，不再根据成员 ID 动态生成定义。
- Schema 已预留有单位的属性结构，但允许当前为空。
- 等价测试证明当前掉落物品全部可以解析。

建议 commit：

```text
refactor: move equipment definitions into content files
```

### 任务 2.4：拆分副本、遭遇和掉落表

新增：

- `content/dungeons/*.json`
- `content/encounters/*.json`
- `content/loot-tables/*.json`
- 对应 Schema。

转换规则：

- Dungeon：路线、解锁、人数、总时间配置。
- Encounter：Boss 名称、阶段时间、能力要求、奖励和机制 ID。
- LootTable：物品 ID、权重和保证掉落数量。

要求：

- 保持四座副本当前 Boss 顺序、基础时间和概率参数。
- 每个引用必须能解析。
- 不再让 Boss 数据内嵌完整装备。
- 阶段时间之和必须与副本基础时间一致。

建议 commit：

```text
refactor: separate dungeons encounters and loot tables
```

### 任务 2.5：迁移趣味日志模板

新增：

- `content/logs/common.json`
- `content/logs/dungeons/*.json`
- `src/content/schemas/log-template.ts`

要求：

- 模板保存事件类型和可用参数，不依赖硬编码 Boss ID 查找链。
- 校验模板中使用的变量是否属于允许集合。
- 当前显示文本保持基本一致。

建议 commit：

```text
refactor: move combat log templates into content
```

### 任务 2.6：实现内容注册表和验证命令

新增：

- `src/content/loader.ts`
- `src/content/registry.ts`
- `src/content/manifest.ts`
- `scripts/validate-content.ts`
- 内容契约测试。

要求：

- 使用 Vite 构建期文件导入或生成清单自动发现内容。
- 新增副本不得修改手写 `Promise.all`。
- 注册表对外只暴露只读索引和明确查询方法。
- 实现 `npm run validate:content`。
- 输出错误必须包含文件、字段路径和无效引用 ID。

建议 commit：

```text
feat: add validated content registry
```

### 任务 2.7：增加旧内容兼容适配与等价检查

目标：正式入口仍运行旧游戏，但所有旧内容可以从新注册表生成。

新增：

- `src/content/legacy-content-adapter.ts`
- `tests/content/legacy-equivalence.test.ts`

要求：

- 适配器输出旧 `game.js` 需要的结构。
- 在 Vite 启动路径中让旧游戏使用新内容注册表。
- 暂不删除 `src/content.js` 中的旧定义，等价检查稳定后再删除。
- 四副本基线与全部旧测试保持通过。

建议 commit：

```text
refactor: serve legacy game from new content registry
```

阶段 2 验收：

- 新增内容文件会被自动发现。
- 所有内容在构建期校验。
- 当前四座副本仍可完整游玩。
- 正式入口仍然稳定。

## 8. 阶段 3：GameStateV2 与存档

### 任务 3.1：定义领域实体与 V2 状态

新增：

- `src/domain/guild/guild.ts`
- `src/domain/member/member.ts`
- `src/domain/equipment/item-instance.ts`
- `src/domain/activity/activity.ts`
- `src/domain/inventory/guild-bank.ts`
- `src/domain/game-state.ts`
- 对应测试工厂。

要求：

- 使用按 ID 索引的 `Record` 保存成员、物品实例和活动。
- 存档只引用内容定义 ID，不复制名称和静态属性。
- `GameStateV2` 包含 `saveVersion: 2`、`revision` 和 `contentVersion`。
- 成员使用 `activeActivityId`，不引入新的 `status` 字符串组合。

建议 commit：

```text
feat: define normalized game state v2
```

### 任务 3.2：实现 V2 新游戏工厂

新增：

- `src/domain/member/member-factory.ts`
- `src/domain/guild/new-game.ts`
- 对应测试。

要求：

- 仍生成一坦、一治疗、三输出和三名候选人。
- 新成员仍为 10 级并装备完整初始套装。
- 隐藏角色概率仍为 1%，且同一存档只出现一次。
- 所有实例 ID、随机选择和时间来自端口。
- 初始装备是引用定义的 `ItemInstance`。

建议 commit：

```text
feat: create deterministic v2 guild state
```

### 任务 3.3：实现装备实例、装备栏和仓库规则

新增：

- `src/domain/equipment/equipment.ts`
- `src/domain/equipment/equip-rules.ts`
- `src/domain/inventory/guild-bank-rules.ts`
- 对应测试。

覆盖：

- 护甲、职业、定位、武器和需求等级限制。
- 双手武器清空副手。
- 两个戒指和两个饰品的候选栏位选择。
- 装备实例绑定和归属。
- 可堆叠材料数量与独立装备实例。
- 仓库暂时无限容量，但规则接口允许以后加入限制。

建议 commit：

```text
feat: add item instances equipment and guild bank
```

### 任务 3.4：建立异步存档 Repository

安装：

```bash
npm install dexie
```

新增：

- `src/application/ports/save-repository.ts`
- `src/infrastructure/persistence/indexeddb-save-repository.ts`
- `src/infrastructure/persistence/memory-save-repository.ts`
- Repository 契约测试。

要求：

- `load/create/save` 全部异步。
- 保存时检查 `expectedRevision`。
- IndexedDB 和内存实现通过同一套契约测试。
- 原型 V1 存档不迁移；检测到时提示将创建 V2 新游戏。
- 不自动删除 V1 key，便于调试回退。

建议 commit：

```text
feat: add versioned async save repositories
```

### 任务 3.5：建立应用会话与事务入口

新增：

- `src/application/services/game-session.ts`
- `src/application/commands/create-new-game.ts`
- `src/application/queries/get-game-snapshot.ts`

要求：

- 所有状态修改通过 `GameSession.execute(command)` 或等价明确入口。
- 一次命令成功后只保存一次。
- 命令失败不得留下部分状态。
- 保存冲突返回可处理错误，不静默覆盖。
- 暂时通过测试驱动，不接管正式 UI。

建议 commit：

```text
feat: add transactional v2 game session
```

阶段 3 验收：

- V2 新游戏能保存和恢复。
- 静态内容不会被复制进存档。
- V1 正式游戏仍可运行，V2 通过独立测试验证。

## 9. 阶段 4：应用用例与统一活动系统

### 任务 4.1：实现通用活动调度器

新增：

- `src/domain/activity/activity-registry.ts`
- `src/domain/activity/activity-scheduler.ts`
- `src/domain/activity/activity-handler.ts`
- 对应测试。

要求：

- 开始活动统一验证并占用参与成员。
- 完成、失败和取消统一释放成员。
- 同一成员不可同时参加两个活动。
- 多成员活动必须原子占用，不能只占用一部分。
- 活动按 `nextSettlementAt + activityId` 稳定排序。

建议 commit：

```text
feat: add unified activity scheduler
```

### 任务 4.2：实现副本活动创建

新增：

- `src/domain/dungeon/expedition-activity.ts`
- `src/application/commands/start-expedition.ts`
- `src/application/queries/get-party-preview.ts`

要求：

- 支持可配置人数，不写死五人。
- 支持 1–3 次连续挑战。
- 开始时固化成员、装备、专精、内容版本和随机种子快照。
- 解锁后允许低级成员被带入。
- Preview 与最终开始使用同一套评估函数。

建议 commit：

```text
feat: create expeditions through activity system
```

### 任务 4.3：实现幂等阶段结算

新增：

- `src/domain/dungeon/expedition-settlement.ts`
- `src/application/services/settlement-service.ts`
- 对应集成测试。

要求：

- 逐 Boss 结算。
- 灭团只损失时间，保留此前 Boss 奖励。
- 成功 Boss 保证掉落一件装备。
- 页面关闭后重新进入会补算所有到期节点。
- 同一结算节点重复调用不能重复发奖。
- 多支队伍按稳定顺序结算。

建议 commit：

```text
feat: settle expedition activities idempotently
```

### 任务 4.4：迁移招募和成员管理用例

新增：

- `src/application/commands/recruit-member.ts`
- `src/application/commands/reject-candidate.ts`
- `src/application/commands/generate-candidate.ts`
- `src/application/commands/dismiss-member.ts`
- `src/application/commands/respec-member.ts`

要求：

- 保留当前费用、人数和候选区规则。
- 任何占用中的成员不能被移除或转专精。
- 候选区满时停止自然计时，出现空位后恢复。
- 转专精后的装备处理使用新装备规则。

建议 commit：

```text
refactor: move member lifecycle into application commands
```

### 任务 4.5：迁移战利品用例

新增：

- `src/domain/dungeon/loot-generation.ts`
- `src/application/commands/assign-loot.ts`
- `src/application/commands/sell-loot.ts`
- `src/application/commands/auto-assign-loot.ts`

要求：

- 只有本次参战成员符合分配范围。
- 连续副本结束前战利品保持锁定。
- 分配后生成并绑定装备实例。
- 自动分配暂时仍可使用兼容评分，阶段 5 再切换为属性收益。
- 无人适用时自动出售。

建议 commit：

```text
refactor: move loot handling into v2 commands
```

### 任务 4.6：V2 完整无 UI 流程验收

新增：

- `tests/application/v2-gameplay-flow.test.ts`

完整测试：

```text
新游戏
→ 招募
→ 组建两支不重复队伍
→ 开始副本
→ 推进假时钟
→ 离线结算
→ 获取掉落
→ 分配装备
→ 保存
→ 重新加载
```

要求：

- 不通过旧 `GuildGame`。
- 测试中不访问 DOM 或真实 IndexedDB。
- 四副本基线在兼容战斗模型下保持通过。

建议 commit：

```text
test: verify complete v2 gameplay flow
```

阶段 4 验收：

- V2 领域和应用层已覆盖当前核心循环。
- 副本只是活动系统的一种实现。
- 正式入口仍运行 V1，V2 继续并行。

## 10. 阶段 5：真实属性与结构化战报

### 任务 5.1：定义有单位的属性模型

新增：

- `src/domain/equipment/stats.ts`
- `src/content/schemas/item-stats.ts`
- 对应测试。

首批属性：

- 基础：力量、敏捷、耐力、智力、精神。
- 防御：护甲、防御、闪避、招架、格挡。
- 物理：攻击强度、远程攻击强度、物理命中、物理暴击。
- 法术：法术强度、治疗强度、法术命中、法术暴击。
- 武器：最低伤害、最高伤害、速度。
- 抗性：奥术、火焰、冰霜、自然、暗影。

要求：

- 百分比、点数、秒和伤害区间使用不同字段或明确单位。
- 抗性先参与展示和贡献明细，五人本暂不进入胜率公式。
- 物品等级继续显示，但不直接作为主要战斗乘数。

建议 commit：

```text
feat: define typed classic equipment stats
```

### 任务 5.2：调查并导入当前装备真实属性

范围：

- 怒焰裂谷。
- 死亡矿井。
- 哀嚎洞穴。
- 影牙城堡。
- 当前怒焰任务奖励。
- 初始装备使用明确标记的本游戏平衡属性，不伪装成数据库真实装备。

资料流程遵循：[新增经典旧世副本工作流](./adding-dungeon-workflow.md)。

执行：

- 生成待补属性物品 ID 清单。
- 通过 Wowhead Classic 中文 XML 核对名称、需求等级、原始属性、武器数据和图标。
- 通过 AtlasLootClassic 核对 Boss 与掉落关系。
- 每件物品填写 `source` 和 `verifiedAt`。
- 无法确认的数据不得猜测，必须在审计输出中标记。

新增：

- `scripts/audit-item-stats.ts`
- `docs/generated/current-item-stat-audit.md`

验收：

- 所有真实装备属性审计为完整。
- 初始装备全部标记为 `manual` 与 `balanceOverride`。
- 本任务只导入数据，不修改战斗结果。

建议 commit：

```text
data: add real stats for current dungeon equipment
```

### 任务 5.3：建立可扩展战斗公式管线

新增：

- `src/domain/combat/combat-profile.ts`
- `src/domain/combat/formula-context.ts`
- `src/domain/combat/formula-pipeline.ts`
- `src/domain/combat/stat-contribution.ts`
- `src/domain/combat/strategies/`

固定管线：

```text
职业与等级基础值
→ 装备原始属性汇总
→ 通用派生属性
→ 专精线性权重
→ 非线性策略
→ 性格和团队修正
→ Encounter 修正
→ CombatProfile 与贡献明细
```

初始通用计算形式：

```text
normalizedStat = actualStat / expectedStatAtLevel
linearBonus = Σ(normalizedStat × configuredWeight)
strategyBonus = Σ(strategyResult)
capability = baseCapabilityAtLevel × max(minimumFactor, 1 + linearBonus + strategyBonus)
```

要求：

- `expectedStatAtLevel` 和线性权重来自版本化配置。
- 命中上限、盾牌、武器和续航等非线性规则使用命名策略。
- JSON 不允许携带任意代码或表达式。
- 输出包含每个属性对最终能力的贡献，便于 UI 解释。
- 活动快照和战报记录 `formulaVersion`。

建议 commit：

```text
feat: add extensible combat formula pipeline
```

### 任务 5.4：为所有现有专精建立战斗配置

新增：

- `content/combat-profiles/*.json`
- `src/content/schemas/combat-profile.ts`

要求：

- 当前可招募的每一个专精都必须引用有效配置。
- 每个配置分别输出 `survivability`、`threat`、`healing`、`damage`。
- 坦克与治疗仍保留少量伤害贡献。
- 不适合专精的属性可以有低收益，但不能无理由产生负战力。
- 至少实现以下非线性策略：命中阈值、盾牌坦克收益、武器伤害、法力续航。
- 每个专精使用一组代表性装备测试属性升级方向。

验收测试：

- 增加主属性能提高对应专精能力。
- 错配属性收益明显较低。
- 更换真正更强的装备不会因装等下降而被错误评价。
- 所有专精都能生成有限且非负的 CombatProfile。

建议 commit：

```text
feat: configure combat profiles for all specs
```

### 任务 5.5：切换副本概率和耗时输入

修改 V2 战斗评估：

- 成员装备 → CombatProfile。
- 队伍成员能力 → PartyCombatProfile。
- Boss 继续比较坦克、治疗和输出需求。
- 沿用当前几何准备度与短板权重思路。
- 耗时主要由伤害能力决定，坦克和治疗不足增加惩罚。

要求：

- 物品等级不再直接进入核心能力公式。
- 等级仍通过基础能力和属性换算影响战斗。
- 五人本 `mechanicIds` 为空。
- Preview、实际结算和自动分配使用相同 CombatProfile。

建议 commit：

```text
refactor: evaluate dungeons from derived combat profiles
```

### 任务 5.6：重写自动装备比较

新增：

- `src/domain/equipment/upgrade-evaluation.ts`

输出：

- 是否可装备。
- 替换栏位。
- 四项能力变化。
- 主要属性得失。
- 推荐分数和解释原因。

要求：

- 自动分配按专精主职责收益排序。
- 同收益时优先当前装备较弱的成员。
- 只能考虑本次参战成员。
- 两个戒指、饰品和双手武器正确比较。

建议 commit：

```text
feat: rank loot by combat stat upgrades
```

### 任务 5.7：定义结构化战报

新增：

- `src/domain/combat/combat-report.ts`
- `src/domain/combat/report-generator.ts`
- `src/domain/combat/combat-event.ts`

每个 Boss 报告至少包含：

- 胜负与开始时准确概率。
- 实际耗时。
- 团队总伤害、总治疗和总承伤。
- 每名成员的伤害、治疗、承伤、死亡和贡献评分。
- 关键事件。
- 经验、资金和装备奖励。

一致性要求：

- 成员统计之和等于团队总统计。
- 胜利时团队总伤害符合 Boss 的等效生命值。
- 治疗与承伤关系合理且不出现负数。
- 固定种子生成相同统计和事件。
- 报告保存 ID 与参数，不只保存最终中文句子。

建议 commit：

```text
feat: generate deterministic structured combat reports
```

### 任务 5.8：从战报生成趣味日志

新增：

- `src/application/queries/render-combat-log.ts`
- 新日志事件内容模板。

要求：

- 趣味文本只能读取结构化报告，不参与战斗计算。
- 支持最高伤害、救命治疗、坦克惊险、划水、提前倒地等事件。
- 文本仍保持俏皮，但不能与实际报告矛盾。
- 更换模板不会改变存档中的胜负和奖励。

建议 commit：

```text
feat: render playful logs from combat reports
```

### 任务 5.9：重新校准四副本

新增或修改：

- 战斗配置。
- Encounter 需求值。
- `scripts/simulate-dungeons.ts`
- 四副本 V2 平衡 fixture。

目标：

- 推荐等级、合理真实装备、标准一坦一治疗三输出队伍全通率约 79%–84%。
- 强力队伍仍能把时间压缩到最低 50%。
- 非标准阵容允许进入，但短板会准确降低概率或增加耗时。
- 高级成员带低级成员仍能显著提高低级成员升级速度。

执行至少 100,000 个固定种子模拟样本，报告平均值和分布。

建议 commit：

```text
balance: calibrate four dungeons for real stats
```

阶段 5 验收：

- 当前四副本的真实装备属性全部参与公式。
- 玩家能解释一件装备为什么是提升。
- 战报结构可供不同 UI 使用。
- 新公式有版本号、确定性和完整测试。

## 11. 阶段 6：Vue UI 迁移与正式切换

### 任务 6.1：创建并行 Vue 应用入口

安装：

```bash
npm install vue vue-router pinia
npm install -D @vitejs/plugin-vue @vue/test-utils jsdom
```

新增：

- `v2.html`
- `src/main.ts`
- `src/app/App.vue`
- `src/app/router.ts`
- `src/ui/layouts/GameLayout.vue`

要求：

- `index.html` 仍指向旧游戏。
- `v2.html` 启动 Vue 新版外壳。
- 外壳可加载或创建 V2 存档。
- 暂时只显示状态诊断，不复制旧页面。

建议 commit：

```text
feat: scaffold parallel vue game client
```

### 任务 6.2：实现 Pinia 会话与 UI Store

新增：

- `src/stores/game-store.ts`
- `src/stores/ui-store.ts`
- Store 测试。

要求：

- Game Store 只能调用 Application 命令和 Query。
- UI Store 保存筛选、选中副本、弹窗和标签等临时状态。
- 页面组件不能直接修改 `GameStateV2`。
- 初始化、保存冲突和命令错误有统一处理方式。

建议 commit：

```text
feat: connect vue stores to v2 game session
```

### 任务 6.3：迁移导航、总览和招募页

新增页面与组件：

- `OverviewPage.vue`
- `RecruitmentPage.vue`
- `GameNavigation.vue`
- `RecruitCandidateCard.vue`
- `ActivitySummary.vue`

验收：

- 招募倒计时继续运行。
- 候选区满后停止积累。
- 招募、拒绝和付费刷新可用。
- 页面切换后选择和计时不丢失。

建议 commit：

```text
feat: migrate overview and recruitment to vue
```

### 任务 6.4：迁移成员与装备界面

新增页面与组件：

- `MembersPage.vue`
- `MemberDetailPage.vue`
- `CharacterSheet.vue`
- `EquipmentSlot.vue`
- `ItemTooltip.vue`
- `StatSummary.vue`
- `UpgradeComparison.vue`
- `MemberFilterBar.vue`

验收：

- 保留职业和定位组合筛选。
- 魔兽风格完整装备栏正常显示。
- Tooltip 显示真实属性、来源和需求。
- 成员详情可显示派生战斗能力及属性贡献。
- 转专精、移除成员限制正确。

建议 commit：

```text
feat: migrate members and equipment to vue
```

### 任务 6.5：迁移副本组队和活动页

新增页面与组件：

- `DungeonsPage.vue`
- `ActivitiesPage.vue`
- `DungeonSelector.vue`
- `PartyBuilder.vue`
- `PartyPreview.vue`
- `BossRoute.vue`
- `ActiveExpeditionCard.vue`

验收：

- 能切换四座副本。
- 组队筛选、成员选择和连续次数可用。
- 显示精确 Boss 概率、全通率和耗时。
- 多队同时活动。
- 同一成员不可重复选择。
- 显示路线进度而不模拟实时战斗动画。
- 页面切换不会自动弹回。

建议 commit：

```text
feat: migrate dungeons and activities to vue
```

### 任务 6.6：迁移战利品与战报页

新增页面与组件：

- `LootPage.vue`
- `CombatReportPage.vue`
- `LootCard.vue`
- `MemberCombatTable.vue`
- `CombatEventList.vue`

验收：

- 只能向本次参战成员分配。
- 显示装备对候选成员的真实能力提升。
- 自动分配、出售和锁定状态正确。
- 战报显示事实统计与趣味日志。
- 刷新后战报仍可查看。

建议 commit：

```text
feat: migrate loot and combat reports to vue
```

### 任务 6.7：加入 Playwright 核心流程

安装：

```bash
npm install -D @playwright/test
```

新增：

- `playwright.config.ts`
- `tests/e2e/new-game.spec.ts`
- `tests/e2e/navigation.spec.ts`
- `tests/e2e/expedition.spec.ts`
- `tests/e2e/persistence.spec.ts`

要求：

- 测试使用 V2 入口和隔离 IndexedDB。
- 通过可控测试时钟或测试接口推进活动，不真实等待数分钟。
- 捕获控制台错误并使测试失败。
- 断言行为与状态，不做像素级旧界面对比。

建议 commit：

```text
test: cover v2 player flows with playwright
```

### 任务 6.8：正式切换到 Vue 并删除旧实现

执行前置：

- 所有 V2 单元、内容、集成和 E2E 测试通过。
- 四副本人工完整游玩一次。
- V2 页面覆盖当前所有正式入口功能。

修改：

- `index.html` 切换到 `src/main.ts`。
- 删除临时 `v2.html`。
- 删除旧 `src/app.js`、`src/game.js`、`src/core.js`、`src/content.js`。
- 删除只为旧实现存在的适配器和测试。
- 更新 README 运行与结构说明。

要求：

- 不删除 V1 localStorage key。
- 首次启动清晰提示 V2 需要创建新公会。
- 正式入口构建与 E2E 全部通过。

建议 commit：

```text
refactor: switch production client to vue v2
```

阶段 6 验收：

- 正式游戏完全运行在新架构上。
- 旧单体文件已删除。
- UI 可以继续改版，但不再承载领域规则。

## 12. 阶段 7：用真实功能验证扩展能力

### 任务 7.1：仅通过内容增加黑暗深渊

目标：证明新增副本不需要修改核心加载器或活动调度器。

资料和步骤遵循：[新增经典旧世副本工作流](./adding-dungeon-workflow.md)。

新增：

- 黑暗深渊 Dungeon 定义。
- Encounter 定义。
- LootTable 与真实装备定义。
- 副本日志模板。
- 平衡测试。

允许修改：

- 内容文件。
- 仅与黑暗深渊平衡有关的 fixture 或测试。

不允许修改：

- 内容加载器。
- 活动调度器。
- 通用副本页面。
- 存档 Repository。

如果必须修改上述文件，先记录架构缺口，不要直接打补丁掩盖问题。

建议 commit：

```text
feat: add blackfathom deeps through content system
```

### 任务 7.2：建立专业内容与成员专业状态

新增：

- `src/domain/profession/profession.ts`
- `content/professions/mining.json`
- `content/professions/blacksmithing.json`
- 专业 Schema 和测试。

要求：

- 每名成员独立拥有专业、熟练度和已知配方。
- 第一版支持采矿和锻造。
- 学习专业消耗可配置资金。
- 学习、放弃和熟练度条件通过应用命令执行。
- 不限制公会中学习同一专业的人数。

建议 commit：

```text
feat: add member professions and skill progression
```

### 任务 7.3：实现采矿活动

新增：

- `src/domain/profession/gathering-activity.ts`
- `src/application/commands/start-gathering.ts`
- 铜矿采集内容和掉落表。

要求：

- 采集通过现有 `ActivityScheduler` 占用一名成员。
- 玩家必须主动开始，不产生无任务的离线收入。
- 完成后材料进入公会仓库。
- 熟练度和等级影响可用地点与基础产量。
- 同一结算不能重复发材料。

建议 commit：

```text
feat: add timed mining activities
```

### 任务 7.4：实现锻造活动

新增：

- `src/domain/profession/crafting-activity.ts`
- `src/application/commands/start-crafting.ts`
- 首批铜锭及低级锻造配方内容。

要求：

- 开始制造时原子预留或扣除材料。
- 材料不足时不能开始。
- 取消规则明确，第一版建议开始后不可取消以避免返还复杂度。
- 完成后的材料进入堆叠库存；装备生成独立实例进入公会仓库。
- 制造装备可以继续通过现有分配流程交给成员。

建议 commit：

```text
feat: add timed blacksmithing activities
```

### 任务 7.5：增加仓库与专业 Vue 页面

新增：

- `GuildBankPage.vue`
- `ProfessionsPage.vue`
- `ProfessionDetailPage.vue`
- 材料、配方和活动组件。

验收流程：

```text
成员学习采矿
→ 开始采集并被占用
→ 完成后获得铜矿
→ 学习锻造
→ 消耗仓库材料制造
→ 产物进入公会仓库
```

同时验证采矿中的成员不能参加副本。

建议 commit：

```text
feat: add guild bank and profession pages
```

### 任务 7.6：实现骑术和坐骑领域模型

新增：

- `src/domain/mount/riding.ts`
- `src/domain/mount/mount.ts`
- `content/mounts/*.json`
- 骑术与坐骑 Schema。

第一只正式坐骑：

- 需求 40 级。
- 需求初级骑术。
- 忽略阵营限制。
- 使用内容配置的活动修正系数，不根据“60% 移速”硬算。

内容字段建议：

```json
{
  "activityModifiers": {
    "dungeonDurationMultiplier": 0.9,
    "gatheringDurationMultiplier": 0.9,
    "gatheringYieldMultiplier": 1.1
  }
}
```

以上是首轮平衡起点，不代表最终数值。系数必须进入内容配置和测试，不能散落在副本或专业代码中。

要求：

- 坐骑属于成员。
- 成员可拥有多只坐骑，但一次只启用一只。
- 未达到等级或骑术要求不能学习或启用。
- 坐骑不直接增加战斗能力。

建议 commit：

```text
feat: add member riding and mount modifiers
```

### 任务 7.7：将坐骑系数接入活动

修改：

- 副本活动创建。
- 采集活动创建。
- 活动 Preview。

规则：

- 副本总时间乘坐骑定义的 `dungeonDurationMultiplier`。
- 采集时间乘 `gatheringDurationMultiplier`。
- 采集结算产量乘 `gatheringYieldMultiplier`，按确定性规则取整。
- 队伍中多人拥有不同坐骑时，第一版使用全队平均副本时间系数。
- 活动开始时固化系数；途中更换坐骑不改变已经开始的活动。

验收：

- Preview 与实际活动时间一致。
- 未骑乘成员不受影响。
- 坐骑不改变 Boss 成功率。
- 固定种子的采集结果可复现。

建议 commit：

```text
feat: apply mount modifiers to timed activities
```

### 任务 7.8：增加坐骑 Vue 页面

新增：

- `MountsPage.vue`
- `MemberMountPanel.vue`
- 骑术训练与坐骑购买交互。

验收：

- 40 级以下成员看到明确条件但不能学习。
- 合格成员可以花费资金学习骑术、获得并启用坐骑。
- 成员详情显示骑术和当前坐骑。
- 副本和采集 Preview 显示坐骑带来的时间或产量变化。

建议 commit：

```text
feat: add riding and mount management ui
```

### 任务 7.9：验证团队 Boss 机制接口

目标：只验证扩展点，不开放正式团队副本。

新增：

- `src/domain/combat/mechanics/interrupt-check.ts`
- `tests/fixtures/test-raid-encounter.json`
- 机制单元测试和 Encounter 集成测试。

要求：

- 测试 Encounter 引用 `interrupt-check`。
- 有足够打断能力时提高成功率或降低风险。
- 缺少打断仍可产生明确失败原因和战报事件。
- 五人副本因为 `mechanicIds` 为空而完全不受影响。
- 不为测试机制增加正式页面或玩家可见副本。

建议 commit：

```text
test: prove encounter mechanic extensibility
```

### 任务 7.10：最终架构清理与文档更新

执行：

- 删除确认无引用的过渡适配器。
- 更新 README 项目结构、命令和玩法范围。
- 更新新增副本工作流以适配新 Schema。
- 新增专业、坐骑和公式配置工作流。
- 生成最终依赖图和内容审计报告。
- 确认没有业务逻辑残留在 Vue 组件或 Pinia Store。

完整验证：

```bash
npm run format:check
npm run lint
npm run typecheck
npm run validate:content
npm test
npm run test:e2e
npm run build
git diff --check
```

建议 commit：

```text
docs: finalize v2 architecture workflows
```

阶段 7 验收：

- 新增副本主要是内容工作。
- 专业和坐骑复用了活动系统。
- 坐骑效果由配置系数控制。
- 团队机制通过独立策略扩展。
- 不需要重新扩大核心 Game 类或中心条件分支。

## 13. 阶段门禁

后续 agent 不得仅因为代码已经写完就进入下一阶段。必须通过对应门禁。

### 门禁 A：阶段 0–2

- 四副本旧行为测试通过。
- 内容注册表自动发现文件。
- 所有内容引用通过校验。
- 正式入口仍可完整游玩。

### 门禁 B：阶段 3–4

- V2 完整无 UI 玩家流程通过。
- IndexedDB 与内存 Repository 通过同一契约测试。
- 所有活动结算幂等。
- 同一成员活动占用规则只有一个实现来源。

### 门禁 C：阶段 5

- 当前所有真实装备属性完整。
- 每个现有专精拥有有效战斗配置。
- 四副本概率和耗时达到目标。
- 自动分配由真实属性收益驱动。
- 战报确定、结构一致且可解释。

### 门禁 D：阶段 6

- Vue 覆盖现有完整核心循环。
- E2E 覆盖新游戏、导航、副本、离线结算和存档。
- 正式入口切换后不存在旧业务实现引用。

### 门禁 E：阶段 7

- 黑暗深渊不修改核心加载器即可加入。
- 采矿和锻造形成完整闭环。
- 坐骑通过配置影响副本时间和采集效率。
- 测试团队机制不影响普通五人副本。

## 14. 出现偏差时的处理规则

### 14.1 基线变化

如果非平衡任务改变副本概率、耗时或掉落：

1. 停止当前任务。
2. 找出变化来源。
3. 优先修复实现以恢复基线。
4. 只有明确属于阶段 5.9 的策划调整才能更新平衡 fixture。

### 14.2 需要修改核心扩展点

如果阶段 7 新副本、专业或坐骑必须修改核心调度器：

1. 不直接加入特例判断。
2. 在当前任务报告架构缺口。
3. 增加一个独立的基础设施或领域重构任务。
4. 先提交通用扩展点及测试，再提交具体功能。

### 14.3 内容资料不确定

如果真实属性或掉落资料无法确认：

- 不猜测。
- 在审计文档中列出物品 ID、缺失字段和查过的来源。
- 其他已确认物品可以继续处理。
- 未确认物品不得标记内容验收完成。

### 14.4 UI 与旧版不同

本次 Vue 迁移不要求像素级一致，但必须保留功能和信息：

- 如果差异只是布局或样式改善，可以保留并在 commit 中说明。
- 如果减少了可操作功能或隐藏了重要数值，视为回归并必须修复。
- 不在迁移任务中进行大规模视觉重设计。

## 15. 全部完成的定义

只有同时满足以下条件，完整计划才算完成：

- 阶段 0–7 的所有任务已经完成或由用户明确取消。
- 每个任务都有独立 commit 和验证记录。
- 正式入口是 Vue + V2 状态架构。
- 当前四副本使用真实装备属性计算。
- 黑暗深渊证明内容扩展路径有效。
- 采矿、锻造、公会仓库和坐骑形成可玩闭环。
- 没有成员可以同时参与两个活动。
- 核心规则不依赖 Vue、DOM、IndexedDB 或真实系统时间。
- 内容、公式、存档和活动均有版本信息。
- 完整自动检查全部通过。
- README 和工作流文档与实际代码一致。

## 16. 建议的首次执行范围

第一次交给实施 agent 时，只要求连续完成任务 0.1–1.2：

1. 提交设计和执行文档。
2. 建立四副本基线。
3. 补齐当前玩家流程测试。
4. 生成旧内容清单。
5. 引入 Vite 与 TypeScript。
6. 引入 Vitest 并保持旧测试运行。

完成后先检查阶段 0 基线是否足够稳定，再继续大量内容迁移。这样能尽早发现计划是否遗漏当前行为，而不会在已经改写数据结构后才补回归测试。
