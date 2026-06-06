package service

import (
	"context"
	"fmt"
	"sort"
	"strings"

	bodyservice "my/package/bot/service/body"
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
	project, err = s.project.SyncProjectTeamRelease(ctx, project)
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

	powerCatalog, err := s.powerCatalog(ctx, project.ReleaseID, project.BodyID)
	if err != nil {
		return nil, err
	}
	for key, value := range powerCatalog {
		payload[key] = value
	}

	return payload, nil
}

func (s SpaceService) PowerCatalog(ctx context.Context, projectID uint64) (map[string]any, error) {
	project, err := s.project.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	project, err = s.project.SyncProjectTeamRelease(ctx, project)
	if err != nil {
		return nil, err
	}
	return s.powerCatalog(ctx, project.ReleaseID, project.BodyID)
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

func (s SpaceService) CanvasPowerForm(ctx context.Context, projectID uint64, flowID uint64, powerID uint64, powerKey string, targetID uint64) (map[string]any, error) {
	project, err := s.project.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	project, err = s.project.SyncProjectTeamRelease(ctx, project)
	if err != nil {
		return nil, err
	}
	if err := requireBodyPower(ctx, s.project.body, project.BodyID, powerID); err != nil {
		return nil, err
	}
	return s.team.CanvasPowerForm(ctx, project.ReleaseID, flowID, powerID, powerKey, targetID)
}

func (s SpaceService) RunCanvasPower(ctx context.Context, projectID uint64, req teamservice.CanvasPowerRunRequest) (map[string]any, error) {
	project, err := s.project.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	project, err = s.project.SyncProjectTeamRelease(ctx, project)
	if err != nil {
		return nil, err
	}
	if err := requireBodyPower(ctx, s.project.body, project.BodyID, req.PowerID); err != nil {
		return nil, err
	}
	req.ProjectID = project.ID
	req.BodyID = project.BodyID
	req.TeamID = project.TeamID
	req.ReleaseID = project.ReleaseID
	return s.team.RunCanvasPower(ctx, req)
}

func (s SpaceService) powerCatalog(ctx context.Context, releaseID uint64, bodyID uint64) (map[string]any, error) {
	config, err := s.team.CanvasConfig(ctx, releaseID, 0)
	if err != nil {
		return nil, err
	}
	powers, _ := config["powers"].([]teamservice.PowerOption)
	powers = filterBodyPowerOptions(ctx, s.project.body, bodyID, powers)
	return map[string]any{
		"powers":      powers,
		"power_kinds": powerKindOptions(powers),
	}, nil
}

func filterBodyPowerOptions(ctx context.Context, body bodyservice.Service, bodyID uint64, powers []teamservice.PowerOption) []teamservice.PowerOption {
	powerOrder, restricted := body.AllowedPowerOrder(ctx, bodyID)
	if !restricted {
		return powers
	}
	byID := make(map[uint64]teamservice.PowerOption, len(powers))
	for _, power := range powers {
		byID[power.ID] = power
	}
	result := make([]teamservice.PowerOption, 0, len(powerOrder))
	for _, powerID := range powerOrder {
		if power, ok := byID[powerID]; ok {
			result = append(result, power)
		}
	}
	return result
}

func requireBodyPower(ctx context.Context, body bodyservice.Service, bodyID uint64, powerID uint64) error {
	allowed, restricted := body.AllowedPowerIDs(ctx, bodyID)
	if !restricted {
		return nil
	}
	if powerID == 0 || !allowed[powerID] {
		return fmt.Errorf("当前画布不允许使用该能力")
	}
	return nil
}

func powerKindOptions(powers []teamservice.PowerOption) []teamservice.PowerKindOption {
	labels := map[string]string{
		"text":       "文本",
		"image":      "图片",
		"video":      "视频",
		"audio":      "音频",
		"role":       "角色",
		"multi":      "多模态",
		"embeddings": "向量",
		"workflow":   "工作流",
	}
	order := []string{"text", "image", "video", "audio", "role", "multi", "embeddings", "workflow"}
	seen := map[string]bool{}
	for _, power := range powers {
		if power.Kind != "" {
			seen[power.Kind] = true
		}
	}
	result := make([]teamservice.PowerKindOption, 0, len(seen))
	for _, kind := range order {
		if !seen[kind] {
			continue
		}
		result = append(result, teamservice.PowerKindOption{ID: kind, Value: labels[kind]})
		delete(seen, kind)
	}
	extra := make([]string, 0, len(seen))
	for kind := range seen {
		extra = append(extra, kind)
	}
	sort.Strings(extra)
	for _, kind := range extra {
		result = append(result, teamservice.PowerKindOption{ID: kind, Value: kind})
	}
	return result
}
