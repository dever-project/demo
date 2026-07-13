# Body 画布可靠性与结构优化实施计划

> 设计依据：`docs/superpowers/specs/2026-07-13-body-canvas-optimization-design.md`

## 1. 统一团队发布版本权限

- 在 team service 增加画布角色/智能体配对校验，复用发布快照 `runtimeGraphByRelease`。
- `RunCanvasAgent` 先同步项目发布版本，再校验 `role_id + agent_id`。
- 画布执行请求显式传递 `role_id`，保存结果时记录当前 `release_id`。
- 删除 project service 中能力、智能体、团队的 body 白名单检查和菜单排序过滤。
- 删除 body service 中三类 `Allowed*` 查询与已无用途的辅助函数。

## 2. 退役旧 model、schema 和数据库表

- 删除 `model/body/canvas_power.go`、`canvas_agent.go`、`canvas_team.go`。
- 删除对应 `data/table/shemic_bot_body_canvas_*.json`。
- 静态搜索确认无 Go/前端调用后，显式 drop 三张旧表。
- 查询 information_schema 确认表不存在。

## 3. 修复自动保存

- 提取 `space-autosave.ts`，以每画布 revision 和 dirty key 驱动保存。
- 保存失败保留 dirty 并使用有上限退避重试；成功只确认对应 revision。
- 主页面接入保存状态，移除失败快照写入 loaded snapshot 的错误逻辑。
- 保留 `base_revision` 冲突语义和现有 520ms 静默窗口。

## 4. 优化 ReactFlow 交互热路径

- 提取 `space-workbench.tsx`，本地维护 ReactFlow nodes 与 viewport。
- 节点拖动期间只改本地状态，在 `onNodeDragStop` 提交最终位置。
- 平移缩放期间只更新本地 zoom，在 `onMoveEnd` 提交最终 viewport。
- 离散的新增、删除、连接和设置修改继续立即提交。
- 从指针移动热路径移除全画布 normalize/stringify。

## 5. 修复节点渲染缓存

- 删除永不命中的引用相等缓存。
- 将节点回调集中为稳定 controller，并按节点 id 提供运行态。
- 使用节点引用、选中态和运行态构造数据，避免无关节点重渲染。
- 检查运行中节点、选择节点和节点结果更新仍能定向刷新。

## 6. 收敛能力目录和表单缓存

- 提取 `space-catalog-cache.ts`。
- 能力目录采用项目/release key、TTL 和 in-flight promise 去重。
- 右键打开菜单不再无条件请求；进入能力视图按需刷新。
- 能力表单缓存加入 release 维度、容量限制和项目切换失效。

## 7. 拆分菜单和样式

- 提取 `space-add-node-menu.tsx`，保留现有菜单行为和图标。
- 将 `space-styles.tsx` 内容迁入 `space.css`，页面只做静态 CSS import。
- 删除所有 `<WorkSpaceStyles />` 渲染点和旧样式组件。
- 按工作区、节点、菜单/对话框、响应式区块整理 CSS 顺序，不改视觉值。

## 8. 清理与静态验证

- 对修改的 Go 文件执行 `gofmt`，对修改的前端文件执行定向格式化（若项目已有无需构建的格式化命令）。
- 用 `rg` 确认旧 model、旧表名、`Allowed*`、无效缓存与每帧持久提交均已消失。
- 检查 git diff，排除用户当前其他未提交改动。
- 查看开发进程日志，不执行 build/test。
- 输出用户手工验证清单。
