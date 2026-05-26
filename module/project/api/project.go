package api

import (
	"github.com/shemic/dever/server"

	projectservice "my/module/project/service"
	teamservice "my/package/bot/service/team"
)

type Project struct{}

var projectSvc = projectservice.NewProjectService()
var projectTeamSvc = teamservice.NewService()

func (Project) GetList(c *server.Context) error {
	data, err := projectSvc.List(c.Context())
	return projectJSON(c, data, err)
}

func (Project) PostCreate(c *server.Context) error {
	body, err := bindProjectBody(c)
	if err != nil {
		return c.Error(err)
	}
	data, err := projectSvc.Create(
		c.Context(),
		bodyText(body, "name"),
		bodyUint64(body, "team_id", "teamId", "type_id", "typeId"),
		bodyUint64(body, "release_id", "releaseId"),
	)
	return projectJSON(c, data, err)
}

func (Project) GetDetail(c *server.Context) error {
	data, err := projectSvc.Detail(c.Context(), queryUint64(c, "id"))
	return projectJSON(c, data, err)
}

func (Project) PostDelete(c *server.Context) error {
	body, err := bindProjectBody(c)
	if err != nil {
		return c.Error(err)
	}
	data, err := projectSvc.Delete(c.Context(), bodyUint64(body, "id", "project_id", "projectId"))
	return projectJSON(c, data, err)
}

func (Project) GetTeamList(c *server.Context) error {
	data, err := projectTeamSvc.TeamList(c.Context())
	return projectJSON(c, data, err)
}

func (Project) GetTypeList(c *server.Context) error {
	data, err := projectTeamSvc.TeamList(c.Context())
	return projectJSON(c, data, err)
}

func (Project) GetCanvasConfig(c *server.Context) error {
	data, err := projectSvc.CanvasConfig(
		c.Context(),
		queryUint64(c, "project_id"),
		queryUint64(c, "flow_id"),
	)
	return projectJSON(c, data, err)
}

func (Project) GetCanvasPowerForm(c *server.Context) error {
	data, err := projectSvc.CanvasPowerForm(
		c.Context(),
		queryUint64(c, "project_id"),
		queryUint64(c, "flow_id"),
		queryUint64(c, "power_id"),
		queryText(c, "power_key"),
		queryUint64(c, "target_id"),
	)
	return projectJSON(c, data, err)
}
