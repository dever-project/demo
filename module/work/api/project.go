package api

import (
	"github.com/shemic/dever/server"
	"github.com/shemic/dever/util"

	workservice "my/module/work/service"
)

type Project struct{}

var projectSvc = workservice.NewProjectService()

func (Project) GetList(c *server.Context) error {
	data, err := projectSvc.List(c.Context())
	return workJSON(c, data, err)
}

func (Project) PostCreate(c *server.Context) error {
	body, err := bindBody(c)
	if err != nil {
		return c.Error(err)
	}
	data, err := projectSvc.Create(
		c.Context(),
		bodyText(body, "name"),
		bodyUint64(body, "team_id"),
		bodyUint64(body, "release_id"),
	)
	return workJSON(c, data, err)
}

func (Project) GetTeamList(c *server.Context) error {
	data, err := projectSvc.TeamList(c.Context())
	return workJSON(c, data, err)
}

func bodyUint64(body map[string]any, key string) uint64 {
	return util.ToUint64(body[key])
}
