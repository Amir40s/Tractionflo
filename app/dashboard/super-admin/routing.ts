import type { SuperAdminPage } from "./types";

const superAdminPageIds: SuperAdminPage[] = [
  "overview",
  "creators-connected",
  "creators-trials",
  "creators-churn",
  "revenue-subscriptions",
  "revenue-payments",
  "revenue-refunds",
  "platform-instagram",
  "platform-api",
  "platform-queue",
  "ai-integration",
  "ai-usage",
  "ai-costs",
  "ai-escalations",
  "support-tickets",
  "support-issues",
  "profile",
  "settings",
];

function isSuperAdminPage(value: string | null): value is SuperAdminPage {
  return Boolean(value && superAdminPageIds.includes(value as SuperAdminPage));
}

export function getSuperAdminPageFromUrl(): SuperAdminPage {
  if (typeof window === "undefined") {
    return "overview";
  }

  const pathname = window.location.pathname;
  const page = new URLSearchParams(window.location.search).get("admin");

  if (isSuperAdminPage(page)) {
    return page;
  }

  if (pathname === "/settings") {
    return "settings";
  }

  return "overview";
}

export function getSuperAdminUrl(page: SuperAdminPage) {
  return page === "overview" ? "/dashboard" : `/dashboard?admin=${page}`;
}
