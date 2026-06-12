import type {
  CanvasResultRef,
  CanvasResultSourceRef,
  SpaceCanvasNode,
} from "./types";

export type NodeResultSourceContext = {
  nodeId: string;
  type: SpaceCanvasNode["type"];
  resultRef?: CanvasResultRef;
};

export function buildNodeResultRef(result: any): CanvasResultRef | undefined {
  const asset = result?.asset || result?.data?.asset;
  const version = result?.version || asset?.version || result?.data?.version;
  const ref: CanvasResultRef = {};
  assignResultRefNumber(ref, "run_id", result?.run_id || version?.run_id);
  assignResultRefText(ref, "request_id", result?.request_id);
  assignResultRefNumber(ref, "flow_run_id", result?.flow_run_id);
  assignResultRefNumber(
    ref,
    "node_run_id",
    result?.node_run_id || version?.node_run_id,
  );
  assignResultRefNumber(ref, "asset_id", asset?.id);
  assignResultRefNumber(ref, "version_id", version?.id || asset?.version_id);
  assignResultRefNumber(
    ref,
    "release_id",
    version?.release_id || result?.release_id,
  );
  assignResultRefText(ref, "role", result?.role || asset?.role);
  assignResultRefText(ref, "status", result?.status);
  if (Object.keys(ref).length > 0) {
    ref.updated_at = new Date().toISOString();
  }
  return Object.keys(ref).length > 0 ? ref : undefined;
}

export function mergeCanvasResultRef<T extends { resultRef?: CanvasResultRef }>(
  patch: T | undefined,
  runRef?: CanvasResultRef | null,
): T | undefined {
  if (!patch || !runRef) {
    return patch;
  }
  return {
    ...patch,
    resultRef: {
      ...(patch.resultRef || {}),
      ...runRef,
      status: patch.resultRef?.status || runRef.status,
      updated_at: new Date().toISOString(),
    },
  };
}

export function canvasResultSourceFromNode(
  source: NodeResultSourceContext | null | undefined,
): CanvasResultSourceRef | null {
  const ref = source?.resultRef;
  if (!source || !ref) {
    return null;
  }
  const sourceAssetId = Number(ref.asset_id || 0);
  const sourceNodeKey = String(ref.node_run_id ? source.nodeId : "").trim();
  return {
    sourceRunId: Number(ref.run_id || 0),
    sourceNodeRunId: Number(ref.node_run_id || 0),
    sourceAssetId,
    sourceVersionId: Number(ref.version_id || 0),
    sourceReleaseId: Number(ref.release_id || 0),
    sourceRequestId: String(ref.request_id || ""),
    sourceNodeKey,
    sourceNodeType: String(source.type || ""),
    sourceStatus: String(ref.status || ""),
    sourceKey:
      sourceNodeKey ||
      (sourceAssetId > 0 ? `asset:${sourceAssetId}` : "") ||
      "",
  };
}

function assignResultRefNumber(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
) {
  const number = Number(value || 0);
  if (number > 0) {
    target[key] = number;
  }
}

function assignResultRefText(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
) {
  if (typeof value === "string" && value.trim()) {
    target[key] = value.trim();
  }
}
