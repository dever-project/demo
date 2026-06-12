import type {
  CanvasFunctionOption,
  PowerOption,
  ProjectAsset,
  SpaceCanvasEdge,
  SpaceCanvasNode,
  SpaceCanvasState,
  SpaceCanvasViewport,
  TeamFlow,
  TeamRole,
} from "./types";

export type PersistedCanvasState = {
  asset_cate_id: number;
  nodes: PersistedCanvasNode[];
  edges: SpaceCanvasEdge[];
  viewport: SpaceCanvasViewport;
};

type PersistedCanvasNode = {
  id: string;
  type: SpaceCanvasNode["type"];
  title: string;
  subtitle: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  asset_cate_id?: number;
  kind?: string;
  cardinality?: string;
  count?: number;
  flow?: Pick<TeamFlow, "id" | "key" | "name" | "goal">;
  role?: Pick<TeamRole, "id" | "name" | "role_type" | "agent_id" | "asset_cate_id">;
  asset?: Pick<ProjectAsset, "id" | "name" | "kind" | "role" | "asset_cate_id" | "version_id">;
  power?: Pick<PowerOption, "id" | "key" | "name" | "kind" | "icon">;
  function_option?: Pick<CanvasFunctionOption, "key" | "label" | "description">;
  composer_draft?: Record<string, unknown>;
  result_ref?: Record<string, unknown>;
  local?: boolean;
};

export function persistedCanvasState(canvas: SpaceCanvasState): PersistedCanvasState {
  return {
    asset_cate_id: Number(canvas.assetCateId || 0),
    nodes: canvas.nodes.map(persistedCanvasNode),
    edges: canvas.edges.map((edge) => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
    })),
    viewport: {
      ...(canvas.viewport.x == null ? {} : { x: canvas.viewport.x }),
      ...(canvas.viewport.y == null ? {} : { y: canvas.viewport.y }),
      ...(canvas.viewport.zoom == null ? {} : { zoom: canvas.viewport.zoom }),
    },
  };
}

function persistedCanvasNode(node: SpaceCanvasNode): PersistedCanvasNode {
  const result: PersistedCanvasNode = {
    id: node.id,
    type: node.type,
    title: node.title,
    subtitle: node.subtitle,
    description: node.description,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
  };
  assignNumber(result, "asset_cate_id", node.assetCateId);
  assignText(result, "kind", node.kind);
  assignText(result, "cardinality", node.cardinality);
  assignNumber(result, "count", node.count);
  if (node.flow) {
    result.flow = {
      id: node.flow.id,
      key: node.flow.key,
      name: node.flow.name,
      goal: node.flow.goal,
    };
  }
  if (node.role) {
    result.role = {
      id: node.role.id,
      name: node.role.name,
      role_type: node.role.role_type,
      agent_id: node.role.agent_id,
      asset_cate_id: node.role.asset_cate_id,
    };
  }
  if (node.asset) {
    result.asset = {
      id: node.asset.id,
      name: node.asset.name,
      kind: node.asset.kind,
      role: node.asset.role,
      asset_cate_id: node.asset.asset_cate_id,
      version_id: node.asset.version_id,
    };
  }
  if (node.power) {
    result.power = {
      id: node.power.id,
      key: node.power.key,
      name: node.power.name,
      kind: node.power.kind,
      icon: node.power.icon,
    };
  }
  if (node.functionOption) {
    result.function_option = {
      key: node.functionOption.key,
      label: node.functionOption.label,
      description: node.functionOption.description,
    };
  }
  const composerDraft = persistedComposerDraft((node as any).composerDraft);
  if (composerDraft) {
    result.composer_draft = composerDraft;
  }
  const resultRef = persistedResultRef((node as any).resultRef);
  if (resultRef) {
    result.result_ref = resultRef;
  }
  if (node.local != null) {
    result.local = node.local;
  }
  return result;
}

function persistedComposerDraft(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }
  const result: Record<string, unknown> = {};
  assignText(result, "prompt", value.prompt);
  assignNumber(
    result,
    "selected_target_id",
    value.selectedTargetId ?? value.selected_target_id,
  );
  const paramValues = serializableParamValues(
    value.paramValues ?? value.param_values,
  );
  if (paramValues) {
    result.param_values = paramValues;
  }
  return Object.keys(result).length ? result : null;
}

function serializableParamValues(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }
  const result: Record<string, unknown> = {};
  for (const [key, current] of Object.entries(value)) {
    if (isTransientParamValue(current)) {
      continue;
    }
    if (isJSONValue(current)) {
      result[key] = current;
    }
  }
  return Object.keys(result).length ? result : null;
}

function isTransientParamValue(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }
  return Boolean(
    value.file ||
      value.blob ||
      value.preview ||
      value.progress != null ||
      value.uploading != null,
  );
}

function persistedResultRef(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }
  const result: Record<string, unknown> = {};
  for (const key of [
    "run_id",
    "request_id",
    "flow_run_id",
    "node_run_id",
    "asset_id",
    "version_id",
    "release_id",
    "role",
    "status",
    "updated_at",
  ]) {
    const current = value[key];
    if (current != null && isJSONValue(current)) {
      result[key] = current;
    }
  }
  return Object.keys(result).length ? result : null;
}

function assignText(target: Record<string, unknown>, key: string, value: unknown) {
  if (typeof value === "string" && value.trim()) {
    target[key] = value;
  }
}

function assignNumber(target: Record<string, unknown>, key: string, value: unknown) {
  const number = Number(value || 0);
  if (number > 0) {
    target[key] = number;
  }
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isJSONValue(value: unknown): boolean {
  if (value == null) {
    return true;
  }
  if (["string", "number", "boolean"].includes(typeof value)) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(isJSONValue);
  }
  if (isRecord(value)) {
    return Object.values(value).every(isJSONValue);
  }
  return false;
}
