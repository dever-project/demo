package service

import (
	"context"
	"encoding/json"
	"fmt"
	"hash/fnv"
	"strings"
	"time"

	"github.com/google/uuid"

	teammodel "my/package/bot/model/team"
)

type RunCanvasRequest struct {
	AssetCateID uint64
	StartNodeID string
	RequestID   string
	SingleNode  bool
	Canvas      map[string]any
	Input       map[string]any
}

type FinishCanvasRunRequest struct {
	RunID     uint64
	RequestID string
	Status    string
	Output    any
	Error     string
	run       *teammodel.Run
}

type FinishCanvasNodeRunRequest struct {
	RunID      uint64
	RequestID  string
	NodeRunID  uint64
	NodeKey    string
	Status     string
	Output     any
	Error      string
	AgentRunID uint64
	run        *teammodel.Run
	nodeRun    *teammodel.NodeRun
}

type ResumeCanvasRunRequest struct {
	RunID      uint64
	RequestID  string
	NodeKey    string
	ApprovalID uint64
	Decision   string
	Comment    string
	Feedback   map[string]any
}

func (req FinishCanvasRunRequest) withRun(run *teammodel.Run) FinishCanvasRunRequest {
	req.run = run
	return req
}

func (req FinishCanvasNodeRunRequest) withRecords(run *teammodel.Run, nodeRun *teammodel.NodeRun) FinishCanvasNodeRunRequest {
	req.run = run
	req.nodeRun = nodeRun
	return req
}

type canvasRunNode struct {
	ID             string
	Type           string
	Title          string
	Kind           string
	FunctionKey    string
	AssetCateID    uint64
	FlowID         uint64
	PowerID        uint64
	PowerKey       string
	PowerKind      string
	AgentID        uint64
	AssetID        uint64
	AssetVersionID uint64
	ComposerPrompt string
	ComposerParams map[string]any
	SourceTargetID uint64
	PersistsResult bool
}

type canvasRunEdge struct {
	ID   string
	From string
	To   string
}

type canvasExecutionPlan struct {
	Start    canvasRunNode
	Nodes    []canvasRunNode
	Edges    []canvasRunEdge
	Incoming map[string][]string
	Outgoing map[string][]string
	Order    []string
}

func (s SpaceService) RunCanvas(ctx context.Context, projectID uint64, req RunCanvasRequest) (map[string]any, error) {
	project, err := s.project.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	project, err = s.project.SyncProjectTeamRelease(ctx, project)
	if err != nil {
		return nil, err
	}
	requestID, err := normalizeCanvasRequestID(req.RequestID)
	if err != nil {
		return nil, err
	}
	if requestID == "" {
		requestID = uuid.NewString()
	} else if existing := findCanvasRunByRequestID(ctx, project.ID, requestID); existing != nil {
		return s.canvasRunRecordPayload(ctx, project.ID, existing)
	}
	clean, err := sanitizeCanvasPayload(req.AssetCateID, req.Canvas)
	if err != nil {
		return nil, err
	}
	nodes := canvasRunNodes(clean.Nodes)
	edges := canvasRunEdges(clean.Edges)
	if err := validateCanvasRunGraph(nodes, edges); err != nil {
		return nil, err
	}
	startNodeID := strings.TrimSpace(req.StartNodeID)
	if startNodeID == "" {
		return nil, fmt.Errorf("请选择开始节点")
	}
	startNode, ok := nodes[startNodeID]
	if !ok {
		return nil, fmt.Errorf("开始节点不存在")
	}
	if !req.SingleNode && !isCanvasStartNode(startNode) {
		return nil, fmt.Errorf("请选择开始节点运行")
	}
	plan := buildCanvasRunExecutionPlan(startNodeID, nodes, edges, req.SingleNode)
	if !req.SingleNode && len(plan.Nodes) == 0 {
		return nil, fmt.Errorf("开始节点没有连接后续节点")
	}
	if !req.SingleNode {
		if err := validateCanvasExecutionPlan(plan); err != nil {
			return nil, err
		}
	}
	runInput := map[string]any{
		"_mode":          "work_canvas",
		"_asset_cate_id": clean.AssetCateID,
		"_start_node_id": startNodeID,
		"_single_node":   req.SingleNode,
		"input":          cloneCanvasRunInput(req.Input),
		"canvas": map[string]any{
			"asset_cate_id": clean.AssetCateID,
			"nodes":         clean.Nodes,
			"edges":         clean.Edges,
			"viewport":      clean.Viewport,
		},
	}
	now := time.Now()
	runID := uint64(teammodel.NewRunModel().Insert(ctx, map[string]any{
		"request_id": requestID,
		"project_id": project.ID,
		"team_id":    project.TeamID,
		"release_id": project.ReleaseID,
		"input":      canvasRunJSON(runInput),
		"output":     "{}",
		"error":      "",
		"status":     teammodel.RunStatusRunning,
		"started_at": now,
		"created_at": now,
		"updated_at": now,
	}))
	if runID == 0 {
		return nil, fmt.Errorf("创建画布运行失败")
	}
	flowRunID := createCanvasFlowRun(ctx, project.ID, project.TeamID, runID, requestID, runInput, now)
	if flowRunID == 0 {
		err := fmt.Errorf("创建画布流程运行失败")
		failCanvasRunCreation(ctx, runID, err)
		return nil, err
	}
	nodeRunPayloads, err := createCanvasNodeRuns(ctx, project.ID, project.TeamID, runID, flowRunID, requestID, canvasRunTrackedNodes(plan), now)
	if err != nil {
		failCanvasRunCreation(ctx, runID, err)
		return nil, err
	}
	exec := canvasRunExecution{
		projectID:   project.ID,
		userID:      project.UserID,
		teamID:      project.TeamID,
		releaseID:   project.ReleaseID,
		assetCateID: clean.AssetCateID,
		runID:       runID,
		requestID:   requestID,
		flowRunID:   flowRunID,
		startNodeID: startNodeID,
		plan:        plan,
		nodeRuns:    canvasNodeRunIDMap(nodeRunPayloads),
		manualInput: canvasManualInputContext(runInput),
	}
	if !req.SingleNode {
		if err := s.markCanvasStartNodeRun(ctx, exec, startNode); err != nil {
			failCanvasRunCreation(ctx, runID, err)
			s.writeCanvasRunResult(ctx, exec, map[string]any{
				"run_id":     runID,
				"request_id": requestID,
				"status":     teammodel.RunStatusFail,
				"error":      err.Error(),
			}, err.Error(), 2)
			return nil, err
		}
	}
	nodeRunPayloads = canvasRunNodePayloadsFromRows(ctx, plan, runID)
	payload := canvasRunStartedPayload(runID, requestID, flowRunID, project.ReleaseID, startNodeID, teammodel.RunStatusRunning, nodeRunPayloads, plan)
	if result := s.dispatchCanvasRunWithResult(exec); result == canvasRunDispatchFailed {
		err := fmt.Errorf("画布运行调度失败")
		failCanvasRunCreation(ctx, runID, err)
		s.writeCanvasRunResult(ctx, exec, map[string]any{
			"run_id":     runID,
			"request_id": requestID,
			"status":     teammodel.RunStatusFail,
			"error":      err.Error(),
		}, err.Error(), 2)
		return nil, err
	}
	return payload, nil
}

func canvasRunStartedPayload(
	runID uint64,
	requestID string,
	flowRunID uint64,
	releaseID uint64,
	startNodeID string,
	status string,
	nodeRunPayloads []map[string]any,
	plan canvasExecutionPlan,
) map[string]any {
	nodeType := plan.Start.Type
	if nodeType == "" {
		nodeType = "function"
	}
	return map[string]any{
		"run_id":          runID,
		"request_id":      requestID,
		"flow_run_id":     flowRunID,
		"release_id":      releaseID,
		"status":          status,
		"node_key":        startNodeID,
		"node_type":       nodeType,
		"persists_result": false,
		"node_runs":       nodeRunPayloads,
		"targets":         canvasRunTargetPayloads(plan.Nodes),
		"execution_plan":  canvasRunExecutionPlanPayload(plan),
	}
}

func failCanvasRunCreation(ctx context.Context, runID uint64, err error) {
	if runID == 0 || err == nil {
		return
	}
	now := time.Now()
	teammodel.NewRunModel().Update(ctx, map[string]any{"id": runID}, map[string]any{
		"status":      teammodel.RunStatusFail,
		"output":      "{}",
		"error":       err.Error(),
		"finished_at": now,
		"updated_at":  now,
	})
	finishCanvasFlowRuns(ctx, runID, teammodel.RunStatusFail, nil, err.Error(), now)
	finishCanvasNodeRuns(ctx, runID, teammodel.RunStatusFail, err.Error(), now)
}

func (s SpaceService) FinishCanvasRun(ctx context.Context, projectID uint64, req FinishCanvasRunRequest) (map[string]any, error) {
	project, err := s.project.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	run, err := s.requireCanvasRun(ctx, project.ID, req.RunID, req.RequestID)
	if err != nil {
		return nil, err
	}
	return s.finishCanvasRunRecord(ctx, project.ID, req.withRun(run)), nil
}

func (s SpaceService) finishCanvasRunRecord(ctx context.Context, projectID uint64, req FinishCanvasRunRequest) map[string]any {
	run := req.run
	if run == nil {
		run = teammodel.NewRunModel().Find(ctx, map[string]any{
			"id":         req.RunID,
			"project_id": projectID,
		})
	}
	if run == nil {
		return map[string]any{
			"run_id":     req.RunID,
			"request_id": strings.TrimSpace(req.RequestID),
			"status":     teammodel.RunStatusFail,
		}
	}
	status := canvasRunFinishStatus(req.Status)
	now := time.Now()
	record := map[string]any{
		"status":      status,
		"output":      canvasRunJSON(req.Output),
		"error":       strings.TrimSpace(req.Error),
		"finished_at": now,
		"updated_at":  now,
	}
	teammodel.NewRunModel().Update(ctx, map[string]any{"id": run.ID}, record)
	finishCanvasFlowRuns(ctx, run.ID, status, req.Output, req.Error, now)
	finishCanvasNodeRuns(ctx, run.ID, status, req.Error, now)
	return map[string]any{
		"run_id":     run.ID,
		"request_id": run.RequestID,
		"status":     status,
	}
}

func (s SpaceService) FinishCanvasNodeRun(ctx context.Context, projectID uint64, req FinishCanvasNodeRunRequest) (map[string]any, error) {
	project, err := s.project.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	run, err := s.requireCanvasRun(ctx, project.ID, req.RunID, req.RequestID)
	if err != nil {
		return nil, err
	}
	nodeRun, err := s.requireCanvasNodeRun(ctx, run.ID, req.NodeRunID, req.NodeKey)
	if err != nil {
		return nil, err
	}
	return s.finishCanvasNodeRunRecord(ctx, req.withRecords(run, nodeRun))
}

func (s SpaceService) finishCanvasNodeRunRecord(ctx context.Context, req FinishCanvasNodeRunRequest) (map[string]any, error) {
	run := req.run
	if run == nil {
		run = teammodel.NewRunModel().Find(ctx, map[string]any{"id": req.RunID})
	}
	if run == nil {
		return nil, fmt.Errorf("画布运行不存在")
	}
	nodeRun := req.nodeRun
	if nodeRun == nil {
		filter := map[string]any{"run_id": run.ID}
		if req.NodeRunID > 0 {
			filter["id"] = req.NodeRunID
		} else if strings.TrimSpace(req.NodeKey) != "" {
			filter["node_key"] = strings.TrimSpace(req.NodeKey)
		} else {
			return nil, fmt.Errorf("节点运行ID不能为空")
		}
		nodeRun = teammodel.NewNodeRunModel().Find(ctx, filter)
	}
	if nodeRun == nil {
		return nil, fmt.Errorf("节点运行不存在")
	}
	status, err := canvasRunNodeStatus(req.Status)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	record := map[string]any{
		"status":     status,
		"error":      strings.TrimSpace(req.Error),
		"updated_at": now,
	}
	if req.Output != nil {
		record["output"] = canvasRunJSON(req.Output)
	}
	if req.AgentRunID > 0 {
		record["agent_run_id"] = req.AgentRunID
	}
	if canvasRunStatusStarted(status) && nodeRun.StartedAt == nil {
		record["started_at"] = now
	}
	if canvasRunStatusFinished(status) {
		record["finished_at"] = now
	}
	teammodel.NewNodeRunModel().Update(ctx, map[string]any{"id": nodeRun.ID}, record)
	return map[string]any{
		"run_id":       run.ID,
		"request_id":   run.RequestID,
		"node_run_id":  nodeRun.ID,
		"node_key":     nodeRun.NodeKey,
		"node_type":    nodeRun.NodeType,
		"status":       status,
		"agent_run_id": firstUint64(req.AgentRunID, nodeRun.AgentRunID),
	}, nil
}

func (s SpaceService) requireCanvasRun(ctx context.Context, projectID uint64, runID uint64, requestID string) (*teammodel.Run, error) {
	if runID == 0 {
		return nil, fmt.Errorf("画布运行ID不能为空")
	}
	run := teammodel.NewRunModel().Find(ctx, map[string]any{
		"id":         runID,
		"project_id": projectID,
	})
	if run == nil {
		return nil, fmt.Errorf("画布运行不存在")
	}
	if strings.TrimSpace(requestID) != "" && run.RequestID != strings.TrimSpace(requestID) {
		return nil, fmt.Errorf("画布运行请求不匹配")
	}
	if !isCanvasRunRecord(run.Input) {
		return nil, fmt.Errorf("只能更新画布运行")
	}
	return run, nil
}

func (s SpaceService) canvasRunRecordPayload(ctx context.Context, projectID uint64, run *teammodel.Run) (map[string]any, error) {
	if run == nil || run.ProjectID != projectID {
		return nil, fmt.Errorf("画布运行不存在")
	}
	runInput := jsonObject(run.Input)
	clean, err := sanitizeCanvasPayload(uint64Value(runInput["_asset_cate_id"]), spaceMapValue(runInput["canvas"]))
	if err != nil {
		return nil, err
	}
	startNodeID := strings.TrimSpace(firstText(runInput["_start_node_id"]))
	if startNodeID == "" {
		return nil, fmt.Errorf("画布运行缺少开始节点")
	}
	nodes := canvasRunNodes(clean.Nodes)
	edges := canvasRunEdges(clean.Edges)
	plan := buildCanvasRunExecutionPlan(startNodeID, nodes, edges, canvasRunIsSingleNode(runInput))
	output := jsonObject(run.Output)
	payload := canvasRunStartedPayload(
		run.ID,
		run.RequestID,
		canvasRunFlowRunID(ctx, run.ID),
		run.ReleaseID,
		startNodeID,
		run.Status,
		canvasRunNodePayloadsFromRows(ctx, plan, run.ID),
		plan,
	)
	payload["output"] = output
	if executed := uint64Value(output["executed"]); executed > 0 {
		payload["executed"] = executed
	}
	if nodeResults, ok := output["node_results"]; ok {
		payload["node_results"] = nodeResults
	} else {
		rowResults := canvasCompletedNodeResultPayloadsFromRows(ctx, plan, run.ID)
		if len(rowResults) > 0 {
			payload["node_results"] = rowResults
			payload["executed"] = len(rowResults)
		}
	}
	if pending := spaceMapValue(output["pending_node"]); len(pending) > 0 {
		payload["pending_node"] = pending
	}
	if strings.TrimSpace(run.Error) != "" {
		payload["error"] = strings.TrimSpace(run.Error)
	}
	return payload, nil
}

func findCanvasRunByRequestID(ctx context.Context, projectID uint64, requestID string) *teammodel.Run {
	requestID = strings.TrimSpace(requestID)
	if projectID == 0 || requestID == "" {
		return nil
	}
	for _, row := range teammodel.NewRunModel().Select(ctx, map[string]any{
		"project_id": projectID,
		"request_id": requestID,
	}) {
		if row != nil && isCanvasRunRecord(row.Input) {
			return row
		}
	}
	return nil
}

func resolveCanvasRun(ctx context.Context, projectID uint64, runID uint64, requestID string) *teammodel.Run {
	filter := map[string]any{"project_id": projectID}
	if runID > 0 {
		filter["id"] = runID
	} else if strings.TrimSpace(requestID) != "" {
		filter["request_id"] = strings.TrimSpace(requestID)
	} else {
		return nil
	}
	run := teammodel.NewRunModel().Find(ctx, filter)
	if run == nil || !isCanvasRunRecord(run.Input) {
		return nil
	}
	return run
}

func normalizeCanvasRequestID(value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", nil
	}
	if len(value) > 64 {
		return "", fmt.Errorf("画布运行请求ID不能超过64个字符")
	}
	return value, nil
}

func (s SpaceService) requireCanvasNodeRun(
	ctx context.Context,
	runID uint64,
	nodeRunID uint64,
	nodeKey string,
) (*teammodel.NodeRun, error) {
	filter := map[string]any{"run_id": runID}
	if nodeRunID > 0 {
		filter["id"] = nodeRunID
	} else if strings.TrimSpace(nodeKey) != "" {
		filter["node_key"] = strings.TrimSpace(nodeKey)
	} else {
		return nil, fmt.Errorf("节点运行ID不能为空")
	}
	nodeRun := teammodel.NewNodeRunModel().Find(ctx, filter)
	if nodeRun == nil {
		return nil, fmt.Errorf("节点运行不存在")
	}
	if strings.TrimSpace(nodeKey) != "" && nodeRun.NodeKey != strings.TrimSpace(nodeKey) {
		return nil, fmt.Errorf("节点运行不匹配")
	}
	return nodeRun, nil
}

func finishCanvasFlowRuns(ctx context.Context, runID uint64, status string, output any, errorText string, now time.Time) {
	model := teammodel.NewFlowRunModel()
	for _, row := range model.Select(ctx, map[string]any{"run_id": runID}) {
		if row == nil {
			continue
		}
		model.Update(ctx, map[string]any{"id": row.ID}, map[string]any{
			"status":      status,
			"output":      canvasRunJSON(output),
			"error":       strings.TrimSpace(errorText),
			"finished_at": now,
			"updated_at":  now,
		})
	}
}

func finishCanvasNodeRuns(ctx context.Context, runID uint64, status string, errorText string, now time.Time) {
	model := teammodel.NewNodeRunModel()
	for _, row := range model.Select(ctx, map[string]any{"run_id": runID}) {
		if row == nil {
			continue
		}
		if canvasRunStatusFinished(row.Status) {
			continue
		}
		record := map[string]any{
			"status":      status,
			"error":       strings.TrimSpace(errorText),
			"finished_at": now,
			"updated_at":  now,
		}
		if status == teammodel.RunStatusSuccess {
			record["output"] = canvasRunJSON(map[string]any{
				"status": "completed",
			})
		}
		model.Update(ctx, map[string]any{"id": row.ID}, record)
	}
}

func createCanvasFlowRun(
	ctx context.Context,
	projectID uint64,
	teamID uint64,
	runID uint64,
	requestID string,
	input map[string]any,
	now time.Time,
) uint64 {
	return uint64(teammodel.NewFlowRunModel().Insert(ctx, map[string]any{
		"run_id":     runID,
		"request_id": requestID,
		"project_id": projectID,
		"team_id":    teamID,
		"flow_id":    0,
		"input":      canvasRunJSON(input),
		"output":     "{}",
		"error":      "",
		"status":     teammodel.RunStatusRunning,
		"started_at": now,
		"created_at": now,
		"updated_at": now,
	}))
}

func createCanvasNodeRuns(
	ctx context.Context,
	projectID uint64,
	teamID uint64,
	runID uint64,
	flowRunID uint64,
	requestID string,
	nodes []canvasRunNode,
	now time.Time,
) ([]map[string]any, error) {
	result := make([]map[string]any, 0, len(nodes))
	if flowRunID == 0 {
		return result, fmt.Errorf("画布流程运行ID不能为空")
	}
	model := teammodel.NewNodeRunModel()
	for _, node := range nodes {
		nodeID := stableCanvasNodeID(node.ID)
		nodeRunID := uint64(model.Insert(ctx, map[string]any{
			"run_id":       runID,
			"flow_run_id":  flowRunID,
			"request_id":   requestID,
			"project_id":   projectID,
			"team_id":      teamID,
			"flow_id":      0,
			"node_id":      nodeID,
			"node_key":     node.ID,
			"node_type":    node.Type,
			"input":        canvasRunJSON(canvasRunNodeInput(node)),
			"output":       "{}",
			"error":        "",
			"status":       teammodel.RunStatusPending,
			"agent_run_id": 0,
			"created_at":   now,
			"updated_at":   now,
		}))
		if nodeRunID == 0 {
			return result, fmt.Errorf("创建节点运行失败: %s", canvasRunNodeTitle(node))
		}
		result = append(result, map[string]any{
			"node_run_id":     nodeRunID,
			"node_id":         nodeID,
			"node_key":        node.ID,
			"node_type":       node.Type,
			"status":          teammodel.RunStatusPending,
			"persists_result": node.PersistsResult,
		})
	}
	return result, nil
}

func canvasRunNodePayloadsFromRows(ctx context.Context, plan canvasExecutionPlan, runID uint64) []map[string]any {
	nodes := canvasRunTrackedNodes(plan)
	result := make([]map[string]any, 0, len(nodes))
	rowsByNode := map[string]*teammodel.NodeRun{}
	for _, node := range nodes {
		rowsByNode[node.ID] = nil
	}
	for _, row := range teammodel.NewNodeRunModel().Select(ctx, map[string]any{"run_id": runID}) {
		if row == nil || row.NodeKey == "" {
			continue
		}
		rowsByNode[row.NodeKey] = row
	}
	for _, node := range nodes {
		row := rowsByNode[node.ID]
		if row == nil {
			continue
		}
		result = append(result, map[string]any{
			"node_run_id":     row.ID,
			"node_id":         row.NodeID,
			"node_key":        row.NodeKey,
			"node_type":       row.NodeType,
			"status":          row.Status,
			"persists_result": node.PersistsResult,
		})
	}
	return result
}

func canvasCompletedNodeResultPayloadsFromRows(ctx context.Context, plan canvasExecutionPlan, runID uint64) []map[string]any {
	nodesByID := canvasExecutionNodeMap(plan.Nodes)
	results := map[string]canvasNodeExecutionResult{}
	for _, row := range teammodel.NewNodeRunModel().Select(ctx, map[string]any{"run_id": runID}) {
		if row == nil || row.Status != teammodel.RunStatusSuccess {
			continue
		}
		node, ok := nodesByID[row.NodeKey]
		if !ok || !node.PersistsResult {
			continue
		}
		result := canvasNodeResultFromMap(jsonObject(row.Output), row.Status)
		result.Node = node
		result.NodeRunID = row.ID
		result.AgentRunID = firstUint64(result.AgentRunID, row.AgentRunID)
		results[row.NodeKey] = result
	}
	return canvasNodeResultsPayload(results)
}

func canvasRunNodes(items []any) map[string]canvasRunNode {
	result := make(map[string]canvasRunNode, len(items))
	for _, item := range items {
		row, ok := item.(map[string]any)
		if !ok {
			continue
		}
		id := strings.TrimSpace(firstText(row["id"]))
		if id == "" {
			continue
		}
		nodeType := strings.TrimSpace(firstText(row["type"]))
		functionOption := spaceMapValue(row["function_option"])
		asset := spaceMapValue(row["asset"])
		flow := spaceMapValue(row["flow"])
		power := spaceMapValue(row["power"])
		role := spaceMapValue(row["role"])
		composerDraft := spaceMapValue(row["composer_draft"])
		functionKey := strings.TrimSpace(firstText(functionOption["key"]))
		result[id] = canvasRunNode{
			ID:             id,
			Type:           nodeType,
			Title:          strings.TrimSpace(firstText(row["title"])),
			Kind:           strings.TrimSpace(firstText(row["kind"])),
			FunctionKey:    functionKey,
			AssetCateID:    uint64Value(row["asset_cate_id"]),
			FlowID:         uint64Value(flow["id"]),
			PowerID:        uint64Value(power["id"]),
			PowerKey:       strings.TrimSpace(firstText(power["key"])),
			PowerKind:      strings.TrimSpace(firstText(power["kind"])),
			AgentID:        uint64Value(role["agent_id"]),
			AssetID:        uint64Value(asset["id"]),
			AssetVersionID: uint64Value(asset["version_id"]),
			ComposerPrompt: strings.TrimSpace(firstText(composerDraft["prompt"])),
			ComposerParams: spaceMapValue(composerDraft["param_values"]),
			SourceTargetID: uint64Value(composerDraft["selected_target_id"]),
			PersistsResult: canvasRunNodePersistsResult(nodeType, functionKey),
		}
	}
	return result
}

func canvasRunEdges(items []any) []canvasRunEdge {
	result := make([]canvasRunEdge, 0, len(items))
	for _, item := range items {
		row, ok := item.(map[string]any)
		if !ok {
			continue
		}
		result = append(result, canvasRunEdge{
			ID:   strings.TrimSpace(firstText(row["id"])),
			From: strings.TrimSpace(firstText(row["from"])),
			To:   strings.TrimSpace(firstText(row["to"])),
		})
	}
	return result
}

func canvasRunNodePersistsResult(nodeType string, functionKey string) bool {
	switch nodeType {
	case "power", "agent", "flow", "asset":
		return true
	case "function":
		return functionKey == "import" || functionKey == "save"
	default:
		return false
	}
}

func canvasRunFinishStatus(status string) string {
	switch strings.TrimSpace(status) {
	case teammodel.RunStatusSuccess:
		return teammodel.RunStatusSuccess
	case teammodel.RunStatusFail:
		return teammodel.RunStatusFail
	case teammodel.RunStatusCanceled:
		return teammodel.RunStatusCanceled
	default:
		return teammodel.RunStatusSuccess
	}
}

func canvasRunNodeStatus(status string) (string, error) {
	switch strings.TrimSpace(status) {
	case teammodel.RunStatusPending:
		return teammodel.RunStatusPending, nil
	case teammodel.RunStatusRunning:
		return teammodel.RunStatusRunning, nil
	case teammodel.RunStatusWaiting:
		return teammodel.RunStatusWaiting, nil
	case teammodel.RunStatusSuccess:
		return teammodel.RunStatusSuccess, nil
	case teammodel.RunStatusFail:
		return teammodel.RunStatusFail, nil
	case teammodel.RunStatusCanceled:
		return teammodel.RunStatusCanceled, nil
	default:
		return "", fmt.Errorf("未知的节点运行状态")
	}
}

func canvasRunStatusStarted(status string) bool {
	return status == teammodel.RunStatusRunning ||
		status == teammodel.RunStatusWaiting ||
		canvasRunStatusFinished(status)
}

func canvasRunStatusFinished(status string) bool {
	return status == teammodel.RunStatusSuccess ||
		status == teammodel.RunStatusFail ||
		status == teammodel.RunStatusCanceled
}

func validateCanvasRunGraph(nodes map[string]canvasRunNode, edges []canvasRunEdge) error {
	if len(nodes) == 0 {
		return fmt.Errorf("画布没有节点")
	}
	outgoing := map[string][]string{}
	for _, edge := range edges {
		if edge.From == "" || edge.To == "" {
			return fmt.Errorf("画布连线缺少端点")
		}
		if edge.From == edge.To {
			return fmt.Errorf("画布连线不能连接自身")
		}
		if _, ok := nodes[edge.From]; !ok {
			return fmt.Errorf("画布连线上游节点不存在")
		}
		if _, ok := nodes[edge.To]; !ok {
			return fmt.Errorf("画布连线下游节点不存在")
		}
		outgoing[edge.From] = append(outgoing[edge.From], edge.To)
	}
	if canvasRunGraphHasCycle(nodes, outgoing) {
		return fmt.Errorf("画布连线存在循环，当前只允许 DAG")
	}
	return nil
}

func validateCanvasExecutionPlan(plan canvasExecutionPlan) error {
	for _, node := range plan.Nodes {
		if node.Type == "function" && node.FunctionKey == "save" && len(plan.Incoming[node.ID]) != 1 {
			return fmt.Errorf("保存节点 %s 需要且只需要一个执行结果上游节点", canvasRunNodeTitle(node))
		}
		if node.Type == "function" && node.FunctionKey == "display" && len(plan.Incoming[node.ID]) != 1 {
			return fmt.Errorf("展示节点 %s 需要且只需要一个执行结果上游节点", canvasRunNodeTitle(node))
		}
	}
	return nil
}

func isCanvasStartNode(node canvasRunNode) bool {
	return node.Type == "function" && node.FunctionKey == "start"
}

func canvasRunIsSingleNode(runInput map[string]any) bool {
	value, ok := runInput["_single_node"].(bool)
	return ok && value
}

func buildCanvasRunExecutionPlan(
	startNodeID string,
	nodes map[string]canvasRunNode,
	edges []canvasRunEdge,
	singleNode bool,
) canvasExecutionPlan {
	if singleNode {
		return buildSingleCanvasNodeExecutionPlan(startNodeID, nodes)
	}
	return buildCanvasExecutionPlan(startNodeID, nodes, edges)
}

func buildSingleCanvasNodeExecutionPlan(nodeID string, nodes map[string]canvasRunNode) canvasExecutionPlan {
	node := nodes[nodeID]
	plan := canvasExecutionPlan{
		Start:    node,
		Nodes:    []canvasRunNode{},
		Edges:    []canvasRunEdge{},
		Incoming: map[string][]string{},
		Outgoing: map[string][]string{},
		Order:    []string{},
	}
	if strings.TrimSpace(node.ID) != "" {
		plan.Nodes = append(plan.Nodes, node)
		plan.Order = append(plan.Order, node.ID)
	}
	return plan
}

func buildCanvasExecutionPlan(startNodeID string, nodes map[string]canvasRunNode, edges []canvasRunEdge) canvasExecutionPlan {
	outgoing := map[string][]string{}
	for _, edge := range edges {
		outgoing[edge.From] = append(outgoing[edge.From], edge.To)
	}
	plan := canvasExecutionPlan{
		Start:    nodes[startNodeID],
		Nodes:    []canvasRunNode{},
		Edges:    []canvasRunEdge{},
		Incoming: map[string][]string{},
		Outgoing: map[string][]string{},
		Order:    []string{},
	}
	reachable, discovered := canvasReachableExecutionNodes(startNodeID, nodes, outgoing)
	for _, edge := range edges {
		if !reachable[edge.To] {
			continue
		}
		if edge.From == startNodeID || reachable[edge.From] {
			plan.Edges = append(plan.Edges, edge)
		}
		if reachable[edge.From] {
			plan.Incoming[edge.To] = append(plan.Incoming[edge.To], edge.From)
			plan.Outgoing[edge.From] = append(plan.Outgoing[edge.From], edge.To)
		}
	}
	plan.Order = canvasTopologicalExecutionOrder(discovered, plan.Incoming, plan.Outgoing)
	for _, nodeID := range plan.Order {
		if node, ok := nodes[nodeID]; ok {
			plan.Nodes = append(plan.Nodes, node)
		}
	}
	return plan
}

func canvasRunTrackedNodes(plan canvasExecutionPlan) []canvasRunNode {
	result := make([]canvasRunNode, 0, len(plan.Nodes)+1)
	seen := map[string]bool{}
	if strings.TrimSpace(plan.Start.ID) != "" {
		result = append(result, plan.Start)
		seen[plan.Start.ID] = true
	}
	for _, node := range plan.Nodes {
		if strings.TrimSpace(node.ID) == "" || seen[node.ID] {
			continue
		}
		result = append(result, node)
		seen[node.ID] = true
	}
	return result
}

func canvasReachableExecutionNodes(
	startNodeID string,
	nodes map[string]canvasRunNode,
	outgoing map[string][]string,
) (map[string]bool, []string) {
	reachable := map[string]bool{}
	discovered := []string{}
	var visit func(string)
	visit = func(nodeID string) {
		for _, targetID := range outgoing[nodeID] {
			if reachable[targetID] {
				continue
			}
			node, ok := nodes[targetID]
			if !ok {
				continue
			}
			reachable[targetID] = true
			discovered = append(discovered, targetID)
			if canvasRunNodeStopsFlow(node) {
				continue
			}
			visit(targetID)
		}
	}
	visit(startNodeID)
	return reachable, discovered
}

func canvasTopologicalExecutionOrder(
	discovered []string,
	incoming map[string][]string,
	outgoing map[string][]string,
) []string {
	discoveredSet := map[string]bool{}
	indegree := map[string]int{}
	for _, nodeID := range discovered {
		discoveredSet[nodeID] = true
		indegree[nodeID] = len(incoming[nodeID])
	}
	queue := make([]string, 0, len(discovered))
	for _, nodeID := range discovered {
		if indegree[nodeID] == 0 {
			queue = append(queue, nodeID)
		}
	}
	order := make([]string, 0, len(discovered))
	queued := 0
	for queued < len(queue) {
		nodeID := queue[queued]
		queued++
		order = append(order, nodeID)
		for _, targetID := range outgoing[nodeID] {
			if !discoveredSet[targetID] {
				continue
			}
			indegree[targetID]--
			if indegree[targetID] == 0 {
				queue = append(queue, targetID)
			}
		}
	}
	if len(order) == len(discovered) {
		return order
	}
	return discovered
}

func canvasRunNodeStopsFlow(node canvasRunNode) bool {
	return node.Type == "function" &&
		(node.FunctionKey == "save" || node.FunctionKey == "display")
}

func canvasRunTargetPayloads(nodes []canvasRunNode) []map[string]any {
	result := make([]map[string]any, 0, len(nodes))
	for _, node := range nodes {
		result = append(result, map[string]any{
			"id":              node.ID,
			"type":            node.Type,
			"title":           canvasRunNodeTitle(node),
			"function_key":    node.FunctionKey,
			"asset_cate_id":   node.AssetCateID,
			"persists_result": node.PersistsResult,
		})
	}
	return result
}

func canvasRunExecutionPlanPayload(plan canvasExecutionPlan) map[string]any {
	nodes := make([]map[string]any, 0, len(plan.Nodes))
	for _, node := range plan.Nodes {
		nodes = append(nodes, map[string]any{
			"id":              node.ID,
			"type":            node.Type,
			"title":           canvasRunNodeTitle(node),
			"function_key":    node.FunctionKey,
			"asset_cate_id":   node.AssetCateID,
			"persists_result": node.PersistsResult,
			"stops_flow":      canvasRunNodeStopsFlow(node),
		})
	}
	edges := make([]map[string]any, 0, len(plan.Edges))
	for _, edge := range plan.Edges {
		edges = append(edges, map[string]any{
			"id":     edge.ID,
			"source": edge.From,
			"target": edge.To,
		})
	}
	return map[string]any{
		"nodes":    nodes,
		"edges":    edges,
		"incoming": plan.Incoming,
		"outgoing": plan.Outgoing,
		"order":    plan.Order,
	}
}

func canvasRunGraphHasCycle(nodes map[string]canvasRunNode, outgoing map[string][]string) bool {
	visiting := map[string]bool{}
	visited := map[string]bool{}
	var visit func(string) bool
	visit = func(nodeID string) bool {
		if visiting[nodeID] {
			return true
		}
		if visited[nodeID] {
			return false
		}
		visiting[nodeID] = true
		for _, nextID := range outgoing[nodeID] {
			if visit(nextID) {
				return true
			}
		}
		visiting[nodeID] = false
		visited[nodeID] = true
		return false
	}
	for nodeID := range nodes {
		if visit(nodeID) {
			return true
		}
	}
	return false
}

func canvasRunNodeTitle(node canvasRunNode) string {
	if node.Title != "" {
		return node.Title
	}
	return node.ID
}

func canvasRunNodeInput(node canvasRunNode) map[string]any {
	return map[string]any{
		"node_key":         node.ID,
		"node_type":        node.Type,
		"title":            node.Title,
		"kind":             node.Kind,
		"function_key":     node.FunctionKey,
		"asset_cate_id":    node.AssetCateID,
		"flow_id":          node.FlowID,
		"power_id":         node.PowerID,
		"power_key":        node.PowerKey,
		"agent_id":         node.AgentID,
		"asset_id":         node.AssetID,
		"asset_version_id": node.AssetVersionID,
		"persists_result":  node.PersistsResult,
	}
}

func canvasNodeRunIDMap(payloads []map[string]any) map[string]uint64 {
	result := map[string]uint64{}
	for _, item := range payloads {
		nodeKey := strings.TrimSpace(firstText(item["node_key"]))
		nodeRunID := uint64Value(item["node_run_id"])
		if nodeKey != "" && nodeRunID > 0 {
			result[nodeKey] = nodeRunID
		}
	}
	return result
}

func stableCanvasNodeID(key string) uint64 {
	hash := fnv.New64a()
	_, _ = hash.Write([]byte(strings.TrimSpace(key)))
	value := hash.Sum64() & 0x7fffffffffffffff
	if value == 0 {
		return 1
	}
	return value
}

func isCanvasRunRecord(input string) bool {
	row := map[string]any{}
	if err := json.Unmarshal([]byte(strings.TrimSpace(input)), &row); err != nil {
		return false
	}
	return strings.TrimSpace(firstText(row["_mode"])) == "work_canvas"
}

func cloneCanvasRunInput(input map[string]any) map[string]any {
	result := map[string]any{}
	for key, value := range input {
		result[key] = value
	}
	return result
}

func canvasRunJSON(value any) string {
	content, err := json.Marshal(value)
	if err != nil {
		return "{}"
	}
	return string(content)
}
