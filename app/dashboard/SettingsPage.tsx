"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bell,
  Bookmark,
  Bot,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Crown,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  LogOut,
  MessageSquare,
  PencilLine,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Shield,
  ShoppingCart,
  Sparkles,
  Target,
  Trash2,
  TriangleAlert,
  UploadCloud,
  X,
  Zap,
} from "lucide-react";
import NotificationBell from "../components/NotificationBell";
import { signout } from "../login/actions";
import {
  openAiModelOptions,
  type AiIntegrationSettings,
  type AiWorkflowRunResult,
  type AiWorkflowSetting,
} from "@/lib/ai-integration";
import {
  pagePermissionOptions,
  type AgentStatus,
  type PagePermissionId,
} from "@/lib/agent-permissions";
import {
  dispatchEscalationRulesChanged,
  normalizeEscalationRuleSettings,
  type EscalationRuleSetting,
} from "@/lib/conversation-escalation";
import {
  dispatchNotificationPreferencesChanged,
  getDefaultNotificationValue,
  getNotificationOptions,
  normalizeNotificationSettings,
  type NotificationSetting,
} from "@/lib/notification-preferences";
import {
  dispatchQuickRepliesChanged,
  dispatchSavedRepliesChanged,
  dispatchWelcomeMessageChanged,
  normalizeQuickReplies,
  normalizeSavedReplies,
  normalizeWelcomeMessage,
  type QuickReplySetting,
  type SavedReplySetting,
  type WelcomeMessageSetting,
} from "@/lib/quick-replies";
import {
  getVisibleSettingsMenuItems,
  notificationVisuals,
  readStoredSettingsState,
  ruleVisuals,
  settingsMenuItems,
  settingsStateStorageKey,
  type AiSettings,
  type ApiSettings,
  type AppSettingsState,
  type BillingSettings,
  type BookingIntegrationSettings,
  type BookingSheetRoute,
  type BrandSettings,
  type BrowserNotificationPermission,
  type PricingPlan,
  type PricingResponse,
  type SecuritySettings,
  type SettingsSection,
} from "./settings-state";
import {
  normalizeRevenueOutcomeProviderSettings,
  type RevenueOutcomeProviderConfig,
  type RevenueOutcomeProviderSettings,
} from "@/lib/revenue-outcome-providers";

type AccountProfile = {
  name: string;
  email: string;
  role: string;
  avatarUrl: string;
  timeZone: string;
  language: string;
  currency: string;
  accountId: string;
  isSuperAdmin: boolean;
  isAgent: boolean;
  allowedPages: PagePermissionId[];
  assignedConversationIds: string[];
  humanEscalation: boolean;
};

type ConnectedInstagramAccount = {
  id: string;
  username?: string;
  name?: string;
  connectedAt?: string;
};

type InstagramSettingsMessage = {
  id: string;
  text: string;
  attachments?: {
    type: string;
    url: string;
    preview_url?: string;
    name?: string;
  }[];
  from: "me" | "user" | "note";
  sender_name?: string;
  sender_id?: string;
  time: string;
};

type InstagramSettingsConversation = {
  id: string;
  participant: {
    id: string;
    name?: string;
    username?: string;
    profile_pic?: string;
  };
  updated_time?: string;
  messages: InstagramSettingsMessage[];
};

type InstagramConversationsResponse = {
  conversations?: InstagramSettingsConversation[];
  conversation_count?: number;
  ig_user_id?: string;
  account?: ConnectedInstagramAccount | null;
  error?: string;
};

type AgentAccount = {
  id: string;
  name: string;
  email: string;
  status: AgentStatus;
  allowedPages: PagePermissionId[];
  assignedConversationIds: string[];
  humanEscalation: boolean;
  createdAt?: string;
  lastSignInAt?: string;
};

type AgentsResponse = {
  agents?: AgentAccount[];
  agent?: AgentAccount;
  error?: string;
};

const defaultProfileFallback = {
  name: "TractionFlo user",
  email: "",
  role: "Creator",
};

function SettingsBrandMark() {
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

function LogoutButton() {
  return (
    <form action={signout}>
      <button
        type="submit"
        className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-[#ffd5dd] bg-[#fff7f9] px-3 text-[12px] font-extrabold text-[#df405b] shadow-[0_14px_28px_rgba(223,64,91,0.06)] transition hover:bg-[#fff0f3]"
      >
        <LogOut size={15} strokeWidth={2.35} />
        Logout
      </button>
    </form>
  );
}

function InstagramLogoTile() {
  return (
    <div className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-tr from-[#ffbd00] via-[#ff2d85] to-[#6d3cff] shadow-[0_14px_26px_rgba(255,61,129,0.2)]">
      <div className="h-[31px] w-[31px] rounded-[9px] border-[3px] border-white" />
      <div className="absolute h-[12px] w-[12px] rounded-full border-[3px] border-white" />
      <div className="absolute right-[14px] top-[14px] h-[5px] w-[5px] rounded-full bg-white" />
    </div>
  );
}

export function SettingsSelect({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`h-9 min-w-0 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[11px] font-extrabold text-black outline-none transition focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10 ${className}`}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

export function SettingsToggle({
  checked,
  onChange,
  ariaLabel,
  showStateLabel = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
  showStateLabel?: boolean;
}) {
  const stateLabel = checked ? "Active" : "Inactive";

  return (
    <button
      type="button"
      aria-pressed={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 rounded-full transition focus:outline-none focus:ring-2 focus:ring-[#3044ff]/15 ${
        showStateLabel ? "h-7 w-[106px]" : "h-[22px] w-10"
      } ${checked ? "bg-[#3044ff] shadow-[0_10px_18px_rgba(48,68,255,0.22)]" : "bg-[#dfe4f1]"} ${
        showStateLabel && !checked ? "hover:bg-[#d5dbea]" : ""
      }`}
    >
      {showStateLabel ? (
        <span
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-[10px] font-extrabold leading-none ${
            checked ? "left-3 text-white" : "right-2.5 text-[#536079]"
          }`}
        >
          {stateLabel}
        </span>
      ) : null}
      <span
        className={`absolute rounded-full bg-white transition ${
          showStateLabel
            ? `top-1/2 h-5 w-5 -translate-y-1/2 ${checked ? "right-1" : "left-1"}`
            : `top-0.5 h-[18px] w-[18px] ${checked ? "right-0.5" : "left-0.5"}`
        }`}
      />
    </button>
  );
}

function SettingsMenuCard({
  activeSection,
  onSectionChange,
  profile,
}: {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  profile: AccountProfile;
}) {
  const visibleMenuItems = getVisibleSettingsMenuItems(profile);

  return (
    <aside className="self-start rounded-[12px] border border-[#e5e8f0] bg-white p-3 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <div className="space-y-1">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeSection;

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onSectionChange(item.id)}
              className={`flex min-h-[58px] w-full items-center gap-3 rounded-[9px] px-3 text-left transition ${
                isActive ? "bg-[#f0edff] text-[#3044ff]" : "text-black hover:bg-[#f8f9fc]"
              }`}
            >
              <Icon size={17} strokeWidth={isActive ? 2.45 : 2.15} className="shrink-0" />
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-[12px] font-extrabold ${isActive ? "text-[#3044ff]" : "text-black"}`}>
                  {item.label}
                </span>
                <span className="mt-1 block truncate text-[11px] font-medium text-[#46506a]">{item.detail}</span>
              </span>
              <ChevronRight size={15} strokeWidth={2.35} className="shrink-0 text-black" />
            </button>
          );
        })}
      </div>
      <div className="mt-3 border-t border-[#edf0f6] pt-3 lg:hidden">
        <LogoutButton />
      </div>
    </aside>
  );
}

const timeZoneOptions = [
  "(GMT-8) Pacific Time",
  "(GMT-6) Central Time",
  "(GMT-5) Eastern Time",
  "(GMT+0) Greenwich Mean Time",
  "(GMT+1) Central European Time",
  "(GMT+5) Pakistan Time",
];

const languageOptions = ["English", "Spanish", "French", "German", "Urdu", "Arabic"];
const currencyOptions = ["USD ($)", "EUR (€)", "GBP (£)", "PKR (₨)", "AED (د.إ)"];

async function uploadProfileImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file.");
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Choose an image smaller than 8MB.");
  }

  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("/api/auth/profile/image", {
    method: "POST",
    body: formData,
  });
  const payload = (await response.json()) as {
    url?: string;
    originalBytes?: number;
    compressedBytes?: number;
    error?: string;
  };

  if (!response.ok || payload.error || !payload.url) {
    throw new Error(payload.error || "Could not upload image");
  }

  return {
    ...payload,
    url: payload.url,
  };
}

export function SettingsAccountCard({
  profile,
  onProfileChange,
  defaultEditing = false,
}: {
  profile: AccountProfile;
  onProfileChange: (profile: AccountProfile) => Promise<AccountProfile>;
  defaultEditing?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(defaultEditing);
  const [draft, setDraft] = useState<AccountProfile>(profile);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [imageUploadMessage, setImageUploadMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rows = [
    ["Time zone", profile.timeZone],
    ["Language", profile.language],
    ["Currency", profile.currency],
  ];

  const initials = profile.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function openEditor() {
    setDraft(profile);
    setIsEditing(true);
  }

  function updateDraft(key: keyof AccountProfile, value: string) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleProfileImageUpload(file: File | undefined) {
    if (!file) {
      return;
    }

    setSaveError("");
    setImageUploadMessage("Compressing and uploading image...");

    try {
      const upload = await uploadProfileImage(file);

      updateDraft("avatarUrl", upload.url);
      const savedBytes = Math.max(0, (upload.originalBytes || 0) - (upload.compressedBytes || 0));
      setImageUploadMessage(savedBytes > 0 ? "Image compressed, uploaded, and ready to save." : "Image uploaded and ready to save.");
    } catch (error) {
      setImageUploadMessage("");
      setSaveError(error instanceof Error ? error.message : "Could not upload image");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function saveProfile() {
    setIsSaving(true);
    setSaveMessage("");
    setSaveError("");

    try {
      const updatedProfile = await onProfileChange({
        ...draft,
        name: draft.name.trim() || defaultProfileFallback.name,
        email: draft.email.trim() || defaultProfileFallback.email,
        role: draft.role.trim() || defaultProfileFallback.role,
        avatarUrl: draft.avatarUrl.trim(),
        accountId: profile.accountId,
      });

      setDraft(updatedProfile);
      setSaveMessage("Profile updated");
      setIsEditing(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not update profile");
    } finally {
      setIsSaving(false);
    }
  }

  if (isEditing) {
    return (
      <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[15px] font-extrabold text-black">Profile</h2>
          <span className="rounded-[7px] bg-[#f0edff] px-2 py-1 text-[10px] font-extrabold text-[#6d3cff]">
            {draft.role || "Creator"}
          </span>
        </div>

        <div className="mt-6 flex items-center gap-4">
          {draft.avatarUrl ? (
            <span
              aria-label={draft.name || "Profile image"}
              role="img"
              className="h-[76px] w-[76px] shrink-0 rounded-full bg-cover bg-center shadow-[0_16px_34px_rgba(20,28,53,0.08)]"
              style={{ backgroundImage: `url(${draft.avatarUrl})` }}
            />
          ) : (
            <span className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-[13px] font-extrabold text-white shadow-[0_16px_34px_rgba(124,58,237,0.16)]">
              {initials || "TF"}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold text-[#46506a]">Profile image</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(event) => void handleProfileImageUpload(event.target.files?.[0])}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-10 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-4 text-[12px] font-extrabold text-black"
              >
                <UploadCloud size={15} strokeWidth={2.35} />
                Upload image
              </button>
              {draft.avatarUrl && (
                <button
                  type="button"
                  onClick={() => {
                    updateDraft("avatarUrl", "");
                    setImageUploadMessage("Image removed. Save profile to apply it.");
                  }}
                  className="flex h-10 items-center gap-2 rounded-[8px] border border-[#ffd6dd] bg-[#fff8fa] px-4 text-[12px] font-extrabold text-[#df405b]"
                >
                  <X size={15} strokeWidth={2.35} />
                  Remove
                </button>
              )}
            </div>
            <p className="mt-2 text-[11px] font-medium text-[#697083]">PNG, JPG, WebP, or GIF. The image is cropped square automatically.</p>
            {imageUploadMessage && <p className="mt-2 text-[11px] font-semibold text-[#0a9b3f]">{imageUploadMessage}</p>}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Display name</span>
            <input
              value={draft.name}
              onChange={(event) => updateDraft("name", event.target.value)}
              className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[12px] font-semibold text-black outline-none transition focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Email</span>
            <input
              type="email"
              value={draft.email}
              onChange={(event) => updateDraft("email", event.target.value)}
              className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[12px] font-semibold text-black outline-none transition focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Role</span>
            <input
              value={draft.role}
              onChange={(event) => updateDraft("role", event.target.value)}
              className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[12px] font-semibold text-black outline-none transition focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Time zone</span>
            <select
              value={draft.timeZone}
              onChange={(event) => updateDraft("timeZone", event.target.value)}
              className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[12px] font-semibold text-black outline-none transition focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            >
              {timeZoneOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Language</span>
            <select
              value={draft.language}
              onChange={(event) => updateDraft("language", event.target.value)}
              className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[12px] font-semibold text-black outline-none transition focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            >
              {languageOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Currency</span>
            <select
              value={draft.currency}
              onChange={(event) => updateDraft("currency", event.target.value)}
              className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[12px] font-semibold text-black outline-none transition focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            >
              {currencyOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 rounded-[9px] bg-[#f6f7fb] px-3 py-2">
          <p className="text-[10px] font-extrabold uppercase text-[#697083]">Account ID</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="truncate text-[12px] font-semibold text-[#253049]">{profile.accountId}</span>
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(profile.accountId)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] text-[#46506a] hover:bg-white hover:text-[#3044ff]"
              aria-label="Copy account ID"
            >
              <Copy size={14} strokeWidth={2.25} />
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveProfile}
            disabled={isSaving}
            className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#3044ff] px-4 text-[12px] font-extrabold text-white shadow-[0_18px_36px_rgba(48,68,255,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? <RefreshCw size={15} strokeWidth={2.3} className="animate-spin" /> : <Check size={15} strokeWidth={2.6} />}
            {isSaving ? "Saving" : "Save profile"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(profile);
              setIsEditing(false);
            }}
            className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-4 text-[12px] font-extrabold text-black"
          >
            <X size={15} strokeWidth={2.4} />
            Cancel
          </button>
        </div>
        {saveError && <p className="mt-3 rounded-[8px] bg-[#fff0f3] px-3 py-2 text-[11px] font-semibold text-[#df405b]">{saveError}</p>}
      </section>
    );
  }

  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <h2 className="text-[15px] font-extrabold text-black">Account Information</h2>

      <div className="mt-7 flex flex-wrap items-center gap-4">
        {profile.avatarUrl ? (
          <span
            aria-label={profile.name}
            role="img"
            className="h-[58px] w-[58px] shrink-0 rounded-full bg-cover bg-center"
            style={{ backgroundImage: `url(${profile.avatarUrl})` }}
          />
        ) : (
          <span className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-[12px] font-extrabold text-white">
            {initials || "TF"}
          </span>
        )}
        <div className="min-w-[180px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[14px] font-extrabold text-black">{profile.name}</h3>
            <span className="rounded-[7px] bg-[#f0edff] px-2 py-1 text-[10px] font-extrabold text-[#6d3cff]">{profile.role}</span>
          </div>
          <p className="mt-1 text-[12px] font-medium text-[#46506a]">{profile.email}</p>
          <button
            type="button"
            onClick={openEditor}
            className="mt-3 flex h-8 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[12px] font-extrabold text-black"
          >
            <PencilLine size={14} strokeWidth={2.3} />
            Edit profile
          </button>
          {saveMessage && <p className="mt-2 text-[11px] font-semibold text-[#0a9b3f]">{saveMessage}</p>}
        </div>
      </div>

      <div className="mt-6 divide-y divide-[#edf0f6] border-t border-[#edf0f6]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex min-h-[46px] items-center justify-between gap-4 text-[12px]">
            <span className="font-medium text-black">{label}</span>
            <button type="button" onClick={openEditor} className="flex min-w-0 items-center gap-2 text-right font-medium text-black">
              <span className="truncate">{value}</span>
              <ChevronDown size={13} strokeWidth={2.35} />
            </button>
          </div>
        ))}
        <div className="flex min-h-[46px] items-center justify-between gap-4 text-[12px]">
          <span className="font-medium text-black">Account ID</span>
          <button
            type="button"
            onClick={() => void navigator.clipboard?.writeText(profile.accountId)}
            className="flex min-w-0 items-center gap-2 text-right font-medium text-[#253049]"
          >
            <span className="truncate">{profile.accountId}</span>
            <Copy size={14} strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </section>
  );
}

function InstagramLogoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

function formatInstagramDisplayName(account: ConnectedInstagramAccount | null) {
  return account?.name || account?.username || "Instagram account";
}

function formatInstagramHandle(account: ConnectedInstagramAccount | null) {
  return account?.username ? `@${account.username}` : account?.id ? `ID ${account.id}` : "";
}

function formatConnectionDate(value?: string) {
  if (!value) {
    return "Connected";
  }

  return `Connected on ${new Date(value).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function formatInstagramFullDate(value?: string) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatInstagramRelativeTime(value?: string) {
  if (!value) {
    return "No activity";
  }

  const diff = Date.now() - new Date(value).getTime();

  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function formatInstagramMessagePreview(message?: InstagramSettingsMessage) {
  if (!message) return "No messages";
  if (message.text) return message.text;

  const attachment = message.attachments?.[0];
  if (attachment?.type === "image") return "Photo";
  if (attachment?.type === "video") return "Video";
  if (attachment) return attachment.name || "Attachment";

  return "Message";
}

function getInstagramConversationName(conversation: InstagramSettingsConversation) {
  return conversation.participant.username || conversation.participant.name || `User ${conversation.participant.id.slice(-6)}`;
}

function getInstagramProfileUrl(username?: string) {
  return username ? `https://www.instagram.com/${username}/` : "";
}

function InstagramConnectionCard({ onManage }: { onManage?: () => void }) {
  const [isConnected, setIsConnected] = useState(true);
  const [account, setAccount] = useState<ConnectedInstagramAccount | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isConnectingNew, setIsConnectingNew] = useState(false);
  const [connectionError, setConnectionError] = useState("");

  const permissions = [
    ["Read messages & comments", "Monitor DMs, comments, and mentions"],
    ["Manage messages", "Send replies and interact on your behalf"],
    ["Access insights", "View audience and engagement data"],
  ];

  useEffect(() => {
    let isActive = true;

    async function loadInstagramStatus() {
      try {
        const response = await fetch("/api/auth/instagram/status", {
          headers: { Accept: "application/json" },
        });
        const data: { connected?: boolean; account?: ConnectedInstagramAccount | null; error?: string } = await response.json();

        if (!isActive) {
          return;
        }

        if (response.ok) {
          setIsConnected(Boolean(data.connected));
          setAccount(data.account ?? null);
        }
      } catch {
        // Keep the current optimistic state when status cannot be loaded.
      }
    }

    loadInstagramStatus();

    return () => {
      isActive = false;
    };
  }, []);

  async function disconnectInstagram() {
    setIsDisconnecting(true);
    setConnectionError("");

    try {
      const response = await fetch("/api/auth/instagram/disconnect", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const data: { error?: string } = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Could not disconnect Instagram");
      }

      setIsConnected(false);
      setAccount(null);
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : "Could not disconnect Instagram");
    } finally {
      setIsDisconnecting(false);
    }
  }

  async function connectNewInstagram() {
    setIsConnectingNew(true);
    setConnectionError("");

    window.location.href = "/api/auth/instagram?next=/settings";
  }

  if (!isConnected) {
    return (
      <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
        <h2 className="text-[15px] font-extrabold text-black">Instagram Connection</h2>

        <div className="mt-6 flex flex-col items-center gap-4 rounded-[10px] border border-dashed border-[#e0d9ff] bg-[#faf9ff] py-8 px-4 text-center">
          <div className="relative flex h-[56px] w-[56px] items-center justify-center rounded-[16px] bg-gradient-to-tr from-[#ffbd00] via-[#ff2d85] to-[#6d3cff] shadow-[0_14px_26px_rgba(255,61,129,0.22)]">
            <div className="h-[33px] w-[33px] rounded-[9px] border-[3px] border-white" />
            <div className="absolute h-[13px] w-[13px] rounded-full border-[3px] border-white" />
            <div className="absolute right-[14px] top-[14px] h-[5px] w-[5px] rounded-full bg-white" />
          </div>
          <div>
            <p className="text-[14px] font-extrabold text-black">Connect your Instagram</p>
            <p className="mt-2 text-[12px] font-medium leading-[1.5] text-[#46506a]">
              Link a new Instagram Business account to start automating DMs, comments, and monetizing your audience.
            </p>
          </div>
          <a
            href="/api/auth/instagram?next=/settings"
            id="connect-instagram-btn"
            className="flex h-11 w-full max-w-[260px] items-center justify-center gap-2.5 rounded-[9px] bg-gradient-to-r from-[#f0004a] via-[#c026d3] to-[#7c3aed] text-[13px] font-extrabold text-white shadow-[0_14px_28px_rgba(192,38,211,0.22)] transition hover:opacity-90"
          >
            <InstagramLogoIcon />
            Connect new account
          </a>
          {connectionError && <p className="text-[11px] font-semibold text-[#df405b]">{connectionError}</p>}
        </div>

        <div className="mt-5 border-t border-[#edf0f6] pt-4">
          <h3 className="text-[12px] font-extrabold text-black">Permissions that will be granted</h3>
          <div className="mt-3 space-y-3">
            {permissions.map(([title, detail]) => (
              <div key={title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#eef0ff] text-[#3044ff]">
                  <Check size={13} strokeWidth={2.8} />
                </span>
                <div>
                  <p className="text-[12px] font-extrabold text-[#253049]">{title}</p>
                  <p className="mt-1 text-[11px] font-medium text-[#46506a]">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <h2 className="text-[15px] font-extrabold text-black">Instagram Connection</h2>

      <div className="mt-8 grid grid-cols-[52px_minmax(0,1fr)] items-center gap-5 sm:grid-cols-[52px_minmax(0,1fr)_110px]">
        <InstagramLogoTile />
        <div className="min-w-0">
          <h3 className="truncate text-[14px] font-extrabold text-black">{formatInstagramDisplayName(account)}</h3>
          {formatInstagramHandle(account) && (
            <p className="mt-1 truncate text-[11px] font-semibold text-[#46506a]">{formatInstagramHandle(account)}</p>
          )}
          <span className="mt-3 inline-flex h-6 items-center gap-1.5 rounded-[8px] bg-[#e7f8ed] px-2.5 text-[10px] font-extrabold text-[#0a9b3f]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0a9b3f]" />
            Connected
          </span>
          <p className="mt-3 text-[11px] font-medium text-[#46506a]">{formatConnectionDate(account?.connectedAt)}</p>
        </div>
        <button
          type="button"
          onClick={onManage}
          className="col-span-2 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[12px] font-extrabold text-black sm:col-span-1 sm:w-[110px]"
        >
          Manage
          <ExternalLink size={13} strokeWidth={2.4} />
        </button>
      </div>

      <div className="mt-6 border-t border-[#edf0f6] pt-5">
        <h3 className="text-[12px] font-extrabold text-black">Permissions</h3>
        <div className="mt-4 space-y-4">
          {permissions.map(([title, detail]) => (
            <div key={title} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#eef0ff] text-[#3044ff]">
                <Check size={13} strokeWidth={2.8} />
              </span>
              <div>
                <p className="text-[12px] font-extrabold text-[#253049]">{title}</p>
                <p className="mt-1 text-[11px] font-medium text-[#46506a]">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={connectNewInstagram}
          disabled={isDisconnecting || isConnectingNew}
          id="connect-instagram-btn"
          className="flex h-10 items-center gap-2 rounded-[8px] bg-gradient-to-r from-[#f0004a] via-[#c026d3] to-[#7c3aed] px-4 text-[12px] font-extrabold text-white shadow-[0_14px_28px_rgba(192,38,211,0.22)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <InstagramLogoIcon />
          {isConnectingNew ? "Opening Instagram" : "Connect new account"}
        </button>
        <button
          type="button"
          onClick={disconnectInstagram}
          disabled={isDisconnecting || isConnectingNew}
          className="flex h-10 items-center gap-2 rounded-[8px] border border-[#ffd6dd] bg-[#fff8fa] px-4 text-[12px] font-extrabold text-[#df405b] transition hover:bg-[#fff0f3] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={14} strokeWidth={2.3} className={isDisconnecting ? "animate-spin" : ""} />
          {isDisconnecting ? "Disconnecting" : "Disconnect"}
        </button>
      </div>
      {connectionError && <p className="mt-3 text-[11px] font-semibold text-[#df405b]">{connectionError}</p>}
    </section>
  );
}

function InstagramProfileAvatar({ src, name }: { src?: string; name: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!src || imageFailed) {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-[11px] font-extrabold text-white">
        {initials || "IG"}
      </span>
    );
  }

  return (
    // Instagram profile images are external CDN URLs returned by the Graph API.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      onError={() => setImageFailed(true)}
      className="h-11 w-11 shrink-0 rounded-full object-cover"
    />
  );
}

function SettingsInstagramMetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-4 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold text-[#46506a]">{label}</p>
          <p className="mt-2 text-[24px] font-extrabold leading-none text-black">{value}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#f0edff] text-[#3044ff]">
          <Icon size={18} strokeWidth={2.35} />
        </span>
      </div>
      <p className="mt-3 text-[11px] font-medium leading-[1.35] text-[#46506a]">{detail}</p>
    </section>
  );
}

function SettingsInstagramSection() {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<ConnectedInstagramAccount | null>(null);
  const [conversations, setConversations] = useState<InstagramSettingsConversation[]>([]);
  const [igUserId, setIgUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isConnectingNew, setIsConnectingNew] = useState(false);
  const [error, setError] = useState("");

  const permissions = [
    ["Basic profile", "Read connected Instagram account identity and username."],
    ["Manage messages", "Receive DMs and send replies from TractionFlo."],
    ["Manage comments", "Read and respond to comments and mentions."],
    ["Content publishing", "Prepare publishing workflows for Instagram content."],
    ["Insights", "Read engagement and audience performance data."],
  ];

  const loadInstagramData = useCallback(async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    try {
      const [statusResponse, conversationsResponse] = await Promise.all([
        fetch("/api/auth/instagram/status", { headers: { Accept: "application/json" }, cache: "no-store" }),
        fetch("/api/instagram/conversations", { headers: { Accept: "application/json" }, cache: "no-store" }),
      ]);
      const statusData: { connected?: boolean; account?: ConnectedInstagramAccount | null; error?: string } =
        await statusResponse.json();
      const conversationsData: InstagramConversationsResponse = await conversationsResponse.json();
      const nextAccount = statusData.account ?? conversationsData.account ?? null;
      const nextConversations = conversationsData.conversations || [];

      if (!statusResponse.ok || statusData.error) {
        throw new Error(statusData.error || "Could not read Instagram status");
      }

      setIsConnected(Boolean(statusData.connected || nextAccount || nextConversations.length > 0));
      setAccount(nextAccount);
      setConversations(nextConversations);
      setIgUserId(conversationsData.ig_user_id || nextAccount?.id || "");

      if (conversationsData.error && conversationsData.error !== "No Instagram account connected") {
        setError(conversationsData.error);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load Instagram data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadInstagramData(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadInstagramData]);

  async function disconnectInstagram() {
    setIsDisconnecting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/instagram/disconnect", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const data: { error?: string } = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Could not disconnect Instagram");
      }

      setIsConnected(false);
      setAccount(null);
      setConversations([]);
      setIgUserId("");
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : "Could not disconnect Instagram");
    } finally {
      setIsDisconnecting(false);
    }
  }

  async function connectNewInstagram() {
    setIsConnectingNew(true);
    setError("");

    window.location.href = "/api/auth/instagram?next=/settings";
  }

  const nonNoteMessages = conversations.flatMap((conversation) =>
    conversation.messages.filter((message) => message.from !== "note")
  );
  const inboundMessages = nonNoteMessages.filter((message) => message.from === "user");
  const outboundMessages = nonNoteMessages.filter((message) => message.from === "me");
  const mediaMessages = nonNoteMessages.filter((message) => (message.attachments?.length || 0) > 0);
  const latestMessage = [...nonNoteMessages].sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  )[0];
  const latestConversations = [...conversations]
    .sort((a, b) => new Date(b.updated_time || 0).getTime() - new Date(a.updated_time || 0).getTime())
    .slice(0, 5);
  const profileUrl = getInstagramProfileUrl(account?.username);
  const displayName = formatInstagramDisplayName(account);
  const oauthCallbackPath = "/api/auth/instagram/callback";
  const webhookCallbackPath = "/api/webhooks/meta";

  function copyValue(value: string) {
    void navigator.clipboard?.writeText(value);
  }

  if (!isConnected && !loading) {
    return (
      <div className="grid gap-5">
        <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-6 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <InstagramLogoTile />
              <div>
                <h2 className="text-[18px] font-extrabold text-black">Instagram is not connected</h2>
                <p className="mt-1 text-[12px] font-medium text-[#46506a]">
                  Connect an Instagram Business account to load messages, profile data, and automation settings.
                </p>
              </div>
            </div>
            <a
              href="/api/auth/instagram?next=/settings"
              className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-gradient-to-r from-[#f0004a] via-[#c026d3] to-[#7c3aed] px-4 text-[12px] font-extrabold text-white shadow-[0_14px_28px_rgba(192,38,211,0.22)]"
            >
              <InstagramLogoIcon />
              Connect Instagram
            </a>
          </div>
          {error && <p className="mt-4 rounded-[9px] bg-[#fff0f3] px-3 py-2 text-[11px] font-semibold text-[#df405b]">{error}</p>}
        </section>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-5">
            <InstagramLogoTile />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-[18px] font-extrabold text-black">
                  {loading ? "Loading Instagram..." : displayName}
                </h2>
                <span className="inline-flex h-6 items-center gap-1.5 rounded-[8px] bg-[#e7f8ed] px-2.5 text-[10px] font-extrabold text-[#0a9b3f]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0a9b3f]" />
                  Connected
                </span>
              </div>
              <p className="mt-1 truncate text-[12px] font-semibold text-[#46506a]">
                {formatInstagramHandle(account) || (igUserId ? `ID ${igUserId}` : "Instagram Business account")}
              </p>
              <p className="mt-2 text-[11px] font-medium text-[#46506a]">{formatConnectionDate(account?.connectedAt)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void loadInstagramData(false)}
              disabled={loading || refreshing}
              className="flex h-10 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-4 text-[12px] font-extrabold text-black transition hover:bg-[#f8f9fc] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={14} strokeWidth={2.3} className={refreshing ? "animate-spin" : ""} />
              Refresh data
            </button>
            <a
              href="/conversations"
              className="flex h-10 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-4 text-[12px] font-extrabold text-black transition hover:bg-[#f8f9fc]"
            >
              <MessageSquare size={14} strokeWidth={2.3} />
              Open inbox
            </a>
            {profileUrl && (
              <a
                href={profileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 items-center gap-2 rounded-[8px] bg-[#0d1118] px-4 text-[12px] font-extrabold text-white transition hover:bg-black"
              >
                View profile
                <ExternalLink size={13} strokeWidth={2.4} />
              </a>
            )}
          </div>
        </div>

        {error && <p className="mt-4 rounded-[9px] bg-[#fff0f3] px-3 py-2 text-[11px] font-semibold text-[#df405b]">{error}</p>}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SettingsInstagramMetricCard
          label="Conversations"
          value={loading ? "..." : String(conversations.length)}
          detail="Instagram DM threads available in the inbox."
          icon={MessageSquare}
        />
        <SettingsInstagramMetricCard
          label="Messages"
          value={loading ? "..." : String(nonNoteMessages.length)}
          detail={`${inboundMessages.length} received and ${outboundMessages.length} sent.`}
          icon={Send}
        />
        <SettingsInstagramMetricCard
          label="Media"
          value={loading ? "..." : String(mediaMessages.length)}
          detail="Photos, videos, and attachments found in recent DMs."
          icon={UploadCloud}
        />
        <SettingsInstagramMetricCard
          label="Last activity"
          value={loading ? "..." : formatInstagramRelativeTime(latestMessage?.time)}
          detail={formatInstagramMessagePreview(latestMessage)}
          icon={Clock}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
          <h2 className="text-[15px] font-extrabold text-black">Connected Account</h2>
          <div className="mt-5 flex items-center gap-4">
            <InstagramLogoTile />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-extrabold text-black">{displayName}</p>
              <p className="mt-1 truncate text-[12px] font-semibold text-[#46506a]">{formatInstagramHandle(account) || "No username returned"}</p>
            </div>
          </div>
          <div className="mt-5 divide-y divide-[#edf0f6] border-t border-[#edf0f6]">
            {[
              ["Instagram name", account?.name || "Not returned"],
              ["Username", account?.username ? `@${account.username}` : "Not returned"],
              ["Graph user ID", igUserId || account?.id || "Not returned"],
              ["Connected date", formatInstagramFullDate(account?.connectedAt)],
            ].map(([label, value]) => (
              <div key={label} className="flex min-h-[43px] items-center justify-between gap-4 text-[12px]">
                <span className="font-medium text-black">{label}</span>
                <span className="min-w-0 truncate text-right font-semibold text-[#253049]">{value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
          <h2 className="text-[15px] font-extrabold text-black">API Setup</h2>
          <div className="mt-5 divide-y divide-[#edf0f6] border-t border-[#edf0f6]">
            {[
              ["OAuth callback", oauthCallbackPath],
              ["Webhook callback", webhookCallbackPath],
              ["Conversations API", "/api/instagram/conversations"],
              ["Send message API", "/api/instagram/send"],
            ].map(([label, value]) => (
              <div key={label} className="grid min-h-[48px] grid-cols-[118px_minmax(0,1fr)_28px] items-center gap-3 text-[12px]">
                <span className="font-medium text-black">{label}</span>
                <code className="truncate rounded-[7px] bg-[#f6f7fb] px-2 py-1 text-[11px] font-semibold text-[#253049]">{value}</code>
                <button
                  type="button"
                  aria-label={`Copy ${label}`}
                  onClick={() => copyValue(value)}
                  className="flex h-7 w-7 items-center justify-center rounded-[7px] text-[#46506a] hover:bg-[#f0edff] hover:text-[#3044ff]"
                >
                  <Copy size={14} strokeWidth={2.25} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[15px] font-extrabold text-black">Recent Instagram Conversations</h2>
            <span className="rounded-[8px] bg-[#f0edff] px-2.5 py-1 text-[10px] font-extrabold text-[#3044ff]">
              {conversations.length}
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {latestConversations.length > 0 ? (
              latestConversations.map((conversation) => {
                const participantName = getInstagramConversationName(conversation);
                const lastMessage = conversation.messages[0];

                return (
                  <a
                    key={conversation.id}
                    href="/conversations"
                    className="grid min-h-[64px] grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] border border-[#edf0f6] bg-white px-3 py-2 transition hover:border-[#dfe4f1] hover:bg-[#fbfbff]"
                  >
                    <InstagramProfileAvatar src={conversation.participant.profile_pic} name={participantName} />
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-extrabold text-black">{participantName}</span>
                      <span className="mt-1 block truncate text-[11px] font-medium text-[#46506a]">
                        {formatInstagramMessagePreview(lastMessage)}
                      </span>
                    </span>
                    <span className="text-[10px] font-semibold text-[#46506a]">
                      {formatInstagramRelativeTime(lastMessage?.time || conversation.updated_time)}
                    </span>
                  </a>
                );
              })
            ) : (
              <div className="rounded-[10px] border border-dashed border-[#dde3ee] bg-[#fafbff] px-4 py-8 text-center">
                <p className="text-[13px] font-extrabold text-black">No Instagram DMs yet</p>
                <p className="mt-2 text-[12px] font-medium text-[#46506a]">
                  Messages will appear here once Instagram sends them to the connected account.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
          <h2 className="text-[15px] font-extrabold text-black">Permissions & Actions</h2>
          <div className="mt-5 space-y-4">
            {permissions.map(([title, detail]) => (
              <div key={title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#eef0ff] text-[#3044ff]">
                  <Check size={13} strokeWidth={2.8} />
                </span>
                <div>
                  <p className="text-[12px] font-extrabold text-[#253049]">{title}</p>
                  <p className="mt-1 text-[11px] font-medium text-[#46506a]">{detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <button
              type="button"
              onClick={connectNewInstagram}
              disabled={isDisconnecting || isConnectingNew}
              className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-gradient-to-r from-[#f0004a] via-[#c026d3] to-[#7c3aed] px-4 text-[12px] font-extrabold text-white shadow-[0_14px_28px_rgba(192,38,211,0.22)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <InstagramLogoIcon />
              {isConnectingNew ? "Opening" : "Connect new"}
            </button>
            <button
              type="button"
              onClick={disconnectInstagram}
              disabled={isDisconnecting || isConnectingNew}
              className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#ffd6dd] bg-[#fff8fa] px-4 text-[12px] font-extrabold text-[#df405b] transition hover:bg-[#fff0f3] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={14} strokeWidth={2.3} className={isDisconnecting ? "animate-spin" : ""} />
              {isDisconnecting ? "Disconnecting" : "Disconnect"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function SettingsAssistantCard({
  settings,
  onChange,
  onConfigure,
}: {
  settings: AiSettings;
  onChange: (settings: AiSettings) => void;
  onConfigure?: () => void;
}) {
  function updateAiSettings(partial: Partial<AiSettings>) {
    onChange({
      ...settings,
      ...partial,
    });
  }

  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <div className="flex items-center gap-2">
        <Sparkles size={17} className="text-[#3044ff]" strokeWidth={2.35} />
        <h2 className="text-[15px] font-extrabold text-black">AI Assistant</h2>
      </div>

      <div className="mt-5 space-y-4">
        <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
          <span className="text-[12px] font-extrabold leading-tight text-black">Personality</span>
          <SettingsSelect
            ariaLabel="AI personality"
            value={settings.personality}
            options={["Professional", "Friendly", "Playful", "Direct"]}
            onChange={(value) => updateAiSettings({ personality: value })}
            className="w-full"
          />
        </div>
        <p className="text-[11px] font-medium text-[#46506a]">Your AI matches your brand voice and tone.</p>
        <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
          <span className="text-[12px] font-extrabold leading-tight text-black">Response style</span>
          <SettingsSelect
            ariaLabel="AI response style"
            value={settings.responseStyle}
            options={["Helpful & Friendly", "Concise", "Sales focused", "Support first"]}
            onChange={(value) => updateAiSettings({ responseStyle: value })}
            className="w-full"
          />
        </div>
        <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
          <span className="text-[12px] font-extrabold leading-tight text-black">Knowledge usage</span>
          <SettingsSelect
            ariaLabel="AI knowledge usage"
            value={settings.knowledgeUsage}
            options={["Always", "Only when confident", "Ask first"]}
            onChange={(value) => updateAiSettings({ knowledgeUsage: value })}
            className="w-full"
          />
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-3">
          <span className="text-[12px] font-extrabold text-black">Proactive outreach</span>
          <SettingsToggle
            ariaLabel="Toggle proactive outreach"
            checked={settings.proactiveOutreach}
            onChange={(checked) => updateAiSettings({ proactiveOutreach: checked })}
          />
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-3">
          <span className="text-[12px] font-extrabold text-black">Auto tagging</span>
          <SettingsToggle ariaLabel="Toggle AI auto tagging" checked={settings.autoTagging} onChange={(checked) => updateAiSettings({ autoTagging: checked })} />
        </div>
      </div>

      {onConfigure && (
        <button
          type="button"
          onClick={onConfigure}
          className="mt-5 flex h-10 w-full items-center justify-between rounded-[8px] border border-[#dde3ee] bg-white px-4 text-[12px] font-extrabold text-black"
        >
          Configure AI Assistant
          <ArrowRight size={15} strokeWidth={2.5} />
        </button>
      )}
    </section>
  );
}

function getAiBehaviorPreview(settings: AiSettings) {
  if (settings.responseStyle === "Concise") {
    return "Got it. I can help with that. What result are you trying to get first?";
  }

  if (settings.responseStyle === "Sales focused") {
    return "Thanks for reaching out. If growth is the goal, I can point you to the best package and next step.";
  }

  if (settings.responseStyle === "Support first") {
    return "Thanks for sharing that. I will help you sort it out and make sure you get the right next step.";
  }

  if (settings.personality === "Playful") {
    return "Hey, happy to help. Tell me what you are working on and I will point you in the right direction.";
  }

  if (settings.personality === "Direct") {
    return "I can help. Send your goal, budget, and timeline so I can recommend the right next step.";
  }

  return "Hi, thanks for reaching out. I can help with that. What are you hoping to accomplish first?";
}

function getAiBehaviorSummary(settings: AiSettings) {
  return `Personality is ${settings.personality.toLowerCase()}, responses are ${settings.responseStyle.toLowerCase()}, and knowledge usage is set to ${settings.knowledgeUsage.toLowerCase()}.`;
}

type AiIntegrationApiResponse = {
  integration?: AiIntegrationSettings;
  reply?: string;
  error?: string;
};

type AiWorkflowTestResponse = Partial<AiWorkflowRunResult> & {
  error?: string;
};

const aiWorkflowVisuals: Record<AiWorkflowSetting["id"], { icon: LucideIcon; tone: string }> = {
  startConversation: { icon: Send, tone: "bg-[#eef4ff] text-[#3044ff]" },
  answerQuestions: { icon: MessageSquare, tone: "bg-[#f0edff] text-[#6d3cff]" },
  qualifyLeads: { icon: Target, tone: "bg-[#e7f8ed] text-[#0a9b3f]" },
  moveToCta: { icon: ArrowRight, tone: "bg-[#fff3e6] text-[#ff850d]" },
};

function SettingsAiIntegrationSection({
  integration,
  assistantSettings,
  onChange,
  onAssistantChange,
}: {
  integration: AiIntegrationSettings;
  assistantSettings: AiSettings;
  onChange: (integration: AiIntegrationSettings) => void;
  onAssistantChange: (settings: AiSettings) => void;
}) {
  const [draft, setDraft] = useState<AiIntegrationSettings>({
    ...integration,
    behavior: integration.behavior || assistantSettings,
  });
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState("");
  const [testReply, setTestReply] = useState("");
  const [workflowTest, setWorkflowTest] = useState<AiWorkflowTestResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingWorkflows, setIsTestingWorkflows] = useState(false);
  const onChangeRef = useRef(onChange);
  const onAssistantChangeRef = useRef(onAssistantChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onAssistantChangeRef.current = onAssistantChange;
  }, [onAssistantChange]);

  useEffect(() => {
    let isMounted = true;

    async function loadIntegration() {
      setIsLoading(true);

      try {
        const response = await fetch("/api/ai/integration", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const data = (await response.json()) as AiIntegrationApiResponse;

        if (!response.ok || data.error || !data.integration) {
          throw new Error(data.error || "Could not load AI integration");
        }

        if (isMounted) {
          setDraft(data.integration);
          onChangeRef.current(data.integration);
          onAssistantChangeRef.current(data.integration.behavior);
          setStatus(data.integration.apiKeySaved ? "OpenAI key is connected." : "Add an OpenAI key to turn on AI replies.");
        }
      } catch (error) {
        if (isMounted) {
          setStatus(error instanceof Error ? error.message : "Could not load AI integration");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    const timeout = window.setTimeout(() => {
      void loadIntegration();
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timeout);
    };
  }, []);

  function updateDraft(partial: Partial<AiIntegrationSettings>) {
    setDraft((current) => ({
      ...current,
      ...partial,
    }));
  }

  function updateBehavior(behavior: AiSettings) {
    updateDraft({ behavior });
    onAssistantChange(behavior);
    setStatus("AI tone changed. Save integration to apply it to live OpenAI replies.");
  }

  function updateWorkflow(id: AiWorkflowSetting["id"], enabled: boolean) {
    updateDraft({
      workflows: draft.workflows.map((workflow) => (workflow.id === id ? { ...workflow, enabled } : workflow)),
    });
    setStatus("Workflow changed. Save integration to apply it to AI replies.");
  }

  async function saveIntegration(options?: { clearApiKey?: boolean }) {
    setIsSaving(true);
    setStatus("");
    setTestReply("");
    setWorkflowTest(null);

    try {
      const response = await fetch("/api/ai/integration", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey: options?.clearApiKey ? undefined : apiKey.trim() || undefined,
          clearApiKey: options?.clearApiKey,
          model: draft.model,
          workflows: draft.workflows,
          behavior: draft.behavior,
          systemPrompt: draft.systemPrompt,
          leadQualificationRules: draft.leadQualificationRules,
          ctaMessage: draft.ctaMessage,
          autoSend: draft.autoSend,
        }),
      });
      const data = (await response.json()) as AiIntegrationApiResponse;

      if (!response.ok || data.error || !data.integration) {
        throw new Error(data.error || "Could not save AI integration");
      }

      setDraft(data.integration);
      onChange(data.integration);
      onAssistantChange(data.integration.behavior);
      setApiKey("");
      setStatus(options?.clearApiKey ? "OpenAI key removed." : "AI integration saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save AI integration");
    } finally {
      setIsSaving(false);
    }
  }

  async function testIntegration() {
    setIsTesting(true);
    setStatus("");
    setTestReply("");
    setWorkflowTest(null);

    try {
      const response = await fetch("/api/ai/test", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const data = (await response.json()) as AiIntegrationApiResponse;

      if (!response.ok || data.error || !data.reply) {
        throw new Error(data.error || "Could not test OpenAI");
      }

      setTestReply(data.reply);
      setStatus("OpenAI replied successfully.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not test OpenAI");
    } finally {
      setIsTesting(false);
    }
  }

  async function testAllWorkflows() {
    setIsTestingWorkflows(true);
    setStatus("");
    setTestReply("");
    setWorkflowTest(null);

    try {
      const response = await fetch("/api/ai/workflow", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountName: "TractionFlo",
          participant: {
            name: "Sample creator lead",
            username: "samplelead",
          },
          messages: [
            {
              from: "user",
              text: "Hi, I want to know your coaching price and whether you can help me grow my Instagram this month.",
            },
            {
              from: "me",
              text: "Happy to help. What are you trying to improve first?",
            },
            {
              from: "user",
              text: "I need more leads quickly. I can start this week if the package is a good fit.",
            },
          ],
        }),
      });
      const data = (await response.json()) as AiWorkflowTestResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error || "Could not test AI workflows");
      }

      setWorkflowTest(data);
      setStatus("All enabled AI jobs returned live OpenAI output.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not test AI workflows");
    } finally {
      setIsTestingWorkflows(false);
    }
  }

  return (
    <div className="grid gap-5">
      <SettingsSectionHeader
        section="ai-integration"
        action={
          <span
            className={`rounded-[8px] px-3 py-1.5 text-[11px] font-extrabold ${
              draft.apiKeySaved ? "bg-[#e7f8ed] text-[#0a9b3f]" : "bg-[#fff3e6] text-[#ff850d]"
            }`}
          >
            {isLoading ? "Checking" : draft.apiKeySaved ? "Connected" : "Key needed"}
          </span>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
        <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
          <div className="flex items-center gap-2">
            <BrainCircuit size={17} className="text-[#3044ff]" strokeWidth={2.35} />
            <h2 className="text-[15px] font-extrabold text-black">OpenAI Connection</h2>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="block">
              <span className="text-[11px] font-extrabold text-[#46506a]">API key</span>
              <input
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                type="password"
                placeholder={draft.apiKeySaved ? draft.apiKeyPreview : "sk-..."}
                className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
              />
              {draft.apiKeySaved && (
                <p className="mt-2 text-[11px] font-medium text-[#46506a]">Saved key: {draft.apiKeyPreview}</p>
              )}
            </label>

            <label className="block">
              <span className="text-[11px] font-extrabold text-[#46506a]">Model</span>
              <SettingsSelect
                ariaLabel="OpenAI model"
                value={draft.model}
                options={openAiModelOptions}
                onChange={(model) => updateDraft({ model })}
                className="mt-2 w-full"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void saveIntegration()}
                disabled={isSaving}
                className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#3044ff] px-4 text-[12px] font-extrabold text-white shadow-[0_16px_30px_rgba(48,68,255,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2.4} />}
                Save integration
              </button>
              <button
                type="button"
                onClick={testIntegration}
                disabled={isTesting || isSaving || !draft.apiKeySaved}
                className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-4 text-[12px] font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isTesting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} strokeWidth={2.4} />}
                Test OpenAI
              </button>
            </div>

            {draft.apiKeySaved && (
              <button
                type="button"
                onClick={() => void saveIntegration({ clearApiKey: true })}
                disabled={isSaving}
                className="h-9 rounded-[8px] border border-[#ffd6dd] bg-[#fff8fa] px-3 text-[11px] font-extrabold text-[#df405b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Remove saved key
              </button>
            )}

            {(status || testReply) && (
              <div className="rounded-[10px] bg-[#f6f7fb] p-3 text-[11px] font-semibold leading-relaxed text-[#46506a]">
                {status && <p>{status}</p>}
                {testReply && <p className="mt-2 rounded-[8px] bg-white p-2 text-[#253049]">{testReply}</p>}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
          <div className="flex items-center gap-2">
            <Sparkles size={17} className="text-[#3044ff]" strokeWidth={2.35} />
            <h2 className="text-[15px] font-extrabold text-black">Instagram AI Jobs</h2>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {draft.workflows.map((workflow) => {
              const visual = aiWorkflowVisuals[workflow.id];
              const Icon = visual.icon;

              return (
                <div key={workflow.id} className="rounded-[10px] border border-[#edf0f6] bg-[#fbfbff] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${visual.tone}`}>
                      <Icon size={18} strokeWidth={2.35} />
                    </span>
                    <SettingsToggle
                      ariaLabel={`Toggle ${workflow.label}`}
                      checked={workflow.enabled}
                      onChange={(checked) => updateWorkflow(workflow.id, checked)}
                    />
                  </div>
                  <h3 className="mt-4 text-[13px] font-extrabold text-black">{workflow.label}</h3>
                  <p className="mt-2 text-[11px] font-medium leading-relaxed text-[#46506a]">{workflow.detail}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 rounded-[10px] border border-[#edf0f6] bg-[#fbfbff] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-[13px] font-extrabold text-black">Workflow test</h3>
                <p className="mt-1 text-[11px] font-medium leading-relaxed text-[#46506a]">
                  Runs opener, answer, lead qualification, and CTA against a sample Instagram thread.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void testAllWorkflows()}
                disabled={isTestingWorkflows || !draft.apiKeySaved}
                className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-[8px] bg-[#0d1118] px-3 text-[11px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isTestingWorkflows ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} strokeWidth={2.35} />}
                Test all jobs
              </button>
            </div>

            {workflowTest && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[8px] bg-white p-3">
                  <p className="text-[10px] font-extrabold uppercase text-[#596175]">Opener</p>
                  <p className="mt-1 text-[11px] font-semibold leading-relaxed text-[#253049]">{workflowTest.starter || "Off"}</p>
                </div>
                <div className="rounded-[8px] bg-white p-3">
                  <p className="text-[10px] font-extrabold uppercase text-[#596175]">Answer</p>
                  <p className="mt-1 text-[11px] font-semibold leading-relaxed text-[#253049]">{workflowTest.reply || "Off"}</p>
                </div>
                <div className="rounded-[8px] bg-white p-3">
                  <p className="text-[10px] font-extrabold uppercase text-[#596175]">Lead</p>
                  <p className="mt-1 text-[11px] font-semibold leading-relaxed text-[#253049]">
                    {workflowTest.lead ? `${workflowTest.lead.score}/100 ${workflowTest.lead.stage}: ${workflowTest.lead.summary}` : "Off"}
                  </p>
                </div>
                <div className="rounded-[8px] bg-white p-3">
                  <p className="text-[10px] font-extrabold uppercase text-[#596175]">CTA</p>
                  <p className="mt-1 text-[11px] font-semibold leading-relaxed text-[#253049]">{workflowTest.cta || "Off"}</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <SettingsAssistantCard settings={draft.behavior} onChange={updateBehavior} />
        <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
          <div className="flex items-center gap-2">
            <Bot size={17} className="text-[#3044ff]" strokeWidth={2.35} />
            <h2 className="text-[15px] font-extrabold text-black">AI behavior preview</h2>
          </div>
          <div className="mt-5 rounded-[12px] bg-[#f6f7fb] p-4">
            <p className="text-[12px] font-semibold leading-relaxed text-[#253049]">
              {getAiBehaviorSummary(draft.behavior)}
            </p>
            <p className="mt-3 text-[12px] font-medium leading-relaxed text-[#46506a]">
              Proactive outreach is {draft.behavior.proactiveOutreach ? "on" : "off"} and auto tagging is {draft.behavior.autoTagging ? "on" : "off"}.
            </p>
          </div>
          <div className="mt-4 rounded-[12px] border border-[#edf0f6] bg-white p-4">
            <p className="text-[10px] font-extrabold uppercase text-[#596175]">Sample Instagram reply</p>
            <p className="mt-2 text-[13px] font-semibold leading-relaxed text-[#253049]">
              {getAiBehaviorPreview(draft.behavior)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void saveIntegration()}
            disabled={isSaving}
            className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#3044ff] px-4 text-[12px] font-extrabold text-white shadow-[0_16px_30px_rgba(48,68,255,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2.4} />}
            Save AI tone
          </button>
        </section>
      </div>

      <section className="grid gap-5 rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid gap-4">
          <div className="flex items-center gap-2">
            <Bot size={17} className="text-[#3044ff]" strokeWidth={2.35} />
            <h2 className="text-[15px] font-extrabold text-black">AI Instructions</h2>
          </div>

          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">System prompt</span>
            <textarea
              value={draft.systemPrompt}
              onChange={(event) => updateDraft({ systemPrompt: event.target.value })}
              className="mt-2 min-h-[122px] w-full rounded-[8px] border border-[#dde3ee] px-3 py-2 text-[12px] font-semibold leading-relaxed outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Lead qualification rules</span>
            <textarea
              value={draft.leadQualificationRules}
              onChange={(event) => updateDraft({ leadQualificationRules: event.target.value })}
              className="mt-2 min-h-[96px] w-full rounded-[8px] border border-[#dde3ee] px-3 py-2 text-[12px] font-semibold leading-relaxed outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            />
          </label>
        </div>

        <div className="grid gap-4">
          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">CTA message</span>
            <textarea
              value={draft.ctaMessage}
              onChange={(event) => updateDraft({ ctaMessage: event.target.value })}
              className="mt-2 min-h-[96px] w-full rounded-[8px] border border-[#dde3ee] px-3 py-2 text-[12px] font-semibold leading-relaxed outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            />
          </label>

          <div className="rounded-[10px] border border-[#edf0f6] bg-[#fbfbff] p-4">
            <div className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-[13px] font-extrabold text-black">Auto-send AI replies</span>
                <span className="mt-1 block text-[11px] font-medium leading-relaxed text-[#46506a]">
                  Keep off while testing. When off, AI drafts replies for approval.
                </span>
              </span>
              <SettingsToggle
                ariaLabel="Toggle auto-send AI replies"
                checked={draft.autoSend}
                onChange={(autoSend) => updateDraft({ autoSend })}
              />
            </div>
          </div>

          <div className="rounded-[10px] bg-[#f6f7fb] p-4">
            <h3 className="text-[13px] font-extrabold text-black">Live inbox behavior</h3>
            <p className="mt-2 text-[12px] font-medium leading-relaxed text-[#46506a]">
              The inbox AI Reply button uses this OpenAI connection. Lead qualification and CTA guidance are included in generated replies.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function SettingsRulesCard({
  rules,
  onChange,
  onManage,
  onAddRule,
}: {
  rules: EscalationRuleSetting[];
  onChange: (rules: EscalationRuleSetting[]) => void;
  onManage?: () => void;
  onAddRule?: () => void;
}) {
  function updateRule(id: string, partial: Partial<EscalationRuleSetting>) {
    onChange(rules.map((rule) => (rule.id === id ? { ...rule, ...partial } : rule)));
  }

  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <div className="flex items-center gap-2">
        <TriangleAlert size={17} strokeWidth={2.35} />
        <h2 className="text-[15px] font-extrabold text-black">Escalation Rules</h2>
      </div>
      <p className="mt-3 text-[11px] font-medium text-[#46506a]">Your AI knows when to escalate to you.</p>

      <div className="mt-4 space-y-4">
        {rules.map((rule) => {
          const visual = ruleVisuals[rule.id] || { icon: TriangleAlert, tone: "bg-[#eef4ff] text-[#3044ff]" };
          const Icon = visual.icon;
          return (
            <div key={rule.id} className="grid w-full grid-cols-[34px_minmax(0,1fr)] gap-3 text-left">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] ${visual.tone}`}>
                <Icon size={15} strokeWidth={2.35} />
              </span>
              <div className="min-w-0">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <span className="min-w-0">
                    <span className="block text-[12px] font-extrabold leading-tight text-black">{rule.label}</span>
                    <span className="mt-1 block text-[11px] font-medium text-[#46506a]">{rule.priority} priority</span>
                  </span>
                  <SettingsToggle ariaLabel={`Toggle ${rule.label}`} checked={rule.enabled} onChange={(checked) => updateRule(rule.id, { enabled: checked })} />
                </div>
                <SettingsSelect
                  ariaLabel={`${rule.label} action`}
                  value={rule.action}
                  options={["Always escalate", "High priority", "Escalate for approval", "Escalate immediately", "Monitor only"]}
                  onChange={(value) => updateRule(rule.id, { action: value })}
                  className="mt-2 w-full"
                />
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onAddRule || onManage}
        className="mt-5 flex h-10 w-full items-center justify-between rounded-[8px] border border-[#dde3ee] bg-white px-4 text-[12px] font-extrabold text-black"
      >
        {onAddRule ? "Add custom rule" : "Manage rules"}
        {onAddRule ? <Plus size={15} strokeWidth={2.5} /> : <ArrowRight size={15} strokeWidth={2.5} />}
      </button>
    </section>
  );
}

function SettingsNotificationsCard({
  notifications,
  onChange,
  onManage,
}: {
  notifications: NotificationSetting[];
  onChange: (notifications: NotificationSetting[]) => void;
  onManage?: () => void;
}) {
  const [savedMessage, setSavedMessage] = useState("");
  const [pushPermission, setPushPermission] = useState<BrowserNotificationPermission>(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }

    return Notification.permission;
  });

  useEffect(() => {
    if (!savedMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setSavedMessage(""), 1800);
    return () => window.clearTimeout(timeout);
  }, [savedMessage]);

  const activeCount = notifications.filter((notification) => notification.enabled).length;
  const emailSetting = notifications.find((notification) => notification.id === "email");
  const pushSetting = notifications.find((notification) => notification.id === "push");

  function updateNotification(id: string, partial: Partial<NotificationSetting>) {
    onChange(
      notifications.map((notification) => {
        if (notification.id !== id) {
          return notification;
        }

        const nextNotification = { ...notification, ...partial };

        if (partial.enabled === false) {
          return { ...nextNotification, value: "Off" };
        }

        if (partial.enabled === true && nextNotification.value === "Off") {
          return { ...nextNotification, value: getDefaultNotificationValue(id) };
        }

        return nextNotification;
      })
    );
    setSavedMessage("Saved automatically");
  }

  async function requestPushPermission(nextValue = getDefaultNotificationValue("push")) {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPushPermission("unsupported");
      return;
    }

    const permission = await Notification.requestPermission();
    setPushPermission(permission);
    updateNotification("push", {
      enabled: permission === "granted",
      value: permission === "granted" ? nextValue : "Off",
    });
  }

  function handleToggle(id: string, checked: boolean) {
    if (id === "push" && checked && pushPermission !== "granted") {
      void requestPushPermission();
      return;
    }

    updateNotification(id, { enabled: checked });
  }

  function handleSelect(id: string, value: string) {
    if (id === "push" && value !== "Off" && pushPermission !== "granted") {
      void requestPushPermission(value);
      return;
    }

    updateNotification(id, { value, enabled: value !== "Off" });
  }

  async function sendTestNotification() {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      await requestPushPermission();
    }

    try {
      const response = await fetch("/api/notifications/test", {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Could not send test notification");
      }

      setSavedMessage("Realtime test sent");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not send test notification";
      setSavedMessage(message);
    }
  }

  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bell size={17} strokeWidth={2.35} />
            <h2 className="text-[15px] font-extrabold text-black">Notifications</h2>
          </div>
          <p className="mt-3 text-[11px] font-medium text-[#46506a]">Choose how and when you are notified.</p>
        </div>
        <span className="inline-flex h-8 items-center rounded-[8px] bg-[#f0edff] px-3 text-[11px] font-extrabold text-[#3044ff]">
          {activeCount} active
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {notifications.map((item) => {
          const visual = notificationVisuals[item.id] || { icon: Bell };
          const Icon = visual.icon;
          return (
            <div key={item.id} className="grid w-full grid-cols-[34px_minmax(0,1fr)] gap-3 text-left">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-[#f3f4f8] text-[#31394f]">
                <Icon size={15} strokeWidth={2.25} />
              </span>
              <div className="min-w-0">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <span className="min-w-0 text-[12px] font-extrabold leading-tight text-black">{item.label}</span>
                  <SettingsToggle
                    ariaLabel={`${item.label} notifications ${item.enabled ? "active" : "inactive"}`}
                    checked={item.enabled}
                    onChange={(checked) => handleToggle(item.id, checked)}
                    showStateLabel
                  />
                </div>
                <SettingsSelect
                  ariaLabel={`${item.label} delivery`}
                  value={item.value}
                  options={getNotificationOptions(item.id)}
                  onChange={(value) => handleSelect(item.id, value)}
                  className="mt-2 w-full"
                />
                {item.id === "push" && pushPermission === "denied" ? (
                  <p className="mt-2 text-[11px] font-semibold text-[#df405b]">
                    Push notifications are blocked in this browser. Enable them in browser site settings.
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid gap-3 rounded-[10px] border border-[#e7eaf2] bg-[#fbfcff] p-4 sm:grid-cols-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.02em] text-[#697083]">Email</p>
          <p className="mt-1 text-[12px] font-bold text-black">{emailSetting?.enabled ? emailSetting.value : "Off"}</p>
        </div>
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.02em] text-[#697083]">Push access</p>
          <p className="mt-1 text-[12px] font-bold text-black">{formatBrowserNotificationPermission(pushPermission)}</p>
        </div>
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.02em] text-[#697083]">Escalations</p>
          <p className="mt-1 text-[12px] font-bold text-black">
            {notifications.find((notification) => notification.id === "escalation")?.enabled ? "Instant alerts" : "Off"}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className={`text-[11px] font-extrabold ${savedMessage ? "text-[#13a84f]" : "text-[#697083]"}`}>
          {savedMessage || "Changes are saved to your account."}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={sendTestNotification}
            disabled={pushSetting?.enabled === false}
            className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-4 text-[12px] font-extrabold text-black transition hover:bg-[#f8f9fc] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Bell size={14} strokeWidth={2.4} />
            Test push
          </button>
          <button
            type="button"
            onClick={() => {
              if (onManage) {
                onManage();
                return;
              }

              setSavedMessage("You are managing notifications now");
            }}
            className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#3044ff] px-4 text-[12px] font-extrabold text-white shadow-[0_14px_28px_rgba(48,68,255,0.18)]"
          >
            Manage notifications
            <ArrowRight size={15} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </section>
  );
}

function formatBrowserNotificationPermission(permission: BrowserNotificationPermission) {
  if (permission === "granted") {
    return "Allowed";
  }

  if (permission === "denied") {
    return "Blocked";
  }

  if (permission === "unsupported") {
    return "Unsupported";
  }

  return "Not requested";
}

function SettingsBillingCard({
  billing,
  onManage,
}: {
  billing: BillingSettings;
  onManage?: () => void;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)] md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-[#f0edff] text-[#3044ff]">
          <Crown size={24} strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[16px] font-extrabold text-black">{billing.plan}</h2>
            <span className="rounded-[8px] bg-[#e7f8ed] px-2.5 py-1 text-[10px] font-extrabold text-[#0a9b3f]">{billing.status}</span>
          </div>
          <p className="mt-2 text-[12px] font-medium text-[#46506a]">
            {billing.price} &middot; Next billing date: {billing.nextBillingDate}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:w-[354px]">
        <button
          type="button"
          onClick={onManage}
          className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-4 text-[12px] font-extrabold text-black"
        >
          <FileText size={14} strokeWidth={2.3} />
          View invoices
        </button>
        <button
          type="button"
          onClick={onManage}
          className="flex h-10 items-center justify-center gap-3 rounded-[8px] bg-[#3044ff] px-4 text-[12px] font-extrabold text-white shadow-[0_18px_36px_rgba(48,68,255,0.24)]"
        >
          Manage billing
          <ArrowRight size={15} strokeWidth={2.4} />
        </button>
      </div>
    </section>
  );
}

function SettingsSectionHeader({
  section,
  action,
}: {
  section: SettingsSection;
  action?: ReactNode;
}) {
  const item = settingsMenuItems.find((menuItem) => menuItem.id === section);
  const Icon = item?.icon || Settings;

  return (
    <div className="flex flex-col gap-4 rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#f0edff] text-[#3044ff]">
          <Icon size={22} strokeWidth={2.35} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[18px] font-extrabold text-black">{item?.label || "Settings"}</h2>
          <p className="mt-1 text-[12px] font-medium text-[#46506a]">{item?.detail || "Manage this area."}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function getConversationLabel(conversation: InstagramSettingsConversation) {
  return (
    conversation.participant.username ||
    conversation.participant.name ||
    `Instagram user ${conversation.participant.id.slice(-6)}`
  );
}

function getConversationPreviewForSettings(conversation: InstagramSettingsConversation) {
  const lastMessage = conversation.messages[0];

  if (!lastMessage) {
    return "No messages yet";
  }

  if (lastMessage.text) {
    return lastMessage.text;
  }

  const firstAttachment = lastMessage.attachments?.[0];
  if (firstAttachment?.type === "image") return "Photo";
  if (firstAttachment?.type === "video") return "Video";
  if (firstAttachment) return firstAttachment.name || "Attachment";

  return "Message";
}

function createEmptyAgentDraft(): AgentAccount & { password: string } {
  return {
    id: "",
    name: "",
    email: "",
    password: "",
    status: "Active",
    allowedPages: ["inbox", "escalations", "settings"],
    assignedConversationIds: [],
    humanEscalation: true,
  };
}

const agentAccountsPageSize = 5;
const conversationAssignmentsPageSize = 10;

function SettingsAgentsSection({ mode }: { mode: "agents" | "permissions" }) {
  const [agents, setAgents] = useState<AgentAccount[]>([]);
  const [conversations, setConversations] = useState<InstagramSettingsConversation[]>([]);
  const [draft, setDraft] = useState<AgentAccount & { password: string }>(createEmptyAgentDraft);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agentPage, setAgentPage] = useState(1);
  const [conversationPage, setConversationPage] = useState(1);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedAgent = agents.find((agent) => agent.id === draft.id);
  const selectedConversationCount = draft.assignedConversationIds.length;
  const isPermissionsMode = mode === "permissions";
  const totalAgentPages = Math.max(1, Math.ceil(agents.length / agentAccountsPageSize));
  const currentAgentPage = Math.min(agentPage, totalAgentPages);
  const agentPageStartIndex = agents.length === 0 ? 0 : (currentAgentPage - 1) * agentAccountsPageSize;
  const paginatedAgents = agents.slice(agentPageStartIndex, agentPageStartIndex + agentAccountsPageSize);
  const agentPageEndIndex = Math.min(agentPageStartIndex + paginatedAgents.length, agents.length);
  const totalConversationPages = Math.max(1, Math.ceil(conversations.length / conversationAssignmentsPageSize));
  const currentConversationPage = Math.min(conversationPage, totalConversationPages);
  const conversationPageStartIndex =
    conversations.length === 0 ? 0 : (currentConversationPage - 1) * conversationAssignmentsPageSize;
  const paginatedConversations = conversations.slice(
    conversationPageStartIndex,
    conversationPageStartIndex + conversationAssignmentsPageSize
  );
  const conversationPageEndIndex = Math.min(conversationPageStartIndex + paginatedConversations.length, conversations.length);
  const allConversationsSelected =
    conversations.length > 0 && conversations.every((conversation) => draft.assignedConversationIds.includes(conversation.id));

  const loadAgents = useCallback(async () => {
    const response = await fetch("/api/agents", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const data: AgentsResponse = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error || "Could not load agents");
    }

    setAgents(data.agents || []);
  }, []);

  const loadConversations = useCallback(async () => {
    const response = await fetch("/api/instagram/conversations", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const data: InstagramConversationsResponse = await response.json();

    if (!response.ok || (data.error && data.error !== "No Instagram account connected")) {
      throw new Error(data.error || "Could not load conversations");
    }

    setConversations(data.conversations || []);
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      if (isPermissionsMode) {
        await Promise.all([loadAgents(), loadConversations()]);
      } else {
        await loadAgents();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load agent settings");
    } finally {
      setIsLoading(false);
    }
  }, [isPermissionsMode, loadAgents, loadConversations]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void refreshData(), 0);

    return () => window.clearTimeout(timeout);
  }, [refreshData]);

  useEffect(() => {
    if (mode !== "agents") {
      return;
    }

    const resetDraft = () => {
      setDraft(createEmptyAgentDraft());
      setShowPassword(false);
    };
    const immediateReset = window.setTimeout(resetDraft, 0);
    const autofillReset = window.setTimeout(resetDraft, 250);

    return () => {
      window.clearTimeout(immediateReset);
      window.clearTimeout(autofillReset);
    };
  }, [mode]);

  useEffect(() => {
    if (!isPermissionsMode || draft.id || agents.length === 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setDraft({
        ...agents[0],
        password: "",
      });
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [agents, draft.id, isPermissionsMode]);

  function updateDraft<K extends keyof (AgentAccount & { password: string })>(
    key: K,
    value: (AgentAccount & { password: string })[K]
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function selectAgent(agent: AgentAccount) {
    setStatusMessage("");
    setErrorMessage("");
    setShowPassword(false);
    setDraft({
      ...agent,
      password: "",
    });
  }

  function startNewAgent() {
    setStatusMessage("");
    setErrorMessage("");
    setShowPassword(false);
    setDraft(createEmptyAgentDraft());
  }

  function togglePage(pageId: PagePermissionId) {
    updateDraft(
      "allowedPages",
      draft.allowedPages.includes(pageId)
        ? draft.allowedPages.filter((item) => item !== pageId)
        : [...draft.allowedPages, pageId]
    );
  }

  function toggleConversation(conversationId: string) {
    updateDraft(
      "assignedConversationIds",
      draft.assignedConversationIds.includes(conversationId)
        ? draft.assignedConversationIds.filter((item) => item !== conversationId)
        : [...draft.assignedConversationIds, conversationId]
    );
  }

  function selectAllConversations() {
    const allConversationIds = conversations.map((conversation) => conversation.id);
    updateDraft("assignedConversationIds", Array.from(new Set([...draft.assignedConversationIds, ...allConversationIds])));
  }

  async function saveAgent() {
    setIsSaving(true);
    setStatusMessage("");
    setErrorMessage("");
    const isCreatingAgent = !draft.id;

    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: draft.id ? "update" : "create",
          id: draft.id || undefined,
          name: draft.name,
          email: draft.email,
          password: draft.password || undefined,
          allowedPages: draft.allowedPages,
          assignedConversationIds: draft.assignedConversationIds,
          humanEscalation: draft.humanEscalation,
        }),
      });
      const data: AgentsResponse = await response.json();

      if (!response.ok || data.error || !data.agent) {
        throw new Error(data.error || "Could not save agent");
      }

      setAgents((current) => {
        const exists = current.some((agent) => agent.id === data.agent?.id);
        return exists
          ? current.map((agent) => (agent.id === data.agent?.id ? data.agent : agent))
          : [...current, data.agent!];
      });
      if (isCreatingAgent) {
        setAgentPage(Math.max(1, Math.ceil((agents.length + 1) / agentAccountsPageSize)));
      }
      setShowPassword(false);
      setDraft(isCreatingAgent ? createEmptyAgentDraft() : { ...data.agent, password: "" });
      setStatusMessage(isPermissionsMode ? "Agent permissions updated." : isCreatingAgent ? "Agent login created. Add another agent below." : "Agent updated.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save agent");
    } finally {
      setIsSaving(false);
    }
  }

  async function suspendAgent(agent: AgentAccount) {
    setIsSaving(true);
    setStatusMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "suspend", id: agent.id }),
      });
      const data: AgentsResponse = await response.json();

      if (!response.ok || data.error || !data.agent) {
        throw new Error(data.error || "Could not suspend agent");
      }

      setAgents((current) => current.map((item) => (item.id === data.agent?.id ? data.agent : item)));

      if (draft.id === agent.id) {
        setDraft({ ...data.agent, password: "" });
      }

      setStatusMessage("Agent suspended.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not suspend agent");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-5">
      <SettingsSectionHeader
        section={mode}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-[8px] bg-[#f0edff] px-3 py-1.5 text-[11px] font-extrabold text-[#3044ff]">
              {agents.length} agents
            </span>
            <button
              type="button"
              onClick={() => void refreshData()}
              disabled={isLoading}
              className="flex h-9 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[11px] font-extrabold text-black disabled:opacity-60"
            >
              <RefreshCw size={13} strokeWidth={2.4} className={isLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        }
      />

      {(statusMessage || errorMessage) && (
        <p
          className={`rounded-[8px] px-3 py-2 text-[11px] font-semibold ${
            errorMessage ? "bg-[#fff7f9] text-[#df405b]" : "bg-[#f6f7fb] text-[#46506a]"
          }`}
        >
          {errorMessage || statusMessage}
        </p>
      )}

      <div className="grid gap-5">
        {mode === "agents" && (
        <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-extrabold text-black">{draft.id ? "Edit agent" : "Create agent login"}</h3>
              <p className="mt-1 text-[11px] font-medium text-[#46506a]">
                {draft.id ? "Update access for this support account." : "Create a Supabase login for a support agent."}
              </p>
            </div>
            <button
              type="button"
              onClick={startNewAgent}
              className="flex h-9 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[11px] font-extrabold text-black"
            >
              {draft.id ? <Plus size={14} strokeWidth={2.5} /> : <X size={14} strokeWidth={2.5} />}
              {draft.id ? "New agent" : "Clear"}
            </button>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="block">
              <span className="text-[11px] font-extrabold text-[#46506a]">Name</span>
              <input
                value={draft.name}
                name="agent-display-name"
                autoComplete="off"
                onChange={(event) => updateDraft("name", event.target.value)}
                className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-extrabold text-[#46506a]">Login email</span>
              <input
                value={draft.email}
                type="email"
                name="agent-login-email"
                autoComplete="off"
                onChange={(event) => updateDraft("email", event.target.value)}
                className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-extrabold text-[#46506a]">
                {draft.id ? "New password" : "Password"}
              </span>
              <span className="relative mt-2 block">
                <input
                  value={draft.password}
                  type={showPassword ? "text" : "password"}
                  name="agent-new-password"
                  autoComplete="new-password"
                  placeholder={draft.id ? "Leave blank to keep current password" : "At least 8 characters"}
                  onChange={(event) => updateDraft("password", event.target.value)}
                  className="h-10 w-full rounded-[8px] border border-[#dde3ee] px-3 pr-11 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[7px] text-[#596175] transition hover:bg-[#f6f7fb] hover:text-black"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} strokeWidth={2.3} /> : <Eye size={15} strokeWidth={2.3} />}
                </button>
              </span>
            </label>
            <div className="flex items-center justify-between gap-4 rounded-[10px] border border-[#edf0f6] px-3 py-3">
              <div>
                <p className="text-[12px] font-extrabold text-black">Human escalation</p>
                <p className="mt-1 text-[11px] font-medium text-[#46506a]">Agent can receive escalated conversations.</p>
              </div>
              <SettingsToggle
                ariaLabel="Toggle human escalation"
                checked={draft.humanEscalation}
                onChange={(checked) => updateDraft("humanEscalation", checked)}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={saveAgent}
            disabled={isSaving}
            className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#3044ff] px-4 text-[12px] font-extrabold text-white shadow-[0_18px_36px_rgba(48,68,255,0.24)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? <RefreshCw size={14} strokeWidth={2.4} className="animate-spin" /> : <Shield size={14} strokeWidth={2.4} />}
            {draft.id ? "Save agent" : "Create agent"}
          </button>
        </section>
        )}

        {mode === "permissions" && (
        <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-extrabold text-black">Page permissions</h3>
              <p className="mt-1 text-[11px] font-medium text-[#46506a]">
                {draft.id ? `${draft.name || selectedAgent?.name || "Selected agent"} can only open checked pages.` : "Select an agent below before changing page access."}
              </p>
            </div>
            <span className="rounded-[8px] bg-[#eef4ff] px-3 py-1.5 text-[11px] font-extrabold text-[#3044ff]">
              {draft.allowedPages.length} pages
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {pagePermissionOptions.map((option) => {
              const checked = draft.allowedPages.includes(option.id);

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => draft.id && togglePage(option.id)}
                  disabled={!draft.id}
                  className={`min-h-[72px] rounded-[10px] border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    checked ? "border-[#cfd7ff] bg-[#f6f7ff]" : "border-[#edf0f6] bg-white hover:bg-[#fbfbff]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-[6px] border ${
                        checked ? "border-[#3044ff] bg-[#3044ff] text-white" : "border-[#d7ddeb] bg-white text-transparent"
                      }`}
                    >
                      <Check size={13} strokeWidth={2.8} />
                    </span>
                    <span className="text-[12px] font-extrabold text-black">{option.label}</span>
                  </span>
                  <span className="mt-2 block text-[11px] font-medium leading-[1.35] text-[#46506a]">{option.detail}</span>
                </button>
              );
            })}
          </div>
        </section>
        )}
      </div>

      {mode === "permissions" && (
      <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-extrabold text-black">Conversation assignments</h3>
            <p className="mt-1 text-[11px] font-medium text-[#46506a]">
              Agents only see conversations checked here after login.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={selectAllConversations}
              disabled={!draft.id || conversations.length === 0 || allConversationsSelected}
              className="flex h-9 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[11px] font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Check size={13} strokeWidth={2.6} />
              {allConversationsSelected ? "All selected" : "Select all"}
            </button>
            <span className="rounded-[8px] bg-[#f0edff] px-3 py-1.5 text-[11px] font-extrabold text-[#3044ff]">
              {selectedConversationCount} assigned
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-5 flex min-h-[120px] items-center justify-center gap-2 rounded-[10px] bg-[#f6f7fb] text-[12px] font-semibold text-[#46506a]">
            <RefreshCw size={15} strokeWidth={2.3} className="animate-spin text-[#3044ff]" />
            Loading agents and conversations
          </div>
        ) : conversations.length === 0 ? (
          <div className="mt-5 rounded-[10px] border border-[#edf0f6] bg-[#fbfbff] p-4 text-[12px] font-medium text-[#46506a]">
            Connect Instagram or receive a DM first, then conversations will appear here for assignment.
          </div>
        ) : (
          <div className="mt-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {paginatedConversations.map((conversation) => {
                const checked = draft.assignedConversationIds.includes(conversation.id);
                const label = getConversationLabel(conversation);

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => draft.id && toggleConversation(conversation.id)}
                    disabled={!draft.id}
                    className={`min-h-[82px] rounded-[10px] border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      checked ? "border-[#cfd7ff] bg-[#f6f7ff]" : "border-[#edf0f6] bg-white hover:bg-[#fbfbff]"
                    }`}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-extrabold text-black">{label}</span>
                        <span className="mt-1 block line-clamp-1 text-[11px] font-medium text-[#46506a]">
                          {getConversationPreviewForSettings(conversation)}
                        </span>
                      </span>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border ${
                          checked ? "border-[#3044ff] bg-[#3044ff] text-white" : "border-[#d7ddeb] bg-white text-transparent"
                        }`}
                      >
                        <Check size={13} strokeWidth={2.8} />
                      </span>
                    </span>
                    <span className="mt-2 block truncate text-[10px] font-semibold text-[#697083]">{conversation.id}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t border-[#edf0f6] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] font-semibold text-[#46506a]">
                Showing {conversationPageStartIndex + 1}-{conversationPageEndIndex} of {conversations.length} conversations
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConversationPage(Math.max(1, currentConversationPage - 1))}
                  disabled={currentConversationPage === 1}
                  className="flex h-8 items-center gap-1.5 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[11px] font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <ChevronLeft size={13} strokeWidth={2.5} />
                  Previous
                </button>
                {Array.from({ length: totalConversationPages }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setConversationPage(page)}
                    aria-current={page === currentConversationPage ? "page" : undefined}
                    className={`flex h-8 min-w-8 items-center justify-center rounded-[8px] px-2 text-[11px] font-extrabold ${
                      page === currentConversationPage
                        ? "bg-[#3044ff] text-white"
                        : "border border-[#dde3ee] bg-white text-black hover:bg-[#f6f7fb]"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setConversationPage(Math.min(totalConversationPages, currentConversationPage + 1))}
                  disabled={currentConversationPage === totalConversationPages}
                  className="flex h-8 items-center gap-1.5 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[11px] font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Next
                  <ChevronRight size={13} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
      )}

      {mode === "permissions" && draft.id && (
        <button
          type="button"
          onClick={saveAgent}
          disabled={isSaving}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#3044ff] px-4 text-[12px] font-extrabold text-white shadow-[0_18px_36px_rgba(48,68,255,0.24)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? <RefreshCw size={14} strokeWidth={2.4} className="animate-spin" /> : <Shield size={14} strokeWidth={2.4} />}
          Save permissions
        </button>
      )}

      <section className={`rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)] ${mode === "permissions" ? "order-first" : ""}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[15px] font-extrabold text-black">{mode === "permissions" ? "Select agent" : "Agent accounts"}</h3>
          <span className="text-[11px] font-semibold text-[#46506a]">
            {mode === "permissions" ? "Choose which agent receives these permissions." : "Login uses each agent's own email and password."}
          </span>
        </div>

        <div className="mt-4 divide-y divide-[#edf0f6] border-t border-[#edf0f6]">
          {agents.length === 0 ? (
            <p className="py-6 text-[12px] font-medium text-[#46506a]">No agents created yet.</p>
          ) : (
            paginatedAgents.map((agent) => {
	              const isSelectedAgent = mode === "permissions" && draft.id === agent.id;

	              return (
	                <div
	                  key={agent.id}
	                  className={`grid gap-3 py-4 xl:grid-cols-[minmax(0,1fr)_130px_150px_180px] xl:items-center ${
	                    isSelectedAgent ? "rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff] px-3 shadow-[0_14px_34px_rgba(48,68,255,0.08)]" : ""
	                  }`}
	                >
	                  <button type="button" onClick={() => selectAgent(agent)} className="min-w-0 text-left">
	                    <p className="truncate text-[13px] font-extrabold text-black">{agent.name}</p>
	                    <p className="mt-1 truncate text-[11px] font-medium text-[#46506a]">{agent.email}</p>
	                  </button>
	                  <span className={`w-max rounded-[8px] px-2.5 py-1 text-[10px] font-extrabold ${agent.status === "Active" ? "bg-[#e7f8ed] text-[#0a9b3f]" : "bg-[#fff3e6] text-[#ff850d]"}`}>
	                    {agent.status}
	                  </span>
	                  <span className="text-[11px] font-semibold text-[#46506a]">
	                    {agent.allowedPages.length} pages · {agent.assignedConversationIds.length} conversations
	                  </span>
	                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">
	                    <button
	                      type="button"
	                      onClick={() => selectAgent(agent)}
	                      className={`flex h-8 items-center justify-center gap-1.5 rounded-[8px] px-3 text-[11px] font-extrabold ${
	                        isSelectedAgent
	                          ? "border border-[#7c3aed] bg-[#7c3aed] text-white shadow-[0_12px_24px_rgba(124,58,237,0.24)]"
	                          : "border border-[#dde3ee] bg-white text-black"
	                      }`}
	                    >
	                      {isSelectedAgent && <Check size={13} strokeWidth={2.7} />}
	                      {isSelectedAgent ? "Selected" : mode === "permissions" ? "Select" : "Edit"}
	                    </button>
	                    {mode === "agents" && (
	                      <button
	                        type="button"
	                        onClick={() => void suspendAgent(agent)}
	                        disabled={isSaving || agent.status === "Suspended"}
	                        className="h-8 rounded-[8px] border border-[#ffd6dd] bg-[#fff8fa] px-3 text-[11px] font-extrabold text-[#df405b] disabled:cursor-not-allowed disabled:opacity-50"
	                      >
	                        Suspend
	                      </button>
	                    )}
	                  </div>
	                </div>
	              );
            })
          )}
        </div>

        {agents.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 border-t border-[#edf0f6] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] font-semibold text-[#46506a]">
              Showing {agentPageStartIndex + 1}-{agentPageEndIndex} of {agents.length} agents
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAgentPage(Math.max(1, currentAgentPage - 1))}
                disabled={currentAgentPage === 1}
                className="flex h-8 items-center gap-1.5 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[11px] font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ChevronLeft size={13} strokeWidth={2.5} />
                Previous
              </button>
              {Array.from({ length: totalAgentPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setAgentPage(page)}
                  aria-current={page === currentAgentPage ? "page" : undefined}
                  className={`flex h-8 min-w-8 items-center justify-center rounded-[8px] px-2 text-[11px] font-extrabold ${
                    page === currentAgentPage
                      ? "bg-[#3044ff] text-white"
                      : "border border-[#dde3ee] bg-white text-black hover:bg-[#f6f7fb]"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAgentPage(Math.min(totalAgentPages, currentAgentPage + 1))}
                disabled={currentAgentPage === totalAgentPages}
                className="flex h-8 items-center gap-1.5 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[11px] font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-45"
              >
                Next
                <ChevronRight size={13} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function SettingsBillingSection({
  billing,
  onChange,
}: {
  billing: BillingSettings;
  onChange: (billing: BillingSettings) => void;
}) {
  const [billingMessage, setBillingMessage] = useState("");
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [isPricingLoading, setIsPricingLoading] = useState(true);
  const [buyingPlanId, setBuyingPlanId] = useState("");
  const activePricingPlans = pricingPlans.filter((plan) => plan.status === "active");
  const planOptions = activePricingPlans.length > 0 ? activePricingPlans.map((plan) => plan.name) : ["Starter Plan", "Pro Plan", "Scale Plan"];
  const invoices = [
    ["INV-2026-06", "June 2026", billing.price.split(" / ")[0] || "$0", billing.status],
    ["INV-2026-05", "May 2026", billing.price.split(" / ")[0] || "$0", billing.status],
    ["INV-2026-04", "April 2026", billing.price.split(" / ")[0] || "$0", billing.status],
  ];

  useEffect(() => {
    let isMounted = true;

    async function loadPricingPlans() {
      try {
        const response = await fetch("/api/pricing", {
          cache: "no-store",
        });
        const data = (await response.json()) as PricingResponse;

        if (!response.ok || data.error) {
          throw new Error(data.error || "Could not load pricing plans");
        }

        if (isMounted) {
          setPricingPlans(data.plans || []);
        }
      } catch (error) {
        if (isMounted) {
          setBillingMessage(error instanceof Error ? error.message : "Could not load pricing plans");
        }
      } finally {
        if (isMounted) {
          setIsPricingLoading(false);
        }
      }
    }

    void loadPricingPlans();

    return () => {
      isMounted = false;
    };
  }, []);

  async function activatePlan(plan: PricingPlan) {
    setBuyingPlanId(plan.id);
    setBillingMessage("");

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = (await response.json()) as { billing?: Partial<BillingSettings>; error?: string };

      if (!response.ok || data.error) {
        throw new Error(data.error || "Could not activate plan");
      }

      onChange({
        ...billing,
        plan: data.billing?.plan || plan.name,
        status: data.billing?.status || "Active",
        price: data.billing?.price || `$${plan.monthlyPrice} / month`,
        nextBillingDate: data.billing?.nextBillingDate || billing.nextBillingDate,
        invoiceEmail: data.billing?.invoiceEmail || billing.invoiceEmail,
      });
      setBillingMessage(`${plan.name} activated. Superadmin revenue pages will update after refresh.`);
    } catch (error) {
      setBillingMessage(error instanceof Error ? error.message : "Could not activate plan");
    } finally {
      setBuyingPlanId("");
    }
  }

  return (
    <div className="grid gap-5">
      <SettingsSectionHeader section="billing" />
      <SettingsBillingCard billing={billing} onManage={() => setBillingMessage("Invoices are shown below. Plan and billing preferences are saved on this page.")} />
      {billingMessage && <p className="rounded-[8px] bg-[#f6f7fb] px-3 py-2 text-[11px] font-semibold text-[#46506a]">{billingMessage}</p>}
      <section className="grid gap-5 rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)] lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Plan</span>
            <SettingsSelect
              ariaLabel="Billing plan"
              value={billing.plan}
              options={planOptions}
              onChange={(value) => onChange({ ...billing, plan: value })}
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Invoice email</span>
            <input
              value={billing.invoiceEmail}
              onChange={(event) => onChange({ ...billing, invoiceEmail: event.target.value })}
              className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            />
          </label>
          <div>
            <span className="text-[11px] font-extrabold text-[#46506a]">Seats</span>
            <div className="mt-2 flex w-max items-center rounded-[8px] border border-[#dde3ee]">
              <button type="button" onClick={() => onChange({ ...billing, seats: Math.max(1, billing.seats - 1) })} className="h-10 w-10 text-[16px] font-extrabold">-</button>
              <span className="min-w-10 text-center text-[12px] font-extrabold">{billing.seats}</span>
              <button type="button" onClick={() => onChange({ ...billing, seats: billing.seats + 1 })} className="h-10 w-10 text-[16px] font-extrabold">+</button>
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-[14px] font-extrabold text-black">Invoices</h3>
          <div className="mt-4 divide-y divide-[#edf0f6] border-t border-[#edf0f6]">
            {invoices.map(([id, date, amount, status]) => (
              <button key={id} type="button" className="grid min-h-[48px] w-full grid-cols-[minmax(0,1fr)_110px_70px_70px] items-center gap-3 text-left text-[12px]">
                <span className="truncate font-extrabold text-black">{id}</span>
                <span className="truncate font-medium text-[#46506a]">{date}</span>
                <span className="font-semibold text-[#253049]">{amount}</span>
                <span className="rounded-[8px] bg-[#e7f8ed] px-2 py-1 text-center text-[10px] font-extrabold text-[#0a9b3f]">{status}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[15px] font-extrabold text-black">Pricing</h3>
            <p className="mt-1 text-[11px] font-medium text-[#46506a]">
              Pick a plan to update your subscription and admin revenue in real time.
            </p>
          </div>
          {isPricingLoading && (
            <span className="flex items-center gap-2 text-[11px] font-bold text-[#687089]">
              <RefreshCw size={13} strokeWidth={2.4} className="animate-spin text-[#3044ff]" />
              Loading prices
            </span>
          )}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {(isPricingLoading && activePricingPlans.length === 0 ? Array.from({ length: 3 }) : activePricingPlans).map((planValue, index) => {
            const plan = planValue as PricingPlan | undefined;

            if (!plan) {
              return <div key={index} className="h-[230px] animate-pulse rounded-[10px] border border-[#edf0f6] bg-[#f6f7fb]" />;
            }

            const isCurrentPlan = billing.plan === plan.name;
            const isBuying = buyingPlanId === plan.id;

            return (
              <article
                key={plan.id}
                className={`rounded-[10px] border p-4 ${
                  isCurrentPlan ? "border-[#cfd7ff] bg-[#f6f7ff]" : "border-[#edf0f6] bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-[14px] font-extrabold text-black">{plan.name}</h4>
                    <p className="mt-1 text-[11px] font-medium leading-relaxed text-[#46506a]">{plan.description}</p>
                  </div>
                  {isCurrentPlan && <span className="rounded-[8px] bg-[#e7f8ed] px-2 py-1 text-[10px] font-extrabold text-[#0a9b3f]">Current</span>}
                </div>
                <p className="mt-4 text-[26px] font-extrabold text-black">
                  ${plan.monthlyPrice}
                  <span className="text-[12px] font-semibold text-[#687089]"> / month</span>
                </p>
                <ul className="mt-3 space-y-2">
                  {plan.features.slice(0, 4).map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-[11px] font-semibold text-[#46506a]">
                      <Check size={13} strokeWidth={2.6} className="text-[#0a9b3f]" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => void activatePlan(plan)}
                  disabled={isBuying || isCurrentPlan}
                  className={`mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] px-4 text-[12px] font-extrabold disabled:cursor-not-allowed disabled:opacity-60 ${
                    isCurrentPlan ? "bg-[#edf0f6] text-[#46506a]" : "bg-[#3044ff] text-white shadow-[0_18px_36px_rgba(48,68,255,0.24)]"
                  }`}
                >
                  {isBuying ? <RefreshCw size={14} strokeWidth={2.4} className="animate-spin" /> : <ShoppingCart size={14} strokeWidth={2.4} />}
                  {isCurrentPlan ? "Current plan" : plan.cta || "Buy plan"}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

const bookingSheetTypeOptions = [
  "Cricket ground booking",
  "Padel ground booking",
  "All confirmed bookings",
  "Custom booking type",
];

function hasUsableSheetLink(value: string) {
  return Boolean(getSheetDestinationUrl(value));
}

function getSheetDestinationUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  if (/^(docs\.google\.com|drive\.google\.com|script\.google\.com|script\.googleusercontent\.com|1drv\.ms|onedrive\.live\.com|office\.com)/i.test(trimmedValue)) {
    return `https://${trimmedValue}`;
  }

  const googleSheetIdMatch = trimmedValue.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const googleSheetId = googleSheetIdMatch?.[1] || (/^[a-zA-Z0-9-_]{20,}$/.test(trimmedValue) ? trimmedValue : "");

  if (googleSheetId) {
    return `https://docs.google.com/spreadsheets/d/${googleSheetId}/edit`;
  }

  return "";
}

const outcomeProviderLabels: Record<string, string> = {
  follow_creator: "Follow creator",
  join_newsletter: "Join newsletter",
  book_call: "Book call",
  start_trial: "Start trial",
  purchase_product: "Purchase product",
  upgrade_plan: "Upgrade plan",
  recover_abandoned_cart: "Recover cart",
  renew_subscription: "Renew subscription",
  collect_testimonial: "Collect testimonial",
};

function SettingsRevenueOutcomeProvidersSection({
  outcomeProviders,
  onChange,
}: {
  outcomeProviders: RevenueOutcomeProviderSettings;
  onChange: (outcomeProviders: RevenueOutcomeProviderSettings) => void;
}) {
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [providerSecrets, setProviderSecrets] = useState<Record<string, string>>({});
  const connectedCount = outcomeProviders.providers.filter(
    (provider) => provider.enabled && (provider.actionUrl || provider.webhookUrl || provider.apiEndpoint || provider.outcomeType === "purchase_product")
  ).length;

  function updateProvider(outcomeType: RevenueOutcomeProviderConfig["outcomeType"], partial: Partial<RevenueOutcomeProviderConfig>) {
    onChange({
      providers: outcomeProviders.providers.map((provider) =>
        provider.outcomeType === outcomeType
          ? { ...provider, ...partial, enabled: provider.outcomeType === "purchase_product" ? true : partial.enabled ?? provider.enabled }
          : provider
      ),
    });
  }

  function openProvider(provider: RevenueOutcomeProviderConfig) {
    if (!provider.actionUrl) {
      setMessage("Add a valid https link first.");
      return;
    }

    window.open(provider.actionUrl, "_blank", "noopener,noreferrer");
  }

  async function saveProviders() {
    setIsSaving(true);
    setMessage("Saving revenue outcome providers...");

    try {
      const response = await fetch("/api/revenue/outcome-providers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          outcomeProviders,
          providerSecrets: Object.entries(providerSecrets)
            .filter(([, secretToken]) => secretToken.trim())
            .map(([outcomeType, secretToken]) => ({ outcomeType, secretToken })),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { outcomeProviders?: unknown; error?: string };

      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Could not save revenue outcome providers");
      }

      const normalized = normalizeRevenueOutcomeProviderSettings(payload.outcomeProviders);
      onChange(normalized);
      setProviderSecrets({});
      setMessage("Revenue outcome providers saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save revenue outcome providers");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-[15px] font-extrabold text-black">Revenue outcome providers</h3>
          <p className="mt-1 max-w-[760px] text-[12px] font-medium leading-relaxed text-[#46506a]">
            Connect the links ROS should use when it chooses newsletter, booking, trial, upgrade, renewal, cart recovery, or testimonial outcomes.
          </p>
        </div>
        <span className="rounded-[8px] bg-[#f0edff] px-3 py-1.5 text-[11px] font-extrabold text-[#3044ff]">
          {connectedCount} ready
        </span>
      </div>

      <div className="mt-5 grid gap-3">
        {outcomeProviders.providers.map((provider) => {
          const isPurchase = provider.outcomeType === "purchase_product";
          const ready = provider.enabled && (provider.actionUrl || provider.webhookUrl || provider.apiEndpoint || isPurchase);

          return (
            <div key={provider.outcomeType} className="rounded-[10px] border border-[#edf0f6] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[13px] font-extrabold text-black">{outcomeProviderLabels[provider.outcomeType] || provider.outcomeType}</p>
                  <p className="mt-1 text-[11px] font-medium text-[#687089]">{provider.notes}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-[8px] px-2.5 py-1 text-[10px] font-extrabold ${ready ? "bg-[#e7f8ed] text-[#0a9b3f]" : "bg-[#fff3e6] text-[#c77800]"}`}>
                    {ready ? "Ready" : "Needs link"}
                  </span>
                  <SettingsToggle
                    ariaLabel={`Toggle ${outcomeProviderLabels[provider.outcomeType] || provider.outcomeType}`}
                    checked={provider.enabled}
                    onChange={(enabled) => updateProvider(provider.outcomeType, { enabled })}
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)]">
                <label className="block">
                  <span className="text-[11px] font-extrabold text-[#46506a]">Provider</span>
                  <input
                    value={provider.provider}
                    onChange={(event) => updateProvider(provider.outcomeType, { provider: event.target.value })}
                    disabled={isPurchase}
                    className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10 disabled:bg-[#f6f7fb] disabled:text-[#8a91a3]"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-extrabold text-[#46506a]">Action link</span>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={provider.actionUrl}
                      onChange={(event) => updateProvider(provider.outcomeType, { actionUrl: event.target.value, enabled: Boolean(event.target.value.trim()) || isPurchase })}
                      placeholder={isPurchase ? "Existing Stripe checkout is used for product purchases" : "https://..."}
                      disabled={isPurchase}
                      className="h-10 min-w-0 flex-1 rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10 disabled:bg-[#f6f7fb] disabled:text-[#8a91a3]"
                    />
                    <button
                      type="button"
                      onClick={() => openProvider(provider)}
                      disabled={!provider.actionUrl}
                      className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#dde3ee] disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Open ${provider.provider}`}
                    >
                      <ExternalLink size={14} strokeWidth={2.25} />
                    </button>
                  </div>
                </label>
              </div>

              <label className="mt-3 block">
                <span className="text-[11px] font-extrabold text-[#46506a]">CTA text</span>
                <input
                  value={provider.cta}
                  onChange={(event) => updateProvider(provider.outcomeType, { cta: event.target.value })}
                  className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
                />
              </label>

              <div className="mt-3 grid gap-3 lg:grid-cols-[160px_minmax(0,1fr)]">
                <label className="block">
                  <span className="text-[11px] font-extrabold text-[#46506a]">Execution</span>
                  <select
                    value={provider.executionMode}
                    onChange={(event) => updateProvider(provider.outcomeType, { executionMode: event.target.value as RevenueOutcomeProviderConfig["executionMode"] })}
                    disabled={isPurchase}
                    className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10 disabled:bg-[#f6f7fb] disabled:text-[#8a91a3]"
                  >
                    <option value="link">Link route</option>
                    <option value="webhook">Webhook POST</option>
                    <option value="api">API POST</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-[11px] font-extrabold text-[#46506a]">{provider.executionMode === "api" ? "API endpoint" : "Webhook URL"}</span>
                  <input
                    value={provider.executionMode === "api" ? provider.apiEndpoint : provider.webhookUrl}
                    onChange={(event) =>
                      updateProvider(
                        provider.outcomeType,
                        provider.executionMode === "api"
                          ? { apiEndpoint: event.target.value, enabled: Boolean(event.target.value.trim()) || provider.enabled }
                          : { webhookUrl: event.target.value, enabled: Boolean(event.target.value.trim()) || provider.enabled }
                      )
                    }
                    placeholder={provider.executionMode === "link" ? "Switch to webhook/API to execute automatically" : "https://..."}
                    disabled={isPurchase || provider.executionMode === "link"}
                    className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10 disabled:bg-[#f6f7fb] disabled:text-[#8a91a3]"
                  />
                </label>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px]">
                <label className="block">
                  <span className="text-[11px] font-extrabold text-[#46506a]">
                    Token {provider.secretSaved ? "(saved)" : "(optional)"}
                  </span>
                  <input
                    type="password"
                    value={providerSecrets[provider.outcomeType] || ""}
                    onChange={(event) => setProviderSecrets((current) => ({ ...current, [provider.outcomeType]: event.target.value }))}
                    placeholder={provider.secretSaved ? "Leave blank to keep saved token" : "Bearer/API token"}
                    disabled={isPurchase || provider.executionMode === "link"}
                    className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10 disabled:bg-[#f6f7fb] disabled:text-[#8a91a3]"
                  />
                </label>
                <div className="flex items-end justify-between gap-3 rounded-[8px] border border-[#edf0f6] px-3 py-2">
                  <span className="text-[11px] font-extrabold text-[#46506a]">Auto execute</span>
                  <SettingsToggle
                    ariaLabel={`Auto execute ${outcomeProviderLabels[provider.outcomeType] || provider.outcomeType}`}
                    checked={provider.autoExecute}
                    onChange={(autoExecute) => updateProvider(provider.outcomeType, { autoExecute })}
                  />
                </div>
              </div>

              {(provider.lastStatus || provider.lastSyncAt) && (
                <p className="mt-3 text-[10px] font-semibold text-[#8a91a3]">
                  Last sync: {provider.lastStatus || "unknown"} {provider.lastSyncAt ? `at ${new Date(provider.lastSyncAt).toLocaleString()}` : ""}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-[#edf0f6] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] font-semibold text-[#46506a]">
          These links are included in ROS decisions, outcome metadata, and AI prompts.
        </p>
        <button
          type="button"
          onClick={() => void saveProviders()}
          disabled={isSaving}
          className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#3044ff] px-4 text-[12px] font-extrabold text-white shadow-[0_18px_36px_rgba(48,68,255,0.22)] disabled:cursor-not-allowed disabled:opacity-65"
        >
          {isSaving ? <RefreshCw size={15} strokeWidth={2.5} className="animate-spin" /> : <Check size={15} strokeWidth={2.5} />}
          Save providers
        </button>
      </div>

      {message && <p className="mt-4 rounded-[8px] bg-[#f6f7fb] px-3 py-2 text-[11px] font-semibold text-[#46506a]">{message}</p>}
    </section>
  );
}

function SettingsBookingIntegrationsSection({
  integrations,
  onChange,
  hideHeader = false,
}: {
  integrations: BookingIntegrationSettings;
  onChange: (integrations: BookingIntegrationSettings) => void;
  hideHeader?: boolean;
}) {
  const [message, setMessage] = useState("");
  const [testingRouteId, setTestingRouteId] = useState("");
  const connectedRoutes = integrations.routes.filter((route) => route.enabled && hasUsableSheetLink(route.sheetUrl)).length;
  const activeRoutes = integrations.routes.filter((route) => route.enabled).length;

  function updateRoute(id: string, partial: Partial<BookingSheetRoute>) {
    onChange({
      ...integrations,
      routes: integrations.routes.map((route) => (route.id === id ? { ...route, ...partial } : route)),
    });
  }

  function addRoute() {
    const id = `booking-sheet-${Date.now()}`;

    onChange({
      ...integrations,
      routes: [
        ...integrations.routes,
        {
          id,
          name: "Custom booking sheet",
          bookingType: "Custom booking type",
          sheetUrl: "",
          worksheetName: "Confirmed Bookings",
          enabled: true,
          confirmedOnly: true,
          lastSync: "Not synced yet",
        },
      ],
    });
    setMessage("New booking sheet route added.");
  }

  function removeRoute(id: string) {
    onChange({
      ...integrations,
      routes: integrations.routes.filter((route) => route.id !== id),
    });
    setMessage("Booking sheet route removed.");
  }

  function copyRouteLink(route: BookingSheetRoute) {
    const destinationUrl = getSheetDestinationUrl(route.sheetUrl);

    if (!destinationUrl) {
      setMessage("Add a Google Sheet ID, Google Sheet link, Apps Script URL, or Excel web link before copying.");
      return;
    }

    void navigator.clipboard?.writeText(destinationUrl);
    setMessage(`${route.name} link copied.`);
  }

  function openRoute(route: BookingSheetRoute) {
    const destinationUrl = getSheetDestinationUrl(route.sheetUrl);

    if (!destinationUrl) {
      setMessage("Add a valid Google Sheet ID, Google Sheet link, Apps Script URL, or Excel web link first.");
      return;
    }

    window.open(destinationUrl, "_blank", "noopener,noreferrer");
  }

  async function testRoute(route: BookingSheetRoute) {
    if (!getSheetDestinationUrl(route.sheetUrl)) {
      setMessage("Add a valid Google Sheet ID, Google Sheet link, Apps Script URL, or Excel web link before testing this route.");
      return;
    }

    setTestingRouteId(route.id);
    setMessage(`Testing ${route.name}...`);

    try {
      const response = await fetch("/api/integrations/booking-sheets/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ route }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string; lastSync?: string };

      if (!response.ok) {
        setMessage(payload.error || "Could not test this booking route.");
        return;
      }

      updateRoute(route.id, { lastSync: payload.lastSync || "Route tested just now" });
      setMessage(payload.message || `${route.name} passed the route test.`);
    } catch {
      setMessage("Could not reach the route test API. Check that the dev server is running.");
    } finally {
      setTestingRouteId("");
    }
  }

  function getRouteStatus(route: BookingSheetRoute) {
    if (!route.enabled) {
      return { label: "Paused", className: "bg-[#edf0f6] text-[#687089]" };
    }

    if (!hasUsableSheetLink(route.sheetUrl)) {
      return { label: "Needs link", className: "bg-[#fff3e6] text-[#c77800]" };
    }

    return { label: "Ready", className: "bg-[#e7f8ed] text-[#0a9b3f]" };
  }

  return (
    <div className="grid gap-5">
      {!hideHeader ? (
        <SettingsSectionHeader
          section="integrations"
          action={
            <span className="rounded-[8px] bg-[#f0edff] px-3 py-1.5 text-[11px] font-extrabold text-[#3044ff]">
              {connectedRoutes} connected
            </span>
          }
        />
      ) : null}

      <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-[15px] font-extrabold text-black">Confirmed booking sheets</h3>
            <p className="mt-1 max-w-[760px] text-[12px] font-medium leading-relaxed text-[#46506a]">
              Add Google Sheet or Excel web links for booking exports. Confirmed cricket and padel bookings can be routed into separate tabs or separate sheets.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-[8px] bg-[#f6f7fb] px-3 py-1.5 text-[11px] font-extrabold text-[#46506a]">
              {activeRoutes} active routes
            </span>
            <SettingsToggle
              ariaLabel="Toggle confirmed booking sheet sync"
              checked={integrations.syncEnabled}
              onChange={(syncEnabled) => onChange({ ...integrations, syncEnabled })}
              showStateLabel
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {integrations.routes.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-[#d7deeb] bg-[#fbfbff] p-5 text-center">
              <FileText className="mx-auto text-[#3044ff]" size={24} strokeWidth={2.35} />
              <p className="mt-2 text-[12px] font-extrabold text-black">No booking sheet routes yet</p>
              <p className="mt-1 text-[11px] font-medium text-[#46506a]">Add a route for cricket, padel, or all confirmed bookings.</p>
            </div>
          ) : (
            integrations.routes.map((route) => {
              const status = getRouteStatus(route);
              const canRemove = !["cricket-ground", "padel-ground", "all-confirmed"].includes(route.id);
              const isTesting = testingRouteId === route.id;

              return (
                <div key={route.id} className="rounded-[10px] border border-[#edf0f6] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#f0edff] text-[#3044ff]">
                        <FileText size={18} strokeWidth={2.35} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-extrabold text-black">{route.name}</p>
                        <p className="mt-1 text-[11px] font-medium text-[#46506a]">{route.bookingType} to {route.worksheetName || "sheet tab"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-[8px] px-2.5 py-1 text-[10px] font-extrabold ${status.className}`}>{status.label}</span>
                      <SettingsToggle
                        ariaLabel={`Toggle ${route.name}`}
                        checked={route.enabled}
                        onChange={(enabled) => updateRoute(route.id, { enabled })}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_210px]">
                    <label className="block">
                      <span className="text-[11px] font-extrabold text-[#46506a]">Route name</span>
                      <input
                        value={route.name}
                        onChange={(event) => updateRoute(route.id, { name: event.target.value })}
                        className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-extrabold text-[#46506a]">Booking filter</span>
                      <SettingsSelect
                        ariaLabel={`${route.name} booking filter`}
                        value={route.bookingType}
                        options={bookingSheetTypeOptions}
                        onChange={(bookingType) => updateRoute(route.id, { bookingType })}
                        className="mt-2 w-full"
                      />
                    </label>
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <label className="block">
                      <span className="text-[11px] font-extrabold text-[#46506a]">Excel or Google Sheet link</span>
                      <input
                        value={route.sheetUrl}
                        onChange={(event) => updateRoute(route.id, { sheetUrl: event.target.value })}
                        placeholder="Paste Google Sheet ID, Google Sheet link, Apps Script URL, or Excel web link"
                        className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-extrabold text-[#46506a]">Sheet tab name</span>
                      <input
                        value={route.worksheetName}
                        onChange={(event) => updateRoute(route.id, { worksheetName: event.target.value })}
                        className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 border-t border-[#edf0f6] pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <SettingsToggle
                        ariaLabel={`${route.name} confirmed only`}
                        checked={route.confirmedOnly}
                        onChange={(confirmedOnly) => updateRoute(route.id, { confirmedOnly })}
                      />
                      <div>
                        <p className="text-[12px] font-extrabold text-black">Confirmed bookings only</p>
                        <p className="text-[11px] font-medium text-[#687089]">{route.lastSync}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyRouteLink(route)}
                        className="flex h-9 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[11px] font-extrabold text-black"
                      >
                        <Copy size={14} strokeWidth={2.35} />
                        Copy link
                      </button>
                      <button
                        type="button"
                        onClick={() => openRoute(route)}
                        className="flex h-9 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[11px] font-extrabold text-black"
                      >
                        <ExternalLink size={14} strokeWidth={2.35} />
                        Open sheet
                      </button>
                      <button
                        type="button"
                        onClick={() => void testRoute(route)}
                        disabled={isTesting}
                        className="flex h-9 items-center gap-2 rounded-[8px] bg-[#0d1118] px-3 text-[11px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-65"
                      >
                        <RefreshCw size={14} strokeWidth={2.35} className={isTesting ? "animate-spin" : ""} />
                        {isTesting ? "Testing..." : "Test route"}
                      </button>
                      {canRemove && (
                        <button
                          type="button"
                          onClick={() => removeRoute(route.id)}
                          className="flex h-9 items-center gap-2 rounded-[8px] border border-[#ffd6dd] bg-[#fff8fa] px-3 text-[11px] font-extrabold text-[#df405b]"
                        >
                          <X size={14} strokeWidth={2.35} />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-[#edf0f6] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] font-semibold text-[#46506a]">
            Columns expected: customer, phone, booking type, date, time, ground or court, payment status, confirmed at, source conversation.
          </p>
          <button
            type="button"
            onClick={addRoute}
            className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#3044ff] px-4 text-[12px] font-extrabold text-white shadow-[0_18px_36px_rgba(48,68,255,0.22)]"
          >
            <Plus size={15} strokeWidth={2.5} />
            Add sheet route
          </button>
        </div>

        {message && <p className="mt-4 rounded-[8px] bg-[#f6f7fb] px-3 py-2 text-[11px] font-semibold text-[#46506a]">{message}</p>}
      </section>

      <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[15px] font-extrabold text-black">Routing preview</h3>
            <p className="mt-1 text-[11px] font-medium text-[#46506a]">
              When a booking is confirmed, it should match one of these filters before being written to the configured sheet.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMessage("Booking integrations saved on this device.")}
            className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-4 text-[12px] font-extrabold text-black"
          >
            <Check size={15} strokeWidth={2.5} />
            Save integrations
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[12px]">
            <thead className="text-[10px] font-extrabold uppercase text-[#687089]">
              <tr className="border-b border-[#edf0f6]">
                <th className="py-3 pr-4">Booking filter</th>
                <th className="py-3 pr-4">Destination</th>
                <th className="py-3 pr-4">Rule</th>
                <th className="py-3 pr-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf0f6]">
              {integrations.routes.map((route) => {
                const status = getRouteStatus(route);

                return (
                  <tr key={route.id}>
                    <td className="py-3 pr-4 font-extrabold text-black">{route.bookingType}</td>
                    <td className="py-3 pr-4 font-semibold text-[#46506a]">
                      {route.sheetUrl ? route.worksheetName || "Selected sheet" : "No sheet link added"}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-[#46506a]">
                      {route.confirmedOnly ? "Save confirmed bookings only" : "Save every matched booking"}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-[8px] px-2.5 py-1 text-[10px] font-extrabold ${status.className}`}>{status.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SettingsApiSection({
  api,
  onChange,
}: {
  api: ApiSettings;
  onChange: (api: ApiSettings) => void;
}) {
  const [origin] = useState(() => (typeof window === "undefined" ? "http://localhost:3000" : window.location.origin));
  const [testStatus, setTestStatus] = useState("");

  function updateEvent(id: string, enabled: boolean) {
    onChange({
      ...api,
      events: api.events.map((event) => (event.id === id ? { ...event, enabled } : event)),
    });
  }

  function copyValue(value: string) {
    void navigator.clipboard?.writeText(value);
    setTestStatus("Copied.");
  }

  return (
    <div className="grid gap-5">
      <SettingsSectionHeader section="api" />
      <section className="grid gap-5 rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div>
          <h3 className="text-[14px] font-extrabold text-black">Endpoints</h3>
          <div className="mt-4 space-y-3">
            {[
              ["Instagram OAuth callback", `${origin}/api/auth/instagram/callback`],
              ["Meta webhook callback", `${origin}/api/webhooks/meta`],
              ["Conversations API", `${origin}/api/instagram/conversations`],
              ["Send message API", `${origin}/api/instagram/send`],
            ].map(([label, value]) => (
              <div key={label} className="grid gap-2 rounded-[10px] border border-[#edf0f6] p-3 sm:grid-cols-[150px_minmax(0,1fr)_32px] sm:items-center">
                <span className="text-[11px] font-extrabold text-black">{label}</span>
                <code className="truncate rounded-[7px] bg-[#f6f7fb] px-2 py-1 text-[11px] font-semibold text-[#253049]">{value}</code>
                <button type="button" onClick={() => copyValue(value)} className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#46506a] hover:bg-[#f0edff] hover:text-[#3044ff]" aria-label={`Copy ${label}`}>
                  <Copy size={14} strokeWidth={2.25} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-[14px] font-extrabold text-black">Webhook Settings</h3>
          <label className="mt-4 block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Webhook URL</span>
            <input
              value={api.webhookUrl}
              onChange={(event) => onChange({ ...api, webhookUrl: event.target.value })}
              className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            />
          </label>
          <label className="mt-4 block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Signing secret</span>
            <div className="mt-2 flex gap-2">
              <input value={api.signingSecret} onChange={(event) => onChange({ ...api, signingSecret: event.target.value })} className="h-10 min-w-0 flex-1 rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10" />
              <button type="button" onClick={() => copyValue(api.signingSecret)} className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#dde3ee]">
                <Copy size={14} strokeWidth={2.25} />
              </button>
            </div>
          </label>
          <div className="mt-5 space-y-3">
            {api.events.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-4">
                <span className="text-[12px] font-extrabold text-black">{event.label}</span>
                <SettingsToggle ariaLabel={`Toggle ${event.label}`} checked={event.enabled} onChange={(checked) => updateEvent(event.id, checked)} />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setTestStatus("Webhook configuration looks ready. Use Meta's Test button to send a live event.")}
            className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#0d1118] px-4 text-[12px] font-extrabold text-white"
          >
            <Send size={14} strokeWidth={2.4} />
            Test configuration
          </button>
          {testStatus && <p className="mt-3 rounded-[8px] bg-[#f6f7fb] px-3 py-2 text-[11px] font-semibold text-[#46506a]">{testStatus}</p>}
        </div>
      </section>
    </div>
  );
}

function SettingsSecuritySection({
  security,
  onChange,
}: {
  security: SecuritySettings;
  onChange: (security: SecuritySettings) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function updatePassword() {
    setStatus("");

    if (password.length < 8) {
      setStatus("Use at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/auth/security", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok || data.error) {
        throw new Error(data.error || "Could not update password");
      }

      setPassword("");
      setConfirmPassword("");
      setStatus("Password updated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update password");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-5">
      <SettingsSectionHeader section="security" />
      <section className="grid gap-5 rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <h3 className="text-[14px] font-extrabold text-black">Access controls</h3>
          <div className="mt-5 space-y-4">
            {[
              ["Two-factor authentication", "twoFactor"],
              ["Login alerts", "loginAlerts"],
              ["Trusted devices", "trustedDevices"],
            ].map(([label, key]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <span className="text-[12px] font-extrabold text-black">{label}</span>
                <SettingsToggle
                  ariaLabel={`Toggle ${label}`}
                  checked={Boolean(security[key as keyof SecuritySettings])}
                  onChange={(checked) => onChange({ ...security, [key]: checked })}
                />
              </div>
            ))}
            <div className="flex items-center justify-between gap-4">
              <span className="text-[12px] font-extrabold text-black">Session timeout</span>
              <SettingsSelect
                ariaLabel="Session timeout"
                value={security.sessionTimeout}
                options={["7 days", "14 days", "30 days", "90 days"]}
                onChange={(value) => onChange({ ...security, sessionTimeout: value })}
              />
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-[14px] font-extrabold text-black">Password</h3>
          <div className="mt-5 grid gap-3">
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="New password"
              className="h-10 rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            />
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              placeholder="Confirm password"
              className="h-10 rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            />
            <button
              type="button"
              onClick={updatePassword}
              disabled={isSaving}
              className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#3044ff] px-4 text-[12px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? <RefreshCw size={14} strokeWidth={2.3} className="animate-spin" /> : <Shield size={14} strokeWidth={2.3} />}
              {isSaving ? "Updating" : "Update password"}
            </button>
            {status && <p className="rounded-[8px] bg-[#f6f7fb] px-3 py-2 text-[11px] font-semibold text-[#46506a]">{status}</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

function SettingsBrandSection({
  brand,
  onChange,
}: {
  brand: BrandSettings;
  onChange: (brand: BrandSettings) => void;
}) {
  return (
    <div className="grid gap-5">
      <SettingsSectionHeader section="brand" />
      <section className="grid gap-5 rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)] lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="grid gap-4">
          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Brand name</span>
            <input value={brand.brandName} onChange={(event) => onChange({ ...brand, brandName: event.target.value })} className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10" />
          </label>
          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Primary color</span>
            <div className="mt-2 flex gap-2">
              <input type="color" value={brand.primaryColor} onChange={(event) => onChange({ ...brand, primaryColor: event.target.value })} className="h-10 w-12 rounded-[8px] border border-[#dde3ee] bg-white p-1" />
              <input value={brand.primaryColor} onChange={(event) => onChange({ ...brand, primaryColor: event.target.value })} className="h-10 min-w-0 flex-1 rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10" />
            </div>
          </label>
          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Voice</span>
            <SettingsSelect
              ariaLabel="Brand voice"
              value={brand.voice}
              options={["Confident and helpful", "Warm and casual", "Premium and concise", "Bold and playful"]}
              onChange={(value) => onChange({ ...brand, voice: value })}
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-extrabold text-[#46506a]">Blocked words</span>
            <textarea value={brand.blockedWords} onChange={(event) => onChange({ ...brand, blockedWords: event.target.value })} className="mt-2 min-h-[84px] w-full rounded-[8px] border border-[#dde3ee] px-3 py-2 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10" />
          </label>
        </div>
        <div className="rounded-[12px] border border-[#edf0f6] bg-[#fbfbff] p-5">
          <h3 className="text-[14px] font-extrabold text-black">Reply preview</h3>
          <div className="mt-5 rounded-[12px] bg-white p-4 shadow-[0_16px_34px_rgba(20,28,53,0.06)]">
            <div className="flex items-center gap-3">
              <span className="h-9 w-9 rounded-full" style={{ backgroundColor: brand.primaryColor }} />
              <div>
                <p className="text-[13px] font-extrabold text-black">{brand.brandName}</p>
                <p className="text-[11px] font-medium text-[#46506a]">{brand.voice}</p>
              </div>
            </div>
            <p className="mt-4 text-[13px] font-medium leading-relaxed text-[#253049]">
              Thanks for reaching out. I can help with your question and make sure you get the right next step.
            </p>
            <input value={brand.replySignature} onChange={(event) => onChange({ ...brand, replySignature: event.target.value })} className="mt-4 h-10 w-full rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10" />
          </div>
        </div>
      </section>
    </div>
  );
}

function buildQuickReplyLabel(text: string) {
  const compactText = text.replace(/\s+/g, " ").trim();
  return compactText.length > 28 ? `${compactText.slice(0, 28).trim()}...` : compactText || "Quick reply";
}

function createQuickReplyId() {
  return `quick-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createSavedReplyId() {
  return `saved-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function SettingsQuickRepliesSection({
  quickReplies,
  savedReplies,
  welcomeMessage,
  onChange,
  onSavedRepliesChange,
  onWelcomeMessageChange,
}: {
  quickReplies: QuickReplySetting[];
  savedReplies: SavedReplySetting[];
  welcomeMessage: WelcomeMessageSetting;
  onChange: (quickReplies: QuickReplySetting[]) => void;
  onSavedRepliesChange: (savedReplies: SavedReplySetting[]) => void;
  onWelcomeMessageChange: (welcomeMessage: WelcomeMessageSetting) => void;
}) {
  const [draftLabel, setDraftLabel] = useState("");
  const [draftText, setDraftText] = useState("");
  const [savedReplyDraft, setSavedReplyDraft] = useState("");
  const [status, setStatus] = useState("");
  const normalizedReplies = normalizeQuickReplies(quickReplies);
  const normalizedSavedReplies = normalizeSavedReplies(savedReplies);
  const normalizedWelcomeMessage = normalizeWelcomeMessage(welcomeMessage);

  function updateReply(id: string, partial: Partial<QuickReplySetting>) {
    onChange(
      normalizeQuickReplies(
        normalizedReplies.map((reply) => (reply.id === id ? { ...reply, ...partial } : reply))
      )
    );
    setStatus("Saved automatically");
  }

  function updateSavedReply(id: string, partial: Partial<SavedReplySetting>) {
    onSavedRepliesChange(
      normalizeSavedReplies(
        normalizedSavedReplies.map((reply) => (reply.id === id ? { ...reply, ...partial } : reply))
      )
    );
    setStatus("Saved reply updated");
  }

  function updateWelcomeMessage(partial: Partial<WelcomeMessageSetting>) {
    onWelcomeMessageChange(normalizeWelcomeMessage({ ...normalizedWelcomeMessage, ...partial }));
    setStatus("Welcome message saved");
  }

  function addQuickReply() {
    const text = draftText.trim();

    if (!text) {
      setStatus("Add reply text first.");
      return;
    }

    const label = draftLabel.trim() || buildQuickReplyLabel(text);

    onChange(
      normalizeQuickReplies([
        ...normalizedReplies,
        {
          id: createQuickReplyId(),
          label,
          text,
          enabled: true,
        },
      ])
    );
    setDraftLabel("");
    setDraftText("");
    setStatus("Quick reply saved");
  }

  function removeQuickReply(id: string) {
    onChange(normalizeQuickReplies(normalizedReplies.filter((reply) => reply.id !== id)));
    setStatus("Quick reply removed");
  }

  function addSavedReply() {
    const text = savedReplyDraft.trim();

    if (!text) {
      setStatus("Add saved reply text first.");
      return;
    }

    onSavedRepliesChange(
      normalizeSavedReplies([
        ...normalizedSavedReplies,
        {
          id: createSavedReplyId(),
          text,
          enabled: true,
        },
      ])
    );
    setSavedReplyDraft("");
    setStatus("Saved reply added");
  }

  function removeSavedReply(id: string) {
    onSavedRepliesChange(normalizeSavedReplies(normalizedSavedReplies.filter((reply) => reply.id !== id)));
    setStatus("Saved reply removed");
  }

  return (
    <div className="grid gap-5">
      <SettingsSectionHeader
        section="quick-replies"
        action={
          status ? (
            <span className="rounded-[8px] bg-[#f0edff] px-3 py-2 text-[11px] font-extrabold text-[#3044ff]">
              {status}
            </span>
          ) : null
        }
      />

      <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#f0edff] text-[#3044ff]">
              <Zap size={18} strokeWidth={2.35} />
            </span>
            <div>
              <h2 className="text-[15px] font-extrabold text-black">Welcome Message</h2>
              <p className="mt-1 text-[12px] font-medium leading-relaxed text-[#46506a]">
                The lightning icon in the inbox composer inserts this saved message.
              </p>
            </div>
          </div>
          <SettingsToggle
            ariaLabel="Toggle Welcome Message"
            checked={normalizedWelcomeMessage.enabled}
            onChange={(enabled) => updateWelcomeMessage({ enabled })}
            showStateLabel
          />
        </div>

        <label className="mt-4 block">
          <span className="text-[11px] font-extrabold text-[#46506a]">Message text</span>
          <textarea
            value={normalizedWelcomeMessage.text}
            onChange={(event) => updateWelcomeMessage({ text: event.target.value })}
            placeholder="Type the welcome message shown from the inbox lightning icon..."
            className="mt-2 min-h-[96px] w-full resize-none rounded-[8px] border border-[#dde3ee] px-3 py-2 text-[12px] font-semibold leading-relaxed outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
          />
        </label>
      </section>

      <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#f0edff] text-[#3044ff]">
              <Bookmark size={18} strokeWidth={2.35} />
            </span>
            <div>
              <h2 className="text-[15px] font-extrabold text-black">Saved Replies</h2>
              <p className="mt-1 text-[12px] font-medium leading-relaxed text-[#46506a]">
                Saved replies appear in the bookmark menu inside the inbox composer.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-[#eff1f6] px-3 py-1 text-[11px] font-extrabold text-[#46506a]">
            {normalizedSavedReplies.filter((reply) => reply.enabled && reply.text.trim()).length} active
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-start">
          <label className="min-w-0 flex-1">
            <span className="text-[11px] font-extrabold text-[#46506a]">Saved reply text</span>
            <textarea
              value={savedReplyDraft}
              onChange={(event) => setSavedReplyDraft(event.target.value)}
              placeholder="Type a saved reply for the bookmark menu..."
              className="mt-2 min-h-[82px] w-full resize-none rounded-[8px] border border-[#dde3ee] px-3 py-2 text-[12px] font-semibold leading-relaxed outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            />
          </label>
          <button
            type="button"
            onClick={addSavedReply}
            className="mt-0 flex h-10 shrink-0 items-center justify-center gap-2 rounded-[8px] bg-[#3044ff] px-4 text-[12px] font-extrabold text-white lg:mt-6"
          >
            <Plus size={15} strokeWidth={2.4} />
            Add saved reply
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          {normalizedSavedReplies.map((reply) => (
            <div key={reply.id} className="rounded-[10px] border border-[#e5e8f0] bg-[#fbfbff] p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                <label className="min-w-0 flex-1">
                  <span className="text-[10px] font-extrabold uppercase text-[#596175]">Reply text</span>
                  <textarea
                    value={reply.text}
                    onChange={(event) => updateSavedReply(reply.id, { text: event.target.value })}
                    className="mt-1 min-h-[72px] w-full resize-none rounded-[8px] border border-[#dde3ee] bg-white px-3 py-2 text-[12px] font-semibold leading-relaxed outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
                  />
                </label>

                <div className="flex shrink-0 items-center gap-2 lg:pt-5">
                  <SettingsToggle
                    ariaLabel="Toggle saved reply"
                    checked={reply.enabled}
                    onChange={(enabled) => updateSavedReply(reply.id, { enabled })}
                    showStateLabel
                  />
                  <button
                    type="button"
                    onClick={() => removeSavedReply(reply.id)}
                    title="Delete saved reply"
                    className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#dde3ee] bg-white text-[#df405b] transition hover:bg-[#fff7f9]"
                  >
                    <Trash2 size={14} strokeWidth={2.35} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <label className="min-w-0 flex-1">
            <span className="text-[11px] font-extrabold text-[#46506a]">Tab label</span>
            <input
              value={draftLabel}
              onChange={(event) => setDraftLabel(event.target.value)}
              placeholder="Example: Ask for budget"
              className="mt-2 h-10 w-full rounded-[8px] border border-[#dde3ee] px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            />
          </label>
          <label className="min-w-0 flex-[1.5]">
            <span className="text-[11px] font-extrabold text-[#46506a]">Reply text</span>
            <textarea
              value={draftText}
              onChange={(event) => setDraftText(event.target.value)}
              placeholder="Type the message this tab should send in the inbox..."
              className="mt-2 min-h-[92px] w-full resize-none rounded-[8px] border border-[#dde3ee] px-3 py-2 text-[12px] font-semibold leading-relaxed outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
            />
          </label>
          <button
            type="button"
            onClick={addQuickReply}
            className="mt-0 flex h-10 shrink-0 items-center justify-center gap-2 rounded-[8px] bg-[#3044ff] px-4 text-[12px] font-extrabold text-white sm:mt-6"
          >
            <Plus size={15} strokeWidth={2.4} />
            Add quick reply
          </button>
        </div>
      </section>

      <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[15px] font-extrabold text-black">Inbox quick reply tabs</h2>
            <p className="mt-1 text-[12px] font-medium text-[#46506a]">
              Enabled replies appear above the inbox composer and scroll horizontally when there are many.
            </p>
          </div>
          <span className="rounded-full bg-[#eff1f6] px-3 py-1 text-[11px] font-extrabold text-[#46506a]">
            {normalizedReplies.filter((reply) => reply.enabled).length} active
          </span>
        </div>

        <div className="mt-5 grid gap-3">
          {normalizedReplies.map((reply) => (
            <div key={reply.id} className="rounded-[10px] border border-[#e5e8f0] bg-[#fbfbff] p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
                  <label className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase text-[#596175]">Tab label</span>
                    <input
                      value={reply.label}
                      onChange={(event) => updateReply(reply.id, { label: event.target.value })}
                      className="mt-1 h-9 w-full rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[12px] font-semibold outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
                    />
                  </label>
                  <label className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase text-[#596175]">Reply text</span>
                    <textarea
                      value={reply.text}
                      onChange={(event) => updateReply(reply.id, { text: event.target.value })}
                      className="mt-1 min-h-[74px] w-full resize-none rounded-[8px] border border-[#dde3ee] bg-white px-3 py-2 text-[12px] font-semibold leading-relaxed outline-none focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
                    />
                  </label>
                </div>

                <div className="flex shrink-0 items-center gap-2 lg:pt-5">
                  <SettingsToggle
                    ariaLabel={`Toggle ${reply.label}`}
                    checked={reply.enabled}
                    onChange={(checked) => updateReply(reply.id, { enabled: checked })}
                    showStateLabel
                  />
                  <button
                    type="button"
                    onClick={() => removeQuickReply(reply.id)}
                    title="Delete quick reply"
                    className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#dde3ee] bg-white text-[#df405b] transition hover:bg-[#fff7f9]"
                  >
                    <Trash2 size={14} strokeWidth={2.35} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function SettingsPage({
  profile,
  onProfileChange,
}: {
  profile: AccountProfile;
  onProfileChange: (profile: AccountProfile) => Promise<AccountProfile>;
}) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("account");
  const [settingsState, setSettingsState] = useState<AppSettingsState>(readStoredSettingsState);
  const customRuleCounterRef = useRef(1);
  const hasChangedNotificationsRef = useRef(false);
  const hasChangedRulesRef = useRef(false);
  const hasChangedOutcomeProvidersRef = useRef(false);

  useEffect(() => {
    window.localStorage.setItem(settingsStateStorageKey, JSON.stringify(settingsState));
    dispatchNotificationPreferencesChanged(settingsState.notifications);
    dispatchQuickRepliesChanged(settingsState.quickReplies);
    dispatchSavedRepliesChanged(settingsState.savedReplies);
    dispatchWelcomeMessageChanged(settingsState.welcomeMessage);
  }, [settingsState]);

  useEffect(() => {
    const nextCounter =
      settingsState.rules.reduce((max, rule) => {
        const match = /^custom-(\d+)$/.exec(rule.id);
        return match ? Math.max(max, Number(match[1]) + 1) : max;
      }, 1) || 1;

    customRuleCounterRef.current = Math.max(customRuleCounterRef.current, nextCounter);
  }, [settingsState.rules]);

  useEffect(() => {
    let isMounted = true;

    async function loadSavedSettings() {
      try {
        const [notificationsResponse, rulesResponse, outcomeProvidersResponse] = await Promise.all([
          fetch("/api/notifications/preferences", { cache: "no-store" }),
          fetch("/api/escalation-rules", { cache: "no-store" }),
          fetch("/api/revenue/outcome-providers", { cache: "no-store" }),
        ]);

        if (notificationsResponse.ok) {
          const payload = (await notificationsResponse.json()) as { notifications?: unknown };
          const notifications = normalizeNotificationSettings(payload.notifications);

          if (isMounted && !hasChangedNotificationsRef.current) {
            setSettingsState((current) => ({
              ...current,
              notifications,
            }));
          }
        }

        if (rulesResponse.ok) {
          const payload = (await rulesResponse.json()) as { rules?: unknown };
          const rules = normalizeEscalationRuleSettings(payload.rules);

          if (isMounted && !hasChangedRulesRef.current) {
            setSettingsState((current) => ({
              ...current,
              rules,
            }));
            dispatchEscalationRulesChanged(rules);
          }
        }

        if (outcomeProvidersResponse.ok) {
          const payload = (await outcomeProvidersResponse.json()) as { outcomeProviders?: unknown };
          const revenueOutcomeProviders = normalizeRevenueOutcomeProviderSettings(payload.outcomeProviders);

          if (isMounted && !hasChangedOutcomeProvidersRef.current) {
            setSettingsState((current) => ({
              ...current,
              revenueOutcomeProviders,
            }));
          }
        }
      } catch (error) {
        console.error("Settings preferences load error:", error);
      }
    }

    void loadSavedSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const visibleSections = getVisibleSettingsMenuItems(profile);

    if (!visibleSections.some((item) => item.id === activeSection)) {
      const timeout = window.setTimeout(() => {
        setActiveSection(visibleSections[0]?.id || "account");
      }, 0);

      return () => window.clearTimeout(timeout);
    }
  }, [profile, activeSection]);

  function updateSettingsState<K extends keyof AppSettingsState>(key: K, value: AppSettingsState[K]) {
    setSettingsState((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleNotificationsChange(notifications: NotificationSetting[]) {
    const normalizedNotifications = normalizeNotificationSettings(notifications);
    hasChangedNotificationsRef.current = true;
    updateSettingsState("notifications", normalizedNotifications);

    void fetch("/api/notifications/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notifications: normalizedNotifications }),
    }).catch((error) => {
      console.error("Notification preferences save error:", error);
    });
  }

  function handleRulesChange(rules: EscalationRuleSetting[]) {
    const normalizedRules = normalizeEscalationRuleSettings(rules);
    hasChangedRulesRef.current = true;
    updateSettingsState("rules", normalizedRules);
    dispatchEscalationRulesChanged(normalizedRules);

    void fetch("/api/escalation-rules", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rules: normalizedRules }),
    }).catch((error) => {
      console.error("Escalation rules save error:", error);
    });
  }

  function addEscalationRule() {
    const count = settingsState.rules.filter((rule) => rule.id.startsWith("custom")).length + 1;

    handleRulesChange([
      ...settingsState.rules,
      {
        id: `custom-${customRuleCounterRef.current}`,
        label: `Custom rule ${count}`,
        action: "Escalate for approval",
        priority: "Medium",
        enabled: true,
      },
    ]);
    customRuleCounterRef.current += 1;
  }

  function renderSettingsContent() {
    if (activeSection === "instagram") {
      return <SettingsInstagramSection />;
    }

    if (activeSection === "ai-integration") {
      return (
        <SettingsAiIntegrationSection
          integration={settingsState.aiIntegration}
          assistantSettings={settingsState.ai}
          onChange={(aiIntegration) => updateSettingsState("aiIntegration", aiIntegration)}
          onAssistantChange={(ai) => updateSettingsState("ai", ai)}
        />
      );
    }

    if (activeSection === "integrations") {
      return (
        <div className="grid gap-5">
          <SettingsSectionHeader section="integrations" />
          <SettingsRevenueOutcomeProvidersSection
            outcomeProviders={settingsState.revenueOutcomeProviders}
            onChange={(revenueOutcomeProviders) => {
              hasChangedOutcomeProvidersRef.current = true;
              updateSettingsState("revenueOutcomeProviders", revenueOutcomeProviders);
            }}
          />
          <SettingsBookingIntegrationsSection
            integrations={settingsState.bookingIntegrations}
            onChange={(bookingIntegrations) => updateSettingsState("bookingIntegrations", bookingIntegrations)}
            hideHeader
          />
        </div>
      );
    }

    if (activeSection === "agents") {
      return <SettingsAgentsSection mode="agents" />;
    }

    if (activeSection === "permissions") {
      return <SettingsAgentsSection mode="permissions" />;
    }

    if (activeSection === "escalations") {
      return (
        <div className="grid gap-5">
          <SettingsSectionHeader section="escalations" />
          <SettingsRulesCard rules={settingsState.rules} onChange={handleRulesChange} onAddRule={addEscalationRule} />
        </div>
      );
    }

    if (activeSection === "notifications") {
      return (
        <div className="grid gap-5">
          <SettingsSectionHeader section="notifications" />
          <SettingsNotificationsCard notifications={settingsState.notifications} onChange={handleNotificationsChange} />
        </div>
      );
    }

    if (activeSection === "quick-replies") {
      return (
        <SettingsQuickRepliesSection
          quickReplies={settingsState.quickReplies}
          savedReplies={settingsState.savedReplies}
          welcomeMessage={settingsState.welcomeMessage}
          onChange={(quickReplies) => updateSettingsState("quickReplies", normalizeQuickReplies(quickReplies))}
          onSavedRepliesChange={(savedReplies) => updateSettingsState("savedReplies", normalizeSavedReplies(savedReplies))}
          onWelcomeMessageChange={(welcomeMessage) => updateSettingsState("welcomeMessage", normalizeWelcomeMessage(welcomeMessage))}
        />
      );
    }

    if (activeSection === "billing") {
      return <SettingsBillingSection billing={settingsState.billing} onChange={(billing) => updateSettingsState("billing", billing)} />;
    }

    if (activeSection === "api") {
      return <SettingsApiSection api={settingsState.api} onChange={(api) => updateSettingsState("api", api)} />;
    }

    if (activeSection === "security") {
      return <SettingsSecuritySection security={settingsState.security} onChange={(security) => updateSettingsState("security", security)} />;
    }

    if (activeSection === "brand") {
      return <SettingsBrandSection brand={settingsState.brand} onChange={(brand) => updateSettingsState("brand", brand)} />;
    }

    return (
      <div className="grid gap-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <SettingsAccountCard profile={profile} onProfileChange={onProfileChange} />
          <InstagramConnectionCard onManage={() => setActiveSection("instagram")} />
        </div>
      </div>
    );
  }

  return (
    <main className="h-dvh flex-1 overflow-y-auto bg-[#fdfdff] px-4 pb-24 pt-4 text-black sm:px-6 lg:px-8 lg:py-6 xl:px-10">
      <div className="mx-auto max-w-[1680px]">
        <div className="mb-5 lg:hidden">
          <SettingsBrandMark />
        </div>

        <header className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:gap-8">
          <div>
            <h1 className="text-[30px] font-extrabold leading-none text-black sm:text-[32px]">Settings</h1>
            <p className="mt-3 text-[12px] font-medium leading-[1.4] text-[#46506a]">
              Manage your account, integrations, and automations.
            </p>
          </div>

          <div className="flex w-full justify-end sm:w-auto">
            <NotificationBell />
          </div>
        </header>

        <div className="mt-7 grid items-start gap-5 xl:grid-cols-[252px_minmax(0,1fr)]">
          <SettingsMenuCard activeSection={activeSection} onSectionChange={setActiveSection} profile={profile} />
          {renderSettingsContent()}
        </div>
      </div>
    </main>
  );
}
