package api

import (
	"encoding/json"

	"github.com/gofiber/fiber/v2"
	"github.com/shemic/dever/server"
	"github.com/shemic/dever/util"

	workservice "my/module/work/service"
	uploadservice "my/package/front/service/upload"
)

type Space struct{}

var spaceSvc = workservice.NewSpaceService()

func (Space) GetBootstrap(c *server.Context) error {
	projectID := util.ToUint64(c.Input("project_id"))
	data, err := spaceSvc.Bootstrap(c.Context(), projectID)
	return workJSON(c, data, err)
}

func (Space) GetPowers(c *server.Context) error {
	projectID := util.ToUint64(c.Input("project_id"))
	data, err := spaceSvc.PowerCatalog(c.Context(), projectID)
	return workJSON(c, data, err)
}

func (Space) GetCanvasPowerForm(c *server.Context) error {
	data, err := spaceSvc.CanvasPowerForm(
		c.Context(),
		queryUint64(c, "project_id"),
		queryUint64(c, "flow_id"),
		queryUint64(c, "power_id"),
		queryText(c, "power_key"),
		queryUint64(c, "target_id"),
	)
	return workJSON(c, data, err)
}

func (Space) PostChat(c *server.Context) error {
	body, err := bindBody(c)
	if err != nil {
		return c.Error(err)
	}
	data, err := spaceSvc.Chat(
		c.Context(),
		bodyUint64(body, "project_id"),
		bodyText(body, "message"),
		bodyUint64(body, "asset_cate_id"),
	)
	return workJSON(c, data, err)
}

func (Space) PostRunCanvas(c *server.Context) error {
	body, err := bindBody(c)
	if err != nil {
		return c.Error(err)
	}
	data, err := spaceSvc.RunCanvas(
		c.Context(),
		bodyUint64(body, "project_id"),
		workservice.RunCanvasRequest{
			AssetCateID: bodyUint64(body, "asset_cate_id"),
			StartNodeID: bodyText(body, "start_node_id"),
			RequestID:   bodyText(body, "request_id"),
			SingleNode:  bodyBool(body, "single_node"),
			Canvas:      bodyMap(body, "canvas"),
			Input:       bodyMap(body, "input"),
		},
	)
	return workJSON(c, data, err)
}

func (Space) PostRunCanvasResume(c *server.Context) error {
	body, err := bindBody(c)
	if err != nil {
		return c.Error(err)
	}
	data, err := spaceSvc.ResumeCanvasRun(
		c.Context(),
		bodyUint64(body, "project_id"),
		workservice.ResumeCanvasRunRequest{
			RunID:      bodyUint64(body, "run_id"),
			RequestID:  bodyText(body, "request_id"),
			NodeKey:    bodyText(body, "node_key"),
			ApprovalID: bodyUint64(body, "approval_id"),
			Decision:   bodyText(body, "decision"),
			Comment:    bodyText(body, "comment"),
			Feedback:   bodyMap(body, "feedback"),
		},
	)
	return workJSON(c, data, err)
}

func (Space) GetRunCanvasResults(c *server.Context) error {
	data, err := spaceSvc.CanvasResults(
		c.Context(),
		queryUint64(c, "project_id"),
		workservice.CanvasResultQuery{
			AssetCateID: queryUint64(c, "asset_cate_id"),
			RunID:       queryUint64(c, "run_id"),
			NodeRunID:   queryUint64(c, "node_run_id"),
			AssetID:     queryUint64(c, "asset_id"),
			Purpose:     workservice.CanvasResultPurpose(queryText(c, "purpose")),
		},
	)
	return workJSON(c, data, err)
}

func (Space) GetAsset(c *server.Context) error {
	data, err := spaceSvc.AssetDetail(
		c.Context(),
		queryUint64(c, "project_id"),
		queryUint64(c, "asset_id"),
	)
	return workJSON(c, data, err)
}

func (Space) PostRunCanvasRecover(c *server.Context) error {
	body, err := bindBody(c)
	if err != nil {
		return c.Error(err)
	}
	count := spaceSvc.RecoverRunningCanvasRuns(c.Context(), bodyUint64(body, "project_id"))
	return workJSON(c, map[string]any{"count": count}, nil)
}

func (Space) GetRunStatus(c *server.Context) error {
	data, err := spaceSvc.RunStatus(
		c.Context(),
		queryUint64(c, "project_id"),
		queryUint64(c, "run_id"),
		queryText(c, "request_id"),
	)
	return workJSON(c, data, err)
}

func (Space) PostApproval(c *server.Context) error {
	body, err := bindBody(c)
	if err != nil {
		return c.Error(err)
	}
	data, err := spaceSvc.SubmitApproval(
		c.Context(),
		bodyUint64(body, "project_id"),
		bodyUint64(body, "approval_id"),
		bodyText(body, "decision"),
		bodyText(body, "comment"),
		bodyMap(body, "data"),
	)
	return workJSON(c, data, err)
}

func (Space) PostCanvas(c *server.Context) error {
	body, err := bindBody(c)
	if err != nil {
		return c.Error(err)
	}
	data, err := spaceSvc.SaveCanvas(
		c.Context(),
		bodyUint64(body, "project_id"),
		bodyUint64(body, "asset_cate_id"),
		bodyText(body, "base_revision"),
		bodyMap(body, "canvas"),
	)
	return workJSON(c, data, err)
}

func (Space) PostAssetVersionSave(c *server.Context) error {
	body, err := bindBody(c)
	if err != nil {
		return c.Error(err)
	}
	data, err := spaceSvc.SaveAssetEditVersion(
		c.Context(),
		bodyUint64(body, "project_id"),
		bodyUint64(body, "asset_id"),
		bodyUint64(body, "version_id"),
		body["content"],
		bodyText(body, "request_id"),
	)
	return workJSON(c, data, err)
}

func (Space) PostAssetVersionUse(c *server.Context) error {
	body, err := bindBody(c)
	if err != nil {
		return c.Error(err)
	}
	data, err := spaceSvc.UseAssetVersion(
		c.Context(),
		bodyUint64(body, "project_id"),
		bodyUint64(body, "asset_id"),
		bodyUint64(body, "version_id"),
	)
	return workJSON(c, data, err)
}

func (Space) PostMaterial(c *server.Context) error {
	body, err := bindBody(c)
	if err != nil {
		return c.Error(err)
	}
	data, err := spaceSvc.SaveCanvasMaterial(
		c.Context(),
		bodyUint64(body, "project_id"),
		canvasResultRequestFromBody(body),
	)
	return workJSON(c, data, err)
}

func (Space) PostContent(c *server.Context) error {
	body, err := bindBody(c)
	if err != nil {
		return c.Error(err)
	}
	data, err := spaceSvc.SaveCanvasContent(
		c.Context(),
		bodyUint64(body, "project_id"),
		canvasResultRequestFromBody(body),
	)
	return workJSON(c, data, err)
}

func (Space) PostUploadInit(c *server.Context) error {
	body, err := bindBody(c)
	if err != nil {
		return c.Error(err)
	}
	projectID := bodyUint64(body, "project_id")
	if err := spaceSvc.PrepareUploadInit(c.Context(), projectID, body); err != nil {
		return workJSON(c, nil, err)
	}
	return rewriteJSONBody(c, body, uploadservice.InitUpload)
}

func (Space) PostUploadPart(c *server.Context) error {
	projectID := queryUint64(c, "project_id")
	sessionID := queryUint64(c, "session_id")
	if err := spaceSvc.RequireUploadSession(c.Context(), projectID, sessionID); err != nil {
		return workJSON(c, nil, err)
	}
	return uploadservice.UploadPart(c)
}

func (Space) PostUploadComplete(c *server.Context) error {
	body, err := bindBody(c)
	if err != nil {
		return c.Error(err)
	}
	projectID := bodyUint64(body, "project_id")
	sessionID := bodyUint64(body, "session_id")
	if err := spaceSvc.RequireUploadSession(c.Context(), projectID, sessionID); err != nil {
		return workJSON(c, nil, err)
	}
	return uploadservice.CompleteUpload(c)
}

func rewriteJSONBody(c *server.Context, body map[string]any, next func(*server.Context) error) error {
	raw, ok := c.Raw.(*fiber.Ctx)
	if !ok {
		return next(c)
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return c.Error(err)
	}
	raw.Request().Header.SetContentType("application/json")
	raw.Request().SetBody(payload)
	return next(c)
}

func bodyMap(body map[string]any, key string) map[string]any {
	if value, ok := body[key].(map[string]any); ok && value != nil {
		return value
	}
	return map[string]any{}
}

func canvasResultRequestFromBody(body map[string]any) workservice.SaveCanvasResultRequest {
	return workservice.SaveCanvasResultRequest{
		AssetCateID: bodyUint64(body, "asset_cate_id"),
		Name:        bodyText(body, "name"),
		Kind:        bodyText(body, "kind"),
		Content:     body["content"],
		RunID:       bodyUint64(body, "run_id"),
		NodeRunID:   bodyUint64(body, "node_run_id"),
		ReleaseID:   bodyUint64(body, "release_id"),
		NodeKey:     bodyText(body, "node_key"),
		SourceKey:   bodyText(body, "source_key"),
		RequestID:   bodyText(body, "request_id"),
		Source: workservice.CanvasResultSource{
			RunID:     bodyUint64(body, "source_run_id"),
			NodeRunID: bodyUint64(body, "source_node_run_id"),
			AssetID:   bodyUint64(body, "source_asset_id"),
			VersionID: bodyUint64(body, "source_version_id"),
			ReleaseID: bodyUint64(body, "source_release_id"),
			RequestID: bodyText(body, "source_request_id"),
			NodeKey:   bodyText(body, "source_node_key"),
			NodeType:  bodyText(body, "source_node_type"),
			Status:    bodyText(body, "source_status"),
		},
	}
}

func queryUint64(c *server.Context, key string) uint64 {
	return util.ToUint64(c.Input(key))
}

func queryText(c *server.Context, key string) string {
	return bodyText(map[string]any{key: c.Input(key)}, key)
}
