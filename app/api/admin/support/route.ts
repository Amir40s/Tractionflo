import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { normalizeAiIntegrationMetadata } from "@/lib/ai-integration";
import { getUserPermissionProfile } from "@/lib/agent-permissions";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type SupportTone = "green" | "amber" | "red" | "purple";

type AnyRow = Record<string, unknown>;

type StoredMessageRow = {
  mid?: string | null;
  id?: string | null;
  text?: string | null;
  sender_id?: string | null;
  timestamp?: number | string | null;
};

type SupportTicketAdminRow = {
  id: string;
  name: string;
  detail: string;
  priority: string;
  topic: string;
  age: string;
  assignee: string;
  sla: string;
  status: string;
  tone: SupportTone;
};

type SupportIssueAdminRow = {
  id: string;
  name: string;
  detail: string;
  category: string;
  impact: string;
  age: string;
  owner: string;
  nextStep: string;
  status: string;
  tone: SupportTone;
};

const supportKeywords = ["refund", "cancel", "angry", "human", "agent", "support", "issue", "problem", "complaint", "billing", "charge"];
const urgentKeywords = ["urgent", "asap", "angry", "refund", "fraud", "cancel", "broken", "not working"];
const billingKeywords = ["refund", "billing", "charge", "payment", "invoice", "cancel"];
const instagramKeywords = ["instagram", "meta", "connect", "token", "webhook", "dm", "message"];
const aiKeywords = ["ai", "reply", "draft", "openai", "assistant", "tone"];

function getMetadata(user: User) {
  return (user.user_metadata || {}) as Record<string, unknown>;
}

function getMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value.trim() : "";
}

function getMetadataBoolean(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];

  if (typeof value === "boolean") {
    return value;
  }

  return typeof value === "string" && value.toLowerCase() === "true";
}

function getMetadataNumber(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value.replace(/[$,\s]/g, ""));

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

function isSuperAdminUser(user: User) {
  const metadata = getMetadata(user);
  const role = getMetadataString(metadata, "role").toLowerCase();
  const accountRole = getMetadataString(metadata, "account_role").toLowerCase();

  return (
    metadata.is_superadmin === true ||
    role === "superadmin" ||
    role === "super admin" ||
    accountRole === "superadmin" ||
    user.email?.toLowerCase() === "tractionflo@gmail.com"
  );
}

function isCreatorUser(user: User) {
  const permissions = getUserPermissionProfile(getMetadata(user));
  return !permissions.isAgent && !isSuperAdminUser(user);
}

function getUserName(user: User) {
  const metadata = getMetadata(user);

  return (
    getMetadataString(metadata, "full_name") ||
    getMetadataString(metadata, "name") ||
    user.email?.split("@")[0] ||
    "Creator"
  );
}

function getString(row: AnyRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
}

function getRowNumber(row: AnyRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value.replace(/[$,\s]/g, ""));

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

function getRowTimestamp(row: AnyRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    const timestamp = getTimestamp(value);

    if (timestamp > 0) {
      return timestamp;
    }
  }

  return 0;
}

function getTimestamp(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const numericValue = Number(value);

    if (Number.isFinite(numericValue)) {
      return numericValue;
    }

    const dateValue = new Date(value).getTime();
    return Number.isFinite(dateValue) ? dateValue : 0;
  }

  return 0;
}

function formatAge(timestamp: number) {
  if (!timestamp) {
    return "No timestamp";
  }

  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function includesAnyKeyword(text: string, keywords: string[]) {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function getTopic(text: string) {
  if (includesAnyKeyword(text, billingKeywords)) {
    return "Billing";
  }

  if (includesAnyKeyword(text, instagramKeywords)) {
    return "Instagram";
  }

  if (includesAnyKeyword(text, aiKeywords)) {
    return "AI";
  }

  return "Support";
}

function getPriority(text: string) {
  if (includesAnyKeyword(text, urgentKeywords)) {
    return "High";
  }

  if (includesAnyKeyword(text, supportKeywords)) {
    return "Medium";
  }

  return "Low";
}

function getPriorityTone(priority: string): SupportTone {
  const normalizedPriority = priority.toLowerCase();

  if (normalizedPriority.includes("high") || normalizedPriority.includes("urgent")) {
    return "red";
  }

  if (normalizedPriority.includes("medium") || normalizedPriority.includes("review")) {
    return "amber";
  }

  return "purple";
}

function getStatusTone(status: string, fallback: SupportTone = "purple"): SupportTone {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus.includes("resolved") || normalizedStatus.includes("closed") || normalizedStatus.includes("handled")) {
    return "green";
  }

  if (normalizedStatus.includes("open") || normalizedStatus.includes("urgent") || normalizedStatus.includes("failed")) {
    return "red";
  }

  if (normalizedStatus.includes("progress") || normalizedStatus.includes("review") || normalizedStatus.includes("watch")) {
    return "amber";
  }

  return fallback;
}

function previewText(text: string, fallback: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized ? `${normalized.slice(0, 58)}${normalized.length > 58 ? "..." : ""}` : fallback;
}

function isClosedStatus(status: string) {
  const normalizedStatus = status.toLowerCase();
  return normalizedStatus.includes("resolved") || normalizedStatus.includes("closed") || normalizedStatus.includes("handled");
}

function isInProgressStatus(status: string) {
  const normalizedStatus = status.toLowerCase();
  return normalizedStatus.includes("progress") || normalizedStatus.includes("review") || normalizedStatus.includes("watch");
}

function isToday(timestamp: number) {
  if (!timestamp) {
    return false;
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return timestamp >= startOfDay.getTime();
}

function getAverageLabel(values: number[], suffix: string) {
  const usableValues = values.filter((value) => value > 0);

  if (usableValues.length === 0) {
    return "Not tracked";
  }

  const average = Math.round(usableValues.reduce((sum, value) => sum + value, 0) / usableValues.length);
  return `${average}${suffix}`;
}

async function listAllUsers(supabase: SupabaseClient) {
  const users: User[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw error;
    }

    users.push(...(data.users || []));

    if (!data.users || data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

async function getOptionalRows(supabase: SupabaseClient, tableNames: string[]) {
  let lastError = "";

  for (const tableName of tableNames) {
    const { data, error } = await supabase.from(tableName).select("*").limit(100);

    if (!error) {
      return {
        rows: ((data || []) as AnyRow[]).sort((first, second) => {
          const firstTime = getRowTimestamp(first, ["updated_at", "created_at", "timestamp"]);
          const secondTime = getRowTimestamp(second, ["updated_at", "created_at", "timestamp"]);
          return secondTime - firstTime;
        }),
        tableName,
        error: "",
      };
    }

    lastError = error.message;
  }

  return { rows: [] as AnyRow[], tableName: "", error: lastError };
}

async function getStoredMessages(supabase: SupabaseClient) {
  const { data, error, count } = await supabase
    .from("messages")
    .select("*", { count: "exact" })
    .order("timestamp", { ascending: false })
    .limit(500);

  if (error) {
    return {
      rows: [] as StoredMessageRow[],
      count: 0,
      available: false,
      error: error.message,
    };
  }

  return {
    rows: (data || []) as StoredMessageRow[],
    count: count || 0,
    available: true,
    error: "",
  };
}

function normalizeTicketRow(row: AnyRow, index: number): SupportTicketAdminRow {
  const name = getString(row, ["title", "subject", "name", "summary", "message", "text"]) || `Support ticket ${index + 1}`;
  const detail = getString(row, ["creator_name", "customer_name", "account_name", "email", "creator_email", "user_email"]) || "Support record";
  const topic = getString(row, ["topic", "category", "type"]) || getTopic(name);
  const priority = getString(row, ["priority", "severity", "impact"]) || getPriority(`${name} ${topic}`);
  const status = getString(row, ["status", "state"]) || "Open";
  const assignee = getString(row, ["assignee", "owner", "team"]) || (topic === "AI" ? "AI" : topic === "Billing" ? "Billing" : "Support");
  const timestamp = getRowTimestamp(row, ["updated_at", "created_at", "timestamp", "opened_at"]);

  return {
    id: getString(row, ["id", "ticket_id", "mid"]) || `ticket-${index}`,
    name: previewText(name, `Support ticket ${index + 1}`),
    detail,
    priority,
    topic,
    age: formatAge(timestamp),
    assignee,
    sla: getString(row, ["sla", "sla_status"]) || (priority.toLowerCase().includes("high") ? "Needs review" : "On track"),
    status,
    tone: getStatusTone(status, getPriorityTone(priority)),
  };
}

function createTicketFromMessage(message: StoredMessageRow, index: number): SupportTicketAdminRow {
  const text = message.text || "";
  const topic = getTopic(text);
  const priority = getPriority(text);
  const timestamp = getTimestamp(message.timestamp);

  return {
    id: message.mid || message.id || `message-ticket-${index}`,
    name: previewText(text, `Support signal ${index + 1}`),
    detail: message.sender_id ? `Instagram sender ${message.sender_id}` : "Stored Instagram message",
    priority,
    topic,
    age: formatAge(timestamp),
    assignee: topic === "AI" ? "AI" : topic === "Billing" ? "Billing" : topic === "Instagram" ? "Platform" : "Support",
    sla: priority === "High" ? "Needs review" : "On track",
    status: "Open signal",
    tone: getPriorityTone(priority),
  };
}

function normalizeIssueRow(row: AnyRow, index: number): SupportIssueAdminRow {
  const name = getString(row, ["title", "name", "summary", "issue", "message", "text"]) || `Creator issue ${index + 1}`;
  const detail = getString(row, ["detail", "description", "creator_name", "account_name", "email", "creator_email"]) || "Creator issue record";
  const category = getString(row, ["category", "type", "area"]) || getTopic(`${name} ${detail}`);
  const impact = getString(row, ["impact", "priority", "severity"]) || getPriority(`${name} ${detail}`);
  const owner = getString(row, ["owner", "team", "assignee"]) || (category === "AI" ? "AI" : category === "Billing" ? "Billing" : "Support");
  const status = getString(row, ["status", "state"]) || "Open";
  const timestamp = getRowTimestamp(row, ["updated_at", "created_at", "timestamp", "reported_at"]);

  return {
    id: getString(row, ["id", "issue_id", "mid"]) || `issue-${index}`,
    name: previewText(name, `Creator issue ${index + 1}`),
    detail,
    category,
    impact,
    age: formatAge(timestamp),
    owner,
    nextStep: getString(row, ["next_step", "nextStep", "action"]) || (isClosedStatus(status) ? "Monitor" : "Review"),
    status,
    tone: getStatusTone(status, getPriorityTone(impact)),
  };
}

function getCreatorIssues(users: User[]) {
  const issues: SupportIssueAdminRow[] = [];

  users.forEach((user) => {
    const metadata = getMetadata(user);
    const name = getUserName(user);
    const detail = user.email || "Creator account";
    const updatedAt = getTimestamp(user.updated_at || user.last_sign_in_at || user.created_at);
    const aiIntegration = normalizeAiIntegrationMetadata(metadata);
    const status = getMetadataString(metadata, "status").toLowerCase();
    const riskSignal = getMetadataString(metadata, "risk_signal") || getMetadataString(metadata, "churn_signal");
    const paymentFailed = getMetadataBoolean(metadata, "payment_failed") || getMetadataString(metadata, "payment_status").toLowerCase().includes("failed");
    const issueCount = getMetadataNumber(metadata, ["support_issue_count", "issues", "ticket_count"]);

    if (riskSignal) {
      issues.push({
        id: `${user.id}-risk`,
        name: riskSignal,
        detail,
        category: riskSignal.toLowerCase().includes("payment") ? "Billing" : "Success",
        impact: riskSignal.toLowerCase().includes("failed") ? "High" : "Medium",
        age: formatAge(updatedAt),
        owner: getMetadataString(metadata, "owner") || "Success",
        nextStep: "Review creator account",
        status: "Watch",
        tone: "amber",
      });
    }

    if (paymentFailed) {
      issues.push({
        id: `${user.id}-payment`,
        name: `${name} payment needs attention`,
        detail,
        category: "Billing",
        impact: "High",
        age: formatAge(updatedAt),
        owner: "Billing",
        nextStep: "Retry payment",
        status: "Open",
        tone: "red",
      });
    }

    if (!aiIntegration.apiKeySaved) {
      issues.push({
        id: `${user.id}-ai`,
        name: `${name} has no OpenAI key saved`,
        detail,
        category: "AI",
        impact: "Medium",
        age: formatAge(updatedAt),
        owner: "AI",
        nextStep: "Save OpenAI key",
        status: "Setup",
        tone: "amber",
      });
    }

    if (status.includes("inactive") || status.includes("suspend") || issueCount > 0) {
      issues.push({
        id: `${user.id}-account`,
        name: `${name} account needs follow-up`,
        detail,
        category: "Success",
        impact: issueCount > 0 ? "Medium" : "Low",
        age: formatAge(updatedAt),
        owner: getMetadataString(metadata, "owner") || "Success",
        nextStep: "Contact creator",
        status: status.includes("suspend") ? "Open" : "Watch",
        tone: status.includes("suspend") ? "red" : "amber",
      });
    }
  });

  if (!process.env.OPENAI_API_KEY) {
    issues.push({
      id: "env-openai",
      name: "OpenAI platform key missing",
      detail: "OPENAI_API_KEY is not configured",
      category: "AI",
      impact: "High",
      age: "Current",
      owner: "AI",
      nextStep: "Add env key",
      status: "Open",
      tone: "red",
    });
  }

  if (!process.env.META_VERIFY_TOKEN) {
    issues.push({
      id: "env-meta",
      name: "Meta webhook verify token missing",
      detail: "META_VERIFY_TOKEN is not configured",
      category: "Platform",
      impact: "High",
      age: "Current",
      owner: "Platform",
      nextStep: "Add webhook env",
      status: "Open",
      tone: "red",
    });
  }

  if (!process.env.RESEND_API_KEY && !process.env.SMTP_HOST) {
    issues.push({
      id: "env-email",
      name: "Email provider is not configured",
      detail: "RESEND_API_KEY or SMTP_HOST is missing",
      category: "Support",
      impact: "Medium",
      age: "Current",
      owner: "Support",
      nextStep: "Configure email",
      status: "Review",
      tone: "amber",
    });
  }

  return issues.slice(0, 50);
}

export async function GET() {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError) {
      throw authError;
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!isSuperAdminUser(user)) {
      return NextResponse.json({ error: "Only superadmins can view support data." }, { status: 403 });
    }

    const supabase = createSupabaseServiceClient();
    const [users, ticketResult, issueResult, messageResult] = await Promise.all([
      listAllUsers(supabase),
      getOptionalRows(supabase, ["support_tickets", "tickets"]),
      getOptionalRows(supabase, ["creator_issues", "support_issues", "issues"]),
      getStoredMessages(supabase),
    ]);
    const creators = users.filter(isCreatorUser);
    const supportMessages = messageResult.rows.filter((message) => includesAnyKeyword(message.text || "", supportKeywords));
    const tickets = ticketResult.rows.length > 0
      ? ticketResult.rows.map(normalizeTicketRow)
      : supportMessages.slice(0, 25).map(createTicketFromMessage);
    const metadataIssues = getCreatorIssues(creators);
    const issues = issueResult.rows.length > 0
      ? issueResult.rows.map(normalizeIssueRow)
      : metadataIssues;
    const openTickets = tickets.filter((ticket) => !isClosedStatus(ticket.status)).length;
    const inProgressTickets = tickets.filter((ticket) => isInProgressStatus(ticket.status)).length;
    const resolvedToday = ticketResult.rows
      .filter((row) => isClosedStatus(getString(row, ["status", "state"])))
      .filter((row) => isToday(getRowTimestamp(row, ["updated_at", "resolved_at", "closed_at"]))).length;
    const openIssues = issues.filter((issue) => !isClosedStatus(issue.status)).length;
    const productIssues = issues.filter((issue) => ["Platform", "AI", "Product"].includes(issue.category)).length;
    const onboardingIssues = issues.filter((issue) => ["Onboarding", "Setup", "Instagram"].includes(issue.category) || issue.nextStep.toLowerCase().includes("configure")).length;
    const resolvedIssuesToday = issueResult.rows
      .filter((row) => isClosedStatus(getString(row, ["status", "state"])))
      .filter((row) => isToday(getRowTimestamp(row, ["updated_at", "resolved_at", "closed_at"]))).length;
    const responseTimes = ticketResult.rows.map((row) => getRowNumber(row, ["response_minutes", "avg_response_minutes", "response_time_minutes"]));
    const firstResponseTimes = ticketResult.rows.map((row) => getRowNumber(row, ["first_response_minutes", "first_response_time_minutes"]));
    const satisfactionScores = ticketResult.rows
      .map((row) => getRowNumber(row, ["satisfaction", "satisfaction_score", "csat"]))
      .filter((score) => score > 0);
    const satisfaction = satisfactionScores.length > 0
      ? `${(satisfactionScores.reduce((sum, score) => sum + score, 0) / satisfactionScores.length).toFixed(1)}/5`
      : "Not tracked";

    return NextResponse.json({
      metrics: {
        openTickets,
        inProgressTickets,
        resolvedToday,
        satisfaction,
        creatorIssues: openIssues,
        productIssues,
        onboardingIssues,
        resolvedIssuesToday,
        supportSignals: supportMessages.length,
        messageRows: messageResult.count,
        ticketTableAvailable: ticketResult.rows.length > 0,
        ticketTableName: ticketResult.tableName,
        ticketTableError: ticketResult.error,
        issueTableAvailable: issueResult.rows.length > 0,
        issueTableName: issueResult.tableName,
        issueTableError: issueResult.error,
        messagesTableAvailable: messageResult.available,
        messagesTableError: messageResult.error,
        avgResponse: getAverageLabel(responseTimes, "m"),
        firstResponse: getAverageLabel(firstResponseTimes, "m"),
        platformBlockers: issues.filter((issue) => ["Platform", "AI"].includes(issue.category)).length,
        successFollowUp: issues.filter((issue) => ["Success", "Support", "Billing"].includes(issue.category)).length,
      },
      tickets,
      issues,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load support data";
    console.error("Admin support data error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
