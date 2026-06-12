package service

import (
	"encoding/json"
	"fmt"
)

type persistedCanvas struct {
	AssetCateID uint64
	Nodes       []any
	Edges       []any
	Viewport    map[string]any
}

var allowedCanvasNodeFields = map[string]bool{
	"id":              true,
	"type":            true,
	"title":           true,
	"subtitle":        true,
	"description":     true,
	"x":               true,
	"y":               true,
	"width":           true,
	"height":          true,
	"asset_cate_id":   true,
	"kind":            true,
	"cardinality":     true,
	"count":           true,
	"flow":            true,
	"role":            true,
	"asset":           true,
	"power":           true,
	"function_option": true,
	"composer_draft":  true,
	"result_ref":      true,
	"local":           true,
}

var allowedCanvasEdgeFields = map[string]bool{
	"id":   true,
	"from": true,
	"to":   true,
}

var allowedCanvasViewportFields = map[string]bool{
	"x":    true,
	"y":    true,
	"zoom": true,
}

var forbiddenCanvasNodeFields = map[string]bool{
	"result":            true,
	"generatedOutput":   true,
	"generated_output":  true,
	"generatedPreview":  true,
	"generated_preview": true,
	"hasResult":         true,
	"has_result":        true,
	"feedbackRequests":  true,
	"feedback_requests": true,
	"running":           true,
	"status":            true,
}

var allowedCanvasFlowFields = map[string]bool{
	"id":   true,
	"key":  true,
	"name": true,
	"goal": true,
}

var allowedCanvasRoleFields = map[string]bool{
	"id":            true,
	"name":          true,
	"role_type":     true,
	"agent_id":      true,
	"asset_cate_id": true,
}

var allowedCanvasAssetFields = map[string]bool{
	"id":            true,
	"name":          true,
	"kind":          true,
	"role":          true,
	"asset_cate_id": true,
	"version_id":    true,
}

var allowedCanvasPowerFields = map[string]bool{
	"id":   true,
	"key":  true,
	"name": true,
	"kind": true,
	"icon": true,
}

var allowedCanvasFunctionOptionFields = map[string]bool{
	"key":         true,
	"label":       true,
	"description": true,
}

var allowedCanvasComposerDraftFields = map[string]bool{
	"prompt":             true,
	"selected_target_id": true,
	"param_values":       true,
}

var allowedCanvasResultRefFields = map[string]bool{
	"run_id":      true,
	"request_id":  true,
	"flow_run_id": true,
	"node_run_id": true,
	"asset_id":    true,
	"version_id":  true,
	"release_id":  true,
	"role":        true,
	"status":      true,
	"updated_at":  true,
}

func sanitizeCanvasPayload(assetCateID uint64, canvas map[string]any) (persistedCanvas, error) {
	if canvas == nil {
		return persistedCanvas{}, fmt.Errorf("画布不能为空")
	}
	canvasAssetCateID := uint64Value(canvas["asset_cate_id"])
	if canvasAssetCateID > 0 && assetCateID > 0 && canvasAssetCateID != assetCateID {
		return persistedCanvas{}, fmt.Errorf("画布资产分类不一致")
	}
	if assetCateID == 0 {
		assetCateID = canvasAssetCateID
	}
	nodes, err := sanitizeCanvasList(canvas["nodes"], allowedCanvasNodeFields, validateCanvasNode)
	if err != nil {
		return persistedCanvas{}, fmt.Errorf("画布节点格式错误: %w", err)
	}
	edges, err := sanitizeCanvasList(canvas["edges"], allowedCanvasEdgeFields, validateCanvasEdge)
	if err != nil {
		return persistedCanvas{}, fmt.Errorf("画布连线格式错误: %w", err)
	}
	viewport, err := sanitizeCanvasViewport(canvas["viewport"])
	if err != nil {
		return persistedCanvas{}, fmt.Errorf("画布视图格式错误: %w", err)
	}
	return persistedCanvas{
		AssetCateID: assetCateID,
		Nodes:       nodes,
		Edges:       edges,
		Viewport:    viewport,
	}, nil
}

func sanitizeCanvasList(value any, allowed map[string]bool, validate func(map[string]any) error) ([]any, error) {
	if value == nil {
		return []any{}, nil
	}
	items, ok := value.([]any)
	if !ok {
		return nil, fmt.Errorf("expected list")
	}
	result := make([]any, 0, len(items))
	for _, item := range items {
		row, ok := item.(map[string]any)
		if !ok {
			return nil, fmt.Errorf("expected object")
		}
		clean := map[string]any{}
		for key, field := range row {
			if forbiddenCanvasNodeFields[key] {
				return nil, fmt.Errorf("字段 %s 不能持久化", key)
			}
			if !allowed[key] {
				return nil, fmt.Errorf("字段 %s 不允许持久化", key)
			}
			if field != nil {
				clean[key] = field
			}
		}
		if err := validate(clean); err != nil {
			return nil, err
		}
		result = append(result, clean)
	}
	return result, nil
}

func sanitizeCanvasViewport(value any) (map[string]any, error) {
	if value == nil {
		return map[string]any{}, nil
	}
	row, ok := value.(map[string]any)
	if !ok {
		return nil, fmt.Errorf("expected object")
	}
	clean := map[string]any{}
	for key, field := range row {
		if !allowedCanvasViewportFields[key] {
			return nil, fmt.Errorf("字段 %s 不允许持久化", key)
		}
		if field != nil {
			clean[key] = field
		}
	}
	return clean, nil
}

func validateCanvasNode(row map[string]any) error {
	if spaceTextValue(row["id"]) == "" {
		return fmt.Errorf("节点缺少 id")
	}
	if err := sanitizeCanvasNodeNested(row); err != nil {
		return err
	}
	switch spaceTextValue(row["type"]) {
	case "asset", "power", "agent", "flow", "function":
		return nil
	default:
		return fmt.Errorf("节点类型无效")
	}
}

func sanitizeCanvasNodeNested(row map[string]any) error {
	var err error
	if row["flow"], err = sanitizeOptionalCanvasObject(row["flow"], allowedCanvasFlowFields); err != nil {
		return fmt.Errorf("flow.%w", err)
	}
	if row["role"], err = sanitizeOptionalCanvasObject(row["role"], allowedCanvasRoleFields); err != nil {
		return fmt.Errorf("role.%w", err)
	}
	if row["asset"], err = sanitizeOptionalCanvasObject(row["asset"], allowedCanvasAssetFields); err != nil {
		return fmt.Errorf("asset.%w", err)
	}
	if row["power"], err = sanitizeOptionalCanvasObject(row["power"], allowedCanvasPowerFields); err != nil {
		return fmt.Errorf("power.%w", err)
	}
	if row["function_option"], err = sanitizeOptionalCanvasObject(row["function_option"], allowedCanvasFunctionOptionFields); err != nil {
		return fmt.Errorf("function_option.%w", err)
	}
	if row["composer_draft"], err = sanitizeComposerDraft(row["composer_draft"]); err != nil {
		return fmt.Errorf("composer_draft.%w", err)
	}
	if row["result_ref"], err = sanitizeOptionalCanvasObject(row["result_ref"], allowedCanvasResultRefFields); err != nil {
		return fmt.Errorf("result_ref.%w", err)
	}
	removeEmptyCanvasObjects(row)
	return nil
}

func sanitizeOptionalCanvasObject(value any, allowed map[string]bool) (any, error) {
	if value == nil {
		return nil, nil
	}
	row, ok := value.(map[string]any)
	if !ok {
		return nil, fmt.Errorf("expected object")
	}
	clean := map[string]any{}
	for key, field := range row {
		if !allowed[key] {
			return nil, fmt.Errorf("字段 %s 不允许持久化", key)
		}
		if field != nil {
			clean[key] = field
		}
	}
	if len(clean) == 0 {
		return nil, nil
	}
	return clean, nil
}

func sanitizeComposerDraft(value any) (any, error) {
	if value == nil {
		return nil, nil
	}
	row, ok := value.(map[string]any)
	if !ok {
		return nil, fmt.Errorf("expected object")
	}
	clean := map[string]any{}
	for key, field := range row {
		if !allowedCanvasComposerDraftFields[key] {
			return nil, fmt.Errorf("字段 %s 不允许持久化", key)
		}
		if key == "param_values" && !isJSONCanvasValue(field) {
			return nil, fmt.Errorf("param_values 只能保存 JSON 值")
		}
		if field != nil {
			clean[key] = field
		}
	}
	if len(clean) == 0 {
		return nil, nil
	}
	return clean, nil
}

func removeEmptyCanvasObjects(row map[string]any) {
	for _, key := range []string{"flow", "role", "asset", "power", "function_option", "composer_draft", "result_ref"} {
		if row[key] == nil {
			delete(row, key)
		}
	}
}

func isJSONCanvasValue(value any) bool {
	switch current := value.(type) {
	case nil, string, bool, float64, int, int64, uint64:
		return true
	case []any:
		for _, item := range current {
			if !isJSONCanvasValue(item) {
				return false
			}
		}
		return true
	case map[string]any:
		for _, item := range current {
			if !isJSONCanvasValue(item) {
				return false
			}
		}
		return true
	default:
		return false
	}
}

func validateCanvasEdge(row map[string]any) error {
	if spaceTextValue(row["from"]) == "" || spaceTextValue(row["to"]) == "" {
		return fmt.Errorf("连线缺少 from/to")
	}
	return nil
}

func marshalCleanCanvasList(items []any) (string, error) {
	if items == nil {
		items = []any{}
	}
	content, err := json.Marshal(items)
	if err != nil {
		return "", err
	}
	return string(content), nil
}

func marshalCleanCanvasObject(row map[string]any) (string, error) {
	if row == nil {
		row = map[string]any{}
	}
	content, err := json.Marshal(row)
	if err != nil {
		return "", err
	}
	return string(content), nil
}
