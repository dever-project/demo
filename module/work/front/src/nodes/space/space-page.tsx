import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type Dispatch,
  type DragEvent,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
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
  Bot,
  Brain,
  CheckCircle2,
  ChevronDown,
  Columns3,
  Compass,
  Copy,
  Crop,
  Download,
  Eye,
  FileText,
  FileSearch,
  GitBranch,
  History,
  Image as ImageIcon,
  Layers,
  Lightbulb,
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
  RotateCw,
  Save,
  Scissors,
  Send,
  Sparkles,
  Sun,
  Trash2,
  Type,
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
import { getCompatModule, useNavigate } from "@dever/front-plugin";
import {
  fetchSpaceBootstrap,
  fetchSpaceBootstrapAssets,
  fetchSpacePowerForm,
  fetchSpacePowers,
  fetchSpaceRunStatus,
  completeSpaceUpload,
  initSpaceUpload,
  runSpaceAgent,
  runSpacePower,
  runSpaceFlow,
  saveSpaceAssetVersion,
  saveSpaceCanvasAsset,
  saveSpaceCanvas,
  sendSpaceMessage,
  SPACE_UPLOAD_RULE_ID,
  submitSpaceApproval,
  uploadSpacePart,
} from "./space-api";
import {
  assetCateById,
  assetsForCate,
  createLocalNode,
  defaultAssetCateId,
  documentPreview,
  documentText,
  emptyCanvasState,
  isExecutionRole,
  looseRichJSONText,
  powerKindLabel,
  relatedFlows,
  richDocument,
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

const { EnergonContentView, normalizeEnergonOutput } = getCompatModule(
  "@/components/energon/content-view",
) as {
  EnergonContentView?: React.ComponentType<{ output: any; emptyText?: string }>;
  normalizeEnergonOutput?: (output: any) => any;
};
const { normalizeAgentResultOutputValue } = getCompatModule("@/lib/agent-result-protocol") as {
  normalizeAgentResultOutputValue?: (value: any) => any;
};

type WorkMode = "create" | "result";
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
type ComposerDraft = {
  prompt?: string;
  paramValues?: Record<string, unknown>;
  selectedTargetId?: number;
};
type NodeDraftSetter = (nodeId: string, draft: ComposerDraft) => void;
type NodeStartRunner = (node: SpaceCanvasNode) => Promise<void>;
type ConfirmRequest = {
  title: string;
  description: string;
  confirmText?: string;
  tone?: "danger" | "primary";
  onConfirm: () => void | Promise<void>;
};
type ConfirmRequester = (request: ConfirmRequest) => void;
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
    connectFromNodeId?: string;
    selectCreated?: boolean;
    replaceSingleAssetNode?: boolean;
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
type FlowRunStatus = "running" | "waiting" | "success" | "fail" | "canceled" | string;
type FlowRunSnapshot = {
  runId: number;
  requestId: string;
  status: FlowRunStatus;
  output: unknown;
  error: string;
  approvals: FlowApproval[];
  raw: any;
};
type FlowApproval = {
  id: number;
  title: string;
  status: string;
  decision: string;
  content: Record<string, any>;
};
type FlowFeedbackPrompt = {
  approval: FlowApproval;
  title: string;
  description: string;
  fields: PowerParam[];
  values: Record<string, unknown>;
};
type FlowFeedbackRequester = (input: {
  node: SpaceCanvasNode;
  prompt: FlowFeedbackPrompt;
}) => Promise<Record<string, unknown>>;
type NodeFeedbackRecord = {
  id: string;
  nodeId: string;
  title: string;
  description: string;
  prompt: FlowFeedbackPrompt;
  values?: Record<string, unknown>;
  status: "pending" | "submitted";
  createdAt: string;
  submittedAt?: string;
};
type AgentMemoryEntry = {
  role: "user" | "assistant" | "feedback";
  text: string;
  data?: unknown;
  createdAt: string;
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

const canvasAgentMemoryStore = new Map<string, AgentMemoryEntry[]>();

const functionOptions: CanvasFunctionOption[] = [
  {
    key: "start",
    label: "开始",
    description: "启动连接的创作节点，直到保存或展示。",
  },
  {
    key: "import",
    label: "导入",
    description: "导入资产并连接到当前节点。",
  },
  {
    key: "save",
    label: "保存",
    description: "将上游结果保存为当前资产类型的资产。",
  },
  {
    key: "display",
    label: "展示",
    description: "展示上游节点的结果。",
  },
];
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
  const [workMode, setWorkMode] = useState<WorkMode>("create");
  const [assistantOpen, setAssistantOpen] = useState(false);
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
  const [confirmRequest, setConfirmRequest] =
    useState<ConfirmRequest | null>(null);
  const [focusNodeRequest, setFocusNodeRequest] =
    useState<NodeFocusRequest | null>(null);
  const [importPickerSignal, setImportPickerSignal] = useState(0);
  const [pendingImportNodeId, setPendingImportNodeId] = useState("");
  const [error, setError] = useState("");
  const [runStatus, setRunStatus] = useState("");
  const [startFlowFeedbackPrompt, setStartFlowFeedbackPrompt] = useState<{
    node: SpaceCanvasNode;
    recordId: string;
    prompt: FlowFeedbackPrompt;
  } | null>(null);
  const loadedCanvasesRef = useRef<Record<string, string>>({});
  const pendingImportNodeRef = useRef<SpaceCanvasNode | null>(null);
  const startFlowFeedbackRef = useRef<{
    nodeId: string;
    recordId: string;
    resolve: (values: Record<string, unknown>) => void;
    reject: (err: Error) => void;
  } | null>(null);

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

  const requestConfirm = useCallback<ConfirmRequester>((request) => {
    setConfirmRequest(request);
  }, []);

  useEffect(() => {
    void loadSpace();
  }, [loadSpace]);

  const cates = useMemo(() => (space ? visibleAssetCates(space) : []), [space]);
  const hasAssetCates = space ? space.assetCates.length > 0 : false;
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
    () => activeFlows,
    [activeFlows],
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

  useEffect(() => {
    if (
      !space ||
      space.assetCates.length === 0 ||
      !activeCate ||
      activeFlows.length === 0
    ) {
      return;
    }
    const key = String(activeCate.id);
    setCanvasStates((current) => {
      if (Object.prototype.hasOwnProperty.call(current, key)) {
        return current;
      }
      const seededCanvas = createSeedCanvasFromFlows(activeCate, activeFlows);
      if (seededCanvas.nodes.length === 0) {
        return current;
      }
      return {
        ...current,
        [key]: seededCanvas,
      };
    });
  }, [activeCate, activeFlows, space]);

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

  const updateNodeComposerDraft = useCallback<NodeDraftSetter>(
    (nodeId, draft) => {
      updateActiveCanvas((canvas) => ({
        ...canvas,
        nodes: canvas.nodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                composerDraft: normalizeComposerDraft(draft),
              }
            : node,
        ),
      }));
    },
    [updateActiveCanvas],
  );

  const patchNodeFeedbackRecords = useCallback(
    (
      nodeId: string,
      updater: (records: NodeFeedbackRecord[]) => NodeFeedbackRecord[],
    ) => {
      updateActiveCanvas((canvas) => ({
        ...canvas,
        nodes: canvas.nodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                feedbackRequests: updater(currentNodeFeedbackRecords(node)),
              }
            : node,
        ),
      }));
    },
    [updateActiveCanvas],
  );

  const upsertSpaceAsset = useCallback((asset: ProjectAsset) => {
    if (!asset || !asset.id) {
      return;
    }
    const normalizedAsset = normalizeRichAssetVersionContent(asset);
    setSpace((current) => {
      if (!current) {
        return current;
      }
      const exists = current.assets.some((item) => item.id === normalizedAsset.id);
      const assets = exists
        ? current.assets.map((item) =>
            item.id === normalizedAsset.id ? normalizedAsset : item,
          )
        : [normalizedAsset, ...current.assets];
      return {
        ...current,
        assets,
      };
    });
  }, []);

  const requestStartFlowFeedback = useCallback<FlowFeedbackRequester>(
    ({ node, prompt }) => {
      const record = createNodeFeedbackRecord(node, prompt);
      patchNodeFeedbackRecords(node.id, (records) => [...records, record]);
      return new Promise<Record<string, unknown>>((resolve, reject) => {
        startFlowFeedbackRef.current = {
          nodeId: node.id,
          recordId: record.id,
          resolve,
          reject,
        };
        setStartFlowFeedbackPrompt({ node, recordId: record.id, prompt });
      });
    },
    [patchNodeFeedbackRecords],
  );

  const submitStartFlowFeedback = useCallback(
    (values: Record<string, unknown>) => {
      const pending = startFlowFeedbackRef.current;
      startFlowFeedbackRef.current = null;
      setStartFlowFeedbackPrompt(null);
      if (pending) {
        patchNodeFeedbackRecords(
          pending.nodeId,
          (records) => submitNodeFeedbackRecord(records, pending.recordId, values),
        );
      }
      pending?.resolve(values);
    },
    [patchNodeFeedbackRecords],
  );

  const closeStartFlowFeedback = useCallback(() => {
    setStartFlowFeedbackPrompt(null);
  }, []);

  const runStartNode = useCallback<NodeStartRunner>(
    async (startNode) => {
      if (!space || !activeCate) {
        return;
      }
      setRunningNode({
        nodeId: startNode.id,
        title: startNode.title,
        startedAt: Date.now(),
        progress: 0,
        status: "running",
      });
      try {
        await runCanvasFromStartNode({
          projectId,
          assetCate: activeCate,
          space,
          startNode,
          nodes: canvasModel.nodes,
          edges: canvasModel.edges,
          onNodeResult: updateNodeResult,
          onAssetCreated: upsertSpaceAsset,
          setRunningNode,
          requestFlowFeedback: requestStartFlowFeedback,
        });
        setRunningNode({
          nodeId: startNode.id,
          title: startNode.title,
          startedAt: Date.now(),
          progress: 100,
          status: "success",
        });
        toast.success("开始节点执行完成");
        window.setTimeout(() => {
          setRunningNode((current) =>
            current?.nodeId === startNode.id ? null : current,
          );
        }, 700);
      } catch (err) {
        const message = err instanceof Error ? err.message : "开始节点执行失败";
        setRunningNode({
          nodeId: startNode.id,
          title: startNode.title,
          startedAt: Date.now(),
          progress: 92,
          status: "error",
        });
        toast.error(message);
        window.setTimeout(() => {
          setRunningNode((current) =>
            current?.nodeId === startNode.id ? null : current,
          );
        }, 1400);
      }
    },
    [
      activeCate,
      canvasModel.edges,
      canvasModel.nodes,
      projectId,
      requestStartFlowFeedback,
      setRunningNode,
      space,
      updateNodeResult,
      upsertSpaceAsset,
    ],
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
      connectFromNodeId?: string;
      selectCreated?: boolean;
      replaceSingleAssetNode?: boolean;
    },
  ): SpaceCanvasNode | null {
    if (!activeCate) {
      return null;
    }
    const node = createLocalNode(
      type,
      activeCate,
      activeCanvas.nodes.length,
      position,
      options,
    );
    const nodeAssetCate = space
      ? assetCateById(space, assetNodeCateId(node) || activeCate.id)
      : activeCate;
    if (type === "asset") {
      node.cardinality = nodeAssetCate.cardinality;
    }
    const replacementAssetCateId =
      type === "asset" && options?.replaceSingleAssetNode
        ? assetNodeCateId(node) || Number(nodeAssetCate.id || 0)
        : 0;
    const replacementTarget = replacementAssetCateId
      ? findReplaceableAssetNode(
          activeCanvas.nodes,
          activeCanvas.edges,
          replacementAssetCateId,
          options?.connectFromNodeId,
        )
      : null;
    const duplicateReplacementNodeIds = replacementTarget
      ? connectedAssetNodeIds(
          activeCanvas.nodes,
          activeCanvas.edges,
          replacementAssetCateId,
          options?.connectFromNodeId,
          replacementTarget.id,
        )
      : new Set<string>();
    const selectedCreatedNodeId = replacementTarget?.id || node.id;
    const connection = nodeMenu?.connection;
    updateActiveCanvas((canvas) => {
      let edges = canvas.edges;
      const currentReplacementTarget = replacementAssetCateId
        ? findReplaceableAssetNode(
            canvas.nodes,
            canvas.edges,
            replacementAssetCateId,
            options?.connectFromNodeId,
          )
        : null;
      if (currentReplacementTarget) {
        const duplicateNodeIds = connectedAssetNodeIds(
          canvas.nodes,
          canvas.edges,
          replacementAssetCateId,
          options?.connectFromNodeId,
          currentReplacementTarget.id,
        );
        edges = canvas.edges.filter(
          (edge) =>
            !duplicateNodeIds.has(edge.from) && !duplicateNodeIds.has(edge.to),
        );
        if (connection) {
          const endpoints = connectedNodeEdgeEndpoints(
            connection,
            currentReplacementTarget.id,
          );
          edges = appendCanvasEdge(edges, endpoints.source, endpoints.target);
        } else if (options?.connectFromNodeId) {
          edges = appendCanvasEdge(
            edges,
            options.connectFromNodeId || "",
            currentReplacementTarget.id,
          );
        } else if (options?.connectToNodeId) {
          edges = appendCanvasEdge(
            edges,
            currentReplacementTarget.id,
            options.connectToNodeId || "",
          );
        }
        return {
          ...canvas,
          nodes: canvas.nodes
            .filter((item) => !duplicateNodeIds.has(item.id))
            .map((item) =>
              item.id === currentReplacementTarget.id
                ? replaceAssetNode(item, node)
                : item,
            ),
          edges,
        };
      }
      if (connection) {
        const endpoints = connectedNodeEdgeEndpoints(connection, node.id);
        edges = appendCanvasEdge(edges, endpoints.source, endpoints.target);
      } else if (options?.connectFromNodeId) {
        edges = appendCanvasEdge(edges, options.connectFromNodeId || "", node.id);
      } else if (options?.connectToNodeId) {
        edges = appendCanvasEdge(edges, node.id, options.connectToNodeId || "");
      }
      return {
        ...canvas,
        nodes: [...canvas.nodes, node],
        edges,
      };
    });
    if (replacementTarget) {
      const replacementNode = replaceAssetNode(replacementTarget, node);
      setNodeResultOverrides((current) => {
        const next = { ...current };
        for (const nodeId of duplicateReplacementNodeIds) {
          delete next[nodeId];
        }
        next[replacementTarget.id] = {
          ...(next[replacementTarget.id] || {}),
          ...assetNodeResultOverride(replacementNode),
        };
        return next;
      });
    }
    if (options?.selectCreated !== false) {
      setSelectedNodeId(selectedCreatedNodeId);
      focusCanvasNode(selectedCreatedNodeId);
    }
    setWorkMode("create");
    setNodeMenu(null);
    return replacementTarget
      ? replaceAssetNode(replacementTarget, node)
      : node;
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

  function patchImportNodeResult(nodeId: string, asset: ProjectAsset) {
    if (!nodeId) {
      return;
    }
    const sourceNode =
      activeCanvas.nodes.find((node) => node.id === nodeId) ||
      (pendingImportNodeRef.current?.id === nodeId
        ? pendingImportNodeRef.current
        : null);
    if (!sourceNode) {
      return;
    }
    const output =
      fixedTiptapRichOutput(asset.version?.content) ||
      extractDisplayOutput(asset.version?.content);
    updateNodeResult(
      nodeId,
      buildGeneratedNodeResultPatch(
        {
          ...sourceNode,
          kind: asset.kind || activeCate.kind,
          assetCateId: Number(asset.asset_cate_id || activeCate.id || 0),
        },
        {
          output,
          asset,
          version: asset.version,
        },
        "导入资产",
      ),
    );
  }

  function addImportedAssetNode(asset: ProjectAsset) {
    const importNodeId = pendingImportNodeId;
    if (!importNodeId) {
      addAssetNode(asset);
      return;
    }
    const sourceNode =
      activeCanvas.nodes.find((node) => node.id === importNodeId) ||
      (pendingImportNodeRef.current?.id === importNodeId
        ? pendingImportNodeRef.current
        : null);
    if (!sourceNode) {
      addAssetNode(asset);
      setPendingImportNodeId("");
      pendingImportNodeRef.current = null;
      return;
    }
    addConfiguredNode(
      "asset",
      {
        x: sourceNode.x + 190,
        y: sourceNode.y,
      },
      {
        asset,
        connectFromNodeId: importNodeId,
        selectCreated: false,
      },
    );
    patchImportNodeResult(importNodeId, asset);
  }

  function addPowerNode(power: PowerOption, position?: CanvasPoint) {
    addConfiguredNode("power", position, { power });
  }

  function openImportPicker(nodeId = "") {
    setPendingImportNodeId(nodeId);
    pendingImportNodeRef.current =
      activeCanvas.nodes.find((node) => node.id === nodeId) ||
      (pendingImportNodeRef.current?.id === nodeId
        ? pendingImportNodeRef.current
        : null);
    setNodeMenu(null);
    setWorkMode("create");
    setImportPickerSignal((current) => current + 1);
  }

  async function uploadLocalFiles(
    files: File[],
    param: PowerParam,
  ): Promise<UploadPreview[]> {
    const previews = await uploadSpaceFiles(
      projectId,
      files,
      param.upload_rule_id || SPACE_UPLOAD_RULE_ID,
    );
    for (const preview of previews) {
      try {
        const asset = await saveSpaceCanvasAsset({
          projectId,
          assetCateId: Number(activeCate.id || 0),
          name: preview.name || activeCate.name,
          kind: String(preview.kind || activeCate.kind || "file"),
          content: uploadAssetContent(preview),
        });
        upsertSpaceAsset(asset);
        addImportedAssetNode(asset);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "导入资产保存失败");
      }
    }
    setPendingImportNodeId("");
    pendingImportNodeRef.current = null;
    return previews;
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
    const node = addConfiguredNode("function", position, { functionOption });
    if (functionOption.key === "import") {
      pendingImportNodeRef.current = node;
      openImportPicker(node?.id || "");
    }
  }

  function openNodeMenu(
    screen: CanvasPoint,
    position: CanvasPoint,
    connection?: PendingNodeConnection,
  ) {
    setWorkMode("create");
    setNodeMenu({
      x: screen.x,
      y: screen.y,
      position,
      view: "types",
      connection,
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
    <main className={`ws-page is-${theme} is-${workMode}-view`}>
      <WorkSpaceStyles />
      <CanvasWorkbench
        activeCate={activeCate}
        mode={workMode}
        interactive={workMode === "create"}
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
        onNodeDraftChange={updateNodeComposerDraft}
        onAssetCreated={upsertSpaceAsset}
        onRunStartNode={runStartNode}
        onOpenImportPicker={openImportPicker}
        requestConfirm={requestConfirm}
        onOpenFeedbackRecord={(node, record) => {
          if (
            startFlowFeedbackRef.current?.nodeId === node.id &&
            startFlowFeedbackRef.current.recordId === record.id &&
            record.status === "pending"
          ) {
            setStartFlowFeedbackPrompt({
              node,
              recordId: record.id,
              prompt: record.prompt,
            });
            return;
          }
          setStartFlowFeedbackPrompt({
            node,
            recordId: record.id,
            prompt: {
              ...record.prompt,
              values: record.values || record.prompt.values || {},
            },
          });
        }}
      />

      <TopCanvasToolbar
        space={space}
        cates={cates}
        activeCate={activeCate}
        hasAssetCates={hasAssetCates}
        onBack={() => navigate({ to: "/work/home" })}
        onSelectCate={switchCate}
        onRefresh={loadSpace}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <LeftCanvasDock
        mode={workMode}
        onSelectMode={(mode) => {
          setWorkMode(mode);
          setNodeMenu(null);
          setRunStatus("");
        }}
      />

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
              addImportedAssetNode(asset.asset as ProjectAsset);
            }
          }}
          onAssetPickerClose={() => {
            setPendingImportNodeId("");
            pendingImportNodeRef.current = null;
          }}
          onLocalUpload={uploadLocalFiles}
          onSubmit={() => undefined}
        />
      </div>

      {workMode === "result" ? (
        <AssetWorkspacePanel
          space={space}
          activeCate={activeCate}
          onClose={() => setWorkMode("create")}
        />
      ) : null}

      <button
        type="button"
        className={`ws-assistant-ball ${assistantOpen ? "is-open" : ""}`}
        onClick={() => setAssistantOpen((current) => !current)}
        aria-label={assistantOpen ? "收起创作助手" : "打开创作助手"}
      >
        <MessageSquare size={25} />
      </button>

      {assistantOpen ? (
        <CommunicationWorkspacePanel
          activeCate={activeCate}
          prompt={prompt}
          running={running}
          runStatus={runStatus}
          onPromptChange={setPrompt}
          onSubmitMessage={submitMessage}
          onClose={() => setAssistantOpen(false)}
        />
      ) : null}

      {startFlowFeedbackPrompt ? (
        <FlowFeedbackDialog
          key={`${startFlowFeedbackPrompt.node.id}-${startFlowFeedbackPrompt.recordId}`}
          prompt={startFlowFeedbackPrompt.prompt}
          running={false}
          readonly={isReadonlyFeedbackRecord(
            startFlowFeedbackPrompt,
            canvasModel.nodes,
            startFlowFeedbackRef.current,
          )}
          history={currentNodeFeedbackRecords(
            canvasModel.nodes.find(
              (node) => node.id === startFlowFeedbackPrompt.node.id,
            ) || startFlowFeedbackPrompt.node,
          )}
          activeRecordId={startFlowFeedbackPrompt.recordId}
          onSelectRecord={(record) => {
            const currentNode =
              canvasModel.nodes.find(
                (node) => node.id === startFlowFeedbackPrompt.node.id,
              ) || startFlowFeedbackPrompt.node;
            setStartFlowFeedbackPrompt({
              node: currentNode,
              recordId: record.id,
              prompt: {
                ...record.prompt,
                values: record.values || record.prompt.values || {},
              },
            });
          }}
          onClose={closeStartFlowFeedback}
          onSubmit={submitStartFlowFeedback}
        />
      ) : null}

      {confirmRequest ? (
        <CanvasConfirmDialog
          request={confirmRequest}
          onClose={() => setConfirmRequest(null)}
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
          projectId={space.project.id}
          node={nodeDetail}
          onAssetSaved={(asset) => {
            const normalizedAsset = normalizeRichAssetVersionContent(asset);
            upsertSpaceAsset(normalizedAsset);
            updateNodeResult(nodeDetail.id, {
              asset: normalizedAsset,
              description: documentPreview(normalizedAsset.version?.content),
            });
            setNodeDetail((current) =>
              current?.id === nodeDetail.id
                ? {
                    ...current,
                    asset: normalizedAsset,
                    description: documentPreview(normalizedAsset.version?.content),
                  }
                : current,
            );
          }}
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
  hasAssetCates,
  onBack,
  onSelectCate,
  onRefresh,
  theme,
  onToggleTheme,
}: {
  space: SpaceBootstrap;
  cates: AssetCate[];
  activeCate: AssetCate;
  hasAssetCates: boolean;
  onBack: () => void;
  onSelectCate: (cateId: number) => void;
  onRefresh: () => void;
  theme: WorkSpaceTheme;
  onToggleTheme: () => void;
}) {
  const activeIndex = Math.max(
    0,
    cates.findIndex((cate) => cate.id === activeCate.id),
  );
  return (
    <header className="ws-topbar">
      <div className="ws-project-head">
        <button
          type="button"
          className="ws-back-button"
          onClick={onBack}
          aria-label="返回工作台"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="ws-project-copy">
          <strong>{space.project.name}</strong>
          <span>{space.team.name || space.project.team?.name || "自由团队"}</span>
        </div>
      </div>

      {hasAssetCates ? (
        <nav
          className="ws-cate-strip"
          aria-label="资产类型"
          style={
            {
              "--ws-cate-total": cates.length,
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
      ) : null}

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

const dockModeOptions: Array<{
  key: WorkMode;
  label: string;
  icon: LucideIcon;
}> = [
  { key: "create", label: "创作", icon: PenTool },
  { key: "result", label: "结果", icon: FileSearch },
];

function LeftCanvasDock({
  mode,
  onSelectMode,
}: {
  mode: WorkMode;
  onSelectMode: (mode: WorkMode) => void;
}) {
  return (
    <nav className="ws-dock" aria-label="画布视角">
      {dockModeOptions.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            type="button"
            className={`ws-dock-button ${item.key === mode ? "is-active" : ""}`}
            onClick={() => onSelectMode(item.key)}
          >
            <Icon size={20} />
            {item.label}
          </button>
        );
      })}
    </nav>
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

  const powerItems = safePowers;
  if (powerItems.length > 0) {
    visibleSections.push(
      renderAddMenuSection({
        sectionKey: "powers",
        title: "能力",
        items: powerItems,
        itemKey: (item) => String(item.key || item.id),
        itemClassName: "is-power",
        label: (item) => item.name,
        icon: (item) => {
          return <PowerIcon power={item} size={16} />;
        },
        onSelect: onSelectPower,
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

  const functionItems: CanvasFunctionOption[] = [
    ...(functionOptions || []).filter((item) => item.key === "start"),
    ...(functionOptions || []).filter((item) => item.key !== "start"),
  ];
  if (functionItems.length > 0) {
    visibleSections.push(
      renderAddMenuSection({
        sectionKey: "functions",
        title: "功能",
        items: functionItems,
        itemKey: (item) => item.key,
        itemClassName: (item) =>
          item.key === "import" ? "is-function is-import" : "is-function",
        label: (item) => item.label,
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
  icon: (item: T) => ReactNode;
  onSelect: (item: T) => void;
}) {
  return (
    <div key={sectionKey} className="ws-add-section">
      <div className="ws-add-section-title">{title}</div>
      <div className={`ws-add-menu-list ${listClassName}`.trim()}>
        {items.map((item) => {
          const extraClassName =
            typeof itemClassName === "function"
              ? itemClassName(item)
              : itemClassName;
          return (
            <button
              key={itemKey(item)}
              type="button"
              className={`ws-add-item ${extraClassName}`.trim()}
              title={label(item)}
              onClick={() => onSelect(item)}
            >
              <span className="ws-add-icon">{icon(item)}</span>
              <span className="ws-add-copy">
                <span className="ws-add-label">{label(item)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
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
    <WorkspaceSurface className="ws-asset-workspace">
      <section
        className={`ws-asset-editor-shell ${showList ? "has-list" : "is-single"}`}
      >
        <button
          type="button"
          className="ws-workspace-close"
          onClick={onClose}
          aria-label="关闭结果"
        >
          <X size={18} />
        </button>
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
    </WorkspaceSurface>
  );
}

function CommunicationWorkspacePanel({
  activeCate,
  prompt,
  running,
  runStatus,
  onPromptChange,
  onSubmitMessage,
  onClose,
}: {
  activeCate: AssetCate;
  prompt: string;
  running: boolean;
  runStatus: string;
  onPromptChange: (value: string) => void;
  onSubmitMessage: () => void;
  onClose: () => void;
}) {
  return (
    <WorkspaceSurface className="ws-communication-workspace">
      <section className="ws-chat-stage">
        <button
          type="button"
          className="ws-chat-close"
          onClick={onClose}
          aria-label="关闭创作助手"
        >
          <X size={18} />
        </button>
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
    </WorkspaceSurface>
  );
}

function WorkspaceSurface({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`ws-workspace-overlay ${className || ""}`.trim()}>
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
  return safeDocumentText(asset.version?.content);
}

function CanvasWorkbench({
  activeCate,
  mode,
  interactive,
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
  onNodeDraftChange,
  onAssetCreated,
  onRunStartNode,
  onOpenImportPicker,
  requestConfirm,
  onOpenFeedbackRecord,
}: {
  activeCate: AssetCate;
  mode: WorkMode;
  interactive: boolean;
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
  onNodeDraftChange: NodeDraftSetter;
  onAssetCreated: (asset: ProjectAsset) => void;
  onRunStartNode: NodeStartRunner;
  onOpenImportPicker: (nodeId: string) => void;
  requestConfirm: ConfirmRequester;
  onOpenFeedbackRecord: (
    node: SpaceCanvasNode,
    record: NodeFeedbackRecord,
  ) => void;
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
      const className = `ws-flow-node ws-flow-node-${node.type}`;

      const nodeData = {
        ...node,
        projectId,
        space,
        runningNode: runningNode?.nodeId === node.id ? runningNode : null,
        canvasRunningNode: runningNode,
        setRunningNode,
        onAddConfiguredNode,
        onNodeResult,
        onNodeDraftChange,
        onAssetCreated,
        onRunStartNode,
        onOpenImportPicker,
        onOpenFeedbackRecord,
        onShowNodeDetail,
        requestConfirm,
        viewportZoom,
        inputContext: buildNodeInputContext(node.id, nodes, contextEdges),
      };

      const cached = flowNodeCache.current.get(node.id);
      const cachedStyle = cached?.style as CSSProperties | undefined;
      const nodeStyleSize = canvasNodeStyleSize(node);
      if (
        cached &&
        cached.position.x === position.x &&
        cached.position.y === position.y &&
        cached.data === nodeData &&
        cached.selected === selected &&
        cached.className === className &&
        cachedStyle?.width === nodeStyleSize.width &&
        cachedStyle?.height === nodeStyleSize.height
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
        className,
        style: {
          ...cached?.style,
          width: nodeStyleSize.width,
          height: nodeStyleSize.height,
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
    onAssetCreated,
    onNodeResult,
    onNodeDraftChange,
    onOpenFeedbackRecord,
    onOpenImportPicker,
    onRunStartNode,
    onShowNodeDetail,
    projectId,
    requestConfirm,
    runningNode,
    selectedNodeId,
    setRunningNode,
    space,
    viewportZoom,
  ]);

  const deleteEdge = useCallback(
    (edgeId: string) => {
      if (!interactive) {
        return;
      }
      setSelectedEdgeId("");
      onEdgesCommit(edges.filter((edge) => edge.id !== edgeId));
    },
    [edges, interactive, onEdgesCommit],
  );

  const flowEdges = useMemo<Edge[]>(() => {
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const selectedPathEdges = highlightedCanvasPathEdges(
      selectedNodeId,
      nodes,
      edges,
    );
    const hoveredPathEdges = highlightedCanvasPathEdges(
      hoveredNodeId,
      nodes,
      edges,
    );
    const highlightedPathEdges = new Set<string>([
      ...selectedPathEdges,
      ...hoveredPathEdges,
    ]);
    const highlightedPathSourceNodeId =
      selectedPathEdges.size > 0
        ? selectedNodeId
        : hoveredPathEdges.size > 0
          ? hoveredNodeId
          : "";
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
          highlightedPathEdges,
          highlightedPathSourceNodeId,
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
      if (!interactive) {
        return;
      }
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
    [flowNodes, interactive, nodes, onNodesCommit, onSelectNode],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (!interactive) {
        return;
      }
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
    [flowEdges, interactive, onEdgesCommit],
  );

  const handleConnect = useCallback<OnConnect>(
    (connection) => {
      if (!interactive) {
        return;
      }
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
    [edges, interactive, onEdgesCommit],
  );

  const handleConnectStart = useCallback(
    (_event: unknown, params: any) => {
      if (!interactive) {
        return;
      }
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
    [interactive, onSelectNode],
  );

  const handleConnectEnd = useCallback(
    (event: any) => {
      if (!interactive) {
        pendingConnectionRef.current = null;
        connectionCompletedRef.current = false;
        return;
      }
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
    [flowInstance, interactive, onOpenNodeMenu],
  );

  const handleEdgeClick = useCallback(
    (event: ReactMouseEvent | MouseEvent, edge: Edge) => {
      if (!interactive) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setNodeActionMenu(null);
      onSelectNode("");
      setSelectedEdgeId(edge.id);
    },
    [interactive, onSelectNode],
  );

  useEffect(() => {
    if (!selectedEdgeId || typeof window === "undefined") {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }
      if (!interactive) {
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
  }, [deleteEdge, interactive, selectedEdgeId]);

  const updateProximityEdge = useCallback((nextEdge: Edge | null) => {
    setProximityEdge((current: Edge | null) =>
      isSamePreviewEdge(current, nextEdge) ? current : nextEdge,
    );
  }, []);

  const checkValidConnection = useCallback(
    (connection: any) => {
      if (!interactive) {
        return false;
      }
      const sourceNode = nodes.find(
        (n: SpaceCanvasNode) => n.id === connection.source,
      );
      const targetNode = nodes.find(
        (n: SpaceCanvasNode) => n.id === connection.target,
      );
      return canConnectNodes(sourceNode, targetNode);
    },
    [interactive, nodes],
  );

  const handleNodeDrag = useCallback(
    (_event: ReactMouseEvent | MouseEvent, draggedNode: Node) => {
      if (!interactive) {
        return;
      }
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
    [flowEdges, flowNodes, interactive, nodes, updateProximityEdge],
  );

  const handleNodeDragStop = useCallback(() => {
    if (!interactive) {
      setDraggingNodeId("");
      updateProximityEdge(null);
      return;
    }
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
  }, [
    edges,
    flowEdges,
    interactive,
    onEdgesCommit,
    proximityEdge,
    updateProximityEdge,
  ]);

  const handlePaneClick = useCallback(
    (event: ReactMouseEvent | MouseEvent) => {
      if (!interactive) {
        return;
      }
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
    [flowInstance, interactive, onOpenNodeMenu, onSelectNode],
  );

  const handlePaneContextMenu = useCallback(
    (event: ReactMouseEvent | MouseEvent) => {
      if (!interactive) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const screen = { x: event.clientX, y: event.clientY };
      onOpenNodeMenu(screen, flowPositionFromScreen(flowInstance, screen));
    },
    [flowInstance, interactive, onOpenNodeMenu],
  );

  const handleNodeContextMenu = useCallback(
    (event: ReactMouseEvent | MouseEvent, node: Node) => {
      if (!interactive) {
        return;
      }
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
    [interactive, onSelectNode],
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
    if (!interactive || !actionNode) {
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
    if (!interactive || !actionNode) {
      return;
    }
    const targetNode = actionNode;
    closeNodeActionMenu();
    requestConfirm({
      title: `删除「${targetNode.title}」`,
      description: "会同时移除与该节点相连的连线。",
      confirmText: "删除",
      tone: "danger",
      onConfirm: () => {
        setSelectedEdgeId("");
        onDeleteNode(targetNode);
      },
    });
  }

  function detailActionNode() {
    if (!actionNode) {
      return;
    }
    onShowNodeDetail(actionNode);
    closeNodeActionMenu();
  }

  const onDragOver = useCallback((event: DragEvent) => {
    if (!interactive) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }, [interactive]);

  const onDrop = useCallback(
    (event: DragEvent) => {
      if (!interactive) {
        return;
      }
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
    [flowInstance, interactive, onAddConfiguredNode],
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
      className={`ws-canvas-wrap ${draggingNodeId ? "is-dragging" : ""} ${interactive ? "is-interactive" : "is-passive"} ${mode === "result" ? "is-result-mode" : ""}`}
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
          if (!interactive) {
            return;
          }
          if (skipNextNodeClickRef.current) {
            skipNextNodeClickRef.current = false;
            return;
          }
          setSelectedEdgeId("");
          setNodeActionMenu(null);
          onSelectNode(node.id);
        }}
        onNodeContextMenu={handleNodeContextMenu}
        onNodeDragStart={(_, node: Node) => {
          if (interactive) {
            setDraggingNodeId(node.id);
          }
        }}
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
        nodesDraggable={interactive}
        nodesConnectable={interactive}
        nodesFocusable={interactive}
        edgesFocusable={interactive}
        elementsSelectable={interactive}
        panOnDrag={interactive}
        panOnScroll={false}
        zoomOnScroll={interactive}
        zoomOnPinch={interactive}
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
        {interactive && showMiniMap && nodes.length > 0 ? (
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

      {interactive ? (
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
      ) : null}

      {interactive && nodes.length === 0 ? (
        <div className="ws-empty-note" role="note">
          <span className="ws-empty-action">
            <MousePointer2 size={16} />
            <strong>双击屏幕</strong>
          </span>
          <span className="ws-empty-copy">画布自由生成</span>
        </div>
      ) : null}

      {interactive && nodeActionMenu && actionNode ? (
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
  projectId,
  node,
  onAssetSaved,
  onClose,
}: {
  projectId: number;
  node: SpaceCanvasNode;
  onAssetSaved?: (asset: ProjectAsset) => void;
  onClose: () => void;
}) {
  const detailRich = nodeRichDocument(node);
  const displayOutput = nodeEnergonOutput(node);
  const detailText = displayTextFromOutput(
    displayOutput,
    node.description || "",
  );
  const [editableRich, setEditableRich] = useState(() => detailText);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setEditableRich(detailText);
  }, [detailText, node.id]);
  const preview = nodeDetailPreview(node);
  const typeLabel =
    node.subtitle || powerKindLabel(String(node.kind || node.type));
  const downloadUrl =
    preview.imageUrl || preview.videoUrl || preview.audioUrl || preview.fileUrl;
  const assetId = Number(node.asset?.id || 0);

  async function saveRichContent() {
    if (!assetId || assetId < 0) {
      toast.info("当前内容还不是后端资产，暂不能保存版本");
      return;
    }
    setSaving(true);
    try {
      const asset = await saveSpaceAssetVersion({
        projectId,
        assetId,
        content: parseEditableRichContent(editableRich),
      });
      onAssetSaved?.(asset);
      toast.success("资产版本已保存");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存资产失败");
    } finally {
      setSaving(false);
    }
  }

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
          ) : detailRich ? (
            <div className="ws-node-detail-editor">
              <RichDocumentView
                value={detailRich}
                className="ws-node-detail-output ws-node-detail-rich-preview"
              />
              <div className="ws-node-detail-editor-foot">
                <p>
                  {assetId > 0
                    ? "保存后会生成一个新的资产版本。"
                    : "当前内容还不是后端资产，暂不能保存版本。"}
                </p>
                <button type="button" disabled>
                  <Save size={15} />
                  <span>编辑待接入</span>
                </button>
              </div>
            </div>
          ) : EnergonContentView && hasDisplayOutput(displayOutput) ? (
            <div className="ws-node-detail-editor">
              <div className="ws-node-detail-output">
                <EnergonContentView output={displayOutput} emptyText="暂无详情" />
              </div>
              <div className="ws-node-detail-editor-foot">
                <p>
                  {assetId > 0
                    ? "保存后会生成一个新的资产版本。"
                    : "当前内容还不是后端资产，暂不能保存版本。"}
                </p>
                <button
                  type="button"
                  disabled
                  onClick={() => void saveRichContent()}
                >
                  <Save size={15} />
                  <span>编辑待接入</span>
                </button>
              </div>
            </div>
          ) : detailText ? (
            <div className="ws-node-detail-editor">
              <RichDocumentEditor
                value={editableRich}
                onChange={setEditableRich}
              />
              <div className="ws-node-detail-editor-foot">
                <p>
                  {assetId > 0
                    ? "保存后会生成一个新的资产版本。"
                    : "当前内容还不是后端资产，暂不能保存版本。"}
                </p>
                <button
                  type="button"
                  disabled={saving || assetId <= 0}
                  onClick={() => void saveRichContent()}
                >
                  {saving ? <Loader2 size={15} className="ws-spin" /> : <Save size={15} />}
                  <span>{saving ? "保存中" : "保存版本"}</span>
                </button>
              </div>
            </div>
          ) : (
            <pre>{detailText || "暂无详情"}</pre>
          )}
        </div>
      </section>
    </div>
  );
}

function parseEditableRichContent(value: string) {
  const parsed = parseMaybeJSON(value);
  const rich = safeRichDocument(parsed);
  return rich || plainTextToRichDocument(value);
}

function CanvasConfirmDialog({
  request,
  onClose,
}: {
  request: ConfirmRequest;
  onClose: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  async function confirm() {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    const action = request.onConfirm;
    onClose();
    try {
      void Promise.resolve(action()).catch((err) => {
        toast.error(err instanceof Error ? err.message : "操作失败");
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    }
  }
  return (
    <div
      className="ws-confirm-backdrop"
      role="dialog"
      aria-modal="true"
      onMouseDown={onClose}
    >
      <section
        className="ws-confirm-card"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="ws-confirm-copy">
          <h3>{request.title}</h3>
          <p>{request.description}</p>
        </div>
        <div className="ws-confirm-actions">
          <button type="button" disabled={submitting} onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className={request.tone === "danger" ? "is-danger" : "is-primary"}
            disabled={submitting}
            onClick={() => void confirm()}
          >
            {submitting ? "处理中..." : request.confirmText || "确认"}
          </button>
        </div>
      </section>
    </div>
  );
}

function plainTextToRichDocument(value: string) {
  const blocks = String(value || "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  return {
    type: "doc",
    content: (blocks.length > 0 ? blocks : [""]).map((block) => ({
      type: "paragraph",
      content: block
        ? [
            {
              type: "text",
              text: block,
            },
          ]
        : [],
    })),
  };
}

function RichDocumentEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      className="ws-rich-document-editor"
      value={value}
      placeholder="编辑内容"
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function RichDocumentView({
  value,
  className,
}: {
  value: ReturnType<typeof richDocument>;
  className?: string;
}) {
  if (!value) {
    return null;
  }
  return (
    <div className={className}>
      {renderRichDocumentNodes(value.content || [], "root")}
    </div>
  );
}

function renderRichDocumentNodes(nodes: any[], keyPrefix: string): ReactNode {
  return nodes.map((node, index) =>
    renderRichDocumentNode(node, `${keyPrefix}-${index}`),
  );
}

function renderRichDocumentNode(node: any, key: string): ReactNode {
  const children = renderRichDocumentNodes(node?.content || [], key);
  switch (node?.type) {
    case "heading": {
      const level = Math.min(Math.max(Number(node.attrs?.level || 2), 1), 6);
      const HeadingTag = richHeadingTag(level);
      return <HeadingTag key={key}>{children}</HeadingTag>;
    }
    case "paragraph":
      return <p key={key}>{children}</p>;
    case "bulletList":
      return <ul key={key}>{children}</ul>;
    case "orderedList":
      return <ol key={key}>{children}</ol>;
    case "listItem":
      return <li key={key}>{children}</li>;
    case "blockquote":
      return <blockquote key={key}>{children}</blockquote>;
    case "hardBreak":
      return <br key={key} />;
    case "horizontalRule":
      return <hr key={key} />;
    case "text":
      return renderRichTextNode(node, key);
    case "editorMediaImage":
      return node.attrs?.src ? (
        <img key={key} src={String(node.attrs.src)} alt={String(node.attrs.alt || "")} />
      ) : null;
    default:
      return children;
  }
}

function renderRichTextNode(node: any, key: string): ReactNode {
  let content: ReactNode = node.text || "";
  for (const mark of node.marks || []) {
    switch (mark?.type) {
      case "bold":
        content = <strong key={`${key}-bold`}>{content}</strong>;
        break;
      case "italic":
        content = <em key={`${key}-italic`}>{content}</em>;
        break;
      case "strike":
        content = <s key={`${key}-strike`}>{content}</s>;
        break;
      case "code":
        content = <code key={`${key}-code`}>{content}</code>;
        break;
      case "link": {
        const href = String(mark.attrs?.href || "");
        content = href ? (
          <a key={`${key}-link`} href={href} target="_blank" rel="noreferrer">
            {content}
          </a>
        ) : (
          content
        );
        break;
      }
      default:
        break;
    }
  }
  return <Fragment key={key}>{content}</Fragment>;
}

function richHeadingTag(level: number) {
  const tags = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;
  return tags[level - 1] || "h2";
}

function safeRichDocument(value: any): ReturnType<typeof richDocument> {
  try {
    return richDocument(value);
  } catch {
    return null;
  }
}

function safeDocumentText(value: any) {
  try {
    return documentText(value);
  } catch {
    return "";
  }
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

function currentNodeFeedbackRecords(node?: SpaceCanvasNode | null) {
  const records = Array.isArray((node as any)?.feedbackRequests)
    ? ((node as any).feedbackRequests as NodeFeedbackRecord[])
    : [];
  return records.filter((record) => record && record.id);
}

function createNodeFeedbackRecord(
  node: SpaceCanvasNode,
  prompt: FlowFeedbackPrompt,
): NodeFeedbackRecord {
  const approvalId = Number(prompt.approval?.id || 0);
  return {
    id: `${node.id}:${approvalId || Date.now()}:${Math.random()
      .toString(36)
      .slice(2, 7)}`,
    nodeId: node.id,
    title: prompt.title || node.title || "补充信息",
    description: prompt.description || "",
    prompt,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
}

function submitNodeFeedbackRecord(
  records: NodeFeedbackRecord[],
  recordId: string,
  values: Record<string, unknown>,
) {
  return records.map((record) =>
    record.id === recordId
      ? {
          ...record,
          values,
          prompt: {
            ...record.prompt,
            values,
          },
          status: "submitted" as const,
          submittedAt: new Date().toISOString(),
        }
      : record,
  );
}

function isReadonlyFeedbackRecord(
  current: { node: SpaceCanvasNode; recordId: string } | null,
  nodes: SpaceCanvasNode[],
  pending: { nodeId: string; recordId: string } | null,
) {
  if (!current) {
    return false;
  }
  const node =
    nodes.find((item) => item.id === current.node.id) || current.node;
  const record = currentNodeFeedbackRecords(node).find(
    (item) => item.id === current.recordId,
  );
  if (!record) {
    return false;
  }
  return !(
    record.status === "pending" &&
    pending?.nodeId === current.node.id &&
    pending.recordId === current.recordId
  );
}

function buildGeneratedNodeResultPatch(
  node: SpaceCanvasNode,
  result: any,
  fallbackPrompt: string,
): Partial<SpaceCanvasNode> {
  const rawOutput = firstDefined(
    result?.output,
    result?.version?.content,
    result?.asset?.version?.content,
    result?.data?.output,
    result?.data?.content,
    result?.data?.result,
    result?.data,
  );
  const fixedRichOutput = fixedTiptapRichOutput(rawOutput);
  const output = fixedRichOutput || extractDisplayOutput(rawOutput);
  const preview = generatedPreviewFromValue(
    output,
    String(node.power?.kind || node.kind || ""),
  );
  const summary =
    safeDocumentText(output) ||
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

async function waitForFlowCompletion(
  projectId: number,
  run: { runId?: number; requestId?: string },
): Promise<FlowRunSnapshot> {
  let lastSnapshot: FlowRunSnapshot | null = null;
  for (let index = 0; index < 60; index += 1) {
    const status = await fetchSpaceRunStatus({
      projectId,
      runId: run.runId || 0,
      requestId: run.requestId || "",
    });
    const snapshot = normalizeFlowRunSnapshot(status);
    lastSnapshot = snapshot;
    if (
      snapshot.status === "success" ||
      snapshot.status === "fail" ||
      snapshot.status === "canceled" ||
      isFlowWaitingSnapshot(snapshot)
    ) {
      return snapshot;
    }
    await delay(900);
  }
  return (
    lastSnapshot || {
      runId: Number(run.runId || 0),
      requestId: String(run.requestId || ""),
      status: "running",
      output: null,
      error: "流程仍在运行，请稍后刷新查看结果",
      approvals: [],
      raw: {},
    }
  );
}

function normalizeFlowRunSnapshot(value: any): FlowRunSnapshot {
  const run = value?.run || value?.data?.run || value || {};
  const approvals = Array.isArray(value?.approvals)
    ? value.approvals
    : Array.isArray(value?.data?.approvals)
      ? value.data.approvals
      : [];
  return {
    runId: Number(run?.id || value?.run_id || 0),
    requestId: String(run?.request_id || value?.request_id || ""),
    status: String(run?.status || value?.status || "running"),
    output: firstDefined(run?.output, value?.output, value?.data?.output),
    error: String(run?.error || value?.error || ""),
    approvals: approvals.map(normalizeFlowApproval).filter(Boolean),
    raw: value,
  };
}

function normalizeFlowApproval(value: any): FlowApproval {
  const content = value?.content && typeof value.content === "object"
    ? value.content
    : {};
  return {
    id: Number(value?.id || value?.approval_id || 0),
    title: String(value?.title || ""),
    status: String(value?.status || ""),
    decision: String(value?.decision || ""),
    content,
  };
}

function flowFeedbackFromSnapshot(
  snapshot: FlowRunSnapshot,
): FlowFeedbackPrompt | null {
  const approval = snapshot.approvals.find(isPendingFlowApproval);
  if (!approval?.id) {
    return null;
  }
  const interaction = flowApprovalInteraction(approval);
  const fields = flowFeedbackFields(interaction);
  return {
    approval,
    title: firstText(interaction.title, approval.title, "补充信息"),
    description: firstText(interaction.description, "补充信息后继续执行流程。"),
    fields,
    values: flowFeedbackInitialValues(interaction, fields),
  };
}

function isPendingFlowApproval(approval: FlowApproval) {
  return approval.status === "pending" || approval.decision === "pending";
}

function isFlowWaitingSnapshot(snapshot: FlowRunSnapshot) {
  return (
    snapshot.status === "waiting" ||
    snapshot.approvals.some(isPendingFlowApproval)
  );
}

function flowApprovalInteraction(approval: FlowApproval) {
  const content = approval.content || {};
  const interaction = content.interaction;
  return interaction && typeof interaction === "object" ? interaction : content;
}

function flowFeedbackFields(interaction: Record<string, any>): PowerParam[] {
  const fields = Array.isArray(interaction.fields)
    ? interaction.fields
    : Array.isArray(interaction.params)
      ? interaction.params
      : [];
  return fields
    .map((field, index) => normalizeFeedbackField(field, index))
    .filter((field): field is PowerParam => Boolean(field.key));
}

function normalizeFeedbackField(value: any, index: number): PowerParam {
  const options = Array.isArray(value?.options) ? value.options : [];
  return {
    id: Number(value?.id || index + 1),
    name: String(value?.name || value?.label || value?.title || value?.key || ""),
    key: String(value?.key || value?.name || `field_${index + 1}`),
    type: String(value?.type || "input"),
    value_type: value?.value_type || value?.valueType || "string",
    default_value: String(value?.default_value || value?.defaultValue || ""),
    required: Boolean(value?.required),
    options: options.map((option: any, optionIndex: number) => ({
      id: Number(option?.id || optionIndex + 1),
      name: String(option?.name || option?.label || option?.value || ""),
      value: String(option?.value || option?.id || option?.label || option?.name || ""),
      sort: Number(option?.sort || optionIndex + 1),
    })),
  };
}

function flowFeedbackInitialValues(
  interaction: Record<string, any>,
  fields: PowerParam[],
) {
  const values = defaultPowerParamValues(fields);
  const source =
    interaction.values && typeof interaction.values === "object"
      ? interaction.values
      : {};
  return {
    ...values,
    ...source,
  };
}

function agentFeedbackFromResult(
  result: any,
  title: string,
): FlowFeedbackPrompt | null {
  const interaction = agentInteractionFromResult(result);
  if (!interaction) {
    return null;
  }
  const fields = flowFeedbackFields(interaction);
  return {
    approval: {
      id: 0,
      title,
      status: "pending",
      decision: "pending",
      content: { kind: "agent_interaction", interaction },
    },
    title: firstText(interaction.title, title, "补充信息"),
    description: firstText(interaction.description, "补充信息后继续执行智能体。"),
    fields,
    values: flowFeedbackInitialValues(interaction, fields),
  };
}

function agentInteractionFromResult(result: any): Record<string, any> | null {
  const output = firstMap(
    result?.output,
    result?.data?.output,
    result?.content,
    result,
  );
  if (!output) {
    return null;
  }
  if (!String(output.event || "").toLowerCase().includes("interaction")) {
    const topLevelInteraction = firstMap(result?.interaction);
    return topLevelInteraction && firstText(topLevelInteraction.type)
      ? topLevelInteraction
      : null;
  }
  const interaction = firstMap(output.interaction, output.content?.interaction);
  return interaction && firstText(interaction.type) ? interaction : null;
}

function firstMap(...values: any[]): Record<string, any> | null {
  for (const value of values) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, any>;
    }
  }
  return null;
}

function canvasAgentMemoryKey(input: {
  projectId: number;
  assetCateId?: number;
  nodeId: string;
  agentId: number;
}) {
  return [
    input.projectId || 0,
    input.assetCateId || 0,
    input.nodeId || "",
    input.agentId || 0,
  ].join(":");
}

function readCanvasAgentMemory(key: string) {
  return canvasAgentMemoryStore.get(key) || [];
}

function appendCanvasAgentMemory(key: string, entries: AgentMemoryEntry[]) {
  if (!key || entries.length === 0) {
    return;
  }
  const current = readCanvasAgentMemory(key);
  canvasAgentMemoryStore.set(key, [...current, ...entries].slice(-12));
}

function normalizeComposerDraft(value: unknown): ComposerDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { prompt: "", paramValues: {}, selectedTargetId: 0 };
  }
  const row = value as Record<string, unknown>;
  const paramValues =
    row.paramValues &&
    typeof row.paramValues === "object" &&
    !Array.isArray(row.paramValues)
      ? (row.paramValues as Record<string, unknown>)
      : {};
  return {
    prompt: typeof row.prompt === "string" ? row.prompt : "",
    paramValues,
    selectedTargetId: numericDraftValue(row.selectedTargetId),
  };
}

function readNodeComposerDraft(node: SpaceCanvasNode): ComposerDraft {
  return normalizeComposerDraft((node as any).composerDraft);
}

function mergeSavedComposerParamValues(
  params: PowerParam[],
  draft: ComposerDraft,
) {
  const values = defaultPowerParamValues(params);
  const savedValues = draft.paramValues || {};
  for (const param of params) {
    if (
      param.key &&
      Object.prototype.hasOwnProperty.call(savedValues, param.key)
    ) {
      values[param.key] = savedValues[param.key];
    }
  }
  return values;
}

function numericDraftValue(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function agentMemoryEntry(
  role: AgentMemoryEntry["role"],
  text: string,
  data?: unknown,
): AgentMemoryEntry {
  return {
    role,
    text,
    data,
    createdAt: new Date().toISOString(),
  };
}

function agentOutputMemoryText(result: unknown) {
  const preview = extractDisplayOutput(result);
  return firstText(
    preview.text,
    safeDocumentText(result),
    safeJSONString(result),
  );
}

function safeJSONString(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

type CanvasStartRunInput = {
  projectId: number;
  assetCate: AssetCate;
  space: SpaceBootstrap;
  startNode: SpaceCanvasNode;
  nodes: SpaceCanvasNode[];
  edges: SpaceCanvasEdge[];
  onNodeResult: NodeResultSetter;
  onAssetCreated: (asset: ProjectAsset) => void;
  setRunningNode: RunningNodeSetter;
  requestFlowFeedback?: FlowFeedbackRequester;
};

async function runCanvasFromStartNode(input: CanvasStartRunInput) {
  const graph = buildCanvasExecutionGraph(input.nodes, input.edges);
  const firstTargets = graph.outgoing.get(input.startNode.id) || [];
  if (firstTargets.length === 0) {
    throw new Error("开始节点没有连接后续节点");
  }
  let executed = 0;
  for (const targetId of firstTargets) {
    executed += await runCanvasExecutionPath(input, graph, targetId, new Set());
  }
  input.onNodeResult(
    input.startNode.id,
    buildGeneratedNodeResultPatch(
      input.startNode,
      { output: `已启动 ${executed} 个连接节点` },
      "开始",
    ),
  );
}

async function runCanvasExecutionPath(
  input: CanvasStartRunInput,
  graph: CanvasExecutionGraph,
  nodeId: string,
  visited: Set<string>,
): Promise<number> {
  if (visited.has(nodeId)) {
    return 0;
  }
  visited.add(nodeId);
  const node = graph.nodes.get(nodeId);
  if (!node) {
    return 0;
  }
  const result = await runCanvasExecutionNode(input, graph, node);
  const shouldStop =
    node.type === "function" &&
    (node.functionOption?.key === "save" ||
      node.functionOption?.key === "display");
  if (shouldStop) {
    return result.executed;
  }
  let executed = result.executed;
  for (const targetId of graph.outgoing.get(node.id) || []) {
    executed += await runCanvasExecutionPath(
      input,
      graph,
      targetId,
      new Set(visited),
    );
  }
  return executed;
}

type CanvasExecutionGraph = {
  nodes: Map<string, SpaceCanvasNode>;
  edges: Array<{ source: string; target: string }>;
  outgoing: Map<string, string[]>;
};

function buildCanvasExecutionGraph(
  nodes: SpaceCanvasNode[],
  edges: SpaceCanvasEdge[],
): CanvasExecutionGraph {
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    if (!edge.from || !edge.to) {
      continue;
    }
    outgoing.set(edge.from, [...(outgoing.get(edge.from) || []), edge.to]);
  }
  return {
    nodes: new Map(nodes.map((node) => [node.id, node])),
    edges: edges.map((edge) => ({ source: edge.from, target: edge.to })),
    outgoing,
  };
}

async function runCanvasExecutionNode(
  input: CanvasStartRunInput,
  graph: CanvasExecutionGraph,
  node: SpaceCanvasNode,
) {
  input.setRunningNode({
    nodeId: node.id,
    title: node.title,
    startedAt: Date.now(),
    progress: 0,
    status: "running",
  });
  try {
    const inputContext = buildNodeInputContext(node.id, input.nodes, graph.edges);
    const result = await executeCanvasNode(input, node, inputContext);
    if (result?.patch) {
      input.onNodeResult(node.id, result.patch);
      const patchedNode = {
        ...node,
        ...result.patch,
      };
      graph.nodes.set(node.id, patchedNode);
      input.nodes = input.nodes.map((item) =>
        item.id === node.id ? patchedNode : item,
      );
    }
    input.setRunningNode((current) =>
      current?.nodeId === node.id
        ? { ...current, progress: 100, status: "success" }
        : current,
    );
    window.setTimeout(() => {
      input.setRunningNode((current) =>
        current?.nodeId === node.id ? null : current,
      );
    }, 450);
    return { executed: result?.count || 1 };
  } catch (err) {
    input.setRunningNode((current) =>
      current?.nodeId === node.id
        ? { ...current, progress: 92, status: "error" }
        : current,
    );
    window.setTimeout(() => {
      input.setRunningNode((current) =>
        current?.nodeId === node.id ? null : current,
      );
    }, 900);
    throw err;
  }
}

async function executeCanvasNode(
  input: CanvasStartRunInput,
  node: SpaceCanvasNode,
  inputContext: NodeInputContext | null,
) {
  if (node.type === "power" && node.power) {
    const draft = readNodeComposerDraft(node);
    const prompt = promptWithInputContext(draft.prompt || "", inputContext);
    const result = await runSpacePower({
      projectId: input.projectId,
      flowId: node.flow?.id || 0,
      nodeKey: node.id,
      nodeName: node.title,
      kind: node.power.kind,
      powerId: node.power.id,
      powerKey: node.power.key,
      sourceTargetId: draft.selectedTargetId || 0,
      prompt,
      params: withNodeInputContext(draft.paramValues || {}, inputContext),
    });
    return {
      patch: buildGeneratedNodeResultPatch(node, result, prompt),
      count: 1,
    };
  }
  if (node.type === "agent" && node.role) {
    const agentId = Number(node.role.agent_id || 0);
    if (agentId <= 0) {
      throw new Error("当前团队角色未绑定智能体");
    }
    const draft = readNodeComposerDraft(node);
    const files = Array.isArray(draft.paramValues?.files)
      ? draft.paramValues.files
      : [];
    const prompt = promptWithInputContext(draft.prompt || "", inputContext);
    const memoryKey = canvasAgentMemoryKey({
      projectId: input.projectId,
      assetCateId: Number(node.assetCateId || input.assetCate.id || 0),
      nodeId: node.id,
      agentId,
    });
    const result = await runSpaceAgent({
      projectId: input.projectId,
      flowId: node.flow?.id || 0,
      nodeKey: node.id,
      nodeName: node.title,
      agentId,
      prompt,
      files,
      context: inputContext?.sources || [],
      history: readCanvasAgentMemory(memoryKey),
    });
    if (agentFeedbackFromResult(result, node.title)) {
      throw new Error(`${node.title} 需要补充信息，请单独运行该节点`);
    }
    appendCanvasAgentMemory(memoryKey, [
      agentMemoryEntry("user", prompt),
      agentMemoryEntry("assistant", agentOutputMemoryText(result), result),
    ]);
    return {
      patch: buildGeneratedNodeResultPatch(node, result, prompt),
      count: 1,
    };
  }
  if (node.type === "flow" && node.flow) {
    const prompt = promptWithInputContext("", inputContext);
    const started = await runSpaceFlow(
      input.projectId,
      Number(node.assetCateId || input.assetCate.id || 0),
      node.flow,
      prompt,
      withNodeInputContext({}, inputContext),
    );
    const startedSnapshot = await waitForFlowCompletion(input.projectId, {
      runId: Number(started?.run_id || 0),
      requestId: String(started?.request_id || ""),
    });
    const snapshot = await resolveCanvasFlowFeedback(
      input,
      node,
      startedSnapshot,
    );
    if (snapshot.status === "fail" || snapshot.status === "canceled") {
      throw new Error(snapshot.error || "流程运行失败");
    }
    if (snapshot.status !== "success") {
      throw new Error(snapshot.error || "流程仍在运行，请稍后刷新查看结果");
    }
    const asset =
      latestAssetFromStatus(snapshot, Number(node.assetCateId || 0)) ||
      (await latestGeneratedAsset(
        input.projectId,
        Number(node.assetCateId || input.assetCate.id || 0),
        snapshot.runId,
      ));
    if (asset && asset.id > 0) {
      const normalizedAsset = normalizeRichAssetVersionContent(asset);
      input.onAssetCreated(normalizedAsset);
      return {
        patch: buildGeneratedNodeResultPatch(
          node,
          {
            output: normalizedAsset.version?.content,
            asset: normalizedAsset,
            version: normalizedAsset.version,
          },
          prompt,
        ),
        count: 1,
      };
    }
    return {
      patch: buildGeneratedNodeResultPatch(
        node,
        { output: snapshot.output },
        prompt,
      ),
      count: 1,
    };
  }
  if (node.type === "function") {
    return executeCanvasFunctionNode(input, node, inputContext);
  }
  return { count: 0 };
}

async function resolveCanvasFlowFeedback(
  input: CanvasStartRunInput,
  node: SpaceCanvasNode,
  snapshot: FlowRunSnapshot,
) {
  let currentSnapshot = snapshot;
  while (isFlowWaitingSnapshot(currentSnapshot)) {
    const feedback = flowFeedbackFromSnapshot(currentSnapshot);
    if (!feedback || !input.requestFlowFeedback) {
      throw new Error(`${node.title} 需要补充信息，请单独运行该节点`);
    }
    if (!feedback.approval.id) {
      throw new Error(`${node.title} 缺少反馈审批 ID`);
    }
    const values = await input.requestFlowFeedback({ node, prompt: feedback });
    const submitted = await submitSpaceApproval({
      projectId: input.projectId,
      approvalId: feedback.approval.id,
      data: values,
    });
    currentSnapshot = await waitForFlowCompletion(input.projectId, {
      runId: Number(submitted?.run_id || currentSnapshot.runId || 0),
      requestId: String(
        submitted?.request_id || currentSnapshot.requestId || "",
      ),
    });
  }
  return currentSnapshot;
}

async function executeCanvasFunctionNode(
  input: CanvasStartRunInput,
  node: SpaceCanvasNode,
  inputContext: NodeInputContext | null,
) {
  const optionKey = node.functionOption?.key || "";
  if (optionKey === "display") {
    const output = inputContextOutput(inputContext);
    if (output == null) {
      throw new Error("展示节点没有可展示的上游结果");
    }
    return {
      patch: buildGeneratedNodeResultPatch(
        node,
        { output },
        "展示上游结果",
      ),
      count: 1,
    };
  }
  if (optionKey === "save") {
    const output = inputContextOutput(inputContext);
    if (output == null) {
      throw new Error("保存节点没有可保存的上游结果");
    }
    const asset = await saveSpaceCanvasAsset({
      projectId: input.projectId,
      assetCateId: Number(node.assetCateId || input.assetCate.id || 0),
      name: functionAssetName(node, inputContext),
      kind: String(node.kind || input.assetCate.kind || ""),
      content: output,
    });
    input.onAssetCreated(asset);
    return {
      patch: buildGeneratedNodeResultPatch(
        node,
        {
          output: asset.version?.content || output,
          asset,
          version: asset.version,
        },
        "保存上游结果",
      ),
      count: 1,
    };
  }
  if (optionKey === "start") {
    return { count: 0 };
  }
  if (optionKey === "import") {
    return { count: 0 };
  }
  return {
    patch: buildGeneratedNodeResultPatch(node, { output: "操作已应用" }, "执行"),
    count: 1,
  };
}

function latestAssetFromStatus(
  snapshot: FlowRunSnapshot,
  assetCateId: number,
): ProjectAsset | null {
  const assets = Array.isArray(snapshot.raw?.assets)
    ? snapshot.raw.assets
    : Array.isArray(snapshot.raw?.data?.assets)
      ? snapshot.raw.data.assets
      : [];
  return latestAssetCandidate(assets, assetCateId, snapshot.runId);
}

async function latestGeneratedAsset(
  projectId: number,
  assetCateId: number,
  runId: number,
) {
  if (runId <= 0) {
    return null;
  }
  const assets = await fetchSpaceBootstrapAssets(projectId);
  return latestAssetCandidate(assets, assetCateId, runId);
}

function latestAssetCandidate(
  assets: ProjectAsset[],
  assetCateId: number,
  runId: number,
) {
  if (runId <= 0) {
    return null;
  }
  const runCandidates = assets.filter((asset) => {
    if (Number(asset.version?.run_id || 0) !== runId) {
      return false;
    }
    return true;
  });
  const candidates = runCandidates.filter((asset) => {
    if (assetCateId > 0 && Number(asset.asset_cate_id || 0) !== assetCateId) {
      return false;
    }
    return true;
  });
  const matched = candidates.length > 0 ? candidates : runCandidates;
  return (
    matched.sort(
      (left, right) =>
        Number(right.version_id || right.id || 0) -
        Number(left.version_id || left.id || 0),
    )[0] || null
  );
}

function normalizeRichAssetVersionContent(asset: ProjectAsset): ProjectAsset {
  const content = asset.version?.content;
  const richOutput = fixedTiptapRichOutput(content);
  if (!richOutput || !asset.version) {
    return asset;
  }
  return {
    ...asset,
    version: {
      ...asset.version,
      content: richOutput,
    },
  };
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function generatedNodePreview(node: SpaceCanvasNode): GeneratedNodePreview {
  const stored = (node as any).generatedPreview;
  if (stored && typeof stored === "object") {
    const storedText = String(stored.text || "");
    const preview = {
      text: storedText,
      imageUrl: String(stored.imageUrl || ""),
      videoUrl: String(stored.videoUrl || ""),
      audioUrl: String(stored.audioUrl || ""),
      fileUrl: String(stored.fileUrl || ""),
    };
    const normalizedText = displayTextFromOutput(
      nodeContextOutput(node),
      preview.text || node.description,
    );
    if (normalizedText) {
      preview.text = normalizedText;
    } else if (looksLikeStructuredJSONSnippet(storedText)) {
      preview.text = "";
    }
    if (hasGeneratedPreview(preview)) {
      return preview;
    }
  }
  if (node.type !== "asset" && stored && typeof stored === "object") {
    const preview = {
      text: displayTextFromOutput(nodeContextOutput(node), node.description),
      imageUrl: "",
      videoUrl: "",
      audioUrl: "",
      fileUrl: "",
    };
    return preview;
  }
  const output =
    node.type === "asset"
      ? nodeContextOutput(node)
      : firstDefined(
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
    preview.text = displayTextFromOutput(
      nodeContextOutput(node),
      node.description,
    );
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
    assetPreview.text = displayTextFromOutput(
      nodeContextOutput(node),
      node.description,
    );
  }
  return assetPreview;
}

function nodeRichDocument(node: SpaceCanvasNode) {
  return fixedTiptapRichDocumentFromNode(node) || richDocumentFromNode(node);
}

function nodeEnergonOutput(node: SpaceCanvasNode) {
  const rich = fixedTiptapRichDocumentFromNode(node);
  if (rich) {
    const output = { rich };
    return normalizeEnergonOutput?.(output) ?? output;
  }
  return firstDisplayOutput(
    node.asset?.version?.content,
    (node as any).asset?.version?.content,
    (node as any).version?.content,
    (node as any).generatedOutput,
    (node as any).output,
    (node as any).result?.output,
    node.description,
    (node as any).generatedPreview?.text,
  );
}

function fixedTiptapRichDocumentFromNode(node: SpaceCanvasNode) {
  return firstTiptapRichDocument(
    node.asset?.version?.content,
    (node as any).asset?.version?.content,
    (node as any).version?.content,
    (node as any).generatedOutput,
    (node as any).output,
    (node as any).result?.output,
    node.description,
    (node as any).generatedPreview?.text,
  );
}

function firstTiptapRichDocument(...values: any[]) {
  for (const value of values) {
    const rich = fixedTiptapRichDocument(value);
    if (rich) {
      return rich;
    }
  }
  return null;
}

function firstDisplayOutput(...values: any[]) {
  for (const value of values) {
    const output = normalizeEnergonDisplayOutput(value);
    if (hasDisplayOutput(output)) {
      return output;
    }
  }
  return "";
}

function normalizeEnergonDisplayOutput(value: any): any {
  const parsed = parseMaybeJSON(value);
  const agentResult = parseAgentResultBlock(parsed);
  if (agentResult !== parsed) {
    return normalizeEnergonDisplayOutput(agentResult);
  }
  const fixedRichOutput = fixedTiptapRichOutput(parsed);
  if (fixedRichOutput) {
    return normalizeEnergonOutput?.(fixedRichOutput) ?? fixedRichOutput;
  }
  const canvasOutput = normalizeDisplayOutputForCanvas(value);
  if (canvasOutput !== parsed && hasDisplayOutput(canvasOutput)) {
    return canvasOutput;
  }
  const protocolOutput =
    normalizeAgentResultOutputValue?.(parsed) ?? parsed;
  const output = normalizeEnergonDisplayValue(protocolOutput, new Set());
  if (hasDisplayOutput(output)) {
    return output;
  }
  if (protocolOutput !== parsed) {
    return normalizeEnergonDisplayValue(parsed, new Set());
  }
  return "";
}

function normalizeEnergonDisplayValue(value: any, seen: Set<any>): any {
  const parsed = parseMaybeJSON(value);
  const agentResult = parseAgentResultBlock(parsed);
  if (agentResult !== parsed) {
    return normalizeEnergonDisplayValue(agentResult, seen);
  }
  const fixedRichOutput = fixedTiptapRichOutput(parsed);
  if (fixedRichOutput) {
    return normalizeEnergonOutput?.(fixedRichOutput) ?? fixedRichOutput;
  }
  if (typeof parsed === "string") {
    const fixedOutput = fixedRichDisplayOutput(parsed);
    if (hasDisplayOutput(fixedOutput)) {
      return fixedOutput;
    }
    const looseText = looseRichJSONText(parsed);
    if (looseText) {
      return { text: looseText };
    }
    return looksLikeStructuredJSONSnippet(parsed) ? "" : parsed;
  }
  if (Array.isArray(parsed)) {
    const output = parsed
      .map((item) => normalizeEnergonDisplayValue(item, seen))
      .filter(hasDisplayOutput);
    return output.length > 0 ? output : "";
  }
  if (!parsed || typeof parsed !== "object") {
    return parsed;
  }
  const rich = safeRichDocument(parsed);
  if (rich) {
    return { rich };
  }
  if (seen.has(parsed)) {
    return "";
  }
  seen.add(parsed);

  if (isDirectEnergonOutputObject(parsed)) {
    return parsed;
  }

  if (isAgentResultPayload(parsed)) {
    return normalizeAgentResultPayloadForEnergon(parsed);
  }

  const extracted = extractDisplayOutput(parsed);
  if (extracted !== parsed) {
    return normalizeEnergonDisplayValue(extracted, seen);
  }

  if (isAgentResultPayloadObject(parsed)) {
    return normalizeAgentResultPayloadForEnergon(parsed);
  }
  for (const key of ["output", "result", "data", "content", "json", "value"]) {
    if (!(key in parsed)) {
      continue;
    }
    const output = normalizeEnergonDisplayValue(parsed[key], seen);
    if (hasDisplayOutput(output)) {
      return output;
    }
  }
  if (isRunEnvelope(parsed)) {
    const text = firstText(parsed.message, parsed.error, parsed.status);
    return text ? { text } : "";
  }
  return hasMeaningfulObjectOutput(parsed) ? parsed : "";
}

function isAgentResultPayloadObject(value: any) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value.format ||
      value.result_mode ||
      value.rich ||
      value.images ||
      value.videos ||
      value.audios ||
      value.files)
  );
}

function normalizeAgentResultPayloadForEnergon(value: Record<string, any>) {
  const result: Record<string, any> = {};
  const rich = safeRichDocument(value);
  if (rich) {
    result.rich = rich;
  }
  const content = parseMaybeJSON(value.content);
  if (content && typeof content === "object" && !Array.isArray(content)) {
    copyEnergonOutputFields(result, content);
  }
  copyEnergonOutputFields(result, value);
  if (!hasDisplayOutput(result) && content && typeof content === "object") {
    return content;
  }
  return hasMeaningfulObjectOutput(result) ? result : "";
}

function normalizeDisplayOutputForCanvas(value: any): any {
  const agentResult = parseAgentResultBlock(value);
  if (agentResult !== value) {
    return normalizeDisplayOutputForCanvas(agentResult);
  }
  const fixedRichOutput = fixedTiptapRichOutput(value);
  if (fixedRichOutput) {
    return fixedRichOutput;
  }
  const fixedOutput = fixedRichDisplayOutput(value);
  if (hasDisplayOutput(fixedOutput)) {
    return fixedOutput;
  }
  const parsed = parseMaybeJSON(value);
  const rich = safeRichDocument(parsed);
  if (rich) {
    return { rich };
  }
  const extracted = extractDisplayOutput(parsed);
  if (extracted !== parsed) {
    const extractedRich = safeRichDocument(extracted);
    return extractedRich ? { rich: extractedRich } : extracted;
  }
  return parsed;
}

function fixedTiptapRichOutput(value: any): { rich: any } | null {
  const rich = fixedTiptapRichDocument(value);
  return rich ? { rich } : null;
}

function fixedTiptapRichDocument(value: any, seen = new Set<any>()): any {
  const parsed = parseMaybeJSON(value);
  const agentResult = parseAgentResultBlock(parsed);
  if (agentResult !== parsed) {
    return fixedTiptapRichDocument(agentResult, seen);
  }
  if (Array.isArray(parsed)) {
    if (seen.has(parsed)) {
      return null;
    }
    seen.add(parsed);
    for (const item of parsed) {
      const rich = fixedTiptapRichDocument(item, seen);
      if (rich) {
        return rich;
      }
    }
    return null;
  }
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  if (seen.has(parsed)) {
    return null;
  }
  seen.add(parsed);
  if (isRichDocumentLike(parsed)) {
    return fixedTiptapRichDocumentFromTextDoc(parsed, seen) || parsed;
  }
  const row = parsed as Record<string, any>;
  const candidates = [
    valueAtPath(row, ["output", "content", "rich"]),
    valueAtPath(row, ["output", "rich"]),
    valueAtPath(row, ["content", "rich"]),
    row.content,
    row.rich,
    row.text,
    row.summary,
  ];
  for (const candidate of candidates) {
    if (candidate === parsed) {
      continue;
    }
    const rich = fixedTiptapRichDocument(candidate, seen);
    if (rich) {
      return rich;
    }
  }
  return null;
}

function fixedTiptapRichDocumentFromTextDoc(
  doc: any,
  seen: Set<any>,
): any {
  const texts = collectTiptapTextValues(doc);
  for (const text of texts) {
    const rich = fixedTiptapRichDocumentFromStructuredText(text, seen);
    if (rich) {
      return rich;
    }
  }
  return fixedTiptapRichDocumentFromStructuredText(texts.join(""), seen);
}

function fixedTiptapRichDocumentFromStructuredText(
  value: string,
  seen: Set<any>,
): any {
  const text = String(value || "").trim();
  if (!looksLikeStructuredJSONSnippet(text)) {
    return null;
  }
  const parsedText = parseMaybeEmbeddedJSON(text);
  if (parsedText === text || parsedText === value) {
    return null;
  }
  return fixedTiptapRichDocument(parsedText, seen);
}

function collectTiptapText(value: any): string {
  return collectTiptapTextValues(value).join("");
}

function collectTiptapTextValues(value: any, seen = new Set<any>()): string[] {
  if (!value) {
    return [];
  }
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectTiptapTextValues(item, seen));
  }
  if (typeof value !== "object") {
    return [];
  }
  if (seen.has(value)) {
    return [];
  }
  seen.add(value);
  const values: string[] = [];
  if (typeof value.text === "string") {
    values.push(value.text);
  }
  if (Array.isArray(value.content)) {
    values.push(...collectTiptapTextValues(value.content, seen));
  }
  return values;
}

function parseMaybeEmbeddedJSON(value: string): any {
  const text = String(value || "").trim();
  const parsed = parseStructuredJSONText(text);
  if (parsed !== text) return parsed;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return value;
  }
  const sliced = text.slice(start, end + 1);
  const slicedParsed = parseStructuredJSONText(sliced);
  return slicedParsed === sliced ? value : slicedParsed;
}

function parseStructuredJSONText(value: string): any {
  const text = String(value || "").trim();
  const repaired = repairJSONControlChars(text);
  const unescaped = unescapeEscapedJSONQuotes(repaired);
  for (const source of uniqueNonEmptyStrings([text, repaired, unescaped])) {
    const parsed = parseMaybeJSON(source);
    if (parsed !== source) {
      return parsed;
    }
  }
  return value;
}

function repairJSONControlChars(value: string) {
  let result = "";
  let inString = false;
  let escaped = false;
  for (const char of value) {
    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      result += char;
      escaped = inString;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }
    if (inString && char.charCodeAt(0) < 32) {
      result += escapeJSONControlChar(char);
      continue;
    }
    result += char;
  }
  return result;
}

function escapeJSONControlChar(value: string) {
  switch (value) {
    case "\n":
      return "\\n";
    case "\r":
      return "\\r";
    case "\t":
      return "\\t";
    default:
      return `\\u${value.charCodeAt(0).toString(16).padStart(4, "0")}`;
  }
}

function unescapeEscapedJSONQuotes(value: string) {
  const text = value.trim();
  if (!text.includes('\\"') || (!text.startsWith("{") && !text.startsWith("["))) {
    return value;
  }
  return text.replace(/\\"/g, '"');
}

function uniqueNonEmptyStrings(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const text = String(value || "").trim();
    if (!text || seen.has(text)) {
      return false;
    }
    seen.add(text);
    return true;
  });
}

function fixedRichDisplayOutput(value: any): any {
  const rich = fixedRichDocument(value);
  if (rich) {
    return { rich };
  }
  const parsed = parseMaybeJSON(value);
  if (!parsed) {
    return "";
  }
  if (typeof parsed === "string") {
    const looseText = looseRichJSONText(parsed);
    return looseText ? { text: looseText } : "";
  }
  return "";
}

function fixedRichDocument(
  value: any,
  seen = new Set<any>(),
): ReturnType<typeof richDocument> {
  const parsed = parseMaybeJSON(value);
  if (isRichDocumentLike(parsed)) {
    return fixedTiptapRichDocumentFromTextDoc(parsed, seen) || parsed;
  }
  if (Array.isArray(parsed)) {
    return safeRichDocument(normalizeDisplayOutput(parsed));
  }
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  if (seen.has(parsed)) {
    return null;
  }
  seen.add(parsed);

  const row = parsed as Record<string, any>;
  const payloadRich = richDocumentFromPayload(row);
  if (payloadRich) {
    return payloadRich;
  }

  const fixedCandidates = [
    valueAtPath(row, ["output", "content", "rich"]),
    valueAtPath(row, ["output", "content"]),
    valueAtPath(row, ["output", "rich"]),
    valueAtPath(row, ["content", "output", "content", "rich"]),
    valueAtPath(row, ["content", "output", "content"]),
    valueAtPath(row, ["content", "rich"]),
    valueAtPath(row, ["data", "output", "content", "rich"]),
    valueAtPath(row, ["data", "output", "content"]),
    valueAtPath(row, ["data", "content", "rich"]),
    row.rich,
    row.output,
    row.result,
    row.content,
    row.data,
    row.value,
    row.json,
    row.text,
    row.message,
  ];

  for (const candidate of fixedCandidates) {
    if (candidate == null || candidate === parsed) {
      continue;
    }
    const candidateRich = fixedRichDocument(candidate, seen);
    if (candidateRich) {
      return candidateRich;
    }
  }

  for (const [key, candidate] of Object.entries(row)) {
    if (
      !isLikelyNestedResultKey(key) ||
      !candidate ||
      typeof candidate !== "object"
    ) {
      continue;
    }
    const candidateRich = fixedRichDocument(candidate, seen);
    if (candidateRich) {
      return candidateRich;
    }
  }

  return null;
}

function richDocumentFromPayload(
  payload: Record<string, any>,
): ReturnType<typeof richDocument> {
  if (isRichDocumentLike(payload)) {
    return payload;
  }
  if (
    Array.isArray(payload.content) &&
    (String(payload.format || "").toLowerCase() === "rich_json" ||
      payload.type === undefined)
  ) {
    return safeRichDocument({
      type: "doc",
      content: payload.content,
    });
  }
  if (
    String(payload.format || "").toLowerCase() === "rich_json" &&
    payload.rich != null
  ) {
    return fixedRichDocument(payload.rich);
  }
  return null;
}

function isRichDocumentLike(value: any): value is NonNullable<ReturnType<typeof richDocument>> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      value.type === "doc" &&
      Array.isArray(value.content),
  );
}

function copyEnergonOutputFields(
  target: Record<string, any>,
  source: Record<string, any>,
) {
  for (const key of [
    "format",
    "title",
    "text",
    "reasoning",
    "rich",
    "images",
    "videos",
    "audios",
    "files",
    "json",
    "error",
    "progress",
    "meta",
  ]) {
    if (hasDisplayOutput(source[key])) {
      target[key] =
        key === "rich" ? normalizeEnergonRichValue(source[key]) : source[key];
    }
  }
}

function normalizeEnergonRichValue(value: any) {
  const rich =
    fixedRichDocument(value) ||
    safeRichDocument(normalizeDisplayOutput(value)) ||
    safeRichDocument(value);
  return rich || value;
}

function hasMeaningfulObjectOutput(value: Record<string, any>) {
  return Object.entries(value).some(([key, item]) => {
    if (key.startsWith("_") || key === "format") {
      return false;
    }
    return hasDisplayOutput(item);
  });
}

function isDirectEnergonOutputObject(value: any) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  if (
    "output" in value ||
    "result" in value ||
    "data" in value ||
    "content" in value ||
    "kind" in value ||
    "event" in value
  ) {
    return false;
  }
  return [
    "text",
    "rich",
    "images",
    "videos",
    "audios",
    "files",
    "json",
    "error",
  ].some((key) => hasDisplayOutput(value[key]));
}

function hasDisplayOutput(value: any): boolean {
  if (value == null || value === "") {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0 && !looksLikeStructuredJSONSnippet(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some(hasDisplayOutput);
  }
  if (typeof value !== "object") {
    return false;
  }
  if (fixedRichDocument(value)) {
    return true;
  }
  if (isRunEnvelope(value as Record<string, any>)) {
    return false;
  }
  return hasMeaningfulObjectOutput(value);
}

function nodeDisplayText(node: SpaceCanvasNode) {
  return displayTextFromOutput(
    nodeContextOutput(node),
    node.description || node.title,
  );
}

function richDocumentFromNode(node: SpaceCanvasNode) {
  const candidates = [
    nodeContextOutput(node),
    (node as any).generatedPreview?.text,
    (node as any).generatedOutput,
    (node as any).output,
    (node as any).result?.output,
    (node as any).version?.content,
    (node as any).asset?.version?.content,
    node.asset?.version?.content,
    node.description,
  ];
  for (const candidate of candidates) {
    const rich =
      fixedRichDocument(candidate) ||
      safeRichDocument(normalizeDisplayOutputForCanvas(candidate)) ||
      safeRichDocument(extractDisplayOutput(candidate)) ||
      safeRichDocument(candidate);
    if (rich) {
      return rich;
    }
  }
  return null;
}

function displayTextFromOutput(value: any, fallback = "") {
  const output = extractDisplayOutput(value);
  const rich = safeRichDocument(output);
  const richText = rich ? safeDocumentText(rich) : "";
  if (richText) {
    return richText;
  }

  const text = safeDocumentText(output).trim();
  const looseText = looseRichJSONText(text);
  if (looseText) {
    return looseText;
  }
  if (text && !looksLikeStructuredJSONSnippet(text)) {
    return text;
  }
  if (looksLikeJSONText(text)) {
    const parsedText = safeDocumentText(extractDisplayOutput(parseMaybeJSON(text))).trim();
    if (parsedText && parsedText !== text) {
      return parsedText;
    }
  }

  const fallbackText = String(fallback || "").trim();
  const looseFallbackText = looseRichJSONText(fallbackText);
  if (looseFallbackText) {
    return looseFallbackText;
  }
  if (!looksLikeStructuredJSONSnippet(fallbackText)) {
    return fallbackText;
  }
  const parsedFallbackText = safeDocumentText(
    extractDisplayOutput(parseMaybeJSON(fallbackText)),
  ).trim();
  return parsedFallbackText && parsedFallbackText !== fallbackText
    ? parsedFallbackText
    : "";
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
  const normalizedValue = extractDisplayOutput(value);
  if (normalizedValue !== value) {
    fillGeneratedPreview(preview, normalizedValue, kind);
    return;
  }
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
  preview.text ||= displayTextFromOutput(value, "");
  preview.imageUrl ||= firstMediaText(
    row.image,
    row.url,
    firstArrayValue(row.images),
  );
  preview.videoUrl ||= firstMediaText(row.video, firstArrayValue(row.videos));
  preview.audioUrl ||= firstMediaText(row.audio, firstArrayValue(row.audios));
  preview.fileUrl ||= firstMediaText(row.file, firstArrayValue(row.files));

  if (!hasGeneratedPreview(preview)) {
    for (const key of ["output", "result", "content", "body", "data", "rich"]) {
      if (row[key] && typeof row[key] === "object") {
        fillGeneratedPreview(preview, row[key], kind);
        if (hasGeneratedPreview(preview)) {
          return;
        }
      }
    }
  }
  if (!preview.text && !hasGeneratedPreview(preview) && !isWrappedOutput(row)) {
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
  if (looksLikeJSONText(text)) {
    const parsedText = displayTextFromOutput(parseMaybeJSON(text), "");
    if (parsedText) {
      preview.text ||= parsedText;
    }
    return;
  }
  const looseText = looseRichJSONText(text);
  if (looseText) {
    preview.text ||= looseText;
    return;
  }
  const documentTextValue = safeDocumentText(text);
  if (documentTextValue && documentTextValue !== text) {
    preview.text ||= documentTextValue;
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

function isWrappedOutput(value: Record<string, any>) {
  return Boolean(
    value.output ||
      value.result ||
      value.content ||
      value.rich ||
      value.agent_run_id ||
      value.approval_id,
  );
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

function createSeedCanvasFromFlows(
  activeCate: AssetCate,
  flows: TeamFlow[],
): SpaceCanvasState {
  const nodes = flows.map((flow, index) =>
    createLocalNode("flow", activeCate, index, seedFlowNodePosition(index), {
      flow,
    }),
  );
  return normalizeCanvasForState(
    {
      assetCateId: activeCate.id,
      nodes,
      edges: [],
      viewport: {},
    },
    activeCate.id,
  );
}

function seedFlowNodePosition(index: number): CanvasPoint {
  return {
    x: 420 + (index % 3) * 260,
    y: 320 + Math.floor(index / 3) * 210,
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
        preview.text = displayTextFromOutput(output, node.description || node.title);
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
  if (node.type === "asset") {
    return extractDisplayOutput(firstDefined(
      node.asset?.version?.content,
      (node as any).asset?.version?.content,
      (node as any).version?.content,
      (node as any).generatedOutput,
      (node as any).output,
      (node as any).result?.output,
      node.description,
    ));
  }
  return extractDisplayOutput(firstDefined(
    (node as any).generatedOutput,
    (node as any).output,
    (node as any).result?.output,
    (node as any).version?.content,
    (node as any).asset?.version?.content,
    node.asset?.version?.content,
    node.description,
  ));
}

function extractDisplayOutput(value: any): any {
  const parsed = parseMaybeJSON(value);
  const agentResult = parseAgentResultBlock(parsed);
  if (agentResult !== parsed) {
    return extractDisplayOutput(agentResult);
  }
  const fixedRichOutput = fixedTiptapRichOutput(parsed);
  if (fixedRichOutput) {
    return fixedRichOutput.rich;
  }
  if (isRichDocumentLike(parsed)) {
    return parsed;
  }
  const rich = fixedRichDocument(parsed);
  if (rich) {
    return rich;
  }
  if (isDirectEnergonOutputObject(parsed)) {
    return parsed;
  }
  if (isAgentResultPayload(parsed)) {
    const output = normalizeAgentResultPayloadForEnergon(parsed);
    if (hasDisplayOutput(output)) {
      return output;
    }
  }
  return normalizeDisplayOutput(extractDisplayOutputInner(parsed, new Set()));
}

function extractDisplayOutputInner(value: any, seen: Set<any>): any {
  if (!value || typeof value !== "object") {
    return value;
  }
  if (seen.has(value)) {
    return value;
  }
  seen.add(value);

  const row = value as Record<string, any>;
  const directRich = directRichOutput(row);
  if (directRich !== undefined) {
    return directRich;
  }

  const nestedNodeOutput = firstNestedNodeOutput(row, seen);
  if (nestedNodeOutput !== undefined) {
    return nestedNodeOutput;
  }

  for (const path of displayOutputPaths) {
    const candidate = valueAtPath(row, path);
    if (candidate === undefined || candidate === value) {
      continue;
    }
    const normalized = extractDisplayOutputInner(parseMaybeJSON(candidate), seen);
    if (isDisplayOutputValue(normalized)) {
      return normalized;
    }
  }

  if (isRunEnvelope(row)) {
    for (const key of ["output", "result", "data", "body"]) {
      if (row[key] === undefined || row[key] === value) {
        continue;
      }
      const normalized = extractDisplayOutputInner(parseMaybeJSON(row[key]), seen);
      if (isDisplayOutputValue(normalized)) {
        return normalized;
      }
    }
  }

  return value;
}

function firstNestedNodeOutput(row: Record<string, any>, seen: Set<any>) {
  for (const [key, value] of Object.entries(row)) {
    if (!isLikelyNestedResultKey(key) || !value || typeof value !== "object") {
      continue;
    }
    const normalized = extractDisplayOutputInner(parseMaybeJSON(value), seen);
    if (isDisplayOutputValue(normalized)) {
      return normalized;
    }
  }
  return undefined;
}

function isLikelyNestedResultKey(key: string) {
  return /^(node|step|task|power|agent)[_-]?\d+$/i.test(key);
}

const displayOutputPaths = [
  ["output", "content", "rich"],
  ["output", "content"],
  ["output", "rich"],
  ["content", "output", "content", "rich"],
  ["content", "output", "content"],
  ["content", "output", "rich"],
  ["content", "data", "text"],
  ["content", "data", "content"],
  ["content", "rich"],
  ["content", "text"],
  ["data", "output", "content", "rich"],
  ["data", "output", "content"],
  ["data", "content", "rich"],
  ["data", "content"],
  ["rich"],
] as const;

function directRichOutput(row: Record<string, any>) {
  const payloadRich = richDocumentFromPayload(row);
  if (payloadRich) {
    return payloadRich;
  }
  if (String(row.result_mode || "").toLowerCase() === "inline" && row.content != null) {
    const content = parseMaybeJSON(row.content);
    if (content && typeof content === "object") {
      const rich = directRichOutput(content as Record<string, any>);
      if (rich !== undefined) {
        return rich;
      }
    }
  }
  return undefined;
}

function normalizeDisplayOutput(value: any) {
  const parsed = parseMaybeJSON(value);
  if (
    parsed &&
    typeof parsed === "object" &&
    !Array.isArray(parsed) &&
    !parsed.type &&
    Array.isArray(parsed.content)
  ) {
    return {
      type: "doc",
      content: parsed.content,
    };
  }
  if (Array.isArray(parsed)) {
    return {
      type: "doc",
      content: parsed,
    };
  }
  return parsed;
}

function isRunEnvelope(row: Record<string, any>) {
  return Boolean(
    row.agent_run_id ||
      row.approval_id ||
      row.node_run_id ||
      row.request_id ||
      row.approved !== undefined ||
      row.message !== undefined,
  );
}

function isDisplayOutputValue(value: any) {
  if (value == null) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0 && !looksLikeStructuredJSONSnippet(value);
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value !== "object") {
    return true;
  }
  if (fixedRichDocument(value) || safeRichDocument(value)) {
    return true;
  }
  if (isRunEnvelope(value as Record<string, any>)) {
    return false;
  }
  return safeDocumentText(value).trim().length > 0;
}

function valueAtPath(source: Record<string, any>, path: readonly string[]) {
  let current: any = source;
  for (const key of path) {
    if (!current || typeof current !== "object" || !(key in current)) {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

function parseMaybeJSON(value: any) {
  if (typeof value !== "string") {
    return value;
  }
  const text = value.trim();
  if (!looksLikeJSONText(text)) {
    return value;
  }
  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
}

function parseAgentResultBlock(value: any) {
  if (typeof value !== "string") {
    return value;
  }
  const text = value.trim();
  for (const language of ["agent-result", "agent-output", "json"]) {
    const extracted = extractFencedAgentResultPayload(text, language);
    if (extracted !== undefined) {
      return extracted;
    }
  }
  return value;
}

function extractFencedAgentResultPayload(value: string, language: string) {
  const open = `\`\`\`${language}`;
  const start = value.toLowerCase().indexOf(open);
  if (start < 0) {
    return undefined;
  }
  let bodyStart = start + open.length;
  while (bodyStart < value.length && /\s/.test(value[bodyStart] || "")) {
    bodyStart += 1;
  }
  let searchStart = bodyStart;
  while (searchStart < value.length) {
    const end = value.indexOf("```", searchStart);
    const body = end >= 0 ? value.slice(bodyStart, end) : value.slice(bodyStart);
    const parsed = parseAgentResultJSON(body, language === "json");
    if (parsed) {
      return parsed;
    }
    if (end < 0) {
      return undefined;
    }
    searchStart = end + 3;
  }
  return undefined;
}

function parseAgentResultJSON(value: string, strict = false) {
  const text = value.trim();
  const repaired = repairJSONControlChars(text);
  for (const source of uniqueNonEmptyStrings([text, repaired])) {
    const parsed = parseMaybeJSON(source);
    if (
      parsed !== source &&
      (strict ? isStrictAgentResultPayload(parsed) : isAgentResultPayload(parsed))
    ) {
      return parsed;
    }
  }
  return null;
}

function isStrictAgentResultPayload(value: any) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const kind = String(value.kind || value.type || value.event || "")
    .toLowerCase()
    .trim();
  return (
    [
      "final",
      "result",
      "final_result",
      "answer",
      "tool",
      "tool_result",
      "power_result",
    ].includes(kind) ||
    "content" in value ||
    "tasks" in value ||
    "suggestions" in value ||
    "rich" in value
  );
}

function isAgentResultPayload(value: any) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const kind = String(value.kind || value.type || value.event || "")
    .toLowerCase()
    .trim();
  return (
    [
      "final",
      "result",
      "final_result",
      "answer",
      "tool",
      "tool_result",
      "power_result",
    ].includes(kind) ||
    "content" in value ||
    "tasks" in value ||
    "suggestions" in value ||
    [
      "title",
      "text",
      "rich",
      "images",
      "videos",
      "audios",
      "files",
      "json",
    ].some((key) => hasDisplayOutput(value[key]))
  );
}

function looksLikeJSONText(value: string) {
  const text = String(value || "").trim();
  return (
    (text.startsWith("{") && text.endsWith("}")) ||
    (text.startsWith("[") && text.endsWith("]"))
  );
}

function looksLikeStructuredJSONSnippet(value: string) {
  const text = String(value || "").trim();
  return Boolean(
    text &&
      (looksLikeJSONText(text) ||
        text.startsWith("{") ||
        text.startsWith("[") ||
        text.includes("rich_json") ||
        text.includes('"agent_run_id"') ||
        text.includes('"node_run_id"') ||
        text.includes('"approval_id"')),
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

function uploadAssetContent(preview: UploadPreview) {
  const kind = String(preview.kind || "").toLowerCase();
  const output = preview.output || {};
  if (kind === "image") {
    return { image: preview.url, images: [output] };
  }
  if (kind === "video") {
    return { video: preview.url, videos: [output] };
  }
  if (kind === "audio") {
    return { audio: preview.url, audios: [output] };
  }
  return {
    file: preview.url,
    files: [output],
    text: preview.text || preview.name || preview.url,
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

function assetNodeCateId(node: SpaceCanvasNode) {
  return Number(node.asset?.asset_cate_id || node.assetCateId || 0);
}

function isAssetNodeForCate(node: SpaceCanvasNode, assetCateId: number) {
  return node.type === "asset" && assetNodeCateId(node) === assetCateId;
}

function findReplaceableAssetNode(
  nodes: SpaceCanvasNode[],
  edges: SpaceCanvasEdge[],
  assetCateId: number,
  sourceNodeId?: string,
) {
  if (!assetCateId) {
    return null;
  }
  const byId = new Map(nodes.map((node) => [node.id, node]));
  if (sourceNodeId) {
    for (const edge of edges) {
      if (edge.from !== sourceNodeId) {
        continue;
      }
      const targetNode = byId.get(edge.to);
      if (targetNode && isAssetNodeForCate(targetNode, assetCateId)) {
        return targetNode;
      }
    }
  }
  return nodes.find((node) => isAssetNodeForCate(node, assetCateId)) || null;
}

function connectedAssetNodeIds(
  nodes: SpaceCanvasNode[],
  edges: SpaceCanvasEdge[],
  assetCateId: number,
  sourceNodeId: string | undefined,
  keepNodeId: string,
) {
  const duplicateIds = new Set<string>();
  if (!sourceNodeId || !assetCateId) {
    return duplicateIds;
  }
  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (const edge of edges) {
    if (edge.from !== sourceNodeId || edge.to === keepNodeId) {
      continue;
    }
    const targetNode = byId.get(edge.to);
    if (targetNode && isAssetNodeForCate(targetNode, assetCateId)) {
      duplicateIds.add(targetNode.id);
    }
  }
  return duplicateIds;
}

function replaceAssetNode(
  currentNode: SpaceCanvasNode,
  nextNode: SpaceCanvasNode,
): SpaceCanvasNode {
  return {
    ...nextNode,
    id: currentNode.id,
    x: currentNode.x,
    y: currentNode.y,
    width: currentNode.width || nextNode.width,
    height: currentNode.height || nextNode.height,
    local: currentNode.local !== false,
  };
}

function assetNodeResultOverride(node: SpaceCanvasNode): Partial<SpaceCanvasNode> {
  const output =
    fixedTiptapRichOutput(node.asset?.version?.content) ||
    extractDisplayOutput(node.asset?.version?.content);
  const preview = generatedPreviewFromValue(
    output,
    String(node.kind || ""),
  );
  if (!hasGeneratedPreview(preview)) {
    preview.text = node.description;
  }
  return {
    title: node.title,
    subtitle: node.subtitle,
    description: node.description,
    assetCateId: node.assetCateId,
    kind: node.kind,
    cardinality: node.cardinality,
    asset: node.asset,
    generatedOutput: output,
    generatedPreview: preview,
    hasResult: true,
    status: "已生成",
  };
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
  highlightedPathEdges: Set<string>,
  highlightedPathSourceNodeId: string,
  onDeleteEdge: (edgeId: string) => void,
): Edge {
  const selected = edge.id === selectedEdgeId;
  const pathHighlighted = highlightedPathEdges.has(edge.id);
  const highlighted =
    selected ||
    pathHighlighted ||
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
        ? nodeHighlightColor(
            nodeMap.get(
              pathHighlighted ? highlightedPathSourceNodeId : activeNodeId,
            ),
          )
        : "var(--ws-edge)",
    },
  };
}

function highlightedCanvasPathEdges(
  selectedNodeId: string,
  nodes: SpaceCanvasNode[],
  edges: SpaceCanvasEdge[],
) {
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  if (
    !selectedNode ||
    selectedNode.type !== "function" ||
    selectedNode.functionOption?.key !== "start"
  ) {
    return new Set<string>();
  }
  const outgoing = new Map<string, SpaceCanvasEdge[]>();
  for (const edge of edges) {
    outgoing.set(edge.from, [...(outgoing.get(edge.from) || []), edge]);
  }
  const highlighted = new Set<string>();
  const visitedNodes = new Set<string>([selectedNodeId]);
  const queue = [...(outgoing.get(selectedNodeId) || [])];
  while (queue.length > 0) {
    const edge = queue.shift();
    if (!edge || highlighted.has(edge.id)) {
      continue;
    }
    highlighted.add(edge.id);
    if (visitedNodes.has(edge.to)) {
      continue;
    }
    visitedNodes.add(edge.to);
    queue.push(...(outgoing.get(edge.to) || []));
  }
  return highlighted;
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

function functionIcon(key: string): LucideIcon {
  if (key === "start") return Play;
  if (key === "import") return Upload;
  if (key === "display") return Eye;
  return Save;
}

function isResultFunctionNode(node: SpaceCanvasNode) {
  if (node.type !== "function") {
    return false;
  }
  const key = node.functionOption?.key || "";
  return key === "import" || key === "save" || key === "display";
}

function shouldRenderFunctionResultCard(node: SpaceCanvasNode) {
  return isResultFunctionNode(node) && nodeHasResultContent(node);
}

function canvasNodeStyleSize(node: SpaceCanvasNode) {
  if (node.type === "function") {
    if (shouldRenderFunctionResultCard(node)) {
      return { width: 330, height: 250 };
    }
    return { width: 128, height: 46 };
  }
  return {
    width: node.width,
    height: node.height,
  };
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
  if (node.type === "asset") {
    return null;
  }
  if (node.type === "function") {
    return null;
  }
  if (!selected && node.type !== "flow") {
    return null;
  }
  const { projectId, runningNode, setRunningNode } = node as any;
  const onNodeResult = (node as any).onNodeResult as
    | NodeResultSetter
    | undefined;
  const onNodeDraftChange = (node as any).onNodeDraftChange as
    | NodeDraftSetter
    | undefined;
  const onAddConfiguredNode = (node as any).onAddConfiguredNode as
    | AddConfiguredNodeHandler
    | undefined;
  const onAssetCreated = (node as any).onAssetCreated as
    | ((asset: ProjectAsset) => void)
    | undefined;
  const onRunStartNode = (node as any).onRunStartNode as
    | NodeStartRunner
    | undefined;
  const requestConfirm = (node as any).requestConfirm as
    | ConfirmRequester
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
        onNodeDraftChange={onNodeDraftChange || (() => undefined)}
        onAddConfiguredNode={onAddConfiguredNode}
        onAssetCreated={onAssetCreated}
        onRunStartNode={onRunStartNode}
        requestConfirm={requestConfirm}
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

function NodeResultBubble({
  node,
  onShowNodeDetail,
}: {
  node: SpaceCanvasNode;
  onShowNodeDetail?: (node: SpaceCanvasNode) => void;
}) {
  if (!nodeHasResultContent(node)) {
    return null;
  }
  const preview = generatedNodePreview(node);
  const text = firstText(
    displayTextFromOutput(preview.text, ""),
    displayTextFromOutput(node.description, ""),
    node.title,
    "暂无结果",
  );
  return (
    <button
      type="button"
      className={`ws-agent-result-bubble nodrag ${
        node.type === "function" ? "is-function" : ""
      }`}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onShowNodeDetail?.(node);
      }}
    >
      <p className="ws-result-text">{text}</p>
    </button>
  );
}

function FunctionResultCard({
  node,
  onShowNodeDetail,
}: {
  node: SpaceCanvasNode;
  onShowNodeDetail?: (node: SpaceCanvasNode) => void;
}) {
  const preview = generatedNodePreview(node);
  const rich = nodeRichDocument(node);
  const displayOutput = nodeEnergonOutput(node);
  const displayText = firstText(
    nodeDisplayText(node),
    displayTextFromOutput(preview.text, ""),
    displayTextFromOutput(node.description, ""),
    "暂无内容",
  );
  return (
    <div
      role="button"
      tabIndex={0}
      className="ws-node-function-result-card nodrag"
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onShowNodeDetail?.(node);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        onShowNodeDetail?.(node);
      }}
    >
      {preview.imageUrl ? (
        <div className="ws-node-function-result-media">
          <img src={preview.imageUrl} alt={displayText || node.title} />
        </div>
      ) : preview.videoUrl ? (
        <div className="ws-node-function-result-media">
          <video src={preview.videoUrl} muted playsInline preload="metadata" />
        </div>
      ) : rich ? (
        <RichDocumentView
          value={rich}
          className="ws-node-text-rich-preview ws-node-function-result-preview"
        />
      ) : EnergonContentView && hasDisplayOutput(displayOutput) ? (
        <div className="ws-node-text-energon-preview ws-node-function-result-preview">
          <EnergonContentView output={displayOutput} emptyText="暂无内容" />
        </div>
      ) : (
        <p className="ws-node-function-result-text">{displayText}</p>
      )}
    </div>
  );
}

function NodeFeedbackBeacon({
  node,
  onOpenFeedbackRecord,
}: {
  node: SpaceCanvasNode;
  onOpenFeedbackRecord?: (
    node: SpaceCanvasNode,
    record: NodeFeedbackRecord,
  ) => void;
}) {
  const records = currentNodeFeedbackRecords(node);
  if (!onOpenFeedbackRecord || records.length === 0) {
    return null;
  }
  const pendingCount = records.filter((record) => record.status === "pending")
    .length;
  const latest = records[records.length - 1];
  return (
    <button
      type="button"
      className={`ws-node-feedback-beacon nodrag nopan ${
        pendingCount > 0 ? "is-pending" : "is-done"
      }`}
      aria-label={pendingCount > 0 ? "继续填写反馈" : "查看反馈记录"}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onOpenFeedbackRecord(node, latest);
      }}
    >
      <Lightbulb size={15} fill="currentColor" />
      {records.length > 1 ? <span>{records.length}</span> : null}
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

function latestInputContextSource(inputContext: NodeInputContext | null) {
  const sources = inputContext?.sources || [];
  return sources.length > 0 ? sources[sources.length - 1] : null;
}

function inputContextOutput(inputContext: NodeInputContext | null) {
  const source = latestInputContextSource(inputContext);
  if (source?.output != null) {
    return source.output;
  }
  if (inputContext?.text) {
    return { text: inputContext.text };
  }
  return null;
}

function functionAssetName(
  node: SpaceCanvasNode,
  inputContext: NodeInputContext | null,
) {
  const source = latestInputContextSource(inputContext);
  return firstText(source?.title, node.title, "画布资产");
}

function NodeBottomSettings({
  node,
  projectId,
  runningNode,
  setRunningNode,
  onNodeResult,
  onNodeDraftChange,
  onAddConfiguredNode,
  onAssetCreated,
  onRunStartNode,
  requestConfirm,
}: {
  node: SpaceCanvasNode;
  projectId: number;
  runningNode: RunningNodeState | null;
  setRunningNode: RunningNodeSetter;
  onNodeResult: NodeResultSetter;
  onNodeDraftChange: NodeDraftSetter;
  onAddConfiguredNode?: AddConfiguredNodeHandler;
  onAssetCreated?: (asset: ProjectAsset) => void;
  onRunStartNode?: NodeStartRunner;
  requestConfirm?: ConfirmRequester;
}) {
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [powerForm, setPowerForm] = useState<PowerForm | null>(null);
  const [powerFormLoading, setPowerFormLoading] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState<number>(0);
  const [paramValues, setParamValues] = useState<Record<string, unknown>>({});
  const [flowFeedbackPrompt, setFlowFeedbackPrompt] =
    useState<FlowFeedbackPrompt | null>(null);
  const [agentFeedbackPrompt, setAgentFeedbackPrompt] =
    useState<FlowFeedbackPrompt | null>(null);
  const [pendingAgentRun, setPendingAgentRun] = useState<{
    prompt: string;
  } | null>(null);
  const [flowRunRef, setFlowRunRef] = useState<{
    runId: number;
    requestId: string;
    prompt: string;
  } | null>(null);
  const initialDraftRef = useRef<ComposerDraft>(readNodeComposerDraft(node));
  const savedDraft = initialDraftRef.current;
  const inputContext = ((node as any).inputContext ||
    null) as NodeInputContext | null;

  const nodeRunning =
    running ||
    (runningNode?.nodeId === node.id && runningNode.status === "running");
  const selectedNodeType = node.type;
  const selectedNodeId = node.id;
  const selectedFlowId = node.flow?.id || 0;
  const selectedPowerId = node.type === "power" ? node.power?.id || 0 : 0;
  const selectedPowerKey = node.type === "power" ? node.power?.key || "" : "";
  const selectedAgentId =
    node.type === "agent" ? Number(node.role?.agent_id || 0) : 0;
  const viewportZoom = Number((node as any).viewportZoom) || 1;
  const overlayStyle = stableNodeOverlayStyle(viewportZoom);
  const flowRunOverlayStyle = stableFlowRunOverlayStyle();
  const space = ((node as any).space || null) as SpaceBootstrap | null;
  const assetLibrary = useMemo(
    () => buildComposerAssetLibrary(space, inputContext),
    [inputContext, space],
  );

  useEffect(() => {
    if (selectedNodeType === "power" && (selectedPowerId || selectedPowerKey)) {
      const draftTargetId = savedDraft.selectedTargetId || 0;
      const cacheKey = powerFormCacheKey(
        projectId,
        selectedFlowId,
        selectedPowerId,
        selectedPowerKey,
        draftTargetId,
      );
      const cachedForm = powerFormCache.get(cacheKey);
      if (cachedForm) {
        setPowerForm(cachedForm);
        setSelectedTargetId(
          cachedForm.selected_target_id || draftTargetId || 0,
        );
        setParamValues(
          mergeSavedComposerParamValues(cachedForm.params || [], savedDraft),
        );
        setPrompt(savedDraft.prompt || "");
        setPowerFormLoading(false);
        return;
      }
      setPowerFormLoading(true);
      fetchSpacePowerForm({
        projectId,
        flowId: selectedFlowId,
        powerId: selectedPowerId,
        powerKey: selectedPowerKey,
        targetId: draftTargetId,
      })
        .then((form) => {
          powerFormCache.set(cacheKey, form);
          setPowerForm(form);
          setSelectedTargetId(
            form.selected_target_id || draftTargetId || 0,
          );
          setParamValues(
            mergeSavedComposerParamValues(form.params || [], savedDraft),
          );
          setPrompt(savedDraft.prompt || "");
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
    if (selectedNodeType === "agent") {
      setParamValues(savedDraft.paramValues);
      setPrompt(savedDraft.prompt || "");
      setSelectedTargetId(0);
      return;
    }
    setParamValues({});
    setSelectedTargetId(0);
    setPrompt("");
  }, [
    projectId,
    selectedFlowId,
    selectedAgentId,
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

  function saveComposerDraft(draft: ComposerDraft) {
    onNodeDraftChange(node.id, normalizeComposerDraft(draft));
  }

  function setPowerPrompt(nextPrompt: string) {
    setPrompt(nextPrompt);
    setParamValues((current) => {
      const nextValues = promptParam
        ? { ...current, [promptParam.key]: nextPrompt }
        : current;
      saveComposerDraft({
        prompt: nextPrompt,
        paramValues: nextValues,
        selectedTargetId,
      });
      return nextValues;
    });
  }

  function setParamValue(key: string, value: unknown) {
    setParamValues((current) => {
      const nextValues = {
        ...current,
        [key]: value,
      };
      saveComposerDraft({
        prompt,
        paramValues: nextValues,
        selectedTargetId,
      });
      return nextValues;
    });
  }

  function setAgentPrompt(nextPrompt: string) {
    setPrompt(nextPrompt);
    saveComposerDraft({
      prompt: nextPrompt,
      paramValues,
      selectedTargetId: 0,
    });
  }

  function setAgentParamValue(key: string, value: unknown) {
    setParamValues((current) => {
      const next = {
        ...current,
        [key]: value,
      };
      saveComposerDraft({
        prompt,
        paramValues: next,
        selectedTargetId: 0,
      });
      return next;
    });
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

  async function runFlowNode(extraInput?: Record<string, unknown>) {
    if (!node.flow) {
      return "waiting" as const;
    }
    const runPrompt = promptWithInputContext(prompt, inputContext);
    const flowInput = withNodeInputContext(extraInput || {}, inputContext);
    const started = await runSpaceFlow(
      projectId,
      Number(node.assetCateId || 0),
      node.flow,
      runPrompt,
      flowInput,
    );
    const runId = Number(started?.run_id || 0);
    const requestId = String(started?.request_id || "");
    setFlowRunRef({ runId, requestId, prompt: runPrompt });
    const finalSnapshot = await waitForFlowCompletion(projectId, {
      runId,
      requestId,
    });
    if (isFlowWaitingSnapshot(finalSnapshot)) {
      const feedback = flowFeedbackFromSnapshot(finalSnapshot);
      if (feedback) {
        setFlowFeedbackPrompt(feedback);
        toast.message("需要补充信息后继续");
      } else {
        toast.message("流程等待用户处理");
      }
      return "waiting" as const;
    }
    if (finalSnapshot.status === "fail" || finalSnapshot.status === "canceled") {
      throw new Error(finalSnapshot.error || "流程运行失败");
    }
    if (finalSnapshot.status !== "success") {
      throw new Error(finalSnapshot.error || "流程仍在运行，请稍后刷新查看结果");
    }
    const displayResult = await flowDisplayResult(finalSnapshot);
    onNodeResult(
      node.id,
      buildGeneratedNodeResultPatch(node, displayResult, runPrompt),
    );
    toast.success("流程执行完成");
    return "success" as const;
  }

  async function flowDisplayResult(snapshot: FlowRunSnapshot) {
    const asset =
      latestAssetFromStatus(snapshot, Number(node.assetCateId || 0)) ||
      (await latestGeneratedAsset(
        projectId,
        Number(node.assetCateId || 0),
        snapshot.runId,
      ));
    if (asset && asset.id > 0) {
      const normalizedAsset = normalizeRichAssetVersionContent(asset);
      onAssetCreated?.(normalizedAsset);
      if (normalizedAsset.version?.content != null) {
        return {
          output: normalizedAsset.version.content,
          asset: normalizedAsset,
          version: normalizedAsset.version,
          run_id: snapshot.runId,
          request_id: snapshot.requestId,
          status: snapshot.status,
        };
      }
    }
    return {
      output: snapshot.output,
      run_id: snapshot.runId,
      request_id: snapshot.requestId,
      status: snapshot.status,
    };
  }

  async function submitFlowFeedback(values: Record<string, unknown>) {
    if (!flowFeedbackPrompt || !flowRunRef) {
      return;
    }
    setRunning(true);
    setRunningNode({
      nodeId: node.id,
      title: node.title,
      startedAt: Date.now(),
      progress: 0,
      status: "running",
    });
    let outcome: RunningNodeState["status"] = "error";
    try {
      const submitted = await submitSpaceApproval({
        projectId,
        approvalId: flowFeedbackPrompt.approval.id,
        data: values,
      });
      setFlowFeedbackPrompt(null);
      const finalSnapshot = await waitForFlowCompletion(projectId, {
        runId: Number(submitted?.run_id || flowRunRef.runId || 0),
        requestId: String(submitted?.request_id || flowRunRef.requestId || ""),
      });
      if (isFlowWaitingSnapshot(finalSnapshot)) {
        const feedback = flowFeedbackFromSnapshot(finalSnapshot);
        if (feedback) {
          setFlowFeedbackPrompt(feedback);
          toast.message("还需要继续补充信息");
        } else {
          toast.message("流程仍在等待用户处理");
        }
        outcome = "success";
        return;
      }
      if (
        finalSnapshot.status === "fail" ||
        finalSnapshot.status === "canceled"
      ) {
        throw new Error(finalSnapshot.error || "流程运行失败");
      }
      if (finalSnapshot.status !== "success") {
        throw new Error(finalSnapshot.error || "流程仍在运行，请稍后刷新查看结果");
      }
      const displayResult = await flowDisplayResult(finalSnapshot);
      onNodeResult(
        node.id,
        buildGeneratedNodeResultPatch(node, displayResult, flowRunRef.prompt),
      );
      outcome = "success";
      toast.success("流程执行完成");
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
      toast.error(err instanceof Error ? err.message : "提交反馈失败");
    } finally {
      setRunning(false);
      setRunningNode((current) => {
        if (current?.nodeId !== node.id) {
          return current;
        }
        return {
          ...current,
          status: outcome,
          progress: outcome === "success" ? 100 : Math.max(current.progress, 92),
        };
      });
      window.setTimeout(
        () => {
          setRunningNode((current) =>
            current?.nodeId === node.id ? null : current,
          );
        },
        outcome === "success" ? 650 : 1200,
      );
    }
  }

  async function runAgentNode(
    runPrompt: string,
    feedback?: Record<string, unknown>,
  ) {
    if (node.type !== "agent" || !node.role) {
      return "waiting" as const;
    }
    const agentId = Number(node.role.agent_id || 0);
    if (agentId <= 0) {
      throw new Error("当前团队角色未绑定智能体");
    }
    const files = Array.isArray(paramValues.files) ? paramValues.files : [];
    const memoryKey = canvasAgentMemoryKey({
      projectId,
      assetCateId: Number(node.assetCateId || 0),
      nodeId: node.id,
      agentId,
    });
    const result = await runSpaceAgent({
      projectId,
      flowId: node.flow?.id || 0,
      nodeKey: node.id,
      nodeName: node.title,
      agentId,
      prompt: runPrompt,
      files,
      context: inputContext?.sources || [],
      history: readCanvasAgentMemory(memoryKey),
      feedback,
    });
    const feedbackPrompt = agentFeedbackFromResult(result, node.title);
    if (feedbackPrompt) {
      setPendingAgentRun({ prompt: runPrompt });
      setAgentFeedbackPrompt(feedbackPrompt);
      appendCanvasAgentMemory(memoryKey, [
        agentMemoryEntry("user", runPrompt),
        ...(feedback
          ? [agentMemoryEntry("feedback", "用户补充信息", feedback)]
          : []),
        agentMemoryEntry(
          "assistant",
          firstText(feedbackPrompt.description, "需要补充信息"),
          result,
        ),
      ]);
      toast.message("需要补充信息后继续");
      return "waiting" as const;
    }
    onNodeResult(
      node.id,
      buildGeneratedNodeResultPatch(node, result, runPrompt),
    );
    setPendingAgentRun(null);
    appendCanvasAgentMemory(memoryKey, [
      agentMemoryEntry("user", runPrompt),
      ...(feedback
        ? [agentMemoryEntry("feedback", "用户补充信息", feedback)]
        : []),
      agentMemoryEntry("assistant", agentOutputMemoryText(result), result),
    ]);
    toast.success("智能体任务执行成功");
    return "success" as const;
  }

  async function submitAgentFeedback(values: Record<string, unknown>) {
    const runPrompt =
      pendingAgentRun?.prompt || promptWithInputContext(prompt, inputContext);
    setRunning(true);
    setRunningNode({
      nodeId: node.id,
      title: node.title,
      startedAt: Date.now(),
      progress: 0,
      status: "running",
    });
    let outcome: RunningNodeState["status"] = "error";
    try {
      setAgentFeedbackPrompt(null);
      const result = await runAgentNode(runPrompt, values);
      if (result === "success") {
        outcome = "success";
      } else {
        outcome = "success";
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
      toast.error(err instanceof Error ? err.message : "提交反馈失败");
    } finally {
      setRunning(false);
      setRunningNode((current) => {
        if (current?.nodeId !== node.id) {
          return current;
        }
        return {
          ...current,
          status: outcome,
          progress: outcome === "success" ? 100 : Math.max(current.progress, 92),
        };
      });
      window.setTimeout(
        () => {
          setRunningNode((current) =>
            current?.nodeId === node.id ? null : current,
          );
        },
        outcome === "success" ? 650 : 1200,
      );
    }
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
        const nextTargetId = cachedForm.selected_target_id || targetId;
        setSelectedTargetId(nextTargetId);
        setParamValues((current) => {
          const nextValues = mergePowerParamValues(
            cachedForm.params || [],
            current,
            powerForm?.params || [],
          );
          saveComposerDraft({
            prompt,
            paramValues: nextValues,
            selectedTargetId: nextTargetId,
          });
          return nextValues;
        });
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
      const nextTargetId = form.selected_target_id || targetId;
      setSelectedTargetId(nextTargetId);
      setParamValues((current) => {
        const nextValues = mergePowerParamValues(
          form.params || [],
          current,
          powerForm?.params || [],
        );
        saveComposerDraft({
          prompt,
          paramValues: nextValues,
          selectedTargetId: nextTargetId,
        });
        return nextValues;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载能力参数失败");
    }
  }

  const runNodeNow = async () => {
    setRunning(true);
    setRunningNode({
      nodeId: node.id,
      title: node.title,
      startedAt: Date.now(),
      progress: 0,
      status: "running",
    });
    let completed = false;
    let outcome: RunningNodeState["status"] = "error";
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
        const agentOutcome = await runAgentNode(runPrompt);
        if (agentOutcome === "success") {
          completed = true;
        }
        outcome = "success";
      } else if (node.type === "flow" && node.flow) {
        const flowOutcome = await runFlowNode();
        if (flowOutcome === "success") {
          completed = true;
        }
        outcome = "success";
      } else if (node.type === "function") {
        const optionKey = node.functionOption?.key || "";
        const upstreamOutput = inputContextOutput(inputContext);
        if (optionKey === "display") {
          if (upstreamOutput == null) {
            throw new Error("展示节点没有可展示的上游结果");
          }
          onNodeResult(
            node.id,
            buildGeneratedNodeResultPatch(
              node,
              { output: upstreamOutput },
              "展示上游结果",
            ),
          );
          toast.success("已展示上游结果");
          completed = true;
        } else if (optionKey === "save") {
          if (upstreamOutput == null) {
            throw new Error("保存节点没有可保存的上游结果");
          }
          const asset = await saveSpaceCanvasAsset({
            projectId,
            assetCateId: Number(node.assetCateId || 0),
            name: functionAssetName(node, inputContext),
            kind: String(node.kind || ""),
            content: upstreamOutput,
          });
          onAssetCreated?.(asset);
          onNodeResult(
            node.id,
            buildGeneratedNodeResultPatch(
              node,
              {
                output: asset.version?.content || upstreamOutput,
                asset,
                version: asset.version,
              },
              "保存上游结果",
            ),
          );
          toast.success("资产已保存");
          completed = true;
        } else if (optionKey === "start") {
          if (onRunStartNode) {
            await onRunStartNode(node);
            completed = true;
            toast.success("开始节点执行完成");
          } else {
            onNodeResult(
              node.id,
              buildGeneratedNodeResultPatch(
                node,
                { output: "开始节点已启动，请运行后续连接节点。" },
                "开始",
              ),
            );
            toast.success("开始节点已启动");
            completed = true;
          }
        } else if (optionKey === "import") {
          onOpenImportPicker?.(node.id);
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
      if (completed) {
        outcome = "success";
      }
    } catch (err) {
      outcome = "error";
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
          status: outcome,
          progress: outcome === "success" ? 100 : Math.max(current.progress, 92),
        };
      });
      window.setTimeout(
        () => {
          setRunningNode((current) =>
            current?.nodeId === node.id ? null : current,
          );
        },
        outcome === "success" ? 650 : 1200,
      );
    }
  };

  const handleRun = async () => {
    if (nodeRunning || running) {
      return;
    }
    if (requestConfirm && shouldConfirmNodeRun(node)) {
      requestConfirm({
        title: node.type === "function" ? `执行「${node.title}」` : `运行「${node.title}」`,
        description: nodeRunConfirmDescription(node),
        confirmText: node.type === "flow" || node.type === "function" ? "执行" : "运行",
        onConfirm: runNodeNow,
      });
      return;
    }
    await runNodeNow();
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
            placeholder="在此处为该能力输入生成提示词..."
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
          onChange={setAgentPrompt}
          onParamChange={setAgentParamValue}
          onAssetReference={handleAssetReference}
          onLocalUpload={handleLocalUpload}
          onSubmit={handleRun}
        />
      </div>
    );
  }

  if (node.type === "flow" && node.flow) {
    return (
      <>
        <div
          className="ws-node-bottom-settings is-flow-run-only nodrag"
          onClick={(event) => event.stopPropagation()}
          style={flowRunOverlayStyle}
        >
          <button
            type="button"
            className="ws-node-flow-run"
            disabled={nodeRunning}
            onClick={handleRun}
          >
            {nodeRunning ? (
              <Loader2 size={15} className="ws-spin" />
            ) : (
              <Play size={15} fill="currentColor" />
            )}
            <span>{nodeRunning ? "运行中" : "执行"}</span>
          </button>
        </div>
        {flowFeedbackPrompt ? (
          <FlowFeedbackDialog
            prompt={flowFeedbackPrompt}
            running={nodeRunning}
            onClose={() => {
              if (!nodeRunning) {
                setFlowFeedbackPrompt(null);
              }
            }}
            onSubmit={(values) => void submitFlowFeedback(values)}
          />
        ) : null}
        {agentFeedbackPrompt ? (
          <FlowFeedbackDialog
            prompt={agentFeedbackPrompt}
            running={nodeRunning}
            onClose={() => {
              if (!nodeRunning) {
                setAgentFeedbackPrompt(null);
                setPendingAgentRun(null);
              }
            }}
            onSubmit={(values) => void submitAgentFeedback(values)}
          />
        ) : null}
      </>
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
          <p>{node.description || "配置该节点的专属参数和功能动作。"}</p>
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

        {node.type === "function" && (
          <div className="ws-node-settings-row">
            <span className="ws-node-settings-state is-function-desc">
              {node.functionOption?.description || "执行该功能节点。"}
            </span>
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
                (() => {
                  const Icon = functionIcon(node.functionOption?.key || "");
                  return <Icon size={12} />;
                })()
              )}
              <span>
                {node.functionOption?.key === "start"
                  ? "开始"
                  : node.functionOption?.key === "display"
                    ? "展示"
                    : node.functionOption?.key === "save"
                      ? "保存"
                      : "执行"}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FlowFeedbackDialog({
  prompt,
  running,
  readonly,
  history,
  activeRecordId,
  onSelectRecord,
  onClose,
  onSubmit,
}: {
  prompt: FlowFeedbackPrompt;
  running: boolean;
  readonly?: boolean;
  history?: NodeFeedbackRecord[];
  activeRecordId?: string;
  onSelectRecord?: (record: NodeFeedbackRecord) => void;
  onClose: () => void;
  onSubmit: (values: Record<string, unknown>) => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(
    () => prompt.values || defaultPowerParamValues(prompt.fields),
  );

  useEffect(() => {
    setValues(prompt.values || defaultPowerParamValues(prompt.fields));
  }, [prompt]);

  function setValue(key: string, value: unknown) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (running || readonly) {
      return;
    }
    onSubmit(values);
  }

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="ws-flow-feedback-backdrop" onMouseDown={onClose}>
      <form
        className="ws-flow-feedback-modal"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="ws-flow-feedback-head">
          <div>
            <strong>{prompt.title || "补充信息"}</strong>
            {readonly ? (
              <span>已提交的反馈记录，可查看之前填写的内容。</span>
            ) : prompt.description ? (
              <span>{prompt.description}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="ws-flow-feedback-close"
            disabled={running}
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </header>
        {history && history.length > 1 ? (
          <div className="ws-flow-feedback-tabs">
            {history.map((record, index) => (
              <button
                key={record.id}
                type="button"
                className={record.id === activeRecordId ? "is-active" : ""}
                onClick={() => onSelectRecord?.(record)}
              >
                <span>{index + 1}</span>
                {record.status === "pending" ? "待反馈" : "已提交"}
              </button>
            ))}
          </div>
        ) : null}
        <div className="ws-flow-feedback-body custom-scrollbar">
          {prompt.fields.length > 0 ? (
            prompt.fields.map((field) => (
              <FlowFeedbackField
                key={field.key || field.id}
                field={field}
                value={values[field.key]}
                disabled={running || Boolean(readonly)}
                onChange={(value) => setValue(field.key, value)}
              />
            ))
          ) : (
            <FlowFeedbackField
              field={{
                id: 0,
                key: "text",
                name: "补充信息",
                type: "textarea",
                required: true,
              }}
              value={values.text}
              disabled={running || Boolean(readonly)}
              onChange={(value) => setValue("text", value)}
            />
          )}
        </div>
        <footer className="ws-flow-feedback-foot">
          {readonly ? (
            <button
              type="button"
              className="ws-flow-feedback-submit"
              onClick={onClose}
            >
              <CheckCircle2 size={16} />
              <span>知道了</span>
            </button>
          ) : (
            <button
              type="submit"
              className="ws-flow-feedback-submit"
              disabled={running}
            >
              {running ? <Loader2 size={16} className="ws-spin" /> : <Send size={16} />}
              <span>{running ? "提交中" : "提交并继续"}</span>
            </button>
          )}
        </footer>
      </form>
    </div>,
    document.body,
  );
}

function FlowFeedbackField({
  field,
  value,
  disabled,
  onChange,
}: {
  field: PowerParam;
  value: unknown;
  disabled: boolean;
  onChange: (value: unknown) => void;
}) {
  const required = field.required ? <i>*</i> : null;
  const optionItems = field.options || [];
  if (field.type === "option" || field.type === "select") {
    if (optionItems.length > 0 && optionItems.length <= 6) {
      return (
        <fieldset className="ws-flow-feedback-field is-radio">
          <legend>
            {field.name}
            {required}
          </legend>
          <div className="ws-flow-feedback-radios">
            {optionItems.map((option) => {
              const optionValue = String(option.value);
              const active = String(value ?? "") === optionValue;
              return (
                <label
                  key={option.id || option.value}
                  className={active ? "is-active" : ""}
                >
                  <input
                    type="radio"
                    name={`flow-feedback-${field.key}`}
                    value={optionValue}
                    checked={active}
                    disabled={disabled}
                    onChange={() => onChange(optionValue)}
                  />
                  <span>{option.name || option.value}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      );
    }
    return (
      <label className="ws-flow-feedback-field">
        <span>
          {field.name}
          {required}
        </span>
        <select
          value={String(value ?? "")}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        >
          {optionItems.map((option) => (
            <option key={option.id || option.value} value={option.value}>
              {option.name || option.value}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (field.type === "multi_option") {
    const selected = new Set(valueAsParamList(value));
    return (
      <fieldset className="ws-flow-feedback-field is-choice">
        <legend>
          {field.name}
          {required}
        </legend>
        <div className="ws-flow-feedback-options">
          {(field.options || []).map((option) => {
            const active = selected.has(option.value);
            return (
              <button
                key={option.id || option.value}
                type="button"
                className={active ? "is-active" : ""}
                disabled={disabled}
                onClick={() => {
                  const next = new Set(selected);
                  if (active) {
                    next.delete(option.value);
                  } else {
                    next.add(option.value);
                  }
                  onChange(Array.from(next));
                }}
              >
                {option.name || option.value}
              </button>
            );
          })}
        </div>
      </fieldset>
    );
  }
  if (field.type === "textarea") {
    return (
      <label className="ws-flow-feedback-field">
        <span>
          {field.name}
          {required}
        </span>
        <textarea
          value={String(value ?? "")}
          disabled={disabled}
          placeholder={field.name}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  }
  if (field.type === "switch") {
    return (
      <label className="ws-flow-feedback-switch">
        <span>
          {field.name}
          {required}
        </span>
        <input
          type="checkbox"
          checked={Boolean(value)}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
      </label>
    );
  }
  return (
    <label className="ws-flow-feedback-field">
      <span>
        {field.name}
        {required}
      </span>
      <input
        type={field.value_type === "number" ? "number" : "text"}
        value={String(value ?? "")}
        disabled={disabled}
        placeholder={field.name}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(
            field.value_type === "number"
              ? Number(event.target.value)
              : event.target.value,
          )
        }
      />
    </label>
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

function stableFlowRunOverlayStyle(): CSSProperties {
  return {
    zIndex: 999,
    "--ws-node-overlay-scale": "1",
    "--ws-node-overlay-gap": "16px",
  } as CSSProperties;
}

function shouldConfirmNodeRun(node: SpaceCanvasNode) {
  if (node.type === "function") {
    return node.functionOption?.key === "start";
  }
  return node.type === "power" || node.type === "agent" || node.type === "flow";
}

function nodeRunConfirmDescription(node: SpaceCanvasNode) {
  if (node.type === "function" && node.functionOption?.key === "start") {
    return "将从该开始节点沿连接线执行后续节点，直到保存或展示。";
  }
  if (node.type === "flow") {
    return "将执行该流程，并把最终结果展示在节点旁。";
  }
  if (node.type === "agent") {
    return "将把当前提示词、文件和上下文发送给该智能体。";
  }
  if (node.type === "power") {
    return "将使用当前参数运行该能力节点。";
  }
  return "确认后开始执行该节点。";
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
  const canvasRunningNode = (data as any)
    .canvasRunningNode as RunningNodeState | null;
  const onShowNodeDetail = (data as any).onShowNodeDetail as
    | ((node: SpaceCanvasNode) => void)
    | undefined;
  const onNodeResult = (data as any).onNodeResult as
    | NodeResultSetter
    | undefined;
  const onOpenFeedbackRecord = (data as any).onOpenFeedbackRecord as
    | ((node: SpaceCanvasNode, record: NodeFeedbackRecord) => void)
    | undefined;

  // 1. circular agent representation
  if (node.type === "agent") {
    const showRunFrame =
      runningNode?.status === "running" || runningNode?.status === "success";
    return (
      <div
        className={`ws-node-agent-wrap ${selected ? "is-selected" : ""} ${showRunFrame ? "is-running" : ""}`}
      >
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
        </div>
        {showRunFrame ? (
          <svg
            className="ws-node-running-border is-spin is-circle is-agent"
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <circle
              className="ws-node-running-track"
              cx="50"
              cy="50"
              r="47"
              pathLength="100"
            />
            <circle
              className="ws-node-running-progress"
              cx="50"
              cy="50"
              r="47"
              pathLength="100"
              strokeDasharray="18 82"
              strokeDashoffset="0"
            />
          </svg>
        ) : null}
        <NodeFeedbackBeacon
          node={node}
          onOpenFeedbackRecord={onOpenFeedbackRecord}
        />
        <NodeResultBubble node={node} onShowNodeDetail={onShowNodeDetail} />
        <NodeSelectionOverlays node={node} selected={selected} />
      </div>
    );
  }

  // 2. SVG Hexagon flow representation
  if (node.type === "flow") {
    const showRunFrame =
      runningNode?.status === "running" || runningNode?.status === "success";
    return (
      <div
        className={`ws-node-flow-wrap ${selected ? "is-selected" : ""} ${showRunFrame ? "is-running" : ""}`}
      >
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
        {showRunFrame ? (
          <svg
            className="ws-node-running-border is-spin is-hexagon"
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <polygon
              className="ws-node-running-track"
              points="50,5 92,28 92,72 50,95 8,72 8,28"
              pathLength="100"
            />
            <polygon
              className="ws-node-running-progress"
              points="50,5 92,28 92,72 50,95 8,72 8,28"
              pathLength="100"
              strokeDasharray="18 82"
              strokeDashoffset="0"
            />
          </svg>
        ) : null}
        <div className="ws-node-flow-content">
          <div className="ws-node-flow-avatar">
            <Workflow size={16} className="ws-icon-blue" />
          </div>
          <div className="ws-node-flow-title">{node.title}</div>
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
        <NodeFeedbackBeacon
          node={node}
          onOpenFeedbackRecord={onOpenFeedbackRecord}
        />
        <NodeResultBubble node={node} onShowNodeDetail={onShowNodeDetail} />
        <NodeSelectionOverlays node={node} selected={selected} />
      </div>
    );
  }

  // 3. Function command capsule representation
  if (node.type === "function") {
    const functionKey =
      node.functionOption?.key || (node.title.includes("保存") ? "save" : "");
    const isStartFunction = functionKey === "start";
    const FunctionIcon = functionIcon(functionKey);
    const onRunStartNode = (node as any).onRunStartNode as
      | NodeStartRunner
      | undefined;
    const onOpenImportPicker = (node as any).onOpenImportPicker as
      | ((nodeId: string) => void)
      | undefined;
    const requestConfirm = (node as any).requestConfirm as
      | ConfirmRequester
      | undefined;
    const isCurrentNodeRunning = runningNode?.status === "running";
    const isStartLocked =
      isStartFunction && canvasRunningNode?.status === "running";
    const nodeRunning = isCurrentNodeRunning || isStartLocked;
    const renderResultCard = shouldRenderFunctionResultCard(node);
    const inputHandleStyle: CSSProperties = renderResultCard
      ? { left: "0px", top: "19px" }
      : { left: "-8px" };
    const outputHandleStyle: CSSProperties = renderResultCard
      ? { left: "128px", right: "auto", top: "19px" }
      : { right: "-8px" };
    const runFunctionNode = () => {
      if (nodeRunning) {
        return;
      }
      if (functionKey === "start" && onRunStartNode) {
        if (requestConfirm) {
          requestConfirm({
            title: `执行「${node.title}」`,
            description: nodeRunConfirmDescription(node),
            confirmText: "执行",
            onConfirm: () => onRunStartNode(node),
          });
          return;
        }
        void onRunStartNode(node);
        return;
      }
      if (functionKey === "import" && onOpenImportPicker) {
        onOpenImportPicker(node.id);
      }
    };
    const handleFunctionClick = (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      runFunctionNode();
    };
    const canRunFunction =
      (functionKey === "start" && Boolean(onRunStartNode)) ||
      (functionKey === "import" && Boolean(onOpenImportPicker));
    return (
      <div
        className={`ws-node-function-wrap ${selected ? "is-selected" : ""} ${
          nodeRunning ? "is-running" : ""
        } ${renderResultCard ? "has-result-card" : ""} is-${functionKey || "default"}`}
      >
        <div
          className="ws-node-function-pill"
          role={canRunFunction ? "button" : undefined}
          tabIndex={canRunFunction ? 0 : undefined}
          aria-disabled={canRunFunction ? nodeRunning : undefined}
          onClick={canRunFunction ? handleFunctionClick : undefined}
          onKeyDown={(event) => {
            if (
              !canRunFunction ||
              (event.key !== "Enter" && event.key !== " ")
            ) {
              return;
            }
            event.preventDefault();
            event.stopPropagation();
            runFunctionNode();
          }}
        >
          <div className="ws-node-function-icon">
            {isCurrentNodeRunning ? (
              <Loader2 size={15} className="ws-spin" />
            ) : (
              <FunctionIcon
                size={15}
                fill={isStartFunction ? "currentColor" : "none"}
              />
            )}
          </div>
          <span className="ws-node-function-title">
            {isCurrentNodeRunning ? "运行中" : node.title}
          </span>
        </div>
        {renderResultCard ? (
          <FunctionResultCard
            node={node}
            onShowNodeDetail={onShowNodeDetail}
          />
        ) : null}
        <NodeHandle
          id="input-0"
          type="target"
          position={Position.Left}
          className="is-in"
          style={inputHandleStyle}
        />
        <NodeHandle
          id="output-0"
          type="source"
          position={Position.Right}
          className="is-out"
          style={outputHandleStyle}
        />
        <NodeFeedbackBeacon
          node={node}
          onOpenFeedbackRecord={onOpenFeedbackRecord}
        />
        {renderResultCard ? null : (
          <NodeResultBubble node={node} onShowNodeDetail={onShowNodeDetail} />
        )}
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
    const preview = nodeDetailPreview(node);
    const rich = nodeRichDocument(node);
    const displayOutput = nodeEnergonOutput(node);
    const displayText = nodeDisplayText(node);
    return (
      <div className={`ws-node-text-wrap ${selected ? "is-selected" : ""}`}>
        <div className="ws-node-floating-label">
          <Type size={13} className="ws-icon-green" />
          <span>{node.title}</span>
        </div>
        <div className="ws-node-text-card">
          {rich ? (
            <RichDocumentView
              value={rich}
              className="ws-node-text-rich-preview"
            />
          ) : EnergonContentView && hasDisplayOutput(displayOutput) ? (
            <div className="ws-node-text-energon-preview">
              <EnergonContentView output={displayOutput} emptyText="暂无内容" />
            </div>
          ) : (
            <p className="ws-node-text-content">
              {displayText || displayTextFromOutput(preview.text, "") || "暂无内容"}
            </p>
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
  const width = Math.min(292, window.innerWidth - margin * 2);
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

function isSuccessResponse(result: any) {
  return result?.code === 0 || result?.status === 1;
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
