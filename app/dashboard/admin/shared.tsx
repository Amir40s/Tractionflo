"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, MoreHorizontal, TrendingUp } from "lucide-react";

export type SuperAdminMetric = {
  label: string;
  value: string;
  detail: string;
  change: string;
  tone: string;
  icon: LucideIcon;
};

export type SuperAdminTableRow = {
  name: string;
  detail: string;
  values: string[];
  status: string;
  statusTone: "green" | "amber" | "red" | "purple";
};

export type SuperAdminDetailConfig = {
  metrics: SuperAdminMetric[];
  columns: string[];
  rows: SuperAdminTableRow[];
  insightTitle: string;
  insightItems: { label: string; value: string; detail: string; tone: string; icon: LucideIcon }[];
};

const superAdminTablePageSize = 10;

export type AdminDateRangePreset = "7d" | "30d" | "90d";

export const adminDateRangeOptions: { value: AdminDateRangePreset; label: string; days: number }[] = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
];

export async function readDashboardJsonResponse<T extends { error?: string }>(response: Response, fallbackMessage: string): Promise<T> {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.toLowerCase().includes("application/json")) {
    const body = await response.text().catch(() => "");
    const lowerBody = body.toLowerCase();
    const redirectedToLogin = response.redirected || response.url.includes("/login") || lowerBody.includes("<!doctype");

    throw new Error(redirectedToLogin ? "Your session expired. Please sign in again." : fallbackMessage);
  }

  const payload = (await response.json()) as T;

  if (!response.ok || payload.error) {
    throw new Error(payload.error || fallbackMessage);
  }

  return payload;
}

export const statusToneClasses = {
  green: "bg-[#e8f8ed] text-[#0a9b3f]",
  amber: "bg-[#fff4df] text-[#c07800]",
  red: "bg-[#fff0f3] text-[#df405b]",
  purple: "bg-[#f0edff] text-[#4b3cff]",
};

export function CreatorDateRangeSelect({
  dateRangePreset,
  onDateRangeChange,
  className = "",
}: {
  dateRangePreset: AdminDateRangePreset;
  onDateRangeChange: (preset: AdminDateRangePreset) => void;
  className?: string;
}) {
  return (
    <label
      className={`relative flex min-w-0 cursor-pointer items-center gap-3 rounded-[8px] border border-[#e0e4ef] bg-white text-[12px] font-extrabold text-black shadow-[0_12px_36px_rgba(20,28,53,0.025)] ${className}`}
    >
      <CalendarDays size={16} strokeWidth={2.4} className="shrink-0 text-[#1f2937]" />
      <span className="min-w-0 truncate">{getAdminDateRangeLabel(dateRangePreset)}</span>
      <ChevronDown size={15} strokeWidth={2.4} className="ml-auto shrink-0 text-[#1f2937]" />
      <select
        aria-label="Dashboard date range"
        value={dateRangePreset}
        onChange={(event) => onDateRangeChange(event.target.value as AdminDateRangePreset)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {adminDateRangeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SuperAdminMetricCard({ metric }: { metric: SuperAdminMetric }) {
  const Icon = metric.icon;

  return (
    <article className="rounded-[8px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
      <div className="flex items-start gap-3">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] ${metric.tone}`}>
          <Icon size={22} strokeWidth={2.35} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-[#687089]">{metric.label}</p>
          <p className="mt-1 text-[24px] font-extrabold leading-none text-black">{metric.value}</p>
          <p className="mt-2 text-[11px] font-semibold text-[#687089]">{metric.detail}</p>
        </div>
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-[11px] font-extrabold text-[#13a84f]">
        <TrendingUp size={13} strokeWidth={2.4} />
        {metric.change}
      </p>
    </article>
  );
}

export function AdminLineChart({ bars = false, values }: { bars?: boolean; values?: number[] }) {
  if (bars) {
    const chartValues = values?.length ? values : [14, 34, 11, 28, 16, 38, 19, 26, 51, 18, 13, 45, 24, 31, 55, 20, 36, 27, 48, 62];
    const maxValue = Math.max(...chartValues, 1);

    return (
      <div className="flex h-[190px] items-end gap-2 rounded-[8px] bg-[#fbfbff] px-4 pb-5 pt-3">
        {chartValues.map((value, index) => (
          <span
            key={`${value}-${index}`}
            className="flex-1 rounded-t-[5px] bg-gradient-to-t from-[#5b38ff] to-[#9a89ff]"
            style={{ height: `${Math.max(8, (value / maxValue) * 160)}px` }}
          />
        ))}
      </div>
    );
  }

  const chartValues = values?.length ? values : [102000, 112000, 118000, 124000, 138000, 156000, 174000, 188000, 198000, 216928];
  const maxValue = Math.max(...chartValues, 1);
  const minValue = Math.min(...chartValues);
  const range = Math.max(1, maxValue - minValue);
  const width = 640;
  const height = 230;
  const points = chartValues.map((value, index) => {
    const x = chartValues.length === 1 ? width / 2 : 24 + (index / (chartValues.length - 1)) * (width - 48);
    const y = height - 35 - ((value - minValue) / range) * 155;
    return { x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L ${points[points.length - 1]?.x.toFixed(1) || width - 24} 220 L ${points[0]?.x.toFixed(1) || 24} 220 Z`;

  return (
    <div className="relative h-[230px] rounded-[8px] bg-[#fbfbff]">
      <svg viewBox="0 0 640 230" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id="adminMrrFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#5b38ff" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#5b38ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#adminMrrFill)" />
        <path d={path} fill="none" stroke="#5b38ff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        {points.map((point) => (
          <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r="4" fill="#5b38ff" />
        ))}
      </svg>
    </div>
  );
}

export function AdminDonut({
  label,
  value,
  segments,
}: {
  label: string;
  value: string;
  segments?: { value: number; color: string }[];
}) {
  const total = segments?.reduce((sum, segment) => sum + segment.value, 0) || 0;
  let cursor = 0;
  const background = total > 0 && segments?.length
    ? `conic-gradient(${segments
        .map((segment) => {
          const start = cursor;
          const end = cursor + (segment.value / total) * 100;
          cursor = end;
          return `${segment.color} ${start}% ${end}%`;
        })
        .join(", ")})`
    : "conic-gradient(#e9edf5 0 100%)";

  return (
    <div className="flex items-center justify-center py-4">
      <div
        className="relative flex h-[154px] w-[154px] items-center justify-center rounded-full"
        style={{ background }}
      >
        <div className="flex h-[92px] w-[92px] flex-col items-center justify-center rounded-full bg-white">
          <span className="text-[24px] font-extrabold text-black">{value}</span>
          <span className="text-[11px] font-semibold text-[#687089]">{label}</span>
        </div>
      </div>
    </div>
  );
}

export function formatAdminNumber(value?: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

export function formatAdminCurrency(value?: number, compact = false) {
  if (compact && value && value >= 1000000) {
    return `$${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`;
  }

  return `$${formatAdminNumber(value || 0)}`;
}

export function formatAdminMoneyPrecise(value?: number, decimals = 2) {
  const amount = value || 0;

  if (amount === 0) {
    return "$0";
  }

  return `$${amount.toFixed(decimals)}`;
}

export function formatAdminTrackedSpend(value?: number) {
  const amount = value || 0;

  if (amount > 0 && amount < 0.01) {
    return formatAdminMoneyPrecise(amount, 4);
  }

  return amount > 0 ? formatAdminMoneyPrecise(amount) : "$0";
}

export function formatAdminTokenVolume(value?: number) {
  const tokens = value || 0;

  if (tokens >= 1000000000) {
    return `${(tokens / 1000000000).toFixed(1)}B`;
  }

  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(tokens >= 10000000 ? 0 : 1)}M`;
  }

  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(tokens >= 10000 ? 0 : 1)}K`;
  }

  return formatAdminNumber(tokens);
}

function getAdminRangeOption(preset: AdminDateRangePreset) {
  return adminDateRangeOptions.find((option) => option.value === preset) || adminDateRangeOptions[0];
}

export function getAdminDateRangeLabel(preset: AdminDateRangePreset = "7d") {
  const range = getAdminRangeOption(preset);
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - (range.days - 1));

  return `${startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} - ${endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export function getAdminRangeLabel(preset: AdminDateRangePreset) {
  return getAdminRangeOption(preset).label;
}

export function formatAdminPercent(value: number, total: number) {
  if (total <= 0) {
    return "0%";
  }

  return `${((value / total) * 100).toFixed(1)}%`;
}

export function getPlatformHealthToneClass(tone: "green" | "amber" | "red" | "purple") {
  if (tone === "green") {
    return "text-[#13a84f]";
  }

  if (tone === "red") {
    return "text-[#df405b]";
  }

  if (tone === "purple") {
    return "text-[#4b3cff]";
  }

  return "text-[#c07800]";
}

function SuperAdminPagination({
  page,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, page * pageSize);
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1).filter((pageNumber) => {
    if (totalPages <= 5) {
      return true;
    }

    return pageNumber === 1 || pageNumber === totalPages || Math.abs(pageNumber - page) <= 1;
  });

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-[#edf0f6] pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[12px] font-bold text-[#46506a]">
        Showing {formatAdminNumber(startItem)}-{formatAdminNumber(endItem)} of {formatAdminNumber(totalItems)} records
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="flex h-9 items-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold text-[#30384d] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronLeft size={14} strokeWidth={2.4} />
          Previous
        </button>
        {pageNumbers.map((pageNumber, index) => {
          const previousPageNumber = pageNumbers[index - 1];
          const hasGap = typeof previousPageNumber === "number" && pageNumber - previousPageNumber > 1;

          return (
            <span key={pageNumber} className="flex items-center gap-2">
              {hasGap ? <span className="text-[12px] font-extrabold text-[#8a92a6]">...</span> : null}
              <button
                type="button"
                onClick={() => onPageChange(pageNumber)}
                className={`flex h-9 min-w-9 items-center justify-center rounded-[8px] px-3 text-[12px] font-extrabold ${
                  pageNumber === page
                    ? "bg-[#3044ff] text-white shadow-[0_12px_28px_rgba(48,68,255,0.22)]"
                    : "border border-[#e0e4ef] bg-white text-[#30384d]"
                }`}
              >
                {pageNumber}
              </button>
            </span>
          );
        })}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="flex h-9 items-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-3 text-[12px] font-extrabold text-[#30384d] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Next
          <ChevronRight size={14} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}

export function SuperAdminTable({ config }: { config: SuperAdminDetailConfig }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(config.rows.length / superAdminTablePageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * superAdminTablePageSize;
  const visibleRows = config.rows.slice(startIndex, startIndex + superAdminTablePageSize);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[12px]">
          <thead className="border-b border-[#edf0f6] text-[10px] uppercase text-[#687089]">
            <tr>
              <th className="py-3 font-extrabold">Name</th>
              {config.columns.map((column) => (
                <th key={column} className="py-3 font-extrabold">{column}</th>
              ))}
              <th className="py-3 font-extrabold">Status</th>
              <th className="py-3 text-right font-extrabold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr key={`${row.name}-${startIndex + rowIndex}`} className="border-b border-[#edf0f6] last:border-b-0">
                <td className="py-4">
                  <p className="font-extrabold text-black">{row.name}</p>
                  <p className="mt-1 text-[11px] font-semibold text-[#687089]">{row.detail}</p>
                </td>
                {row.values.map((value, index) => (
                  <td key={`${row.name}-${startIndex + rowIndex}-${index}`} className="py-4 font-bold text-[#30384d]">{value}</td>
                ))}
                <td className="py-4">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${statusToneClasses[row.statusTone]}`}>
                    {row.status}
                  </span>
                </td>
                <td className="py-4 text-right">
                  <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#e0e4ef] text-black">
                    <MoreHorizontal size={16} strokeWidth={2.4} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SuperAdminPagination
        page={safePage}
        totalItems={config.rows.length}
        pageSize={superAdminTablePageSize}
        onPageChange={setPage}
      />
    </div>
  );
}
