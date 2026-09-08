# 神秘公会：放置公会会长

一款运行在浏览器中的单机放置公会管理游戏。玩家招募并培养成员，组织不同阵容挑战经典副本，在固定倒计时结束后处理装备与战报。

当前正式客户端使用 Vue、Pinia、Vue Router、Dexie 和数据驱动的 V2 领域架构。旧版存档不会迁移，也不会被删除；检测到旧存档时，游戏会明确提示创建独立的新公会。

## 运行

要求 Node.js `^20.19.0` 或 `>=22.12.0`。

```bash
npm install
npm run dev
```

访问 `http://localhost:4173/`。正式构建与本地预览：

```bash
npm run build
npm run preview
```

## 测试与校验

```bash
npm test
npm run test:e2e
npm run lint
npm run typecheck
npm run validate:content
npm run item-stats:audit
npm run baseline:check
npm run build
```

首次运行 Playwright 前需要安装隔离浏览器：

```bash
npx playwright install chromium
```

## 当前玩法

- 开局拥有完整五人队：1 坦克、1 治疗、3 输出；招募成员均从 10 级开始。
- 九职业、固定专精、六种有优缺点的性格，以及低概率隐藏角色。
- 候选人随时间出现，也可消耗公会资金立即刷新；候选区满后自然计时停止。
- 职业与定位组合筛选，完整 17 槽人物装备界面和真实装备图标。
- 当前开放怒焰裂谷、死亡矿井、哀嚎洞穴、影牙城堡，共 27 个 Boss。
- 任意人数限制由副本内容定义，不在页面或核心逻辑中写死五人。
- 自动战斗，出发前显示每个 Boss 精确胜率、全通率和耗时。
- 多队并行；单个成员同时只能参加一项活动；连续挑战支持 1–3 次。
- 副本按路线分段结算，页面只展示路线进度，不模拟实时战斗动画。
- 灭团只损失已消耗时间，保留此前 Boss 的经验、资金和装备。
- 真实装备属性参与战斗公式；Tooltip 显示属性、需求、来源和数据出处。
- 战利品只可分配给本次参战成员，可手动分配、自动分配或出售。
- 结构化战报保存伤害、治疗、承伤、奖励与趣味日志，刷新后仍可查看。
- 页面关闭期间不产生被动收入，但招募与已出发活动的计时继续。

## 架构

```text
content/                 可校验的职业、副本、Boss、物品、掉落和日志内容
docs/                    游戏设计、架构方案和内容生产流程
scripts/                 内容审计与十万样本数值模拟
src/application/         命令、查询、会话和结算服务
src/content/             内容 Schema、加载器与只读注册表
src/domain/              战斗、活动、装备、成员和公会领域规则
src/infrastructure/      IndexedDB、随机数、时钟和 ID 实现
src/stores/              Pinia 游戏会话与临时 UI 状态
src/ui/                  Vue 页面、布局和展示组件
tests/                   领域、应用、Store、组件和 Playwright 测试
```

关键边界：Vue 页面不直接修改存档；所有持久状态变化通过 Application Command，页面读取专用 Query 视图模型。新增副本通常只应增加 `content/` 文件和相应测试，不应修改调度器或通用副本页面。

## 当前边界

- 等级上限暂为 45，尚未导入其余 20–45 级副本和 60 级团队内容。
- 当前四副本的代表性真实掉落已经录入，完整原版掉落池仍需逐步扩充。
- 坐骑、专业与公会仓库已在架构计划中预留，尚未开放正式页面。
- 本地存档使用 IndexedDB，不包含账号、云同步或跨设备同步。
- 允许删除 V2 IndexedDB 后重新开档；不保证开发阶段存档向后兼容。

## 文档

- [游戏设计文档](./docs/game-design-v0.1.md)
- [怒焰裂谷垂直切片](./docs/ragefire-chasm-vertical-slice.md)
- [新增经典旧世副本工作流](./docs/adding-dungeon-workflow.md)
- [长期可扩展架构重构方案](./docs/architecture-refactor-plan-v2.md)
- [V2 架构重构可执行计划](./docs/refactor-execution-plan-v2.md)
