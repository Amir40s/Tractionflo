"use client";

import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Bell,
  Bookmark,
  Braces,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  ExternalLink,
  FileText,
  Heart,
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
  X,
  Zap,
} from "lucide-react";
import type { EmojiClickData } from "emoji-picker-react";
import { EmojiStyle, SkinTonePickerLocation, Theme } from "emoji-picker-react";
import type { LucideIcon } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AiLeadInsight, AiWorkflowRunResult } from "@/lib/ai-integration";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] w-[320px] items-center justify-center bg-white text-[12px] font-semibold text-[#596175]">
      Loading emojis...
    </div>
  ),
});

// ─── API Types ────────────────────────────────────────────────────────────────

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
};

type APIResponse = {
  conversations: IGConversation[];
  ig_user_id?: string;
  account?: IGAccount;
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
};

// ─── Static data ─────────────────────────────────────────────────────────────

type QuickAction = { label: string; icon: LucideIcon };
const quickActions: QuickAction[] = [
  { label: "Book a call", icon: CalendarDays },
  { label: "Send pricing", icon: CircleDollarSign },
  { label: "Share program info", icon: FileText },
];

type ComposerMode = "reply" | "note";

type ComposerAttachment = {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl: string;
};

type ComposerSubmitPayload = {
  mode: ComposerMode;
  text: string;
  files: File[];
  localAttachments: NonNullable<IGMessage["attachments"]>;
  refreshAfter?: boolean;
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

const savedSnippets = [
  "Thanks for reaching out! How can I help you today? 😊",
  "Absolutely, I can send the details here.",
  "Here is the pricing info. Which option are you interested in?",
  "Can you send a little more detail so I can point you the right way?",
];
const variableOptions = [
  { label: "First name", token: "{first_name}" },
  { label: "Instagram handle", token: "{instagram_handle}" },
  { label: "Program link", token: "{program_link}" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
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
  if (msg.text) return msg.text;

  const firstAttachment = msg.attachments?.[0];
  if (firstAttachment?.type === "image") return "Photo";
  if (firstAttachment?.type === "video") return "Video";
  if (firstAttachment) return firstAttachment.name || "Attachment";

  return "Message";
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

function getSearchableMessageText(message: IGMessage) {
  return [
    message.text,
    message.sender_name,
    message.sender_id,
    getMessagePreview(message),
  ].filter(Boolean).join(" ").toLowerCase();
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
  onSelect,
  loading,
  refreshing,
  error,
  account,
  onRefresh,
  onDisconnect,
  onConnectNew,
  disconnecting,
  connectingNew,
}: {
  convs: IGConversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  account: IGAccount | null;
  onRefresh: () => void;
  onDisconnect: () => void;
  onConnectNew: () => void;
  disconnecting: boolean;
  connectingNew: boolean;
}) {
  const isConnected = Boolean(account || convs.length > 0 || (error && error !== "No Instagram account connected"));
  const needsConnection = error === "No Instagram account connected";
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
            <p className="text-[13px] font-bold text-black">Instagram disconnected</p>
            <p className="text-[11px] font-medium leading-[1.5] text-[#596175]">
              Connect an Instagram Business account to load conversations.
            </p>
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
            const lastMsg = conv.messages[0];
            const name = conv.participant.username || conv.participant.name || `User ${conv.participant.id.slice(-6)}`;
            const avatarSrc = conv.participant.profile_pic || "";

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
                  </span>
                  <span className="mt-1 block line-clamp-1 text-[12px] font-medium leading-[1.35] text-[#4f566c]">
                    {getMessagePreview(lastMsg)}
                  </span>
                </span>
                <span className="flex h-full shrink-0 flex-col items-end justify-between gap-5">
                  <span className="text-[11px] font-medium text-[#596175]">
                    {conv.updated_time ? relativeTime(conv.updated_time) : ""}
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
  const isNote = msg.from === "note";
  const isMe = msg.from === "me" || msg.sender_id === igUserId;
  const hasText = Boolean(msg.text);
  const attachments = msg.attachments || [];

  if (isNote) {
    return (
      <div className="flex w-full justify-center px-4">
        <div className="max-w-[84%] rounded-[10px] border border-[#ffe3a3] bg-[#fff9e8] px-3 py-2 text-center shadow-[0_14px_30px_rgba(78,58,10,0.055)]">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#9b6a00]">Internal note</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-[12px] font-medium leading-[1.4] text-[#342b13]">
            {msg.text}
          </p>
          <p className="mt-1 text-[10px] font-medium text-[#8a7a58]">{msgTime(msg.time)}</p>
        </div>
      </div>
    );
  }

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
        {attachments.length > 0 && (
          <div className="mb-2 space-y-2">
            {attachments.map((attachment, index) => {
              if (attachment.type === "image") {
                return (
                  <a
                    key={`${attachment.url}-${index}`}
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
                    key={`${attachment.url}-${index}`}
                    src={attachment.url}
                    className="max-h-[320px] w-full min-w-[180px] rounded-[10px] border border-[#edf0f6] bg-black"
                    controls
                  />
                );
              }

              return (
                <a
                  key={`${attachment.url}-${index}`}
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
        <span className="mb-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3044ff] text-white">
          <span className="relative text-[15px] font-extrabold leading-none">
            T<span className="absolute -right-1 top-0 h-1.5 w-1.5 rounded-full bg-white" />
          </span>
        </span>
      )}
    </div>
  );
}

function ChatComposer({
  conv,
  initialDraft,
  status,
  onSubmit,
  onGenerateAiReply,
}: {
  conv: IGConversation | null;
  initialDraft: ComposerDraft | null;
  status: ComposerStatus;
  onSubmit: (payload: ComposerSubmitPayload) => Promise<void>;
  onGenerateAiReply: () => Promise<string>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ComposerMode>(initialDraft?.mode || "reply");
  const [text, setText] = useState(initialDraft?.text || "");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [snippetsOpen, setSnippetsOpen] = useState(false);
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [sendMenuOpen, setSendMenuOpen] = useState(false);
  const [aiReplying, setAiReplying] = useState(false);

  const isReply = mode === "reply";
  const canAttach = Boolean(conv && isReply && !status.sending);
  const canSubmit = Boolean(
    conv &&
      !status.sending &&
      (text.trim() || (isReply && attachments.length > 0))
  );

  const closeMenus = () => {
    setEmojiOpen(false);
    setSnippetsOpen(false);
    setVariablesOpen(false);
    setSendMenuOpen(false);
  };

  const insertText = (value: string) => {
    setText((current) => `${current}${current && !current.endsWith(" ") ? " " : ""}${value}`);
  };

  const clearAttachments = () => {
    attachments.forEach((attachment) => URL.revokeObjectURL(attachment.previewUrl));
    setAttachments([]);
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;

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
    if (!conv || aiReplying) return;

    setMode("reply");
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

    const finalText = isReply ? resolveComposerVariables(text.trim(), conv) : text.trim();
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
        mode,
        text: finalText,
        files: isReply ? attachments.map((attachment) => attachment.file) : [],
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
        {(["reply", "note"] as ComposerMode[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setMode(option);
              closeMenus();
            }}
            className={`h-7 rounded-[7px] px-3 capitalize transition ${
              mode === option ? "bg-[#f0efff] text-black" : "text-[#596175] hover:bg-[#f6f7fb]"
            }`}
          >
            {option}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-[#e1e5ee]" />
        {status.notice && <span className="ml-auto text-[10px] font-extrabold text-[#0a9b3f]">{status.notice}</span>}
        {status.error && <span className="ml-auto max-w-[260px] truncate text-[10px] font-extrabold text-[#df405b]">{status.error}</span>}
      </div>

      <div className="px-4 py-2">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              void submitComposer(false);
            }
          }}
          disabled={!conv || status.sending}
          rows={2}
          placeholder={isReply ? "Type your message or let AI reply for you..." : "Write a private note for your team..."}
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
                  onClick={() => removeAttachment(attachment.id)}
                  className="rounded-full p-0.5 text-[#596175] hover:bg-[#e8ebf3] hover:text-black"
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
              title="Quick response"
              aria-label="Quick response"
              disabled={!conv || status.sending}
              onClick={() => insertText("Thanks for reaching out! I can help with that.")}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] transition hover:bg-[#f3f4f8] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Zap size={16} />
            </button>
            <button
              type="button"
              title="Emoji"
              aria-label="Emoji"
              disabled={!conv || status.sending}
              onClick={() => {
                setEmojiOpen((open) => !open);
                setSnippetsOpen(false);
                setVariablesOpen(false);
              }}
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
              disabled={!conv || status.sending}
              onClick={() => {
                setSnippetsOpen((open) => !open);
                setEmojiOpen(false);
                setVariablesOpen(false);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] transition hover:bg-[#f3f4f8] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Bookmark size={16} />
            </button>
            <button
              type="button"
              title="Variables"
              aria-label="Variables"
              disabled={!conv || status.sending}
              onClick={() => {
                setVariablesOpen((open) => !open);
                setEmojiOpen(false);
                setSnippetsOpen(false);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] transition hover:bg-[#f3f4f8] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Braces size={16} />
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
            <button
              type="button"
              disabled={!conv || status.sending || aiReplying}
              onClick={() => {
                void generateAiReply();
              }}
              className="flex h-8 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-[#f3f4ff] px-3.5 text-[12px] font-semibold text-[#3044ff] transition hover:bg-[#eceeff] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {aiReplying ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {aiReplying ? "Thinking" : "AI Reply"}
            </button>
            <div className="relative flex">
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => void submitComposer(false)}
                className="flex h-8 items-center gap-2 rounded-l-[8px] bg-[#3044ff] px-3.5 text-[12px] font-semibold text-white shadow-[0_16px_30px_rgba(48,68,255,0.24)] transition hover:bg-[#2638f0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status.sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                {mode === "note" ? "Save" : "Send"}
              </button>
              <button
                type="button"
                aria-label="Send options"
                disabled={!canSubmit}
                onClick={() => setSendMenuOpen((open) => !open)}
                className="flex h-8 w-8 items-center justify-center rounded-r-[8px] bg-[#3044ff] text-white transition hover:bg-[#2638f0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronDown size={14} />
              </button>
              {sendMenuOpen && (
                <div className="absolute bottom-10 right-0 z-20 w-44 overflow-hidden rounded-[9px] border border-[#dde3ee] bg-white py-1 text-[11px] font-semibold text-[#252c41] shadow-[0_20px_55px_rgba(20,28,53,0.14)]">
                  <button type="button" onClick={() => void submitComposer(false)} className="block w-full px-3 py-2 text-left hover:bg-[#f6f7fb]">
                    {mode === "note" ? "Save note" : "Send now"}
                  </button>
                  {mode === "reply" && (
                    <button type="button" onClick={() => void submitComposer(true)} className="block w-full px-3 py-2 text-left hover:bg-[#f6f7fb]">
                      Send and refresh
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {emojiOpen && (
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

      {snippetsOpen && (
        <div className="absolute bottom-[62px] left-24 z-20 w-72 overflow-hidden rounded-[10px] border border-[#dde3ee] bg-white py-1 shadow-[0_20px_55px_rgba(20,28,53,0.14)]">
          {savedSnippets.map((snippet) => (
            <button
              key={snippet}
              type="button"
              onClick={() => {
                setText(snippet);
                closeMenus();
              }}
              className="block w-full px-3 py-2 text-left text-[11px] font-semibold leading-[1.35] text-[#252c41] hover:bg-[#f6f7fb]"
            >
              {snippet}
            </button>
          ))}
        </div>
      )}

      {variablesOpen && (
        <div className="absolute bottom-[62px] left-40 z-20 w-48 overflow-hidden rounded-[10px] border border-[#dde3ee] bg-white py-1 shadow-[0_20px_55px_rgba(20,28,53,0.14)]">
          {variableOptions.map((variable) => (
            <button
              key={variable.token}
              type="button"
              onClick={() => insertText(variable.token)}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[11px] font-semibold text-[#252c41] hover:bg-[#f6f7fb]"
            >
              <span>{variable.label}</span>
              <span className="text-[#596175]">{variable.token}</span>
            </button>
          ))}
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
}: {
  conv: IGConversation | null;
  igUserId: string;
  composerStatus: ComposerStatus;
  composerDraft: ComposerDraft | null;
  onComposerSubmit: (payload: ComposerSubmitPayload) => Promise<void>;
  onGenerateAiReply: () => Promise<string>;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const messages = conv ? [...conv.messages].reverse() : [];
  const [lovedConversationIds, setLovedConversationIds] = useState<string[]>([]);
  const [starredConversationIds, setStarredConversationIds] = useState<string[]>([]);
  const [actionsOpen, setActionsOpen] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conv?.id, messages.length]);

  const name = conv ? getParticipantName(conv) : "Select a conversation";
  const avatarSrc = conv?.participant.profile_pic || "";
  const profileUrl = getInstagramProfileUrl(conv);
  const isLoved = Boolean(conv && lovedConversationIds.includes(conv.id));
  const isStarred = Boolean(conv && starredConversationIds.includes(conv.id));

  const toggleConversationId = (id: string, setter: Dispatch<SetStateAction<string[]>>) => {
    setter((ids) => (ids.includes(id) ? ids.filter((existingId) => existingId !== id) : [...ids, id]));
  };

  return (
    <main className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white">
      <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-[#e7eaf2] px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3.5">
          <button type="button" aria-label="Back" className="text-[#1f2638]">
            <ArrowLeft size={18} strokeWidth={2.3} />
          </button>
          {conv ? (
            <>
              <Avatar src={avatarSrc} name={name} size="h-10 w-10" />
              <div>
                <h2 className="text-[14px] font-bold leading-tight text-black">{name}</h2>
                <div className="flex items-center gap-1.5">
                  <IGBadge />
                  <p className="text-[11px] font-medium text-[#596175]">Instagram</p>
                </div>
              </div>
              {profileUrl && (
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-4 hidden h-9 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-4 text-[12px] font-semibold text-black transition hover:bg-[#f6f7fb] sm:flex"
                >
                  View profile
                  <ExternalLink size={14} strokeWidth={2.4} />
                </a>
              )}
            </>
          ) : (
            <h2 className="text-[14px] font-bold text-black">Select a conversation</h2>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#dde3ee] xl:hidden">
            <Search size={17} />
          </button>
          <button type="button" className="relative flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#dde3ee] xl:hidden">
            <Bell size={17} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#3044ff]" />
          </button>
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
          <>
            <div className="relative mb-2 flex justify-end gap-2">
              <button
                type="button"
                aria-pressed={isLoved}
                onClick={() => conv && toggleConversationId(conv.id, setLovedConversationIds)}
                className={`flex h-7 w-7 items-center justify-center rounded-[8px] border transition ${
                  isLoved ? "border-[#ffd1dc] bg-[#fff3f7] text-[#e13563]" : "border-[#dde3ee] bg-white text-black hover:bg-[#f6f7fb]"
                }`}
              >
                <Heart size={15} strokeWidth={2.2} fill={isLoved ? "currentColor" : "none"} />
              </button>
              <button
                type="button"
                aria-pressed={isStarred}
                onClick={() => conv && toggleConversationId(conv.id, setStarredConversationIds)}
                className={`flex h-7 w-7 items-center justify-center rounded-[8px] border transition ${
                  isStarred ? "border-[#ffe2a8] bg-[#fff8e8] text-[#f59e0b]" : "border-[#dde3ee] bg-white text-black hover:bg-[#f6f7fb]"
                }`}
              >
                <Star size={15} strokeWidth={2.2} fill={isStarred ? "currentColor" : "none"} />
              </button>
              <button
                type="button"
                aria-label="More conversation actions"
                onClick={() => setActionsOpen((open) => !open)}
                className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-[#dde3ee] bg-white text-black transition hover:bg-[#f6f7fb]"
              >
                <MoreHorizontal size={15} strokeWidth={2.2} />
              </button>
              {actionsOpen && (
                <div className="absolute right-0 top-8 z-20 w-44 overflow-hidden rounded-[9px] border border-[#dde3ee] bg-white py-1 text-[11px] font-semibold text-[#252c41] shadow-[0_20px_55px_rgba(20,28,53,0.14)]">
                  <button
                    type="button"
                    onClick={() => {
                      if (profileUrl) void navigator.clipboard.writeText(profileUrl);
                      setActionsOpen(false);
                    }}
                    className="block w-full px-3 py-2 text-left hover:bg-[#f6f7fb]"
                  >
                    Copy profile link
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLovedConversationIds((ids) => (conv && ids.includes(conv.id) ? ids.filter((id) => id !== conv.id) : ids));
                      setStarredConversationIds((ids) => (conv && ids.includes(conv.id) ? ids.filter((id) => id !== conv.id) : ids));
                      setActionsOpen(false);
                    }}
                    className="block w-full px-3 py-2 text-left hover:bg-[#f6f7fb]"
                  >
                    Clear flags
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {messages.map((msg) => (
                <ChatBubble key={msg.id} msg={msg} igUserId={igUserId} />
              ))}
              <div ref={bottomRef} />
            </div>
          </>
        )}
      </div>

      <footer className="shrink-0 px-4 pb-3 sm:px-6">
        <div className="mb-2 flex flex-nowrap items-center gap-2 overflow-x-auto">
          {quickActions.map((a) => {
            const Icon = a.icon;
            const actionText =
              a.label === "Book a call"
                ? "Would you like to book a quick call? I can send over a time."
                : a.label === "Send pricing"
                  ? "Here is the pricing info. Which option are you interested in?"
                  : "Here is the program info. Tell me what you want to know first.";
            return (
              <button
                key={a.label}
                type="button"
                onClick={() => {
                  void onComposerSubmit({
                    mode: "reply",
                    text: actionText,
                    files: [],
                    localAttachments: [],
                    refreshAfter: false,
                  }).catch(() => undefined);
                }}
                disabled={!conv || composerStatus.sending}
                className="flex h-7 items-center gap-2 rounded-[9px] border border-[#dde3ee] bg-white px-3 text-[11px] font-medium text-[#31394f] transition hover:bg-[#f6f7fb] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon size={14} strokeWidth={2.2} />
                {a.label}
              </button>
            );
          })}
        </div>
        <ChatComposer
          key={`${conv?.id || "empty"}-${composerDraft?.id || 0}`}
          conv={conv}
          initialDraft={composerDraft}
          status={composerStatus}
          onSubmit={onComposerSubmit}
          onGenerateAiReply={onGenerateAiReply}
        />
      </footer>
    </main>
  );
}

// ─── Summary Panel ────────────────────────────────────────────────────────────

function SummaryPanel({
  conv,
  igUserId,
  accountName,
  composerStatus,
  refreshing,
  onDraftSuggestedReply,
  onSendSuggestedReply,
}: {
  conv: IGConversation | null;
  igUserId: string;
  accountName: string;
  composerStatus: ComposerStatus;
  refreshing: boolean;
  onDraftSuggestedReply: (text: string) => void;
  onSendSuggestedReply: (text: string) => Promise<void>;
}) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [aiWorkflow, setAiWorkflow] = useState<AiWorkflowResponse | null>(null);
  const [aiStatus, setAiStatus] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [, setClockTick] = useState(0);
  const lastAiKeyRef = useRef("");
  const msgs = conv ? [...conv.messages].filter((m) => m.from !== "note").reverse() : [];
  const lastUserMsg = conv?.messages.find(m => m.from === "user" && m.sender_id !== igUserId);
  const lastUserMsgPreview = getMessagePreview(lastUserMsg);
  const suggestedReply = aiWorkflow?.reply || getSuggestedReply(conv);
  const leadInsight = aiWorkflow?.lead;
  const starterDraft = aiWorkflow?.starter || suggestedReply;
  const ctaDraft = aiWorkflow?.cta || leadInsight?.cta || suggestedReply;
  const aiRefreshKey = conv ? `${conv.id}-${conv.updated_time}-${conv.messages.length}` : "empty";
  const trimmedSearch = searchQuery.trim().toLowerCase();
  const searchMatches = trimmedSearch
    ? msgs.filter((message) => getSearchableMessageText(message).includes(trimmedSearch))
    : [];
  const recentUserMessages = msgs
    .filter((message) => message.from === "user")
    .slice(-4)
    .reverse();
  const lastMessage = msgs[msgs.length - 1];
  const liveNotice = lastUserMsg
    ? `${getMessagePreview(lastUserMsg)} • ${relativeTime(lastUserMsg.time)}`
    : "No recent user messages";

  const runAiWorkflow = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!conv) {
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
          body: JSON.stringify({
            participant: conv.participant,
            accountName,
            messages: getConversationAiMessages(conv),
          }),
        });
        const data = (await response.json()) as AiWorkflowResponse;

        if (!response.ok || data.error) {
          throw new Error(data.error || "Could not run AI workflow");
        }

        setAiWorkflow(data);
        setAiStatus("AI is synced with this conversation.");
      } catch (error) {
        setAiWorkflow(null);
        setAiStatus(error instanceof Error ? error.message : "Could not run AI workflow");
      } finally {
        setAiLoading(false);
      }
    },
    [accountName, conv]
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClockTick((tick) => tick + 1);
    }, 30_000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!conv) {
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
    const timeout = window.setTimeout(() => {
      void runAiWorkflow({ silent: true });
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [aiRefreshKey, conv, runAiWorkflow]);

  return (
    <aside className="hidden h-full min-w-0 flex-col overflow-hidden border-l border-[#e7eaf2] bg-white xl:flex">
      <header className="flex h-[58px] shrink-0 items-center justify-end gap-4 border-b border-[#e7eaf2] px-5">
        <label className="flex h-8 w-[180px] items-center gap-3 rounded-[9px] border border-[#dde3ee] bg-white px-3 text-[#596175] focus-within:border-[#3044ff] focus-within:ring-2 focus-within:ring-[#3044ff]/10">
          <Search size={16} />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search"
            className="min-w-0 flex-1 bg-transparent text-[12px] font-medium text-[#252c41] outline-none placeholder:text-[#596175]"
          />
          <span className="rounded bg-[#eff1f6] px-1.5 py-0.5 text-[11px] font-extrabold text-[#8b92a6]">⌘K</span>
        </label>
        <div className="relative">
          <button
            type="button"
            aria-label="Conversation notifications"
            onClick={() => setNotificationsOpen((open) => !open)}
            className="relative flex h-8 w-8 items-center justify-center rounded-[9px] border border-[#dde3ee] bg-white transition hover:bg-[#f6f7fb]"
          >
            <Bell size={17} />
            {(recentUserMessages.length > 0 || refreshing) && (
              <span className="absolute right-2 top-1.5 h-2.5 w-2.5 rounded-full bg-[#3044ff]" />
            )}
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 top-10 z-30 w-72 rounded-[10px] border border-[#dde3ee] bg-white p-3 shadow-[0_20px_55px_rgba(20,28,53,0.14)]">
              <div className="flex items-center justify-between">
                <h3 className="text-[12px] font-extrabold text-black">Live activity</h3>
                <span className="text-[10px] font-bold text-[#596175]">{refreshing ? "Syncing" : "Live"}</span>
              </div>
              <p className="mt-2 rounded-[8px] bg-[#f6f7ff] p-2 text-[11px] font-medium leading-[1.35] text-[#3c4358]">
                {liveNotice}
              </p>
              <div className="mt-2 space-y-1">
                {recentUserMessages.length > 0 ? (
                  recentUserMessages.map((message) => (
                    <div key={message.id} className="rounded-[8px] px-2 py-1.5 text-[11px] hover:bg-[#f6f7fb]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-bold text-black">{message.sender_name || getParticipantName(conv)}</span>
                        <span className="shrink-0 text-[#596175]">{relativeTime(message.time)}</span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[#596175]">{getMessagePreview(message)}</p>
                    </div>
                  ))
                ) : (
                  <p className="py-2 text-[11px] font-medium text-[#596175]">No user activity yet.</p>
                )}
              </div>
            </div>
          )}
        </div>
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
              </div>

              <div className="mt-3 rounded-[10px] border border-[#edf0f6] bg-[#fbfbff] p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex min-w-0 items-center gap-1.5 text-[12px] font-extrabold text-black">
                    <Target size={14} className="text-[#3044ff]" strokeWidth={2.35} />
                    AI qualification
                  </h3>
                  <button
                    type="button"
                    onClick={() => void runAiWorkflow()}
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

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onDraftSuggestedReply(starterDraft)}
                    disabled={!starterDraft || aiLoading}
                    className="h-8 rounded-[8px] border border-[#dde3ee] bg-white px-2 text-[11px] font-extrabold text-black disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    Draft opener
                  </button>
                  <button
                    type="button"
                    onClick={() => onDraftSuggestedReply(ctaDraft)}
                    disabled={!ctaDraft || aiLoading}
                    className="h-8 rounded-[8px] bg-[#3044ff] px-2 text-[11px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    Draft CTA
                  </button>
                </div>
              </div>

              {trimmedSearch && (
                <div className="mt-3 rounded-[10px] border border-[#dde3ee] bg-white p-2.5">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-[12px] font-extrabold text-black">Search results</h3>
                    <span className="text-[10px] font-bold text-[#596175]">{searchMatches.length}</span>
                  </div>
                  <div className="max-h-40 space-y-1 overflow-y-auto">
                    {searchMatches.length > 0 ? (
                      searchMatches.slice(0, 6).map((message) => (
                        <div key={message.id} className="rounded-[8px] bg-[#f8f9fd] px-2 py-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-[11px] font-bold text-black">
                              {message.from === "me" ? "You" : message.sender_name || getParticipantName(conv)}
                            </span>
                            <span className="shrink-0 text-[10px] font-medium text-[#596175]">{relativeTime(message.time)}</span>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-[11px] leading-[1.35] text-[#596175]">
                            {getMessagePreview(message)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="py-3 text-center text-[11px] font-medium text-[#596175]">No matching messages</p>
                    )}
                  </div>
                </div>
              )}

              {lastUserMsg && (
                <div className="mt-3">
                  <h3 className="text-[13px] font-bold text-black">Last message from user</h3>
                  <div className="mt-2 rounded-[8px] bg-[#f0efff] p-2.5 text-[12px] leading-[1.35] text-[#252c41]">
                    {lastUserMsgPreview}
                  </div>
                </div>
              )}

              <div className="mt-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-[13px] font-bold text-black">{aiWorkflow?.reply ? "AI suggested reply" : "Suggested reply"}</h3>
                  <button
                    type="button"
                    onClick={() => onDraftSuggestedReply(suggestedReply)}
                    disabled={aiLoading}
                    className="text-[11px] font-bold text-[#3044ff] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {aiLoading ? "Thinking" : "Customize"}
                  </button>
                </div>
                <div className="rounded-[8px] border border-[#dde3ee] bg-white p-2.5 text-[12px] leading-[1.35] text-[#252c41]">
                  {suggestedReply}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void onSendSuggestedReply(suggestedReply).catch(() => undefined);
                  }}
                  disabled={composerStatus.sending}
                  className="mt-2 flex h-8 w-full items-center justify-center gap-2 rounded-[7px] bg-[#0d1118] text-[12px] font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {composerStatus.sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  Send this reply
                </button>
              </div>
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
  const [account, setAccount] = useState<IGAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectingNew, setConnectingNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [composerStatus, setComposerStatus] = useState<ComposerStatus>({
    sending: false,
    error: null,
    notice: null,
  });
  const [composerDraft, setComposerDraft] = useState<ComposerDraft | null>(null);
  const hasLoadedInboxRef = useRef(false);
  const activeIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

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
        setAccount(data.account ?? null);
        setError(data.error);
      } else {
        setConvs(data.conversations);
        if (data.ig_user_id) setIgUserId(data.ig_user_id);
        setAccount(data.account ?? null);
        if (data.conversations.length > 0 && !activeIdRef.current) {
          setActiveId(data.conversations[0].id);
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

    try {
      const res = await fetch("/api/auth/instagram/disconnect", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const data: { error?: string } = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Could not prepare Instagram reconnect");
      }

      window.location.href = "/api/auth/instagram?next=/conversations";
    } catch (err) {
      setConnectingNew(false);
      setError(err instanceof Error ? err.message : "Could not prepare Instagram reconnect");
    }
  }, []);

  const submitComposerMessage = useCallback(
    async (payload: ComposerSubmitPayload) => {
      const targetConv = convs.find((conv) => conv.id === activeId);

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
        from: payload.mode === "note" ? "note" : "me",
        sender_name: account?.name || account?.username || "You",
        sender_id: payload.mode === "note" ? "internal-note" : igUserId,
        time: new Date().toISOString(),
        status: payload.mode === "note" ? "sent" : "sending",
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

      if (payload.mode === "note") {
        setComposerStatus({ sending: false, error: null, notice: "Note saved" });
        return;
      }

      setComposerStatus({ sending: true, error: null, notice: null });

      try {
        const formData = new FormData();
        formData.append("recipientId", targetConv.participant.id);
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

        setComposerStatus({ sending: false, error: null, notice: "Sent" });

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

  const draftSuggestedReply = useCallback((text: string) => {
    setComposerDraft({
      id: Date.now(),
      mode: "reply",
      text,
    });
  }, []);

  const sendSuggestedReply = useCallback(
    async (text: string) => {
      await submitComposerMessage({
        mode: "reply",
        text,
        files: [],
        localAttachments: [],
        refreshAfter: false,
      });
    },
    [submitComposerMessage]
  );

  const generateAiReply = useCallback(async () => {
    const targetConv = convs.find((conv) => conv.id === activeId);

    if (!targetConv) {
      throw new Error("Select a conversation first.");
    }

    const response = await fetch("/api/ai/reply", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        participant: targetConv.participant,
        accountName: formatInstagramAccount(account),
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

    return data.reply;
  }, [account, activeId, convs]);

  return (
    <div className="grid h-full min-h-0 w-full overflow-hidden bg-white text-black grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[332px_minmax(0,608px)_344px] 2xl:grid-cols-[332px_608px_344px]">
      <ConvList
        convs={convs}
        activeId={activeId}
        onSelect={setActiveId}
        loading={loading}
        refreshing={refreshing}
        error={error}
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
      />
      <SummaryPanel
        key={activeConv?.id || "empty-summary"}
        conv={activeConv}
        igUserId={igUserId}
        accountName={formatInstagramAccount(account)}
        composerStatus={composerStatus}
        refreshing={refreshing}
        onDraftSuggestedReply={draftSuggestedReply}
        onSendSuggestedReply={sendSuggestedReply}
      />
    </div>
  );
}
