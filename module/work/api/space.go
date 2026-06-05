package api

import (
	"github.com/shemic/dever/server"
	"github.com/shemic/dever/util"

	workservice "my/module/work/service"
)

type Space struct{}

var spaceSvc = workservice.NewSpaceService()

func (Space) GetBootstrap(c *server.Context) error {
	projectID := util.ToUint64(c.Input("project_id"))
	if projectID == 0 {
		projectID = util.ToUint64(c.Input("projectId"))
	}
	if projectID == 0 {
		projectID = util.ToUint64(c.Input("id"))
	}
	data, err := spaceSvc.Bootstrap(c.Context(), projectID)
	return workJSON(c, data, err)
}

func (Space) GetPowers(c *server.Context) error {
	projectID := util.ToUint64(c.Input("project_id"))
	if projectID == 0 {
		projectID = util.ToUint64(c.Input("projectId"))
	}
	if projectID == 0 {
		projectID = util.ToUint64(c.Input("id"))
	}
	data, err := spaceSvc.PowerCatalog(c.Context(), projectID)
	return workJSON(c, data, err)
}

func (Space) PostChat(c *server.Context) error {
	body, err := bindBody(c)
	if err != nil {
		return c.Error(err)
	}
	data, err := spaceSvc.Chat(
		c.Context(),
		bodyUint64(body, "project_id", "projectId", "id"),
		bodyText(body, "message", "prompt", "content"),
		bodyUint64(body, "asset_cate_id", "assetCateId"),
	)
	return workJSON(c, data, err)
}

func (Space) PostRunFlow(c *server.Context) error {
	body, err := bindBody(c)
	if err != nil {
		return c.Error(err)
	}
	data, err := spaceSvc.RunFlow(
		c.Context(),
		bodyUint64(body, "project_id", "projectId"),
		bodyUint64(body, "flow_id", "flowId", "id"),
		bodyMap(body, "input"),
	)
	return workJSON(c, data, err)
}

func bodyMap(body map[string]any, key string) map[string]any {
	if value, ok := body[key].(map[string]any); ok && value != nil {
		return value
	}
	return map[string]any{}
}
