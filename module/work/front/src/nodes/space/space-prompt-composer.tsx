import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  Plus,
  Search,
  Settings2,
  Upload,
  X,
} from "lucide-react";
import { defaultPowerParamValue } from "./space-power-param";
import type { PowerParam, PowerParamSource } from "./types";

export { defaultPowerParamValue } from "./space-power-param";

export type ComposerAssetPreview = {
  text: string;
  imageUrl: string;
  videoUrl: string;
  audioUrl: string;
  fileUrl: string;
};

export type ComposerAssetItem = {
  id: string;
  title: string;
  kind: string;
  role?: "content" | "material" | string;
  source: "current" | "asset";
  output?: unknown;
  preview: ComposerAssetPreview;
  asset?: unknown;
};

type PromptComposerProps = {
  value: string;
  placeholder: string;
  running?: boolean;
  disabled?: boolean;
  openAssetPickerSignal?: number;
  sourceOptions?: PowerParamSource[];
  selectedSourceId?: number;
  params?: PowerParam[];
  paramValues?: Record<string, unknown>;
  assetLibrary?: {
    current: ComposerAssetItem[];
    assets: ComposerAssetItem[];
  };
  onChange: (value: string) => void;
  onParamChange?: (key: string, value: unknown) => void;
  onSourceChange?: (sourceId: number) => void;
  onAssetReference?: (
    asset: ComposerAssetItem,
    param: PowerParam,
    alias: string,
  ) => void;
  onAssetPickerClose?: () => void;
  onLocalUpload?: (
    files: File[],
    param: PowerParam,
  ) => Promise<UploadPreview[]>;
  onSubmit: () => void;
};

export type UploadPreview = {
  name: string;
  type?: string;
  url?: string;
  alias?: string;
  kind?: string;
  source?: ComposerAssetItem["source"] | "upload";
  text?: string;
  output?: unknown;
  asset?: unknown;
};

type UploadPreviewState = {
  groupName: string;
  file: UploadPreview;
};

export function PromptComposer({
  value,
  placeholder,
  running = false,
  disabled = false,
  openAssetPickerSignal = 0,
  sourceOptions = [],
  selectedSourceId = 0,
  params = [],
  paramValues = {},
  assetLibrary = { current: [], assets: [] },
  onChange,
  onParamChange,
  onSourceChange,
  onAssetReference,
  onAssetPickerClose,
  onLocalUpload,
  onSubmit,
}: PromptComposerProps) {
  const [openKey, setOpenKey] = useState("");
  const [uploadPreviews, setUploadPreviews] = useState<
    Record<string, UploadPreview[]>
  >({});
  const [activePreview, setActivePreview] = useState<UploadPreviewState | null>(
    null,
  );
  const [assetPickerParam, setAssetPickerParam] = useState<PowerParam | null>(
    null,
  );
  const openedAssetPickerSignalRef = useRef(0);
  const uploadParams = params.filter(isUploadPowerParam);
  const optionParams = params.filter(isToolbarPowerParam);
  const selectedSource = sourceOptions.find(
    (source) =>
      source.target_id === selectedSourceId || source.id === selectedSourceId,
  );

  useEffect(() => {
    if (disabled || running) {
      setOpenKey("");
    }
  }, [disabled, running]);

  useEffect(() => {
    if (
      !openAssetPickerSignal ||
      openedAssetPickerSignalRef.current === openAssetPickerSignal ||
      disabled ||
      running ||
      uploadParams.length === 0
    ) {
      return;
    }
    openedAssetPickerSignalRef.current = openAssetPickerSignal;
    setAssetPickerParam(uploadParams[0]);
  }, [disabled, openAssetPickerSignal, running, uploadParams]);

  function setUploadValue(param: PowerParam, previews: UploadPreview[]) {
    setUploadPreviews((current) => ({
      ...current,
      [param.key]: previews,
    }));
    onParamChange?.(param.key, uploadParamValue(param, previews));
  }

  return (
    <div className={`ws-prompt-composer ${running ? "is-running" : ""}`}>
      <div className="ws-prompt-main">
        {uploadParams.length > 0 ? (
          <div className="ws-prompt-inline-uploads">
            {uploadParams.map((param) => (
              <UploadParamStrip
                key={param.key}
                param={param}
                previews={
                  uploadPreviews[param.key] ||
                  previewsFromValue(paramValues[param.key])
                }
                disabled={disabled || running}
                onChange={(nextPreviews) => setUploadValue(param, nextPreviews)}
                onPreview={(file) =>
                  setActivePreview({
                    groupName: param.name || "上传文件",
                    file,
                  })
                }
                onOpenAssetPicker={() => setAssetPickerParam(param)}
              />
            ))}
          </div>
        ) : null}

        <div className="ws-prompt-editor-shell">
          <textarea
            className="ws-prompt-editor"
            value={value}
            disabled={disabled || running}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (
                (event.metaKey || event.ctrlKey) &&
                event.key === "Enter" &&
                !running
              ) {
                event.preventDefault();
                onSubmit();
              }
            }}
          />
        </div>
      </div>
      <div className="ws-prompt-toolbar">
        <div className="ws-prompt-tools">
          {sourceOptions.length > 0 ? (
            <ComposerMenu
              id="source"
              openKey={openKey}
              label={
                selectedSource?.name || selectedSource?.service_name || "来源"
              }
              icon={<FileText size={15} />}
              disabled={disabled || running}
              onToggle={setOpenKey}
            >
              <div className="ws-prompt-menu-list">
                {sourceOptions.map((source) => {
                  const sourceId = source.target_id || source.id;
                  const active = sourceId === selectedSourceId;
                  return (
                    <button
                      key={sourceId}
                      type="button"
                      className={`ws-prompt-menu-item ${active ? "is-active" : ""}`}
                      disabled={disabled || running}
                      onClick={() => {
                        onSourceChange?.(sourceId);
                        setOpenKey("");
                      }}
                    >
                      <span>{source.name || source.service_name}</span>
                      {active ? <CheckCircle2 size={14} /> : null}
                    </button>
                  );
                })}
              </div>
            </ComposerMenu>
          ) : null}

          {optionParams.map((param) => (
            <ParamMenu
              key={param.key}
              param={param}
              value={paramValues[param.key]}
              openKey={openKey}
              disabled={disabled || running}
              onToggle={setOpenKey}
              onChange={(nextValue) => onParamChange?.(param.key, nextValue)}
            />
          ))}
        </div>

        <div className="ws-prompt-submit-group">
          <button
            type="button"
            className="ws-prompt-submit"
            disabled={disabled || running}
            onClick={onSubmit}
            aria-label="发送"
          >
            {running ? (
              <Loader2 size={17} className="ws-spin" />
            ) : (
              <ArrowUp size={18} />
            )}
          </button>
        </div>
      </div>
      {activePreview && typeof document !== "undefined"
        ? createPortal(
            <UploadPreviewDialog
              title={activePreview.groupName}
              preview={activePreview.file}
              onClose={() => setActivePreview(null)}
            />,
            document.body,
          )
        : null}
      {assetPickerParam && typeof document !== "undefined"
        ? createPortal(
            <AssetReferenceDialog
              param={assetPickerParam}
              library={assetLibrary}
              currentPreviews={
                uploadPreviews[assetPickerParam.key] ||
                previewsFromValue(paramValues[assetPickerParam.key])
              }
              onClose={() => {
                setAssetPickerParam(null);
                onAssetPickerClose?.();
              }}
              onPick={(asset) => {
                const current =
                  uploadPreviews[assetPickerParam.key] ||
                  previewsFromValue(paramValues[assetPickerParam.key]);
                const alias = nextReferenceAlias(
                  assetPickerParam,
                  current.length + 1,
                );
                const nextPreview = uploadPreviewFromAsset(asset, alias);
                const next = appendUploadPreview(
                  assetPickerParam,
                  current,
                  nextPreview,
                );
                setUploadValue(assetPickerParam, next);
                onChange(appendReferenceMention(value, alias));
                onAssetReference?.(asset, assetPickerParam, alias);
                setAssetPickerParam(null);
                onAssetPickerClose?.();
              }}
              onLocalUpload={(previews) => {
                const current =
                  uploadPreviews[assetPickerParam.key] ||
                  previewsFromValue(paramValues[assetPickerParam.key]);
                setUploadValue(
                  assetPickerParam,
                  appendUploadPreviews(assetPickerParam, current, previews),
                );
              }}
              onUploadFiles={onLocalUpload}
            />,
            document.body,
          )
        : null}
    </div>
  );
}

function UploadParamStrip({
  param,
  previews,
  disabled,
  onChange,
  onPreview,
  onOpenAssetPicker,
}: {
  param: PowerParam;
  previews: UploadPreview[];
  disabled?: boolean;
  onChange: (previews: UploadPreview[]) => void;
  onPreview: (preview: UploadPreview) => void;
  onOpenAssetPicker: () => void;
}) {
  function removeAt(index: number) {
    revokeUploadPreviewUrl(previews[index]);
    onChange(previews.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <div
      className={`ws-prompt-upload-group ${previews.length > 0 ? "has-previews" : "is-empty"}`}
    >
      {previews.map((preview, index) => (
        <span
          key={`${preview.name}-${index}`}
          className="ws-prompt-upload-card"
          style={{ zIndex: previews.length - index + 1 }}
          role="button"
          tabIndex={0}
          aria-label={`查看${preview.name}`}
          onClick={() => onPreview(preview)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onPreview(preview);
            }
          }}
        >
          {isImagePreview(preview) ? (
            <img
              className="ws-prompt-upload-thumb"
              src={preview.url}
              alt={preview.name}
            />
          ) : (
            <span className="ws-prompt-upload-file">
              <FileText size={16} />
            </span>
          )}
          <span className="ws-prompt-upload-name">{preview.name}</span>
          <span className="ws-prompt-upload-hover">
            <strong>{preview.alias || preview.name}</strong>
            <small>
              {preview.text || preview.url || preview.type || "引用内容"}
            </small>
          </span>
          <button
            type="button"
            className="ws-prompt-upload-remove"
            disabled={disabled}
            aria-label="移除上传文件"
            onClick={(event) => {
              event.stopPropagation();
              removeAt(index);
            }}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <button
        type="button"
        className="ws-prompt-upload-add"
        disabled={disabled}
        aria-label={param.name || "添加"}
        onClick={onOpenAssetPicker}
      >
        <Plus size={16} />
        <span>添加</span>
      </button>
    </div>
  );
}

export function AssetReferenceDialog({
  param,
  library,
  currentPreviews,
  onClose,
  onPick,
  onLocalUpload,
  onUploadFiles,
}: {
  param: PowerParam;
  library: { current: ComposerAssetItem[]; assets: ComposerAssetItem[] };
  currentPreviews: UploadPreview[];
  onClose: () => void;
  onPick: (asset: ComposerAssetItem) => void;
  onLocalUpload: (previews: UploadPreview[]) => void;
  onUploadFiles?: (
    files: File[],
    param: PowerParam,
  ) => Promise<UploadPreview[]>;
}) {
  const [tab, setTab] = useState<"current" | "asset">("current");
  const [roleFilter, setRoleFilter] = useState<"all" | "content" | "material">(
    "all",
  );
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const acceptedKinds = acceptedAssetKinds(param);
  const items = filterComposerAssets(
    library[tab] || [],
    acceptedKinds,
    roleFilter,
    query,
  );

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const previews = onUploadFiles
        ? await onUploadFiles(files, param)
        : files.map(fileToUploadPreview);
      onLocalUpload(previews);
      setTab("asset");
      setRoleFilter("material");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div
      className="ws-asset-picker-backdrop"
      role="dialog"
      aria-modal="true"
      onMouseDown={onClose}
    >
      <section
        className="ws-asset-picker"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="ws-asset-picker-head">
          <div className="ws-asset-picker-tabs">
            <button
              type="button"
              className={tab === "current" ? "is-active" : ""}
              onClick={() => setTab("current")}
            >
              当前
            </button>
            <button
              type="button"
              className={tab === "asset" ? "is-active" : ""}
              onClick={() => setTab("asset")}
            >
              全部
            </button>
          </div>
          <label className="ws-asset-picker-search">
            <Search size={15} />
            <input
              value={query}
              placeholder="搜索名称"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="ws-asset-picker-close"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </header>

        <div className="ws-asset-kind-row">
          <span>
            {acceptedKinds.length > 0
              ? acceptedKinds.map(kindLabel).join(" / ")
              : "全部类型"}
          </span>
          <div className="ws-asset-role-tabs" aria-label="内容筛选">
            {[
              ["all", "全部"],
              ["content", "内容"],
              ["material", "素材"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={roleFilter === key ? "is-active" : ""}
                onClick={() =>
                  setRoleFilter(key as "all" | "content" | "material")
                }
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 size={14} className="ws-spin" />
            ) : (
              <Upload size={14} />
            )}
            本地上传
          </button>
          <input
            ref={inputRef}
            type="file"
            hidden
            multiple={param.type === "files"}
            onChange={handleFiles}
          />
        </div>

        <div className="ws-asset-picker-grid custom-scrollbar">
          {uploadError ? (
            <div className="ws-asset-picker-error">{uploadError}</div>
          ) : null}
          {items.length > 0 ? (
            items.map((asset) => (
              <button
                key={`${asset.source}-${asset.id}`}
                type="button"
                className="ws-asset-picker-card"
                onClick={() => onPick(asset)}
              >
                <AssetThumb asset={asset} />
                <span>{asset.title}</span>
                <small>{kindLabel(asset.kind)}</small>
              </button>
            ))
          ) : (
            <div className="ws-asset-picker-empty">
              <ImageIcon size={28} />
              <span>暂无可引用内容</span>
            </div>
          )}
        </div>
        {currentPreviews.length > 0 ? (
          <footer className="ws-asset-picker-foot">
            {currentPreviews.length} 个引用已添加
          </footer>
        ) : null}
      </section>
    </div>
  );
}

function AssetThumb({ asset }: { asset: ComposerAssetItem }) {
  const preview = asset.preview;
  if (preview.imageUrl) {
    return <img src={preview.imageUrl} alt={asset.title} />;
  }
  if (preview.videoUrl) {
    return (
      <video src={preview.videoUrl} muted playsInline preload="metadata" />
    );
  }
  return (
    <i>
      {asset.kind === "text" ? <FileText size={20} /> : <ImageIcon size={20} />}
    </i>
  );
}

function appendUploadPreview(
  param: PowerParam,
  previews: UploadPreview[],
  preview: UploadPreview,
) {
  return appendUploadPreviews(param, previews, [preview]);
}

function appendUploadPreviews(
  param: PowerParam,
  previews: UploadPreview[],
  nextPreviews: UploadPreview[],
) {
  const multiple = param.type === "files";
  const maxFiles = param.max_files || (multiple ? 8 : 1);
  const mergedPreviews = multiple
    ? [...previews, ...nextPreviews]
    : nextPreviews;
  const limitedPreviews = mergedPreviews.slice(0, multiple ? maxFiles : 1);
  const droppedPreviews = multiple ? mergedPreviews.slice(maxFiles) : previews;
  droppedPreviews.forEach(revokeUploadPreviewUrl);
  return limitedPreviews;
}

function uploadPreviewFromAsset(
  asset: ComposerAssetItem,
  alias: string,
): UploadPreview {
  const preview = asset.preview || emptyComposerPreview();
  const url =
    preview.imageUrl ||
    preview.videoUrl ||
    preview.audioUrl ||
    preview.fileUrl ||
    "";
  return {
    name: alias,
    alias,
    kind: asset.kind,
    source: asset.source,
    type: preview.imageUrl
      ? "image/url"
      : preview.videoUrl
        ? "video/url"
        : preview.audioUrl
          ? "audio/url"
          : "asset/reference",
    url,
    text: preview.text || asset.title,
    output: asset.output,
    asset: asset.asset,
  };
}

function nextReferenceAlias(param: PowerParam, index: number) {
  const name =
    `${param.name || param.key || ""}${param.key || ""}`.toLowerCase();
  if (/video|视频/.test(name)) {
    return `视频${index}`;
  }
  if (/audio|music|音频|音乐/.test(name)) {
    return `音频${index}`;
  }
  if (/text|文本|提示词|文案/.test(name)) {
    return `文本${index}`;
  }
  if (/image|img|photo|picture|图片|图像|参考图/.test(name)) {
    return `图片${index}`;
  }
  return `引用${index}`;
}

function appendReferenceMention(value: string, alias: string) {
  const mention = `@${alias}`;
  if (value.includes(mention)) {
    return value;
  }
  const separator = value.trim() ? " " : "";
  return `${value}${separator}${mention}`;
}

function acceptedAssetKinds(param: PowerParam) {
  const name = `${param.name || ""} ${param.key || ""}`.toLowerCase();
  if (/video|视频/.test(name)) {
    return ["video"];
  }
  if (/audio|music|音频|音乐/.test(name)) {
    return ["audio", "music"];
  }
  if (/image|img|photo|picture|图片|图像|参考图/.test(name)) {
    return ["image"];
  }
  if (/text|文本|提示词|文案/.test(name)) {
    return ["text"];
  }
  return [];
}

function filterComposerAssets(
  items: ComposerAssetItem[],
  acceptedKinds: string[],
  roleFilter: "all" | "content" | "material",
  query: string,
) {
  const normalizedQuery = query.trim().toLowerCase();
  return items.filter((item) => {
    if (
      roleFilter !== "all" &&
      item.source === "asset" &&
      String(item.role || "").toLowerCase() !== roleFilter
    ) {
      return false;
    }
    if (
      acceptedKinds.length > 0 &&
      !acceptedKinds.includes(String(item.kind || "").toLowerCase())
    ) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }
    return `${item.title} ${item.preview?.text || ""}`
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

function kindLabel(kind: string) {
  const normalized = String(kind || "").toLowerCase();
  if (normalized === "image") return "图片";
  if (normalized === "video") return "视频";
  if (normalized === "audio" || normalized === "music") return "音频";
  if (normalized === "text") return "文本";
  if (normalized === "file") return "文件";
  return kind || "内容";
}

function UploadPreviewDialog({
  title,
  preview,
  onClose,
}: {
  title: string;
  preview: UploadPreview;
  onClose: () => void;
}) {
  const canDownload = Boolean(preview.url);

  return (
    <div
      className="ws-upload-preview-backdrop"
      role="dialog"
      aria-modal="true"
      onMouseDown={onClose}
    >
      <div
        className="ws-upload-preview-shell"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="ws-upload-preview-title">
          <span>{title}</span>
          <strong>{preview.name}</strong>
        </div>
        <div className="ws-upload-preview-body">
          {isImagePreview(preview) ? (
            <img src={preview.url} alt={preview.name} />
          ) : preview.text && !preview.url ? (
            <div className="ws-upload-preview-text">
              <FileText size={30} />
              <p>{preview.text}</p>
            </div>
          ) : (
            <div className="ws-upload-preview-file">
              <FileText size={44} />
              <span>{preview.name}</span>
              <small>{preview.type || "文件"}</small>
            </div>
          )}
        </div>
        <div className="ws-upload-preview-actions">
          <button type="button" aria-label="关闭预览" onClick={onClose}>
            <X size={20} />
          </button>
          {canDownload ? (
            <a href={preview.url} download={preview.name} aria-label="下载文件">
              <Download size={20} />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ParamMenu({
  param,
  value,
  openKey,
  disabled,
  onToggle,
  onChange,
}: {
  param: PowerParam;
  value: unknown;
  openKey: string;
  disabled?: boolean;
  onToggle: (key: string) => void;
  onChange: (value: unknown) => void;
}) {
  return (
    <ComposerMenu
      id={param.key}
      openKey={openKey}
      label={paramControlLabel(param, value)}
      icon={<Settings2 size={15} />}
      disabled={disabled}
      onToggle={onToggle}
    >
      <ParamEditor
        param={param}
        value={value}
        onChange={onChange}
        onClose={() => onToggle("")}
      />
    </ComposerMenu>
  );
}

function ComposerMenu({
  id,
  openKey,
  label,
  icon,
  disabled,
  children,
  onToggle,
}: {
  id: string;
  openKey: string;
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  children: ReactNode;
  onToggle: (key: string) => void;
}) {
  const open = !disabled && openKey === id;
  return (
    <span
      className={`ws-prompt-tool-wrap ${open ? "is-open" : ""}`}
      onMouseEnter={() => {
        if (!disabled) {
          onToggle(id);
        }
      }}
      onMouseLeave={() => {
        if (open) {
          onToggle("");
        }
      }}
    >
      <button
        type="button"
        className={`ws-prompt-tool ${open ? "is-open" : ""}`}
        disabled={disabled}
        aria-label={label}
        onFocus={() => {
          if (!disabled) {
            onToggle(id);
          }
        }}
        onClick={() => {
          if (!disabled) {
            onToggle(open ? "" : id);
          }
        }}
      >
        {icon}
        <span>{label}</span>
        <ChevronDown size={14} />
      </button>
      {open ? <div className="ws-prompt-popover">{children}</div> : null}
    </span>
  );
}

function ParamEditor({
  param,
  value,
  onChange,
  onClose,
}: {
  param: PowerParam;
  value: unknown;
  onChange: (value: unknown) => void;
  onClose: () => void;
}) {
  if (param.type === "option" || param.type === "select") {
    return (
      <div className="ws-prompt-menu-list">
        {(param.options || []).map((option) => {
          const active = String(value ?? "") === option.value;
          return (
            <button
              key={option.id || option.value}
              type="button"
              className={`ws-prompt-menu-item ${active ? "is-active" : ""}`}
              onClick={() => {
                onChange(option.value);
                onClose();
              }}
            >
              <span>{option.name || option.value}</span>
              {active ? <CheckCircle2 size={14} /> : null}
            </button>
          );
        })}
      </div>
    );
  }

  if (param.type === "multi_option") {
    const selected = new Set(valueAsList(value));
    return (
      <div className="ws-prompt-menu-list">
        {(param.options || []).map((option) => {
          const active = selected.has(option.value);
          return (
            <button
              key={option.id || option.value}
              type="button"
              className={`ws-prompt-menu-item ${active ? "is-active" : ""}`}
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
              <span>{option.name || option.value}</span>
              {active ? <CheckCircle2 size={14} /> : null}
            </button>
          );
        })}
      </div>
    );
  }

  if (param.type === "switch") {
    const active = truthy(value);
    return (
      <button
        type="button"
        className={`ws-prompt-switch ${active ? "is-on" : ""}`}
        onClick={() => onChange(!active)}
      >
        <span>{param.name}</span>
        <i />
      </button>
    );
  }

  if (param.type === "textarea") {
    return (
      <textarea
        className="ws-prompt-param-textarea"
        value={valueAsText(value)}
        placeholder={param.name}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <input
      className="ws-prompt-param-input"
      type={param.value_type === "number" ? "number" : "text"}
      value={valueAsText(value)}
      placeholder={param.name}
      onChange={(event) =>
        onChange(
          param.value_type === "number"
            ? Number(event.target.value)
            : event.target.value,
        )
      }
    />
  );
}

export function isUploadPowerParam(param: PowerParam) {
  return param.type === "file" || param.type === "files";
}

export function isPromptPowerParam(param: PowerParam, primaryKey?: string) {
  if (param.type === "hidden" || param.type === "description") {
    return false;
  }
  if (primaryKey && param.key === primaryKey) {
    return true;
  }
  return (
    param.usage === 1 &&
    (param.type === "textarea" ||
      param.key === "prompt" ||
      param.key === "text")
  );
}

export function isToolbarPowerParam(param: PowerParam) {
  if (
    param.type === "hidden" ||
    param.type === "description" ||
    isUploadPowerParam(param)
  ) {
    return false;
  }
  return true;
}

function paramControlLabel(param: PowerParam, value: unknown) {
  if (param.type === "switch") {
    return `${param.name}: ${truthy(value) ? "开" : "关"}`;
  }
  if (param.type === "multi_option") {
    const count = valueAsList(value).length;
    return count > 0 ? `${param.name} ${count}` : param.name;
  }
  if (param.type === "option" || param.type === "select") {
    const option = param.options?.find(
      (item) => item.value === String(value ?? ""),
    );
    return option?.name || param.name;
  }
  const text = valueAsText(value);
  return text ? `${param.name}: ${text}` : param.name;
}

function fileToUploadPreview(file: File): UploadPreview {
  return {
    name: file.name,
    type: file.type,
    url: URL.createObjectURL(file),
  };
}

function isImagePreview(preview: UploadPreview) {
  return Boolean(preview.url && preview.type?.startsWith("image/"));
}

function revokeUploadPreviewUrl(preview?: UploadPreview) {
  if (preview?.url?.startsWith("blob:")) {
    URL.revokeObjectURL(preview.url);
  }
}

function previewsFromValue(value: unknown): UploadPreview[] {
  if (Array.isArray(value)) {
    return value
      .map(storedUploadPreview)
      .filter((preview): preview is UploadPreview => Boolean(preview));
  }
  if (value && typeof value === "object") {
    const preview = storedUploadPreview(value);
    return preview ? [preview] : [];
  }
  return valueAsList(value)
    .map(storedUploadPreview)
    .filter((preview): preview is UploadPreview => Boolean(preview));
}

function uploadParamValue(param: PowerParam, previews: UploadPreview[]) {
  const values = previews.map((preview) => ({
    name: preview.alias || preview.name,
    alias: preview.alias || preview.name,
    type: preview.type || preview.kind || "",
    kind: preview.kind || "",
    url: preview.url || "",
    text: preview.text || "",
    source: preview.source || "upload",
    output: preview.output,
    asset: preview.asset,
  }));
  return param.type === "files" ? values : values[0] || "";
}

function valueAsText(value: unknown) {
  if (value == null) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.join("、");
  }
  return String(value);
}

function valueAsList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === "string") {
    const parsed = parseJSONValue(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item)).filter(Boolean);
    }
    return value ? [value] : [];
  }
  return value ? [String(value)] : [];
}

function truthy(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  const text = String(value ?? "")
    .trim()
    .toLowerCase();
  return text === "1" || text === "true" || text === "yes" || text === "on";
}

function parseJSONValue(value: string) {
  if (!value) {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function storedUploadPreview(value: unknown): UploadPreview | null {
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    const url = String(row.url || "");
    const text = String(row.text || "");
    return {
      name: String(
        row.name || row.alias || uploadNameFromUrl(url) || text || "引用内容",
      ),
      alias: String(row.alias || row.name || ""),
      kind: String(row.kind || ""),
      source: String(row.source || "upload") as UploadPreview["source"],
      type: String(row.type || imageTypeFromUrl(url) || ""),
      url,
      text,
      output: row.output,
      asset: row.asset,
    };
  }
  const text = String(value || "");
  if (!text) {
    return null;
  }
  if (!isUrlLike(text)) {
    return { name: text };
  }
  return {
    name: uploadNameFromUrl(text),
    type: imageTypeFromUrl(text),
    url: text,
  };
}

function isUrlLike(value: string) {
  return /^(blob:|data:|https?:\/\/)/i.test(value);
}

function uploadNameFromUrl(value: string) {
  if (value.startsWith("data:")) {
    return "上传文件";
  }
  try {
    const url = new URL(value);
    const name = url.pathname.split("/").filter(Boolean).pop();
    return name ? decodeURIComponent(name) : value;
  } catch {
    const name = value.split("/").filter(Boolean).pop();
    return name || value;
  }
}

function imageTypeFromUrl(value: string) {
  if (value.startsWith("data:image/")) {
    return value.slice(
      5,
      value.indexOf(";") > 0 ? value.indexOf(";") : undefined,
    );
  }
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i.test(value)
    ? "image/url"
    : "";
}

function emptyComposerPreview(): ComposerAssetPreview {
  return {
    text: "",
    imageUrl: "",
    videoUrl: "",
    audioUrl: "",
    fileUrl: "",
  };
}
