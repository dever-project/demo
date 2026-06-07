import { joinSiteApi, request } from "@dever/front-plugin";
import {
  normalizeCanvasState,
  normalizePowerCatalog,
  normalizeSpaceBootstrap,
} from "./space-model";
import type {
  PowerForm,
  PowerKindOption,
  PowerOption,
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
  if (result.code !== 0) {
    throw new Error(result.message || "加载创作空间失败");
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
  if (result.code !== 0) {
    throw new Error(result.message || "发送失败");
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
  if (result.code !== 0) {
    throw new Error(result.message || "加载能力列表失败");
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
  if (result.code !== 0) {
    throw new Error(result.message || "加载能力参数失败");
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
  if (result.code !== 0) {
    throw new Error(result.message || "能力节点执行失败");
  }
  return result.data;
}

export async function runSpaceFlow(
  projectId: number,
  assetCateId: number,
  flow: TeamFlow,
  prompt: string,
) {
  const result = await request(joinSiteApi("space/run_flow"), "post", {
    project_id: projectId,
    flow_id: flow.id,
    input: {
      prompt,
      message: prompt,
      asset_cate_id: assetCateId,
    },
  });
  if (result.code !== 0) {
    throw new Error(result.message || "流程运行失败");
  }
  return result.data;
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
    credentials: "same-origin",
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
