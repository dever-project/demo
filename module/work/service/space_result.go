package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	workmodel "my/module/work/model"
	assetmodel "my/package/bot/model/asset"
	assetservice "my/package/bot/service/asset"
	teamservice "my/package/bot/service/team"
)

type CanvasResultPurpose string

const (
	CanvasResultMaterial CanvasResultPurpose = "material_result"
	CanvasResultContent  CanvasResultPurpose = "content_save"
	CanvasResultEdit     CanvasResultPurpose = "version_edit"
)

type SaveCanvasResultRequest struct {
	AssetCateID uint64
	Name        string
	Kind        string
	Purpose     CanvasResultPurpose
	Content     any
	RunID       uint64
	NodeRunID   uint64
	ReleaseID   uint64
	NodeKey     string
	SourceKey   string
	RequestID   string
	Source      CanvasResultSource
}

type CanvasResultSource struct {
	RunID     uint64
	NodeRunID uint64
	AssetID   uint64
	VersionID uint64
	ReleaseID uint64
	RequestID string
	NodeKey   string
	NodeType  string
	Status    string
}

type CanvasResultQuery struct {
	AssetCateID uint64
	RunID       uint64
	NodeRunID   uint64
	AssetID     uint64
	Purpose     CanvasResultPurpose
}

type canvasLatestRunResult struct {
	Name    string
	Kind    string
	Content any
	Source  CanvasResultSource
}

type canvasSavedAssetVersion struct {
	Asset   *assetmodel.Asset
	Version *assetmodel.Version
}

func (s SpaceService) SaveCanvasResult(ctx context.Context, projectID uint64, req SaveCanvasResultRequest) (map[string]any, error) {
	project, err := s.project.RequireProject(ctx, projectID)
	if err != nil {
		return nil, err
	}
	assetCate, err := s.requireProjectAssetCate(ctx, project.TeamID, req.AssetCateID)
	if err != nil {
		return nil, err
	}
	role, err := canvasResultRole(req.Purpose)
	if err != nil {
		return nil, err
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = assetCate.Name
	}
	kind := strings.TrimSpace(req.Kind)
	if kind == "" {
		kind = assetCate.Kind
	}
	releaseID := req.ReleaseID
	if releaseID == 0 {
		releaseID = project.ReleaseID
	}
	if existing := s.existingCanvasResult(ctx, project.ID, assetCate.ID, role, req); len(existing) > 0 {
		return existing, nil
	}
	nodeKey := strings.TrimSpace(req.NodeKey)
	sourceKey := canvasResultSourceKey(req)
	saveName := name
	if nodeKey != "" || sourceKey != "" {
		saveName = s.canvasResultAssetName(ctx, project.ID, assetCate.ID, role, CanvasResultPurpose(req.Purpose), nodeKey, sourceKey, name)
	}
	lockParts := canvasResultVersionLockParts(assetCate.ID, role, CanvasResultPurpose(req.Purpose), nodeKey, sourceKey, saveName)
	saved, err := withCanvasAssetVersionLock(ctx, project.ID, lockParts, func() (canvasSavedAssetVersion, error) {
		savedAsset, version, err := s.asset.SaveVersion(ctx, assetservice.SaveVersionRequest{
			ProjectID:   project.ID,
			BodyID:      project.BodyID,
			TeamID:      project.TeamID,
			AssetCateID: assetCate.ID,
			RunID:       req.RunID,
			NodeRunID:   req.NodeRunID,
			ReleaseID:   releaseID,
			Name:        saveName,
			Kind:        kind,
			Role:        role,
			Content:     req.Content,
			Sort:        100,
		})
		return canvasSavedAssetVersion{Asset: savedAsset, Version: version}, err
	})
	if err != nil {
		return nil, err
	}
	if saved.Asset == nil || saved.Version == nil {
		return nil, fmt.Errorf("资产版本保存失败")
	}
	s.recordCanvasResultAsset(ctx, project.ID, assetCate.ID, saved.Asset.ID, saved.Version.ID, CanvasResultPurpose(req.Purpose), nodeKey, sourceKey, name, req, releaseID)
	return map[string]any{
		"persists_result": true,
		"asset":           s.asset.AssetDetailMap(ctx, *saved.Asset, saved.Version),
		"version":         assetservice.VersionToMap(*saved.Version),
		"role":            role,
	}, nil
}

func (s SpaceService) existingCanvasResult(
	ctx context.Context,
	projectID uint64,
	assetCateID uint64,
	role string,
	req SaveCanvasResultRequest,
) map[string]any {
	if strings.TrimSpace(req.RequestID) != "" && req.Purpose != "" {
		if existing := s.existingCanvasResultByRequestID(ctx, projectID, role, req); len(existing) > 0 {
			return existing
		}
	}
	if req.RunID == 0 || req.NodeRunID == 0 || req.Purpose == "" {
		return nil
	}
	items := s.canvasResultItems(ctx, projectID, CanvasResultQuery{
		AssetCateID: assetCateID,
		RunID:       req.RunID,
		NodeRunID:   req.NodeRunID,
		Purpose:     req.Purpose,
	})
	if len(items) == 0 {
		return nil
	}
	asset := items[0]
	version := spaceMapValue(asset["version"])
	if len(version) == 0 {
		return nil
	}
	return map[string]any{
		"persists_result": true,
		"asset":           asset,
		"version":         version,
		"role":            role,
	}
}

func (s SpaceService) existingCanvasResultByRequestID(
	ctx context.Context,
	projectID uint64,
	role string,
	req SaveCanvasResultRequest,
) map[string]any {
	row := workmodel.NewCanvasAssetVersionSourceModel().Find(ctx, map[string]any{
		"project_id": projectID,
		"purpose":    string(req.Purpose),
		"request_id": strings.TrimSpace(req.RequestID),
	})
	if row == nil || row.AssetID == 0 || row.VersionID == 0 {
		return nil
	}
	asset := s.asset.FindProjectAsset(ctx, projectID, row.AssetID)
	if asset == nil {
		return nil
	}
	version := s.asset.FindVersion(ctx, row.VersionID)
	if version == nil || version.AssetID != asset.ID {
		return nil
	}
	assetPayload := s.asset.AssetDetailMap(ctx, *asset, version)
	versionPayload := assetservice.VersionToMap(*version)
	assetPayload["version"] = versionPayload
	return map[string]any{
		"persists_result": true,
		"asset":           assetPayload,
		"version":         versionPayload,
		"role":            role,
	}
}

func (s SpaceService) CanvasResults(ctx context.Context, projectID uint64, req CanvasResultQuery) (map[string]any, error) {
	if _, err := s.project.RequireProject(ctx, projectID); err != nil {
		return nil, err
	}
	if req.RunID == 0 && req.NodeRunID == 0 && req.AssetID == 0 {
		return nil, fmt.Errorf("请指定运行、节点运行或资产")
	}
	items := s.canvasResultItems(ctx, projectID, req)
	return map[string]any{
		"items": items,
		"total": len(items),
	}, nil
}

func (s SpaceService) canvasResultItems(ctx context.Context, projectID uint64, req CanvasResultQuery) []map[string]any {
	filter := map[string]any{}
	if req.RunID > 0 {
		filter["run_id"] = req.RunID
	}
	if req.NodeRunID > 0 {
		filter["node_run_id"] = req.NodeRunID
	}
	if req.AssetID > 0 {
		filter["asset_id"] = req.AssetID
	}
	rows := assetmodel.NewVersionModel().Select(ctx, filter)
	items := make([]map[string]any, 0, len(rows))
	seen := map[uint64]bool{}
	for _, version := range rows {
		if version == nil || seen[version.ID] {
			continue
		}
		asset := s.asset.FindProjectAsset(ctx, projectID, version.AssetID)
		if asset == nil || !canvasResultAssetMatches(*asset, req) {
			continue
		}
		source := canvasResultSourceByVersion(ctx, projectID, version.ID)
		if req.Purpose != "" && (source == nil || source.Purpose != string(req.Purpose)) {
			continue
		}
		item := s.asset.AssetDetailMap(ctx, *asset, version)
		item["version"] = assetservice.VersionToMap(*version)
		if source != nil {
			item["canvas_source"] = canvasResultSourcePayload(*source)
		}
		items = append(items, item)
		seen[version.ID] = true
	}
	return items
}

func (s SpaceService) SaveCanvasMaterial(ctx context.Context, projectID uint64, req SaveCanvasResultRequest) (map[string]any, error) {
	req.Purpose = CanvasResultMaterial
	return s.SaveCanvasResult(ctx, projectID, req)
}

func (s SpaceService) SaveCanvasContent(ctx context.Context, projectID uint64, req SaveCanvasResultRequest) (map[string]any, error) {
	req.Purpose = CanvasResultContent
	return s.SaveCanvasResult(ctx, projectID, req)
}

func canvasResultRole(purpose CanvasResultPurpose) (string, error) {
	switch purpose {
	case CanvasResultMaterial:
		return assetmodel.RoleMaterial, nil
	case CanvasResultContent:
		return assetmodel.RoleContent, nil
	default:
		return "", fmt.Errorf("未知的画布结果保存目的")
	}
}

func canvasResultVersionLockParts(
	assetCateID uint64,
	role string,
	purpose CanvasResultPurpose,
	nodeKey string,
	sourceKey string,
	saveName string,
) []string {
	return []string{
		fmt.Sprintf("canvas-result:%d", assetCateID),
		strings.TrimSpace(role),
		string(purpose),
		strings.TrimSpace(nodeKey),
		strings.TrimSpace(sourceKey),
		strings.TrimSpace(saveName),
	}
}

func (s SpaceService) canvasResultAssetName(ctx context.Context, projectID uint64, assetCateID uint64, role string, purpose CanvasResultPurpose, nodeKey string, sourceKey string, displayName string) string {
	row := workmodel.NewCanvasAssetModel().Find(ctx, map[string]any{
		"project_id":    projectID,
		"asset_cate_id": assetCateID,
		"purpose":       string(purpose),
		"node_key":      nodeKey,
		"source_key":    sourceKey,
	})
	if row == nil || row.AssetID == 0 {
		return canvasStableAssetName(displayName, purpose, nodeKey, sourceKey)
	}
	asset := s.asset.FindProjectAsset(ctx, projectID, row.AssetID)
	if asset == nil || asset.AssetCateID != assetCateID || asset.Role != role {
		return canvasStableAssetName(displayName, purpose, nodeKey, sourceKey)
	}
	return asset.Name
}

func (s SpaceService) recordCanvasResultAsset(ctx context.Context, projectID uint64, assetCateID uint64, assetID uint64, versionID uint64, purpose CanvasResultPurpose, nodeKey string, sourceKey string, displayName string, req SaveCanvasResultRequest, releaseID uint64) {
	now := time.Now()
	if nodeKey != "" || sourceKey != "" {
		assetModel := workmodel.NewCanvasAssetModel()
		filter := map[string]any{
			"project_id":    projectID,
			"asset_cate_id": assetCateID,
			"purpose":       string(purpose),
			"node_key":      nodeKey,
			"source_key":    sourceKey,
		}
		record := map[string]any{
			"asset_id":   assetID,
			"name":       displayName,
			"updated_at": now,
		}
		if row := assetModel.Find(ctx, filter); row == nil {
			record["project_id"] = projectID
			record["asset_cate_id"] = assetCateID
			record["purpose"] = string(purpose)
			record["node_key"] = nodeKey
			record["source_key"] = sourceKey
			record["created_at"] = now
			assetModel.Insert(ctx, record)
		} else {
			assetModel.Update(ctx, map[string]any{"id": row.ID}, record)
		}
	}

	source := req.Source
	insertCanvasAssetVersionSource(ctx, map[string]any{
		"project_id":         projectID,
		"asset_id":           assetID,
		"version_id":         versionID,
		"purpose":            string(purpose),
		"run_id":             req.RunID,
		"node_run_id":        req.NodeRunID,
		"release_id":         releaseID,
		"node_key":           nodeKey,
		"source_key":         sourceKey,
		"request_id":         strings.TrimSpace(req.RequestID),
		"source_run_id":      source.RunID,
		"source_node_run_id": source.NodeRunID,
		"source_asset_id":    source.AssetID,
		"source_version_id":  source.VersionID,
		"source_release_id":  source.ReleaseID,
		"source_request_id":  strings.TrimSpace(source.RequestID),
		"source_node_key":    strings.TrimSpace(source.NodeKey),
		"source_node_type":   strings.TrimSpace(source.NodeType),
		"source_node_status": strings.TrimSpace(source.Status),
		"created_at":         now,
	})
}

func insertCanvasAssetVersionSource(ctx context.Context, record map[string]any) {
	defer func() {
		_ = recover()
	}()
	workmodel.NewCanvasAssetVersionSourceModel().Insert(ctx, record)
}

func (s SpaceService) recordCanvasPowerResult(ctx context.Context, projectID uint64, req teamservice.CanvasPowerRunRequest, runID uint64, nodeRunID uint64, result map[string]any) {
	asset := spaceMapValue(result["asset"])
	version := spaceMapValue(result["version"])
	assetID := uint64Value(asset["id"])
	versionID := uint64Value(version["id"])
	if assetID == 0 || versionID == 0 {
		return
	}
	releaseID := uint64Value(version["release_id"])
	if releaseID == 0 {
		releaseID = req.ReleaseID
	}
	assetmodel.NewVersionModel().Update(ctx, map[string]any{"id": versionID}, map[string]any{
		"run_id":      runID,
		"node_run_id": nodeRunID,
		"release_id":  releaseID,
	})
	s.recordCanvasResultAsset(ctx, projectID, req.AssetCateID, assetID, versionID, CanvasResultMaterial, strings.TrimSpace(req.NodeKey), "", strings.TrimSpace(req.NodeName), SaveCanvasResultRequest{
		RunID:     runID,
		NodeRunID: nodeRunID,
		ReleaseID: releaseID,
		NodeKey:   strings.TrimSpace(req.NodeKey),
	}, releaseID)
	normalizeCanvasPowerResultRefs(result, runID, nodeRunID, releaseID)
}

func normalizeCanvasPowerResultRefs(result map[string]any, runID uint64, nodeRunID uint64, releaseID uint64) {
	if len(result) == 0 {
		return
	}
	if externalRunID := uint64Value(result["run_id"]); externalRunID > 0 && externalRunID != runID {
		result["power_run_id"] = externalRunID
	}
	if externalNodeRunID := uint64Value(result["node_run_id"]); externalNodeRunID > 0 && externalNodeRunID != nodeRunID {
		result["power_node_run_id"] = externalNodeRunID
	}
	if externalRequestID := strings.TrimSpace(firstText(result["request_id"])); externalRequestID != "" {
		result["power_request_id"] = externalRequestID
	}
	result["run_id"] = runID
	result["node_run_id"] = nodeRunID
	result["release_id"] = releaseID
	normalizeCanvasPowerVersionRefs(spaceMapValue(result["version"]), runID, nodeRunID, releaseID)
	asset := spaceMapValue(result["asset"])
	normalizeCanvasPowerVersionRefs(spaceMapValue(asset["version"]), runID, nodeRunID, releaseID)
}

func normalizeCanvasPowerVersionRefs(version map[string]any, runID uint64, nodeRunID uint64, releaseID uint64) {
	if len(version) == 0 {
		return
	}
	version["run_id"] = runID
	version["node_run_id"] = nodeRunID
	version["release_id"] = releaseID
}

func (s SpaceService) latestCanvasRunResult(ctx context.Context, projectID uint64, assetCateID uint64, runID uint64) *canvasLatestRunResult {
	if projectID == 0 || runID == 0 {
		return nil
	}
	var fallback *canvasLatestRunResult
	for _, version := range assetmodel.NewVersionModel().Select(ctx, map[string]any{"run_id": runID}) {
		if version == nil {
			continue
		}
		asset := s.asset.FindProjectAsset(ctx, projectID, version.AssetID)
		if asset == nil || (assetCateID > 0 && asset.AssetCateID != assetCateID) {
			continue
		}
		versionPayload := assetservice.VersionToMap(*version)
		result := &canvasLatestRunResult{
			Name:    asset.Name,
			Kind:    asset.Kind,
			Content: versionPayload["content"],
			Source: CanvasResultSource{
				RunID:     version.RunID,
				NodeRunID: version.NodeRunID,
				AssetID:   asset.ID,
				VersionID: version.ID,
				ReleaseID: version.ReleaseID,
				Status:    "success",
			},
		}
		if asset.Role == assetmodel.RoleContent {
			return result
		}
		if fallback == nil {
			fallback = result
		}
	}
	return fallback
}

func canvasResultAssetMatches(asset assetmodel.Asset, req CanvasResultQuery) bool {
	if req.AssetCateID > 0 && asset.AssetCateID != req.AssetCateID {
		return false
	}
	return true
}

func canvasResultSourceByVersion(ctx context.Context, projectID uint64, versionID uint64) *workmodel.CanvasAssetVersionSource {
	if versionID == 0 {
		return nil
	}
	return workmodel.NewCanvasAssetVersionSourceModel().Find(ctx, map[string]any{
		"project_id": projectID,
		"version_id": versionID,
	})
}

func canvasResultSourcePayload(row workmodel.CanvasAssetVersionSource) map[string]any {
	return map[string]any{
		"id":                 row.ID,
		"project_id":         row.ProjectID,
		"asset_id":           row.AssetID,
		"version_id":         row.VersionID,
		"purpose":            row.Purpose,
		"run_id":             row.RunID,
		"node_run_id":        row.NodeRunID,
		"release_id":         row.ReleaseID,
		"node_key":           row.NodeKey,
		"source_key":         row.SourceKey,
		"request_id":         row.RequestID,
		"source_run_id":      row.SourceRunID,
		"source_node_run_id": row.SourceNodeRunID,
		"source_asset_id":    row.SourceAssetID,
		"source_version_id":  row.SourceVersionID,
		"source_release_id":  row.SourceReleaseID,
		"source_request_id":  row.SourceRequestID,
		"source_node_key":    row.SourceNodeKey,
		"source_node_type":   row.SourceNodeType,
		"source_node_status": row.SourceNodeStatus,
		"created_at":         row.CreatedAt,
	}
}

func canvasResultSourceKey(req SaveCanvasResultRequest) string {
	sourceKey := strings.TrimSpace(req.SourceKey)
	if sourceKey != "" {
		return sourceKey
	}
	if req.Purpose == CanvasResultContent {
		if req.Source.NodeKey != "" {
			return fmt.Sprintf("node:%s", strings.TrimSpace(req.Source.NodeKey))
		}
		if req.Source.AssetID > 0 {
			return fmt.Sprintf("asset:%d", req.Source.AssetID)
		}
	}
	return ""
}

func canvasStableAssetName(displayName string, purpose CanvasResultPurpose, nodeKey string, sourceKey string) string {
	name := truncateCanvasAssetName(strings.TrimSpace(displayName), 128)
	if nodeKey == "" && sourceKey == "" {
		return name
	}
	parts := []string{string(purpose), nodeKey, sourceKey}
	suffixParts := make([]string, 0, len(parts))
	for _, part := range parts {
		if current := strings.TrimSpace(part); current != "" {
			suffixParts = append(suffixParts, current)
		}
	}
	if len(suffixParts) == 0 {
		return name
	}
	if name == "" {
		name = "画布结果"
	}
	suffix := truncateCanvasAssetName(strings.Join(suffixParts, ":"), 64)
	maxNameLen := 128 - len([]rune(suffix)) - 3
	if maxNameLen < 1 {
		maxNameLen = 1
	}
	return fmt.Sprintf("%s [%s]", truncateCanvasAssetName(name, maxNameLen), suffix)
}

func truncateCanvasAssetName(value string, maxLen int) string {
	runes := []rune(strings.TrimSpace(value))
	if maxLen <= 0 || len(runes) <= maxLen {
		return string(runes)
	}
	return string(runes[:maxLen])
}
