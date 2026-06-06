import { joinSiteApi, request } from "@dever/front-plugin";
import { normalizePowerCatalog, normalizeSpaceBootstrap } from "./space-model";
import type {
  PowerForm,
  PowerKindOption,
  PowerOption,
  SpaceBootstrap,
  TeamFlow,
} from "./types";

export async function fetchSpaceBootstrap(projectId: number): Promise<SpaceBootstrap> {
  const result = await request(joinSiteApi("space/bootstrap"), "get", {
    project_id: projectId,
  });
  if (result.code !== 0) {
    throw new Error(result.message || "加载创作空间失败");
  }
  return normalizeSpaceBootstrap(result.data);
}

export async function sendSpaceMessage(projectId: number, assetCateId: number, message: string) {
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
