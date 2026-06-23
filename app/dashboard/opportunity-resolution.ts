import {
  emptyOpportunityWorkflowState,
  mergeOpportunityWorkflowState,
  normalizeOpportunityWorkflowState,
  type OpportunityWorkflowState,
  type OpportunityWorkflowStatePatch,
} from "@/lib/opportunity-workflow-state";

export const opportunityWorkflowStateStorageKey = "tractionflo_opportunity_workflow_state";
export const opportunityWorkflowStateChangedEvent = "tractionflo:opportunity-workflow-state-changed";

function readStoredJson(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function readStoredOpportunityWorkflowState() {
  if (typeof window === "undefined") {
    return emptyOpportunityWorkflowState;
  }

  return normalizeOpportunityWorkflowState(readStoredJson(opportunityWorkflowStateStorageKey));
}

export function writeStoredOpportunityWorkflowState(state: OpportunityWorkflowState) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedState = normalizeOpportunityWorkflowState(state);
  window.localStorage.setItem(opportunityWorkflowStateStorageKey, JSON.stringify(normalizedState));
  window.dispatchEvent(new CustomEvent(opportunityWorkflowStateChangedEvent, { detail: normalizedState }));
}

export async function loadOpportunityWorkflowStateFromDatabase() {
  const response = await fetch("/api/opportunities/state", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const data = (await response.json()) as { state?: unknown; error?: string };

  if (!response.ok || data.error) {
    throw new Error(data.error || "Could not load lead state");
  }

  const databaseState = normalizeOpportunityWorkflowState(data.state);
  const localState = readStoredOpportunityWorkflowState();
  const state = mergeOpportunityWorkflowState(databaseState, localState);
  writeStoredOpportunityWorkflowState(state);

  if (!hasSameOpportunityIds(databaseState, state)) {
    void saveOpportunityWorkflowStateToDatabase(localState).catch((error) => {
      console.error("Lead workflow state migration error:", error);
    });
  }

  return state;
}

export async function saveOpportunityWorkflowStateToDatabase(patch: OpportunityWorkflowStatePatch) {
  const optimisticState = mergeOpportunityWorkflowState(readStoredOpportunityWorkflowState(), patch);
  writeStoredOpportunityWorkflowState(optimisticState);

  const response = await fetch("/api/opportunities/state", {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ state: patch }),
  });
  const data = (await response.json()) as { state?: unknown; error?: string };

  if (!response.ok || data.error) {
    throw new Error(data.error || "Could not save lead state");
  }

  const state = normalizeOpportunityWorkflowState(data.state);
  writeStoredOpportunityWorkflowState(state);
  return state;
}

function hasSameOpportunityIds(left: OpportunityWorkflowState, right: OpportunityWorkflowState) {
  return (
    left.readIds.join("|") === right.readIds.join("|") &&
    left.workingIds.join("|") === right.workingIds.join("|") &&
    left.resolvedIds.join("|") === right.resolvedIds.join("|")
  );
}
