"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  Camera,
  CalendarCheck,
  Check,
  CircleDollarSign,
  GraduationCap,
  Handshake,
  Lock,
  MessageCircle,
  Rocket,
  ShieldCheck,
  Star,
  Target,
  TriangleAlert,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type StepId =
  | "connect"
  | "revenue"
  | "opportunity"
  | "audience"
  | "training"
  | "action-plan"
  | "unlock";

type OnboardingStep = {
  id: StepId;
  label: string;
  title: string;
  subtitle: string;
};

const steps: OnboardingStep[] = [
  {
    id: "connect",
    label: "Connect Instagram",
    title: "Connecting to Instagram",
    subtitle: "This gives us permission to analyze your audience and conversations.",
  },
  {
    id: "revenue",
    label: "Revenue Discovery",
    title: "We have analyzed your audience",
    subtitle: "Here is what we found in the last 30 days.",
  },
  {
    id: "opportunity",
    label: "Top Opportunity",
    title: "Here is one opportunity",
    subtitle: "We found high value opportunities from your connected Instagram activity.",
  },
  {
    id: "audience",
    label: "Audience Intelligence",
    title: "Here is what your audience is talking about",
    subtitle: "Top topics and buying signals detected.",
  },
  {
    id: "training",
    label: "Train Your AI",
    title: "We are training your AI",
    subtitle: "Add your business knowledge so AI can represent you with accuracy.",
  },
  {
    id: "action-plan",
    label: "AI Action Plan",
    title: "Your AI will handle the work",
    subtitle: "We will run in the background so you can focus on growing your business.",
  },
  {
    id: "unlock",
    label: "Unlock Everything",
    title: "Your audience holds incredible potential.",
    subtitle: "Unlock everything TractionFlo found for you.",
  },
];

type OnboardingConversationMessage = {
  text?: string;
  from?: "me" | "user";
  attachments?: unknown[];
};

type OnboardingConversation = {
  id: string;
  participant?: {
    name?: string;
    username?: string;
    profile_pic?: string;
  };
  messages?: OnboardingConversationMessage[];
};

type OnboardingData = {
  connected: boolean;
  isLoading: boolean;
  accountName: string;
  username: string;
  avatarUrl: string;
  followers: number;
  following: number;
  mediaCount: number;
  conversationCount: number;
  messageCount: number;
  userMessageCount: number;
  replyCount: number;
  mediaMessageCount: number;
  opportunityCount: number;
  highIntentLeads: number;
  partnerships: number;
  superfans: number;
  atRisk: number;
  estimatedRevenue: number;
  topOpportunityName: string;
  topOpportunityUsername: string;
  topOpportunityAvatar: string;
  topOpportunityScore: number;
  topOpportunityValue: number;
  websiteHost: string;
  audienceTopics: {
    icon: LucideIcon;
    value: number;
    label: string;
    width: string;
    tone: string;
    iconTone: string;
  }[];
};

const fallbackAvatar = "https://i.pravatar.cc/96?img=47";
const fallbackLeadAvatar = "https://i.pravatar.cc/96?img=32";

const defaultOnboardingData: OnboardingData = {
  connected: false,
  isLoading: true,
  accountName: "Instagram account",
  username: "instagram",
  avatarUrl: fallbackAvatar,
  followers: 0,
  following: 0,
  mediaCount: 0,
  conversationCount: 0,
  messageCount: 0,
  userMessageCount: 0,
  replyCount: 0,
  mediaMessageCount: 0,
  opportunityCount: 0,
  highIntentLeads: 0,
  partnerships: 0,
  superfans: 0,
  atRisk: 0,
  estimatedRevenue: 0,
  topOpportunityName: "Instagram lead",
  topOpportunityUsername: "instagram_user",
  topOpportunityAvatar: fallbackLeadAvatar,
  topOpportunityScore: 0,
  topOpportunityValue: 0,
  websiteHost: "your website",
  audienceTopics: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}

function countMatches(messages: string[], pattern: RegExp) {
  return messages.filter((message) => pattern.test(message)).length;
}

function percentOf(value: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.max(1, Math.min(100, Math.round((value / total) * 100)));
}

function buildAudienceTopics(messages: string[]) {
  const total = Math.max(1, messages.length);
  const booking = countMatches(messages, /book|booking|date|time|availability|schedule|slot|ground|padel|cricket/i);
  const pricing = countMatches(messages, /price|pricing|cost|rate|package|payment|fee|budget/i);
  const services = countMatches(messages, /service|product|course|coaching|training|match|team|players/i);
  const partnerships = countMatches(messages, /partner|partnership|collab|brand|sponsor|campaign/i);
  const support = countMatches(messages, /refund|issue|problem|complaint|cancel|support|not working|angry/i);

  const topicRows = [
    {
      icon: CalendarCheck,
      value: percentOf(booking, total),
      label: "Asked about booking",
      tone: "bg-[#4b3cff]",
      iconTone: "bg-[#f0edff] text-[#4b3cff]",
    },
    {
      icon: CircleDollarSign,
      value: percentOf(pricing, total),
      label: "Asked about pricing",
      tone: "bg-[#13a84f]",
      iconTone: "bg-[#eafaf0] text-[#13a84f]",
    },
    {
      icon: Target,
      value: percentOf(services, total),
      label: "Asked about services",
      tone: "bg-[#ff850d]",
      iconTone: "bg-[#fff6e8] text-[#d98613]",
    },
    {
      icon: Handshake,
      value: percentOf(partnerships, total),
      label: "Partnership signals",
      tone: "bg-[#df405b]",
      iconTone: "bg-[#fff0f3] text-[#df405b]",
    },
    {
      icon: MessageCircle,
      value: percentOf(Math.max(0, total - booking - pricing - services - partnerships - support), total),
      label: "Other questions",
      tone: "bg-[#246bff]",
      iconTone: "bg-[#eef4ff] text-[#246bff]",
    },
  ];

  return topicRows.map((topic) => ({
    ...topic,
    width: `${Math.max(12, topic.value)}%`,
  }));
}

function normalizeConversations(value: unknown): OnboardingConversation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord).map((conversation, index) => {
    const participant = isRecord(conversation.participant) ? conversation.participant : {};
    const messages = Array.isArray(conversation.messages)
      ? conversation.messages.filter(isRecord).map((message) => ({
          text: getString(message.text),
          from: message.from === "me" ? ("me" as const) : ("user" as const),
          attachments: Array.isArray(message.attachments) ? message.attachments : [],
        }))
      : [];

    return {
      id: getString(conversation.id, `conversation-${index}`),
      participant: {
        name: getString(participant.name),
        username: getString(participant.username),
        profile_pic: getString(participant.profile_pic),
      },
      messages,
    };
  });
}

function buildOnboardingData(statusPayload: unknown, contentPayload: unknown, conversationsPayload: unknown): OnboardingData {
  const status = isRecord(statusPayload) ? statusPayload : {};
  const content = isRecord(contentPayload) ? contentPayload : {};
  const conversationsRoot = isRecord(conversationsPayload) ? conversationsPayload : {};
  const statusAccount = isRecord(status.account) ? status.account : {};
  const contentAccount = isRecord(content.account) ? content.account : {};
  const conversationsAccount = isRecord(conversationsRoot.account) ? conversationsRoot.account : {};
  const conversations = normalizeConversations(conversationsRoot.conversations);
  const connected = Boolean(status.connected || contentAccount.id || conversationsRoot.ig_user_id);

  const username =
    getString(contentAccount.username) ||
    getString(statusAccount.username) ||
    getString(conversationsAccount.username);
  const accountName = getString(contentAccount.name) || getString(statusAccount.name) || username || "Instagram account";
  const followers = getNumber(contentAccount.followersCount);
  const following = getNumber(contentAccount.followingCount);
  const mediaCount = getNumber(contentAccount.mediaCount);
  const posts = Array.isArray(content.posts) ? content.posts.length : 0;
  const stories = Array.isArray(content.stories) ? content.stories.length : 0;
  const messageGroups = conversations.flatMap((conversation) => conversation.messages || []);
  const userMessages = messageGroups.filter((message) => message.from === "user");
  const replyMessages = messageGroups.filter((message) => message.from === "me");
  const userTexts = userMessages.map((message) => message.text || "").filter(Boolean);
  const allUserText = userTexts.join("\n");
  const partnershipSignals = countMatches(userTexts, /partner|partnership|collab|brand|sponsor|campaign/i);
  const atRiskSignals = countMatches(userTexts, /refund|issue|problem|complaint|cancel|support|not working|angry/i);
  const highIntentLeads = conversations.filter((conversation) => {
    const text = (conversation.messages || []).map((message) => message.text || "").join("\n");
    return /book|booking|buy|price|pricing|cost|rate|package|payment|fee|budget|availability|slot/i.test(text);
  }).length;
  const superfans = conversations.filter((conversation) => (conversation.messages || []).filter((message) => message.from === "user").length >= 3).length;
  const topOpportunity =
    conversations
      .map((conversation) => ({
        conversation,
        score:
          (conversation.messages || []).length +
          (/price|pricing|cost|rate|package/i.test((conversation.messages || []).map((message) => message.text || "").join("\n")) ? 5 : 0) +
          (/book|booking|availability|slot/i.test((conversation.messages || []).map((message) => message.text || "").join("\n")) ? 5 : 0),
      }))
      .sort((first, second) => second.score - first.score)[0]?.conversation || conversations[0];
  const topMessageText = (topOpportunity?.messages || []).map((message) => message.text || "").join("\n");
  const topOpportunityScore = topOpportunity
    ? Math.min(99, 45 + (topOpportunity.messages || []).length * 5 + (/price|pricing|booking|book|buy|rate/i.test(topMessageText) ? 18 : 0))
    : 0;
  const opportunityCount = Math.max(highIntentLeads + partnershipSignals + superfans + atRiskSignals, highIntentLeads);
  const estimatedRevenue =
    highIntentLeads * 2800 +
    partnershipSignals * 5000 +
    Math.min(superfans, 25) * 120 +
    atRiskSignals * 297;

  return {
    connected,
    isLoading: false,
    accountName,
    username: username || "instagram",
    avatarUrl: fallbackAvatar,
    followers,
    following,
    mediaCount: Math.max(mediaCount, posts + stories),
    conversationCount: getNumber(conversationsRoot.conversation_count, conversations.length),
    messageCount: messageGroups.length,
    userMessageCount: userMessages.length,
    replyCount: replyMessages.length,
    mediaMessageCount: messageGroups.filter((message) => (message.attachments || []).length > 0).length,
    opportunityCount,
    highIntentLeads,
    partnerships: partnershipSignals,
    superfans,
    atRisk: atRiskSignals,
    estimatedRevenue,
    topOpportunityName:
      getString(topOpportunity?.participant?.name) ||
      getString(topOpportunity?.participant?.username) ||
      (connected ? "Instagram lead" : "No lead detected yet"),
    topOpportunityUsername: getString(topOpportunity?.participant?.username, "instagram_user"),
    topOpportunityAvatar: getString(topOpportunity?.participant?.profile_pic, fallbackLeadAvatar),
    topOpportunityScore,
    topOpportunityValue: Math.max(0, Math.round(topOpportunityScore * 32)),
    websiteHost: username ? `${username}.instagram` : "your website",
    audienceTopics: buildAudienceTopics(userTexts.length ? userTexts : [allUserText].filter(Boolean)),
  };
}

function BrandMark({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-9 w-9">
        <div className="absolute left-0 top-0 h-2.5 w-8 rounded-full bg-gradient-to-r from-[#8156ff] to-[#3529ff]" />
        <div className="absolute left-[10px] top-[3px] h-7 w-2.5 rounded-full bg-gradient-to-b from-[#5d43ff] to-[#8b6dff]" />
        <div className="absolute right-0.5 top-[7px] h-3 w-3 rounded-full bg-[#8a70ff]" />
      </div>
      <span className={`text-[22px] font-extrabold leading-none ${dark ? "text-white" : "text-black"}`}>
        TractionFlo
      </span>
    </div>
  );
}

function StepBadge({ currentStep, dark = false }: { currentStep: number; dark?: boolean }) {
  return (
    <div className={`flex items-center gap-3 text-[14px] font-extrabold ${dark ? "text-white" : "text-[#41356f]"}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4b3cff] text-[13px] font-extrabold text-white">
        {currentStep}
      </span>
      {steps[currentStep - 1].label}
    </div>
  );
}

function SecureNote({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-[10px] border px-4 py-3 ${
        dark ? "border-white/10 bg-white/7 text-[#dbe2ff]" : "border-[#e8eaf2] bg-[#fbfaff] text-[#596175]"
      }`}
    >
      <Lock size={18} className={dark ? "text-[#a999ff]" : "text-[#5b38ff]"} strokeWidth={2.35} />
      <p className="text-[12px] font-semibold leading-relaxed">{children}</p>
    </div>
  );
}

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    const startedAt = performance.now();

    function update(now: number) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(update);
      }
    }

    frame = requestAnimationFrame(update);

    return () => cancelAnimationFrame(frame);
  }, [duration, target]);

  return value;
}

function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  className = "",
  duration,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
}) {
  const current = useCountUp(value, duration);

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {current.toLocaleString()}
      {suffix}
    </span>
  );
}

function AnimatedCheckIcon({ className = "" }: { className?: string }) {
  return (
    <motion.span
      initial={{ scale: 0, rotate: -28 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 520, damping: 24 }}
      className={`flex items-center justify-center ${className}`}
    >
      <Check size={14} strokeWidth={3} />
    </motion.span>
  );
}

function SpinnerRing({ sizeClass = "h-6 w-6" }: { sizeClass?: string }) {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
      className={`${sizeClass} rounded-full border-[3px] border-[#4b3cff] border-r-transparent`}
    />
  );
}

function AnimatedProgressBar({ width, tone, delay = 0 }: { width: string; tone: string; delay?: number }) {
  return (
    <span className="block h-full overflow-hidden rounded-full">
      <motion.span
        initial={{ width: 0 }}
        animate={{ width }}
        transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
        className={`block h-full rounded-full ${tone}`}
      />
    </span>
  );
}

function AnimatedCard({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function AnimatedDonut({
  percent,
  sizeClass = "h-[172px] w-[172px]",
  innerClass = "h-[124px] w-[124px]",
  children,
}: {
  percent: number;
  sizeClass?: string;
  innerClass?: string;
  children: React.ReactNode;
}) {
  const current = useCountUp(percent, 1100);

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 22 }}
      className={`relative flex items-center justify-center rounded-full ${sizeClass}`}
      style={{
        background: `conic-gradient(#4b3cff 0 ${current}%, #edf0f6 ${current}% 100%)`,
      }}
    >
      <motion.span
        aria-hidden="true"
        animate={{ rotate: 360 }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        className="absolute inset-[-6px] rounded-full border border-[#4b3cff]/20 border-t-[#4b3cff]/70"
      />
      <div className={`relative flex flex-col items-center justify-center rounded-full bg-white ${innerClass}`}>{children}</div>
    </motion.div>
  );
}

function MetricTile({
  icon: Icon,
  value,
  label,
  detail,
  tone,
  delay = 0,
}: {
  icon: LucideIcon;
  value: number;
  label: string;
  detail: string;
  tone: string;
  delay?: number;
}) {
  return (
    <AnimatedCard delay={delay} className="rounded-[10px] border border-[#e7eaf2] bg-white p-4 shadow-[0_14px_36px_rgba(20,28,53,0.035)]">
      <div className="flex items-start gap-3">
        <motion.span
          initial={{ scale: 0.8, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 360, damping: 18, delay }}
          className={`flex h-10 w-10 items-center justify-center rounded-[10px] ${tone}`}
        >
          <Icon size={19} strokeWidth={2.35} />
        </motion.span>
        <div>
          <p className="text-[28px] font-extrabold leading-none text-black">
            <AnimatedCounter value={value} />
          </p>
          <p className="mt-2 text-[13px] font-extrabold text-black">{label}</p>
          <p className="mt-1 text-[11px] font-semibold text-[#697083]">{detail}</p>
        </div>
      </div>
    </AnimatedCard>
  );
}

function ConnectInstagramStep({
  data,
  onConnectInstagram,
}: {
  data: OnboardingData;
  onConnectInstagram: () => void;
}) {
  const tasks = data.connected
    ? [
        "Connected account",
        `Loaded ${data.followers.toLocaleString()} followers`,
        `Analyzed ${data.conversationCount.toLocaleString()} conversations`,
        `Detected ${data.opportunityCount.toLocaleString()} opportunities`,
      ]
    : ["Connect account", "Fetch followers", "Analyze conversations", "Detect opportunities"];
  const [progressIndex, setProgressIndex] = useState(0);

  useEffect(() => {
    if (!data.connected) {
      const timeout = window.setTimeout(() => setProgressIndex(0), 0);
      return () => window.clearTimeout(timeout);
    }

    const interval = window.setInterval(() => {
      setProgressIndex((current) => (current >= tasks.length ? 0 : current + 1));
    }, 900);

    return () => window.clearInterval(interval);
  }, [data.connected, tasks.length]);

  return (
    <div className="space-y-7">
      <AnimatedCard className="flex items-center gap-4 rounded-[12px] border border-[#e7eaf2] bg-white p-4 shadow-[0_18px_45px_rgba(20,28,53,0.045)]">
        <span
          aria-label={data.connected ? data.accountName : "Instagram disconnected"}
          role="img"
          className="relative h-14 w-14 rounded-full bg-cover bg-center"
          style={{ backgroundImage: data.connected ? `url(${data.avatarUrl})` : undefined }}
        >
          <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-[8px] bg-gradient-to-br from-[#f97316] via-[#ec4899] to-[#7c3aed] text-white">
            <Camera size={17} strokeWidth={2.4} />
          </span>
        </span>
        <div>
          <p className="text-[15px] font-extrabold text-black">
            {data.isLoading ? "Checking Instagram..." : data.connected ? `@${data.username}` : "Instagram disconnected"}
          </p>
          <p className="mt-1 text-[12px] font-bold text-[#697083]">
            {data.connected ? (
              <>
                <AnimatedCounter value={data.followers} /> followers
              </>
            ) : (
              "Connect your Instagram Business account"
            )}
          </p>
        </div>
      </AnimatedCard>

      {!data.connected && !data.isLoading ? (
        <motion.button
          type="button"
          onClick={onConnectInstagram}
          whileHover={{ y: -2, boxShadow: "0 18px 44px rgba(75,60,255,0.26)" }}
          whileTap={{ scale: 0.98 }}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[#4b3cff] text-[14px] font-extrabold text-white shadow-[0_14px_34px_rgba(75,60,255,0.18)]"
        >
          <Camera size={18} strokeWidth={2.4} />
          Connect Instagram
        </motion.button>
      ) : null}

      <div className="space-y-5">
        {tasks.map((task, index) => {
          const isDone = index < progressIndex;
          const isActive = data.connected ? index === progressIndex : index === 0;

          return (
            <motion.div
              key={task}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08, duration: 0.35 }}
              className="flex items-center gap-4"
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full ${
                  isDone ? "bg-[#4b3cff] text-white" : isActive ? "bg-white" : "border-2 border-[#e0e4ef] bg-white"
                }`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isDone ? (
                    <AnimatedCheckIcon key="done" />
                  ) : isActive && data.connected ? (
                    <SpinnerRing key="spin" />
                  ) : null}
                </AnimatePresence>
              </span>
              <span className={`text-[13px] font-bold ${isActive ? "text-[#4b3cff]" : "text-[#46506a]"}`}>{task}</span>
            </motion.div>
          );
        })}
      </div>

      <SecureNote>
        <span className="font-extrabold text-[#4b3cff]">Your data is secure and private.</span>
        <br />
        We never post without your permission.
      </SecureNote>
    </div>
  );
}

function RevenueStep({ data }: { data: OnboardingData }) {
  return (
    <div className="space-y-7 text-center">
      <div>
        <p className="text-[64px] font-extrabold leading-none tracking-[-0.04em] text-[#4b3cff] sm:text-[78px]">
          <AnimatedCounter value={data.estimatedRevenue} prefix="$" duration={1100} />
        </p>
        <p className="mt-3 text-[16px] font-extrabold text-[#30384d]">Potential Revenue Found</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <MetricTile icon={Users} value={data.highIntentLeads} label="High Intent Leads" detail="Pricing or booking intent" tone="bg-[#eafaf0] text-[#13a84f]" delay={0.05} />
        <MetricTile icon={Handshake} value={data.partnerships} label="Partnerships" detail="Brand or collab signals" tone="bg-[#fff6e8] text-[#d98613]" delay={0.15} />
        <MetricTile icon={Star} value={data.superfans} label="Superfans" detail="Repeat engaged conversations" tone="bg-[#f0edff] text-[#4b3cff]" delay={0.25} />
        <MetricTile icon={TriangleAlert} value={data.atRisk} label="At-Risk Customers" detail="Refund or support language" tone="bg-[#fff0f3] text-[#df405b]" delay={0.35} />
      </div>

      <SecureNote>
        Analysis based on {data.followers.toLocaleString()} followers and {data.conversationCount.toLocaleString()} recent conversations.
      </SecureNote>
    </div>
  );
}

function OpportunityStep({ data }: { data: OnboardingData }) {
  const remainingOpportunities = Math.max(0, data.opportunityCount - 1);
  const reasons = [
    data.highIntentLeads > 0 ? "Asked about booking, pricing, or purchase details" : "Recently messaged your Instagram account",
    data.replyCount > 0 ? "Your team has already replied in this thread" : "Ready for a first helpful response",
    data.mediaMessageCount > 0 ? "Shared media or attachment context" : "Can be handled from conversation context",
  ];

  return (
    <div className="space-y-5">
      <AnimatedCard className="rounded-[12px] border border-[#e7eaf2] bg-white p-5 shadow-[0_18px_45px_rgba(20,28,53,0.045)]">
        <div className="flex items-start gap-4">
          <span
            aria-label={data.topOpportunityName}
            role="img"
            className="h-16 w-16 rounded-full bg-cover bg-center"
            style={{ backgroundImage: `url(${data.topOpportunityAvatar})` }}
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-[18px] font-extrabold text-black">{data.topOpportunityName}</h3>
            <p className="mt-1 text-[12px] font-bold text-[#697083]">@{data.topOpportunityUsername}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-[6px] bg-[#eafaf0] px-2.5 py-1 text-[11px] font-extrabold text-[#13a84f]">
                {data.topOpportunityScore >= 70 ? "High Intent" : "Active Lead"}
              </span>
              <span className="rounded-[6px] bg-[#f0edff] px-2.5 py-1 text-[11px] font-extrabold text-[#4b3cff]">
                Live Instagram
              </span>
            </div>
          </div>
          <div className="rounded-[10px] bg-[#f0edff] px-4 py-3 text-center">
            <p className="text-[24px] font-extrabold leading-none text-[#4b3cff]">
              <AnimatedCounter value={data.topOpportunityScore} duration={900} />
            </p>
            <p className="mt-1 text-[10px] font-bold text-[#697083]">Lead Score</p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-[#edf0f6] pt-4">
          <span className="text-[13px] font-bold text-[#46506a]">Potential Value</span>
          <span className="text-[22px] font-extrabold text-[#4b3cff]">
            <AnimatedCounter value={data.topOpportunityValue} prefix="$" duration={950} />
          </span>
        </div>

        <div className="mt-4 rounded-[10px] border border-[#e7eaf2] bg-[#fbfcff] p-4">
          <p className="text-[12px] font-extrabold text-black">Why this person is interested:</p>
          <div className="mt-3 space-y-2">
            {reasons.map((item, index) => (
              <motion.p
                key={item}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + index * 0.12, duration: 0.3 }}
                className="flex items-center gap-2 text-[12px] font-semibold text-[#30384d]"
              >
                <AnimatedCheckIcon className="text-[#4b3cff]" />
                {item}
              </motion.p>
            ))}
          </div>
        </div>
      </AnimatedCard>

      <AnimatedCard delay={0.25} className="rounded-[12px] border border-[#e7eaf2] bg-white/70 p-4 blur-[1px]">
        <div className="flex items-center gap-3 opacity-50">
          <span className="h-12 w-12 rounded-full bg-[#d7dce8]" />
          <div className="flex-1">
            <span className="block h-3 w-32 rounded-full bg-[#d7dce8]" />
            <span className="mt-2 block h-3 w-20 rounded-full bg-[#e6e9f1]" />
          </div>
        </div>
      </AnimatedCard>

      <SecureNote>
        <span className="font-extrabold text-[#4b3cff]">
          {remainingOpportunities.toLocaleString()} more opportunities found.
        </span>{" "}
        Review your connected Instagram activity to see all.
      </SecureNote>
    </div>
  );
}

function AudienceStep({ data }: { data: OnboardingData }) {
  const topics = data.audienceTopics.length
    ? data.audienceTopics
    : [
        { icon: GraduationCap, value: 0, label: "Waiting for audience data", width: "12%", tone: "bg-[#4b3cff]", iconTone: "bg-[#f0edff] text-[#4b3cff]" },
        { icon: CircleDollarSign, value: 0, label: "Pricing signals", width: "12%", tone: "bg-[#13a84f]", iconTone: "bg-[#eafaf0] text-[#13a84f]" },
        { icon: Users, value: 0, label: "Service questions", width: "12%", tone: "bg-[#ff850d]", iconTone: "bg-[#fff6e8] text-[#d98613]" },
        { icon: CalendarCheck, value: 0, label: "Booking requests", width: "12%", tone: "bg-[#df405b]", iconTone: "bg-[#fff0f3] text-[#df405b]" },
        { icon: MessageCircle, value: 0, label: "Other questions", width: "12%", tone: "bg-[#246bff]", iconTone: "bg-[#eef4ff] text-[#246bff]" },
      ];

  return (
    <div className="space-y-6">
      <AnimatedCard className="rounded-[12px] border border-[#e7eaf2] bg-white p-4 shadow-[0_18px_45px_rgba(20,28,53,0.035)]">
        <div className="space-y-4">
          {topics.map((topic, index) => {
            const Icon = topic.icon;
            return (
              <motion.div
                key={topic.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.35 }}
                className="grid grid-cols-[44px_70px_1fr] items-center gap-3"
              >
                <motion.span
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 350, damping: 20, delay: index * 0.08 }}
                  className={`flex h-10 w-10 items-center justify-center rounded-[10px] ${topic.iconTone}`}
                >
                  <Icon size={18} strokeWidth={2.35} />
                </motion.span>
                <span className="text-[22px] font-extrabold text-black">
                  <AnimatedCounter value={topic.value} suffix="%" duration={850 + index * 80} />
                </span>
                <div>
                  <p className="text-[12px] font-bold text-[#46506a]">{topic.label}</p>
                  <div className="mt-2 h-2 rounded-full bg-[#edf0f6]">
                    <AnimatedProgressBar width={topic.width} tone={topic.tone} delay={0.15 + index * 0.08} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </AnimatedCard>

      <SecureNote>
        <span className="font-extrabold text-[#4b3cff]">Unlock full audience intelligence.</span>
        <br />
        See all topics, trends and buying signals.
      </SecureNote>
    </div>
  );
}

function TrainingStep({ data }: { data: OnboardingData }) {
  const confidence = data.connected
    ? Math.min(98, 58 + Math.min(20, data.conversationCount * 2) + Math.min(20, data.userMessageCount))
    : 0;
  const sources = [
    { icon: BookOpen, label: "Instagram profile", detail: `@${data.username}` },
    { icon: MessageCircle, label: "Conversation FAQ", detail: `${data.userMessageCount.toLocaleString()} customer messages` },
    { icon: CircleDollarSign, label: "Pricing signals", detail: `${data.highIntentLeads.toLocaleString()} buying conversations` },
    { icon: Target, label: "Content library", detail: `${data.mediaCount.toLocaleString()} media items loaded` },
    { icon: Bot, label: "Brand Voice", detail: `${data.replyCount.toLocaleString()} replies analyzed` },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
      <AnimatedCard className="rounded-[12px] border border-[#e7eaf2] bg-white p-3 shadow-[0_18px_45px_rgba(20,28,53,0.035)]">
        {sources.map((source, index) => {
          const Icon = source.icon;
          return (
            <motion.div
              key={source.label}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.35 }}
              className={`flex items-center gap-3 px-2 py-3 ${index < sources.length - 1 ? "border-b border-[#edf0f6]" : ""}`}
            >
              <motion.span
                initial={{ scale: 0.82, rotate: -5 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 360, damping: 20, delay: index * 0.09 }}
                className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-[#f0edff] text-[#4b3cff]"
              >
                <Icon size={17} strokeWidth={2.35} />
              </motion.span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-extrabold text-black">{source.label}</p>
                <p className="mt-1 text-[11px] font-semibold text-[#697083]">{source.detail}</p>
              </div>
              <span className="rounded-full bg-[#eafaf0] px-2 py-1 text-[10px] font-extrabold text-[#13a84f]">Added</span>
              <AnimatedCheckIcon className="text-[#13a84f]" />
            </motion.div>
          );
        })}
      </AnimatedCard>

      <div className="flex flex-col items-center justify-center">
        <AnimatedDonut percent={confidence}>
          <span className="text-[32px] font-extrabold text-black">
            <AnimatedCounter value={confidence} suffix="%" duration={1100} />
          </span>
          <span className="mt-1 text-[12px] font-bold text-[#697083]">AI Confidence</span>
        </AnimatedDonut>
        <p className="mt-4 text-center text-[12px] font-semibold leading-relaxed text-[#697083]">
          Your AI is learning and getting ready.
        </p>
      </div>

      <div className="lg:col-span-2">
        <SecureNote>You can update these anytime in settings.</SecureNote>
      </div>
    </div>
  );
}

function ActionPlanStep() {
  const actions = [
    { icon: MessageCircle, label: "Start conversations", detail: "AI will start conversations with engaged followers" },
    { icon: Target, label: "Qualify leads", detail: "AI will identify intent and ask smart questions" },
    { icon: ShieldCheck, label: "Answer questions", detail: "AI will answer common questions instantly" },
    { icon: Rocket, label: "Escalate complaints", detail: "AI will escalate unhappy customers" },
    { icon: Handshake, label: "Escalate partnerships", detail: "AI will identify and reach out to brands" },
    { icon: CalendarCheck, label: "Book calls", detail: "AI will book calls for high intent leads" },
  ];

  return (
    <AnimatedCard className="rounded-[12px] border border-[#e7eaf2] bg-white p-3 shadow-[0_18px_45px_rgba(20,28,53,0.035)]">
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08, duration: 0.35 }}
            className={`flex items-center gap-3 px-2 py-3 ${index < actions.length - 1 ? "border-b border-[#edf0f6]" : ""}`}
          >
            <motion.span
              whileHover={{ scale: 1.06 }}
              className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-[#f0edff] text-[#4b3cff]"
            >
              <Icon size={17} strokeWidth={2.35} />
            </motion.span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-extrabold text-black">{action.label}</p>
              <p className="mt-1 text-[11px] font-semibold text-[#697083]">{action.detail}</p>
            </div>
            <AnimatedCheckIcon className="text-[#13a84f]" />
          </motion.div>
        );
      })}
    </AnimatedCard>
  );
}

function UnlockStep({ data, onFinish }: { data: OnboardingData; onFinish: () => void | Promise<void> }) {
  const unlockItems = [
    `View all ${data.opportunityCount.toLocaleString()} opportunities`,
    "AI starts conversations",
    "AI qualifies leads",
    "AI answers and handles DMs",
    "AI books calls",
    "Advanced insights and analytics",
    "Real-time alerts",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-[18px] bg-[#060912] p-5 text-white shadow-[0_26px_80px_rgba(6,9,18,0.24)] sm:p-7"
    >
      <StepBadge currentStep={7} dark />
      <div className="mt-8 grid gap-5 xl:grid-cols-[1.05fr_1fr_320px]">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="rounded-[14px] border border-white/10 bg-gradient-to-br from-[#1b1050] to-[#0c1021] p-5"
        >
          <p className="text-[15px] font-bold text-[#dbe2ff]">Your Audience Contains</p>
          <p className="mt-5 text-[56px] font-extrabold leading-none tracking-[-0.04em] text-[#a999ff]">
            <AnimatedCounter value={data.estimatedRevenue} prefix="$" duration={1200} />
          </p>
          <p className="mt-4 text-[18px] font-bold text-[#dbe2ff]">Potential Revenue</p>
          <div className="mt-8 grid grid-cols-4 border-t border-white/10 pt-5 text-center">
            {[
              [data.highIntentLeads, "Hot Leads"],
              [data.partnerships, "Partnerships"],
              [data.superfans, "Superfans"],
              [data.atRisk, "At-Risk Customers"],
            ].map(([value, label], index) => (
              <div key={label}>
                <p className="text-[24px] font-extrabold text-white">
                  <AnimatedCounter value={value as number} duration={750 + index * 90} />
                </p>
                <p className="mt-2 text-[11px] font-semibold text-[#aeb7d4]">{label}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18 }}
          className="rounded-[14px] border border-white/10 bg-white/5 p-5"
        >
          <h3 className="text-[20px] font-extrabold">Unlock Everything</h3>
          <div className="mt-5 space-y-3">
            {unlockItems.map((item, index) => (
              <motion.p
                key={item}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.28, delay: 0.28 + index * 0.07 }}
                className="flex items-center gap-3 text-[13px] font-semibold text-[#dbe2ff]"
              >
                <AnimatedCheckIcon className="text-[#13a84f]" />
                {item}
              </motion.p>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.28 }}
          className="rounded-[14px] bg-white p-5 text-black"
        >
          <h3 className="text-[18px] font-extrabold">Founder Plan</h3>
          <span className="mt-2 inline-flex rounded-[6px] bg-[#f0edff] px-2 py-1 text-[11px] font-extrabold text-[#4b3cff]">
            Best for creators
          </span>
          <div className="mt-5 flex items-end gap-1">
            <span className="text-[46px] font-extrabold leading-none">
              <AnimatedCounter value={249} prefix="$" duration={850} />
            </span>
            <span className="pb-2 text-[13px] font-bold text-[#596175]">/month</span>
          </div>
          <p className="mt-2 text-[12px] font-semibold text-[#697083]">Cancel anytime</p>
          <div className="mt-5 space-y-3">
            {["Everything in the plan", "Setup in 2 minutes", "No long-term contracts"].map((item) => (
              <p key={item} className="flex items-center gap-2 text-[12px] font-bold text-[#46506a]">
                <AnimatedCheckIcon className="text-[#13a84f]" />
                {item}
              </p>
            ))}
          </div>
          <motion.button
            type="button"
            onClick={() => void onFinish()}
            whileHover={{ y: -2, boxShadow: "0 22px 48px rgba(75,60,255,0.34)" }}
            whileTap={{ scale: 0.98 }}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-[9px] bg-[#4b3cff] text-[13px] font-extrabold text-white shadow-[0_18px_40px_rgba(75,60,255,0.28)]"
          >
            <Lock size={16} strokeWidth={2.4} />
            Unlock My Opportunities
          </motion.button>
          <p className="mt-3 text-center text-[11px] font-semibold text-[#697083]">7-day money back guarantee</p>
        </motion.section>
      </div>
    </motion.div>
  );
}

function StepContent({
  step,
  data,
  onConnectInstagram,
  onFinish,
}: {
  step: StepId;
  data: OnboardingData;
  onConnectInstagram: () => void;
  onFinish: () => void | Promise<void>;
}) {
  if (step === "connect") {
    return <ConnectInstagramStep data={data} onConnectInstagram={onConnectInstagram} />;
  }

  if (step === "revenue") {
    return <RevenueStep data={data} />;
  }

  if (step === "opportunity") {
    return <OpportunityStep data={data} />;
  }

  if (step === "audience") {
    return <AudienceStep data={data} />;
  }

  if (step === "training") {
    return <TrainingStep data={data} />;
  }

  if (step === "action-plan") {
    return <ActionPlanStep />;
  }

  return <UnlockStep data={data} onFinish={onFinish} />;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(defaultOnboardingData);
  const currentStep = steps[stepIndex];
  const isFinalStep = stepIndex === steps.length - 1;
  const progress = useMemo(() => ((stepIndex + 1) / steps.length) * 100, [stepIndex]);

  useEffect(() => {
    let isMounted = true;

    async function loadOnboardingData() {
      try {
        const requestOptions = {
          headers: { Accept: "application/json" },
          cache: "no-store" as RequestCache,
        };
        const [statusResult, contentResult, conversationsResult] = await Promise.allSettled([
          fetch("/api/auth/instagram/status", requestOptions).then((response) => response.json() as Promise<unknown>),
          fetch("/api/instagram/content", requestOptions).then((response) => response.json() as Promise<unknown>),
          fetch("/api/instagram/conversations", requestOptions).then((response) => response.json() as Promise<unknown>),
        ]);

        if (!isMounted) {
          return;
        }

        setOnboardingData(
          buildOnboardingData(
            statusResult.status === "fulfilled" ? statusResult.value : {},
            contentResult.status === "fulfilled" ? contentResult.value : {},
            conversationsResult.status === "fulfilled" ? conversationsResult.value : {},
          ),
        );
      } catch {
        if (isMounted) {
          setOnboardingData({ ...defaultOnboardingData, isLoading: false });
        }
      }
    }

    void loadOnboardingData();

    return () => {
      isMounted = false;
    };
  }, []);

  async function finishOnboarding() {
    window.localStorage.setItem("tractionflo_onboarding_completed", "true");
    try {
      await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
    } catch {
      // Local completion still lets the user continue if the network request fails.
    }
    router.push("/dashboard");
  }

  function goNext() {
    if (isFinalStep) {
      void finishOnboarding();
      return;
    }

    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  function goBack() {
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  function connectInstagram() {
    window.location.href = "/api/auth/instagram?next=/onboarding";
  }

  return (
    <main className={`h-dvh max-h-dvh overflow-hidden px-4 py-3 text-black sm:px-6 lg:px-8 ${currentStep.id === "unlock" ? "bg-[#060912]" : "bg-[#fbfbff]"}`}>
      <div className="mx-auto flex h-full min-h-0 max-w-[1180px] flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4">
          <BrandMark dark={currentStep.id === "unlock"} />
          <button
            type="button"
            onClick={() => void finishOnboarding()}
            className={`h-10 rounded-[9px] border px-4 text-[13px] font-extrabold transition ${
              currentStep.id === "unlock"
                ? "border-white/15 bg-[#060912] text-white hover:bg-[#11182a]"
                : "border-[#e0e4ef] bg-white text-[#4b3cff] hover:bg-[#f7f5ff]"
            }`}
          >
            Skip
          </button>
        </header>

        <section
          className={`mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border shadow-[0_28px_80px_rgba(20,28,53,0.08)] ${
            currentStep.id === "unlock" ? "border-[#060912] bg-[#060912]" : "border-[#e1e5ef] bg-white"
          }`}
        >
          <div className={`h-1.5 ${currentStep.id === "unlock" ? "bg-white/10" : "bg-[#edf0f6]"}`}>
            <span className="block h-full rounded-r-full bg-[#4b3cff] transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>

          <div className={`flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6 ${currentStep.id === "unlock" ? "text-white" : "text-black"}`}>
            {currentStep.id !== "unlock" ? (
              <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
                <aside className="flex min-h-0 flex-col justify-between">
                  <div>
                    <StepBadge currentStep={stepIndex + 1} />
                    <h1 className="mt-5 max-w-[340px] text-[30px] font-extrabold leading-[1.05] tracking-[-0.02em] text-black sm:text-[36px]">
                      {currentStep.title}
                    </h1>
                    <p className="mt-4 max-w-[330px] text-[14px] font-semibold leading-relaxed text-[#596175]">
                      {currentStep.subtitle}
                    </p>
                  </div>

                  <div className="mt-6 hidden space-y-2 lg:block">
                    {steps.map((step, index) => (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => setStepIndex(index)}
                        className={`flex w-full items-center gap-3 rounded-[9px] px-3 py-2 text-left text-[12px] font-extrabold transition ${
                          index === stepIndex ? "bg-[#f0edff] text-[#4b3cff]" : "text-[#8a92a6] hover:bg-[#f8f9fc]"
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                            index <= stepIndex ? "bg-[#4b3cff] text-white" : "bg-[#eef0f6] text-[#8a92a6]"
                          }`}
                        >
                          {index + 1}
                        </span>
                        {step.label}
                      </button>
                    ))}
                  </div>
                </aside>

                <div className="flex min-h-0 items-center justify-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep.id}
                      initial={{ opacity: 0, x: 22 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -22 }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      className="w-full max-w-[660px]"
                    >
                    <StepContent
                      step={currentStep.id}
                      data={onboardingData}
                      onConnectInstagram={connectInstagram}
                      onFinish={finishOnboarding}
                    />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="mb-4 shrink-0">
                  <h1 className="mt-4 max-w-[720px] text-[30px] font-extrabold leading-[1.08] tracking-[-0.02em] sm:text-[38px]">
                    {currentStep.title}
                  </h1>
                  <p className="mt-3 text-[16px] font-semibold text-[#dbe2ff]">{currentStep.subtitle}</p>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -18 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <StepContent
                      step={currentStep.id}
                      data={onboardingData}
                      onConnectInstagram={connectInstagram}
                      onFinish={finishOnboarding}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </div>
        </section>

        <footer className="flex shrink-0 flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className={`flex items-center gap-3 text-[12px] font-semibold ${currentStep.id === "unlock" ? "text-[#dbe2ff]" : "text-[#697083]"}`}>
            <ShieldCheck size={18} className="text-[#4b3cff]" strokeWidth={2.35} />
            Secure. Private. Yours. We never post anything without your permission.
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <button
              type="button"
              onClick={goBack}
              disabled={stepIndex === 0}
              className="flex h-11 items-center gap-2 rounded-[9px] border border-[#e0e4ef] bg-white px-4 text-[13px] font-extrabold text-black transition hover:bg-[#f8f9fc] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ArrowLeft size={16} strokeWidth={2.45} />
              Back
            </button>
            <div className="hidden items-center gap-2 sm:flex">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  aria-label={`Go to ${step.label}`}
                  onClick={() => setStepIndex(index)}
                  className={`h-2.5 rounded-full transition-all ${index === stepIndex ? "w-8 bg-[#4b3cff]" : "w-2.5 bg-[#dfe3ee]"}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={goNext}
              className="flex h-11 items-center gap-2 rounded-[9px] bg-[#4b3cff] px-5 text-[13px] font-extrabold text-white shadow-[0_16px_35px_rgba(75,60,255,0.22)] transition hover:bg-[#3f32e6]"
            >
              {isFinalStep ? "Go to dashboard" : "Next"}
              <ArrowRight size={16} strokeWidth={2.45} />
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}
