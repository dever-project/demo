import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import * as LucideIcons from "lucide-react";
import {
  Background,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
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
  Copy,
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
  Map as MapIcon,
  Maximize2,
  MessageSquare,
  Minus,
  Moon,
  MoreHorizontal,
  MousePointer2,
  Music,
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
  Trash2,
  Type,
  Tv,
  Users,
  UserCheck,
  Upload,
  Video,
  Workflow,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { getCompatModule, request, useNavigate } from "@dever/front-plugin";
import {
  fetchSpaceBootstrap,
  fetchSpacePowerForm,
  fetchSpacePowers,
  completeSpaceUpload,
  initSpaceUpload,
  runSpacePower,
  runSpaceFlow,
  saveSpaceCanvas,
  sendSpaceMessage,
  SPACE_UPLOAD_RULE_ID,
  uploadSpacePart,
} from "./space-api";
import {
  assetCateById,
  assetsForCate,
  createLocalNode,
  defaultAssetCateId,
  documentPreview,
  emptyCanvasState,
  isExecutionRole,
  powerKindLabel,
  relatedFlows,
  visibleAssetCates,
} from "./space-model";
import { WorkSpaceStyles } from "./space-styles";
import type {
  AssetCate,
  CanvasFunctionOption,
  PowerForm,
  PowerKindOption,
  PowerOption,
  PowerParam,
  ProjectAsset,
  SpaceBootstrap,
  SpaceCanvasEdge,
  SpaceCanvasNode,
  SpaceCanvasState,
  TeamFlow,
  TeamRole,
} from "./types";
import { SpaceAnimatedEdge } from "./space-edge";
import {
  type ComposerAssetItem,
  type UploadPreview,
  PromptComposer,
  defaultPowerParamValue,
  isPromptPowerParam,
  isToolbarPowerParam,
  isUploadPowerParam,
} from "./space-prompt-composer";

type PanelMode = "assets" | "create" | "chat" | null;
type WorkSpaceTheme = "dark" | "light";
type RunningNodeState = {
  nodeId: string;
  title: string;
  startedAt: number;
  progress: number;
  status: "running" | "success" | "error";
};
type RunningNodeSetter = Dispatch<SetStateAction<RunningNodeState | null>>;
type NodeResultSetter = (
  nodeId: string,
  patch: Partial<SpaceCanvasNode>,
) => void;
type AddConfiguredNodeHandler = (
  type: SpaceCanvasNode["type"],
  position?: CanvasPoint,
  options?: {
    asset?: ProjectAsset;
    flow?: TeamFlow;
    functionOption?: CanvasFunctionOption;
    power?: PowerOption;
    role?: TeamRole;
    connectToNodeId?: string;
    selectCreated?: boolean;
  },
) => void;
type CanvasPoint = { x: number; y: number };
type GeneratedNodePreview = {
  text: string;
  imageUrl: string;
  videoUrl: string;
  audioUrl: string;
  fileUrl: string;
};
type NodeInputContext = {
  text: string;
  sources: Array<{
    nodeId: string;
    title: string;
    type: SpaceCanvasNode["type"];
    output: unknown;
    preview: GeneratedNodePreview;
  }>;
};
type PendingNodeConnection = {
  nodeId: string;
  handleId?: string | null;
  handleType?: string | null;
};
type NodeFocusRequest = {
  nodeId: string;
  nonce: number;
};
type AddNodeMenuState = {
  x: number;
  y: number;
  position: CanvasPoint;
  view: "types" | "assets" | "powers" | "agents" | "flows" | "functions";
  connection?: PendingNodeConnection;
};

type AddMenuAction = {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  className: string;
};

const functionOptions: CanvasFunctionOption[] = [
  {
    key: "condition",
    label: "条件判断",
    description: "按条件把上游结果分流到不同后续节点。",
  },
  {
    key: "confirm",
    label: "人工确认",
    description: "人工审查、确认或阻断当前节点结果。",
  },
  {
    key: "save",
    label: "保存资产",
    description: "将上游临时结果正式写入作品资产。",
  },
  {
    key: "context",
    label: "合并",
    description: "合并整合多个资产或节点结果作为统一上下文。",
  },
];
const importAction: AddMenuAction = {
  key: "import",
  label: "导入",
  description: "",
  icon: Upload,
  className: "is-power is-import",
};

const uploadComposerParam: PowerParam = {
  id: 0,
  name: "上传",
  key: "files",
  type: "files",
  usage: 2,
  max_files: 6,
};
const agentComposerParams: PowerParam[] = [uploadComposerParam];
const powerFormCache = new Map<string, PowerForm>();

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
  const [canvasStates, setCanvasStates] = useState<
    Record<string, SpaceCanvasState>
  >({});
  const [prompt, setPrompt] = useState("");
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [theme, setTheme] = useState<WorkSpaceTheme>(() => readStoredTheme());
  const [nodeMenu, setNodeMenu] = useState<AddNodeMenuState | null>(null);
  const [powers, setPowers] = useState<PowerOption[]>([]);
  const [powerKinds, setPowerKinds] = useState<PowerKindOption[]>([]);
  const [powersLoading, setPowersLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runningNode, setRunningNode] = useState<RunningNodeState | null>(null);
  const [nodeResultOverrides, setNodeResultOverrides] = useState<
    Record<string, Partial<SpaceCanvasNode>>
  >({});
  const [nodeDetail, setNodeDetail] = useState<SpaceCanvasNode | null>(null);
  const [focusNodeRequest, setFocusNodeRequest] =
    useState<NodeFocusRequest | null>(null);
  const [importPickerSignal, setImportPickerSignal] = useState(0);
  const [error, setError] = useState("");
  const [runStatus, setRunStatus] = useState("");
  const loadedCanvasesRef = useRef<Record<string, string>>({});

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
      setCanvasStates(nextSpace.canvases || {});
      loadedCanvasesRef.current = serializeCanvasMap(nextSpace.canvases || {});
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
  const activeFlows = useMemo(
    () => (space && activeCate ? relatedFlows(space, activeCate.id) : []),
    [activeCate, space],
  );
  const menuAssets = useMemo(() => space?.assets || [], [space]);
  const menuRoles = useMemo(() => {
    if (!space) return [];
    const workerRoles = (space.roles || []).filter(isExecutionRole);
    if (!activeCate) return workerRoles;
    return workerRoles.filter(
      (role) =>
        role.asset_cate_id === 0 || role.asset_cate_id === activeCate.id,
    );
  }, [space, activeCate]);
  const menuFlows = useMemo(
    () => (activeFlows.length > 0 ? activeFlows : space?.flows || []),
    [activeFlows, space],
  );
  const activeCanvas = useMemo(
    () =>
      activeCate
        ? canvasStates[String(activeCate.id)] || emptyCanvasState(activeCate.id)
        : emptyCanvasState(0),
    [activeCate, canvasStates],
  );
  const canvasModel = useMemo(
    () => applyNodeResultOverrides(activeCanvas, nodeResultOverrides),
    [activeCanvas, nodeResultOverrides],
  );

  const updateActiveCanvas = useCallback(
    (updater: (canvas: SpaceCanvasState) => SpaceCanvasState) => {
      if (!activeCate) {
        return;
      }
      setCanvasStates((current) => {
        const key = String(activeCate.id);
        const currentCanvas = current[key] || emptyCanvasState(activeCate.id);
        const nextCanvas = normalizeCanvasForState(
          updater(currentCanvas),
          activeCate.id,
        );
        if (isSameCanvasState(currentCanvas, nextCanvas)) {
          return current;
        }
        return {
          ...current,
          [key]: nextCanvas,
        };
      });
    },
    [activeCate],
  );

  const updateNodeResult = useCallback<NodeResultSetter>(
    (nodeId, patch) => {
      setNodeResultOverrides((current) => ({
        ...current,
        [nodeId]: {
          ...(current[nodeId] || {}),
          ...patch,
        },
      }));
      updateActiveCanvas((canvas) => ({
        ...canvas,
        nodes: canvas.nodes.map((node) =>
          node.id === nodeId ? { ...node, ...patch } : node,
        ),
      }));
    },
    [updateActiveCanvas],
  );

  useEffect(() => {
    if (!space) {
      return;
    }
    const dirtyCanvases = Object.entries(canvasStates).filter(
      ([key, canvas]) =>
        loadedCanvasesRef.current[key] !== stableStringifyCanvas(canvas),
    );
    if (dirtyCanvases.length === 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      for (const [key, canvas] of dirtyCanvases) {
        const submittedCanvasSnapshot = stableStringifyCanvas(canvas);
        void saveSpaceCanvas(space.project.id, canvas.assetCateId, canvas)
          .then((savedCanvas) => {
            const savedCanvasSnapshot = stableStringifyCanvas(savedCanvas);
            loadedCanvasesRef.current[key] = savedCanvasSnapshot;
            setCanvasStates((current) => {
              const currentCanvas = current[key];
              if (
                !currentCanvas ||
                stableStringifyCanvas(currentCanvas) !== submittedCanvasSnapshot
              ) {
                return current;
              }
              if (submittedCanvasSnapshot === savedCanvasSnapshot) {
                return current;
              }
              return {
                ...current,
                [key]: savedCanvas,
              };
            });
          })
          .catch((err) => {
            toast.error(err instanceof Error ? err.message : "保存画布失败");
          });
      }
    }, 520);
    return () => window.clearTimeout(timer);
  }, [canvasStates, space]);

  function switchCate(cateId: number) {
    setActiveCateId(cateId);
    setSelectedNodeId("");
    setFocusNodeRequest(null);
    setPanelMode(null);
    setNodeMenu(null);
    setRunStatus("");
  }

  function focusCanvasNode(nodeId: string) {
    setFocusNodeRequest((current) => ({
      nodeId,
      nonce: (current?.nonce || 0) + 1,
    }));
  }
  const consumeFocusNodeRequest = useCallback((request: NodeFocusRequest) => {
    setFocusNodeRequest((current) => {
      if (
        !current ||
        current.nodeId !== request.nodeId ||
        current.nonce !== request.nonce
      ) {
        return current;
      }
      return null;
    });
  }, []);

  function addConfiguredNode(
    type: SpaceCanvasNode["type"],
    position?: CanvasPoint,
    options?: {
      asset?: ProjectAsset;
      flow?: TeamFlow;
      functionOption?: CanvasFunctionOption;
      power?: PowerOption;
      role?: TeamRole;
      connectToNodeId?: string;
      selectCreated?: boolean;
    },
  ) {
    if (!activeCate) {
      return;
    }
    const node = createLocalNode(
      type,
      activeCate,
      activeCanvas.nodes.length,
      position,
      options,
    );
    const connection = nodeMenu?.connection;
    updateActiveCanvas((canvas) => {
      let edges = canvas.edges;
      if (connection) {
        const endpoints = connectedNodeEdgeEndpoints(connection, node.id);
        edges = appendCanvasEdge(edges, endpoints.source, endpoints.target);
      } else if (options?.connectToNodeId) {
        edges = appendCanvasEdge(edges, node.id, options.connectToNodeId || "");
      }
      return {
        ...canvas,
        nodes: [...canvas.nodes, node],
        edges,
      };
    });
    if (options?.selectCreated !== false) {
      setSelectedNodeId(node.id);
      focusCanvasNode(node.id);
    }
    setPanelMode(null);
    setNodeMenu(null);
  }

  function copyCanvasNode(node: SpaceCanvasNode, position?: CanvasPoint) {
    if (!activeCate) {
      return;
    }
    const clone = cloneCanvasNode(
      node,
      activeCate.id,
      activeCanvas.nodes.length,
      position,
    );
    updateActiveCanvas((canvas) => ({
      ...canvas,
      nodes: [...canvas.nodes, clone],
    }));
    setNodeResultOverrides((current) => {
      const patch = current[node.id];
      return patch ? { ...current, [clone.id]: patch } : current;
    });
    setSelectedNodeId(clone.id);
    focusCanvasNode(clone.id);
    setNodeMenu(null);
    toast.success("已复制节点");
  }

  function deleteCanvasNode(node: SpaceCanvasNode) {
    updateActiveCanvas((canvas) => ({
      ...canvas,
      nodes: canvas.nodes.filter((item) => item.id !== node.id),
      edges: canvas.edges.filter(
        (edge) => edge.from !== node.id && edge.to !== node.id,
      ),
    }));
    setNodeResultOverrides((current) => {
      if (!Object.prototype.hasOwnProperty.call(current, node.id)) {
        return current;
      }
      const next = { ...current };
      delete next[node.id];
      return next;
    });
    setSelectedNodeId("");
    setFocusNodeRequest((current) =>
      current?.nodeId === node.id ? null : current,
    );
    setNodeDetail((current) => (current?.id === node.id ? null : current));
    toast.success("已删除节点");
  }

  function addAssetNode(asset: ProjectAsset, position?: CanvasPoint) {
    addConfiguredNode("asset", position, { asset });
  }

  function addPowerNode(power: PowerOption, position?: CanvasPoint) {
    addConfiguredNode("power", position, { power });
  }

  function openImportPicker() {
    setNodeMenu(null);
    setPanelMode(null);
    setImportPickerSignal((current) => current + 1);
  }

  async function uploadLocalFiles(
    files: File[],
    param: PowerParam,
  ): Promise<UploadPreview[]> {
    return uploadSpaceFiles(
      projectId,
      files,
      param.upload_rule_id || SPACE_UPLOAD_RULE_ID,
    );
  }

  function addAgentNode(role: TeamRole, position?: CanvasPoint) {
    addConfiguredNode("agent", position, { role });
  }

  function addFlowNode(flow: TeamFlow, position?: CanvasPoint) {
    addConfiguredNode("flow", position, { flow });
  }

  function addFunctionNode(
    functionOption: CanvasFunctionOption,
    position?: CanvasPoint,
  ) {
    addConfiguredNode("function", position, { functionOption });
  }

  function openNodeMenu(
    screen: CanvasPoint,
    position: CanvasPoint,
    connection?: PendingNodeConnection,
  ) {
    setPanelMode(null);
    setNodeMenu({
      x: screen.x,
      y: screen.y,
      position,
      view: "types",
      connection,
    });
    void loadPowerCatalog();
  }

  function openDockNodeMenu() {
    openNodeMenu(
      { x: 92, y: 122 },
      defaultNodePosition(activeCanvas.nodes.length),
    );
  }

  function openNodeTypePicker(
    type: SpaceCanvasNode["type"],
    screen?: CanvasPoint,
    position?: CanvasPoint,
  ) {
    const menuScreen = screen || { x: 112, y: 122 };
    const menuPosition =
      position || defaultNodePosition(activeCanvas.nodes.length);
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
    setNodeMenu((current: AddNodeMenuState | null) =>
      current ? { ...current, view: "powers" as const } : current,
    );
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
    setNodeMenu((current: AddNodeMenuState | null) =>
      current ? { ...current, view: nodeMenuViewForType(type) } : current,
    );
  }

  async function submitMessage() {
    if (!space || !activeCate || !prompt.trim()) {
      return;
    }
    setRunning(true);
    setRunStatus("");
    try {
      const result = await sendSpaceMessage(
        space.project.id,
        activeCate.id,
        prompt.trim(),
      );
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
      const result = await runSpaceFlow(
        space.project.id,
        activeCate.id,
        flow,
        prompt.trim(),
      );
      setRunStatus(
        runStatusText(result, `已运行流程：${flow.name || "团队流程"}`),
      );
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
        nodes={canvasModel.nodes}
        edges={canvasModel.edges}
        viewport={activeCanvas.viewport}
        selectedNodeId={selectedNodeId}
        onSelectNode={(nodeId) => {
          setSelectedNodeId(nodeId);
          setNodeMenu(null);
        }}
        onOpenNodeMenu={openNodeMenu}
        onAddConfiguredNode={addConfiguredNode}
        onCopyNode={copyCanvasNode}
        onDeleteNode={deleteCanvasNode}
        onShowNodeDetail={setNodeDetail}
        onNodesCommit={(nodes) =>
          updateActiveCanvas((canvas) => ({ ...canvas, nodes }))
        }
        onEdgesCommit={(edges) =>
          updateActiveCanvas((canvas) => ({ ...canvas, edges }))
        }
        onViewportCommit={(viewport) =>
          updateActiveCanvas((canvas) => {
            if (canvas.nodes.length === 0 && canvas.edges.length === 0) {
              return canvas;
            }
            return { ...canvas, viewport };
          })
        }
        focusNodeRequest={focusNodeRequest}
        onFocusNodeRequestConsumed={consumeFocusNodeRequest}
        projectId={projectId}
        space={space}
        runningNode={runningNode}
        setRunningNode={setRunningNode}
        onNodeResult={updateNodeResult}
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

      <LeftCanvasDock panelMode={panelMode} onOpenPanel={setPanelMode} />

      <button
        type="button"
        className="ws-assistant-ball"
        onClick={() => setPanelMode(panelMode === "chat" ? null : "chat")}
        aria-label="沟通角色"
      >
        <MessageSquare size={22} />
      </button>

      <div className="ws-import-composer-host" aria-hidden="true">
        <PromptComposer
          value=""
          placeholder=""
          openAssetPickerSignal={importPickerSignal}
          params={agentComposerParams}
          assetLibrary={buildComposerAssetLibrary(space, null)}
          onChange={() => undefined}
          onParamChange={() => undefined}
          onAssetReference={(asset) => {
            if (asset.source === "asset" && asset.asset) {
              addAssetNode(asset.asset as ProjectAsset);
            }
          }}
          onLocalUpload={uploadLocalFiles}
          onSubmit={() => undefined}
        />
      </div>

      {panelMode === "assets" ? (
        <AssetWorkspacePanel
          space={space}
          activeCate={activeCate}
          onClose={() => setPanelMode(null)}
        />
      ) : null}

      {panelMode === "create" ? (
        <CreationWorkspacePanel
          flows={activeFlows}
          running={running}
          onClose={() => setPanelMode(null)}
          onOpenCanvasMenu={openDockNodeMenu}
          onRunFlow={executeFlow}
        />
      ) : null}

      {panelMode === "chat" ? (
        <CommunicationWorkspacePanel
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
          onBack={() =>
            setNodeMenu((current: AddNodeMenuState | null) =>
              current ? { ...current, view: "types" as const } : current,
            )
          }
          onImport={openImportPicker}
          onSelectAsset={(asset) => addAssetNode(asset, nodeMenu.position)}
          onSelectFlow={(flow) => addFlowNode(flow, nodeMenu.position)}
          onSelectFunction={(functionOption) =>
            addFunctionNode(functionOption, nodeMenu.position)
          }
          onSelect={selectMenuNodeType}
          onSelectRole={(role) => addAgentNode(role, nodeMenu.position)}
          onSelectPower={(power) => addPowerNode(power, nodeMenu.position)}
        />
      ) : null}

      {nodeDetail ? (
        <NodeDetailDialog
          node={nodeDetail}
          onClose={() => setNodeDetail(null)}
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
  const activeIndex = Math.max(
    0,
    cates.findIndex((cate) => cate.id === activeCate.id),
  );
  return (
    <header className="ws-topbar">
      <div className="ws-top-left">
        <button
          type="button"
          className="ws-back"
          onClick={onBack}
          aria-label="返回工作台"
        >
          <ArrowLeft size={17} />
        </button>
        <div className="ws-project-meta">
          <div className="ws-project-title">{space.project.name}</div>
          <div className="ws-project-subtitle">
            <span>
              {space.team.name || space.project.team?.name || "自由团队"}
            </span>
            {space.release.version ? (
              <span>v{space.release.version}</span>
            ) : null}
          </div>
        </div>
      </div>

      <nav
        className="ws-cate-strip"
        aria-label="资产分类"
        style={
          {
            "--ws-cate-total": Math.max(cates.length, 1),
            "--ws-cate-active": activeIndex,
          } as CSSProperties
        }
      >
        <span className="ws-cate-indicator" />
        {cates.map((cate) => (
          <button
            key={cate.id}
            type="button"
            className={`ws-cate ${cate.id === activeCate.id ? "is-active" : ""}`}
            onClick={() => onSelectCate(cate.id)}
          >
            <span className="ws-cate-name">{cate.name}</span>
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
  onImport,
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
  onImport: () => void;
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

  const powerItems = [importAction, ...safePowers];
  if (powerItems.length > 0) {
    visibleSections.push(
      renderAddMenuSection({
        sectionKey: "powers",
        title: "能力",
        items: powerItems,
        itemKey: (item) =>
          isAddMenuAction(item) ? item.key : String(item.key || item.id),
        itemClassName: (item) =>
          isAddMenuAction(item) ? item.className : "is-power",
        label: (item) => (isAddMenuAction(item) ? item.label : item.name),
        description: (item) => (isAddMenuAction(item) ? item.description : ""),
        icon: (item) => {
          if (isAddMenuAction(item)) {
            const Icon = item.icon;
            return <Icon size={16} />;
          }
          return <PowerIcon power={item} size={16} />;
        },
        onSelect: (item) => {
          if (isAddMenuAction(item)) {
            onImport();
            return;
          }
          onSelectPower(item);
        },
      }),
    );
  }

  if (safeRoles.length > 0) {
    visibleSections.push(
      renderAddMenuSection({
        sectionKey: "roles",
        title: "智能体",
        items: safeRoles,
        itemKey: (role) => String(role.id || role.role_key || role.name),
        itemClassName: "is-agent",
        label: (role) => role.name,
        icon: () => <UserCheck size={16} />,
        onSelect: onSelectRole,
      }),
    );
  }

  if (safeFlows.length > 0) {
    visibleSections.push(
      renderAddMenuSection({
        sectionKey: "flows",
        title: "流程",
        items: safeFlows,
        itemKey: (flow) => String(flow.id || flow.key || flow.name),
        itemClassName: "is-flow",
        label: (flow) => flow.name,
        icon: () => <Workflow size={16} />,
        onSelect: onSelectFlow,
      }),
    );
  }

  if (functionOptions && functionOptions.length > 0) {
    visibleSections.push(
      renderAddMenuSection({
        sectionKey: "functions",
        title: "控制",
        items: functionOptions,
        itemKey: (option) => option.key,
        itemClassName: "is-function",
        label: (option) => option.label,
        icon: (option) => {
          const Icon = functionIcon(option.key);
          return <Icon size={16} />;
        },
        onSelect: onSelectFunction,
      }),
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
        style={{ left: point.x, top: point.y, maxHeight: point.maxHeight }}
        onMouseDown={(event: any) => event.stopPropagation()}
      >
        <div className="ws-add-menu-head">
          <strong>{menu.connection ? "引用该节点生成" : "添加节点"}</strong>
        </div>
        <div className="ws-add-menu-body">
          {visibleSections.map((sec, index) => (
            <div key={index}>
              {sec}
              {index < visibleSections.length - 1 && (
                <div className="ws-add-divider" />
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function renderAddMenuSection<T>({
  sectionKey,
  title,
  items,
  itemKey,
  itemClassName,
  listClassName = "",
  label,
  description,
  icon,
  onSelect,
}: {
  sectionKey: string;
  title: string;
  items: T[];
  itemKey: (item: T) => string;
  itemClassName: string | ((item: T) => string);
  listClassName?: string;
  label: (item: T) => string;
  description?: (item: T) => string;
  icon: (item: T) => ReactNode;
  onSelect: (item: T) => void;
}) {
  return (
    <div key={sectionKey} className="ws-add-section">
      <div className="ws-add-section-title">{title}</div>
      <div className={`ws-add-menu-list ${listClassName}`.trim()}>
        {items.map((item) => {
          const itemDescription = description?.(item) || "";
          const extraClassName =
            typeof itemClassName === "function"
              ? itemClassName(item)
              : itemClassName;
          return (
            <button
              key={itemKey(item)}
              type="button"
              className={`ws-add-item ${extraClassName}`.trim()}
              title={itemDescription || label(item)}
              onClick={() => onSelect(item)}
            >
              <span className="ws-add-icon">{icon(item)}</span>
              <span className="ws-add-copy">
                <span className="ws-add-label">{label(item)}</span>
                {itemDescription ? (
                  <span className="ws-add-desc">{itemDescription}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function isAddMenuAction(
  item: PowerOption | AddMenuAction,
): item is AddMenuAction {
  return "className" in item;
}

function LeftCanvasDock({
  panelMode,
  onOpenPanel,
}: {
  panelMode: PanelMode;
  onOpenPanel: (mode: PanelMode) => void;
}) {
  return (
    <aside className="ws-dock ws-glass-panel" aria-label="画布工具">
      <DockButton
        active={panelMode === "assets"}
        icon={Folder}
        label="资产"
        onClick={() => onOpenPanel(panelMode === "assets" ? null : "assets")}
      />
      <DockButton
        active={panelMode === "create"}
        icon={PenTool}
        label="创作"
        onClick={() => onOpenPanel(panelMode === "create" ? null : "create")}
      />
      <DockButton
        active={panelMode === "chat"}
        icon={MessageSquare}
        label="沟通"
        onClick={() => onOpenPanel(panelMode === "chat" ? null : "chat")}
      />
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
    <button
      type="button"
      className={`ws-dock-button ${active ? "is-active" : ""}`}
      onClick={onClick}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}

function AssetWorkspacePanel({
  space,
  activeCate,
  onClose,
}: {
  space: SpaceBootstrap;
  activeCate: AssetCate;
  onClose: () => void;
}) {
  const assets = assetsForCate(space, activeCate.id);
  const showList = activeCate.cardinality !== "single" || assets.length > 1;
  const [selectedAssetId, setSelectedAssetId] = useState(assets[0]?.id || 0);
  const selectedAsset =
    assets.find((asset) => asset.id === selectedAssetId) || assets[0] || null;

  useEffect(() => {
    setSelectedAssetId(assets[0]?.id || 0);
  }, [activeCate.id, assets[0]?.id]);

  return (
    <WorkspaceOverlay onClose={onClose} className="ws-asset-workspace">
      <section
        className={`ws-asset-editor-shell ${showList ? "has-list" : "is-single"}`}
      >
        {showList ? (
          <aside className="ws-asset-list-pane">
            <div className="ws-asset-list-title">{activeCate.name}</div>
            <div className="ws-asset-list custom-scrollbar">
              {assets.length > 0 ? (
                assets.map((asset, index) => (
                  <button
                    key={asset.id}
                    type="button"
                    className={`ws-asset-list-item ${asset.id === selectedAsset?.id ? "is-active" : ""}`}
                    onClick={() => setSelectedAssetId(asset.id)}
                  >
                    <span>
                      {asset.name || `${activeCate.name} ${index + 1}`}
                    </span>
                    <small>{asset.created_at || "未保存时间"}</small>
                  </button>
                ))
              ) : (
                <div className="ws-asset-list-empty">暂无资产</div>
              )}
            </div>
          </aside>
        ) : null}
        <AssetEditorSurface activeCate={activeCate} asset={selectedAsset} />
      </section>
    </WorkspaceOverlay>
  );
}

function CreationWorkspacePanel({
  flows,
  running,
  onClose,
  onOpenCanvasMenu,
  onRunFlow,
}: {
  flows: TeamFlow[];
  running: boolean;
  onClose: () => void;
  onOpenCanvasMenu: () => void;
  onRunFlow: (flow: TeamFlow) => void;
}) {
  return (
    <WorkspaceOverlay onClose={onClose} className="ws-create-workspace">
      <section className="ws-create-card">
        <button
          type="button"
          className="ws-create-option is-canvas"
          onClick={() => {
            onClose();
            onOpenCanvasMenu();
          }}
        >
          <span>自由画布</span>
          <small>添加资产、能力、控制节点并自由连线。</small>
        </button>
        <div className="ws-create-flow-list custom-scrollbar">
          <div className="ws-create-section-title">流程列表</div>
          {flows.length > 0 ? (
            flows.map((flow) => (
              <button
                key={flow.id}
                type="button"
                className="ws-create-flow-item"
                disabled={running}
                onClick={() => onRunFlow(flow)}
              >
                <span>{flow.name || "未命名流程"}</span>
                <small>{flow.goal || "运行团队预设流程"}</small>
              </button>
            ))
          ) : (
            <div className="ws-create-empty">暂无流程</div>
          )}
        </div>
      </section>
    </WorkspaceOverlay>
  );
}

function CommunicationWorkspacePanel({
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
    <WorkspaceOverlay onClose={onClose} className="ws-communication-workspace">
      <section className="ws-chat-stage">
        <div className="ws-chat-thread">
          <div className="ws-chat-message is-assistant">
            <div className="ws-chat-avatar">AI</div>
            <div>
              <strong>创作助手</strong>
              <p>可以直接说你想怎么处理{activeCate.name}。</p>
            </div>
          </div>
          {prompt.trim() ? (
            <div className="ws-chat-message is-user">
              <p>{prompt}</p>
            </div>
          ) : null}
          {runStatus ? <div className="ws-run-status">{runStatus}</div> : null}
        </div>
        <div className="ws-chat-composer">
          <textarea
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            placeholder="可以向我提问或布置创作任务，输入 @ 使用资产"
          />
          <div className="ws-chat-composer-actions">
            <button type="button">Agent</button>
            <button type="button">+</button>
            <button
              type="button"
              className="is-send"
              disabled={running || !prompt.trim()}
              onClick={onSubmitMessage}
              aria-label="发送"
            >
              {running ? <Loader2 size={16} /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </section>
    </WorkspaceOverlay>
  );
}

function WorkspaceOverlay({
  onClose,
  className,
  children,
}: {
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`ws-workspace-overlay ${className || ""}`.trim()}>
      <button
        type="button"
        className="ws-workspace-close"
        onClick={onClose}
        aria-label="关闭"
      >
        <X size={18} />
      </button>
      {children}
    </div>
  );
}

function AssetEditorSurface({
  activeCate,
  asset,
}: {
  activeCate: AssetCate;
  asset: ProjectAsset | null;
}) {
  const content = assetContentText(asset);
  return (
    <article className="ws-asset-editor">
      <header className="ws-asset-editor-head">
        <span>{activeCate.name}</span>
        <strong>{asset?.name || activeCate.name}</strong>
      </header>
      <textarea
        value={content}
        readOnly
        placeholder={`暂无${activeCate.name}内容`}
      />
    </article>
  );
}

function assetContentText(asset: ProjectAsset | null) {
  if (!asset) {
    return "";
  }
  const content = asset.version?.content;
  if (typeof content === "string") {
    return content;
  }
  if (content && typeof content === "object") {
    const record = content as Record<string, unknown>;
    for (const key of ["text", "content", "body", "markdown", "value"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) {
        return value;
      }
    }
  }
  return documentPreview(content);
}

function CanvasWorkbench({
  activeCate,
  nodes,
  edges,
  viewport,
  selectedNodeId,
  onSelectNode,
  onOpenNodeMenu,
  onAddConfiguredNode,
  onCopyNode,
  onDeleteNode,
  onShowNodeDetail,
  onNodesCommit,
  onEdgesCommit,
  onViewportCommit,
  focusNodeRequest,
  onFocusNodeRequestConsumed,
  projectId,
  space,
  runningNode,
  setRunningNode,
  onNodeResult,
}: {
  activeCate: AssetCate;
  nodes: SpaceCanvasNode[];
  edges: { id: string; from: string; to: string }[];
  viewport: SpaceCanvasState["viewport"];
  selectedNodeId: string;
  onSelectNode: (id: string) => void;
  onOpenNodeMenu: (
    screen: CanvasPoint,
    position: CanvasPoint,
    connection?: PendingNodeConnection,
  ) => void;
  onAddConfiguredNode?: AddConfiguredNodeHandler;
  onCopyNode: (node: SpaceCanvasNode, position?: CanvasPoint) => void;
  onDeleteNode: (node: SpaceCanvasNode) => void;
  onShowNodeDetail: (node: SpaceCanvasNode) => void;
  onNodesCommit: (nodes: SpaceCanvasNode[]) => void;
  onEdgesCommit: (edges: SpaceCanvasEdge[]) => void;
  onViewportCommit: (viewport: SpaceCanvasState["viewport"]) => void;
  focusNodeRequest: NodeFocusRequest | null;
  onFocusNodeRequestConsumed: (request: NodeFocusRequest) => void;
  projectId: number;
  space: SpaceBootstrap;
  runningNode: RunningNodeState | null;
  setRunningNode: RunningNodeSetter;
  onNodeResult: NodeResultSetter;
}) {
  const [flowInstance, setFlowInstance] = useState<FlowViewport | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState("");
  const [draggingNodeId, setDraggingNodeId] = useState("");
  const [proximityEdge, setProximityEdge] = useState<Edge | null>(null);
  const [nodeActionMenu, setNodeActionMenu] = useState<{
    nodeId: string;
    x: number;
    y: number;
  } | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState("");
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [viewportZoom, setViewportZoom] = useState(1);
  const flowNodeCache = useRef<Map<string, Node>>(new Map());
  const pendingConnectionRef = useRef<PendingNodeConnection | null>(null);
  const connectionCompletedRef = useRef(false);
  const skipNextPaneClickRef = useRef(false);
  const skipNextNodeClickRef = useRef(false);
  const fitKey = useMemo(() => {
    if (nodes.length === 0) {
      return "";
    }
    return `${activeCate.id}:${nodes.map((node) => node.id).join("|")}`;
  }, [activeCate.id, nodes]);

  const flowNodes = useMemo<Node[]>(() => {
    const activeIds = new Set<string>();
    const contextEdges = edges.map((edge) => ({
      source: edge.from,
      target: edge.to,
    }));
    const nextNodes = nodes.map((node) => {
      activeIds.add(node.id);
      const position = { x: node.x, y: node.y };
      const selected = node.id === selectedNodeId;

      const nodeData = {
        ...node,
        projectId,
        space,
        runningNode: runningNode?.nodeId === node.id ? runningNode : null,
        setRunningNode,
        onAddConfiguredNode,
        onNodeResult,
        onShowNodeDetail,
        viewportZoom,
        inputContext: buildNodeInputContext(node.id, nodes, contextEdges),
      };

      const cached = flowNodeCache.current.get(node.id);
      const cachedStyle = cached?.style as CSSProperties | undefined;
      if (
        cached &&
        cached.position.x === position.x &&
        cached.position.y === position.y &&
        cached.data === nodeData &&
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
        data: nodeData,
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
  }, [
    edges,
    nodes,
    onAddConfiguredNode,
    onNodeResult,
    onShowNodeDetail,
    projectId,
    runningNode,
    selectedNodeId,
    setRunningNode,
    space,
    viewportZoom,
  ]);

  const deleteEdge = useCallback(
    (edgeId: string) => {
      setSelectedEdgeId("");
      onEdgesCommit(edges.filter((edge) => edge.id !== edgeId));
    },
    [edges, onEdgesCommit],
  );

  const flowEdges = useMemo<Edge[]>(() => {
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    return edges
      .filter((edge) => nodeMap.has(edge.from) && nodeMap.has(edge.to))
      .map((edge) => ({
        id: edge.id,
        source: edge.from,
        sourceHandle: "output-0",
        target: edge.to,
        targetHandle: "input-0",
        type: "animated",
        animated: false,
      }))
      .map((edge) =>
        decorateFlowEdge(
          edge,
          nodeMap,
          hoveredNodeId,
          selectedNodeId,
          selectedEdgeId,
          deleteEdge,
        ),
      );
  }, [deleteEdge, edges, hoveredNodeId, nodes, selectedEdgeId, selectedNodeId]);

  const renderedEdges = useMemo(
    () => (proximityEdge ? [...flowEdges, proximityEdge] : flowEdges),
    [flowEdges, proximityEdge],
  );

  useEffect(() => {
    if (
      !flowInstance ||
      !fitKey ||
      focusNodeRequest ||
      viewport.zoom != null ||
      typeof window === "undefined"
    ) {
      return;
    }
    const timer = setTimeout(() => {
      flowInstance.fitView?.({ padding: 0.32, duration: 250, maxZoom: 0.72 });
    }, 150);
    return () => clearTimeout(timer);
  }, [fitKey, flowInstance, focusNodeRequest, viewport.zoom]);

  useEffect(() => {
    if (!flowInstance || !focusNodeRequest || typeof window === "undefined") {
      return;
    }
    const node = nodes.find((item) => item.id === focusNodeRequest.nodeId);
    if (!node) {
      onFocusNodeRequestConsumed(focusNodeRequest);
      return;
    }
    const timer = window.setTimeout(() => {
      const position = { x: node.x, y: node.y };
      const nextZoom = node.type === "power" ? 1.02 : 0.96;
      flowInstance.setCenter?.(
        position.x + (node.width || 180) / 2,
        position.y + (node.height || 180) / 2,
        { zoom: nextZoom, duration: 320 },
      );
      setViewportZoom(nextZoom);
      onFocusNodeRequestConsumed(focusNodeRequest);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [flowInstance, focusNodeRequest, nodes, onFocusNodeRequestConsumed]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const nextNodes = applyNodeChanges(changes, flowNodes);
      const positionsById = new Map(
        nextNodes.map((node) => [node.id, node.position]),
      );
      onNodesCommit(
        nodes.map((node) => {
          const position = positionsById.get(node.id);
          if (!position || (node.x === position.x && node.y === position.y)) {
            return node;
          }
          return {
            ...node,
            x: position.x,
            y: position.y,
          };
        }),
      );

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
    [flowNodes, nodes, onNodesCommit, onSelectNode],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      let nextSelectedEdgeId = "";
      let hasSelectionChange = false;
      for (const change of changes) {
        if (change.type === "select") {
          hasSelectionChange = true;
          if (change.selected) {
            nextSelectedEdgeId = change.id;
          }
        }
      }
      if (hasSelectionChange) {
        setSelectedEdgeId(nextSelectedEdgeId);
      }
      const nextEdges = applyEdgeChanges(changes, flowEdges);
      onEdgesCommit(flowEdgesToCanvasEdges(nextEdges));
    },
    [flowEdges, onEdgesCommit],
  );

  const handleConnect = useCallback<OnConnect>(
    (connection) => {
      connectionCompletedRef.current = true;
      if (
        !connection.source ||
        !connection.target ||
        connection.source === connection.target
      ) {
        return;
      }
      onEdgesCommit(
        appendCanvasEdge(
          edges,
          connection.source || "",
          connection.target || "",
        ),
      );
    },
    [edges, onEdgesCommit],
  );

  const handleConnectStart = useCallback(
    (_event: unknown, params: any) => {
      const nodeId = String(params?.nodeId || "");
      if (nodeId) {
        skipNextNodeClickRef.current = true;
        onSelectNode("");
        setNodeActionMenu(null);
      }
      pendingConnectionRef.current = nodeId
        ? {
            nodeId,
            handleId: params?.handleId || null,
            handleType: params?.handleType || null,
          }
        : null;
      connectionCompletedRef.current = false;
      setSelectedEdgeId("");
    },
    [onSelectNode],
  );

  const handleConnectEnd = useCallback(
    (event: any) => {
      const pendingConnection = pendingConnectionRef.current;
      pendingConnectionRef.current = null;
      if (pendingConnection?.nodeId && typeof window !== "undefined") {
        window.setTimeout(() => {
          skipNextNodeClickRef.current = false;
        }, 0);
      }
      if (connectionCompletedRef.current) {
        connectionCompletedRef.current = false;
        return;
      }
      if (!pendingConnection?.nodeId) {
        return;
      }
      const screen = pointerFromConnectEndEvent(event);
      if (!screen) {
        return;
      }
      skipNextPaneClickRef.current = true;
      onOpenNodeMenu(
        screen,
        flowPositionFromScreen(flowInstance, screen),
        pendingConnection,
      );
    },
    [flowInstance, onOpenNodeMenu],
  );

  const handleEdgeClick = useCallback(
    (event: ReactMouseEvent | MouseEvent, edge: Edge) => {
      event.preventDefault();
      event.stopPropagation();
      setNodeActionMenu(null);
      onSelectNode("");
      setSelectedEdgeId(edge.id);
    },
    [onSelectNode],
  );

  useEffect(() => {
    if (!selectedEdgeId || typeof window === "undefined") {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }
      if (isEditableEventTarget(event.target)) {
        return;
      }
      event.preventDefault();
      deleteEdge(selectedEdgeId);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteEdge, selectedEdgeId]);

  const updateProximityEdge = useCallback((nextEdge: Edge | null) => {
    setProximityEdge((current: Edge | null) =>
      isSamePreviewEdge(current, nextEdge) ? current : nextEdge,
    );
  }, []);

  const checkValidConnection = useCallback(
    (connection: any) => {
      const sourceNode = nodes.find(
        (n: SpaceCanvasNode) => n.id === connection.source,
      );
      const targetNode = nodes.find(
        (n: SpaceCanvasNode) => n.id === connection.target,
      );
      return canConnectNodes(sourceNode, targetNode);
    },
    [nodes],
  );

  const handleNodeDrag = useCallback(
    (_event: ReactMouseEvent | MouseEvent, draggedNode: Node) => {
      const hasConnections = flowEdges.some(
        (edge) =>
          edge.source === draggedNode.id || edge.target === draggedNode.id,
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
      const connection = resolveProximityConnection(
        sourceNode,
        closest.domainNode,
      );
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
      (edge) =>
        edge.source === proximityEdge.source &&
        edge.target === proximityEdge.target,
    );
    if (!exists) {
      onEdgesCommit(
        appendCanvasEdge(edges, proximityEdge.source, proximityEdge.target),
      );
    }
    updateProximityEdge(null);
  }, [edges, flowEdges, onEdgesCommit, proximityEdge, updateProximityEdge]);

  const handlePaneClick = useCallback(
    (event: ReactMouseEvent | MouseEvent) => {
      if (skipNextPaneClickRef.current) {
        skipNextPaneClickRef.current = false;
        return;
      }
      onSelectNode("");
      setSelectedEdgeId("");
      setNodeActionMenu(null);
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

  const handleNodeContextMenu = useCallback(
    (event: ReactMouseEvent | MouseEvent, node: Node) => {
      event.preventDefault();
      event.stopPropagation();
      setSelectedEdgeId("");
      onSelectNode(node.id);
      setNodeActionMenu({
        nodeId: node.id,
        x: event.clientX,
        y: event.clientY,
      });
    },
    [onSelectNode],
  );

  const actionNode = nodeActionMenu
    ? nodes.find((node) => node.id === nodeActionMenu.nodeId) || null
    : null;
  const actionNodePosition = actionNode
    ? { x: actionNode.x, y: actionNode.y }
    : undefined;

  function closeNodeActionMenu() {
    setNodeActionMenu(null);
  }

  function copyActionNode() {
    if (!actionNode) {
      return;
    }
    onCopyNode(
      actionNode,
      actionNodePosition
        ? { x: actionNodePosition.x + 34, y: actionNodePosition.y + 34 }
        : undefined,
    );
    closeNodeActionMenu();
  }

  function deleteActionNode() {
    if (!actionNode) {
      return;
    }
    if (
      typeof window !== "undefined" &&
      !window.confirm(`确定删除「${actionNode.title}」吗？`)
    ) {
      return;
    }
    setSelectedEdgeId("");
    onDeleteNode(actionNode);
    closeNodeActionMenu();
  }

  function detailActionNode() {
    if (!actionNode) {
      return;
    }
    onShowNodeDetail(actionNode);
    closeNodeActionMenu();
  }

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      if (!flowInstance || !onAddConfiguredNode) return;

      const nodeType = event.dataTransfer.getData(
        "application/shemic-nodetype",
      ) as SpaceCanvasNode["type"];
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
    },
    [flowInstance, onAddConfiguredNode],
  );

  const resetCanvasView = useCallback(() => {
    flowInstance?.fitView?.({ padding: 0.32, duration: 260, maxZoom: 0.9 });
  }, [flowInstance]);

  const zoomCanvasTo = useCallback(
    (zoom: number) => {
      const nextZoom = Math.max(0.35, Math.min(1.45, zoom));
      setViewportZoom(nextZoom);
      flowInstance?.zoomTo?.(nextZoom, { duration: 120 });
    },
    [flowInstance],
  );

  const zoomCanvasIn = useCallback(() => {
    const nextZoom = Math.min(1.45, viewportZoom + 0.12);
    setViewportZoom(nextZoom);
    flowInstance?.zoomIn?.({ duration: 140 });
  }, [flowInstance, viewportZoom]);

  const zoomCanvasOut = useCallback(() => {
    const nextZoom = Math.max(0.35, viewportZoom - 0.12);
    setViewportZoom(nextZoom);
    flowInstance?.zoomOut?.({ duration: 140 });
  }, [flowInstance, viewportZoom]);

  return (
    <section
      className={`ws-canvas-wrap ${draggingNodeId ? "is-dragging" : ""}`}
    >
      <ReactFlow
        nodes={flowNodes}
        edges={renderedEdges}
        nodeTypes={flowNodeTypes}
        edgeTypes={flowEdgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onConnectStart={handleConnectStart}
        onConnectEnd={handleConnectEnd}
        isValidConnection={checkValidConnection}
        onEdgeClick={handleEdgeClick}
        onNodeClick={(_, node: Node) => {
          if (skipNextNodeClickRef.current) {
            skipNextNodeClickRef.current = false;
            return;
          }
          setSelectedEdgeId("");
          setNodeActionMenu(null);
          onSelectNode(node.id);
        }}
        onNodeContextMenu={handleNodeContextMenu}
        onNodeDragStart={(_, node: Node) => setDraggingNodeId(node.id)}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeMouseEnter={(_, node: Node) => setHoveredNodeId(node.id)}
        onNodeMouseLeave={() => setHoveredNodeId("")}
        onInit={(instance) => {
          const nextInstance = instance as FlowViewport;
          setFlowInstance(nextInstance);
          if (
            viewport.x != null &&
            viewport.y != null &&
            viewport.zoom != null
          ) {
            nextInstance.setViewport?.({
              x: viewport.x,
              y: viewport.y,
              zoom: viewport.zoom,
            });
            setViewportZoom(viewport.zoom);
          } else {
            setViewportZoom(nextInstance.getZoom?.() || 1);
          }
        }}
        onMove={(_, viewport) => {
          setViewportZoom((current) =>
            Math.abs(current - viewport.zoom) > 0.005 ? viewport.zoom : current,
          );
          onViewportCommit({
            x: viewport.x,
            y: viewport.y,
            zoom: viewport.zoom,
          });
        }}
        onPaneClick={handlePaneClick}
        onPaneContextMenu={handlePaneContextMenu}
        snapToGrid={snapToGrid}
        snapGrid={[18, 18]}
        zoomOnDoubleClick={false}
        minZoom={0.35}
        maxZoom={1.45}
        defaultEdgeOptions={{
          type: "animated",
          animated: false,
        }}
        fitView={viewport.zoom == null}
        fitViewOptions={{ padding: 0.32, maxZoom: 0.72 }}
      >
        <Background
          variant="dots"
          color="var(--ws-flow-dot)"
          gap={18}
          size={1.5}
        />
        {showMiniMap && nodes.length > 0 ? (
          <MiniMap
            position="bottom-left"
            pannable
            zoomable
            nodeColor={(node: Node) =>
              miniMapNodeColor(node.data as SpaceCanvasNode)
            }
          />
        ) : null}
      </ReactFlow>

      <CanvasViewControls
        showMiniMap={showMiniMap}
        snapToGrid={snapToGrid}
        zoom={viewportZoom}
        onToggleMiniMap={() => setShowMiniMap((value) => !value)}
        onToggleSnap={() => setSnapToGrid((value) => !value)}
        onReset={resetCanvasView}
        onZoomIn={zoomCanvasIn}
        onZoomOut={zoomCanvasOut}
        onZoomChange={zoomCanvasTo}
      />

      {nodes.length === 0 ? (
        <div className="ws-empty-note" role="note">
          <span className="ws-empty-action">
            <MousePointer2 size={16} />
            <strong>双击屏幕</strong>
          </span>
          <span className="ws-empty-copy">画布自由生成</span>
        </div>
      ) : null}

      {nodeActionMenu && actionNode ? (
        <NodeActionMenu
          point={nodeActionMenu}
          canShowDetail={nodeHasResultContent(actionNode)}
          onClose={closeNodeActionMenu}
          onCopy={copyActionNode}
          onDelete={deleteActionNode}
          onDetail={detailActionNode}
        />
      ) : null}
    </section>
  );
}

function NodeActionMenu({
  point,
  canShowDetail,
  onClose,
  onCopy,
  onDelete,
  onDetail,
}: {
  point: CanvasPoint;
  canShowDetail: boolean;
  onClose: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onDetail: () => void;
}) {
  return (
    <>
      <div className="ws-node-action-backdrop" onMouseDown={onClose} />
      <section
        className="ws-node-action-menu"
        style={{ left: point.x, top: point.y }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {canShowDetail ? (
          <button type="button" onClick={onDetail}>
            <Eye size={15} />
            <span>详情</span>
          </button>
        ) : null}
        <button type="button" onClick={onCopy}>
          <Copy size={15} />
          <span>复制</span>
        </button>
        <button type="button" className="is-danger" onClick={onDelete}>
          <Trash2 size={15} />
          <span>删除</span>
        </button>
      </section>
    </>
  );
}

function CanvasViewControls({
  showMiniMap,
  snapToGrid,
  zoom,
  onToggleMiniMap,
  onToggleSnap,
  onReset,
  onZoomIn,
  onZoomOut,
  onZoomChange,
}: {
  showMiniMap: boolean;
  snapToGrid: boolean;
  zoom: number;
  onToggleMiniMap: () => void;
  onToggleSnap: () => void;
  onReset: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomChange: (zoom: number) => void;
}) {
  return (
    <div className="ws-view-controls nodrag nopan">
      <button
        type="button"
        className={showMiniMap ? "is-active" : ""}
        onClick={onToggleMiniMap}
        aria-label={showMiniMap ? "隐藏小地图" : "显示小地图"}
        title={showMiniMap ? "隐藏小地图" : "显示小地图"}
      >
        <MapIcon size={16} />
      </button>
      <button
        type="button"
        className={snapToGrid ? "is-active" : ""}
        onClick={onToggleSnap}
        aria-label={snapToGrid ? "关闭网格吸附" : "开启网格吸附"}
        title={snapToGrid ? "关闭网格吸附" : "开启网格吸附"}
      >
        <MousePointer2 size={16} />
      </button>
      <button
        type="button"
        onClick={onReset}
        aria-label="重置视图"
        title="重置视图"
      >
        <Maximize2 size={15} />
      </button>
      <div className="ws-view-zoom">
        <button
          type="button"
          onClick={onZoomOut}
          aria-label="缩小"
          title="缩小"
        >
          <Minus size={15} />
        </button>
        <input
          type="range"
          min="0.35"
          max="1.45"
          step="0.01"
          value={Math.max(0.35, Math.min(1.45, zoom))}
          onChange={(event) => onZoomChange(Number(event.target.value))}
          aria-label="画布缩放"
        />
        <button type="button" onClick={onZoomIn} aria-label="放大" title="放大">
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}

function NodeDetailDialog({
  node,
  onClose,
}: {
  node: SpaceCanvasNode;
  onClose: () => void;
}) {
  const preview = nodeDetailPreview(node);
  const typeLabel =
    node.subtitle || powerKindLabel(String(node.kind || node.type));
  const downloadUrl =
    preview.imageUrl || preview.videoUrl || preview.audioUrl || preview.fileUrl;

  return (
    <div className="ws-node-detail-backdrop" onMouseDown={onClose}>
      <section
        className="ws-node-detail-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="ws-node-detail-head">
          <div className="ws-node-detail-meta">
            <span>名称:</span>
            <strong>{node.title}</strong>
            <span>类型:</span>
            <strong>{typeLabel}</strong>
            <span>节点:</span>
            <strong>{node.local ? "本地节点" : "画布节点"}</strong>
          </div>
          <div className="ws-node-detail-actions">
            {downloadUrl ? (
              <a href={downloadUrl} download aria-label="下载内容">
                <Download size={20} />
              </a>
            ) : null}
            <button type="button" onClick={onClose} aria-label="关闭详情">
              <X size={22} />
            </button>
          </div>
        </header>
        <div className="ws-node-detail-body">
          {preview.imageUrl ? (
            <img src={preview.imageUrl} alt={preview.text || node.title} />
          ) : preview.videoUrl ? (
            <video src={preview.videoUrl} controls playsInline />
          ) : preview.audioUrl ? (
            <audio src={preview.audioUrl} controls />
          ) : preview.fileUrl ? (
            <div className="ws-node-detail-file">
              <FileText size={46} />
              <strong>{preview.text || node.title}</strong>
              <span>{preview.fileUrl}</span>
              <a href={preview.fileUrl} download>
                <Download size={16} />
                下载文件
              </a>
            </div>
          ) : (
            <pre>{preview.text || node.description || "暂无详情"}</pre>
          )}
        </div>
      </section>
    </div>
  );
}

type FlowViewport = {
  screenToFlowPosition?: (position: CanvasPoint) => CanvasPoint;
  project?: (position: CanvasPoint) => CanvasPoint;
  fitView?: (options?: {
    padding?: number;
    duration?: number;
    maxZoom?: number;
  }) => void;
  setViewport?: (
    viewport: { x: number; y: number; zoom: number },
    options?: { duration?: number },
  ) => void;
  setCenter?: (
    x: number,
    y: number,
    options?: { zoom?: number; duration?: number },
  ) => void;
  zoomIn?: (options?: { duration?: number }) => void;
  zoomOut?: (options?: { duration?: number }) => void;
  zoomTo?: (zoom: number, options?: { duration?: number }) => void;
  getZoom?: () => number;
};

function applyNodeResultOverrides(
  model: {
    nodes: SpaceCanvasNode[];
    edges: { id: string; from: string; to: string }[];
  },
  overrides: Record<string, Partial<SpaceCanvasNode>>,
) {
  if (Object.keys(overrides).length === 0) {
    return model;
  }
  return {
    ...model,
    nodes: model.nodes.map((node) => {
      const patch = overrides[node.id];
      return patch ? { ...node, ...patch } : node;
    }),
  };
}

function buildGeneratedNodeResultPatch(
  node: SpaceCanvasNode,
  result: any,
  fallbackPrompt: string,
): Partial<SpaceCanvasNode> {
  const output = firstDefined(
    result?.output,
    result?.version?.content,
    result?.asset?.version?.content,
    result?.data?.output,
    result?.data?.content,
    result?.data?.result,
    result?.data,
  );
  const preview = generatedPreviewFromValue(
    output,
    String(node.power?.kind || node.kind || ""),
  );
  const summary =
    preview.text ||
    preview.imageUrl ||
    preview.videoUrl ||
    preview.audioUrl ||
    preview.fileUrl ||
    (fallbackPrompt ? `已按提示生成：${fallbackPrompt}` : "生成完成");

  return {
    description: summary,
    status: "已生成",
    hasResult: true,
    generatedOutput: output,
    generatedPreview: preview,
    result,
    asset: result?.asset || node.asset,
    kind: result?.asset?.kind || node.power?.kind || node.kind,
  };
}

function generatedNodePreview(node: SpaceCanvasNode): GeneratedNodePreview {
  const stored = (node as any).generatedPreview;
  if (stored && typeof stored === "object") {
    return {
      text: String(stored.text || ""),
      imageUrl: String(stored.imageUrl || ""),
      videoUrl: String(stored.videoUrl || ""),
      audioUrl: String(stored.audioUrl || ""),
      fileUrl: String(stored.fileUrl || ""),
    };
  }
  const output = firstDefined(
    (node as any).generatedOutput,
    (node as any).output,
    (node as any).result?.output,
    (node as any).version?.content,
    (node as any).asset?.version?.content,
  );
  const preview = generatedPreviewFromValue(
    output,
    String(node.power?.kind || node.kind || ""),
  );
  if (
    !hasGeneratedPreview(preview) &&
    (node.hasResult === true || node.status === "已生成")
  ) {
    preview.text = node.description;
  }
  return preview;
}

function nodeDetailPreview(node: SpaceCanvasNode): GeneratedNodePreview {
  const preview = generatedNodePreview(node);
  if (hasGeneratedPreview(preview)) {
    return preview;
  }
  const assetPreview = generatedPreviewFromValue(
    nodeContextOutput(node),
    String(node.kind || node.power?.kind || ""),
  );
  if (!hasGeneratedPreview(assetPreview)) {
    assetPreview.text =
      node.description || stringifyContextValue(nodeContextOutput(node));
  }
  return assetPreview;
}

function generatedPreviewFromValue(
  value: any,
  kind: string,
): GeneratedNodePreview {
  const preview: GeneratedNodePreview = {
    text: "",
    imageUrl: "",
    videoUrl: "",
    audioUrl: "",
    fileUrl: "",
  };
  fillGeneratedPreview(preview, value, kind);
  return preview;
}

function fillGeneratedPreview(
  preview: GeneratedNodePreview,
  value: any,
  kind: string,
) {
  if (value == null) {
    return;
  }
  if (typeof value === "string") {
    setPreviewString(preview, value, kind);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      fillGeneratedPreview(preview, item, kind);
      if (hasGeneratedPreview(preview)) {
        return;
      }
    }
    return;
  }
  if (typeof value !== "object") {
    preview.text = String(value);
    return;
  }

  const row = value as Record<string, any>;
  preview.text ||= firstText(
    row.text,
    row.content,
    row.body,
    row.result,
    row.finalOutput,
    row.message,
    row.prompt,
    row.choices?.[0]?.message?.content,
    row.choices?.[0]?.text,
  );
  preview.imageUrl ||= firstMediaText(
    row.image,
    row.url,
    firstArrayValue(row.images),
  );
  preview.videoUrl ||= firstMediaText(row.video, firstArrayValue(row.videos));
  preview.audioUrl ||= firstMediaText(row.audio, firstArrayValue(row.audios));
  preview.fileUrl ||= firstMediaText(row.file, firstArrayValue(row.files));

  if (!hasGeneratedPreview(preview)) {
    for (const key of ["output", "result", "content", "body", "data"]) {
      if (row[key] && typeof row[key] === "object") {
        fillGeneratedPreview(preview, row[key], kind);
        if (hasGeneratedPreview(preview)) {
          return;
        }
      }
    }
  }
  if (!preview.text && !hasGeneratedPreview(preview)) {
    try {
      preview.text = JSON.stringify(value, null, 2);
    } catch {
      preview.text = String(value);
    }
  }
}

function setPreviewString(
  preview: GeneratedNodePreview,
  value: string,
  kind: string,
) {
  const text = value.trim();
  if (!text) {
    return;
  }
  if (looksLikeURL(text)) {
    const normalizedKind = kind.toLowerCase();
    if (
      normalizedKind === "image" ||
      /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(text)
    ) {
      preview.imageUrl ||= text;
      return;
    }
    if (
      normalizedKind === "video" ||
      /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(text)
    ) {
      preview.videoUrl ||= text;
      return;
    }
    if (
      normalizedKind === "audio" ||
      normalizedKind === "music" ||
      /\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i.test(text)
    ) {
      preview.audioUrl ||= text;
      return;
    }
    preview.fileUrl ||= text;
    return;
  }
  preview.text ||= text;
}

function hasGeneratedPreview(preview: GeneratedNodePreview) {
  return Boolean(
    preview.text ||
    preview.imageUrl ||
    preview.videoUrl ||
    preview.audioUrl ||
    preview.fileUrl,
  );
}

function firstDefined(...values: any[]) {
  return values.find((value) => value !== undefined && value !== null);
}

function firstText(...values: any[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function firstMediaText(...values: any[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (value && typeof value === "object") {
      const text = firstText(
        value.url,
        value.src,
        value.path,
        value.file,
        value.image,
        value.video,
        value.audio,
      );
      if (text) {
        return text;
      }
    }
  }
  return "";
}

function firstArrayValue(value: any) {
  return Array.isArray(value) ? value[0] : undefined;
}

function looksLikeURL(text: string) {
  return /^(https?:\/\/|\/|data:|blob:)/i.test(text);
}

function flowPositionFromScreen(
  flow: FlowViewport | null,
  screen: CanvasPoint,
) {
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

function cloneCanvasNode(
  node: SpaceCanvasNode,
  assetCateId: number,
  index: number,
  position?: CanvasPoint,
): SpaceCanvasNode {
  const x = position?.x ?? node.x + 34;
  const y = position?.y ?? node.y + 34;
  return {
    ...node,
    id: `local-${node.type}-${Date.now()}-${index}`,
    title: `${node.title} 副本`,
    x,
    y,
    assetCateId: node.assetCateId || assetCateId,
    local: true,
  };
}

function buildNodeInputContext(
  nodeId: string,
  nodes: SpaceCanvasNode[],
  edges: Array<{ source: string; target: string }>,
): NodeInputContext | null {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const sources = edges
    .filter((edge) => edge.target === nodeId)
    .map((edge) => nodeMap.get(edge.source))
    .filter((node): node is SpaceCanvasNode => Boolean(node))
    .map((node) => {
      const output = nodeContextOutput(node);
      const preview = generatedPreviewFromValue(
        output,
        String(node.power?.kind || node.kind || ""),
      );
      if (!hasGeneratedPreview(preview)) {
        preview.text = node.description || node.title;
      }
      return {
        nodeId: node.id,
        title: node.title,
        type: node.type,
        output,
        preview,
      };
    });
  if (sources.length === 0) {
    return null;
  }
  return {
    sources,
    text: sources.map(nodeInputContextLine).join("\n\n"),
  };
}

function nodeInputContextLine(source: NodeInputContext["sources"][number]) {
  const preview = source.preview;
  const text =
    preview.text ||
    preview.imageUrl ||
    preview.videoUrl ||
    preview.audioUrl ||
    preview.fileUrl ||
    stringifyContextValue(source.output);
  return `[${source.title}]\n${text}`;
}

function nodeContextOutput(node: SpaceCanvasNode) {
  return firstDefined(
    (node as any).generatedOutput,
    (node as any).output,
    (node as any).result?.output,
    (node as any).version?.content,
    (node as any).asset?.version?.content,
    node.asset?.version?.content,
    node.description,
  );
}

function buildComposerAssetLibrary(
  space: SpaceBootstrap | null,
  inputContext: NodeInputContext | null,
): { current: ComposerAssetItem[]; assets: ComposerAssetItem[] } {
  const current = (inputContext?.sources || []).map((source) => ({
    id: source.nodeId,
    title: source.title,
    kind: composerKindFromPreview(source.preview, String(source.type || "")),
    source: "current" as const,
    output: source.output,
    preview: source.preview,
  }));
  const assets = (space?.assets || []).map((asset) => {
    const output = asset.version?.content ?? asset.name;
    const preview = generatedPreviewFromValue(output, String(asset.kind || ""));
    if (!hasGeneratedPreview(preview)) {
      preview.text = asset.name;
    }
    return {
      id: String(asset.id),
      title: asset.name || `资产 ${asset.id}`,
      kind: composerKindFromPreview(preview, String(asset.kind || "")),
      source: "asset" as const,
      output,
      preview,
      asset,
    };
  });
  return { current, assets };
}

function composerKindFromPreview(
  preview: GeneratedNodePreview,
  fallback: string,
) {
  if (preview.imageUrl) return "image";
  if (preview.videoUrl) return "video";
  if (preview.audioUrl) return "audio";
  if (preview.fileUrl) return "file";
  if (preview.text) return "text";
  return String(fallback || "file").toLowerCase();
}

async function uploadSpaceFiles(
  projectId: number,
  files: File[],
  ruleId: number,
): Promise<UploadPreview[]> {
  const previews: UploadPreview[] = [];
  for (const file of files) {
    const init = await initSpaceUpload({
      projectId,
      ruleId,
      name: file.name,
      size: file.size,
      mime: file.type,
      kind: uploadKindFromFile(file),
    });
    if (String(init.transport || "relay").toLowerCase() === "direct") {
      throw new Error("当前导入入口暂不支持前端直传规则");
    }
    const chunkSize = Math.max(1, Number(init.chunk_size || file.size || 1));
    const chunkTotal = Math.max(
      1,
      Number(init.chunk_total || Math.ceil(file.size / chunkSize)),
    );
    for (let index = 0; index < chunkTotal; index += 1) {
      const start = index * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      await uploadSpacePart({
        projectId,
        sessionId: Number(init.session_id || 0),
        partNumber: index + 1,
        file: file.slice(start, end),
      });
    }
    const completed = await completeSpaceUpload({
      projectId,
      sessionId: Number(init.session_id || 0),
    });
    previews.push(uploadPreviewFromPayload(completed, file));
  }
  return previews;
}

function uploadKindFromFile(file: File) {
  const mime = String(file.type || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}

function uploadPreviewFromPayload(payload: any, file: File): UploadPreview {
  const url = String(
    payload?.url || payload?.open_url || payload?.download || "",
  );
  const kind = String(payload?.kind || uploadKindFromFile(file));
  return {
    name: String(payload?.name || file.name),
    alias: String(payload?.name || file.name),
    kind,
    source: "upload",
    type: String(payload?.mime || file.type || kind),
    url,
    text: String(payload?.name || file.name),
    output: payload,
  };
}

function stringifyContextValue(value: unknown) {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function nodeMenuViewForType(
  type: SpaceCanvasNode["type"],
): AddNodeMenuState["view"] {
  if (type === "asset") return "assets";
  if (type === "power") return "powers";
  if (type === "agent") return "agents";
  if (type === "flow") return "flows";
  return "functions";
}

function canConnectNodes(
  sourceNode?: SpaceCanvasNode,
  targetNode?: SpaceCanvasNode,
) {
  if (!sourceNode || !targetNode) {
    return false;
  }
  if (sourceNode.id === targetNode.id) {
    return false;
  }
  return true;
}

function connectedNodeEdgeEndpoints(
  connection: PendingNodeConnection,
  newNodeId: string,
) {
  if (connection.handleType === "target") {
    return {
      source: newNodeId,
      target: connection.nodeId,
    };
  }
  return {
    source: connection.nodeId,
    target: newNodeId,
  };
}

function appendCanvasEdge(
  current: SpaceCanvasEdge[],
  source: string,
  target: string,
) {
  if (!source || !target || source === target) {
    return current;
  }
  const edgeExists = current.some(
    (edge) => edge.from === source && edge.to === target,
  );
  if (edgeExists) {
    return current;
  }
  return [
    ...current,
    {
      id: `edge-${source}-${target}-${Date.now()}`,
      from: source,
      to: target,
    },
  ];
}

function flowEdgesToCanvasEdges(edges: Edge[]): SpaceCanvasEdge[] {
  return edges
    .map((edge) => ({
      id: String(edge.id || `edge-${edge.source}-${edge.target}`),
      from: String(edge.source || ""),
      to: String(edge.target || ""),
    }))
    .filter((edge) => edge.from && edge.to && edge.from !== edge.to);
}

function normalizeCanvasForState(
  canvas: SpaceCanvasState,
  assetCateId: number,
): SpaceCanvasState {
  const nodeIds = new Set(canvas.nodes.map((node) => node.id));
  return {
    assetCateId,
    nodes: canvas.nodes.map((node) => ({
      ...node,
      assetCateId: Number(node.assetCateId ?? assetCateId),
      local: node.local !== false,
    })),
    edges: canvas.edges.filter(
      (edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to),
    ),
    viewport: canvas.viewport || {},
  };
}

function isSameCanvasState(left: SpaceCanvasState, right: SpaceCanvasState) {
  return stableStringifyCanvas(left) === stableStringifyCanvas(right);
}

function serializeCanvasMap(canvases: Record<string, SpaceCanvasState>) {
  const result: Record<string, string> = {};
  for (const [key, canvas] of Object.entries(canvases)) {
    result[key] = stableStringifyCanvas(canvas);
  }
  return result;
}

function stableStringifyCanvas(canvas: SpaceCanvasState) {
  return JSON.stringify({
    assetCateId: canvas.assetCateId,
    nodes: canvas.nodes,
    edges: canvas.edges,
    viewport: canvas.viewport || {},
  });
}

function resolveProximityConnection(
  sourceNode: SpaceCanvasNode,
  targetNode: SpaceCanvasNode,
) {
  if (canConnectNodes(sourceNode, targetNode)) {
    return { source: sourceNode.id, target: targetNode.id };
  }
  if (canConnectNodes(targetNode, sourceNode)) {
    return { source: targetNode.id, target: sourceNode.id };
  }
  return null;
}

function createProximityPreviewEdge(connection: {
  source: string;
  target: string;
}): Edge {
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
  selectedEdgeId: string,
  onDeleteEdge: (edgeId: string) => void,
): Edge {
  const selected = edge.id === selectedEdgeId;
  const highlighted =
    selected ||
    edge.source === hoveredNodeId ||
    edge.target === hoveredNodeId ||
    edge.source === selectedNodeId ||
    edge.target === selectedNodeId;
  const activeNodeId =
    edge.source === hoveredNodeId || edge.target === hoveredNodeId
      ? hoveredNodeId
      : selectedNodeId;
  return {
    ...edge,
    data: {
      ...edge.data,
      isHighlighted: highlighted,
      isSelected: selected,
      onDelete: onDeleteEdge,
      highlightColor: highlighted
        ? nodeHighlightColor(nodeMap.get(activeNodeId))
        : "var(--ws-edge)",
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

function pointerFromConnectEndEvent(event: any): CanvasPoint | null {
  const touch = event?.changedTouches?.[0] || event?.touches?.[0];
  if (touch) {
    return { x: touch.clientX, y: touch.clientY };
  }
  if (
    typeof event?.clientX === "number" &&
    typeof event?.clientY === "number"
  ) {
    return { x: event.clientX, y: event.clientY };
  }
  return null;
}

function isEditableEventTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']"),
  );
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
    ...Array.from(groups.keys())
      .filter((kind) => !labels.has(kind))
      .sort(),
  ];
  return orderedKinds.map((kind) => ({
    kind,
    label: labels.get(kind) || powerKindLabel(kind),
    items: groups.get(kind) || [],
  }));
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
    <Handle
      id={id}
      type={type}
      position={position}
      className={`ws-rf-handle ${className}`}
      style={style}
    >
      <span>+</span>
    </Handle>
  );
}

function NodeSelectionOverlays({
  node,
  selected,
}: {
  node: SpaceCanvasNode;
  selected?: boolean;
}) {
  if (!selected) {
    return null;
  }
  const { projectId, runningNode, setRunningNode } = node as any;
  const onNodeResult = (node as any).onNodeResult as
    | NodeResultSetter
    | undefined;
  const onAddConfiguredNode = (node as any).onAddConfiguredNode as
    | AddConfiguredNodeHandler
    | undefined;
  return (
    <>
      <NodeBottomSettings
        key={node.id}
        node={node}
        projectId={projectId}
        runningNode={runningNode}
        setRunningNode={setRunningNode}
        onNodeResult={onNodeResult || (() => undefined)}
        onAddConfiguredNode={onAddConfiguredNode}
      />
    </>
  );
}

function NodeQuickDetailButton({
  node,
  onShowNodeDetail,
}: {
  node: SpaceCanvasNode;
  onShowNodeDetail?: (node: SpaceCanvasNode) => void;
}) {
  if (!onShowNodeDetail || !nodeHasResultContent(node)) {
    return null;
  }
  return (
    <button
      type="button"
      className="ws-node-quick-view nodrag nopan"
      aria-label="查看详情"
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onShowNodeDetail(node);
      }}
    >
      <Eye size={14} />
    </button>
  );
}

function nodeHasResultContent(node: SpaceCanvasNode) {
  if (node.hasResult === true || node.status === "已生成") {
    return true;
  }
  const output = firstDefined(
    (node as any).generatedOutput,
    (node as any).output,
    (node as any).result?.output,
    (node as any).version?.content,
    (node as any).asset?.version?.content,
    node.asset?.version?.content,
  );
  if (output == null) {
    return false;
  }
  const preview = generatedPreviewFromValue(
    output,
    String(node.kind || node.power?.kind || ""),
  );
  return (
    hasGeneratedPreview(preview) || stringifyContextValue(output).trim() !== ""
  );
}

function NodeTopToolbar() {
  const toolbarItems: Array<{
    label: string;
    icon: LucideIcon;
    accent?: "green";
    menu?: boolean;
  }> = [
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
    <div
      className="ws-node-top-toolbar nodrag"
      onClick={(event) => event.stopPropagation()}
    >
      {toolbarItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <span key={item.label} className="ws-node-tool-item">
            {index === 1 ? <i className="ws-node-tool-divider" /> : null}
            <button
              type="button"
              className={`ws-node-tool ${item.accent ? `is-${item.accent}` : ""}`}
            >
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

function defaultPowerParamValues(params: PowerParam[]) {
  const values: Record<string, unknown> = {};
  for (const param of params) {
    if (!param.key || param.type === "description") {
      continue;
    }
    values[param.key] = defaultPowerParamValue(param);
  }
  return values;
}

function mergePowerParamValues(
  params: PowerParam[],
  current: Record<string, unknown>,
  previousParams: PowerParam[] = [],
) {
  const values = defaultPowerParamValues(params);
  const previousByKey = new Map(
    previousParams.map((param) => [param.key, param]),
  );
  for (const param of params) {
    const previousParam = previousByKey.get(param.key);
    if (
      param.key &&
      previousParam &&
      Object.prototype.hasOwnProperty.call(current, param.key) &&
      canPreservePowerParamValue(param, previousParam, current[param.key])
    ) {
      values[param.key] = current[param.key];
    }
  }
  return values;
}

function canPreservePowerParamValue(
  param: PowerParam,
  previousParam: PowerParam,
  value: unknown,
) {
  if (
    param.type !== previousParam.type ||
    param.value_type !== previousParam.value_type
  ) {
    return false;
  }
  if (param.type === "option" || param.type === "select") {
    const optionValues = new Set(
      (param.options || []).map((option) => option.value),
    );
    return optionValues.size === 0 || optionValues.has(String(value ?? ""));
  }
  if (param.type === "multi_option") {
    const optionValues = new Set(
      (param.options || []).map((option) => option.value),
    );
    return (
      optionValues.size === 0 ||
      valueAsParamList(value).every((item) => optionValues.has(item))
    );
  }
  if (param.value_type === "number") {
    return value === "" || Number.isFinite(Number(value));
  }
  return true;
}

function valueAsParamList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === "string") {
    return value ? [value] : [];
  }
  return value == null ? [] : [String(value)];
}

function powerRunParams(
  values: Record<string, unknown>,
  promptParam: PowerParam | null,
  prompt: string,
) {
  if (!promptParam?.key) {
    return values;
  }
  return {
    ...values,
    [promptParam.key]: prompt,
  };
}

function withNodeInputContext(
  values: Record<string, unknown>,
  inputContext: NodeInputContext | null,
) {
  if (!inputContext?.sources.length) {
    return values;
  }
  const nextValues: Record<string, unknown> = {
    ...values,
    input_context: inputContext.sources,
    upstream_context: inputContext.text,
  };
  if (nextValues.context == null) {
    nextValues.context = inputContext.text;
  }
  return nextValues;
}

function promptWithInputContext(
  prompt: string,
  inputContext: NodeInputContext | null,
) {
  if (!inputContext?.text) {
    return prompt;
  }
  return `${prompt || "继续处理上游内容"}\n\n上游上下文:\n${inputContext.text}`;
}

function NodeBottomSettings({
  node,
  projectId,
  runningNode,
  setRunningNode,
  onNodeResult,
  onAddConfiguredNode,
}: {
  node: SpaceCanvasNode;
  projectId: number;
  runningNode: RunningNodeState | null;
  setRunningNode: RunningNodeSetter;
  onNodeResult: NodeResultSetter;
  onAddConfiguredNode?: AddConfiguredNodeHandler;
}) {
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [powerForm, setPowerForm] = useState<PowerForm | null>(null);
  const [powerFormLoading, setPowerFormLoading] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState<number>(0);
  const [paramValues, setParamValues] = useState<Record<string, unknown>>({});
  const inputContext = ((node as any).inputContext ||
    null) as NodeInputContext | null;

  // Control node states
  const [conditionText, setConditionText] = useState(() => {
    return String(
      node.functionOption?.key === "condition"
        ? node.defaultParams?.condition || "score > 80"
        : "",
    );
  });
  const [confirmOperator, setConfirmOperator] = useState(() => {
    return String(
      node.functionOption?.key === "confirm"
        ? node.defaultParams?.operator || "主编"
        : "",
    );
  });
  const [saveAssetId, setSaveAssetId] = useState("");
  const [mergeLimit, setMergeLimit] = useState(10);
  const nodeRunning =
    running ||
    (runningNode?.nodeId === node.id && runningNode.status === "running");
  const selectedNodeType = node.type;
  const selectedNodeId = node.id;
  const selectedFlowId = node.flow?.id || 0;
  const selectedPowerId = node.type === "power" ? node.power?.id || 0 : 0;
  const selectedPowerKey = node.type === "power" ? node.power?.key || "" : "";
  const overlayStyle = stableNodeOverlayStyle(
    Number((node as any).viewportZoom) || 1,
  );
  const space = ((node as any).space || null) as SpaceBootstrap | null;
  const assetLibrary = useMemo(
    () => buildComposerAssetLibrary(space, inputContext),
    [inputContext, space],
  );

  useEffect(() => {
    if (selectedNodeType === "power" && (selectedPowerId || selectedPowerKey)) {
      const cacheKey = powerFormCacheKey(
        projectId,
        selectedFlowId,
        selectedPowerId,
        selectedPowerKey,
        0,
      );
      const cachedForm = powerFormCache.get(cacheKey);
      if (cachedForm) {
        setPowerForm(cachedForm);
        setSelectedTargetId(cachedForm.selected_target_id || 0);
        setParamValues(defaultPowerParamValues(cachedForm.params || []));
        setPrompt("");
        setPowerFormLoading(false);
        return;
      }
      setPowerFormLoading(true);
      fetchSpacePowerForm({
        projectId,
        flowId: selectedFlowId,
        powerId: selectedPowerId,
        powerKey: selectedPowerKey,
      })
        .then((form) => {
          powerFormCache.set(cacheKey, form);
          setPowerForm(form);
          setSelectedTargetId(form.selected_target_id || 0);
          setParamValues(defaultPowerParamValues(form.params || []));
          setPrompt("");
        })
        .catch((err) => {
          toast.error(err instanceof Error ? err.message : "加载能力参数失败");
        })
        .finally(() => {
          setPowerFormLoading(false);
        });
      return;
    }
    setPowerForm(null);
    setParamValues({});
    setSelectedTargetId(0);
    setPrompt("");
  }, [
    projectId,
    selectedFlowId,
    selectedNodeId,
    selectedNodeType,
    selectedPowerId,
    selectedPowerKey,
  ]);

  const powerParams = powerForm?.params || [];
  const promptParam = useMemo(
    () =>
      powerParams.find((param) =>
        isPromptPowerParam(param, powerForm?.primary_param_key),
      ) || null,
    [powerForm?.primary_param_key, powerParams],
  );
  const composerParams = useMemo(
    () =>
      powerParams.filter(
        (param) =>
          param.key !== promptParam?.key &&
          (isUploadPowerParam(param) || isToolbarPowerParam(param)),
      ),
    [powerParams, promptParam?.key],
  );
  const powerPrompt = promptParam
    ? String(paramValues[promptParam.key] ?? "")
    : prompt;

  function setPowerPrompt(nextPrompt: string) {
    setPrompt(nextPrompt);
    if (!promptParam) {
      return;
    }
    setParamValues((current) => ({
      ...current,
      [promptParam.key]: nextPrompt,
    }));
  }

  function setParamValue(key: string, value: unknown) {
    setParamValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleAssetReference(
    asset: ComposerAssetItem,
    _param: PowerParam,
    _alias: string,
  ) {
    if (asset.source !== "asset" || !asset.asset || !onAddConfiguredNode) {
      return;
    }
    onAddConfiguredNode(
      "asset",
      { x: Number(node.x || 0) - 320, y: Number(node.y || 0) },
      {
        asset: asset.asset as ProjectAsset,
        connectToNodeId: node.id,
        selectCreated: false,
      },
    );
  }

  async function handleLocalUpload(
    files: File[],
    param: PowerParam,
  ): Promise<UploadPreview[]> {
    return uploadSpaceFiles(
      projectId,
      files,
      param.upload_rule_id || SPACE_UPLOAD_RULE_ID,
    );
  }

  async function selectPowerSource(targetId: number) {
    if (nodeRunning) {
      return;
    }
    setSelectedTargetId(targetId);
    if (node.type !== "power" || !node.power) {
      return;
    }
    try {
      const cacheKey = powerFormCacheKey(
        projectId,
        node.flow?.id || 0,
        node.power.id,
        node.power.key,
        targetId,
      );
      const cachedForm = powerFormCache.get(cacheKey);
      if (cachedForm) {
        setPowerForm(cachedForm);
        setSelectedTargetId(cachedForm.selected_target_id || targetId);
        setParamValues((current) =>
          mergePowerParamValues(
            cachedForm.params || [],
            current,
            powerForm?.params || [],
          ),
        );
        return;
      }
      const form = await fetchSpacePowerForm({
        projectId,
        flowId: node.flow?.id || 0,
        powerId: node.power.id,
        powerKey: node.power.key,
        targetId,
      });
      powerFormCache.set(cacheKey, form);
      setPowerForm(form);
      setSelectedTargetId(form.selected_target_id || targetId);
      setParamValues((current) =>
        mergePowerParamValues(
          form.params || [],
          current,
          powerForm?.params || [],
        ),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载能力参数失败");
    }
  }

  const handleRun = async () => {
    setRunning(true);
    setRunningNode({
      nodeId: node.id,
      title: node.title,
      startedAt: Date.now(),
      progress: 0,
      status: "running",
    });
    let completed = false;
    try {
      if (node.type === "power" && node.power) {
        const runPrompt = promptWithInputContext(powerPrompt, inputContext);
        const result = await runSpacePower({
          projectId,
          flowId: node.flow?.id || 0,
          nodeKey: node.id,
          nodeName: node.title,
          kind: node.power.kind,
          powerId: node.power.id,
          powerKey: node.power.key,
          sourceTargetId: selectedTargetId,
          prompt: runPrompt,
          params: withNodeInputContext(
            powerRunParams(paramValues, promptParam, runPrompt),
            inputContext,
          ),
        });
        onNodeResult(
          node.id,
          buildGeneratedNodeResultPatch(node, result, runPrompt),
        );
        toast.success("能力节点执行成功");
        completed = true;
      } else if (node.type === "agent" && node.role) {
        const runPrompt = promptWithInputContext(prompt, inputContext);
        const result = await request("/project/run/canvas_agent", "post", {
          project_id: projectId,
          flow_id: node.flow?.id || 0,
          node_key: node.id,
          node_name: node.title,
          agent_id: node.role.id,
          input: {
            prompt: runPrompt,
            files: paramValues.files || [],
            context: inputContext?.sources || [],
          },
        });
        if (result.code === 0) {
          onNodeResult(
            node.id,
            buildGeneratedNodeResultPatch(node, result, runPrompt),
          );
          toast.success("智能体任务执行成功");
          completed = true;
        } else {
          toast.error(result.message || "智能体任务执行失败");
        }
      } else if (node.type === "flow" && node.flow) {
        const runPrompt = promptWithInputContext(prompt, inputContext);
        const result = await runSpaceFlow(
          projectId,
          Number(node.assetCateId || 0),
          node.flow,
          runPrompt,
        );
        onNodeResult(
          node.id,
          buildGeneratedNodeResultPatch(node, result, runPrompt),
        );
        toast.success("流程已启动");
        completed = true;
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
            onNodeResult(
              node.id,
              buildGeneratedNodeResultPatch(node, result, "人工确认通过"),
            );
            toast.success("确认成功");
            completed = true;
          } else {
            toast.error(result.message || "确认失败");
          }
        } else if (optionKey === "save") {
          onNodeResult(
            node.id,
            buildGeneratedNodeResultPatch(
              node,
              { output: "资产已保存" },
              "资产已保存",
            ),
          );
          toast.success("资产已保存");
          completed = true;
        } else {
          onNodeResult(
            node.id,
            buildGeneratedNodeResultPatch(
              node,
              { output: "操作已应用" },
              "操作已应用",
            ),
          );
          toast.success("操作已应用");
          completed = true;
        }
      }
    } catch (err) {
      setRunningNode((current) =>
        current?.nodeId === node.id
          ? {
              ...current,
              status: "error",
              progress: Math.max(current.progress, 92),
            }
          : current,
      );
      toast.error(err instanceof Error ? err.message : "执行出错");
    } finally {
      setRunning(false);
      setRunningNode((current) => {
        if (current?.nodeId !== node.id) {
          return current;
        }
        return {
          ...current,
          status: completed ? "success" : "error",
          progress: completed ? 100 : Math.max(current.progress, 92),
        };
      });
      window.setTimeout(
        () => {
          setRunningNode((current) =>
            current?.nodeId === node.id ? null : current,
          );
        },
        completed ? 650 : 1200,
      );
    }
  };

  useEffect(() => {
    if (!running) {
      return;
    }
    const timer = window.setInterval(() => {
      setRunningNode((current) => {
        if (current?.nodeId !== node.id || current.status !== "running") {
          return current;
        }
        return {
          ...current,
          progress: Math.min(94, current.progress + 7),
        };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [node.id, running, setRunningNode]);

  if (node.type === "power") {
    return (
      <div
        className="ws-node-bottom-settings is-composer nodrag"
        onClick={(event) => event.stopPropagation()}
        style={overlayStyle}
      >
        {powerFormLoading && !nodeRunning && !powerForm ? (
          <div className="ws-prompt-loading">
            <Loader2 size={16} className="ws-spin" />
            <span>正在加载能力参数...</span>
          </div>
        ) : (
          <PromptComposer
            value={powerPrompt}
            placeholder="在此处为该能力输入生成提示词或逻辑控制文本..."
            running={nodeRunning}
            sourceOptions={powerForm?.sources || []}
            selectedSourceId={selectedTargetId}
            params={composerParams}
            paramValues={paramValues}
            assetLibrary={assetLibrary}
            disabled={powerFormLoading}
            onChange={setPowerPrompt}
            onParamChange={setParamValue}
            onSourceChange={(targetId) => void selectPowerSource(targetId)}
            onAssetReference={handleAssetReference}
            onLocalUpload={handleLocalUpload}
            onSubmit={handleRun}
          />
        )}
      </div>
    );
  }

  if (node.type === "agent") {
    return (
      <div
        className="ws-node-bottom-settings is-composer nodrag"
        onClick={(event) => event.stopPropagation()}
        style={overlayStyle}
      >
        <PromptComposer
          value={prompt}
          placeholder="向智能体发送任务指令..."
          running={nodeRunning}
          params={agentComposerParams}
          paramValues={paramValues}
          assetLibrary={assetLibrary}
          onChange={setPrompt}
          onParamChange={setParamValue}
          onAssetReference={handleAssetReference}
          onLocalUpload={handleLocalUpload}
          onSubmit={handleRun}
        />
      </div>
    );
  }

  return (
    <div
      className="ws-node-bottom-settings nodrag"
      onClick={(event) => event.stopPropagation()}
      style={overlayStyle}
    >
      <div className="ws-node-settings-head">
        <div className="ws-node-settings-icon">
          <Plus size={16} />
          <span>配置</span>
        </div>
        <div className="ws-node-settings-copy">
          <div>
            <strong>{node.title}</strong>
            <span>
              {node.type} /{" "}
              {String(
                node.kind ||
                  node.functionOption?.key ||
                  node.subtitle ||
                  "default",
              )}
            </span>
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

        {node.type === "flow" && (
          <div className="ws-node-settings-row">
            <div className="ws-node-settings-flow-copy">
              <strong>{node.title || "团队流程"}</strong>
              <span>
                隶属于: {node.flow?.key || "团队流程"} ·{" "}
                {node.subtitle || "多步骤流程"}
              </span>
            </div>
            <div className="ws-node-settings-actions">
              <NodeSettingButton icon={Compass} label="查看内部流程" />
              <button
                type="button"
                className="ws-node-flow-run"
                disabled={running}
                onClick={handleRun}
                style={{ cursor: "pointer" }}
              >
                {running ? (
                  <Loader2 size={12} className="ws-spin" />
                ) : (
                  <Play size={12} fill="currentColor" />
                )}
                <span>启动该流程</span>
              </button>
            </div>
          </div>
        )}

        {node.type === "function" && (
          <div className="ws-node-settings-row">
            {node.functionOption?.key === "condition" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  flex: 1,
                }}
              >
                <span style={{ fontSize: "11px", color: "var(--ws-muted)" }}>
                  判断条件:
                </span>
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  flex: 1,
                }}
              >
                <span style={{ fontSize: "11px", color: "var(--ws-muted)" }}>
                  确认角色:
                </span>
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  flex: 1,
                }}
              >
                <span style={{ fontSize: "11px", color: "var(--ws-muted)" }}>
                  保存资产ID:
                </span>
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  flex: 1,
                }}
              >
                <span style={{ fontSize: "11px", color: "var(--ws-muted)" }}>
                  最大合并限制:
                </span>
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

            <button
              type="button"
              className="ws-node-save-run"
              disabled={running}
              onClick={handleRun}
              style={{ cursor: "pointer", marginLeft: "12px" }}
            >
              {running ? (
                <Loader2 size={12} className="ws-spin" />
              ) : (
                <Save size={12} />
              )}
              <span>
                {node.functionOption?.key === "confirm"
                  ? "人工确认"
                  : "保存设置"}
              </span>
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
        <textarea
          defaultValue=""
          placeholder="在此处为该能力输入生成提示词或逻辑控制文本..."
        />
        <div className="ws-node-settings-row">
          <div className="ws-node-settings-actions">
            <NodeSettingButton
              icon={Cpu}
              label={String(node.power?.name || "全能大模型G2")}
              accent="green"
              menu
            />
            <NodeSettingButton icon={Tv} label="自适应 / 1k" menu />
            <NodeSettingButton icon={Video} label="摄影机控制" />
          </div>
          <span className="ws-node-run-cluster">
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
          <span className="ws-node-settings-state">
            智能体身份: {node.title || "小说助理"}
          </span>
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
          <span>
            隶属于: {node.flow?.key || "团队流程"} ·{" "}
            {node.subtitle || "多步骤流程"}
          </span>
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
        <span>
          子类型: {node.functionOption?.key || "save"} · 逻辑公式/参数
        </span>
      </div>
      <button type="button" className="ws-node-save-run">
        <Save size={12} />
        <span>
          {node.functionOption?.key === "confirm"
            ? "人工点击确认运行"
            : "保存绑定正式资产"}
        </span>
      </button>
    </div>
  );
}

function stableNodeOverlayStyle(zoom: number): CSSProperties {
  const safeZoom = Math.max(
    0.35,
    Math.min(1.45, Number.isFinite(zoom) ? zoom : 1),
  );
  return {
    zIndex: 999,
    "--ws-node-overlay-scale": String(1 / safeZoom),
    "--ws-node-overlay-gap": `${16 / safeZoom}px`,
  } as CSSProperties;
}

function powerFormCacheKey(
  projectId: number,
  flowId: number,
  powerId: number,
  powerKey: string,
  targetId: number,
) {
  return [
    projectId || 0,
    flowId || 0,
    powerId || 0,
    powerKey || "",
    targetId || 0,
  ].join(":");
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
    <button
      type="button"
      className={`ws-node-setting-button ${accent ? `is-${accent}` : ""}`}
    >
      <Icon size={12} />
      <span>{label}</span>
      {menu ? <ChevronDown size={11} /> : null}
    </button>
  );
}

function SpaceNodeView({ data, selected }: NodeProps<any>) {
  const node = data as SpaceCanvasNode;
  const runningNode = (data as any).runningNode as RunningNodeState | null;
  const onShowNodeDetail = (data as any).onShowNodeDetail as
    | ((node: SpaceCanvasNode) => void)
    | undefined;
  const onNodeResult = (data as any).onNodeResult as
    | NodeResultSetter
    | undefined;

  // 1. circular agent representation
  if (node.type === "agent") {
    const isGenerated =
      node.status === "已生成" || node.hasResult === true || node.count != null;
    return (
      <div className={`ws-node-agent-wrap ${selected ? "is-selected" : ""}`}>
        <NodeHandle
          id="input-0"
          type="target"
          position={Position.Left}
          className="is-in"
          style={{ left: "4px" }}
        />
        <NodeHandle
          id="output-0"
          type="source"
          position={Position.Right}
          className="is-out"
          style={{ right: "4px" }}
        />
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
          <div
            className="ws-agent-result-card"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="ws-result-header">
              <Sparkles size={8} />
              <span>智能体结果卡</span>
            </div>
            <p className="ws-result-text">{node.description}</p>
          </div>
        ) : null}
        <NodeQuickDetailButton
          node={node}
          onShowNodeDetail={onShowNodeDetail}
        />
        <NodeSelectionOverlays node={node} selected={selected} />
      </div>
    );
  }

  // 2. SVG Hexagon flow representation
  if (node.type === "flow") {
    return (
      <div className={`ws-node-flow-wrap ${selected ? "is-selected" : ""}`}>
        <svg
          className="ws-hexagon-svg"
          viewBox="0 0 100 100"
          fill="currentColor"
        >
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
        <NodeHandle
          id="input-0"
          type="target"
          position={Position.Left}
          className="is-in"
          style={{ left: "11px" }}
        />
        <NodeHandle
          id="output-0"
          type="source"
          position={Position.Right}
          className="is-out"
          style={{ right: "11px" }}
        />
        <NodeQuickDetailButton
          node={node}
          onShowNodeDetail={onShowNodeDetail}
        />
        <NodeSelectionOverlays node={node} selected={selected} />
      </div>
    );
  }

  // 3. SVG Triangle function representation
  if (node.type === "function") {
    const FunctionIcon = functionIcon(
      node.functionOption?.key || (node.title.includes("保存") ? "save" : ""),
    );
    return (
      <div className={`ws-node-function-wrap ${selected ? "is-selected" : ""}`}>
        <svg
          className="ws-triangle-svg"
          viewBox="0 0 100 100"
          fill="currentColor"
        >
          <polygon
            points="50,5 95,90 5,90"
            stroke={selected ? "var(--ws-rose)" : "var(--ws-border)"}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
        <div className="ws-node-function-content">
          <div className="ws-node-function-icon">
            <FunctionIcon size={16} className="ws-icon-rose" />
          </div>
          <div className="ws-node-function-title">{node.title}</div>
        </div>
        <NodeHandle
          id="input-0"
          type="target"
          position={Position.Left}
          className="is-in"
          style={{ left: "29px" }}
        />
        <NodeHandle
          id="output-0"
          type="source"
          position={Position.Right}
          className="is-out"
          style={{ right: "29px" }}
        />
        <NodeQuickDetailButton
          node={node}
          onShowNodeDetail={onShowNodeDetail}
        />
        <NodeSelectionOverlays node={node} selected={selected} />
      </div>
    );
  }

  // 4. Asset representations
  if (node.type === "asset") {
    if (node.kind === "image") {
      const preview = nodeDetailPreview(node);
      return (
        <div className={`ws-node-image-wrap ${selected ? "is-selected" : ""}`}>
          <div className="ws-node-floating-label">
            <ImageIcon size={13} className="ws-icon-green" />
            <span>{node.title || "图片资产"}</span>
          </div>
          <div className="ws-node-image-container">
            {preview.imageUrl ? (
              <img
                src={preview.imageUrl}
                alt={node.title}
                className="ws-node-image-raw"
              />
            ) : (
              <div className="ws-node-image-empty">
                <ImageIcon size={24} />
                <span>{preview.text || node.description || "图片资产"}</span>
              </div>
            )}
          </div>
          <NodeHandle
            id="input-0"
            type="target"
            position={Position.Left}
            className="is-in"
          />
          <NodeHandle
            id="output-0"
            type="source"
            position={Position.Right}
            className="is-out"
          />
          <NodeQuickDetailButton
            node={node}
            onShowNodeDetail={onShowNodeDetail}
          />
          <NodeSelectionOverlays node={node} selected={selected} />
        </div>
      );
    }

    if (node.kind === "video") {
      const preview = nodeDetailPreview(node);
      return (
        <div className={`ws-node-video-wrap ${selected ? "is-selected" : ""}`}>
          <div className="ws-node-floating-label">
            <Video size={13} className="ws-icon-green" />
            <span>{node.title || "视频资产"}</span>
          </div>
          <div className="ws-node-video-container">
            {preview.videoUrl ? (
              <video
                src={preview.videoUrl}
                className="ws-node-video-raw"
                muted
                playsInline
                preload="metadata"
              />
            ) : preview.imageUrl ? (
              <img
                src={preview.imageUrl}
                alt={node.title}
                className="ws-node-video-raw"
              />
            ) : (
              <div className="ws-node-image-empty">
                <Video size={24} />
                <span>{preview.text || node.description || "视频资产"}</span>
              </div>
            )}
            <div className="ws-node-video-play">
              <div>
                <Play size={14} fill="currentColor" />
              </div>
            </div>
          </div>
          <NodeHandle
            id="input-0"
            type="target"
            position={Position.Left}
            className="is-in"
          />
          <NodeHandle
            id="output-0"
            type="source"
            position={Position.Right}
            className="is-out"
          />
          <NodeQuickDetailButton
            node={node}
            onShowNodeDetail={onShowNodeDetail}
          />
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
        <NodeHandle
          id="input-0"
          type="target"
          position={Position.Left}
          className="is-in"
        />
        <NodeHandle
          id="output-0"
          type="source"
          position={Position.Right}
          className="is-out"
        />
        <NodeQuickDetailButton
          node={node}
          onShowNodeDetail={onShowNodeDetail}
        />
        <NodeSelectionOverlays node={node} selected={selected} />
      </div>
    );
  }

  // 5. Power Nodes
  if (node.type === "power") {
    const showRunFrame =
      runningNode?.status === "running" || runningNode?.status === "success";
    const preview = generatedNodePreview(node);
    const hasPowerContent =
      node.hasResult === true ||
      node.status === "已生成" ||
      hasGeneratedPreview(preview);
    const hasPowerMedia = Boolean(preview.imageUrl || preview.videoUrl);
    return (
      <div
        className={`ws-node-power-wrap ${selected ? "is-selected" : ""} ${showRunFrame ? "is-running" : ""} ${hasPowerContent ? "has-content" : ""} ${hasPowerMedia ? "has-media" : ""}`}
      >
        <div className="ws-node-floating-label">
          <PowerIcon
            power={node.power}
            kind={node.kind}
            size={13}
            className="ws-icon-violet"
          />
          <span>{node.title}</span>
        </div>
        <div className="ws-node-power-card">
          {showRunFrame ? (
            <svg
              className="ws-node-running-border is-spin"
              aria-hidden="true"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <rect
                className="ws-node-running-track"
                x="2"
                y="2"
                width="96"
                height="96"
                rx="7"
                pathLength="100"
              />
              <rect
                className="ws-node-running-progress"
                x="2"
                y="2"
                width="96"
                height="96"
                rx="7"
                pathLength="100"
                strokeDasharray="18 82"
                strokeDashoffset="0"
              />
            </svg>
          ) : null}
          {hasPowerContent ? (
            <PowerNodeGeneratedContent
              preview={preview}
              fallback={node.description}
              onMediaSize={(width, height) => {
                const nextSize = generatedMediaNodeSize(width, height);
                if (!nextSize || !onNodeResult) {
                  return;
                }
                if (
                  Math.abs((node.width || 0) - nextSize.width) > 2 ||
                  Math.abs((node.height || 0) - nextSize.height) > 2
                ) {
                  onNodeResult(node.id, nextSize);
                }
              }}
            />
          ) : (
            <PowerNodeEmptyState />
          )}
        </div>
        <NodeHandle
          id="input-0"
          type="target"
          position={Position.Left}
          className="is-in"
        />
        <NodeHandle
          id="output-0"
          type="source"
          position={Position.Right}
          className="is-out"
        />
        <NodeQuickDetailButton
          node={node}
          onShowNodeDetail={onShowNodeDetail}
        />
        <NodeSelectionOverlays node={node} selected={selected} />
      </div>
    );
  }

  // Fallback
  return (
    <div className={`ws-node ${selected ? "is-selected" : ""}`}>
      <NodeHandle
        id="input-0"
        type="target"
        position={Position.Left}
        className="is-in"
      />
      <NodeHandle
        id="output-0"
        type="source"
        position={Position.Right}
        className="is-out"
      />
      <div className="ws-node-title">{node.title}</div>
      <div className="ws-node-desc">{node.description}</div>
      <NodeQuickDetailButton node={node} onShowNodeDetail={onShowNodeDetail} />
      <NodeSelectionOverlays node={node} selected={selected} />
    </div>
  );
}

function PowerNodeGeneratedContent({
  preview,
  fallback,
  onMediaSize,
}: {
  preview: GeneratedNodePreview;
  fallback: string;
  onMediaSize?: (width: number, height: number) => void;
}) {
  if (preview.imageUrl) {
    return (
      <div className="ws-node-power-media">
        <img
          src={preview.imageUrl}
          alt={preview.text || "生成图片"}
          onLoad={(event) =>
            onMediaSize?.(
              event.currentTarget.naturalWidth,
              event.currentTarget.naturalHeight,
            )
          }
        />
        {preview.text ? <p>{preview.text}</p> : null}
      </div>
    );
  }
  if (preview.videoUrl) {
    return (
      <div className="ws-node-power-media">
        <video
          src={preview.videoUrl}
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={(event) =>
            onMediaSize?.(
              event.currentTarget.videoWidth,
              event.currentTarget.videoHeight,
            )
          }
        />
        {preview.text ? <p>{preview.text}</p> : null}
      </div>
    );
  }
  if (preview.audioUrl) {
    return (
      <div className="ws-node-power-file">
        <Music size={16} />
        <span>{preview.text || preview.audioUrl}</span>
      </div>
    );
  }
  if (preview.fileUrl) {
    return (
      <div className="ws-node-power-file">
        <FileText size={16} />
        <span>{preview.text || preview.fileUrl}</span>
      </div>
    );
  }
  return <p className="ws-node-power-desc">{preview.text || fallback}</p>;
}

function generatedMediaNodeSize(
  width: number,
  height: number,
): Pick<SpaceCanvasNode, "width" | "height"> | null {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }
  const ratio = width / height;
  const maxWidth = 330;
  const maxHeight = 340;
  let nextWidth = maxWidth;
  let nextHeight = nextWidth / ratio;
  if (nextHeight > maxHeight) {
    nextHeight = maxHeight;
    nextWidth = nextHeight * ratio;
  }
  return {
    width: Math.round(clampNumber(nextWidth, 150, maxWidth)),
    height: Math.round(clampNumber(nextHeight, 150, maxHeight)),
  };
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function PowerNodeEmptyState() {
  return (
    <div className="ws-node-power-empty" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

function PowerIcon({
  power,
  kind,
  size,
  className,
}: {
  power?: PowerOption;
  kind?: string;
  size: number;
  className?: string;
}) {
  const FallbackIcon = powerIcon(power?.kind || kind || "");
  const Icon =
    resolveSharedLucideIcon(normalizePowerIconName(power?.icon)) ||
    FallbackIcon;

  return <Icon size={size} className={className} />;
}

function resolveSharedLucideIcon(iconName?: string): LucideIcon | null {
  if (!iconName) {
    return null;
  }
  try {
    const resolver = getCompatModule("@/lib/icon").resolveLucideIcon as
      | ((name?: string) => LucideIcon | null)
      | undefined;
    const Icon = resolver?.(iconName);
    if (Icon) {
      return Icon;
    }
  } catch {
    // The host SDK may not expose this compat module on older dev sessions.
  }
  return resolveLocalLucideIcon(iconName);
}

function resolveLocalLucideIcon(iconName?: string): LucideIcon | null {
  if (!iconName) {
    return null;
  }
  const exportName = iconName
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return (
    (LucideIcons as unknown as Record<string, LucideIcon | undefined>)[
      exportName
    ] || null
  );
}

function normalizePowerIconName(icon?: string) {
  const text = String(icon || "").trim();
  if (!text || text === "-") {
    return "";
  }
  return text
    .replace(/^i-lucide-/i, "")
    .replace(/^lucide[:/\\-]/i, "")
    .replace(/Icon$/i, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .replace(/--+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function powerIcon(kind: string): LucideIcon {
  const normalizedKind = String(kind || "").toLowerCase();
  if (normalizedKind === "text" || normalizedKind === "llm") return Type;
  if (normalizedKind === "image") return ImageIcon;
  if (normalizedKind === "video") return Video;
  if (normalizedKind === "audio" || normalizedKind === "music") return Music;
  if (normalizedKind === "file") return FileText;
  if (normalizedKind === "workflow") return Workflow;
  if (normalizedKind === "role" || normalizedKind === "agent") return UserCheck;
  if (normalizedKind === "multi") return Sparkles;
  return Brain;
}

function miniMapNodeColor(node: SpaceCanvasNode) {
  if (node.type === "asset") return "#23c483";
  if (node.type === "power") return "#8b5cf6";
  if (node.type === "agent") return "#f59e0b";
  if (node.type === "flow") return "#3b82f6";
  return "#e85d75";
}

function clampMenuPoint(menu: AddNodeMenuState) {
  if (typeof window === "undefined") {
    return { x: menu.x, y: menu.y, maxHeight: 520 };
  }
  const margin = 14;
  const minTop = 62;
  const width = Math.min(324, window.innerWidth - margin * 2);
  const maxHeight = Math.min(
    520,
    Math.max(180, window.innerHeight - minTop - margin),
  );
  const preferredY =
    menu.y + maxHeight > window.innerHeight - margin
      ? menu.y - maxHeight
      : menu.y;
  return {
    x: Math.min(
      Math.max(margin, menu.x),
      Math.max(margin, window.innerWidth - width - margin),
    ),
    y: Math.min(
      Math.max(minTop, preferredY),
      Math.max(minTop, window.innerHeight - maxHeight - margin),
    ),
    maxHeight,
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
  return Number(
    params.get("project_id") ||
      params.get("projectId") ||
      params.get("id") ||
      0,
  );
}
