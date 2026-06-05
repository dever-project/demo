import { joinSiteApi, request } from "@dever/front-plugin";
import { normalizePowerCatalog, normalizeSpaceBootstrap } from "./space-model";
import type { PowerKindOption, PowerOption, SpaceBootstrap, TeamFlow } from "./types";

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
