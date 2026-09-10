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
npm run loot-sources:audit
npm run dungeon-content:audit
npm run progression:baseline:check
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
- 当前开放怒焰裂谷、死亡矿井、哀嚎洞穴、影牙城堡、黑暗深渊、暴风城监狱、诺莫瑞根、剃刀沼泽、剃刀高地、奥达曼、祖尔法拉克，以及血色修道院墓地、图书馆、军械库和大教堂，共 15 座副本、94 个路线 Encounter。
- 任意人数限制由副本内容定义，不在页面或核心逻辑中写死五人。
- 自动战斗，出发前显示每个 Boss 精确胜率、全通率和耗时。
- 多队并行；单个成员同时只能参加一项活动；连续挑战初始支持 1–3 次，影牙城堡首通后可购买五连升级。
- 副本按路线分段结算，页面只展示路线进度，不模拟实时战斗动画。
- 路线包含必打、玩家主动勾选的普通可选 Boss，以及由活动种子锁定、途中揭晓的随机稀有 Boss。
- 灭团只损失已消耗时间，保留此前 Boss 的经验、资金和装备。
- 真实装备属性参与战斗公式；Tooltip 显示属性、需求、来源和数据出处。
- 奥达曼七件原版随机附魔装备支持真实词缀池；词缀会持久化并参与展示、战力和升级比较。
- 战利品只可分配给本次参战成员；手动分配永远可用，也可按成员愿望单预览并主动自动处理剩余装备。
- 副本解锁后公开对应装备图鉴；曾经获得即更新基础物品、词缀、套装和收藏奖励进度。
- 成员可以独立接取、完成和领取轻量副本任务；需要普通可选 Boss 时，组队预览会明确提醒。
- 结构化战报保存伤害、治疗、承伤、奖励与趣味日志，刷新后仍可查看。
- 只有玩家主动安排的活动产生离线收益；页面关闭期间不会凭空获得资金、经验或装备。
- 通过副本首通逐步解锁成员容量扩建，奥达曼阶段可扩建至 30 人。
- 首次击败祖尔法拉克最终 Boss 会自动获得“45 级时代毕业”记录和一次性奖励，之后仍可继续刷装、招募和培养成员。
- 领取阶段毕业记录后，成员等级上限提高到 60；当前仍需回刷已开放副本继续获得经验，45–60 级新副本将在下一阶段加入。

## 已验证阶段节奏

- 32 个固定种子中，每天主动管理 4 次的首通中位数为 7 天、P90 为 9 天。
- 每天主动管理 5 次时为 6 天 / 8 天；6 次时为 5 天 / 6 天。
- 每天主动管理 3 次的低频压力场景为 10 天 / 11 天。
- 所有场景都包含正常招募、一次四带一速带、成员任务、普通可选 Boss、随机稀有 Boss、五连解锁，以及手动和自动分装。

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

- 新公会等级上限为 45，祖尔法拉克毕业后提高到 60；45–60 级升级副本、满级五人本和 60 级团队内容尚未开放。
- 当前阶段只收录主要 Boss 的非世界专属装备和有培养价值的真实任务奖励；世界掉落、普通怪随机绿装、材料、配方和垃圾物品不进入 Boss 装备池。
- 祖尔法拉克不含随机词缀装备；当前真实随机词缀内容集中在奥达曼七件随机附魔装备。
- 套装、收藏奖励和展示记录的通用系统已经可用，但正式经典套装内容仍需随 45–60 级副本继续扩充。
- 坐骑、专业与公会仓库已在架构计划中预留，尚未开放正式页面。
- 本地存档使用 IndexedDB，不包含账号、云同步或跨设备同步。
- 允许删除 V2 IndexedDB 后重新开档；不保证开发阶段存档向后兼容。

## 文档

- [游戏设计文档](./docs/game-design-v0.1.md)
- [10–45 级祖尔法拉克阶段实施计划](./docs/zulfarrak-stage-implementation-plan.md)
- [45–60 级黑石塔阶段实施计划](./docs/level-60-dungeon-stage-implementation-plan.md)
- [经典旧世内容版本与来源政策](./docs/classic-content-source-policy.md)
- [怒焰裂谷垂直切片](./docs/ragefire-chasm-vertical-slice.md)
- [黑暗深渊资料清单](./docs/dungeon-research/blackfathom-deeps.md)
- [新增经典旧世副本工作流](./docs/adding-dungeon-workflow.md)
- [长期可扩展架构重构方案](./docs/architecture-refactor-plan-v2.md)
- [V2 架构重构可执行计划](./docs/refactor-execution-plan-v2.md)
