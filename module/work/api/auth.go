package api

import (
	"fmt"
	"strings"

	"github.com/shemic/dever/server"

	workservice "my/module/work/service"
)

type Auth struct{}

func (Auth) PostRegister(c *server.Context) error {
	body, err := bindBody(c)
	if err != nil {
		return c.Error(err)
	}
	data, err := (workservice.AuthService{}).Register(
		c.Context(),
		bodyText(body, "account", "username"),
		bodyText(body, "password"),
		bodyText(body, "name", "nickname"),
	)
	return workJSON(c, data, err)
}

func (Auth) PostLogin(c *server.Context) error {
	body, err := bindBody(c)
	if err != nil {
		return c.Error(err)
	}
	data, err := (workservice.AuthService{}).Login(
		c.Context(),
		bodyText(body, "account", "username"),
		bodyText(body, "password"),
	)
	return workJSON(c, data, err)
}

func (Auth) GetProfile(c *server.Context) error {
	data, err := (workservice.AuthService{}).Profile(c.Context())
	return workJSON(c, data, err)
}

func bindBody(c *server.Context) (map[string]any, error) {
	body := map[string]any{}
	if err := c.BindJSON(&body); err != nil {
		return nil, err
	}
	return body, nil
}

func workJSON(c *server.Context, data any, err error) error {
	if err != nil {
		payload := map[string]any{
			"status": 2,
			"data":   map[string]any{},
			"msg":    err.Error(),
		}
		if workservice.IsAuthRequired(err) {
			payload["code"] = 401
		}
		return c.JSONPayload(200, payload)
	}
	return c.JSONPayload(200, map[string]any{
		"status": 1,
		"data":   data,
		"msg":    "",
	})
}

func bodyText(body map[string]any, keys ...string) string {
	for _, key := range keys {
		text := strings.TrimSpace(fmt.Sprint(body[key]))
		if text != "" && text != "<nil>" {
			return text
		}
	}
	return ""
}

func bodyBool(body map[string]any, key string) bool {
	switch value := body[key].(type) {
	case bool:
		return value
	case string:
		text := strings.ToLower(strings.TrimSpace(value))
		return text == "1" || text == "true" || text == "yes" || text == "on"
	default:
		text := strings.ToLower(strings.TrimSpace(fmt.Sprint(value)))
		return text == "1" || text == "true" || text == "yes" || text == "on"
	}
}
