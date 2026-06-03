package service

import (
	"context"
	"fmt"
	"strings"

	teamservice "my/package/bot/service/team"
)

type SpaceService struct {
	project ProjectService
	team    teamservice.Service
}

func NewSpaceService() SpaceService {
	return SpaceService{
		project: NewProjectService(),
		team:    teamservice.NewService(),
	}
}

func (s SpaceService) Bootstrap(ctx context.Context, projectID uint64) (map[string]any, error) {
	project, err := s.project.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}

	builder := newProjectPayloadBuilder(ctx)
	payload := map[string]any{
		"project":            builder.Project(*project),
		"team":               map[string]any{},
		"type":               map[string]any{},
		"release":            map[string]any{},
		"asset_cates":        []any{},
		"roles":              []any{},
		"flows":              []any{},
		"flow_edges":         []any{},
		"nodes_by_flow":      map[string]any{},
		"node_edges_by_flow": map[string]any{},
		"assets":             []any{},
	}

	if project.TeamID > 0 || project.ReleaseID > 0 {
		teamPayload, err := s.team.TeamDetail(ctx, project.TeamID, project.ReleaseID)
		if err != nil {
			return nil, err
		}
		for key, value := range teamPayload {
			payload[key] = value
		}
	}

	assetsPayload, err := s.team.ListProjectAssets(ctx, project.ID, 0, "")
	if err != nil {
		return nil, err
	}
	if items, ok := assetsPayload["items"]; ok {
		payload["assets"] = items
	}

	return payload, nil
}

func (s SpaceService) Chat(ctx context.Context, projectID uint64, message string, assetCateID uint64) (map[string]any, error) {
	project, err := s.project.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	message = strings.TrimSpace(message)
	if message == "" {
		return nil, fmt.Errorf("请输入内容")
	}
	return s.team.RunTeam(ctx, teamservice.RunRequest{
		TeamID:    project.TeamID,
		ReleaseID: project.ReleaseID,
		ProjectID: project.ID,
		Input: map[string]any{
			"message":       message,
			"asset_cate_id": assetCateID,
		},
		Mode: "conversation",
	})
}

func (s SpaceService) RunFlow(ctx context.Context, projectID uint64, flowID uint64, input map[string]any) (map[string]any, error) {
	project, err := s.project.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	if flowID == 0 {
		return nil, fmt.Errorf("请选择流程")
	}
	return s.team.RunFlow(ctx, teamservice.RunRequest{
		TeamID:    project.TeamID,
		FlowID:    flowID,
		ReleaseID: project.ReleaseID,
		ProjectID: project.ID,
		Input:     input,
		Mode:      "flow",
	})
}
