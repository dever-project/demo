# Shemic Backend 上手手册

这份文档只讲一件事：

> **怎么基于当前 `backend` demo 继续做业务。**

如果你要看 **Dever 框架本身**，请看：

- `backend/dever/README.md`

---

## 1. 先理解这个项目

这个 backend 不是传统后台那种：

- 每个页面自己写接口
- 每个页面自己写模板
- 每个模块自己重复造一套 CRUD

它的分工是：

- **model**
  - 定义字段、索引、关系、字段文案
- **service**
  - 写特殊业务逻辑
- **page JSON**
  - 定义列表页、编辑页、导入导出按钮
- **front 模块**
  - 提供通用后台运行时能力
  - 例如：页面、路由、上传、资源库、导入、导出

所以以后加业务，优先思路应该是：

1. 先写模型
2. 再写页面 JSON
3. 只有特殊逻辑才补 service / api

---

## 2. 最常用的命令

### 启动

在 `backend` 目录执行：

```bash
go run .
```

入口：

- `backend/main.go`

路由注册：

- `backend/data/router.go`

### 改完代码后重新生成

只要你改了这些目录：

- `module/*/api`
- `module/*/model`
- `module/*/service`
- `middleware`

就要执行：

```bash
go run github.com/shemic/dever/cmd/dever@main init --skip-tidy
```

它会更新：

- `data/router.go`
- `data/load/model.go`
- `data/load/service.go`

这三个文件**不要手改**。

---

## 3. 目录怎么看

### 配置

- `config/setting.jsonc`
  - 服务、日志、数据库、Redis、鉴权
  - `frontSite`：后端托管前端静态文件，默认访问路径 `/_admin`，目录 `package/front/html`
- `config/front.json`
  - 后台菜单分组

### 业务模块

- `module/front`
  - 通用后台运行时
- `module/user`
  - 用户 demo
- `module/work`
  - 职业 demo
- `module/region`
  - 地区数据

### 每个业务模块内部约定

- `module/<name>/model`
  - 模型、索引、关系
- `module/<name>/service`
  - 特殊业务逻辑
- `module/<name>/api`
  - 只有确实需要额外 HTTP 接口才写
- `module/<name>/page`
  - `list.json`
  - `update.json`

### 运行数据

- `data/table`
  - 表结构
- `data/upload`
  - 上传文件
- `data/export`
  - 导出文件
- `data/log`
  - 日志

---

## 4. 写业务时最重要的边界

### 放在 Go 里的

- 字段
- 索引
- 关系
- 选项
- 特殊 service
- 特殊 API

### 放在页面 JSON 里的

- 页面结构
- 表格列
- 表单结构
- 顶部按钮
- 导入预设
- 导出预设

### 现在明确约定

- **不要再在 model 里写导入配置**
- 导入预设统一放到：
  - `page/*.json` 的 `type=import`
- 导出预设统一放到：
  - `page/*.json` 的 `type=export`

---

## 5. 字段文案怎么写

字段标准文案统一写在 model 的 `comment` 里。

例如：

```go
type Order struct {
	ID   uint64 `dorm:"primaryKey;autoIncrement;comment:订单ID"`
	Name string `dorm:"type:varchar(64);not null;comment:订单名称"`
}
```

这个 `comment` 现在会同时服务于：

- 数据库注释
- 页面默认字段名
- 导入默认 label
- 导出默认标题

运行时可以直接读：

```go
NewOrderModel().Labels()
NewOrderModel().Label("name")
```

所以：

- 标准字段文案写在 model
- 页面里只有在“上下文文案不一样”时才手写 `name`

---

## 6. 导入和导出怎么理解

### 导入

导入现在是三层：

1. **模型自动推导**
   - 字段
   - label
   - kind
   - 唯一索引匹配字段
2. **页面 JSON 预设**
   - aliases
   - tip
   - kind/service 覆盖
   - missingPolicy
3. **前端弹窗本次设置**
   - matchFields
   - matchMode
   - 字段级缺失策略

当前支持的导入字段类型：

- `scalar`
- `option`
- `relation`
- `children`
- `cascade`
- `service`
- `upload`

### 导出

导出同样放页面 JSON 里：

- 普通导出：直接 `type=export`
- 特殊导出：加 `use`

结果文件统一走现有文件体系。

---

## 7. 做一个新模块的最小流程

假设现在要新增一个 `order` 模块。

最小流程就是：

1. 建 model
2. 建 page JSON
3. 有特殊逻辑再补 service
4. 执行 `dever init --skip-tidy`

如果只是普通列表 + 编辑，很多时候**不需要额外 API**。

---

# 8. 最小示例：新增一个 `order` 模块

下面给一个最小骨架，目的是说明这个项目应该怎么写，不是让你逐字照抄。

---

## 8.1 model：`module/order/model/order.go`

```go
package model

import (
	"time"

	"github.com/shemic/dever/orm"

	frontmeta "my/module/front/service/meta"
)

type Order struct {
	ID          uint64    `dorm:"primaryKey;autoIncrement;comment:订单ID"`
	Name        string    `dorm:"type:varchar(64);not null;comment:订单名称"`
	No          string    `dorm:"type:varchar(64);not null;comment:订单编号"`
	Status      string    `dorm:"type:varchar(32);not null;default:Pending;comment:状态"`
	Amount      float64   `dorm:"type:decimal(10,2);not null;default:0;comment:订单金额"`
	Customer    string    `dorm:"type:varchar(128);not null;default:'';comment:客户名称"`
	Remark      string    `dorm:"type:text;not null;default:'';comment:备注"`
	CreatedAt   time.Time `dorm:"comment:创建时间"`
}

type OrderIndex struct {
	No struct{} `unique:"no"`
}

var orderStatusOptions = []map[string]any{
	{"id": "Pending", "value": "待处理"},
	{"id": "Paid", "value": "已支付"},
	{"id": "Closed", "value": "已关闭"},
}

func init() {
	frontmeta.RegisterModelMeta("order.NewOrderModel", frontmeta.ModelMeta{
		Options: map[string]any{
			"status": orderStatusOptions,
		},
	})
}

func NewOrderModel() *orm.Model[Order] {
	return orm.LoadModel[Order]("order", Order{}, OrderIndex{}, "id desc", "default")
}
```

### 这个文件表达的事情

- `comment` 提供字段文案
- `unique:"no"` 提供导入默认匹配候选
- `status` 通过 `Options` 变成 option 字段

也就是说：

- 页面默认字段名可以从 model 来
- 导入默认也能识别：
  - `no`
  - `订单编号`
- 状态导入/导出默认也知道这是 option

---

## 8.2 列表页：`module/order/page/list.json`

```json
{
  "page": {
    "name": "订单列表",
    "icon": "receipt-text",
    "parent": "tongyong",
    "sort": 30
  },
  "layout": {
    "type": "container",
    "children": {
      "page-header": {
        "type": "header",
        "className": "gap-4",
        "children": {
          "header-actions": {
            "type": "row",
            "className": "ms-auto shrink-0 flex-nowrap items-center gap-2"
          }
        }
      },
      "page-main": {
        "type": "main",
        "className": "flex flex-1 flex-col gap-5 sm:gap-6",
        "children": {
          "toolbar-row": {
            "type": "row",
            "className": "flex-wrap items-center gap-2.5"
          },
          "table-row": {
            "type": "container",
            "className": "overflow-hidden rounded-md border bg-background"
          }
        }
      }
    }
  },
  "nodes": {
    "page-header": [
      {
        "type": "show-rich",
        "value": "page.titleHtml",
        "className": "min-w-0 flex-1"
      }
    ],
    "header-actions": [
      {
        "type": "show-button-group",
        "name": "导入",
        "meta": {
          "variant": "outline",
          "size": "sm",
          "icon": "upload"
        },
        "items": [
          {
            "key": "import-order-list",
            "name": "导入订单",
            "action": {
              "click": {
                "type": "import",
                "uploadRuleId": 4,
                "matchFields": ["no"],
                "matchMode": "any",
                "fields": [
                  {
                    "field": "no",
                    "aliases": ["订单号"]
                  },
                  {
                    "field": "customer",
                    "aliases": ["客户", "客户名称"]
                  }
                ]
              }
            }
          }
        ]
      },
      {
        "type": "show-button-group",
        "name": "导出",
        "meta": {
          "variant": "outline",
          "size": "sm",
          "icon": "download"
        },
        "items": [
          {
            "key": "export-order-list",
            "name": "导出订单",
            "action": {
              "click": {
                "type": "export"
              }
            }
          }
        ]
      },
      {
        "type": "show-button",
        "name": "新增订单",
        "meta": {
          "variant": "default",
          "size": "sm"
        },
        "action": {
          "click": {
            "type": "modal",
            "key": "dialog.create",
            "value": true
          }
        }
      }
    ],
    "toolbar-row": [
      {
        "type": "form-input",
        "placeholder": "筛选订单...",
        "value": "search.keyword",
        "mode": "search",
        "meta": {
          "remote": true
        }
      },
      {
        "type": "form-select",
        "placeholder": "状态",
        "value": "search.status",
        "mode": "search",
        "option": "option.status",
        "meta": {
          "remote": true
        }
      }
    ],
    "table-row": [
      {
        "type": "show-table",
        "value": "table.list",
        "meta": {
          "remote": true,
          "rowKey": "id",
          "columns": [
            { "value": "id", "type": "show-base" },
            { "value": "no", "type": "show-base" },
            { "value": "name", "type": "show-base" },
            { "value": "status", "type": "show-tag" },
            { "value": "amount", "type": "show-base" }
          ]
        }
      }
    ]
  }
}
```

### 这个列表页体现的规则

- 表头按钮统一放 `header-actions`
- 导入/导出都配在页面 JSON
- `label` 能自动推导时就不写
- `aliases` 只在 demo 或实际需要时才写

---

## 8.3 编辑页：`module/order/page/update.json`

```json
{
  "page": {
    "name": "订单编辑",
    "parent": "order/list",
    "sort": 10
  },
  "layout": {
    "type": "container",
    "children": {
      "page-main": {
        "type": "main",
        "className": "p-0",
        "children": {
          "dialog-shell": {
            "type": "container",
            "className": "w-full"
          }
        }
      }
    }
  },
  "nodes": {
    "dialog-shell": [
      {
        "type": "form-input",
        "value": "form.no",
        "mode": "form",
        "placeholder": "例如：ORD-20260401-001"
      },
      {
        "type": "form-input",
        "value": "form.name",
        "mode": "form",
        "placeholder": "请输入订单名称"
      },
      {
        "type": "form-select",
        "value": "form.status",
        "mode": "form",
        "option": "option.status"
      },
      {
        "type": "form-number",
        "value": "form.amount",
        "mode": "form",
        "placeholder": "请输入订单金额"
      },
      {
        "type": "form-input",
        "value": "form.customer",
        "mode": "form",
        "placeholder": "请输入客户名称"
      },
      {
        "type": "form-textarea",
        "value": "form.remark",
        "mode": "form",
        "placeholder": "补充订单备注"
      }
    ]
  }
}
```

### 这里你应该注意

- `name` 没写的字段会优先读 model `comment`
- 所以普通字段不要在 JSON 里重复写一遍中文
- 只有像按钮文案、页面标题、说明文案这种，才在 JSON 里写

---

## 8.4 如果这个模块没有特殊逻辑

那到这里其实就够了：

- model
- list.json
- update.json

很多普通业务一开始不需要：

- 自定义导入 service
- 自定义导出 service
- 额外 API

先用通用能力跑起来，后面有特殊需求再补。

---

## 8.5 如果 `order` 以后需要特殊逻辑

只在确实需要时再加：

### 加 service

例如：

- 订单导入需要把“客户等级文本”解析成等级 ID
- 订单导出需要做多 sheet 报表

那再写：

- `module/order/service/*.go`

### 加 api

只有你真的要暴露额外接口时，才写：

- `module/order/api/*.go`

然后执行：

```bash
go run github.com/shemic/dever/cmd/dever@main init --skip-tidy
```

---

## 9. 什么时候该复用 `front` 模块

下面这些能力，优先复用，不要重写：

- 页面运行时
  - `module/front/api/main.go`
  - `module/front/api/route.go`
- 上传 / 资源库
  - `module/front/api/upload.go`
  - `module/front/api/resource.go`
- 导入
  - `module/front/api/import.go`
  - `module/front/service/importer/*`
- 导出
  - `module/front/api/export.go`
  - `module/front/service/export/*`

一句话：

> **业务模块提供事实，front 模块提供通用能力。**

---

## 10. 最后记住这几个规则

### 规则 1

字段标准文案写在 model `comment`。

### 规则 2

导入 / 导出预设写在页面 JSON，不写回 model。

### 规则 3

普通业务先写：

- model
- list.json
- update.json

### 规则 4

特殊逻辑再补：

- service
- api

### 规则 5

改完 `module` 代码后，执行：

```bash
go run github.com/shemic/dever/cmd/dever@main init --skip-tidy
```

---

## 11. 相关入口

- 项目入口：
  - `backend/main.go`
- 项目配置：
  - `backend/config/setting.jsonc`
  - `backend/config/front.json`
- 自动生成：
  - `backend/data/router.go`
  - `backend/data/load/model.go`
  - `backend/data/load/service.go`
- 页面示例：
  - `backend/module/user/page/list.json`
  - `backend/module/user/page/update.json`
  - `backend/module/work/page/list.json`
  - `backend/module/work/page/update.json`
- Dever 框架说明：
  - `backend/dever/README.md`

---

如果你接下来真的要新做一个模块，建议就照着上面的 `order` 例子开始，不要一上来先写 API。  
先把 model 和 page JSON 立住，能省掉很多重复代码。
