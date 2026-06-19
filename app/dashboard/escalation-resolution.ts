import {
  emptyEscalationWorkflowState,
  mergeEscalationWorkflowState,
  normalizeEscalationIds,
  normalizeEscalationWorkflowState,
  type EscalationWorkflowState,
  type EscalationWorkflowStatePatch,
} from "@/lib/escalation-workflow-state";

export const escalationWorkflowStateStorageKey = "tractionflo_escalation_workflow_state";
export const escalationWorkflowStateChangedEvent = "tractionflo:escalation-workflow-state-changed";

const legacyResolvedEscalationsStorageKey = "tractionflo_resolved_escalations";
const legacySeenEscalationsStorageKey = "tractionflo_seen_escalations";

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

function readLegacyEscalationIds(key: string) {
  const value = readStoredJson(key);
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
}

export function readStoredEscalationWorkflowState() {
  if (typeof window === "undefined") {
    return emptyEscalationWorkflowState;
  }

  const storedState = normalizeEscalationWorkflowState(readStoredJson(escalationWorkflowStateStorageKey));

  return normalizeEscalationWorkflowState({
    ...storedState,
    workingIds: normalizeEscalationIds([
      ...storedState.workingIds,
      ...readLegacyEscalationIds(legacySeenEscalationsStorageKey),
    ]),
    resolvedIds: normalizeEscalationIds([
      ...storedState.resolvedIds,
      ...readLegacyEscalationIds(legacyResolvedEscalationsStorageKey),
    ]),
  });
}

export function writeStoredEscalationWorkflowState(state: EscalationWorkflowState) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedState = normalizeEscalationWorkflowState(state);
  window.localStorage.setItem(escalationWorkflowStateStorageKey, JSON.stringify(normalizedState));
  window.dispatchEvent(new CustomEvent(escalationWorkflowStateChangedEvent, { detail: normalizedState }));
}

export async function loadEscalationWorkflowStateFromDatabase() {
  const response = await fetch("/api/escalations/state", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const data = (await response.json()) as { state?: unknown; error?: string };

  if (!response.ok || data.error) {
    throw new Error(data.error || "Could not load escalation state");
  }

  const databaseState = normalizeEscalationWorkflowState(data.state);
  const localState = readStoredEscalationWorkflowState();
  const state = mergeEscalationWorkflowState(databaseState, localState);
  writeStoredEscalationWorkflowState(state);

  if (!hasSameEscalationIds(databaseState, state)) {
    void saveEscalationWorkflowStateToDatabase(localState).catch((error) => {
      console.error("Escalation workflow state migration error:", error);
    });
  }

  return state;
}

export async function saveEscalationWorkflowStateToDatabase(patch: EscalationWorkflowStatePatch) {
  const optimisticState = mergeEscalationWorkflowState(readStoredEscalationWorkflowState(), patch);
  writeStoredEscalationWorkflowState(optimisticState);

  const response = await fetch("/api/escalations/state", {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ state: patch }),
  });
  const data = (await response.json()) as { state?: unknown; error?: string };

  if (!response.ok || data.error) {
    throw new Error(data.error || "Could not save escalation state");
  }

  const state = normalizeEscalationWorkflowState(data.state);
  writeStoredEscalationWorkflowState(state);
  return state;
}

function hasSameEscalationIds(left: EscalationWorkflowState, right: EscalationWorkflowState) {
  return (
    left.readIds.join("|") === right.readIds.join("|") &&
    left.workingIds.join("|") === right.workingIds.join("|") &&
    left.resolvedIds.join("|") === right.resolvedIds.join("|")
  );
}
