# Demo 环境隔离设计

日期：2026-07-10

## 背景

当前 `backend` 包含尚未提交的实际演示代码，后续将重构 `package/bot` 的 Agent Runtime。为了保证演示不受开发期代码、模型和运行数据变化影响，需要先冻结一套可长期运行的 Demo。

采用方案 A：Demo 与开发环境共用 PostgreSQL、Redis 服务进程，但使用独立数据库、Redis DB/命名空间和本地运行目录。

## 目标

- 将当前工作目录的真实状态快照到 `/data/project/shemic/demo`。
- Demo 固定监听 `8081`；开发 Backend 继续使用当前 `8085`。
- 将当前 PostgreSQL 数据一致性复制到独立数据库 `shemic_demo`。
- Demo 使用独立 Redis DB，并隔离 Agent、Team Stream。
- Demo 不执行自动建表、结构更新或缺失表删除。
- Demo 的日志、上传、导入导出和临时运行数据与开发环境分离。
- Demo 可独立启动、停止、查看状态和日志。

## 非目标

- 不修改 Agent Runtime、Team、Flow 或 Workspace 业务实现。
- 不为 Demo 与开发环境建立代码同步机制。
- 不共用同一批数据库表或 Redis Stream。
- 不运行 `npm run build`、Go 测试或其他测试命令。

## 运行拓扑

```text
/data/project/shemic/demo
  HTTP        0.0.0.0:8081
  PostgreSQL  shemic_demo
  Redis       DB 1 / demo namespace
  Data        demo/data
  Daemon      demo

/data/project/shemic/backend
  HTTP        0.0.0.0:8085
  PostgreSQL  shemic
  Redis       DB 0 / current namespace
  Data        backend/data
```

## 代码快照

Demo 必须来自当前工作目录，而不是只从 Git HEAD 或 worktree 创建，因为 `backend` 及嵌套 package 仓库存在未提交和未跟踪代码。

快照复制源代码、配置、当前前端静态产物和必要运行数据；排除 `.git`、开发缓存、daemon pid、旧日志等不应冻结的内容。复制后生成快照说明，记录时间、源路径和可获取到的各仓库 HEAD，便于以后确认 Demo 来源。

Demo 目录视为不可变发布副本。后续 Runtime 开发只发生在 `backend`；Demo 只接受明确授权的演示阻塞修复。

## PostgreSQL 隔离

从当前 `shemic` 创建一致性快照并恢复为 `shemic_demo`。Demo 配置使用：

- `database.default.dbname = shemic_demo`
- `database.create = false`
- `database.delete = false`

开发环境继续使用 `shemic`，允许后续清理旧 Runtime 数据和调整模型，不影响 Demo。

Demo 启动前必须确认其连接目标确实为 `shemic_demo`。数据库复制成功前不启动 Demo，避免出现代码已冻结但数据仍指向开发库的半隔离状态。

## Redis 与 Stream 隔离

Demo 使用同一 Redis 服务的独立 DB，默认选择 DB 1；开发环境继续使用 DB 0。

除项目 Redis 配置外，启动 Demo 时设置 Stream Redis DB 环境变量，确保 `frontstream.New("agent")`、`frontstream.New("team")` 等流客户端进入 Demo Redis DB。Redis key 前缀同时改为 Demo 专用前缀，便于排查和清理。

Demo 与开发环境不得共享 Agent/Team Stream，否则相同 request ID、轮询和过期清理可能互相影响。

## 本地数据与后台任务

- Demo 使用复制后的独立 `data` 目录。
- 上传文件和当前演示依赖的本地素材随快照复制。
- 日志写入 `demo/data/log`。
- 导入、导出 Worker 即使随服务启动，也只处理 Demo 数据库中的任务。
- Demo 数据库中的自动 Cron 默认禁用，避免历史清理和外部采集在演示环境自行修改数据；确需演示的任务以后单独启用。
- Demo 不与开发环境共享 daemon pid、临时目录或热重载状态。

## 启动与进程管理

Demo 使用 Dever daemon 的独立名称 `demo` 运行，工作目录固定为 `/data/project/shemic/demo`。启动命令不执行前端构建或测试。

进程管理应支持：

- 启动 Demo
- 查看 Demo 状态
- 查看 Demo 日志
- 单独停止 Demo，不影响开发 Backend

## 实施顺序

1. 记录当前 Backend 和嵌套仓库状态。
2. 确认 `8081`、Demo 数据库名和 Redis DB 未被占用。
3. 停止或短暂冻结当前写入，复制 PostgreSQL 一致性快照。
4. 复制当前 Backend 工作目录到 `demo`。
5. 修改 Demo 的 HTTP、数据库、Redis和日志配置。
6. 关闭 Demo 自动迁移、缺失表删除和自动 Cron。
7. 启动独立 Demo daemon。
8. 只做非测试性质的运行检查：进程、监听端口、HTTP 可达性、错误日志和数据库目标。
9. 由用户手动验证登录、Agent 对话、工具和演示页面。
10. 用户确认 Demo 后，再开始开发 Backend 的 Agent Runtime 重构。

## 失败与回滚

- 任何数据库复制或配置步骤失败时，不启动 Demo。
- Demo 启动失败只停止 `demo` daemon，不修改开发 Backend 进程。
- Demo 数据库可删除后重新从当前快照恢复，不反向覆盖开发数据库。
- 发现 Demo 仍连接开发数据库或 Redis DB 0 时，立即停止 Demo，修正配置后重新启动。

## 验收标准

- Demo 目录完整存在且不依赖开发目录中的相对文件。
- Demo 监听 `8081`，开发 Backend 仍配置为 `8085`。
- Demo 连接 `shemic_demo`，且自动迁移与缺失表删除关闭。
- Demo Stream 使用独立 Redis DB/前缀。
- Demo 与开发环境拥有独立日志、上传和 daemon 状态。
- 停止或重启任一环境不影响另一环境。
- 未运行 npm build 或任何测试；功能由用户手动验证。
