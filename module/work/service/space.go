package service

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	workmodel "my/module/work/model"
	agentmodel "my/package/bot/model/agent"
	teammodel "my/package/bot/model/team"
	agentservice "my/package/bot/service/agent"
	assetservice "my/package/bot/service/asset"
	bodyservice "my/package/bot/service/body"
	teamservice "my/package/bot/service/team"
	uploadrepo "my/package/front/service/upload/repository"
)

type SpaceService struct {
	project ProjectService
	agent   agentservice.Service
	asset   assetservice.Service
	team    teamservice.Service
}

const spaceDefaultUploadRuleID uint64 = 7

type CanvasAgentRunRequest struct {
	FlowID   uint64
	NodeKey  string
	NodeName string
	AgentID  uint64
	Input    map[string]any
}

func NewSpaceService() SpaceService {
	return SpaceService{
		project: NewProjectService(),
		agent:   agentservice.NewService(),
		asset:   assetservice.NewService(),
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
		"canvases":           map[string]any{},
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

	payload["canvases"] = s.projectCanvases(ctx, project.ID)

	return payload, nil
}

func (s SpaceService) SaveCanvas(ctx context.Context, projectID uint64, assetCateID uint64, canvas map[string]any) (map[string]any, error) {
	project, err := s.project.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	nodes, err := marshalCanvasList(canvas["nodes"])
	if err != nil {
		return nil, fmt.Errorf("画布节点格式错误")
	}
	edges, err := marshalCanvasList(canvas["edges"])
	if err != nil {
		return nil, fmt.Errorf("画布连线格式错误")
	}
	viewport, err := marshalCanvasObject(canvas["viewport"])
	if err != nil {
		return nil, fmt.Errorf("画布视图格式错误")
	}
	model := workmodel.NewProjectCanvasModel()
	now := time.Now()
	row := model.Find(ctx, map[string]any{
		"project_id":    project.ID,
		"asset_cate_id": assetCateID,
	})
	record := map[string]any{
		"nodes":      nodes,
		"edges":      edges,
		"viewport":   viewport,
		"updated_at": now,
	}
	if row == nil {
		record["project_id"] = project.ID
		record["asset_cate_id"] = assetCateID
		record["created_at"] = now
		model.Insert(ctx, record)
	} else {
		model.Update(ctx, map[string]any{"id": row.ID}, record)
	}
	return map[string]any{
		"canvas": decodeProjectCanvas(assetCateID, nodes, edges, viewport),
	}, nil
}

func (s SpaceService) SaveAssetVersion(ctx context.Context, projectID uint64, assetID uint64, content any) (map[string]any, error) {
	project, err := s.project.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	asset := s.asset.FindProjectAsset(ctx, project.ID, assetID)
	if asset == nil {
		return nil, fmt.Errorf("资产不存在")
	}
	savedAsset, version, err := s.asset.SaveVersion(ctx, assetservice.SaveVersionRequest{
		ProjectID:   asset.ProjectID,
		BodyID:      asset.BodyID,
		TeamID:      asset.TeamID,
		FlowID:      asset.FlowID,
		AssetCateID: asset.AssetCateID,
		ReleaseID:   project.ReleaseID,
		Name:        asset.Name,
		Kind:        asset.Kind,
		Content:     content,
		Sort:        asset.Sort,
	})
	if err != nil {
		return nil, err
	}
	item := assetservice.AssetToMap(*savedAsset)
	item["version"] = assetservice.VersionToMap(*version)
	return map[string]any{
		"asset": item,
	}, nil
}

func (s SpaceService) PrepareUploadInit(ctx context.Context, projectID uint64, body map[string]any) error {
	project, err := s.project.RequireProject(ctx, projectID)
	if err != nil {
		return err
	}
	body["project_id"] = project.ID
	body["rule_id"] = spaceUploadRuleID(body)
	body["biz_key"] = spaceUploadBizKey(project.ID)
	body["biz_name"] = fmt.Sprintf("作品 %d", project.ID)
	return nil
}

func (s SpaceService) RequireUploadSession(ctx context.Context, projectID uint64, sessionID uint64) error {
	project, err := s.project.RequireProject(ctx, projectID)
	if err != nil {
		return err
	}
	if sessionID == 0 {
		return fmt.Errorf("上传会话不能为空")
	}
	session, err := uploadrepo.FindUploadSession(ctx, sessionID)
	if err != nil {
		return err
	}
	if session.BizKey != spaceUploadBizKey(project.ID) {
		return fmt.Errorf("上传会话无权访问")
	}
	return nil
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

func (s SpaceService) RunStatus(ctx context.Context, projectID uint64, runID uint64, requestID string) (map[string]any, error) {
	project, err := s.project.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	return s.team.ProjectRunStatus(ctx, project.ID, runID, requestID)
}

func (s SpaceService) SubmitApproval(ctx context.Context, projectID uint64, approvalID uint64, decision string, comment string, data map[string]any) (map[string]any, error) {
	project, err := s.project.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	return s.team.SubmitProjectApproval(ctx, project.ID, approvalID, decision, comment, data)
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

func (s SpaceService) RunCanvasAgent(ctx context.Context, projectID uint64, req CanvasAgentRunRequest) (map[string]any, error) {
	project, err := s.project.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	project, err = s.project.SyncProjectTeamRelease(ctx, project)
	if err != nil {
		return nil, err
	}
	if err := requireBodyAgent(ctx, s.project.body, project.BodyID, req.AgentID); err != nil {
		return nil, err
	}
	agent := agentmodel.NewAgentModel().Find(ctx, map[string]any{
		"id":     req.AgentID,
		"status": teammodel.StatusEnabled,
	})
	if agent == nil {
		return nil, fmt.Errorf("智能体不存在或未开启")
	}
	input := cloneSpaceInput(req.Input)
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
		TeamID:    project.TeamID,
		ReleaseID: project.ReleaseID,
		FlowID:    req.FlowID,
		RunID:     result.RunID,
		Name:      nodeName,
		Kind:      "text",
		Content:   result.Output,
	})
	if err != nil {
		return nil, err
	}
	item := assetservice.AssetToMap(*asset)
	item["version"] = assetservice.VersionToMap(*version)
	return map[string]any{
		"run_id":     result.RunID,
		"request_id": result.RequestID,
		"status":     "success",
		"output":     result.Output,
		"asset":      item,
		"version":    assetservice.VersionToMap(*version),
	}, nil
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

func spaceUploadRuleID(body map[string]any) uint64 {
	for _, key := range []string{"rule_id", "ruleId", "upload_rule_id", "uploadRuleId"} {
		if value := uint64Value(body[key]); value > 0 {
			return value
		}
	}
	return spaceDefaultUploadRuleID
}

func spaceUploadBizKey(projectID uint64) string {
	return fmt.Sprintf("work-project-%d", projectID)
}

func uint64Value(value any) uint64 {
	switch current := value.(type) {
	case uint64:
		return current
	case uint:
		return uint64(current)
	case int:
		if current > 0 {
			return uint64(current)
		}
	case int64:
		if current > 0 {
			return uint64(current)
		}
	case float64:
		if current > 0 {
			return uint64(current)
		}
	case string:
		var parsed uint64
		if _, err := fmt.Sscanf(strings.TrimSpace(current), "%d", &parsed); err == nil {
			return parsed
		}
	}
	return 0
}

func (s SpaceService) projectCanvases(ctx context.Context, projectID uint64) map[string]any {
	rows := workmodel.NewProjectCanvasModel().Select(ctx, map[string]any{
		"project_id": projectID,
	})
	result := make(map[string]any, len(rows))
	for _, row := range rows {
		if row == nil {
			continue
		}
		key := fmt.Sprintf("%d", row.AssetCateID)
		result[key] = decodeProjectCanvas(row.AssetCateID, row.Nodes, row.Edges, row.Viewport)
	}
	return result
}

func decodeProjectCanvas(assetCateID uint64, nodes string, edges string, viewport string) map[string]any {
	return map[string]any{
		"asset_cate_id": assetCateID,
		"nodes":         jsonList(nodes),
		"edges":         jsonList(edges),
		"viewport":      jsonObject(viewport),
	}
}

func marshalCanvasList(value any) (string, error) {
	if value == nil {
		value = []any{}
	}
	items, ok := value.([]any)
	if !ok {
		return "", fmt.Errorf("expected list")
	}
	content, err := json.Marshal(items)
	if err != nil {
		return "", err
	}
	return string(content), nil
}

func marshalCanvasObject(value any) (string, error) {
	if value == nil {
		value = map[string]any{}
	}
	row, ok := value.(map[string]any)
	if !ok {
		return "", fmt.Errorf("expected object")
	}
	content, err := json.Marshal(row)
	if err != nil {
		return "", err
	}
	return string(content), nil
}

func jsonList(text string) []any {
	result := []any{}
	if err := json.Unmarshal([]byte(strings.TrimSpace(text)), &result); err != nil {
		return []any{}
	}
	return result
}

func jsonObject(text string) map[string]any {
	result := map[string]any{}
	if err := json.Unmarshal([]byte(strings.TrimSpace(text)), &result); err != nil {
		return map[string]any{}
	}
	return result
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

func cloneSpaceInput(input map[string]any) map[string]any {
	result := map[string]any{}
	for key, value := range input {
		result[key] = value
	}
	return result
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
