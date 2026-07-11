package api

import (
	"strings"

	"github.com/shemic/dever/server"
	"github.com/shemic/dever/util"

	recordservice "my/module/record/service"
)

type Page struct{}

var pageConfigService = recordservice.PageConfigService{}

func (Page) GetContent(c *server.Context) error {
	pageKey := firstPageKey(c.Input("key"), c.Input("page_key"))
	data, err := pageConfigService.GetContent(c.Context(), pageKey)
	return recordJSON(c, data, err)
}

func firstPageKey(values ...any) string {
	for _, value := range values {
		if text := strings.TrimSpace(util.ToString(value)); text != "" {
			return text
		}
	}
	return ""
}

func recordJSON(c *server.Context, data any, err error) error {
	if err != nil {
		return c.JSONPayload(200, map[string]any{
			"status": 2,
			"data":   map[string]any{},
			"msg":    err.Error(),
		})
	}
	return c.JSONPayload(200, map[string]any{
		"status": 1,
		"data":   data,
		"msg":    "",
	})
}
