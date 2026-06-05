"use client";

import {
  ArrowLeft,
  Bell,
  Bookmark,
  Braces,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Edit3,
  ExternalLink,
  FileText,
  Heart,
  MoreHorizontal,
  Paperclip,
  Search,
  Send,
  Smile,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Conversation = {
  name: string;
  message: string;
  time: string;
  avatar: string;
  channel: "instagram" | "whatsapp";
  active?: boolean;
  verified?: boolean;
};

type Message = {
  from: "user" | "ai";
  text: string;
  time: string;
};

type SummaryRow = {
  label: string;
  value: string;
  tone?: string;
};

type QuickAction = {
  label: string;
  icon: LucideIcon;
};

const filters = [
  ["All", "128"],
  ["DMs", "96"],
  ["Comments", "18"],
  ["Mentions", "7"],
  ["Stories", "4"],
  ["Followers", "3"],
] as const;

const conversations: Conversation[] = [
  {
    name: "Jessica Parker",
    message: "Hi! I loved your course on content strategy. Do you offer 1:1 coaching?",
    time: "2m",
    avatar: "https://i.pravatar.cc/96?img=47",
    channel: "instagram",
    active: true,
  },
  {
    name: "GlowSkin",
    message: "We'd love to discuss a partnership opportunity with you!",
    time: "1h",
    avatar: "",
    channel: "instagram",
    verified: true,
  },
  {
    name: "Michael Chen",
    message: "What's included in your coaching program?",
    time: "3h",
    avatar: "https://i.pravatar.cc/96?img=12",
    channel: "instagram",
  },
  {
    name: "Sofia Martinez",
    message: "Thank you so much! 🙌",
    time: "5h",
    avatar: "https://i.pravatar.cc/96?img=32",
    channel: "instagram",
  },
  {
    name: "Ryan Brown",
    message: "Do you have any upcoming webinars?",
    time: "8h",
    avatar: "https://i.pravatar.cc/96?img=52",
    channel: "instagram",
  },
  {
    name: "Ava Thompson",
    message: "Just purchased your course! Excited to start 🎉",
    time: "1d",
    avatar: "https://i.pravatar.cc/96?img=48",
    channel: "instagram",
  },
  {
    name: "Daniel Lewis",
    message: "Can I get a refund? I didn't realize it was 🦋",
    time: "1d",
    avatar: "https://i.pravatar.cc/96?img=68",
    channel: "whatsapp",
  },
];

const messages: Message[] = [
  {
    from: "user",
    text: "Hi! I loved your course on content strategy.\nDo you offer 1:1 coaching?",
    time: "10:36 AM",
  },
  {
    from: "ai",
    text: "Yes! I offer 1:1 coaching.\nWould you like me to share more details\nabout the program?",
    time: "10:37 AM",
  },
  {
    from: "user",
    text: "Yes please! Also, what's the price?",
    time: "10:38 AM",
  },
  {
    from: "ai",
    text: "The 1:1 coaching program is $997.\nIt includes a 90-minute strategy call,\ncustom plan, and 2 follow-up calls.",
    time: "10:39 AM",
  },
  {
    from: "user",
    text: "That sounds great. How do I get started?",
    time: "10:40 AM",
  },
  {
    from: "ai",
    text: "You can book a call with me here:\ntractionflo.com/coach\nI'd love to learn more about your goals! 🚀",
    time: "10:40 AM",
  },
];

const summaryRows: SummaryRow[] = [
  { label: "Intent", value: "High Intent", tone: "bg-[#eaf8ef] text-[#147a31]" },
  { label: "Category", value: "Coaching Inquiry" },
  { label: "Lead Score", value: "85/100", tone: "bg-[#eaf8ef] text-[#147a31]" },
  { label: "Status", value: "Open" },
];

const quickActions: QuickAction[] = [
  { label: "Book a call", icon: CalendarDays },
  { label: "Send pricing", icon: CircleDollarSign },
  { label: "Share program info", icon: FileText },
];

function Avatar({
  src,
  name,
  size = "h-10 w-10",
}: {
  src: string;
  name: string;
  size?: string;
}) {
  if (!src) {
    return (
      <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-black text-[8px] font-extrabold uppercase leading-[1.1] text-white`}>
        Glow<br />Skin
      </span>
    );
  }

  return (
    <span
      aria-label={name}
      role="img"
      className={`${size} shrink-0 rounded-full bg-cover bg-center`}
      style={{ backgroundImage: `url(${src})` }}
    />
  );
}

function ChannelIcon({ channel }: { channel: Conversation["channel"] }) {
  if (channel === "whatsapp") {
    return <span className="h-3 w-3 rounded-full border border-[#12b852] text-[8px] leading-[10px] text-[#12b852]">•</span>;
  }

  return (
    <span className="relative h-3 w-3 rounded-[3px] bg-gradient-to-tr from-[#ffb000] via-[#ff3e8a] to-[#7b39ff]">
      <span className="absolute left-[3px] top-[3px] h-[5px] w-[5px] rounded-full border border-white" />
      <span className="absolute right-[2px] top-[2px] h-[2px] w-[2px] rounded-full bg-white" />
    </span>
  );
}

function InboxList() {
  return (
    <section className="hidden h-full min-w-0 flex-col border-r border-[#e7eaf2] bg-white md:flex">
      <header className="flex h-[58px] shrink-0 items-center justify-between px-5">
        <h1 className="text-[17px] font-bold text-black">Inbox</h1>
        <button type="button" aria-label="New conversation" className="text-black">
          <Edit3 size={18} strokeWidth={2.2} />
        </button>
      </header>

      <div className="grid shrink-0 grid-cols-3 gap-x-2 gap-y-2 px-5 pb-3 text-[12px] font-semibold text-black">
        {filters.map(([label, count], index) => (
          <button
            key={label}
            type="button"
            className={`flex h-7 items-center justify-center gap-2 rounded-[9px] ${
              index === 0 ? "bg-[#f0edff] text-[#4b3cff]" : "bg-white text-black"
            }`}
          >
            <span>{label}</span>
            <span className="rounded-full bg-[#eff1f6] px-2 py-0.5 text-[10px] font-bold text-[#596175]">
              {count}
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 pb-3">
        {conversations.map((conversation) => (
          <button
            key={conversation.name}
            type="button"
            className={`relative flex min-h-[64px] w-full items-start gap-3 rounded-[10px] border px-3 py-2 text-left transition ${
              conversation.active
                ? "border-[#e2e6f3] bg-[#fbfbff] shadow-[0_16px_35px_rgba(65,74,112,0.045)]"
                : "border-transparent bg-white hover:bg-[#fafbff]"
            }`}
          >
            {conversation.active ? (
              <span className="absolute -left-3 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-[#4b3cff]" />
            ) : null}
            <Avatar src={conversation.avatar} name={conversation.name} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[13px] font-bold text-black">{conversation.name}</span>
                {conversation.verified ? <span className="h-1.5 w-1.5 rounded-full bg-[#246bff]" /> : null}
              </span>
              <span className="mt-1 block text-[12px] font-medium leading-[1.35] text-[#4f566c]">
                {conversation.message}
              </span>
            </span>
            <span className="flex h-full shrink-0 flex-col items-end justify-between gap-5">
              <span className="text-[11px] font-medium text-[#596175]">{conversation.time}</span>
              <ChannelIcon channel={conversation.channel} />
            </span>
          </button>
        ))}

        <button type="button" className="mx-auto mt-2 flex items-center gap-1 text-[12px] font-bold text-[#4b3cff]">
          Load more
          <ChevronDown size={15} strokeWidth={2.6} />
        </button>
      </div>
    </section>
  );
}

function ChatBubble({ message }: { message: Message }) {
  const isAi = message.from === "ai";

  return (
    <div className={`flex w-full items-start gap-2.5 ${isAi ? "justify-end sm:pr-4" : "justify-start"}`}>
      {!isAi ? <Avatar src="https://i.pravatar.cc/96?img=47" name="Jessica Parker" size="h-8 w-8" /> : null}
      <div
        className={`max-w-[82%] rounded-[13px] px-3.5 py-2 text-[12px] font-normal leading-[1.35] shadow-[0_16px_40px_rgba(20,28,53,0.035)] sm:max-w-[70%] ${
          isAi ? "bg-[#f0efff] text-[#171c33]" : "bg-white text-black"
        }`}
      >
        <p className="whitespace-pre-line">{message.text}</p>
        <div className={`mt-1 text-[10px] font-medium text-[#596175] ${isAi ? "text-right" : ""}`}>
          {message.time}
          {isAi ? <span className="ml-1 text-[#246bff]">✓✓</span> : null}
        </div>
      </div>
      {isAi ? (
        <span className="mt-8 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3044ff] text-white">
          <span className="relative text-[15px] font-extrabold leading-none">
            T
            <span className="absolute -right-1 top-0 h-1.5 w-1.5 rounded-full bg-white" />
          </span>
        </span>
      ) : null}
    </div>
  );
}

function ChatThread() {
  return (
    <main className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white">
      <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-[#e7eaf2] px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3.5">
          <button type="button" aria-label="Back" className="text-[#1f2638]">
            <ArrowLeft size={18} strokeWidth={2.3} />
          </button>
          <Avatar src="https://i.pravatar.cc/96?img=47" name="Jessica Parker" size="h-10 w-10" />
          <div>
            <h2 className="text-[14px] font-bold leading-tight text-black">Jessica Parker</h2>
            <p className="text-[11px] font-medium text-[#596175]">@jess.parker</p>
          </div>
          <button
            type="button"
            className="ml-4 hidden h-9 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-white px-4 text-[12px] font-semibold text-black sm:flex"
          >
            View profile
            <ExternalLink size={14} strokeWidth={2.4} />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3 xl:hidden">
          <button type="button" className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#dde3ee]">
            <Search size={17} />
          </button>
          <button type="button" className="relative flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#dde3ee]">
            <Bell size={17} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#3044ff]" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-2 sm:px-6">
        <div className="mb-1 flex justify-end gap-2">
          {[Heart, Star, MoreHorizontal].map((Icon, index) => (
            <button
              key={index}
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-[#dde3ee] bg-white text-black"
            >
              <Icon size={15} strokeWidth={2.2} />
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          {messages.map((message, index) => (
            <ChatBubble key={`${message.time}-${index}`} message={message} />
          ))}
        </div>
      </div>

      <footer className="shrink-0 border-t border-transparent px-4 pb-3 sm:px-6">
        <div className="mb-2 flex flex-nowrap items-center gap-2 overflow-x-auto">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                className="flex h-7 items-center gap-2 rounded-[9px] border border-[#dde3ee] bg-white px-3 text-[11px] font-medium text-[#31394f]"
              >
                <Icon size={14} strokeWidth={2.2} />
                {action.label}
              </button>
            );
          })}
          <button type="button" className="flex h-7 w-7 items-center justify-center rounded-[9px] border border-[#dde3ee] bg-white">
            <MoreHorizontal size={16} strokeWidth={2.4} />
          </button>
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
                <Zap size={15} />
                <Smile size={15} />
                <Paperclip size={15} />
                <Bookmark size={15} />
                <Braces size={15} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="flex h-8 items-center gap-2 rounded-[8px] border border-[#dde3ee] bg-[#f3f4ff] px-3.5 text-[12px] font-semibold text-[#3044ff]">
                  <Sparkles size={15} />
                  AI Reply
                </button>
                <button type="button" className="flex h-8 items-center gap-2 rounded-[8px] bg-[#3044ff] px-3.5 text-[12px] font-semibold text-white shadow-[0_16px_30px_rgba(48,68,255,0.24)]">
                  <Send size={15} />
                  Send
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

function SummaryPanel() {
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
        <section className="rounded-[14px] bg-white p-1 shadow-[0_22px_60px_rgba(20,28,53,0.055)]">
          <div className="p-2.5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[13px] font-bold text-black">
                <Sparkles size={16} className="text-[#77809b]" />
                AI Summary
              </h2>
              <span className="text-[10px] font-medium text-[#596175]">Generated 2m ago</span>
            </div>
            <p className="text-[12px] font-normal leading-[1.4] text-[#252c41]">
              Jessica is interested in 1:1 coaching. She loved your content and is asking about pricing and how to get started.
            </p>

            <div className="mt-3 divide-y divide-[#edf0f6]">
              {summaryRows.map((row) => (
                <div key={row.label} className="flex h-[34px] items-center justify-between gap-3">
                  <span className="text-[12px] font-normal text-black">{row.label}</span>
                  <span className="flex items-center gap-2">
                    <span className={`max-w-[142px] truncate rounded-[8px] px-2.5 py-0.5 text-[12px] font-normal text-black ${row.tone ?? "border border-[#e7eaf2] bg-white"}`}>
                      {row.value}
                    </span>
                    <span className="h-3 w-3 rounded-full border border-[#72809d]" />
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <h3 className="text-[13px] font-bold text-black">Recommended next step</h3>
              <div className="mt-2 rounded-[8px] bg-[#f0efff] p-2.5 text-[12px] font-normal leading-[1.35] text-[#252c41]">
                Jessica is showing strong buying signals. Recommend booking a call.
              </div>
            </div>

            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[13px] font-bold text-black">Suggested reply</h3>
                <button type="button" className="text-[11px] font-bold text-[#3044ff]">Customize</button>
              </div>
              <div className="rounded-[8px] border border-[#dde3ee] bg-white p-2.5 text-[12px] font-normal leading-[1.35] text-[#252c41]">
                Perfect! You can book a call with me using the link I shared above. Can’t wait to chat with you and learn more about your goals! 🙌
              </div>
              <button type="button" className="mt-2 flex h-8 w-full items-center justify-center gap-2 rounded-[7px] bg-[#0d1118] text-[12px] font-semibold text-white">
                <Send size={15} />
                Send this reply
              </button>
              <button type="button" className="mt-2 flex h-8 w-full items-center justify-center gap-2 rounded-[7px] border border-[#dde3ee] bg-white text-[12px] font-semibold text-black">
                <Edit3 size={15} />
                Edit reply
              </button>
            </div>
          </div>
        </section>

        <section className="mt-2 rounded-[14px] bg-white p-3 shadow-[0_22px_60px_rgba(20,28,53,0.055)]">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[13px] font-bold text-black">Customer history</h2>
            <button type="button" className="text-[11px] font-bold text-[#3044ff]">View all</button>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0efff] text-[#3044ff]">
              <FileText size={16} />
            </span>
            <span className="flex-1 text-[11px] font-semibold text-black">Course purchase</span>
            <span className="text-[11px] font-semibold text-black">$297</span>
            <span className="text-[10px] font-medium text-[#596175]">May 2, 2025</span>
          </div>
        </section>
      </div>
    </aside>
  );
}

export default function Inbox() {
  return (
    <div className="grid h-full min-h-0 w-full justify-start overflow-hidden bg-white text-black grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[332px_minmax(0,608px)_344px] 2xl:grid-cols-[332px_608px_344px]">
      <InboxList />
      <ChatThread />
      <SummaryPanel />
    </div>
  );
}
