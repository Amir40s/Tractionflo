"use client";

import { useEffect, useState } from "react";
import { getAdminDateRangeLabel, type AdminDateRangePreset } from "../admin/shared";
import { superAdminPageMeta } from "./config";
import { SuperAdminDetailPage } from "./DataPages";
import { SuperAdminHeader, SuperAdminMobileNavigation, SuperAdminSidebar } from "./Chrome";
import { SuperAdminOverviewPage } from "./OverviewPage";
import { SuperAdminProfilePage, SuperAdminSettingsPage } from "./ProfileSettingsPages";
import { getSuperAdminPageFromUrl, getSuperAdminUrl } from "./routing";
import type { AccountProfile, SuperAdminPage } from "./types";

export default function SuperAdminDashboard({
  profile,
  onProfileChange,
}: {
  profile: AccountProfile;
  onProfileChange: (profile: AccountProfile) => Promise<AccountProfile>;
}) {
  const [activePage, setActivePage] = useState<SuperAdminPage>("overview");
  const [dateRangePreset, setDateRangePreset] = useState<AdminDateRangePreset>("7d");
  const [isAutoRefreshOn, setIsAutoRefreshOn] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [exportStatus, setExportStatus] = useState("");

  useEffect(() => {
    const syncFromUrl = () => {
      setActivePage(getSuperAdminPageFromUrl());
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);

    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  function handlePageChange(page: SuperAdminPage) {
    setActivePage(page);

    if (typeof window !== "undefined") {
      window.history.pushState(null, "", getSuperAdminUrl(page));
    }
  }

  function handleDateRangeChange(preset: AdminDateRangePreset) {
    setDateRangePreset(preset);
    setRefreshKey((current) => current + 1);
  }

  function handleExport() {
    if (typeof document === "undefined") {
      return;
    }

    const pageTitle = superAdminPageMeta[activePage].title;
    const content = document.querySelector("[data-superadmin-content='true']");
    const tableRows = Array.from(content?.querySelectorAll("table tr") || []).map((row) =>
      Array.from(row.querySelectorAll("th, td")).map((cell) => cell.textContent?.replace(/\s+/g, " ").trim() || "")
    );
    const rows = tableRows.length > 0
      ? tableRows
      : [
          ["Page", pageTitle],
          ["Date range", getAdminDateRangeLabel(dateRangePreset)],
          ["Exported", new Date().toISOString()],
        ];
    const csv = rows
      .map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `tractionflo-${activePage}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    setExportStatus("Downloaded");
    window.setTimeout(() => setExportStatus(""), 1800);
  }

  useEffect(() => {
    if (!isAutoRefreshOn) {
      return;
    }

    const interval = window.setInterval(() => {
      setRefreshKey((current) => current + 1);
    }, 30000);

    return () => window.clearInterval(interval);
  }, [isAutoRefreshOn]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#f8f9fd] font-sans text-black">
      <SuperAdminSidebar activePage={activePage} onChangePage={handlePageChange} profile={profile} />

      <main className={`h-dvh flex-1 overflow-y-auto ${activePage === "overview" ? "bg-[#fdfdff]" : "px-4 pb-24 pt-5 sm:px-6 lg:px-7 lg:pb-8 xl:px-9"}`}>
        {activePage === "overview" ? (
          <SuperAdminOverviewPage
            refreshKey={refreshKey}
            profile={profile}
            dateRangePreset={dateRangePreset}
            onDateRangeChange={handleDateRangeChange}
            onNavigate={handlePageChange}
          />
        ) : (
          <div className="mx-auto max-w-[1440px]">
            <SuperAdminHeader
              page={activePage}
              dateRangePreset={dateRangePreset}
              isAutoRefreshOn={isAutoRefreshOn}
              exportStatus={exportStatus}
              onDateRangeChange={handleDateRangeChange}
              onAutoRefreshChange={setIsAutoRefreshOn}
              onExport={handleExport}
            />

            <div className="mt-6" data-superadmin-content="true">
              {activePage === "profile" ? (
                <SuperAdminProfilePage profile={profile} onProfileChange={onProfileChange} />
              ) : activePage === "settings" ? (
                <SuperAdminSettingsPage profile={profile} refreshKey={refreshKey} />
              ) : (
                <SuperAdminDetailPage page={activePage} refreshKey={refreshKey} />
              )}
            </div>
          </div>
        )}
      </main>

      <SuperAdminMobileNavigation activePage={activePage} onChangePage={handlePageChange} />
    </div>
  );
}
