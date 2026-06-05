package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	projectmodel "my/module/project/model"
	agentmodel "my/package/bot/model/agent"
	teammodel "my/package/bot/model/team"
	agentservice "my/package/bot/service/agent"
	assetservice "my/package/bot/service/asset"
	bodyservice "my/package/bot/service/body"
	teamservice "my/package/bot/service/team"
	frontstream "my/package/front/service/stream"
)

type ProjectService struct {
	team  teamservice.Service
	agent agentservice.Service
	asset assetservice.Service
	body  bodyservice.Service
}

func NewProjectService() ProjectService {
	return ProjectService{
		team:  teamservice.NewService(),
		agent: agentservice.NewService(),
		asset: assetservice.NewService(),
		body:  bodyservice.NewService(),
	}
}

type CanvasAgentRunRequest struct {
	FlowID   uint64
	NodeKey  string
	NodeName string
	AgentID  uint64
	Input    map[string]any
}

func (s ProjectService) List(ctx context.Context) (map[string]any, error) {
	userID, err := CurrentUserID(ctx)
	if err != nil {
		return nil, err
	}
	rows := projectmodel.NewProjectModel().Select(ctx, map[string]any{
		"user_id": userID,
		"status":  projectmodel.StatusEnabled,
	})
	items := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		items = append(items, projectPayload(*row))
	}
	return map[string]any{"items": items}, nil
}

func (s ProjectService) Create(ctx context.Context, name string, teamID uint64, releaseID uint64) (map[string]any, error) {
	userID, err := CurrentUserID(ctx)
	if err != nil {
		return nil, err
	}
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, fmt.Errorf("项目名称不能为空")
	}
	team, release, err := resolveOptionalPublishedTeamRelease(ctx, teamID, releaseID)
	if err != nil {
		return nil, err
	}
	projectID := uint64(projectmodel.NewProjectModel().Insert(ctx, map[string]any{
		"user_id":    userID,
		"team_id":    team.ID,
		"release_id": release.ID,
		"name":       name,
		"status":     projectmodel.StatusEnabled,
		"created_at": time.Now(),
	}))
	if projectID == 0 {
		return nil, fmt.Errorf("创建项目失败")
	}
	bodyID, err := s.body.CreateCanvasBody(ctx, projectID, name)
	if err != nil {
		return nil, err
	}
	projectmodel.NewProjectModel().Update(ctx, map[string]any{"id": projectID}, map[string]any{
		"body_id": bodyID,
	})
	return s.Detail(ctx, projectID)
}

func (s ProjectService) Detail(ctx context.Context, projectID uint64) (map[string]any, error) {
	project, err := s.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	project, err = s.SyncProjectTeamRelease(ctx, project)
	if err != nil {
		return nil, err
	}
	detail := map[string]any{}
	if project.TeamID > 0 {
		var err error
		detail, err = s.team.TeamDetail(ctx, project.TeamID, project.ReleaseID)
		if err != nil {
			return nil, err
		}
	}
	assets, _ := s.asset.ListProject(ctx, project.ID, 0, "")
	return map[string]any{
		"project": projectPayload(*project),
		"team":    detail,
		"assets":  assets,
	}, nil
}

func (s ProjectService) RunCanvasPower(ctx context.Context, projectID uint64, req teamservice.CanvasPowerRunRequest) (map[string]any, error) {
	project, err := s.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	project, err = s.SyncProjectTeamRelease(ctx, project)
	if err != nil {
		return nil, err
	}
	if err := requireBodyPower(ctx, s.body, project.BodyID, req.PowerID); err != nil {
		return nil, err
	}
	req.ProjectID = project.ID
	req.BodyID = project.BodyID
	req.TeamID = project.TeamID
	req.ReleaseID = project.ReleaseID
	return s.team.RunCanvasPower(ctx, req)
}

func (s ProjectService) Delete(ctx context.Context, projectID uint64) (map[string]any, error) {
	project, err := s.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	projectmodel.NewProjectModel().Update(ctx, map[string]any{"id": project.ID}, map[string]any{
		"status": projectmodel.StatusDisabled,
	})
	return map[string]any{"id": project.ID}, nil
}

func (s ProjectService) RunCanvasAgent(ctx context.Context, projectID uint64, req CanvasAgentRunRequest) (map[string]any, error) {
	project, err := s.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	if err := requireBodyAgent(ctx, s.body, project.BodyID, req.AgentID); err != nil {
		return nil, err
	}
	agent := agentmodel.NewAgentModel().Find(ctx, map[string]any{
		"id":     req.AgentID,
		"status": teammodel.StatusEnabled,
	})
	if agent == nil {
		return nil, fmt.Errorf("智能体不存在或未开启")
	}
	input := cloneProjectInput(req.Input)
	result, err := s.agent.RunInternal(ctx, agentservice.InternalRunRequest{
		AgentID: req.AgentID,
		Input:   input,
		Options: map[string]any{"full_runtime": false},
	})
	if err != nil {
		return map[string]any{
			"run_id":     result.RunID,
			"request_id": result.RequestID,
			"status":     "fail",
			"output":     result.Output,
		}, err
	}
	nodeName := strings.TrimSpace(req.NodeName)
	if nodeName == "" {
		nodeName = strings.TrimSpace(agent.Name)
	}
	if nodeName == "" {
		nodeName = "智能体运行结果"
	}
	asset, version, err := s.asset.SaveVersion(ctx, assetservice.SaveVersionRequest{
		ProjectID: project.ID,
		BodyID:    project.BodyID,
		FlowID:    req.FlowID,
		RunID:     result.RunID,
		Name:      nodeName,
		Kind:      "text",
		Content:   result.Output,
	})
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"run_id":     result.RunID,
		"request_id": result.RequestID,
		"status":     "success",
		"output":     result.Output,
		"asset":      assetservice.AssetToMap(*asset),
		"version":    assetservice.VersionToMap(*version),
	}, nil
}

func (s ProjectService) RunFlow(ctx context.Context, projectID uint64, req teamservice.RunRequest) (map[string]any, error) {
	project, err := s.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	project, err = s.SyncProjectTeamRelease(ctx, project)
	if err != nil {
		return nil, err
	}
	teamID, releaseID, err := s.resolveRunTeam(ctx, project, req.TeamID, req.ReleaseID)
	if err != nil {
		return nil, err
	}
	req.ProjectID = project.ID
	req.TeamID = teamID
	req.ReleaseID = releaseID
	return s.team.RunFlow(ctx, req)
}

func (s ProjectService) RunTeam(ctx context.Context, projectID uint64, req teamservice.RunRequest) (map[string]any, error) {
	project, err := s.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	project, err = s.SyncProjectTeamRelease(ctx, project)
	if err != nil {
		return nil, err
	}
	teamID, releaseID, err := s.resolveRunTeam(ctx, project, req.TeamID, req.ReleaseID)
	if err != nil {
		return nil, err
	}
	req.ProjectID = project.ID
	req.TeamID = teamID
	req.ReleaseID = releaseID
	return s.team.RunTeam(ctx, req)
}

func (s ProjectService) RunRole(ctx context.Context, projectID uint64, req teamservice.RunRequest) (map[string]any, error) {
	project, err := s.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	project, err = s.SyncProjectTeamRelease(ctx, project)
	if err != nil {
		return nil, err
	}
	if project.TeamID == 0 {
		return nil, fmt.Errorf("当前项目未绑定团队")
	}
	req.ProjectID = project.ID
	req.TeamID = project.TeamID
	req.ReleaseID = project.ReleaseID
	return s.team.RunRole(ctx, req)
}

func (s ProjectService) resolveRunTeam(ctx context.Context, project *projectmodel.Project, teamID uint64, releaseID uint64) (uint64, uint64, error) {
	if teamID == 0 && releaseID == 0 {
		if project.TeamID == 0 {
			return 0, 0, fmt.Errorf("当前项目未绑定团队")
		}
		return project.TeamID, project.ReleaseID, nil
	}
	team, release, err := resolveOptionalPublishedTeamRelease(ctx, teamID, releaseID)
	if err != nil {
		return 0, 0, err
	}
	if err := requireBodyTeam(ctx, s.body, project.BodyID, team.ID); err != nil {
		return 0, 0, err
	}
	return team.ID, release.ID, nil
}

func (s ProjectService) CanvasConfig(ctx context.Context, projectID uint64, flowID uint64) (map[string]any, error) {
	project, err := s.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	project, err = s.SyncProjectTeamRelease(ctx, project)
	if err != nil {
		return nil, err
	}
	var config map[string]any
	if project.ReleaseID == 0 {
		config, err = s.team.CanvasConfig(ctx, 0, 0)
	} else {
		config, err = s.team.CanvasConfig(ctx, project.ReleaseID, flowID)
	}
	if err != nil {
		return nil, err
	}
	applyBodyLimits(ctx, s.body, project.BodyID, config)
	return config, nil
}

func (s ProjectService) CanvasPowerForm(ctx context.Context, projectID uint64, flowID uint64, powerID uint64, powerKey string, targetID uint64) (map[string]any, error) {
	project, err := s.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	project, err = s.SyncProjectTeamRelease(ctx, project)
	if err != nil {
		return nil, err
	}
	if err := requireBodyPower(ctx, s.body, project.BodyID, powerID); err != nil {
		return nil, err
	}
	if project.ReleaseID == 0 {
		return s.team.CanvasPowerForm(ctx, 0, 0, powerID, powerKey, targetID)
	}
	return s.team.CanvasPowerForm(ctx, project.ReleaseID, flowID, powerID, powerKey, targetID)
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

func requireBodyAgent(ctx context.Context, body bodyservice.Service, bodyID uint64, agentID uint64) error {
	allowed, restricted := body.AllowedAgentIDs(ctx, bodyID)
	if !restricted {
		return nil
	}
	if agentID == 0 || !allowed[agentID] {
		return fmt.Errorf("当前画布不允许使用该智能体")
	}
	return nil
}

func requireBodyTeam(ctx context.Context, body bodyservice.Service, bodyID uint64, teamID uint64) error {
	allowed, restricted := body.AllowedTeamIDs(ctx, bodyID)
	if !restricted {
		return nil
	}
	if teamID == 0 || !allowed[teamID] {
		return fmt.Errorf("当前画布不允许使用该团队")
	}
	return nil
}

func applyBodyLimits(ctx context.Context, body bodyservice.Service, bodyID uint64, config map[string]any) {
	powerOrder, restricted := body.AllowedPowerOrder(ctx, bodyID)
	if restricted {
		if powers, ok := config["powers"].([]teamservice.PowerOption); ok {
			config["powers"] = orderPowerOptions(powers, powerOrder)
		}
	}

	agentOrder, restrictedAgents := body.AllowedAgentOrder(ctx, bodyID)
	if restrictedAgents {
		if agents, ok := config["agents"].([]teamservice.AgentOption); ok {
			config["agents"] = orderAgentOptions(agents, agentOrder)
		}
	}

	teamOrder, restrictedTeams := body.AllowedTeamOrder(ctx, bodyID)
	if restrictedTeams {
		if teams, ok := config["teams"].([]teamservice.TeamOption); ok {
			config["teams"] = orderTeamOptions(teams, teamOrder)
		}
	}
}

func orderPowerOptions(options []teamservice.PowerOption, order []uint64) []teamservice.PowerOption {
	return orderOptions(options, order, func(option teamservice.PowerOption) uint64 { return option.ID })
}

func orderAgentOptions(options []teamservice.AgentOption, order []uint64) []teamservice.AgentOption {
	return orderOptions(options, order, func(option teamservice.AgentOption) uint64 { return option.ID })
}

func orderTeamOptions(options []teamservice.TeamOption, order []uint64) []teamservice.TeamOption {
	return orderOptions(options, order, func(option teamservice.TeamOption) uint64 { return option.ID })
}

func orderOptions[T any](options []T, order []uint64, id func(T) uint64) []T {
	byID := make(map[uint64]T, len(options))
	for _, option := range options {
		byID[id(option)] = option
	}
	result := make([]T, 0, len(order))
	for _, id := range order {
		if option, ok := byID[id]; ok {
			result = append(result, option)
		}
	}
	return result
}

func cloneProjectInput(input map[string]any) map[string]any {
	result := map[string]any{}
	for key, value := range input {
		result[key] = value
	}
	return result
}

func (s ProjectService) RunStatus(ctx context.Context, projectID uint64, runID uint64, requestID string) (map[string]any, error) {
	if _, err := s.RequireProject(ctx, projectID); err != nil {
		return nil, err
	}
	return s.team.ProjectRunStatus(ctx, projectID, runID, requestID)
}

func (s ProjectService) ReadStream(ctx context.Context, projectID uint64, requestID string, lastID string, count int64, block time.Duration) ([]frontstream.Entry, error) {
	if _, err := s.RequireProject(ctx, projectID); err != nil {
		return nil, err
	}
	return s.team.ReadProjectStream(ctx, projectID, requestID, lastID, count, block)
}

func (s ProjectService) StopRun(ctx context.Context, projectID uint64, runID uint64, requestID string) (map[string]any, error) {
	if _, err := s.RequireProject(ctx, projectID); err != nil {
		return nil, err
	}
	return s.team.StopProjectRun(ctx, projectID, runID, requestID)
}

func (s ProjectService) SubmitApproval(ctx context.Context, projectID uint64, approvalID uint64, decision string, comment string, data map[string]any) (map[string]any, error) {
	if _, err := s.RequireProject(ctx, projectID); err != nil {
		return nil, err
	}
	return s.team.SubmitProjectApproval(ctx, projectID, approvalID, decision, comment, data)
}

func (s ProjectService) Assets(ctx context.Context, projectID uint64, flowID uint64, contentType string) (map[string]any, error) {
	if _, err := s.RequireProject(ctx, projectID); err != nil {
		return nil, err
	}
	return s.asset.ListProject(ctx, projectID, flowID, contentType)
}

func (s ProjectService) AssetDetail(ctx context.Context, projectID uint64, assetID uint64) (map[string]any, error) {
	if _, err := s.RequireProject(ctx, projectID); err != nil {
		return nil, err
	}
	return s.asset.ProjectDetail(ctx, projectID, assetID)
}

func (ProjectService) RequireProject(ctx context.Context, projectID uint64) (*projectmodel.Project, error) {
	userID, err := CurrentUserID(ctx)
	if err != nil {
		return nil, err
	}
	if projectID == 0 {
		return nil, fmt.Errorf("项目不能为空")
	}
	project := projectmodel.NewProjectModel().Find(ctx, map[string]any{
		"id":      projectID,
		"user_id": userID,
		"status":  projectmodel.StatusEnabled,
	})
	if project == nil {
		return nil, fmt.Errorf("项目不存在")
	}
	return project, nil
}

func (s ProjectService) SyncProjectTeamRelease(ctx context.Context, project *projectmodel.Project) (*projectmodel.Project, error) {
	if project == nil || project.TeamID == 0 {
		return project, nil
	}
	team := teammodel.NewTeamModel().Find(ctx, map[string]any{
		"id":     project.TeamID,
		"status": teammodel.StatusEnabled,
	})
	if team == nil {
		return nil, fmt.Errorf("团队不存在")
	}
	release := teammodel.NewTeamReleaseModel().Find(ctx, map[string]any{
		"id": team.CurrentReleaseID,
	})
	if release == nil || release.TeamID != team.ID {
		return nil, fmt.Errorf("团队尚未发布")
	}
	if project.ReleaseID == release.ID {
		return project, nil
	}
	projectmodel.NewProjectModel().Update(ctx, map[string]any{"id": project.ID}, map[string]any{
		"release_id": release.ID,
	})
	next := *project
	next.ReleaseID = release.ID
	return &next, nil
}

func resolveOptionalPublishedTeamRelease(ctx context.Context, teamID uint64, releaseID uint64) (teammodel.Team, teammodel.TeamRelease, error) {
	if teamID == 0 && releaseID == 0 {
		return teammodel.Team{}, teammodel.TeamRelease{}, nil
	}
	var release *teammodel.TeamRelease
	if releaseID > 0 {
		release = teammodel.NewTeamReleaseModel().Find(ctx, map[string]any{"id": releaseID})
		if release == nil {
			return teammodel.Team{}, teammodel.TeamRelease{}, fmt.Errorf("团队版本不存在")
		}
		teamID = release.TeamID
	}
	if teamID == 0 {
		return teammodel.Team{}, teammodel.TeamRelease{}, fmt.Errorf("团队不能为空")
	}
	team := teammodel.NewTeamModel().Find(ctx, map[string]any{
		"id":     teamID,
		"status": teammodel.StatusEnabled,
	})
	if team == nil {
		return teammodel.Team{}, teammodel.TeamRelease{}, fmt.Errorf("团队不存在")
	}
	if release == nil {
		release = teammodel.NewTeamReleaseModel().Find(ctx, map[string]any{"id": team.CurrentReleaseID})
	}
	if release == nil || release.TeamID != team.ID {
		return teammodel.Team{}, teammodel.TeamRelease{}, fmt.Errorf("团队尚未发布")
	}
	return *team, *release, nil
}

func projectPayload(project projectmodel.Project) map[string]any {
	return map[string]any{
		"id":         project.ID,
		"user_id":    project.UserID,
		"body_id":    project.BodyID,
		"team_id":    project.TeamID,
		"release_id": project.ReleaseID,
		"name":       project.Name,
		"mode":       projectMode(project),
		"status":     project.Status,
		"created_at": project.CreatedAt,
	}
}

func projectMode(project projectmodel.Project) string {
	if project.TeamID > 0 && project.ReleaseID > 0 {
		return "team"
	}
	return "canvas"
}
