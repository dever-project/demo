import type {
  AssetCardinality,
  AssetCate,
  AssetKind,
  ProjectAsset,
  SpaceBootstrap,
  SpaceCanvasEdge,
  SpaceCanvasNode,
  TeamFlow,
  TeamFlowNode,
  TeamRole,
  WorkProject,
  WorkRelease,
  WorkTeam,
} from "./types";

const freeAssetCate: AssetCate = {
  id: 0,
  team_id: 0,
  name: "自由",
  kind: "mixed",
  cardinality: "multiple",
  status: 1,
  sort: 0,
  virtual: true,
};

export function normalizeSpaceBootstrap(value: unknown): SpaceBootstrap {
  const row = asRecord(value);
  return {
    project: normalizeProject(row.project),
    team: normalizeTeam(row.team || row.type),
    release: normalizeRelease(row.release),
    assetCates: asRecords(row.asset_cates).map(normalizeAssetCate),
    roles: asRecords(row.roles).map(normalizeRole),
    flows: asRecords(row.flows).map(normalizeFlow),
    nodesByFlow: normalizeNodesByFlow(row.nodes_by_flow),
    assets: asRecords(row.assets).map(normalizeAsset),
  };
}

export function visibleAssetCates(space: SpaceBootstrap) {
  return space.assetCates.length > 0 ? space.assetCates : [freeAssetCate];
}

export function defaultAssetCateId(space: SpaceBootstrap) {
  return visibleAssetCates(space)[0]?.id ?? 0;
}

export function assetCateById(space: SpaceBootstrap, assetCateId: number) {
  return visibleAssetCates(space).find((item) => item.id === assetCateId) || visibleAssetCates(space)[0] || freeAssetCate;
}

export function assetsForCate(space: SpaceBootstrap, assetCateId: number) {
  if (assetCateId === 0 && space.assetCates.length === 0) {
    return space.assets;
  }
  return space.assets.filter((asset) => asset.asset_cate_id === assetCateId);
}

export function relatedFlows(space: SpaceBootstrap, assetCateId: number) {
  if (assetCateId === 0) {
    return space.flows.slice(0, 4);
  }
  const matched = space.flows.filter((flow) => flowAssetCateIds(space, flow).has(assetCateId));
  return matched.length > 0 ? matched.slice(0, 4) : space.flows.slice(0, 3);
}

export function communicationRole(space: SpaceBootstrap) {
  return (
    space.roles.find((role) => role.role_type === "chat") ||
    space.roles.find((role) => role.role_type === "default_chat") ||
    space.roles[0] ||
    null
  );
}

export function buildCanvasModel(
  space: SpaceBootstrap,
  assetCateId: number,
  localNodes: SpaceCanvasNode[],
) {
  const assetCate = assetCateById(space, assetCateId);
  const assets = assetsForCate(space, assetCate.id);
  const flows = relatedFlows(space, assetCate.id);
  const role = communicationRole(space);
  const nodes: SpaceCanvasNode[] = [
    {
      id: "asset-focus",
      type: "asset",
      title: assetCate.name,
      subtitle: assetCateSubtitle(assetCate),
      description: assets.length > 0 ? `已有 ${assets.length} 个资产，可继续引用、扩写或生成下一步。` : `还没有${assetCate.name}资产，可以从对话、流程或能力节点开始。`,
      x: 160,
      y: 170,
      width: 260,
      height: 170,
      assetCateId: assetCate.id,
      kind: assetCate.kind,
      cardinality: assetCate.cardinality,
      count: assets.length,
    },
  ];

  const firstAsset = assets[0];
  if (firstAsset) {
    nodes.push({
      id: `asset-${firstAsset.id}`,
      type: "asset",
      title: firstAsset.name || "未命名资产",
      subtitle: assetKindLabel(firstAsset.kind),
      description: documentPreview(firstAsset.version?.content) || "点击查看资产详情，拖入流程作为上下文。",
      x: 170,
      y: 430,
      width: 270,
      height: 190,
      assetCateId: firstAsset.asset_cate_id,
      kind: firstAsset.kind,
      asset: firstAsset,
    });
  } else {
    nodes.push({
      id: "power-seed",
      type: "power",
      title: defaultPowerName(assetCate.kind),
      subtitle: "能力节点",
      description: `用提示词直接生成${assetCate.name}，生成后可通过保存节点沉淀为资产。`,
      x: 500,
      y: 210,
      width: 180,
      height: 180,
      assetCateId: assetCate.id,
      kind: assetCate.kind,
    });
  }

  if (role) {
    nodes.push({
      id: "role-chat",
      type: "agent",
      title: role.name || "沟通角色",
      subtitle: "沟通",
      description: role.assignment || "理解你的目标，并把任务交给规划、执行和审查角色。",
      x: 760,
      y: 205,
      width: 154,
      height: 154,
      assetCateId: role.asset_cate_id,
      role,
    });
  }

  flows.slice(0, 2).forEach((flow, index) => {
    nodes.push({
      id: `flow-${flow.id}`,
      type: "flow",
      title: flow.name || "团队流程",
      subtitle: `${flowStepCount(space, flow)} 个节点`,
      description: flow.goal || "运行团队预设流程，产出会按保存节点沉淀为作品资产。",
      x: 1010,
      y: 160 + index * 230,
      width: 210,
      height: 160,
      flow,
    });
  });

  nodes.push({
    id: "save-node",
    type: "function",
    title: "保存资产",
    subtitle: "功能",
    description: `把上游结果保存为${assetCate.name}${assetCate.cardinality === "single" ? "，单个资产会更新版本。" : "。 "}`,
    x: 650,
    y: 500,
    width: 150,
    height: 140,
    assetCateId: assetCate.id,
    kind: assetCate.kind,
  });

  const edges: SpaceCanvasEdge[] = [
    { id: "edge-focus-chat", from: "asset-focus", to: "role-chat" },
    { id: "edge-chat-flow", from: "role-chat", to: nodes.find((node) => node.type === "flow")?.id || "save-node" },
    { id: "edge-power-save", from: firstAsset ? `asset-${firstAsset.id}` : "power-seed", to: "save-node" },
  ].filter((edge) => nodes.some((node) => node.id === edge.from) && nodes.some((node) => node.id === edge.to));

  return {
    nodes: [...nodes, ...localNodes],
    edges,
  };
}

export function createLocalNode(
  type: SpaceCanvasNode["type"],
  assetCate: AssetCate,
  index: number,
  position?: { x: number; y: number },
): SpaceCanvasNode {
  const baseX = position?.x ?? 420 + (index % 3) * 190;
  const baseY = position?.y ?? 610 + Math.floor(index / 3) * 170;
  const labels: Record<SpaceCanvasNode["type"], [string, string, string]> = {
    asset: ["资产引用", assetKindLabel(assetCate.kind), "引用已有资产，作为其他节点的上下文。"],
    power: [defaultPowerName(assetCate.kind), "能力节点", "输入提示词和参数，直接生成文本、图片、视频或音频。"],
    agent: ["智能体节点", "角色执行", "调用团队角色或指定智能体完成一段任务。"],
    flow: ["流程节点", "团队流程", "执行一组团队预设流程。"],
    function: ["保存节点", "功能", "保存、条件、上下文、人工确认等控制节点。"],
  };
  const [title, subtitle, description] = labels[type];
  const size = nodeDefaultSize(type);
  return {
    id: `local-${type}-${Date.now()}-${index}`,
    type,
    title,
    subtitle,
    description,
    x: baseX,
    y: baseY,
    width: size.width,
    height: size.height,
    assetCateId: assetCate.id,
    kind: assetCate.kind,
    cardinality: assetCate.cardinality,
    local: true,
  };
}

export function assetKindLabel(kind: AssetKind) {
  switch (kind) {
    case "image":
      return "图片";
    case "audio":
      return "音频";
    case "video":
      return "视频";
    case "file":
      return "文件";
    case "mixed":
      return "富文本";
    default:
      return "文本";
  }
}

export function cardinalityLabel(cardinality: AssetCardinality) {
  switch (cardinality) {
    case "multiple":
      return "多个";
    case "ordered":
      return "有序多个";
    default:
      return "单个";
  }
}

export function documentPreview(content: unknown): string {
  const text = collectDocumentText(content).trim();
  if (text) {
    return text.length > 120 ? `${text.slice(0, 120)}...` : text;
  }
  return "";
}

function normalizeProject(value: unknown): WorkProject {
  const row = asRecord(value);
  const team = asRecord(row.team);
  return {
    id: numberValue(row.id),
    body_id: numberValue(row.body_id),
    team_id: numberValue(row.team_id),
    release_id: numberValue(row.release_id),
    name: stringValue(row.name) || "未命名作品",
    description: stringValue(row.description),
    mode: stringValue(row.mode) || "team",
    team: {
      id: numberValue(team.id),
      name: stringValue(team.name),
      version: numberValue(team.version),
    },
  };
}

function normalizeTeam(value: unknown): WorkTeam {
  const row = asRecord(value);
  return {
    id: numberValue(row.id),
    name: stringValue(row.name) || "自由团队",
    description: stringValue(row.description),
  };
}

function normalizeRelease(value: unknown): WorkRelease {
  const row = asRecord(value);
  return {
    id: numberValue(row.id),
    team_id: numberValue(row.team_id),
    version: numberValue(row.version),
    status: stringValue(row.status),
  };
}

function normalizeAssetCate(value: Record<string, unknown>): AssetCate {
  return {
    id: numberValue(value.id),
    team_id: numberValue(value.team_id),
    name: stringValue(value.name) || "未命名资产",
    kind: (stringValue(value.kind) || "text") as AssetKind,
    cardinality: (stringValue(value.cardinality) || "single") as AssetCardinality,
    status: numberValue(value.status),
    sort: numberValue(value.sort),
  };
}

function normalizeRole(value: Record<string, unknown>): TeamRole {
  return {
    id: numberValue(value.id),
    team_id: numberValue(value.team_id),
    role_type: stringValue(value.role_type),
    role_key: stringValue(value.role_key),
    name: stringValue(value.name),
    agent_id: numberValue(value.agent_id),
    asset_cate_id: numberValue(value.asset_cate_id),
    assignment: stringValue(value.assignment),
  };
}

function normalizeFlow(value: Record<string, unknown>): TeamFlow {
  return {
    id: numberValue(value.id),
    name: stringValue(value.name),
    key: stringValue(value.key),
    goal: stringValue(value.goal),
    config: asRecord(value.config),
    status: numberValue(value.status),
    sort: numberValue(value.sort),
  };
}

function normalizeFlowNode(value: Record<string, unknown>): TeamFlowNode {
  return {
    id: numberValue(value.id),
    node_key: stringValue(value.node_key),
    name: stringValue(value.name),
    type: stringValue(value.type),
    role_id: numberValue(value.role_id),
    role_key: stringValue(value.role_key),
    agent_id: numberValue(value.agent_id),
    power_id: numberValue(value.power_id),
    sub_team_id: numberValue(value.sub_team_id),
    asset_cate_id: numberValue(value.asset_cate_id),
    config: asRecord(value.config),
  };
}

function normalizeAsset(value: Record<string, unknown>): ProjectAsset {
  const version = asRecord(value.version);
  return {
    id: numberValue(value.id),
    project_id: numberValue(value.project_id),
    body_id: numberValue(value.body_id),
    team_id: numberValue(value.team_id),
    flow_id: numberValue(value.flow_id),
    asset_cate_id: numberValue(value.asset_cate_id),
    name: stringValue(value.name),
    kind: (stringValue(value.kind) || "text") as AssetKind,
    version_id: numberValue(value.version_id),
    sort: numberValue(value.sort),
    created_at: stringValue(value.created_at),
    version: version.id
      ? {
          id: numberValue(version.id),
          asset_id: numberValue(version.asset_id),
          version: numberValue(version.version),
          content: version.content,
          created_at: stringValue(version.created_at),
        }
      : undefined,
  };
}

function normalizeNodesByFlow(value: unknown) {
  const row = asRecord(value);
  const result: Record<string, TeamFlowNode[]> = {};
  for (const [key, items] of Object.entries(row)) {
    result[key] = asRecords(items).map(normalizeFlowNode);
  }
  return result;
}

function flowAssetCateIds(space: SpaceBootstrap, flow: TeamFlow) {
  const ids = new Set<number>();
  for (const key of ["asset_cate_id", "assetCateId", "target_asset_cate_id", "targetAssetCateId", "output_asset_cate_id", "outputAssetCateId"]) {
    const id = numberValue(flow.config[key]);
    if (id > 0) {
      ids.add(id);
    }
  }
  for (const node of space.nodesByFlow[flow.key] || []) {
    if (node.asset_cate_id > 0) {
      ids.add(node.asset_cate_id);
    }
  }
  return ids;
}

function flowStepCount(space: SpaceBootstrap, flow: TeamFlow) {
  return (space.nodesByFlow[flow.key] || []).length || 1;
}

function assetCateSubtitle(assetCate: AssetCate) {
  return `${assetKindLabel(assetCate.kind)} / ${cardinalityLabel(assetCate.cardinality)}`;
}

function defaultPowerName(kind: AssetKind) {
  switch (kind) {
    case "image":
      return "生图能力";
    case "video":
      return "生视频能力";
    case "audio":
      return "生音频能力";
    default:
      return "文生文能力";
  }
}

function nodeDefaultSize(type: SpaceCanvasNode["type"]) {
  switch (type) {
    case "agent":
      return { width: 154, height: 154 };
    case "flow":
      return { width: 210, height: 160 };
    case "function":
      return { width: 150, height: 140 };
    case "power":
      return { width: 180, height: 180 };
    default:
      return { width: 250, height: 170 };
  }
}

function collectDocumentText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(collectDocumentText).filter(Boolean).join(" ");
  }
  if (!value || typeof value !== "object") {
    return "";
  }
  const row = value as Record<string, unknown>;
  const text = typeof row.text === "string" ? row.text : "";
  const content = collectDocumentText(row.content);
  return [text, content].filter(Boolean).join(" ");
}

function asRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function numberValue(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function stringValue(value: unknown) {
  if (value == null) {
    return "";
  }
  return String(value).trim();
}
