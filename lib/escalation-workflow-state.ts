export const escalationWorkflowStateMetadataKey = "escalation_workflow_state";
const maxEscalationWorkflowIds = 25;

export type EscalationWorkflowState = {
  readIds: string[];
  workingIds: string[];
  resolvedIds: string[];
  updatedAt?: string;
};

export type EscalationWorkflowStatePatch = Partial<Pick<EscalationWorkflowState, "readIds" | "workingIds" | "resolvedIds">>;

export const emptyEscalationWorkflowState: EscalationWorkflowState = {
  readIds: [],
  workingIds: [],
  resolvedIds: [],
};

export function normalizeEscalationIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0))).slice(
    -maxEscalationWorkflowIds
  );
}

export function normalizeEscalationWorkflowState(value: unknown): EscalationWorkflowState {
  if (!value || typeof value !== "object") {
    return emptyEscalationWorkflowState;
  }

  const record = value as Partial<Record<keyof EscalationWorkflowState, unknown>>;
  const updatedAt = typeof record.updatedAt === "string" ? record.updatedAt : undefined;

  return {
    readIds: normalizeEscalationIds(record.readIds),
    workingIds: normalizeEscalationIds(record.workingIds),
    resolvedIds: normalizeEscalationIds(record.resolvedIds),
    ...(updatedAt ? { updatedAt } : {}),
  };
}

export function mergeEscalationWorkflowState(
  currentState: EscalationWorkflowState,
  patch: EscalationWorkflowStatePatch,
): EscalationWorkflowState {
  const resolvedIds = normalizeEscalationIds([
    ...currentState.resolvedIds,
    ...normalizeEscalationIds(patch.resolvedIds),
  ]);
  const readIds = normalizeEscalationIds([
    ...currentState.readIds,
    ...normalizeEscalationIds(patch.readIds),
    ...resolvedIds,
  ]);
  const workingIds = normalizeEscalationIds([
    ...currentState.workingIds,
    ...normalizeEscalationIds(patch.workingIds),
    ...resolvedIds,
  ]);

  return {
    readIds,
    workingIds,
    resolvedIds,
    updatedAt: new Date().toISOString(),
  };
}
