package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	workmodel "my/module/work/model"
	agentaction "my/package/bot/service/agent/action"
)

const canvasAgentMemoryLimit = 12

type CanvasAgentMemoryScope struct {
	ProjectID   uint64
	AssetCateID uint64
	NodeKey     string
	AgentID     uint64
	RunID       uint64
	NodeRunID   uint64
	AgentRunID  uint64
}

type canvasAgentMemoryEntry struct {
	Role string
	Text string
	Data any
}

func (s SpaceService) canvasAgentHistory(ctx context.Context, scope CanvasAgentMemoryScope) []any {
	if scope.ProjectID == 0 || scope.AgentID == 0 || strings.TrimSpace(scope.NodeKey) == "" {
		return []any{}
	}
	rows := workmodel.NewCanvasAgentMemoryModel().Select(
		ctx,
		map[string]any{
			"project_id":    scope.ProjectID,
			"asset_cate_id": scope.AssetCateID,
			"node_key":      strings.TrimSpace(scope.NodeKey),
			"agent_id":      scope.AgentID,
		},
		map[string]any{
			"order": "main.id desc",
			"limit": fmt.Sprintf("%d", canvasAgentMemoryLimit),
		},
	)
	result := make([]any, 0, len(rows))
	for index := len(rows) - 1; index >= 0; index-- {
		if entry := decodeCanvasAgentMemory(rows[index]); entry != nil {
			result = append(result, entry)
		}
	}
	return result
}

func (s SpaceService) appendCanvasAgentMemory(ctx context.Context, scope CanvasAgentMemoryScope, entries ...canvasAgentMemoryEntry) {
	if scope.ProjectID == 0 || scope.AgentID == 0 || strings.TrimSpace(scope.NodeKey) == "" {
		return
	}
	now := time.Now()
	model := workmodel.NewCanvasAgentMemoryModel()
	for _, entry := range entries {
		content := normalizeCanvasAgentMemoryEntry(entry, now)
		if len(content) == 0 {
			continue
		}
		model.Insert(ctx, map[string]any{
			"project_id":    scope.ProjectID,
			"asset_cate_id": scope.AssetCateID,
			"agent_id":      scope.AgentID,
			"node_key":      strings.TrimSpace(scope.NodeKey),
			"role":          strings.TrimSpace(entry.Role),
			"content":       canvasRunJSON(content),
			"run_id":        scope.RunID,
			"node_run_id":   scope.NodeRunID,
			"agent_run_id":  scope.AgentRunID,
			"created_at":    now,
		})
	}
}

func decodeCanvasAgentMemory(row *workmodel.CanvasAgentMemory) map[string]any {
	if row == nil {
		return nil
	}
	value := map[string]any{}
	if err := json.Unmarshal([]byte(strings.TrimSpace(row.Content)), &value); err != nil {
		return nil
	}
	if strings.TrimSpace(spaceTextValue(value["role"])) == "" {
		value["role"] = strings.TrimSpace(row.Role)
	}
	return value
}

func normalizeCanvasAgentMemoryEntry(entry canvasAgentMemoryEntry, now time.Time) map[string]any {
	role := strings.TrimSpace(entry.Role)
	text := strings.TrimSpace(entry.Text)
	data := canvasAgentMemoryData(entry.Data)
	if text == "" && data == nil {
		return nil
	}
	result := map[string]any{}
	if role != "" {
		result["role"] = role
	}
	if text != "" {
		result["text"] = text
	}
	if data != nil {
		result["data"] = data
	}
	if len(result) == 0 {
		return nil
	}
	result["createdAt"] = now.UTC().Format(time.RFC3339Nano)
	return result
}

func canvasAgentMemoryText(output map[string]any, summary string) string {
	if text := firstText(summary, agentaction.SummaryText(output)); text != "" && text != "{}" {
		return text
	}
	if len(output) > 0 {
		return canvasRunJSON(output)
	}
	return ""
}

func canvasAgentMemoryData(value any) any {
	switch current := value.(type) {
	case map[string]any:
		if len(current) == 0 {
			return nil
		}
	case []any:
		if len(current) == 0 {
			return nil
		}
	}
	return value
}

func canvasAgentUserMemory(input map[string]any) canvasAgentMemoryEntry {
	return canvasAgentMemoryEntry{
		Role: "user",
		Text: firstText(input["prompt"], input["text"], input["message"]),
	}
}

func canvasAgentFeedbackMemory(input map[string]any) canvasAgentMemoryEntry {
	feedback := spaceMapValue(input["feedback"])
	if len(feedback) == 0 {
		return canvasAgentMemoryEntry{}
	}
	return canvasAgentMemoryEntry{
		Role: "feedback",
		Text: "用户补充信息",
		Data: feedback,
	}
}

func canvasAgentAssistantMemory(output map[string]any, summary string) canvasAgentMemoryEntry {
	return canvasAgentMemoryEntry{
		Role: "assistant",
		Text: canvasAgentMemoryText(output, summary),
		Data: output,
	}
}

func canvasAgentInteractionMemoryText(interaction map[string]any, summary string) string {
	return firstText(
		interaction["description"],
		interaction["title"],
		summary,
		"需要补充信息",
	)
}
