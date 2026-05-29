"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Megaphone,
  Check,
  Bot,
  Send,
  HelpCircle,
  FileText,
  Clock,
  Gift,
  Sparkles,
  Play,
  type LucideIcon,
} from "lucide-react";

const ACCENT = "#d4ff00";

type CreatorFeature = {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
};

const creatorFeatures: CreatorFeature[] = [
  {
    id: "comment-dm",
    label: "Comment→DM",
    icon: MessageCircle,
    description: "Instantly launch automated DMs from Reel or Post comments, hook leads, and save data.",
  },
  {
    id: "faq-replies",
    label: "FAQ replies",
    icon: HelpCircle,
    description: "Answer product pricing, coaching questions, and support queries from your uploaded files instantly.",
  },
  {
    id: "broadcasts",
    label: "Broadcasts",
    icon: Megaphone,
    description: "Blast product launches, new video alerts, or giveaway results straight to warmed leads' inbox.",
  },
  {
    id: "followups",
    label: "Followups",
    icon: Clock,
    description: "Keep connections hot with scheduled follow-ups checking in 24h or 48h after the initial click.",
  },
];

// PREVIEW 1: COMMENT -> DM FLOW (Card 1 in mockup)
function CommentToDmPreview() {
  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white p-4 justify-between select-none mt-4">
      <div className="border-b border-white/10 pb-2.5 flex items-center justify-between mt-2">
        <span className="text-[11px] font-black text-white tracking-widest uppercase">Comment Auto-Trigger</span>
        <span className="text-[8px] font-bold text-white/55 uppercase border border-white/20 px-2 py-0.5 rounded-full">Comment → DM</span>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-3.5 px-1 py-4">
        {/* Comment Trigger */}
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2.5 bg-[#161616] p-3 rounded-xl border border-white/5 text-left w-fit max-w-[85%]"
        >
          <div className="h-6 w-6 rounded-full bg-pink-600 flex items-center justify-center text-[10px] font-black shrink-0">I</div>
          <div>
            <p className="text-[9px] font-black text-white/45">Comment</p>
            <p className="text-xs font-black text-white leading-tight">GUIDE</p>
          </div>
        </motion.div>

        {/* Dotted path connector */}
        <div className="h-4 w-px border-l-2 border-dotted border-white/20 ml-6" />

        {/* DM Starts */}
        <motion.div 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-2.5 bg-[#161616] p-3 rounded-xl border border-white/5 text-left w-fit max-w-[85%] self-end"
        >
          <div className="h-6 w-6 rounded-full bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
            <Bot className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <p className="text-[9px] font-black text-white/45">DM starts</p>
            <p className="text-[11px] font-bold text-white leading-snug">Hey! Here&apos;s your guide.</p>
          </div>
        </motion.div>

        {/* PDF File delivery card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex items-center gap-3 bg-white p-3 rounded-xl border border-black/10 text-left w-fit max-w-[85%] self-end shadow-lg"
        >
          <div className="h-8 w-8 bg-red-600 text-white rounded-lg flex items-center justify-center font-black text-xs shrink-0 select-none">
            PDF
          </div>
          <div>
            <p className="text-xs font-black text-black leading-tight">GUIDE PDF</p>
            <p className="text-[9px] font-semibold text-black/45 mt-0.5">2.4 MB • Document</p>
          </div>
        </motion.div>

        {/* Completed Indicator stamp */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9 }}
          className="flex items-center justify-center gap-2 bg-[#007257]/15 border border-[#007257]/30 text-[#d4ff00] text-[9px] font-black uppercase tracking-wider py-2 rounded-lg mt-2"
        >
          <Check className="h-3.5 w-3.5 text-[#d4ff00]" strokeWidth={4} />
          <span>Guide sent • Lead saved ✓</span>
        </motion.div>
      </div>

      <div className="text-[8px] font-bold text-center text-white/35 mb-2 tracking-wider">
        Frictionless comment loops build pipelines instantly.
      </div>
    </div>
  );
}

// PREVIEW 2: FAQ REPLIES (Card 2 in mockup)
function FaqRepliesPreview() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setStep(1), 600);
    const timer2 = setTimeout(() => setStep(2), 1600);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white p-4 justify-between select-none mt-4">
      <div className="border-b border-white/10 pb-2.5 flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-white/15 flex items-center justify-center border border-white/10 overflow-hidden">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div className="text-left">
            <p className="text-[11px] font-black text-white leading-tight">yourbusiness.ai</p>
            <p className="text-[8px] font-semibold text-[#d4ff00] leading-none">Online assistant</p>
          </div>
        </div>
        <span className="text-[8px] font-black uppercase border border-white/20 px-2 py-0.5 rounded-full text-white/55">FAQ Auto</span>
      </div>

      <div className="flex-1 flex flex-col justify-start gap-3 mt-4 overflow-y-auto">
        {/* User Question */}
        <div className="flex justify-start max-w-[85%] items-start gap-2">
          <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/5 font-black text-[9px] text-white/70">F</div>
          <div className="bg-[#262626] text-white px-3.5 py-2.5 text-[11px] font-bold rounded-2xl rounded-bl-sm">
            How much is coaching?
          </div>
        </div>

        {/* AI Typing Indicator */}
        {step === 1 && (
          <div className="flex justify-end">
            <div className="bg-[#d4ff00] text-black px-3.5 py-2 rounded-2xl rounded-br-sm text-[10px] font-black flex items-center gap-1.5 shadow-[0_4px_12px_rgba(212,255,0,0.15)]">
              <span>typing</span>
              <div className="flex gap-0.5">
                <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="h-1 w-1 bg-black rounded-full" />
                <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.15 }} className="h-1 w-1 bg-black rounded-full" />
                <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.3 }} className="h-1 w-1 bg-black rounded-full" />
              </div>
            </div>
          </div>
        )}

        {/* AI Answer */}
        {step === 2 && (
          <motion.div 
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="flex flex-col items-end self-end max-w-[85%] gap-2"
          >
            <div className="bg-[#d4ff00] text-black px-3.5 py-2.5 rounded-2xl rounded-br-sm text-[11px] font-black text-left leading-relaxed shadow-lg">
              My coaching starts at $497. Here&apos;s what you get:
            </div>
            
            {/* Checklist elements */}
            <div className="flex flex-col items-start gap-1.5 w-full mt-1 pl-2">
              {[
                "1:1 Strategy Call",
                "Custom Plan",
                "Weekly Check-ins"
              ].map((bullet, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: 5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 * idx + 0.1 }}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-white/80"
                >
                  <div className="h-4.5 w-4.5 bg-[#d4ff00]/10 border border-[#d4ff00]/30 rounded-sm flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-[#d4ff00]" strokeWidth={3.5} />
                  </div>
                  <span>{bullet}</span>
                </motion.div>
              ))}
            </div>
            
            <p className="text-[10px] font-black text-white/60 mt-1 uppercase tracking-wider text-right w-full">Want to book a call? 👇</p>
          </motion.div>
        )}
      </div>

      <div className="mt-4 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/30 px-1 mb-2">
        <span>Type a message...</span>
        <Send className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}

// PREVIEW 3: BROADCASTS (Card 3 in mockup)
function BroadcastsPreview() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setStep(1), 600);
    const timer2 = setTimeout(() => setStep(2), 1400);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white p-4 justify-between select-none mt-4">
      <div className="border-b border-white/10 pb-2.5 flex items-center justify-between mt-2">
        <span className="text-[11px] font-black text-white tracking-widest uppercase">Broadcast Blast</span>
        <span className="text-[8px] font-black uppercase text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 rounded-full select-none">
          Sent ✓
        </span>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center gap-4">
        
        {/* Outbound Broadcast Bubble */}
        {step >= 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-[90%] flex flex-col gap-2.5"
          >
            {/* Visual simulated video thumbnail player */}
            <div className="aspect-[16/9] w-full rounded-xl border border-white/15 bg-white/5 flex flex-col items-center justify-center relative overflow-hidden group shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/30 flex items-center justify-center shrink-0 z-10">
                <Play className="h-4.5 w-4.5 text-white fill-white ml-0.5" />
              </div>
              <span className="absolute bottom-2.5 left-3 text-[10px] font-black uppercase tracking-wider text-[#d4ff00] z-10 bg-black/45 px-2 py-0.5 rounded-sm">
                NEW VIDEO LIVE 🔥
              </span>
            </div>
            
            <p className="text-xs font-black text-left leading-normal text-white/95 bg-[#161616] p-3 border border-white/5 rounded-xl">
              New video is live! Go check it out now 👇
            </p>
          </motion.div>
        )}

        {/* Dynamic Stats Overlay Card */}
        {step >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-[#111] border border-white/15 p-4 rounded-xl shadow-2xl flex flex-col gap-3 text-left relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-[3px]" style={{ backgroundColor: ACCENT }} />
            
            <p className="text-[9px] font-black uppercase tracking-wider text-white/40">Campaign Metrics</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-black text-white/45 uppercase">Reached</p>
                <p className="text-lg font-black text-[#d4ff00] mt-0.5">3,247</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-white/45 uppercase">Replies</p>
                <p className="text-lg font-black text-white mt-0.5">124</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="text-[8px] font-bold text-center text-white/35 mb-2 tracking-wider">
        Sent instantly to all opting contacts.
      </div>
    </div>
  );
}

// PREVIEW 4: FOLLOWUPS (Card 4 in mockup)
function FollowupsPreview() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setStep(1), 500);
    const timer2 = setTimeout(() => setStep(2), 1000);
    const timer3 = setTimeout(() => setStep(3), 1500);
    const timer4 = setTimeout(() => setStep(4), 2100);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white p-4 justify-between select-none mt-4">
      <div className="border-b border-white/10 pb-2.5 flex items-center justify-between mt-2">
        <span className="text-[11px] font-black text-white tracking-widest uppercase">Auto Timeline</span>
        <span className="text-[8px] font-bold text-white/55 uppercase border border-white/20 px-2 py-0.5 rounded-full">Followup</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full px-2 mt-2">
        <div className="flex flex-col w-full max-w-[210px] gap-0.5">
          
          {/* Node 1 */}
          {step >= 0 && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              className="flex items-center gap-3"
            >
              <div className="flex h-5 w-5 items-center justify-center bg-white/15 border border-white/20 text-[9px] font-black rounded-full shrink-0">0</div>
              <div className="text-left leading-tight">
                <p className="text-[8px] font-black text-white/45 leading-none uppercase">Day 0</p>
                <p className="text-[11px] font-bold text-white/80">Interested in working together? ✉</p>
              </div>
            </motion.div>
          )}

          {/* Line 1 */}
          {step >= 1 && (
            <motion.div 
              initial={{ scaleY: 0 }} 
              animate={{ scaleY: 1 }} 
              className="h-5 w-[2px] bg-white/20 ml-2.5 origin-top" 
            />
          )}

          {/* Node 2 */}
          {step >= 2 && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              className="flex items-center gap-3"
            >
              <div className="flex h-5 w-5 items-center justify-center bg-[#d4ff00]/15 border border-[#d4ff00]/30 text-[9px] font-black rounded-full shrink-0 text-[#d4ff00]">1d</div>
              <div className="text-left leading-tight">
                <p className="text-[8px] font-black text-[#d4ff00] leading-none uppercase">24h later</p>
                <p className="text-[11px] font-bold text-white/80">Just checking in... Still interested? ✉</p>
              </div>
            </motion.div>
          )}

          {/* Line 2 */}
          {step >= 3 && (
            <motion.div 
              initial={{ scaleY: 0 }} 
              animate={{ scaleY: 1 }} 
              className="h-5 w-[2px] bg-white/20 ml-2.5 origin-top" 
            />
          )}

          {/* Node 3 */}
          {step >= 3 && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              className="flex items-center gap-3"
            >
              <div className="flex h-5 w-5 items-center justify-center bg-white/15 border border-white/20 text-[9px] font-black rounded-full shrink-0">2d</div>
              <div className="text-left leading-tight">
                <p className="text-[8px] font-black text-white/45 leading-none uppercase">48h later</p>
                <p className="text-[11px] font-bold text-white/80">I can save you a spot this week. Want it? 🔥</p>
              </div>
            </motion.div>
          )}

        </div>

        {/* Lead warmed stamp */}
        <AnimatePresence>
          {step >= 4 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: 10 }}
              animate={{ opacity: 1, scale: 1, rotate: -3 }}
              exit={{ opacity: 0 }}
              className="mt-5 border-2 border-black px-4.5 py-2 text-xs font-black uppercase tracking-wider text-black flex items-center gap-1 shadow-lg"
              style={{ backgroundColor: ACCENT }}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
              <span>Lead warmed ✓</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="text-[8px] font-bold text-center text-white/35 mb-2 tracking-wider">
        Automatic nurtures prevent drops.
      </div>
    </div>
  );
}

function DevicePreview({
  activeId,
  compact = false,
}: {
  activeId: string;
  compact?: boolean;
}) {
  const [renderTrigger, setRenderTrigger] = useState(0);

  useEffect(() => {
    setRenderTrigger((prev) => prev + 1);
  }, [activeId]);

  const renderContent = () => {
    switch (activeId) {
      case "comment-dm":
        return <CommentToDmPreview key={`comment-dm-${renderTrigger}`} />;
      case "faq-replies":
        return <FaqRepliesPreview key={`faq-replies-${renderTrigger}`} />;
      case "broadcasts":
        return <BroadcastsPreview key={`broadcasts-${renderTrigger}`} />;
      case "followups":
        return <FollowupsPreview key={`followups-${renderTrigger}`} />;
      default:
        return <CommentToDmPreview key={`default-${renderTrigger}`} />;
    }
  };

  return (
    <div className="relative flex justify-center">
      <div
        className={`pointer-events-none absolute inset-0 opacity-80 ${
          compact
            ? "-m-3 rounded-[28px] blur-[24px]"
            : "-m-6 rounded-[40px] blur-[40px] lg:-m-10 lg:rounded-[60px] lg:blur-[60px]"
        } bg-gradient-to-tr from-[#d4ff00]/10 via-emerald-500/5 to-cyan-500/10`}
      />

      <div
        className={`relative shrink-0 overflow-hidden border-black bg-black select-none shadow-xl ${
          compact
            ? "w-[clamp(108px,28vw,148px)] border-[6px] rounded-[26px] shadow-lg"
            : "w-[290px] border-[12px] rounded-[48px] shadow-[0_30px_70px_rgba(0,0,0,0.18)]"
        }`}
        style={
          compact
            ? { height: "clamp(220px, 56vw, 300px)" }
            : { height: "580px" }
        }
      >
        {/* iOS Status Bar */}
        <div
          className={`absolute inset-x-0 top-0 z-25 flex items-center justify-between bg-black ${
            compact ? "h-4 px-3" : "h-6 px-7"
          }`}
        >
          <span
            className={`font-black text-white/90 ${compact ? "text-[7px]" : "text-[10px]"}`}
          >
            9:41
          </span>
          <div
            className={`rounded-full bg-black ${compact ? "h-1.5 w-8" : "h-3 w-16"}`}
          />
          <div className="flex items-center gap-0.5">
            <div
              className={`rounded-full bg-white/80 ${compact ? "h-1 w-1" : "h-2.5 w-2.5"}`}
            />
            <div
              className={`rounded-[2px] bg-white/80 ${compact ? "h-0.5 w-2" : "h-2 w-3.5"}`}
            />
          </div>
        </div>

        {/* Dynamic content rendering inside the device */}
        <div className="absolute inset-0 z-10 bg-[#0a0a0a] pt-4">
          {renderContent()}
        </div>

        {/* Swipe bar */}
        <div className="absolute inset-x-0 bottom-2.5 z-25 flex justify-center">
          <div
            className={`rounded-full bg-white/40 ${compact ? "h-px w-12" : "h-1 w-28"}`}
          />
        </div>
      </div>
    </div>
  );
}

export default function CreatorWorkflows() {
  const [activeTab, setActiveTab] = useState(creatorFeatures[0].id);

  return (
    <div className="relative w-full text-left text-black select-none">
      
      {/* Header Info */}
      <div className="max-w-2xl mb-14 text-left">
        <p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-black/50">
          WHAT CREATORS ACTUALLY USE
        </p>
        <h2 className="mb-6 text-4xl font-black leading-[0.95] tracking-tight md:text-5xl lg:text-6xl">
          Same creator workflows. <br />
          <span className="inline-block relative">
            No builder headache.
            <span className="absolute left-0 right-0 bottom-1.5 h-[6px] bg-[#d4ff00]/70 -z-10 rounded-full" />
          </span>
        </h2>
        <p className="text-base font-medium leading-7 text-black/60">
          Creators already know what they want. TractionFlo removes the setup maze so you can jump straight to lead capturing.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        {/* Left Column: Vertical List of Clickable Tabs */}
        <div className="flex flex-col gap-4">
          {creatorFeatures.map((feat) => {
            const isActive = activeTab === feat.id;
            const Icon = feat.icon;
            return (
              <button
                key={feat.id}
                onClick={() => setActiveTab(feat.id)}
                className={`group relative flex items-start gap-4 rounded-xl p-5 text-left border border-black/5 transition-all duration-300 w-full cursor-pointer bg-white ${
                  isActive
                    ? "border-black/15 shadow-[0_15px_40px_rgba(0,0,0,0.04)]"
                    : "border-transparent bg-transparent opacity-50 hover:opacity-85"
                }`}
                style={
                  isActive ? { borderLeft: `4px solid ${ACCENT}` } : undefined
                }
              >
                {/* Icon Container */}
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 ${
                    isActive
                      ? "border-black text-black shadow-sm"
                      : "border-black/10 bg-black/5 text-black/50"
                  }`}
                  style={isActive ? { backgroundColor: ACCENT, color: "black" } : undefined}
                >
                  <Icon className="h-5.5 w-5.5" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                
                {/* Copy content */}
                <div className="min-w-0">
                  <h4 className="text-base font-black tracking-tight text-black sm:text-lg">
                    {feat.label}
                  </h4>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-black/50 sm:text-sm">
                    {feat.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Column: Sticky Mockup Device Preview */}
        <div className="flex items-center justify-center py-6 min-h-[620px]">
          <DevicePreview activeId={activeTab} />
        </div>
      </div>

      {/* Bottom Horizontal Grid Row of 4 Sub-features */}
      <div className="mt-16 pt-8 border-t border-black/10 grid grid-cols-2 lg:grid-cols-4 gap-6 select-none">
        {[
          { label: "Giveaways", desc: "Run giveaways that attract and convert.", icon: Gift },
          { label: "Lead magnets", desc: "Deliver free resources and capture leads.", icon: FileText },
          { label: "AI knowledge", desc: "Use your content to answer anything automatically.", icon: HelpCircle },
          { label: "Live engagement", desc: "Engage in real-time and turn attention into relationships.", icon: Sparkles }
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="flex flex-col gap-2 items-start text-left border border-black/5 hover:border-black/15 bg-white p-5 rounded-xl shadow-sm transition-all duration-300 hover:-translate-y-0.5">
              <div className="h-9 w-9 rounded-lg border border-black/10 bg-black/5 flex items-center justify-center text-black" style={{ backgroundColor: ACCENT }}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <h5 className="text-[13px] font-black text-black uppercase tracking-wider mt-1">{item.label}</h5>
              <p className="text-xs text-black/50 font-bold leading-normal mt-0.5">{item.desc}</p>
            </div>
          );
        })}
      </div>

    </div>
  );
}
