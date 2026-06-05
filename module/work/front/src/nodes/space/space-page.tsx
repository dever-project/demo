import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type DragEvent,
} from "react";
import {
  Background,
  Controls,
  ControlButton,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft,
  ArrowUp,
  Bot,
  Brain,
  CheckCircle2,
  ChevronDown,
  Columns3,
  Compass,
  Cpu,
  Crop,
  Download,
  Eye,
  FileText,
  FileSearch,
  Folder,
  GitBranch,
  Grid,
  History,
  Image as ImageIcon,
  Layers,
  Loader2,
  Maximize2,
  MessageSquare,
  Moon,
  MoreHorizontal,
  MousePointer2,
  PenTool,
  Play,
  Plus,
  Route,
  RotateCw,
  Save,
  Scissors,
  Send,
  Sparkles,
  Sun,
  Type,
  Tv,
  Users,
  UserCheck,
  Video,
  Workflow,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { request, useNavigate } from "@dever/front-plugin";
import {
  fetchSpaceBootstrap,
  fetchSpacePowers,
  runSpaceFlow,
  sendSpaceMessage,
} from "./space-api";
import {
  assetCateById,
  assetKindLabel,
  assetsForCate,
  buildCanvasModel,
  cardinalityLabel,
  createLocalNode,
  defaultAssetCateId,
  isExecutionRole,
  powerKindLabel,
  relatedFlows,
  visibleAssetCates,
} from "./space-model";
import { WorkSpaceStyles } from "./space-styles";
import type {
  AssetCate,
  CanvasFunctionOption,
  PowerKindOption,
  PowerOption,
  ProjectAsset,
  SpaceBootstrap,
  SpaceCanvasNode,
  TeamFlow,
  TeamRole,
} from "./types";
import { SpaceAnimatedEdge } from "./space-edge";

type PanelMode = "assets" | "flows" | "chat" | null;
type WorkSpaceTheme = "dark" | "light";
type CanvasPoint = { x: number; y: number };
type AddNodeMenuState = {
  x: number;
  y: number;
  position: CanvasPoint;
  view: "types" | "assets" | "powers" | "agents" | "flows" | "functions";
};

type PaletteItem = {
  type: SpaceCanvasNode["type"];
  label: string;
  desc: string;
  icon: LucideIcon;
};

const paletteItems: PaletteItem[] = [
  { type: "asset", label: "资产引用", desc: "引用已有作品资产", icon: Folder },
  { type: "power", label: "能力节点", desc: "生文、生图、生视频", icon: Zap },
  { type: "agent", label: "智能体", desc: "调用团队角色", icon: UserCheck },
  { type: "flow", label: "流程节点", desc: "执行团队流程", icon: Workflow },
  { type: "function", label: "功能节点", desc: "条件、确认、保存", icon: Save },
];

const paletteSections = [
  { title: "创建资产节点 (Asset)", types: ["asset"] as SpaceCanvasNode["type"][] },
  { title: "部署能力节点 (Power)", types: ["power"] as SpaceCanvasNode["type"][] },
  { title: "调用团队协作 (Agent & Flow)", types: ["agent", "flow"] as SpaceCanvasNode["type"][] },
  { title: "控制功能节点 (Function)", types: ["function"] as SpaceCanvasNode["type"][] },
];

const functionOptions: CanvasFunctionOption[] = [
  { key: "condition", label: "条件判断", description: "按条件把上游结果分流到不同后续节点。" },
  { key: "confirm", label: "人工确认", description: "人工审查、确认或阻断当前节点结果。" },
  { key: "save", label: "保存资产", description: "将上游临时结果正式写入作品资产。" },
  { key: "context", label: "合并", description: "合并整合多个资产或节点结果作为统一上下文。" },
];

const flowNodeTypes = {
  workSpace: SpaceNodeView,
};

const flowEdgeTypes = {
  animated: SpaceAnimatedEdge,
};

export function WorkSpacePage() {
  const navigate = useNavigate();
  const projectId = useMemo(() => readProjectId(), []);
  const [space, setSpace] = useState<SpaceBootstrap | null>(null);
  const [activeCateId, setActiveCateId] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [localNodes, setLocalNodes] = useState<SpaceCanvasNode[]>([]);
  const [prompt, setPrompt] = useState("");
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [theme, setTheme] = useState<WorkSpaceTheme>(() => readStoredTheme());
  const [nodeMenu, setNodeMenu] = useState<AddNodeMenuState | null>(null);
  const [powers, setPowers] = useState<PowerOption[]>([]);
  const [powerKinds, setPowerKinds] = useState<PowerKindOption[]>([]);
  const [powersLoading, setPowersLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [runStatus, setRunStatus] = useState("");

  const loadSpace = useCallback(async () => {
    if (!projectId) {
      setError("缺少作品 ID");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const nextSpace = await fetchSpaceBootstrap(projectId);
      setSpace(nextSpace);
      setActiveCateId(defaultAssetCateId(nextSpace));
      setPowers(nextSpace.powers || []);
      setPowerKinds(nextSpace.powerKinds || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载创作空间失败");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadSpace();
  }, [loadSpace]);

  const cates = useMemo(() => (space ? visibleAssetCates(space) : []), [space]);
  const activeCate = useMemo(
    () => (space ? assetCateById(space, activeCateId) : null),
    [activeCateId, space],
  );
  const activeAssets = useMemo(
    () => (space && activeCate ? assetsForCate(space, activeCate.id) : []),
    [activeCate, space],
  );
  const activeFlows = useMemo(
    () => (space && activeCate ? relatedFlows(space, activeCate.id) : []),
    [activeCate, space],
  );
  const menuAssets = useMemo(() => space?.assets || [], [space]);
  const menuRoles = useMemo(
    () => {
      if (!space) return [];
      const workerRoles = (space.roles || []).filter(isExecutionRole);
      if (!activeCate) return workerRoles;
      return workerRoles.filter(
        (role) => role.asset_cate_id === 0 || role.asset_cate_id === activeCate.id,
      );
    },
    [space, activeCate],
  );
  const menuFlows = useMemo(
    () => (activeFlows.length > 0 ? activeFlows : space?.flows || []),
    [activeFlows, space],
  );
  const canvasModel = useMemo(() => {
    if (!space || !activeCate) {
      return { nodes: [], edges: [] };
    }
    const currentLocalNodes = localNodes.filter(
      (node: SpaceCanvasNode) => node.assetCateId === activeCate.id || activeCate.id === 0,
    );
    return buildCanvasModel(space, activeCate.id, currentLocalNodes);
  }, [activeCate, localNodes, space]);
  function switchCate(cateId: number) {
    setActiveCateId(cateId);
    setSelectedNodeId("");
    setPanelMode(null);
    setNodeMenu(null);
    setRunStatus("");
  }

  function addConfiguredNode(
    type: SpaceCanvasNode["type"],
    position?: CanvasPoint,
    options?: {
      asset?: ProjectAsset;
      flow?: TeamFlow;
      functionOption?: CanvasFunctionOption;
      power?: PowerOption;
      role?: TeamRole;
    },
  ) {
    if (!activeCate) {
      return;
    }
    const node = createLocalNode(type, activeCate, localNodes.length, position, options);
    setLocalNodes((items: SpaceCanvasNode[]) => [...items, node]);
    setSelectedNodeId(node.id);
    setPanelMode(null);
    setNodeMenu(null);
  }

  function addAssetNode(asset: ProjectAsset, position?: CanvasPoint) {
    addConfiguredNode("asset", position, { asset });
  }

  function addPowerNode(power: PowerOption, position?: CanvasPoint) {
    addConfiguredNode("power", position, { power });
  }

  function addAgentNode(role: TeamRole, position?: CanvasPoint) {
    addConfiguredNode("agent", position, { role });
  }

  function addFlowNode(flow: TeamFlow, position?: CanvasPoint) {
    addConfiguredNode("flow", position, { flow });
  }

  function addFunctionNode(functionOption: CanvasFunctionOption, position?: CanvasPoint) {
    addConfiguredNode("function", position, { functionOption });
  }

  function openNodeMenu(screen: CanvasPoint, position: CanvasPoint) {
    setPanelMode(null);
    setNodeMenu({
      x: screen.x,
      y: screen.y,
      position,
      view: "types",
    });
    void loadPowerCatalog();
  }

  function openDockNodeMenu() {
    openNodeMenu(
      { x: 92, y: 122 },
      defaultNodePosition(localNodes.length),
    );
  }

  function openNodeTypePicker(type: SpaceCanvasNode["type"], screen?: CanvasPoint, position?: CanvasPoint) {
    const menuScreen = screen || { x: 112, y: 122 };
    const menuPosition = position || defaultNodePosition(localNodes.length);
    setPanelMode(null);
    setNodeMenu({
      x: menuScreen.x,
      y: menuScreen.y,
      position: menuPosition,
      view: nodeMenuViewForType(type),
    });
    void loadPowerCatalog();
  }

  function toggleTheme() {
    setTheme((current: WorkSpaceTheme) => {
      const next = current === "dark" ? "light" : "dark";
      persistTheme(next);
      return next;
    });
  }

  async function showPowerPicker() {
    setNodeMenu((current: AddNodeMenuState | null) => (current ? { ...current, view: "powers" as const } : current));
    await loadPowerCatalog();
  }

  async function loadPowerCatalog() {
    if (!space) {
      return;
    }
    setPowersLoading(true);
    try {
      const catalog = await fetchSpacePowers(space.project.id);
      setPowers(catalog.powers);
      setPowerKinds(catalog.powerKinds);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载能力列表失败");
    } finally {
      setPowersLoading(false);
    }
  }

  function selectMenuNodeType(type: SpaceCanvasNode["type"]) {
    if (type === "power") {
      void showPowerPicker();
      return;
    }
    setNodeMenu((current: AddNodeMenuState | null) => (current ? { ...current, view: nodeMenuViewForType(type) } : current));
  }

  async function submitMessage() {
    if (!space || !activeCate || !prompt.trim()) {
      return;
    }
    setRunning(true);
    setRunStatus("");
    try {
      const result = await sendSpaceMessage(space.project.id, activeCate.id, prompt.trim());
      setRunStatus(runStatusText(result, "已提交给沟通角色"));
      toast.success("已提交给沟通角色");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "发送失败");
    } finally {
      setRunning(false);
    }
  }

  async function executeFlow(flow: TeamFlow) {
    if (!space || !activeCate) {
      return;
    }
    setRunning(true);
    setRunStatus("");
    try {
      const result = await runSpaceFlow(space.project.id, activeCate.id, flow, prompt.trim());
      setRunStatus(runStatusText(result, `已运行流程：${flow.name || "团队流程"}`));
      toast.success("流程已提交运行");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "流程运行失败");
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return (
      <main className={`ws-page is-${theme} ws-loading-screen`}>
        <WorkSpaceStyles />
        <div className="ws-loading-card">
          <Loader2 size={20} className="ws-spin" />
          <span>正在加载创作空间...</span>
        </div>
      </main>
    );
  }

  if (error || !space || !activeCate) {
    return (
      <main className={`ws-page is-${theme} ws-loading-screen`}>
        <WorkSpaceStyles />
        <div className="ws-loading-card ws-error-card">
          <span>{error || "创作空间不存在"}</span>
        </div>
      </main>
    );
  }

  return (
    <main className={`ws-page is-${theme}`}>
      <WorkSpaceStyles />
      <CanvasWorkbench
        activeCate={activeCate}
        assetsCount={activeAssets.length}
        nodes={canvasModel.nodes}
        edges={canvasModel.edges}
        selectedNodeId={selectedNodeId}
        onSelectNode={(nodeId) => {
          setSelectedNodeId(nodeId);
          setNodeMenu(null);
        }}
        onOpenNodeMenu={openNodeMenu}
        onAddConfiguredNode={addConfiguredNode}
        projectId={projectId}
        space={space}
        loadSpace={loadSpace}
      />

      <TopCanvasToolbar
        space={space}
        cates={cates}
        activeCate={activeCate}
        onBack={() => navigate({ to: "/work/home" })}
        onRefresh={loadSpace}
        onSelectCate={switchCate}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <LeftCanvasDock
        panelMode={panelMode}
        onAdd={openDockNodeMenu}
        onOpenPanel={setPanelMode}
      />

      <button
        type="button"
        className="ws-assistant-ball"
        onClick={() => setPanelMode(panelMode === "chat" ? null : "chat")}
        aria-label="沟通角色"
      >
        <MessageSquare size={22} />
      </button>

      {panelMode === "assets" ? (
        <AssetFloatingPanel
          space={space}
          activeCate={activeCate}
          onClose={() => setPanelMode(null)}
          onSelectCate={switchCate}
          onPickNodeType={openNodeTypePicker}
        />
      ) : null}

      {panelMode === "flows" ? (
        <FlowFloatingPanel
          flows={activeFlows}
          running={running}
          onClose={() => setPanelMode(null)}
          onRunFlow={executeFlow}
        />
      ) : null}

      {panelMode === "chat" ? (
        <ChatFloatingPanel
          activeCate={activeCate}
          prompt={prompt}
          running={running}
          runStatus={runStatus}
          onClose={() => setPanelMode(null)}
          onPromptChange={setPrompt}
          onSubmitMessage={submitMessage}
        />
      ) : null}

      {nodeMenu ? (
        <AddNodeMenu
          menu={nodeMenu}
          assets={menuAssets}
          assetCates={cates}
          flows={menuFlows}
          functionOptions={functionOptions}
          powers={powers}
          powerKinds={powerKinds}
          powersLoading={powersLoading}
          roles={menuRoles}
          onClose={() => setNodeMenu(null)}
          onBack={() => setNodeMenu((current: AddNodeMenuState | null) => (current ? { ...current, view: "types" as const } : current))}
          onSelectAsset={(asset) => addAssetNode(asset, nodeMenu.position)}
          onSelectFlow={(flow) => addFlowNode(flow, nodeMenu.position)}
          onSelectFunction={(functionOption) => addFunctionNode(functionOption, nodeMenu.position)}
          onSelect={selectMenuNodeType}
          onSelectRole={(role) => addAgentNode(role, nodeMenu.position)}
          onSelectPower={(power) => addPowerNode(power, nodeMenu.position)}
        />
      ) : null}
    </main>
  );
}

function TopCanvasToolbar({
  space,
  cates,
  activeCate,
  onBack,
  onRefresh,
  onSelectCate,
  theme,
  onToggleTheme,
}: {
  space: SpaceBootstrap;
  cates: AssetCate[];
  activeCate: AssetCate;
  onBack: () => void;
  onRefresh: () => void;
  onSelectCate: (cateId: number) => void;
  theme: WorkSpaceTheme;
  onToggleTheme: () => void;
}) {
  return (
    <header className="ws-topbar">
      <div className="ws-top-left">
        <button type="button" className="ws-back" onClick={onBack} aria-label="返回工作台">
          <ArrowLeft size={17} />
        </button>
        <div className="ws-project-meta">
          <div className="ws-project-title">{space.project.name}</div>
          <div className="ws-project-subtitle">
            <span>{space.team.name || space.project.team?.name || "自由团队"}</span>
            {space.release.version ? <span>v{space.release.version}</span> : null}
          </div>
        </div>
      </div>

      <nav className="ws-cate-strip" aria-label="资产分类">
        {cates.map((cate) => (
          <button
            key={cate.id}
            type="button"
            className={`ws-cate ${cate.id === activeCate.id ? "is-active" : ""}`}
            onClick={() => onSelectCate(cate.id)}
          >
            <span className="ws-cate-name">{cate.name}</span>
            <span className="ws-cate-count">{assetsForCate(space, cate.id).length}</span>
          </button>
        ))}
      </nav>

      <div className="ws-top-actions">
        <div className="ws-team-pill">
          <Bot size={14} />
          {space.assets.length} 资产
        </div>
        <button type="button" className="ws-action" onClick={onToggleTheme}>
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          {theme === "dark" ? "亮色" : "暗色"}
        </button>
        <button type="button" className="ws-action" onClick={onRefresh}>
          <CheckCircle2 size={15} />
          刷新
        </button>
      </div>
    </header>
  );
}

function AddNodeMenu({
  menu,
  flows,
  functionOptions,
  powers,
  roles,
  onClose,
  onSelectFlow,
  onSelectFunction,
  onSelectRole,
  onSelectPower,
}: {
  menu: AddNodeMenuState;
  assets: ProjectAsset[];
  assetCates: AssetCate[];
  flows: TeamFlow[];
  functionOptions: CanvasFunctionOption[];
  powers: PowerOption[];
  powerKinds: PowerKindOption[];
  powersLoading: boolean;
  roles: TeamRole[];
  onClose: () => void;
  onBack: () => void;
  onSelectAsset: (asset: ProjectAsset) => void;
  onSelectFlow: (flow: TeamFlow) => void;
  onSelectFunction: (functionOption: CanvasFunctionOption) => void;
  onSelect: (type: SpaceCanvasNode["type"]) => void;
  onSelectRole: (role: TeamRole) => void;
  onSelectPower: (power: PowerOption) => void;
}) {
  const point = clampMenuPoint(menu);
  const safePowers = powers || [];
  const safeRoles = roles || [];
  const safeFlows = flows || [];

  const visibleSections: ReactNode[] = [];

  if (safePowers.length > 0) {
    visibleSections.push(
      <div key="powers" className="ws-add-section">
        <div className="ws-add-section-title">能力</div>
        <div className="ws-add-menu-list">
          {safePowers.map((power) => {
            const Icon = powerIcon(power.kind);
            return (
              <button
                key={power.key || power.id}
                type="button"
                className="ws-add-item is-power"
                onClick={() => onSelectPower(power)}
              >
                <span className="ws-add-icon">
                  <Icon size={16} />
                </span>
                <span className="ws-add-label">{power.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (safeRoles.length > 0) {
    visibleSections.push(
      <div key="roles" className="ws-add-section">
        <div className="ws-add-section-title">智能体</div>
        <div className="ws-add-menu-list">
          {safeRoles.map((role) => (
            <button
              key={role.id || role.role_key || role.name}
              type="button"
              className="ws-add-item is-agent"
              onClick={() => onSelectRole(role)}
            >
              <span className="ws-add-icon">
                <UserCheck size={16} />
              </span>
              <span className="ws-add-label">{role.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (safeFlows.length > 0) {
    visibleSections.push(
      <div key="flows" className="ws-add-section">
        <div className="ws-add-section-title">流程</div>
        <div className="ws-add-menu-list">
          {safeFlows.map((flow) => (
            <button
              key={flow.id || flow.key || flow.name}
              type="button"
              className="ws-add-item is-flow"
              onClick={() => onSelectFlow(flow)}
            >
              <span className="ws-add-icon">
                <Workflow size={16} />
              </span>
              <span className="ws-add-label">{flow.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (functionOptions && functionOptions.length > 0) {
    visibleSections.push(
      <div key="functions" className="ws-add-section">
        <div className="ws-add-section-title">控制</div>
        <div className="ws-add-menu-list">
          {functionOptions.map((option) => {
            const Icon = functionIcon(option.key);
            return (
              <button
                key={option.key}
                type="button"
                className="ws-add-item is-function"
                onClick={() => onSelectFunction(option)}
              >
                <span className="ws-add-icon">
                  <Icon size={16} />
                </span>
                <span className="ws-add-label">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="ws-add-menu-backdrop"
        onMouseDown={onClose}
        onContextMenu={(event: any) => {
          event.preventDefault();
          onClose();
        }}
      />
      <section
        className="ws-add-menu custom-scrollbar"
        style={{ left: point.x, top: point.y }}
        onMouseDown={(event: any) => event.stopPropagation()}
      >
        <div className="ws-add-menu-head">
          <strong>添加节点</strong>
        </div>
        <div className="ws-add-menu-body">
          {visibleSections.map((sec, index) => (
            <div key={index}>
              {sec}
              {index < visibleSections.length - 1 && <div className="ws-add-divider" />}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}


function LeftCanvasDock({
  panelMode,
  onAdd,
  onOpenPanel,
}: {
  panelMode: PanelMode;
  onAdd: () => void;
  onOpenPanel: (mode: PanelMode) => void;
}) {
  return (
    <aside className="ws-dock ws-glass-panel" aria-label="画布工具">
      <button type="button" className="ws-dock-add" onClick={onAdd} aria-label="添加节点">
        <Plus size={22} />
      </button>
      <div className="ws-dock-divider" style={{ width: "24px", height: "1px", background: "var(--ws-border)", margin: "4px 0" }} />
      <DockButton active={panelMode === "assets"} icon={Folder} label="资产" onClick={() => onOpenPanel(panelMode === "assets" ? null : "assets")} />
      <DockButton active={panelMode === "flows"} icon={Workflow} label="流程" onClick={() => onOpenPanel(panelMode === "flows" ? null : "flows")} />
      <DockButton active={panelMode === "chat"} icon={MessageSquare} label="沟通" onClick={() => onOpenPanel(panelMode === "chat" ? null : "chat")} />
      <DockButton active={false} icon={History} label="历史" onClick={() => onOpenPanel(null)} />
    </aside>
  );
}

function DockButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`ws-dock-button ${active ? "is-active" : ""}`} onClick={onClick}>
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}

function AssetFloatingPanel({
  space,
  activeCate,
  onClose,
  onSelectCate,
  onPickNodeType,
}: {
  space: SpaceBootstrap;
  activeCate: AssetCate;
  onClose: () => void;
  onSelectCate: (cateId: number) => void;
  onPickNodeType: (type: SpaceCanvasNode["type"]) => void;
}) {
  const cates = visibleAssetCates(space);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  const handleDragStart = (e: React.DragEvent, nodeType: string, detail?: any) => {
    e.dataTransfer.setData("application/shemic-nodetype", nodeType);
    if (detail) {
      e.dataTransfer.setData("application/shemic-detail", JSON.stringify(detail));
    }
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <FloatingPanel title="节点组件库" subtitle="资产树 / 节点库" side="left" onClose={onClose}>
      <div className="ws-drawer-search" style={{ padding: "10px" }}>
        <input
          type="text"
          placeholder="搜索组件/资产..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "6px 12px",
            border: "1px solid var(--ws-border)",
            borderRadius: "8px",
            background: "rgba(0,0,0,0.2)",
            color: "#fff",
            fontSize: "12px",
            outline: "none"
          }}
        />
      </div>

      <div className="ws-asset-tree custom-scrollbar" style={{ flex: 1, overflowY: "auto" }}>
        {cates.map((cate) => {
          const isCollapsed = collapsed[cate.id] ?? false;
          const assets = assetsForCate(space, cate.id).filter(a =>
            a.name.toLowerCase().includes(searchQuery.toLowerCase())
          );

          return (
            <div key={cate.id} className="ws-tree-group">
              <button
                type="button"
                className={`ws-tree-head ${cate.id === activeCate.id ? "is-active" : ""}`}
                onClick={() => {
                  onSelectCate(cate.id);
                  setCollapsed(prev => ({ ...prev, [cate.id]: !isCollapsed }));
                }}
              >
                <span className="ws-tree-label">
                  {assetIcon(cate.kind)}
                  {cate.name}
                </span>
                <span>{assets.length}</span>
              </button>

              {!isCollapsed && (
                <div className="ws-tree-list">
                  {assets.length > 0 ? (
                    assets.slice(0, 8).map((asset) => (
                      <div
                        key={asset.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, "asset", asset)}
                        className="ws-tree-asset draggable-item"
                        style={{ cursor: "grab", padding: "6px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.03)", marginBottom: "4px" }}
                      >
                        {asset.name || "未命名资产"}
                      </div>
                    ))
                  ) : (
                    <div className="ws-tree-empty">暂无资产</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="ws-panel-divider" />
      <div className="ws-node-palette">
        {paletteItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.type}
              type="button"
              draggable
              onDragStart={(e) => handleDragStart(e, item.type)}
              className="ws-palette-button"
              onClick={() => onPickNodeType(item.type)}
              style={{ cursor: "grab" }}
            >
              <Icon size={16} />
              <span>{item.label}</span>
              <small>{item.desc}</small>
            </button>
          );
        })}
      </div>
    </FloatingPanel>
  );
}

function FlowFloatingPanel({
  flows,
  running,
  onClose,
  onRunFlow,
}: {
  flows: TeamFlow[];
  running: boolean;
  onClose: () => void;
  onRunFlow: (flow: TeamFlow) => void;
}) {
  return (
    <FloatingPanel title="相关流程" subtitle={`${flows.length} 个团队流程`} side="right" onClose={onClose}>
      <div className="ws-flow-list">
        {flows.length > 0 ? (
          flows.map((flow) => (
            <div key={flow.id} className="ws-flow-card">
              <h4>{flow.name || "未命名流程"}</h4>
              <p>{flow.goal || "运行团队预设流程，产出由保存节点写入作品资产。"}</p>
              <button type="button" disabled={running} onClick={() => onRunFlow(flow)}>
                <Play size={13} />
                运行流程
              </button>
            </div>
          ))
        ) : (
          <div className="ws-tree-empty">当前团队还没有流程，可以先使用自由节点。</div>
        )}
      </div>
    </FloatingPanel>
  );
}

function ChatFloatingPanel({
  activeCate,
  prompt,
  running,
  runStatus,
  onClose,
  onPromptChange,
  onSubmitMessage,
}: {
  activeCate: AssetCate;
  prompt: string;
  running: boolean;
  runStatus: string;
  onClose: () => void;
  onPromptChange: (value: string) => void;
  onSubmitMessage: () => void;
}) {
  return (
    <FloatingPanel title="沟通角色" subtitle={activeCate.name} side="right" onClose={onClose}>
      <div className="ws-chat-box">
        <textarea
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          placeholder={`告诉沟通角色你想怎么做${activeCate.name}...`}
        />
        <button
          type="button"
          className="ws-panel-button"
          disabled={running || !prompt.trim()}
          onClick={onSubmitMessage}
        >
          {running ? <Loader2 size={14} /> : <Send size={14} />}
          发送
        </button>
        {runStatus ? <div className="ws-run-status">{runStatus}</div> : null}
      </div>
    </FloatingPanel>
  );
}

function FloatingPanel({
  title,
  subtitle,
  side,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  side: "left" | "right";
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <section className={`ws-floating-panel is-${side}`}>
      <div className="ws-floating-head">
        <div>
          <h3>{title}</h3>
          <span>{subtitle}</span>
        </div>
        <button type="button" onClick={onClose} aria-label="关闭">
          <X size={15} />
        </button>
      </div>
      {children}
    </section>
  );
}

function CanvasWorkbench({
  activeCate,
  assetsCount,
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onOpenNodeMenu,
  onAddConfiguredNode,
  projectId,
  space,
  loadSpace,
}: {
  activeCate: AssetCate;
  assetsCount: number;
  nodes: SpaceCanvasNode[];
  edges: { id: string; from: string; to: string }[];
  selectedNodeId: string;
  onSelectNode: (id: string) => void;
  onOpenNodeMenu: (screen: CanvasPoint, position: CanvasPoint) => void;
  onAddConfiguredNode?: (
    type: SpaceCanvasNode["type"],
    position?: CanvasPoint,
    options?: {
      asset?: ProjectAsset;
      flow?: TeamFlow;
      functionOption?: CanvasFunctionOption;
      power?: PowerOption;
      role?: TeamRole;
    },
  ) => void;
  projectId: number;
  space: SpaceBootstrap;
  loadSpace: () => Promise<void>;
}) {
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [userEdges, setUserEdges] = useState<Edge[]>([]);
  const [flowInstance, setFlowInstance] = useState<FlowViewport | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState("");
  const [draggingNodeId, setDraggingNodeId] = useState("");
  const [proximityEdge, setProximityEdge] = useState<Edge | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const flowNodeCache = useRef<Map<string, Node>>(new Map());
  const fitKey = useMemo(() => {
    if (nodes.length === 0) {
      return "";
    }
    return `${activeCate.id}:${nodes.map((node) => node.id).join("|")}`;
  }, [activeCate.id, nodes]);

  const flowNodes = useMemo<Node[]>(() => {
    const activeIds = new Set<string>();
    const nextNodes = nodes.map((node) => {
      activeIds.add(node.id);
      const position = nodePositions[node.id] || { x: node.x, y: node.y };
      const selected = node.id === selectedNodeId;

      // Attach outer project context to node data
      (node as any).projectId = projectId;
      (node as any).space = space;
      (node as any).loadSpace = loadSpace;

      const cached = flowNodeCache.current.get(node.id);
      const cachedStyle = cached?.style as CSSProperties | undefined;
      if (
        cached &&
        cached.position.x === position.x &&
        cached.position.y === position.y &&
        cached.data === node &&
        cached.selected === selected &&
        cachedStyle?.width === node.width &&
        cachedStyle?.height === node.height
      ) {
        return cached;
      }
      const nextNode: Node = {
        ...cached,
        id: node.id,
        type: "workSpace",
        position,
        data: node,
        selected,
        style: {
          ...cached?.style,
          width: node.width,
          height: node.height,
        },
      };
      flowNodeCache.current.set(node.id, nextNode);
      return nextNode;
    });
    for (const cachedId of flowNodeCache.current.keys()) {
      if (!activeIds.has(cachedId)) {
        flowNodeCache.current.delete(cachedId);
      }
    }
    return nextNodes;
  }, [nodePositions, nodes, selectedNodeId]);

  const flowEdges = useMemo<Edge[]>(() => {
    const nodeIds = new Set(nodes.map((node) => node.id));
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const baseEdges: Edge[] = edges.map((edge) => ({
      id: edge.id,
      source: edge.from,
      sourceHandle: "output-0",
      target: edge.to,
      targetHandle: "input-0",
      type: "animated",
      animated: false,
    }));
    const activeEdges = [
      ...baseEdges,
      ...userEdges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)),
    ];
    return activeEdges.map((edge) => decorateFlowEdge(edge, nodeMap, hoveredNodeId, selectedNodeId));
  }, [edges, hoveredNodeId, nodes, selectedNodeId, userEdges]);

  const renderedEdges = useMemo(
    () => (proximityEdge ? [...flowEdges, proximityEdge] : flowEdges),
    [flowEdges, proximityEdge],
  );

  useEffect(() => {
    if (!flowInstance || !fitKey || typeof window === "undefined") {
      return;
    }
    const timer = setTimeout(() => {
      flowInstance.fitView?.({ padding: 0.32, duration: 250, maxZoom: 0.72 });
    }, 150);
    return () => clearTimeout(timer);
  }, [fitKey, flowInstance]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const nextNodes = applyNodeChanges(changes, flowNodes);
      setNodePositions((current: Record<string, { x: number; y: number }>) => {
        let changed = false;
        const next = { ...current };
        for (const node of nextNodes) {
          if (!current[node.id] || current[node.id].x !== node.position.x || current[node.id].y !== node.position.y) {
            next[node.id] = node.position;
            changed = true;
          }
        }
        return changed ? next : current;
      });

      let hasSelect = false;
      let selectedId = "";
      let hasDeselect = false;
      for (const change of changes) {
        if (change.type === "select") {
          if (change.selected) {
            hasSelect = true;
            selectedId = change.id;
          } else {
            hasDeselect = true;
          }
        }
      }
      if (hasSelect) {
        onSelectNode(selectedId);
      } else if (hasDeselect) {
        onSelectNode("");
      }

      for (const node of nextNodes) {
        flowNodeCache.current.set(node.id, node);
      }
    },
    [flowNodes, onSelectNode],
  );

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    setUserEdges((current: Edge[]) => applyEdgeChanges(changes, current));
  }, []);

  const handleConnect = useCallback<OnConnect>((connection) => {
    setUserEdges((current: Edge[]) =>
      addEdge(
        {
          ...connection,
          type: "animated",
          animated: false,
        },
        current,
      ),
    );
  }, []);

  const updateProximityEdge = useCallback((nextEdge: Edge | null) => {
    setProximityEdge((current: Edge | null) => (isSamePreviewEdge(current, nextEdge) ? current : nextEdge));
  }, []);

  const checkValidConnection = useCallback((connection: any) => {
    const sourceNode = nodes.find((n: SpaceCanvasNode) => n.id === connection.source);
    const targetNode = nodes.find((n: SpaceCanvasNode) => n.id === connection.target);
    return canConnectNodes(sourceNode, targetNode);
  }, [nodes]);

  const handleNodeDrag = useCallback(
    (_event: ReactMouseEvent | MouseEvent, draggedNode: Node) => {
      const hasConnections = flowEdges.some(
        (edge) => edge.source === draggedNode.id || edge.target === draggedNode.id,
      );
      if (hasConnections) {
        updateProximityEdge(null);
        return;
      }
      const sourceNode = nodes.find((node) => node.id === draggedNode.id);
      if (!sourceNode) {
        updateProximityEdge(null);
        return;
      }
      const closest = findClosestConnectableNode(draggedNode, flowNodes, nodes);
      if (!closest) {
        updateProximityEdge(null);
        return;
      }
      const connection = resolveProximityConnection(sourceNode, closest.domainNode);
      if (!connection) {
        updateProximityEdge(null);
        return;
      }
      updateProximityEdge(createProximityPreviewEdge(connection));
    },
    [flowEdges, flowNodes, nodes, updateProximityEdge],
  );

  const handleNodeDragStop = useCallback(() => {
    setDraggingNodeId("");
    if (!proximityEdge) {
      updateProximityEdge(null);
      return;
    }
    const exists = flowEdges.some(
      (edge) => edge.source === proximityEdge.source && edge.target === proximityEdge.target,
    );
    if (!exists) {
      setUserEdges((current: Edge[]) => [
        ...current,
        {
          id: `edge-${proximityEdge.source}-${proximityEdge.target}-${Date.now()}`,
          source: proximityEdge.source,
          sourceHandle: proximityEdge.sourceHandle,
          target: proximityEdge.target,
          targetHandle: proximityEdge.targetHandle,
          type: "animated",
          animated: false,
        },
      ]);
    }
    updateProximityEdge(null);
  }, [flowEdges, proximityEdge, updateProximityEdge]);

  const handlePaneClick = useCallback(
    (event: ReactMouseEvent | MouseEvent) => {
      onSelectNode("");
      if (!("detail" in event) || event.detail !== 2) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const screen = { x: event.clientX, y: event.clientY };
      onOpenNodeMenu(screen, flowPositionFromScreen(flowInstance, screen));
    },
    [flowInstance, onOpenNodeMenu, onSelectNode],
  );

  const handlePaneContextMenu = useCallback(
    (event: ReactMouseEvent | MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const screen = { x: event.clientX, y: event.clientY };
      onOpenNodeMenu(screen, flowPositionFromScreen(flowInstance, screen));
    },
    [flowInstance, onOpenNodeMenu],
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }, []);

  const onDrop = useCallback((event: DragEvent) => {
    event.preventDefault();
    if (!flowInstance || !onAddConfiguredNode) return;

    const nodeType = event.dataTransfer.getData("application/shemic-nodetype") as SpaceCanvasNode["type"];
    if (!nodeType) return;

    const detailRaw = event.dataTransfer.getData("application/shemic-detail");
    const detail = detailRaw ? JSON.parse(detailRaw) : undefined;

    const position = flowInstance.screenToFlowPosition
      ? flowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      : flowPositionFromScreen(flowInstance, {
        x: event.clientX,
        y: event.clientY,
      });

    if (nodeType === "asset" && detail) {
      onAddConfiguredNode("asset", position, { asset: detail });
    } else if (nodeType === "power" && detail) {
      onAddConfiguredNode("power", position, { power: detail });
    } else if (nodeType === "agent" && detail) {
      onAddConfiguredNode("agent", position, { role: detail });
    } else if (nodeType === "flow" && detail) {
      onAddConfiguredNode("flow", position, { flow: detail });
    } else if (nodeType === "function" && detail) {
      onAddConfiguredNode("function", position, { functionOption: detail });
    } else {
      onAddConfiguredNode(nodeType, position);
    }
  }, [flowInstance, onAddConfiguredNode]);

  return (
    <section className={`ws-canvas-wrap ${draggingNodeId ? "is-dragging" : ""}`}>
      <ReactFlow
        nodes={flowNodes}
        edges={renderedEdges}
        nodeTypes={flowNodeTypes}
        edgeTypes={flowEdgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        isValidConnection={checkValidConnection}
        onNodeClick={(_, node: Node) => onSelectNode(node.id)}
        onNodeDragStart={(_, node: Node) => setDraggingNodeId(node.id)}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeMouseEnter={(_, node: Node) => setHoveredNodeId(node.id)}
        onNodeMouseLeave={() => setHoveredNodeId("")}
        onInit={(instance) => setFlowInstance(instance as FlowViewport)}
        onPaneClick={handlePaneClick}
        onPaneContextMenu={handlePaneContextMenu}
        zoomOnDoubleClick={false}
        minZoom={0.35}
        maxZoom={1.45}
        defaultEdgeOptions={{
          type: "animated",
          animated: false,
        }}
        fitView
        fitViewOptions={{ padding: 0.32, maxZoom: 0.72 }}
      >
        {showGrid ? (
          <Background variant="dots" color="var(--ws-flow-dot)" gap={18} size={1.5} />
        ) : null}
        <MiniMap
          position="bottom-left"
          pannable
          zoomable
          nodeColor={(node: Node) => miniMapNodeColor(node.data as SpaceCanvasNode)}
        />
        <Controls position="bottom-left" showInteractive={false}>
          <ControlButton onClick={() => setShowGrid((g: boolean) => !g)} title="切换网格">
            <Grid size={15} />
          </ControlButton>
        </Controls>
      </ReactFlow>

      {assetsCount === 0 ? (
        <div className="ws-empty-note">
          <MessageSquare size={17} />
          空的{activeCate.name}工作区。可以和沟通角色说目标，也可以直接添加节点或运行流程。
        </div>
      ) : null}
    </section>
  );
}

type FlowViewport = {
  screenToFlowPosition?: (position: CanvasPoint) => CanvasPoint;
  project?: (position: CanvasPoint) => CanvasPoint;
  fitView?: (options?: { padding?: number; duration?: number }) => void;
};

function flowPositionFromScreen(flow: FlowViewport | null, screen: CanvasPoint) {
  if (flow?.screenToFlowPosition) {
    return flow.screenToFlowPosition(screen);
  }
  if (flow?.project) {
    return flow.project(screen);
  }
  return screen;
}

function defaultNodePosition(index: number): CanvasPoint {
  return {
    x: 360 + (index % 5) * 34,
    y: 250 + (index % 5) * 26,
  };
}

function nodeMenuViewForType(type: SpaceCanvasNode["type"]): AddNodeMenuState["view"] {
  if (type === "asset") return "assets";
  if (type === "power") return "powers";
  if (type === "agent") return "agents";
  if (type === "flow") return "flows";
  return "functions";
}

const connectionRules: Record<SpaceCanvasNode["type"], SpaceCanvasNode["type"][]> = {
  asset: ["power", "agent", "flow"],
  power: ["asset", "function"],
  agent: ["function"],
  flow: ["function"],
  function: ["asset"],
};

function canConnectNodes(sourceNode?: SpaceCanvasNode, targetNode?: SpaceCanvasNode) {
  if (!sourceNode || !targetNode) {
    return false;
  }
  return connectionRules[sourceNode.type]?.includes(targetNode.type) || false;
}

function resolveProximityConnection(sourceNode: SpaceCanvasNode, targetNode: SpaceCanvasNode) {
  if (canConnectNodes(sourceNode, targetNode)) {
    return { source: sourceNode.id, target: targetNode.id };
  }
  if (canConnectNodes(targetNode, sourceNode)) {
    return { source: targetNode.id, target: sourceNode.id };
  }
  return null;
}

function createProximityPreviewEdge(connection: { source: string; target: string }): Edge {
  return {
    id: "proximity-preview",
    source: connection.source,
    sourceHandle: "output-0",
    target: connection.target,
    targetHandle: "input-0",
    type: "animated",
    animated: true,
    style: {
      stroke: "#0ea5e9",
      strokeWidth: 2,
      strokeDasharray: "5 5",
      opacity: 0.86,
      animation: "ws-dashdraw 0.5s linear infinite",
    },
    data: {
      isHighlighted: true,
      highlightColor: "#0ea5e9",
    },
  };
}

function isSamePreviewEdge(current: Edge | null, next: Edge | null) {
  if (!current && !next) {
    return true;
  }
  if (!current || !next) {
    return false;
  }
  return current.source === next.source && current.target === next.target;
}

function findClosestConnectableNode(
  draggedNode: Node,
  flowNodes: Node[],
  domainNodes: SpaceCanvasNode[],
) {
  const maxDistance = 150;
  const domainById = new Map(domainNodes.map((node) => [node.id, node]));
  let closest: { distance: number; domainNode: SpaceCanvasNode } | null = null;
  for (const node of flowNodes) {
    if (node.id === draggedNode.id) {
      continue;
    }
    const domainNode = domainById.get(node.id);
    if (!domainNode) {
      continue;
    }
    const dx = node.position.x - draggedNode.position.x;
    const dy = node.position.y - draggedNode.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < maxDistance && (!closest || distance < closest.distance)) {
      closest = { distance, domainNode };
    }
  }
  return closest;
}

function decorateFlowEdge(
  edge: Edge,
  nodeMap: Map<string, SpaceCanvasNode>,
  hoveredNodeId: string,
  selectedNodeId: string,
): Edge {
  const highlighted =
    edge.source === hoveredNodeId ||
    edge.target === hoveredNodeId ||
    edge.source === selectedNodeId ||
    edge.target === selectedNodeId;
  const activeNodeId = edge.source === hoveredNodeId || edge.target === hoveredNodeId ? hoveredNodeId : selectedNodeId;
  return {
    ...edge,
    data: {
      ...edge.data,
      isHighlighted: highlighted,
      highlightColor: highlighted ? nodeHighlightColor(nodeMap.get(activeNodeId)) : "var(--ws-edge)",
    },
  };
}

function nodeHighlightColor(node?: SpaceCanvasNode) {
  if (node?.type === "asset") return "#10b981";
  if (node?.type === "power") return "#8b5cf6";
  if (node?.type === "agent") return "#f59e0b";
  if (node?.type === "flow") return "#3b82f6";
  if (node?.type === "function") return "#f43f5e";
  return "#3b82f6";
}

function groupedAssets(assets: ProjectAsset[], assetCates: AssetCate[]) {
  const cateNames = new Map(assetCates.map((cate) => [cate.id, cate.name]));
  const groups = new Map<number, ProjectAsset[]>();
  for (const asset of assets) {
    const cateId = asset.asset_cate_id || 0;
    groups.set(cateId, [...(groups.get(cateId) || []), asset]);
  }
  return Array.from(groups.entries())
    .sort(([left], [right]) => left - right)
    .map(([cateId, items]) => ({
      key: String(cateId),
      title: cateNames.get(cateId) || "未分类资产",
      items,
    }));
}

function groupedPowers(powers: PowerOption[], powerKinds: PowerKindOption[]) {
  const labels = new Map(powerKinds.map((item) => [item.id, item.value]));
  const groups = new Map<string, PowerOption[]>();
  for (const power of powers) {
    const kind = power.kind || "text";
    groups.set(kind, [...(groups.get(kind) || []), power]);
  }
  const orderedKinds = [
    ...powerKinds.map((item) => item.id).filter((kind) => groups.has(kind)),
    ...Array.from(groups.keys()).filter((kind) => !labels.has(kind)).sort(),
  ];
  return orderedKinds.map((kind) => ({
    kind,
    label: labels.get(kind) || powerKindLabel(kind),
    items: groups.get(kind) || [],
  }));
}

function assetIconType(kind: string): LucideIcon {
  if (kind === "image") return ImageIcon;
  if (kind === "video") return Video;
  return FileText;
}

function functionIcon(key: string): LucideIcon {
  if (key === "condition") return Route;
  if (key === "confirm") return UserCheck;
  if (key === "context") return Layers;
  if (key === "review") return CheckCircle2;
  return Save;
}

function NodeHandle({
  id,
  type,
  position,
  className,
  style,
}: {
  id: string;
  type: "target" | "source";
  position: Position;
  className: string;
  style?: CSSProperties;
}) {
  return (
    <Handle id={id} type={type} position={position} className={`ws-rf-handle ${className}`} style={style}>
      <span>+</span>
    </Handle>
  );
}

function NodeSelectionOverlays({ node, selected }: { node: SpaceCanvasNode; selected?: boolean }) {
  if (!selected) {
    return null;
  }
  const { projectId, space, loadSpace } = node as any;
  return (
    <>
      <NodeBottomSettings
        key={node.id}
        node={node}
        projectId={projectId}
        space={space}
        loadSpace={loadSpace}
      />
    </>
  );
}

function NodeTopToolbar() {
  const toolbarItems: Array<{ label: string; icon: LucideIcon; accent?: "green"; menu?: boolean }> = [
    { label: "全景图", icon: Compass, accent: "green", menu: true },
    { label: "增强", icon: Zap },
    { label: "编辑元素", icon: Layers },
    { label: "分镜大师", icon: Columns3 },
    { label: "宫格裁剪", icon: Scissors },
    { label: "角度", icon: RotateCw },
    { label: "打光", icon: Sun },
    { label: "更多", icon: MoreHorizontal },
  ];
  const utilityItems: Array<{ label: string; icon: LucideIcon }> = [
    { label: "画笔编辑", icon: PenTool },
    { label: "裁剪", icon: Crop },
    { label: "下载元素", icon: Download },
    { label: "大图预览", icon: Maximize2 },
  ];
  return (
    <div className="ws-node-top-toolbar nodrag" onClick={(event) => event.stopPropagation()}>
      {toolbarItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <span key={item.label} className="ws-node-tool-item">
            {index === 1 ? <i className="ws-node-tool-divider" /> : null}
            <button type="button" className={`ws-node-tool ${item.accent ? `is-${item.accent}` : ""}`}>
              <Icon size={13} />
              <span>{item.label}</span>
              {item.menu ? <ChevronDown size={10} /> : null}
            </button>
          </span>
        );
      })}
      <i className="ws-node-tool-divider" />
      <span className="ws-node-tool-icons">
        {utilityItems.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.label} type="button" title={item.label}>
              <Icon size={13} />
            </button>
          );
        })}
      </span>
      <i className="ws-node-tool-divider" />
      <button type="button" className="ws-node-agent-join">
        <Users size={11} />
        <span>加入 Agent</span>
      </button>
    </div>
  );
}

function NodeBottomSettings({
  node,
  projectId,
  space,
  loadSpace,
}: {
  node: SpaceCanvasNode;
  projectId: number;
  space: SpaceBootstrap;
  loadSpace: () => Promise<void>;
}) {
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [powerForm, setPowerForm] = useState<any>(null);
  const [powerFormLoading, setPowerFormLoading] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState<number>(0);
  const [paramValues, setParamValues] = useState<Record<string, any>>({});

  // Control node states
  const [conditionText, setConditionText] = useState(() => {
    return String(node.functionOption?.key === "condition" ? (node.defaultParams?.condition || "score > 80") : "");
  });
  const [confirmOperator, setConfirmOperator] = useState(() => {
    return String(node.functionOption?.key === "confirm" ? (node.defaultParams?.operator || "主编") : "");
  });
  const [saveAssetId, setSaveAssetId] = useState("");
  const [mergeLimit, setMergeLimit] = useState(10);

  // File Upload state for agent
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  useEffect(() => {
    if (node.type === "power" && node.power) {
      setPowerFormLoading(true);
      request("/project/project/canvas_power_form", "get", {
        project_id: projectId,
        flow_id: node.flow?.id || 0,
        power_id: node.power.id,
        power_key: node.power.key,
        target_id: 0,
      })
        .then((res) => {
          if (res.code === 0) {
            setPowerForm(res.data);
            setSelectedTargetId(res.data.selected_target_id || 0);
            const defaults: Record<string, any> = {};
            res.data.params?.forEach((p: any) => {
              if (p.default_value) {
                defaults[p.key] = p.default_value;
              }
            });
            setParamValues(defaults);
          }
        })
        .catch((err) => {
          console.error("加载能力参数失败:", err);
        })
        .finally(() => {
          setPowerFormLoading(false);
        });
    }
  }, [node, projectId]);

  const handleRun = async () => {
    setRunning(true);
    try {
      if (node.type === "power" && node.power) {
        const result = await request("/project/run/canvas_power", "post", {
          project_id: projectId,
          flow_id: node.flow?.id || 0,
          node_key: node.id,
          node_name: node.title,
          kind: node.power.kind,
          power_id: node.power.id,
          power_key: node.power.key,
          source_target_id: selectedTargetId,
          input: { prompt },
          params: paramValues,
        });
        if (result.code === 0) {
          toast.success("能力节点执行成功");
          await loadSpace();
        } else {
          toast.error(result.message || "能力节点执行失败");
        }
      } else if (node.type === "agent" && node.role) {
        const result = await request("/project/run/canvas_agent", "post", {
          project_id: projectId,
          flow_id: node.flow?.id || 0,
          node_key: node.id,
          node_name: node.title,
          agent_id: node.role.id,
          input: { prompt },
        });
        if (result.code === 0) {
          toast.success("智能体任务执行成功");
          await loadSpace();
        } else {
          toast.error(result.message || "智能体任务执行失败");
        }
      } else if (node.type === "flow" && node.flow) {
        const result = await request("/project/run/flow", "post", {
          project_id: projectId,
          team_id: space.team.id,
          release_id: space.release.id,
          flow_id: node.flow.id,
          input: { prompt },
        });
        if (result.code === 0) {
          toast.success("流程已启动");
          await loadSpace();
        } else {
          toast.error(result.message || "流程启动失败");
        }
      } else if (node.type === "function") {
        const optionKey = node.functionOption?.key || "";
        if (optionKey === "confirm") {
          const result = await request("/project/run/approval", "post", {
            project_id: projectId,
            approval_id: node.approval?.id || 0,
            decision: "approved",
            comment: "人工确认通过",
          });
          if (result.code === 0) {
            toast.success("确认成功");
            await loadSpace();
          } else {
            toast.error(result.message || "确认失败");
          }
        } else if (optionKey === "save") {
          toast.success("资产已保存");
        } else {
          toast.success("操作已应用");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "执行出错");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="ws-node-bottom-settings nodrag" onClick={(event) => event.stopPropagation()} style={{ zIndex: 999 }}>
      <div className="ws-node-settings-head">
        <div className="ws-node-settings-icon">
          <Plus size={16} />
          <span>配置</span>
        </div>
        <div className="ws-node-settings-copy">
          <div>
            <strong>{node.title}</strong>
            <span>{node.type} / {String(node.kind || node.functionOption?.key || node.subtitle || "default")}</span>
          </div>
          <p>{node.description || "配置该节点的专属参数和控制项。"}</p>
        </div>
      </div>
      <div className="ws-node-settings-line" />
      <div className="ws-node-settings-stack" style={{ gap: "12px" }}>
        {node.type === "asset" && (
          <div className="ws-node-settings-row">
            <div className="ws-node-settings-actions">
              <NodeSettingButton icon={Eye} label="放大预览" accent="green" />
              <NodeSettingButton icon={Compass} label="查看来源" />
              <NodeSettingButton icon={History} label="查看版本" />
              <NodeSettingButton icon={GitBranch} label="查看引用关系" />
              <NodeSettingButton icon={FileSearch} label="查看生成记录" />
            </div>
            <span className="ws-node-settings-state">资产就绪</span>
          </div>
        )}

        {node.type === "power" && (
          <>
            {powerFormLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--ws-muted)", fontSize: "12px", padding: "10px" }}>
                <Loader2 size={14} className="ws-spin" />
                <span>正在加载参数...</span>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "bold", color: "var(--ws-muted)" }}>提示词 *</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="在此处为该能力输入生成提示词或逻辑控制文本..."
                    style={{
                      width: "100%",
                      height: "60px",
                      resize: "none",
                      border: "1px solid var(--ws-card-border)",
                      borderRadius: "10px",
                      background: "var(--ws-card-muted)",
                      color: "var(--ws-toolbar-text)",
                      padding: "8px 10px",
                      font: "inherit",
                      fontSize: "12px",
                      lineHeight: "1.45",
                      outline: "none",
                    }}
                  />
                </div>

                {powerForm?.sources && powerForm.sources.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "11px", color: "var(--ws-muted)", width: "70px", textAlign: "right" }}>模型/来源:</span>
                    <select
                      value={selectedTargetId}
                      onChange={(e) => setSelectedTargetId(Number(e.target.value))}
                      style={{
                        flex: 1,
                        background: "var(--ws-card-muted)",
                        border: "1px solid var(--ws-card-border)",
                        borderRadius: "6px",
                        padding: "4px 8px",
                        color: "var(--ws-toolbar-text)",
                        fontSize: "11px",
                        outline: "none",
                      }}
                    >
                      {powerForm.sources.map((src: any) => (
                        <option key={src.id} value={src.id}>
                          {src.name || src.key}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {powerForm?.params && powerForm.params.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", padding: "4px 0" }}>
                    {powerForm.params.map((param: any) => {
                      const val = paramValues[param.key] ?? param.default_value ?? "";
                      const onChange = (newVal: any) => {
                        setParamValues((prev) => ({ ...prev, [param.key]: newVal }));
                      };

                      return (
                        <div key={param.key} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "11px", color: "var(--ws-muted)", width: "70px", textAlign: "right", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={param.name}>
                            {param.name}:
                          </span>
                          {param.type === "select" ? (
                            <select
                              value={val}
                              onChange={(e) => onChange(e.target.value)}
                              style={{
                                flex: 1,
                                background: "var(--ws-card-muted)",
                                border: "1px solid var(--ws-card-border)",
                                borderRadius: "6px",
                                padding: "4px 8px",
                                color: "var(--ws-toolbar-text)",
                                fontSize: "11px",
                                outline: "none",
                              }}
                            >
                              {param.options?.map((opt: any) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.name || opt.value}
                                </option>
                              ))}
                            </select>
                          ) : param.type === "switch" ? (
                            <input
                              type="checkbox"
                              checked={Boolean(val === "true" || val === true)}
                              onChange={(e) => onChange(e.target.checked)}
                              style={{ cursor: "pointer" }}
                            />
                          ) : param.type === "number" || param.type === "slider" ? (
                            <input
                              type="number"
                              value={val}
                              onChange={(e) => onChange(Number(e.target.value))}
                              style={{
                                flex: 1,
                                background: "var(--ws-card-muted)",
                                border: "1px solid var(--ws-card-border)",
                                borderRadius: "6px",
                                padding: "4px 8px",
                                color: "var(--ws-toolbar-text)",
                                fontSize: "11px",
                                outline: "none",
                              }}
                            />
                          ) : (
                            <input
                              type="text"
                              value={val}
                              onChange={(e) => onChange(e.target.value)}
                              style={{
                                flex: 1,
                                background: "var(--ws-card-muted)",
                                border: "1px solid var(--ws-card-border)",
                                borderRadius: "6px",
                                padding: "4px 8px",
                                color: "var(--ws-toolbar-text)",
                                fontSize: "11px",
                                outline: "none",
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="ws-node-settings-row" style={{ marginTop: "4px" }}>
                  <div className="ws-node-settings-actions">
                    <NodeSettingButton icon={Cpu} label={String(node.power?.name || "AI 能力")} accent="green" />
                  </div>
                  <span className="ws-node-run-cluster">
                    <b>¥ 0.1</b>
                    <button type="button" className="ws-node-run-button" disabled={running} onClick={handleRun} style={{ cursor: "pointer" }}>
                      {running ? <Loader2 size={16} className="ws-spin" /> : <ArrowUp size={16} />}
                    </button>
                  </span>
                </div>
              </>
            )}
          </>
        )}

        {node.type === "agent" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", fontWeight: "bold", color: "var(--ws-muted)" }}>提示词</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="向智能体发送任务指令..."
                style={{
                  width: "100%",
                  height: "52px",
                  resize: "none",
                  border: "1px solid var(--ws-card-border)",
                  borderRadius: "10px",
                  background: "var(--ws-card-muted)",
                  color: "var(--ws-toolbar-text)",
                  padding: "8px 10px",
                  font: "inherit",
                  fontSize: "12px",
                  lineHeight: "1.45",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                style={{ display: "none" }}
              />
              <button
                type="button"
                className="ws-node-setting-button"
                onClick={() => fileInputRef.current?.click()}
                style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                <Download size={12} style={{ transform: "rotate(180deg)" }} />
                <span>{uploadedFile ? uploadedFile.name : "上传文件..."}</span>
              </button>
              {uploadedFile && (
                <button
                  type="button"
                  onClick={() => setUploadedFile(null)}
                  style={{ border: 0, background: "transparent", color: "var(--ws-rose)", cursor: "pointer" }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="ws-node-settings-row">
              <span className="ws-node-settings-state">智能体身份: {node.title || "工作助理"}</span>
              <button type="button" className="ws-node-agent-run" disabled={running} onClick={handleRun} style={{ cursor: "pointer" }}>
                {running ? <Loader2 size={12} className="ws-spin" /> : <ArrowUp size={12} />}
                <span>执行任务</span>
              </button>
            </div>
          </>
        )}

        {node.type === "flow" && (
          <div className="ws-node-settings-row">
            <div className="ws-node-settings-flow-copy">
              <strong>{node.title || "团队流程"}</strong>
              <span>隶属于: {node.flow?.key || "团队流程"} · {node.subtitle || "多步骤流程"}</span>
            </div>
            <div className="ws-node-settings-actions">
              <NodeSettingButton icon={Compass} label="查看内部流程" />
              <button type="button" className="ws-node-flow-run" disabled={running} onClick={handleRun} style={{ cursor: "pointer" }}>
                {running ? <Loader2 size={12} className="ws-spin" /> : <Play size={12} fill="currentColor" />}
                <span>启动该流程</span>
              </button>
            </div>
          </div>
        )}

        {node.type === "function" && (
          <div className="ws-node-settings-row">
            {node.functionOption?.key === "condition" && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                <span style={{ fontSize: "11px", color: "var(--ws-muted)" }}>判断条件:</span>
                <input
                  type="text"
                  value={conditionText}
                  onChange={(e) => setConditionText(e.target.value)}
                  style={{
                    flex: 1,
                    background: "var(--ws-card-muted)",
                    border: "1px solid var(--ws-card-border)",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    color: "var(--ws-toolbar-text)",
                    fontSize: "12px",
                    outline: "none",
                  }}
                />
              </div>
            )}

            {node.functionOption?.key === "confirm" && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                <span style={{ fontSize: "11px", color: "var(--ws-muted)" }}>确认角色:</span>
                <input
                  type="text"
                  value={confirmOperator}
                  onChange={(e) => setConfirmOperator(e.target.value)}
                  style={{
                    flex: 1,
                    background: "var(--ws-card-muted)",
                    border: "1px solid var(--ws-card-border)",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    color: "var(--ws-toolbar-text)",
                    fontSize: "12px",
                    outline: "none",
                  }}
                />
              </div>
            )}

            {node.functionOption?.key === "save" && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                <span style={{ fontSize: "11px", color: "var(--ws-muted)" }}>保存资产ID:</span>
                <input
                  type="text"
                  value={saveAssetId}
                  onChange={(e) => setSaveAssetId(e.target.value)}
                  placeholder="自动绑定"
                  style={{
                    flex: 1,
                    background: "var(--ws-card-muted)",
                    border: "1px solid var(--ws-card-border)",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    color: "var(--ws-toolbar-text)",
                    fontSize: "12px",
                    outline: "none",
                  }}
                />
              </div>
            )}

            {node.functionOption?.key === "context" && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                <span style={{ fontSize: "11px", color: "var(--ws-muted)" }}>最大合并限制:</span>
                <input
                  type="number"
                  value={mergeLimit}
                  onChange={(e) => setMergeLimit(Number(e.target.value))}
                  style={{
                    flex: 1,
                    background: "var(--ws-card-muted)",
                    border: "1px solid var(--ws-card-border)",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    color: "var(--ws-toolbar-text)",
                    fontSize: "12px",
                    outline: "none",
                  }}
                />
              </div>
            )}

            <button type="button" className="ws-node-save-run" disabled={running} onClick={handleRun} style={{ cursor: "pointer", marginLeft: "12px" }}>
              {running ? <Loader2 size={12} className="ws-spin" /> : <Save size={12} />}
              <span>{node.functionOption?.key === "confirm" ? "人工确认" : "保存设置"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function NodeSettingsBody({ node }: { node: SpaceCanvasNode }) {
  if (node.type === "asset") {
    return (
      <div className="ws-node-settings-row">
        <div className="ws-node-settings-actions">
          <NodeSettingButton icon={Eye} label="放大预览" accent="green" />
          <NodeSettingButton icon={Compass} label="查看来源" />
          <NodeSettingButton icon={History} label="查看版本" />
          <NodeSettingButton icon={GitBranch} label="查看引用关系" />
          <NodeSettingButton icon={FileSearch} label="查看生成记录" />
        </div>
        <span className="ws-node-settings-state">资产就绪</span>
      </div>
    );
  }
  if (node.type === "power") {
    return (
      <div className="ws-node-settings-stack">
        <textarea defaultValue="" placeholder="在此处为该能力输入生成提示词或逻辑控制文本..." />
        <div className="ws-node-settings-row">
          <div className="ws-node-settings-actions">
            <NodeSettingButton icon={Cpu} label={String(node.power?.name || "全能大模型G2")} accent="green" menu />
            <NodeSettingButton icon={Tv} label="自适应 / 1k" menu />
            <NodeSettingButton icon={Video} label="摄影机控制" />
          </div>
          <span className="ws-node-run-cluster">
            <b>¥ 0.1</b>
            <button type="button" className="ws-node-run-button">
              <ArrowUp size={16} />
            </button>
          </span>
        </div>
      </div>
    );
  }
  if (node.type === "agent") {
    return (
      <div className="ws-node-settings-stack">
        <textarea defaultValue="" placeholder="向智能体发送任务指令..." />
        <div className="ws-node-settings-row">
          <span className="ws-node-settings-state">智能体身份: {node.title || "小说助理"}</span>
          <button type="button" className="ws-node-agent-run">
            <ArrowUp size={12} />
            <span>执行任务</span>
          </button>
        </div>
      </div>
    );
  }
  if (node.type === "flow") {
    return (
      <div className="ws-node-settings-row">
        <div className="ws-node-settings-flow-copy">
          <strong>{node.title || "团队流程"}</strong>
          <span>隶属于: {node.flow?.key || "团队流程"} · {node.subtitle || "多步骤流程"}</span>
        </div>
        <div className="ws-node-settings-actions">
          <NodeSettingButton icon={Compass} label="查看内部流程" />
          <button type="button" className="ws-node-flow-run">
            <Play size={12} fill="currentColor" />
            <span>启动该流程</span>
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="ws-node-settings-row">
      <div className="ws-node-settings-flow-copy">
        <strong>控制功能操作阀</strong>
        <span>子类型: {node.functionOption?.key || "save"} · 逻辑公式/参数</span>
      </div>
      <button type="button" className="ws-node-save-run">
        <Save size={12} />
        <span>{node.functionOption?.key === "confirm" ? "人工点击确认运行" : "保存绑定正式资产"}</span>
      </button>
    </div>
  );
}

function NodeSettingButton({
  icon: Icon,
  label,
  accent,
  menu,
}: {
  icon: LucideIcon;
  label: string;
  accent?: "green";
  menu?: boolean;
}) {
  return (
    <button type="button" className={`ws-node-setting-button ${accent ? `is-${accent}` : ""}`}>
      <Icon size={12} />
      <span>{label}</span>
      {menu ? <ChevronDown size={11} /> : null}
    </button>
  );
}

function SpaceNodeView({ data, selected }: NodeProps<any>) {
  const node = data as SpaceCanvasNode;

  // 1. circular agent representation
  if (node.type === "agent") {
    const isGenerated = node.status === "已生成" || node.hasResult === true || node.count != null;
    return (
      <div className={`ws-node-agent-wrap ${selected ? "is-selected" : ""}`}>
        <NodeHandle id="input-0" type="target" position={Position.Left} className="is-in" style={{ left: "4px" }} />
        <NodeHandle id="output-0" type="source" position={Position.Right} className="is-out" style={{ right: "4px" }} />
        <div className="ws-node-circle">
          <div className="ws-node-circle-avatar">
            <UserCheck size={20} className="ws-icon-amber" />
          </div>
          <div className="ws-node-circle-title">{node.title}</div>
          <div className="ws-node-circle-status">
            <span className="ws-ping-dot" />
            <span>{node.local ? "本地" : "在线"}</span>
          </div>
        </div>
        {isGenerated ? (
          <div className="ws-agent-result-card" onMouseDown={(e) => e.stopPropagation()}>
            <div className="ws-result-header">
              <Sparkles size={8} />
              <span>智能体结果卡</span>
            </div>
            <p className="ws-result-text">{node.description}</p>
          </div>
        ) : null}
        <NodeSelectionOverlays node={node} selected={selected} />
      </div>
    );
  }

  // 2. SVG Hexagon flow representation
  if (node.type === "flow") {
    return (
      <div className={`ws-node-flow-wrap ${selected ? "is-selected" : ""}`}>
        <svg className="ws-hexagon-svg" viewBox="0 0 100 100" fill="currentColor">
          <polygon
            points="50,4 93,27 93,73 50,96 7,73 7,27"
            stroke={selected ? "var(--ws-blue)" : "var(--ws-border)"}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        <div className="ws-node-flow-content">
          <div className="ws-node-flow-avatar">
            <Workflow size={16} className="ws-icon-blue" />
          </div>
          <div className="ws-node-flow-title">{node.title}</div>
          <div className="ws-node-flow-subtitle">{node.subtitle}</div>
          <div className="ws-node-flow-step">{node.subtitle || "流程"}</div>
        </div>
        <NodeHandle id="input-0" type="target" position={Position.Left} className="is-in" style={{ left: "11px" }} />
        <NodeHandle id="output-0" type="source" position={Position.Right} className="is-out" style={{ right: "11px" }} />
        <NodeSelectionOverlays node={node} selected={selected} />
      </div>
    );
  }

  // 3. SVG Triangle function representation
  if (node.type === "function") {
    const isSave = node.functionOption?.key === "save" || node.title.includes("保存");
    return (
      <div className={`ws-node-function-wrap ${selected ? "is-selected" : ""}`}>
        <svg className="ws-triangle-svg" viewBox="0 0 100 100" fill="currentColor">
          <polygon
            points="50,5 95,90 5,90"
            stroke={selected ? "var(--ws-rose)" : "var(--ws-border)"}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
        <div className="ws-node-function-content">
          <div className="ws-node-function-icon">
            {isSave ? (
              <Save size={16} className="ws-icon-rose" />
            ) : (
              <Layers size={16} className="ws-icon-rose" />
            )}
          </div>
          <div className="ws-node-function-title">{node.title}</div>
        </div>
        <NodeHandle id="input-0" type="target" position={Position.Left} className="is-in" style={{ left: "29px" }} />
        <NodeHandle id="output-0" type="source" position={Position.Right} className="is-out" style={{ right: "29px" }} />
        <NodeSelectionOverlays node={node} selected={selected} />
      </div>
    );
  }

  // 4. Asset representations
  if (node.type === "asset") {
    if (node.kind === "image") {
      const mockImage = "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=600&auto=format&fit=crop";
      return (
        <div className={`ws-node-image-wrap ${selected ? "is-selected" : ""}`}>
          <div className="ws-node-floating-label">
            <ImageIcon size={13} className="ws-icon-green" />
            <span>图片资产</span>
          </div>
          <div className="ws-node-image-container">
            <img src={mockImage} alt={node.title} className="ws-node-image-raw" />
          </div>
          <NodeHandle id="input-0" type="target" position={Position.Left} className="is-in" />
          <NodeHandle id="output-0" type="source" position={Position.Right} className="is-out" />
          <NodeSelectionOverlays node={node} selected={selected} />
        </div>
      );
    }

    if (node.kind === "video") {
      const mockVideoCover = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400&auto=format&fit=crop";
      return (
        <div className={`ws-node-video-wrap ${selected ? "is-selected" : ""}`}>
          <div className="ws-node-floating-label">
            <Video size={13} className="ws-icon-green" />
            <span>视频资产</span>
          </div>
          <div className="ws-node-video-container">
            <img src={mockVideoCover} alt={node.title} className="ws-node-video-raw" />
            <div className="ws-node-video-play">
              <div>
                <Play size={14} fill="currentColor" />
              </div>
            </div>
          </div>
          <NodeHandle id="input-0" type="target" position={Position.Left} className="is-in" />
          <NodeHandle id="output-0" type="source" position={Position.Right} className="is-out" />
          <NodeSelectionOverlays node={node} selected={selected} />
        </div>
      );
    }

    // Default text asset
    return (
      <div className={`ws-node-text-wrap ${selected ? "is-selected" : ""}`}>
        <div className="ws-node-floating-label">
          <Type size={13} className="ws-icon-green" />
          <span>{node.title}</span>
        </div>
        <div className="ws-node-text-card">
          <p className="ws-node-text-content">{node.description}</p>
        </div>
        <NodeHandle id="input-0" type="target" position={Position.Left} className="is-in" />
        <NodeHandle id="output-0" type="source" position={Position.Right} className="is-out" />
        <NodeSelectionOverlays node={node} selected={selected} />
      </div>
    );
  }

  // 5. Power Nodes
  if (node.type === "power") {
    return (
      <div className={`ws-node-power-wrap ${selected ? "is-selected" : ""}`}>
        <div className="ws-node-floating-label">
          <Zap size={13} className="ws-icon-violet" />
          <span>{node.title}</span>
        </div>
        <div className="ws-node-power-card">
          <div className="ws-node-power-header">
            <span className="ws-node-power-badge">AI Core</span>
            <span className="ws-node-power-status">空闲</span>
          </div>
          <p className="ws-node-power-desc">{node.description}</p>
        </div>
        <NodeHandle id="input-0" type="target" position={Position.Left} className="is-in" />
        <NodeHandle id="output-0" type="source" position={Position.Right} className="is-out" />
        <NodeSelectionOverlays node={node} selected={selected} />
      </div>
    );
  }

  // Fallback
  return (
    <div className={`ws-node ${selected ? "is-selected" : ""}`}>
      <NodeHandle id="input-0" type="target" position={Position.Left} className="is-in" />
      <NodeHandle id="output-0" type="source" position={Position.Right} className="is-out" />
      <div className="ws-node-title">{node.title}</div>
      <div className="ws-node-desc">{node.description}</div>
      <NodeSelectionOverlays node={node} selected={selected} />
    </div>
  );
}

function powerIcon(kind: string): LucideIcon {
  if (kind === "image") return ImageIcon;
  if (kind === "video") return Video;
  if (kind === "workflow") return Workflow;
  if (kind === "role") return UserCheck;
  if (kind === "multi") return Sparkles;
  return Brain;
}

function miniMapNodeColor(node: SpaceCanvasNode) {
  if (node.type === "asset") return "#23c483";
  if (node.type === "power") return "#8b5cf6";
  if (node.type === "agent") return "#f59e0b";
  if (node.type === "flow") return "#3b82f6";
  return "#e85d75";
}

function assetIcon(kind: string) {
  if (kind === "image") return <ImageIcon size={14} />;
  if (kind === "video") return <Video size={14} />;
  if (kind === "mixed") return <FileText size={14} />;
  return <FileText size={14} />;
}

function clampMenuPoint(menu: AddNodeMenuState) {
  if (typeof window === "undefined") {
    return { x: menu.x, y: menu.y };
  }
  const width = 266;
  const height = 360;
  return {
    x: Math.min(Math.max(14, menu.x), Math.max(14, window.innerWidth - width)),
    y: Math.min(Math.max(62, menu.y), Math.max(62, window.innerHeight - height)),
  };
}

function readStoredTheme(): WorkSpaceTheme {
  if (typeof window === "undefined") {
    return "light";
  }
  try {
    const homeTheme = window.localStorage.getItem("work-theme");
    if (homeTheme === "dark" || homeTheme === "light") {
      return homeTheme;
    }
    const spaceTheme = window.localStorage.getItem("work-space-theme");
    return spaceTheme === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function persistTheme(theme: WorkSpaceTheme) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem("work-space-theme", theme);
    window.localStorage.setItem("work-theme", theme);
  } catch {
    // localStorage may be unavailable in embedded previews.
  }
}

function runStatusText(value: any, prefix: string) {
  const runId = Number(value?.run_id || 0);
  const requestId = String(value?.request_id || "");
  if (runId > 0) {
    return `${prefix}，运行 ID：${runId}`;
  }
  if (requestId) {
    return `${prefix}，请求：${requestId}`;
  }
  return prefix;
}

function readProjectId() {
  if (typeof window === "undefined") {
    return 0;
  }
  const params = new URLSearchParams(window.location.search);
  return Number(params.get("project_id") || params.get("projectId") || params.get("id") || 0);
}
