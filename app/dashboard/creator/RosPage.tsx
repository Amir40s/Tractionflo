"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CircleDollarSign,
  Database,
  Lightbulb,
  type LucideIcon,
  RefreshCw,
  Route,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

type RosRow = Record<string, unknown>;

type RosConversionPath = {
  id: string;
  label: string;
  probability: number;
  pending: number;
  completed: number;
  value: number;
};

type RosRecommendation = {
  title: string;
  detail: string;
  priority: "High" | "Medium" | "Low";
};

type RosSummary = {
  error?: string;
  tableReady: boolean;
  warnings: string[];
  metrics: {
    prospects: number;
    hotProspects: number;
    decisions: number;
    averageConfidence: number;
    pendingOutcomes: number;
    wonRevenue: number;
    pipelineValue: number;
    conversionEvents: number;
  };
  businessProfile: {
    products: string[];
    services: string[];
    pricing: Record<string, unknown>;
    guarantees: string[];
    policies: string[];
    brandVoice: Record<string, unknown>;
    offers: string[];
    successStories: string[];
    sourceSummary: string;
    confidence: number;
  };
  conversionPaths: RosConversionPath[];
  recommendations: RosRecommendation[];
  recentDecisions: RosRow[];
  recentProspects: RosRow[];
  recentOutcomes: RosRow[];
  recentEvents: RosRow[];
  learningSummary: {
    summary: string;
    conversionPatterns: RosRow[];
    objections: RosRow[];
    recommendations: RosRecommendation[];
    metrics: Record<string, unknown>;
    computedAt: string;
  };
};

const emptySummary: RosSummary = {
  tableReady: true,
  warnings: [],
  metrics: {
    prospects: 0,
    hotProspects: 0,
    decisions: 0,
    averageConfidence: 0,
    pendingOutcomes: 0,
    wonRevenue: 0,
    pipelineValue: 0,
    conversionEvents: 0,
  },
  businessProfile: {
    products: [],
    services: [],
    pricing: {},
    guarantees: [],
    policies: [],
    brandVoice: {},
    offers: [],
    successStories: [],
    sourceSummary: "",
    confidence: 0,
  },
  conversionPaths: [],
  recommendations: [],
  recentDecisions: [],
  recentProspects: [],
  recentOutcomes: [],
  recentEvents: [],
  learningSummary: {
    summary: "",
    conversionPatterns: [],
    objections: [],
    recommendations: [],
    metrics: {},
    computedAt: "",
  },
};

type RosPaginationKey =
  | "outcomePaths"
  | "learning"
  | "products"
  | "services"
  | "pricing"
  | "offers"
  | "buyerMemory"
  | "decisionLog"
  | "revenueEvents";

const rosPageSizes: Record<RosPaginationKey, number> = {
  outcomePaths: 5,
  learning: 3,
  products: 3,
  services: 3,
  pricing: 3,
  offers: 3,
  buyerMemory: 5,
  decisionLog: 4,
  revenueEvents: 4,
};

const initialRosPages: Record<RosPaginationKey, number> = {
  outcomePaths: 1,
  learning: 1,
  products: 1,
  services: 1,
  pricing: 1,
  offers: 1,
  buyerMemory: 1,
  decisionLog: 1,
  revenueEvents: 1,
};

function getTotalPages(totalItems: number, pageSize: number) {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

function getSafePage(page: number, totalItems: number, pageSize: number) {
  return Math.min(Math.max(1, page), getTotalPages(totalItems, pageSize));
}

function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const safePage = getSafePage(page, items.length, pageSize);
  const start = (safePage - 1) * pageSize;

  return items.slice(start, start + pageSize);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value: unknown) {
  const date = typeof value === "string" ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getString(row: RosRow, key: string, fallback = "") {
  const value = row[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getNumber(row: RosRow, key: string) {
  const value = row[key];
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getPriorityClass(priority: RosRecommendation["priority"]) {
  if (priority === "High") return "border-[#ffd1dc] bg-[#fff4f7] text-[#df405b]";
  if (priority === "Medium") return "border-[#ffdfb8] bg-[#fff8ef] text-[#b95e00]";
  return "border-[#cfe7d7] bg-[#f0fbf4] text-[#0a8f3c]";
}

const insightFieldLabels = [
  "Product name",
  "Service name",
  "Plan or package",
  "Business name",
  "Knowledge Base Category",
  "Category",
  "Price",
  "Pricing",
  "Description",
  "What is included",
  "Payment methods",
  "Deposit or advance payment",
  "Delivery charges",
  "Refund or exchange note",
  "Location",
  "Opening hours",
  "Contact",
  "Offer",
  "Discount",
  "Bonus",
];

function cleanInsightText(value: string, maxLength = 140) {
  const cleaned = value
    .replace(/\s+/g, " ")
    .replace(/^(yes|sure|please)[,.\s]+/i, "")
    .replace(/^manual update:\s*/i, "")
    .trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength - 1).trim()}…`;
}

function getInsightFingerprint(value: string) {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(yes|please|share|provide|customer|customers|can|will|also|the|and|with|for|your|our|their|this|that)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeInsightRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getInsightField(text: string, label: string) {
  const otherLabels = insightFieldLabels.filter((item) => item !== label).map(escapeInsightRegExp).join("|");
  const pattern = new RegExp(`${escapeInsightRegExp(label)}\\s*:\\s*([\\s\\S]*?)(?=\\s+(?:${otherLabels})\\s*:|$)`, "i");
  const match = text.match(pattern);

  return cleanInsightText(match?.[1] || "", 120);
}

function getFirstInsightField(text: string, labels: string[]) {
  for (const label of labels) {
    const value = getInsightField(text, label);

    if (value) {
      return value;
    }
  }

  return "";
}

function makeInsightCard(item: string, kind: "products" | "services" | "pricing" | "offers") {
  const cleaned = cleanInsightText(item, 180);
  const title =
    kind === "products"
      ? getFirstInsightField(cleaned, ["Product name", "Plan or package"]) || cleaned
      : kind === "services"
        ? getFirstInsightField(cleaned, ["Service name", "What is included"]) || cleaned
        : kind === "pricing"
          ? getFirstInsightField(cleaned, ["Price", "Pricing", "Payment methods", "Deposit or advance payment"]) || cleaned
          : getFirstInsightField(cleaned, ["Offer", "Discount", "Bonus", "Product name", "Plan or package"]) || cleaned;
  const detail =
    getFirstInsightField(cleaned, ["Description", "What is included", "Price", "Delivery charges", "Refund or exchange note"]) ||
    (title !== cleaned ? cleaned.replace(title, "").replace(/^[-:.,\s]+/, "") : "");

  return {
    title: cleanInsightText(title, 64),
    detail: cleanInsightText(detail, 110),
  };
}

function getInsightCards(items: string[], kind: "products" | "services" | "pricing" | "offers", limit = Number.POSITIVE_INFINITY) {
  const seen = new Set<string>();
  const cards: { title: string; detail: string }[] = [];

  for (const item of items) {
    const card = makeInsightCard(item, kind);
    const fingerprint = getInsightFingerprint(`${card.title} ${card.detail}`);

    if (!card.title || !fingerprint || seen.has(fingerprint)) {
      continue;
    }

    seen.add(fingerprint);
    cards.push(card);

    if (cards.length >= limit) {
      break;
    }
  }

  return cards;
}

function MetricTile({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <article className="rounded-[8px] border border-[#e3e7f0] bg-white p-4 shadow-[0_18px_44px_rgba(20,28,53,0.045)]">
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] ${tone}`}>
          <Icon size={18} strokeWidth={2.35} />
        </span>
        <span className="text-right text-[11px] font-semibold leading-snug text-[#697083]">{label}</span>
      </div>
      <p className="mt-4 text-[24px] font-extrabold leading-none text-black">{value}</p>
      <p className="mt-2 text-[11px] font-medium leading-snug text-[#596175]">{detail}</p>
    </article>
  );
}

function SectionShell({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-[10px] border border-[#e4e8f1] bg-white shadow-[0_20px_60px_rgba(20,28,53,0.045)]">
      <header className="flex min-h-[54px] items-center justify-between gap-3 border-b border-[#edf0f6] px-4">
        <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-black">
          <Icon size={17} className="text-[#3044ff]" strokeWidth={2.4} />
          {title}
        </h2>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function PaginationControls({
  page,
  totalItems,
  pageSize,
  onPageChange,
  label = "section",
}: {
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  label?: string;
}) {
  if (totalItems <= pageSize) {
    return null;
  }

  const totalPages = getTotalPages(totalItems, pageSize);
  const safePage = getSafePage(page, totalItems, pageSize);
  const start = (safePage - 1) * pageSize + 1;
  const end = Math.min(totalItems, safePage * pageSize);

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#edf0f6] pt-3">
      <span className="text-[10px] font-bold text-[#697083]">
        {start}-{end} of {totalItems}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-extrabold text-[#596175]">
          Page {safePage} of {totalPages}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={`Previous ${label} page`}
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage === 1}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#dce2ee] bg-white text-black transition hover:bg-[#f8f9fc] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ChevronLeft size={15} strokeWidth={2.45} />
          </button>
          <button
            type="button"
            aria-label={`Next ${label} page`}
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage === totalPages}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#dce2ee] bg-white text-black transition hover:bg-[#f8f9fc] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ChevronRight size={15} strokeWidth={2.45} />
          </button>
        </div>
      </div>
    </div>
  );
}

function InsightCardList({
  items,
  kind,
  empty,
  page,
  pageSize,
  onPageChange,
}: {
  items: string[];
  kind: "products" | "services" | "pricing" | "offers";
  empty: string;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const cards = getInsightCards(items, kind);
  const pagedCards = paginateItems(cards, page, pageSize);

  if (cards.length === 0) {
    return <p className="text-[12px] font-medium leading-relaxed text-[#697083]">{empty}</p>;
  }

  return (
    <>
      <div className="grid gap-2">
        {pagedCards.map((card) => (
          <article key={`${card.title}-${card.detail}`} className="rounded-[8px] border border-[#e4e8f1] bg-[#fbfcff] p-2.5">
            <h4 className="text-[11px] font-extrabold leading-snug text-black">{card.title}</h4>
            {card.detail ? <p className="mt-1 text-[10px] font-medium leading-relaxed text-[#596175]">{card.detail}</p> : null}
          </article>
        ))}
      </div>
      <PaginationControls page={page} totalItems={cards.length} pageSize={pageSize} onPageChange={onPageChange} label={kind} />
    </>
  );
}

export function RosPage() {
  const [summary, setSummary] = useState<RosSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [sectionPages, setSectionPages] = useState<Record<RosPaginationKey, number>>(initialRosPages);

  function setSectionPage(key: RosPaginationKey, page: number) {
    setSectionPages((current) => ({ ...current, [key]: Math.max(1, page) }));
  }

  async function loadSummary() {
    setRefreshing(true);
    setError("");

    try {
      const response = await fetch("/api/ros/summary", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = (await response.json()) as RosSummary;

      if (!response.ok || data.error) {
        throw new Error(data.error || "Could not load ROS summary");
      }

      setSummary(data);
      setSectionPages({ ...initialRosPages });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load ROS summary");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadSummary(), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const topPaths = useMemo(
    () => [...summary.conversionPaths].sort((first, second) => second.probability - first.probability),
    [summary.conversionPaths]
  );
  const pricingDetected = Array.isArray(summary.businessProfile.pricing.detected)
    ? summary.businessProfile.pricing.detected.filter((item): item is string => typeof item === "string")
    : [];
  const pagedOutcomePaths = paginateItems(topPaths, sectionPages.outcomePaths, rosPageSizes.outcomePaths);
  const pagedRecommendations = paginateItems(summary.recommendations, sectionPages.learning, rosPageSizes.learning);
  const pagedProspects = paginateItems(summary.recentProspects, sectionPages.buyerMemory, rosPageSizes.buyerMemory);
  const pagedDecisions = paginateItems(summary.recentDecisions, sectionPages.decisionLog, rosPageSizes.decisionLog);
  const pagedEvents = paginateItems(summary.recentEvents, sectionPages.revenueEvents, rosPageSizes.revenueEvents);

  return (
    <main className="h-dvh flex-1 overflow-y-auto bg-[#f8f9fc] pb-24 lg:pb-8">
      <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-[10px] border border-[#e3e7f0] bg-white px-4 py-4 shadow-[0_18px_50px_rgba(20,28,53,0.045)] md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[26px] font-extrabold leading-none text-black sm:text-[30px]">Revenue Operating System</h1>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${summary.tableReady ? "border-[#ccebd5] bg-[#effaf3] text-[#09923d]" : "border-[#ffdfb8] bg-[#fff8ef] text-[#b95e00]"}`}>
                {summary.tableReady ? "Live" : "Needs migration"}
              </span>
            </div>
            <p className="mt-2 max-w-[760px] text-[12px] font-medium leading-relaxed text-[#596175]">
              {loading ? "Loading revenue decisions..." : summary.learningSummary.summary || "ROS is ready for new decision data."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadSummary()}
            disabled={refreshing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#dce2ee] bg-white px-3 text-[12px] font-extrabold text-black transition hover:bg-[#f8f9fc] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} strokeWidth={2.35} />
            Refresh
          </button>
        </header>

        {error ? (
          <section className="rounded-[10px] border border-[#ffd1dc] bg-[#fff5f8] p-4 text-[12px] font-semibold text-[#b91c3b]">
            {error}
          </section>
        ) : null}

        {summary.warnings.length > 0 ? (
          <section className="flex flex-wrap gap-2 rounded-[10px] border border-[#ffdfb8] bg-[#fffaf2] p-3">
            {summary.warnings.map((warning) => (
              <span key={warning} className="inline-flex items-center gap-1.5 rounded-[7px] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#9a5b00]">
                <AlertTriangle size={13} />
                {warning}
              </span>
            ))}
          </section>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile icon={Users} label="Prospects" value={summary.metrics.prospects.toLocaleString("en-US")} detail={`${summary.metrics.hotProspects} high-confidence`} tone="bg-[#eef4ff] text-[#3044ff]" />
          <MetricTile icon={BrainCircuit} label="Decisions" value={summary.metrics.decisions.toLocaleString("en-US")} detail={`${summary.metrics.averageConfidence}/100 avg confidence`} tone="bg-[#f0edff] text-[#5a35d6]" />
          <MetricTile icon={CircleDollarSign} label="Pipeline" value={formatMoney(summary.metrics.pipelineValue)} detail={`${summary.metrics.pendingOutcomes} pending outcomes`} tone="bg-[#f0fbf4] text-[#0a8f3c]" />
          <MetricTile icon={TrendingUp} label="Won revenue" value={formatMoney(summary.metrics.wonRevenue)} detail={`${summary.metrics.conversionEvents} conversion events`} tone="bg-[#fff6e8] text-[#c66a00]" />
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <SectionShell title="Outcome Paths" icon={Route}>
            <div className="space-y-3">
              {topPaths.length === 0 ? (
                <p className="text-[12px] font-medium text-[#697083]">No outcome paths yet.</p>
              ) : (
                <>
                  {pagedOutcomePaths.map((path) => (
                    <div key={path.id} className="grid gap-2 rounded-[8px] border border-[#edf0f6] bg-[#fbfcff] p-3 sm:grid-cols-[180px_minmax(0,1fr)_72px] sm:items-center">
                      <div>
                        <p className="text-[12px] font-extrabold text-black">{path.label}</p>
                        <p className="mt-1 text-[11px] font-medium text-[#697083]">
                          {path.pending} pending · {path.completed} done
                        </p>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-[#e9edf5]">
                        <div className="h-full rounded-full bg-[#3044ff]" style={{ width: `${Math.max(2, Math.min(100, path.probability))}%` }} />
                      </div>
                      <div className="flex items-center justify-end">
                        <span className="text-[12px] font-extrabold text-[#3044ff]">{path.probability}/100</span>
                      </div>
                    </div>
                  ))}
                  <PaginationControls
                    page={sectionPages.outcomePaths}
                    totalItems={topPaths.length}
                    pageSize={rosPageSizes.outcomePaths}
                    onPageChange={(page) => setSectionPage("outcomePaths", page)}
                    label="outcome paths"
                  />
                </>
              )}
            </div>
          </SectionShell>

          <SectionShell title="Learning Engine" icon={Lightbulb}>
            <div className="space-y-3">
              {summary.recommendations.length === 0 ? (
                <p className="text-[12px] font-medium text-[#697083]">No learning recommendations yet.</p>
              ) : (
                <>
                  {pagedRecommendations.map((recommendation) => (
                    <article key={`${recommendation.title}-${recommendation.priority}`} className="rounded-[8px] border border-[#edf0f6] bg-[#fbfcff] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-[12px] font-extrabold leading-snug text-black">{recommendation.title}</h3>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${getPriorityClass(recommendation.priority)}`}>
                          {recommendation.priority}
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] font-medium leading-relaxed text-[#596175]">{recommendation.detail}</p>
                    </article>
                  ))}
                  <PaginationControls
                    page={sectionPages.learning}
                    totalItems={summary.recommendations.length}
                    pageSize={rosPageSizes.learning}
                    onPageChange={(page) => setSectionPage("learning", page)}
                    label="learning recommendations"
                  />
                </>
              )}
            </div>
          </SectionShell>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <SectionShell title="Business Intelligence" icon={Database} action={<span className="text-[11px] font-bold text-[#596175]">{summary.businessProfile.confidence}/100 confidence</span>}>
            <div className="mb-4 grid gap-2 sm:grid-cols-4">
              {[
                ["Products", summary.businessProfile.products.length],
                ["Services", summary.businessProfile.services.length],
                ["Pricing", pricingDetected.length],
                ["Offers", summary.businessProfile.offers.length],
              ].map(([label, count]) => (
                <div key={label} className="rounded-[8px] border border-[#e4e8f1] bg-[#fbfcff] px-3 py-2">
                  <p className="text-[10px] font-bold uppercase text-[#697083]">{label}</p>
                  <p className="mt-1 text-[18px] font-extrabold leading-none text-black">{count}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="mb-2 text-[12px] font-extrabold text-black">Products</h3>
                <InsightCardList
                  items={summary.businessProfile.products}
                  kind="products"
                  empty="No product lines detected yet."
                  page={sectionPages.products}
                  pageSize={rosPageSizes.products}
                  onPageChange={(page) => setSectionPage("products", page)}
                />
              </div>
              <div>
                <h3 className="mb-2 text-[12px] font-extrabold text-black">Services</h3>
                <InsightCardList
                  items={summary.businessProfile.services}
                  kind="services"
                  empty="No service lines detected yet."
                  page={sectionPages.services}
                  pageSize={rosPageSizes.services}
                  onPageChange={(page) => setSectionPage("services", page)}
                />
              </div>
              <div>
                <h3 className="mb-2 text-[12px] font-extrabold text-black">Pricing</h3>
                <InsightCardList
                  items={pricingDetected}
                  kind="pricing"
                  empty="No pricing lines detected yet."
                  page={sectionPages.pricing}
                  pageSize={rosPageSizes.pricing}
                  onPageChange={(page) => setSectionPage("pricing", page)}
                />
              </div>
              <div>
                <h3 className="mb-2 text-[12px] font-extrabold text-black">Offers</h3>
                <InsightCardList
                  items={summary.businessProfile.offers}
                  kind="offers"
                  empty="No offer lines detected yet."
                  page={sectionPages.offers}
                  pageSize={rosPageSizes.offers}
                  onPageChange={(page) => setSectionPage("offers", page)}
                />
              </div>
            </div>
            <p className="mt-4 rounded-[8px] bg-[#f8f9fc] px-3 py-2 text-[11px] font-medium leading-relaxed text-[#596175]">
              {summary.businessProfile.sourceSummary}
            </p>
          </SectionShell>

          <SectionShell title="Buyer Memory" icon={Target}>
            <div className="space-y-3">
              {summary.recentProspects.length === 0 ? (
                <p className="text-[12px] font-medium text-[#697083]">No prospect memory yet.</p>
              ) : (
                <>
                  {pagedProspects.map((prospect) => (
                    <article key={getString(prospect, "id")} className="flex items-center justify-between gap-3 rounded-[8px] border border-[#edf0f6] bg-[#fbfcff] p-3">
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-extrabold text-black">
                          {getString(prospect, "instagram_username") || getString(prospect, "display_name") || "Instagram prospect"}
                        </p>
                        <p className="mt-1 truncate text-[11px] font-medium text-[#596175]">{getString(prospect, "last_intent", "No intent recorded")}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[13px] font-extrabold text-[#3044ff]">{getNumber(prospect, "last_confidence")}/100</p>
                        <p className="mt-1 text-[10px] font-semibold text-[#697083]">{getString(prospect, "readiness", "unknown")}</p>
                      </div>
                    </article>
                  ))}
                  <PaginationControls
                    page={sectionPages.buyerMemory}
                    totalItems={summary.recentProspects.length}
                    pageSize={rosPageSizes.buyerMemory}
                    onPageChange={(page) => setSectionPage("buyerMemory", page)}
                    label="buyer memory"
                  />
                </>
              )}
            </div>
          </SectionShell>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <SectionShell title="Decision Log" icon={BrainCircuit}>
            <div className="space-y-3">
              {summary.recentDecisions.length === 0 ? (
                <p className="text-[12px] font-medium text-[#697083]">No revenue decisions recorded yet.</p>
              ) : (
                <>
                  {pagedDecisions.map((decision) => (
                    <article key={getString(decision, "id")} className="rounded-[8px] border border-[#edf0f6] bg-[#fbfcff] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-[12px] font-extrabold leading-snug text-black">{getString(decision, "best_next_action", "Next action")}</h3>
                        <span className="rounded-full bg-[#eef4ff] px-2 py-0.5 text-[10px] font-extrabold text-[#3044ff]">{getNumber(decision, "confidence")}/100</span>
                      </div>
                      <p className="mt-2 text-[11px] font-medium leading-relaxed text-[#596175]">{getString(decision, "rationale", "No rationale stored.")}</p>
                      <p className="mt-2 text-[10px] font-semibold text-[#8a91a3]">{formatDate(decision.created_at)} · {getString(decision, "source", "ai_workflow")}</p>
                    </article>
                  ))}
                  <PaginationControls
                    page={sectionPages.decisionLog}
                    totalItems={summary.recentDecisions.length}
                    pageSize={rosPageSizes.decisionLog}
                    onPageChange={(page) => setSectionPage("decisionLog", page)}
                    label="decision log"
                  />
                </>
              )}
            </div>
          </SectionShell>

          <SectionShell title="Revenue Events" icon={CheckCircle2}>
            <div className="space-y-3">
              {summary.recentEvents.length === 0 ? (
                <p className="text-[12px] font-medium text-[#697083]">No conversion events recorded yet.</p>
              ) : (
                <>
                  {pagedEvents.map((event) => (
                    <article key={getString(event, "id")} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-[8px] border border-[#edf0f6] bg-[#fbfcff] p-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-[12px] font-extrabold text-black">{getString(event, "event_type", "conversion_event")}</h3>
                        <p className="mt-1 truncate text-[11px] font-medium text-[#596175]">{getString(event, "outcome_type", "outcome")}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[12px] font-extrabold text-[#0a8f3c]">{formatMoney(getNumber(event, "value"))}</p>
                        <p className="mt-1 text-[10px] font-semibold text-[#8a91a3]">{formatDate(event.occurred_at)}</p>
                      </div>
                    </article>
                  ))}
                  <PaginationControls
                    page={sectionPages.revenueEvents}
                    totalItems={summary.recentEvents.length}
                    pageSize={rosPageSizes.revenueEvents}
                    onPageChange={(page) => setSectionPage("revenueEvents", page)}
                    label="revenue events"
                  />
                </>
              )}
            </div>
          </SectionShell>
        </div>
      </div>
    </main>
  );
}
