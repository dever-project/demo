package service

import (
	"fmt"
	"strings"
	"time"

	"github.com/shemic/dever/server"
	"github.com/shemic/dever/util"

	usermodel "my/module/user/model"
	frontmeta "my/package/front/service/meta"
	frontpage "my/package/front/service/page"
)

type ExportService struct{}

func (ExportService) ProviderPrepareUserWorkbook(c *server.Context, params []any) any {
	payload := firstExportPayload(params)
	query := exportQueryMap(payload["query"])
	countQuery := exportQueryMap(payload["query"])
	tableConfig := defaultUserExportTableConfig()
	countQuery["page"] = "1"
	countQuery["pageSize"] = "1"
	_, total, _, _, err := frontpage.QueryModelListWithQuery(c.Context(), usermodel.NewUserModel(), tableConfig, countQuery)
	if err != nil {
		panic(err)
	}

	return map[string]any{
		"fileName": "用户职业导出",
		"sheets": []map[string]any{
			{
				"name": "导出说明",
				"cells": []map[string]any{
					{"cell": "A1", "value": "用户职业导出", "style": "title"},
					{"cell": "A2", "value": "导出时间", "style": "summary"},
					{"cell": "B2", "value": time.Now().Format("2006-01-02 15:04:05")},
					{"cell": "A3", "value": "筛选条件", "style": "summary"},
					{"cell": "B3", "value": buildUserExportFilterSummary(query)},
					{"cell": "A4", "value": "用户总数", "style": "summary"},
					{"cell": "B4", "value": total, "style": "summary"},
				},
				"merges": []map[string]any{
					{"start": "A1", "end": "D1"},
				},
			},
			{
				"name":       "用户职业明细",
				"startCell":  "A1",
				"stream":     true,
				"freeze":     "A2",
				"autoFilter": true,
				"styles": map[string]any{
					"header": "header",
					"body":   "body",
				},
				"head": buildUserWorkExportHead(),
				"source": map[string]any{
					"mode":     "service",
					"service":  "user.ExportService.UserWorkRows",
					"pageSize": 1000,
					"query":    query,
					"payload": map[string]any{
						"table": defaultUserExportTableConfig(),
					},
				},
			},
		},
	}
}

func (ExportService) ProviderUserWorkRows(c *server.Context, params []any) any {
	payload := firstExportPayload(params)
	page := util.ToIntDefault(payload["page"], 0)
	if page <= 0 {
		page = 1
	}
	pageSize := util.ToIntDefault(payload["page_size"], 0)
	if pageSize <= 0 {
		pageSize = 1000
	}

	query := exportQueryMap(payload["query"])
	query["page"] = fmt.Sprintf("%d", page)
	query["pageSize"] = fmt.Sprintf("%d", pageSize)

	nestedPayload, _ := payload["payload"].(map[string]any)
	tableConfig, _ := nestedPayload["table"].(map[string]any)
	if len(tableConfig) == 0 {
		tableConfig = defaultUserExportTableConfig()
	}

	rows, total, _, _, err := frontpage.QueryModelListWithQuery(c.Context(), usermodel.NewUserModel(), tableConfig, query)
	if err != nil {
		panic(err)
	}
	rows = frontmeta.AttachRelations(c.Context(), "user.NewUserModel", rows)
	rows = frontmeta.HideFields("user.NewUserModel", rows)

	body := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		body = append(body, map[string]any{
			"id":           row["id"],
			"username":     row["username"],
			"name":         strings.TrimSpace(util.ToString(row["last_name"]) + util.ToString(row["first_name"])),
			"email":        row["email"],
			"phone_number": row["phone_number"],
			"role":         row["role"],
			"status":       row["status"],
			"works":        joinNamedMaps(row["works"], "name"),
			"regions":      joinNamedMaps(row["regions"], "name"),
		})
	}

	return map[string]any{
		"head":  buildUserWorkExportHead(),
		"body":  body,
		"total": total,
	}
}

func firstExportPayload(params []any) map[string]any {
	if len(params) == 0 {
		return map[string]any{}
	}
	payload, _ := params[0].(map[string]any)
	if payload == nil {
		return map[string]any{}
	}
	return payload
}

func exportQueryMap(raw any) map[string]string {
	result := map[string]string{}
	if raw == nil {
		return result
	}
	switch current := raw.(type) {
	case map[string]string:
		for key, value := range current {
			result[key] = strings.TrimSpace(value)
		}
	case map[string]any:
		for key, value := range current {
			result[key] = strings.TrimSpace(util.ToString(value))
		}
	}
	return result
}

func defaultUserExportTableConfig() map[string]any {
	return map[string]any{
		"modelName": "user.NewUserModel",
		"searchFields": []any{
			"username",
			"first_name",
			"last_name",
			"email",
			"phone_number",
		},
		"filterFields": []any{
			"status",
			"role",
			"work_ids",
		},
		"order": "main.id desc",
	}
}

func buildUserWorkExportHead() []map[string]any {
	return []map[string]any{
		{"key": "id", "title": "ID", "width": 10},
		{"key": "username", "title": "用户名", "width": 18},
		{"key": "name", "title": "姓名", "width": 16},
		{"key": "email", "title": "邮箱", "width": 28},
		{"key": "phone_number", "title": "手机号", "width": 18},
		{"key": "role", "title": "角色", "width": 14},
		{"key": "status", "title": "状态", "width": 14},
		{"key": "works", "title": "职业", "width": 28},
		{"key": "regions", "title": "地区", "width": 24},
	}
}

func buildUserExportFilterSummary(query map[string]string) string {
	parts := make([]string, 0, 3)
	if keyword := strings.TrimSpace(query["keyword"]); keyword != "" {
		parts = append(parts, "关键词："+keyword)
	}
	if status := strings.TrimSpace(query["status"]); status != "" {
		parts = append(parts, "状态："+status)
	}
	if role := strings.TrimSpace(query["role"]); role != "" {
		parts = append(parts, "角色："+role)
	}
	if workIDs := strings.TrimSpace(query["work_ids"]); workIDs != "" {
		parts = append(parts, "职业：已筛选")
	}
	if len(parts) == 0 {
		return "全部数据"
	}
	return strings.Join(parts, "；")
}

func joinNamedMaps(value any, field string) string {
	items := normalizeNamedMapSlice(value)
	parts := make([]string, 0, len(items))
	for _, item := range items {
		text := strings.TrimSpace(util.ToString(item[field]))
		if text != "" {
			parts = append(parts, text)
		}
	}
	return strings.Join(parts, "、")
}

func normalizeNamedMapSlice(value any) []map[string]any {
	switch current := value.(type) {
	case []map[string]any:
		return current
	case []any:
		items := make([]map[string]any, 0, len(current))
		for _, item := range current {
			mapped, _ := item.(map[string]any)
			if mapped != nil {
				items = append(items, mapped)
			}
		}
		return items
	default:
		return nil
	}
}
