"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpenCheck,
  Bot,
  Check,
  CircleDollarSign,
  CircleHelp,
  Clock3,
  Database,
  EyeOff,
  FileText,
  Files,
  Flame,
  Globe2,
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
  Sparkles,
  Target,
  Terminal,
  TrendingDown,
  TrendingUp,
  UserRoundCheck,
  WandSparkles,
  Zap,
  X,
  ChevronDown,
} from "lucide-react";
import BrandLogo from "./components/BrandLogo";
import CopilotPlayground from "./components/CopilotPlayground";
import KnowledgeUploader from "./components/KnowledgeUploader";
import CreatorWorkflows from "./components/CreatorWorkflows";
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

const faqs = [
  {
    question: 'Is this only for Instagram?',
    answer:
      'TractionFlo starts with Instagram. TikTok and YouTube are on the roadmap so creators can keep the same simple workflow across more channels.',
  },
  {
    question: 'Does it answer PDFs?',
    answer:
      'Yes. Upload PDFs, pricing sheets, guides, FAQs, docs, or course material, and TractionFlo can use that knowledge inside replies.',
  },
  {
    question: 'Is this another chatbot?',
    answer:
      'No. It is an automation copilot for creator growth outcomes: comment replies, DMs, lead magnets, FAQs, broadcasts, and follow-ups.',
  },
  {
    question: 'Can I edit replies?',
    answer:
      'Yes. The goal is to generate the automation for you, then let you review and refine the replies before launch.',
  },
  {
    question: 'Can I use multiple languages?',
    answer:
      'Yes. TractionFlo is designed to understand the follower language and respond in that language automatically.',
  },
  {
    question: 'How fast can I launch?',
    answer:
      'Describe the outcome, attach the needed knowledge, review the generated setup, and launch without building a giant flow.',
  },
  {
    question: 'Do I need technical skills?',
    answer:
      'No. You build by chatting instead of wiring triggers, conditions, branches, and contact rules by hand.',
  },
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

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [showAfter, setShowAfter] = useState(false);

  const problemRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: problemRef,
    offset: ["start 85%", "center 20%"]
  });

  // Snap cards to green only after the card is fully visible on the screen and reaches the center
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest > 0.42) {
      setShowAfter(true);
    } else {
      setShowAfter(false);
    }
  });

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  useEffect(() => {
    const header = document.querySelector('header');
    const headerOffset = header ? header.getBoundingClientRect().height : 64;

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
        const targetY = window.scrollY + rect.top - headerOffset - 12;
        smoothScroll(targetY, 850);
        history.pushState(null, '', '#' + id);
      }
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <main className="min-h-screen overflow-x-clip bg-white text-black font-sans antialiased selection:bg-black selection:text-white">

      {/* 1. Header / Navigation Bar */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-black/10 bg-white/70 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 lg:px-8">
          <a href="#" className="inline-flex shrink-0 items-center">
            <BrandLogo className="h-9 w-36" preload sizes="144px" />
          </a>

          <div className="hidden items-center gap-8 text-xs font-black uppercase tracking-wider text-black/65 lg:flex">
            <a href="#product" className="hover:text-black transition-colors">Product</a>
            <a href="#problem" className="hover:text-black transition-colors">Inbox Difference</a>
            <a href="#demo" className="hover:text-black transition-colors">Demo</a>
            <a href="#workflows" className="hover:text-black transition-colors">Workflows</a>
            <a href="#examples" className="hover:text-black transition-colors">Outcomes</a>
            <a href="#knowledge" className="hover:text-black transition-colors">Knowledge</a>
            <a href="#faq" className="hover:text-black transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <button
              aria-label="Language selector"
              className="hidden h-9 w-9 items-center justify-center border border-black/15 bg-white text-black transition hover:border-black hover:bg-black hover:text-white md:inline-flex rounded-sm"
              type="button"
            >
              <Globe2 className="h-4.5 w-4.5" strokeWidth={2.5} aria-hidden="true" />
            </button>
            <a
              href="/signup"
              className="shrink-0 items-center gap-2 border border-black bg-black px-4 py-2 text-xs font-black text-white hover:bg-white hover:text-black transition sm:inline-flex rounded-sm tracking-wider uppercase premium-glow"
            >
              <span>Get Founding Access</span>
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            </a>
          </div>
        </nav>
      </header>

      {/* 2. Hero Section */}
      <section
        id="product"
        className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden px-5 pb-16 pt-28 lg:px-8 bg-grid-pattern"
      >
        {/* Floating gradient circles in background */}
        <div className="absolute top-[20%] left-[10%] w-[350px] h-[350px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[10%] w-[350px] h-[350px] bg-black/[0.02] rounded-full blur-[100px] pointer-events-none" />

        <div className="mx-auto max-w-6xl text-center z-10">

          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-6 inline-block border border-black px-4 py-2 text-center text-[10px] font-black uppercase tracking-[0.2em] rounded-sm shadow-sm"
            style={{ backgroundColor: LIME }}
          >
            Starting with Instagram. TikTok + YouTube coming next.
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-auto max-w-4xl text-[2.75rem] font-black leading-[0.9] tracking-tight text-black sm:text-6xl md:text-7xl lg:text-[ clamp(4.5rem,6.5vw,7.5rem)]"
          >
            Get the same Instagram <br className="hidden md:block" />
            growth outcomes.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-base font-bold leading-7 text-black/65 sm:text-lg md:text-xl lg:text-2xl"
          >
            Without learning complex automation tools. Same features. Same results.{" "}
            <span className="inline-block relative">
              10x simpler.
              <span className="absolute left-0 right-0 bottom-1 h-[3px] bg-black rounded-full" />
            </span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <a
              href="/signup"
              className="inline-flex w-full items-center justify-center gap-2 border border-black bg-black px-8 py-4.5 text-base font-black text-white hover:bg-white hover:text-black transition sm:w-auto lg:px-10 lg:py-5 lg:text-lg rounded-sm tracking-wider uppercase premium-glow"
            >
              Get Founding Access
              <ArrowRight className="h-4.5 w-4.5" strokeWidth={3} aria-hidden="true" />
            </a>
            <a
              href="#demo"
              className="inline-flex w-full items-center justify-center gap-2 border border-black px-8 py-4.5 text-base font-black text-black hover:bg-black hover:text-white transition sm:w-auto lg:px-10 lg:py-5 lg:text-lg rounded-sm tracking-wider uppercase bg-white/50 backdrop-blur-sm"
            >
              <PlayCircle className="h-4.5 w-4.5" strokeWidth={2.5} aria-hidden="true" />
              Watch Demo
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-12 flex flex-col items-center justify-center gap-4 text-xs font-black text-black/75 sm:flex-row sm:gap-10 lg:mt-16"
          >
            {trustPoints.map(({ label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 bg-white border border-black/10 px-5 py-2.5 rounded-full shadow-sm hover:border-black/35 transition-colors">
                <span className="flex h-7 w-7 items-center justify-center border border-black rounded-full" style={{ backgroundColor: LIME }}>
                  <Icon className="h-3.5 w-3.5 text-black" strokeWidth={3} />
                </span>
                <span className="uppercase tracking-wider text-[10px]">{label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 3. Sliding Testimonials Marquee */}
      <section className="border-y border-black overflow-hidden bg-black py-4.5 shrink-0 select-none">
        <div className="animate-marquee flex gap-12 text-white">
          {[1, 2].map((groupIndex) => (
            <div key={groupIndex} className="flex gap-16 items-center shrink-0">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-primary" style={{ backgroundColor: LIME }} />
                <span className="text-xs font-black uppercase tracking-widest text-white/50">Used by 1M+ creators</span>
              </div>
              <p className="text-sm font-bold uppercase tracking-wider">
                “We used TractionFlo to deliver 65,000+ lead PDFs in days...”
              </p>
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-primary" style={{ backgroundColor: LIME }} />
                <span className="text-xs font-black uppercase tracking-widest text-white/50">Natasha Willis</span>
              </div>
              <p className="text-sm font-bold uppercase tracking-wider">
                “My account grew by 15,000 active followers without flowbuilders!”
              </p>
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-primary" style={{ backgroundColor: LIME }} />
                <span className="text-xs font-black uppercase tracking-widest text-white/50">Giovanni Begossi</span>
              </div>
              <p className="text-sm font-bold uppercase tracking-wider">
                “No condition boxes or wires. I set up my giveaway inside DMs in 2 minutes.”
              </p>
            </div>
          ))}
        </div>
      </section>
      {/* 4. The Real Problem (Setup Pain - Before & After Cards) */}
      <section id="problem" className="scroll-mt-24 pt-10 pb-2 lg:px-4 bg-black/[0.01]">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Your inbox: a before & after"
            title="Less grind, more pay. Zero complexity."
            body="We compared typical, rigid automation platforms against the simple, conversational execution engine of TractionFlo."
          />
        </div>
      </section>

       <section 
        ref={problemRef}
        className="relative h-[95vh] px-5 bg-black/[0.01]"
      >
        <div className="sticky top-28 flex flex-col justify-center py-6">
          <div className="mx-auto max-w-7xl w-full relative">
            
            {/* Left Legacy Stickers (visible/highlighted when showAfter is false) */}
            <div className="hidden lg:block">
              {/* Sticker 1: TRIGGER HELL */}
              <motion.div
                animate={{ 
                  opacity: showAfter ? 0.15 : 1,
                  scale: showAfter ? 0.95 : 1,
                  y: [0, -6, 0]
                }}
                transition={{ 
                  opacity: { duration: 0.3 },
                  scale: { duration: 0.3 },
                  y: { repeat: Infinity, duration: 4, ease: "easeInOut" }
                }}
                className="absolute left-4 xl:left-12 top-[15%] -rotate-12 bg-black text-white border border-red-500 px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[4px_4px_0px_rgba(239,68,68,1)] rounded-md select-none z-20 cursor-default flex items-center gap-1.5"
              >
                <Flame className="h-4 w-4 text-red-500 fill-red-500 shrink-0" strokeWidth={2.5} />
                <span>TRIGGER HELL</span>
              </motion.div>

              {/* Sticker 2: RIGID FLOWS */}
              <motion.div
                animate={{ 
                  opacity: showAfter ? 0.15 : 1,
                  scale: showAfter ? 0.95 : 1,
                  y: [0, -6, 0]
                }}
                transition={{ 
                  opacity: { duration: 0.3 },
                  scale: { duration: 0.3 },
                  y: { repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.5 }
                }}
                className="absolute left-8 xl:left-24 top-[45%] rotate-6 bg-amber-400 border-2 border-black text-black px-4 py-2.5 text-xs font-black uppercase tracking-widest shadow-[4px_4px_0px_#000] rounded-sm select-none z-20 cursor-default flex items-center gap-1.5"
              >
                <Network className="h-4 w-4 text-black shrink-0" strokeWidth={2.5} />
                <span>RIGID FLOWS</span>
              </motion.div>

              {/* Sticker 3: COMPLEX CODE */}
              <motion.div
                animate={{ 
                  opacity: showAfter ? 0.15 : 1,
                  scale: showAfter ? 0.95 : 1,
                  y: [0, -6, 0]
                }}
                transition={{ 
                  opacity: { duration: 0.3 },
                  scale: { duration: 0.3 },
                  y: { repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1 }
                }}
                className="absolute left-2 xl:left-10 top-[75%] -rotate-3 bg-red-500 border border-black text-white px-4 py-2 text-xs font-black uppercase tracking-wider shadow-lg rounded-sm select-none z-20 cursor-default flex items-center gap-1.5"
              >
                <Terminal className="h-4 w-4 text-white shrink-0" strokeWidth={2.5} />
                <span>COMPLEX CODE</span>
              </motion.div>
            </div>

            {/* Right Next-Gen Stickers (visible/highlighted when showAfter is true) */}
            <div className="hidden lg:block">
              {/* Sticker 1: CHAT-FIRST */}
              <motion.div
                animate={{ 
                  opacity: showAfter ? 1 : 0.15,
                  scale: showAfter ? 1 : 0.95,
                  y: [0, -6, 0]
                }}
                transition={{ 
                  opacity: { duration: 0.3 },
                  scale: { duration: 0.3 },
                  y: { repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.2 }
                }}
                className="absolute right-4 xl:right-12 top-[15%] rotate-12 bg-black text-white border-2 border-[#d4ff00] px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[4px_4px_0px_#d4ff00] rounded-md select-none z-20 cursor-default flex items-center gap-1.5"
              >
                <MessageCircle className="h-4 w-4 text-[#d4ff00] shrink-0" strokeWidth={2.5} />
                <span>CHAT-FIRST</span>
              </motion.div>

              {/* Sticker 2: 2-MIN SETUP */}
              <motion.div
                animate={{ 
                  opacity: showAfter ? 1 : 0.15,
                  scale: showAfter ? 1 : 0.95,
                  y: [0, -6, 0]
                }}
                transition={{ 
                  opacity: { duration: 0.3 },
                  scale: { duration: 0.3 },
                  y: { repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.7 }
                }}
                className="absolute right-8 xl:right-24 top-[45%] -rotate-6 bg-[#007257] text-white border border-[#d4ff00] px-4 py-2.5 text-xs font-black uppercase tracking-widest shadow-lg rounded-sm select-none z-20 cursor-default flex items-center gap-1.5"
              >
                <WandSparkles className="h-4 w-4 text-[#d4ff00] shrink-0" strokeWidth={2} />
                <span>2-MIN SETUP</span>
              </motion.div>

              {/* Sticker 3: AI AUTOPILOT */}
              <motion.div
                animate={{ 
                  opacity: showAfter ? 1 : 0.15,
                  scale: showAfter ? 1 : 0.95,
                  y: [0, -6, 0]
                }}
                transition={{ 
                  opacity: { duration: 0.3 },
                  scale: { duration: 0.3 },
                  y: { repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1.2 }
                }}
                className="absolute right-2 xl:right-10 top-[75%] rotate-6 text-black px-4 py-2 text-xs font-black uppercase tracking-wider shadow-md border border-black select-none z-20 cursor-default flex items-center gap-1.5"
                style={{ backgroundColor: LIME }}
              >
                <Bot className="h-4 w-4 text-black shrink-0" strokeWidth={2.5} />
                <span>AI AUTOPILOT</span>
              </motion.div>
            </div>

            {/* Carousel Slider Card Wrapper */}
            <div className="w-full max-w-lg md:max-w-xl mx-auto overflow-hidden border border-black/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] bg-white relative z-10">
              
               <motion.div 
                animate={{ x: showAfter ? "-50%" : "0%" }}
                transition={{ type: "spring", stiffness: 90, damping: 15 }}
                className="flex w-[200%] h-[440px] md:h-[560px]"
              >
                {/* Card 1: The Old Way */}
                <div className="w-1/2 h-full flex flex-col justify-between p-8 bg-white relative shrink-0">
                  <div className="absolute top-0 left-0 w-full h-[4px] bg-black/15" />
                  
                  {/* Floating Legacy Stickers */}
                  <div className="absolute top-24 right-4 rotate-6 bg-black text-white border border-red-500 px-2.5 py-1 text-[8px] md:text-[9px] font-black uppercase tracking-wider shadow-md rounded-sm select-none z-10 flex items-center gap-1">
                    <Clock3 className="h-3 w-3 text-red-500 shrink-0" strokeWidth={2.5} />
                    <span>4-8 Hours Setup</span>
                  </div>
                  <div className="absolute bottom-24 left-4 -rotate-12 bg-red-500 border border-black text-white px-2.5 py-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-md rounded-sm select-none z-10 flex items-center gap-1">
                    <X className="h-3 w-3 text-white shrink-0 bg-red-600 rounded-full p-0.5" strokeWidth={3} />
                    <span>Legacy 1.0</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-black/40">The Old Way</span>
                    <h3 className="text-2xl font-black text-black mt-2 mb-6">All work and no play</h3>
                    <ul className="space-y-3.5">
                      {[
                        "Copy-pasting the same reply 417 times",
                        "Wiring together triggers, branches, and nodes",
                        "Losing premium hot leads in messy comment threads",
                        "Endless condition boxes for every single FAQ",
                        "Manually sorting commenter handles and tags",
                        "Zero sales generated while you sleep"
                      ].map((text, i) => (
                        <li key={i} className="flex items-start gap-3.5 border-b border-black/5 pb-2.5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-black bg-black/5 text-black rounded-sm">
                            <X className="h-3.5 w-3.5" strokeWidth={3} />
                          </span>
                          <span className="text-xs md:text-sm font-bold text-black/55">{text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-6 pt-4 border-t border-black/5">
                    <p className="text-xs font-semibold text-black/40">Typical setup takes 4-8 hours of testing pathways.</p>
                  </div>
                </div>

                {/* Card 2: TractionFlo Difference */}
                <div className="w-1/2 h-full flex flex-col justify-between p-8 bg-[#007257] text-white relative shrink-0">
                  <div className="absolute top-0 left-0 w-full h-[4px]" style={{ backgroundColor: LIME }} />
                  
                  {/* Floating New Method Stickers */}
                  <div className="absolute top-24 right-4 rotate-12 bg-black text-white border-2 border-[#d4ff00] px-2.5 py-1 text-[8px] md:text-[9px] font-black uppercase tracking-wider shadow-[2px_2px_0px_#d4ff00] rounded-sm select-none z-10">
                    ✨ 2 Mins Setup
                  </div>
                  <div className="absolute bottom-24 left-4 -rotate-6 text-black px-2.5 py-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-md rounded-sm border border-black select-none z-10" style={{ backgroundColor: LIME }}>
                    ⚡ AI Copilot
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: LIME }}>TractionFlo difference</span>
                    <h3 className="text-2xl font-black text-white mt-2 mb-6">Less grind and more pay</h3>
                    <ul className="space-y-3.5">
                      {[
                        "Describe the outcome and replies are instantly ready",
                        "Connected FAQ documents answer questions natively",
                        "Organized, categorized, and tagged hot leads",
                        "No condition boxes or rigid flow wiring required",
                        "Auto-detect follower languages and reply natively",
                        "Automated transactions capturing sales 24/7"
                      ].map((text, i) => (
                        <li key={i} className="flex items-start gap-3.5 border-b border-white/10 pb-2.5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-black text-black rounded-sm" style={{ backgroundColor: LIME }}>
                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                          </span>
                          <span className="text-xs md:text-sm font-bold text-white/90">{text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <p className="text-xs font-semibold" style={{ color: LIME }}>Get outcomes immediately. Setup takes less than 2 minutes.</p>
                  </div>
                </div>

              </motion.div>

            </div>
          </div>
        </div>
      </section>
 
      <section id="demo" className="scroll-mt-12 pt-24 pb-20 lg:pb-28 lg:px-2 border-t border-black/10 relative z-10 bg-white">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="TractionFlo Copilot"
            title="Describe the outcome. Launch in minutes."
            body="Type what automation you want in simple English. TractionFlo's generative engine parses the instruction, sets up files, and hooks leads automatically."
          />

          <div className="max-w-6xl mx-auto mt-10">
            <CopilotPlayground />
          </div>
        </div>
      </section>

      {/* 7. Creator Workflows Section */}
      <section id="workflows" className="scroll-mt-24 overflow-visible border-t border-black/10 px-5 py-24 lg:px-8 bg-[#f5f5f0]">
        <div className="mx-auto max-w-7xl overflow-visible">
          <CreatorWorkflows />
        </div>
      </section>

       <section id="examples" className="scroll-mt-24 border-t border-black/10 px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Comparison"
            title="Same power. Same outcome. 10x simpler."
            body="Creators already know the results they want. TractionFlo removes the wiring maze so you can jump from concept to active lead capture immediately."
          />
          <div className="max-w-4xl mx-auto overflow-hidden border border-black shadow-[0_12px_45px_rgba(0,0,0,0.04)]">
            <div className="grid grid-cols-2 border-b border-black bg-black text-white">
              <div className="border-r border-white/20 p-5 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Old Flowbuilders</span>
                <h3 className="text-lg font-black mt-2">Wiring Maze</h3>
              </div>
              <div className="p-5 flex flex-col justify-between" style={{ backgroundColor: '#09090b' }}>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: LIME }}>TractionFlo</span>
                <h3 className="text-lg font-black mt-2 flex items-center gap-1.5">
                  Chat & Launch <Sparkles className="h-4.5 w-4.5 text-white" strokeWidth={2.5} />
                </h3>
              </div>
            </div>

            <div className="divide-y divide-black/10 bg-white">
              {comparisonRows.map(([oldWay, newWay], i) => (
                <div key={i} className="grid grid-cols-2 hover:bg-black/[0.01] transition-colors">
                  <div className="border-r border-black/10 p-5 text-sm font-bold text-black/45">
                    {oldWay}
                  </div>
                  <div className="flex items-center justify-between gap-4 p-5 text-sm font-black text-black">
                    <span>{newWay}</span>
                    <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center border border-black text-black rounded-sm" style={{ backgroundColor: LIME }}>
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 text-center">
            <div className="inline-flex -rotate-1 items-center px-4 py-2 border border-black bg-black text-white font-extrabold tracking-wider uppercase text-xs" style={{ color: LIME, fontFamily: 'var(--font-handwritten)' }}>
              10x simpler execution. Zero learning curve.
            </div>
          </div>
        </div>
      </section>

      {/* 8. Upload Once, Answer Forever Section */}
      <section id="knowledge" className="scroll-mt-24 border-t border-black/10 px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Knowledge System"
            title="Train your AI
with your business."
            body="Give TractionFlo your content — paste text or upload PDFs — and the AI will parse, index, and answer follower questions using only your files."
          />
<KnowledgeUploader/>
        
        </div>
      </section>

      {/* 9. Adaptive Signals & Audience Intelligence */}
 <section className="border-t border-black/10 bg-black/[0.01] px-5 py-24 lg:px-8">
  <div className="mx-auto max-w-7xl">
    
    {/* HEADER */}
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7 }}
    >
      <SectionHeader
        eyebrow="Audience intelligence"
        title="Every conversation adapts natively."
        body="No static, single-message broadcasts. TractionFlo replies dynamically adjust based on previous queries, interest metrics, or context."
      />
    </motion.div>

    {/* CARDS */}
    <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-2">
      
      {adaptiveSignals.map(({ label, icon: Icon }, index) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{
            duration: 0.6,
            delay: index * 0.12,
          }}
          whileHover={{
            y: -4,
          }}
          className="group flex items-center gap-5 rounded-[22px] border border-black/10 bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)] transition-all duration-300 hover:border-black/20 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)]"
        >
          
          {/* ICON */}
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-black/5 transition-transform duration-300 group-hover:scale-110"
            style={{ backgroundColor: LIME }}
          >
            <Icon
              className="h-5 w-5 text-black"
              strokeWidth={2.5}
            />
          </span>

          {/* TEXT */}
          <div>
            <h3 className="text-lg font-black tracking-tight text-black md:text-xl">
              {label}
            </h3>

            <p className="mt-1 text-sm font-semibold leading-6 text-black/50">
              AI dynamically adapts conversations based on user
              behavior and message context.
            </p>
          </div>
        </motion.div>
      ))}
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

      {/* 13. Accordion FAQ Section */}
      <section id="faq" className="scroll-mt-24 px-5 py-24 lg:px-8 bg-black text-white">
        <div className="mx-auto max-w-4xl">
          <div className="mx-auto mb-14 max-w-4xl text-center text-white">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-white/60">FAQ</p>
            <h2 className="text-4xl font-black leading-[0.95] tracking-tight text-white md:text-6xl">
              Questions creators ask before switching
            </h2>
          </div>

          <div className="mt-6 bg-transparent shadow-none">
            {faqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div key={index} className="group mb-2">
                  <button
                    onClick={() => toggleFaq(index)}
                    className="flex w-full cursor-pointer items-center justify-between gap-6 px-4 py-5 text-left text-lg md:text-xl font-black text-white bg-white/0 hover:bg-white/5 transition-colors duration-300 rounded-sm"
                  >
                    <span className="text-left">{faq.question}</span>
                    <ChevronDown className={`h-5 w-5 text-white transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`} strokeWidth={3} />
                  </button>

                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                    className="overflow-hidden"
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                  >
                    <div className="px-4 pb-5 pt-0 text-sm font-semibold leading-7 text-white/75">
                      <p className="mt-4">{faq.answer}</p>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 14. Final Founding CTA Section */}
      <section className="px-5 py-24 lg:px-8 bg-black text-white relative overflow-hidden">
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
      <footer id="footer" className="border-t border-white/10 bg-black text-white">
        <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-4">
              <a href="#" className="inline-flex items-center">
             <img src="/footer.png" alt="" className="w-20 h-10" />
              </a>
              <p className="max-w-md text-sm text-white/70">
                TractionFlo — Simple conversational automations for creators. Upload your knowledge, answer followers, and grow.
              </p>
              <p className="mt-4 text-xs text-white/40">© {new Date().getFullYear()} TractionFlo. All rights reserved.</p>
            </div>

            <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
              <div>
                <h4 className="mb-3 text-xs font-black uppercase text-white/70">Product</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#product" className="text-white/60 hover:text-white">Overview</a></li>
                  <li><a href="#demo" className="text-white/60 hover:text-white">Demo</a></li>
                  <li><a href="#knowledge" className="text-white/60 hover:text-white">Knowledge</a></li>
                </ul>
              </div>
              <div>
                <h4 className="mb-3 text-xs font-black uppercase text-white/70">Resources</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#faq" className="text-white/60 hover:text-white">FAQ</a></li>
                  <li><a href="/signup" className="text-white/60 hover:text-white">Sign up</a></li>
                  <li><a href="/login" className="text-white/60 hover:text-white">Log in</a></li>
                </ul>
              </div>
              <div>
                <h4 className="mb-3 text-xs font-black uppercase text-white/70">Contact</h4>
                <ul className="space-y-2 text-sm">
                  <li className="text-white/60">support@tractionflo.com</li>
                  <li className="text-white/60">Twitter: @TractionFlo</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </footer>

    </main>
  );
}
