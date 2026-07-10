# Demo Environment Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前 `/data/project/shemic/backend` 的真实文件状态冻结为可独立运行的 `/data/project/shemic/demo`，固定使用 HTTP `8081`、PostgreSQL `shemic_demo` 和 Redis DB 1。

**Architecture:** Demo 是当前工作树的文件级发布快照，不通过 Git HEAD 重建，也不与后续 Backend 开发同步。Demo 与开发环境共用 PostgreSQL、Redis 容器，但使用独立数据库和 Redis 逻辑库；使用快照内固定的 Dever CLI，以独立 daemon 名称运行 `dever run --skip-init`，避免启动时改写冻结的生成文件。

**Tech Stack:** Dever CLI、Go runtime、Docker、PostgreSQL 12、Redis、rsync、Bash

---

## 文件与状态边界

实施只产生以下状态，不修改 `package/bot`、Team、Flow 或 Runtime 业务源码：

- 创建临时目录：`/data/project/shemic/.demo-staging/`
- 创建最终快照：`/data/project/shemic/demo/`
- 创建快照规则：`/data/project/shemic/.demo-staging/snapshot.filter`
- 修改快照配置：`/data/project/shemic/.demo-staging/tree/config/setting.jsonc`
- 创建 Demo 说明：`/data/project/shemic/.demo-staging/tree/DEMO.md`
- 创建快照元数据：`/data/project/shemic/.demo-staging/tree/.snapshot/`
- 固定 CLI：`/data/project/shemic/.demo-staging/tree/bin/dever`
- 创建 PostgreSQL 数据库：`shemic_demo`
- 使用 Redis DB 1；不清理、不改写开发环境 Redis DB 0
- 停止 `ai-adminer` 容器以释放 `8081`；不停止 `ai-pgsql`、`server-redis`
- 创建 Demo daemon 状态：`/data/project/shemic/demo/tmp/dever/daemon/demo.*`

数据库表前缀必须继续保持 `shemic`，因为克隆库内的物理表仍为 `shemic_*`。只有 Redis prefix 改为 `shemic_demo`。

### Task 1: 只读预检并锁定实施条件

**Files:**

- Inspect: `/data/project/shemic/backend/config/setting.jsonc:31`
- Inspect: `/data/project/shemic/backend/config/setting.jsonc:96`
- Inspect: `/data/project/shemic/backend/package/front/service/stream/stream.go:443`
- Inspect: `/data/project/shemic/backend/package/front/model/cron.go:14`

- [ ] **Step 1: 确认源目录、目标目录和磁盘空间**

Run:

```bash
SOURCE=/data/project/shemic/backend
TARGET=/data/project/shemic/demo
STAGING=/data/project/shemic/.demo-staging

test -d "$SOURCE"
test ! -e "$TARGET"
test ! -e "$STAGING"
df -h /data/project/shemic
du -sh "$SOURCE"
```

Expected: `TARGET`、`STAGING` 均不存在；可用空间大于 3 GiB。当前盘点值约为源目录 940 MiB、可用空间 22 GiB。

- [ ] **Step 2: 确认 PostgreSQL、Redis、Adminer 容器状态**

Run:

```bash
test "$(docker inspect -f '{{.State.Running}}' ai-pgsql)" = true
test "$(docker inspect -f '{{.State.Running}}' server-redis)" = true
test "$(docker inspect -f '{{.State.Running}}' ai-adminer)" = true
docker port ai-adminer 8080/tcp
```

Expected: 三个容器均为运行状态；Adminer 映射为 `127.0.0.1:8081`。这里只确认冲突，不在本步骤停止容器。

- [ ] **Step 3: 确认 Backend 当前没有写入进程，插件端口可用**

Run:

```bash
test -z "$(ss -ltnH '( sport = :8085 )')"
test -z "$(ss -ltnH '( sport = :18081 )')"
/usr/local/bin/dever daemon status --project-root=/data/project/shemic/backend --name=default || true
```

Expected: `8085`、`18081` 均无监听，Backend daemon 显示未运行。若 `8085` 在实施前出现监听，立即暂停，不主动终止未知进程；先确认该进程是否允许短暂停止，再重新开始快照。

- [ ] **Step 4: 确认源数据库存在且目标数据库不存在**

Run:

```bash
database_names="$(
  docker exec ai-pgsql sh -lc \
    'psql -U "$POSTGRES_USER" -d postgres -Atqc "SELECT datname FROM pg_database ORDER BY datname"'
)"
printf '%s\n' "$database_names" | rg -qx 'shemic'
if printf '%s\n' "$database_names" | rg -qx 'shemic_demo'; then
  echo 'shemic_demo 已存在，拒绝覆盖' >&2
  exit 1
fi
```

Expected: `shemic` 存在，`shemic_demo` 不存在。不得自动覆盖已有同名数据库。

- [ ] **Step 5: 确认 Redis DB 1 为空且可用**

Run:

```bash
test "$(docker exec server-redis redis-cli CONFIG GET databases | tail -n 1)" -gt 1
test "$(docker exec server-redis redis-cli -n 1 DBSIZE)" = 0
```

Expected: Redis 支持 DB 1，且 DB 1 当前 key 数为 `0`。若不为空，暂停并查明所有权，不执行 `FLUSHDB`。

### Task 2: 创建可验证的文件系统快照

**Files:**

- Create: `/data/project/shemic/.demo-staging/snapshot.filter`
- Create: `/data/project/shemic/.demo-staging/tree/`
- Create: `/data/project/shemic/.demo-staging/tree/.snapshot/`
- Create: `/data/project/shemic/.demo-staging/tree/bin/dever`

- [ ] **Step 1: 创建权限受限的 staging 目录**

Run:

```bash
install -d -m 0700 /data/project/shemic/.demo-staging
install -d -m 0750 /data/project/shemic/.demo-staging/tree
```

Expected: staging 只允许当前用户访问；最终树目录权限为 `0750`。

- [ ] **Step 2: 使用 `apply_patch` 创建快照过滤规则**

Create `/data/project/shemic/.demo-staging/snapshot.filter` with exactly:

```text
- .git
- node_modules
- /.vite/
- /tmp/
- /data/log/
- /data/upload/.session/
- .pnpm-store
- .npm
- .turbo
- coverage/
- *.pid
- *.sock
- *.swp
- *.swo
- *~
- .DS_Store
- Thumbs.db

+ /.gitignore
+ /README.md
+ /go.mod
+ /go.sum
+ /main.go
+ /config/***
+ /data/***
+ /dever/***
+ /docs/***
+ /middleware/***
+ /module/***
+ /package/***
- /*
```

Expected: 规则只排除运行态、版本库元数据和依赖缓存；不得泛化排除源码中的 `dever/cache`、`dever/log`、`dever/tmp` 或业务 `log` 目录。

- [ ] **Step 3: 复制当前真实工作树**

Run:

```bash
SOURCE=/data/project/shemic/backend
TREE=/data/project/shemic/.demo-staging/tree
FILTER=/data/project/shemic/.demo-staging/snapshot.filter

rsync -aH \
  --numeric-ids \
  --protect-args \
  --filter="merge $FILTER" \
  -- "$SOURCE/" "$TREE/"
```

Expected: 未提交、未跟踪的实际文件均被复制；所有层级 `.git`、顶层 `tmp`、`.vite`、日志和 `node_modules` 未复制。当前预计约 355 MiB、1,540 个普通文件。

- [ ] **Step 4: 校验复制期间源目录没有发生变化**

Run:

```bash
verify_output="$(
  rsync -aHnc \
    --numeric-ids \
    --itemize-changes \
    --protect-args \
    --filter="merge /data/project/shemic/.demo-staging/snapshot.filter" \
    -- /data/project/shemic/backend/ /data/project/shemic/.demo-staging/tree/
)"
test -z "$verify_output"
test -z "$(find /data/project/shemic/.demo-staging/tree -name .git -print -quit)"
test -z "$(find /data/project/shemic/.demo-staging/tree -name node_modules -print -quit)"
```

Expected: checksum dry-run 无差异；快照中没有 `.git` 或 `node_modules`。若有差异，重新执行复制和校验，不继续克隆数据库。

- [ ] **Step 5: 固定 Dever CLI 并记录仓库 HEAD**

Run:

```bash
TREE=/data/project/shemic/.demo-staging/tree
SOURCE=/data/project/shemic/backend

install -D -m 0755 /usr/local/bin/dever "$TREE/bin/dever"
install -d -m 0750 "$TREE/.snapshot/heads"
install -m 0444 /data/project/shemic/.demo-staging/snapshot.filter "$TREE/.snapshot/filter.rules"
install -m 0444 "$SOURCE/.git/refs/heads/main" "$TREE/.snapshot/heads/backend.head"
install -m 0444 "$SOURCE/dever/.git/refs/heads/main" "$TREE/.snapshot/heads/dever.head"
install -m 0444 "$SOURCE/package/bot/.git/refs/heads/main" "$TREE/.snapshot/heads/package-bot.head"
install -m 0444 "$SOURCE/package/crm/.git/refs/heads/main" "$TREE/.snapshot/heads/package-crm.head"
install -m 0444 "$SOURCE/package/front/.git/refs/heads/main" "$TREE/.snapshot/heads/package-front.head"
install -m 0444 "$SOURCE/package/source/.git/refs/heads/main" "$TREE/.snapshot/heads/package-source.head"
install -m 0444 "$SOURCE/package/user/.git/refs/heads/main" "$TREE/.snapshot/heads/package-user.head"
touch "$TREE/.snapshot/captured-at"
install -d -m 0750 "$TREE/data/log"
```

Expected: Demo 使用自己的 `bin/dever`，以后全局 CLI 更新不会改变 Demo 管理行为；`captured-at` 的 mtime 是捕获时间。

### Task 3: 一致性克隆 PostgreSQL 并停用 Demo Cron

**State:**

- Read: PostgreSQL database `shemic`
- Create: PostgreSQL database `shemic_demo`
- Create: `/data/project/shemic/.demo-staging/shemic.dump`
- Modify: `shemic_demo.public.shemic_cron`

- [ ] **Step 1: 在创建数据库前再次确认 Backend 未运行**

Run:

```bash
test -z "$(ss -ltnH '( sport = :8085 )')"
```

Expected: `8085` 无监听。当前环境无需停服务；如果状态改变，暂停实施，避免数据库与上传文件快照时间不一致。

- [ ] **Step 2: 创建并检查 PostgreSQL custom-format dump**

Run:

```bash
umask 077
docker exec ai-pgsql sh -lc \
  'exec pg_dump -U "$POSTGRES_USER" -d shemic --format=custom' \
  > /data/project/shemic/.demo-staging/shemic.dump

test -s /data/project/shemic/.demo-staging/shemic.dump
docker exec -i ai-pgsql pg_restore --list \
  < /data/project/shemic/.demo-staging/shemic.dump \
  > /dev/null
```

Expected: dump 非空且 `pg_restore --list` 成功。该文件保留到用户手动验收 Demo 后再清理。

- [ ] **Step 3: 使用源数据库 owner 创建空目标数据库**

Run:

```bash
docker exec ai-pgsql sh -ceu '
owner=$(psql -U "$POSTGRES_USER" -d postgres -Atqc \
  "SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname = '\''shemic'\''")
test -n "$owner"
if psql -U "$POSTGRES_USER" -d postgres -Atqc \
  "SELECT datname FROM pg_database WHERE datname = '\''shemic_demo'\''" | grep -qx shemic_demo; then
  echo "shemic_demo 已存在，拒绝覆盖" >&2
  exit 1
fi
createdb -U "$POSTGRES_USER" -O "$owner" -T template0 shemic_demo
'
```

Expected: 创建空数据库 `shemic_demo`，owner 与 `shemic` 相同。

- [ ] **Step 4: 恢复 dump；失败时只回滚目标库**

Run:

```bash
if ! docker exec -i ai-pgsql sh -lc \
  'exec pg_restore -U "$POSTGRES_USER" -d shemic_demo --exit-on-error' \
  < /data/project/shemic/.demo-staging/shemic.dump; then
  docker exec ai-pgsql sh -lc \
    'dropdb -U "$POSTGRES_USER" --if-exists shemic_demo'
  exit 1
fi
```

Expected: 恢复完成；任何错误只删除新建的 `shemic_demo`，绝不覆盖或修改 `shemic`。

- [ ] **Step 5: 比较源库和 Demo 库的 public 表数量**

Run:

```bash
source_tables="$(
  docker exec ai-pgsql sh -lc \
    'psql -U "$POSTGRES_USER" -d shemic -Atqc "SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname = '\''public'\''"'
)"
demo_tables="$(
  docker exec ai-pgsql sh -lc \
    'psql -U "$POSTGRES_USER" -d shemic_demo -Atqc "SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname = '\''public'\''"'
)"
test "$source_tables" -gt 0
test "$source_tables" = "$demo_tables"
```

Expected: 两个数据库的 public 表数量相同。

- [ ] **Step 6: 仅在 Demo 数据库停用全部 Cron**

Run:

```bash
docker exec ai-pgsql sh -lc '
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d shemic_demo -c \
  "UPDATE shemic_cron
   SET status = 0, next_run_at = NULL, updated_at = NOW()
   WHERE status <> 0 OR next_run_at IS NOT NULL"
'

docker exec ai-pgsql sh -lc \
  'psql -U "$POSTGRES_USER" -d shemic_demo -Atqc "SELECT status, count(*) FROM shemic_cron GROUP BY status ORDER BY status"'
```

Expected: 输出只包含 `0|数量`。保留 Cron 记录，不删除；这样 Bot maintenance bootstrap 不会在下次启动时重新创建启用任务。

### Task 4: 修改冻结副本配置并写明操作契约

**Files:**

- Modify: `/data/project/shemic/.demo-staging/tree/config/setting.jsonc:33`
- Modify: `/data/project/shemic/.demo-staging/tree/config/setting.jsonc:97`
- Modify: `/data/project/shemic/.demo-staging/tree/config/setting.jsonc:104`
- Modify: `/data/project/shemic/.demo-staging/tree/config/setting.jsonc:118`
- Create: `/data/project/shemic/.demo-staging/tree/DEMO.md`

- [ ] **Step 1: 使用 `apply_patch` 修改且只修改隔离配置**

Apply this exact diff in `/data/project/shemic/.demo-staging/tree/config/setting.jsonc`:

```diff
-    "port": 8085,
+    "port": 8081,
@@
-    "create": true,
-    "delete": true,
+    "create": false,
+    "delete": false,
@@
-      "dbname": "shemic",
+      "dbname": "shemic_demo",
@@
-    "db": 0,
-    "prefix": "shemic",
+    "db": 1,
+    "prefix": "shemic_demo",
```

Expected: `database.default.prefix` 仍为 `shemic`；数据库已经预恢复，因此 `create=false` 不需要自动迁移，`delete=false` 禁止缺失 schema 导致删表。

- [ ] **Step 2: 使用 `apply_patch` 创建 Demo 操作说明**

Create `/data/project/shemic/.demo-staging/tree/DEMO.md` with exactly:

```markdown
# Shemic Demo

此目录是 `/data/project/shemic/backend` 在 2026-07-10 的文件系统快照，用于演示，不与后续 Backend 开发同步。

## 隔离边界

- HTTP：`0.0.0.0:8081`
- PostgreSQL：`shemic_demo`
- PostgreSQL 表前缀：`shemic`
- Redis：DB 1，配置 prefix `shemic_demo`
- Stream：Redis DB 1
- Daemon：`demo`
- Cron：数据库内全部停用

## 管理命令

```bash
/data/project/shemic/demo/bin/dever daemon status --project-root=/data/project/shemic/demo --name=demo
/data/project/shemic/demo/bin/dever daemon logs --project-root=/data/project/shemic/demo --name=demo -f
/data/project/shemic/demo/bin/dever daemon restart --project-root=/data/project/shemic/demo --name=demo
/data/project/shemic/demo/bin/dever daemon stop --project-root=/data/project/shemic/demo --name=demo
```

Adminer 与 Demo 共用宿主机 `8081`。Demo 运行期间 `ai-adminer` 必须保持停止；停止 Demo 后可执行 `docker start ai-adminer` 恢复 Adminer。

`.snapshot/heads/` 记录快照时各仓库 HEAD；快照包含当时未提交和未跟踪的真实文件，Git 元数据、旧日志、旧 pid、依赖缓存未复制。
```

Expected: 文档不包含数据库或 Redis 密码。

- [ ] **Step 3: 静态核对配置，不输出敏感字段**

Run:

```bash
rg -n '"port": 8081|"create": false|"delete": false|"dbname": "shemic_demo"|"db": 1|"prefix": "shemic_demo"' \
  /data/project/shemic/.demo-staging/tree/config/setting.jsonc
rg -n '"prefix": "shemic"' \
  /data/project/shemic/.demo-staging/tree/config/setting.jsonc
```

Expected: 六个 Demo 配置项各出现一次；数据库表前缀 `shemic` 仍出现一次。

### Task 5: 原子发布目录、释放 8081 并启动 Demo

**State:**

- Move: `/data/project/shemic/.demo-staging/tree` → `/data/project/shemic/demo`
- Stop: Docker container `ai-adminer`
- Start: Dever daemon `demo`

- [ ] **Step 1: 原子发布完整目录**

Run:

```bash
test ! -e /data/project/shemic/demo
mv -- /data/project/shemic/.demo-staging/tree /data/project/shemic/demo
test -x /data/project/shemic/demo/bin/dever
test -f /data/project/shemic/demo/config/setting.jsonc
```

Expected: `demo` 第一次出现时已经是完整快照，不存在半复制的最终目录。

- [ ] **Step 2: 停止 Adminer 并确认两个 Demo 端口可用**

Run:

```bash
docker stop ai-adminer
test -z "$(ss -ltnH '( sport = :8081 )')"
test -z "$(ss -ltnH '( sport = :18081 )')"
```

Expected: 只停止 `ai-adminer`；`ai-pgsql` 和 `server-redis` 仍运行；`8081`、`18081` 均空闲。

- [ ] **Step 3: 用冻结 CLI 和显式 Stream Redis URL 启动独立 daemon**

Run:

```bash
DEVER=/data/project/shemic/demo/bin/dever
TARGET=/data/project/shemic/demo
DEMO_REDIS_URL=redis://127.0.0.1:6379/1

"$DEVER" daemon start \
  --project-root="$TARGET" \
  --name=demo \
  -- env \
    REDIS_URL="$DEMO_REDIS_URL" \
    STREAM_REDIS_URL="$DEMO_REDIS_URL" \
    AGENT_REDIS_URL="$DEMO_REDIS_URL" \
    TEAM_REDIS_URL="$DEMO_REDIS_URL" \
    UPLOAD_REDIS_URL="$DEMO_REDIS_URL" \
    SKILL_INSTALL_REDIS_URL="$DEMO_REDIS_URL" \
    ENERGON_REDIS_URL="$DEMO_REDIS_URL" \
    "$DEVER" run --project-root="$TARGET" --skip-init
```

Expected: daemon 返回已启动。`--skip-init` 避免启动时重写快照内 `data/router.go`、`data/load/*`、`data/table/*`。首次运行可能启动插件开发服务并准备 Vite 运行依赖，但不得执行 `npm run build`、`dever build` 或测试命令。

- [ ] **Step 4: 等待 HTTP 监听；失败时恢复 Adminer**

Run:

```bash
for attempt in $(seq 1 45); do
  if ss -ltnH '( sport = :8081 )' | rg -q .; then
    break
  fi
  sleep 1
done

if ! ss -ltnH '( sport = :8081 )' | rg -q .; then
  /data/project/shemic/demo/bin/dever daemon stop \
    --project-root=/data/project/shemic/demo --name=demo || true
  docker start ai-adminer
  exit 1
fi
```

Expected: 45 秒内监听 `8081`。若失败，只停止 Demo daemon 并恢复 Adminer，不修改开发 Backend 或源数据库。

### Task 6: 运行态核验与人工验收交接

**Files/State:**

- Inspect: `/data/project/shemic/demo/tmp/dever/daemon/demo.*`
- Inspect: `/data/project/shemic/demo/data/log/error.log`
- Inspect: PostgreSQL `pg_stat_activity`
- Inspect: PostgreSQL `shemic_demo.public.shemic_cron`
- Inspect: Redis DB 0/1 sizes

- [ ] **Step 1: 确认 daemon、端口和 HTTP 可达性**

Run:

```bash
/data/project/shemic/demo/bin/dever daemon status \
  --project-root=/data/project/shemic/demo --name=demo
ss -ltnp '( sport = :8081 or sport = :18081 )'
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8081/admin/
```

Expected: daemon 为运行状态；`8081` 由 Demo 监听；HTTP 返回非 `000` 状态码。`18081` 是否监听取决于当前插件开发服务是否需要独立端口。

- [ ] **Step 2: 确认应用连接 Demo 数据库且 Cron 仍停用**

Run:

```bash
docker exec ai-pgsql sh -lc \
  'psql -U "$POSTGRES_USER" -d postgres -Atqc "SELECT datname, count(*) FROM pg_stat_activity WHERE datname IN ('\''shemic'\'', '\''shemic_demo'\'') GROUP BY datname ORDER BY datname"'

docker exec ai-pgsql sh -lc \
  'psql -U "$POSTGRES_USER" -d shemic_demo -Atqc "SELECT status, count(*) FROM shemic_cron GROUP BY status ORDER BY status"'
```

Expected: `pg_stat_activity` 中出现 `shemic_demo` 连接；Cron 只显示状态 `0`。Demo 启动不应连接 `shemic`。

- [ ] **Step 3: 检查 Redis 隔离和启动错误日志**

Run:

```bash
docker exec server-redis redis-cli -n 0 DBSIZE
docker exec server-redis redis-cli -n 1 DBSIZE
/data/project/shemic/demo/bin/dever daemon logs \
  --project-root=/data/project/shemic/demo --name=demo
```

Expected: daemon 命令固定了所有已知 Stream namespace 到 DB 1；DB 0 不被清理。启动日志中没有数据库连接失败、端口占用或 panic。未执行 Agent 任务前，DB 1 仍可能为 0，这是正常状态；Stream 行为由用户手动任务验证。

- [ ] **Step 4: 向用户交接人工验证清单**

用户手动验证：

1. 打开 Demo 管理页面并登录。
2. 发起一轮 Agent 对话。
3. 执行一个会调用工具的任务。
4. 检查 Agent/Team 的流式输出。
5. 检查演示所需上传文件和知识数据。
6. 停止、重启 Demo，确认会话和数据仍存在。

Expected: 自动化只做到进程、端口、HTTP、数据库目标、Cron 和日志核验；不运行 `npm run build`、Go 测试、前端测试或任何测试套件。

### Task 7: 用户验收后的临时文件清理

**Files:**

- Delete after explicit user confirmation: `/data/project/shemic/.demo-staging/shemic.dump`
- Delete after explicit user confirmation: `/data/project/shemic/.demo-staging/snapshot.filter`
- Delete after explicit user confirmation: `/data/project/shemic/.demo-staging/`

- [ ] **Step 1: 用户确认 Demo 演示功能正常后删除敏感 staging**

Run only after explicit confirmation:

```bash
rm -f -- /data/project/shemic/.demo-staging/shemic.dump
rm -f -- /data/project/shemic/.demo-staging/snapshot.filter
rmdir -- /data/project/shemic/.demo-staging
```

Expected: 最终只保留 `/data/project/shemic/demo` 和 `shemic_demo`；Redis DB 1 与 Demo daemon 保留。若用户尚未确认，保留 staging dump 作为恢复检查点，权限维持 `0700/0600`。

## 明确禁止的操作

- 不运行 `npm run build`、`dever build`、`go test`、前端测试或其他测试套件。
- 不修改 `/data/project/shemic/backend/package/bot` Runtime、Team 或 Flow 源码。
- 不复制任何 `.git`、旧 daemon pid、旧 `dever-run.pid` 或旧运行二进制。
- 不修改、删除、清空 PostgreSQL `shemic`。
- 不执行 Redis DB 0 的 `FLUSHDB` 或 key 清理。
- 不自动覆盖已有 `/data/project/shemic/demo` 或 `shemic_demo`。
- 不在 Demo 启动失败时删除开发 Backend 的文件或停止未知进程。
