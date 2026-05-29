"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
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
  Gift,
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
import BrandLogo from "./components/BrandLogo";
import CopilotPlayground from "./components/CopilotPlayground";
import KnowledgeUploader from "./components/KnowledgeUploader";
import CreatorWorkflows from "./components/CreatorWorkflows";
import HeroDemo from "./components/HeroDemo";
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
        className="relative min-h-screen flex flex-col justify-center overflow-hidden px-5 pb-8 pt-20 lg:pt-20 lg:pb-8 lg:px-8 bg-grid-pattern"
      >
        {/* Floating gradient circles in background */}
        <div className="absolute top-[20%] left-[10%] w-[350px] h-[350px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[10%] w-[350px] h-[350px] bg-black/[0.02] rounded-full blur-[100px] pointer-events-none" />

        <div className="mx-auto max-w-7xl z-10 w-full">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-start lg:text-left text-center lg:pt-4">
            
            {/* Left Column: Core Branding & Call to Actions */}
            <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left select-none">
              
              {/* Rounded Tag Badge */}
              <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 inline-flex items-center gap-2 border border-black/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-sm bg-white"
              >
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-black">Starting with Instagram</span>
                <div className="h-3 w-px bg-black/15 mx-1" />
                <span className="text-black/50">TikTok + YouTube coming next</span>
              </motion.div>

              {/* Main Heading */}
              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-[2.75rem] font-black leading-[0.95] tracking-tight text-black sm:text-6xl lg:text-[clamp(3.2rem,4.8vw,4.8rem)] text-center lg:text-left"
              >
                Stop building flows. <br />
                Start getting <br className="hidden lg:block" />
                <span className="inline-block relative">
                  conversations
                  <span className="absolute left-0 right-0 bottom-1.5 h-[6px] bg-[#d4ff00]/70 -z-10 rounded-full" />
                </span>.
              </motion.h1>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-4 max-w-xl text-base font-bold leading-7 text-black/65 sm:text-lg md:text-xl"
              >
                Get the same automation outcomes creators already want.
              </motion.p>

              {/* Sub-badges row */}
              <div className="flex flex-wrap gap-1.5 mt-4 justify-center lg:justify-start w-full">
                {[
                  { label: "Comment triggers", icon: MessageCircle },
                  { label: "Lead magnets", icon: FileText },
                  { label: "FAQs", icon: CircleHelp },
                  { label: "Broadcasts", icon: BarChart3 },
                  { label: "Follow-ups", icon: Clock3 }
                ].map((badge, idx) => {
                  const Icon = badge.icon;
                  return (
                    <div key={idx} className="flex items-center gap-1.5 border border-black/10 bg-black/[0.02] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-sm text-black/60 hover:border-black/20 hover:text-black transition-colors bg-white">
                      <Icon className="h-3 w-3" strokeWidth={3} />
                      <span>{badge.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* 10x Simpler Callout */}
              <div className="mt-6 flex flex-col items-center lg:items-start w-full">
                <span className="text-3xl font-black text-black">10x simpler</span>
                <p className="mt-1.5 text-[10px] font-black uppercase tracking-wider text-black/45">
                  Describe what you want in plain English. TractionFlo builds it.
                </p>
              </div>

              {/* Action Call to Action Button */}
              <div className="mt-6 w-full flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
                <a
                  href="/signup"
                  className="inline-flex w-full items-center justify-center gap-2 border-2 border-black px-8 py-4 text-sm font-black text-black transition-all sm:w-auto rounded-sm tracking-widest uppercase shadow-[4px_4px_0px_#000] hover:shadow-[5px_5px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_#000]"
                  style={{ backgroundColor: LIME }}
                >
                  <span>Get Founding Access</span>
                  <ArrowRight className="h-4.5 w-4.5" strokeWidth={3.5} />
                </a>
              </div>

              {/* Benefits row */}
              <div className="mt-4 flex flex-wrap justify-center lg:justify-start gap-x-5 gap-y-2.5 text-[10px] font-black uppercase tracking-wider text-black/50 w-full">
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-green-600" strokeWidth={4} />
                  <span>Join in 3 seconds</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-green-600" strokeWidth={4} />
                  <span>No credit card</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-green-600" strokeWidth={4} />
                  <span>Limited founding spots</span>
                </div>
              </div>

              {/* Bottom logo brand statement */}
              <div className="mt-6 border-t border-black/10 pt-4 flex items-center gap-3 w-full justify-center lg:justify-start">
                <div className="h-8.5 w-8.5 rounded-full bg-black flex items-center justify-center text-white text-[11px] font-black shadow-sm shrink-0">
                  TF
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-black leading-[1.2] text-left">
                  Built for creators, <br />
                  <span className="text-black/45">not automation engineers.</span>
                </p>
              </div>

            </div>

            {/* Right Column: High-Fidelity Interactive Chat Simulation */}
            <div className="lg:col-span-5 w-full max-w-lg mx-auto lg:mx-0">
              <HeroDemo />
            </div>

          </div>
        </div>
      </section>

       <section id="workflows" className="scroll-mt-24 overflow-visible border-t border-black/10 px-5 py-24 lg:px-8 bg-[#f5f5f0]">
        <div className="mx-auto max-w-7xl overflow-visible">
          <CreatorWorkflows />
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
      {/* 4. The Real Problem Section */}
      <section id="problem" className="scroll-mt-24 border-t border-black/10 px-5 py-24 lg:px-8 bg-[#fafaf9]">
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

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-3xl font-black leading-[1.0] tracking-tight text-black sm:text-4xl lg:text-5xl"
              >
                Creators don't have <br />
                an automation problem. <br />
                They have a <span className="relative inline-block text-red-500">
                  setup
                  <span className="absolute left-0 right-0 bottom-1 h-[4px] bg-red-500/20 -z-10 rounded-full" />
                </span> problem.
              </motion.h2>

              {/* Subtitle */}
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

              {/* 5 Frustration Points */}
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

              {/* Warning Banner Callout */}
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

            {/* Right Column: Visual Flowbuilder headache canvas */}
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

                {/* Bottom Red tags frustration indicators */}
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
 
      {/* 5. Chat-First Automation Section */}
      <section id="demo" className="scroll-mt-12 pt-24 pb-24 border-t border-black/10 relative z-10 bg-white select-none">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          
          {/* Section Header */}
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

          {/* Grid Layout */}
          <div className="grid gap-8 lg:grid-cols-12 lg:items-stretch mt-10 max-w-6xl mx-auto">
            
            {/* Left Card: THE OLD WAY */}
            <div className="lg:col-span-5 flex flex-col justify-between border border-black/10 bg-white p-6 rounded-2xl shadow-sm hover:border-black/20 hover:shadow transition-all duration-300">
              <div>
                {/* Badge */}
                <div className="inline-flex items-center gap-1.5 border border-red-500/25 bg-red-500/5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider text-red-500">
                  <X className="h-3 w-3 shrink-0 rounded-full border border-red-500 p-[1px]" strokeWidth={3.5} />
                  <span>THE OLD WAY</span>
                </div>
                
                <h3 className="text-sm font-black text-black/45 mt-3 mb-6 uppercase tracking-wider">Complex. Manual. Time-consuming.</h3>
                
                {/* Steps */}
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

              {/* Bottom Tags */}
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

            {/* Center Separation Column */}
            <div className="lg:col-span-2 flex flex-col items-center justify-center py-6 lg:py-0 select-none">
              {/* Arrow and Text */}
              <div className="flex flex-col items-center gap-2.5 text-center">
                {/* Horizontal Arrow on Desktop, Vertical on Mobile */}
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

      

  

      {/* 8. Upload Once, Answer Forever Section */}
      <section id="knowledge" className="scroll-mt-24 border-t border-black/10 px-5 py-5 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center select-none">
          
            <h2 className="text-4xl font-black leading-[0.95] tracking-tight text-black md:text-6xl lg:text-7.5rem">
              Upload once. <br />
              Answer <span className="inline-block relative">
                forever
                <span className="absolute left-0 right-0 bottom-1.5 h-[6px] bg-[#d4ff00]/70 -z-10 rounded-full" />
              </span>.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base font-semibold leading-7 text-black/60">
              TractionFlo learns your content and replies naturally.
            </p>
          </div>
<KnowledgeUploader/>
        
        </div>
      </section>

      {/* 9. Limited Founding Access CTA Section */}
      <section className="border-t border-black/10 bg-[#f9fafb] px-5 py-24 lg:px-8 relative overflow-hidden select-none">
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
