import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getUserPermissionProfile } from "@/lib/agent-permissions";
import { resolvePlatformAiConfig } from "@/lib/platform-ai-config";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type InstagramAccountRow = {
  ig_user_id: string;
  access_token: string;
  created_at?: string | null;
};

type InstagramProfile = {
  id: string;
  username?: string;
  name?: string;
  healthy: boolean;
  connectedAt?: string | null;
  conversationCount: number;
  messageCount: number;
  lastActiveAt?: string | null;
  error?: string;
};

type AdminConnectedAccountRow = {
  id: string;
  name: string;
  detail: string;
  plan: string;
  instagram: string;
  lastActive: string;
  conversations: string;
  messages: string;
  opportunities: string;
  revenue: string;
  status: string;
  statusTone: "green" | "amber" | "red" | "purple";
  createdAt?: string | null;
  lastActiveAt?: string | null;
  accountStatus?: "active" | "trial" | "inactive" | "cancelled";
  owner?: string;
  revenueAmount?: number;
  opportunityCount?: number;
  riskLevel?: "High" | "Medium" | "Low";
  riskSignal?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  invoiceId?: string;
  billingDate?: string | null;
  refundAmount?: number;
  refundReason?: string;
  refundStatus?: string;
  source: "creator" | "instagram";
};

const TOKEN_HEALTH_DAYS = 45;
const OVERVIEW_SERIES_DAYS = 20;

function getMetadata(user: User) {
  return (user.user_metadata || {}) as Record<string, unknown>;
}

function getMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value.trim() : "";
}

function getMetadataBoolean(metadata: Record<string, unknown>, key: string) {
  return metadata[key] === true || metadata[key] === "true";
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
  const metadata = getMetadata(user);
  const permissions = getUserPermissionProfile(metadata);

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

function getUserPlan(user: User) {
  const metadata = getMetadata(user);
  const plan = getMetadataString(metadata, "subscription_plan") || getMetadataString(metadata, "plan");
  const role = getMetadataString(metadata, "role");
  return plan || (role && role.toLowerCase() !== "creator" ? role : "Creator");
}

function getUserRevenue(user: User) {
  const amount = getUserRevenueAmount(user);

  return `$${amount.toLocaleString()}`;
}

function getNumericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function getUserRevenueAmount(user: User) {
  const metadata = getMetadata(user);
  const value = metadata.revenue || metadata.mrr || metadata.monthly_revenue;
  return getNumericValue(value);
}

function getCreatorPaymentStatus(user: User) {
  const metadata = getMetadata(user);
  const paymentStatus = getMetadataString(metadata, "payment_status");
  const billingStatus = getMetadataString(metadata, "billing_status");
  const accountStatus = getCreatorStatusCategory(user);

  if (paymentStatus) {
    return paymentStatus;
  }

  if (billingStatus) {
    return billingStatus;
  }

  if (getUserRevenueAmount(user) > 0 || isPaidCreator(user)) {
    return "paid";
  }

  if (accountStatus === "trial") {
    return "trial";
  }

  return "unpaid";
}

function getCreatorPaymentMethod(user: User) {
  const metadata = getMetadata(user);

  if (getUserRevenueAmount(user) <= 0 && getCreatorPaymentStatus(user).toLowerCase() !== "paid") {
    return "None";
  }

  return getMetadataString(metadata, "payment_method") || "App checkout";
}

function getCreatorInvoiceId(user: User) {
  const metadata = getMetadata(user);
  const invoiceId = getMetadataString(metadata, "invoice_id");

  if (invoiceId) {
    return invoiceId;
  }

  if (getUserRevenueAmount(user) <= 0 && getCreatorPaymentStatus(user).toLowerCase() !== "paid") {
    return "";
  }

  return `INV-${user.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function getCreatorBillingDate(user: User) {
  const metadata = getMetadata(user);
  return (
    getMetadataString(metadata, "billing_date") ||
    getMetadataString(metadata, "current_period_start") ||
    getMetadataString(metadata, "last_checkout_at") ||
    user.updated_at ||
    user.created_at ||
    null
  );
}

function getCreatorRefundAmount(user: User) {
  const metadata = getMetadata(user);
  return getNumericValue(metadata.refund_amount || metadata.refund || metadata.refunds);
}

function getCreatorRefundReason(user: User) {
  const metadata = getMetadata(user);
  return getMetadataString(metadata, "refund_reason") || getMetadataString(metadata, "dispute_reason");
}

function getCreatorRefundStatus(user: User) {
  const metadata = getMetadata(user);
  const refundStatus = getMetadataString(metadata, "refund_status") || getMetadataString(metadata, "dispute_status");
  return refundStatus || (getCreatorRefundAmount(user) > 0 ? "Open" : "");
}

function getUserOpportunityCount(user: User) {
  const metadata = getMetadata(user);
  return getNumericValue(metadata.opportunities || metadata.opportunity_count || metadata.revenue_opportunities);
}

function getAgeDays(value?: string | null) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return Number.POSITIVE_INFINITY;
  }

  return (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
}

function isTokenHealthy(account: InstagramAccountRow) {
  return Boolean(account.access_token) && getAgeDays(account.created_at) < TOKEN_HEALTH_DAYS;
}

function getCreatorStatusCategory(user: User) {
  const metadata = getMetadata(user);
  const status = getMetadataString(metadata, "status").toLowerCase();
  const plan = getUserPlan(user).toLowerCase();

  if (status.includes("cancel")) {
    return "cancelled";
  }

  if (status.includes("inactive") || status.includes("suspend") || status.includes("disabled")) {
    return "inactive";
  }

  if (status.includes("trial") || plan.includes("trial")) {
    return "trial";
  }

  return "active";
}

function isPaidCreator(user: User) {
  const plan = getUserPlan(user).toLowerCase();
  return getUserRevenueAmount(user) > 0 || plan.includes("pro") || plan.includes("founder") || plan.includes("paid");
}

function getCreatorOwner(user: User) {
  const metadata = getMetadata(user);
  return getMetadataString(metadata, "owner") || getMetadataString(metadata, "account_owner") || "Success";
}

function getCreatorRiskSignal({
  user,
  connected,
  healthy,
  lastActiveAt,
}: {
  user: User;
  connected: boolean;
  healthy: boolean;
  lastActiveAt?: string | null;
}) {
  const metadata = getMetadata(user);
  const status = getMetadataString(metadata, "status").toLowerCase();
  const paymentStatus = getMetadataString(metadata, "payment_status").toLowerCase();
  const riskSignal = getMetadataString(metadata, "risk_signal") || getMetadataString(metadata, "churn_signal");
  const inactiveDays = getAgeDays(lastActiveAt || user.last_sign_in_at || user.created_at);

  if (riskSignal) {
    return riskSignal;
  }

  if (getMetadataBoolean(metadata, "payment_failed") || paymentStatus.includes("failed")) {
    return "Failed payment";
  }

  if (status.includes("cancel")) {
    return "Cancelled";
  }

  if (!connected) {
    return "Instagram disconnected";
  }

  if (!healthy) {
    return "Token needs reconnect";
  }

  if (inactiveDays > 14) {
    return "No activity in 14 days";
  }

  if (inactiveDays > 7) {
    return "Low usage";
  }

  return "Healthy";
}

function getCreatorRiskLevel(signal: string) {
  const normalizedSignal = signal.toLowerCase();

  if (
    normalizedSignal.includes("failed") ||
    normalizedSignal.includes("cancel") ||
    normalizedSignal.includes("disconnected") ||
    normalizedSignal.includes("14")
  ) {
    return "High";
  }

  if (normalizedSignal.includes("low") || normalizedSignal.includes("reconnect") || normalizedSignal.includes("inactive")) {
    return "Medium";
  }

  return "Low";
}

function formatRelativeTime(value?: string | null) {
  if (!value) {
    return "No activity";
  }

  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return "No activity";
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function getDayStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getOverviewSeries(users: User[]) {
  const today = getDayStart(new Date());
  const signupSeries: number[] = [];
  const mrrSeries: number[] = [];

  for (let index = OVERVIEW_SERIES_DAYS - 1; index >= 0; index -= 1) {
    const dayStart = new Date(today);
    dayStart.setDate(today.getDate() - index);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);

    signupSeries.push(
      users.filter((user) => {
        const createdAt = user.created_at ? new Date(user.created_at).getTime() : Number.NaN;
        return Number.isFinite(createdAt) && createdAt >= dayStart.getTime() && createdAt < dayEnd.getTime();
      }).length
    );

    mrrSeries.push(
      users.reduce((sum, user) => {
        const createdAt = user.created_at ? new Date(user.created_at).getTime() : Number.NaN;
        return Number.isFinite(createdAt) && createdAt <= dayEnd.getTime() ? sum + getUserRevenueAmount(user) : sum;
      }, 0)
    );
  }

  return { signupSeries, mrrSeries };
}

async function listAllUsers(supabase: SupabaseClient) {
  const users: User[] = [];

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw error;
    }

    const batch = data.users || [];
    users.push(...batch);

    if (batch.length < 200) {
      break;
    }
  }

  return users;
}

async function fetchInstagramProfile(account: InstagramAccountRow): Promise<InstagramProfile> {
  const fallbackProfile: InstagramProfile = {
    id: account.ig_user_id,
    healthy: isTokenHealthy(account),
    connectedAt: account.created_at,
    conversationCount: 0,
    messageCount: 0,
    lastActiveAt: account.created_at,
  };

  if (!account.access_token) {
    return {
      ...fallbackProfile,
      healthy: false,
      error: "Missing Instagram token",
    };
  }

  try {
    const meUrl = new URL("https://graph.instagram.com/v21.0/me");
    meUrl.searchParams.set("fields", "id,username,name");
    meUrl.searchParams.set("access_token", account.access_token);

    const meResponse = await fetch(meUrl.toString(), { cache: "no-store" });
    const meData = (await meResponse.json()) as {
      id?: string;
      username?: string;
      name?: string;
      error?: { message?: string };
    };

    if (!meResponse.ok || meData.error) {
      throw new Error(meData.error?.message || "Could not verify Instagram token");
    }

    let conversationCount = 0;
    let messageCount = 0;
    let lastActiveAt = account.created_at || null;

    try {
      const conversationsUrl = new URL("https://graph.instagram.com/v21.0/me/conversations");
      conversationsUrl.searchParams.set("platform", "instagram");
      conversationsUrl.searchParams.set("fields", "id,updated_time,message_count");
      conversationsUrl.searchParams.set("limit", "50");
      conversationsUrl.searchParams.set("access_token", account.access_token);

      const conversationsResponse = await fetch(conversationsUrl.toString(), { cache: "no-store" });
      const conversationsData = (await conversationsResponse.json()) as {
        data?: { id?: string; updated_time?: string; message_count?: number }[];
      };
      const conversations = conversationsData.data || [];
      conversationCount = conversations.length;
      messageCount = conversations.reduce((sum, conversation) => sum + (conversation.message_count || 0), 0);
      lastActiveAt = conversations
        .map((conversation) => conversation.updated_time)
        .filter((value): value is string => Boolean(value))
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || lastActiveAt;
    } catch (error) {
      console.error("Admin Instagram conversations summary error:", error);
    }

    return {
      ...fallbackProfile,
      id: meData.id || account.ig_user_id,
      username: meData.username,
      name: meData.name,
      conversationCount,
      messageCount,
      lastActiveAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load Instagram account";
    return {
      ...fallbackProfile,
      healthy: false,
      error: message,
    };
  }
}

function createRowFromCreator(user: User, instagramProfile: InstagramProfile | undefined): AdminConnectedAccountRow {
  const connected = Boolean(instagramProfile && !instagramProfile.error);
  const healthy = Boolean(instagramProfile?.healthy && connected);
  const userName = getUserName(user);
  const metadata = getMetadata(user);
  const userStatus = getMetadataString(metadata, "status");
  const lastActiveAt = instagramProfile?.lastActiveAt || user.last_sign_in_at || user.created_at;
  const riskSignal = getCreatorRiskSignal({ user, connected, healthy, lastActiveAt });
  const status = connected ? (healthy ? "Active" : "Reconnect") : userStatus || "Not connected";

  return {
    id: user.id,
    name: instagramProfile?.name || userName,
    detail: instagramProfile?.username ? `@${instagramProfile.username}` : user.email || "No email",
    plan: getUserPlan(user),
    instagram: connected ? "Connected" : "Not connected",
    lastActive: formatRelativeTime(instagramProfile?.lastActiveAt || user.last_sign_in_at || user.created_at),
    conversations: String(instagramProfile?.conversationCount || 0),
    messages: String(instagramProfile?.messageCount || 0),
    opportunities: String(getUserOpportunityCount(user)),
    revenue: getUserRevenue(user),
    status,
    statusTone: connected ? (healthy ? "green" : "amber") : "red",
    createdAt: user.created_at,
    lastActiveAt,
    accountStatus: getCreatorStatusCategory(user),
    owner: getCreatorOwner(user),
    revenueAmount: getUserRevenueAmount(user),
    opportunityCount: getUserOpportunityCount(user),
    riskLevel: getCreatorRiskLevel(riskSignal),
    riskSignal,
    paymentStatus: getCreatorPaymentStatus(user),
    paymentMethod: getCreatorPaymentMethod(user),
    invoiceId: getCreatorInvoiceId(user),
    billingDate: getCreatorBillingDate(user),
    refundAmount: getCreatorRefundAmount(user),
    refundReason: getCreatorRefundReason(user),
    refundStatus: getCreatorRefundStatus(user),
    source: "creator",
  };
}

function createRowFromInstagramProfile(profile: InstagramProfile): AdminConnectedAccountRow {
  const healthy = profile.healthy && !profile.error;

  return {
    id: `instagram-${profile.id}`,
    name: profile.name || profile.username || "Instagram account",
    detail: profile.username ? `@${profile.username}` : profile.id,
    plan: "Creator",
    instagram: profile.error ? "Reconnect required" : "Connected",
    lastActive: formatRelativeTime(profile.lastActiveAt),
    conversations: String(profile.conversationCount),
    messages: String(profile.messageCount),
    opportunities: "0",
    revenue: "$0",
    status: healthy ? "Active" : "Reconnect",
    statusTone: healthy ? "green" : "amber",
    createdAt: profile.connectedAt,
    lastActiveAt: profile.lastActiveAt,
    source: "instagram",
  };
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
      return NextResponse.json({ error: "Only superadmins can view connected accounts." }, { status: 403 });
    }

    const supabase = createSupabaseServiceClient();
    const [users, instagramResult, platformConfig] = await Promise.all([
      listAllUsers(supabase),
      supabase
        .from("instagram_accounts")
        .select("ig_user_id, access_token, created_at")
        .order("created_at", { ascending: false }),
      resolvePlatformAiConfig(supabase),
    ]);

    if (instagramResult.error) {
      throw instagramResult.error;
    }

    const creatorUsers = users.filter(isCreatorUser);
    const instagramAccounts = ((instagramResult.data || []) as InstagramAccountRow[]).filter((account) => account.ig_user_id);
    const instagramProfiles = await Promise.all(instagramAccounts.map(fetchInstagramProfile));
    const connectedProfiles = instagramProfiles.filter((profile) => !profile.error);
    const healthyProfiles = connectedProfiles.filter((profile) => profile.healthy);
    const reconnectProfiles = instagramProfiles.filter((profile) => profile.error || !profile.healthy);
    const pairedCreatorCount = Math.min(creatorUsers.length, instagramProfiles.length);
    const creatorRows = creatorUsers.map((creator, index) => createRowFromCreator(creator, instagramProfiles[index]));
    const instagramOnlyRows = instagramProfiles.slice(pairedCreatorCount).map(createRowFromInstagramProfile);
    const rows = [...creatorRows, ...instagramOnlyRows].sort((first, second) => {
      const firstTime = new Date(first.lastActiveAt || first.createdAt || 0).getTime();
      const secondTime = new Date(second.lastActiveAt || second.createdAt || 0).getTime();
      return secondTime - firstTime;
    });
    const disconnected = Math.max(0, creatorUsers.length - connectedProfiles.length);
    const totalMessages = instagramProfiles.reduce((sum, profile) => sum + profile.messageCount, 0);
    const totalConversations = instagramProfiles.reduce((sum, profile) => sum + profile.conversationCount, 0);
    const totalOpportunities = creatorUsers.reduce((sum, creator) => sum + getUserOpportunityCount(creator), 0);
    const mrr = creatorUsers.reduce((sum, creator) => sum + getUserRevenueAmount(creator), 0);
    const newSignups = creatorUsers.filter((creator) => getAgeDays(creator.created_at) <= 30).length;
    const statusBreakdown = creatorUsers.reduce(
      (breakdown, creator) => {
        const category = getCreatorStatusCategory(creator);
        breakdown[category] += 1;
        return breakdown;
      },
      { active: 0, trial: 0, inactive: 0, cancelled: 0 }
    );
    const activeCreators = creatorUsers.filter((creator, index) => {
      const category = getCreatorStatusCategory(creator);
      return category === "active" && (getAgeDays(creator.last_sign_in_at || creator.created_at) <= 30 || Boolean(instagramProfiles[index]));
    }).length;
    const paidAccounts = creatorUsers.filter(isPaidCreator).length;
    const { signupSeries, mrrSeries } = getOverviewSeries(creatorUsers);
    const platformHealth = [
      {
        label: "Instagram API",
        status: connectedProfiles.length === 0 ? "No accounts" : reconnectProfiles.length > 0 ? "Warning" : "Healthy",
        tone: connectedProfiles.length > 0 && reconnectProfiles.length === 0 ? "green" : "amber",
      },
      {
        label: "OpenAI API",
        status: platformConfig.apiKey ? "Healthy" : "Not configured",
        tone: platformConfig.apiKey ? "green" : "amber",
      },
      { label: "Database", status: "Healthy", tone: "green" },
      {
        label: "Webhook Queue",
        status: process.env.META_VERIFY_TOKEN ? "Configured" : "Not configured",
        tone: process.env.META_VERIFY_TOKEN ? "green" : "amber",
      },
      {
        label: "Email Service",
        status: process.env.RESEND_API_KEY || process.env.SMTP_HOST ? "Configured" : "Not configured",
        tone: process.env.RESEND_API_KEY || process.env.SMTP_HOST ? "green" : "amber",
      },
      { label: "Payment Service", status: paidAccounts > 0 ? "Active" : "No paid accounts", tone: paidAccounts > 0 ? "green" : "amber" },
    ];

    return NextResponse.json({
      metrics: {
        totalConnected: connectedProfiles.length,
        healthyTokens: healthyProfiles.length,
        expiredTokens: reconnectProfiles.length,
        disconnected,
        reconnectRequired: reconnectProfiles.length + disconnected,
        automationReady: healthyProfiles.length,
        creatorAccounts: creatorUsers.length,
        totalMessages,
        totalConversations,
        totalOpportunities,
        activeCreators,
        trialAccounts: statusBreakdown.trial,
        paidAccounts,
        mrr,
        arr: mrr * 12,
        newSignups,
        statusBreakdown,
        signupSeries,
        mrrSeries,
        platformHealth,
      },
      rows,
      health: {
        reconnectRequired: reconnectProfiles.length + disconnected,
        automationReady: healthyProfiles.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load connected accounts";
    console.error("Admin connected accounts error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
