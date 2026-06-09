import type {
  AssetCardinality,
  AssetCate,
  AssetKind,
  CanvasFunctionOption,
  PowerKindOption,
  PowerOption,
  ProjectAsset,
  SpaceBootstrap,
  SpaceCanvasEdge,
  SpaceCanvasNode,
  SpaceCanvasState,
  SpaceCanvasViewport,
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
    canvases: normalizeCanvases(row.canvases),
    assets: asRecords(row.assets).map(normalizeAsset),
    powers: asRecords(row.powers).map(normalizePower),
    powerKinds: asRecords(row.power_kinds).map(normalizePowerKind),
  };
}

export function emptyCanvasState(assetCateId: number): SpaceCanvasState {
  return {
    assetCateId,
    nodes: [],
    edges: [],
    viewport: {},
  };
}

export function normalizeCanvasState(value: unknown, fallbackAssetCateId = 0): SpaceCanvasState {
  const row = asRecord(value);
  const assetCateId = numberValue(firstDefined(row.asset_cate_id, row.assetCateId, fallbackAssetCateId));
  return {
    assetCateId,
    nodes: asRecords(row.nodes).map(normalizeCanvasNode).filter((node): node is SpaceCanvasNode => Boolean(node)),
    edges: asRecords(row.edges).map(normalizeCanvasEdge).filter((edge): edge is SpaceCanvasEdge => Boolean(edge)),
    viewport: normalizeCanvasViewport(row.viewport),
  };
}

export function normalizePowerCatalog(value: unknown): {
  powers: PowerOption[];
  powerKinds: PowerKindOption[];
} {
  const row = asRecord(value);
  return {
    powers: asRecords(row.powers).map(normalizePower),
    powerKinds: asRecords(row.power_kinds).map(normalizePowerKind),
  };
}

export function normalizeProjectAsset(value: unknown): ProjectAsset {
  return normalizeAsset(asRecord(value));
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
  return space.flows
    .filter((flow) => flowOutputAssetCateIds(space, flow).has(assetCateId))
    .slice(0, 4);
}

export function isExecutionRole(role: TeamRole) {
  return role.role_type === "worker" || role.role_type === "default_worker";
}

export function executionRole(space: SpaceBootstrap) {
  return space.roles.find(isExecutionRole) || null;
}

export function createLocalNode(
  type: SpaceCanvasNode["type"],
  assetCate: AssetCate,
  index: number,
  position?: { x: number; y: number },
  options?: {
    asset?: ProjectAsset;
    flow?: TeamFlow;
    functionOption?: CanvasFunctionOption;
    power?: PowerOption;
    role?: TeamRole;
  },
): SpaceCanvasNode {
  const baseX = position?.x ?? 420 + (index % 3) * 190;
  const baseY = position?.y ?? 610 + Math.floor(index / 3) * 170;
  const selectedAsset = options?.asset;
  const selectedFlow = options?.flow;
  const selectedFunction = options?.functionOption;
  const selectedPower = options?.power;
  const selectedRole = options?.role;
  const nodeAssetCateId = Number(selectedAsset?.asset_cate_id || assetCate.id);
  const labels: Record<SpaceCanvasNode["type"], [string, string, string]> = {
    asset: [
      selectedAsset?.name || "资产引用",
      selectedAsset ? assetKindLabel(selectedAsset.kind) : assetKindLabel(assetCate.kind),
      selectedAsset
        ? documentPreview(selectedAsset.version?.content) || "引用已有资产，作为其他节点的上下文。"
        : "引用已有资产，作为其他节点的上下文。",
    ],
    power: [
      selectedPower?.name || defaultPowerName(assetCate.kind),
      selectedPower ? powerKindLabel(selectedPower.kind) : "能力节点",
      selectedPower ? `调用 ${selectedPower.name} 能力，按参数生成内容。` : "输入提示词和参数，直接生成文本、图片、视频或音频。",
    ],
    agent: [
      selectedRole?.name || "智能体节点",
      selectedRole?.role_type || "角色执行",
      selectedRole?.assignment || "调用团队角色或指定智能体完成一段任务。",
    ],
    flow: [
      selectedFlow?.name || "流程节点",
      "团队流程",
      selectedFlow?.goal || "执行一组团队预设流程。",
    ],
    function: [
      selectedFunction?.label || "保存节点",
      "功能",
      selectedFunction?.description || "开始、导入、保存、展示等功能节点。",
    ],
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
    assetCateId: nodeAssetCateId,
    kind: selectedAsset?.kind || assetCate.kind,
    cardinality: assetCate.cardinality,
    asset: selectedAsset,
    flow: selectedFlow,
    functionOption: selectedFunction,
    power: selectedPower,
    role: selectedRole,
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

export function powerKindLabel(kind: string) {
  switch (kind) {
    case "image":
      return "图片";
    case "audio":
      return "音频";
    case "video":
      return "视频";
    case "role":
      return "角色";
    case "multi":
      return "多模态";
    case "embeddings":
      return "向量";
    case "workflow":
      return "工作流";
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
  const text = documentText(content);
  if (text) {
    return text.length > 120 ? `${text.slice(0, 120)}...` : text;
  }
  return "";
}

export function documentText(content: unknown): string {
  return collectDocumentText(content).replace(/\s+/g, " ").trim();
}

export function looseRichJSONText(content: unknown): string {
  if (typeof content !== "string") {
    return "";
  }
  const text = content.trim();
  if (!isLikelyRichJSONSnippet(text)) {
    return "";
  }
  const richStart = text.search(/"rich"\s*:/);
  const source = richStart >= 0 ? text.slice(richStart) : text;
  const pieces: string[] = [];
  const textField = /"text"\s*:\s*"((?:\\.|[^"\\])*)"/g;
  let match: RegExpExecArray | null = null;
  while ((match = textField.exec(source)) !== null) {
    const value = decodeJSONStringFragment(match[1]).trim();
    if (value) {
      pieces.push(value);
    }
  }
  return pieces.join(" ").replace(/\s+/g, " ").trim();
}

export function richDocument(content: unknown): RichDocumentNode | null {
  const doc = findRichDocument(content, new Set());
  return hasVisibleRichDocument(doc) ? doc : null;
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

function normalizePower(value: Record<string, unknown>): PowerOption {
  return {
    id: numberValue(value.id),
    cate_id: numberValue(value.cate_id),
    name: stringValue(value.name) || stringValue(value.key) || "未命名能力",
    key: stringValue(value.key),
    icon: stringValue(value.icon),
    kind: stringValue(value.kind) || "text",
  };
}

function normalizePowerKind(value: Record<string, unknown>): PowerKindOption {
  return {
    id: stringValue(value.id),
    value: stringValue(value.value) || stringValue(value.name) || stringValue(value.id),
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
          run_id: numberValue(version.run_id),
          node_run_id: numberValue(version.node_run_id),
          release_id: numberValue(version.release_id),
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

function normalizeCanvases(value: unknown) {
  const row = asRecord(value);
  const result: Record<string, SpaceCanvasState> = {};
  for (const [key, canvas] of Object.entries(row)) {
    const state = normalizeCanvasState(canvas, numberValue(key));
    result[String(state.assetCateId)] = state;
  }
  return result;
}

function normalizeCanvasNode(value: Record<string, unknown>): SpaceCanvasNode | null {
  const id = stringValue(value.id);
  const type = stringValue(value.type) as SpaceCanvasNode["type"];
  if (!id || !type) {
    return null;
  }
  return {
    ...value,
    id,
    type,
    title: stringValue(value.title),
    subtitle: stringValue(value.subtitle),
    description: stringValue(value.description),
    x: numberValue(value.x),
    y: numberValue(value.y),
    width: numberValue(value.width),
    height: numberValue(value.height),
    assetCateId: numberValue(firstDefined(value.assetCateId, value.asset_cate_id)),
    count: value.count == null ? undefined : numberValue(value.count),
    local: value.local !== false,
  };
}

function normalizeCanvasEdge(value: Record<string, unknown>): SpaceCanvasEdge | null {
  const from = stringValue(firstDefined(value.from, value.source));
  const to = stringValue(firstDefined(value.to, value.target));
  if (!from || !to) {
    return null;
  }
  return {
    id: stringValue(value.id) || `edge-${from}-${to}`,
    from,
    to,
  };
}

function normalizeCanvasViewport(value: unknown): SpaceCanvasViewport {
  const row = asRecord(value);
  const viewport: SpaceCanvasViewport = {};
  if (row.x != null) {
    viewport.x = numberValue(row.x);
  }
  if (row.y != null) {
    viewport.y = numberValue(row.y);
  }
  if (row.zoom != null) {
    viewport.zoom = numberValue(row.zoom);
  }
  return viewport;
}

function flowOutputAssetCateIds(space: SpaceBootstrap, flow: TeamFlow) {
  const ids = new Set<number>();
  for (const node of space.nodesByFlow[flow.key] || []) {
    if (String(node.type || "").toLowerCase() !== "save") {
      continue;
    }
    const id = numberValue(
      firstDefined(node.asset_cate_id, node.config?.asset_cate_id),
    );
    if (id > 0) {
      ids.add(id);
    }
  }
  return ids;
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
      return { width: 128, height: 46 };
    case "power":
      return { width: 180, height: 180 };
    default:
      return { width: 250, height: 170 };
  }
}

export type RichDocumentNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichDocumentNode[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
};

const richMediaAliases: Record<string, string> = {
  audio: "editorMediaAudio",
  image: "editorMediaImage",
  mediaAudio: "editorMediaAudio",
  mediaImage: "editorMediaImage",
  mediaVideo: "editorMediaVideo",
  video: "editorMediaVideo",
};

const richWrapperKeys = [
  "rich",
  "value",
  "doc",
  "document",
  "content",
  "data",
  "output",
  "result",
  "body",
] as const;

function collectDocumentText(value: unknown): string {
  if (typeof value === "string") {
    const text = value.trim();
    if (looksLikeJSON(text)) {
      const parsed = parseJSONValue(text);
      if (parsed !== undefined) {
        const parsedText = collectDocumentText(parsed).trim();
        if (parsedText) {
          return parsedText;
        }
        return "";
      }
    }
    const looseText = looseRichJSONText(text);
    if (looseText) {
      return looseText;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(collectDocumentText).filter(Boolean).join(" ");
  }
  if (!value || typeof value !== "object") {
    return "";
  }
  const row = value as Record<string, unknown>;
  const rich = richDocument(row);
  if (rich) {
    return collectRichDocumentText(rich);
  }
  const text = typeof row.text === "string" ? row.text : "";
  const pieces = [
    text,
    typeof row.markdown === "string" ? row.markdown : "",
  ];
  for (const key of richWrapperKeys) {
    if (row[key] != null) {
      pieces.push(collectDocumentText(row[key]));
    }
  }
  return pieces.filter(Boolean).join(" ");
}

function findRichDocument(
  value: unknown,
  seen: Set<unknown>,
): RichDocumentNode | null {
  if (typeof value === "string") {
    const text = value.trim();
    if (!looksLikeJSON(text)) {
      return null;
    }
    const parsed = parseJSONValue(text);
    return parsed === undefined ? null : findRichDocument(parsed, seen);
  }
  if (Array.isArray(value)) {
    const doc = normalizeRichDocument({ type: "doc", content: value });
    if (hasVisibleRichDocument(doc)) {
      return doc;
    }
    for (const item of value) {
      const nested = findRichDocument(item, seen);
      if (nested) {
        return nested;
      }
    }
    return null;
  }
  if (!value || typeof value !== "object") {
    return null;
  }
  if (seen.has(value)) {
    return null;
  }
  seen.add(value);

  const row = value as Record<string, unknown>;
  const direct = normalizeRichDocument(row);
  if (direct) {
    return direct;
  }

  if (String(row.format || "").toLowerCase() === "rich_json" && row.rich != null) {
    const rich = findRichDocument(row.rich, seen);
    if (rich) {
      return rich;
    }
  }

  for (const key of richWrapperKeys) {
    if (row[key] == null) {
      continue;
    }
    const rich = findRichDocument(row[key], seen);
    if (rich) {
      return rich;
    }
  }
  return null;
}

function normalizeRichDocument(value: unknown): RichDocumentNode | null {
  if (!isRecord(value)) {
    return null;
  }
  const type = normalizeRichNodeType(value.type);
  if (type === "doc") {
    return {
      type: "doc",
      attrs: isRecord(value.attrs) ? value.attrs : undefined,
      content: normalizeRichContent(value.content),
    };
  }
  return null;
}

function normalizeRichContent(content: unknown): RichDocumentNode[] {
  if (!Array.isArray(content)) {
    return [];
  }
  return content
    .map(normalizeRichNode)
    .filter((node): node is RichDocumentNode => Boolean(node));
}

function normalizeRichNode(value: unknown): RichDocumentNode | null {
  if (!isRecord(value)) {
    return null;
  }
  const type = normalizeRichNodeType(value.type) || inferRichNodeType(value);
  if (!type) {
    return null;
  }
  const node: RichDocumentNode = { type };
  const attrs = isRecord(value.attrs) ? { ...value.attrs } : {};
  if (type === "heading" && numberValue(attrs.level) <= 0) {
    const level = numberValue(value.level);
    if (level > 0) {
      attrs.level = level;
    }
  }
  if (Object.keys(attrs).length > 0) {
    node.attrs = attrs;
  }
  const marks = normalizeRichMarks(value.marks);
  if (marks.length > 0) {
    node.marks = marks;
  }
  if (type === "text") {
    const text = stringValue(value.text);
    if (!text) {
      return null;
    }
    node.text = text;
    return node;
  }
  const children = normalizeRichContent(value.content);
  if (children.length > 0) {
    node.content = children;
  }
  return node;
}

function inferRichNodeType(value: Record<string, unknown>) {
  if (typeof value.text === "string") {
    return "text";
  }
  const attrs = isRecord(value.attrs) ? value.attrs : {};
  if (numberValue(attrs.level) > 0 || numberValue(value.level) > 0) {
    return "heading";
  }
  return "";
}

function normalizeRichMarks(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((mark) => {
      if (!isRecord(mark)) {
        return null;
      }
      const type = stringValue(mark.type);
      if (!type) {
        return null;
      }
      return {
        type,
        attrs: isRecord(mark.attrs) ? mark.attrs : undefined,
      };
    })
    .filter(
      (mark): mark is { type: string; attrs?: Record<string, unknown> } =>
        Boolean(mark),
    );
}

function normalizeRichNodeType(value: unknown) {
  const type = stringValue(value);
  return richMediaAliases[type] || type;
}

function collectRichDocumentText(node: RichDocumentNode | null): string {
  if (!node) {
    return "";
  }
  if (node.type === "text") {
    return node.text || "";
  }
  if (
    node.type === "editorMediaImage" ||
    node.type === "editorMediaVideo" ||
    node.type === "editorMediaAudio"
  ) {
    return stringValue(node.attrs?.alt || node.attrs?.title || node.attrs?.src);
  }
  return (node.content || [])
    .map(collectRichDocumentText)
    .filter(Boolean)
    .join(" ");
}

function hasVisibleRichDocument(node: RichDocumentNode | null): boolean {
  if (!node) {
    return false;
  }
  if (node.type === "text") {
    return Boolean(stringValue(node.text));
  }
  if (
    node.type === "editorMediaImage" ||
    node.type === "editorMediaVideo" ||
    node.type === "editorMediaAudio"
  ) {
    return Boolean(stringValue(node.attrs?.src));
  }
  return (node.content || []).some(hasVisibleRichDocument);
}

function looksLikeJSON(value: string) {
  return (
    (value.startsWith("{") && value.endsWith("}")) ||
    (value.startsWith("[") && value.endsWith("]"))
  );
}

function parseJSONValue(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function isLikelyRichJSONSnippet(value: string) {
  return (
    value.includes("rich_json") ||
    value.includes('"rich"') ||
    value.includes("agent_run_id") ||
    value.includes("node_run_id")
  );
}

function decodeJSONStringFragment(value: string) {
  try {
    return JSON.parse(`"${value}"`);
  } catch {
    return value
      .replace(/\\"/g, '"')
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\\\/g, "\\");
  }
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

function firstDefined(...values: unknown[]) {
  return values.find((value) => value !== undefined && value !== null);
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
