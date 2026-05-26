package api

import (
	"github.com/shemic/dever/server"

	projectservice "my/module/project/service"
)

type User struct{}

func (User) PostRegister(c *server.Context) error {
	body, err := bindProjectBody(c)
	if err != nil {
		return c.Error(err)
	}
	data, err := (projectservice.AuthService{}).Register(
		c.Context(),
		bodyText(body, "account", "username"),
		bodyText(body, "password"),
		bodyText(body, "name", "nickname"),
	)
	return projectJSON(c, data, err)
}

func (User) PostLogin(c *server.Context) error {
	body, err := bindProjectBody(c)
	if err != nil {
		return c.Error(err)
	}
	data, err := (projectservice.AuthService{}).Login(
		c.Context(),
		bodyText(body, "account", "username"),
		bodyText(body, "password"),
	)
	return projectJSON(c, data, err)
}

func (User) GetProfile(c *server.Context) error {
	data, err := (projectservice.AuthService{}).Profile(c.Context())
	return projectJSON(c, data, err)
}
