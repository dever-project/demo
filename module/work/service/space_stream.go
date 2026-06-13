package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	teammodel "my/package/bot/model/team"
	botstream "my/package/bot/service/stream"
	frontstream "my/package/front/service/stream"
)

const (
	canvasStreamNamespace = "work_canvas"

	canvasStreamScopeRun   = "canvas_run"
	canvasStreamScopeNode  = "canvas_node"
	canvasStreamScopeChild = "canvas_child"
)

var canvasStreamStore = frontstream.New(canvasStreamNamespace)

func (s SpaceService) ReadCanvasStream(ctx context.Context, projectID uint64, requestID string, lastID string, count int64, block time.Duration) ([]frontstream.Entry, error) {
	if projectID == 0 {
		return nil, fmt.Errorf("项目不能为空")
	}
	requestID = strings.TrimSpace(requestID)
	if requestID == "" {
		return nil, fmt.Errorf("request_id 不能为空")
	}
	if findCanvasRunByRequestID(ctx, projectID, requestID) == nil {
		return nil, fmt.Errorf("画布运行不存在")
	}
	return canvasStreamStore.Read(ctx, requestID, lastID, count, block)
}

func (s SpaceService) writeCanvasRunEvent(ctx context.Context, exec canvasRunExecution, event string, fields map[string]any) {
	if strings.TrimSpace(exec.requestID) == "" {
		return
	}
	if fields == nil {
		fields = map[string]any{}
	}
	fields["scope"] = canvasStreamScopeRun
	fields["run_id"] = exec.runID
	fields["flow_run_id"] = exec.flowRunID
	fields["project_id"] = exec.projectID
	fields["asset_cate_id"] = exec.assetCateID
	fields["release_id"] = exec.releaseID
	fields["start_node_id"] = exec.startNodeID
	if _, ok := fields["status"]; !ok {
		fields["status"] = teammodel.RunStatusRunning
	}
	_ = botstream.Write(ctx, canvasStreamStore, exec.requestID, botstream.FeatureFlow, event, fields)
}

func (s SpaceService) writeCanvasNodeEvent(ctx context.Context, exec canvasRunExecution, node canvasRunNode, status string, event string, fields map[string]any) {
	if strings.TrimSpace(exec.requestID) == "" {
		return
	}
	if fields == nil {
		fields = map[string]any{}
	}
	fields["scope"] = canvasStreamScopeNode
	fields["run_id"] = exec.runID
	fields["flow_run_id"] = exec.flowRunID
	fields["project_id"] = exec.projectID
	fields["asset_cate_id"] = exec.assetCateID
	fields["release_id"] = exec.releaseID
	fields["node_id"] = node.ID
	fields["node_key"] = node.ID
	fields["node_name"] = canvasRunNodeTitle(node)
	fields["node_type"] = node.Type
	fields["node_run_id"] = exec.nodeRuns[node.ID]
	fields["persists_result"] = node.PersistsResult
	fields["status"] = strings.TrimSpace(status)
	if fields["status"] == "" {
		fields["status"] = teammodel.RunStatusRunning
	}
	_ = botstream.Write(ctx, canvasStreamStore, exec.requestID, canvasStreamFeatureByNodeType(node.Type), event, fields)
}

func (s SpaceService) writeCanvasNodeRunEvent(ctx context.Context, exec canvasRunExecution, node canvasRunNode, status string, output any, errorText string, agentRunID uint64) {
	status = strings.TrimSpace(status)
	fields := map[string]any{}
	if output != nil {
		fields["output"] = output
	}
	if strings.TrimSpace(errorText) != "" {
		fields["error"] = strings.TrimSpace(errorText)
	}
	if agentRunID > 0 {
		fields["agent_run_id"] = agentRunID
	}
	switch status {
	case teammodel.RunStatusRunning:
		s.writeCanvasNodeEvent(ctx, exec, node, status, botstream.EventNodeStarted, fields)
	case teammodel.RunStatusWaiting:
		s.writeCanvasNodeEvent(ctx, exec, node, status, botstream.EventWaiting, fields)
	case teammodel.RunStatusSuccess:
		if output != nil {
			s.writeCanvasNodeEvent(ctx, exec, node, status, botstream.EventNodeOutput, fields)
		}
		s.writeCanvasNodeEvent(ctx, exec, node, status, botstream.EventNodeFinished, fields)
	case teammodel.RunStatusFail, teammodel.RunStatusCanceled:
		s.writeCanvasNodeEvent(ctx, exec, node, status, botstream.EventNodeFinished, fields)
	}
}

func (s SpaceService) writeCanvasRunResult(ctx context.Context, exec canvasRunExecution, payload map[string]any, msg string, status int) {
	if strings.TrimSpace(exec.requestID) == "" {
		return
	}
	if payload == nil {
		payload = map[string]any{}
	}
	_, _ = canvasStreamStore.WritePayload(ctx, exec.requestID, botstream.ResultPayload(exec.requestID, payload, msg, status))
}

func (s SpaceService) forwardCanvasChildStream(ctx context.Context, exec canvasRunExecution, node canvasRunNode, childPayload map[string]any) {
	if strings.TrimSpace(exec.requestID) == "" || len(childPayload) == 0 {
		return
	}
	payload := cloneStreamPayload(childPayload)
	payload["request_id"] = exec.requestID
	output := streamPayloadOutput(payload)
	output["scope"] = canvasStreamScopeChild
	output["parent_request_id"] = exec.requestID
	output["parent_run_id"] = exec.runID
	output["parent_flow_run_id"] = exec.flowRunID
	output["project_id"] = exec.projectID
	output["asset_cate_id"] = exec.assetCateID
	output["release_id"] = exec.releaseID
	output["node_id"] = node.ID
	output["node_key"] = node.ID
	output["node_name"] = canvasRunNodeTitle(node)
	output["node_type"] = node.Type
	output["node_run_id"] = exec.nodeRuns[node.ID]
	if childRequestID := strings.TrimSpace(frontstream.InputText(childPayload["request_id"])); childRequestID != "" {
		output["child_request_id"] = childRequestID
	}
	payload["output"] = botstream.NormalizeOutput(canvasStreamFeatureByNodeType(node.Type), output)
	payload["type"] = "stream"
	if _, ok := payload["status"]; !ok {
		payload["status"] = 1
	}
	_, _ = canvasStreamStore.WritePayload(ctx, exec.requestID, payload)
}

func (s SpaceService) streamCanvasTeamChild(ctx context.Context, exec canvasRunExecution, node canvasRunNode, childRequestID string) func() {
	childRequestID = strings.TrimSpace(childRequestID)
	if childRequestID == "" {
		return func() {}
	}
	streamCtx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		defer close(done)
		lastID := "0-0"
		for {
			entries, err := s.team.ReadStream(streamCtx, childRequestID, lastID, 100, time.Second)
			for _, entry := range entries {
				if strings.TrimSpace(entry.ID) != "" {
					lastID = entry.ID
				}
				if entry.Payload != nil {
					s.forwardCanvasChildStream(context.Background(), exec, node, entry.Payload)
				}
			}
			if err != nil && streamCtx.Err() != nil {
				return
			}
			select {
			case <-streamCtx.Done():
				return
			default:
			}
		}
	}()
	return func() {
		cancel()
		select {
		case <-done:
		case <-time.After(2 * time.Second):
		case <-ctx.Done():
		}
	}
}

func streamPayloadOutput(payload map[string]any) map[string]any {
	if output, ok := payload["output"].(map[string]any); ok && output != nil {
		return output
	}
	output := map[string]any{}
	payload["output"] = output
	return output
}

func cloneStreamPayload(payload map[string]any) map[string]any {
	result := make(map[string]any, len(payload))
	for key, value := range payload {
		result[key] = value
	}
	if output, ok := payload["output"].(map[string]any); ok && output != nil {
		copiedOutput := make(map[string]any, len(output))
		for key, value := range output {
			copiedOutput[key] = value
		}
		result["output"] = copiedOutput
	}
	return result
}

func canvasStreamFeatureByNodeType(nodeType string) string {
	switch strings.TrimSpace(nodeType) {
	case "power":
		return botstream.FeaturePower
	case "agent":
		return botstream.FeatureAgent
	case "flow":
		return botstream.FeatureFlow
	default:
		return botstream.FeatureFlow
	}
}
