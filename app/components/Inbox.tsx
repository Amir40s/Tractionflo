"use client";

import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ExternalLink,
  FileText,
  Loader2,
  MoreHorizontal,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  Smile,
  Sparkles,
  Star,
  Target,
  TriangleAlert,
  Users,
  X,
  Zap,
} from "lucide-react";
import type { EmojiClickData } from "emoji-picker-react";
import { EmojiStyle, SkinTonePickerLocation, Theme } from "emoji-picker-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AiLeadInsight, AiWorkflowRunResult } from "@/lib/ai-integration";
import {
  detectConversationEscalations,
  normalizeEscalationRuleSettings,
  type ConversationEscalation,
  type EscalationRuleSetting,
} from "@/lib/conversation-escalation";
import { settingsStateStorageKey } from "@/lib/notification-preferences";
import {
  quickRepliesChangedEvent,
  readQuickRepliesFromStorage,
  readSavedRepliesFromStorage,
  readWelcomeMessageFromStorage,
  savedRepliesChangedEvent,
  welcomeMessageChangedEvent,
  welcomeMessageLabel,
  type QuickReplySetting,
  type SavedReplySetting,
  type WelcomeMessageSetting,
} from "@/lib/quick-replies";
import NotificationBell from "./NotificationBell";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] w-[320px] items-center justify-center bg-white text-[12px] font-semibold text-[#596175]">
      Loading emojis...
    </div>
  ),
});

type IGMessage = {
  id: string;
  text: string;
  attachments?: {
    type: string;
    url: string;
    preview_url?: string;
    width?: number;
    height?: number;
    name?: string;
    mime_type?: string;
    local?: boolean;
  }[];
  from: "me" | "user" | "note";
  sender_name: string;
  sender_profile_pic?: string;
  sender_id: string;
  time: string; // ISO string
  status?: "sending" | "sent" | "failed";
  reply_to?: {
    mid?: string;
    story?: {
      id?: string;
      url?: string;
    };
  };
};

type IGConversation = {
  id: string;
  participant: { id: string; name: string; username?: string; profile_pic?: string };
  updated_time: string;
  messages: IGMessage[];
};

type IGAccount = {
  id: string;
  username?: string;
  name?: string;
  assistant_id?: string;
  assistantId?: string;
};

type APIResponse = {
  conversations: IGConversation[];
  ig_user_id?: string;
  assistant_id?: string;
  assistantId?: string;
  account?: IGAccount;
  error?: string;
};

type AgentAccount = {
  id: string;
  name: string;
  email: string;
  status: "Active" | "Suspended";
  allowedPages: string[];
  assignedConversationIds: string[];
  humanEscalation: boolean;
};

type AgentsResponse = {
  agents?: AgentAccount[];
  agent?: AgentAccount;
  error?: string;
};

type SendAPIResponse = {
  ok?: boolean;
  sent?: {
    message_id?: string;
    text?: string;
  }[];
  error?: string;
};

type AiReplyResponse = {
  reply?: string;
  error?: string;
};

type AiWorkflowResponse = Partial<AiWorkflowRunResult> & {
  error?: string;
  autoSend?: boolean;
  handoff?: boolean;
  escalation?: {
    intent?: string;
    label?: string;
    summary?: string;
    recommendedAction?: string;
    signals?: string[];
    urgency?: "Medium" | "High";
  };
  knowledge?: {
    mode?: "none" | "direct" | "context";
    sourceTitle?: string;
    matches?: number;
  };
};

type InboxBookingSheetRoute = {
  id?: string;
  name?: string;
  bookingType?: string;
  sheetUrl?: string;
  worksheetName?: string;
  enabled?: boolean;
  confirmedOnly?: boolean;
};

type InboxBookingIntegrations = {
  syncEnabled?: boolean;
  routes?: InboxBookingSheetRoute[];
};

type ConversationNoteRecord = {
  text: string;
  updatedAt: string;
};

type ConversationNotesState = Record<string, ConversationNoteRecord>;

type BookingExportResponse = {
  ok?: boolean;
  exported?: boolean;
  skipped?: boolean;
  message?: string;
  reason?: string;
  error?: string;
};

// ─── Static data ─────────────────────────────────────────────────────────────

type ComposerMode = "reply";
type ComposerMenu = "emoji" | "snippets" | "send";
type ConversationTakeoverMode = "ai" | "human";

function getTakeoverLabel(mode: ConversationTakeoverMode) {
  return mode === "human" ? "Human takeover" : "AI takeover";
}

function getTakeoverPillClass(mode: ConversationTakeoverMode) {
  return mode === "human"
    ? "border-[#dbe5ff] bg-[#f3f6ff] text-[#3044ff]"
    : "border-[#dff5e7] bg-[#eefcf3] text-[#0a9b3f]";
}

function getQuickReplyIcon(reply: QuickReplySetting): LucideIcon {
  const query = `${reply.id} ${reply.label}`.toLowerCase();

  if (/\b(call|book|meeting|schedule)\b/.test(query)) {
    return CalendarDays;
  }

  if (/\b(price|pricing|cost|payment|pay|quote)\b/.test(query)) {
    return CircleDollarSign;
  }

  if (/\b(info|program|details|brief|document)\b/.test(query)) {
    return FileText;
  }

  return Sparkles;
}

function readBookingIntegrationsFromStorage(): InboxBookingIntegrations | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedValue = window.localStorage.getItem(settingsStateStorageKey);

    if (!storedValue) {
      return null;
    }

    const parsed = JSON.parse(storedValue) as { bookingIntegrations?: InboxBookingIntegrations };
    return parsed.bookingIntegrations || null;
  } catch {
    return null;
  }
}

function readEscalationRulesFromStorage(): EscalationRuleSetting[] {
  if (typeof window === "undefined") {
    return normalizeEscalationRuleSettings([]);
  }

  try {
    const storedValue = window.localStorage.getItem(settingsStateStorageKey);

    if (!storedValue) {
      return normalizeEscalationRuleSettings([]);
    }

    const parsed = JSON.parse(storedValue) as { rules?: unknown };
    return normalizeEscalationRuleSettings(parsed.rules);
  } catch {
    return normalizeEscalationRuleSettings([]);
  }
}

function readConversationNotesFromStorage(): ConversationNotesState {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const storedValue = window.localStorage.getItem(conversationNotesStorageKey);

    if (!storedValue) {
      return {};
    }

    const parsed = JSON.parse(storedValue) as ConversationNotesState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveConversationNotesToStorage(notes: ConversationNotesState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(conversationNotesStorageKey, JSON.stringify(notes));
}

function shouldAttemptBookingExport(replyText: string) {
  return /\b(booking request is noted|booking confirmed|final booking confirmation|confirm availability|booking has been confirmed|confirmed your booking)\b/i.test(
    replyText
  );
}

type ComposerAttachment = {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl: string;
};

type ComposerSubmitPayload = {
  conversationId?: string;
  mode: ComposerMode;
  text: string;
  files: File[];
  localAttachments: NonNullable<IGMessage["attachments"]>;
  refreshAfter?: boolean;
  automated?: boolean;
};

type ComposerStatus = {
  sending: boolean;
  error: string | null;
  notice: string | null;
};

type ComposerDraft = {
  id: number;
  text: string;
  mode: ComposerMode;
};

const conversationNotesStorageKey = "tractionflo_conversation_notes";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

function formatNoteSavedAt(iso: string) {
  const savedAt = relativeTime(iso);
  return savedAt === "just now" ? "Saved just now" : `Saved ${savedAt} ago`;
}

function msgTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatInstagramAccount(account: IGAccount | null): string {
  if (!account) return "";

  const name = account.name || account.username || "Instagram account";
  return account.username ? `${name} (@${account.username})` : name;
}

function getMessagePreview(msg: IGMessage | undefined): string {
  if (!msg) return "No messages";
  if (msg.reply_to?.story) return `Replied to story: ${msg.text || "reaction"}`;
  if (msg.text) return msg.text;

  const firstAttachment = msg.attachments?.[0];
  if (firstAttachment?.type === "image") return "Photo";
  if (firstAttachment?.type === "video") return "Video";
  if (firstAttachment) return firstAttachment.name || "Attachment";

  return "Message";
}

function getShortMessagePreview(msg: IGMessage | undefined): string {
  const preview = getMessagePreview(msg);
  const words = preview.split(/\s+/).filter(Boolean);

  if (words.length <= 3) {
    return preview;
  }

  return `${words.slice(0, 3).join(" ")}...`;
}

function getParticipantName(conv: IGConversation | null) {
  if (!conv) return "Instagram user";
  return conv.participant.username || conv.participant.name || `User ${conv.participant.id.slice(-6)}`;
}

function getParticipantHandle(conv: IGConversation | null) {
  if (!conv?.participant.username) return getParticipantName(conv);
  return `@${conv.participant.username}`;
}

function getInstagramProfileUrl(conv: IGConversation | null) {
  if (!conv?.participant.username) return "";
  return `https://www.instagram.com/${conv.participant.username}/`;
}

function getSuggestedReply(conv: IGConversation | null) {
  const lastUserMsg = conv?.messages.find((m) => m.from === "user");
  const preview = getMessagePreview(lastUserMsg).toLowerCase();
  const participantName = getParticipantHandle(conv);

  if (preview.includes("price") || preview.includes("pricing") || preview.includes("cost")) {
    return `Hey ${participantName}, happy to help. Which option are you looking at so I can send the right pricing?`;
  }

  if (preview.includes("photo") || preview.includes("image") || preview.includes("attachment")) {
    return `Thanks for sending that over, ${participantName}. I am checking it now and will help you from here.`;
  }

  if (preview.includes("hi") || preview.includes("hello") || preview.includes("hey")) {
    return `Hi ${participantName}! Thanks for reaching out. How can I help you today? 😊`;
  }

  return `Thanks for reaching out, ${participantName}. I can help with that.`;
}

function resolveComposerVariables(text: string, conv: IGConversation | null) {
  const name = getParticipantName(conv);
  const firstName = name.split(" ")[0] || name;
  const handle = conv?.participant.username ? `@${conv.participant.username}` : name;

  return text
    .replaceAll("{first_name}", firstName)
    .replaceAll("{instagram_handle}", handle)
    .replaceAll("{program_link}", "https://tractionflo.com/program");
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getConversationsSignature(conversations: IGConversation[]) {
  return conversations
    .map((conversation) =>
      [
        conversation.id,
        conversation.messages
          .map((message) =>
            [
              message.id,
              message.time,
              message.text,
              message.status || "",
              message.attachments
                ?.map((attachment) => `${attachment.type}:${attachment.name || ""}:${attachment.mime_type || ""}`)
                .join(",") || "",
            ].join("~")
          )
          .join("|"),
      ].join(":")
    )
    .join("||");
}

function getInstagramOAuthErrorFromLocation() {
  if (typeof window === "undefined") {
    return null;
  }

  const error = new URLSearchParams(window.location.search).get("ig_error")?.trim();
  return error || null;
}

function getConversationAiMessages(conv: IGConversation) {
  return [...conv.messages]
    .reverse()
    .slice(-16)
    .map((message) => ({
      from: message.from,
      text: message.text,
      attachments: message.attachments?.map((attachment) => ({
        type: attachment.type,
        name: attachment.name,
      })),
      time: message.time,
    }));
}

function getInboxEscalations(conv: IGConversation | null): ConversationEscalation[] {
  return conv ? detectConversationEscalations(getConversationAiMessages(conv), { rules: readEscalationRulesFromStorage() }) : [];
}

function normalizeWorkflowEscalation(escalation?: AiWorkflowResponse["escalation"]): ConversationEscalation | null {
  if (!escalation?.label) {
    return null;
  }

  return {
    intent: "complex_question",
    label: escalation.label,
    reply: "",
    summary: escalation.summary || "This conversation needs creator attention.",
    recommendedAction: escalation.recommendedAction || "Take over and respond manually before AI continues.",
    signals: escalation.signals || [],
    urgency: escalation.urgency || "Medium",
  };
}

function getInboxEscalationBadgeClass(escalation: { urgency?: ConversationEscalation["urgency"] } | null) {
  if (!escalation) {
    return "";
  }

  if (escalation.urgency === "High") {
    return "border-[#ffd1dc] bg-[#fff3f7] text-[#df405b]";
  }

  return "border-[#d7ccff] bg-[#f0edff] text-[#6d3cff]";
}

function getLeadScoreTone(score: number) {
  if (score >= 75) return "bg-[#e7f8ed] text-[#0a9b3f]";
  if (score >= 45) return "bg-[#fff3e6] text-[#ff850d]";
  return "bg-[#eef4ff] text-[#3044ff]";
}

function getLeadSummary(lead: AiLeadInsight | undefined) {
  if (!lead) {
    return "Add an OpenAI key to qualify this lead.";
  }

  return lead.summary || lead.recommendedAction;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ src, name, size = "h-10 w-10" }: { src: string; name: string; size?: string }) {
  const [failedSrc, setFailedSrc] = useState("");
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  if (!src || failedSrc === src) {
    return (
      <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-white text-[11px] font-extrabold`}>
        {initials}
      </span>
    );
  }

  return (
    // Profile pictures are short-lived Instagram CDN URLs, so render them directly.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      className={`${size} shrink-0 rounded-full object-cover`}
      onError={() => setFailedSrc(src)}
    />
  );
}

function IGBadge() {
  return (
    <span className="relative h-3.5 w-3.5 shrink-0 rounded-[3.5px] bg-gradient-to-tr from-[#ffb000] via-[#ff3e8a] to-[#7b39ff]">
      <span className="absolute left-[3.5px] top-[3.5px] h-[6px] w-[6px] rounded-full border border-white" />
      <span className="absolute right-[2.5px] top-[2.5px] h-[2.5px] w-[2.5px] rounded-full bg-white" />
    </span>
  );
}

// ─── Conversation List ────────────────────────────────────────────────────────

function ConvList({
  convs,
  activeId,
  starredConversationIds,
  onSelect,
  loading,
  refreshing,
  error,
  oauthError,
  account,
  onRefresh,
  onDisconnect,
  onConnectNew,
  disconnecting,
  connectingNew,
}: {
  convs: IGConversation[];
  activeId: string | null;
  starredConversationIds: string[];
  onSelect: (id: string) => void;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  oauthError: string | null;
  account: IGAccount | null;
  onRefresh: () => void;
  onDisconnect: () => void;
  onConnectNew: () => void;
  disconnecting: boolean;
  connectingNew: boolean;
}) {
  const isConnected = Boolean(account || convs.length > 0 || (error && error !== "No Instagram account connected"));
  const showOAuthError = Boolean(oauthError && !account && convs.length === 0);
  const needsConnection = error === "No Instagram account connected" || showOAuthError;
  const needsReconnect = Boolean(error && /access token|session has expired|oauth/i.test(error));

  return (
    <section className="hidden h-full min-w-0 flex-col border-r border-[#e7eaf2] bg-white md:flex">
      <header className="flex h-[58px] shrink-0 items-center justify-between gap-3 px-5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-[17px] font-bold text-black">Inbox</h1>
          {isConnected && (
            <span className="flex items-center gap-1 rounded-full bg-[#e7f8ed] px-2 py-0.5 text-[10px] font-extrabold text-[#0a9b3f]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0a9b3f]" />
              Live
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onConnectNew}
            disabled={disconnecting || connectingNew}
            className="flex h-7 items-center rounded-[7px] border border-[#dfe4f1] bg-white px-2 text-[10px] font-extrabold text-[#3044ff] transition hover:bg-[#f6f7ff] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {connectingNew ? "Opening" : "New account"}
          </button>
          {isConnected && (
            <button
              type="button"
              onClick={onDisconnect}
              disabled={disconnecting}
              className="flex h-7 items-center rounded-[7px] border border-[#ffd6dd] bg-[#fff8fa] px-2 text-[10px] font-extrabold text-[#df405b] transition hover:bg-[#fff0f3] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {disconnecting ? "Disconnecting" : "Disconnect"}
            </button>
          )}
          <button
            type="button"
            aria-label="Refresh"
            onClick={onRefresh}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#596175] transition hover:bg-[#f3f4f8]"
          >
            <RefreshCw size={15} strokeWidth={2.2} className={loading || refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-2.5 pb-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 pt-16 text-center">
            <Loader2 size={22} className="animate-spin text-[#4b3cff]" />
            <p className="text-[12px] font-medium text-[#596175]">Loading Instagram DMs…</p>
          </div>
        ) : needsConnection ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 pt-16 text-center">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-tr from-[#ffbd00] via-[#ff2d85] to-[#6d3cff]">
              <div className="h-8 w-8 rounded-[9px] border-[3px] border-white" />
              <div className="absolute h-3.5 w-3.5 rounded-full border-[3px] border-white" />
              <div className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-white" />
            </div>
            <p className="text-[13px] font-bold text-black">
              {showOAuthError ? "Instagram not connected" : "Instagram disconnected"}
            </p>
            {showOAuthError ? (
              <div className="max-w-[240px] rounded-[9px] border border-[#ffd5dd] bg-[#fff7f9] px-3 py-2">
                <TriangleAlert size={16} className="mx-auto mb-1.5 text-[#df405b]" />
                <p className="text-[11px] font-semibold leading-[1.45] text-[#df405b]">{oauthError}</p>
              </div>
            ) : (
              <p className="text-[11px] font-medium leading-[1.5] text-[#596175]">
                Connect an Instagram Business account to load conversations.
              </p>
            )}
            <a
              href="/api/auth/instagram?next=/conversations"
              className="mt-1 flex h-8 items-center justify-center rounded-[8px] bg-[#3044ff] px-4 text-[12px] font-semibold text-white"
            >
              Connect Instagram
            </a>
          </div>
        ) : error ? (
          <div className="mx-3 mt-6 rounded-[10px] border border-[#ffd5dd] bg-[#fff7f9] p-4 text-center">
            <TriangleAlert size={18} className="mx-auto mb-2 text-[#df405b]" />
            <p className="text-[12px] font-extrabold text-[#df405b]">Could not load DMs</p>
            <p className="mt-1 text-[11px] font-medium text-[#596175]">{error}</p>
            <button
              type="button"
              onClick={onRefresh}
              className="mt-3 flex h-8 w-full items-center justify-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white text-[12px] font-semibold text-black"
            >
              <RefreshCw size={13} />
              Retry
            </button>
            {needsReconnect && (
              <button
                type="button"
                onClick={onConnectNew}
                disabled={connectingNew}
                className="mt-2 flex h-8 w-full items-center justify-center rounded-[8px] bg-[#3044ff] px-3 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {connectingNew ? "Opening Instagram" : "Reconnect Instagram"}
              </button>
            )}
          </div>
        ) : convs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 pt-16 text-center">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-tr from-[#ffbd00] via-[#ff2d85] to-[#6d3cff]">
              <div className="h-8 w-8 rounded-[9px] border-[3px] border-white" />
              <div className="absolute h-3.5 w-3.5 rounded-full border-[3px] border-white" />
              <div className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-white" />
            </div>
            <p className="text-[13px] font-bold text-black">No DMs yet</p>
            {account && (
              <p className="max-w-[220px] text-[11px] font-semibold leading-[1.45] text-[#3044ff]">
                Connected as {formatInstagramAccount(account)}
              </p>
            )}
            <p className="text-[11px] font-medium leading-[1.5] text-[#596175]">
              Instagram conversations will appear here as they arrive via your connected account.
            </p>
            <button
              type="button"
              onClick={onRefresh}
              className="mt-1 flex h-8 items-center justify-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-4 text-[12px] font-semibold text-black"
            >
              <RefreshCw size={13} />
              Refresh inbox
            </button>
          </div>
        ) : (
          convs.map((conv) => {
            const lastMsg = conv.messages.find((message) => message.from !== "note");
            const name = conv.participant.username || conv.participant.name || `User ${conv.participant.id.slice(-6)}`;
            const avatarSrc = conv.participant.profile_pic || "";
            const escalations = getInboxEscalations(conv);
            const escalation = escalations[0];
            const isStarred = starredConversationIds.includes(conv.id);

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => onSelect(conv.id)}
                className={`relative flex min-h-[64px] w-full items-start gap-3 rounded-[10px] border px-3 py-2 text-left transition ${
                  activeId === conv.id
                    ? "border-[#e2e6f3] bg-[#fbfbff] shadow-[0_16px_35px_rgba(65,74,112,0.045)]"
                    : "border-transparent bg-white hover:bg-[#fafbff]"
                }`}
              >
                {activeId === conv.id && (
                  <span className="absolute -left-3 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-[#4b3cff]" />
                )}
                <Avatar src={avatarSrc} name={name} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-bold text-black">{name}</span>
                    {escalation ? (
                      <>
                        <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-extrabold ${getInboxEscalationBadgeClass(escalation)}`}>
                          {escalation.label}
                        </span>
                        {escalations.length > 1 ? (
                          <span className="shrink-0 rounded-full bg-[#eff1f6] px-1.5 py-0.5 text-[9px] font-extrabold text-[#596175]">
                            +{escalations.length - 1}
                          </span>
                        ) : null}
                      </>
                    ) : null}
                  </span>
                  <span className="mt-1 block line-clamp-1 text-[12px] font-medium leading-[1.35] text-[#4f566c]">
                    {getShortMessagePreview(lastMsg)}
                  </span>
                </span>
                <span className="flex h-full shrink-0 flex-col items-end justify-between gap-5">
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#596175]">
                    {isStarred ? (
                      <Star size={12} strokeWidth={2.35} fill="currentColor" className="text-[#f59e0b]" />
                    ) : null}
                    <span>{conv.updated_time ? relativeTime(conv.updated_time) : ""}</span>
                  </span>
                  <IGBadge />
                </span>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}

// ─── Chat Thread ──────────────────────────────────────────────────────────────

function ChatBubble({ msg, igUserId }: { msg: IGMessage; igUserId: string }) {
  const isMe = msg.from === "me" || msg.sender_id === igUserId;
  const hasText = Boolean(msg.text);
  const attachments = msg.attachments || [];

  return (
    <div className={`flex w-full items-end gap-2.5 ${isMe ? "justify-end sm:pr-4" : "justify-start"}`}>
      {!isMe && (
        <Avatar
          src={msg.sender_profile_pic || ""}
          name={msg.sender_name || "User"}
          size="h-8 w-8"
        />
      )}
      <div
        className={`max-w-[82%] rounded-[13px] px-3.5 py-2 text-[12px] leading-[1.45] shadow-[0_16px_40px_rgba(20,28,53,0.035)] sm:max-w-[70%] ${
          isMe ? "bg-[#f0efff] text-[#171c33]" : "bg-white text-black"
        }`}
      >
        {msg.reply_to?.story && (
          <div className="mb-2 flex items-start gap-2.5 rounded-[9px] border border-[#e7eaf2] bg-[#f8f9fc] p-1.5 pr-2.5">
            {msg.reply_to.story.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={msg.reply_to.story.url}
                alt="Story preview"
                className="h-14 w-10 shrink-0 rounded-[6px] object-cover bg-gray-100"
                referrerPolicy="no-referrer"
              />
            )}
            <div className="min-w-0 py-0.5">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#7c3aed]">
                Story Reply
              </span>
              <span className="block truncate text-[10px] font-semibold text-[#596175]">
                ID: {msg.reply_to.story.id || 'N/A'}
              </span>
            </div>
          </div>
        )}
        {attachments.length > 0 && (
          <div className="mb-2 space-y-2">
            {attachments.map((attachment, index) => {
              if (attachment.type === "image") {
                return (
                  <a
                    key={`${msg.id}-image-${index}`}
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-[10px] border border-[#edf0f6] bg-[#f7f8fb]"
                  >
                    {/* Signed Instagram CDN URLs are dynamic external media, so render them directly. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={attachment.preview_url || attachment.url}
                      alt={attachment.name || "Instagram image attachment"}
                      className="max-h-[320px] w-full min-w-[180px] object-cover"
                    />
                  </a>
                );
              }

              if (attachment.type === "video") {
                return (
                  <video
                    key={`${msg.id}-video-${index}`}
                    src={attachment.url}
                    className="max-h-[320px] w-full min-w-[180px] rounded-[10px] border border-[#edf0f6] bg-black"
                    controls
                  />
                );
              }

              return (
                <a
                  key={`${msg.id}-attachment-${index}`}
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-[9px] border border-[#dde3ee] bg-white px-3 py-2 text-[11px] font-semibold text-[#3044ff]"
                >
                  {attachment.name || "Open attachment"}
                </a>
              );
            })}
          </div>
        )}
        {hasText ? (
          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
        ) : attachments.length === 0 ? (
          <p className="text-[#596175]">Unsupported message</p>
        ) : null}
        <div className={`mt-1 text-[10px] font-medium text-[#596175] ${isMe ? "text-right" : ""}`}>
          {msg.status === "sending" ? "Sending..." : msg.status === "failed" ? "Not sent" : msgTime(msg.time)}
          {isMe && msg.status !== "failed" && <span className="ml-1 text-[#246bff]">✓✓</span>}
        </div>
      </div>
      {isMe && (
        <span className="mb-5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#101113] shadow-[0_8px_22px_rgba(20,28,53,0.12)] ring-1 ring-black/5">
          {/* Local brand avatar lives in public/, so use the direct public path. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/dp.png"
            alt="TractionFlo"
            className="h-[22px] w-[26px] object-contain"
          />
        </span>
      )}
    </div>
  );
}

function ChatComposer({
  conv,
  initialDraft,
  status,
  takeoverMode,
  savedReplies,
  welcomeMessage,
  onSubmit,
  onGenerateAiReply,
}: {
  conv: IGConversation | null;
  initialDraft: ComposerDraft | null;
  status: ComposerStatus;
  takeoverMode: ConversationTakeoverMode;
  savedReplies: SavedReplySetting[];
  welcomeMessage: WelcomeMessageSetting;
  onSubmit: (payload: ComposerSubmitPayload) => Promise<void>;
  onGenerateAiReply: () => Promise<string>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(initialDraft?.text || "");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [openMenu, setOpenMenu] = useState<ComposerMenu | null>(null);
  const [aiReplying, setAiReplying] = useState(false);

  const isHumanTakeover = takeoverMode === "human";
  const canManualReply = Boolean(conv && isHumanTakeover && !status.sending);
  const canUseAiTools = Boolean(conv && isHumanTakeover);
  const canUseWelcomeMessage = Boolean(canManualReply && welcomeMessage.enabled && welcomeMessage.text.trim());
  const visibleSavedReplies = savedReplies.filter((reply) => reply.enabled && reply.text.trim());
  const canAttach = canManualReply;
  const canSubmit = Boolean(
    canManualReply &&
      (text.trim() || attachments.length > 0)
  );
  const activeMenu = canManualReply ? openMenu : null;

  const closeMenus = () => {
    setOpenMenu(null);
  };

  const insertText = (value: string) => {
    if (!canManualReply) return;

    setText((current) => `${current}${current && !current.endsWith(" ") ? " " : ""}${value}`);
  };

  const clearAttachments = () => {
    attachments.forEach((attachment) => URL.revokeObjectURL(attachment.previewUrl));
    setAttachments([]);
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || !canAttach) return;

    const nextAttachments = Array.from(files)
      .filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"))
      .map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${globalThis.crypto.randomUUID()}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl: URL.createObjectURL(file),
      }));

    if (nextAttachments.length > 0) {
      setAttachments((current) => [...current, ...nextAttachments]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((current) => {
      const removed = current.find((attachment) => attachment.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((attachment) => attachment.id !== id);
    });
  };

  const generateAiReply = async () => {
    if (!conv || aiReplying || !canUseAiTools) return;

    setAiReplying(true);

    try {
      const reply = await onGenerateAiReply();
      setText(reply);
    } catch {
      setText(getSuggestedReply(conv));
    } finally {
      setAiReplying(false);
      closeMenus();
    }
  };

  const submitComposer = async (refreshAfter = false) => {
    if (!conv || !canSubmit) return;

    const finalText = resolveComposerVariables(text.trim(), conv);
    const localAttachments = attachments.map((attachment) => ({
      type: attachment.type.startsWith("video/") ? "video" : "image",
      url: attachment.previewUrl,
      preview_url: attachment.previewUrl,
      name: attachment.name,
      mime_type: attachment.type,
      local: true,
    }));

    try {
      await onSubmit({
        mode: "reply",
        text: finalText,
        files: attachments.map((attachment) => attachment.file),
        localAttachments,
        refreshAfter,
      });
    } catch {
      return;
    }

    setText("");
    clearAttachments();
    closeMenus();
  };

  return (
    <div className="relative rounded-[10px] border border-[#dde3ee] bg-white shadow-[0_18px_40px_rgba(20,28,53,0.04)]">
      <div className="flex h-8 items-center gap-1 border-b border-[#edf0f6] px-3 text-[12px] font-bold">
        <span className="flex h-7 items-center rounded-[7px] bg-[#f0efff] px-3 text-black">Reply</span>
        {status.notice && <span className="ml-auto text-[10px] font-extrabold text-[#0a9b3f]">{status.notice}</span>}
      </div>

      <div className="px-4 py-2">
        {status.error && (
          <div className="mb-2 rounded-[8px] border border-[#ffd4dc] bg-[#fff7f9] px-3 py-2 text-[11px] font-bold leading-[1.45] text-[#df405b]">
            {status.error}
          </div>
        )}

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              void submitComposer(false);
            }
          }}
          disabled={!canManualReply}
          rows={2}
          placeholder={
            isHumanTakeover
              ? "Human takeover active. Type a manual reply..."
              : "AI takeover active. Switch to human takeover to reply manually."
          }
          className="min-h-[48px] w-full resize-none bg-transparent text-[13px] font-medium leading-[1.45] text-[#20273b] outline-none placeholder:text-[#9aa1b5] disabled:cursor-not-allowed disabled:opacity-60"
        />

        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <span
                key={attachment.id}
                className="flex max-w-full items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-[#f8f9fd] px-2 py-1 text-[11px] font-semibold text-[#31394f]"
              >
                <Paperclip size={12} />
                <span className="max-w-[170px] truncate">{attachment.name}</span>
                <span className="text-[#8b92a6]">{formatFileSize(attachment.size)}</span>
                <button
                  type="button"
                  aria-label={`Remove ${attachment.name}`}
                  disabled={!canManualReply}
                  onClick={() => removeAttachment(attachment.id)}
                  className="rounded-full p-0.5 text-[#596175] hover:bg-[#e8ebf3] hover:text-black disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 text-[#31394f]">
            <button
              type="button"
              title={welcomeMessageLabel}
              aria-label={welcomeMessageLabel}
              disabled={!canUseWelcomeMessage}
              onClick={() => insertText(welcomeMessage.text)}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] transition hover:bg-[#f3f4f8] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Zap size={16} />
            </button>
            <button
              type="button"
              title="Emoji"
              aria-label="Emoji"
              disabled={!canManualReply}
              onClick={() => setOpenMenu((menu) => (menu === "emoji" ? null : "emoji"))}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] transition hover:bg-[#f3f4f8] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Smile size={16} />
            </button>
            <button
              type="button"
              title="Attach image or video"
              aria-label="Attach image or video"
              disabled={!canAttach}
              onClick={() => fileInputRef.current?.click()}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] transition hover:bg-[#f3f4f8] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Paperclip size={16} />
            </button>
            <button
              type="button"
              title="Saved replies"
              aria-label="Saved replies"
              disabled={!canManualReply}
              onClick={() => setOpenMenu((menu) => (menu === "snippets" ? null : "snippets"))}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] transition hover:bg-[#f3f4f8] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Bookmark size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(event) => handleFilesSelected(event.target.files)}
            />
          </div>

          <div className="flex gap-2">
            {isHumanTakeover ? (
              <button
                type="button"
                disabled={!conv || status.sending || aiReplying || !canUseAiTools}
                onClick={() => {
                  void generateAiReply();
                }}
                className="flex h-8 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-[#f3f4ff] px-3.5 text-[12px] font-semibold text-[#3044ff] transition hover:bg-[#eceeff] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {aiReplying ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {aiReplying ? "Thinking" : "AI Reply"}
              </button>
            ) : null}
            <div className="relative flex">
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => void submitComposer(false)}
                className="flex h-8 items-center gap-2 rounded-l-[8px] bg-[#3044ff] px-3.5 text-[12px] font-semibold text-white shadow-[0_16px_30px_rgba(48,68,255,0.24)] transition hover:bg-[#2638f0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status.sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                Send
              </button>
              <button
                type="button"
                aria-label="Send options"
                disabled={!canSubmit}
                onClick={() => setOpenMenu((menu) => (menu === "send" ? null : "send"))}
                className="flex h-8 w-8 items-center justify-center rounded-r-[8px] bg-[#3044ff] text-white transition hover:bg-[#2638f0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronDown size={14} />
              </button>
              {activeMenu === "send" && (
                <div className="absolute bottom-10 right-0 z-20 w-44 overflow-hidden rounded-[9px] border border-[#dde3ee] bg-white py-1 text-[11px] font-semibold text-[#252c41] shadow-[0_20px_55px_rgba(20,28,53,0.14)]">
                  <button type="button" onClick={() => void submitComposer(false)} className="block w-full px-3 py-2 text-left hover:bg-[#f6f7fb]">
                    Send now
                  </button>
                  <button type="button" onClick={() => void submitComposer(true)} className="block w-full px-3 py-2 text-left hover:bg-[#f6f7fb]">
                    Send and refresh
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {activeMenu === "emoji" && (
        <div className="absolute bottom-[62px] left-2 z-20 overflow-hidden rounded-[12px] border border-[#dde3ee] bg-white shadow-[0_22px_60px_rgba(20,28,53,0.16)] sm:left-4">
          <EmojiPicker
            width={320}
            height={360}
            theme={Theme.LIGHT}
            emojiStyle={EmojiStyle.NATIVE}
            lazyLoadEmojis
            searchPlaceHolder="Search emoji"
            skinTonePickerLocation={SkinTonePickerLocation.SEARCH}
            previewConfig={{ showPreview: false }}
            onEmojiClick={(emojiData: EmojiClickData) => insertText(emojiData.emoji)}
          />
        </div>
      )}

      {activeMenu === "snippets" && (
        <div className="absolute bottom-[62px] left-24 z-20 w-72 overflow-hidden rounded-[10px] border border-[#dde3ee] bg-white py-1 shadow-[0_20px_55px_rgba(20,28,53,0.14)]">
          {visibleSavedReplies.length > 0 ? (
            visibleSavedReplies.map((reply) => (
              <button
                key={reply.id}
                type="button"
                onClick={() => {
                  setText(reply.text);
                  closeMenus();
                }}
                className="block w-full px-3 py-2 text-left text-[11px] font-semibold leading-[1.35] text-[#252c41] hover:bg-[#f6f7fb]"
              >
                {reply.text}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-[11px] font-semibold text-[#596175]">No saved replies yet</p>
          )}
        </div>
      )}

    </div>
  );
}

function ChatThread({
  conv,
  igUserId,
  composerStatus,
  composerDraft,
  onComposerSubmit,
  onGenerateAiReply,
  takeoverMode,
  onToggleTakeoverMode,
  isStarred,
  onToggleStarred,
}: {
  conv: IGConversation | null;
  igUserId: string;
  composerStatus: ComposerStatus;
  composerDraft: ComposerDraft | null;
  onComposerSubmit: (payload: ComposerSubmitPayload) => Promise<void>;
  onGenerateAiReply: () => Promise<string>;
  takeoverMode: ConversationTakeoverMode;
  onToggleTakeoverMode: () => void;
  isStarred: boolean;
  onToggleStarred: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const messages = conv ? [...conv.messages].filter((message) => message.from !== "note").reverse() : [];
  const [quickReplies, setQuickReplies] = useState<QuickReplySetting[]>(() => readQuickRepliesFromStorage());
  const [savedReplies, setSavedReplies] = useState<SavedReplySetting[]>(() => readSavedRepliesFromStorage());
  const [welcomeMessage, setWelcomeMessage] = useState<WelcomeMessageSetting>(() => readWelcomeMessageFromStorage());
  const [actionsOpen, setActionsOpen] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conv?.id, messages.length]);

  useEffect(() => {
    const refreshComposerShortcuts = () => {
      setQuickReplies(readQuickRepliesFromStorage());
      setSavedReplies(readSavedRepliesFromStorage());
      setWelcomeMessage(readWelcomeMessageFromStorage());
    };
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === settingsStateStorageKey) {
        refreshComposerShortcuts();
      }
    };

    window.addEventListener(quickRepliesChangedEvent, refreshComposerShortcuts);
    window.addEventListener(savedRepliesChangedEvent, refreshComposerShortcuts);
    window.addEventListener(welcomeMessageChangedEvent, refreshComposerShortcuts);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(quickRepliesChangedEvent, refreshComposerShortcuts);
      window.removeEventListener(savedRepliesChangedEvent, refreshComposerShortcuts);
      window.removeEventListener(welcomeMessageChangedEvent, refreshComposerShortcuts);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const name = conv ? getParticipantName(conv) : "Select a conversation";
  const avatarSrc = conv?.participant.profile_pic || "";
  const profileUrl = getInstagramProfileUrl(conv);
  const isHumanTakeover = takeoverMode === "human";
  const takeoverLabel = getTakeoverLabel(takeoverMode);
  const TakeoverStatusIcon = isHumanTakeover ? Users : Sparkles;
  const visibleQuickReplies = quickReplies.filter((reply) => reply.enabled && reply.label.trim() && reply.text.trim());

  return (
    <main className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white">
      <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-[#e7eaf2] px-4 py-1.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" aria-label="Back" className="text-[#1f2638]">
            <ArrowLeft size={20} strokeWidth={2.3} />
          </button>
          {conv ? (
            <>
              <Avatar src={avatarSrc} name={name} size="h-10 w-10" />
              <div className="min-w-0">
                <h2 className="truncate text-[15px] font-bold leading-tight text-black">{name}</h2>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <IGBadge />
                  <p className="text-[12px] font-medium text-[#596175]">Instagram</p>
                  <span
                    className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-bold ${getTakeoverPillClass(
                      takeoverMode
                    )}`}
                  >
                    <TakeoverStatusIcon size={13} strokeWidth={2.4} />
                    {takeoverLabel}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <h2 className="text-[14px] font-bold text-black">Select a conversation</h2>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {conv ? (
            <>
              <button
                type="button"
                aria-label={isStarred ? "Remove star marker" : "Star conversation"}
                aria-pressed={isStarred}
                onClick={onToggleStarred}
                className={`flex h-9 w-9 items-center justify-center rounded-[9px] border transition ${
                  isStarred ? "border-[#ffe2a8] bg-[#fff8e8] text-[#f59e0b]" : "border-[#dde3ee] bg-white text-black hover:bg-[#f6f7fb]"
                }`}
              >
                <Star size={17} strokeWidth={2.25} fill={isStarred ? "currentColor" : "none"} />
              </button>
              <div className="relative">
                <button
                  type="button"
                  aria-label="More conversation actions"
                  onClick={() => setActionsOpen((open) => !open)}
                  className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-[#dde3ee] bg-white text-black transition hover:bg-[#f6f7fb]"
                >
                  <MoreHorizontal size={17} strokeWidth={2.25} />
                </button>
                {actionsOpen ? (
                  <div className="absolute right-0 top-10 z-30 w-44 overflow-hidden rounded-[9px] border border-[#dde3ee] bg-white py-1 text-[11px] font-semibold text-[#252c41] shadow-[0_20px_55px_rgba(20,28,53,0.14)]">
                    <button
                      type="button"
                      onClick={() => {
                        if (profileUrl) void navigator.clipboard.writeText(profileUrl);
                        setActionsOpen(false);
                      }}
                      disabled={!profileUrl}
                      className="block w-full px-3 py-2 text-left hover:bg-[#f6f7fb] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Copy profile link
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isStarred) {
                          onToggleStarred();
                        }
                        setActionsOpen(false);
                      }}
                      className="block w-full px-3 py-2 text-left hover:bg-[#f6f7fb]"
                    >
                      Clear star
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
          {conv && (
            <button
              type="button"
              onClick={onToggleTakeoverMode}
              className={`hidden h-10 items-center gap-2 rounded-[8px] px-3 text-[12px] font-extrabold transition sm:flex xl:hidden ${
                isHumanTakeover
                  ? "border border-[#dde3ee] bg-white text-black hover:bg-[#f6f7fb]"
                  : "bg-[#3044ff] text-white shadow-[0_16px_30px_rgba(48,68,255,0.22)] hover:bg-[#2638f0]"
              }`}
            >
              {isHumanTakeover ? <Sparkles size={15} strokeWidth={2.4} /> : <Users size={15} strokeWidth={2.4} />}
              {isHumanTakeover ? "Take over AI" : "Take over human"}
            </button>
          )}
          <NotificationBell
            iconSize={17}
            buttonClassName="relative flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#dde3ee] bg-white transition hover:bg-[#f6f7fb] xl:hidden"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {!conv ? (
          <div className="flex items-center justify-center pt-20 text-[13px] font-medium text-[#596175]">
            Select a conversation to view messages
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center pt-20 text-[13px] font-medium text-[#596175]">
            No messages in this conversation
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} msg={msg} igUserId={igUserId} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <footer className="shrink-0 px-4 pb-3 sm:px-6">
        {visibleQuickReplies.length > 0 ? (
          <div className="mb-2 flex max-w-full flex-nowrap items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
            {visibleQuickReplies.map((reply) => {
              const Icon = getQuickReplyIcon(reply);

              return (
                <button
                  key={reply.id}
                  type="button"
                  onClick={() => {
                    void onComposerSubmit({
                      mode: "reply",
                      text: reply.text,
                      files: [],
                      localAttachments: [],
                      refreshAfter: false,
                    }).catch(() => undefined);
                  }}
                  disabled={!conv || composerStatus.sending || !isHumanTakeover}
                  className="flex h-7 shrink-0 items-center gap-2 rounded-[9px] border border-[#dde3ee] bg-white px-3 text-[11px] font-medium text-[#31394f] transition hover:bg-[#f6f7fb] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon size={14} strokeWidth={2.2} />
                  {reply.label}
                </button>
              );
            })}
          </div>
        ) : null}
        <ChatComposer
          key={`${conv?.id || "empty"}-${composerDraft?.id || 0}-${takeoverMode}`}
          conv={conv}
          initialDraft={composerDraft}
          status={composerStatus}
          takeoverMode={takeoverMode}
          savedReplies={savedReplies}
          welcomeMessage={welcomeMessage}
          onSubmit={onComposerSubmit}
          onGenerateAiReply={onGenerateAiReply}
        />
      </footer>
    </main>
  );
}

function EscalationFlagCarousel({
  escalations,
  isHumanTakeover,
  onToggleTakeoverMode,
}: {
  escalations: ConversationEscalation[];
  isHumanTakeover: boolean;
  onToggleTakeoverMode: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (escalations.length === 0) {
    return null;
  }

  const safeIndex = Math.min(activeIndex, escalations.length - 1);
  const hasMultipleEscalations = escalations.length > 1;
  const moveTo = (nextIndex: number) => {
    setActiveIndex((nextIndex + escalations.length) % escalations.length);
  };

  return (
    <section className="mt-3">
      {hasMultipleEscalations ? (
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[11px] font-extrabold text-[#596175]">
            {safeIndex + 1} of {escalations.length} flags
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Previous escalation flag"
              onClick={() => moveTo(safeIndex - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-[#dde3ee] bg-white text-[#46506a] transition hover:bg-[#f6f7fb]"
            >
              <ChevronLeft size={14} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              aria-label="Next escalation flag"
              onClick={() => moveTo(safeIndex + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-[#dde3ee] bg-white text-[#46506a] transition hover:bg-[#f6f7fb]"
            >
              <ChevronRight size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[10px]">
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${safeIndex * 100}%)` }}
        >
          {escalations.map((escalation) => (
            <div key={escalation.intent} className="w-full shrink-0">
              <div className={`rounded-[10px] border p-3 ${getInboxEscalationBadgeClass(escalation)}`}>
                <div className="flex items-start gap-2">
                  <TriangleAlert size={15} className="mt-0.5 shrink-0" strokeWidth={2.4} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[12px] font-extrabold text-black">Escalation flag</h3>
                      <span className="rounded-[7px] bg-white/75 px-2 py-0.5 text-[10px] font-extrabold">
                        {escalation.label || "Needs human review"}
                      </span>
                      {escalation.urgency ? (
                        <span className="rounded-[7px] bg-white/75 px-2 py-0.5 text-[10px] font-extrabold">
                          {escalation.urgency} urgency
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-[11px] font-semibold leading-relaxed text-[#253049]">
                      {escalation.summary || "This conversation needs creator attention."}
                    </p>
                    <p className="mt-2 rounded-[8px] bg-white/75 p-2 text-[11px] font-semibold leading-relaxed text-[#253049]">
                      {escalation.recommendedAction || "Take over and respond manually before AI continues."}
                    </p>
                    {escalation.signals?.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {escalation.signals.slice(0, 3).map((signal) => (
                          <span key={signal} className="rounded-[7px] bg-white/75 px-2 py-1 text-[10px] font-bold">
                            {signal}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {!isHumanTakeover ? (
                      <button
                        type="button"
                        onClick={onToggleTakeoverMode}
                        className="mt-3 flex h-8 w-full items-center justify-center gap-2 rounded-[8px] bg-[#3044ff] px-3 text-[11px] font-extrabold text-white shadow-[0_12px_24px_rgba(48,68,255,0.18)]"
                      >
                        <Users size={13} strokeWidth={2.4} />
                        Take over human
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {hasMultipleEscalations ? (
        <div className="mt-2 flex justify-center gap-1.5">
          {escalations.map((escalation, index) => (
            <button
              key={`${escalation.intent}-dot`}
              type="button"
              aria-label={`Show ${escalation.label}`}
              onClick={() => setActiveIndex(index)}
              className={`h-1.5 rounded-full transition-all ${
                index === safeIndex ? "w-5 bg-[#3044ff]" : "w-1.5 bg-[#d7deeb]"
              }`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

// ─── Summary Panel ────────────────────────────────────────────────────────────

function SummaryPanel({
  conv,
  igUserId,
  assistantId,
  accountName,
  composerStatus,
  takeoverMode,
  onToggleTakeoverMode,
  onDraftSuggestedReply,
  onAutoSendAiReply,
  agents,
  loadingAgents,
  canManageAgents,
  assignmentSavingAgentId,
  assignmentStatus,
  onToggleAgentAssignment,
}: {
  conv: IGConversation | null;
  igUserId: string;
  assistantId: string;
  accountName: string;
  composerStatus: ComposerStatus;
  takeoverMode: ConversationTakeoverMode;
  onToggleTakeoverMode: () => void;
  onDraftSuggestedReply: (text: string) => void;
  onAutoSendAiReply: (text: string, conversationId: string) => Promise<void>;
  agents: AgentAccount[];
  loadingAgents: boolean;
  canManageAgents: boolean;
  assignmentSavingAgentId: string;
  assignmentStatus: string;
  onToggleAgentAssignment: (agent: AgentAccount) => Promise<void>;
}) {
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [aiWorkflow, setAiWorkflow] = useState<AiWorkflowResponse | null>(null);
  const [aiStatus, setAiStatus] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [conversationNotes, setConversationNotes] = useState<ConversationNotesState>(() => readConversationNotesFromStorage());
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [, setClockTick] = useState(0);
  const lastAiKeyRef = useRef("");
  const takeoverModeRef = useRef<ConversationTakeoverMode>(takeoverMode);
  const isHumanTakeover = takeoverMode === "human";
  const takeoverLabel = getTakeoverLabel(takeoverMode);
  const TakeoverStatusIcon = isHumanTakeover ? Users : Sparkles;
  const profileUrl = getInstagramProfileUrl(conv);
  const assignedAgents = conv ? agents.filter((agent) => agent.assignedConversationIds.includes(conv.id)) : [];
  const msgs = conv ? [...conv.messages].filter((m) => m.from !== "note").reverse() : [];
  const trimmedMessageSearch = messageSearchQuery.trim().toLowerCase();
  const messageSearchMatches = trimmedMessageSearch
    ? msgs.filter((message) =>
        [
          message.text,
          message.sender_name,
          getMessagePreview(message),
        ].filter(Boolean).join(" ").toLowerCase().includes(trimmedMessageSearch)
      )
    : [];
  const lastUserMsg = conv?.messages.find(m => m.from === "user" && m.sender_id !== igUserId);
  const lastUserMsgPreview = getMessagePreview(lastUserMsg);
  const knowledgeSummary = aiWorkflow?.knowledge;
  const hasKnowledgeReply = knowledgeSummary?.mode === "direct" || knowledgeSummary?.mode === "context";
  const localEscalations = getInboxEscalations(conv);
  const workflowEscalation = normalizeWorkflowEscalation(aiWorkflow?.escalation);
  const escalationCards = localEscalations.length > 0 ? localEscalations : workflowEscalation ? [workflowEscalation] : [];
  const suggestedReply = isHumanTakeover
    ? ""
    : aiWorkflow?.reply ||
      (aiLoading ? "Reading saved knowledge and conversation context..." : getSuggestedReply(conv));
  const leadInsight = aiWorkflow?.lead;
  const aiRefreshKey = conv ? `${conv.id}-${conv.updated_time}-${conv.messages.length}` : "empty";
  const lastMessage = msgs[msgs.length - 1];
  const latestInboundMessage = lastMessage?.from === "user" ? lastMessage : null;
  const lastAutoSendKeyRef = useRef("");
  const savedConversationNote = conv ? conversationNotes[conv.id] : undefined;
  const noteDraft = conv ? noteDrafts[conv.id] ?? savedConversationNote?.text ?? "" : "";
  const hasConversationNote = Boolean(savedConversationNote?.text.trim());
  const hasConversationNoteChanges = Boolean(conv && noteDraft !== (savedConversationNote?.text || ""));
  const conversationNoteStatus = hasConversationNoteChanges
    ? "Unsaved changes"
    : hasConversationNote && savedConversationNote
      ? formatNoteSavedAt(savedConversationNote.updatedAt)
      : "No notes yet";
  const canSaveConversationNote = Boolean(conv && hasConversationNoteChanges);

  useEffect(() => {
    takeoverModeRef.current = takeoverMode;
  }, [takeoverMode]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setAssignmentOpen(false);
      setMessageSearchOpen(false);
      setMessageSearchQuery("");
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [conv?.id]);

  const runAiWorkflow = useCallback(
    async (options?: { silent?: boolean; forceRefresh?: boolean; signal?: AbortSignal }) => {
      const requestTakeoverMode = takeoverModeRef.current;

      if (!conv || requestTakeoverMode === "human") {
        setAiWorkflow(null);
        setAiStatus("");
        setAiLoading(false);
        return;
      }

      if (!options?.silent) {
        setAiStatus("");
      }

      setAiLoading(true);

      try {
        const response = await fetch("/api/ai/workflow", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          signal: options?.signal,
          body: JSON.stringify({
            assistantId,
            participant: conv.participant,
            accountName,
            takeoverMode: requestTakeoverMode,
            messages: getConversationAiMessages(conv),
            forceRefresh: options?.forceRefresh,
          }),
        });
        const data = (await response.json()) as AiWorkflowResponse;

        if (!response.ok || data.error) {
          throw new Error(data.error || "Could not run AI workflow");
        }

        if (takeoverModeRef.current === "human") {
          return;
        }

        setAiWorkflow(data);
        setAiStatus(
          data.handoff
            ? data.escalation?.recommendedAction || "Human handoff needed. AI auto-send is paused."
            : data.autoSend === false
              ? "AI reply ready. Auto-send is off."
              : "AI takeover active. Replies send automatically after drafting."
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setAiWorkflow(null);
        setAiStatus(error instanceof Error ? error.message : "Could not run AI workflow");
      } finally {
        if (takeoverModeRef.current !== "human") {
          setAiLoading(false);
        }
      }
    },
    [accountName, assistantId, conv]
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClockTick((tick) => tick + 1);
    }, 30_000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!conv || isHumanTakeover) {
      const timeout = window.setTimeout(() => {
        setAiWorkflow(null);
        setAiStatus("");
        setAiLoading(false);
        lastAiKeyRef.current = "";
      }, 0);

      return () => window.clearTimeout(timeout);
    }

    if (lastAiKeyRef.current === aiRefreshKey) {
      return undefined;
    }

    lastAiKeyRef.current = aiRefreshKey;
    setAiWorkflow(null);
    setAiLoading(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void runAiWorkflow({ silent: true, signal: controller.signal });
    }, 700);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [aiRefreshKey, conv, isHumanTakeover, runAiWorkflow]);

  useEffect(() => {
    const reply = aiWorkflow?.reply?.trim();

    if (
      true || // Backend webhook handles auto-sending; disable frontend auto-sending to prevent race conditions and duplicate messages
      !conv ||
      isHumanTakeover ||
      aiLoading ||
      composerStatus.sending ||
      !reply ||
      aiWorkflow?.autoSend === false ||
      aiWorkflow?.handoff ||
      !latestInboundMessage
    ) {
      return;
    }

    const autoSendKey = `${conv?.id || ""}:${latestInboundMessage?.id || ""}:${reply}`;

    if (lastAutoSendKeyRef.current === autoSendKey) {
      return;
    }

    lastAutoSendKeyRef.current = autoSendKey;
    setAiStatus("AI takeover active. Sending reply automatically...");

    void onAutoSendAiReply(reply || "", conv?.id || "")
      .then(() => {
        if (takeoverModeRef.current !== "human") {
          setAiStatus("AI takeover active. Reply sent automatically.");
        }
      })
      .catch((error) => {
        lastAutoSendKeyRef.current = "";

        if (takeoverModeRef.current !== "human") {
          setAiStatus(error instanceof Error ? error.message : "AI auto-send failed.");
        }
      });
  }, [
    aiLoading,
    aiWorkflow?.autoSend,
    aiWorkflow?.handoff,
    aiWorkflow?.reply,
    composerStatus.sending,
    conv,
    isHumanTakeover,
    latestInboundMessage,
    onAutoSendAiReply,
  ]);

  function updateConversationNoteDraft(value: string) {
    if (!conv) {
      return;
    }

    setNoteDrafts((current) => ({
      ...current,
      [conv.id]: value,
    }));
  }

  function saveConversationNote() {
    if (!conv) {
      return;
    }

    const trimmedNote = noteDraft.trim();
    const nextNotes = { ...conversationNotes };

    if (trimmedNote) {
      nextNotes[conv.id] = {
        text: trimmedNote,
        updatedAt: new Date().toISOString(),
      };
    } else {
      delete nextNotes[conv.id];
    }

    setConversationNotes(nextNotes);
    setNoteDrafts((current) => ({
      ...current,
      [conv.id]: trimmedNote,
    }));
    saveConversationNotesToStorage(nextNotes);
  }

  function clearConversationNote() {
    if (!conv) {
      return;
    }

    const nextNotes = { ...conversationNotes };
    delete nextNotes[conv.id];
    setConversationNotes(nextNotes);
    setNoteDrafts((current) => ({
      ...current,
      [conv.id]: "",
    }));
    saveConversationNotesToStorage(nextNotes);
  }

  return (
    <aside className="hidden h-full min-w-0 flex-col overflow-hidden border-l border-[#e7eaf2] bg-white xl:flex">
      <header className="relative z-10 flex h-[58px] shrink-0 items-center border-b border-[#e7eaf2] bg-white px-3">
        {messageSearchOpen ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-[9px] border border-[#dde3ee] bg-white px-3 text-[#596175]">
              <Search size={15} strokeWidth={2.35} />
              <input
                autoFocus
                value={messageSearchQuery}
                onChange={(event) => setMessageSearchQuery(event.target.value)}
                placeholder="Search messages..."
                className="min-w-0 flex-1 bg-transparent text-[12px] font-semibold text-[#20273b] outline-none placeholder:text-[#9aa1b5]"
              />
              {trimmedMessageSearch ? (
                <span className="rounded-full bg-[#eff1f6] px-2 py-0.5 text-[10px] font-extrabold text-[#596175]">
                  {messageSearchMatches.length}
                </span>
              ) : null}
            </label>
            <button
              type="button"
              aria-label="Close message search"
              onClick={() => {
                setMessageSearchOpen(false);
                setMessageSearchQuery("");
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-[#dde3ee] bg-white text-black transition hover:bg-[#f6f7fb]"
            >
              <X size={15} strokeWidth={2.35} />
            </button>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 overflow-hidden">
            {conv && profileUrl ? (
              <a
                href={profileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-[88px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[9px] border border-[#dde3ee] bg-white px-2 text-[11px] font-extrabold text-black transition hover:bg-[#f6f7fb]"
              >
                Profile
                <ExternalLink size={12} strokeWidth={2.45} />
              </a>
            ) : null}

            {conv && canManageAgents ? (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setAssignmentOpen((open) => !open)}
                  className="flex h-9 w-[124px] items-center justify-center gap-1.5 whitespace-nowrap rounded-[9px] border border-[#dde3ee] bg-white px-2 text-[11px] font-extrabold text-black transition hover:bg-[#f6f7fb]"
                >
                  <Users size={14} strokeWidth={2.35} />
                  Assign
                  <span className="rounded-full bg-[#f0edff] px-1.5 py-0.5 text-[10px] text-[#3044ff]">
                    {assignedAgents.length}
                  </span>
                  <ChevronDown size={12} strokeWidth={2.45} />
                </button>

                {assignmentOpen && (
                  <div className="absolute right-0 top-10 z-30 w-[292px] rounded-[10px] border border-[#dde3ee] bg-white p-2 shadow-[0_22px_60px_rgba(20,28,53,0.16)]">
                    <div className="flex items-center justify-between px-2 py-1">
                      <p className="text-[11px] font-extrabold uppercase text-[#596175]">Assign to agent</p>
                      <button
                        type="button"
                        aria-label="Close assignment menu"
                        onClick={() => setAssignmentOpen(false)}
                        className="flex h-6 w-6 items-center justify-center rounded-[6px] text-[#596175] hover:bg-[#f6f7fb]"
                      >
                        <X size={13} strokeWidth={2.4} />
                      </button>
                    </div>

                    {loadingAgents ? (
                      <div className="flex items-center gap-2 px-2 py-4 text-[11px] font-semibold text-[#46506a]">
                        <Loader2 size={14} className="animate-spin text-[#3044ff]" />
                        Loading agents
                      </div>
                    ) : agents.length === 0 ? (
                      <p className="px-2 py-4 text-[11px] font-semibold leading-relaxed text-[#46506a]">
                        Create an agent in Settings first.
                      </p>
                    ) : (
                      <div className="mt-1 grid max-h-[280px] gap-1 overflow-y-auto">
                        {agents.map((agent) => {
                          const checked = agent.assignedConversationIds.includes(conv.id);
                          const canAssign = agent.status === "Active" && agent.allowedPages.includes("inbox");

                          return (
                            <button
                              key={agent.id}
                              type="button"
                              onClick={() => void onToggleAgentAssignment(agent)}
                              disabled={!canAssign || assignmentSavingAgentId === agent.id}
                              className={`grid min-h-[58px] grid-cols-[22px_minmax(0,1fr)] items-start gap-2 rounded-[8px] px-2 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${
                                checked ? "bg-[#f6f7ff]" : "hover:bg-[#f6f7fb]"
                              }`}
                            >
                              <span
                                className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-[6px] border ${
                                  checked ? "border-[#3044ff] bg-[#3044ff] text-white" : "border-[#d7ddeb] bg-white text-transparent"
                                }`}
                              >
                                {assignmentSavingAgentId === agent.id ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Check size={13} strokeWidth={2.8} />
                                )}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-[12px] font-extrabold text-black">{agent.name}</span>
                                <span className="mt-0.5 block truncate text-[10px] font-semibold text-[#596175]">{agent.email}</span>
                                {!canAssign && (
                                  <span className="mt-1 block text-[10px] font-extrabold text-[#df405b]">
                                    Enable Conversations permission first
                                  </span>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {assignmentStatus && (
                      <p className="mt-2 rounded-[8px] bg-[#f6f7fb] px-2 py-2 text-[11px] font-semibold leading-relaxed text-[#46506a]">
                        {assignmentStatus}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : null}

            <button
              type="button"
              aria-label="Search messages"
              disabled={!conv}
              onClick={() => setMessageSearchOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-[#dde3ee] bg-white text-black transition hover:bg-[#f6f7fb] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Search size={16} strokeWidth={2.35} />
            </button>

            <NotificationBell
              ariaLabel="Conversation notifications"
              iconSize={16}
              buttonClassName="relative flex h-9 w-9 items-center justify-center rounded-[9px] border border-[#dde3ee] bg-white transition hover:bg-[#f6f7fb]"
            />
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-3">
        {conv ? (
          <section className="rounded-[14px] bg-white p-1 shadow-[0_22px_60px_rgba(20,28,53,0.055)]">
            <div className="p-2.5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-[13px] font-bold text-black">
                  <Sparkles size={16} className="text-[#77809b]" />
                  Conversation
                </h2>
                <span className="text-[10px] font-medium text-[#596175]">{msgs.length} messages</span>
              </div>

              <div className="mt-3 divide-y divide-[#edf0f6]">
                <div className="flex h-[34px] items-center justify-between gap-3">
                  <span className="text-[12px] font-normal text-black">Participant</span>
                  <span className="max-w-[160px] truncate rounded-[8px] border border-[#e7eaf2] bg-white px-2.5 py-0.5 text-[12px] text-black">
                    {conv.participant.username || conv.participant.name || conv.participant.id}
                  </span>
                </div>
                <div className="flex h-[34px] items-center justify-between gap-3">
                  <span className="text-[12px] font-normal text-black">Messages</span>
                  <span className="rounded-[8px] border border-[#e7eaf2] bg-white px-2.5 py-0.5 text-[12px] text-black">{msgs.length}</span>
                </div>
                <div className="flex h-[34px] items-center justify-between gap-3">
                  <span className="text-[12px] font-normal text-black">Last active</span>
                  <span className="rounded-[8px] border border-[#e7eaf2] bg-white px-2.5 py-0.5 text-[12px] text-black">
                    {lastMessage?.time ? relativeTime(lastMessage.time) : conv.updated_time ? relativeTime(conv.updated_time) : "—"}
                  </span>
                </div>
                <div className="flex h-[34px] items-center justify-between gap-3">
                  <span className="text-[12px] font-normal text-black">Channel</span>
                  <span className="flex items-center gap-1.5 rounded-[8px] border border-[#e7eaf2] bg-white px-2.5 py-0.5 text-[12px] text-black">
                    <IGBadge />Instagram
                  </span>
                </div>
                <div className="flex min-h-[42px] items-center justify-between gap-3 py-1.5">
                  <span className="text-[12px] font-normal text-black">Control</span>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span
                      className={`inline-flex h-8 items-center gap-1.5 rounded-[8px] border px-2.5 text-[11px] font-extrabold ${getTakeoverPillClass(
                        takeoverMode
                      )}`}
                    >
                      <TakeoverStatusIcon size={13} strokeWidth={2.4} />
                      {takeoverLabel}
                    </span>
                    <button
                      type="button"
                      onClick={onToggleTakeoverMode}
                      className={`flex h-8 items-center gap-2 rounded-[8px] px-2.5 text-[11px] font-extrabold transition ${
                        isHumanTakeover
                          ? "border border-[#dde3ee] bg-white text-black hover:bg-[#f6f7fb]"
                          : "bg-[#3044ff] text-white shadow-[0_12px_24px_rgba(48,68,255,0.18)] hover:bg-[#2638f0]"
                      }`}
                    >
                      {isHumanTakeover ? <Sparkles size={13} strokeWidth={2.4} /> : <Users size={13} strokeWidth={2.4} />}
                      {isHumanTakeover ? "Take over AI" : "Take over human"}
                    </button>
                  </div>
                </div>
              </div>

              <EscalationFlagCarousel
                key={conv.id}
                escalations={escalationCards}
                isHumanTakeover={isHumanTakeover}
                onToggleTakeoverMode={onToggleTakeoverMode}
              />

              {!isHumanTakeover ? (
                <div className="mt-3 rounded-[10px] border border-[#edf0f6] bg-[#fbfbff] p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex min-w-0 items-center gap-1.5 text-[12px] font-extrabold text-black">
                      <Target size={14} className="text-[#3044ff]" strokeWidth={2.35} />
                      AI qualification
                    </h3>
                    <button
                      type="button"
                      onClick={() => void runAiWorkflow({ forceRefresh: true })}
                      disabled={aiLoading}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-[#dde3ee] bg-white text-[#46506a] disabled:cursor-not-allowed disabled:opacity-55"
                      aria-label="Refresh AI qualification"
                    >
                      <RefreshCw size={13} className={aiLoading ? "animate-spin" : ""} />
                    </button>
                  </div>

                  {leadInsight ? (
                    <div className="mt-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-[8px] px-2 py-1 text-[10px] font-extrabold ${getLeadScoreTone(leadInsight.score)}`}>
                          {leadInsight.score}/100
                        </span>
                        <span className="rounded-[8px] bg-white px-2 py-1 text-[10px] font-extrabold text-[#253049]">
                          {leadInsight.stage}
                        </span>
                        <span className="rounded-[8px] bg-white px-2 py-1 text-[10px] font-extrabold text-[#253049]">
                          {leadInsight.urgency} urgency
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] font-medium leading-relaxed text-[#46506a]">{getLeadSummary(leadInsight)}</p>
                      <p className="mt-2 rounded-[8px] bg-white p-2 text-[11px] font-semibold leading-relaxed text-[#253049]">
                        {leadInsight.recommendedAction}
                      </p>
                      {leadInsight.signals.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {leadInsight.signals.slice(0, 3).map((signal) => (
                            <span key={signal} className="rounded-[7px] bg-[#f0edff] px-2 py-1 text-[10px] font-bold text-[#3044ff]">
                              {signal}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 rounded-[8px] bg-white p-2 text-[11px] font-medium leading-relaxed text-[#596175]">
                      {aiLoading ? "Reading this conversation..." : aiStatus || "Save an OpenAI key to activate AI qualification."}
                    </p>
                  )}

                  {aiStatus && leadInsight && (
                    <p className="mt-2 text-[10px] font-bold text-[#596175]">{aiStatus}</p>
                  )}

                </div>
              ) : null}

              <div className="mt-3 rounded-[10px] border border-[#e2e7f2] bg-white p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex min-w-0 items-center gap-1.5 text-[12px] font-extrabold text-black">
                    <FileText size={14} className="text-[#3044ff]" strokeWidth={2.35} />
                    Notes
                  </h3>
                  <span
                    className={`rounded-[8px] px-2 py-1 text-[10px] font-extrabold ${
                      hasConversationNoteChanges ? "bg-[#fff3e6] text-[#ff850d]" : "bg-[#f0efff] text-[#596175]"
                    }`}
                  >
                    {conversationNoteStatus}
                  </span>
                </div>

                <textarea
                  value={noteDraft}
                  onChange={(event) => updateConversationNoteDraft(event.target.value)}
                  disabled={!conv}
                  rows={5}
                  placeholder="Add private notes for this conversation..."
                  className="mt-2 min-h-[116px] w-full resize-none rounded-[9px] border border-[#dde3ee] bg-[#fbfbff] p-2.5 text-[12px] font-medium leading-[1.45] text-[#20273b] outline-none placeholder:text-[#9aa1b5] focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-[#8b92a6]">{noteDraft.length} chars</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={clearConversationNote}
                      disabled={!conv || (!hasConversationNote && !noteDraft)}
                      className="flex h-8 items-center justify-center gap-1.5 rounded-[8px] border border-[#dde3ee] bg-white px-3 text-[11px] font-extrabold text-[#596175] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <X size={13} strokeWidth={2.4} />
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={saveConversationNote}
                      disabled={!canSaveConversationNote}
                      className="flex h-8 items-center justify-center gap-1.5 rounded-[8px] bg-[#3044ff] px-3 text-[11px] font-extrabold text-white shadow-[0_12px_24px_rgba(48,68,255,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Check size={13} strokeWidth={2.4} />
                      Save
                    </button>
                  </div>
                </div>
              </div>

              {lastUserMsg && (
                <div className="mt-3">
                  <h3 className="text-[13px] font-bold text-black">Last message from user</h3>
                  <div className="mt-2 rounded-[8px] bg-[#f0efff] p-2.5 text-[12px] leading-[1.35] text-[#252c41]">
                    {lastUserMsgPreview}
                  </div>
                </div>
              )}

              {!isHumanTakeover ? (
                <div className="mt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex min-w-0 items-center gap-2">
                      <h3 className="text-[13px] font-bold text-black">{aiWorkflow?.reply ? "AI suggested reply" : "Suggested reply"}</h3>
                      {hasKnowledgeReply ? (
                        <span className="max-w-[132px] truncate rounded-[7px] bg-[#eafaf0] px-2 py-1 text-[10px] font-extrabold text-[#0a9b3f]">
                          {knowledgeSummary?.sourceTitle || "Saved knowledge"}
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => onDraftSuggestedReply(suggestedReply)}
                      disabled={aiLoading || !suggestedReply}
                      className="text-[11px] font-bold text-[#3044ff] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {aiLoading ? "Thinking" : "Auto-send on"}
                    </button>
                  </div>
                  <div className="rounded-[8px] border border-[#dde3ee] bg-white p-2.5 text-[12px] leading-[1.35] text-[#252c41]">
                    {suggestedReply}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onDraftSuggestedReply(suggestedReply);
                    }}
                    disabled
                    className="mt-2 flex h-8 w-full items-center justify-center gap-2 rounded-[7px] bg-[#0d1118] text-[12px] font-semibold text-white opacity-70"
                  >
                    {composerStatus.sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    AI sends automatically
                  </button>
                </div>
              ) : null}
            </div>
          </section>
        ) : (
          <div className="flex items-center justify-center pt-16 text-[12px] font-medium text-[#596175]">
            Select a conversation
          </div>
        )}
      </div>
    </aside>
  );
}

// ─── Main Inbox ───────────────────────────────────────────────────────────────

export default function Inbox() {
  const [convs, setConvs] = useState<IGConversation[]>([]);
  const [igUserId, setIgUserId] = useState("");
  const [assistantId, setAssistantId] = useState("");
  const [account, setAccount] = useState<IGAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectingNew, setConnectingNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [composerStatus, setComposerStatus] = useState<ComposerStatus>({
    sending: false,
    error: null,
    notice: null,
  });
  const [composerDraft, setComposerDraft] = useState<ComposerDraft | null>(null);
  const [agents, setAgents] = useState<AgentAccount[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [canManageAgents, setCanManageAgents] = useState(false);
  const [assignmentSavingAgentId, setAssignmentSavingAgentId] = useState("");
  const [assignmentStatus, setAssignmentStatus] = useState("");
  const [takeoverModes, setTakeoverModes] = useState<Record<string, ConversationTakeoverMode>>({});
  const [starredConversationIds, setStarredConversationIds] = useState<string[]>([]);
  const hasLoadedInboxRef = useRef(false);
  const activeIdRef = useRef<string | null>(null);
  const activeTakeoverModeRef = useRef<ConversationTakeoverMode>("ai");

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setOauthError(getInstagramOAuthErrorFromLocation());
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  const fetchConvs = useCallback(async (options?: { showLoader?: boolean }) => {
    const showLoader = options?.showLoader ?? !hasLoadedInboxRef.current;

    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);
    try {
      const res = await fetch("/api/instagram/conversations", { cache: "no-store" });
      const data: APIResponse = await res.json();

      if (data.error && data.conversations.length === 0) {
        setConvs([]);
        setActiveId(null);
        setIgUserId("");
        setAssistantId(data.assistant_id || data.assistantId || data.account?.assistant_id || data.account?.assistantId || "");
        setAccount(data.account ?? null);
        setError(data.error);
      } else {
        const nextConversations = data.conversations || [];
        const requestedConversationId =
          typeof window !== "undefined" && !hasLoadedInboxRef.current
            ? new URLSearchParams(window.location.search).get("conversation")
            : "";
        setConvs((current) =>
          getConversationsSignature(current) === getConversationsSignature(nextConversations) ? current : nextConversations
        );
        if (data.ig_user_id) setIgUserId(data.ig_user_id);
        setAssistantId(data.assistant_id || data.assistantId || data.account?.assistant_id || data.account?.assistantId || "");
        setAccount(data.account ?? null);
        if (requestedConversationId && nextConversations.some((conversation) => conversation.id === requestedConversationId)) {
          setActiveId(requestedConversationId);
        } else if (nextConversations.length > 0 && !activeIdRef.current) {
          setActiveId(nextConversations[0].id);
        }
      }
    } catch {
      setError("Network error — could not reach Instagram API");
    } finally {
      setLoading(false);
      setRefreshing(false);
      hasLoadedInboxRef.current = true;
    }
  }, []);

  const disconnectInstagram = useCallback(async () => {
    setDisconnecting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/instagram/disconnect", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const data: { error?: string } = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Could not disconnect Instagram");
      }

      setConvs([]);
      setActiveId(null);
      setIgUserId("");
      setAssistantId("");
      setAccount(null);
      setError("No Instagram account connected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disconnect Instagram");
    } finally {
      setDisconnecting(false);
      setLoading(false);
    }
  }, []);

  const connectNewInstagram = useCallback(async () => {
    setConnectingNew(true);
    setError(null);
    setOauthError(null);

    window.location.href = "/api/auth/instagram?next=/conversations";
  }, []);

  const loadAgents = useCallback(async () => {
    setLoadingAgents(true);

    try {
      const response = await fetch("/api/agents", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = (await response.json()) as AgentsResponse;

      if (!response.ok || data.error) {
        setCanManageAgents(false);
        setAgents([]);
        return;
      }

      setAgents(data.agents || []);
      setCanManageAgents(true);
    } catch {
      setCanManageAgents(false);
      setAgents([]);
    } finally {
      setLoadingAgents(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadAgents();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadAgents]);

  const toggleAgentAssignment = useCallback(
    async (agent: AgentAccount) => {
      const targetConv = convs.find((conv) => conv.id === activeId);

      if (!targetConv) {
        setAssignmentStatus("Select a conversation first.");
        return;
      }

      const isAssigned = agent.assignedConversationIds.includes(targetConv.id);
      const nextAssignedConversationIds = isAssigned
        ? agent.assignedConversationIds.filter((conversationId) => conversationId !== targetConv.id)
        : [...agent.assignedConversationIds, targetConv.id];

      setAssignmentSavingAgentId(agent.id);
      setAssignmentStatus("");

      try {
        const response = await fetch("/api/agents", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "update",
            id: agent.id,
            name: agent.name,
            email: agent.email,
            allowedPages: agent.allowedPages,
            assignedConversationIds: nextAssignedConversationIds,
            humanEscalation: agent.humanEscalation,
          }),
        });
        const data = (await response.json()) as AgentsResponse;

        if (!response.ok || data.error || !data.agent) {
          throw new Error(data.error || "Could not update assignment.");
        }

        setAgents((current) => current.map((item) => (item.id === data.agent?.id ? data.agent : item)));
        setAssignmentStatus(isAssigned ? "Conversation unassigned." : "Conversation assigned.");
      } catch (err) {
        setAssignmentStatus(err instanceof Error ? err.message : "Could not update assignment.");
      } finally {
        setAssignmentSavingAgentId("");
      }
    },
    [activeId, convs]
  );

  const submitComposerMessage = useCallback(
    async (payload: ComposerSubmitPayload) => {
      const targetConversationId = payload.conversationId || activeId;
      const targetConv = convs.find((conv) => conv.id === targetConversationId);

      if (!targetConv) {
        setComposerStatus({ sending: false, error: "Select a conversation first.", notice: null });
        return;
      }

      if (!payload.text && payload.files.length === 0) {
        setComposerStatus({ sending: false, error: "Type a message or attach an image/video.", notice: null });
        return;
      }

      const localId = `local-${Date.now()}-${globalThis.crypto.randomUUID()}`;
      const localMessage: IGMessage = {
        id: localId,
        text: payload.text,
        attachments: payload.localAttachments,
        from: "me",
        sender_name: account?.name || account?.username || "You",
        sender_id: igUserId,
        time: new Date().toISOString(),
        status: "sending",
      };

      setConvs((current) =>
        current.map((conv) =>
          conv.id === targetConv.id
            ? {
                ...conv,
                updated_time: localMessage.time,
                messages: [localMessage, ...conv.messages],
              }
            : conv
        )
      );

      setComposerStatus({ sending: true, error: null, notice: null });

      try {
        const formData = new FormData();
        formData.append("recipientId", targetConv.participant.id);
        formData.append("conversationId", targetConv.id);
        formData.append("text", payload.text);
        payload.files.forEach((file) => formData.append("files", file));

        const response = await fetch("/api/instagram/send", {
          method: "POST",
          body: formData,
        });
        const data: SendAPIResponse = await response.json();

        if (!response.ok || data.error) {
          throw new Error(data.error || "Could not send this reply.");
        }

        const firstMessageId = data.sent?.[0]?.message_id;

        setConvs((current) =>
          current.map((conv) =>
            conv.id === targetConv.id
              ? {
                  ...conv,
                  messages: conv.messages.map((message) =>
                    message.id === localId
                      ? {
                          ...message,
                          id: firstMessageId || message.id,
                          status: "sent",
                        }
                      : message
                  ),
                }
              : conv
          )
        );

        let postSendNotice = payload.automated ? "AI sent automatically" : "Sent";
        let postSendError: string | null = null;

        if (payload.text && shouldAttemptBookingExport(payload.text)) {
          try {
            const integrations = readBookingIntegrationsFromStorage();

            if (integrations?.syncEnabled && integrations.routes?.some((route) => route.enabled !== false && route.sheetUrl?.trim())) {
              const exportResponse = await fetch("/api/integrations/booking-sheets/export", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  integrations,
                  conversation: {
                    id: targetConv.id,
                    participantName: targetConv.participant.username || targetConv.participant.id,
                    username: targetConv.participant.username,
                  },
                  messages: getConversationAiMessages(targetConv),
                  replyText: payload.text,
                }),
              });
              const exportData: BookingExportResponse = await exportResponse.json().catch(() => ({}));

              if (!exportResponse.ok || exportData.error) {
                postSendError = `Sent, but booking sheet was not updated: ${exportData.error || "Export failed."}`;
              } else if (exportData.exported) {
                postSendNotice = payload.automated ? "AI sent automatically · booking saved to sheet" : "Sent · booking saved to sheet";
              } else if (exportData.reason) {
                postSendNotice = `${payload.automated ? "AI sent automatically" : "Sent"} · ${exportData.reason}`;
              }
            }
          } catch (error) {
            postSendError = `Sent, but booking sheet was not updated: ${
              error instanceof Error ? error.message : "Export failed."
            }`;
          }
        }

        setComposerStatus({ sending: false, error: postSendError, notice: postSendError ? null : postSendNotice });

        if (payload.refreshAfter) {
          await fetchConvs();
        } else {
          window.setTimeout(() => {
            void fetchConvs();
          }, 1500);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not send this reply.";

        setConvs((current) =>
          current.map((conv) =>
            conv.id === targetConv.id
              ? {
                  ...conv,
                  messages: conv.messages.map((item) =>
                    item.id === localId
                      ? {
                          ...item,
                          status: "failed",
                        }
                      : item
                  ),
                }
              : conv
          )
        );
        setComposerStatus({ sending: false, error: message, notice: null });
        throw new Error(message);
      }
    },
    [account?.name, account?.username, activeId, convs, fetchConvs, igUserId]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchConvs({ showLoader: true });
    }, 0);
    const interval = window.setInterval(() => {
      void fetchConvs({ showLoader: false });
    }, 15_000);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [fetchConvs]);

  const activeConv = convs.find(c => c.id === activeId) ?? null;
  const activeTakeoverMode: ConversationTakeoverMode = activeConv ? takeoverModes[activeConv.id] || "ai" : "ai";
  const activeConversationIsStarred = Boolean(activeId && starredConversationIds.includes(activeId));

  useEffect(() => {
    activeTakeoverModeRef.current = activeTakeoverMode;
  }, [activeTakeoverMode]);

  const toggleTakeoverMode = useCallback(() => {
    const targetConvId = activeIdRef.current;

    if (!targetConvId) {
      return;
    }

    const nextMode: ConversationTakeoverMode = activeTakeoverModeRef.current === "ai" ? "human" : "ai";
    activeTakeoverModeRef.current = nextMode;

    setTakeoverModes((current) => ({
      ...current,
      [targetConvId]: nextMode,
    }));
    if (nextMode === "human") {
      setComposerDraft(null);
    }
    setComposerStatus({
      sending: false,
      error: null,
      notice: nextMode === "human" ? "Human takeover active" : "AI takeover active",
    });
  }, []);

  const toggleActiveConversationStar = useCallback(() => {
    const targetConvId = activeIdRef.current;

    if (!targetConvId) {
      return;
    }

    setStarredConversationIds((ids) =>
      ids.includes(targetConvId) ? ids.filter((id) => id !== targetConvId) : [...ids, targetConvId]
    );
  }, []);

  const draftSuggestedReply = useCallback((text: string) => {
    if (activeTakeoverModeRef.current === "human") {
      return;
    }

    setComposerDraft({
      id: Date.now(),
      mode: "reply",
      text,
    });
  }, []);

  const autoSendAiReply = useCallback(
    async (text: string, conversationId: string) => {
      if (activeTakeoverModeRef.current === "human") {
        throw new Error("AI auto-send is paused while human takeover is active.");
      }

      await submitComposerMessage({
        conversationId,
        mode: "reply",
        text,
        files: [],
        localAttachments: [],
        refreshAfter: true,
        automated: true,
      });
    },
    [submitComposerMessage]
  );

  const generateAiReply = useCallback(async () => {
    const targetConv = convs.find((conv) => conv.id === activeId);
    const requestTakeoverMode = activeTakeoverModeRef.current;

    if (!targetConv) {
      throw new Error("Select a conversation first.");
    }

    if (requestTakeoverMode === "human") {
      throw new Error("AI replies are paused while human takeover is active.");
    }

    const response = await fetch("/api/ai/reply", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assistantId,
        participant: targetConv.participant,
        accountName: formatInstagramAccount(account),
        takeoverMode: requestTakeoverMode,
        messages: [...targetConv.messages]
          .reverse()
          .slice(-12)
          .map((message) => ({
            from: message.from,
            text: message.text,
            attachments: message.attachments?.map((attachment) => ({
              type: attachment.type,
              name: attachment.name,
            })),
            time: message.time,
          })),
      }),
    });
    const data = (await response.json()) as AiReplyResponse;

    if (!response.ok || data.error || !data.reply) {
      throw new Error(data.error || "Could not generate AI reply");
    }

    if (activeTakeoverModeRef.current === "human") {
      throw new Error("AI replies are paused while human takeover is active.");
    }

    return data.reply;
  }, [account, activeId, assistantId, convs]);

  return (
    <div className="grid h-full min-h-0 w-full overflow-hidden bg-white text-black grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[332px_minmax(0,608px)_344px] 2xl:grid-cols-[332px_608px_344px]">
      <ConvList
        convs={convs}
        activeId={activeId}
        starredConversationIds={starredConversationIds}
        onSelect={setActiveId}
        loading={loading}
        refreshing={refreshing}
        error={error}
        oauthError={oauthError}
        account={account}
        onRefresh={() => {
          void fetchConvs({ showLoader: false });
        }}
        onDisconnect={disconnectInstagram}
        onConnectNew={connectNewInstagram}
        disconnecting={disconnecting}
        connectingNew={connectingNew}
      />
      <ChatThread
        conv={activeConv}
        igUserId={igUserId}
        composerStatus={composerStatus}
        composerDraft={composerDraft}
        onComposerSubmit={submitComposerMessage}
        onGenerateAiReply={generateAiReply}
        takeoverMode={activeTakeoverMode}
        onToggleTakeoverMode={toggleTakeoverMode}
        isStarred={activeConversationIsStarred}
        onToggleStarred={toggleActiveConversationStar}
      />
      <SummaryPanel
        key={activeConv?.id || "empty-summary"}
        conv={activeConv}
        igUserId={igUserId}
        assistantId={assistantId}
        accountName={formatInstagramAccount(account)}
        composerStatus={composerStatus}
        takeoverMode={activeTakeoverMode}
        onToggleTakeoverMode={toggleTakeoverMode}
        onDraftSuggestedReply={draftSuggestedReply}
        onAutoSendAiReply={autoSendAiReply}
        agents={agents}
        loadingAgents={loadingAgents}
        canManageAgents={canManageAgents}
        assignmentSavingAgentId={assignmentSavingAgentId}
        assignmentStatus={assignmentStatus}
        onToggleAgentAssignment={toggleAgentAssignment}
      />
    </div>
  );
}
