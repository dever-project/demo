package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	workmodel "my/module/work/model"
	teammodel "my/package/bot/model/team"
	assetservice "my/package/bot/service/asset"
	teamservice "my/package/bot/service/team"
)

const canvasFlowPollInterval = time.Second
const canvasFlowPollAttempts = 60
const canvasRunLockTTL = 2 * time.Minute
const canvasRunLockRefreshInterval = 30 * time.Second

var errCanvasExternalStillRunning = errors.New("画布外部任务仍在运行")

type canvasRunExecution struct {
	projectID   uint64
	userID      uint64
	teamID      uint64
	releaseID   uint64
	assetCateID uint64
	runID       uint64
	requestID   string
	flowRunID   uint64
	startNodeID string
	plan        canvasExecutionPlan
	nodeRuns    map[string]uint64
	resumeFrom  string
	resumeRun   map[string]any
	resumeKey   string
	feedback    map[string]any
	manualInput canvasNodeInputContext
}

type canvasNodeExecutionResult struct {
	Node       canvasRunNode
	NodeRunID  uint64
	Status     string
	Output     any
	Asset      map[string]any
	Version    map[string]any
	Result     map[string]any
	AgentRunID uint64
}

type canvasNodeInputContext struct {
	Text    string
	Sources []map[string]any
	Latest  *canvasNodeExecutionResult
}

type canvasRunWaiting struct {
	node   canvasRunNode
	result canvasNodeExecutionResult
}

type canvasRunDispatchResult string

const (
	canvasRunDispatchStarted canvasRunDispatchResult = "started"
	canvasRunDispatchActive  canvasRunDispatchResult = "active"
	canvasRunDispatchLocked  canvasRunDispatchResult = "locked"
	canvasRunDispatchFailed  canvasRunDispatchResult = "failed"
)

var canvasRunDispatchState = struct {
	sync.Mutex
	running map[uint64]bool
}{
	running: map[uint64]bool{},
}

var canvasRunLockOwner = newCanvasRunLockOwner()

func (s SpaceService) dispatchCanvasRun(exec canvasRunExecution) bool {
	return s.dispatchCanvasRunWithResult(exec) == canvasRunDispatchStarted
}

func (s SpaceService) dispatchCanvasRunWithResult(exec canvasRunExecution) canvasRunDispatchResult {
	if exec.runID == 0 {
		return canvasRunDispatchFailed
	}
	if !reserveCanvasRunDispatch(exec.runID) {
		return canvasRunDispatchActive
	}
	if !acquireCanvasRunLock(context.Background(), exec.projectID, exec.runID) {
		releaseCanvasRunDispatch(exec.runID)
		return canvasRunDispatchLocked
	}
	go func() {
		ctx := withWorkUserID(context.Background(), exec.userID)
		stopLockRefresh := startCanvasRunLockRefresh(ctx, exec.projectID, exec.runID)
		defer func() {
			stopLockRefresh()
			releaseCanvasRunLock(context.Background(), exec.runID)
			releaseCanvasRunDispatch(exec.runID)
			if recovered := recover(); recovered != nil {
				s.finishCanvasRunRecord(context.Background(), exec.projectID, FinishCanvasRunRequest{
					RunID:     exec.runID,
					RequestID: exec.requestID,
					Status:    teammodel.RunStatusFail,
					Output:    canvasRunOutput(exec.startNodeID, 0, nil, canvasNodeExecutionResult{}),
					Error:     fmt.Sprintf("画布运行异常: %v", recovered),
				})
			}
		}()
		if !isCanvasRunStillRunnable(ctx, exec.runID) {
			return
		}
		_, _ = s.executeCanvasRun(ctx, exec)
	}()
	return canvasRunDispatchStarted
}

func newCanvasRunLockOwner() string {
	host, _ := os.Hostname()
	host = strings.TrimSpace(host)
	if host == "" {
		host = "unknown"
	}
	return fmt.Sprintf("%s:%d:%d", host, os.Getpid(), time.Now().UnixNano())
}

func reserveCanvasRunDispatch(runID uint64) bool {
	canvasRunDispatchState.Lock()
	defer canvasRunDispatchState.Unlock()
	if canvasRunDispatchState.running[runID] {
		return false
	}
	canvasRunDispatchState.running[runID] = true
	return true
}

func releaseCanvasRunDispatch(runID uint64) {
	canvasRunDispatchState.Lock()
	defer canvasRunDispatchState.Unlock()
	delete(canvasRunDispatchState.running, runID)
}

func acquireCanvasRunLock(ctx context.Context, projectID uint64, runID uint64) bool {
	if projectID == 0 || runID == 0 {
		return false
	}
	model := workmodel.NewCanvasRunLockModel()
	now := time.Now()
	expiresAt := now.Add(canvasRunLockTTL)
	if existing := model.Find(ctx, map[string]any{"run_id": runID}); existing != nil {
		return claimCanvasRunLock(ctx, existing, projectID, expiresAt, now)
	}
	if tryInsertCanvasRunLock(ctx, projectID, runID, expiresAt, now) {
		return true
	}
	existing := model.Find(ctx, map[string]any{"run_id": runID})
	return claimCanvasRunLock(ctx, existing, projectID, expiresAt, now)
}

func claimCanvasRunLock(
	ctx context.Context,
	row *workmodel.CanvasRunLock,
	projectID uint64,
	expiresAt time.Time,
	now time.Time,
) bool {
	if row == nil || row.ProjectID != projectID {
		return false
	}
	model := workmodel.NewCanvasRunLockModel()
	if row.Owner == canvasRunLockOwner {
		return model.Update(ctx, map[string]any{
			"id":    row.ID,
			"owner": canvasRunLockOwner,
		}, canvasRunLockUpdate(expiresAt, now)) > 0
	}
	if row.ExpiresAt.After(now) {
		return false
	}
	return model.Update(ctx, map[string]any{
		"id":         row.ID,
		"project_id": projectID,
		"expires_at": map[string]any{"lte": now},
	}, canvasRunLockUpdate(expiresAt, now)) > 0
}

func tryInsertCanvasRunLock(
	ctx context.Context,
	projectID uint64,
	runID uint64,
	expiresAt time.Time,
	now time.Time,
) (ok bool) {
	defer func() {
		if recover() != nil {
			ok = false
		}
	}()
	return workmodel.NewCanvasRunLockModel().Insert(ctx, map[string]any{
		"project_id": projectID,
		"run_id":     runID,
		"owner":      canvasRunLockOwner,
		"expires_at": expiresAt,
		"created_at": now,
		"updated_at": now,
	}) > 0
}

func canvasRunLockUpdate(expiresAt time.Time, now time.Time) map[string]any {
	return map[string]any{
		"owner":      canvasRunLockOwner,
		"expires_at": expiresAt,
		"updated_at": now,
	}
}

func startCanvasRunLockRefresh(ctx context.Context, projectID uint64, runID uint64) func() {
	done := make(chan struct{})
	go func() {
		ticker := time.NewTicker(canvasRunLockRefreshInterval)
		defer ticker.Stop()
		for {
			select {
			case <-done:
				return
			case <-ctx.Done():
				return
			case <-ticker.C:
				if !refreshCanvasRunLock(ctx, projectID, runID) {
					return
				}
			}
		}
	}()
	return func() { close(done) }
}

func refreshCanvasRunLock(ctx context.Context, projectID uint64, runID uint64) (ok bool) {
	defer func() {
		if recover() != nil {
			ok = false
		}
	}()
	model := workmodel.NewCanvasRunLockModel()
	now := time.Now()
	return model.Update(ctx, map[string]any{
		"project_id": projectID,
		"run_id":     runID,
		"owner":      canvasRunLockOwner,
	}, map[string]any{
		"expires_at": now.Add(canvasRunLockTTL),
		"updated_at": now,
	}) > 0
}

func releaseCanvasRunLock(ctx context.Context, runID uint64) {
	workmodel.NewCanvasRunLockModel().Delete(ctx, map[string]any{
		"run_id": runID,
		"owner":  canvasRunLockOwner,
	})
}

func isCanvasRunStillRunnable(ctx context.Context, runID uint64) bool {
	run := teammodel.NewRunModel().Find(ctx, map[string]any{"id": runID})
	return run != nil && run.Status == teammodel.RunStatusRunning && isCanvasRunRecord(run.Input)
}

func (s SpaceService) dispatchRunnableCanvasRun(ctx context.Context, projectID uint64, run *teammodel.Run) bool {
	if run == nil || run.ProjectID != projectID || run.Status != teammodel.RunStatusRunning {
		return false
	}
	exec, err := s.canvasExecutionFromRun(ctx, projectID, run)
	if err != nil {
		s.failRunnableCanvasRun(projectID, run, err)
		return false
	}
	switch s.dispatchCanvasRunWithResult(exec) {
	case canvasRunDispatchStarted, canvasRunDispatchActive:
		return true
	case canvasRunDispatchLocked:
		return false
	default:
		s.failRunnableCanvasRun(projectID, run, fmt.Errorf("画布运行调度失败"))
		return false
	}
}

func (s SpaceService) failRunnableCanvasRun(projectID uint64, run *teammodel.Run, err error) {
	if run == nil || err == nil {
		return
	}
	runInput := jsonObject(run.Input)
	startNodeID := strings.TrimSpace(firstText(runInput["_start_node_id"]))
	s.finishCanvasRunRecord(context.Background(), projectID, FinishCanvasRunRequest{
		RunID:     run.ID,
		RequestID: run.RequestID,
		Status:    teammodel.RunStatusFail,
		Output:    canvasRunOutput(startNodeID, 0, nil, canvasNodeExecutionResult{}),
		Error:     err.Error(),
	})
}

func (s SpaceService) RecoverRunningCanvasRuns(ctx context.Context, projectID uint64) int {
	if projectID == 0 {
		return 0
	}
	count := 0
	for _, run := range teammodel.NewRunModel().Select(ctx, map[string]any{
		"project_id": projectID,
		"status":     teammodel.RunStatusRunning,
	}) {
		if run == nil || !isCanvasRunRecord(run.Input) {
			continue
		}
		if s.dispatchRunnableCanvasRun(ctx, projectID, run) {
			count++
		}
	}
	return count
}

func (s SpaceService) canvasExecutionFromRun(ctx context.Context, projectID uint64, run *teammodel.Run) (canvasRunExecution, error) {
	if run == nil {
		return canvasRunExecution{}, fmt.Errorf("画布运行不存在")
	}
	project := workmodel.NewProjectModel().Find(ctx, map[string]any{
		"id":     projectID,
		"status": workmodel.StatusEnabled,
	})
	if project == nil || project.ID != run.ProjectID {
		return canvasRunExecution{}, fmt.Errorf("项目不存在")
	}
	runInput := jsonObject(run.Input)
	clean, err := sanitizeCanvasPayload(uint64Value(runInput["_asset_cate_id"]), spaceMapValue(runInput["canvas"]))
	if err != nil {
		return canvasRunExecution{}, err
	}
	startNodeID := strings.TrimSpace(firstText(runInput["_start_node_id"]))
	if startNodeID == "" {
		return canvasRunExecution{}, fmt.Errorf("画布运行缺少开始节点")
	}
	nodes := canvasRunNodes(clean.Nodes)
	edges := canvasRunEdges(clean.Edges)
	if err := validateCanvasRunGraph(nodes, edges); err != nil {
		return canvasRunExecution{}, err
	}
	singleNode := canvasRunIsSingleNode(runInput)
	flowRunID := canvasRunFlowRunID(ctx, run.ID)
	if flowRunID == 0 {
		return canvasRunExecution{}, fmt.Errorf("画布流程运行不存在")
	}
	return canvasRunExecution{
		projectID:   project.ID,
		userID:      project.UserID,
		teamID:      project.TeamID,
		releaseID:   run.ReleaseID,
		assetCateID: clean.AssetCateID,
		runID:       run.ID,
		requestID:   run.RequestID,
		flowRunID:   flowRunID,
		startNodeID: startNodeID,
		plan:        buildCanvasRunExecutionPlan(startNodeID, nodes, edges, singleNode),
		nodeRuns:    canvasRunNodeRunIDs(ctx, run.ID),
		manualInput: canvasManualInputContext(runInput),
	}, nil
}

func (s SpaceService) ResumeCanvasRun(ctx context.Context, projectID uint64, req ResumeCanvasRunRequest) (map[string]any, error) {
	project, err := s.project.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	run, err := s.requireCanvasRun(ctx, project.ID, req.RunID, req.RequestID)
	if err != nil {
		return nil, err
	}
	if run.Status != teammodel.RunStatusWaiting {
		return nil, fmt.Errorf("只有等待反馈的画布运行可以继续")
	}
	runInput := jsonObject(run.Input)
	canvas := spaceMapValue(runInput["canvas"])
	clean, err := sanitizeCanvasPayload(uint64Value(runInput["_asset_cate_id"]), canvas)
	if err != nil {
		return nil, err
	}
	nodes := canvasRunNodes(clean.Nodes)
	edges := canvasRunEdges(clean.Edges)
	if err := validateCanvasRunGraph(nodes, edges); err != nil {
		return nil, err
	}
	startNodeID := firstText(runInput["_start_node_id"])
	if startNodeID == "" {
		return nil, fmt.Errorf("画布运行缺少开始节点")
	}
	plan := buildCanvasRunExecutionPlan(startNodeID, nodes, edges, canvasRunIsSingleNode(runInput))
	nodeRunIDs := canvasRunNodeRunIDs(ctx, run.ID)
	waitingStatuses := canvasRunNodeStatuses(ctx, run.ID)
	waitingNode, err := canvasWaitingNode(req.NodeKey, plan, waitingStatuses)
	if err != nil {
		return nil, err
	}
	flowRunID := canvasRunFlowRunID(ctx, run.ID)
	if flowRunID == 0 {
		return nil, fmt.Errorf("画布流程运行不存在")
	}
	if req.ApprovalID > 0 {
		if _, err := s.SubmitApproval(ctx, project.ID, req.ApprovalID, req.Decision, req.Comment, req.Feedback); err != nil {
			return nil, err
		}
	}
	now := time.Now()
	teammodel.NewRunModel().Update(ctx, map[string]any{"id": run.ID}, map[string]any{
		"status":     teammodel.RunStatusRunning,
		"error":      "",
		"updated_at": now,
	})
	teammodel.NewFlowRunModel().Update(ctx, map[string]any{"id": flowRunID}, map[string]any{
		"status":     teammodel.RunStatusRunning,
		"error":      "",
		"updated_at": now,
	})
	exec := canvasRunExecution{
		projectID:   project.ID,
		userID:      project.UserID,
		teamID:      project.TeamID,
		releaseID:   run.ReleaseID,
		assetCateID: clean.AssetCateID,
		runID:       run.ID,
		requestID:   run.RequestID,
		flowRunID:   flowRunID,
		startNodeID: startNodeID,
		plan:        plan,
		nodeRuns:    nodeRunIDs,
		resumeFrom:  waitingNode.ID,
		resumeRun:   canvasWaitingFlowRunRef(ctx, run.ID, waitingNode.ID),
		resumeKey:   canvasResumeKey(now),
		feedback:    req.Feedback,
		manualInput: canvasManualInputContext(runInput),
	}
	s.persistCanvasResumeInput(ctx, exec, waitingNode)
	payload := canvasRunStartedPayload(
		run.ID,
		run.RequestID,
		flowRunID,
		run.ReleaseID,
		startNodeID,
		teammodel.RunStatusRunning,
		canvasRunNodePayloadsFromRows(ctx, plan, run.ID),
		plan,
	)
	if result := s.dispatchCanvasRunWithResult(exec); result == canvasRunDispatchFailed {
		err := fmt.Errorf("画布运行调度失败")
		s.failRunnableCanvasRun(project.ID, run, err)
		return nil, err
	}
	return payload, nil
}

func (s SpaceService) executeCanvasRun(ctx context.Context, exec canvasRunExecution) (map[string]any, error) {
	nodeRunPayloads := canvasRunNodePayloadsFromRows(ctx, exec.plan, exec.runID)
	payload := canvasRunStartedPayload(
		exec.runID,
		exec.requestID,
		exec.flowRunID,
		exec.releaseID,
		exec.startNodeID,
		teammodel.RunStatusRunning,
		nodeRunPayloads,
		exec.plan,
	)
	executed, results, waiting, err := s.runCanvasExecutionPlan(ctx, exec)
	if waiting != nil {
		output := canvasRunOutput(exec.startNodeID, executed, results, waiting.result)
		s.markCanvasRunWaiting(ctx, exec, waiting.node, waiting.result, output)
		payload["status"] = teammodel.RunStatusWaiting
		payload["executed"] = executed
		payload["node_results"] = canvasNodeResultsPayload(results)
		payload["pending_node"] = canvasNodeResultPayload(waiting.result)
		payload["output"] = output
		return payload, nil
	}
	if err != nil {
		if errors.Is(err, context.Canceled) || errors.Is(err, errCanvasExternalStillRunning) {
			payload["status"] = teammodel.RunStatusRunning
			payload["executed"] = executed
			payload["node_results"] = canvasNodeResultsPayload(results)
			payload["output"] = canvasRunOutput(exec.startNodeID, executed, results, canvasNodeExecutionResult{})
			return payload, err
		}
		output := canvasRunOutput(exec.startNodeID, executed, results, canvasNodeExecutionResult{})
		s.finishCanvasRunRecord(ctx, exec.projectID, FinishCanvasRunRequest{
			RunID:     exec.runID,
			RequestID: exec.requestID,
			Status:    teammodel.RunStatusFail,
			Output:    output,
			Error:     err.Error(),
		})
		payload["status"] = teammodel.RunStatusFail
		payload["executed"] = executed
		payload["node_results"] = canvasNodeResultsPayload(results)
		payload["output"] = output
		payload["error"] = err.Error()
		return payload, err
	}
	output := canvasRunOutput(exec.startNodeID, executed, results, canvasNodeExecutionResult{})
	s.finishCanvasRunRecord(ctx, exec.projectID, FinishCanvasRunRequest{
		RunID:     exec.runID,
		RequestID: exec.requestID,
		Status:    teammodel.RunStatusSuccess,
		Output:    output,
	})
	payload["status"] = teammodel.RunStatusSuccess
	payload["executed"] = executed
	payload["node_results"] = canvasNodeResultsPayload(results)
	payload["output"] = output
	return payload, nil
}

func (s SpaceService) runCanvasExecutionPlan(
	ctx context.Context,
	exec canvasRunExecution,
) (int, map[string]canvasNodeExecutionResult, *canvasRunWaiting, error) {
	nodes := canvasExecutionNodeMap(exec.plan.Nodes)
	executable := canvasExecutionNodeSet(exec.plan.Nodes)
	completed, results := canvasCompletedNodeResults(ctx, exec)
	executed := len(results)
	for len(completed) < len(executable) {
		ready := canvasReadyNodeIDs(exec.plan.Order, exec.plan.Incoming, executable, completed)
		if len(ready) == 0 {
			return executed, results, nil, fmt.Errorf("画布执行依赖未满足，请检查节点连线")
		}
		for _, nodeID := range ready {
			node, ok := nodes[nodeID]
			if !ok {
				completed[nodeID] = true
				continue
			}
			result, waiting, err := s.executeCanvasNode(ctx, exec, node, results)
			if result.Status != "" {
				results[node.ID] = result
				executed++
			}
			if waiting != nil {
				return executed, results, waiting, nil
			}
			if err != nil {
				return executed, results, nil, err
			}
			completed[nodeID] = true
			if canvasRunNodeStopsFlow(node) {
				for _, skippedID := range markCanvasCompletedDownstream(node.ID, exec.plan.Outgoing, executable, completed) {
					if skippedNode, ok := nodes[skippedID]; ok {
						_ = s.markCanvasNodeRun(ctx, exec, skippedNode, teammodel.RunStatusCanceled, map[string]any{
							"status": "skipped",
							"reason": "upstream_stopped",
						}, "", 0)
					}
				}
			}
		}
	}
	return executed, results, nil, nil
}

func (s SpaceService) executeCanvasNode(
	ctx context.Context,
	exec canvasRunExecution,
	node canvasRunNode,
	results map[string]canvasNodeExecutionResult,
) (canvasNodeExecutionResult, *canvasRunWaiting, error) {
	nodeRunID := exec.nodeRuns[node.ID]
	result := canvasNodeExecutionResult{
		Node:      node,
		NodeRunID: nodeRunID,
		Status:    teammodel.RunStatusRunning,
	}
	if restored := s.restoreCanvasNodeResultFromVersion(ctx, exec, node, nodeRunID); restored.Status == teammodel.RunStatusSuccess {
		_ = s.markCanvasNodeRun(ctx, exec, node, teammodel.RunStatusSuccess, restored.Result, "", restored.AgentRunID)
		return restored, nil, nil
	}
	if err := s.markCanvasNodeRun(ctx, exec, node, teammodel.RunStatusRunning, nil, "", 0); err != nil {
		return result, nil, err
	}
	inputContext := canvasInputContext(node.ID, exec.plan.Incoming, results)
	if len(inputContext.Sources) == 0 && len(exec.manualInput.Sources) > 0 {
		inputContext = exec.manualInput
	}
	executionInput := canvasNodeExecutionInput(node, inputContext, exec, exec.feedback)
	if storedInput := canvasReusableStoredNodeInput(ctx, nodeRunID); len(storedInput) > 0 && exec.resumeKey == "" {
		executionInput = storedInput
	}
	s.updateCanvasNodeInput(ctx, exec, node, executionInput)
	output, err := s.executeCanvasNodeByType(ctx, exec, node, inputContext, nodeRunID, executionInput)
	if err != nil {
		if errors.Is(err, context.Canceled) || errors.Is(err, errCanvasExternalStillRunning) {
			return result, nil, err
		}
		_ = s.markCanvasNodeRun(ctx, exec, node, teammodel.RunStatusFail, nil, err.Error(), 0)
		return result, nil, err
	}
	result = output
	result.Node = node
	result.NodeRunID = nodeRunID
	if result.Status == "" {
		result.Status = teammodel.RunStatusSuccess
	}
	if result.Status == teammodel.RunStatusWaiting {
		_ = s.markCanvasNodeRun(ctx, exec, node, teammodel.RunStatusWaiting, result.Result, "", result.AgentRunID)
		return result, &canvasRunWaiting{node: node, result: result}, nil
	}
	if err := s.markCanvasNodeRun(ctx, exec, node, teammodel.RunStatusSuccess, result.Result, "", result.AgentRunID); err != nil {
		return result, nil, err
	}
	return result, nil, nil
}

func (s SpaceService) executeCanvasNodeByType(
	ctx context.Context,
	exec canvasRunExecution,
	node canvasRunNode,
	inputContext canvasNodeInputContext,
	nodeRunID uint64,
	executionInput map[string]any,
) (canvasNodeExecutionResult, error) {
	switch node.Type {
	case "asset":
		return s.executeCanvasAssetNode(ctx, exec, node, nodeRunID)
	case "power":
		return s.executeCanvasPowerNode(ctx, exec, node, inputContext, nodeRunID, executionInput)
	case "agent":
		return s.executeCanvasAgentNode(ctx, exec, node, nodeRunID, executionInput)
	case "flow":
		return s.executeCanvasFlowNode(ctx, exec, node, inputContext, nodeRunID, executionInput)
	case "function":
		return s.executeCanvasFunctionNode(ctx, exec, node, inputContext, nodeRunID)
	default:
		return canvasNodeExecutionResult{}, fmt.Errorf("不支持的节点类型: %s", node.Type)
	}
}

func (s SpaceService) restoreCanvasNodeResultFromVersion(
	ctx context.Context,
	exec canvasRunExecution,
	node canvasRunNode,
	nodeRunID uint64,
) canvasNodeExecutionResult {
	if nodeRunID == 0 || !node.PersistsResult {
		return canvasNodeExecutionResult{}
	}
	items := s.canvasResultItems(ctx, exec.projectID, CanvasResultQuery{
		RunID:       exec.runID,
		NodeRunID:   nodeRunID,
		AssetCateID: firstUint64(node.AssetCateID, exec.assetCateID),
	})
	if len(items) == 0 {
		return canvasNodeExecutionResult{}
	}
	asset := items[0]
	version := spaceMapValue(asset["version"])
	if len(version) == 0 {
		return canvasNodeExecutionResult{}
	}
	assetPayload := map[string]any{}
	for key, value := range asset {
		if key == "versions" || key == "canvas_source" {
			continue
		}
		assetPayload[key] = value
	}
	assetPayload["version"] = version
	result := map[string]any{
		"run_id":          exec.runID,
		"request_id":      exec.requestID,
		"node_run_id":     nodeRunID,
		"release_id":      firstUint64(uint64Value(version["release_id"]), exec.releaseID),
		"persists_result": true,
		"role":            asset["role"],
		"status":          teammodel.RunStatusSuccess,
		"output":          version["content"],
		"asset":           assetPayload,
		"version":         version,
	}
	return canvasNodeExecutionResult{
		Node:      node,
		NodeRunID: nodeRunID,
		Status:    teammodel.RunStatusSuccess,
		Output:    version["content"],
		Asset:     assetPayload,
		Version:   version,
		Result:    result,
	}
}

func (s SpaceService) executeCanvasAssetNode(
	ctx context.Context,
	exec canvasRunExecution,
	node canvasRunNode,
	nodeRunID uint64,
) (canvasNodeExecutionResult, error) {
	if node.AssetID == 0 {
		return canvasNodeExecutionResult{}, fmt.Errorf("%s 未选择资产", canvasRunNodeTitle(node))
	}
	asset := s.asset.FindProjectAsset(ctx, exec.projectID, node.AssetID)
	if asset == nil {
		return canvasNodeExecutionResult{}, fmt.Errorf("%s 选择的资产不存在", canvasRunNodeTitle(node))
	}
	versionID := firstUint64(node.AssetVersionID, asset.VersionID)
	version := s.asset.FindVersion(ctx, versionID)
	if version == nil || version.AssetID != asset.ID {
		return canvasNodeExecutionResult{}, fmt.Errorf("%s 选择的资产版本不存在", canvasRunNodeTitle(node))
	}
	assetPayload := s.asset.AssetDetailMap(ctx, *asset, version)
	versionPayload := assetservice.VersionToMap(*version)
	result := map[string]any{
		"run_id":          exec.runID,
		"request_id":      exec.requestID,
		"node_run_id":     nodeRunID,
		"release_id":      firstUint64(uint64Value(versionPayload["release_id"]), exec.releaseID),
		"persists_result": true,
		"status":          teammodel.RunStatusSuccess,
		"role":            asset.Role,
		"output":          versionPayload["content"],
		"asset":           assetPayload,
		"version":         versionPayload,
	}
	return canvasNodeExecutionResult{
		Status:  teammodel.RunStatusSuccess,
		Output:  versionPayload["content"],
		Asset:   assetPayload,
		Version: versionPayload,
		Result:  result,
	}, nil
}

func (s SpaceService) executeCanvasPowerNode(
	ctx context.Context,
	exec canvasRunExecution,
	node canvasRunNode,
	inputContext canvasNodeInputContext,
	nodeRunID uint64,
	executionInput map[string]any,
) (canvasNodeExecutionResult, error) {
	if node.PowerID == 0 {
		return canvasNodeExecutionResult{}, fmt.Errorf("%s 未选择能力", canvasRunNodeTitle(node))
	}
	result, err := s.RunCanvasPower(ctx, exec.projectID, CanvasPowerRunRequest{
		CanvasPowerRunRequest: teamservice.CanvasPowerRunRequest{
			FlowID:         node.FlowID,
			AssetCateID:    firstUint64(node.AssetCateID, exec.assetCateID),
			NodeKey:        node.ID,
			NodeName:       canvasRunNodeTitle(node),
			Kind:           firstText(node.PowerKind, node.Kind),
			PowerID:        node.PowerID,
			PowerKey:       node.PowerKey,
			SourceTargetID: node.SourceTargetID,
			Input: map[string]any{
				"prompt": executionInput["prompt"],
			},
			Params: spaceMapValue(executionInput["params"]),
		},
		RunID:     exec.runID,
		NodeRunID: nodeRunID,
	})
	if err != nil {
		return canvasNodeExecutionResult{}, err
	}
	return canvasNodeResultFromMap(result, teammodel.RunStatusSuccess), nil
}

func (s SpaceService) executeCanvasAgentNode(
	ctx context.Context,
	exec canvasRunExecution,
	node canvasRunNode,
	nodeRunID uint64,
	executionInput map[string]any,
) (canvasNodeExecutionResult, error) {
	if node.AgentID == 0 {
		return canvasNodeExecutionResult{}, fmt.Errorf("%s 未绑定智能体", canvasRunNodeTitle(node))
	}
	input := map[string]any{
		"prompt":        executionInput["prompt"],
		"asset_cate_id": firstUint64(node.AssetCateID, exec.assetCateID),
		"context":       executionInput["context"],
	}
	if files, ok := executionInput["files"]; ok {
		input["files"] = files
	}
	if feedback := spaceMapValue(executionInput["feedback"]); len(feedback) > 0 {
		input["feedback"] = feedback
	}
	result, err := s.RunCanvasAgent(ctx, exec.projectID, CanvasAgentRunRequest{
		FlowID:      node.FlowID,
		AssetCateID: firstUint64(node.AssetCateID, exec.assetCateID),
		NodeKey:     node.ID,
		NodeName:    canvasRunNodeTitle(node),
		AgentID:     node.AgentID,
		Input:       input,
		RunID:       exec.runID,
		RequestID:   firstText(executionInput["external_request_id"]),
		NodeRunID:   nodeRunID,
		ReleaseID:   exec.releaseID,
	})
	if err != nil {
		return canvasNodeExecutionResult{}, err
	}
	result = normalizeCanvasAgentNodeResult(exec, nodeRunID, result)
	status := strings.TrimSpace(firstText(result["status"]))
	if status == "" {
		status = teammodel.RunStatusSuccess
	}
	return canvasNodeResultFromMap(result, status), nil
}

func normalizeCanvasAgentNodeResult(exec canvasRunExecution, nodeRunID uint64, result map[string]any) map[string]any {
	if result == nil {
		result = map[string]any{}
	}
	if agentRequestID := strings.TrimSpace(firstText(result["request_id"])); agentRequestID != "" {
		result["agent_request_id"] = agentRequestID
	}
	result["run_id"] = exec.runID
	result["request_id"] = exec.requestID
	result["node_run_id"] = nodeRunID
	result["release_id"] = exec.releaseID
	return result
}

func (s SpaceService) executeCanvasFlowNode(
	ctx context.Context,
	exec canvasRunExecution,
	node canvasRunNode,
	inputContext canvasNodeInputContext,
	nodeRunID uint64,
	executionInput map[string]any,
) (canvasNodeExecutionResult, error) {
	if node.FlowID == 0 {
		return canvasNodeExecutionResult{}, fmt.Errorf("%s 未选择流程", canvasRunNodeTitle(node))
	}
	started := map[string]any{}
	if exec.resumeFrom == node.ID {
		started = exec.resumeRun
	} else {
		started = canvasWaitingFlowRunRef(ctx, exec.runID, node.ID)
	}
	externalRequestID := strings.TrimSpace(firstText(executionInput["external_request_id"]))
	if len(started) == 0 {
		started = canvasProjectRunRef(ctx, exec.projectID, externalRequestID)
	}
	if len(started) == 0 {
		prompt := canvasPromptWithInputContext("", inputContext)
		var err error
		started, err = s.runFlow(ctx, exec.projectID, node.FlowID, externalRequestID, canvasParamsWithInputContext(map[string]any{
			"prompt":        prompt,
			"asset_cate_id": firstUint64(node.AssetCateID, exec.assetCateID),
		}, inputContext))
		if err != nil {
			return canvasNodeExecutionResult{}, err
		}
	}
	snapshot, err := s.waitCanvasFlowCompletion(ctx, exec.projectID, started)
	if err != nil {
		return canvasNodeExecutionResult{}, err
	}
	status := canvasFlowRunStatus(snapshot)
	if status == teammodel.RunStatusWaiting {
		return canvasNodeResultFromMap(map[string]any{
			"run_id":      exec.runID,
			"request_id":  exec.requestID,
			"flow_run_id": canvasFlowRunID(snapshot),
			"node_run_id": nodeRunID,
			"status":      teammodel.RunStatusWaiting,
			"output":      snapshot,
			"pending":     true,
			"interaction": canvasFlowInteraction(snapshot),
		}, teammodel.RunStatusWaiting), nil
	}
	if status != teammodel.RunStatusSuccess {
		return canvasNodeExecutionResult{}, fmt.Errorf("%s 运行失败: %s", canvasRunNodeTitle(node), firstText(canvasFlowRunError(snapshot), "流程运行失败"))
	}
	assetCateID := firstUint64(node.AssetCateID, exec.assetCateID)
	output := canvasFlowOutput(snapshot)
	resultName := firstText(node.Title, "流程结果")
	resultKind := firstText(node.Kind, "mixed")
	source := CanvasResultSource{}
	if latest := s.latestCanvasRunResult(ctx, exec.projectID, assetCateID, canvasFlowRunID(snapshot)); latest != nil {
		output = latest.Content
		resultName = firstText(latest.Name, resultName)
		resultKind = firstText(latest.Kind, resultKind)
		source = latest.Source
	}
	saved, err := s.SaveCanvasMaterial(ctx, exec.projectID, SaveCanvasResultRequest{
		AssetCateID: assetCateID,
		Name:        resultName,
		Kind:        resultKind,
		Content:     output,
		RunID:       exec.runID,
		NodeRunID:   nodeRunID,
		ReleaseID:   exec.releaseID,
		NodeKey:     node.ID,
		Source:      source,
	})
	if err != nil {
		return canvasNodeExecutionResult{}, err
	}
	result := canvasNodeResultFromMap(map[string]any{
		"run_id":          exec.runID,
		"request_id":      exec.requestID,
		"flow_run_id":     canvasFlowRunID(snapshot),
		"node_run_id":     nodeRunID,
		"release_id":      exec.releaseID,
		"persists_result": true,
		"role":            saved["role"],
		"status":          teammodel.RunStatusSuccess,
		"output":          output,
		"asset":           saved["asset"],
		"version":         saved["version"],
		"flow_status":     snapshot,
	}, teammodel.RunStatusSuccess)
	return result, nil
}

func (s SpaceService) executeCanvasFunctionNode(
	ctx context.Context,
	exec canvasRunExecution,
	node canvasRunNode,
	inputContext canvasNodeInputContext,
	nodeRunID uint64,
) (canvasNodeExecutionResult, error) {
	switch node.FunctionKey {
	case "display":
		output := canvasInputContextOutput(inputContext)
		if output == nil {
			return canvasNodeExecutionResult{}, fmt.Errorf("展示节点没有可展示的上游结果")
		}
		return canvasNodeResultFromMap(map[string]any{
			"run_id":      exec.runID,
			"request_id":  exec.requestID,
			"node_run_id": nodeRunID,
			"release_id":  exec.releaseID,
			"status":      teammodel.RunStatusSuccess,
			"output":      output,
		}, teammodel.RunStatusSuccess), nil
	case "save":
		output := canvasInputContextOutput(inputContext)
		if output == nil {
			return canvasNodeExecutionResult{}, fmt.Errorf("保存节点没有可保存的上游结果")
		}
		source := canvasResultSourceFromInput(inputContext)
		saved, err := s.SaveCanvasContent(ctx, exec.projectID, SaveCanvasResultRequest{
			AssetCateID: firstUint64(node.AssetCateID, exec.assetCateID),
			Name:        canvasSaveNodeAssetName(node, inputContext),
			Kind:        firstText(node.Kind, "mixed"),
			Content:     output,
			RunID:       exec.runID,
			NodeRunID:   nodeRunID,
			ReleaseID:   exec.releaseID,
			NodeKey:     node.ID,
			Source:      source,
		})
		if err != nil {
			return canvasNodeExecutionResult{}, err
		}
		return canvasNodeResultFromMap(map[string]any{
			"run_id":          exec.runID,
			"request_id":      exec.requestID,
			"node_run_id":     nodeRunID,
			"release_id":      exec.releaseID,
			"persists_result": true,
			"role":            saved["role"],
			"status":          teammodel.RunStatusSuccess,
			"output":          output,
			"asset":           saved["asset"],
			"version":         saved["version"],
		}, teammodel.RunStatusSuccess), nil
	case "import":
		return s.executeCanvasAssetNode(ctx, exec, node, nodeRunID)
	case "start":
		return canvasNodeExecutionResult{Status: teammodel.RunStatusSuccess, Result: map[string]any{"status": "completed"}}, nil
	default:
		return canvasNodeResultFromMap(map[string]any{
			"run_id":      exec.runID,
			"request_id":  exec.requestID,
			"node_run_id": nodeRunID,
			"release_id":  exec.releaseID,
			"status":      teammodel.RunStatusSuccess,
			"output":      "操作已应用",
		}, teammodel.RunStatusSuccess), nil
	}
}

func (s SpaceService) waitCanvasFlowCompletion(ctx context.Context, projectID uint64, started map[string]any) (map[string]any, error) {
	runID := uint64Value(started["run_id"])
	requestID := strings.TrimSpace(firstText(started["request_id"]))
	if runID == 0 {
		return nil, fmt.Errorf("流程运行ID不能为空")
	}
	var snapshot map[string]any
	for index := 0; index < canvasFlowPollAttempts; index++ {
		status, err := s.RunStatus(ctx, projectID, runID, requestID)
		if err != nil {
			return nil, err
		}
		snapshot = status
		switch canvasFlowRunStatus(status) {
		case teammodel.RunStatusSuccess, teammodel.RunStatusFail, teammodel.RunStatusCanceled, teammodel.RunStatusWaiting:
			return status, nil
		}
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(canvasFlowPollInterval):
		}
	}
	return snapshot, fmt.Errorf("%w: 流程仍在运行，请稍后刷新查看结果", errCanvasExternalStillRunning)
}

func (s SpaceService) markCanvasNodeRun(
	ctx context.Context,
	exec canvasRunExecution,
	node canvasRunNode,
	status string,
	output any,
	errorText string,
	agentRunID uint64,
) error {
	_, err := s.finishCanvasNodeRunRecord(ctx, FinishCanvasNodeRunRequest{
		RunID:      exec.runID,
		RequestID:  exec.requestID,
		NodeRunID:  exec.nodeRuns[node.ID],
		NodeKey:    node.ID,
		Status:     status,
		Output:     output,
		Error:      errorText,
		AgentRunID: agentRunID,
	})
	return err
}

func (s SpaceService) markCanvasStartNodeRun(ctx context.Context, exec canvasRunExecution, node canvasRunNode) error {
	return s.markCanvasNodeRun(ctx, exec, node, teammodel.RunStatusSuccess, map[string]any{
		"run_id":          exec.runID,
		"request_id":      exec.requestID,
		"flow_run_id":     exec.flowRunID,
		"node_run_id":     exec.nodeRuns[node.ID],
		"release_id":      exec.releaseID,
		"node_key":        node.ID,
		"node_type":       node.Type,
		"persists_result": false,
		"status":          teammodel.RunStatusSuccess,
	}, "", 0)
}

func (s SpaceService) markCanvasRunWaiting(
	ctx context.Context,
	exec canvasRunExecution,
	node canvasRunNode,
	result canvasNodeExecutionResult,
	output any,
) {
	now := time.Now()
	teammodel.NewRunModel().Update(ctx, map[string]any{"id": exec.runID}, map[string]any{
		"status":     teammodel.RunStatusWaiting,
		"output":     canvasRunJSON(output),
		"error":      "",
		"updated_at": now,
	})
	teammodel.NewFlowRunModel().Update(ctx, map[string]any{"id": exec.flowRunID}, map[string]any{
		"status":     teammodel.RunStatusWaiting,
		"output":     canvasRunJSON(result.Result),
		"error":      "",
		"updated_at": now,
	})
	teammodel.NewNodeRunModel().Update(ctx, map[string]any{"id": exec.nodeRuns[node.ID]}, map[string]any{
		"status":     teammodel.RunStatusWaiting,
		"output":     canvasRunJSON(result.Result),
		"error":      "",
		"updated_at": now,
	})
}

func canvasCompletedNodeResults(
	ctx context.Context,
	exec canvasRunExecution,
) (map[string]bool, map[string]canvasNodeExecutionResult) {
	completed := map[string]bool{}
	results := map[string]canvasNodeExecutionResult{}
	nodeByID := canvasExecutionNodeMap(exec.plan.Nodes)
	rows := teammodel.NewNodeRunModel().Select(ctx, map[string]any{"run_id": exec.runID})
	for _, row := range rows {
		if row == nil {
			continue
		}
		node, ok := nodeByID[row.NodeKey]
		if !ok {
			continue
		}
		if row.Status == teammodel.RunStatusCanceled {
			completed[row.NodeKey] = true
			continue
		}
		if row.Status != teammodel.RunStatusSuccess {
			continue
		}
		result := canvasNodeResultFromMap(jsonObject(row.Output), row.Status)
		result.Node = node
		result.NodeRunID = row.ID
		result.AgentRunID = firstUint64(result.AgentRunID, row.AgentRunID)
		completed[row.NodeKey] = true
		results[row.NodeKey] = result
	}
	if exec.resumeFrom != "" {
		delete(completed, exec.resumeFrom)
		delete(results, exec.resumeFrom)
	}
	return completed, results
}

func canvasExecutionNodeMap(nodes []canvasRunNode) map[string]canvasRunNode {
	result := make(map[string]canvasRunNode, len(nodes))
	for _, node := range nodes {
		result[node.ID] = node
	}
	return result
}

func canvasRunNodeRunIDs(ctx context.Context, runID uint64) map[string]uint64 {
	result := map[string]uint64{}
	for _, row := range teammodel.NewNodeRunModel().Select(ctx, map[string]any{"run_id": runID}) {
		if row != nil && row.NodeKey != "" {
			result[row.NodeKey] = row.ID
		}
	}
	return result
}

func canvasRunNodeStatuses(ctx context.Context, runID uint64) map[string]string {
	result := map[string]string{}
	for _, row := range teammodel.NewNodeRunModel().Select(ctx, map[string]any{"run_id": runID}) {
		if row != nil && row.NodeKey != "" {
			result[row.NodeKey] = row.Status
		}
	}
	return result
}

func canvasRunFlowRunID(ctx context.Context, runID uint64) uint64 {
	row := teammodel.NewFlowRunModel().Find(ctx, map[string]any{
		"run_id":  runID,
		"flow_id": 0,
	})
	if row == nil {
		return 0
	}
	return row.ID
}

func canvasWaitingNode(
	nodeKey string,
	plan canvasExecutionPlan,
	statuses map[string]string,
) (canvasRunNode, error) {
	nodeByID := canvasExecutionNodeMap(plan.Nodes)
	nodeKey = strings.TrimSpace(nodeKey)
	if nodeKey != "" {
		node, ok := nodeByID[nodeKey]
		if !ok {
			return canvasRunNode{}, fmt.Errorf("等待节点不存在")
		}
		if statuses[nodeKey] != teammodel.RunStatusWaiting {
			return canvasRunNode{}, fmt.Errorf("节点不是等待状态")
		}
		return node, nil
	}
	for _, node := range plan.Nodes {
		if statuses[node.ID] == teammodel.RunStatusWaiting {
			return node, nil
		}
	}
	return canvasRunNode{}, fmt.Errorf("未找到等待节点")
}

func canvasExecutionNodeSet(nodes []canvasRunNode) map[string]bool {
	result := make(map[string]bool, len(nodes))
	for _, node := range nodes {
		result[node.ID] = true
	}
	return result
}

func canvasReadyNodeIDs(order []string, incoming map[string][]string, executable map[string]bool, completed map[string]bool) []string {
	result := []string{}
	for _, nodeID := range order {
		if !executable[nodeID] || completed[nodeID] {
			continue
		}
		ready := true
		for _, sourceID := range incoming[nodeID] {
			if executable[sourceID] && !completed[sourceID] {
				ready = false
				break
			}
		}
		if ready {
			result = append(result, nodeID)
		}
	}
	return result
}

func markCanvasCompletedDownstream(
	nodeID string,
	outgoing map[string][]string,
	executable map[string]bool,
	completed map[string]bool,
) []string {
	result := []string{}
	for _, targetID := range outgoing[nodeID] {
		if !executable[targetID] || completed[targetID] {
			continue
		}
		completed[targetID] = true
		result = append(result, targetID)
		result = append(result, markCanvasCompletedDownstream(targetID, outgoing, executable, completed)...)
	}
	return result
}

func canvasInputContext(
	nodeID string,
	incoming map[string][]string,
	results map[string]canvasNodeExecutionResult,
) canvasNodeInputContext {
	sourceIDs := incoming[nodeID]
	sources := make([]map[string]any, 0, len(sourceIDs))
	lines := []string{}
	var latest *canvasNodeExecutionResult
	for _, sourceID := range sourceIDs {
		source, ok := results[sourceID]
		if !ok {
			continue
		}
		if !canvasHasContextOutput(source.Output) {
			continue
		}
		current := source
		latest = &current
		text := canvasStringifyContextValue(source.Output)
		sources = append(sources, map[string]any{
			"nodeId":    source.Node.ID,
			"title":     canvasRunNodeTitle(source.Node),
			"type":      source.Node.Type,
			"output":    source.Output,
			"resultRef": canvasNodeResultRef(source),
			"preview": map[string]any{
				"text": text,
			},
		})
		if text != "" {
			lines = append(lines, fmt.Sprintf("[%s]\n%s", canvasRunNodeTitle(source.Node), text))
		}
	}
	return canvasNodeInputContext{
		Text:    strings.Join(lines, "\n\n"),
		Sources: sources,
		Latest:  latest,
	}
}

func canvasManualInputContext(runInput map[string]any) canvasNodeInputContext {
	row := canvasManualInputContextPayload(runInput)
	if len(row) == 0 {
		return canvasNodeInputContext{}
	}
	sources := []map[string]any{}
	if items, ok := row["sources"].([]any); ok {
		for _, item := range items {
			source := spaceMapValue(item)
			if len(source) > 0 && canvasHasContextOutput(source["output"]) {
				sources = append(sources, source)
			}
		}
	}
	text := strings.TrimSpace(firstText(row["text"]))
	if text == "" {
		lines := []string{}
		for _, source := range sources {
			title := firstText(source["title"], source["nodeId"], "上游节点")
			outputText := canvasStringifyContextValue(source["output"])
			if outputText != "" {
				lines = append(lines, fmt.Sprintf("[%s]\n%s", title, outputText))
			}
		}
		text = strings.Join(lines, "\n\n")
	}
	return canvasNodeInputContext{
		Text:    text,
		Sources: sources,
	}
}

func canvasManualInputContextPayload(runInput map[string]any) map[string]any {
	userInput := spaceMapValue(runInput["input"])
	if len(userInput) == 0 {
		return nil
	}
	return spaceMapValue(userInput["_manual_input_context"])
}

func canvasPromptWithInputContext(prompt string, inputContext canvasNodeInputContext) string {
	prompt = strings.TrimSpace(prompt)
	if inputContext.Text == "" {
		return prompt
	}
	if prompt == "" {
		prompt = "继续处理上游内容"
	}
	return fmt.Sprintf("%s\n\n上游上下文:\n%s", prompt, inputContext.Text)
}

func canvasParamsWithInputContext(params map[string]any, inputContext canvasNodeInputContext) map[string]any {
	result := map[string]any{}
	for key, value := range params {
		result[key] = value
	}
	if len(inputContext.Sources) == 0 {
		return result
	}
	result["input_context"] = inputContext.Sources
	result["upstream_context"] = inputContext.Text
	if _, ok := result["context"]; !ok {
		result["context"] = inputContext.Text
	}
	return result
}

func canvasNodeExecutionInput(
	node canvasRunNode,
	inputContext canvasNodeInputContext,
	exec canvasRunExecution,
	feedback map[string]any,
) map[string]any {
	prompt := canvasPromptWithInputContext(node.ComposerPrompt, inputContext)
	params := canvasParamsWithInputContext(node.ComposerParams, inputContext)
	result := canvasRunNodeInput(node)
	result["external_request_id"] = canvasNodeExternalRequestID(exec, node, feedback)
	if exec.resumeKey != "" {
		result["resume_key"] = exec.resumeKey
	}
	result["prompt"] = prompt
	result["params"] = params
	result["context"] = inputContext.Sources
	result["upstream_context"] = inputContext.Text
	if files, ok := params["files"]; ok {
		result["files"] = files
	}
	if len(feedback) > 0 {
		result["feedback"] = feedback
	}
	return result
}

func canvasNodeExternalRequestID(exec canvasRunExecution, node canvasRunNode, feedback map[string]any) string {
	nodeRunID := firstUint64(exec.nodeRuns[node.ID], stableCanvasNodeID(node.ID))
	attemptID := uint64(0)
	if exec.resumeKey != "" {
		attemptID = stableCanvasNodeID(exec.resumeKey)
	} else if len(feedback) > 0 {
		attemptID = stableCanvasNodeID(canvasRunJSON(feedback))
	}
	return fmt.Sprintf("c_%s_%s_%s",
		canvasCompactUint64(exec.runID),
		canvasCompactUint64(nodeRunID),
		canvasCompactUint64(attemptID),
	)
}

func canvasCompactUint64(value uint64) string {
	return strconv.FormatUint(value, 36)
}

func canvasResumeKey(now time.Time) string {
	return "r" + strconv.FormatInt(now.UnixNano(), 36)
}

func (s SpaceService) persistCanvasResumeInput(ctx context.Context, exec canvasRunExecution, node canvasRunNode) {
	_, results := canvasCompletedNodeResults(ctx, exec)
	inputContext := canvasInputContext(node.ID, exec.plan.Incoming, results)
	s.updateCanvasNodeInput(ctx, exec, node, canvasNodeExecutionInput(node, inputContext, exec, exec.feedback))
}

func canvasReusableStoredNodeInput(ctx context.Context, nodeRunID uint64) map[string]any {
	if nodeRunID == 0 {
		return nil
	}
	row := teammodel.NewNodeRunModel().Find(ctx, map[string]any{"id": nodeRunID})
	if row == nil {
		return nil
	}
	input := jsonObject(row.Input)
	if strings.TrimSpace(firstText(input["external_request_id"])) == "" {
		return nil
	}
	if row.Status == teammodel.RunStatusRunning {
		return input
	}
	if strings.TrimSpace(firstText(input["resume_key"])) != "" {
		return input
	}
	return nil
}

func (s SpaceService) updateCanvasNodeInput(
	ctx context.Context,
	exec canvasRunExecution,
	node canvasRunNode,
	input map[string]any,
) {
	s.replaceCanvasNodeInput(ctx, exec.nodeRuns[node.ID], input)
}

func (s SpaceService) replaceCanvasNodeInput(ctx context.Context, nodeRunID uint64, input map[string]any) {
	if nodeRunID == 0 {
		return
	}
	teammodel.NewNodeRunModel().Update(ctx, map[string]any{"id": nodeRunID}, map[string]any{
		"input":      canvasRunJSON(input),
		"updated_at": time.Now(),
	})
}

func (s SpaceService) mergeCanvasNodeInput(ctx context.Context, nodeRunID uint64, patch map[string]any) {
	if nodeRunID == 0 || len(patch) == 0 {
		return
	}
	row := teammodel.NewNodeRunModel().Find(ctx, map[string]any{"id": nodeRunID})
	if row == nil {
		return
	}
	input := jsonObject(row.Input)
	for key, value := range patch {
		input[key] = value
	}
	s.replaceCanvasNodeInput(ctx, nodeRunID, input)
}

func canvasInputContextOutput(inputContext canvasNodeInputContext) any {
	if inputContext.Latest != nil && inputContext.Latest.Output != nil {
		return inputContext.Latest.Output
	}
	if inputContext.Text != "" {
		return map[string]any{"text": inputContext.Text}
	}
	return nil
}

func canvasSaveNodeAssetName(node canvasRunNode, inputContext canvasNodeInputContext) string {
	if inputContext.Latest != nil {
		return firstText(inputContext.Latest.Node.Title, node.Title, "画布资产")
	}
	return firstText(node.Title, "画布资产")
}

func canvasResultSourceFromInput(inputContext canvasNodeInputContext) CanvasResultSource {
	if inputContext.Latest == nil {
		return CanvasResultSource{}
	}
	result := inputContext.Latest
	assetID := uint64Value(result.Asset["id"])
	versionID := uint64Value(result.Version["id"])
	return CanvasResultSource{
		RunID:     uint64Value(result.Result["run_id"]),
		NodeRunID: uint64Value(result.Result["node_run_id"]),
		AssetID:   assetID,
		VersionID: versionID,
		ReleaseID: uint64Value(result.Result["release_id"]),
		RequestID: firstText(result.Result["request_id"]),
		NodeKey:   result.Node.ID,
		NodeType:  result.Node.Type,
		Status:    result.Status,
	}
}

func canvasNodeResultRef(result canvasNodeExecutionResult) map[string]any {
	ref := map[string]any{}
	assignCanvasRefNumber(ref, "run_id", result.Result["run_id"])
	assignCanvasRefText(ref, "request_id", result.Result["request_id"])
	assignCanvasRefNumber(ref, "flow_run_id", result.Result["flow_run_id"])
	assignCanvasRefNumber(ref, "node_run_id", result.Result["node_run_id"])
	assignCanvasRefNumber(ref, "agent_run_id", result.AgentRunID)
	assignCanvasRefNumber(ref, "asset_id", result.Asset["id"])
	assignCanvasRefNumber(ref, "version_id", firstUint64(uint64Value(result.Version["id"]), uint64Value(result.Asset["version_id"])))
	assignCanvasRefNumber(ref, "release_id", result.Result["release_id"])
	assignCanvasRefText(ref, "role", firstText(result.Result["role"], result.Asset["role"]))
	assignCanvasRefText(ref, "status", result.Status)
	return ref
}

func canvasNodeResultFromMap(result map[string]any, status string) canvasNodeExecutionResult {
	if result == nil {
		result = map[string]any{}
	}
	asset := spaceMapValue(result["asset"])
	version := spaceMapValue(result["version"])
	if len(version) == 0 {
		version = spaceMapValue(asset["version"])
	}
	output := firstDefinedCanvasValue(result["output"], version["content"], spaceMapValue(result["data"])["output"])
	return canvasNodeExecutionResult{
		Status:     status,
		Output:     output,
		Asset:      asset,
		Version:    version,
		Result:     result,
		AgentRunID: uint64Value(result["agent_run_id"]),
	}
}

func canvasNodeResultsPayload(results map[string]canvasNodeExecutionResult) []map[string]any {
	items := make([]map[string]any, 0, len(results))
	for _, result := range results {
		items = append(items, canvasNodeResultPayload(result))
	}
	return items
}

func canvasNodeResultPayload(result canvasNodeExecutionResult) map[string]any {
	payload := map[string]any{
		"node_key":        result.Node.ID,
		"node_type":       result.Node.Type,
		"node_run_id":     result.NodeRunID,
		"status":          result.Status,
		"output":          result.Output,
		"result":          result.Result,
		"persists_result": result.Node.PersistsResult,
	}
	if len(result.Asset) > 0 {
		payload["asset"] = result.Asset
	}
	if len(result.Version) > 0 {
		payload["version"] = result.Version
	}
	if result.AgentRunID > 0 {
		payload["agent_run_id"] = result.AgentRunID
	}
	return payload
}

func canvasRunOutput(
	startNodeID string,
	executed int,
	results map[string]canvasNodeExecutionResult,
	pending canvasNodeExecutionResult,
) map[string]any {
	if results == nil {
		results = map[string]canvasNodeExecutionResult{}
	}
	output := map[string]any{
		"executed":      executed,
		"start_node_id": startNodeID,
		"node_results":  canvasNodeResultsPayload(results),
	}
	if pending.Status != "" {
		output["pending_node"] = canvasNodeResultPayload(pending)
	}
	return output
}

func canvasFlowRunStatus(snapshot map[string]any) string {
	run := spaceMapValue(snapshot["run"])
	return strings.TrimSpace(firstText(run["status"], snapshot["status"]))
}

func canvasFlowRunID(snapshot map[string]any) uint64 {
	run := spaceMapValue(snapshot["run"])
	return firstUint64(uint64Value(run["id"]), uint64Value(snapshot["run_id"]))
}

func canvasWaitingFlowRunRef(ctx context.Context, runID uint64, nodeKey string) map[string]any {
	row := teammodel.NewNodeRunModel().Find(ctx, map[string]any{
		"run_id":   runID,
		"node_key": nodeKey,
	})
	if row == nil {
		return nil
	}
	output := jsonObject(row.Output)
	snapshot := spaceMapValue(output["output"])
	run := spaceMapValue(snapshot["run"])
	internalRunID := uint64Value(run["id"])
	if internalRunID == 0 {
		internalRunID = uint64Value(snapshot["run_id"])
	}
	if internalRunID == 0 {
		return nil
	}
	return map[string]any{
		"run_id":     internalRunID,
		"request_id": firstText(run["request_id"], snapshot["request_id"]),
	}
}

func canvasProjectRunRef(ctx context.Context, projectID uint64, requestID string) map[string]any {
	requestID = strings.TrimSpace(requestID)
	if projectID == 0 || requestID == "" {
		return nil
	}
	row := teammodel.NewRunModel().Find(ctx, map[string]any{
		"project_id": projectID,
		"request_id": requestID,
	})
	if row == nil {
		return nil
	}
	return map[string]any{
		"run_id":     row.ID,
		"request_id": row.RequestID,
		"status":     row.Status,
		"release_id": row.ReleaseID,
	}
}

func canvasFlowRunError(snapshot map[string]any) string {
	run := spaceMapValue(snapshot["run"])
	return strings.TrimSpace(firstText(run["error"], snapshot["error"]))
}

func canvasFlowOutput(snapshot map[string]any) any {
	run := spaceMapValue(snapshot["run"])
	if output := run["output"]; output != nil {
		return output
	}
	if blackboard := snapshot["blackboard"]; blackboard != nil {
		return map[string]any{"blackboard": blackboard}
	}
	return snapshot
}

func canvasFlowInteraction(snapshot map[string]any) map[string]any {
	approvals := canvasFlowApprovals(snapshot)
	if len(approvals) == 0 {
		return nil
	}
	for _, approval := range approvals {
		if strings.TrimSpace(firstText(approval["status"])) == teammodel.RunStatusPending {
			return map[string]any{
				"type":     "approval",
				"approval": approval,
			}
		}
	}
	return nil
}

func canvasFlowApprovals(snapshot map[string]any) []map[string]any {
	switch rows := snapshot["approvals"].(type) {
	case []map[string]any:
		return rows
	case []any:
		result := make([]map[string]any, 0, len(rows))
		for _, item := range rows {
			if approval := spaceMapValue(item); len(approval) > 0 {
				result = append(result, approval)
			}
		}
		return result
	default:
		return nil
	}
}

func canvasStringifyContextValue(value any) string {
	if value == nil {
		return ""
	}
	if text, ok := value.(string); ok {
		return strings.TrimSpace(text)
	}
	content, err := json.Marshal(value)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(content))
}

func canvasHasContextOutput(value any) bool {
	text := canvasStringifyContextValue(value)
	if text == "" || text == "{}" || text == "[]" || text == "null" {
		return false
	}
	return true
}

func firstDefinedCanvasValue(values ...any) any {
	for _, value := range values {
		if value != nil {
			return value
		}
	}
	return nil
}

func assignCanvasRefNumber(target map[string]any, key string, value any) {
	number := uint64Value(value)
	if number > 0 {
		target[key] = number
	}
}

func assignCanvasRefText(target map[string]any, key string, value any) {
	text := strings.TrimSpace(firstText(value))
	if text != "" {
		target[key] = text
	}
}
