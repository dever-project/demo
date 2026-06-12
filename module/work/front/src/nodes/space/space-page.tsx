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
  fetchSpaceAssetDetail,
  fetchSpaceBootstrap,
  fetchSpacePowerForm,
  fetchSpacePowers,
  fetchSpaceRunStatus,
  recoverSpaceCanvasRuns,
  resumeSpaceCanvas,
  runSpaceCanvas,
  saveSpaceCanvas,
  saveSpaceCanvasContent,
  saveSpaceCanvasMaterial,
  sendSpaceMessage,
  saveSpaceAssetEditVersion,
  useSpaceAssetVersion,
} from "./space-api";
import { persistedCanvasState } from "./space-canvas-state";
import {
  mergeProjectAssetVersionHistory,
  resultAssetKind,
  runResultAsset,
  withRunResultAsset,
} from "./space-assets";
import {
  buildNodeResultRef,
  canvasResultSourceFromNode,
} from "./space-result";
import {
  AssetPickerButton,
  AssetWorkspacePanel,
  EmptyAssetDetail,
  WorkspaceSurface,
  assetRoleForView,
  type AssetDetailRenderInput,
} from "./space-asset-viewer";
import {
  normalizeCanvasRunRef,
  type CanvasNodeResultRef,
  type CanvasRunRef,
} from "./space-runner";
import {
  FEEDBACK_REPLACED_MESSAGE,
  agentFeedbackFromResult,
  createNodeFeedbackRecord,
  currentNodeFeedbackRecords,
  flowFeedbackFromSnapshot,
  isFeedbackReplacedError,
  isReadonlyFeedbackRecord,
  normalizeFlowRunSnapshot,
  submitNodeFeedbackRecord,
  type FlowFeedbackPrompt,
  type FlowFeedbackRequester,
  type NodeFeedbackRecord,
} from "./space-feedback";
import { uploadAssetContent, uploadSpaceFiles } from "./space-upload";
import {
  assetCateById,
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
  AssetVersion,
  CanvasResultSourceRef,
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
  isPromptPowerParam,
  isToolbarPowerParam,
  isUploadPowerParam,
} from "./space-prompt-composer";
import { defaultPowerParamValues } from "./space-power-param";

const { EnergonContentView, normalizeEnergonOutput } = getCompatModule(
  "@/components/energon/content-view",
) as {
  EnergonContentView?: React.ComponentType<{ output: any; emptyText?: string }>;
  normalizeEnergonOutput?: (output: any) => any;
};
const { RichTextEditor: CompatRichTextEditor } = getCompatModule(
  "@/components/rich-text-editor",
) as {
  RichTextEditor?: React.ComponentType<{
    value: unknown;
    onChange: (value: string) => void;
    contentFormat?: "json" | "markdown";
    placeholder?: string;
    minHeight?: number;
    maxHeight?: number;
    className?: string;
    controlClassName?: string;
    disabled?: boolean;
  }>;
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
type RunningNodeMap = Record<string, RunningNodeState>;
type RunningNodeSetter = Dispatch<SetStateAction<RunningNodeMap>>;
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
type BackendNodeRunner = (node: SpaceCanvasNode) => Promise<void>;

function omitRunningNode(nodes: RunningNodeMap, nodeId: string): RunningNodeMap {
  if (!nodes[nodeId]) {
    return nodes;
  }
  const next = { ...nodes };
  delete next[nodeId];
  return next;
}

function hasRunningCanvasNode(nodes: RunningNodeMap) {
  return Object.values(nodes).some((node) => node.status === "running");
}
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
    resultRef?: SpaceCanvasNode["resultRef"];
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
  const [runningNodes, setRunningNodes] = useState<RunningNodeMap>({});
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
  const requestedAssetDetailsRef = useRef<Set<number>>(new Set());
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
      const canvases = hydrateCanvasMapAssets(
        nextSpace.canvases || {},
        nextSpace.assets || [],
      );
      setSpace(nextSpace);
      setCanvasStates(canvases);
      loadedCanvasesRef.current = serializeCanvasMap(canvases);
      setActiveCateId(defaultAssetCateId(nextSpace));
      setPowers(nextSpace.powers || []);
      setPowerKinds(nextSpace.powerKinds || []);
      requestedAssetDetailsRef.current = new Set();
      void recoverSpaceCanvasRuns(projectId).catch(() => {});
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

  const clearNodeFeedbackRecords = useCallback(
    (nodeIds: string[]) => {
      const targets = new Set(nodeIds.filter(Boolean));
      if (targets.size === 0) {
        return;
      }
      if (
        startFlowFeedbackRef.current &&
        targets.has(startFlowFeedbackRef.current.nodeId)
      ) {
        const pending = startFlowFeedbackRef.current;
        startFlowFeedbackRef.current = null;
        pending.reject(new Error(FEEDBACK_REPLACED_MESSAGE));
      }
      setStartFlowFeedbackPrompt((current) =>
        current && targets.has(current.node.id) ? null : current,
      );
      updateActiveCanvas((canvas) => ({
        ...canvas,
        nodes: canvas.nodes.map((node) =>
          targets.has(node.id) ? { ...node, feedbackRequests: [] } : node,
        ),
      }));
    },
    [updateActiveCanvas],
  );

  const upsertSpaceAsset = useCallback((asset: ProjectAsset) => {
    if (!asset || !asset.id) {
      return;
    }
    setSpace((current) => {
      if (!current) {
        return current;
      }
      const previousAsset = current.assets.find((item) => item.id === asset.id);
      const normalizedAsset = mergeProjectAssetVersionHistory(
        asset,
        previousAsset,
      );
      const exists = Boolean(previousAsset);
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
      setRunningNodes((current) => ({
        ...current,
        [startNode.id]: {
          nodeId: startNode.id,
          title: startNode.title,
          startedAt: Date.now(),
          progress: 0,
          status: "running",
        },
      }));
      try {
        clearNodeFeedbackRecords(
          canvasExecutionNodeIds(
            startNode.id,
            canvasModel.nodes,
            canvasModel.edges,
          ),
        );
        await runCanvasFromStartNode({
          projectId,
          assetCate: activeCate,
          space,
          startNode,
          nodes: canvasModel.nodes,
          edges: canvasModel.edges,
          viewport: activeCanvas.viewport,
          onNodeResult: updateNodeResult,
          onAssetCreated: upsertSpaceAsset,
          setRunningNode: setRunningNodes,
          requestFlowFeedback: requestStartFlowFeedback,
        });
        setRunningNodes((current) => ({
          ...current,
          [startNode.id]: {
            nodeId: startNode.id,
            title: startNode.title,
            startedAt: Date.now(),
            progress: 100,
            status: "success",
          },
        }));
        toast.success("开始节点执行完成");
        window.setTimeout(() => {
          setRunningNodes((current) => omitRunningNode(current, startNode.id));
        }, 700);
      } catch (err) {
        if (isFeedbackReplacedError(err)) {
          setRunningNodes((current) => omitRunningNode(current, startNode.id));
          return;
        }
        const message = err instanceof Error ? err.message : "开始节点执行失败";
        setRunningNodes((current) => ({
          ...current,
          [startNode.id]: {
            nodeId: startNode.id,
            title: startNode.title,
            startedAt: Date.now(),
            progress: 92,
            status: "error",
          },
        }));
        toast.error(message);
        window.setTimeout(() => {
          setRunningNodes((current) => omitRunningNode(current, startNode.id));
        }, 1400);
      }
    },
    [
      activeCate,
      activeCanvas.viewport,
      canvasModel.edges,
      canvasModel.nodes,
      clearNodeFeedbackRecords,
      projectId,
      requestStartFlowFeedback,
      setRunningNodes,
      space,
      updateNodeResult,
      upsertSpaceAsset,
    ],
  );

  const runBackendSingleNode = useCallback<BackendNodeRunner>(
    async (node) => {
      if (!space || !activeCate) {
        return;
      }
      const targetNode = mergeBackendSingleNodeDraft(node);
      const inputContext = buildNodeInputContext(
        node.id,
        canvasModel.nodes,
        canvasModel.edges.map((edge) => ({
          source: edge.from,
          target: edge.to,
        })),
      );
      await runCanvasFromStartNode({
        projectId,
        assetCate: activeCate,
        space,
        startNode: targetNode,
        singleNode: true,
        nodes: [targetNode],
        edges: [],
        viewport: activeCanvas.viewport,
        runInput: {
          _manual_input_context: inputContext || undefined,
          manual_node_id: node.id,
        },
        onNodeResult: updateNodeResult,
        onAssetCreated: upsertSpaceAsset,
        setRunningNode: setRunningNodes,
        requestFlowFeedback: requestStartFlowFeedback,
      });
    },
    [
      activeCate,
      activeCanvas.viewport,
      canvasModel.edges,
      canvasModel.nodes,
      projectId,
      requestStartFlowFeedback,
      setRunningNodes,
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
        loadedCanvasesRef.current[key] !==
        stableStringifyCanvas(canvas),
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
            loadedCanvasesRef.current[key] = submittedCanvasSnapshot;
            toast.error(err instanceof Error ? err.message : "保存画布失败");
          });
      }
    }, 520);
    return () => window.clearTimeout(timer);
  }, [canvasStates, space]);

  useEffect(() => {
    if (!space) {
      return;
    }
    hydrateMissingCanvasAssetDetails({
      projectId,
      nodes: activeCanvas.nodes,
      requested: requestedAssetDetailsRef.current,
      fetchAsset: (assetId) => fetchSpaceAssetDetail({ projectId, assetId }),
      onAsset: (asset) => {
        upsertSpaceAsset(asset);
        setNodeResultOverrides((current) => {
          const next = { ...current };
          let changed = false;
          for (const node of activeCanvas.nodes) {
            const assetId = canvasNodeReferencedAssetID(node);
            if (assetId !== asset.id) {
              continue;
            }
            const patchedNode = {
              ...node,
              ...(current[node.id] || {}),
            };
            next[node.id] = buildAssetVersionNodePatch(patchedNode, asset);
            changed = true;
          }
          return changed ? next : current;
        });
      },
    });
  }, [activeCanvas.nodes, projectId, space, upsertSpaceAsset]);

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
      firstDisplayOutput(asset.version?.content) ||
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
        },
        "导入资产",
      ),
    );
    void patchDirectDisplayNodes(nodeId, output);
  }

  async function patchDirectDisplayNodes(sourceNodeId: string, output: unknown) {
    if (!sourceNodeId) {
      return;
    }
    const directDisplayNodes = activeCanvas.edges
      .filter((edge) => edge.from === sourceNodeId)
      .map((edge) => activeCanvas.nodes.find((node) => node.id === edge.to))
      .filter(
        (node): node is SpaceCanvasNode =>
          Boolean(node) &&
          node.type === "function" &&
          node.functionOption?.key === "display",
      );
    if (directDisplayNodes.length === 0) {
      return;
    }
    for (const displayNode of directDisplayNodes) {
      updateNodeResult(
        displayNode.id,
        buildGeneratedNodeResultPatch(
          displayNode,
          { output },
          "展示导入结果",
        ),
      );
    }
  }

  function useImportedAsset(asset: ProjectAsset) {
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
      param.upload_rule_id,
    );
    const assetCateId = requireRealAssetCateId(Number(activeCate.id || 0));
    for (const preview of previews) {
      try {
        const asset = await saveSpaceCanvasMaterial({
          projectId,
          assetCateId,
          name: preview.name || activeCate.name,
          kind: String(preview.kind || activeCate.kind || "file"),
          content: uploadAssetContent(preview),
          requestId: createCanvasSaveRequestId("import", nodeId, preview.name),
        });
        upsertSpaceAsset({
          ...asset,
          role: "material",
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "导入资产保存失败");
      }
    }
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
        runningNodes={runningNodes}
        setRunningNode={setRunningNodes}
        onNodeResult={updateNodeResult}
        onNodeDraftChange={updateNodeComposerDraft}
        onAssetCreated={upsertSpaceAsset}
        onRunStartNode={runStartNode}
        onRunBackendNode={runBackendSingleNode}
        onOpenImportPicker={openImportPicker}
        onClearFeedbackRecords={clearNodeFeedbackRecords}
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
          assetLibrary={buildComposerAssetLibrary(space, null, activeCate)}
          onChange={() => undefined}
          onParamChange={() => undefined}
          onAssetReference={(asset) => {
            if (asset.source === "asset" && asset.asset) {
              useImportedAsset(asset.asset as ProjectAsset);
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
          renderAssetDetail={(input) => <AssetEditorSurface {...input} />}
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
          onNodeUpdated={(nodePatch) => {
            updateNodeResult(nodeDetail.id, nodePatch);
            setNodeDetail((current) =>
              current?.id === nodeDetail.id
                ? {
                    ...current,
                    ...nodePatch,
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

function AssetEditorSurface({
  activeCate,
  asset,
  mode = "browse",
  onPickAsset,
}: AssetDetailRenderInput) {
  const displayValue = assetDisplayValue(asset?.version?.content);
  const preview = generatedPreviewFromValue(
    firstDefined(asset?.version?.content, displayValue),
    String(asset?.kind || activeCate.kind || ""),
  );
  const rich = firstTiptapRichDocument(displayValue);
  const displayOutput = normalizeEnergonDisplayOutput(displayValue);
  const content =
    safeDocumentText(displayValue) ||
    displayTextFromOutput(displayValue, "") ||
    assetContentText(asset);
  return (
    <article className="ws-asset-editor">
      <header className="ws-asset-editor-head">
        <div>
          <span>{activeCate.name}</span>
          <strong>{asset?.name || activeCate.name}</strong>
        </div>
        <div className="ws-asset-editor-actions">
          {asset?.version?.version ? (
            <button type="button" disabled>
              <History size={14} />
              <span>版本 {asset.version.version}</span>
            </button>
          ) : null}
          {mode === "select" && asset && onPickAsset ? (
            <AssetPickerButton onPickAsset={onPickAsset} />
          ) : null}
        </div>
      </header>
      <div className="ws-asset-editor-body custom-scrollbar">
        {!asset ? (
          <EmptyAssetDetail activeCate={activeCate} />
        ) : preview.imageUrl ? (
          <div className="ws-asset-media-detail">
            <img src={preview.imageUrl} alt={asset.name || activeCate.name} />
          </div>
        ) : preview.videoUrl ? (
          <div className="ws-asset-media-detail">
            <video src={preview.videoUrl} controls playsInline />
          </div>
        ) : preview.audioUrl ? (
          <div className="ws-asset-media-detail">
            <audio src={preview.audioUrl} controls />
          </div>
        ) : preview.fileUrl ? (
          <div className="ws-asset-file-detail">
            <FileText size={40} />
            <strong>{asset.name || activeCate.name}</strong>
            <span>{preview.fileUrl}</span>
            <a href={preview.fileUrl} download>
              <Download size={15} />
              下载文件
            </a>
          </div>
        ) : EnergonContentView && hasDisplayOutput(displayOutput) ? (
          <div className="ws-asset-energon-detail">
            <EnergonContentView output={displayOutput} emptyText="暂无内容" />
          </div>
        ) : rich ? (
          <RichDocumentView
            value={rich}
            className="ws-asset-rich-detail"
          />
        ) : (
          <textarea
            value={content}
            readOnly
            placeholder={`暂无${activeCate.name}内容`}
          />
        )}
      </div>
    </article>
  );
}

function assetDisplayValue(value: unknown) {
  const parsed = parseMaybeJSON(value);
  const agentResult = parseAgentResultBlock(parsed);
  if (agentResult !== parsed) {
    return assetDisplayValue(agentResult);
  }
  const normalized = normalizeDisplayOutputForCanvas(parsed);
  if (normalized !== parsed && hasDisplayOutput(normalized)) {
    return normalized;
  }
  const rich = fixedTiptapRichDocument(parsed);
  if (rich) {
    return rich;
  }
  return parsed;
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
  runningNodes,
  setRunningNode,
  onNodeResult,
  onNodeDraftChange,
  onAssetCreated,
  onRunStartNode,
  onRunBackendNode,
  onOpenImportPicker,
  onClearFeedbackRecords,
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
  runningNodes: RunningNodeMap;
  setRunningNode: RunningNodeSetter;
  onNodeResult: NodeResultSetter;
  onNodeDraftChange: NodeDraftSetter;
  onAssetCreated: (asset: ProjectAsset) => void;
  onRunStartNode: NodeStartRunner;
  onOpenImportPicker: (nodeId: string) => void;
  onClearFeedbackRecords: (nodeIds: string[]) => void;
  requestConfirm: ConfirmRequester;
  onRunBackendNode: BackendNodeRunner;
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
        runningNode: runningNodes[node.id] || null,
        canvasRunningNodes: runningNodes,
        setRunningNode,
        onAddConfiguredNode,
        onNodeResult,
        onNodeDraftChange,
        onAssetCreated,
        onRunStartNode,
        onOpenImportPicker,
        onClearFeedbackRecords,
        onOpenFeedbackRecord,
        onShowNodeDetail,
        requestConfirm,
        onRunBackendNode,
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
    onClearFeedbackRecords,
    onNodeResult,
    onNodeDraftChange,
    onOpenFeedbackRecord,
    onOpenImportPicker,
    onRunBackendNode,
    onRunStartNode,
    onShowNodeDetail,
    projectId,
    requestConfirm,
    runningNodes,
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

  const canvasWrapClassName = [
    "ws-canvas-wrap",
    draggingNodeId ? "is-dragging" : "",
    interactive ? "is-interactive" : "is-passive",
    mode === "result" ? "is-result-mode" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={canvasWrapClassName}>
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
  onNodeUpdated,
  onClose,
}: {
  projectId: number;
  node: SpaceCanvasNode;
  onNodeUpdated?: (patch: Partial<SpaceCanvasNode>) => void;
  onClose: () => void;
}) {
  const [detailNode, setDetailNode] = useState(node);
  useEffect(() => {
    setDetailNode((current) => {
      const currentAssetId = Number(current.asset?.id || 0);
      const nextAssetId = Number(node.asset?.id || 0);
      if (
        current.id === node.id &&
        currentAssetId > 0 &&
        currentAssetId === nextAssetId &&
        node.asset
      ) {
        return {
          ...node,
          asset: mergeProjectAssetVersionHistory(node.asset, current.asset),
        };
      }
      return node;
    });
  }, [node]);
  useEffect(() => {
    const assetId = Number(node.asset?.id || 0);
    if (!assetId) {
      return;
    }
    let canceled = false;
    fetchSpaceAssetDetail({ projectId, assetId })
      .then((asset) => {
        if (canceled) {
          return;
        }
        setDetailNode((current) => ({
          ...current,
          ...buildAssetVersionNodePatch(
            current,
            mergeProjectAssetVersionHistory(asset, current.asset || node.asset),
          ),
        }));
      })
      .catch(() => {});
    return () => {
      canceled = true;
    };
  }, [node.asset?.id, projectId]);
  const versionItems = useMemo(
    () => nodeDetailVersionItems(detailNode),
    [detailNode],
  );
  const currentVersionItemId = versionItems[0]?.id || "current";
  const [activeVersionId, setActiveVersionId] = useState(
    () => currentVersionItemId,
  );
  const activeVersion =
    versionItems.find((candidate) => candidate.id === activeVersionId) ||
    versionItems[0];
  const activeNode = activeVersion?.node || detailNode;
  const detailRich = nodeRichDocument(activeNode);
  const displayOutput = nodeEnergonOutput(activeNode);
  const detailText = displayTextFromOutput(
    displayOutput,
    activeNode.description || "",
  );
  const editableSource = nodeDetailEditorSource(
    detailRich,
    displayOutput,
    detailText,
  );
  const [editableContent, setEditableContent] = useState(
    () => editableSource.value,
  );
  const autoSaveTimerRef = useRef<number | null>(null);
  const savedContentRef = useRef(editableSource.value);
  const [saveStatus, setSaveStatus] = useState<NodeDetailSaveStatus>("saved");
  const [savedAt, setSavedAt] = useState(() => nodeDetailUpdatedAt(activeNode));
  useEffect(() => {
    setActiveVersionId(currentVersionItemId);
  }, [node.id, currentVersionItemId]);
  useEffect(() => {
    setEditableContent(editableSource.value);
    savedContentRef.current = editableSource.value;
    setSaveStatus("saved");
    setSavedAt(nodeDetailUpdatedAt(activeNode));
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  }, [
    editableSource.value,
    editableSource.contentFormat,
    activeNode.id,
    activeVersion?.id,
  ]);
  useEffect(
    () => () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
    },
    [],
  );
  const preview = nodeDetailPreview(activeNode);
  const downloadUrl =
    preview.imageUrl || preview.videoUrl || preview.audioUrl || preview.fileUrl;
  const activeDetailAsset = activeNode.asset || node.asset;
  const activeDetailVersion = activeDetailAsset?.version;
  const canAutoSaveVersion = Boolean(
    activeVersion?.isCurrent &&
      activeDetailAsset?.id &&
      activeDetailVersion?.id,
  );
  const hasVersionSidebar = versionItems.length > 0;
  const isMediaDetail = Boolean(
    preview.imageUrl ||
      preview.videoUrl ||
      preview.audioUrl ||
      preview.fileUrl,
  );
  const canEditDetail = !isMediaDetail;
  const saveStatusLabel = nodeDetailSaveStatusLabel(
    saveStatus,
    canAutoSaveVersion,
  );
  const persistCurrentContent = useCallback(
    async (content: string) => {
      const asset = activeNode.asset || node.asset;
      const version = asset?.version;
      if (!onNodeUpdated || !asset?.id || !version?.id) {
        return;
      }
      setSaveStatus("saving");
      const contentValue = parseEditableContentForSave(
        content,
        editableSource.contentFormat,
      );
      try {
        const savedAsset = await saveSpaceAssetEditVersion({
          projectId,
          assetId: asset.id,
          versionId: version.id,
          content: contentValue,
          requestId: createCanvasSaveRequestId("edit", activeNode.id, content),
        });
        const normalizedAsset = mergeProjectAssetVersionHistory(
          savedAsset,
          asset,
        );
        onNodeUpdated(buildAssetVersionNodePatch(activeNode, normalizedAsset));
        savedContentRef.current = content;
        setSavedAt(nodeDetailAssetUpdatedAt(normalizedAsset));
        setSaveStatus("saved");
      } catch (err) {
        setSaveStatus("error");
        toast.error(err instanceof Error ? err.message : "保存失败");
      }
    },
    [activeNode, editableSource.contentFormat, node.asset, onNodeUpdated, projectId],
  );

  useEffect(() => {
    if (!canEditDetail || !canAutoSaveVersion) {
      return;
    }
    if (editableContent === savedContentRef.current) {
      if (saveStatus === "typing" || saveStatus === "error") {
        setSaveStatus("saved");
      }
      return;
    }
    setSaveStatus("typing");
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = window.setTimeout(() => {
      autoSaveTimerRef.current = null;
      persistCurrentContent(editableContent);
    }, 900);
  }, [
    canAutoSaveVersion,
    canEditDetail,
    editableContent,
    persistCurrentContent,
    saveStatus,
  ]);

  async function handleVersionSelect(candidate: NodeDetailVersionItem) {
    if (candidate.id === activeVersion?.id) {
      setActiveVersionId(candidate.id);
      return;
    }
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    setActiveVersionId(candidate.id);
    const candidateSource = nodeDetailEditorSource(
      nodeRichDocument(candidate.node),
      nodeEnergonOutput(candidate.node),
      displayTextFromOutput(
        nodeEnergonOutput(candidate.node),
        candidate.node.description || "",
      ),
    );
    setEditableContent(candidateSource.value);
    savedContentRef.current = candidateSource.value;
    setSaveStatus("saved");
    setSavedAt(nodeDetailUpdatedAt(candidate.node));
    if (!candidate.isCurrent && onNodeUpdated) {
      const candidateVersion = candidate.node.asset?.version;
      const asset = node.asset;
      if (candidateVersion?.id && asset?.id) {
        try {
          const savedAsset = await useSpaceAssetVersion({
            projectId,
            assetId: asset.id,
            versionId: candidateVersion.id,
          });
          const normalizedAsset = mergeProjectAssetVersionHistory(
            savedAsset,
            asset,
          );
          onNodeUpdated(buildAssetVersionNodePatch(node, normalizedAsset));
          const currentVersionId =
            normalizedAsset.version?.id || candidateVersion.id;
          setActiveVersionId(`version-${currentVersionId}`);
          setSavedAt(nodeDetailAssetUpdatedAt(normalizedAsset));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "切换版本失败");
        }
      }
    }
  }

  return (
    <div className="ws-node-detail-backdrop" onMouseDown={onClose}>
      <section
        className={`ws-node-detail-modal ${
          hasVersionSidebar ? "has-version-sidebar" : ""
        }`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="ws-node-detail-head">
          <div className="ws-node-detail-title">
            <strong>{activeNode.title}</strong>
            {savedAt ? <span>最后更新：{savedAt}</span> : null}
            {saveStatusLabel ? (
              <em className={`is-${saveStatus}`}>{saveStatusLabel}</em>
            ) : null}
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
        <div
          className={`ws-node-detail-body ${
            isMediaDetail ? "is-media-detail" : ""
          }`}
        >
          {preview.imageUrl ? (
            <img src={preview.imageUrl} alt={preview.text || activeNode.title} />
          ) : preview.videoUrl ? (
            <video src={preview.videoUrl} controls playsInline />
          ) : preview.audioUrl ? (
            <audio src={preview.audioUrl} controls />
          ) : preview.fileUrl ? (
            <div className="ws-node-detail-file">
              <FileText size={46} />
              <strong>{preview.text || activeNode.title}</strong>
              <span>{preview.fileUrl}</span>
              <a href={preview.fileUrl} download>
                <Download size={16} />
                下载文件
              </a>
            </div>
          ) : canEditDetail ? (
            <NodeDetailRichEditor
              value={editableContent}
              onChange={setEditableContent}
              contentFormat={editableSource.contentFormat}
            />
          ) : (
            <div className="ws-node-detail-output ws-node-detail-empty">
              暂无详情
            </div>
          )}
        </div>
        {hasVersionSidebar ? (
          <aside className="ws-node-detail-side">
            <div className="ws-node-detail-side-head">
              <span>记录</span>
              <strong>{versionItems.length}</strong>
            </div>
            <div className="ws-node-detail-side-list">
              {versionItems.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  className={[
                    candidate.id === activeVersion?.id ? "is-active" : "",
                    candidate.isCurrent ? "is-current" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleVersionSelect(candidate)}
                >
                  <span className="ws-node-detail-version-title">
                    <strong>{candidate.title}</strong>
                    {candidate.isCurrent ? (
                      <i>
                        <CheckCircle2 size={12} />
                        当前版本
                      </i>
                    ) : null}
                  </span>
                  {candidate.time ? <em>{candidate.time}</em> : null}
                  <small>{candidate.summary}</small>
                </button>
              ))}
            </div>
          </aside>
        ) : null}
      </section>
    </div>
  );
}

type NodeDetailVersionItem = {
  id: string;
  title: string;
  summary: string;
  time: string;
  isCurrent: boolean;
  node: SpaceCanvasNode;
};

type NodeDetailSaveStatus = "saved" | "typing" | "saving" | "error";

function nodeDetailSaveStatusLabel(
  status: NodeDetailSaveStatus,
  canAutoSave: boolean,
) {
  if (!canAutoSave) {
    return "";
  }
  if (status === "typing") {
    return "输入中";
  }
  if (status === "saving") {
    return "保存中";
  }
  if (status === "error") {
    return "保存失败";
  }
  return "已保存";
}

function nodeDetailVersionItems(node: SpaceCanvasNode): NodeDetailVersionItem[] {
  if (!node.asset?.id) {
    return [];
  }
  const currentVersionId = Number(
    node.asset.version_id || node.asset.version?.id || 0,
  );
  return nodeDetailOrderedVersions(node).map((version, index) =>
    nodeDetailVersionItem(
      node,
      version,
      currentVersionId > 0
        ? Number(version.id || 0) === currentVersionId
        : index === 0,
    ),
  );
}

function nodeDetailOrderedVersions(node: SpaceCanvasNode): AssetVersion[] {
  if (!node.asset?.id) {
    return [];
  }
  const versions: AssetVersion[] = [];
  const seen = new Set<string>();
  const appendVersion = (version: AssetVersion | undefined | null) => {
    if (!version || Number(version.id || 0) <= 0) {
      return;
    }
    const key = String(version.id || version.version || versions.length);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    versions.push(version);
  };

  appendVersion(node.asset.version);
  const historyVersions = nodeDetailHistoryVersions(node);
  for (const version of historyVersions) {
    appendVersion(version);
  }

  return versions;
}

function nodeDetailHistoryVersions(node: SpaceCanvasNode): AssetVersion[] {
  const candidates = node.asset?.versions;
  if (!Array.isArray(candidates)) {
    return [];
  }
  return candidates
    .filter((version): version is AssetVersion => Boolean(version))
    .sort(
      (left, right) =>
        Number(right.version || right.id || 0) - Number(left.version || left.id || 0),
    );
}

function nodeDetailVersionItem(
  node: SpaceCanvasNode,
  version: AssetVersion,
  isCurrent: boolean,
): NodeDetailVersionItem {
  const versionNode: SpaceCanvasNode = {
    ...node,
    asset: node.asset
      ? { ...node.asset, version, version_id: version.id || node.asset.version_id }
      : node.asset,
  };
  return {
    id: `version-${Number(version.id || 0) || Number(version.version || 0) || "latest"}`,
    title: Number(version.version || 0)
      ? `第 ${Number(version.version)} 版`
      : isCurrent
        ? "当前版本"
        : "历史版本",
    summary: nodeDetailResultSummary(versionNode),
    time: formatNodeDetailTime(version.created_at),
    isCurrent,
    node: versionNode,
  };
}

function isEnergonProtocolDetailOutput(value: any) {
  const rawParsed = parseMaybeJSON(value);
  if (typeof rawParsed === "string") {
    return isAgentResultProtocolText(rawParsed);
  }
  const normalized = normalizeEnergonOutput?.(rawParsed);
  const items = Array.isArray(normalized) ? normalized : [normalized ?? rawParsed];
  return items.some((item) => {
    const parsed = parseMaybeJSON(item);
    if (typeof parsed === "string") {
      return isAgentResultProtocolText(parsed);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return false;
    }
    return (
      "content" in parsed ||
      "kind" in parsed ||
      "event" in parsed ||
      [
        "title",
        "text",
        "reasoning",
        "images",
        "videos",
        "audios",
        "files",
        "json",
        "error",
        "progress",
        "meta",
        "suggestions",
        "tasks",
      ].some((key) => hasDisplayOutput(parsed[key]))
    );
  });
}

function nodeDetailUpdatedAt(node: SpaceCanvasNode) {
  const raw = firstDefined(
    node.asset?.version?.created_at,
    node.asset?.created_at,
  );
  return formatNodeDetailTime(raw);
}

function nodeDetailAssetUpdatedAt(asset: ProjectAsset) {
  return formatNodeDetailTime(
    firstDefined(asset.version?.created_at, asset.created_at),
  );
}

function formatNodeDetailTime(value: unknown) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  return text
    .replace("T", " ")
    .replace(/\.\d+(Z)?$/, "")
    .replace(/Z$/, "");
}

function nodeDetailResultSummary(node: SpaceCanvasNode) {
  const preview = nodeDetailPreview(node);
  if (preview.imageUrl) {
    return "图片内容";
  }
  if (preview.videoUrl) {
    return "视频内容";
  }
  if (preview.audioUrl) {
    return "音频内容";
  }
  if (preview.fileUrl) {
    return preview.text || "文件内容";
  }
  return (
    displayTextFromOutput(nodeEnergonOutput(node), node.description || "") ||
    "暂无内容"
  );
}

type NodeDetailEditorContentFormat = "json" | "markdown";

type NodeDetailEditorSource = {
  value: string;
  contentFormat: NodeDetailEditorContentFormat;
};

function nodeDetailEditorSource(
  rich: ReturnType<typeof richDocument>,
  displayOutput: any,
  fallbackText: string,
): NodeDetailEditorSource {
  const markdownSource = nodeDetailMarkdownText(displayOutput);
  if (markdownSource) {
    return {
      value: markdownSource,
      contentFormat: "markdown",
    };
  }

  const richSource = rich || nodeDetailRichDocumentFromOutput(displayOutput);
  if (richSource) {
    return {
      value: richDocumentToEditorValue(richSource),
      contentFormat: "json",
    };
  }

  return {
    value: fallbackText || "",
    contentFormat: "markdown",
  };
}

function nodeDetailRichDocumentFromOutput(
  output: any,
): ReturnType<typeof richDocument> {
  const directRich = fixedRichDocument(output);
  if (directRich) {
    return directRich;
  }

  const normalized = normalizeEnergonOutput?.(output) ?? output;
  const items = Array.isArray(normalized) ? normalized : [normalized];
  for (const item of items) {
    const rich = fixedRichDocument(item);
    if (rich) {
      return rich;
    }
  }
  return null;
}

function nodeDetailMarkdownText(output: any) {
  const normalized = normalizeEnergonOutput?.(output) ?? output;
  const items = Array.isArray(normalized) ? normalized : [normalized];
  const texts: string[] = [];
  for (const item of items) {
    if (isHiddenEnergonOutput(item)) {
      continue;
    }
    const text = textFromEnergonItem(item);
    if (text) {
      texts.push(text);
    }
  }
  return uniqueNonEmptyStrings(texts).join("\n\n").trim();
}

function isHiddenEnergonOutput(value: any) {
  const parsed = parseAgentResultBlock(parseMaybeJSON(value));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return false;
  }
  const row = parsed as Record<string, any>;
  const event = String(row.event || "").trim().toLowerCase();
  if (event === "start" || event === "progress") {
    return true;
  }
  return event === "end" && !hasDisplayOutput(row.text) && !hasDisplayOutput(row.error);
}

function textFromEnergonItem(value: any): string {
  const parsed = parseAgentResultBlock(parseMaybeJSON(value));
  if (typeof parsed === "string") {
    return looksLikeStructuredJSONSnippet(parsed) ? "" : parsed;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return "";
  }
  const content =
    parsed.content && typeof parsed.content === "object" && !Array.isArray(parsed.content)
      ? parsed.content
      : null;
  const directText = firstText(
    parsed.text,
    content?.text,
    parsed.summary,
    content?.summary,
  );
  if (directText) {
    return directText;
  }
  for (const key of ["output", "result", "data", "value", "content"]) {
    if (parsed[key] !== undefined && parsed[key] !== parsed) {
      const nestedText = textFromEnergonItem(parsed[key]);
      if (nestedText) {
        return nestedText;
      }
    }
  }
  return "";
}

function parseEditableContentForSave(
  value: string,
  contentFormat: NodeDetailEditorContentFormat,
) {
  if (contentFormat === "markdown") {
    return value;
  }
  const parsed = parseMaybeJSON(value);
  const rich = safeRichDocument(parsed);
  return rich || plainTextToRichDocument(value);
}

function richDocumentToEditorValue(value: ReturnType<typeof richDocument>) {
  if (!value) {
    return "";
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
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

function NodeDetailRichEditor({
  value,
  onChange,
  contentFormat,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  contentFormat: NodeDetailEditorContentFormat;
  disabled?: boolean;
}) {
  return (
    <div className="ws-node-detail-editor">
      {CompatRichTextEditor ? (
        <CompatRichTextEditor
          value={value}
          onChange={onChange}
          contentFormat={contentFormat}
          placeholder="编辑内容"
          disabled={disabled}
          minHeight={0}
          maxHeight={2400}
          controlClassName="ws-node-detail-rich-editor"
        />
      ) : (
        <textarea
          className="ws-node-detail-fallback-editor"
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="编辑内容"
        />
      )}
    </div>
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
    case "codeBlock":
      return (
        <pre key={key}>
          <code>{safeDocumentText(node)}</code>
        </pre>
      );
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

function buildGeneratedNodeResultPatch(
  node: SpaceCanvasNode,
  result: any,
  fallbackPrompt: string,
): Partial<SpaceCanvasNode> {
  const rawOutput = firstDefined(
    result?.output,
    result?.asset?.version?.content,
    result?.data?.output,
    result?.data?.content,
    result?.data?.result,
    result?.data,
  );
  const output = firstDisplayOutput(rawOutput) || extractDisplayOutput(rawOutput);
  const resultKind = firstText(
    String(result?.asset?.kind || ""),
    String(result?.kind || ""),
    nodePreviewKind(node, output),
  );
  const preview = generatedPreviewFromValue(
    output,
    resultKind,
  );
  const outputText = safeDocumentText(output);
  const summary =
    preview.text ||
    (!looksLikeURL(outputText) ? outputText : "") ||
    preview.imageUrl ||
    preview.videoUrl ||
    preview.audioUrl ||
    preview.fileUrl ||
    (fallbackPrompt ? `已按提示生成：${fallbackPrompt}` : "生成完成");

  return {
    description: summary,
    resultRef: buildNodeResultRef(result),
    resultOutput: output,
    asset: result?.asset || node.asset,
    kind: result?.asset?.kind || node.power?.kind || node.kind,
  };
}

function buildAssetVersionNodePatch(
  node: SpaceCanvasNode,
  asset: ProjectAsset,
): Partial<SpaceCanvasNode> {
  const content = asset.version?.content;
  const patch = buildGeneratedNodeResultPatch(
    node,
    {
      asset,
      output: content,
    },
    documentPreview(content),
  );
  return {
    ...patch,
    asset,
  };
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

function mergeBackendSingleNodeDraft(node: SpaceCanvasNode): SpaceCanvasNode {
  const draft = normalizeComposerDraft((node as any).composerDraft);
  if (node.type !== "power" && node.type !== "agent") {
    return node;
  }
  return {
    ...node,
    composerDraft: {
      ...(node as any).composerDraft,
      prompt: draft.prompt,
      paramValues: draft.paramValues,
      selectedTargetId: draft.selectedTargetId,
    },
  };
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
  singleNode?: boolean;
  nodes: SpaceCanvasNode[];
  edges: SpaceCanvasEdge[];
  viewport: SpaceCanvasState["viewport"];
  runInput?: Record<string, unknown>;
  onNodeResult: NodeResultSetter;
  onAssetCreated: (asset: ProjectAsset) => void;
  setRunningNode?: RunningNodeSetter;
  requestFlowFeedback?: FlowFeedbackRequester;
  canvasRun?: CanvasRunRef | null;
};

async function runCanvasFromStartNode(input: CanvasStartRunInput) {
  const requestId = createCanvasRunRequestId(input.startNode.id);
  const appliedNodeResults = new Set<string>();
  let hasAppliedNodeResult = false;
  let rawCanvasRun = await runSpaceCanvas({
    projectId: input.projectId,
    assetCateId: Number(input.assetCate.id || 0),
    startNodeId: input.startNode.id,
    requestId,
    singleNode: input.singleNode,
    canvas: {
      assetCateId: Number(input.assetCate.id || 0),
      nodes: input.nodes,
      edges: input.edges,
      viewport: input.viewport || {},
    },
    runInput: {
      ...(input.runInput || {}),
      start_node_id: input.startNode.id,
    },
  });
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const canvasRun = await waitForCanvasRun(
      input,
      rawCanvasRun,
      (results) => {
        const applied = applyBackendCanvasRunResults(
          input,
          results,
          appliedNodeResults,
        );
        markBackendCanvasNodeResultsDone(input, results);
        hasAppliedNodeResult = hasAppliedNodeResult || applied > 0;
      },
      () => hasAppliedNodeResult,
    );
    input.canvasRun = canvasRun;
    if (
      input.singleNode &&
      hasAppliedNodeResult &&
      (canvasRun.status === "running" || canvasRun.status === "pending")
    ) {
      toast.info("节点结果已返回，后台运行仍在收尾");
      return;
    }
    const executed = Number(canvasRun.executed || 0);
    if (!input.singleNode) {
      input.onNodeResult(
        input.startNode.id,
        buildFunctionRunPatch(
          canvasRun,
          canvasRunSummaryText(canvasRun, executed),
        ),
      );
    }
    if (canvasRun.status !== "waiting") {
      finishBackendCanvasRunningNodes(input, canvasRun);
      return;
    }
    rawCanvasRun = await resumeBackendCanvasRun(input, canvasRun);
  }
  throw new Error("画布运行多次等待反馈，请稍后继续");
}

async function waitForCanvasRun(
  input: CanvasStartRunInput,
  rawCanvasRun: unknown,
  applyNodeResults: (results: CanvasNodeResultRef[]) => void,
  hasAppliedNodeResult: () => boolean,
): Promise<CanvasRunRef> {
  let canvasRun = normalizeCanvasRunRef(rawCanvasRun);
  for (let index = 0; index < 90; index += 1) {
    applyNodeResults(canvasRun.node_results || []);
    if (canvasRun.status !== "running" && canvasRun.status !== "pending") {
      return canvasRun;
    }
    if (!canvasRun.run_id && !canvasRun.request_id) {
      return canvasRun;
    }
    await delay(900);
    const status = await fetchSpaceRunStatus({
      projectId: input.projectId,
      runId: Number(canvasRun.run_id || 0),
      requestId: String(canvasRun.request_id || ""),
    });
    canvasRun = normalizeCanvasRunRef(status);
  }
  applyNodeResults(canvasRun.node_results || []);
  if (input.singleNode && hasAppliedNodeResult()) {
    finishBackendCanvasRunningNodes(input, canvasRun);
    return canvasRun;
  }
  throw new Error("画布仍在运行，请稍后刷新查看结果");
}

function markBackendCanvasNodeResultsDone(
  input: CanvasStartRunInput,
  results: CanvasNodeResultRef[],
) {
  if (!input.setRunningNode) {
    return;
  }
  const doneResults = results.filter((result) =>
    canvasNodeRunFinishedStatus(result.status),
  );
  if (doneResults.length === 0) {
    return;
  }
  input.setRunningNode((current) => {
    let changed = false;
    const next = { ...current };
    for (const result of doneResults) {
      const nodeId = result.node_key;
      const running = next[nodeId];
      if (!running) {
        continue;
      }
      next[nodeId] = {
        ...running,
        progress: 100,
        status: result.status === "success" ? "success" : "error",
      };
      changed = true;
    }
    return changed ? next : current;
  });
  window.setTimeout(() => {
    input.setRunningNode?.((current) => {
      let changed = false;
      let next = current;
      for (const result of doneResults) {
        const nodeId = result.node_key;
        const running = next[nodeId];
        if (!running || running.status === "running") {
          continue;
        }
        if (next === current) {
          next = { ...current };
        }
        delete next[nodeId];
        changed = true;
      }
      return changed ? next : current;
    });
  }, 650);
}

function finishBackendCanvasRunningNodes(
  input: CanvasStartRunInput,
  canvasRun: CanvasRunRef,
) {
  if (
    !input.setRunningNode ||
    canvasRun.status === "running" ||
    canvasRun.status === "pending" ||
    canvasRun.status === "waiting"
  ) {
    return;
  }
  const finishedStatus =
    canvasRun.status === "success" || canvasRun.status === "canceled"
      ? "success"
      : "error";
  const nodeIds = backendCanvasRunNodeIds(input, canvasRun);
  input.setRunningNode((current) => {
    let changed = false;
    const next = { ...current };
    for (const nodeId of nodeIds) {
      const running = next[nodeId];
      if (!running) {
        continue;
      }
      next[nodeId] = {
        ...running,
        progress: finishedStatus === "success" ? 100 : Math.max(running.progress, 92),
        status: finishedStatus,
      };
      changed = true;
    }
    return changed ? next : current;
  });
  window.setTimeout(() => {
    input.setRunningNode?.((current) => {
      let changed = false;
      let next = current;
      for (const nodeId of nodeIds) {
        const running = next[nodeId];
        if (!running || running.status === "running") {
          continue;
        }
        if (next === current) {
          next = { ...current };
        }
        delete next[nodeId];
        changed = true;
      }
      return changed ? next : current;
    });
  }, finishedStatus === "success" ? 650 : 1200);
}

function backendCanvasRunNodeIds(
  input: CanvasStartRunInput,
  canvasRun: CanvasRunRef,
) {
  const result = new Set<string>();
  result.add(input.startNode.id);
  for (const nodeRun of canvasRun.node_runs || []) {
    if (nodeRun.node_key) {
      result.add(nodeRun.node_key);
    }
  }
  for (const nodeResult of canvasRun.node_results || []) {
    if (nodeResult.node_key) {
      result.add(nodeResult.node_key);
    }
  }
  if (canvasRun.execution_plan?.nodes) {
    for (const node of canvasRun.execution_plan.nodes) {
      result.add(node.id);
    }
  }
  return [...result];
}

function canvasNodeRunFinishedStatus(status?: string) {
  return status === "success" || status === "fail" || status === "canceled";
}

function createCanvasRunRequestId(startNodeId: string) {
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `canvas-${randomPart}-${startNodeId}`.slice(0, 64);
}

function createCanvasSaveRequestId(
  purpose: string,
  nodeId: string,
  content: unknown,
) {
  const contentKey =
    typeof content === "string" ? content : safeJSONString(content);
  const bucket = Math.floor(Date.now() / 5000);
  return `${purpose}-${nodeId}-${bucket}-${simpleStringHash(contentKey)}`.slice(
    0,
    96,
  );
}

function simpleStringHash(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

async function resumeBackendCanvasRun(
  input: CanvasStartRunInput,
  canvasRun: CanvasRunRef,
) {
  const pending = canvasRun.pending_node;
  if (!pending?.node_key) {
    throw new Error("画布运行等待反馈，但缺少等待节点");
  }
  const node = input.nodes.find((item) => item.id === pending.node_key);
  if (!node) {
    throw new Error("画布运行等待节点不存在");
  }
  const prompt = backendCanvasFeedbackPrompt(pending, node);
  if (!prompt || !input.requestFlowFeedback) {
    throw new Error(`${node.title} 需要补充信息，请单独处理后继续`);
  }
  const values = await input.requestFlowFeedback({ node, prompt });
  return resumeSpaceCanvas({
    projectId: input.projectId,
    runId: Number(canvasRun.run_id || 0),
    requestId: String(canvasRun.request_id || ""),
    nodeKey: pending.node_key,
    approvalId: Number(prompt.approval.id || 0),
    feedback: values,
  });
}

function backendCanvasFeedbackPrompt(
  pending: CanvasNodeResultRef,
  node: SpaceCanvasNode,
): FlowFeedbackPrompt | null {
  if (pending.node_type === "flow") {
    const snapshot = normalizeFlowRunSnapshot(pending.output || pending.result);
    return flowFeedbackFromSnapshot(snapshot);
  }
  return agentFeedbackFromResult(
    backendCanvasNodeResultPayload(pending),
    node.title,
  );
}

function applyBackendCanvasRunResults(
  input: CanvasStartRunInput,
  results: CanvasNodeResultRef[],
  appliedNodeResults?: Set<string>,
) {
  let applied = 0;
  const nodesById = new Map(input.nodes.map((node) => [node.id, node]));
  for (const result of results) {
    const node = nodesById.get(result.node_key);
    if (!node || result.status !== "success") {
      continue;
    }
    const resultKey = canvasNodeResultApplyKey(result);
    if (resultKey && appliedNodeResults?.has(resultKey)) {
      continue;
    }
    const patch = buildBackendCanvasNodePatch(input, node, result);
    input.onNodeResult(node.id, patch);
    if (resultKey) {
      appliedNodeResults?.add(resultKey);
    }
    applied += 1;
    const patchedNode = {
      ...node,
      ...patch,
    };
    nodesById.set(node.id, patchedNode);
    input.nodes = input.nodes.map((item) =>
      item.id === node.id ? patchedNode : item,
    );
    if (patch.asset) {
      input.onAssetCreated(patch.asset);
    }
  }
  return applied;
}

function canvasNodeResultApplyKey(result: CanvasNodeResultRef) {
  return [
    result.node_key,
    result.node_run_id || "",
    result.status || "",
    Number(
      result.version?.id ||
        result.asset?.version?.id ||
        (result.result as any)?.version?.id ||
        0,
    ),
    Number(
      result.asset?.id ||
        (result.result as any)?.asset?.id ||
        0,
    ),
  ].join(":");
}

function buildBackendCanvasNodePatch(
  input: CanvasStartRunInput,
  node: SpaceCanvasNode,
  result: CanvasNodeResultRef,
) {
  const normalizedResult = backendCanvasNodeResultPayload(result);
  const asset = runResultAsset({
    result: normalizedResult,
    previousAsset: node.asset,
    previousAssets: input.space.assets,
  });
  if (asset) {
    return buildGeneratedNodeResultPatch(
      node,
      withRunResultAsset(normalizedResult, asset),
      "后端执行结果",
    );
  }
  return buildGeneratedNodeResultPatch(
    node,
    normalizedResult,
    "后端执行结果",
  );
}

function backendCanvasNodeResultPayload(result: CanvasNodeResultRef) {
  const payload: Record<string, unknown> = {
    ...(result.result && typeof result.result === "object" ? result.result : {}),
    run_id: (result.result as any)?.run_id,
    request_id: (result.result as any)?.request_id,
    node_run_id: result.node_run_id || (result.result as any)?.node_run_id,
    status: result.status || (result.result as any)?.status,
    output: result.output ?? (result.result as any)?.output,
    asset: result.asset || (result.result as any)?.asset,
    version:
      result.version ||
      (result.result as any)?.version ||
      result.asset?.version,
    agent_run_id: result.agent_run_id || (result.result as any)?.agent_run_id,
  };
  return payload;
}

function canvasRunSummaryText(canvasRun: CanvasRunRef, executed: number) {
  if (canvasRun.status === "waiting") {
    return `已执行 ${executed} 个连接节点，等待补充信息`;
  }
  if (canvasRun.status === "fail") {
    return `画布运行失败，已执行 ${executed} 个连接节点`;
  }
  return `已执行 ${executed} 个连接节点`;
}

function canvasExecutionNodeIds(
  startNodeId: string,
  nodes: SpaceCanvasNode[],
  edges: SpaceCanvasEdge[],
) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    if (!edge.from || !edge.to) {
      continue;
    }
    outgoing.set(edge.from, [...(outgoing.get(edge.from) || []), edge.to]);
  }
  const result = new Set<string>();
  const visit = (nodeId: string) => {
    for (const targetId of outgoing.get(nodeId) || []) {
      if (result.has(targetId)) {
        continue;
      }
      result.add(targetId);
      const targetNode = nodeMap.get(targetId);
      if (!targetNode || !canvasNodeStopsExecution(targetNode)) {
        visit(targetId);
      }
    }
  };
  visit(startNodeId);
  return [...result];
}

function canvasNodeStopsExecution(node: SpaceCanvasNode) {
  return (
    node.type === "function" &&
    (node.functionOption?.key === "save" ||
      node.functionOption?.key === "display")
  );
}

async function saveCanvasContentResult(input: {
  projectId: number;
  assetCateId: number;
  name: string;
  kind: string;
  content: unknown;
  runRef?: SpaceCanvasNode["resultRef"] | null;
  nodeKey?: string;
  requestId?: string;
  source?: CanvasResultSourceRef | null;
  previousAsset?: ProjectAsset | null;
  previousAssets?: ProjectAsset[];
}) {
  const assetCateId = requireRealAssetCateId(input.assetCateId);
  const savedAsset = await saveSpaceCanvasContent({
    projectId: input.projectId,
    assetCateId,
    name: input.name,
    kind: input.kind,
    content: input.content,
    runId: Number(input.runRef?.run_id || 0),
    nodeRunId: Number(input.runRef?.node_run_id || 0),
    releaseId: Number(input.runRef?.release_id || 0),
    nodeKey: input.nodeKey,
    requestId: input.requestId,
    source: input.source,
  });
  const previousAsset =
    input.previousAsset ||
    input.previousAssets?.find((asset) => asset.id === savedAsset.id) ||
    null;
  return mergeProjectAssetVersionHistory(savedAsset, previousAsset);
}

function requireRealAssetCateId(assetCateId: number) {
  const id = Number(assetCateId || 0);
  if (id <= 0) {
    throw new Error("保存结果需要选择真实资产分类");
  }
  return id;
}

function activeCanvasAssets(nodes: SpaceCanvasNode[]) {
  return nodes
    .map((node) => node.asset)
    .filter((asset): asset is ProjectAsset => Boolean(asset?.id));
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function generatedNodePreview(node: SpaceCanvasNode): GeneratedNodePreview {
  const output = nodeContextOutput(node);
  const preview = generatedPreviewFromValue(
    output,
    nodePreviewKind(node, output),
  );
  if (!hasGeneratedPreview(preview)) {
    preview.text = displayTextFromOutput(output, "");
  }
  return preview;
}

function nodePreviewKind(node: SpaceCanvasNode, output: unknown) {
  const outputKind = previewKindFromOutput(output);
  if (node.type === "power") {
    return firstText(
      String(node.power?.kind || ""),
      outputKind,
      String(node.asset?.kind || ""),
      String(node.kind || ""),
    );
  }
  return firstText(
    String(node.asset?.kind || ""),
    String(node.power?.kind || ""),
    outputKind,
    String(node.kind || ""),
  );
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
    assetPreview.text = displayTextFromOutput(nodeContextOutput(node), "");
  }
  return assetPreview;
}

function nodeRichDocument(node: SpaceCanvasNode) {
  return fixedTiptapRichDocumentFromNode(node) || richDocumentFromNode(node);
}

function nodeEnergonOutput(node: SpaceCanvasNode) {
  return nodeContextOutput(node);
}

function fixedTiptapRichDocumentFromNode(node: SpaceCanvasNode) {
  return firstTiptapRichDocument(
    node.asset?.version?.content,
    node.resultOutput,
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
  const protocolOutput =
    normalizeAgentResultOutputValue?.(parsed) ?? parsed;
  const output = normalizeEnergonDisplayValue(protocolOutput, new Set());
  if (hasDisplayOutput(output)) {
    return output;
  }
  if (protocolOutput !== parsed) {
    const fallbackOutput = normalizeEnergonDisplayValue(parsed, new Set());
    if (hasDisplayOutput(fallbackOutput)) {
      return fallbackOutput;
    }
  }
  const fixedRichOutput = fixedTiptapRichOutput(parsed);
  if (fixedRichOutput) {
    return normalizeEnergonOutput?.(fixedRichOutput) ?? fixedRichOutput;
  }
  const canvasOutput = normalizeDisplayOutputForCanvas(value);
  if (canvasOutput !== parsed && hasDisplayOutput(canvasOutput)) {
    return canvasOutput;
  }
  return "";
}

function normalizeEnergonDisplayValue(value: any, seen: Set<any>): any {
  const parsed = parseMaybeJSON(value);
  const agentResult = parseAgentResultBlock(parsed);
  if (agentResult !== parsed) {
    return normalizeEnergonDisplayValue(agentResult, seen);
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
  if (isRichDocumentLike(parsed)) {
    const rich = fixedTiptapRichDocument(parsed) || safeRichDocument(parsed);
    return rich ? { rich } : parsed;
  }
  if (seen.has(parsed)) {
    return "";
  }
  seen.add(parsed);

  if (isAgentResultPayload(parsed)) {
    return normalizeAgentResultPayloadForEnergon(parsed);
  }

  if (isDirectEnergonOutputObject(parsed)) {
    return parsed;
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

  const payloadRich = richDocumentFromPayload(parsed as Record<string, any>);
  if (payloadRich) {
    const output = { rich: payloadRich };
    return normalizeEnergonOutput?.(output) ?? output;
  }

  const rich = safeRichDocument(parsed);
  if (rich) {
    return { rich };
  }
  const fixedRichOutput = fixedTiptapRichOutput(parsed);
  if (fixedRichOutput) {
    return normalizeEnergonOutput?.(fixedRichOutput) ?? fixedRichOutput;
  }

  const extracted = extractDisplayOutput(parsed);
  if (extracted !== parsed) {
    return normalizeEnergonDisplayValue(extracted, seen);
  }

  if (isAgentResultPayloadObject(parsed)) {
    return normalizeAgentResultPayloadForEnergon(parsed);
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
  const content = parseMaybeJSON(value.content);
  if (content && typeof content === "object" && !Array.isArray(content)) {
    copyEnergonOutputFields(result, content);
  }
  copyEnergonOutputFields(result, value);
  const text = agentResultPayloadText(value);
  if (text) {
    result.text = text;
  }
  if (!hasDisplayOutput(result) && content && typeof content === "object") {
    return content;
  }
  return hasMeaningfulObjectOutput(result) ? result : "";
}

function agentResultPayloadText(value: Record<string, any>) {
  const direct = firstText(value.text);
  if (direct) {
    return direct;
  }
  const content = parseMaybeJSON(value.content);
  if (typeof content === "string") {
    return content.trim();
  }
  if (content && typeof content === "object" && !Array.isArray(content)) {
    return firstText((content as Record<string, any>).text);
  }
  return "";
}

function isAgentResultProtocolText(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return (
    text.includes("```agent-result") ||
    text.includes("```agent-output") ||
    Boolean(parseAgentResultBlock(text) !== text)
  );
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
  const normalizedValue = extractDisplayOutput(value);
  fillGeneratedPreview(preview, normalizedValue, kind);
  if (!hasGeneratedPreview(preview) && normalizedValue !== value) {
    fillGeneratedPreview(preview, value, kind);
  }
  return preview;
}

function fillGeneratedPreview(
  preview: GeneratedNodePreview,
  value: any,
  kind: string,
  seen: Set<any> = new Set(),
  depth = 0,
) {
  if (depth > 12) {
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
      fillGeneratedPreview(preview, item, kind, seen, depth + 1);
      if (hasPreviewMedia(preview)) {
        return;
      }
    }
    return;
  }
  if (typeof value !== "object") {
    preview.text = String(value);
    return;
  }
  if (seen.has(value)) {
    return;
  }
  seen.add(value);

  const row = value as Record<string, any>;
  const mediaUrl = fillGeneratedPreviewMedia(preview, row, kind);
  const displayText = displayTextFromOutput(value, "");
  if (displayText && displayText !== mediaUrl && !looksLikeURL(displayText)) {
    preview.text ||= displayText;
  }
  const genericUrl = firstMediaURLText(row.url, row.src, row.href);
  if (genericUrl && genericUrl !== mediaUrl) {
    setPreviewString(preview, genericUrl, kind);
  }
  preview.imageUrl ||= firstMediaURLText(
    row.image,
    row.image_url,
    row.imageUrl,
    firstArrayValue(row.images),
    firstArrayValue(row.imageUrls),
  );
  preview.videoUrl ||= firstMediaURLText(
    row.video,
    row.video_url,
    row.videoUrl,
    firstArrayValue(row.videos),
    firstArrayValue(row.videoUrls),
  );
  preview.audioUrl ||= firstMediaURLText(
    row.audio,
    row.audio_url,
    row.audioUrl,
    firstArrayValue(row.audios),
    firstArrayValue(row.audioUrls),
  );
  preview.fileUrl ||= firstMediaURLText(
    row.file,
    row.file_url,
    row.fileUrl,
    firstArrayValue(row.files),
    firstArrayValue(row.fileUrls),
  );

  if (!hasPreviewMedia(preview)) {
    for (const key of ["output", "result", "content", "body", "data", "rich"]) {
      if (row[key] && typeof row[key] === "object") {
        fillGeneratedPreview(preview, row[key], kind, seen, depth + 1);
        if (hasPreviewMedia(preview)) {
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

function fillGeneratedPreviewMedia(
  preview: GeneratedNodePreview,
  row: Record<string, any>,
  kind: string,
) {
  const mediaKind = firstPreviewMediaKind(
    kind,
    row.kind,
    row.media_kind,
    row.mediaKind,
    row.media_type,
    row.mediaType,
    row.type,
    row.name,
  );
  if (!mediaKind) {
    return "";
  }
  const mediaUrl = firstMediaURLText(...mediaCandidatesForKind(row, mediaKind));
  if (!mediaUrl) {
    return "";
  }
  if (mediaKind === "image") preview.imageUrl ||= mediaUrl;
  if (mediaKind === "video") preview.videoUrl ||= mediaUrl;
  if (mediaKind === "audio") preview.audioUrl ||= mediaUrl;
  if (mediaKind === "file") preview.fileUrl ||= mediaUrl;
  return mediaUrl;
}

function previewKindFromOutput(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }
  const row = value as Record<string, any>;
  return firstPreviewMediaKind(
    row.kind,
    row.media_kind,
    row.mediaKind,
    row.media_type,
    row.mediaType,
    row.type,
    row.name,
  );
}

function firstPreviewMediaKind(...values: any[]) {
  for (const value of values) {
    const kind = normalizePreviewMediaKind(String(value || ""));
    if (kind) {
      return kind;
    }
  }
  return "";
}

function normalizePreviewMediaKind(kind: string) {
  const normalized = kind.trim().toLowerCase();
  if (
    normalized === "image" ||
    normalized === "images" ||
    normalized === "picture" ||
    normalized === "pictures" ||
    normalized === "mediaimage" ||
    normalized === "editor media image" ||
    normalized === "editormediaimage" ||
    normalized.includes("image") ||
    normalized === "图片" ||
    normalized === "图像"
  ) {
    return "image";
  }
  if (
    normalized === "video" ||
    normalized === "videos" ||
    normalized === "mediavideo" ||
    normalized === "editor media video" ||
    normalized === "editormediavideo" ||
    normalized.includes("video") ||
    normalized === "视频"
  ) {
    return "video";
  }
  if (
    normalized === "audio" ||
    normalized === "audios" ||
    normalized === "music" ||
    normalized === "voice" ||
    normalized === "mediaaudio" ||
    normalized === "editor media audio" ||
    normalized === "editormediaaudio" ||
    normalized.includes("audio") ||
    normalized === "音频" ||
    normalized === "音乐" ||
    normalized === "语音"
  ) {
    return "audio";
  }
  if (
    normalized === "file" ||
    normalized === "files" ||
    normalized === "attachment" ||
    normalized === "attachments" ||
    normalized === "mediafile" ||
    normalized === "editorfile" ||
    normalized === "editor media file" ||
    normalized === "editormediafile" ||
    normalized === "文件" ||
    normalized === "附件"
  ) {
    return "file";
  }
  return "";
}

function mediaCandidatesForKind(
  row: Record<string, any>,
  kind: "image" | "video" | "audio" | "file",
) {
  const common = [
    row.url,
    row.src,
    row.href,
    row.path,
    row.file_url,
    row.fileUrl,
    row.text,
    row.content,
    row.value,
    valueAtPath(row, ["attrs", "src"]),
    valueAtPath(row, ["attrs", "url"]),
    valueAtPath(row, ["attrs", "href"]),
  ];
  if (kind === "image") {
    return [
      row.image,
      row.image_url,
      row.imageUrl,
      firstArrayValue(row.images),
      firstArrayValue(row.imageUrls),
      ...common,
    ];
  }
  if (kind === "video") {
    return [
      row.video,
      row.video_url,
      row.videoUrl,
      firstArrayValue(row.videos),
      firstArrayValue(row.videoUrls),
      ...common,
    ];
  }
  if (kind === "audio") {
    return [
      row.audio,
      row.audio_url,
      row.audioUrl,
      firstArrayValue(row.audios),
      firstArrayValue(row.audioUrls),
      ...common,
    ];
  }
  return [
    row.file,
    row.file_url,
    row.fileUrl,
    firstArrayValue(row.files),
    firstArrayValue(row.fileUrls),
    ...common,
  ];
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
    const parsed = parseMaybeJSON(text);
    if (parsed !== text) {
      fillGeneratedPreview(preview, parsed, kind);
      if (hasPreviewMedia(preview)) {
        return;
      }
    }
    const parsedText = displayTextFromOutput(parsed, "");
    if (parsedText && !looksLikeURL(parsedText)) {
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
    const normalizedKind = normalizePreviewMediaKind(kind);
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

function hasPreviewMedia(preview: GeneratedNodePreview) {
  return Boolean(
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
        value.href,
        value.path,
        value.file,
        value.file_url,
        value.fileUrl,
        value.image,
        value.image_url,
        value.imageUrl,
        value.video,
        value.video_url,
        value.videoUrl,
        value.audio,
        value.audio_url,
        value.audioUrl,
        valueAtPath(value, ["attrs", "src"]),
        valueAtPath(value, ["attrs", "url"]),
        valueAtPath(value, ["attrs", "href"]),
      );
      if (text) {
        return text;
      }
    }
  }
  return "";
}

function firstMediaURLText(...values: any[]) {
  const text = firstMediaText(...values);
  return looksLikeURL(text) ? text : "";
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
    .filter(nodeHasResultContent)
    .map((node) => {
      const output = nodeContextOutput(node);
      const preview = generatedPreviewFromValue(
        output,
        nodePreviewKind(node, output),
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
        resultRef: node.resultRef,
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
  return firstMeaningfulNodeOutput(node.asset?.version?.content, node.resultOutput);
}

function firstMeaningfulNodeOutput(...values: any[]) {
  let fallback: any;
  for (const value of values) {
    if (value == null) {
      continue;
    }
    if (fallback === undefined) {
      fallback = value;
    }
    const output = firstDisplayOutput(value) || extractDisplayOutput(value);
    if (hasDisplayOutput(output) || hasContextOutput(output)) {
      return output;
    }
  }
  if (fallback !== undefined) {
    return firstDisplayOutput(fallback) || extractDisplayOutput(fallback);
  }
  return undefined;
}

function extractDisplayOutput(value: any): any {
  const parsed = parseMaybeJSON(value);
  const agentResult = parseAgentResultBlock(parsed);
  if (agentResult !== parsed) {
    return extractDisplayOutput(agentResult);
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
  activeCate?: AssetCate | null,
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
      role: activeCate ? assetRoleForView(asset, activeCate) : String(asset.role || ""),
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

function hasContextOutput(value: unknown) {
  const text = stringifyContextValue(value).trim();
  return Boolean(text && text !== "{}" && text !== "[]" && text !== "null");
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
  return {
    title: node.title,
    subtitle: node.subtitle,
    description: node.description,
    assetCateId: node.assetCateId,
    kind: node.kind,
    cardinality: node.cardinality,
    asset: node.asset,
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

function hydrateCanvasMapAssets(
  canvases: Record<string, SpaceCanvasState>,
  assets: ProjectAsset[],
) {
  return Object.fromEntries(
    Object.entries(canvases).map(([key, canvas]) => [
      key,
      hydrateCanvasAssets(canvas, assets),
    ]),
  );
}

function hydrateCanvasAssets(
  canvas: SpaceCanvasState,
  assets: ProjectAsset[],
): SpaceCanvasState {
  if (!assets.length) {
    return canvas;
  }
  const byID = new Map(assets.map((asset) => [asset.id, asset]));
  return {
    ...canvas,
    nodes: canvas.nodes.map((node) => hydrateCanvasNodeAsset(node, byID)),
  };
}

function hydrateCanvasNodeAsset(
  node: SpaceCanvasNode,
  assetsByID: Map<number, ProjectAsset>,
): SpaceCanvasNode {
  const assetID = canvasNodeReferencedAssetID(node);
  if (assetID <= 0) {
    return node;
  }
  const asset = assetsByID.get(assetID);
  if (!asset) {
    return node;
  }
  return {
    ...node,
    ...buildAssetVersionNodePatch(node, asset),
    asset,
  };
}

function canvasNodeReferencedAssetID(node: SpaceCanvasNode) {
  return Number(node.resultRef?.asset_id || node.asset?.id || 0);
}

function hydrateMissingCanvasAssetDetails(input: {
  projectId: number;
  nodes: SpaceCanvasNode[];
  requested: Set<number>;
  fetchAsset: (assetId: number) => Promise<ProjectAsset>;
  onAsset: (asset: ProjectAsset) => void;
}) {
  const missingAssetIDs = new Set<number>();
  for (const node of input.nodes) {
    const assetID = canvasNodeReferencedAssetID(node);
    if (assetID <= 0 || input.requested.has(assetID)) {
      continue;
    }
    if (node.asset?.version?.content != null) {
      continue;
    }
    missingAssetIDs.add(assetID);
  }
  for (const assetID of missingAssetIDs) {
    input.requested.add(assetID);
    void input.fetchAsset(assetID)
      .then(input.onAsset)
      .catch(() => {
        input.requested.delete(assetID);
      });
  }
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
  return JSON.stringify(persistedCanvasState(canvas));
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
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
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
    const targetNode = nodeById.get(edge.to);
    if (targetNode && canvasNodeStopsExecution(targetNode)) {
      continue;
    }
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

function isStartFunctionNode(node: SpaceCanvasNode) {
  if (node.type !== "function") {
    return false;
  }
  return node.functionOption?.key === "start" || node.title === "开始";
}

function isResultFunctionNode(node: SpaceCanvasNode) {
  if (node.type !== "function") {
    return false;
  }
  const key = node.functionOption?.key || "";
  return key === "import" || key === "save";
}

function shouldRenderFunctionResultCard(node: SpaceCanvasNode) {
  return isResultFunctionNode(node) && nodeHasResultContent(node);
}

function buildFunctionStatusPatch(description: string): Partial<SpaceCanvasNode> {
  return {
    description,
  };
}

function buildFunctionRunPatch(
  result: any,
  description: string,
): Partial<SpaceCanvasNode> {
  return {
    ...buildFunctionStatusPatch(description),
    resultRef: buildNodeResultRef({
      ...result,
      asset: undefined,
      version: undefined,
      role: undefined,
    }),
  };
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
  const onClearFeedbackRecords = (node as any).onClearFeedbackRecords as
    | ((nodeIds: string[]) => void)
    | undefined;
  const requestConfirm = (node as any).requestConfirm as
    | ConfirmRequester
    | undefined;
  const onRunBackendNode = (node as any).onRunBackendNode as
    | BackendNodeRunner
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
        onClearFeedbackRecords={onClearFeedbackRecords}
        requestConfirm={requestConfirm}
        onRunBackendNode={onRunBackendNode}
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
      ) : preview.audioUrl ? (
        <div className="ws-node-function-result-media is-audio">
          <audio src={preview.audioUrl} controls preload="metadata" />
        </div>
      ) : preview.fileUrl ? (
        <div className="ws-node-function-result-file">
          <FileText size={16} />
          <span>{mediaPreviewCaption(preview) || "文件内容"}</span>
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

function nodeHasResultRef(node: SpaceCanvasNode) {
  const ref = node.resultRef;
  return Boolean(
    ref?.run_id ||
      ref?.node_run_id ||
      ref?.asset_id ||
      ref?.version_id ||
      ref?.request_id,
  );
}

function nodeHasResultContent(node: SpaceCanvasNode) {
  if (!nodeCanHaveExecutionResult(node)) {
    return false;
  }
  if (
    !nodeHasResultRef(node) &&
    node.asset?.version?.content == null &&
    node.resultOutput == null
  ) {
    return false;
  }
  const output = nodeContextOutput(node);
  if (output == null) {
    return false;
  }
  const preview = generatedPreviewFromValue(
    output,
    nodePreviewKind(node, output),
  );
  return (
    hasGeneratedPreview(preview) || hasContextOutput(output)
  );
}

function nodeCanHaveExecutionResult(node: SpaceCanvasNode) {
  if (node.type !== "function") {
    return true;
  }
  return isResultFunctionNode(node);
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

function canvasResultSourceFromContext(
  inputContext: NodeInputContext | null,
): CanvasResultSourceRef | null {
  const source = latestInputContextSource(inputContext);
  return canvasResultSourceFromNode(source);
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
  onClearFeedbackRecords,
  requestConfirm,
  onRunBackendNode,
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
  onClearFeedbackRecords?: (nodeIds: string[]) => void;
  requestConfirm?: ConfirmRequester;
  onRunBackendNode?: BackendNodeRunner;
}) {
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [powerForm, setPowerForm] = useState<PowerForm | null>(null);
  const [powerFormLoading, setPowerFormLoading] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState<number>(0);
  const [paramValues, setParamValues] = useState<Record<string, unknown>>({});
  const initialDraftRef = useRef<ComposerDraft>(readNodeComposerDraft(node));
  const savedDraft = initialDraftRef.current;
  const inputContext = ((node as any).inputContext ||
    null) as NodeInputContext | null;

  const nodeRunning =
    running ||
    runningNode?.status === "running";
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
  const nodeAssetCateId = Number(node.assetCateId || 0);
  const nodeAssetCate = space ? assetCateById(space, nodeAssetCateId) : null;
  const assetLibrary = useMemo(
    () => buildComposerAssetLibrary(space, inputContext, nodeAssetCate),
    [inputContext, nodeAssetCateId, space],
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
      param.upload_rule_id,
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
    onClearFeedbackRecords?.([node.id]);
    setRunning(true);
    setRunningNode((current) => ({
      ...current,
      [node.id]: {
        nodeId: node.id,
        title: node.title,
        startedAt: Date.now(),
        progress: 0,
        status: "running",
      },
    }));
    let completed = false;
    let outcome: RunningNodeState["status"] = "error";
    try {
      if (node.type === "power" && node.power) {
        if (!onRunBackendNode) {
          throw new Error("当前节点缺少后端运行入口");
        }
        saveComposerDraft({
          prompt: powerPrompt,
          paramValues,
          selectedTargetId,
        });
        await onRunBackendNode({
          ...node,
          composerDraft: {
            prompt: powerPrompt,
            paramValues,
            selectedTargetId,
          },
        });
        toast.success("能力节点执行成功");
        completed = true;
      } else if (node.type === "agent" && node.role) {
        if (!onRunBackendNode) {
          throw new Error("当前节点缺少后端运行入口");
        }
        saveComposerDraft({
          prompt,
          paramValues,
          selectedTargetId: 0,
        });
        await onRunBackendNode({
          ...node,
          composerDraft: {
            prompt,
            paramValues,
            selectedTargetId: 0,
          },
        });
        completed = true;
        outcome = "success";
      } else if (node.type === "flow" && node.flow) {
        if (!onRunBackendNode) {
          throw new Error("当前节点缺少后端运行入口");
        }
        await onRunBackendNode(node);
        completed = true;
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
          const asset = await saveCanvasContentResult({
            projectId,
            assetCateId: Number(node.assetCateId || 0),
            name: functionAssetName(node, inputContext),
            kind: resultAssetKind(node),
            content: upstreamOutput,
            nodeKey: node.id,
            requestId: createCanvasSaveRequestId("save", node.id, upstreamOutput),
            source: canvasResultSourceFromContext(inputContext),
            previousAsset: node.asset,
          });
          onAssetCreated?.(asset);
          onNodeResult(
            node.id,
            buildGeneratedNodeResultPatch(
              node,
              {
                output: asset.version?.content || upstreamOutput,
                asset,
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
              buildFunctionStatusPatch("开始节点已启动，请运行后续连接节点。"),
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
      setRunningNode((current) => {
        const currentNode = current[node.id];
        if (!currentNode) {
          return current;
        }
        return {
          ...current,
          [node.id]: {
            ...currentNode,
            status: "error",
            progress: Math.max(currentNode.progress, 92),
          },
        };
      });
      toast.error(err instanceof Error ? err.message : "执行出错");
    } finally {
      setRunning(false);
      setRunningNode((current) => {
        const currentNode = current[node.id];
        if (!currentNode) {
          return current;
        }
        return {
          ...current,
          [node.id]: {
            ...currentNode,
            status: outcome,
            progress:
              outcome === "success" ? 100 : Math.max(currentNode.progress, 92),
          },
        };
      });
      window.setTimeout(
        () => {
          setRunningNode((current) => omitRunningNode(current, node.id));
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
        const currentNode = current[node.id];
        if (!currentNode || currentNode.status !== "running") {
          return current;
        }
        return {
          ...current,
          [node.id]: {
            ...currentNode,
            progress: Math.min(94, currentNode.progress + 7),
          },
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
  return node.type === "function" && node.functionOption?.key === "start";
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
  const canvasRunningNodes = ((data as any).canvasRunningNodes ||
    {}) as RunningNodeMap;
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
      isStartFunction && hasRunningCanvasNode(canvasRunningNodes);
    const nodeRunning = isCurrentNodeRunning || isStartLocked;
    const renderResultCard = shouldRenderFunctionResultCard(node);
    const inputHandleStyle: CSSProperties = renderResultCard
      ? { left: "0px", top: "19px" }
      : { left: "0px" };
    const outputHandleStyle: CSSProperties = renderResultCard
      ? { left: "128px", right: "auto", top: "19px" }
      : { right: "0px" };
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
          ) : preview.audioUrl ? (
            <div className="ws-node-text-media is-audio">
              <audio src={preview.audioUrl} controls preload="metadata" />
            </div>
          ) : preview.fileUrl ? (
            <div className="ws-node-text-file">
              <FileText size={16} />
              <span>{mediaPreviewCaption(preview) || "文件内容"}</span>
            </div>
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
    const hasPowerContent = nodeHasResultContent(node);
    const hasPowerMedia = Boolean(
      preview.imageUrl ||
        preview.videoUrl ||
        preview.audioUrl ||
        preview.fileUrl,
    );
    const className = [
      "ws-node-power-wrap",
      selected ? "is-selected" : "",
      showRunFrame ? "is-running" : "",
      hasPowerContent ? "has-content" : "",
      hasPowerMedia ? "has-media" : "",
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <div className={className}>
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
  const caption = mediaPreviewCaption(preview);
  if (preview.imageUrl) {
    return (
      <div className="ws-node-power-media">
        <img
          src={preview.imageUrl}
          alt={caption || "生成图片"}
          onLoad={(event) =>
            onMediaSize?.(
              event.currentTarget.naturalWidth,
              event.currentTarget.naturalHeight,
            )
          }
        />
        {caption ? <p>{caption}</p> : null}
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
        {caption ? <p>{caption}</p> : null}
      </div>
    );
  }
  if (preview.audioUrl) {
    return (
      <div className="ws-node-power-media is-audio">
        <audio src={preview.audioUrl} controls preload="metadata" />
        {caption ? <p>{caption}</p> : null}
      </div>
    );
  }
  if (preview.fileUrl) {
    return (
      <div className="ws-node-power-file">
        <FileText size={16} />
        <span>{caption || "文件内容"}</span>
      </div>
    );
  }
  return <p className="ws-node-power-desc">{preview.text || fallback}</p>;
}

function mediaPreviewCaption(preview: GeneratedNodePreview) {
  const text = String(preview.text || "").trim();
  if (!text || looksLikeURL(text)) {
    return "";
  }
  return text;
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
  return Number(params.get("project_id") || params.get("id") || 0);
}
