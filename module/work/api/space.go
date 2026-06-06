package api

import (
	"github.com/shemic/dever/server"
	"github.com/shemic/dever/util"

	workservice "my/module/work/service"
	teamservice "my/package/bot/service/team"
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

func (Space) GetCanvasPowerForm(c *server.Context) error {
	data, err := spaceSvc.CanvasPowerForm(
		c.Context(),
		queryUint64(c, "project_id", "projectId", "id"),
		queryUint64(c, "flow_id", "flowId"),
		queryUint64(c, "power_id", "powerId"),
		queryText(c, "power_key", "powerKey", "power"),
		queryUint64(c, "target_id", "targetId", "source_target_id", "sourceTargetId"),
	)
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

func (Space) PostRunCanvasPower(c *server.Context) error {
	body, err := bindBody(c)
	if err != nil {
		return c.Error(err)
	}
	projectID := bodyUint64(body, "project_id", "projectId", "id")
	data, err := spaceSvc.RunCanvasPower(c.Context(), projectID, teamservice.CanvasPowerRunRequest{
		FlowID:         bodyUint64(body, "flow_id", "flowId"),
		NodeKey:        bodyText(body, "node_key", "nodeKey"),
		NodeName:       bodyText(body, "node_name", "nodeName", "name"),
		Kind:           bodyText(body, "kind"),
		PowerID:        bodyUint64(body, "power_id", "powerId"),
		PowerKey:       bodyText(body, "power_key", "powerKey", "power"),
		SourceTargetID: bodyUint64(body, "source_target_id", "sourceTargetId", "power_target_id", "powerTargetId"),
		Input:          bodyMap(body, "input"),
		Params:         bodyMap(body, "params"),
	})
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

func queryUint64(c *server.Context, keys ...string) uint64 {
	for _, key := range keys {
		if number := util.ToUint64(c.Input(key)); number > 0 {
			return number
		}
	}
	return 0
}

func queryText(c *server.Context, keys ...string) string {
	for _, key := range keys {
		if text := bodyText(map[string]any{key: c.Input(key)}, key); text != "" {
			return text
		}
	}
	return ""
}
