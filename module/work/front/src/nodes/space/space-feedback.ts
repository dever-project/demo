import { defaultPowerParamValues } from "./space-power-param";
import type { PowerParam, SpaceCanvasNode } from "./types";

export type FlowRunStatus =
  | "running"
  | "waiting"
  | "success"
  | "fail"
  | "canceled"
  | string;

export type FlowRunSnapshot = {
  runId: number;
  requestId: string;
  status: FlowRunStatus;
  output: unknown;
  error: string;
  approvals: FlowApproval[];
  raw: any;
};

export type FlowApproval = {
  id: number;
  title: string;
  status: string;
  decision: string;
  content: Record<string, any>;
};

export type FlowFeedbackPrompt = {
  approval: FlowApproval;
  title: string;
  description: string;
  fields: PowerParam[];
  values: Record<string, unknown>;
};

export type FlowFeedbackRequester = (input: {
  node: SpaceCanvasNode;
  prompt: FlowFeedbackPrompt;
}) => Promise<Record<string, unknown>>;

export type NodeFeedbackRecord = {
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

export const FEEDBACK_REPLACED_MESSAGE = "反馈已被新的运行替换";

export function isFeedbackReplacedError(err: unknown) {
  return err instanceof Error && err.message === FEEDBACK_REPLACED_MESSAGE;
}

export function currentNodeFeedbackRecords(node?: SpaceCanvasNode | null) {
  const records = Array.isArray((node as any)?.feedbackRequests)
    ? ((node as any).feedbackRequests as NodeFeedbackRecord[])
    : [];
  return records.filter((record) => record && record.id);
}

export function createNodeFeedbackRecord(
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

export function submitNodeFeedbackRecord(
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

export function isReadonlyFeedbackRecord(
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

export function normalizeFlowRunSnapshot(value: any): FlowRunSnapshot {
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

export function flowFeedbackFromSnapshot(
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

export function isFlowWaitingSnapshot(snapshot: FlowRunSnapshot) {
  return (
    snapshot.status === "waiting" ||
    snapshot.approvals.some(isPendingFlowApproval)
  );
}

export function flowFeedbackFields(interaction: Record<string, any>): PowerParam[] {
  const fields = Array.isArray(interaction.fields)
    ? interaction.fields
    : Array.isArray(interaction.params)
      ? interaction.params
      : [];
  return fields
    .map((field, index) => normalizeFeedbackField(field, index))
    .filter((field): field is PowerParam => Boolean(field.key));
}

export function flowFeedbackInitialValues(
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

export function agentFeedbackFromResult(
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

function normalizeFlowApproval(value: any): FlowApproval {
  const content =
    value?.content && typeof value.content === "object" ? value.content : {};
  return {
    id: Number(value?.id || value?.approval_id || 0),
    title: String(value?.title || ""),
    status: String(value?.status || ""),
    decision: String(value?.decision || ""),
    content,
  };
}

function isPendingFlowApproval(approval: FlowApproval) {
  return approval.status === "pending" || approval.decision === "pending";
}

function flowApprovalInteraction(approval: FlowApproval) {
  const content = approval.content || {};
  const interaction = content.interaction;
  return interaction && typeof interaction === "object" ? interaction : content;
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
