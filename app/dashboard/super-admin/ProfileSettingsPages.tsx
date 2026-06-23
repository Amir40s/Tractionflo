"use client";

import { useCallback, useEffect, useState } from "react";
import { BrainCircuit, Code2, CreditCard, Database, Globe2, Mail, RefreshCw, Shield, UploadCloud } from "lucide-react";
import { SettingsAccountCard } from "../SettingsPage";
import {
  creatorSettingsAccessChangedEvent,
  creatorSettingsAccessMenuItems,
  creatorSettingsAccessStorageKey,
  normalizeCreatorSettingsAccess,
  readCreatorSettingsAccess,
  saveCreatorSettingsAccess,
  type CreatorSettingsAccessId,
  type CreatorSettingsAccessState,
} from "../settings-state";
import { formatAdminNumber, readDashboardJsonResponse, statusToneClasses } from "../admin/shared";
import type { AccountProfile, SuperAdminPlatformResponse } from "./types";

export function SuperAdminProfilePage({
  profile,
  onProfileChange,
}: {
  profile: AccountProfile;
  onProfileChange: (profile: AccountProfile) => Promise<AccountProfile>;
}) {
  const initials = profile.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <SettingsAccountCard profile={profile} onProfileChange={onProfileChange} defaultEditing />

      <aside className="space-y-4">
        <section className="rounded-[9px] border border-[#e7eaf2] bg-white p-5 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <h2 className="text-[17px] font-extrabold text-black">Profile preview</h2>
          <div className="mt-5 flex items-center gap-4">
            {profile.avatarUrl ? (
              <span
                aria-label={profile.name}
                role="img"
                className="h-16 w-16 shrink-0 rounded-full bg-cover bg-center shadow-[0_16px_34px_rgba(20,28,53,0.08)]"
                style={{ backgroundImage: `url(${profile.avatarUrl})` }}
              />
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-[16px] font-extrabold text-white shadow-[0_16px_34px_rgba(124,58,237,0.18)]">
                {initials || "SA"}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[16px] font-extrabold text-black">{profile.name || "Super Admin"}</p>
              <p className="mt-1 truncate text-[12px] font-semibold text-[#596175]">{profile.email}</p>
              <span className="mt-2 inline-flex rounded-full bg-[#f0edff] px-2.5 py-1 text-[10px] font-extrabold text-[#4b3cff]">
                Superadmin
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-[9px] border border-[#e7eaf2] bg-white p-5 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#f0edff] text-[#4b3cff]">
            <UploadCloud size={20} strokeWidth={2.4} />
          </span>
          <h2 className="mt-4 text-[17px] font-extrabold text-black">Cloudinary uploads</h2>
          <p className="mt-2 text-[12px] font-semibold leading-relaxed text-[#596175]">
            Profile images are resized to a square WebP before upload, then saved as Cloudinary URLs in your Supabase profile metadata.
          </p>
        </section>

        <section className="rounded-[9px] border border-[#e7eaf2] bg-white p-5 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#eafaf0] text-[#13a84f]">
            <Shield size={20} strokeWidth={2.4} />
          </span>
          <h2 className="mt-4 text-[17px] font-extrabold text-black">Superadmin access</h2>
          <p className="mt-2 text-[12px] font-semibold leading-relaxed text-[#596175]">
            This profile controls the superadmin sidebar identity and dashboard account details.
          </p>
        </section>
      </aside>
    </div>
  );
}

function SuperAdminAccessSwitch({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-[86px] shrink-0 rounded-full text-[10px] font-extrabold transition ${
        checked ? "bg-[#5b38ff] text-white shadow-[0_12px_24px_rgba(91,56,255,0.2)]" : "bg-[#e8edf6] text-[#596175]"
      }`}
    >
      <span className={`absolute top-1/2 -translate-y-1/2 ${checked ? "left-3" : "right-3"}`}>{checked ? "Shown" : "Hidden"}</span>
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${checked ? "right-1" : "left-1"}`} />
    </button>
  );
}

export function SuperAdminSettingsPage({ profile, refreshKey = 0 }: { profile: AccountProfile; refreshKey?: number }) {
  const [platformData, setPlatformData] = useState<SuperAdminPlatformResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [creatorSettingsAccess, setCreatorSettingsAccess] = useState<CreatorSettingsAccessState>(readCreatorSettingsAccess);
  const [accessMessage, setAccessMessage] = useState("");

  const loadPlatformStatus = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin/platform", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const payload = await readDashboardJsonResponse<SuperAdminPlatformResponse>(response, "Could not load platform settings");

      setPlatformData(payload);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load platform settings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialPlatformStatus() {
      try {
        const response = await fetch("/api/admin/platform", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const payload = await readDashboardJsonResponse<SuperAdminPlatformResponse>(response, "Could not load platform settings");

        if (isMounted) {
          setPlatformData(payload);
          setErrorMessage("");
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Could not load platform settings");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialPlatformStatus();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    function syncCreatorSettingsAccess() {
      setCreatorSettingsAccess(readCreatorSettingsAccess());
    }

    function handleCreatorSettingsAccessChange(event: Event) {
      setCreatorSettingsAccess(normalizeCreatorSettingsAccess((event as CustomEvent<CreatorSettingsAccessState>).detail));
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === creatorSettingsAccessStorageKey) {
        syncCreatorSettingsAccess();
      }
    }

    window.addEventListener(creatorSettingsAccessChangedEvent, handleCreatorSettingsAccessChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(creatorSettingsAccessChangedEvent, handleCreatorSettingsAccessChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  function updateCreatorSettingsAccess(id: CreatorSettingsAccessId, enabled: boolean) {
    const nextAccess = {
      ...creatorSettingsAccess,
      [id]: enabled,
    };

    setCreatorSettingsAccess(nextAccess);
    saveCreatorSettingsAccess(nextAccess);
    setAccessMessage(`${creatorSettingsAccessMenuItems.find((item) => item.id === id)?.label || "Setting"} ${enabled ? "shown" : "hidden"} in creator Settings.`);
    window.setTimeout(() => setAccessMessage(""), 1800);
  }

  const metrics = platformData?.metrics;
  const workspaceFields = [
    ["Workspace name", "TractionFlo"],
    ["Admin email", profile.email],
    ["Default timezone", profile.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone],
    ["Language", profile.language || "English"],
    ["Billing currency", profile.currency || "USD ($)"],
    ["Access level", profile.isSuperAdmin ? "Super Admin" : profile.role || "Admin"],
  ];
  const integrationStatusItems = [
    {
      title: "Meta ecosystem",
      detail: isLoading && !metrics ? "Checking Facebook and Instagram config" : `${formatAdminNumber(metrics?.instagramAccounts)} Instagram accounts`,
      connected: Boolean(metrics?.metaConfigured && metrics?.webhookConfigured),
      icon: Globe2,
    },
    {
      title: "OpenAI API",
      detail: "AI replies and qualification",
      connected: Boolean(metrics?.openAiConfigured),
      icon: BrainCircuit,
    },
    {
      title: "Email service",
      detail: "Operational notifications",
      connected: Boolean(metrics?.emailConfigured),
      icon: Mail,
    },
    {
      title: "Stripe payments",
      detail: "Checkout and subscription billing",
      connected: Boolean(metrics?.paymentConfigured),
      icon: CreditCard,
    },
    {
      title: "Database",
      detail: isLoading && !metrics ? "Checking Supabase" : `${metrics?.databaseLatencyMs || 0}ms latest check`,
      connected: Boolean(metrics?.databaseHealthy),
      icon: Database,
    },
    {
      title: "Webhook endpoint",
      detail: "Meta callback verification",
      connected: Boolean(metrics?.webhookConfigured),
      icon: Code2,
    },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <section className="rounded-[9px] border border-[#e7eaf2] bg-white p-5 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <h2 className="text-[17px] font-extrabold text-black">Workspace settings</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {workspaceFields.map(([label, value]) => (
              <label key={label} className="block">
                <span className="text-[12px] font-extrabold text-[#46506a]">{label}</span>
                <input
                  readOnly
                  value={value}
                  className="mt-2 h-12 w-full rounded-[8px] border border-[#dfe4ee] bg-[#f9faff] px-3 text-[13px] font-bold text-black outline-none"
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void loadPlatformStatus()}
            disabled={isLoading}
            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#5b38ff] px-4 text-[13px] font-extrabold text-white shadow-[0_16px_35px_rgba(91,56,255,0.22)]"
          >
            <RefreshCw size={16} strokeWidth={2.4} className={isLoading ? "animate-spin" : ""} />
            Refresh settings status
          </button>
          {errorMessage && (
            <div className="mt-4 rounded-[8px] border border-[#ffd2da] bg-[#fff6f8] p-3 text-[12px] font-bold text-[#df405b]">
              {errorMessage}
            </div>
          )}
        </section>

        <section className="rounded-[9px] border border-[#e7eaf2] bg-white p-5 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-[17px] font-extrabold text-black">Creator settings menu</h2>
              <p className="mt-2 text-[12px] font-semibold leading-relaxed text-[#596175]">
                Control which restricted settings pages appear in the creator Settings sidebar.
              </p>
            </div>
            <span className="inline-flex h-8 items-center rounded-[8px] bg-[#f0edff] px-3 text-[11px] font-extrabold text-[#4b3cff]">
              Superadmin controlled
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            {creatorSettingsAccessMenuItems.map((item) => {
              const Icon = item.icon;
              const isVisible = creatorSettingsAccess[item.id];

              return (
                <div key={item.id} className="flex items-center gap-4 rounded-[9px] border border-[#eef1f7] bg-[#fbfcff] p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#f0edff] text-[#4b3cff]">
                    <Icon size={18} strokeWidth={2.35} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[14px] font-extrabold text-black">{item.label}</h3>
                    <p className="mt-1 text-[12px] font-semibold leading-relaxed text-[#596175]">{item.detail}</p>
                  </div>
                  <SuperAdminAccessSwitch
                    ariaLabel={`${isVisible ? "Hide" : "Show"} ${item.label} in creator Settings`}
                    checked={isVisible}
                    onChange={(enabled) => updateCreatorSettingsAccess(item.id, enabled)}
                  />
                </div>
              );
            })}
          </div>

          {accessMessage && (
            <p className="mt-4 rounded-[8px] bg-[#f6f7fb] px-3 py-2 text-[12px] font-bold text-[#46506a]">{accessMessage}</p>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        {integrationStatusItems.map((item) => {
          const Icon = item.icon;
          const tone = isLoading && !metrics
            ? "bg-[#f0edff] text-[#4b3cff]"
            : item.connected
              ? "bg-[#eafaf0] text-[#13a84f]"
              : "bg-[#fff4df] text-[#c07800]";
          const status = isLoading && !metrics ? "Checking" : item.connected ? "Connected" : "Not configured";

          return (
            <article key={item.title} className="rounded-[9px] border border-[#e7eaf2] bg-white p-4 shadow-[0_16px_44px_rgba(20,28,53,0.035)]">
              <div className="flex items-start gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${tone}`}>
                  <Icon size={18} strokeWidth={2.35} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-extrabold text-black">{item.title}</h3>
                  <p className="mt-1 text-[12px] font-semibold leading-relaxed text-[#596175]">{item.detail}</p>
                </div>
              </div>
              <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold ${item.connected ? statusToneClasses.green : isLoading && !metrics ? statusToneClasses.purple : statusToneClasses.amber}`}>
                {status}
              </span>
            </article>
          );
        })}
      </aside>
    </div>
  );
}
