import { richDocument } from "./space-model";
import type { AssetVersion, ProjectAsset, SpaceCanvasNode } from "./types";

export function runResultAsset(input: {
  result: any;
  previousAsset?: ProjectAsset | null;
  previousAssets?: ProjectAsset[];
}) {
  const asset = firstDefined(input.result?.asset, input.result?.data?.asset);
  if (!asset || Number(asset.id || 0) <= 0) {
    return null;
  }
  const resultVersion = (asset as ProjectAsset).version;
  if (!resultVersion?.id) {
    return null;
  }
  const previousAsset =
    input.previousAsset ||
    input.previousAssets?.find((item) => item.id === Number(asset.id || 0)) ||
    null;
  const normalizedAsset = mergeProjectAssetVersionHistory(
    asset as ProjectAsset,
    previousAsset,
  );
  return normalizedAsset.version?.id ? normalizedAsset : null;
}

export function requireRunResultAsset(
  asset: ProjectAsset | null,
  nodeTitle: string,
): ProjectAsset {
  if (!asset?.id || !asset.version?.id) {
    throw new Error(`${nodeTitle || "节点"}未返回已保存的结果版本`);
  }
  return asset;
}

export function withRunResultAsset(result: any, asset: ProjectAsset | null) {
  const normalizedResult = stripRunResultVersion(result);
  if (!asset) {
    return normalizedResult;
  }
  return {
    ...normalizedResult,
    asset,
  };
}

export function resultAssetKind(node: SpaceCanvasNode, fallbackKind = "") {
  return String(node.kind || node.power?.kind || fallbackKind || "mixed");
}

export function mergeProjectAssetVersionHistory(
  nextAsset: ProjectAsset,
  previousAsset?: ProjectAsset | null,
): ProjectAsset {
  const normalizedNextAsset = normalizeRichAssetVersionContent(nextAsset);
  const normalizedPreviousAsset = previousAsset
    ? normalizeRichAssetVersionContent(previousAsset)
    : null;
  const sourceVersions =
    normalizedNextAsset.versions ||
    normalizedPreviousAsset?.versions ||
    [];
  const versions = mergeAssetVersionHistory([
    markCurrentAssetVersion(normalizedNextAsset.version),
    ...sourceVersions,
  ]);

  return {
    ...normalizedPreviousAsset,
    ...normalizedNextAsset,
    version: normalizedNextAsset.version || normalizedPreviousAsset?.version,
    versions: versions.length ? versions : undefined,
  };
}

function stripRunResultVersion(result: any) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return result;
  }
  const { version: _version, ...rest } = result;
  return rest;
}

function normalizeRichAssetVersionContent(asset: ProjectAsset): ProjectAsset {
  const version = normalizeRichAssetVersion(asset.version);
  const versions = (asset.versions || [])
    .map(normalizeRichAssetVersion)
    .filter((item): item is AssetVersion => Boolean(item));

  return {
    ...asset,
    version,
    versions: versions.length ? versions : asset.versions,
  };
}

function normalizeRichAssetVersion(
  version: AssetVersion | undefined,
): AssetVersion | undefined {
  if (!version) {
    return undefined;
  }
  const rich = richDocument(version.content);
  return rich
    ? {
        ...version,
        content: { rich },
      }
    : version;
}

function mergeAssetVersionHistory(
  candidates: Array<AssetVersion | undefined | null>,
) {
  const versions: AssetVersion[] = [];
  const seen = new Set<string>();
  let hasCurrentVersion = false;
  for (const version of candidates) {
    if (!version || Number(version.id || 0) <= 0) {
      continue;
    }
    const key = String(version.id);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    if (isCurrentAssetVersion(version)) {
      versions.push(
        hasCurrentVersion ? clearCurrentAssetVersion(version) : version,
      );
      hasCurrentVersion = true;
    } else {
      versions.push(version);
    }
  }
  return versions.sort(
    (left, right) =>
      Number(isCurrentAssetVersion(right)) -
        Number(isCurrentAssetVersion(left)) ||
      Number(right.version || right.id || 0) -
        Number(left.version || left.id || 0),
  );
}

function isCurrentAssetVersion(version: AssetVersion) {
  return Boolean((version as any).is_current || (version as any).current);
}

function markCurrentAssetVersion(
  version: AssetVersion | undefined,
): AssetVersion | undefined {
  return version ? ({ ...version, current: true } as AssetVersion) : undefined;
}

function clearCurrentAssetVersion(version: AssetVersion): AssetVersion {
  const { current, is_current, ...rest } = version as AssetVersion & {
    current?: boolean;
    is_current?: boolean;
  };
  return rest;
}

function firstDefined(...values: any[]) {
  return values.find((value) => value !== undefined && value !== null);
}
