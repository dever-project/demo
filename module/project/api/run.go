package api

import (
	"context"
	"time"

	"github.com/shemic/dever/server"

	projectservice "my/module/project/service"
	teamservice "my/package/bot/service/team"
	frontstream "my/package/front/service/stream"
)

type Run struct{}

func (Run) PostCanvasPower(c *server.Context) error {
	body, err := bindProjectBody(c)
	if err != nil {
		return c.Error(err)
	}
	projectID := bodyUint64(body, "project_id", "projectId")
	data, err := projectSvc.RunCanvasPower(c.Context(), projectID, teamservice.CanvasPowerRunRequest{
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
	return projectJSON(c, data, err)
}

func (Run) PostCanvasAgent(c *server.Context) error {
	body, err := bindProjectBody(c)
	if err != nil {
		return c.Error(err)
	}
	projectID := bodyUint64(body, "project_id", "projectId")
	data, err := projectSvc.RunCanvasAgent(c.Context(), projectID, projectservice.CanvasAgentRunRequest{
		FlowID:   bodyUint64(body, "flow_id", "flowId"),
		NodeKey:  bodyText(body, "node_key", "nodeKey"),
		NodeName: bodyText(body, "node_name", "nodeName", "name"),
		AgentID:  bodyUint64(body, "agent_id", "agentId", "id"),
		Input:    bodyMap(body, "input"),
	})
	return projectJSON(c, data, err)
}

func (Run) PostFlow(c *server.Context) error {
	body, err := bindProjectBody(c)
	if err != nil {
		return c.Error(err)
	}
	projectID := bodyUint64(body, "project_id", "projectId")
	data, err := projectSvc.RunFlow(c.Context(), projectID, teamservice.RunRequest{
		TeamID:    bodyUint64(body, "team_id", "teamId"),
		ReleaseID: bodyUint64(body, "release_id", "releaseId"),
		FlowID:    bodyUint64(body, "flow_id", "flowId", "id"),
		RequestID: bodyText(body, "request_id", "requestId"),
		Input:     bodyMap(body, "input"),
		Mode:      "flow",
	})
	return projectJSON(c, data, err)
}

func (Run) PostTeam(c *server.Context) error {
	body, err := bindProjectBody(c)
	if err != nil {
		return c.Error(err)
	}
	projectID := bodyUint64(body, "project_id", "projectId")
	data, err := projectSvc.RunTeam(c.Context(), projectID, teamservice.RunRequest{
		TeamID:    bodyUint64(body, "team_id", "teamId"),
		ReleaseID: bodyUint64(body, "release_id", "releaseId"),
		RequestID: bodyText(body, "request_id", "requestId"),
		Input:     bodyMap(body, "input"),
		Mode:      runModeOrDefault(bodyText(body, "mode"), "team"),
	})
	return projectJSON(c, data, err)
}

func (Run) PostRole(c *server.Context) error {
	body, err := bindProjectBody(c)
	if err != nil {
		return c.Error(err)
	}
	projectID := bodyUint64(body, "project_id", "projectId")
	data, err := projectSvc.RunRole(c.Context(), projectID, teamservice.RunRequest{
		RoleID:    bodyUint64(body, "role_id", "roleId", "id"),
		RequestID: bodyText(body, "request_id", "requestId"),
		Input:     bodyMap(body, "input"),
		Mode:      "role",
	})
	return projectJSON(c, data, err)
}

func (Run) GetStatus(c *server.Context) error {
	data, err := projectSvc.RunStatus(
		c.Context(),
		queryUint64(c, "project_id"),
		queryUint64(c, "run_id"),
		queryText(c, "request_id"),
	)
	return projectJSON(c, data, err)
}

func (Run) GetStream(c *server.Context) error {
	params := frontstream.ReadParamsFromServerContext(c)
	projectID := queryUint64(c, "project_id")
	reader := func(ctx context.Context, requestID string, lastID string, count int64, block time.Duration) ([]frontstream.Entry, error) {
		return projectSvc.ReadStream(ctx, projectID, requestID, lastID, count, block)
	}
	if frontstream.WantsSSE(c) {
		return frontstream.ServeSSE(c, reader, params)
	}
	entries, err := reader(c.Context(), params.RequestID, params.LastID, params.Count, params.Block)
	if err != nil {
		return c.JSONPayload(200, frontstream.ResponsePayload(params.RequestID, "result", map[string]any{}, err.Error(), 2))
	}
	return c.JSONPayload(200, frontstream.NextPayload(params.RequestID, params.LastID, entries))
}

func (Run) PostStop(c *server.Context) error {
	body, err := bindProjectBody(c)
	if err != nil {
		return c.Error(err)
	}
	data, err := projectSvc.StopRun(
		c.Context(),
		bodyUint64(body, "project_id", "projectId"),
		bodyUint64(body, "run_id", "runId", "id"),
		bodyText(body, "request_id", "requestId"),
	)
	return projectJSON(c, data, err)
}

func (Run) PostApproval(c *server.Context) error {
	body, err := bindProjectBody(c)
	if err != nil {
		return c.Error(err)
	}
	data, err := projectSvc.SubmitApproval(
		c.Context(),
		bodyUint64(body, "project_id", "projectId"),
		bodyUint64(body, "approval_id", "approvalId", "id"),
		bodyText(body, "decision"),
		bodyText(body, "comment"),
		bodyMap(body, "data"),
	)
	return projectJSON(c, data, err)
}

func runModeOrDefault(mode string, fallback string) string {
	switch mode {
	case "team", "conversation":
		return mode
	default:
		return fallback
	}
}
