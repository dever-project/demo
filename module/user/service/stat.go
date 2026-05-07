package service

import (
	"context"

	"github.com/shemic/dever/server"
	"github.com/shemic/dever/util"

	usermodel "my/module/user/model"
	workmodel "my/module/work/model"
	frontmeta "my/package/front/service/meta"
)

type StatService struct{}

type statCounter interface {
	Count(ctx context.Context, filters any, options ...map[string]any) int64
}

type statOption struct {
	ID    any
	Name  string
	Color string
}

func (StatService) ProviderLoadUserStat(c *server.Context, _ []any) any {
	ctx := context.Background()
	if c != nil {
		ctx = c.Context()
	}

	userModel := usermodel.NewUserModel()
	workModel := workmodel.NewWorkModel()
	workTypeModel := workmodel.NewWorkTypeModel()
	options := frontmeta.ResolveModelOptions(ctx, "user.NewUserModel")

	return map[string]any{
		"userTotal":       userModel.Count(ctx, nil),
		"activeUserTotal": userModel.Count(ctx, map[string]any{"status": "Active"}),
		"contentTotal":    usermodel.NewContentModel().Count(ctx, nil),
		"sourceTotal":     usermodel.NewSourceModel().Count(ctx, nil),
		"workTotal":       workModel.Count(ctx, nil),
		"workTypeTotal":   workTypeModel.Count(ctx, nil),
		"statusRows":      buildOptionStatRows(ctx, userModel, "status", options["status"], fallbackUserStatusOptions()),
		"roleRows":        buildOptionStatRows(ctx, userModel, "role", options["role"], fallbackUserRoleOptions()),
		"workTypeRows":    buildWorkTypeStatRows(ctx, workModel, workTypeModel),
	}
}

func buildOptionStatRows(ctx context.Context, counter statCounter, field string, rawOptions any, fallback []statOption) []map[string]any {
	options := normalizeStatOptions(rawOptions)
	if len(options) == 0 {
		options = fallback
	}

	rows := make([]map[string]any, 0, len(options))
	for _, option := range options {
		if util.ToStringTrimmed(option.Name) == "" {
			continue
		}
		row := map[string]any{
			"id":    option.ID,
			"name":  option.Name,
			"value": counter.Count(ctx, map[string]any{field: option.ID}),
		}
		if option.Color != "" {
			row["color"] = option.Color
		}
		rows = append(rows, row)
	}
	return rows
}

func buildWorkTypeStatRows(ctx context.Context, workModel statCounter, workTypeModel interface {
	SelectMap(ctx context.Context, filters any, options ...map[string]any) []map[string]any
}) []map[string]any {
	typeRows := workTypeModel.SelectMap(ctx, nil, map[string]any{
		"field": "main.id, main.name",
		"order": "main.id asc",
	})

	rows := make([]map[string]any, 0, len(typeRows))
	for _, typeRow := range typeRows {
		name := util.ToStringTrimmed(typeRow["name"])
		if name == "" {
			continue
		}
		rows = append(rows, map[string]any{
			"id":    typeRow["id"],
			"name":  name,
			"value": workModel.Count(ctx, map[string]any{"type_id": typeRow["id"]}),
		})
	}
	return rows
}

func normalizeStatOptions(rawOptions any) []statOption {
	switch current := rawOptions.(type) {
	case []map[string]any:
		return normalizeStatOptionMaps(current)
	case []any:
		rows := make([]map[string]any, 0, len(current))
		for _, item := range current {
			row, ok := item.(map[string]any)
			if ok {
				rows = append(rows, row)
			}
		}
		return normalizeStatOptionMaps(rows)
	default:
		return nil
	}
}

func normalizeStatOptionMaps(rows []map[string]any) []statOption {
	options := make([]statOption, 0, len(rows))
	for _, row := range rows {
		id, ok := row["id"]
		if !ok {
			id = firstStatText(row, "value", "label", "name")
		}
		name := firstStatText(row, "label", "value", "name", "title", "id")
		if name == "" {
			continue
		}
		options = append(options, statOption{
			ID:    id,
			Name:  name,
			Color: util.ToStringTrimmed(row["color"]),
		})
	}
	return options
}

func firstStatText(row map[string]any, keys ...string) string {
	for _, key := range keys {
		value := util.ToStringTrimmed(row[key])
		if value != "" {
			return value
		}
	}
	return ""
}

func fallbackUserStatusOptions() []statOption {
	return []statOption{
		{ID: "Active", Name: "启用", Color: "#0f766e"},
		{ID: "Inactive", Name: "停用", Color: "#737373"},
		{ID: "Invited", Name: "待邀请", Color: "#0369a1"},
		{ID: "Suspended", Name: "已停用", Color: "#dc2626"},
	}
}

func fallbackUserRoleOptions() []statOption {
	return []statOption{
		{ID: "Super Admin", Name: "超级管理员"},
		{ID: "Admin", Name: "管理员"},
		{ID: "Manager", Name: "经理"},
		{ID: "Cashier", Name: "收银员"},
	}
}
