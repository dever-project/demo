export type AssetKind = "text" | "image" | "audio" | "video" | "file" | "mixed" | string;
export type AssetCardinality = "single" | "multiple" | "ordered" | string;
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

export type AssetVersion = {
  id: number;
  asset_id: number;
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
  version_id: number;
  sort: number;
  created_at?: string;
  version?: AssetVersion;
};

export type SpaceBootstrap = {
  project: WorkProject;
  team: WorkTeam;
  release: WorkRelease;
  assetCates: AssetCate[];
  roles: TeamRole[];
  flows: TeamFlow[];
  nodesByFlow: Record<string, TeamFlowNode[]>;
  assets: ProjectAsset[];
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
  local?: boolean;
};

export type SpaceCanvasEdge = {
  id: string;
  from: string;
  to: string;
};
