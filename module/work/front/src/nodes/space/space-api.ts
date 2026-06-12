import {
  buildRuntimeRequestHeaders,
  joinSiteApi,
  request,
} from "@dever/front-plugin";
import {
  normalizeCanvasState,
  normalizePowerCatalog,
  normalizeProjectAsset,
  normalizeSpaceBootstrap,
} from "./space-model";
import { persistedCanvasState } from "./space-canvas-state";
import type {
  CanvasResultSourceRef,
  PowerForm,
  PowerKindOption,
  PowerOption,
  ProjectAsset,
  SpaceBootstrap,
  SpaceCanvasState,
} from "./types";

export async function fetchSpaceBootstrap(
  projectId: number,
): Promise<SpaceBootstrap> {
  const result = await request(joinSiteApi("space/bootstrap"), "get", {
    project_id: projectId,
  });
  if (!isSuccessResponse(result)) {
    throw new Error(result.message || result.msg || "加载创作空间失败");
  }
  return normalizeSpaceBootstrap(result.data);
}

export async function sendSpaceMessage(
  projectId: number,
  assetCateId: number,
  message: string,
) {
  const result = await request(joinSiteApi("space/chat"), "post", {
    project_id: projectId,
    asset_cate_id: assetCateId,
    message,
  });
  if (!isSuccessResponse(result)) {
    throw new Error(result.message || result.msg || "发送失败");
  }
  return result.data;
}
export async function fetchSpacePowers(projectId: number): Promise<{
  powers: PowerOption[];
  powerKinds: PowerKindOption[];
}> {
  const result = await request(joinSiteApi("space/powers"), "get", {
    project_id: projectId,
  });
  if (!isSuccessResponse(result)) {
    throw new Error(result.message || result.msg || "加载能力列表失败");
  }
  return normalizePowerCatalog(result.data);
}

export async function fetchSpacePowerForm(input: {
  projectId: number;
  flowId?: number;
  powerId: number;
  powerKey: string;
  targetId?: number;
}): Promise<PowerForm> {
  const result = await request(joinSiteApi("space/canvas_power_form"), "get", {
    project_id: input.projectId,
    flow_id: input.flowId || 0,
    power_id: input.powerId,
    power_key: input.powerKey,
    target_id: input.targetId || 0,
  });
  if (!isSuccessResponse(result)) {
    throw new Error(result.message || result.msg || "加载能力参数失败");
  }
  return normalizePowerForm(result.data);
}

export async function runSpaceCanvas(input: {
  projectId: number;
  assetCateId: number;
  startNodeId: string;
  requestId?: string;
  singleNode?: boolean;
  canvas: SpaceCanvasState;
  runInput?: Record<string, unknown>;
}) {
  const result = await request(joinSiteApi("space/run_canvas"), "post", {
    project_id: input.projectId,
    asset_cate_id: input.assetCateId,
    start_node_id: input.startNodeId,
    request_id: input.requestId || "",
    single_node: Boolean(input.singleNode),
    canvas: persistedCanvasState(input.canvas),
    input: input.runInput || {},
  });
  if (!isSuccessResponse(result)) {
    throw new Error(result.message || result.msg || "启动画布运行失败");
  }
  return result.data;
}

export async function fetchSpaceCanvasResults(input: {
  projectId: number;
  assetCateId?: number;
  runId?: number;
  nodeRunId?: number;
  assetId?: number;
  purpose?: "material_result" | "content_save";
}): Promise<{ items: ProjectAsset[]; total: number }> {
  const result = await request(joinSiteApi("space/run_canvas_results"), "get", {
    project_id: input.projectId,
    asset_cate_id: input.assetCateId || 0,
    run_id: input.runId || 0,
    node_run_id: input.nodeRunId || 0,
    asset_id: input.assetId || 0,
    purpose: input.purpose || "",
  });
  if (!isSuccessResponse(result)) {
    throw new Error(result.message || result.msg || "读取画布结果失败");
  }
  const data = result.data || {};
  const items = Array.isArray(data.items)
    ? data.items.map(normalizeProjectAsset)
    : [];
  return {
    items,
    total: Number(data.total || items.length),
  };
}

export async function recoverSpaceCanvasRuns(projectId: number) {
  const result = await request(joinSiteApi("space/run_canvas_recover"), "post", {
    project_id: projectId,
  });
  if (!isSuccessResponse(result)) {
    throw new Error(result.message || result.msg || "恢复画布运行失败");
  }
  return result.data as { count?: number };
}

export async function resumeSpaceCanvas(input: {
  projectId: number;
  runId: number;
  requestId: string;
  nodeKey: string;
  approvalId?: number;
  feedback?: Record<string, unknown>;
  decision?: string;
  comment?: string;
}) {
  const result = await request(joinSiteApi("space/run_canvas_resume"), "post", {
    project_id: input.projectId,
    run_id: input.runId,
    request_id: input.requestId,
    node_key: input.nodeKey,
    approval_id: input.approvalId || 0,
    feedback: input.feedback || {},
    decision: input.decision || "approved",
    comment: input.comment || "",
  });
  if (!isSuccessResponse(result)) {
    throw new Error(result.message || result.msg || "继续画布运行失败");
  }
  return result.data;
}

export async function fetchSpaceRunStatus(input: {
  projectId: number;
  runId?: number;
  requestId?: string;
}) {
  const result = await request(joinSiteApi("space/run_status"), "get", {
    project_id: input.projectId,
    run_id: input.runId || 0,
    request_id: input.requestId || "",
  });
  if (!isSuccessResponse(result)) {
    throw new Error(result.message || result.msg || "读取流程状态失败");
  }
  return result.data;
}

export async function submitSpaceApproval(input: {
  projectId: number;
  approvalId: number;
  data: Record<string, unknown>;
  comment?: string;
  decision?: "approved" | "rejected";
}) {
  const result = await request(joinSiteApi("space/approval"), "post", {
    project_id: input.projectId,
    approval_id: input.approvalId,
    decision: input.decision || "approved",
    comment: input.comment || "",
    data: input.data,
  });
  if (!isSuccessResponse(result)) {
    throw new Error(result.message || result.msg || "提交反馈失败");
  }
  return result.data;
}

export async function saveSpaceAssetEditVersion(input: {
  projectId: number;
  assetId: number;
  versionId: number;
  content: unknown;
  requestId?: string;
}): Promise<ProjectAsset> {
  const result = await request(joinSiteApi("space/asset_version_save"), "post", {
    project_id: input.projectId,
    asset_id: input.assetId,
    version_id: input.versionId,
    content: input.content,
    request_id: input.requestId || "",
  });
  if (!isSuccessResponse(result)) {
    throw new Error(result.message || result.msg || "保存资产失败");
  }
  const asset = (result.data as any)?.asset;
  if (!asset) {
    throw new Error("保存资产后未返回资产内容");
  }
  return normalizeProjectAsset(asset);
}

export async function useSpaceAssetVersion(input: {
  projectId: number;
  assetId: number;
  versionId: number;
}): Promise<ProjectAsset> {
  const result = await request(joinSiteApi("space/asset_version_use"), "post", {
    project_id: input.projectId,
    asset_id: input.assetId,
    version_id: input.versionId,
  });
  if (!isSuccessResponse(result)) {
    throw new Error(result.message || result.msg || "切换资产版本失败");
  }
  const asset = (result.data as any)?.asset;
  if (!asset) {
    throw new Error("切换资产版本后未返回资产内容");
  }
  return normalizeProjectAsset(asset);
}

export async function fetchSpaceAssetDetail(input: {
  projectId: number;
  assetId: number;
}): Promise<ProjectAsset> {
  const result = await request(joinSiteApi("space/asset"), "get", {
    project_id: input.projectId,
    asset_id: input.assetId,
  });
  if (!isSuccessResponse(result)) {
    throw new Error(result.message || result.msg || "读取资产详情失败");
  }
  const asset = (result.data as any)?.asset;
  if (!asset) {
    throw new Error("资产详情为空");
  }
  return normalizeProjectAsset(asset);
}

type SaveSpaceCanvasResultInput = {
  projectId: number;
  assetCateId: number;
  name: string;
  kind: string;
  content: unknown;
  runId?: number;
  nodeRunId?: number;
  releaseId?: number;
  nodeKey?: string;
  requestId?: string;
  source?: CanvasResultSourceRef | null;
};

function canvasResultPayload(input: SaveSpaceCanvasResultInput) {
  const payload: Record<string, unknown> = {
    project_id: input.projectId,
    asset_cate_id: input.assetCateId,
    name: input.name,
    kind: input.kind,
    content: input.content,
    request_id: input.requestId || "",
  };
  if (input.runId) {
    payload.run_id = input.runId;
  }
  if (input.nodeRunId) {
    payload.node_run_id = input.nodeRunId;
  }
  if (input.releaseId) {
    payload.release_id = input.releaseId;
  }
  if (input.nodeKey) {
    payload.node_key = input.nodeKey;
  }
  if (input.source) {
    const source = input.source;
    if (source.sourceKey) payload.source_key = source.sourceKey;
    if (source.sourceRunId) payload.source_run_id = source.sourceRunId;
    if (source.sourceNodeRunId) payload.source_node_run_id = source.sourceNodeRunId;
    if (source.sourceAssetId) payload.source_asset_id = source.sourceAssetId;
    if (source.sourceVersionId) payload.source_version_id = source.sourceVersionId;
    if (source.sourceReleaseId) payload.source_release_id = source.sourceReleaseId;
    if (source.sourceRequestId) payload.source_request_id = source.sourceRequestId;
    if (source.sourceNodeKey) payload.source_node_key = source.sourceNodeKey;
    if (source.sourceNodeType) payload.source_node_type = source.sourceNodeType;
    if (source.sourceStatus) payload.source_status = source.sourceStatus;
  }
  return payload;
}

async function saveSpaceCanvasResult(
  endpoint: "space/material" | "space/content",
  input: SaveSpaceCanvasResultInput,
): Promise<ProjectAsset> {
  const result = await request(
    joinSiteApi(endpoint),
    "post",
    canvasResultPayload(input),
  );
  if (!isSuccessResponse(result)) {
    throw new Error(result.message || result.msg || "保存资产失败");
  }
  const asset = (result.data as any)?.asset;
  if (!asset) {
    throw new Error("保存资产后未返回资产内容");
  }
  return normalizeProjectAsset(asset);
}

export function saveSpaceCanvasMaterial(
  input: SaveSpaceCanvasResultInput,
): Promise<ProjectAsset> {
  return saveSpaceCanvasResult("space/material", input);
}

export function saveSpaceCanvasContent(
  input: SaveSpaceCanvasResultInput,
): Promise<ProjectAsset> {
  return saveSpaceCanvasResult("space/content", input);
}

export async function saveSpaceCanvas(
  projectId: number,
  assetCateId: number,
  canvas: SpaceCanvasState,
): Promise<SpaceCanvasState> {
  const result = await request(joinSiteApi("space/canvas"), "post", {
    project_id: projectId,
    asset_cate_id: assetCateId,
    base_revision: canvas.updatedAt || "",
    canvas: persistedCanvasState(canvas),
  });
  if (result.code !== 0 && result.status !== 1) {
    throw new Error(result.message || result.msg || "保存画布失败");
  }
  return normalizeCanvasState(
    (result.data as any)?.canvas || canvas,
    assetCateId,
  );
}

export async function initSpaceUpload(input: {
  projectId: number;
  ruleId?: number;
  name: string;
  size: number;
  mime: string;
  hash?: string;
  kind?: string;
}) {
  const payload: Record<string, unknown> = {
    project_id: input.projectId,
    name: input.name,
    size: input.size,
    mime: input.mime,
    hash: input.hash || "",
    kind: input.kind || "",
  };
  if (input.ruleId) {
    payload.rule_id = input.ruleId;
  }
  const result = await request(joinSiteApi("space/upload_init"), "post", payload);
  if (result.code !== 0 && result.status !== 1) {
    throw new Error(result.message || result.msg || "初始化上传失败");
  }
  return result.data as {
    session_id: number;
    transport: string;
    chunk_size: number;
    chunk_total: number;
    direct?: unknown;
  };
}

export async function uploadSpacePart(input: {
  projectId: number;
  sessionId: number;
  partNumber: number;
  file: Blob;
}) {
  const form = new FormData();
  form.append("project_id", String(input.projectId));
  form.append("session_id", String(input.sessionId));
  form.append("part_number", String(input.partNumber));
  form.append("file", input.file);
  const response = await fetch(joinSiteApi("space/upload_part"), {
    method: "POST",
    credentials: "include",
    headers: buildRuntimeRequestHeaders({ contentType: false }),
    body: form,
  });
  const result = await parseUploadResponse(response);
  if (!response.ok || (result.code !== 0 && result.status !== 1)) {
    throw new Error(result.message || result.msg || "上传分片失败");
  }
  return result.data;
}

export async function completeSpaceUpload(input: {
  projectId: number;
  sessionId: number;
}) {
  const result = await request(joinSiteApi("space/upload_complete"), "post", {
    project_id: input.projectId,
    session_id: input.sessionId,
  });
  if (result.code !== 0 && result.status !== 1) {
    throw new Error(result.message || result.msg || "完成上传失败");
  }
  return result.data;
}

async function parseUploadResponse(response: Response) {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return {
      code: response.ok ? 0 : response.status,
      message: text,
    };
  }
}

function normalizePowerForm(value: any): PowerForm {
  const data = value && typeof value === "object" ? value : {};
  return {
    ...data,
    sources: Array.isArray(data.sources) ? data.sources : [],
    params: Array.isArray(data.params) ? data.params : [],
    selected_target_id: Number(data.selected_target_id || 0),
    source_rule: Number(data.source_rule || 0),
    primary_param_key: String(data.primary_param_key || ""),
  };
}

function isSuccessResponse(result: any) {
  return result?.code === 0 || result?.status === 1;
}
