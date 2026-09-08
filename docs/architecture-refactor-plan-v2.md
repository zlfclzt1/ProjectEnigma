# 长期可扩展架构重构方案

最后更新：2026-09-07

本文档为“神秘公会”从浏览器原型走向长期可维护游戏制定代码重构方案。目标不是一次性完成所有未来玩法，而是先建立稳定边界，使新增副本、真实装备属性、详细战报、坐骑和专业系统能够分别开发，避免继续扩大现有单体文件。

## 1. 已确认的产品边界

本方案基于以下决定：

- 允许清空当前原型存档，直接启用新版存档结构。
- 装备的真实属性会参与战斗计算，不再只展示物品等级。
- 五人副本继续采用轻量战斗模型，不逐秒模拟技能循环。
- 轻量战斗也要生成结构化的伤害、治疗、承伤、关键事件和趣味战报。
- 五人副本暂不要求驱散、打断、抗性等特殊机制；团队副本预留机制接口。
- 坐骑、骑术、专业和专业熟练度属于每个成员，不是公会共享能力。
- 专业活动会占用成员，与副本平级。
- 材料和制造产物存放在无容量限制的公会仓库。
- 首版仍是本地单机游戏，但数据访问层要能在未来替换为账号和云存档。
- 游戏资料尽量还原经典旧世；放置玩法中的时间、经验、资金和必掉规则允许重新平衡。
- 继续忽略阵营对副本、职业招募、专业和坐骑内容的限制。

## 2. 当前结构的主要问题

当前代码适合验证玩法，但继续添加系统会快速增加修改风险。

### 2.1 `src/content.js` 同时承担太多内容职责

当前文件同时包含：

- 职业、专精和种族定义。
- 性格定义。
- 随机姓名。
- 战斗日志模板。
- 大量装备定义。
- 副本和掉落文件的加载与注册。

新增一座副本仍然需要手动修改加载列表；新增装备、专业配方和坐骑后，这个文件会成为所有内容的汇总瓶颈。

### 2.2 `src/game.js` 是规则、流程和存档的混合体

当前 `GuildGame` 同时负责：

- 新游戏创建。
- 招募和成员生成。
- 随机数与 ID。
- 副本开始、计时和结算。
- 解锁刷新。
- 战利品创建、分配和出售。
- 存档读取、写入和旧存档修复。

专业、坐骑和团队副本如果继续添加到这里，会产生大量互相依赖的条件分支。

### 2.3 `member.status` 只能描述副本占用

当前成员通过 `status` 和 `expeditionId` 表示正在参加副本。专业采集、制造、骑术训练和未来任务都会重复实现一套占用逻辑，而且很容易允许同一成员同时执行两个活动。

### 2.4 战斗结果缺少可复用的数据

当前战斗直接得出 Boss 成功率并写入一段文本日志。未来无法可靠回答：

- 谁造成了多少伤害。
- 谁承受了主要伤害。
- 治疗压力来自哪里。
- 哪项装备属性改善了结果。
- 团队副本的某个机制是否处理成功。

文本不能反向作为游戏数据使用，所以需要先生成结构化战报，再由界面将其渲染成文本。

### 2.5 界面和游戏规则耦合

当前 `src/app.js` 同时负责页面模板、筛选状态、事件分发、倒计时和领域数据显示。整页字符串重绘在页面继续增长后，会使成员详情、装备提示、战报和专业队列难以独立测试与维护。

### 2.6 静态定义与运行时实例没有彻底分开

装备被分配时会把完整装备对象复制进成员存档。这会造成：

- 内容修正后，旧实例仍保存过时字段。
- 存档体积随装备数量增长。
- 很难区分“数据库里的装备”和“玩家实际获得的装备”。
- 无法自然加入绑定、附魔、耐久、随机属性等实例字段。

## 3. 总体架构决定

建议采用以下技术栈：

| 部分 | 选择 | 用途 |
|---|---|---|
| 语言 | TypeScript 严格模式 | 约束内容、状态、命令和战报结构 |
| 构建 | Vite | 开发服务器、构建、JSON 导入和按需加载 |
| UI | Vue 3 | 拆分页面和交互组件 |
| 路由 | Vue Router | 成员、副本、战报、仓库、专业和坐骑页面 |
| 客户端状态 | Pinia | 保存 UI 状态和调用应用服务；不承载核心公式 |
| 数据校验 | Zod | 在开发和构建时验证内容 JSON |
| 本地存档 | IndexedDB，建议通过 Dexie 适配 | 支持比 `localStorage` 更大的结构化存档 |
| 单元测试 | Vitest | 规则、服务和内容校验 |
| 组件测试 | Vue Test Utils | 页面交互和组件状态 |
| 端到端测试 | Playwright | 关键玩家流程与存档恢复 |

暂时不要引入以下复杂度：

- 不拆微服务。
- 不为了预留服务器而立即开发服务器。
- 不使用完整事件溯源作为存档方案。
- 不采用 ECS；本游戏主要是业务实体与定时活动，不是高频实时模拟。
- 不把所有规则做成通用脚本语言或插件系统。
- 不在第一轮重构中同时实现专业、坐骑和团队副本。

## 4. 分层原则

代码分为六层，依赖只能向内：

```text
Vue 页面与组件
       ↓
Pinia / 应用用例
       ↓
领域模块与规则
       ↓
领域类型

内容仓库 ─────→ 应用用例与领域规则
基础设施 ─────→ 实现存档、时钟、随机数和 ID 接口
```

### 4.1 领域层 `domain`

包含纯 TypeScript 规则，不访问 DOM、网络、IndexedDB 或系统时间。

输入相同的角色、装备、内容版本、时间和随机种子时，必须输出相同结果。

### 4.2 应用层 `application`

组织一次完整玩家操作，例如：

- 招募成员。
- 开始副本活动。
- 开始采矿活动。
- 结算所有到期活动。
- 分配一件装备。
- 学习专业配方。
- 学习骑术并装备坐骑。

应用层负责事务边界和跨领域协调，但不在内部硬编码战斗公式。

### 4.3 内容层 `content`

保存经典旧世资料和本游戏平衡数据。内容是只读定义，不是玩家存档。

所有 JSON 必须通过 Zod Schema 校验后才能进入游戏。

### 4.4 基础设施层 `infrastructure`

实现领域和应用层需要的外部能力：

- `SaveRepository`
- `ContentRepository`
- `Clock`
- `RandomSource`
- `IdGenerator`

首版分别由 IndexedDB、构建内置内容、浏览器时间和带种子的随机数实现。

### 4.5 状态适配层 `stores`

Pinia Store 只做：

- 加载当前游戏快照。
- 调用应用用例。
- 向组件暴露查询结果。
- 保存仅与界面相关的选择、筛选、弹窗和标签状态。

Store 不直接修改成员等级、装备、仓库或活动结果。

### 4.6 展示层 `ui`

Vue 组件只负责显示和收集输入。诸如“能否装备”“能否开始副本”“活动是否到期”等判断必须来自应用查询或领域规则。

## 5. 推荐目录结构

第一阶段保持单仓库、单 Web 应用，不急于创建 monorepo：

```text
src/
  main.ts
  app/
    App.vue
    router.ts

  domain/
    shared/
      ids.ts
      result.ts
    guild/
      guild.ts
      guild-rules.ts
    member/
      member.ts
      recruitment.ts
      progression.ts
    equipment/
      item-definition.ts
      item-instance.ts
      equipment.ts
      equip-rules.ts
      derived-stats.ts
    combat/
      combat-profile.ts
      party-evaluation.ts
      encounter.ts
      combat-report.ts
      mechanics.ts
    activity/
      activity.ts
      activity-registry.ts
      activity-scheduler.ts
    dungeon/
      expedition.ts
      expedition-settlement.ts
      loot-generation.ts
    inventory/
      guild-bank.ts
    profession/
      profession.ts
      profession-activity.ts
    mount/
      riding.ts
      mount.ts

  application/
    commands/
      recruit-member.ts
      start-expedition.ts
      assign-loot.ts
      start-profession-activity.ts
    queries/
      get-party-preview.ts
      get-member-sheet.ts
      get-activity-timeline.ts
    services/
      game-session.ts
      settlement-service.ts
    ports/
      save-repository.ts
      content-repository.ts
      clock.ts
      random-source.ts
      id-generator.ts

  content/
    schemas/
    loader.ts
    registry.ts
    manifest.ts

  infrastructure/
    persistence/
      indexeddb-save-repository.ts
      remote-save-repository.ts
    time/
      browser-clock.ts
    random/
      seeded-random-source.ts
    ids/
      local-id-generator.ts

  stores/
    game-store.ts
    ui-store.ts

  ui/
    layouts/
    pages/
    components/
      members/
      equipment/
      dungeons/
      combat-report/
      activities/
      guild-bank/
      professions/
      mounts/

content/
  manifest.json
  classes/
  specs/
  personalities/
  dungeons/
  encounters/
  items/
  loot-tables/
  logs/
  professions/
  recipes/
  mounts/

tests/
  domain/
  application/
  content/
  components/
  e2e/
```

未来真正增加服务端时，可以将 `domain`、内容 Schema 和部分 `application` 提取到共享 package；现在提前做 monorepo 只会增加维护成本。

## 6. 核心数据模型

### 6.1 静态定义与运行时实例

必须明确区分两类数据。

静态内容定义：

```ts
interface ItemDefinition {
  id: ItemDefinitionId;
  name: LocalizedText;
  itemLevel: number;
  requiredLevel: number;
  quality: ItemQuality;
  slot: EquipmentSlot;
  armorType?: ArmorType;
  weaponType?: WeaponType;
  stats: Partial<Record<StatId, number>>;
  restrictions: EquipRestrictions;
  icon: IconReference;
  source: ContentSource;
}
```

运行时装备实例：

```ts
interface ItemInstance {
  id: ItemInstanceId;
  definitionId: ItemDefinitionId;
  ownerMemberId?: MemberId;
  bound: boolean;
  acquiredAt: number;
  source: ItemAcquisitionSource;
  enchantmentIds: EnchantmentId[];
}
```

存档只保存 `definitionId` 和实例状态。名称、图标和基础属性从内容仓库查询。

### 6.2 成员

```ts
interface Member {
  id: MemberId;
  identity: {
    name: string;
    raceId: RaceId;
    classId: ClassId;
    personalityId: PersonalityId;
    hiddenCharacterId?: HiddenCharacterId;
  };
  progression: {
    level: number;
    experience: number;
    specId: SpecId;
  };
  equipment: Partial<Record<EquipmentSlot, ItemInstanceId>>;
  professionIds: MemberProfessionId[];
  riding: MemberRidingState;
  activeActivityId?: ActivityId;
}
```

不再把 `className`、`specName`、`personalityName` 等可从内容表推导的文本复制进存档。

### 6.3 规范化游戏状态

```ts
interface GameStateV2 {
  saveVersion: 2;
  revision: number;
  contentVersion: string;
  guild: GuildState;
  members: Record<MemberId, Member>;
  candidates: Record<CandidateId, Candidate>;
  itemInstances: Record<ItemInstanceId, ItemInstance>;
  activities: Record<ActivityId, Activity>;
  pendingLoot: Record<PendingLootId, PendingLoot>;
  guildBank: GuildBank;
  history: HistorySummary;
  random: RandomState;
  createdAt: number;
  updatedAt: number;
}
```

使用按 ID 索引的记录，避免规则中反复调用 `array.find()`。页面需要排序时，由查询层生成数组视图。

`revision` 为未来云存档的乐观并发控制预留；本地首版同样递增，确保接口从一开始就是异步且有版本概念。

## 7. 统一活动系统

副本、专业、骑术训练等都实现为活动，不再直接把状态写在成员上。

```ts
type Activity =
  | ExpeditionActivity
  | GatheringActivity
  | CraftingActivity
  | TrainingActivity;

interface ActivityBase {
  id: ActivityId;
  type: ActivityType;
  participantIds: MemberId[];
  status: "scheduled" | "active" | "completed" | "failed" | "cancelled";
  createdAt: number;
  startedAt: number;
  nextSettlementAt: number;
  completedAt?: number;
  seed: string;
  contentVersion: string;
}
```

### 7.1 活动约束

- 一个成员最多拥有一个 `activeActivityId`。
- 开始活动必须通过统一的 `ActivityScheduler` 检查并占用成员。
- 结束、失败或取消活动必须由同一模块释放成员。
- 只有玩家主动开始的活动才会产生收益，保持“没有离线被动收入”的规则。
- 页面关闭后计时继续；再次打开时由 `SettlementService` 结算所有到期节点。
- 结算必须幂等，同一个阶段重复执行不会重复发经验、资金或物品。
- 多个同时到期的活动按照 `nextSettlementAt` 和稳定 ID 排序，保证结果可复现。

### 7.2 活动处理器注册表

```ts
interface ActivityHandler<T extends Activity> {
  validateStart(context: StartContext, request: StartRequest): ValidationResult;
  create(context: StartContext, request: StartRequest): T;
  settle(context: SettlementContext, activity: T): SettlementResult;
}
```

`ActivityRegistry` 按活动类型查找处理器。以后增加钓鱼、拍卖委托或训练时，不需要修改一个巨大的 `switch` 或 `GuildGame` 类。

## 8. 真实装备属性与战斗能力

### 8.1 属性分层

不要让 Boss 或副本直接读取装备栏。计算过程分为：

```text
装备定义 + 成员等级 + 职业/专精
                ↓
           原始属性汇总
                ↓
        等级换算与派生属性
                ↓
       MemberCombatProfile
                ↓
       PartyCombatProfile
                ↓
         Boss 成功率与耗时
```

建议首批支持：

- 基础属性：力量、敏捷、耐力、智力、精神。
- 直接能力：护甲、攻击强度、远程攻击强度、法术强度、治疗强度。
- 战斗评级：命中、暴击、防御、闪避、招架、格挡。
- 武器数据：最低伤害、最高伤害、速度、类型、单双手。
- 抗性字段先录入并展示，五人本公式暂不使用。

经典旧世不同装备可能使用百分比而不是后期版本的统一评级，Schema 要明确单位，不能把所有数值都塞进一个无单位的 `stats` 对象。

### 8.2 职业和专精公式

职业、专精负责定义属性如何转化为战斗能力：

```ts
interface CombatProfile {
  memberId: MemberId;
  role: Role;
  survivability: number;
  threat: number;
  healing: number;
  damage: number;
  utility: UtilityProfile;
  diagnostics: StatContribution[];
}
```

例子：

- 防御战士主要从耐力、护甲、防御、盾牌和力量获得坦克能力。
- 神圣牧师主要从智力、精神、治疗强度和法术暴击获得治疗能力。
- 术士主要从智力、法术强度、法术命中和法术暴击获得伤害能力。

公式应放在 `domain/combat` 的策略中，不放进 UI，也不直接写进装备数据。

第一版不要追求完整复刻每个技能循环。先保证：同职业专精的合理属性升级一定能提高对应能力，错配属性的收益明显更低。

### 8.3 装备比较

自动分配不能再使用“平均装等提升最大”作为唯一标准，而要调用：

```ts
evaluateUpgrade(member, candidateItem, encounterContext)
```

返回：

- 是否可装备。
- 替换哪个栏位。
- 坦克、治疗、输出能力变化。
- 主要属性得失。
- 推荐分数和原因。

没有指定副本环境时，使用该成员专精的通用权重；团队机制上线后可以传入特定遭遇环境。

## 9. 轻量战斗与结构化战报

五人本仍以每个 Boss 一次结算为主，不逐秒模拟技能。

### 9.1 战斗流程

```text
开始副本
  → 固化成员、装备、属性、内容版本和随机种子
  → 生成每个 Boss 的概率与耗时计划
  → 到达阶段结算时间
  → 判定成功或失败
  → 生成成员统计和关键事件
  → 发放经验、资金和掉落
  → 写入结构化战报
```

活动开始时必须保存战斗快照。成员在活动结束前不能换装或转专精；即便以后允许远程查看，结算也不能因内容更新或页面重载而发生变化。

### 9.2 战报结构

```ts
interface EncounterReport {
  id: EncounterReportId;
  expeditionId: ActivityId;
  dungeonId: DungeonId;
  encounterId: EncounterId;
  startedAt: number;
  endedAt: number;
  outcome: "victory" | "wipe";
  probabilityAtStart: number;
  durationSeconds: number;
  partyTotals: CombatTotals;
  memberResults: MemberCombatResult[];
  events: CombatEvent[];
  rewards: RewardResult;
}
```

`MemberCombatResult` 至少记录伤害、治疗、承伤、死亡与贡献评分。数据根据成员战斗能力、角色职责、Boss 压力和固定随机种子进行分配，所有成员之和必须与团队总量一致。

### 9.3 日志生成

战报展示分为两层：

1. 事实层：Boss 胜负、耗时、伤害、治疗、承伤、奖励。
2. 文案层：根据结构化事件选择俏皮模板。

文案层可以改写或增加模板，但不能改变战斗结果。不要只把最终中文句子写入存档；保存事件类型、参与成员和必要参数，展示时再本地化。

### 9.4 团队副本机制预留

```ts
interface EncounterMechanic {
  id: MechanicId;
  evaluate(context: MechanicContext): MechanicResult;
}
```

五人本的 `mechanicIds` 默认为空。团队副本阶段可以逐步加入：

- 打断与驱散覆盖率。
- 抗性要求。
- 坦克数量和换坦要求。
- 治疗压力阶段。
- 站位、控制和特殊职业能力。

机制输出只修改本次遭遇的成功率、耗时、减员风险或战报事件，不侵入通用活动调度器。

## 10. 内容系统

### 10.1 内容清单代替硬编码加载

新增副本不再修改 `loadContent()` 中的 `Promise.all`。使用构建期清单或 Vite 的文件导入能力生成注册表：

```ts
interface ContentManifest {
  version: string;
  dungeons: string[];
  encounters: string[];
  items: string[];
  lootTables: string[];
  professions: string[];
  recipes: string[];
  mounts: string[];
}
```

内容加载完成后生成只读索引：

- `dungeonById`
- `encounterById`
- `itemById`
- `lootTableById`
- `classById`
- `specById`
- `professionById`
- `recipeById`
- `mountById`

### 10.2 副本、遭遇和掉落分离

副本只描述路线、解锁、人数和时间预算；Boss 的战斗要求属于遭遇定义；掉落表只引用物品 ID。

这样同一个 Boss 可以被不同难度或活动引用，也不会在副本 JSON 中不断加入战报、机制和属性字段。

### 10.3 内容来源元数据

真实数据建议保留：

```ts
interface ContentSource {
  provider: "wowhead-classic" | "atlasloot-classic" | "warcraft-wiki" | "manual";
  externalId?: string;
  url?: string;
  verifiedAt: string;
  notes?: string;
}
```

本游戏调整过的字段另外标记 `balanceOverride`，避免以后无法判断一个时间或数值是原始资料还是策划修改。

### 10.4 构建期内容检查

增加 `npm run validate:content`，至少检查：

- JSON 符合 Schema。
- 全局 ID 唯一。
- 所有引用存在。
- 每个必打 Boss 有有效掉落表。
- 每个装备有图标、栏位、等级和来源。
- 属性单位合法。
- 掉落权重大于零。
- 专业配方材料和产物存在。
- 解锁关系不存在循环。
- 副本阶段时间总和符合基础时间。
- 中文展示名称不含测试占位符。

## 11. 专业与公会仓库

### 11.1 专业归属

```ts
interface MemberProfession {
  id: MemberProfessionId;
  professionDefinitionId: ProfessionDefinitionId;
  memberId: MemberId;
  skill: number;
  skillCap: number;
  knownRecipeIds: RecipeId[];
}
```

专业活动包括：

- 采集：占用成员和时间，完成后向公会仓库增加材料。
- 制造：开始时预留或扣除材料，完成后增加产物。
- 学习：消耗资金、配方或训练条件。

制造活动一旦开始，应立即锁定所需材料，避免多个活动同时消耗同一批库存。

### 11.2 公会仓库

```ts
interface GuildBank {
  stackCounts: Record<ItemDefinitionId, number>;
  equipmentInstanceIds: ItemInstanceId[];
}
```

可堆叠材料只保存数量；独立装备保存实例 ID。第一版不设容量，但接口不要假设容量永远无限，未来可在规则中加入公会银行升级。

专业制造出的装备进入公会仓库，再由玩家分配；不自动绑定给制造者。

## 12. 坐骑系统

成员独立保存：

- 骑术技能与等级。
- 已学会的坐骑 ID。
- 当前使用的坐骑 ID。

静态坐骑定义保存需求等级、骑术要求、价格、速度和来源。

坐骑效果不要直接散落在各玩法中。通过统一查询生成：

```ts
interface TravelModifier {
  memberId: MemberId;
  multiplier: number;
  sourceMountId?: MountId;
}
```

第一版可只用于展示和未来预留；真正启用时，建议只影响副本或采集活动中的旅行阶段，而不缩短 Boss 战斗阶段，避免坐骑直接提高战斗力。

## 13. 存档与未来服务端

### 13.1 存档接口从第一天保持异步

```ts
interface SaveRepository {
  load(slotId: SaveSlotId): Promise<GameStateV2 | null>;
  create(initialState: GameStateV2): Promise<void>;
  save(state: GameStateV2, expectedRevision: number): Promise<SaveResult>;
}
```

即使 IndexedDB 很快，也不要暴露同步接口。未来替换为 HTTP API 时，应用层和 UI 不需要整体重写。

### 13.2 云存档预留而不提前实现

存档包含：

- 全局唯一或可命名空间化的实体 ID。
- `revision`。
- `updatedAt`。
- `contentVersion`。
- 活动结算所需的种子、计划和快照。

首版不实现多设备自动合并。未来服务端发现版本冲突时，优先让玩家选择本地或云端版本，而不是尝试按字段合并正在运行的活动。

### 13.3 时间与防作弊边界

领域规则只能通过 `Clock` 获得当前时间。未来服务端可以提供权威时间；本地模式继续使用浏览器时间。

不要把防作弊逻辑混入战斗公式。单机首版只保证结算幂等和时间回拨不会重复领奖。

## 14. UI 重构原则

### 14.1 页面级拆分

建议路由：

- `/overview`
- `/members`
- `/members/:memberId`
- `/recruitment`
- `/dungeons`
- `/activities`
- `/loot`
- `/bank`
- `/professions`
- `/mounts`
- `/reports/:reportId`

### 14.2 组件职责

例如装备界面拆为：

- `CharacterSheet`
- `EquipmentSlot`
- `ItemIcon`
- `ItemTooltip`
- `StatSummary`
- `UpgradeComparison`

副本界面拆为：

- `DungeonSelector`
- `PartyBuilder`
- `MemberFilterBar`
- `PartyPreview`
- `BossRoute`
- `ActiveExpeditionCard`

组件接收已经准备好的 ViewModel，不自行查询全局游戏状态和运行战斗公式。

### 14.3 倒计时与结算

一个全局游戏时钟负责刷新展示时间。到期时只触发一次 `settleDueActivities`，不要让每张活动卡分别启动业务计时器。

页面重绘不能改变游戏结果；游戏结果只通过应用命令写入状态。

## 15. 测试结构

### 15.1 领域单元测试

- 真实属性汇总与派生属性。
- 各职业专精的能力转化。
- 装备限制、双手武器和替换比较。
- Boss 概率与耗时。
- 经验和升级。
- 活动占用、释放和幂等结算。
- 仓库材料预留和制造产出。
- 骑术与坐骑使用条件。

### 15.2 确定性战斗测试

固定内容版本、队伍和随机种子，断言：

- 胜负不随运行环境变化。
- 成员统计之和等于团队统计。
- 战报事件引用的成员和 Boss 都存在。
- 重复结算不会重复生成装备。
- 推荐等级标准队仍落在策划目标区间。

### 15.3 内容契约测试

所有内容文件在 CI 中执行 Schema 和引用检查。新增副本的主要工作应是新增内容文件与平衡测试，而不是修改加载器。

### 15.4 应用集成测试

使用内存版 `SaveRepository`、假时钟、固定随机数和固定 ID，测试完整用例：

- 招募 → 组队 → 开始副本 → 离线到期 → 结算 → 分配装备。
- 学习专业 → 开始采集 → 仓库增加材料 → 制造装备。
- 同一成员不能同时参加副本和专业活动。

### 15.5 端到端测试

保留少量高价值流程：

- 新游戏可以完成第一座副本。
- 刷新页面后活动倒计时和队伍选择正确。
- 完成副本后能打开战报并分配装备。
- 页面切换不会弹回或丢失选择。

## 16. 分阶段迁移计划

不要把“架构重构”和五个未来玩法同时开发。建议每一阶段都保持可运行、可测试。

### 阶段 0：建立重构基线

- 冻结当前玩法行为。
- 为四座现有副本保存平衡基准。
- 增加关键玩家流程的测试。
- 记录当前页面和存档行为。

完成标准：重构前后可以用同一组场景比较结果。

### 阶段 1：引入 TypeScript 与新测试工具

- 安装 Vite、TypeScript、Vitest 和 Zod。
- 配置严格模式和路径别名。
- 先迁移纯函数和类型，不改变 UI。
- 为 Clock、RandomSource 和 IdGenerator 建立接口。

完成标准：现有游戏仍可运行，核心规则在 TypeScript 中通过测试。

### 阶段 2：重建内容层

- 将职业、专精、性格、装备、日志模板从 `content.js` 拆出。
- 定义 Zod Schema。
- 引入内容清单和自动索引。
- 将现有四座副本及装备转换成新格式。
- 增加 `validate:content`。

完成标准：增加一座简单副本无需修改 TypeScript 加载代码。

### 阶段 3：建立 V2 状态和存档仓库

- 定义 `GameStateV2`。
- 区分物品定义与物品实例。
- 将数组状态规范化为 ID 索引。
- 引入异步 IndexedDB Repository。
- 旧 `localStorage` 存档直接提示版本不兼容并创建新游戏。

完成标准：刷新页面后 V2 状态完整恢复，活动结算确定且幂等。

### 阶段 4：拆分应用用例和统一活动系统

- 将招募、转专精、战利品和副本从 `GuildGame` 拆成命令。
- 用 `ActivityScheduler` 替换 `member.status + expeditionId`。
- 副本成为第一种 Activity Handler。
- 建立统一的到期结算服务。

完成标准：同一成员无法被两个活动占用，多个队伍可以独立并发和离线结算。

### 阶段 5：真实属性和轻量战报

- 导入首批真实装备属性。
- 建立职业专精能力公式。
- 改造成功率、耗时和自动分配算法。
- 生成结构化战报和趣味事件。
- 保留当前装等显示，但降级为参考值。

完成标准：属性升级可以解释战力变化，固定种子的战报完全可复现。

### 阶段 6：迁移 Vue 界面

- 引入 Vue Router 和 Pinia。
- 优先迁移成员、装备、副本、活动和战利品页面。
- 建立通用物品提示、筛选器、弹窗和倒计时组件。
- 删除旧字符串模板和集中事件分发器。

完成标准：现有功能全部由 Vue 页面承载，核心领域层不依赖 Vue。

### 阶段 7：在新架构上验证扩展能力

依次开发一个小型纵向切片：

1. 增加一座新副本，验证内容层。
2. 增加采矿与锻造的最小闭环，验证活动和仓库。
3. 增加骑术训练和一只坐骑，验证成员扩展。
4. 增加一个带机制接口的测试团队 Boss，但暂不作为正式内容开放。

只有这些切片无需修改核心调度器时，才能认为重构真正达成目标。

## 17. 每阶段提交策略

为了减少大规模重构风险，提交应按可审查边界拆分：

1. 工具链与空目录骨架。
2. 领域类型和纯函数迁移。
3. 内容 Schema 与现有数据转换。
4. V2 状态和存档 Repository。
5. 活动调度器与副本适配。
6. 真实属性战斗模型。
7. 结构化战报。
8. Vue 外壳、各页面逐步迁移。
9. 删除旧实现。

不要在同一个提交中同时修改内容格式、战斗公式和页面，否则出现平衡或存档问题时很难定位。

## 18. 架构验收标准

重构完成后应满足：

- 新增副本不修改核心加载器、存档服务或 UI 路由。
- 新增装备属性不修改通用装备实例结构。
- 新增一种专业活动只需增加内容定义、活动处理器和对应页面。
- 新增坐骑不修改成员基础存档之外的无关模块。
- 一个成员在任何系统中都只能执行一个活动。
- 战报能够显示成员统计，也能重新渲染不同文案。
- 核心战斗和结算不依赖 Vue、浏览器或 IndexedDB。
- 所有随机结果可由种子复现。
- 所有内容引用在构建阶段验证。
- 本地 Repository 可以被远程 Repository 替换，而不改领域规则。
- 四座现有副本和当前核心玩法在新架构下继续通过回归测试。

## 19. 推荐的第一步

第一轮只执行“阶段 0–2”：建立测试基线、引入 TypeScript/Vite/Vitest/Zod，并重建内容层。

不要立刻开发专业或坐骑，也不要立刻改战斗公式。先让现有四座副本通过新的类型和内容加载体系完整运行。这样可以最早验证目录边界和内容工作流，又不会同时承担 UI、数值和存档三类风险。

完成后再进入 V2 状态与统一活动系统；这两部分是专业、坐骑训练和未来云存档真正依赖的基础。
