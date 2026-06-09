import { joinSiteApi, request } from "@dever/front-plugin";
import {
  normalizeCanvasState,
  normalizePowerCatalog,
  normalizeProjectAsset,
  normalizeSpaceBootstrap,
} from "./space-model";
import type {
  PowerForm,
  PowerKindOption,
  PowerOption,
  ProjectAsset,
  SpaceBootstrap,
  SpaceCanvasState,
  TeamFlow,
} from "./types";

export const SPACE_UPLOAD_RULE_ID = 7;

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

export async function runSpacePower(input: {
  projectId: number;
  flowId?: number;
  nodeKey: string;
  nodeName: string;
  kind: string;
  powerId: number;
  powerKey: string;
  sourceTargetId?: number;
  prompt: string;
  params: Record<string, unknown>;
}) {
  const result = await request(joinSiteApi("space/run_canvas_power"), "post", {
    project_id: input.projectId,
    flow_id: input.flowId || 0,
    node_key: input.nodeKey,
    node_name: input.nodeName,
    kind: input.kind,
    power_id: input.powerId,
    power_key: input.powerKey,
    source_target_id: input.sourceTargetId || 0,
    input: { prompt: input.prompt },
    params: input.params,
  });
  if (!isSuccessResponse(result)) {
    throw new Error(result.message || result.msg || "能力节点执行失败");
  }
  return result.data;
}

export async function runSpaceAgent(input: {
  projectId: number;
  flowId?: number;
  nodeKey: string;
  nodeName: string;
  agentId: number;
  prompt: string;
  files?: unknown[];
  context?: unknown[];
  history?: unknown[];
  feedback?: Record<string, unknown>;
}) {
  const result = await request(joinSiteApi("space/run_canvas_agent"), "post", {
    project_id: input.projectId,
    flow_id: input.flowId || 0,
    node_key: input.nodeKey,
    node_name: input.nodeName,
    agent_id: input.agentId,
    input: {
      goal: input.prompt,
      requirement: input.prompt,
      prompt: input.prompt,
      user_input: input.prompt,
      message: input.prompt,
      files: input.files || [],
      reference_files: input.files || [],
      context: input.context || [],
      feedback: input.feedback || undefined,
    },
    history: input.history || [],
  });
  if (!isSuccessResponse(result)) {
    throw new Error(result.message || result.msg || "智能体节点执行失败");
  }
  return result.data;
}

export async function runSpaceFlow(
  projectId: number,
  assetCateId: number,
  flow: TeamFlow,
  prompt: string,
  extraInput?: Record<string, unknown>,
) {
  const result = await request(joinSiteApi("space/run_flow"), "post", {
    project_id: projectId,
    flow_id: flow.id,
    input: {
      ...(extraInput || {}),
      prompt,
      message: prompt,
      asset_cate_id: assetCateId,
    },
  });
  if (!isSuccessResponse(result)) {
    throw new Error(result.message || result.msg || "流程运行失败");
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

export async function fetchSpaceBootstrapAssets(
  projectId: number,
): Promise<ProjectAsset[]> {
  const space = await fetchSpaceBootstrap(projectId);
  return space.assets || [];
}

export async function saveSpaceAssetVersion(input: {
  projectId: number;
  assetId: number;
  content: unknown;
}): Promise<ProjectAsset> {
  const result = await request(joinSiteApi("space/asset_version"), "post", {
    project_id: input.projectId,
    asset_id: input.assetId,
    content: input.content,
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

export async function saveSpaceCanvasAsset(input: {
  projectId: number;
  assetCateId: number;
  name: string;
  kind: string;
  content: unknown;
}): Promise<ProjectAsset> {
  const result = await request(joinSiteApi("space/asset"), "post", {
    project_id: input.projectId,
    asset_cate_id: input.assetCateId,
    name: input.name,
    kind: input.kind,
    content: input.content,
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

export async function saveSpaceCanvas(
  projectId: number,
  assetCateId: number,
  canvas: SpaceCanvasState,
): Promise<SpaceCanvasState> {
  const result = await request(joinSiteApi("space/canvas"), "post", {
    project_id: projectId,
    asset_cate_id: assetCateId,
    canvas,
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
  const result = await request(joinSiteApi("space/upload_init"), "post", {
    project_id: input.projectId,
    rule_id: input.ruleId || SPACE_UPLOAD_RULE_ID,
    name: input.name,
    size: input.size,
    mime: input.mime,
    hash: input.hash || "",
    kind: input.kind || "",
  });
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
