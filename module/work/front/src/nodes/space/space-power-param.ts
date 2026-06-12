import type { PowerParam } from "./types";

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

export function defaultPowerParamValues(params: PowerParam[]) {
  const values: Record<string, unknown> = {};
  for (const param of params) {
    if (!param.key || param.type === "description") {
      continue;
    }
    values[param.key] = defaultPowerParamValue(param);
  }
  return values;
}

function parseJSONValue(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function valueAsList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === "string") {
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
