package api

import (
	"github.com/shemic/dever/server"
	"github.com/shemic/dever/util"

	huabuservice "my/module/huabu/service"
)

type Project struct{}

var projectSvc = huabuservice.NewProjectService()

func (Project) GetList(c *server.Context) error {
	data, err := projectSvc.List(c.Context())
	return huabuJSON(c, data, err)
}

func (Project) PostCreate(c *server.Context) error {
	body, err := bindBody(c)
	if err != nil {
		return c.Error(err)
	}
	data, err := projectSvc.Create(
		c.Context(),
		bodyText(body, "name"),
		bodyUint64(body, "team_id", "teamId"),
		bodyUint64(body, "release_id", "releaseId"),
	)
	return huabuJSON(c, data, err)
}

func (Project) GetTeamList(c *server.Context) error {
	data, err := projectSvc.TeamList(c.Context())
	return huabuJSON(c, data, err)
}

func bodyUint64(body map[string]any, keys ...string) uint64 {
	for _, key := range keys {
		if number := util.ToUint64(body[key]); number > 0 {
			return number
		}
	}
	return 0
}
