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
  Loader2,
  Paperclip,
  Settings2,
  X,
} from "lucide-react";
import type { PowerParam, PowerParamSource } from "./types";

type PromptComposerProps = {
  value: string;
  placeholder: string;
  running?: boolean;
  disabled?: boolean;
  sourceOptions?: PowerParamSource[];
  selectedSourceId?: number;
  params?: PowerParam[];
  paramValues?: Record<string, unknown>;
  onChange: (value: string) => void;
  onParamChange?: (key: string, value: unknown) => void;
  onSourceChange?: (sourceId: number) => void;
  onSubmit: () => void;
};

type UploadPreview = {
  name: string;
  type?: string;
  url?: string;
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
  sourceOptions = [],
  selectedSourceId = 0,
  params = [],
  paramValues = {},
  onChange,
  onParamChange,
  onSourceChange,
  onSubmit,
}: PromptComposerProps) {
  const [openKey, setOpenKey] = useState("");
  const [uploadPreviews, setUploadPreviews] = useState<Record<string, UploadPreview[]>>({});
  const [activePreview, setActivePreview] = useState<UploadPreviewState | null>(null);
  const uploadParams = params.filter(isUploadPowerParam);
  const optionParams = params.filter(isToolbarPowerParam);
  const selectedSource = sourceOptions.find((source) => source.target_id === selectedSourceId || source.id === selectedSourceId);

  useEffect(() => {
    if (disabled || running) {
      setOpenKey("");
    }
  }, [disabled, running]);

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
                previews={uploadPreviews[param.key] || previewsFromValue(paramValues[param.key])}
                disabled={disabled || running}
                onChange={(nextPreviews) => setUploadValue(param, nextPreviews)}
                onPreview={(file) => setActivePreview({ groupName: param.name || "上传文件", file })}
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
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !running) {
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
              label={selectedSource?.name || selectedSource?.service_name || "来源"}
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
            {running ? <Loader2 size={17} className="ws-spin" /> : <ArrowUp size={18} />}
          </button>
        </div>
      </div>
      {activePreview && typeof document !== "undefined" ? createPortal(
        <UploadPreviewDialog
          title={activePreview.groupName}
          preview={activePreview.file}
          onClose={() => setActivePreview(null)}
        />,
        document.body,
      ) : null}
    </div>
  );
}

function UploadParamStrip({
  param,
  previews,
  disabled,
  onChange,
  onPreview,
}: {
  param: PowerParam;
  previews: UploadPreview[];
  disabled?: boolean;
  onChange: (previews: UploadPreview[]) => void;
  onPreview: (preview: UploadPreview) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const multiple = param.type === "files";
  const maxFiles = param.max_files || (multiple ? 8 : 1);

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []).slice(0, maxFiles);
    const nextPreviews = files.map(fileToUploadPreview);
    const mergedPreviews = multiple ? [...previews, ...nextPreviews] : nextPreviews;
    const limitedPreviews = mergedPreviews.slice(0, multiple ? maxFiles : 1);
    const droppedPreviews = multiple ? mergedPreviews.slice(maxFiles) : previews;
    droppedPreviews.forEach(revokeUploadPreviewUrl);
    onChange(limitedPreviews);
    event.target.value = "";
  }

  function removeAt(index: number) {
    revokeUploadPreviewUrl(previews[index]);
    onChange(previews.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <div className={`ws-prompt-upload-group ${previews.length > 0 ? "has-previews" : "is-empty"}`}>
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
            <img className="ws-prompt-upload-thumb" src={preview.url} alt={preview.name} />
          ) : (
            <span className="ws-prompt-upload-file">
              <FileText size={16} />
            </span>
          )}
          <span className="ws-prompt-upload-name">{preview.name}</span>
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
        aria-label={param.name || "上传"}
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip size={16} />
        <span>{uploadButtonLabel(param)}</span>
      </button>
      <input ref={inputRef} type="file" multiple={multiple} hidden onChange={handleFiles} />
    </div>
  );
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
    <div className="ws-upload-preview-backdrop" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="ws-upload-preview-shell" onMouseDown={(event) => event.stopPropagation()}>
        <div className="ws-upload-preview-title">
          <span>{title}</span>
          <strong>{preview.name}</strong>
        </div>
        <div className="ws-upload-preview-body">
          {isImagePreview(preview) ? (
            <img src={preview.url} alt={preview.name} />
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
      <ParamEditor param={param} value={value} onChange={onChange} onClose={() => onToggle("")} />
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
      <button type="button" className={`ws-prompt-switch ${active ? "is-on" : ""}`} onClick={() => onChange(!active)}>
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
      onChange={(event) => onChange(param.value_type === "number" ? Number(event.target.value) : event.target.value)}
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
  return param.usage === 1 && (param.type === "textarea" || param.key === "prompt" || param.key === "text");
}

export function isToolbarPowerParam(param: PowerParam) {
  if (param.type === "hidden" || param.type === "description" || isUploadPowerParam(param)) {
    return false;
  }
  return true;
}

export function defaultPowerParamValue(param: PowerParam) {
  const raw = param.default_value ?? "";
  if (param.type === "switch") {
    return truthy(raw);
  }
  if (param.type === "multi_option" || param.type === "files") {
    return valueAsList(parseJSONValue(raw));
  }
  if (param.type === "option" || param.type === "select") {
    return raw || param.options?.[0]?.value || "";
  }
  if (param.value_type === "number") {
    return raw === "" ? "" : Number(raw);
  }
  return raw;
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
    const option = param.options?.find((item) => item.value === String(value ?? ""));
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

function uploadButtonLabel(param: PowerParam) {
  const name = String(param.name || "").replace(/^上传/, "").trim();
  if (name) {
    return name;
  }
  if (param.type === "files") {
    return "文件";
  }
  return "上传";
}

function previewsFromValue(value: unknown): UploadPreview[] {
  return valueAsList(value).map(storedUploadPreview);
}

function uploadParamValue(param: PowerParam, previews: UploadPreview[]) {
  const names = previews.map((preview) => preview.name).filter(Boolean);
  return param.type === "files" ? names : names[0] || "";
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
  const text = String(value ?? "").trim().toLowerCase();
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

function storedUploadPreview(value: string): UploadPreview {
  const text = String(value || "");
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
    return value.slice(5, value.indexOf(";") > 0 ? value.indexOf(";") : undefined);
  }
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i.test(value) ? "image/url" : "";
}
