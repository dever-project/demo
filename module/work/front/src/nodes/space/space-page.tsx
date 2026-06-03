import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import {
  Background,
  Controls,
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
  Bot,
  Brain,
  CheckCircle2,
  FileText,
  Folder,
  History,
  Image as ImageIcon,
  Layers,
  Loader2,
  MessageSquare,
  Moon,
  MousePointer2,
  Play,
  Plus,
  Route,
  Save,
  Send,
  Sparkles,
  Sun,
  Type,
  UserCheck,
  Video,
  Workflow,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@dever/front-plugin";
import {
  fetchSpaceBootstrap,
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
  relatedFlows,
  visibleAssetCates,
} from "./space-model";
import { WorkSpaceStyles } from "./space-styles";
import type {
  AssetCate,
  SpaceBootstrap,
  SpaceCanvasNode,
  TeamFlow,
} from "./types";

type PanelMode = "assets" | "flows" | "chat" | "node" | null;
type WorkSpaceTheme = "dark" | "light";
type CanvasPoint = { x: number; y: number };
type AddNodeMenuState = {
  x: number;
  y: number;
  position: CanvasPoint;
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

const flowNodeTypes = {
  workSpace: SpaceNodeView,
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
  const canvasModel = useMemo(() => {
    if (!space || !activeCate) {
      return { nodes: [], edges: [] };
    }
    const currentLocalNodes = localNodes.filter(
      (node) => node.assetCateId === activeCate.id || activeCate.id === 0,
    );
    return buildCanvasModel(space, activeCate.id, currentLocalNodes);
  }, [activeCate, localNodes, space]);
  const selectedNode = useMemo(
    () => canvasModel.nodes.find((node) => node.id === selectedNodeId) || null,
    [canvasModel.nodes, selectedNodeId],
  );

  function switchCate(cateId: number) {
    setActiveCateId(cateId);
    setSelectedNodeId("");
    setPanelMode(null);
    setNodeMenu(null);
    setRunStatus("");
  }

  function addNode(type: SpaceCanvasNode["type"], position?: CanvasPoint) {
    if (!activeCate) {
      return;
    }
    const node = createLocalNode(type, activeCate, localNodes.length, position);
    setLocalNodes((items) => [...items, node]);
    setSelectedNodeId(node.id);
    setPanelMode("node");
    setNodeMenu(null);
  }

  function openNodeMenu(screen: CanvasPoint, position: CanvasPoint) {
    setPanelMode(null);
    setNodeMenu({
      x: screen.x,
      y: screen.y,
      position,
    });
  }

  function openDockNodeMenu() {
    openNodeMenu(
      { x: 92, y: 122 },
      {
        x: 360 + (localNodes.length % 5) * 34,
        y: 250 + (localNodes.length % 5) * 26,
      },
    );
  }

  function toggleTheme() {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      persistTheme(next);
      return next;
    });
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
      <div className="ws-loading">
        <WorkSpaceStyles />
        <Loader2 size={18} className="ws-spin" />
        正在加载创作空间...
      </div>
    );
  }

  if (error || !space || !activeCate) {
    return (
      <div className="ws-error">
        <WorkSpaceStyles />
        {error || "创作空间不存在"}
      </div>
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
          setPanelMode("node");
          setNodeMenu(null);
        }}
        onOpenNodeMenu={openNodeMenu}
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

      <BottomCanvasBar
        activeCate={activeCate}
        assetCount={activeAssets.length}
        localNodeCount={localNodes.length}
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
          onAddNode={addNode}
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

      {panelMode === "node" && selectedNode ? (
        <NodeFloatingPanel
          node={selectedNode}
          running={running}
          onClose={() => setPanelMode(null)}
          onRunFlow={executeFlow}
        />
      ) : null}

      {nodeMenu ? (
        <AddNodeMenu
          menu={nodeMenu}
          onClose={() => setNodeMenu(null)}
          onSelect={(type) => addNode(type, nodeMenu.position)}
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
  onClose,
  onSelect,
}: {
  menu: AddNodeMenuState;
  onClose: () => void;
  onSelect: (type: SpaceCanvasNode["type"]) => void;
}) {
  const point = clampMenuPoint(menu);
  return (
    <>
      <div
        className="ws-add-menu-backdrop"
        onMouseDown={onClose}
        onContextMenu={(event) => {
          event.preventDefault();
          onClose();
        }}
      />
      <section
        className="ws-add-menu"
        style={{ left: point.x, top: point.y }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="ws-add-menu-head">
          <strong>添加节点</strong>
          <span>双击画布或左侧加号打开</span>
        </div>
        <div className="ws-add-menu-list">
          {paletteItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.type}
                type="button"
                className={`ws-add-item is-${item.type}`}
                onClick={() => onSelect(item.type)}
              >
                <span className="ws-add-icon">
                  <Icon size={17} />
                </span>
                <span className="ws-add-copy">
                  <strong>{item.label}</strong>
                  <small>{item.desc}</small>
                </span>
              </button>
            );
          })}
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
    <aside className="ws-dock" aria-label="画布工具">
      <button type="button" className="ws-dock-add" onClick={onAdd} aria-label="添加节点">
        <Plus size={22} />
      </button>
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

function BottomCanvasBar({
  activeCate,
  assetCount,
  localNodeCount,
}: {
  activeCate: AssetCate;
  assetCount: number;
  localNodeCount: number;
}) {
  return (
    <div className="ws-bottom-bar">
      <span><MousePointer2 size={14} /> ReactFlow</span>
      <span>{activeCate.name}</span>
      <span>{assetKindLabel(activeCate.kind)} / {cardinalityLabel(activeCate.cardinality)}</span>
      <span>{assetCount} 资产</span>
      <span>{localNodeCount} 本地节点</span>
    </div>
  );
}

function AssetFloatingPanel({
  space,
  activeCate,
  onClose,
  onSelectCate,
  onAddNode,
}: {
  space: SpaceBootstrap;
  activeCate: AssetCate;
  onClose: () => void;
  onSelectCate: (cateId: number) => void;
  onAddNode: (type: SpaceCanvasNode["type"]) => void;
}) {
  const cates = visibleAssetCates(space);
  return (
    <FloatingPanel title="作品资产" subtitle="资产树 / 节点库" side="left" onClose={onClose}>
      <div className="ws-asset-tree">
        {cates.map((cate) => {
          const assets = assetsForCate(space, cate.id);
          return (
            <div key={cate.id} className="ws-tree-group">
              <button
                type="button"
                className={`ws-tree-head ${cate.id === activeCate.id ? "is-active" : ""}`}
                onClick={() => onSelectCate(cate.id)}
              >
                <span className="ws-tree-label">
                  {assetIcon(cate.kind)}
                  {cate.name}
                </span>
                <span>{assets.length}</span>
              </button>
              {cate.id === activeCate.id ? (
                <div className="ws-tree-list">
                  {assets.length > 0 ? (
                    assets.slice(0, 8).map((asset) => (
                      <button key={asset.id} type="button" className="ws-tree-asset">
                        {asset.name || "未命名资产"}
                      </button>
                    ))
                  ) : (
                    <div className="ws-tree-empty">暂无资产</div>
                  )}
                </div>
              ) : null}
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
              className="ws-palette-button"
              onClick={() => onAddNode(item.type)}
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

function NodeFloatingPanel({
  node,
  running,
  onClose,
  onRunFlow,
}: {
  node: SpaceCanvasNode;
  running: boolean;
  onClose: () => void;
  onRunFlow: (flow: TeamFlow) => void;
}) {
  return (
    <FloatingPanel title={node.title} subtitle={node.subtitle} side="right" onClose={onClose}>
      <div className="ws-selected">
        <p>{node.description}</p>
        <p>
          类型：{node.subtitle}
          {node.kind ? ` / ${assetKindLabel(node.kind)}` : ""}
        </p>
        {node.flow ? (
          <button
            type="button"
            className="ws-panel-button"
            disabled={running}
            onClick={() => onRunFlow(node.flow as TeamFlow)}
          >
            <Play size={14} />
            运行这个流程
          </button>
        ) : null}
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
}: {
  activeCate: AssetCate;
  assetsCount: number;
  nodes: SpaceCanvasNode[];
  edges: { id: string; from: string; to: string }[];
  selectedNodeId: string;
  onSelectNode: (id: string) => void;
  onOpenNodeMenu: (screen: CanvasPoint, position: CanvasPoint) => void;
}) {
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [userEdges, setUserEdges] = useState<Edge[]>([]);
  const [flowInstance, setFlowInstance] = useState<FlowViewport | null>(null);

  const flowNodes = useMemo<Node[]>(() => {
    return nodes.map((node) => ({
      id: node.id,
      type: "workSpace",
      position: nodePositions[node.id] || { x: node.x, y: node.y },
      data: node,
      selected: node.id === selectedNodeId,
      style: {
        width: node.width,
        height: node.height,
      },
    }));
  }, [nodePositions, nodes, selectedNodeId]);

  const flowEdges = useMemo<Edge[]>(() => {
    const nodeIds = new Set(nodes.map((node) => node.id));
    const baseEdges: Edge[] = edges.map((edge) => ({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      type: "smoothstep",
      animated: false,
      style: { stroke: "var(--ws-edge)", strokeWidth: 2 },
    }));
    return [
      ...baseEdges,
      ...userEdges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)),
    ];
  }, [edges, nodes, userEdges]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const nextNodes = applyNodeChanges(changes, flowNodes);
      setNodePositions((current) => {
        const next = { ...current };
        for (const node of nextNodes) {
          next[node.id] = node.position;
        }
        return next;
      });
    },
    [flowNodes],
  );

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    setUserEdges((current) => applyEdgeChanges(changes, current));
  }, []);

  const handleConnect = useCallback<OnConnect>((connection) => {
    setUserEdges((current) =>
      addEdge(
        {
          ...connection,
          type: "smoothstep",
          animated: true,
          style: { stroke: "var(--ws-edge-active)", strokeWidth: 2 },
        },
        current,
      ),
    );
  }, []);

  const handlePaneClick = useCallback(
    (event: ReactMouseEvent | MouseEvent) => {
      if (!("detail" in event) || event.detail !== 2) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const screen = { x: event.clientX, y: event.clientY };
      onOpenNodeMenu(screen, flowPositionFromScreen(flowInstance, screen));
    },
    [flowInstance, onOpenNodeMenu],
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

  return (
    <section className="ws-canvas-wrap">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={flowNodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={(_, node) => onSelectNode(node.id)}
        onInit={(instance) => setFlowInstance(instance as FlowViewport)}
        onPaneClick={handlePaneClick}
        onPaneContextMenu={handlePaneContextMenu}
        zoomOnDoubleClick={false}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.35}
        maxZoom={1.45}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { stroke: "var(--ws-edge)", strokeWidth: 2 },
        }}
      >
        <Background color="var(--ws-flow-dot)" gap={18} size={1} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(node) => miniMapNodeColor(node.data as SpaceCanvasNode)}
        />
        <Controls showInteractive={false} />
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

function SpaceNodeView({ data, selected }: NodeProps<any>) {
  const node = data as SpaceCanvasNode;
  const Icon = nodeIcon(node);
  return (
    <div className={`ws-node ws-node--${node.type} ${selected ? "is-selected" : ""}`}>
      <Handle type="target" position={Position.Left} className="ws-rf-handle is-in" />
      <Handle type="source" position={Position.Right} className="ws-rf-handle is-out" />
      <div className="ws-node-kicker">
        <Icon size={13} /> {node.subtitle}
      </div>
      <div className="ws-node-title">{node.title}</div>
      <div className="ws-node-desc">{node.description}</div>
      <div className="ws-node-meta">
        {node.kind ? <span className="ws-node-chip">{assetKindLabel(node.kind)}</span> : null}
        {node.count != null ? <span className="ws-node-chip">{node.count} 个</span> : null}
        {node.local ? <span className="ws-node-chip">本地</span> : null}
      </div>
    </div>
  );
}

function nodeIcon(node: SpaceCanvasNode): LucideIcon {
  if (node.type === "asset") {
    if (node.kind === "image") return ImageIcon;
    if (node.kind === "video") return Video;
    if (node.kind === "mixed") return FileText;
    return Type;
  }
  if (node.type === "power") return Brain;
  if (node.type === "agent") return UserCheck;
  if (node.type === "flow") return Route;
  if (node.type === "function") return Layers;
  return Sparkles;
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
  const width = 286;
  const height = 360;
  return {
    x: Math.min(Math.max(14, menu.x), Math.max(14, window.innerWidth - width)),
    y: Math.min(Math.max(62, menu.y), Math.max(62, window.innerHeight - height)),
  };
}

function readStoredTheme(): WorkSpaceTheme {
  if (typeof window === "undefined") {
    return "dark";
  }
  try {
    return window.localStorage.getItem("work-space-theme") === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function persistTheme(theme: WorkSpaceTheme) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem("work-space-theme", theme);
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
