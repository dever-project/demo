package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	workmodel "my/module/work/model"
	teammodel "my/package/bot/model/team"
	bodyservice "my/package/bot/service/body"
	teamservice "my/package/bot/service/team"
)

type ProjectService struct {
	body bodyservice.Service
	team teamservice.Service
}

func NewProjectService() ProjectService {
	return ProjectService{
		body: bodyservice.NewService(),
		team: teamservice.NewService(),
	}
}

func (s ProjectService) List(ctx context.Context) (map[string]any, error) {
	userID, err := CurrentUserID(ctx)
	if err != nil {
		return nil, err
	}
	rows := workmodel.NewProjectModel().Select(ctx, map[string]any{
		"user_id": userID,
		"status":  workmodel.StatusEnabled,
	})
	builder := newProjectPayloadBuilder(ctx)
	items := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		items = append(items, builder.Project(*row))
	}
	return map[string]any{"items": items}, nil
}

func (s ProjectService) TeamList(ctx context.Context) (map[string]any, error) {
	return s.team.TeamList(ctx)
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
	team, release, err := requirePublishedTeamRelease(ctx, teamID, releaseID)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	projectID := uint64(workmodel.NewProjectModel().Insert(ctx, map[string]any{
		"user_id":    userID,
		"team_id":    team.ID,
		"release_id": release.ID,
		"name":       name,
		"status":     workmodel.StatusEnabled,
		"created_at": now,
		"updated_at": now,
	}))
	if projectID == 0 {
		return nil, fmt.Errorf("创建项目失败")
	}

	bodyID, err := s.body.CreateCanvasBody(ctx, projectID, name)
	if err != nil {
		workmodel.NewProjectModel().Update(ctx, map[string]any{"id": projectID}, map[string]any{
			"status":     workmodel.StatusDisabled,
			"updated_at": time.Now(),
		})
		return nil, err
	}

	workmodel.NewProjectModel().Update(ctx, map[string]any{"id": projectID}, map[string]any{
		"body_id":    bodyID,
		"updated_at": time.Now(),
	})
	return s.Detail(ctx, projectID)
}

func (s ProjectService) Detail(ctx context.Context, projectID uint64) (map[string]any, error) {
	project, err := s.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	builder := newProjectPayloadBuilder(ctx)
	return map[string]any{"project": builder.Project(*project)}, nil
}

func (ProjectService) RequireProject(ctx context.Context, projectID uint64) (*workmodel.Project, error) {
	userID, err := CurrentUserID(ctx)
	if err != nil {
		return nil, err
	}
	if projectID == 0 {
		return nil, fmt.Errorf("项目不能为空")
	}
	project := workmodel.NewProjectModel().Find(ctx, map[string]any{
		"id":      projectID,
		"user_id": userID,
		"status":  workmodel.StatusEnabled,
	})
	if project == nil {
		return nil, fmt.Errorf("项目不存在")
	}
	return project, nil
}

func (s ProjectService) SyncProjectTeamRelease(ctx context.Context, project *workmodel.Project) (*workmodel.Project, error) {
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
	workmodel.NewProjectModel().Update(ctx, map[string]any{"id": project.ID}, map[string]any{
		"release_id": release.ID,
	})
	next := *project
	next.ReleaseID = release.ID
	return &next, nil
}

func requirePublishedTeamRelease(ctx context.Context, teamID uint64, releaseID uint64) (teammodel.Team, teammodel.TeamRelease, error) {
	if teamID == 0 && releaseID == 0 {
		return teammodel.Team{}, teammodel.TeamRelease{}, fmt.Errorf("请选择团队")
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
		return teammodel.Team{}, teammodel.TeamRelease{}, fmt.Errorf("请选择团队")
	}

	team := teammodel.NewTeamModel().Find(ctx, map[string]any{
		"id":     teamID,
		"status": teammodel.StatusEnabled,
	})
	if team == nil {
		return teammodel.Team{}, teammodel.TeamRelease{}, fmt.Errorf("团队不存在或未开启")
	}
	if release == nil {
		release = teammodel.NewTeamReleaseModel().Find(ctx, map[string]any{"id": team.CurrentReleaseID})
	}
	if release == nil || release.TeamID != team.ID || release.Status != teammodel.TeamReleaseStatusCurrent {
		return teammodel.Team{}, teammodel.TeamRelease{}, fmt.Errorf("团队尚未发布")
	}
	return *team, *release, nil
}

type projectPayloadBuilder struct {
	ctx      context.Context
	teams    map[uint64]*teammodel.Team
	releases map[uint64]*teammodel.TeamRelease
}

func newProjectPayloadBuilder(ctx context.Context) projectPayloadBuilder {
	return projectPayloadBuilder{
		ctx:      ctx,
		teams:    map[uint64]*teammodel.Team{},
		releases: map[uint64]*teammodel.TeamRelease{},
	}
}

func (b projectPayloadBuilder) Project(project workmodel.Project) map[string]any {
	return map[string]any{
		"id":          project.ID,
		"user_id":     project.UserID,
		"body_id":     project.BodyID,
		"team_id":     project.TeamID,
		"release_id":  project.ReleaseID,
		"name":        project.Name,
		"description": strings.TrimSpace(project.Description),
		"cover":       strings.TrimSpace(project.Cover),
		"mode":        projectMode(project),
		"status":      project.Status,
		"team":        b.Team(project.TeamID, project.ReleaseID),
		"created_at":  project.CreatedAt,
		"updated_at":  project.UpdatedAt,
	}
}

func (b projectPayloadBuilder) Team(teamID uint64, releaseID uint64) map[string]any {
	if teamID == 0 {
		return map[string]any{}
	}
	team := b.findTeam(teamID)
	if team == nil {
		return map[string]any{}
	}
	payload := map[string]any{
		"id":          team.ID,
		"name":        team.Name,
		"description": strings.TrimSpace(team.Description),
		"release_id":  releaseID,
	}
	if releaseID > 0 {
		if release := b.findRelease(releaseID); release != nil {
			payload["version"] = release.Version
			payload["release_status"] = release.Status
		}
	}
	return payload
}

func (b projectPayloadBuilder) findTeam(teamID uint64) *teammodel.Team {
	if teamID == 0 {
		return nil
	}
	if team, ok := b.teams[teamID]; ok {
		return team
	}
	team := teammodel.NewTeamModel().Find(b.ctx, map[string]any{"id": teamID})
	b.teams[teamID] = team
	return team
}

func (b projectPayloadBuilder) findRelease(releaseID uint64) *teammodel.TeamRelease {
	if releaseID == 0 {
		return nil
	}
	if release, ok := b.releases[releaseID]; ok {
		return release
	}
	release := teammodel.NewTeamReleaseModel().Find(b.ctx, map[string]any{"id": releaseID})
	b.releases[releaseID] = release
	return release
}

func projectMode(project workmodel.Project) string {
	if project.TeamID > 0 && project.ReleaseID > 0 {
		return "team"
	}
	return "canvas"
}
