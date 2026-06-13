import {
  buildRuntimeRequestHeaders,
  joinSiteApi,
} from "@dever/front-plugin";

export type SpaceStreamFrame = {
  request_id?: string;
  type?: string;
  output?: Record<string, unknown>;
  msg?: string;
  status?: number;
  stream_id?: string;
};

export type WatchSpaceCanvasStreamInput = {
  projectId: number;
  requestId: string;
  lastId?: string;
  signal?: AbortSignal;
  onFrame: (frame: SpaceStreamFrame) => void;
};

export async function watchSpaceCanvasStream(input: WatchSpaceCanvasStreamInput) {
  const requestId = String(input.requestId || "").trim();
  if (!requestId) {
    throw new Error("request_id 不能为空");
  }
  if (typeof fetch !== "function") {
    throw new Error("当前浏览器不支持画布流请求");
  }
  const url = buildSpaceStreamUrl(input.projectId, requestId, {
    last_id: input.lastId || "0-0",
    transport: "sse",
  });
  const headers = new Headers(
    buildRuntimeRequestHeaders({ contentType: false }),
  );
  headers.set("Accept", "text/event-stream");
  const response = await fetch(url, {
    method: "GET",
    headers,
    credentials: "include",
    signal: input.signal,
  });
  if (!response.ok) {
    throw new Error(`画布流连接失败: ${response.status}`);
  }
  if (!response.body) {
    throw new Error("画布流响应不可读");
  }
  await readEventStream(response.body, input.onFrame, input.signal);
}

async function readEventStream(
  body: ReadableStream<Uint8Array>,
  onFrame: (frame: SpaceStreamFrame) => void,
  signal?: AbortSignal,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      if (signal?.aborted) {
        return;
      }
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() || "";
      for (const part of parts) {
        emitSSEFrame(part, onFrame);
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) {
      emitSSEFrame(buffer, onFrame);
    }
  } finally {
    reader.releaseLock();
  }
}

function emitSSEFrame(
  chunk: string,
  onFrame: (frame: SpaceStreamFrame) => void,
) {
  const dataLines = chunk
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart());
  if (dataLines.length === 0) {
    return;
  }
  const raw = dataLines.join("\n").trim();
  if (!raw) {
    return;
  }
  let frame: SpaceStreamFrame;
  try {
    frame = JSON.parse(raw);
  } catch {
    frame = { type: "stream", output: { raw } };
  }
  onFrame(frame);
}

function buildSpaceStreamUrl(
  projectId: number,
  requestId: string,
  extra: Record<string, string>,
) {
  const url = new URL(joinSiteApi("space/stream"), window.location.origin);
  url.searchParams.set("project_id", String(projectId || 0));
  url.searchParams.set("request_id", requestId);
  url.searchParams.set("count", "20");
  url.searchParams.set("block", "15000");
  Object.entries(extra).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}
