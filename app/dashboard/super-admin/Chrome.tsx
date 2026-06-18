"use client";

import { CalendarDays, ChevronDown, ChevronRight, Download, LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { signout } from "../../login/actions";
import { adminDateRangeOptions, getAdminDateRangeLabel, type AdminDateRangePreset } from "../admin/shared";
import { superAdminNavGroups, superAdminPageMeta } from "./config";
import type { AccountProfile, SuperAdminPage } from "./types";

export function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-8 w-8">
        <div className="absolute left-0 top-0 h-2 w-7 rounded-full bg-gradient-to-r from-[#8156ff] to-[#3529ff]" />
        <div className="absolute left-[9px] top-[2px] h-6 w-2 rounded-full bg-gradient-to-b from-[#5d43ff] to-[#8b6dff]" />
        <div className="absolute right-0.5 top-[6px] h-2.5 w-2.5 rounded-full bg-[#8a70ff]" />
      </div>
      <span className="text-[20px] font-extrabold leading-none text-black">TractionFlo</span>
    </div>
  );
}

function SuperAdminBrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-8 w-8">
        <div className="absolute left-0 top-0 h-2 w-7 rounded-full bg-gradient-to-r from-[#8156ff] to-[#3529ff]" />
        <div className="absolute left-[9px] top-[2px] h-6 w-2 rounded-full bg-gradient-to-b from-[#5d43ff] to-[#8b6dff]" />
        <div className="absolute right-0.5 top-[6px] h-2.5 w-2.5 rounded-full bg-[#8a70ff]" />
      </div>
      <span className="text-[18px] font-extrabold leading-none text-white">TractionFlo</span>
      <span className="rounded-[5px] bg-[#5b38ff] px-2.5 py-1 text-[10px] font-extrabold text-white">Superadmin</span>
    </div>
  );
}

export function SuperAdminSidebar({
  activePage,
  onChangePage,
  profile,
}: {
  activePage: SuperAdminPage;
  onChangePage: (page: SuperAdminPage) => void;
  profile: AccountProfile;
}) {
  const initials = profile.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="sticky top-0 hidden h-screen min-h-screen w-[260px] shrink-0 flex-col overflow-hidden bg-[#071022] px-4 py-5 text-white lg:flex">
      <SuperAdminBrandMark />

      <nav className="mt-7 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
        {superAdminNavGroups.map((group) => {
          const Icon = group.icon;
          const isGroupActive =
            group.page === activePage || Boolean(group.children?.some((child) => child.page === activePage));

          if (group.page) {
            return (
              <button
                key={group.label}
                type="button"
                onClick={() => onChangePage(group.page!)}
                className={`flex h-11 items-center gap-3 rounded-[8px] px-3 text-left text-[13px] font-extrabold transition ${
                  isGroupActive ? "bg-[#5b38ff] text-white shadow-[0_16px_35px_rgba(91,56,255,0.28)]" : "text-[#cbd3e2] hover:bg-white/8"
                }`}
              >
                <Icon size={18} strokeWidth={2.35} />
                <span className="flex-1">{group.label}</span>
              </button>
            );
          }

          return (
            <div key={group.label} className="py-1">
              <div className={`flex h-9 items-center gap-3 px-3 text-[13px] font-extrabold ${isGroupActive ? "text-white" : "text-[#cbd3e2]"}`}>
                <Icon size={17} strokeWidth={2.25} />
                <span className="flex-1">{group.label}</span>
                <ChevronDown size={14} strokeWidth={2.4} />
              </div>
              <div className="ml-[21px] mt-1 border-l border-white/15 pl-4">
                {group.children?.map((child) => {
                  const isActive = child.page === activePage;

                  return (
                    <button
                      key={child.page}
                      type="button"
                      onClick={() => onChangePage(child.page)}
                      className={`block h-8 w-full rounded-[7px] px-2 text-left text-[12px] font-semibold transition ${
                        isActive ? "bg-white/12 text-white" : "text-[#9faac0] hover:bg-white/8 hover:text-white"
                      }`}
                    >
                      {child.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 space-y-3 pt-4">
        <button
          type="button"
          onClick={() => onChangePage("profile")}
          className={`flex h-[58px] w-full items-center gap-3 rounded-[10px] px-3 text-left transition ${
            activePage === "profile" ? "bg-[#5b38ff] shadow-[0_16px_35px_rgba(91,56,255,0.28)]" : "bg-white/6 hover:bg-white/10"
          }`}
        >
          {profile.avatarUrl ? (
            <span
              aria-label={profile.name}
              role="img"
              className="h-10 w-10 rounded-full bg-cover bg-center"
              style={{ backgroundImage: `url(${profile.avatarUrl})` }}
            />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-[11px] font-extrabold text-white">
              {initials || "SA"}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-extrabold text-white">{profile.name || "Super Admin"}</span>
            <span className="block truncate text-[11px] font-semibold text-[#9faac0]">Super Admin</span>
          </span>
          <ChevronRight size={15} className="text-[#9faac0]" strokeWidth={2.4} />
        </button>

        <form action={signout}>
          <button
            type="submit"
            className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-white/10 bg-white/5 px-3 text-[12px] font-extrabold text-[#ffd1dc] transition hover:bg-white/10"
          >
            <LogOut size={15} strokeWidth={2.35} />
            Logout
          </button>
        </form>
      </div>
    </aside>
  );
}

export function SuperAdminHeader({
  page,
  dateRangePreset,
  isAutoRefreshOn,
  exportStatus,
  onDateRangeChange,
  onAutoRefreshChange,
  onExport,
}: {
  page: SuperAdminPage;
  dateRangePreset: AdminDateRangePreset;
  isAutoRefreshOn: boolean;
  exportStatus?: string;
  onDateRangeChange: (preset: AdminDateRangePreset) => void;
  onAutoRefreshChange: (enabled: boolean) => void;
  onExport: () => void;
}) {
  const meta = superAdminPageMeta[page];
  const dateRangeLabel = getAdminDateRangeLabel(dateRangePreset);

  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div className="mb-4 lg:hidden">
          <BrandMark />
        </div>
        <h1 className="text-[32px] font-extrabold leading-none tracking-[-0.02em] text-black md:text-[38px]">
          {meta.title}
        </h1>
        <p className="mt-3 text-[13px] font-semibold text-[#596175]">{meta.subtitle}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="relative flex h-11 cursor-pointer items-center gap-3 rounded-[8px] border border-[#e0e4ef] bg-white px-4 text-[12px] font-extrabold text-black shadow-[0_12px_36px_rgba(20,28,53,0.035)]">
          <span>{dateRangeLabel}</span>
          <CalendarDays size={16} strokeWidth={2.3} />
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
        <label className="relative flex h-11 cursor-pointer items-center gap-2 rounded-[8px] border border-[#e0e4ef] bg-white px-4 text-[12px] font-extrabold text-black shadow-[0_12px_36px_rgba(20,28,53,0.035)]">
          <span className={`h-2.5 w-2.5 rounded-full ${isAutoRefreshOn ? "bg-[#13a84f]" : "bg-[#98a2b3]"}`} />
          Auto refresh: {isAutoRefreshOn ? "On" : "Off"}
          <ChevronDown size={14} strokeWidth={2.4} />
          <select
            aria-label="Auto refresh"
            value={isAutoRefreshOn ? "on" : "off"}
            onChange={(event) => onAutoRefreshChange(event.target.value === "on")}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            <option value="on">Auto refresh on</option>
            <option value="off">Auto refresh off</option>
          </select>
        </label>
        <button
          type="button"
          onClick={onExport}
          className="flex h-11 items-center gap-2 rounded-[8px] bg-[#5b38ff] px-4 text-[12px] font-extrabold text-white shadow-[0_16px_35px_rgba(91,56,255,0.22)]"
        >
          <Download size={15} strokeWidth={2.4} />
          {exportStatus || "Export"}
        </button>
      </div>
    </header>
  );
}

export function SuperAdminMobileNavigation({
  activePage,
  onChangePage,
}: {
  activePage: SuperAdminPage;
  onChangePage: (page: SuperAdminPage) => void;
}) {
  const mobileItems = superAdminNavGroups.filter((group): group is { label: string; icon: LucideIcon; page: SuperAdminPage } =>
    Boolean(group.page)
  );

  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-2 rounded-[14px] border border-[#17213a] bg-[#071022]/95 p-1.5 shadow-[0_18px_60px_rgba(20,28,53,0.28)] backdrop-blur lg:hidden">
      {mobileItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.page === activePage;

        return (
          <button
            key={item.page}
            type="button"
            onClick={() => onChangePage(item.page)}
            className={`flex h-12 items-center justify-center gap-2 rounded-[10px] text-[11px] font-extrabold transition ${
              isActive ? "bg-[#5b38ff] text-white" : "text-[#cbd3e2]"
            }`}
          >
            <Icon size={16} strokeWidth={2.4} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
