"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  BookOpenCheck,
  Bot,
  Check,
  CircleDollarSign,
  CircleHelp,
  Clock3,
  CreditCard,
  Database,
  EyeOff,
  FileText,
  Files,
  Flame,
  GraduationCap,
  Heart,
  History,
  Languages,
  ListChecks,
  MessageCircle,
  MousePointerClick,
  Network,
  PanelsTopLeft,
  PlayCircle,
  Rocket,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Terminal,
  TrendingDown,
  TrendingUp,
  UserRoundCheck,
  WandSparkles,
  Zap,
  X,
  Gift,
  Handshake,
  Users,
  Mail,
  Lock,
  Star,
  GitBranch,
  Tag,
  AlertTriangle,
  Frown,
  Bug,
  Sliders,
  Pencil,
  Send,
  MessageSquare,
} from "lucide-react";
import CopilotPlayground from "./components/CopilotPlayground";
const LIME = '#d4ff00';
const trustPoints = [
  { label: 'No flow builders', icon: PanelsTopLeft },
  { label: 'No condition boxes', icon: MousePointerClick },
  { label: 'No hours of setup', icon: Clock3 },
];

const comparisonRows = [
  ['Set triggers', 'Describe the outcome'],
  ['Add condition boxes', 'Replies ready'],
  ['Build flow branches', 'FAQ ready'],
  ['Connect nodes', 'Follow-up ready'],
  ['Create FAQ rules', 'Lead capture ready'],
  ['Test every path', 'Launch in minutes'],
];
 

const adaptiveSignals = [
  { label: 'Previous interactions', icon: History },
  { label: 'Interests', icon: Target },
  { label: 'Context', icon: Bot },
  { label: 'Uploaded knowledge', icon: Database },
];

const audienceGroups = [
  { label: 'Potential buyers', icon: UserRoundCheck },
  { label: 'Superfans', icon: Heart },
  { label: 'Silent followers', icon: EyeOff },
  { label: 'Losing interest', icon: TrendingDown },
];

const languages = ['English', 'French', 'Spanish', 'German', '+ more'];

const pulseItems = [
  { label: 'Productivity questions rising', icon: TrendingUp },
  { label: 'Story engagement slowing', icon: BarChart3 },
  { label: 'Coaching interest increasing', icon: TrendingUp },
];

const roadmapItems = [
  { label: 'Now', copy: 'Instagram comment to DM, FAQs, lead magnets, follow-ups, broadcasts.', icon: MessageCircle },
  { label: 'Next', copy: 'TikTok and YouTube workflows built with the same chat-first system.', icon: Rocket },
  { label: 'Always', copy: 'ManyChat outcomes with less setup, less wiring, and less maintenance.', icon: Sparkles },
];

const finalCtaItems = [
  { label: 'Same outcomes as ManyChat', icon: BadgeCheck },
  { label: 'Same features creators use', icon: ListChecks },
  { label: '10x simpler', icon: Zap },
  { label: 'Build by chatting', icon: MessageCircle },
];

function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string
  title: string
  body?: string
}) {
  return (
    <div className="mx-auto mb-14 max-w-4xl text-center">
      <p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-black/45">{eyebrow}</p>
      <h2 className="text-4xl font-black leading-[0.95] tracking-tight text-black md:text-6xl">
        {title}
      </h2>
      {body ? (
        <p className="mx-auto mt-6 max-w-2xl text-base font-semibold leading-7 text-black/60">{body}</p>
      ) : null}
    </div>
  );
}

function HeroSalesSection() {
  const interestSignals = [
    "Questions.",
    "Comments.",
    "Story replies.",
    "Collaboration requests.",
    "Interested followers.",
  ];

  const valueSteps = [
    {
      title: "Offer Recommended",
      subtitle: "Coaching Program",
      amount: "$497",
      time: "10:31 AM",
    },
    {
      title: "Payment Received",
      subtitle: "Paid securely via",
      amount: "$497",
      time: "10:32 AM",
      stripe: true,
    },
    {
      title: "Customer Onboarded",
      subtitle: "Welcome Sarah! You're all set.",
      time: "10:35 AM",
    },
  ];

  return (
    <section id="product" className="w-full scroll-mt-[68px] overflow-hidden bg-white pt-8 pb-10 lg:pt-10 lg:pb-12">
      <div className="flex w-full bg-white px-5 sm:px-8 lg:px-8">
        <div className="grid w-full gap-6 lg:grid-cols-[0.62fr_0.38fr] lg:items-center">
          <div className="select-none">
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="max-w-[720px] text-[3rem] font-black uppercase leading-[1.02] tracking-normal text-black sm:text-[4.2rem] lg:text-[4rem] xl:text-[4.45rem]"
              style={{ fontFamily: 'Impact, Haettenschweiler, "Arial Narrow", sans-serif' }}
            >
              Your audience is
              <br />
              already trying
              <br />
              to <span className="text-[#9fe800]">buy from you.</span>
            </motion.h1>

            <div className="mt-6 space-y-3">
              {interestSignals.map((signal) => (
                <div key={signal} className="flex items-center gap-4 text-base font-semibold leading-none text-black sm:text-lg">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#9be600] bg-[#f4ffd6] text-[#82d800]">
                    <Check className="h-3.5 w-3.5" strokeWidth={3.2} />
                  </span>
                  <span>{signal}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 max-w-[610px] space-y-3 text-base font-semibold leading-7 text-black">
              <p>
                TractionFlo acts like a digital salesperson for your audience.
                It identifies interested people, starts conversations, answers
                questions, recommends offers, collects payments and onboards customers.
              </p>
              <p>From first interaction to loyal customer.</p>
            </div>

            <a
              href="/signup"
              className="mt-5 inline-flex h-12 w-full max-w-[330px] items-center justify-center gap-3 rounded-[4px] bg-[#d4ff00] px-7 text-lg font-black text-black shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] transition hover:bg-[#b8e600]"
            >
              <span>Join Founding Access</span>
              <ArrowRight className="h-5 w-5" strokeWidth={3} />
            </a>

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[12px] font-semibold text-black">
              {["90 Days Free", "Founder Pricing Forever", "First 100 Founders Only"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border border-[#9be600] bg-[#f4ffd6] text-[#82d800]">
                    <Check className="h-3 w-3" strokeWidth={3.2} />
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-auto -mt-3 w-full max-w-[420px] lg:-mt-8 lg:max-w-[360px]"
          >
            <div className="rounded-[46px] bg-black p-2 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
              <div className="relative min-h-[570px] overflow-hidden rounded-[36px] bg-white px-5 pb-4 pt-7">
                <div className="absolute left-1/2 top-0 h-7 w-36 -translate-x-1/2 rounded-b-[20px] bg-black" />

                <div className="mb-4 flex items-center justify-between text-sm font-black text-black">
                  <span>9:41</span>
                  <svg
                    aria-hidden="true"
                    className="h-[13px] w-7 text-black"
                    fill="none"
                    viewBox="0 0 28 14"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect x="1" y="2.5" width="23" height="9" rx="4.5" stroke="currentColor" strokeWidth="1.8" />
                    <rect x="3.5" y="4.5" width="13.5" height="5" rx="2.5" fill="currentColor" />
                    <path d="M25 5.1h1.1c.7 0 1.2.6 1.2 1.9s-.5 1.9-1.2 1.9H25V5.1Z" fill="currentColor" />
                  </svg>
                </div>

                <div className="flex items-start gap-3">
                  <img
                    src="https://i.pravatar.cc/96?img=47"
                    alt="Sarah avatar"
                    className="h-10 w-10 rounded-full border border-black/10 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 text-lg font-black leading-none">Sarah</div>
                    <div className="flex items-center gap-3">
                      <div className="rounded-[9px] border border-black/10 bg-white px-3 py-2 text-[14px] font-semibold text-black/80">
                        Do you have pricing?
                      </div>
                      <span className="text-xs font-semibold text-black/35">10:31 AM</span>
                    </div>
                  </div>
                </div>

                <div className="my-2.5 flex justify-center text-[#9fe800]">
                  <ArrowRight className="h-5 w-5 rotate-90" strokeWidth={2.8} />
                </div>

                <div className="rounded-[16px] border border-black/10 bg-white p-3 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
                  <div className="flex gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d4ff00] text-sm font-black italic text-black">
                      TF
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="mb-3 text-base font-black">TractionFlo</p>
                      <p className="text-[14px] font-semibold leading-6 text-black">
                        Yes Sarah!<br />
                        Here&apos;s the best option for you.
                      </p>
                      <button className="mt-3 h-9 w-full rounded-[4px] border border-black/10 bg-white text-sm font-black" type="button">
                        View Offer
                      </button>
                    </div>
                  </div>
                </div>

                {valueSteps.map((step) => (
                  <div key={step.title}>
                    <div className="my-2 flex justify-center text-[#9fe800]">
                      <ArrowRight className="h-5 w-5 rotate-90" strokeWidth={2.8} />
                    </div>
                    <div className="grid grid-cols-[44px_1fr] gap-3">
                      <span className="mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-[#9be600] bg-[#f4ffd6] text-[#82d800]">
                        <Check className="h-5 w-5" strokeWidth={2.2} />
                      </span>
                      <div className="border-b border-black/[0.04] pb-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[14px] font-black leading-tight">{step.title}</p>
                            <p className="mt-1 text-[13px] font-semibold text-black/60">{step.subtitle}</p>
                          </div>
                          <span className="text-[11px] font-semibold text-black/30">{step.time}</span>
                        </div>
                        {step.amount ? <p className="mt-1 text-xl font-black leading-none">{step.amount}</p> : null}
                        {step.stripe ? (
                          <div className="mt-1.5 flex items-center gap-2 text-[13px] font-semibold text-black/55">
                            <span>Stripe</span>
                            <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[11px] font-black text-white">stripe</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function RealProblemSection() {
  const problemMessages = [
    { name: "Marcus", avatar: "https://i.pravatar.cc/160?img=12", text: "Can you share pricing?", width: "lg:w-[315px]" },
    { name: "David", avatar: "https://i.pravatar.cc/160?img=33", text: "Loved your story!", width: "lg:w-[265px]" },
    { name: "Jon", avatar: "https://i.pravatar.cc/160?img=11", text: "Let's work together", width: "lg:w-[300px]" },
    { name: "Ava", avatar: "https://i.pravatar.cc/160?img=47", text: "I'm ready to buy", width: "lg:w-[260px]" },
    { name: "Follower", text: "...", width: "w-[76px] lg:w-[88px]" },
  ];

  return (
    <section id="problem" className="w-full scroll-mt-[68px] overflow-hidden bg-white pt-8 pb-10 lg:pt-10 lg:pb-12">
      <div className="flex w-full flex-col bg-white px-5 sm:px-8 lg:px-10">
        <div className="mb-8 flex justify-center">
          <div className="rounded-[8px] border border-[#d4ff00]/55 bg-[#fbffe9] px-3 py-1.5 text-[12px] font-black uppercase leading-none tracking-tight text-[#7ed600] shadow-[0_0_0_4px_rgba(212,255,0,0.08)] sm:text-[13px]">
            The real problem
          </div>
        </div>

        <div className="grid w-full gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="select-none">
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05 }}
              className="max-w-[650px] text-[2.05rem] font-black leading-[1.08] tracking-tight text-black sm:text-5xl lg:text-[2.85rem]"
            >
              Most businesses don&apos;t
              <br />
              have a traffic problem.
              <br />
              <span className="mt-3 inline-block text-[#95e600] lg:whitespace-nowrap">They have a follow-up problem.</span>
            </motion.h2>

            <div className="mt-7 space-y-3 text-base font-semibold leading-none text-black/75 sm:text-lg">
              {[
                "Someone asks for pricing.",
                "Someone replies to a story.",
                "Someone wants to collaborate.",
                "Someone is ready to buy.",
                "Nobody follows up.",
              ].map((item) => (
                <div key={item} className="flex items-center gap-5">
                  <ArrowRight className="h-4 w-4 shrink-0 text-black/35" strokeWidth={2.5} />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              className="mt-8 flex items-center gap-5 text-[1.65rem] font-black leading-none text-red-600 sm:text-[1.7rem]"
            >
              <ArrowRight className="h-6 w-6 shrink-0" strokeWidth={2.8} />
              <span>Revenue walks away.</span>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mx-auto w-full max-w-[500px] select-none"
          >
            <div className="relative overflow-visible py-2">
              <div className="space-y-5">
                {problemMessages.map((message) => (
                  <div key={message.text} className="grid grid-cols-[56px_38px_minmax(0,1fr)] items-center sm:grid-cols-[70px_70px_minmax(0,1fr)] lg:grid-cols-[76px_70px_1fr]">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-white text-black/35 shadow-[0_4px_12px_rgba(0,0,0,0.12)] sm:h-16 sm:w-16 lg:h-[70px] lg:w-[70px]">
                      {message.avatar ? (
                        <img src={message.avatar} alt={`${message.name} avatar`} className="h-full w-full object-cover" />
                      ) : (
                        <Users className="h-7 w-7 text-black/35 sm:h-9 sm:w-9" strokeWidth={1.8} />
                      )}
                    </div>
                    <div className="relative h-px border-t-2 border-dashed border-black/20">
                      <ArrowRight
                        className="absolute right-[-8px] top-1/2 h-4 w-4 -translate-y-1/2 text-black/28"
                        strokeWidth={2.8}
                        aria-hidden="true"
                      />
                    </div>
                    <div className={`${message.width} max-w-full justify-self-start rounded-[12px] border border-black/10 bg-white px-4 py-3 text-base font-semibold leading-none text-black/80 shadow-[0_8px_20px_rgba(0,0,0,0.04)] sm:rounded-[14px] sm:px-6 sm:py-4 sm:text-xl lg:rounded-[16px] lg:px-6 lg:py-4 lg:text-[1.35rem]`}>
                      {message.text}
                    </div>
                  </div>
                ))}
              </div>

              <div className="relative ml-6 mt-3 h-14 w-px border-l-2 border-dashed border-black/20 sm:ml-8 sm:h-20 lg:ml-[35px] lg:h-9">
                <ArrowRight
                  className="absolute bottom-[-8px] left-1/2 h-4 w-4 -translate-x-1/2 rotate-90 text-black/28"
                  strokeWidth={2.8}
                  aria-hidden="true"
                />
              </div>
              <div className="ml-0 flex h-14 w-14 items-center justify-center rounded-full border border-red-500/15 bg-red-50 text-[2.35rem] font-black leading-none text-red-600 shadow-[0_0_0_10px_rgba(239,68,68,0.06)] sm:h-20 sm:w-20 sm:text-[2.8rem] lg:ml-[7px] lg:h-14 lg:w-14 lg:text-[2.1rem]">
                $
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function CustomerJourneySection() {
  const journeySteps = [
    { label: "Interested\nFollower", icon: Users },
    { label: "Conversation", icon: MessageCircle },
    { label: "Questions\nAnswered", icon: CircleHelp },
    { label: "Offer\nRecommended", icon: Tag },
    { label: "Payment", icon: CreditCard },
    { label: "Customer", icon: UserRoundCheck },
    { label: "Onboarding", icon: RefreshCw },
  ];

  return (
    <section id="workflows" className="w-full scroll-mt-[68px] overflow-hidden bg-white pt-8 pb-10 lg:pt-10 lg:pb-12">
      <div className="flex w-full flex-col justify-center bg-white px-5 sm:px-8 lg:px-8">
        <div className="mb-8 flex justify-center">
          <div className="rounded-[8px] border border-[#d4ff00]/55 bg-[#fbffe9] px-3 py-1.5 text-[12px] font-black uppercase leading-none tracking-tight text-[#7ed600] shadow-[0_0_0_4px_rgba(212,255,0,0.08)] sm:text-[13px]">
            One tool. Entire customer journey.
          </div>
        </div>

        <div className="overflow-x-auto pb-3 no-scrollbar">
          <div className="grid min-w-[760px] grid-cols-[repeat(13,auto)] items-start gap-x-3">
            {journeySteps.map((step, index) => {
              const Icon = step.icon;
              const lines = step.label.split("\n");

              return (
                <div key={step.label} className="contents">
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.04 }}
                    className="flex w-[88px] flex-col items-center text-center"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#d4ff00]/20 bg-[#f4ffd6] text-black shadow-[0_0_0_8px_rgba(212,255,0,0.08)]">
                      <Icon className="h-6 w-6" strokeWidth={2.2} />
                    </div>
                    <div className="mt-4 min-h-[44px] text-[13px] font-semibold leading-[1.35] text-black">
                      {lines.map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                    </div>
                  </motion.div>

                  {index < journeySteps.length - 1 ? (
                    <div className="mt-7 flex w-9 items-center justify-center" aria-hidden="true">
                      <div className="h-px w-full border-t border-dashed border-black/25" />
                      <ArrowRight className="-ml-2 h-3.5 w-3.5 shrink-0 text-black/45" strokeWidth={2.5} />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="mt-8 select-none"
        >
          <h2 className="text-2xl font-black leading-tight tracking-tight text-black sm:text-3xl">
            Every opportunity moves forward.
          </h2>

          <div className="mt-7 space-y-3 text-base font-semibold text-black/75">
            {[
              "No more dropped conversations.",
              "No more missed buyers.",
              "No more opportunities disappearing.",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border border-[#9be600] bg-[#f4ffd6] text-[#82d800]">
                  <Check className="h-3 w-3" strokeWidth={3.2} />
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function ProductShowcaseSection() {
  const sidebarItems = [
    { label: "Inbox", icon: MessageCircle, active: true },
    { label: "Opportunities", icon: Target },
    { label: "Conversations", icon: MessageSquare },
    { label: "Offers", icon: Tag },
    { label: "Payments", icon: CreditCard },
    { label: "Customers", icon: Users },
    { label: "Broadcasts", icon: Send },
    { label: "Analytics", icon: BarChart3 },
    { label: "Settings", icon: Sliders },
  ];

  const inboxRows = [
    { name: "Sarah", preview: "Do you have pricing?", time: "2m", active: true, avatar: "https://i.pravatar.cc/96?img=47" },
    { name: "James", preview: "I'm interested in working together", time: "5m", avatar: "https://i.pravatar.cc/96?img=33" },
    { name: "Priya", preview: "Loved your content!", time: "15m", avatar: "https://i.pravatar.cc/96?img=32" },
    { name: "Miko", preview: "Can you tell me more?", time: "30m", avatar: "https://i.pravatar.cc/96?img=11" },
    { name: "Anna", preview: "I'm ready to get started", time: "1h", avatar: "https://i.pravatar.cc/96?img=49" },
  ];
  const sarahAvatar = inboxRows[0].avatar;

  return (
    <section id="showcase" className="w-full scroll-mt-[68px] overflow-hidden bg-white pt-8 pb-10 lg:pt-10 lg:pb-12">
      <div className="flex w-full flex-col overflow-hidden bg-white">
        <div className="mb-8 flex justify-center px-5 sm:px-8 lg:px-8">
          <div className="rounded-[8px] border border-[#d4ff00]/55 bg-[#fbffe9] px-3 py-1.5 text-[12px] font-black uppercase leading-none tracking-tight text-[#7ed600] shadow-[0_0_0_4px_rgba(212,255,0,0.08)] sm:text-[13px]">
            Product showcase
          </div>
        </div>

        <div className="grid w-full gap-7 px-5 sm:px-8 lg:grid-cols-[0.3fr_0.7fr] lg:gap-8 lg:pr-0">
          <div className="flex flex-col justify-center select-none">
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05 }}
              className="max-w-[430px] text-[2rem] font-black leading-[1.2] tracking-tight text-black sm:text-[2.35rem] lg:text-[1.85rem]"
            >
              Everything you need to turn conversations into customers.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mt-6 max-w-[360px] text-[15px] font-semibold leading-7 text-black/70"
            >
              Manage conversations, recommend offers, collect payments and onboard customers. All in one place.
            </motion.p>

            <motion.a
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              href="#demo"
              className="mt-6 inline-flex h-11 w-fit items-center justify-center gap-3 rounded-[4px] bg-[#d4ff00] px-6 text-sm font-black text-black shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] transition hover:bg-[#b8e600]"
            >
              <span>See TractionFlo in Action</span>
              <ArrowRight className="h-4 w-4" strokeWidth={3} />
            </motion.a>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="min-w-0 overflow-x-auto pb-2 no-scrollbar lg:flex lg:items-stretch lg:overflow-hidden lg:py-0"
          >
            <div className="lg:w-full lg:overflow-hidden">
            <div className="min-h-[520px] overflow-hidden rounded-[16px] border border-black/10 bg-white shadow-[0_10px_24px_rgba(0,0,0,0.05)] lg:w-full lg:rounded-none lg:border-y-0 lg:border-r-0">
              <div className="grid min-h-[520px] min-w-[860px] grid-cols-[115px_205px_minmax(320px,1fr)_220px] text-black">
                <aside className="border-r border-black/10 bg-[#fbfbf8] px-4 py-4">
                  <div className="mb-6 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#d4ff00] text-[9px] font-black text-black">TF</span>
                    <span className="text-[11px] font-black">Traction<span className="text-[#8fdc00]">Flo</span></span>
                  </div>

                  <div className="space-y-2">
                    {sidebarItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.label}
                          className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[9px] font-bold ${
                            item.active ? "bg-[#eefcc2] text-black" : "text-black/55"
                          }`}
                        >
                          <Icon className="h-3 w-3" strokeWidth={2.4} />
                          <span>{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </aside>

                <section className="border-r border-black/10 bg-white">
                  <div className="border-b border-black/10 px-4 py-4">
                    <h3 className="text-lg font-black leading-none">Inbox</h3>
                    <div className="mt-5 flex gap-5 text-[9px] font-black text-black/45">
                      {["All", "Unread", "DMs", "Comments", "Story Replies"].map((tab, index) => (
                        <span key={tab} className={index === 0 ? "text-[#85d600]" : ""}>
                          {tab}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="divide-y divide-black/[0.04]">
                    {inboxRows.map((row) => (
                      <div key={row.name} className={`flex items-center gap-3 px-4 py-3 ${row.active ? "bg-[#f8fde8]" : "bg-white"}`}>
                        <img
                          src={row.avatar}
                          alt={`${row.name} profile`}
                          className="h-7 w-7 shrink-0 rounded-full border border-black/10 object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-black leading-none">{row.name}</p>
                          <p className="mt-1 truncate text-[9px] font-semibold text-black/45">{row.preview}</p>
                        </div>
                        <span className="text-[9px] font-bold text-black/35">{row.time}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="border-r border-black/10 bg-white">
                  <div className="flex min-h-[64px] items-center gap-3 border-b border-black/10 px-4">
                    <img
                      src={sarahAvatar}
                      alt="Sarah profile"
                      className="h-8 w-8 rounded-full border border-black/10 object-cover"
                    />
                    <div>
                      <p className="text-[12px] font-black leading-none">Sarah</p>
                      <p className="mt-1 text-[9px] font-bold text-black/40">10:31 AM</p>
                    </div>
                  </div>

                  <div className="space-y-3 px-5 py-5">
                    <div className="w-fit rounded-[9px] border border-black/10 bg-white px-4 py-2 text-[11px] font-semibold text-black/75">
                      Do you have pricing?
                    </div>
                    <div className="ml-auto max-w-[230px] rounded-[10px] bg-[#f0f8cb] px-4 py-3 text-[11px] font-semibold leading-5 text-black">
                      Yes Sarah!<br />
                      Here&apos;s the best option for you.
                    </div>
                    <div className="ml-auto w-[210px] rounded-[10px] border border-black/10 bg-white p-4 shadow-sm">
                      <p className="text-[11px] font-black">Coaching Program</p>
                      <p className="mt-2 text-xl font-black">$497</p>
                      <div className="mt-3 space-y-1.5 text-[9px] font-bold text-black/45">
                        <p className="flex items-center gap-1.5"><Check className="h-3 w-3 text-black/45" strokeWidth={3} /> 6 Weeks Program</p>
                        <p className="flex items-center gap-1.5"><Check className="h-3 w-3 text-black/45" strokeWidth={3} /> 1:1 Sessions</p>
                        <p className="flex items-center gap-1.5"><Check className="h-3 w-3 text-black/45" strokeWidth={3} /> Community Access</p>
                      </div>
                      <button className="mt-4 h-8 w-full rounded-[4px] bg-[#9fe800] text-[10px] font-black text-black" type="button">
                        View Offer
                      </button>
                    </div>
                  </div>
                </section>

                <aside className="bg-white px-4 py-4">
                  <div className="mb-4 flex items-center justify-end gap-4">
                    <button className="inline-flex h-7 items-center gap-2 rounded-[4px] bg-[#d4ff00] px-3 text-[9px] font-black text-black" type="button">
                      <MessageCircle className="h-3 w-3" strokeWidth={2.5} />
                      New Message
                    </button>
                    <span className="text-[10px] font-black text-black/35">4</span>
                    <img
                      src={sarahAvatar}
                      alt="Sarah profile"
                      className="h-7 w-7 rounded-full border border-black/10 object-cover"
                    />
                  </div>

                  <div className="rounded-[10px] border border-black/10 p-4">
                    <p className="text-[10px] font-black text-black/55">Customer Overview</p>
                    <div className="mt-4 flex items-center gap-3">
                      <img
                        src={sarahAvatar}
                        alt="Sarah profile"
                        className="h-8 w-8 rounded-full border border-black/10 object-cover"
                      />
                      <div>
                        <p className="text-[11px] font-black leading-none">Sarah</p>
                        <p className="mt-1 text-[9px] font-semibold text-black/40">New Customer</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-[10px] border border-black/10 p-4">
                    <p className="text-[10px] font-black text-black/55">Coaching Program</p>
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-lg font-black">$497</p>
                      <span className="rounded-full bg-[#e7ffd2] px-2 py-1 text-[9px] font-black text-green-700">Paid</span>
                    </div>
                    <p className="mt-2 text-[10px] font-black text-violet-600">Stripe</p>
                  </div>

                  <div className="mt-3 rounded-[10px] border border-black/10 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-black/55">Onboarding</p>
                      <p className="text-[9px] font-bold text-black/35">In Progress</p>
                    </div>
                    <p className="mt-5 text-[10px] font-black">Next Step</p>
                    <p className="mt-2 text-[10px] font-semibold text-black/55">Welcome Email</p>
                    <button className="mt-4 h-8 w-full rounded-[4px] border border-black/10 bg-white text-[10px] font-black" type="button">
                      Send Welcome
                    </button>
                  </div>
                </aside>
              </div>
            </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function OldWayVsTractionFloSection() {
  const oldTools = [
    {
      label: "Instagram",
      icon: (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white">
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden="true">
            <rect x="4.2" y="4.2" width="11.6" height="11.6" rx="3.4" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="10" cy="10" r="2.6" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="13.7" cy="6.5" r=".8" fill="currentColor" />
          </svg>
        </span>
      ),
    },
    {
      label: "ManyChat",
      icon: (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center text-black">
          <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
            <path
              d="M7.6 3.2c2.3-1.8 5.8-1.3 7.4 1.3 1.4 2.3.6 5.3-1.8 6.8-.7.4-1.3.7-2.1.8l-.2 2.1c-.1.7-.9 1-1.4.5l-1.8-1.9H7.2a4.8 4.8 0 0 1-4.6-5.7 4.9 4.9 0 0 1 5-3.9Z"
              fill="currentColor"
            />
            <path
              d="M5.3 9.2a4.6 4.6 0 0 0 5.6 4.5c-.5 1.4-1.9 2.5-3.6 2.5h-.9l-1.4 1.4c-.4.4-1 .2-1.1-.4l-.2-1.5a3.7 3.7 0 0 1-2-3.2 3.8 3.8 0 0 1 3.6-3.3Z"
              fill="currentColor"
            />
            <circle cx="8.1" cy="7.9" r="1" fill="white" />
            <circle cx="11.5" cy="7.9" r="1" fill="white" />
          </svg>
        </span>
      ),
    },
    {
      label: "CRM",
      icon: (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#d9ffe4] text-[#23a455]">
          <Database className="h-3.5 w-3.5" strokeWidth={2.4} />
        </span>
      ),
    },
    {
      label: "Calendly",
      icon: (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#dff1ff] text-[#2f91ff]">
          <span className="text-[14px] font-black leading-none">C</span>
        </span>
      ),
    },
    {
      label: "Stripe",
      icon: (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] bg-[#6c45ff] text-white">
          <span className="text-[13px] font-black leading-none">S</span>
        </span>
      ),
    },
    {
      label: "Email",
      icon: (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border border-slate-200 bg-slate-50 text-slate-400">
          <Mail className="h-3.5 w-3.5" strokeWidth={2.2} />
        </span>
      ),
    },
  ];

  const newFlow = [
    { label: "Find", icon: Search },
    { label: "Reach", icon: MessageCircle },
    { label: "Follow Up", icon: Send },
    { label: "Convert", icon: Check },
    { label: "Onboard", icon: Users },
  ];

  return (
    <section id="demo" className="w-full scroll-mt-[68px] overflow-hidden bg-white pt-8 pb-10 lg:pt-10 lg:pb-12">
      <div className="flex w-full flex-col bg-white px-5 sm:px-8 lg:px-8">
        <div className="mb-8 flex justify-center">
          <div className="rounded-[8px] border border-[#d4ff00]/55 bg-[#fbffe9] px-3 py-1.5 text-[12px] font-black uppercase leading-none tracking-tight text-[#7ed600] shadow-[0_0_0_4px_rgba(212,255,0,0.08)] sm:text-[13px]">
            Old way vs TractionFlo
          </div>
        </div>

        <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,0.43fr)_minmax(72px,0.07fr)_minmax(0,0.5fr)] lg:items-center">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="w-full select-none"
          >
            <p className="mb-3 text-sm font-black uppercase tracking-tight text-black">THE OLD WAY</p>

            <div className="grid w-full gap-5 sm:grid-cols-[170px_minmax(0,1fr)] sm:items-end">
              <div className="w-full rounded-[8px] border border-black/10 bg-white p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                <div className="space-y-2.5">
                  {oldTools.map((tool) => (
                    <div key={tool.label} className="flex items-center gap-3 text-[13px] font-semibold text-black">
                      {tool.icon}
                      <span>{tool.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 text-[11px] font-semibold text-black/75">
                {[
                  "Too many tools.",
                  "Too many logins.",
                  "Too many handoffs.",
                  "Too many opportunities lost.",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 whitespace-nowrap">
                    <X className="h-3.5 w-3.5 shrink-0 text-red-500" strokeWidth={3} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="relative flex h-12 items-center justify-center lg:h-32 lg:w-24" aria-hidden="true">
            <div className="absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-black/10 lg:block" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-black/10 bg-white text-sm font-black text-black shadow-[0_4px_18px_rgba(0,0,0,0.04)]">
              VS
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="w-full select-none"
          >
            <p className="mb-4 text-sm font-black uppercase tracking-tight text-black">THE NEW WAY</p>

            <div className="mb-6 flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d4ff00] text-lg font-black italic text-black shadow-[0_0_0_6px_rgba(212,255,0,0.12)]">
                TF
              </span>
              <span className="text-[1.85rem] font-extrabold leading-none tracking-tight text-black">
                Traction<span className="text-[#8dde00]">Flo</span>
              </span>
            </div>

            <div className="overflow-x-auto pb-2 no-scrollbar">
              <div className="flex w-full min-w-[500px] items-start justify-between gap-3 lg:min-w-0">
                {newFlow.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.label} className="contents">
                      <div className="flex w-[78px] flex-col items-center text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#d4ff00]/20 bg-[#f4ffd6] text-black shadow-[0_0_0_8px_rgba(212,255,0,0.08)]">
                          <Icon className="h-5.5 w-5.5" strokeWidth={2.3} />
                        </div>
                        <span className="mt-3 text-[13px] font-semibold leading-none text-black">{step.label}</span>
                      </div>
                      {index < newFlow.length - 1 ? (
                        <div className="mt-6 flex w-5 items-center justify-center" aria-hidden="true">
                          <ArrowRight className="h-3.5 w-3.5 text-black/35" strokeWidth={2.5} />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="mt-5 text-lg font-black leading-tight text-black">
              One platform. Everything in one place.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function WhoItsForSection() {
  const audiences = [
    { label: "Creators", icon: UserRoundCheck },
    { label: "Coaches", icon: Heart },
    { label: "Consultants", icon: BriefcaseBusiness },
    { label: "Agencies", icon: Handshake },
    { label: "Service Businesses", icon: Users },
    { label: "Course Creators", icon: GraduationCap },
    { label: "Digital Product Sellers", icon: CircleDollarSign },
    { label: "& More", icon: Sparkles },
  ];

  return (
    <section id="knowledge" className="w-full scroll-mt-[68px] overflow-hidden bg-white pt-8 pb-10 lg:pt-10 lg:pb-12">
      <div className="w-full bg-white px-5 sm:px-8 lg:px-8">
        <div className="mb-9 flex justify-center">
          <div className="rounded-[8px] border border-[#d4ff00]/55 bg-[#fbffe9] px-3 py-1.5 text-[12px] font-black uppercase leading-none tracking-tight text-[#7ed600] shadow-[0_0_0_4px_rgba(212,255,0,0.08)]">
            Who it&apos;s for
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-4 lg:gap-y-14">
          {audiences.map((audience, index) => {
            const Icon = audience.icon;
            return (
              <motion.div
                key={audience.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.035 }}
                className="flex flex-col items-center text-center"
              >
                <Icon className="h-9 w-9 text-black" strokeWidth={1.8} />
                <span className="mt-4 text-[15px] font-semibold leading-tight text-black">{audience.label}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FoundingAccessSection() {
  const leftPerks = [
    "90 Days Free",
    "Founder Pricing Forever",
    "Every Future Feature Included",
  ];
  const rightPerks = [
    "Direct Access To Product Feedback",
    "First 100 Founders Only",
  ];

  const perkClass = "flex items-center gap-3 text-base font-medium leading-tight text-white sm:text-lg lg:text-xl";

  return (
    <section id="pricing" className="w-full scroll-mt-[68px] overflow-hidden bg-black pt-10 pb-12 lg:pt-12 lg:pb-14">
      <div className="flex w-full flex-col justify-center bg-black px-6 text-white sm:px-10 lg:px-14 xl:px-16">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.05 }}
          className="max-w-[1280px] text-[clamp(3.4rem,5.4vw,6.1rem)] font-extrabold uppercase leading-[0.94] tracking-normal text-white"
        >
          Join before we launch.
        </motion.h2>

        <div className="mt-8 grid w-full max-w-[1120px] gap-x-16 gap-y-4 sm:grid-cols-2 xl:gap-x-24">
          {[leftPerks, rightPerks].map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-4">
              {group.map((perk) => (
                <div key={perk} className={perkClass}>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[#9be600] text-[#9be600]">
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                  <span>{perk}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-9 flex flex-col gap-5 sm:flex-row sm:items-center">
          <a
            href="/signup"
            className="inline-flex h-14 w-full max-w-[380px] items-center justify-center gap-4 rounded-[4px] bg-[#d4ff00] px-8 text-lg font-extrabold text-black shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] transition hover:bg-[#b8e600] sm:text-xl"
          >
            <span>Join Founding Access</span>
            <ArrowRight className="h-5 w-5" strokeWidth={3} />
          </a>
          <p className="text-base font-medium text-white sm:text-lg">No credit card required.</p>
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section id="final-cta" className="w-full scroll-mt-[68px] overflow-hidden bg-white pt-8 pb-10 sm:pt-10 sm:pb-12 lg:pt-12 lg:pb-14">
      <div className="flex w-full items-center bg-white px-5 sm:px-10 lg:px-14 xl:px-16">
        <div className="grid w-full min-w-0 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(190px,21vw)] md:items-center xl:gap-14">
          <div className="min-w-0 select-none">
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05 }}
              className="max-w-none whitespace-nowrap text-[1.6rem] font-extrabold uppercase leading-none tracking-normal text-black sm:text-[2.3rem] md:text-[clamp(2.6rem,4.35vw,5.05rem)]"
            >
              Stop losing customers.
            </motion.h2>

            <div className="mt-5 max-w-full space-y-2 text-base font-medium leading-snug text-black sm:mt-6 sm:space-y-3 sm:text-xl md:text-[clamp(1.1rem,1.5vw,1.8rem)]">
              <p>Your audience is already trying to buy from you.</p>
              <p>TractionFlo helps every opportunity move forward.</p>
            </div>

            <div className="mt-7 flex flex-col gap-4 sm:mt-8 sm:flex-row sm:items-center sm:gap-5">
              <a
                href="/signup"
                className="inline-flex h-14 w-full max-w-[380px] items-center justify-center gap-4 rounded-[4px] bg-[#d4ff00] px-6 text-base font-extrabold text-black shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] transition hover:bg-[#b8e600] sm:px-8 sm:text-xl"
              >
                <span>Join Founding Access</span>
                <ArrowRight className="h-5 w-5" strokeWidth={3} />
              </a>
              <p className="text-sm font-medium text-black sm:text-lg">No credit card required.</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="mx-auto flex h-44 w-64 items-center justify-center overflow-hidden sm:h-52 sm:w-72 md:h-[clamp(11rem,17vw,21rem)] md:w-[clamp(16rem,23vw,30rem)] md:justify-self-end"
            aria-hidden="true"
          >
            <svg className="h-full w-full" fill="none" viewBox="0 0 210 150" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M7 31C42 17 83 9 168 9C147 21 125 33 94 37L31 136L58 40C35 40 19 37 7 31Z"
                fill="black"
              />
              <path
                d="M99 52H183L140 79H83L99 52Z"
                fill="#9FE800"
              />
              <path
                d="M81 91H146L45 139L81 91Z"
                fill="#9FE800"
              />
            </svg>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const [autoStepOld, setAutoStepOld] = useState(-1);
  const [autoStepNew, setAutoStepNew] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    const fullText = "When someone comments GUIDE, send my PDF guide.";
    
    const runSequence = async () => {
      while (active) {
        if (!active) break;
        setAutoStepOld(-1);
        setAutoStepNew(0);
        setTypedText("");
        setIsThinking(false);
        setIsReady(false);
        
        await new Promise((r) => setTimeout(r, 1200));
        
        // PHASE 1: Old Way builder pain highlight sequence
        for (let i = 0; i < 5; i++) {
          if (!active) break;
          setAutoStepOld(i);
          await new Promise((r) => setTimeout(r, 800));
        }
        
        await new Promise((r) => setTimeout(r, 1200));
        
        // PHASE 2: New Way User Types Prompt
        if (!active) break;
        setAutoStepNew(0);
        
        for (let i = 0; i <= fullText.length; i++) {
          if (!active) break;
          setTypedText(fullText.slice(0, i));
          await new Promise((r) => setTimeout(r, 40));
        }
        
        await new Promise((r) => setTimeout(r, 1200));
        
        // PHASE 3: New Way Generative AI Figures logic
        if (!active) break;
        setAutoStepNew(1);
        setIsThinking(true);
        
        await new Promise((r) => setTimeout(r, 2200));
        
        // PHASE 4: New Way Automation Active & Launched
        if (!active) break;
        setIsThinking(false);
        setAutoStepNew(2);
        setIsReady(true);
        
        await new Promise((r) => setTimeout(r, 4500));
      }
    };
    
    runSequence();
    
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const smoothScroll = (targetY: number, duration = 800) => {
      const startY = window.scrollY || window.pageYOffset;
      const diff = targetY - startY;
      let start: number | null = null;

      const step = (timestamp: number) => {
        if (start === null) start = timestamp;
        const time = Math.min(1, (timestamp - start) / duration);
        const eased = easeInOutCubic(time);
        window.scrollTo(0, Math.round(startY + diff * eased));

        if (time < 1) requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest ? (target.closest('a') as HTMLAnchorElement | null) : null;
      if (!anchor) return;
      if (!anchor.hash) return;
      if (anchor.origin !== window.location.origin) return;

      const id = anchor.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const targetY = window.scrollY + rect.top - 68;
        smoothScroll(targetY, 850);
        history.pushState(null, '', '#' + id);
      }
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <main className="min-h-screen overflow-x-clip bg-white pt-[68px] text-black font-sans antialiased selection:bg-black selection:text-white">

      {/* 1. Header / Navigation Bar */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-black/[0.06] bg-white">
        <nav className="grid h-[68px] w-full grid-cols-[auto_1fr_auto] items-center gap-4 px-6 sm:px-10 lg:px-14 xl:px-20">
          <a href="#" className="inline-flex shrink-0 items-center gap-2" aria-label="TractionFlo home">
            <svg
              aria-hidden="true"
              className="h-8 w-10 shrink-0"
              fill="none"
              viewBox="0 0 46 32"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2 8.2C13.8 4.1 27.7 2.6 44 2.1C35.6 7.2 27.2 10.5 17.9 10.7L8.2 30L13.8 11C8.9 10.9 5.1 10 2 8.2Z"
                fill="black"
              />
              <path d="M19.8 14.4H36.8L27.8 20.4H15.2L19.8 14.4Z" fill="#9FE800" />
              <path d="M14.7 22.2H28.5L9.9 30.2L14.7 22.2Z" fill="#9FE800" />
            </svg>
            <span className="text-[21px] font-extrabold leading-none tracking-normal text-black">
              Traction<span className="text-[#9FE800]">Flo</span>
            </span>
          </a>

          <div className="hidden items-center justify-center gap-9 text-[11px] font-bold normal-case tracking-normal text-black lg:flex">
            <a href="#product" className="transition-colors hover:text-black/55">Features</a>
            <a href="#demo" className="transition-colors hover:text-black/55">How It Works</a>
            <a href="#workflows" className="transition-colors hover:text-black/55">Use Cases</a>
            <a href="#pricing" className="transition-colors hover:text-black/55">Pricing</a>
            <a href="#footer" className="transition-colors hover:text-black/55">About</a>
          </div>

          <a
            href="/signup"
            className="inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-[3px] bg-[#d4ff00] px-4 text-[11px] font-black tracking-normal text-black shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] transition hover:bg-[#b8e600] sm:px-5"
          >
            <span className="hidden sm:inline">Join Founding Access</span>
            <span className="sm:hidden">Join Access</span>
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
          </a>
        </nav>
      </header> 

      <HeroSalesSection />

      <RealProblemSection />

      <CustomerJourneySection />

      <ProductShowcaseSection />

      <OldWayVsTractionFloSection />

      {/* 4. The Real Problem Section */}
      <section aria-hidden="true" className="hidden">
        <div className="mx-auto max-w-7xl">
          
          <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
            
            {/* Left Column: Frustration Copy & List */}
            <div className="lg:col-span-5 flex flex-col items-start select-none">
              
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-4 inline-flex items-center gap-2 border border-red-500/25 bg-red-500/5 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] rounded-full text-red-500 shadow-sm"
              >
                <X className="h-3.5 w-3.5 shrink-0 rounded-full border border-red-500 p-[1.5px]" strokeWidth={3.5} />
                <span>THE REAL PROBLEM</span>
              </motion.div>
 
              <motion.h2
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-3xl font-black leading-[1.0] tracking-tight text-black sm:text-4xl lg:text-5xl"
              >
                Creators don&apos;t have <br />
                an automation problem. <br />
                They have a <span className="relative inline-block text-red-500">
                  setup
                  <span className="absolute left-0 right-0 bottom-1 h-[4px] bg-red-500/20 -z-10 rounded-full" />
                </span> problem.
              </motion.h2>
 
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="mt-3 text-sm font-bold leading-relaxed text-black/60"
              >
                Most tools make creators think like engineers. <br />
                Too many steps. Too much logic. Too easy to break.
              </motion.p>
 
              <div className="mt-5 space-y-2 w-full">
                {[
                  { title: "Complicated builders", desc: "Drag blocks. Add rules. Connect everything.", icon: Network },
                  { title: "Endless conditions & logic", desc: "If this, then that, unless this happens...", icon: GitBranch },
                  { title: "Hours configuring", desc: "What should take minutes turns into hours.", icon: Sliders },
                  { title: "Test every path", desc: "One tiny change can break everything.", icon: Bug },
                  { title: "Built for engineers, not creators", desc: "Powerful, but not made for the way you think.", icon: Frown }
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 5 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 + idx * 0.04 }}
                      whileHover={{ y: -1 }}
                      className="group flex items-center gap-3.5 px-3 py-2 border border-black/5 bg-white rounded-lg shadow-sm hover:border-black/10 hover:shadow transition-all duration-200"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500 border border-red-500/5 group-hover:scale-105 transition-transform duration-200">
                        <Icon className="h-4 w-4" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-500">
                            <X className="h-2.5 w-2.5" strokeWidth={4} />
                          </span>
                          <h4 className="text-[10px] font-black text-black uppercase tracking-wider truncate">{item.title}</h4>
                        </div>
                        <p className="text-[10px] font-semibold text-black/50 leading-none mt-0.5 truncate">{item.desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

               <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.35 }}
                className="mt-4 flex items-center gap-3 bg-red-500/5 border border-red-500/10 px-4 py-3 rounded-lg w-full"
              >
                <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                  <AlertTriangle className="h-4 w-4" strokeWidth={2.5} />
                </div>
                <div>
                  <h5 className="text-xs font-black text-red-600 uppercase tracking-wider leading-none">This creates friction.</h5>
                  <p className="text-[10px] font-semibold text-red-500 mt-1 leading-none">
                    Friction <span className="relative inline-block font-black text-red-600 border-b border-red-500/40 pb-0.5" style={{ fontFamily: 'var(--font-handwritten)', fontSize: '11px' }}>kills momentum.</span>
                  </p>
                </div>
              </motion.div>
            </div>

             <div className="lg:col-span-7 w-full flex flex-col items-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                whileHover={{ y: -4 }}
                className="w-full bg-white border border-black/10 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 relative"
              >
                {/* Header text */}
                <div className="flex items-center justify-between border-b border-black/5 pb-4 mb-6">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black/45">
                    WHAT IT LOOKS LIKE IN MOST TOOLS
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-[9px] font-black uppercase text-red-500 tracking-wider">Complex Flow</span>
                  </div>
                </div>

                {/* Canvas Box */}
                <div 
                  className="w-full overflow-x-auto no-scrollbar rounded-xl border border-black/10 bg-slate-50/[0.8] p-6 h-[475px] relative bg-grid-pattern shadow-inner"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  <style dangerouslySetInnerHTML={{__html: `
                    .no-scrollbar::-webkit-scrollbar {
                      display: none;
                    }
                    @keyframes flow-dash {
                      to {
                        stroke-dashoffset: -20;
                      }
                    }
                    .flow-active {
                      stroke-dasharray: 6, 4;
                      animation: flow-dash 1.2s linear infinite;
                    }
                  `}} />
                  {/* Absolute node wrapper to force full flowchart dimensions */}
                  <div className="w-[635px] h-[430px] relative select-none">
                    {/* SVG Connector lines */}
                    <svg className="absolute inset-0 w-[635px] h-[430px] pointer-events-none z-0">
                      <defs>
                        <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M 0 2 L 8 5 L 0 8 z" fill="#cbd5e1" />
                        </marker>
                        <marker id="arrow-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M 0 2 L 8 5 L 0 8 z" fill="#ef4444" />
                        </marker>
                        <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M 0 2 L 8 5 L 0 8 z" fill="#22c55e" />
                        </marker>
                      </defs>
                      
                      {/* IG Trigger -> Keyword Condition */}
                      <path d="M 170 45 L 185 45" fill="none" stroke="#cbd5e1" strokeWidth="2" className="flow-active" markerEnd="url(#arrow)" />
                      
                      {/* Keyword Condition -> YES -> SendDM */}
                      <path d="M 335 45 L 350 45" fill="none" stroke="#22c55e" strokeWidth="2" className="flow-active" markerEnd="url(#arrow-green)" />
                      
                      {/* Keyword Condition -> NO -> Wait 2 min */}
                      <path d="M 260 70 L 260 90 L 95 90 L 95 110" fill="none" stroke="#ef4444" strokeWidth="2" className="flow-active" markerEnd="url(#arrow-red)" />
                      
                      {/* Wait 2 min -> Add Tag */}
                      <path d="M 170 135 L 185 135" fill="none" stroke="#cbd5e1" strokeWidth="2" className="flow-active" markerEnd="url(#arrow)" />
                      
                      {/* Add Tag -> Condition Subscribed */}
                      <path d="M 260 160 L 260 180 L 95 180 L 95 200" fill="none" stroke="#cbd5e1" strokeWidth="2" className="flow-active" markerEnd="url(#arrow)" />
                      
                      {/* Condition Subscribed -> YES -> Send guide */}
                      <path d="M 170 225 L 185 225" fill="none" stroke="#22c55e" strokeWidth="2" className="flow-active" markerEnd="url(#arrow-green)" />
                      
                      {/* Condition Subscribed -> NO -> Ask to Subscribe */}
                      <path d="M 95 250 L 95 290" fill="none" stroke="#ef4444" strokeWidth="2" className="flow-active" markerEnd="url(#arrow-red)" />
                      
                      {/* Msg DM -> Condition Replied */}
                      <path d="M 500 45 L 510 45 L 510 90 L 425 90 L 425 110" fill="none" stroke="#cbd5e1" strokeWidth="2" className="flow-active" markerEnd="url(#arrow)" />
                      
                      {/* Condition Replied -> YES -> Send Guide */}
                      <path d="M 350 135 L 340 135 L 340 180 L 260 180 L 260 200" fill="none" stroke="#22c55e" strokeWidth="2" className="flow-active" markerEnd="url(#arrow-green)" />
                      
                      {/* Condition Replied -> NO -> End */}
                      <path d="M 500 135 L 515 135" fill="none" stroke="#ef4444" strokeWidth="2" className="flow-active" markerEnd="url(#arrow-red)" />
                      
                      {/* Send Guide -> Wait 1 day */}
                      <path d="M 335 225 L 350 225" fill="none" stroke="#cbd5e1" strokeWidth="2" className="flow-active" markerEnd="url(#arrow)" />
                      
                      {/* Wait 1 day -> Follow up */}
                      <path d="M 500 225 L 510 225 L 510 270 L 260 270 L 260 290" fill="none" stroke="#cbd5e1" strokeWidth="2" className="flow-active" markerEnd="url(#arrow)" />
                      
                      {/* Follow up -> Update source */}
                      <path d="M 260 340 L 260 380" fill="none" stroke="#cbd5e1" strokeWidth="2" className="flow-active" markerEnd="url(#arrow)" />
                      
                      {/* Update source -> Leads */}
                      <path d="M 335 405 L 350 405" fill="none" stroke="#cbd5e1" strokeWidth="2" className="flow-active" markerEnd="url(#arrow)" />
                    </svg>

                    {/* YES/NO Path Pill Labels */}
                    <div className="absolute left-[338px] top-[35px] bg-green-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm z-10 select-none">YES</div>
                    <div className="absolute left-[248px] top-[76px] bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm z-10 select-none">NO</div>
                    <div className="absolute left-[290px] top-[168px] bg-green-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm z-10 select-none">YES</div>
                    <div className="absolute left-[502px] top-[125px] bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm z-10 select-none">NO</div>
                    <div className="absolute left-[83px] top-[258px] bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm z-10 select-none">NO</div>
                    <div className="absolute left-[172px] top-[215px] bg-green-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm z-10 select-none">YES</div>

                    {/* Nodes Array Mapping */}
                    {[
                      { id: 1, label: "When...", desc: "New comment", icon: MessageCircle, bg: "from-yellow-400 via-pink-500 to-purple-500 text-white", style: "left-[20px] top-[20px] border-l-4 border-l-pink-500" },
                      { id: 2, label: "Condition", desc: "Keyword is GUIDE", icon: GitBranch, bg: "bg-blue-500/10 text-blue-600 border border-blue-500/10", style: "left-[185px] top-[20px]" },
                      { id: 3, label: "Send Message", desc: "Send DM", icon: MessageCircle, bg: "bg-green-500/10 text-green-600 border border-green-500/10", style: "left-[350px] top-[20px]" },
                      
                      { id: 4, label: "Wait", desc: "Wait 2 min", icon: Clock3, bg: "bg-amber-500/10 text-amber-600 border border-amber-500/10", style: "left-[20px] top-[110px]" },
                      { id: 5, label: "Add Tag", desc: "Interested", icon: Tag, bg: "bg-blue-500/10 text-blue-600 border border-blue-500/10", style: "left-[185px] top-[110px]" },
                      { id: 6, label: "Condition", desc: "User replied?", icon: GitBranch, bg: "bg-blue-500/10 text-blue-600 border border-blue-500/10", style: "left-[350px] top-[110px]" },
                      
                      { id: 7, label: "Condition", desc: "Subscribed?", icon: GitBranch, bg: "bg-blue-500/10 text-blue-600 border border-blue-500/10", style: "left-[20px] top-[200px]" },
                      { id: 8, label: "Send Message", desc: "Send guide", icon: MessageCircle, bg: "bg-green-500/10 text-green-600 border border-green-500/10", style: "left-[185px] top-[200px]" },
                      { id: 9, label: "Wait", desc: "Wait 1 day", icon: Clock3, bg: "bg-amber-500/10 text-amber-600 border border-amber-500/10", style: "left-[350px] top-[200px]" },
                      
                      { id: 10, label: "Send Message", desc: "Ask to subscribe", icon: MessageCircle, bg: "bg-green-500/10 text-green-600 border border-green-500/10", style: "left-[20px] top-[290px]" },
                      { id: 11, label: "Send Message", desc: "Follow up", icon: MessageCircle, bg: "bg-green-500/10 text-green-600 border border-green-500/10", style: "left-[185px] top-[290px]" },
                      { id: 12, label: "Send Message", desc: "Check this out", icon: MessageCircle, bg: "bg-green-500/10 text-green-600 border border-green-500/10", style: "left-[350px] top-[290px]" },
                      
                      { id: 13, label: "Update Field", desc: "Source: Instagram", icon: Database, bg: "bg-purple-500/10 text-purple-600 border border-purple-500/10", style: "left-[185px] top-[380px]" },
                      { id: 14, label: "Add to List", desc: "Leads", icon: Users, bg: "bg-indigo-500/10 text-indigo-600 border border-indigo-500/10", style: "left-[350px] top-[380px]" },
                      { id: 15, label: "End", desc: "", icon: CircleHelp, bg: "bg-red-500/10 text-red-600 border border-red-500/10", style: "left-[515px] top-[110px] w-[100px]" }
                    ].map((node) => {
                      const Icon = node.icon;
                      return (
                        <div
                          key={node.id}
                          className={`absolute ${node.style} w-[150px] h-[50px] bg-white border border-black/10 p-2 flex items-center gap-2 rounded-lg shadow-sm hover:border-black/25 hover:shadow transition-all duration-200 z-10`}
                        >
                          <div className={`h-6.5 w-6.5 rounded flex items-center justify-center shrink-0 ${node.bg}`}>
                            <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-[7.5px] font-black uppercase text-black/40 leading-none truncate">{node.label}</p>
                            {node.desc ? (
                              <p className="text-[8.5px] font-black text-black leading-none mt-1 truncate">{node.desc}</p>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                 <div className="mt-6 pt-5 border-t border-black/5 flex flex-wrap gap-2.5 justify-center">
                  {[
                    "Too many steps",
                    "Hard to maintain",
                    "Easy to break",
                    "Impossible to scale"
                  ].map((tag, idx) => (
                    <motion.div
                      key={tag}
                      initial={{ opacity: 0, y: 5 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 + idx * 0.05 }}
                      whileHover={{ y: -1 }}
                      className="inline-flex items-center gap-1.5 border border-red-500/15 bg-red-500/5 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider text-red-500 select-none shadow-sm hover:border-red-500/25 transition-colors"
                    >
                      <X className="h-3 w-3 shrink-0 rounded-full border border-red-500 p-[0.5px]" strokeWidth={3.5} />
                      <span>{tag}</span>
                    </motion.div>
                  ))}
                </div>

              </motion.div>
            </div>

          </div>

        </div>
      </section>
 
       <section aria-hidden="true" className="hidden">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          
           <div className="mx-auto mb-14 max-w-4xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 border border-black bg-[#d4ff00] px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-full text-black shadow-sm">
              <Zap className="h-3.5 w-3.5 text-black" />
              <span>THE NEW WAY</span>
            </div>
            <h2 className="text-4xl font-black leading-[0.95] tracking-tight text-black md:text-6xl mt-2">
              Meet <span className="relative inline-block text-black">
                Chat-First Automation
                <span className="absolute left-0 right-0 bottom-2 h-[6px] bg-[#d4ff00]/70 -z-10 rounded-full" />
              </span>.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base font-bold leading-relaxed text-black/60">
              Stop wiring builders. <br />
              Just describe what you want.
            </p>
          </div>

           <div className="grid gap-8 lg:grid-cols-12 lg:items-stretch mt-10 max-w-6xl mx-auto">
            
             <div className="lg:col-span-5 flex flex-col justify-between border border-black/10 bg-white p-6 rounded-2xl shadow-sm hover:border-black/20 hover:shadow transition-all duration-300">
              <div>
                
                <div className="inline-flex items-center gap-1.5 border border-red-500/25 bg-red-500/5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider text-red-500">
                  <X className="h-3 w-3 shrink-0 rounded-full border border-red-500 p-[1px]" strokeWidth={3.5} />
                  <span>THE OLD WAY</span>
                </div>
                
                <h3 className="text-sm font-black text-black/45 mt-3 mb-6 uppercase tracking-wider">Complex. Manual. Time-consuming.</h3>
                
                <div className="space-y-2 flex flex-col items-center w-full">
                  {[
                    { id: 1, title: "Build trigger", icon: Zap },
                    { id: 2, title: "Add conditions", icon: GitBranch },
                    { id: 3, title: "Connect FAQs", icon: MessageCircle },
                    { id: 4, title: "Test flows", icon: Bug },
                    { id: 5, title: "Fix broken logic", icon: Sliders }
                  ].map((step, idx) => {
                    const Icon = step.icon;
                    const isActive = idx <= autoStepOld;
                    return (
                      <div key={idx} className="flex flex-col items-center w-full">
                        <motion.div 
                          animate={{
                            scale: isActive ? 1.01 : 0.99,
                            borderColor: isActive ? "rgba(239, 68, 68, 0.3)" : "rgba(0, 0, 0, 0.05)",
                            backgroundColor: isActive ? "rgba(239, 68, 68, 0.04)" : "rgba(0, 0, 0, 0.02)"
                          }}
                          className="w-full p-3 border rounded-xl flex items-center gap-3 transition-all duration-300"
                        >
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300 ${isActive ? "border-red-500 bg-red-500 text-white" : "border-black/10 bg-black/5 text-black/30"}`}>
                            <span className="text-[9px] font-black">{step.id}</span>
                          </div>
                          <div className={`h-6 w-6 rounded flex items-center justify-center shrink-0 border transition-all duration-300 ${isActive ? "border-red-500/25 bg-red-500/10 text-red-500" : "border-black/10 bg-black/5 text-black/30"}`}>
                            <Icon className="h-3 w-3" strokeWidth={2.5} />
                          </div>
                          <h4 className={`text-[10px] font-black uppercase tracking-wider transition-colors duration-300 ${isActive ? "text-black" : "text-black/30"}`}>{step.title}</h4>
                        </motion.div>
                        {idx < 4 ? (
                          <svg className={`w-4 h-4 my-1 transition-colors duration-300 ${isActive ? "text-red-500/60" : "text-black/15"}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path d="M12,5 L12,19 M5,12 L12,19 L19,12" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
               <div className="mt-8">
                <div className="flex gap-2 justify-center border-t border-black/5 pt-5 flex-wrap">
                  {[
                    "Too many steps",
                    "Hard to maintain"
                  ].map((tag, tagIdx) => {
                    const isFlashed = autoStepOld === 4;
                    return (
                      <motion.div 
                        key={tagIdx}
                        animate={isFlashed ? {
                          scale: [1, 1.05, 1],
                          borderColor: ["rgba(239, 68, 68, 0.15)", "rgba(239, 68, 68, 0.6)", "rgba(239, 68, 68, 0.15)"],
                          backgroundColor: ["rgba(239, 68, 68, 0.05)", "rgba(239, 68, 68, 0.15)", "rgba(239, 68, 68, 0.05)"]
                        } : {}}
                        transition={isFlashed ? { repeat: Infinity, duration: 1.2, delay: tagIdx * 0.2 } : {}}
                        className="inline-flex items-center gap-1.5 border border-red-500/15 bg-red-500/5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider text-red-500"
                      >
                        <X className="h-2.5 w-2.5 shrink-0 rounded-full border border-red-500 p-[0.5px]" strokeWidth={3.5} />
                        <span>{tag}</span>
                      </motion.div>
                    );
                  })}
                </div>
                <div className="mt-4 text-center">
                  <span className="text-sm font-black text-black/45 tracking-wider rotate-[-2deg] inline-block" style={{ fontFamily: 'var(--font-handwritten)' }}>
                    Setup is the blocker.
                  </span>
                </div>
              </div>
            </div>
             <div className="lg:col-span-2 flex flex-col items-center justify-center py-6 lg:py-0 select-none">
               <div className="flex flex-col items-center gap-2.5 text-center">
                 <svg className="w-12 h-10 text-black hidden lg:block" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 40 24">
                  <path d="M5,12 L35,12" strokeLinecap="round" />
                  <polygon points="35,12 28,7 28,17" fill="currentColor" stroke="none" />
                </svg>
                <svg className="w-8 h-12 text-black lg:hidden" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 40">
                  <path d="M12,5 L12,35" strokeLinecap="round" />
                  <polygon points="12,35 7,28 17,28" fill="currentColor" stroke="none" />
                </svg>
                <p className="text-xs font-black text-black tracking-wide max-w-[120px] leading-snug rotate-[-3deg]" style={{ fontFamily: 'var(--font-handwritten)' }}>
                  TractionFlo removes the setup maze.
                </p>
              </div>
            </div>

            {/* Right Card: THE NEW WAY */}
            <div 
              className="lg:col-span-5 flex flex-col justify-between border-2 border-black bg-white p-6 rounded-2xl shadow-[6px_6px_0px_#000] hover:shadow-[8px_8px_0px_#000] transition-all duration-300 relative overflow-hidden"
            >
              {/* Subtle background glow */}
              <div className="absolute -top-16 -right-16 w-32 h-32 bg-[#d4ff00]/10 rounded-full blur-2xl pointer-events-none" />
              
              {/* Automated Active Stamp Overlay */}
              {/* <AnimatePresence>
                {isReady && (
                  <motion.div
                    initial={{ scale: 0, rotate: 15, opacity: 0 }}
                    animate={{ scale: 1.05, rotate: -4, opacity: 1 }}
                    exit={{ scale: 0, rotate: 15, opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[0.5px] z-30"
                  >
                    <div 
                      className="border-4 border-black px-6 py-3.5 text-2xl font-black tracking-widest uppercase shadow-2xl rotate-[-3deg] select-none"
                      style={{ backgroundColor: LIME, color: 'black', fontFamily: 'var(--font-handwritten)' }}
                    >
                      Active & Autopilot!
                    </div>
                  </motion.div>
                )}
              </AnimatePresence> */}
              
              <div>
                {/* Badge */}
                <div className="inline-flex items-center gap-1.5 border border-black bg-[#d4ff00] px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider text-black">
                  <Check className="h-3 w-3 shrink-0 rounded-full border border-black p-[1px]" strokeWidth={3.5} />
                  <span>THE NEW WAY</span>
                </div>
                
                <h3 className="text-sm font-black text-black mt-3 mb-6 uppercase tracking-wider">Simple. Fast. Built for creators.</h3>
                
                {/* Steps Sequence */}
                <div className="space-y-2.5 flex flex-col items-center w-full relative z-10">
                  {[
                    { id: 1, title: "Describe your goal", desc: "In plain English.", icon: Pencil },
                    { id: 2, title: "AI understands", desc: "TractionFlo figures out the logic, content and flow.", icon: Sparkles },
                    { id: 3, title: "Automation ready", desc: "Your system is live and working.", icon: Check }
                  ].map((step, idx) => {
                    const Icon = step.icon;
                    const isActive = autoStepNew === idx;
                    return (
                      <div key={idx} className="flex flex-col items-center w-full">
                        <motion.div
                          animate={{
                            scale: isActive ? 1.01 : 0.99,
                            borderColor: isActive ? "#000000" : "rgba(0, 0, 0, 0.08)",
                            backgroundColor: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.6)"
                          }}
                          className={`w-full p-4 border rounded-xl flex items-start gap-4 transition-all duration-300 cursor-pointer ${isActive ? "shadow-[3px_3px_0px_rgba(0,0,0,1)] border-black" : "shadow-sm border-black/10"}`}
                        >
                          <div 
                            className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300 ${isActive ? "border-black text-black" : "border-black/10 text-black/40"}`}
                            style={isActive ? { backgroundColor: LIME } : undefined}
                          >
                            <span className="text-[10px] font-black">{step.id}</span>
                          </div>
                          <div 
                            className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-300 ${isActive ? "border-black text-black" : "border-black/10 text-black/40"}`}
                            style={isActive ? { backgroundColor: LIME } : undefined}
                          >
                            <Icon className="h-4.5 w-4.5" strokeWidth={2.5} />
                          </div>
                          <div className="flex-1 text-left">
                            <h4 className={`text-xs font-black uppercase tracking-wider ${isActive ? "text-black" : "text-black/40"}`}>{step.title}</h4>
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ 
                                height: isActive ? "auto" : 0, 
                                opacity: isActive ? 1 : 0,
                                marginTop: isActive ? 4 : 0
                              }}
                              className="overflow-hidden"
                              transition={{ duration: 0.2 }}
                            >
                              <p className="text-[10px] font-semibold text-black/50 leading-relaxed">
                                {step.desc}
                              </p>
                              
                              {/* Step 1 custom text typing simulator */}
                              {idx === 0 && (
                                <div className="mt-2.5 border border-black/15 bg-black/[0.02] p-2.5 rounded-lg flex items-center gap-2 shadow-inner">
                                  <div className="flex-1 text-[10px] font-bold text-black/75 text-left pr-4 min-h-[16px] flex items-center leading-normal">
                                    {typedText || <span className="text-black/30 font-semibold">Type what you want...</span>}
                                    {autoStepNew === 0 && (
                                      <span className="inline-block w-1 h-3 bg-black animate-pulse ml-0.5" />
                                    )}
                                  </div>
                                  <Send className="h-3 w-3 text-black/35 shrink-0" />
                                </div>
                              )}
                              
                              {/* Step 2 generative analysis bar */}
                              {idx === 1 && isThinking && (
                                <div className="mt-2.5 flex items-center gap-2 bg-[#d4ff00]/10 border border-[#d4ff00]/25 p-2 rounded-lg">
                                  <Sparkles className="h-3.5 w-3.5 text-black animate-spin shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="h-1 w-full bg-black/10 rounded-full overflow-hidden">
                                      <motion.div 
                                        initial={{ width: "0%" }}
                                        animate={{ width: "100%" }}
                                        transition={{ duration: 1.8, ease: "easeInOut" }}
                                        className="h-full bg-black" 
                                      />
                                    </div>
                                    <p className="text-[7.5px] font-black uppercase text-black/55 tracking-wider mt-1 leading-none">Generative Engine building...</p>
                                  </div>
                                </div>
                              )}
                              
                              {/* Step 3 active confirmation pill */}
                              {idx === 2 && isReady && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 3 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="mt-2.5 flex items-center gap-1.5 bg-[#007257]/10 border border-[#007257]/20 text-[#007257] px-2.5 py-1.5 rounded-lg text-[8.5px] font-black uppercase tracking-wider w-fit"
                                >
                                  <Check className="h-3 w-3 text-[#007257]" strokeWidth={4} />
                                  <span>Flow Active & Live ✓</span>
                                </motion.div>
                              )}
                            </motion.div>
                          </div>
                        </motion.div>
                        {idx < 2 ? (
                          <svg 
                            className="w-4 h-4 my-1 transition-colors duration-300" 
                            style={isActive ? { color: LIME } : { color: 'rgba(0,0,0,0.15)' }} 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth={2.5} 
                            viewBox="0 0 24 24"
                          >
                            <path d="M12,5 L12,19 M5,12 L12,19 L19,12" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Tags */}
              <div className="mt-8">
                <div className="border-t border-black/5 pt-5 text-center">
                  <div className="inline-flex items-center gap-1.5 border border-black bg-[#d4ff00] px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider text-black shadow-sm">
                    <Check className="h-3 w-3 shrink-0 rounded-full border border-black p-[0.5px]" strokeWidth={3.5} />
                    <span>No builders. No chaos. Just results.</span>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <span className="text-sm font-black text-black tracking-wider rotate-[-1deg] inline-block" style={{ fontFamily: 'var(--font-handwritten)' }}>
                    Talk it. We build it.
                  </span>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      

  

      <WhoItsForSection />

      <FoundingAccessSection />

      <FinalCtaSection />

      {/* Old founding access block retained off-canvas while the reference-matched section replaces it. */}
      <section aria-hidden="true" className="hidden">
        {/* Subtle decorative grid background overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />

        <div className="mx-auto max-w-7xl relative z-10">
          
          {/* Section Header */}
          <div className="mx-auto mb-14 max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-4 inline-flex items-center gap-2 border border-black/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-full bg-white shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5 text-black/60" />
              <span>LIMITED FOUNDING ACCESS</span>
            </motion.div>
            <h2 className="text-4xl font-black leading-[0.95] tracking-tight text-black md:text-6xl lg:text-[clamp(3.5rem,5.5vw,6rem)] mt-2">
              Be an early founder. <br />
              <span className="inline-block relative mt-2">
                Not just another user.
                <span className="absolute left-0 right-0 bottom-2.5 h-[6px] bg-[#d4ff00]/70 -z-10 rounded-full" />
              </span>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base font-semibold leading-7 text-black/65">
              Help shape TractionFlo. Get lifetime perks. Only available to the first few hundred creators.
            </p>
          </div>

          {/* Core Content Grid */}
          <div className="grid gap-12 lg:grid-cols-12 lg:items-start mt-16">
            
            {/* Left side: Grid of 6 Benefits Cards */}
            <div className="lg:col-span-7 flex flex-col items-center lg:items-start">
              {/* Green handwritten layout pointer */}
              <div className="flex items-center gap-2 mb-4 select-none self-start">
                <span className="text-[13px] font-black text-green-600 tracking-wider rotate-[-3deg]" style={{ fontFamily: 'var(--font-handwritten)' }}>
                  Founding members get more
                </span>
                <svg className="w-10 h-6 text-green-600 rotate-[-10deg]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 40 24">
                  <path d="M5,5 Q20,20 35,8" strokeLinecap="round" />
                  <polygon points="35,8 28,10 32,5" fill="currentColor" stroke="none" />
                </svg>
              </div>

              {/* 3x2 grid of cards */}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 w-full">
                {[
                  { title: "Lifetime Founding Price", desc: "Lock in the lowest price forever.", icon: CircleDollarSign },
                  { title: "Early Access to New Features", desc: "Try new features before anyone else.", icon: Star },
                  { title: "Exclusive Founding Perks", desc: "Special bonuses, only for founders.", icon: Gift },
                  { title: "Direct Access to the Team", desc: "Your feedback shapes the product.", icon: MessageCircle },
                  { title: "Build for Creators, by Us", desc: "We're building this with you.", icon: Heart },
                  { title: "Limited Spots Available", desc: "Once this batch is full, it's gone.", icon: Users }
                ].map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <div 
                      key={idx} 
                      className="group bg-white border border-black/10 rounded-xl p-5 text-left transition-all duration-300 hover:border-black/25 flex flex-col gap-2.5 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    >
                      <div className="h-9 w-9 rounded-full bg-[#d4ff00]/15 flex items-center justify-center text-black shrink-0 transition-transform duration-300 group-hover:scale-105">
                        <Icon className="h-4.5 w-4.5" strokeWidth={2.5} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-black leading-tight uppercase tracking-wider">{card.title}</h4>
                        <p className="mt-1 text-[11px] font-semibold text-black/50 leading-normal">{card.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right side: Sleek Conversion Form Card */}
            <div className="lg:col-span-5 w-full max-w-md mx-auto lg:mx-0">
              <div className="bg-white border-2 border-black p-8 shadow-[6px_6px_0px_rgba(0,0,0,1)] rounded-sm relative overflow-hidden flex flex-col justify-center text-left">
                <div className="absolute top-0 left-0 w-full h-[4px]" style={{ backgroundColor: LIME }} />
                
                {/* black category badge */}
                <div className="inline-block bg-black text-white text-[8px] font-black uppercase tracking-[0.2em] px-3.5 py-1.5 rounded-full select-none mb-4.5 w-fit">
                  JOIN THE FOUNDING BATCH
                </div>

                <h3 className="text-xl font-black text-black tracking-tight leading-tight">Join in 3 seconds.</h3>
                <p className="text-xs font-semibold text-black/45 mt-1 mb-6">No credit card. No hassle.</p>

                {/* Email Form */}
                <form 
                  onSubmit={(e) => { e.preventDefault(); alert("Thanks for your interest! We will reach out soon."); }} 
                  className="space-y-3.5"
                >
                  <div className="relative">
                    <input 
                      type="email" 
                      required 
                      placeholder="Enter your email address" 
                      className="w-full pl-4 pr-10 py-3 bg-black/[0.02] border border-black/15 focus:border-black rounded-sm text-xs font-bold placeholder-black/35 outline-none transition-colors" 
                    />
                    <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-black/35" />
                  </div>
                  <button 
                    type="submit" 
                    className="w-full bg-[#d4ff00] hover:bg-black hover:text-white border-2 border-black text-black font-black uppercase text-xs tracking-widest py-3.5 transition-all shadow-[4px_4px_0px_#000] hover:shadow-none active:translate-x-0.5 active:translate-y-0.5 cursor-pointer rounded-sm"
                  >
                    Get Founding Access →
                  </button>
                </form>

                {/* waitlist row */}
                <div className="mt-6 pt-5 border-t border-black/5 flex items-center justify-between flex-wrap gap-2.5">
                  <div className="flex items-center gap-2">
                    {/* Avatars */}
                    <div className="flex -space-x-2 shrink-0">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-6 w-6 rounded-full border-2 border-white bg-black/10 flex items-center justify-center text-[7px] font-black shrink-0 overflow-hidden">
                          <span>U{i}</span>
                        </div>
                      ))}
                    </div>
                    <span className="text-[10px] font-black text-black/60 uppercase tracking-wide">
                      1,247+ creators waitlisted
                    </span>
                  </div>
                  
                  {/* Spots filling handwritten text */}
                  <div className="flex flex-col items-center rotate-[-3deg] select-none">
                    <span className="text-xs font-black text-green-600 leading-none" style={{ fontFamily: 'var(--font-handwritten)' }}>
                      Spots are
                    </span>
                    <span className="text-xs font-black text-green-600 mt-0.5 border-b border-green-600/50 pb-0.5 leading-none" style={{ fontFamily: 'var(--font-handwritten)' }}>
                      filling fast!
                    </span>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Bottom Security & Info Row */}
          <div className="mt-16 pt-8 border-t border-black/10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left select-none max-w-5xl mx-auto">
            {[
              { label: "We respect your inbox", desc: "No spam. Only important updates.", icon: Lock },
              { label: "Built for creators", desc: "Not another complex tool.", icon: Zap },
              { label: "Your data is safe", desc: "We never share your information.", icon: BadgeCheck }
            ].map((badge, idx) => {
              const Icon = badge.icon;
              return (
                <div key={idx} className="flex items-center gap-3.5 bg-white border border-black/5 px-5 py-4 rounded-xl shadow-sm">
                  <div className="h-8.5 w-8.5 rounded-lg border border-black/10 bg-[#d4ff00]/10 flex items-center justify-center text-black shrink-0">
                    <Icon className="h-4 w-4" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-black text-black uppercase tracking-wider">{badge.label}</h5>
                    <p className="text-[10px] font-semibold text-black/45 mt-0.5 leading-normal">{badge.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom handwritten curve brand tagline */}
          <div className="mt-10 flex justify-center items-center gap-2 select-none">
            <span className="text-sm font-black text-green-600 tracking-wider rotate-[-1deg]" style={{ fontFamily: 'var(--font-handwritten)' }}>
              Less setup. More conversations.
            </span>
          </div>

        </div>
      </section>

      {/* 10. Multi-Language Showcase */}
 
      
    

      {/* 12. Roadmap Section */}
      {/* <section id="roadmap" className="scroll-mt-24 border-t border-black/10 px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="TractionFlo Roadmap"
            title="Future-proofing your growth engine."
            body="Our ongoing commits focus entirely on delivering outcomes quickly across all creator tools."
          />

          <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto mt-10">
            {roadmapItems.map(({ label, copy, icon: Icon }) => (
              <div key={label} className="flex flex-col justify-between border border-black p-8 bg-white shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-black/10 group-hover:bg-black transition-colors" />
                <div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-black mb-6" style={{ backgroundColor: LIME }}>
                    <Icon className="h-5.5 w-5.5 text-black" strokeWidth={2.5} />
                  </div>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-black/45">
                    {label}
                  </p>
                  <p className="text-xl font-black leading-snug tracking-tight">{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* Old final CTA retained off-canvas while the reference-matched section replaces it. */}
      <section aria-hidden="true" className="hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/[0.01] rounded-full blur-[120px] pointer-events-none" />

        <div className="mx-auto max-w-5xl border border-white/20 p-8 text-center md:p-16 bg-[#09090b] relative z-10 overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-[4px]" style={{ backgroundColor: LIME }} />

          <p className="mb-4 text-xs font-black uppercase tracking-[0.22em]" style={{ color: LIME }}>
            Final Call
          </p>
          <h2 className="mx-auto max-w-4xl text-4xl font-black leading-[0.95] tracking-tight md:text-6xl lg:text-7xl">
            Your audience is already active.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base font-bold leading-7 text-white/70 md:text-lg lg:text-xl">
            Do not turn social media growth into another manual full-time coding job. Describe what you want, upload once, and let automation drive your outcome.
          </p>

          <div className="mx-auto mt-10 grid max-w-3xl gap-3 text-left md:grid-cols-2">
            {finalCtaItems.map(({ label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 border border-white/10 p-4 font-black text-xs uppercase tracking-wider rounded-sm bg-white/5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-white/20 bg-white/10 text-white" style={{ backgroundColor: LIME }}>
                  <Icon className="h-4 w-4 text-black" strokeWidth={2.5} />
                </span>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <a
              href="/signup"
              className="inline-flex items-center gap-2 border border-black bg-white px-8 py-4.5 text-base font-black text-black hover:bg-black hover:text-white hover:border-white transition rounded-sm uppercase tracking-wider premium-glow"
              style={{ backgroundColor: LIME }}
            >
              Get Founding Access
              <ArrowRight className="h-4.5 w-4.5" strokeWidth={3} aria-hidden="true" />
            </a>
          </div>

          {/* Secure Meta Badge details */}
          <div className="mt-10 flex flex-wrap justify-center items-center gap-6 opacity-35">
            <span className="text-[10px] font-black uppercase tracking-widest">Official Partner Integrations</span>
            <div className="h-px w-8 bg-white/20" />
            <span className="text-[10px] font-black uppercase tracking-widest">Meta Business Partner</span>
            <div className="h-px w-8 bg-white/20" />
            <span className="text-[10px] font-black uppercase tracking-widest">TikTok Marketing Partner</span>
          </div>
        </div>
      </section>
 
    

      {/* 15. Footer */}
      <footer id="footer" className="border-t border-black/10 bg-white text-black">
        <div className="mx-auto grid min-h-12 max-w-[1180px] grid-cols-1 items-center gap-4 px-5 py-4 text-center sm:px-8 md:grid-cols-[1fr_auto_1fr] md:py-3">
          <a href="#" className="inline-flex items-center justify-center gap-2 md:justify-self-start" aria-label="TractionFlo home">
            <svg
              aria-hidden="true"
              className="h-5 w-7 shrink-0"
              fill="none"
              viewBox="0 0 46 32"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2 8.2C13.8 4.1 27.7 2.6 44 2.1C35.6 7.2 27.2 10.5 17.9 10.7L8.2 30L13.8 11C8.9 10.9 5.1 10 2 8.2Z"
                fill="black"
              />
              <path d="M19.8 14.4H36.8L27.8 20.4H15.2L19.8 14.4Z" fill="#9FE800" />
              <path d="M14.7 22.2H28.5L9.9 30.2L14.7 22.2Z" fill="#9FE800" />
            </svg>
            <span className="text-[15px] font-extrabold leading-none text-black">
              Traction<span className="text-[#9FE800]">Flo</span>
            </span>
          </a>

          <p className="text-[11px] font-semibold text-black/55">
            © 2024 TractionFlo. All rights reserved.
          </p>

          <nav className="flex flex-wrap items-center justify-center gap-x-10 gap-y-2 text-[11px] font-semibold text-black md:justify-self-end">
            <Link href="/privacy" className="transition-colors hover:text-black/55">Privacy Policy</Link>
            <Link href="/terms" className="transition-colors hover:text-black/55">Terms of Service</Link>
            <Link href="/contact" className="transition-colors hover:text-black/55">Contact</Link>
          </nav>
        </div>
      </footer>

    </main>
  );
}
