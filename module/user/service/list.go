package service

import (
	"github.com/shemic/dever/server"
	"github.com/shemic/dever/util"
)

type UserListService struct{}

func (UserListService) ProviderBuildDemoTable(c *server.Context, params []any) any {
	payload := firstUserListPayload(params)
	rows := normalizeUserListRows(payload["rows"])
	if len(rows) == 0 {
		return rows
	}

	result := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		cloned := util.CloneMap(row)
		cloned["demo_table"] = []map[string]any{
			{
				"label": "测试账号",
				"value": util.ToStringTrimmed(row["username"]),
			},
			{
				"label": "测试角色",
				"value": buildDemoRoleValue(c, row),
			},
		}
		result = append(result, cloned)
	}

	return result
}

func firstUserListPayload(params []any) map[string]any {
	if len(params) == 0 {
		return map[string]any{}
	}
	mapped, _ := params[0].(map[string]any)
	if mapped == nil {
		return map[string]any{}
	}
	return mapped
}

func normalizeUserListRows(value any) []map[string]any {
	switch current := value.(type) {
	case []map[string]any:
		return current
	case []any:
		rows := make([]map[string]any, 0, len(current))
		for _, item := range current {
			mapped, ok := item.(map[string]any)
			if !ok || mapped == nil {
				continue
			}
			rows = append(rows, mapped)
		}
		return rows
	default:
		return nil
	}
}

func buildDemoRoleValue(c *server.Context, row map[string]any) string {
	role := resolveUserRoleLabel(c, util.ToString(row["role"]))
	if role == "" {
		return "未设置"
	}
	return role
}
