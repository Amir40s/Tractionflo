export type PagePermissionId =
  | "dashboard"
  | "inbox"
  | "instagram-content"
  | "opportunities"
  | "audience"
  | "knowledge"
  | "escalations"
  | "analytics"
  | "settings";

export type AgentStatus = "Active" | "Suspended";

export type UserPermissionProfile = {
  isAgent: boolean;
  status: AgentStatus;
  allowedPages: PagePermissionId[];
  assignedConversationIds: string[];
  humanEscalation: boolean;
};

export const pagePermissionOptions: { id: PagePermissionId; label: string; detail: string }[] = [
  { id: "dashboard", label: "Dashboard", detail: "Overview, revenue, and activity" },
  { id: "inbox", label: "Conversations", detail: "Assigned Instagram conversations" },
  { id: "instagram-content", label: "Posts & Stories", detail: "Instagram posts, stories, and comment replies" },
  { id: "opportunities", label: "Opportunities", detail: "Lead pipeline and review cards" },
  { id: "audience", label: "Audience", detail: "Audience segments and insights" },
  { id: "knowledge", label: "Knowledge Base", detail: "Training sources and content" },
  { id: "escalations", label: "Escalations", detail: "Human escalation queue" },
  { id: "analytics", label: "Analytics", detail: "Performance, trends, and reports" },
  { id: "settings", label: "Settings", detail: "Profile and allowed settings" },
];

export const allPagePermissionIds = pagePermissionOptions.map((option) => option.id);

function getMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value : "";
}

function getMetadataBoolean(metadata: Record<string, unknown>, key: string, fallback: boolean) {
  const value = metadata[key];

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return fallback;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function normalizeAllowedPages(value: unknown, fallback: PagePermissionId[] = allPagePermissionIds) {
  const allowed = normalizeStringArray(value).filter((item): item is PagePermissionId =>
    allPagePermissionIds.includes(item as PagePermissionId)
  );

  return allowed.length > 0 ? allowed : fallback;
}

export function getUserPermissionProfile(metadata: Record<string, unknown> = {}): UserPermissionProfile {
  const role = getMetadataString(metadata, "role").toLowerCase();
  const accountRole = getMetadataString(metadata, "account_role").toLowerCase();
  const status = getMetadataString(metadata, "status") === "Suspended" ? "Suspended" : "Active";
  const isAgent = metadata.is_agent === true || role === "agent" || accountRole === "agent";

  return {
    isAgent,
    status,
    allowedPages: normalizeAllowedPages(metadata.allowed_pages, isAgent ? ["inbox"] : allPagePermissionIds),
    assignedConversationIds: normalizeStringArray(metadata.assigned_conversation_ids),
    humanEscalation: getMetadataBoolean(metadata, "human_escalation", true),
  };
}

export function canAccessPage(permissions: UserPermissionProfile, page: PagePermissionId) {
  if (permissions.status === "Suspended") {
    return false;
  }

  return !permissions.isAgent || permissions.allowedPages.includes(page);
}

export function canAccessConversation(permissions: UserPermissionProfile, conversationId: string) {
  if (permissions.status === "Suspended") {
    return false;
  }

  if (!permissions.isAgent) {
    return true;
  }

  return permissions.assignedConversationIds.includes(conversationId);
}

export function filterAssignedConversations<T extends { id: string }>(
  conversations: T[],
  permissions: UserPermissionProfile
) {
  if (permissions.status === "Suspended") {
    return [];
  }

  if (!permissions.isAgent) {
    return conversations;
  }

  return conversations.filter((conversation) => permissions.assignedConversationIds.includes(conversation.id));
}
