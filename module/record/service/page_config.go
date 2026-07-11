package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/shemic/dever/util"

	recordmodel "my/module/record/model"
)

type PageConfigService struct{}

func (PageConfigService) GetContent(ctx context.Context, pageKey string) (map[string]any, error) {
	pageKey = normalizePageKey(pageKey)
	if pageKey == "" {
		return nil, errors.New("页面 key 不能为空")
	}

	pageModel := recordmodel.NewPageConfigModel()
	row := pageModel.FindMap(ctx, map[string]any{"page_key": pageKey})
	created := false
	if len(row) == 0 {
		now := time.Now()
		id := util.ToUint64(pageModel.Insert(ctx, map[string]any{
			"page_key":   pageKey,
			"content":    "",
			"created_at": now,
		}))
		row = map[string]any{
			"id":         id,
			"page_key":   pageKey,
			"content":    "",
			"created_at": now,
		}
		created = true
	}

	return map[string]any{
		"id":         util.ToUint64(row["id"]),
		"key":        util.ToStringTrimmed(row["page_key"]),
		"page_key":   util.ToStringTrimmed(row["page_key"]),
		"content":    util.ToString(row["content"]),
		"created":    created,
		"created_at": row["created_at"],
	}, nil
}

func normalizePageKey(value string) string {
	return strings.TrimSpace(value)
}
