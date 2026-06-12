import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, FileSearch, Layers, X } from "lucide-react";
import { assetsForCate } from "./space-model";
import type { AssetCate, ProjectAsset, SpaceBootstrap } from "./types";

export type AssetViewerMode = "browse" | "select" | "detail";

type AssetWorkspacePanelProps = {
  space: SpaceBootstrap;
  activeCate: AssetCate;
  onClose: () => void;
  renderAssetDetail: (input: AssetDetailRenderInput) => ReactNode;
};

type AssetViewerProps = AssetWorkspacePanelProps & {
  mode: AssetViewerMode;
  selectedAsset?: ProjectAsset | null;
  onPickAsset?: (asset: ProjectAsset) => void;
};

export type AssetDetailRenderInput = {
  activeCate: AssetCate;
  asset: ProjectAsset | null;
  mode: AssetViewerMode;
  onPickAsset?: () => void;
};

type AssetRoleGroups = {
  content: ProjectAsset[];
  material: ProjectAsset[];
};

export function AssetWorkspacePanel({
  space,
  activeCate,
  onClose,
  renderAssetDetail,
}: AssetWorkspacePanelProps) {
  return (
    <WorkspaceSurface className="ws-asset-workspace">
      <AssetViewer
        mode="browse"
        space={space}
        activeCate={activeCate}
        onClose={onClose}
        renderAssetDetail={renderAssetDetail}
      />
    </WorkspaceSurface>
  );
}

export function WorkspaceSurface({
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

function AssetViewer({
  mode,
  space,
  activeCate,
  selectedAsset: controlledSelectedAsset,
  onClose,
  onPickAsset,
  renderAssetDetail,
}: AssetViewerProps) {
  const assets = useMemo(
    () => assetsForCate(space, activeCate.id),
    [activeCate.id, space],
  );
  const groups = useMemo(
    () => groupAssetsByRole(assets, activeCate),
    [activeCate, assets],
  );
  const firstAsset = groups.content[0] || groups.material[0] || null;
  const [selectedAssetId, setSelectedAssetId] = useState(
    controlledSelectedAsset?.id || firstAsset?.id || 0,
  );
  const selectedAsset =
    controlledSelectedAsset ||
    assets.find((asset) => asset.id === selectedAssetId) ||
    firstAsset;

  useEffect(() => {
    setSelectedAssetId(controlledSelectedAsset?.id || firstAsset?.id || 0);
  }, [activeCate.id, controlledSelectedAsset?.id, firstAsset?.id]);

  const title =
    mode === "select" ? "选择引用内容" : mode === "detail" ? "查看详情" : "结果";

  return (
    <section className="ws-asset-editor-shell has-list is-viewer">
      <button
        type="button"
        className="ws-workspace-close"
        onClick={onClose}
        aria-label="关闭资产查看器"
      >
        <X size={18} />
      </button>
      <aside className="ws-asset-list-pane ws-asset-tree-pane">
        <div className="ws-asset-list-title">
          <strong>{activeCate.name}</strong>
          <span>{title}</span>
        </div>
        <AssetViewerTree
          activeCate={activeCate}
          groups={groups}
          selectedAssetId={selectedAsset?.id || 0}
          onSelectAsset={(asset) => {
            setSelectedAssetId(asset.id);
            if (mode === "select") {
              onPickAsset?.(asset);
            }
          }}
        />
      </aside>
      {renderAssetDetail({
        activeCate,
        asset: selectedAsset,
        mode,
        onPickAsset:
          mode === "select" && selectedAsset
            ? () => onPickAsset?.(selectedAsset)
            : undefined,
      })}
    </section>
  );
}

function AssetViewerTree({
  activeCate,
  groups,
  selectedAssetId,
  onSelectAsset,
}: {
  activeCate: AssetCate;
  groups: AssetRoleGroups;
  selectedAssetId: number;
  onSelectAsset: (asset: ProjectAsset) => void;
}) {
  return (
    <div className="ws-asset-tree custom-scrollbar">
      <AssetViewerGroup
        title="内容"
        count={groups.content.length}
        emptyText={`暂无${activeCate.name}内容`}
        assets={groups.content}
        selectedAssetId={selectedAssetId}
        onSelectAsset={onSelectAsset}
      />
      <AssetViewerGroup
        title="素材"
        count={groups.material.length}
        emptyText="暂无素材"
        assets={groups.material}
        selectedAssetId={selectedAssetId}
        onSelectAsset={onSelectAsset}
      />
    </div>
  );
}

function AssetViewerGroup({
  title,
  count,
  emptyText,
  assets,
  selectedAssetId,
  onSelectAsset,
}: {
  title: string;
  count: number;
  emptyText: string;
  assets: ProjectAsset[];
  selectedAssetId: number;
  onSelectAsset: (asset: ProjectAsset) => void;
}) {
  return (
    <div className="ws-tree-group">
      <div className="ws-tree-head is-open">
        <span className="ws-tree-label">
          <Layers size={14} />
          {title}
        </span>
        <small>{count}</small>
      </div>
      <div className="ws-tree-list">
        {assets.length > 0 ? (
          assets.map((asset, index) => (
            <button
              key={asset.id}
              type="button"
              className={`ws-tree-asset ${asset.id === selectedAssetId ? "is-active" : ""}`}
              onClick={() => onSelectAsset(asset)}
            >
              <span>{asset.name || `${title} ${index + 1}`}</span>
              <small>
                {asset.created_at || asset.version?.created_at || "未保存时间"}
              </small>
            </button>
          ))
        ) : (
          <div className="ws-tree-empty">{emptyText}</div>
        )}
      </div>
    </div>
  );
}

export function assetRoleForView(
  asset: ProjectAsset | null | undefined,
  activeCate: AssetCate,
): "content" | "material" {
  const role = String(asset?.role || "").toLowerCase();
  if (role === "content" || role === "material") {
    return role;
  }
  if (!asset) {
    return "material";
  }
  const cateKind = String(activeCate.kind || "").toLowerCase();
  const assetKind = String(asset.kind || "").toLowerCase();
  return cateKind && assetKind === cateKind ? "content" : "material";
}

function groupAssetsByRole(
  assets: ProjectAsset[],
  activeCate: AssetCate,
): AssetRoleGroups {
  return assets.reduce<AssetRoleGroups>(
    (groups, asset) => {
      groups[assetRoleForView(asset, activeCate)].push(asset);
      return groups;
    },
    { content: [], material: [] },
  );
}

export function EmptyAssetDetail({
  activeCate,
  text = "暂无可查看内容",
}: {
  activeCate: AssetCate;
  text?: string;
}) {
  return (
    <div className="ws-asset-empty-detail">
      <FileSearch size={32} />
      <span>{text || `暂无${activeCate.name}内容`}</span>
    </div>
  );
}

export function AssetPickerButton({ onPickAsset }: { onPickAsset: () => void }) {
  return (
    <button type="button" onClick={onPickAsset}>
      <CheckCircle2 size={14} />
      <span>使用</span>
    </button>
  );
}
