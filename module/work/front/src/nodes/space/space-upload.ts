import { getCompatModule } from "@dever/front-plugin";
import {
  completeSpaceUpload,
  initSpaceUpload,
  uploadSpacePart,
} from "./space-api";
import type { UploadPreview } from "./space-prompt-composer";

const { digestUploadFile, uploadFileDirect } = getCompatModule("@/lib/upload") as {
  digestUploadFile?: (file: File) => Promise<string>;
  uploadFileDirect?: (
    file: File,
    direct: unknown,
    onProgress?: (loaded: number, total: number) => void,
  ) => Promise<void>;
};

export async function uploadSpaceFiles(
  projectId: number,
  files: File[],
  ruleId?: number,
): Promise<UploadPreview[]> {
  const uploadRuleId = Number(ruleId || 0);
  if (uploadRuleId <= 0) {
    throw new Error("当前节点未配置上传规则");
  }
  const previews: UploadPreview[] = [];
  for (const file of files) {
    const hash = await computeSpaceUploadHash(file);
    const init = await initSpaceUpload({
      projectId,
      ruleId: uploadRuleId,
      name: file.name,
      size: file.size,
      mime: file.type,
      hash,
      kind: uploadKindFromFile(file),
    });
    if (String(init.transport || "relay").toLowerCase() === "direct") {
      if (!uploadFileDirect) {
        throw new Error("当前导入入口缺少前端直传能力");
      }
      await uploadFileDirect(file, init.direct);
    } else {
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
    }
    const completed = await completeSpaceUpload({
      projectId,
      sessionId: Number(init.session_id || 0),
    });
    previews.push(uploadPreviewFromPayload(completed, file));
  }
  return previews;
}

export function uploadAssetContent(preview: UploadPreview) {
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

async function computeSpaceUploadHash(file: File) {
  const hash = digestUploadFile ? await digestUploadFile(file) : "";
  if (!hash) {
    throw new Error("文件标识生成失败，请重新选择文件");
  }
  return hash;
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
