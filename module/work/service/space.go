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
	agentaction "my/package/bot/service/agent/action"
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

type CanvasAgentRunRequest struct {
	FlowID      uint64
	AssetCateID uint64
	NodeKey     string
	NodeName    string
	AgentID     uint64
	Input       map[string]any
	RunID       uint64
	RequestID   string
	NodeRunID   uint64
	ReleaseID   uint64
}

type CanvasPowerRunRequest struct {
	teamservice.CanvasPowerRunRequest
	RunID     uint64
	NodeRunID uint64
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
		payload["assets"] = slimBootstrapAssets(items)
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

func (s SpaceService) SaveCanvas(ctx context.Context, projectID uint64, assetCateID uint64, baseRevision string, canvas map[string]any) (map[string]any, error) {
	project, err := s.project.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	clean, err := sanitizeCanvasPayload(assetCateID, canvas)
	if err != nil {
		return nil, err
	}
	nodes, err := marshalCleanCanvasList(clean.Nodes)
	if err != nil {
		return nil, fmt.Errorf("画布节点格式错误")
	}
	edges, err := marshalCleanCanvasList(clean.Edges)
	if err != nil {
		return nil, fmt.Errorf("画布连线格式错误")
	}
	viewport, err := marshalCleanCanvasObject(clean.Viewport)
	if err != nil {
		return nil, fmt.Errorf("画布视图格式错误")
	}
	model := workmodel.NewProjectCanvasModel()
	now := time.Now()
	row := model.Find(ctx, map[string]any{
		"project_id":    project.ID,
		"asset_cate_id": clean.AssetCateID,
	})
	if err := ensureCanvasRevision(row, baseRevision); err != nil {
		return nil, err
	}
	record := map[string]any{
		"nodes":      nodes,
		"edges":      edges,
		"viewport":   viewport,
		"updated_at": now,
	}
	if row == nil {
		record["project_id"] = project.ID
		record["asset_cate_id"] = clean.AssetCateID
		record["created_at"] = now
		model.Insert(ctx, record)
	} else {
		model.Update(ctx, map[string]any{"id": row.ID}, record)
	}
	return map[string]any{
		"canvas": decodeProjectCanvas(clean.AssetCateID, nodes, edges, viewport, now),
	}, nil
}

func (s SpaceService) SaveAssetEditVersion(ctx context.Context, projectID uint64, assetID uint64, versionID uint64, content any, requestID string) (map[string]any, error) {
	project, err := s.project.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	sourceAsset := s.asset.FindProjectAsset(ctx, project.ID, assetID)
	if sourceAsset == nil {
		return nil, fmt.Errorf("资产不存在")
	}
	if versionID > 0 {
		sourceVersion := s.asset.FindVersion(ctx, versionID)
		if sourceVersion == nil || sourceVersion.AssetID != sourceAsset.ID {
			return nil, fmt.Errorf("资产版本不存在")
		}
	}
	if existing := s.existingCanvasResultByRequestID(ctx, project.ID, sourceAsset.Role, SaveCanvasResultRequest{
		Purpose:   CanvasResultEdit,
		RequestID: strings.TrimSpace(requestID),
	}); len(existing) > 0 {
		return map[string]any{"asset": existing["asset"]}, nil
	}
	saved, err := withCanvasAssetVersionLock(ctx, project.ID, []string{
		fmt.Sprintf("asset:%d", sourceAsset.ID),
	}, func() (canvasSavedAssetVersion, error) {
		savedAsset, version, err := s.asset.SaveVersion(ctx, assetservice.SaveVersionRequest{
			ProjectID:   project.ID,
			BodyID:      project.BodyID,
			TeamID:      sourceAsset.TeamID,
			FlowID:      sourceAsset.FlowID,
			AssetCateID: sourceAsset.AssetCateID,
			ReleaseID:   project.ReleaseID,
			Name:        sourceAsset.Name,
			Kind:        sourceAsset.Kind,
			Role:        sourceAsset.Role,
			Content:     content,
			Sort:        sourceAsset.Sort,
		})
		return canvasSavedAssetVersion{Asset: savedAsset, Version: version}, err
	})
	if err != nil {
		return nil, err
	}
	if saved.Asset == nil || saved.Version == nil {
		return nil, fmt.Errorf("资产版本保存失败")
	}
	if strings.TrimSpace(requestID) != "" {
		s.recordCanvasResultAsset(ctx, project.ID, sourceAsset.AssetCateID, saved.Asset.ID, saved.Version.ID, CanvasResultEdit, "", "", sourceAsset.Name, SaveCanvasResultRequest{
			RequestID: strings.TrimSpace(requestID),
		}, project.ReleaseID)
	}
	return map[string]any{
		"asset": s.asset.AssetDetailMap(ctx, *saved.Asset, saved.Version),
	}, nil
}

func (s SpaceService) UseAssetVersion(ctx context.Context, projectID uint64, assetID uint64, versionID uint64) (map[string]any, error) {
	project, err := s.project.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	savedAsset, version, err := s.asset.UseVersion(ctx, project.ID, assetID, versionID)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"asset": s.asset.AssetDetailMap(ctx, *savedAsset, version),
	}, nil
}

func (s SpaceService) AssetDetail(ctx context.Context, projectID uint64, assetID uint64) (map[string]any, error) {
	project, err := s.project.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	asset := s.asset.FindProjectAsset(ctx, project.ID, assetID)
	if asset == nil {
		return nil, fmt.Errorf("资产不存在")
	}
	return map[string]any{
		"asset": s.asset.AssetDetailMap(ctx, *asset, nil),
	}, nil
}

func (s SpaceService) requireProjectAssetCate(ctx context.Context, teamID uint64, assetCateID uint64) (*teammodel.AssetCate, error) {
	if teamID == 0 || assetCateID == 0 {
		return nil, fmt.Errorf("资产分类不存在")
	}
	row := teammodel.NewAssetCateModel().Find(ctx, map[string]any{
		"id":      assetCateID,
		"team_id": teamID,
		"status":  teammodel.StatusEnabled,
	})
	if row == nil {
		return nil, fmt.Errorf("资产分类不存在")
	}
	return row, nil
}

func slimBootstrapAssets(value any) []any {
	switch items := value.(type) {
	case []map[string]any:
		result := make([]any, 0, len(items))
		for _, item := range items {
			result = append(result, slimBootstrapAsset(item))
		}
		return result
	case []any:
		result := make([]any, 0, len(items))
		for _, item := range items {
			if row, ok := item.(map[string]any); ok {
				result = append(result, slimBootstrapAsset(row))
				continue
			}
			result = append(result, item)
		}
		return result
	default:
		return []any{}
	}
}

func slimBootstrapAsset(item map[string]any) map[string]any {
	result := make(map[string]any, len(item))
	for key, value := range item {
		if key == "versions" {
			continue
		}
		if key == "version" {
			result[key] = slimBootstrapAssetVersion(value)
			continue
		}
		result[key] = value
	}
	return result
}

func slimBootstrapAssetVersion(value any) any {
	row, ok := value.(map[string]any)
	if !ok {
		return value
	}
	result := make(map[string]any, len(row))
	for key, current := range row {
		if key == "content" {
			continue
		}
		result[key] = current
	}
	return result
}

func (s SpaceService) PrepareUploadInit(ctx context.Context, projectID uint64, body map[string]any) error {
	project, err := s.project.RequireProject(ctx, projectID)
	if err != nil {
		return err
	}
	ruleID := spaceUploadRuleID(body)
	if ruleID == 0 {
		return fmt.Errorf("上传规则不能为空")
	}
	body["project_id"] = project.ID
	body["rule_id"] = ruleID
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
	return s.runFlow(ctx, projectID, flowID, "", input)
}

func (s SpaceService) runFlow(ctx context.Context, projectID uint64, flowID uint64, requestID string, input map[string]any) (map[string]any, error) {
	project, err := s.project.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	if flowID == 0 {
		return nil, fmt.Errorf("请选择流程")
	}
	if started := canvasProjectRunRef(ctx, project.ID, requestID); len(started) > 0 {
		return started, nil
	}
	return s.team.RunFlow(ctx, teamservice.RunRequest{
		TeamID:    project.TeamID,
		FlowID:    flowID,
		ReleaseID: project.ReleaseID,
		ProjectID: project.ID,
		RequestID: strings.TrimSpace(requestID),
		Input:     input,
		Mode:      "sub_flow",
	})
}

func (s SpaceService) RunStatus(ctx context.Context, projectID uint64, runID uint64, requestID string) (map[string]any, error) {
	project, err := s.project.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	if run := resolveCanvasRun(ctx, project.ID, runID, requestID); run != nil {
		if run.Status == teammodel.RunStatusRunning {
			if !s.dispatchRunnableCanvasRun(ctx, project.ID, run) {
				if refreshed := resolveCanvasRun(ctx, project.ID, runID, requestID); refreshed != nil {
					run = refreshed
				}
			}
		}
		return s.canvasRunRecordPayload(ctx, project.ID, run)
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

func (s SpaceService) RunCanvasPower(ctx context.Context, projectID uint64, req CanvasPowerRunRequest) (map[string]any, error) {
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
	powerReq := req.CanvasPowerRunRequest
	powerReq.ProjectID = project.ID
	powerReq.BodyID = project.BodyID
	powerReq.TeamID = project.TeamID
	powerReq.ReleaseID = project.ReleaseID
	powerReq.NodeName = s.canvasResultAssetName(
		ctx,
		project.ID,
		powerReq.AssetCateID,
		"material",
		CanvasResultMaterial,
		strings.TrimSpace(powerReq.NodeKey),
		"",
		powerReq.NodeName,
	)
	result, err := withCanvasAssetVersionLock(ctx, project.ID, canvasResultVersionLockParts(
		powerReq.AssetCateID,
		assetservice.NormalizeRole("material"),
		CanvasResultMaterial,
		strings.TrimSpace(powerReq.NodeKey),
		"",
		powerReq.NodeName,
	), func() (map[string]any, error) {
		return s.team.RunCanvasPower(ctx, powerReq)
	})
	if err != nil {
		return result, err
	}
	if result == nil {
		result = map[string]any{}
	}
	if _, ok := result["persists_result"]; !ok {
		result["persists_result"] = true
	}
	if _, ok := result["role"]; !ok {
		result["role"] = "material"
	}
	if _, ok := result["node_key"]; !ok && strings.TrimSpace(req.NodeKey) != "" {
		result["node_key"] = strings.TrimSpace(req.NodeKey)
	}
	if _, ok := result["node_type"]; !ok {
		result["node_type"] = "power"
	}
	s.recordCanvasPowerResult(ctx, project.ID, powerReq, req.RunID, req.NodeRunID, result)
	return result, nil
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
	requestID := strings.TrimSpace(req.RequestID)
	if existing := canvasAgentRunRecord(ctx, 0, requestID); existing != nil {
		result, err := waitCanvasAgentRunCompletion(ctx, existing)
		if err != nil {
			return nil, err
		}
		s.recordCanvasAgentRunInput(ctx, req.NodeRunID, input, nil)
		return s.finishCanvasAgentResult(ctx, project, *agent, req, input, result)
	}
	memoryScope := CanvasAgentMemoryScope{
		ProjectID:   project.ID,
		AssetCateID: req.AssetCateID,
		NodeKey:     req.NodeKey,
		AgentID:     req.AgentID,
		RunID:       req.RunID,
		NodeRunID:   req.NodeRunID,
	}
	history := s.canvasAgentHistory(ctx, memoryScope)
	s.recordCanvasAgentRunInput(ctx, req.NodeRunID, input, history)
	var internalRunID uint64
	var internalRequestID string
	result, err := s.agent.RunInternal(ctx, agentservice.InternalRunRequest{
		AgentID:   req.AgentID,
		RequestID: requestID,
		Input:     input,
		History:   history,
		Options:   map[string]any{"full_runtime": true},
		OnRunCreated: func(runID uint64, requestID string) {
			internalRunID = runID
			internalRequestID = strings.TrimSpace(requestID)
			s.recordCanvasAgentRunRef(ctx, req.NodeRunID, internalRunID, internalRequestID)
		},
	})
	if err != nil {
		if fallback := canvasAgentFallbackResult(ctx, internalRunID, internalRequestID, result); len(fallback.Output) > 0 {
			result = fallback
		} else {
			return map[string]any{
				"run_id":     result.RunID,
				"request_id": result.RequestID,
				"status":     "fail",
				"output":     result.Output,
			}, err
		}
	}
	return s.finishCanvasAgentResult(ctx, project, *agent, req, input, result)
}

func (s SpaceService) recordCanvasAgentRunInput(ctx context.Context, nodeRunID uint64, input map[string]any, history []any) {
	patch := map[string]any{
		"agent_input": cloneSpaceInput(input),
	}
	if history != nil {
		patch["agent_history"] = history
	}
	s.mergeCanvasNodeInput(ctx, nodeRunID, patch)
}

func (s SpaceService) recordCanvasAgentRunRef(ctx context.Context, nodeRunID uint64, runID uint64, requestID string) {
	patch := map[string]any{}
	if runID > 0 {
		patch["agent_run_id"] = runID
	}
	if strings.TrimSpace(requestID) != "" {
		patch["agent_request_id"] = strings.TrimSpace(requestID)
	}
	s.mergeCanvasNodeInput(ctx, nodeRunID, patch)
}

func (s SpaceService) finishCanvasAgentResult(
	ctx context.Context,
	project *workmodel.Project,
	agent agentmodel.Agent,
	req CanvasAgentRunRequest,
	input map[string]any,
	result agentservice.InternalRunResult,
) (map[string]any, error) {
	if project == nil {
		return nil, fmt.Errorf("项目不存在")
	}
	s.recordCanvasAgentRunRef(ctx, req.NodeRunID, result.RunID, result.RequestID)
	memoryScope := CanvasAgentMemoryScope{
		ProjectID:   project.ID,
		AssetCateID: req.AssetCateID,
		NodeKey:     req.NodeKey,
		AgentID:     req.AgentID,
		RunID:       req.RunID,
		NodeRunID:   req.NodeRunID,
		AgentRunID:  result.RunID,
	}
	if interaction := canvasAgentInteraction(result.Output); len(interaction) > 0 {
		s.appendCanvasAgentMemory(ctx, memoryScope,
			canvasAgentUserMemory(input),
			canvasAgentAssistantMemory(
				result.Output,
				canvasAgentInteractionMemoryText(interaction, result.Summary),
			),
		)
		return map[string]any{
			"run_id":      result.RunID,
			"request_id":  result.RequestID,
			"status":      "waiting",
			"output":      result.Output,
			"interaction": interaction,
			"text":        strings.TrimSpace(result.Summary),
			"pending":     true,
		}, nil
	}
	nodeName := strings.TrimSpace(req.NodeName)
	if nodeName == "" {
		nodeName = strings.TrimSpace(agent.Name)
	}
	if nodeName == "" {
		nodeName = "智能体运行结果"
	}
	saved, err := s.SaveCanvasMaterial(ctx, project.ID, SaveCanvasResultRequest{
		AssetCateID: req.AssetCateID,
		Name:        nodeName,
		Kind:        "text",
		Content:     result.Output,
		RunID:       req.RunID,
		NodeRunID:   req.NodeRunID,
		ReleaseID:   firstUint64(req.ReleaseID, project.ReleaseID),
		NodeKey:     req.NodeKey,
	})
	if err != nil {
		return nil, err
	}
	asset := spaceMapValue(saved["asset"])
	version := spaceMapValue(saved["version"])
	response := map[string]any{
		"run_id":          req.RunID,
		"request_id":      result.RequestID,
		"node_run_id":     req.NodeRunID,
		"release_id":      firstUint64(req.ReleaseID, project.ReleaseID),
		"agent_run_id":    result.RunID,
		"persists_result": true,
		"role":            "material",
		"status":          "success",
		"output":          result.Output,
		"asset":           asset,
		"version":         version,
	}
	s.appendCanvasAgentMemory(ctx, memoryScope,
		canvasAgentUserMemory(input),
		canvasAgentFeedbackMemory(input),
		canvasAgentAssistantMemory(result.Output, result.Summary),
	)
	return response, nil
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
	for _, key := range []string{"rule_id", "upload_rule_id"} {
		if value := uint64Value(body[key]); value > 0 {
			return value
		}
	}
	return 0
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
		result[key] = decodeProjectCanvas(row.AssetCateID, row.Nodes, row.Edges, row.Viewport, row.UpdatedAt)
	}
	return result
}

func decodeProjectCanvas(assetCateID uint64, nodes string, edges string, viewport string, updatedAt time.Time) map[string]any {
	result := map[string]any{
		"asset_cate_id": assetCateID,
		"nodes":         jsonList(nodes),
		"edges":         jsonList(edges),
		"viewport":      jsonObject(viewport),
	}
	if !updatedAt.IsZero() {
		result["updated_at"] = updatedAt.UTC().Format(time.RFC3339Nano)
	}
	return result
}

func ensureCanvasRevision(row *workmodel.ProjectCanvas, baseRevision string) error {
	if row == nil {
		return nil
	}
	if strings.TrimSpace(baseRevision) == "" {
		return nil
	}
	if canvasRevision(row.UpdatedAt) != strings.TrimSpace(baseRevision) {
		return fmt.Errorf("画布已被其他页面更新，请刷新后再保存")
	}
	return nil
}

func canvasRevision(updatedAt time.Time) string {
	if updatedAt.IsZero() {
		return ""
	}
	return updatedAt.UTC().Format(time.RFC3339Nano)
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

func canvasAgentInteraction(output map[string]any) map[string]any {
	if len(output) == 0 {
		return nil
	}
	if !strings.EqualFold(spaceTextValue(output["event"]), "interaction") {
		return nil
	}
	interaction := spaceMapValue(output["interaction"])
	if spaceTextValue(interaction["type"]) == "" {
		return nil
	}
	return interaction
}

func canvasAgentFallbackOutput(output map[string]any, summary string) map[string]any {
	fallback := agentaction.NormalizeAgentFinalOutput(output, summary)
	if !agentaction.HasDisplayOutput(fallback) {
		return nil
	}
	return fallback
}

func canvasAgentFallbackResult(ctx context.Context, runID uint64, requestID string, current agentservice.InternalRunResult) agentservice.InternalRunResult {
	if fallback := canvasAgentFallbackOutput(current.Output, current.Summary); len(fallback) > 0 {
		current.Output = fallback
		current.Summary = strings.TrimSpace(spaceTextValue(fallback["text"]))
		return current
	}
	run := canvasAgentRunRecord(ctx, firstUint64(current.RunID, runID), firstText(current.RequestID, requestID))
	if run == nil {
		return agentservice.InternalRunResult{}
	}
	output := canvasAgentFallbackOutput(internalCanvasAgentOutput(run.Output), "")
	if len(output) == 0 {
		return agentservice.InternalRunResult{}
	}
	return agentservice.InternalRunResult{
		Output:    output,
		Summary:   strings.TrimSpace(agentaction.SummaryText(output)),
		RequestID: firstText(current.RequestID, run.RequestID, requestID),
		RunID:     firstUint64(current.RunID, run.ID, runID),
	}
}

func waitCanvasAgentRunCompletion(ctx context.Context, run *agentmodel.Run) (agentservice.InternalRunResult, error) {
	if run == nil {
		return agentservice.InternalRunResult{}, fmt.Errorf("智能体运行不存在")
	}
	var current *agentmodel.Run
	for index := 0; index < canvasFlowPollAttempts; index++ {
		current = run
		if index > 0 {
			current = agentmodel.NewRunModel().Find(ctx, map[string]any{"id": run.ID})
		}
		if current == nil {
			return agentservice.InternalRunResult{}, fmt.Errorf("智能体运行不存在")
		}
		output := internalCanvasAgentOutput(current.Output)
		result := agentservice.InternalRunResult{
			Output:    output,
			Summary:   strings.TrimSpace(agentaction.SummaryText(output)),
			RequestID: current.RequestID,
			RunID:     current.ID,
		}
		switch current.Status {
		case teammodel.RunStatusSuccess:
			return result, nil
		case teammodel.RunStatusFail, teammodel.RunStatusCanceled:
			return result, fmt.Errorf("%s", firstText(current.Error, result.Summary, "智能体运行失败"))
		}
		select {
		case <-ctx.Done():
			return agentservice.InternalRunResult{}, ctx.Err()
		case <-time.After(canvasFlowPollInterval):
		}
	}
	if current == nil {
		return agentservice.InternalRunResult{}, fmt.Errorf("%w: 智能体仍在运行，请稍后刷新查看结果", errCanvasExternalStillRunning)
	}
	output := internalCanvasAgentOutput(current.Output)
	return agentservice.InternalRunResult{
		Output:    output,
		Summary:   strings.TrimSpace(agentaction.SummaryText(output)),
		RequestID: current.RequestID,
		RunID:     current.ID,
	}, fmt.Errorf("%w: 智能体仍在运行，请稍后刷新查看结果", errCanvasExternalStillRunning)
}

func canvasAgentRunRecord(ctx context.Context, runID uint64, requestID string) *agentmodel.Run {
	if runID > 0 {
		if run := agentmodel.NewRunModel().Find(ctx, map[string]any{"id": runID}); run != nil {
			return run
		}
	}
	requestID = strings.TrimSpace(requestID)
	if requestID == "" {
		return nil
	}
	return agentmodel.NewRunModel().Find(ctx, map[string]any{"request_id": requestID})
}

func internalCanvasAgentOutput(raw string) map[string]any {
	var value any
	if err := json.Unmarshal([]byte(strings.TrimSpace(raw)), &value); err != nil {
		if text := strings.TrimSpace(raw); text != "" {
			return map[string]any{"text": text}
		}
		return map[string]any{}
	}
	if row, ok := value.(map[string]any); ok {
		return row
	}
	if text := spaceTextValue(value); text != "" {
		return map[string]any{"text": text}
	}
	if value != nil {
		return map[string]any{"value": value}
	}
	return map[string]any{}
}

func firstUint64(values ...uint64) uint64 {
	for _, value := range values {
		if value > 0 {
			return value
		}
	}
	return 0
}

func firstText(values ...any) string {
	for _, value := range values {
		if text := spaceTextValue(value); text != "" {
			return text
		}
	}
	return ""
}

func spaceMapValue(raw any) map[string]any {
	if value, ok := raw.(map[string]any); ok && value != nil {
		return value
	}
	return nil
}

func spaceTextValue(raw any) string {
	switch value := raw.(type) {
	case string:
		return strings.TrimSpace(value)
	case fmt.Stringer:
		return strings.TrimSpace(value.String())
	default:
		text := strings.TrimSpace(fmt.Sprint(raw))
		if text == "<nil>" {
			return ""
		}
		return text
	}
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
