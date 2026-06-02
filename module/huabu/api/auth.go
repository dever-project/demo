package api

import (
	"fmt"
	"strings"

	"github.com/shemic/dever/server"

	huabuservice "my/module/huabu/service"
)

type Auth struct{}

func (Auth) PostRegister(c *server.Context) error {
	body, err := bindBody(c)
	if err != nil {
		return c.Error(err)
	}
	data, err := (huabuservice.AuthService{}).Register(
		c.Context(),
		bodyText(body, "account", "username"),
		bodyText(body, "password"),
		bodyText(body, "name", "nickname"),
	)
	return huabuJSON(c, data, err)
}

func (Auth) PostLogin(c *server.Context) error {
	body, err := bindBody(c)
	if err != nil {
		return c.Error(err)
	}
	data, err := (huabuservice.AuthService{}).Login(
		c.Context(),
		bodyText(body, "account", "username"),
		bodyText(body, "password"),
	)
	return huabuJSON(c, data, err)
}

func (Auth) GetProfile(c *server.Context) error {
	data, err := (huabuservice.AuthService{}).Profile(c.Context())
	return huabuJSON(c, data, err)
}

func bindBody(c *server.Context) (map[string]any, error) {
	body := map[string]any{}
	if err := c.BindJSON(&body); err != nil {
		return nil, err
	}
	return body, nil
}

func huabuJSON(c *server.Context, data any, err error) error {
	if err != nil {
		payload := map[string]any{
			"status": 2,
			"data":   map[string]any{},
			"msg":    err.Error(),
		}
		if huabuservice.IsAuthRequired(err) {
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
