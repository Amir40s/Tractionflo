"use client";

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
  TriangleAlert,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── API Types ────────────────────────────────────────────────────────────────

type IGMessage = {
  id: string;
  text: string;
  from: "me" | "user";
  sender_name: string;
  sender_id: string;
  time: string; // ISO string
};

type IGConversation = {
  id: string;
  participant: { id: string; name: string; username?: string };
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

// ─── Static data ─────────────────────────────────────────────────────────────

type QuickAction = { label: string; icon: LucideIcon };
const quickActions: QuickAction[] = [
  { label: "Book a call", icon: CalendarDays },
  { label: "Send pricing", icon: CircleDollarSign },
  { label: "Share program info", icon: FileText },
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ src, name, size = "h-10 w-10" }: { src: string; name: string; size?: string }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  if (!src) {
    return (
      <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-white text-[11px] font-extrabold`}>
        {initials}
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={name}
      className={`${size} shrink-0 rounded-full bg-cover bg-center`}
      style={{ backgroundImage: `url(${src})` }}
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

  return (
    <section className="hidden h-full min-w-0 flex-col border-r border-[#e7eaf2] bg-white md:flex">
      <header className="flex h-[58px] shrink-0 items-center justify-between gap-3 px-5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-[17px] font-bold text-black">Inbox</h1>
          {isConnected && !loading && (
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
            <RefreshCw size={15} strokeWidth={2.2} className={loading ? "animate-spin" : ""} />
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
          </div>
        ) : convs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 pt-16 text-center">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-tr from-[#ffbd00] via-[#ff2d85] to-[#6d3cff]">
              <div className="h-8 w-8 rounded-[9px] border-[3px] border-white" />
              <div className="absolute h-3.5 w-3.5 rounded-full border-[3px] border-white" />
              <div className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-white" />
            </div>
            <p className="text-[13px] font-bold text-black">No DMs yet</p>
            <p className="text-[11px] font-medium leading-[1.5] text-[#596175]">
              Instagram conversations will appear here as they arrive via your connected account.
            </p>
            <a
              href="/api/auth/instagram?next=/conversations"
              className="mt-1 flex h-8 items-center justify-center rounded-[8px] bg-[#3044ff] px-4 text-[12px] font-semibold text-white"
            >
              Connect Instagram
            </a>
          </div>
        ) : (
          convs.map((conv) => {
            const lastMsg = conv.messages[0];
            const name = conv.participant.name || conv.participant.username || `User ${conv.participant.id.slice(-6)}`;
            const avatarSrc = conv.participant.username
              ? `https://unavatar.io/instagram/${conv.participant.username}`
              : "";

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
                    {lastMsg ? lastMsg.text : "No messages"}
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
  const isMe = msg.from === "me" || msg.sender_id === igUserId;

  return (
    <div className={`flex w-full items-end gap-2.5 ${isMe ? "justify-end sm:pr-4" : "justify-start"}`}>
      {!isMe && (
        <Avatar
          src={msg.sender_name ? `https://unavatar.io/instagram/${msg.sender_name}` : ""}
          name={msg.sender_name || "User"}
          size="h-8 w-8"
        />
      )}
      <div
        className={`max-w-[82%] rounded-[13px] px-3.5 py-2 text-[12px] leading-[1.45] shadow-[0_16px_40px_rgba(20,28,53,0.035)] sm:max-w-[70%] ${
          isMe ? "bg-[#f0efff] text-[#171c33]" : "bg-white text-black"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
        <div className={`mt-1 text-[10px] font-medium text-[#596175] ${isMe ? "text-right" : ""}`}>
          {msgTime(msg.time)}
          {isMe && <span className="ml-1 text-[#246bff]">✓✓</span>}
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

function ChatThread({
  conv,
  igUserId,
}: {
  conv: IGConversation | null;
  igUserId: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const messages = conv ? [...conv.messages].reverse() : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conv?.id, messages.length]);

  const name = conv
    ? conv.participant.name || conv.participant.username || `User ${conv.participant.id.slice(-6)}`
    : "Select a conversation";
  const avatarSrc = conv?.participant.username
    ? `https://unavatar.io/instagram/${conv.participant.username}`
    : "";

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
              <button
                type="button"
                className="ml-4 hidden h-9 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-4 text-[12px] font-semibold text-black sm:flex"
              >
                View profile
                <ExternalLink size={14} strokeWidth={2.4} />
              </button>
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
            <div className="mb-2 flex justify-end gap-2">
              {[Heart, Star, MoreHorizontal].map((Icon, i) => (
                <button key={i} type="button" className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-[#dde3ee] bg-white text-black">
                  <Icon size={15} strokeWidth={2.2} />
                </button>
              ))}
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
            return (
              <button key={a.label} type="button" className="flex h-7 items-center gap-2 rounded-[9px] border border-[#dde3ee] bg-white px-3 text-[11px] font-medium text-[#31394f]">
                <Icon size={14} strokeWidth={2.2} />
                {a.label}
              </button>
            );
          })}
        </div>
        <div className="rounded-[10px] border border-[#dde3ee] bg-white shadow-[0_18px_40px_rgba(20,28,53,0.04)]">
          <div className="flex h-8 items-center gap-4 border-b border-[#edf0f6] px-4 text-[12px] font-bold">
            <span className="text-black">Reply</span>
            <span className="h-4 w-px bg-[#e1e5ee]" />
            <span className="text-[#596175]">Note</span>
          </div>
          <div className="px-4 py-2">
            <p className="text-[12px] font-medium text-[#9aa1b5]">Type your message or let AI reply for you...</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4 text-[#31394f]">
                <Zap size={15} /><Smile size={15} /><Paperclip size={15} /><Bookmark size={15} /><Braces size={15} />
              </div>
              <div className="flex gap-2">
                <button type="button" className="flex h-8 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-[#f3f4ff] px-3.5 text-[12px] font-semibold text-[#3044ff]">
                  <Sparkles size={15} />AI Reply
                </button>
                <button type="button" className="flex h-8 items-center gap-2 rounded-[8px] bg-[#3044ff] px-3.5 text-[12px] font-semibold text-white shadow-[0_16px_30px_rgba(48,68,255,0.24)]">
                  <Send size={15} />Send<ChevronDown size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

// ─── Summary Panel ────────────────────────────────────────────────────────────

function SummaryPanel({ conv, igUserId }: { conv: IGConversation | null; igUserId: string }) {
  const msgs = conv ? [...conv.messages].reverse() : [];
  const lastUserMsg = msgs.find(m => m.sender_id !== igUserId);

  return (
    <aside className="hidden h-full min-w-0 flex-col overflow-hidden border-l border-[#e7eaf2] bg-white xl:flex">
      <header className="flex h-[58px] shrink-0 items-center justify-end gap-4 border-b border-[#e7eaf2] px-5">
        <div className="flex h-8 w-[150px] items-center gap-3 rounded-[9px] border border-[#dde3ee] bg-white px-3 text-[#596175]">
          <Search size={16} />
          <span className="flex-1 text-[12px] font-medium">Search</span>
          <span className="rounded bg-[#eff1f6] px-1.5 py-0.5 text-[11px] font-extrabold text-[#8b92a6]">⌘K</span>
        </div>
        <button type="button" className="relative flex h-8 w-8 items-center justify-center rounded-[9px] border border-[#dde3ee]">
          <Bell size={17} />
          <span className="absolute right-2 top-1.5 h-2.5 w-2.5 rounded-full bg-[#3044ff]" />
        </button>
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
                    {conv.participant.name || conv.participant.username || conv.participant.id}
                  </span>
                </div>
                <div className="flex h-[34px] items-center justify-between gap-3">
                  <span className="text-[12px] font-normal text-black">Messages</span>
                  <span className="rounded-[8px] border border-[#e7eaf2] bg-white px-2.5 py-0.5 text-[12px] text-black">{msgs.length}</span>
                </div>
                <div className="flex h-[34px] items-center justify-between gap-3">
                  <span className="text-[12px] font-normal text-black">Last active</span>
                  <span className="rounded-[8px] border border-[#e7eaf2] bg-white px-2.5 py-0.5 text-[12px] text-black">
                    {conv.updated_time ? relativeTime(conv.updated_time) : "—"}
                  </span>
                </div>
                <div className="flex h-[34px] items-center justify-between gap-3">
                  <span className="text-[12px] font-normal text-black">Channel</span>
                  <span className="flex items-center gap-1.5 rounded-[8px] border border-[#e7eaf2] bg-white px-2.5 py-0.5 text-[12px] text-black">
                    <IGBadge />Instagram
                  </span>
                </div>
              </div>

              {lastUserMsg && (
                <div className="mt-3">
                  <h3 className="text-[13px] font-bold text-black">Last message from user</h3>
                  <div className="mt-2 rounded-[8px] bg-[#f0efff] p-2.5 text-[12px] leading-[1.35] text-[#252c41]">
                    {lastUserMsg.text}
                  </div>
                </div>
              )}

              <div className="mt-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-[13px] font-bold text-black">Suggested reply</h3>
                  <button type="button" className="text-[11px] font-bold text-[#3044ff]">Customize</button>
                </div>
                <div className="rounded-[8px] border border-[#dde3ee] bg-white p-2.5 text-[12px] leading-[1.35] text-[#252c41]">
                  Thanks for reaching out! How can I help you today? 😊
                </div>
                <button type="button" className="mt-2 flex h-8 w-full items-center justify-center gap-2 rounded-[7px] bg-[#0d1118] text-[12px] font-semibold text-white">
                  <Send size={15} />Send this reply
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
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectingNew, setConnectingNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const fetchConvs = useCallback(async () => {
    setLoading(true);
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
        if (data.conversations.length > 0 && !activeId) {
          setActiveId(data.conversations[0].id);
        }
      }
    } catch {
      setError("Network error — could not reach Instagram API");
    } finally {
      setLoading(false);
    }
  }, [activeId]);

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

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchConvs();
    }, 0);
    const interval = setInterval(fetchConvs, 15_000);

    return () => {
      window.clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [fetchConvs]);

  const activeConv = convs.find(c => c.id === activeId) ?? null;

  return (
    <div className="grid h-full min-h-0 w-full overflow-hidden bg-white text-black grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[332px_minmax(0,608px)_344px] 2xl:grid-cols-[332px_608px_344px]">
      <ConvList
        convs={convs}
        activeId={activeId}
        onSelect={setActiveId}
        loading={loading}
        error={error}
        account={account}
        onRefresh={fetchConvs}
        onDisconnect={disconnectInstagram}
        onConnectNew={connectNewInstagram}
        disconnecting={disconnecting}
        connectingNew={connectingNew}
      />
      <ChatThread conv={activeConv} igUserId={igUserId} />
      <SummaryPanel conv={activeConv} igUserId={igUserId} />
    </div>
  );
}
