package api

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/shemic/dever/server"
)

func bindProjectBody(c *server.Context) (map[string]any, error) {
	body := map[string]any{}
	if err := c.BindJSON(&body); err != nil {
		return nil, err
	}
	return body, nil
}

func projectJSON(c *server.Context, data any, err error) error {
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

func bodyUint64(body map[string]any, keys ...string) uint64 {
	for _, key := range keys {
		if value := toUint64(body[key]); value > 0 {
			return value
		}
	}
	return 0
}

func queryUint64(c *server.Context, key string) uint64 {
	return toUint64(c.Input(key))
}

func bodyText(body map[string]any, keys ...string) string {
	for _, key := range keys {
		if text := strings.TrimSpace(fmt.Sprint(body[key])); text != "" && text != "<nil>" {
			return text
		}
	}
	return ""
}

func queryText(c *server.Context, key string) string {
	text := strings.TrimSpace(fmt.Sprint(c.Input(key)))
	if text == "<nil>" {
		return ""
	}
	return text
}

func bodyMap(body map[string]any, key string) map[string]any {
	if row, ok := body[key].(map[string]any); ok && row != nil {
		return row
	}
	return map[string]any{}
}

func toUint64(value any) uint64 {
	switch typed := value.(type) {
	case uint64:
		return typed
	case uint:
		return uint64(typed)
	case uint32:
		return uint64(typed)
	case int:
		if typed > 0 {
			return uint64(typed)
		}
	case int64:
		if typed > 0 {
			return uint64(typed)
		}
	case float64:
		if typed > 0 {
			return uint64(typed)
		}
	case string:
		parsed, _ := strconv.ParseUint(strings.TrimSpace(typed), 10, 64)
		return parsed
	}
	return 0
}
