# 开发者文档

本文档收录《艾泽拉斯公会志》的本地开发、测试、内容校验与架构约束。面向玩家的游戏介绍请查看 [README](README.md)。

## 技术栈

当前客户端使用 Vue、Pinia、Vue Router、Dexie 和 TypeScript，业务逻辑按领域、应用、基础设施和 UI 分层。正式内容通过 Schema 验证后载入只读注册表，本地存档使用 IndexedDB。

## 本地运行

需要 Node.js `^20.19.0` 或 `>=22.12.0`。

```bash
npm install
npm run dev
```

开发服务器固定使用 `http://localhost:4173/`。

生成正式构建并在本地预览：

```bash
npm run build
npm run preview
```

## 测试与静态检查

常规校验：

```bash
npm test
npm run test:e2e
npm run lint
npm run typecheck
npm run format:check
npm run build
```

首次运行 Playwright 前需要安装隔离的 Chromium：

```bash
npx playwright install chromium
```

## 内容校验与数值基线

内容、装备属性、掉落来源和副本完整度检查：

```bash
npm run validate:content
npm run item-stats:audit
npm run loot-sources:audit
npm run dungeon-content:audit
```

副本与进度模拟基线：

```bash
npm run progression:baseline:check
npm run post-zulfarrak:baseline:check
npm run baseline:check
```

需要调查数值变化时，可使用对应的模拟命令：

```bash
npm run progression:simulate
npm run post-zulfarrak:simulate
npm run simulate:dungeons
npm run simulate:dungeon
```

`*:write` 命令会重写对应的审计或模拟基线，只应在确认变化原因后使用。

## 目录结构

```text
content/                 可校验的职业、副本、Boss、物品、掉落和日志内容
scripts/                 内容审计与数值模拟
src/application/         命令、查询、会话和结算服务
src/content/             内容 Schema、加载器与只读注册表
src/domain/              战斗、活动、装备、成员和公会领域规则
src/infrastructure/      IndexedDB、随机数、时钟和 ID 实现
src/stores/              Pinia 游戏会话与临时 UI 状态
src/ui/                  Vue 页面、布局和展示组件
tests/                   领域、应用、Store、组件和 Playwright 测试
```

## 架构边界

- Vue 页面不直接修改存档。
- 所有持久状态变化通过 Application Command 执行。
- 页面通过专用 Query 读取视图模型，临时交互状态由 UI Store 管理。
- 核心领域规则不依赖 Vue、DOM、IndexedDB 或真实系统时间。
- 副本、战斗和掉落是数据驱动内容，不应将具体副本规则写入通用调度器或页面。

## 内容维护原则

正式内容统一使用 `classic-2019-phase-6` 版本口径。内容元数据必须区分：

- `source-fact`：可从经典资料核对的名称、属性、掉落关系、任务和随机词缀等事实。
- `design-decision`：为放置经营体验设计的副本时长、成功率、经验、资金和解锁条件。

真实内容与平衡覆盖需要分开保存，不得用人工平衡值覆盖或伪装外部事实。新增副本通常只应新增 `content/` 定义和相应测试，不应修改通用活动调度或副本页面。

## 存档与开发数据

- 当前客户端存档使用 IndexedDB。
- 检测到旧版独立存档时，客户端会提示创建新公会，不会删除旧数据。
- 开发阶段允许删除 V2 IndexedDB 后重新开档。

## 本地文档

设计、实施计划和生成的审计报告保存在本地 `docs/` 目录中，不随 Git 仓库发布。
