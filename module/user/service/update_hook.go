package service

import (
	"strings"

	"github.com/shemic/dever/server"
	"github.com/shemic/dever/util"

	frontmeta "github.com/dever-package/front/service/meta"
	frontrecord "github.com/dever-package/front/service/record"
)

var userEditableStringFields = []string{
	"first_name",
	"last_name",
	"username",
	"email",
	"phone_number",
	"role",
	"intro",
	"content",
}

type UserUpdateHook struct{}

func (UserUpdateHook) ProviderBeforeSaveUserUpdate(_ *server.Context, params []any) any {
	record := util.CloneMap(firstUserHookMap(params))
	if len(record) == 0 {
		return record
	}

	for _, field := range userEditableStringFields {
		current, ok := record[field]
		if !ok {
			continue
		}
		record[field] = util.ToStringTrimmed(current)
	}

	return record
}

func (UserUpdateHook) ProviderAfterSaveUserUpdate(c *server.Context, params []any) any {
	payload := firstUserHookMap(params)
	record, _ := payload["data"].(map[string]any)
	if len(record) == 0 || util.ToStringTrimmed(record["intro"]) != "" {
		return nil
	}

	userID := util.ToUint64(payload["id"])
	if userID == 0 {
		return nil
	}

	intro := buildUserAutoIntro(c, record)
	if intro == "" {
		return nil
	}

	adapter := frontrecord.Resolve("user.NewUserModel")
	if adapter == nil {
		panic("user.NewUserModel 未注册")
	}

	adapter.Update(c.Context(), map[string]any{"id": userID}, map[string]any{
		"intro": intro,
	})

	return nil
}

func buildUserAutoIntro(c *server.Context, record map[string]any) string {
	name := strings.TrimSpace(util.ToString(record["last_name"]) + util.ToString(record["first_name"]))
	if name == "" {
		name = util.ToStringTrimmed(record["username"])
	}

	roleLabel := resolveUserRoleLabel(c, util.ToString(record["role"]))
	switch {
	case name != "" && roleLabel != "":
		return name + "，当前角色为" + roleLabel + "。"
	case name != "":
		return name + "，已完成基础信息配置。"
	case roleLabel != "":
		return "当前角色为" + roleLabel + "。"
	default:
		return ""
	}
}

func resolveUserRoleLabel(c *server.Context, role string) string {
	role = strings.TrimSpace(role)
	if role == "" {
		return ""
	}

	options := frontmeta.ResolveModelOptions(c.Context(), "user.NewUserModel")
	rawOptions, ok := options["role"]
	if !ok {
		return role
	}

	for _, item := range normalizeUserOptionItems(rawOptions) {
		if util.ToStringTrimmed(item["id"]) != role {
			continue
		}
		return firstNonEmptyString(item["value"], item["label"], item["name"], role)
	}

	return role
}

func normalizeUserOptionItems(value any) []map[string]any {
	switch current := value.(type) {
	case []map[string]any:
		return current
	case []any:
		items := make([]map[string]any, 0, len(current))
		for _, item := range current {
			mapped, ok := item.(map[string]any)
			if !ok {
				continue
			}
			items = append(items, mapped)
		}
		return items
	default:
		return nil
	}
}

func firstUserHookMap(params []any) map[string]any {
	if len(params) == 0 {
		return map[string]any{}
	}
	mapped, _ := params[0].(map[string]any)
	if mapped == nil {
		return map[string]any{}
	}
	return mapped
}

func firstNonEmptyString(values ...any) string {
	for _, value := range values {
		current := util.ToStringTrimmed(value)
		if current != "" {
			return current
		}
	}
	return ""
}
