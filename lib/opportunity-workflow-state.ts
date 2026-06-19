export const opportunityWorkflowStateMetadataKey = "opportunity_workflow_state";
const maxOpportunityWorkflowIds = 25;

export type OpportunityWorkflowState = {
  readIds: string[];
  workingIds: string[];
  resolvedIds: string[];
  updatedAt?: string;
};

export type OpportunityWorkflowStatePatch = Partial<Pick<OpportunityWorkflowState, "readIds" | "workingIds" | "resolvedIds">>;

export const emptyOpportunityWorkflowState: OpportunityWorkflowState = {
  readIds: [],
  workingIds: [],
  resolvedIds: [],
};

export function normalizeOpportunityIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0))).slice(
    -maxOpportunityWorkflowIds
  );
}

export function normalizeOpportunityWorkflowState(value: unknown): OpportunityWorkflowState {
  if (!value || typeof value !== "object") {
    return emptyOpportunityWorkflowState;
  }

  const record = value as Partial<Record<keyof OpportunityWorkflowState, unknown>>;
  const updatedAt = typeof record.updatedAt === "string" ? record.updatedAt : undefined;

  return {
    readIds: normalizeOpportunityIds(record.readIds),
    workingIds: normalizeOpportunityIds(record.workingIds),
    resolvedIds: normalizeOpportunityIds(record.resolvedIds),
    ...(updatedAt ? { updatedAt } : {}),
  };
}

export function mergeOpportunityWorkflowState(
  currentState: OpportunityWorkflowState,
  patch: OpportunityWorkflowStatePatch,
): OpportunityWorkflowState {
  const resolvedIds = normalizeOpportunityIds([
    ...currentState.resolvedIds,
    ...normalizeOpportunityIds(patch.resolvedIds),
  ]);
  const readIds = normalizeOpportunityIds([
    ...currentState.readIds,
    ...normalizeOpportunityIds(patch.readIds),
    ...resolvedIds,
  ]);
  const workingIds = normalizeOpportunityIds([
    ...currentState.workingIds,
    ...normalizeOpportunityIds(patch.workingIds),
    ...resolvedIds,
  ]);

  return {
    readIds,
    workingIds,
    resolvedIds,
    updatedAt: new Date().toISOString(),
  };
}
