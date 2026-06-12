export type AssetKind = "text" | "image" | "audio" | "video" | "file" | "mixed" | string;
export type AssetCardinality = "single" | "multiple" | "ordered" | string;
export type AssetRole = "content" | "material" | string;
export type SpaceNodeType = "asset" | "power" | "agent" | "flow" | "function";

export type WorkProject = {
  id: number;
  body_id: number;
  team_id: number;
  release_id: number;
  name: string;
  description: string;
  mode: string;
  team?: {
    id?: number;
    name?: string;
    version?: number;
  };
};

export type WorkTeam = {
  id: number;
  name: string;
  description: string;
};

export type WorkRelease = {
  id: number;
  team_id: number;
  version: number;
  status?: string;
};

export type AssetCate = {
  id: number;
  team_id: number;
  name: string;
  kind: AssetKind;
  cardinality: AssetCardinality;
  status: number;
  sort: number;
  virtual?: boolean;
};

export type TeamRole = {
  id: number;
  team_id: number;
  role_type: string;
  role_key: string;
  name: string;
  agent_id: number;
  asset_cate_id: number;
  assignment: string;
};

export type TeamFlow = {
  id: number;
  name: string;
  key: string;
  goal: string;
  config: Record<string, unknown>;
  status: number;
  sort: number;
};

export type TeamFlowNode = {
  id: number;
  node_key: string;
  name: string;
  type: string;
  role_id: number;
  role_key: string;
  agent_id: number;
  power_id: number;
  sub_team_id: number;
  asset_cate_id: number;
  config: Record<string, unknown>;
};

export type PowerOption = {
  id: number;
  cate_id: number;
  name: string;
  key: string;
  icon: string;
  kind: string;
};

export type PowerKindOption = {
  id: string;
  value: string;
};

export type PowerParamOption = {
  id: number;
  name: string;
  value: string;
  native_value?: string;
  sort?: number;
};

export type PowerParam = {
  id: number;
  power_param_id?: number;
  name: string;
  key: string;
  type: "input" | "textarea" | "switch" | "option" | "multi_option" | "file" | "files" | "hidden" | "description" | string;
  usage?: number;
  value_type?: "string" | "number" | string;
  default_value?: string;
  required?: boolean;
  upload_rule_id?: number;
  max_files?: number;
  sort?: number;
  options?: PowerParamOption[];
};

export type PowerParamSource = {
  id: number;
  target_id: number;
  service_id: number;
  service_name: string;
  provider_id?: number;
  provider_name?: string;
  name: string;
  sort?: number;
};

export type PowerForm = {
  release_id?: number;
  flow?: TeamFlow | Record<string, unknown>;
  power?: PowerOption;
  source_rule?: number;
  selected_target_id?: number;
  sources: PowerParamSource[];
  params: PowerParam[];
  primary_param_key?: string;
};

export type CanvasFunctionOption = {
  key: string;
  label: string;
  description: string;
};

export type AssetVersion = {
  id: number;
  asset_id: number;
  run_id?: number;
  node_run_id?: number;
  release_id?: number;
  version: number;
  content?: unknown;
  created_at?: string;
};

export type ProjectAsset = {
  id: number;
  project_id: number;
  body_id: number;
  team_id: number;
  flow_id: number;
  asset_cate_id: number;
  name: string;
  kind: AssetKind;
  role?: AssetRole;
  version_id: number;
  sort: number;
  created_at?: string;
  version?: AssetVersion;
  versions?: AssetVersion[];
};

export type CanvasResultRef = {
  run_id?: number;
  request_id?: string;
  flow_run_id?: number;
  node_run_id?: number;
  asset_id?: number;
  version_id?: number;
  release_id?: number;
  role?: string;
  status?: string;
  updated_at?: string;
};

export type CanvasResultSourceRef = {
  sourceRunId?: number;
  sourceNodeRunId?: number;
  sourceAssetId?: number;
  sourceVersionId?: number;
  sourceReleaseId?: number;
  sourceRequestId?: string;
  sourceNodeKey?: string;
  sourceNodeType?: string;
  sourceStatus?: string;
  sourceKey?: string;
};

export type SpaceBootstrap = {
  project: WorkProject;
  team: WorkTeam;
  release: WorkRelease;
  assetCates: AssetCate[];
  roles: TeamRole[];
  flows: TeamFlow[];
  nodesByFlow: Record<string, TeamFlowNode[]>;
  canvases: Record<string, SpaceCanvasState>;
  assets: ProjectAsset[];
  powers: PowerOption[];
  powerKinds: PowerKindOption[];
};

export type SpaceCanvasNode = {
  [key: string]: unknown;
  id: string;
  type: SpaceNodeType;
  title: string;
  subtitle: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  assetCateId?: number;
  kind?: AssetKind;
  cardinality?: AssetCardinality;
  count?: number;
  flow?: TeamFlow;
  role?: TeamRole;
  asset?: ProjectAsset;
  power?: PowerOption;
  functionOption?: CanvasFunctionOption;
  resultRef?: CanvasResultRef;
  resultOutput?: unknown;
  local?: boolean;
};

export type SpaceCanvasEdge = {
  id: string;
  from: string;
  to: string;
};

export type SpaceCanvasViewport = {
  x?: number;
  y?: number;
  zoom?: number;
};

export type SpaceCanvasState = {
  assetCateId: number;
  nodes: SpaceCanvasNode[];
  edges: SpaceCanvasEdge[];
  viewport: SpaceCanvasViewport;
  updatedAt?: string;
};
