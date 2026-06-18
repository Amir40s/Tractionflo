"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  Check,
  CircleDollarSign,
  CircleHelp,
  Clock,
  Code2,
  CreditCard,
  Crown,
  Database,
  DollarSign,
  Flame,
  Globe2,
  GraduationCap,
  Handshake,
  Heart,
  Mail,
  MessageSquare,
  Play,
  RefreshCw,
  Search,
  Send,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Star,
  Target,
  TriangleAlert,
  TrendingUp,
  User,
} from "lucide-react";
import { SettingsSelect } from "../SettingsPage";
import type { PricingPlan, PricingResponse } from "../settings-state";
import {
  formatAdminCurrency,
  formatAdminMoneyPrecise,
  formatAdminNumber,
  formatAdminPercent,
  formatAdminTokenVolume,
  formatAdminTrackedSpend,
  readDashboardJsonResponse,
  statusToneClasses,
  SuperAdminMetricCard,
  SuperAdminTable,
  type SuperAdminDetailConfig,
  type SuperAdminMetric,
  type SuperAdminTableRow,
} from "../admin/shared";
import { superAdminDetailConfigs, superAdminPageMeta } from "./config";
import type {
  AiAdminPage,
  PlatformAdminPage,
  RevenueAdminPage,
  SuperAdminAiResponse,
  SuperAdminConnectedAccountApiRow,
  SuperAdminConnectedAccountsResponse,
  SuperAdminPage,
  SuperAdminPlatformResponse,
  SuperAdminSupportResponse,
  SupportAdminPage,
} from "./types";

function SuperAdminConnectedAccountsPage({ refreshKey = 0 }: { refreshKey?: number }) {
  const [data, setData] = useState<SuperAdminConnectedAccountsResponse | null>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchConnectedAccounts = useCallback(async () => {
    const response = await fetch("/api/admin/connected-accounts", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    return readDashboardJsonResponse<SuperAdminConnectedAccountsResponse>(response, "Could not load connected accounts");
  }, []);

  const loadConnectedAccounts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const nextData = await fetchConnectedAccounts();
      setData(nextData);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load connected accounts");
    } finally {
      setIsLoading(false);
    }
  }, [fetchConnectedAccounts]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialConnectedAccounts() {
      try {
        const nextData = await fetchConnectedAccounts();

        if (isMounted) {
          setData(nextData);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load connected accounts");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialConnectedAccounts();

    return () => {
      isMounted = false;
    };
  }, [fetchConnectedAccounts, refreshKey]);

  const metrics = data?.metrics;
  const rows = data?.rows || [];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRows = rows.filter((row) => {
    if (!normalizedQuery) {
      return true;
    }

    return [row.name, row.detail, row.plan, row.instagram, row.status]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
  const numberFormatter = new Intl.NumberFormat("en-US");
  const metricCards: SuperAdminMetric[] = [
    {
      label: "Total connected",
      value: isLoading && !metrics ? "..." : numberFormatter.format(metrics?.totalConnected || 0),
      detail: "Instagram accounts",
      change: `${numberFormatter.format(metrics?.creatorAccounts || 0)} creator accounts`,
      tone: "bg-[#f0edff] text-[#4b3cff]",
      icon: Globe2,
    },
    {
      label: "Healthy tokens",
      value: isLoading && !metrics ? "..." : numberFormatter.format(metrics?.healthyTokens || 0),
      detail: "Ready for automation",
      change: `${numberFormatter.format(metrics?.automationReady || 0)} automation ready`,
      tone: "bg-[#eafaf0] text-[#13a84f]",
      icon: Check,
    },
    {
      label: "Expired tokens",
      value: isLoading && !metrics ? "..." : numberFormatter.format(metrics?.expiredTokens || 0),
      detail: "Need reconnect",
      change: `${numberFormatter.format(metrics?.reconnectRequired || 0)} total issues`,
      tone: "bg-[#fff4df] text-[#c07800]",
      icon: Clock,
    },
    {
      label: "Disconnected",
      value: isLoading && !metrics ? "..." : numberFormatter.format(metrics?.disconnected || 0),
      detail: "No active Instagram link",
      change: `${numberFormatter.format(metrics?.totalMessages || 0)} tracked messages`,
      tone: "bg-[#fff0f3] text-[#df405b]",
      icon: TriangleAlert,
    },
  ];
  const tableConfig: SuperAdminDetailConfig = {
    metrics: [],
    columns: ["Plan", "Instagram", "Last active", "Messages", "Revenue"],
    rows: filteredRows.map((row) => ({
      name: row.name,
      detail: row.detail,
      values: [row.plan, row.instagram, row.lastActive, row.messages, row.revenue],
      status: row.status,
      statusTone: row.statusTone,
    })),
    insightTitle: "Account health",
    insightItems: [],
  };
  const reconnectRequired = data?.health?.reconnectRequired || 0;
  const automationReady = data?.health?.automationReady || 0;

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <SuperAdminMetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <article className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[15px] font-extrabold text-black">Connected Accounts activity</h2>
              <p className="mt-1 text-[11px] font-semibold text-[#687089]">
                Real creator accounts and Instagram token status from Supabase.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex h-9 items-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold">
                <Search size={14} strokeWidth={2.4} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                  className="w-full min-w-0 bg-transparent text-[12px] font-bold outline-none placeholder:text-[#687089] sm:w-28"
                />
              </label>
              <button
                type="button"
                onClick={() => void loadConnectedAccounts()}
                disabled={isLoading}
                className="flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={14} strokeWidth={2.4} className={isLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-[8px] border border-[#ffd2da] bg-[#fff6f8] p-4 text-[12px] font-bold text-[#df405b]">
              {errorMessage}
            </div>
          ) : tableConfig.rows.length > 0 ? (
            <SuperAdminTable config={tableConfig} />
          ) : (
            <div className="rounded-[8px] border border-dashed border-[#d9deea] p-8 text-center">
              <p className="text-[13px] font-extrabold text-black">
                {isLoading ? "Loading real accounts..." : "No connected creator accounts found yet."}
              </p>
              <p className="mt-2 text-[12px] font-semibold text-[#687089]">
                {isLoading
                  ? "Checking Supabase Auth and Instagram token records."
                  : "Connect Instagram or create creator accounts to populate this table."}
              </p>
            </div>
          )}
        </article>

        <aside className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <h2 className="text-[15px] font-extrabold text-black">Account health</h2>
          <div className="mt-4 space-y-3">
            {[
              {
                label: "Reconnect required",
                value: numberFormatter.format(reconnectRequired),
                detail: "Expired, invalid, or missing Instagram tokens",
                tone: "bg-[#fff4df] text-[#c07800]",
                icon: RefreshCw,
              },
              {
                label: "Automation ready",
                value: numberFormatter.format(automationReady),
                detail: "Accounts with healthy token state",
                tone: "bg-[#eafaf0] text-[#13a84f]",
                icon: Check,
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="rounded-[8px] border border-[#edf0f6] p-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-[10px] ${item.tone}`}>
                      <Icon size={18} strokeWidth={2.35} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-extrabold text-black">{item.label}</p>
                      <p className="mt-1 text-[11px] font-semibold text-[#687089]">{item.detail}</p>
                    </div>
                    <span className="text-[20px] font-extrabold text-black">{item.value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </section>
    </div>
  );
}

function formatAdminDate(value?: string | null) {
  if (!value) {
    return "No date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No date";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getAdminRowNumber(value?: string) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getTrialSignal(row: SuperAdminConnectedAccountApiRow) {
  const messages = getAdminRowNumber(row.messages);
  const opportunities = getAdminRowNumber(row.opportunities);

  if (opportunities > 0) {
    return "Opportunity signals";
  }

  if (messages > 0) {
    return "Message activity";
  }

  if (row.instagram === "Connected") {
    return "Connected";
  }

  return "Setup pending";
}

function getChurnStatus(row: SuperAdminConnectedAccountApiRow) {
  if (row.riskLevel === "High") {
    return { label: "At risk", tone: "red" as const };
  }

  if (row.riskLevel === "Medium") {
    return { label: "Watch", tone: "amber" as const };
  }

  return { label: "Monitor", tone: "purple" as const };
}

function buildCreatorLifecycleConfig(
  page: "creators-trials" | "creators-churn",
  data: SuperAdminConnectedAccountsResponse | null,
  isLoading: boolean,
  query: string
) {
  const metrics = data?.metrics;
  const creatorRows = (data?.rows || []).filter((row) => row.source !== "instagram");
  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (row: SuperAdminConnectedAccountApiRow) => {
    if (!normalizedQuery) {
      return true;
    }

    return [row.name, row.detail, row.plan, row.instagram, row.status, row.riskSignal, row.owner]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  };

  if (page === "creators-trials") {
    const trialRows = creatorRows
      .filter((row) => row.accountStatus === "trial" || row.plan.toLowerCase().includes("trial"))
      .filter(matchesQuery);
    const allTrialRows = creatorRows.filter((row) => row.accountStatus === "trial" || row.plan.toLowerCase().includes("trial"));
    const conversionReady = allTrialRows.filter((row) => row.instagram === "Connected" && (getAdminRowNumber(row.messages) > 0 || getAdminRowNumber(row.opportunities) > 0)).length;
    const needsActivation = allTrialRows.filter((row) => row.instagram !== "Connected" || getAdminRowNumber(row.messages) === 0).length;
    const expiringThisWeek = allTrialRows.filter((row) => {
      if (!row.createdAt) {
        return false;
      }

      const ageDays = (Date.now() - new Date(row.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return ageDays >= 23 && ageDays <= 30;
    }).length;
    const trialPipeline = allTrialRows.reduce((sum, row) => sum + (row.revenueAmount || 0), 0);

    return {
      config: {
        metrics: [
          { label: "Trial accounts", value: isLoading && !metrics ? "..." : formatAdminNumber(metrics?.trialAccounts), detail: "Currently evaluating", change: `${formatAdminPercent(metrics?.trialAccounts || 0, metrics?.creatorAccounts || 0)} of creators`, tone: "bg-[#fff6e8] text-[#d98613]", icon: User },
          { label: "Conversion ready", value: isLoading && !metrics ? "..." : formatAdminNumber(conversionReady), detail: "High engagement trials", change: `${formatAdminNumber(conversionReady)} ready`, tone: "bg-[#eafaf0] text-[#13a84f]", icon: Target },
          { label: "Expiring this week", value: isLoading && !metrics ? "..." : formatAdminNumber(expiringThisWeek), detail: "Need outreach", change: "Based on signup age", tone: "bg-[#fff4df] text-[#c07800]", icon: Clock },
          { label: "Trial pipeline", value: isLoading && !metrics ? "..." : formatAdminCurrency(trialPipeline, true), detail: "Potential MRR", change: "From metadata", tone: "bg-[#f0edff] text-[#4b3cff]", icon: DollarSign },
        ],
        columns: ["Start", "Plan target", "Messages", "Signals", "Owner"],
        rows: trialRows.map((row) => {
          const ready = row.instagram === "Connected" && (getAdminRowNumber(row.messages) > 0 || getAdminRowNumber(row.opportunities) > 0);

          return {
            name: row.name,
            detail: row.detail,
            values: [formatAdminDate(row.createdAt), row.plan, row.messages, getTrialSignal(row), row.owner || "Success"],
            status: ready ? "Ready" : "Trial",
            statusTone: ready ? "green" as const : "amber" as const,
          };
        }),
        insightTitle: "Trial actions",
        insightItems: [
          { label: "Needs activation", value: formatAdminNumber(needsActivation), detail: "Trials with low first-week usage", tone: "bg-[#fff4df] text-[#c07800]", icon: Play },
          { label: "Upgrade nudges", value: formatAdminNumber(conversionReady), detail: "Trials ready for payment follow-up", tone: "bg-[#eafaf0] text-[#13a84f]", icon: ArrowRight },
        ],
      },
      emptyText: "No real trial accounts found.",
    };
  }

  const allRiskRows = creatorRows.filter((row) => row.riskSignal && row.riskSignal !== "Healthy");
  const riskRows = allRiskRows.filter(matchesQuery);
  const lowUsage = allRiskRows.filter((row) => row.riskSignal?.toLowerCase().includes("low") || row.riskSignal?.toLowerCase().includes("no activity")).length;
  const failedPayment = allRiskRows.filter((row) => row.riskSignal?.toLowerCase().includes("failed")).length;
  const recovered = creatorRows.filter((row) => row.accountStatus === "active" && row.riskSignal === "Healthy").length;
  const revenueAtRisk = allRiskRows.reduce((sum, row) => sum + (row.revenueAmount || 0), 0);

  return {
    config: {
      metrics: [
        { label: "At-risk creators", value: isLoading && !metrics ? "..." : formatAdminNumber(allRiskRows.length), detail: "Usage or billing risk", change: "Real signals", tone: "bg-[#fff0f3] text-[#df405b]", icon: TriangleAlert },
        { label: "Low usage", value: isLoading && !metrics ? "..." : formatAdminNumber(lowUsage), detail: "No activity in 7 days", change: "Needs review", tone: "bg-[#fff4df] text-[#c07800]", icon: Clock },
        { label: "Failed payment", value: isLoading && !metrics ? "..." : formatAdminNumber(failedPayment), detail: "Card action needed", change: formatAdminCurrency(allRiskRows.filter((row) => row.riskSignal?.toLowerCase().includes("failed")).reduce((sum, row) => sum + (row.revenueAmount || 0), 0)), tone: "bg-[#fff0f3] text-[#df405b]", icon: CreditCard },
        { label: "Recovered", value: isLoading && !metrics ? "..." : formatAdminNumber(recovered), detail: "Healthy active creators", change: "No risk signal", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Heart },
      ],
      columns: ["Risk", "Plan", "MRR", "Last signal", "Owner"],
      rows: riskRows.map((row) => {
        const status = getChurnStatus(row);

        return {
          name: row.name,
          detail: row.detail,
          values: [row.riskLevel || "Low", row.plan, formatAdminCurrency(row.revenueAmount), row.riskSignal || "Healthy", row.owner || "Success"],
          status: status.label,
          statusTone: status.tone,
        };
      }),
      insightTitle: "Retention queue",
      insightItems: [
        { label: "Save playbooks", value: formatAdminNumber(allRiskRows.length), detail: "Accounts queued for retention outreach", tone: "bg-[#f0edff] text-[#4b3cff]", icon: BriefcaseBusiness },
        { label: "Revenue at risk", value: formatAdminCurrency(revenueAtRisk, true), detail: "MRR attached to current risk signals", tone: "bg-[#fff0f3] text-[#df405b]", icon: DollarSign },
      ],
    },
    emptyText: "No real churn-risk accounts found.",
  };
}

function getCreatorAdminRows(data: SuperAdminConnectedAccountsResponse | null) {
  return (data?.rows || []).filter((row) => row.source !== "instagram");
}

function getNormalizedStatus(value?: string) {
  return (value || "").trim().toLowerCase();
}

function formatAdminStatus(value?: string) {
  const normalized = getNormalizedStatus(value);

  if (!normalized) {
    return "Unpaid";
  }

  return normalized
    .split(/[\s_-]+/)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}

function isPaidAdminRow(row: SuperAdminConnectedAccountApiRow) {
  const status = getNormalizedStatus(row.paymentStatus);
  return (row.revenueAmount || 0) > 0 || status === "paid" || status === "active";
}

function isFailedPaymentRow(row: SuperAdminConnectedAccountApiRow) {
  const status = getNormalizedStatus(row.paymentStatus);
  return status.includes("failed") || status.includes("past_due") || row.riskSignal?.toLowerCase().includes("failed payment");
}

function isPendingPaymentRow(row: SuperAdminConnectedAccountApiRow) {
  const status = getNormalizedStatus(row.paymentStatus);
  return status.includes("pending") || status.includes("processing");
}

function getPaymentTone(row: SuperAdminConnectedAccountApiRow): SuperAdminTableRow["statusTone"] {
  if (isFailedPaymentRow(row)) {
    return "red";
  }

  if (isPendingPaymentRow(row)) {
    return "amber";
  }

  if (isPaidAdminRow(row)) {
    return "green";
  }

  return "purple";
}

function getPaymentStatus(row: SuperAdminConnectedAccountApiRow) {
  if (isFailedPaymentRow(row)) {
    return "Failed";
  }

  if (isPendingPaymentRow(row)) {
    return "Processing";
  }

  if (isPaidAdminRow(row)) {
    return "Paid";
  }

  return formatAdminStatus(row.paymentStatus);
}

function getRetryLabel(row: SuperAdminConnectedAccountApiRow) {
  const status = getNormalizedStatus(row.paymentStatus);

  if (status.includes("retry")) {
    return formatAdminStatus(row.paymentStatus);
  }

  if (isFailedPaymentRow(row)) {
    return "Needs retry";
  }

  return "None";
}

function getRefundRows(rows: SuperAdminConnectedAccountApiRow[]) {
  return rows.filter((row) => (row.refundAmount || 0) > 0 || Boolean(row.refundReason || row.refundStatus));
}

function isResolvedRefund(row: SuperAdminConnectedAccountApiRow) {
  const status = getNormalizedStatus(row.refundStatus);
  return status.includes("resolved") || status.includes("saved");
}

function isOpenRefund(row: SuperAdminConnectedAccountApiRow) {
  const status = getNormalizedStatus(row.refundStatus);
  return status.includes("open") || status.includes("review") || status.includes("dispute");
}

function getRefundTone(row: SuperAdminConnectedAccountApiRow): SuperAdminTableRow["statusTone"] {
  if (isResolvedRefund(row)) {
    return "green";
  }

  if (isOpenRefund(row)) {
    return "red";
  }

  return "amber";
}

function getPlanGroupKey(plan: string) {
  const normalized = plan.trim().toLowerCase();

  if (normalized.includes("founder")) return "Founder Plan";
  if (normalized.includes("pro")) return "Pro Plan";
  if (normalized.includes("starter")) return "Starter Plan";
  if (normalized.includes("trial")) return "Trial pool";

  return plan.trim() || "Creator";
}

function buildRevenueConfig(
  page: RevenueAdminPage,
  data: SuperAdminConnectedAccountsResponse | null,
  isLoading: boolean,
  query: string
) {
  const metrics = data?.metrics;
  const creatorRows = getCreatorAdminRows(data);
  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (values: string[]) => !normalizedQuery || values.join(" ").toLowerCase().includes(normalizedQuery);
  const paidRows = creatorRows.filter(isPaidAdminRow);
  const failedRows = creatorRows.filter(isFailedPaymentRow);
  const pendingRows = creatorRows.filter(isPendingPaymentRow);
  const totalMrr = paidRows.reduce((sum, row) => sum + (row.revenueAmount || 0), 0);
  const churnedRows = creatorRows.filter((row) => row.accountStatus === "inactive" || row.accountStatus === "cancelled");
  const churnRate = creatorRows.length > 0 ? `${((churnedRows.length / creatorRows.length) * 100).toFixed(1)}%` : "0%";

  if (page === "revenue-subscriptions") {
    const groupedPlans = new Map<string, { name: string; count: number; mrr: number; active: number; trial: boolean }>();

    creatorRows.forEach((row) => {
      const name = getPlanGroupKey(row.plan);
      const current = groupedPlans.get(name) || {
        name,
        count: 0,
        mrr: 0,
        active: 0,
        trial: name.toLowerCase().includes("trial"),
      };

      current.count += 1;
      current.mrr += row.revenueAmount || 0;

      if (row.accountStatus === "active") {
        current.active += 1;
      }

      groupedPlans.set(name, current);
    });

    const planRows = Array.from(groupedPlans.values())
      .sort((first, second) => second.mrr - first.mrr || second.count - first.count)
      .filter((group) => matchesQuery([group.name, String(group.count), formatAdminCurrency(group.mrr)]));
    const paidGroupCounts = paidRows.reduce<Record<string, number>>((counts, row) => {
      const name = getPlanGroupKey(row.plan);
      counts[name] = (counts[name] || 0) + 1;
      return counts;
    }, {});
    const paidInsightItems = Object.entries(paidGroupCounts).sort((first, second) => second[1] - first[1]);

    return {
      config: {
        metrics: [
          { label: "MRR", value: isLoading && !metrics ? "..." : formatAdminCurrency(metrics?.mrr || totalMrr), detail: "Monthly recurring revenue", change: "From billing metadata", tone: "bg-[#f0edff] text-[#4b3cff]", icon: DollarSign },
          { label: "ARR", value: isLoading && !metrics ? "..." : formatAdminCurrency(metrics?.arr || totalMrr * 12, true), detail: "Annual recurring revenue", change: "Annualized from MRR", tone: "bg-[#f0edff] text-[#4b3cff]", icon: CircleDollarSign },
          { label: "Paid accounts", value: isLoading && !metrics ? "..." : formatAdminNumber(metrics?.paidAccounts || paidRows.length), detail: "Active subscriptions", change: `${formatAdminPercent(paidRows.length, creatorRows.length)} of creators`, tone: "bg-[#eafaf0] text-[#13a84f]", icon: Handshake },
          { label: "Churn rate", value: isLoading && !metrics ? "..." : churnRate, detail: "Inactive or cancelled", change: `${formatAdminNumber(churnedRows.length)} accounts`, tone: "bg-[#eafaf0] text-[#13a84f]", icon: TrendingUp },
        ],
        columns: ["Plan", "MRR", "Accounts", "Growth", "Retention"],
        rows: planRows.map((group) => ({
          name: group.name,
          detail: group.trial ? "Not billed yet" : `${formatAdminCurrency(group.count > 0 ? group.mrr / group.count : 0)} average MRR`,
          values: [
            group.name.replace(" Plan", ""),
            formatAdminCurrency(group.mrr),
            formatAdminNumber(group.count),
            "Live",
            group.trial ? "Pending" : formatAdminPercent(group.active, group.count),
          ],
          status: group.trial ? "Pipeline" : group.mrr > 0 ? "Strong" : "Monitor",
          statusTone: group.trial ? "purple" as const : group.mrr > 0 ? "green" as const : "amber" as const,
        })),
        insightTitle: "Revenue mix",
        insightItems: (paidInsightItems.length > 0
          ? paidInsightItems.slice(0, 2).map(([name, count]) => ({
              label: `${name.replace(" Plan", "")} share`,
              value: formatAdminPercent(count, paidRows.length),
              detail: "Of paid accounts",
              tone: name.toLowerCase().includes("pro") ? "bg-[#eaf4ff] text-[#246bff]" : "bg-[#f0edff] text-[#4b3cff]",
              icon: name.toLowerCase().includes("founder") ? Crown : Sparkles,
            }))
          : planRows.slice(0, 2).map((group) => ({
              label: `${group.name.replace(" Plan", "")} share`,
              value: formatAdminPercent(group.count, creatorRows.length),
              detail: "Of creators",
              tone: group.name.toLowerCase().includes("pro") ? "bg-[#eaf4ff] text-[#246bff]" : "bg-[#f0edff] text-[#4b3cff]",
              icon: group.name.toLowerCase().includes("founder") ? Crown : Sparkles,
            }))),
      },
      emptyText: "No real subscription records found.",
    };
  }

  if (page === "revenue-payments") {
    const paymentRows = creatorRows
      .filter((row) => isPaidAdminRow(row) || isFailedPaymentRow(row) || isPendingPaymentRow(row))
      .filter((row) => matchesQuery([row.name, row.detail, row.invoiceId || "", row.paymentStatus || "", row.paymentMethod || ""]));
    const recoveredRows = creatorRows.filter((row) => getNormalizedStatus(row.paymentStatus).includes("recover"));
    const processingAmount = pendingRows.reduce((sum, row) => sum + (row.revenueAmount || 0), 0);
    const settledCount = paidRows.length;
    const settlementTotal = paidRows.length + failedRows.length + pendingRows.length;

    return {
      config: {
        metrics: [
          { label: "Successful charges", value: isLoading && !metrics ? "..." : formatAdminNumber(paidRows.length), detail: "Current paid users", change: formatAdminCurrency(totalMrr), tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
          { label: "Failed payments", value: isLoading && !metrics ? "..." : formatAdminNumber(failedRows.length), detail: "Needs retry", change: formatAdminCurrency(failedRows.reduce((sum, row) => sum + (row.revenueAmount || 0), 0)), tone: "bg-[#fff0f3] text-[#df405b]", icon: CreditCard },
          { label: "Processing", value: isLoading && !metrics ? "..." : formatAdminCurrency(processingAmount), detail: "Pending settlement", change: `${formatAdminNumber(pendingRows.length)} accounts`, tone: "bg-[#fff4df] text-[#c07800]", icon: Clock },
          { label: "Recovered revenue", value: isLoading && !metrics ? "..." : formatAdminCurrency(recoveredRows.reduce((sum, row) => sum + (row.revenueAmount || 0), 0)), detail: "Dunning wins", change: `${formatAdminNumber(recoveredRows.length)} recovered`, tone: "bg-[#eafaf0] text-[#13a84f]", icon: TrendingUp },
        ],
        columns: ["Amount", "Method", "Date", "Retry", "Owner"],
        rows: paymentRows.map((row) => ({
          name: row.name,
          detail: row.invoiceId ? `Invoice ${row.invoiceId}` : row.detail,
          values: [
            formatAdminCurrency(row.revenueAmount),
            row.paymentMethod || "Unknown",
            formatAdminDate(row.billingDate || row.createdAt),
            getRetryLabel(row),
            row.owner || "Billing",
          ],
          status: getPaymentStatus(row),
          statusTone: getPaymentTone(row),
        })),
        insightTitle: "Payment ops",
        insightItems: [
          { label: "Retry queue", value: formatAdminNumber(failedRows.length), detail: "Failed invoices in retry workflow", tone: "bg-[#fff0f3] text-[#df405b]", icon: RefreshCw },
          { label: "Settlement health", value: formatAdminPercent(settledCount, settlementTotal), detail: "Charges settled successfully", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Shield },
        ],
      },
      emptyText: "No real payment records found.",
    };
  }

  const refundRows = getRefundRows(creatorRows);
  const visibleRefundRows = refundRows.filter((row) =>
    matchesQuery([row.name, row.detail, row.refundReason || "", row.refundStatus || "", row.plan])
  );
  const refundTotal = refundRows.reduce((sum, row) => sum + (row.refundAmount || 0), 0);
  const savedRefunds = refundRows.filter(isResolvedRefund).reduce((sum, row) => sum + (row.refundAmount || 0), 0);
  const openRefunds = refundRows.filter(isOpenRefund);
  const reasonCounts = refundRows.reduce<Record<string, number>>((counts, row) => {
    const reason = row.refundReason || "Unspecified";
    counts[reason] = (counts[reason] || 0) + 1;
    return counts;
  }, {});
  const reasonItems = Object.entries(reasonCounts)
    .sort((first, second) => second[1] - first[1])
    .slice(0, 2);

  return {
    config: {
      metrics: [
        { label: "Refunds", value: isLoading && !metrics ? "..." : formatAdminCurrency(refundTotal), detail: "Recorded in metadata", change: `${formatAdminNumber(refundRows.length)} accounts`, tone: "bg-[#fff0f3] text-[#df405b]", icon: CreditCard },
        { label: "Refund rate", value: isLoading && !metrics ? "..." : formatAdminPercent(refundTotal, metrics?.mrr || totalMrr), detail: "Of paid revenue", change: "Live metadata", tone: "bg-[#eafaf0] text-[#13a84f]", icon: TrendingUp },
        { label: "Open disputes", value: isLoading && !metrics ? "..." : formatAdminNumber(openRefunds.length), detail: "Needs evidence", change: "Review queue", tone: "bg-[#fff4df] text-[#c07800]", icon: TriangleAlert },
        { label: "Saved refunds", value: isLoading && !metrics ? "..." : formatAdminCurrency(savedRefunds), detail: "Resolved by support", change: `${formatAdminNumber(refundRows.filter(isResolvedRefund).length)} saved`, tone: "bg-[#eafaf0] text-[#13a84f]", icon: Heart },
      ],
      columns: ["Amount", "Reason", "Date", "Plan", "Owner"],
      rows: visibleRefundRows.map((row) => ({
        name: row.name,
        detail: row.detail,
        values: [
          formatAdminCurrency(row.refundAmount),
          row.refundReason || "Unspecified",
          formatAdminDate(row.billingDate || row.createdAt),
          row.plan,
          row.owner || "Support",
        ],
        status: row.refundStatus ? formatAdminStatus(row.refundStatus) : "Open",
        statusTone: getRefundTone(row),
      })),
      insightTitle: "Refund reasons",
      insightItems: (reasonItems.length > 0 ? reasonItems : [["No refunds", 0] as [string, number]]).map(([label, value], index) => ({
        label,
        value: formatAdminPercent(value, Math.max(1, refundRows.length)),
        detail: index === 0 ? "Most common reason" : "Secondary reason",
        tone: index === 0 ? "bg-[#fff4df] text-[#c07800]" : "bg-[#f0edff] text-[#4b3cff]",
        icon: index === 0 ? CreditCard : SlidersHorizontal,
      })),
    },
    emptyText: "No real refund records found.",
  };
}

function SuperAdminPricingSection() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadInitialPricing() {
      try {
        const response = await fetch("/api/pricing", {
          cache: "no-store",
        });
        const data = (await response.json()) as PricingResponse;

        if (!response.ok || data.error) {
          throw new Error(data.error || "Could not load pricing");
        }

        if (isMounted) {
          setPlans(data.plans || []);
        }
      } catch (error) {
        if (isMounted) {
          setMessage(error instanceof Error ? error.message : "Could not load pricing");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialPricing();

    return () => {
      isMounted = false;
    };
  }, []);

  function updatePlan(planId: string, partial: Partial<PricingPlan>) {
    setPlans((current) => current.map((plan) => (plan.id === planId ? { ...plan, ...partial } : plan)));
  }

  async function savePricing() {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/pricing", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plans }),
      });
      const data = (await response.json()) as PricingResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error || "Could not save pricing");
      }

      setPlans(data.plans || plans);
      setMessage("Pricing saved. New purchases will use these prices.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save pricing");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[15px] font-extrabold text-black">Pricing plans</h2>
          <p className="mt-1 text-[11px] font-semibold text-[#687089]">
            Prices here power creator checkout and admin revenue totals after purchase.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void savePricing()}
          disabled={isSaving || isLoading}
          className="flex h-9 items-center justify-center gap-2 rounded-[8px] bg-[#5b38ff] px-4 text-[12px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? <RefreshCw size={14} strokeWidth={2.4} className="animate-spin" /> : <Check size={14} strokeWidth={2.6} />}
          Save pricing
        </button>
      </div>

      {message && <p className="mt-3 rounded-[8px] bg-[#f6f7fb] px-3 py-2 text-[11px] font-semibold text-[#46506a]">{message}</p>}

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {(isLoading && plans.length === 0 ? Array.from({ length: 3 }) : plans).map((planValue, index) => {
          const plan = planValue as PricingPlan | undefined;

          if (!plan) {
            return (
              <div key={index} className="h-[210px] animate-pulse rounded-[9px] border border-[#edf0f6] bg-[#f6f7fb]" />
            );
          }

          return (
            <article key={plan.id} className="rounded-[9px] border border-[#edf0f6] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <input
                    value={plan.name}
                    onChange={(event) => updatePlan(plan.id, { name: event.target.value })}
                    className="w-full rounded-[7px] border border-transparent bg-transparent px-1 text-[14px] font-extrabold text-black outline-none focus:border-[#dfe4ee]"
                  />
                  <input
                    value={plan.description}
                    onChange={(event) => updatePlan(plan.id, { description: event.target.value })}
                    className="mt-1 w-full rounded-[7px] border border-transparent bg-transparent px-1 text-[11px] font-semibold text-[#687089] outline-none focus:border-[#dfe4ee]"
                  />
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${plan.status === "active" ? "bg-[#e8f8ed] text-[#0a9b3f]" : "bg-[#f6f7fb] text-[#687089]"}`}>
                  {plan.status}
                </span>
              </div>
              <label className="mt-4 block">
                <span className="text-[10px] font-extrabold uppercase text-[#687089]">Monthly price</span>
                <div className="mt-2 flex h-10 items-center rounded-[8px] border border-[#dfe4ee] px-3">
                  <span className="text-[13px] font-extrabold text-[#687089]">$</span>
                  <input
                    value={plan.monthlyPrice}
                    type="number"
                    min={0}
                    onChange={(event) => updatePlan(plan.id, { monthlyPrice: Math.max(0, Number(event.target.value) || 0) })}
                    className="h-full min-w-0 flex-1 bg-transparent px-2 text-[13px] font-extrabold text-black outline-none"
                  />
                  <span className="text-[11px] font-semibold text-[#687089]">/mo</span>
                </div>
              </label>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                <SettingsSelect
                  ariaLabel={`${plan.name} status`}
                  value={plan.status}
                  options={["active", "hidden"]}
                  onChange={(value) => updatePlan(plan.id, { status: value === "hidden" ? "hidden" : "active" })}
                />
                <p className="text-[10px] font-semibold text-[#687089]">
                  {plan.features.length} features
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SuperAdminRevenuePage({ page, refreshKey = 0 }: { page: RevenueAdminPage; refreshKey?: number }) {
  const [data, setData] = useState<SuperAdminConnectedAccountsResponse | null>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchRevenueData = useCallback(async () => {
    const response = await fetch("/api/admin/connected-accounts", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    return readDashboardJsonResponse<SuperAdminConnectedAccountsResponse>(response, "Could not load revenue data");
  }, []);

  const loadRevenueData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const nextData = await fetchRevenueData();
      setData(nextData);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load revenue data");
    } finally {
      setIsLoading(false);
    }
  }, [fetchRevenueData]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialRevenueData() {
      try {
        const nextData = await fetchRevenueData();

        if (isMounted) {
          setData(nextData);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load revenue data");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialRevenueData();

    return () => {
      isMounted = false;
    };
  }, [fetchRevenueData, refreshKey]);

  const { config, emptyText } = buildRevenueConfig(page, data, isLoading, query);

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {config.metrics.map((metric) => (
          <SuperAdminMetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <article className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[15px] font-extrabold text-black">{superAdminPageMeta[page].title} activity</h2>
              <p className="mt-1 text-[11px] font-semibold text-[#687089]">Live billing values from Supabase user metadata.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex h-9 items-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold">
                <Search size={14} strokeWidth={2.4} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                  className="w-full min-w-0 bg-transparent text-[12px] font-bold outline-none placeholder:text-[#687089] sm:w-28"
                />
              </label>
              <button
                type="button"
                onClick={() => void loadRevenueData()}
                disabled={isLoading}
                className="flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={14} strokeWidth={2.4} className={isLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-[8px] border border-[#ffd2da] bg-[#fff6f8] p-4 text-[12px] font-bold text-[#df405b]">
              {errorMessage}
            </div>
          ) : config.rows.length > 0 ? (
            <SuperAdminTable config={config} />
          ) : (
            <div className="rounded-[8px] border border-dashed border-[#d9deea] p-8 text-center">
              <p className="text-[13px] font-extrabold text-black">{isLoading ? "Loading real revenue data..." : emptyText}</p>
              <p className="mt-2 text-[12px] font-semibold text-[#687089]">
                {isLoading ? "Checking Supabase billing metadata." : "Use the Billing pricing cards to create real plan metadata."}
              </p>
            </div>
          )}
        </article>

        <aside className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <h2 className="text-[15px] font-extrabold text-black">{config.insightTitle}</h2>
          <div className="mt-4 space-y-3">
            {config.insightItems.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="rounded-[8px] border border-[#edf0f6] p-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-[10px] ${item.tone}`}>
                      <Icon size={18} strokeWidth={2.35} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-extrabold text-black">{item.label}</p>
                      <p className="mt-1 text-[11px] font-semibold text-[#687089]">{item.detail}</p>
                    </div>
                    <span className="text-[20px] font-extrabold text-black">{item.value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </section>

      {page === "revenue-subscriptions" && <SuperAdminPricingSection />}
    </div>
  );
}

function getInstagramTokenLabel(row: SuperAdminConnectedAccountApiRow) {
  if (row.instagram !== "Connected") {
    return "Disconnected";
  }

  if (row.statusTone === "green") {
    return "Healthy";
  }

  return "Reconnect";
}

function getInstagramWebhookLabel(row: SuperAdminConnectedAccountApiRow, webhookConfigured?: boolean) {
  if (!webhookConfigured) {
    return "Not configured";
  }

  if (row.instagram !== "Connected") {
    return "Paused";
  }

  return row.statusTone === "green" ? "Live" : "Reconnect";
}

function buildPlatformConfig({
  page,
  connectedData,
  platformData,
  isLoading,
  query,
}: {
  page: PlatformAdminPage;
  connectedData: SuperAdminConnectedAccountsResponse | null;
  platformData: SuperAdminPlatformResponse | null;
  isLoading: boolean;
  query: string;
}) {
  const connectedMetrics = connectedData?.metrics;
  const platformMetrics = platformData?.metrics;
  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (values: string[]) => !normalizedQuery || values.join(" ").toLowerCase().includes(normalizedQuery);

  if (page === "platform-instagram") {
    const rows = (connectedData?.rows || [])
      .filter((row) => matchesQuery([row.name, row.detail, row.instagram, row.status, row.owner || ""]))
      .map((row) => {
        const token = getInstagramTokenLabel(row);
        const webhook = getInstagramWebhookLabel(row, platformMetrics?.webhookConfigured);
        const statusTone = token === "Healthy" ? "green" as const : token === "Disconnected" ? "red" as const : "amber" as const;

        return {
          name: row.name,
          detail: row.detail,
          values: [token, row.messages, webhook, row.lastActive, row.owner || "Platform"],
          status: token === "Healthy" ? "Healthy" : token === "Disconnected" ? "Issue" : "Reconnect",
          statusTone,
        };
      });
    const totalAccounts = connectedMetrics?.totalConnected || platformMetrics?.instagramAccounts || 0;
    const healthyTokens = connectedMetrics?.healthyTokens || 0;
    const needsAction = (connectedMetrics?.expiredTokens || 0) + (connectedMetrics?.disconnected || 0);

    return {
      config: {
        metrics: [
          { label: "Instagram accounts", value: isLoading && !connectedMetrics ? "..." : formatAdminNumber(totalAccounts), detail: "Connected total", change: `${formatAdminPercent(healthyTokens, Math.max(1, totalAccounts))} healthy`, tone: "bg-[#f0edff] text-[#4b3cff]", icon: Globe2 },
          { label: "Webhook messages", value: isLoading && !platformMetrics ? "..." : formatAdminNumber(platformMetrics?.messagesToday), detail: "Stored today", change: `${formatAdminNumber(platformMetrics?.messagesStored)} total stored`, tone: "bg-[#eafaf0] text-[#13a84f]", icon: Code2 },
          { label: "Expired tokens", value: isLoading && !connectedMetrics ? "..." : formatAdminNumber(connectedMetrics?.expiredTokens), detail: "Reconnect required", change: `${formatAdminPercent(connectedMetrics?.expiredTokens || 0, Math.max(1, totalAccounts))} of accounts`, tone: "bg-[#fff4df] text-[#c07800]", icon: RefreshCw },
          { label: "Disconnected", value: isLoading && !connectedMetrics ? "..." : formatAdminNumber(connectedMetrics?.disconnected), detail: "No active channel", change: `${formatAdminPercent(connectedMetrics?.disconnected || 0, Math.max(1, totalAccounts))} of creators`, tone: "bg-[#fff0f3] text-[#df405b]", icon: TriangleAlert },
        ],
        columns: ["Token", "Messages", "Webhook", "Last sync", "Owner"],
        rows,
        insightTitle: "Instagram status",
        insightItems: [
          { label: "Healthy", value: formatAdminNumber(healthyTokens), detail: "Accounts ready for automation", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
          { label: "Needs action", value: formatAdminNumber(needsAction), detail: "Expired or disconnected tokens", tone: "bg-[#fff4df] text-[#c07800]", icon: TriangleAlert },
        ],
      },
      emptyText: "No real Instagram account records found.",
    };
  }

  if (page === "platform-api") {
    const serviceRows = (platformData?.services || []).filter((service) =>
      matchesQuery([service.name, service.detail, service.status, service.config, service.owner])
    );
    const topServices = serviceRows.slice(0, 4);

    return {
      config: {
        metrics: topServices.map((service) => ({
          label: service.name,
          value: isLoading && !platformData ? "..." : service.status,
          detail: service.config,
          change: service.latency,
          tone: statusToneClasses[service.tone].replace("bg-", "bg-"),
          icon:
            service.name === "Instagram API"
              ? Globe2
              : service.name === "OpenAI API"
                ? BrainCircuit
                : service.name === "Database"
                  ? Database
                  : service.name === "Webhook endpoint"
                    ? Code2
                    : CircleHelp,
        })),
        columns: ["Status", "Latency", "Config", "Incidents", "Owner"],
        rows: serviceRows.map((service) => ({
          name: service.name,
          detail: service.detail,
          values: [service.status, service.latency, service.config, service.incidents, service.owner],
          status: service.status,
          statusTone: service.tone,
        })),
        insightTitle: "Service health",
        insightItems: [
          { label: "Healthy services", value: formatAdminNumber(platformMetrics?.healthyServices), detail: "Configured and ready", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
          { label: "Warnings", value: formatAdminNumber(platformMetrics?.warningServices), detail: "Missing config or attention needed", tone: "bg-[#fff4df] text-[#c07800]", icon: TriangleAlert },
        ],
      },
      emptyText: "No platform service records found.",
    };
  }

  const queueRows = (platformData?.queues || []).filter((queue) =>
    matchesQuery([queue.name, queue.detail, queue.queue, queue.worker, queue.status])
  );

  return {
    config: {
      metrics: [
        { label: "Pending jobs", value: isLoading && !platformMetrics ? "..." : formatAdminNumber(platformMetrics?.pendingJobs), detail: "Queued work", change: "Actual queue state", tone: "bg-[#fff4df] text-[#c07800]", icon: Clock },
        { label: "Processed today", value: isLoading && !platformMetrics ? "..." : formatAdminNumber(platformMetrics?.processedToday), detail: "Webhook messages stored", change: `${formatAdminNumber(platformMetrics?.messagesStored)} total`, tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
        { label: "Retries", value: isLoading && !platformMetrics ? "..." : formatAdminNumber(platformMetrics?.retries), detail: "Automatic retry", change: "No retry table", tone: "bg-[#fff4df] text-[#c07800]", icon: RefreshCw },
        { label: "Failed jobs", value: isLoading && !platformMetrics ? "..." : formatAdminNumber(platformMetrics?.failedJobs), detail: "Needs operator", change: `${formatAdminNumber(platformMetrics?.manualReview)} warnings`, tone: "bg-[#fff0f3] text-[#df405b]", icon: TriangleAlert },
      ],
      columns: ["Queue", "Pending", "Oldest", "Retries", "Worker"],
      rows: queueRows.map((queue) => ({
        name: queue.name,
        detail: queue.detail,
        values: [queue.queue, queue.pending, queue.oldest, queue.retries, queue.worker],
        status: queue.status,
        statusTone: queue.tone,
      })),
      insightTitle: "Queue operations",
      insightItems: [
        { label: "Stored today", value: formatAdminNumber(platformMetrics?.processedToday), detail: "Messages saved by webhook", tone: "bg-[#eaf4ff] text-[#246bff]", icon: Clock },
        { label: "Manual review", value: formatAdminNumber(platformMetrics?.manualReview), detail: "Configured warnings and queue issues", tone: "bg-[#fff4df] text-[#c07800]", icon: TriangleAlert },
      ],
    },
    emptyText: "No queue records found.",
  };
}

function SuperAdminPlatformPage({ page, refreshKey = 0 }: { page: PlatformAdminPage; refreshKey?: number }) {
  const [connectedData, setConnectedData] = useState<SuperAdminConnectedAccountsResponse | null>(null);
  const [platformData, setPlatformData] = useState<SuperAdminPlatformResponse | null>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchPlatformData = useCallback(async () => {
    const [connectedResponse, platformResponse] = await Promise.all([
      fetch("/api/admin/connected-accounts", { cache: "no-store", headers: { Accept: "application/json" } }),
      fetch("/api/admin/platform", { cache: "no-store", headers: { Accept: "application/json" } }),
    ]);
    const connectedPayload = await readDashboardJsonResponse<SuperAdminConnectedAccountsResponse>(connectedResponse, "Could not load Instagram account data");
    const platformPayload = await readDashboardJsonResponse<SuperAdminPlatformResponse>(platformResponse, "Could not load platform data");

    return { connectedPayload, platformPayload };
  }, []);

  const loadPlatformData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const nextData = await fetchPlatformData();
      setConnectedData(nextData.connectedPayload);
      setPlatformData(nextData.platformPayload);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load platform data");
    } finally {
      setIsLoading(false);
    }
  }, [fetchPlatformData]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialPlatformData() {
      try {
        const nextData = await fetchPlatformData();

        if (isMounted) {
          setConnectedData(nextData.connectedPayload);
          setPlatformData(nextData.platformPayload);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load platform data");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialPlatformData();

    return () => {
      isMounted = false;
    };
  }, [fetchPlatformData, refreshKey]);

  const { config, emptyText } = buildPlatformConfig({ page, connectedData, platformData, isLoading, query });

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {config.metrics.map((metric) => (
          <SuperAdminMetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <article className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[15px] font-extrabold text-black">{superAdminPageMeta[page].title} activity</h2>
              <p className="mt-1 text-[11px] font-semibold text-[#687089]">
                Real Supabase records, environment config, and webhook storage state.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex h-9 items-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold">
                <Search size={14} strokeWidth={2.4} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                  className="w-full min-w-0 bg-transparent text-[12px] font-bold outline-none placeholder:text-[#687089] sm:w-28"
                />
              </label>
              <button
                type="button"
                onClick={() => void loadPlatformData()}
                disabled={isLoading}
                className="flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={14} strokeWidth={2.4} className={isLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-[8px] border border-[#ffd2da] bg-[#fff6f8] p-4 text-[12px] font-bold text-[#df405b]">
              {errorMessage}
            </div>
          ) : config.rows.length > 0 ? (
            <SuperAdminTable config={config} />
          ) : (
            <div className="rounded-[8px] border border-dashed border-[#d9deea] p-8 text-center">
              <p className="text-[13px] font-extrabold text-black">{isLoading ? "Loading real platform data..." : emptyText}</p>
              <p className="mt-2 text-[12px] font-semibold text-[#687089]">
                {isLoading ? "Checking Supabase and environment state." : "No demo rows are shown on this page."}
              </p>
            </div>
          )}
        </article>

        <aside className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <h2 className="text-[15px] font-extrabold text-black">{config.insightTitle}</h2>
          <div className="mt-4 space-y-3">
            {config.insightItems.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="rounded-[8px] border border-[#edf0f6] p-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-[10px] ${item.tone}`}>
                      <Icon size={18} strokeWidth={2.35} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-extrabold text-black">{item.label}</p>
                      <p className="mt-1 text-[11px] font-semibold text-[#687089]">{item.detail}</p>
                    </div>
                    <span className="text-[20px] font-extrabold text-black">{item.value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </section>
    </div>
  );
}

function buildAiConfig({
  page,
  data,
  isLoading,
  query,
}: {
  page: AiAdminPage;
  data: SuperAdminAiResponse | null;
  isLoading: boolean;
  query: string;
}) {
  const metrics = data?.metrics;
  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (values: string[]) => !normalizedQuery || values.join(" ").toLowerCase().includes(normalizedQuery);
  const totalMessages = metrics?.totalMessages || 0;
  const aiReadyMessages = metrics?.aiReadyMessages || 0;
  const trackedSpend = metrics?.trackedSpend || 0;
  const trackedReplies = metrics?.trackedReplies || 0;
  const trackedTokens = metrics?.trackedTokens || 0;
  const estimatedTokens = metrics?.estimatedTokens || 0;
  const effectiveTokens = trackedTokens > 0 ? trackedTokens : estimatedTokens;
  const costPerReply = trackedReplies > 0 ? trackedSpend / trackedReplies : 0;
  const spendDetail = metrics?.spendLogsStored ? "Tracked metadata" : "No spend log stored";
  const tokenDetail = trackedTokens > 0 ? "Tracked token metadata" : "Estimated from messages";

  if (page === "ai-usage") {
    const rows = (data?.usage || [])
      .filter((row) => matchesQuery([row.name, row.detail, row.status, row.health]))
      .map((row) => ({
        name: row.name,
        detail: row.detail,
        values: [
          formatAdminNumber(row.messages),
          row.replies > 0 ? formatAdminNumber(row.replies) : "Not tracked",
          formatAdminNumber(row.opportunities),
          formatAdminNumber(row.escalations),
          row.health,
        ],
        status: row.status,
        statusTone: row.tone,
      }));

    return {
      config: {
        metrics: [
          { label: "Messages processed", value: isLoading && !metrics ? "..." : formatAdminNumber(totalMessages), detail: "Stored webhook messages", change: `${formatAdminNumber(metrics?.messagesToday)} today`, tone: "bg-[#f0edff] text-[#4b3cff]", icon: Bot },
          { label: "AI-ready chats", value: isLoading && !metrics ? "..." : formatAdminNumber(aiReadyMessages), detail: "Without handoff keywords", change: `${formatAdminPercent(aiReadyMessages, totalMessages)} of stored`, tone: "bg-[#f0edff] text-[#4b3cff]", icon: Sparkles },
          { label: "Opportunities found", value: isLoading && !metrics ? "..." : formatAdminNumber(metrics?.opportunitySignals), detail: "Buying signal keywords", change: "Live message scan", tone: "bg-[#fff6e8] text-[#d98613]", icon: Target },
          { label: "Escalations", value: isLoading && !metrics ? "..." : formatAdminNumber(metrics?.handoffSignals), detail: "Human handoff signals", change: `${formatAdminNumber(metrics?.urgentSignals)} urgent`, tone: "bg-[#fff0f3] text-[#df405b]", icon: TriangleAlert },
        ],
        columns: ["Messages", "AI replies", "Opportunities", "Escalations", "Health"],
        rows,
        insightTitle: "Automation coverage",
        insightItems: [
          { label: "AI-ready chats", value: formatAdminPercent(aiReadyMessages, totalMessages), detail: "Stored messages without handoff keywords", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
          { label: "Auto-send creators", value: formatAdminNumber(metrics?.autoSendCreators), detail: "Creators with automatic AI replies enabled", tone: "bg-[#f0edff] text-[#4b3cff]", icon: Sparkles },
          { label: "Configured creators", value: formatAdminNumber(metrics?.configuredCreators), detail: "Creators with an OpenAI key saved", tone: "bg-[#eaf4ff] text-[#246bff]", icon: BrainCircuit },
        ],
      },
      emptyText: "No real AI usage records found.",
    };
  }

  if (page === "ai-costs") {
    const rows = (data?.costs || [])
      .filter((row) => matchesQuery([row.name, row.detail, row.status, row.trend]))
      .map((row) => ({
        name: row.name,
        detail: row.detail,
        values: [
          row.spend > 0 ? formatAdminMoneyPrecise(row.spend) : "$0",
          row.tokens > 0 ? formatAdminTokenVolume(row.tokens) : "No logs",
          row.replies > 0 ? formatAdminNumber(row.replies) : "0",
          row.costPerReply > 0 ? formatAdminMoneyPrecise(row.costPerReply, 3) : "Not tracked",
          row.trend,
        ],
        status: row.status,
        statusTone: row.tone,
      }));

    return {
      config: {
        metrics: [
          { label: "AI spend", value: isLoading && !metrics ? "..." : formatAdminTrackedSpend(trackedSpend), detail: spendDetail, change: metrics?.spendLogsStored ? "Actual metadata" : "Add spend logging", tone: "bg-[#f0edff] text-[#4b3cff]", icon: DollarSign },
          { label: "Cost per reply", value: isLoading && !metrics ? "..." : costPerReply > 0 ? formatAdminMoneyPrecise(costPerReply, 3) : "Not tracked", detail: "Requires reply and spend logs", change: trackedReplies > 0 ? `${formatAdminNumber(trackedReplies)} replies` : "No reply log", tone: "bg-[#eafaf0] text-[#13a84f]", icon: TrendingUp },
          { label: "Token volume", value: isLoading && !metrics ? "..." : formatAdminTokenVolume(effectiveTokens), detail: tokenDetail, change: trackedTokens > 0 ? "Actual metadata" : "Estimated", tone: "bg-[#eaf4ff] text-[#246bff]", icon: BrainCircuit },
          { label: "Gross margin", value: isLoading && !metrics ? "..." : metrics?.grossMargin ? `${metrics.grossMargin.toFixed(1)}%` : "No revenue", detail: "After tracked AI costs", change: trackedSpend > 0 ? "Actual spend" : "No cost log", tone: "bg-[#eafaf0] text-[#13a84f]", icon: CircleDollarSign },
        ],
        columns: ["Spend", "Tokens", "Replies", "Cost/reply", "Trend"],
        rows,
        insightTitle: "Cost controls",
        insightItems: [
          { label: "Usage logs", value: metrics?.spendLogsStored ? "Stored" : "Missing", detail: "Persist spend and token usage after OpenAI calls", tone: metrics?.spendLogsStored ? "bg-[#eafaf0] text-[#13a84f]" : "bg-[#fff4df] text-[#c07800]", icon: Database },
          { label: "Estimated tokens", value: formatAdminTokenVolume(estimatedTokens), detail: "Approximation from stored message text", tone: "bg-[#f0edff] text-[#4b3cff]", icon: BrainCircuit },
        ],
      },
      emptyText: "No real AI cost records found.",
    };
  }

  const rows = (data?.escalations || [])
    .filter((row) => matchesQuery([row.name, row.detail, row.reason, row.owner, row.status]))
    .map((row) => ({
      name: row.name,
      detail: row.detail,
      values: [row.reason, formatAdminNumber(row.count), row.avgTime, row.owner, row.trend],
      status: row.status,
      statusTone: row.tone,
    }));

  return {
    config: {
      metrics: [
        { label: "Escalations", value: isLoading && !metrics ? "..." : formatAdminNumber(metrics?.handoffSignals), detail: "Stored handoff signals", change: "Live keyword scan", tone: "bg-[#fff0f3] text-[#df405b]", icon: TriangleAlert },
        { label: "Urgent", value: isLoading && !metrics ? "..." : formatAdminNumber(metrics?.urgentSignals), detail: "High-priority handoffs", change: "Urgent keywords", tone: "bg-[#fff0f3] text-[#df405b]", icon: Flame },
        { label: "Avg handoff time", value: "Not tracked", detail: "Needs event timestamps", change: "Add handoff logs", tone: "bg-[#fff4df] text-[#c07800]", icon: Clock },
        { label: "Resolved", value: "Not tracked", detail: "No resolution log stored", change: "Add status tracking", tone: "bg-[#fff4df] text-[#c07800]", icon: Check },
      ],
      columns: ["Reason", "Count", "Avg time", "Owner", "Trend"],
      rows,
      insightTitle: "Handoff signals",
      insightItems: [
        { label: "Needs tuning", value: formatAdminNumber(metrics?.handoffSignals), detail: "Messages matching handoff keywords", tone: "bg-[#fff4df] text-[#c07800]", icon: SlidersHorizontal },
        { label: "Human load", value: formatAdminNumber(metrics?.humanRequestedSignals), detail: "Customer asks for a person or agent", tone: "bg-[#fff0f3] text-[#df405b]", icon: Flame },
      ],
    },
    emptyText: "No real AI escalation records found.",
  };
}

function SuperAdminAiPage({ page, refreshKey = 0 }: { page: AiAdminPage; refreshKey?: number }) {
  const [data, setData] = useState<SuperAdminAiResponse | null>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchAiData = useCallback(async () => {
    const response = await fetch("/api/admin/ai", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    return readDashboardJsonResponse<SuperAdminAiResponse>(response, "Could not load AI admin data");
  }, []);

  const loadAiData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const nextData = await fetchAiData();
      setData(nextData);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load AI admin data");
    } finally {
      setIsLoading(false);
    }
  }, [fetchAiData]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialAiData() {
      try {
        const nextData = await fetchAiData();

        if (isMounted) {
          setData(nextData);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load AI admin data");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialAiData();

    return () => {
      isMounted = false;
    };
  }, [fetchAiData, refreshKey]);

  const { config, emptyText } = buildAiConfig({ page, data, isLoading, query });
  const tableWarning = data?.metrics?.messagesTableAvailable === false ? data.metrics.messagesTableError : "";

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {config.metrics.map((metric) => (
          <SuperAdminMetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <article className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[15px] font-extrabold text-black">{superAdminPageMeta[page].title} activity</h2>
              <p className="mt-1 text-[11px] font-semibold text-[#687089]">
                Real creator AI settings, stored messages, and saved usage metadata.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex h-9 items-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold">
                <Search size={14} strokeWidth={2.4} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                  className="w-full min-w-0 bg-transparent text-[12px] font-bold outline-none placeholder:text-[#687089] sm:w-28"
                />
              </label>
              <button
                type="button"
                onClick={() => void loadAiData()}
                disabled={isLoading}
                className="flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={14} strokeWidth={2.4} className={isLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-[8px] border border-[#ffd2da] bg-[#fff6f8] p-4 text-[12px] font-bold text-[#df405b]">
              {errorMessage}
            </div>
          ) : tableWarning ? (
            <div className="rounded-[8px] border border-[#ffe0a3] bg-[#fffaf0] p-4 text-[12px] font-bold text-[#c07800]">
              Messages table is not available: {tableWarning}
            </div>
          ) : config.rows.length > 0 ? (
            <SuperAdminTable config={config} />
          ) : (
            <div className="rounded-[8px] border border-dashed border-[#d9deea] p-8 text-center">
              <p className="text-[13px] font-extrabold text-black">{isLoading ? "Loading real AI data..." : emptyText}</p>
              <p className="mt-2 text-[12px] font-semibold text-[#687089]">
                {isLoading ? "Checking AI metadata and stored messages." : "No demo rows are shown on this page."}
              </p>
            </div>
          )}
        </article>

        <aside className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <h2 className="text-[15px] font-extrabold text-black">{config.insightTitle}</h2>
          <div className="mt-4 space-y-3">
            {config.insightItems.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="rounded-[8px] border border-[#edf0f6] p-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-[10px] ${item.tone}`}>
                      <Icon size={18} strokeWidth={2.35} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-extrabold text-black">{item.label}</p>
                      <p className="mt-1 text-[11px] font-semibold text-[#687089]">{item.detail}</p>
                    </div>
                    <span className="text-[20px] font-extrabold text-black">{item.value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </section>
    </div>
  );
}

function buildSupportConfig({
  page,
  data,
  isLoading,
  query,
}: {
  page: SupportAdminPage;
  data: SuperAdminSupportResponse | null;
  isLoading: boolean;
  query: string;
}) {
  const metrics = data?.metrics;
  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (values: string[]) => !normalizedQuery || values.join(" ").toLowerCase().includes(normalizedQuery);

  if (page === "support-tickets") {
    const rows = (data?.tickets || [])
      .filter((row) => matchesQuery([row.name, row.detail, row.priority, row.topic, row.assignee, row.status]))
      .map((row) => ({
        name: row.name,
        detail: row.detail,
        values: [row.priority, row.topic, row.age, row.assignee, row.sla],
        status: row.status,
        statusTone: row.tone,
      }));

    return {
      config: {
        metrics: [
          { label: "Open tickets", value: isLoading && !metrics ? "..." : formatAdminNumber(metrics?.openTickets), detail: metrics?.ticketTableAvailable ? `From ${metrics.ticketTableName}` : "Open support signals", change: `${formatAdminNumber(metrics?.supportSignals)} message signals`, tone: "bg-[#fff0f3] text-[#df405b]", icon: Mail },
          { label: "In progress", value: isLoading && !metrics ? "..." : formatAdminNumber(metrics?.inProgressTickets), detail: "Review or watch status", change: metrics?.avgResponse || "Not tracked", tone: "bg-[#fff4df] text-[#c07800]", icon: Clock },
          { label: "Resolved today", value: isLoading && !metrics ? "..." : formatAdminNumber(metrics?.resolvedToday), detail: "Closed ticket records", change: metrics?.ticketTableAvailable ? "Actual tickets" : "No ticket table", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
          { label: "Satisfaction", value: isLoading && !metrics ? "..." : metrics?.satisfaction || "Not tracked", detail: "Latest support score", change: metrics?.ticketTableAvailable ? "Ticket metadata" : "No CSAT log", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Star },
        ],
        columns: ["Priority", "Topic", "Age", "Assignee", "SLA"],
        rows,
        insightTitle: "Support summary",
        insightItems: [
          { label: "Avg response", value: metrics?.avgResponse || "Not tracked", detail: metrics?.ticketTableAvailable ? "Across ticket records" : "No response-time field stored", tone: "bg-[#eaf4ff] text-[#246bff]", icon: Clock },
          { label: "First response", value: metrics?.firstResponse || "Not tracked", detail: metrics?.ticketTableAvailable ? "Median first support reply" : "No first-response field stored", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Send },
          { label: "Message rows", value: formatAdminNumber(metrics?.messageRows), detail: "Stored Instagram message records", tone: "bg-[#f0edff] text-[#4b3cff]", icon: MessageSquare },
        ],
      },
      emptyText: "No real support ticket records or support message signals found.",
      sourceNote: metrics?.ticketTableAvailable
        ? `Showing real records from ${metrics.ticketTableName}.`
        : "No support ticket table was found, so this page is showing real support signals from stored Instagram messages.",
    };
  }

  const rows = (data?.issues || [])
    .filter((row) => matchesQuery([row.name, row.detail, row.category, row.impact, row.owner, row.status]))
    .map((row) => ({
      name: row.name,
      detail: row.detail,
      values: [row.category, row.impact, row.age, row.owner, row.nextStep],
      status: row.status,
      statusTone: row.tone,
    }));

  return {
    config: {
      metrics: [
        { label: "Creator issues", value: isLoading && !metrics ? "..." : formatAdminNumber(metrics?.creatorIssues), detail: metrics?.issueTableAvailable ? `From ${metrics.issueTableName}` : "Derived from creator state", change: `${formatAdminNumber(metrics?.supportSignals)} support signals`, tone: "bg-[#fff4df] text-[#c07800]", icon: TriangleAlert },
        { label: "Product issues", value: isLoading && !metrics ? "..." : formatAdminNumber(metrics?.productIssues), detail: "Platform or AI blockers", change: `${formatAdminNumber(metrics?.platformBlockers)} platform blockers`, tone: "bg-[#fff0f3] text-[#df405b]", icon: Code2 },
        { label: "Onboarding issues", value: isLoading && !metrics ? "..." : formatAdminNumber(metrics?.onboardingIssues), detail: "Setup help needed", change: "Real config state", tone: "bg-[#fff4df] text-[#c07800]", icon: GraduationCap },
        { label: "Resolved today", value: isLoading && !metrics ? "..." : formatAdminNumber(metrics?.resolvedIssuesToday), detail: "Closed issue records", change: metrics?.issueTableAvailable ? "Actual issues" : "No issue table", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Check },
      ],
      columns: ["Category", "Impact", "Age", "Owner", "Next step"],
      rows,
      insightTitle: "Issue themes",
      insightItems: [
        { label: "Platform blockers", value: formatAdminNumber(metrics?.platformBlockers), detail: "Platform or AI follow-up needed", tone: "bg-[#fff0f3] text-[#df405b]", icon: Code2 },
        { label: "Success follow-up", value: formatAdminNumber(metrics?.successFollowUp), detail: "Support, billing, or creator-success issues", tone: "bg-[#eafaf0] text-[#13a84f]", icon: Handshake },
      ],
    },
    emptyText: "No real creator issue records found.",
    sourceNote: metrics?.issueTableAvailable
      ? `Showing real records from ${metrics.issueTableName}.`
      : "No creator issue table was found, so this page is showing real creator metadata and platform setup issues.",
  };
}

function SuperAdminSupportPage({ page, refreshKey = 0 }: { page: SupportAdminPage; refreshKey?: number }) {
  const [data, setData] = useState<SuperAdminSupportResponse | null>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchSupportData = useCallback(async () => {
    const response = await fetch("/api/admin/support", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    return readDashboardJsonResponse<SuperAdminSupportResponse>(response, "Could not load support admin data");
  }, []);

  const loadSupportData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const nextData = await fetchSupportData();
      setData(nextData);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load support admin data");
    } finally {
      setIsLoading(false);
    }
  }, [fetchSupportData]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialSupportData() {
      try {
        const nextData = await fetchSupportData();

        if (isMounted) {
          setData(nextData);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load support admin data");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialSupportData();

    return () => {
      isMounted = false;
    };
  }, [fetchSupportData, refreshKey]);

  const { config, emptyText, sourceNote } = buildSupportConfig({ page, data, isLoading, query });
  const tableWarning =
    data?.metrics?.messagesTableAvailable === false
      ? data.metrics.messagesTableError
      : page === "support-tickets" && data?.metrics?.ticketTableAvailable === false && !data.metrics.supportSignals
        ? data.metrics.ticketTableError
        : page === "support-issues" && data?.metrics?.issueTableAvailable === false && !config.rows.length
          ? data.metrics.issueTableError
          : "";

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {config.metrics.map((metric) => (
          <SuperAdminMetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <article className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[15px] font-extrabold text-black">{superAdminPageMeta[page].title} activity</h2>
              <p className="mt-1 text-[11px] font-semibold text-[#687089]">{sourceNote}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex h-9 items-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold">
                <Search size={14} strokeWidth={2.4} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                  className="w-full min-w-0 bg-transparent text-[12px] font-bold outline-none placeholder:text-[#687089] sm:w-28"
                />
              </label>
              <button
                type="button"
                onClick={() => void loadSupportData()}
                disabled={isLoading}
                className="flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={14} strokeWidth={2.4} className={isLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-[8px] border border-[#ffd2da] bg-[#fff6f8] p-4 text-[12px] font-bold text-[#df405b]">
              {errorMessage}
            </div>
          ) : tableWarning ? (
            <div className="rounded-[8px] border border-[#ffe0a3] bg-[#fffaf0] p-4 text-[12px] font-bold text-[#c07800]">
              {tableWarning}
            </div>
          ) : config.rows.length > 0 ? (
            <SuperAdminTable config={config} />
          ) : (
            <div className="rounded-[8px] border border-dashed border-[#d9deea] p-8 text-center">
              <p className="text-[13px] font-extrabold text-black">{isLoading ? "Loading real support data..." : emptyText}</p>
              <p className="mt-2 text-[12px] font-semibold text-[#687089]">
                {isLoading ? "Checking support tables, messages, and creator metadata." : "No demo rows are shown on this page."}
              </p>
            </div>
          )}
        </article>

        <aside className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <h2 className="text-[15px] font-extrabold text-black">{config.insightTitle}</h2>
          <div className="mt-4 space-y-3">
            {config.insightItems.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="rounded-[8px] border border-[#edf0f6] p-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-[10px] ${item.tone}`}>
                      <Icon size={18} strokeWidth={2.35} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-extrabold text-black">{item.label}</p>
                      <p className="mt-1 text-[11px] font-semibold text-[#687089]">{item.detail}</p>
                    </div>
                    <span className="text-[20px] font-extrabold text-black">{item.value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </section>
    </div>
  );
}

function SuperAdminCreatorLifecyclePage({
  page,
  refreshKey = 0,
}: {
  page: "creators-trials" | "creators-churn";
  refreshKey?: number;
}) {
  const [data, setData] = useState<SuperAdminConnectedAccountsResponse | null>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchLifecycleData = useCallback(async () => {
    const response = await fetch("/api/admin/connected-accounts", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    return readDashboardJsonResponse<SuperAdminConnectedAccountsResponse>(response, "Could not load creator data");
  }, []);

  const loadLifecycleData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const nextData = await fetchLifecycleData();
      setData(nextData);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load creator data");
    } finally {
      setIsLoading(false);
    }
  }, [fetchLifecycleData]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialLifecycleData() {
      try {
        const nextData = await fetchLifecycleData();

        if (isMounted) {
          setData(nextData);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load creator data");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialLifecycleData();

    return () => {
      isMounted = false;
    };
  }, [fetchLifecycleData, refreshKey]);

  const { config, emptyText } = buildCreatorLifecycleConfig(page, data, isLoading, query);

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {config.metrics.map((metric) => (
          <SuperAdminMetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <article className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[15px] font-extrabold text-black">{superAdminPageMeta[page].title} activity</h2>
              <p className="mt-1 text-[11px] font-semibold text-[#687089]">Real creator accounts from Supabase Auth and Instagram activity.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex h-9 items-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold">
                <Search size={14} strokeWidth={2.4} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                  className="w-full min-w-0 bg-transparent text-[12px] font-bold outline-none placeholder:text-[#687089] sm:w-28"
                />
              </label>
              <button
                type="button"
                onClick={() => void loadLifecycleData()}
                disabled={isLoading}
                className="flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={14} strokeWidth={2.4} className={isLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-[8px] border border-[#ffd2da] bg-[#fff6f8] p-4 text-[12px] font-bold text-[#df405b]">
              {errorMessage}
            </div>
          ) : config.rows.length > 0 ? (
            <SuperAdminTable config={config} />
          ) : (
            <div className="rounded-[8px] border border-dashed border-[#d9deea] p-8 text-center">
              <p className="text-[13px] font-extrabold text-black">{isLoading ? "Loading real creator data..." : emptyText}</p>
              <p className="mt-2 text-[12px] font-semibold text-[#687089]">
                {isLoading ? "Checking Supabase Auth, metadata, and Instagram activity." : "No sample records are shown on this page."}
              </p>
            </div>
          )}
        </article>

        <aside className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <h2 className="text-[15px] font-extrabold text-black">{config.insightTitle}</h2>
          <div className="mt-4 space-y-3">
            {config.insightItems.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="rounded-[8px] border border-[#edf0f6] p-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-[10px] ${item.tone}`}>
                      <Icon size={18} strokeWidth={2.35} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-extrabold text-black">{item.label}</p>
                      <p className="mt-1 text-[11px] font-semibold text-[#687089]">{item.detail}</p>
                    </div>
                    <span className="text-[20px] font-extrabold text-black">{item.value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </section>
    </div>
  );
}

export function SuperAdminDetailPage({
  page,
  refreshKey = 0,
}: {
  page: Exclude<SuperAdminPage, "overview" | "profile" | "settings">;
  refreshKey?: number;
}) {
  if (page === "creators-connected") {
    return <SuperAdminConnectedAccountsPage refreshKey={refreshKey} />;
  }

  if (page === "creators-trials" || page === "creators-churn") {
    return <SuperAdminCreatorLifecyclePage page={page} refreshKey={refreshKey} />;
  }

  if (page === "revenue-subscriptions" || page === "revenue-payments" || page === "revenue-refunds") {
    return <SuperAdminRevenuePage page={page} refreshKey={refreshKey} />;
  }

  if (page === "platform-instagram" || page === "platform-api" || page === "platform-queue") {
    return <SuperAdminPlatformPage page={page} refreshKey={refreshKey} />;
  }

  if (page === "ai-usage" || page === "ai-costs" || page === "ai-escalations") {
    return <SuperAdminAiPage page={page} refreshKey={refreshKey} />;
  }

  if (page === "support-tickets" || page === "support-issues") {
    return <SuperAdminSupportPage page={page} refreshKey={refreshKey} />;
  }

  const fallbackPage = page as keyof typeof superAdminDetailConfigs;
  const config = superAdminDetailConfigs[fallbackPage];

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {config.metrics.map((metric) => (
          <SuperAdminMetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <article className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-[15px] font-extrabold text-black">{superAdminPageMeta[fallbackPage].title} activity</h2>
            <div className="flex gap-2">
              <button type="button" className="flex h-9 items-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold">
                <Search size={14} strokeWidth={2.4} />
                Search
              </button>
              <button type="button" className="flex h-9 items-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold">
                <RefreshCw size={14} strokeWidth={2.4} />
                Refresh
              </button>
            </div>
          </div>
          <SuperAdminTable config={config} />
        </article>

        <aside className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <h2 className="text-[15px] font-extrabold text-black">{config.insightTitle}</h2>
          <div className="mt-4 space-y-3">
            {config.insightItems.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="rounded-[8px] border border-[#edf0f6] p-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-[10px] ${item.tone}`}>
                      <Icon size={18} strokeWidth={2.35} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-extrabold text-black">{item.label}</p>
                      <p className="mt-1 text-[11px] font-semibold text-[#687089]">{item.detail}</p>
                    </div>
                    <span className="text-[20px] font-extrabold text-black">{item.value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </section>
    </div>
  );
}
