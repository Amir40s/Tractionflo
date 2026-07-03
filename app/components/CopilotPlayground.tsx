"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { Sparkles, Check, Send, Bot, MessageSquare, FileText } from "lucide-react";

const LIME = '#d4ff00';

const suggestedPrompts = [
  'Launch my course',
  'Send my lead magnet',
  'Answer FAQs',
  'Follow up interested',
];

const fullPromptText = "When someone comments GUIDE on my Reel, send my free PDF, answer pricing questions from my uploaded FAQ, and follow up if they are interested.";

 const chatMessages = [
  { step: 1, sender: "follower", text: "GUIDE", type: "text" },
  { step: 2, sender: "bot", text: "Hey! Here is your free TractionFlo Setup Guide as requested.", type: "text" },
  { step: 3, sender: "bot", text: "TractionFlo_Playbook.pdf", subtitle: "2.4 MB • PDF Document", type: "file" },
  { step: 4, sender: "follower", text: "Does it work in multiple languages?", type: "text" },
  { step: 5, sender: "bot", text: "Yes! TractionFlo automatically detects follower languages (Spanish, German, etc.) and answers natively.", type: "text" },
  { step: 6, sender: "follower", text: "Awesome! How fast can I launch?", type: "text" },
  { step: 7, sender: "bot", text: "In less than 2 minutes. Just describe what you want, connect your files, and toggle live!", type: "text" },
];

export default function CopilotPlayground() {
  const [promptText, setPromptText] = useState("");
  const [animationStep, setAnimationStep] = useState(0);
  const [scrollVal, setScrollVal] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track scroll progress of the playground track
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 80%", "end end"]
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setScrollVal(latest);
    
    // 1. Typing Phase (0.0 to 0.20)
    if (latest <= 0.20) {
      const progress = latest / 0.20;
      const charCount = Math.floor(progress * fullPromptText.length);
      setPromptText(fullPromptText.substring(0, charCount));
      setAnimationStep(0);
    }
    // 2. Trigger Generator Phase (0.20 to 0.26)
    else if (latest > 0.20 && latest <= 0.26) {
      setPromptText(fullPromptText);
      setAnimationStep(0);
    }
    // 3. Brain Steps & Chat Bubbles Phase (0.26 to 0.85)
    else if (latest > 0.26 && latest <= 0.85) {
      setPromptText(fullPromptText);
      const stepProgress = (latest - 0.26) / (0.85 - 0.26); // 0 to 1
      const currentStep = Math.floor(stepProgress * 7) + 1;
      setAnimationStep(Math.min(currentStep, 7));
    }
    // 4. Fully Active / Stamp Phase (0.85 to 1.0)
    else if (latest > 0.85) {
      setPromptText(fullPromptText);
      setAnimationStep(8); // Triggers "Launch Active!"
    }
  });

  const getButtonText = () => {
    if (scrollVal <= 0.20) return "Generate Flow (Scroll to Start)";
    if (scrollVal > 0.20 && scrollVal <= 0.26) return "Triggering AI Engine...";
    if (scrollVal > 0.26 && scrollVal <= 0.85) return "  Flow ";
    return "Flow Active & Live!";
  };

  return (
    <div ref={containerRef} className="relative h-[135vh] w-full">
      {/* Sticky container that locks in viewport during scroll progress */}
      <div className="sticky top-24 w-full py-8">
        <div className="grid gap-6 md:grid-cols-3 text-black">
          
          {/* Column 1: Copilot Input */}
          <div className="flex flex-col border border-black/10 bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.04)] relative rounded-xl h-[480px] md:h-[510px] overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[3px]" style={{ backgroundColor: LIME }} />
            <div className="mb-5 border-b border-black/10 pb-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-black/40">Step 1 — Describe</p>
              <h3 className="mt-1 text-xl font-black text-black flex items-center gap-2">
                TractionFlo Copilot <Sparkles className="h-4.5 w-4.5 text-black" strokeWidth={2.5} />
              </h3>
            </div>
            
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="border border-black/15 bg-black/[0.02] p-4 min-h-[130px] md:min-h-[150px] flex flex-col justify-between rounded-sm relative overflow-y-auto">
                <span className="absolute top-2 right-3 text-[10px] font-black uppercase text-black/20 tracking-wider">Prompt Playground</span>
                <div className="text-xs md:text-sm font-extrabold leading-6 text-black pr-4 text-left">
                  {promptText || (
                    <span className="text-black/30 font-bold">
                      Scroll down slowly to see the copilot type out and translate a natural language prompt into a growth flow...
                    </span>
                  )}
                  {scrollVal <= 0.45 && scrollVal > 0.01 && (
                    <motion.span 
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                      className="inline-block w-1.5 h-4 bg-black ml-0.5 align-middle"
                    />
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {/* Button simulates active pressed state at triggering scroll offset */}
                <div
                  className={`flex w-full items-center justify-center gap-2 border border-black py-3.5 text-sm font-black transition-all rounded-sm select-none ${
                    scrollVal > 0.45 ? "bg-[#007257] text-white shadow-none" : "bg-black text-white shadow-md"
                  }`}
                  style={scrollVal > 0.45 && scrollVal <= 0.52 ? { transform: "translateY(2px)" } : undefined}
                >
                  <span>{getButtonText()}</span>
                  {scrollVal > 0.45 ? (
                    <Check className="h-4 w-4 text-[#d4ff00]" strokeWidth={3} />
                  ) : (
                    <Sparkles className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-black/40 mb-2">Suggested prompts</p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedPrompts.map((prompt) => (
                      <div
                        key={prompt}
                        className={`text-[9px] md:text-[10px] font-black border px-2 py-1.5 rounded-sm select-none transition-all duration-300 ${
                          prompt === "Send my lead magnet" && scrollVal > 0.05
                            ? "bg-black text-white border-black" 
                            : "bg-white text-black/60 border-black/15"
                        }`}
                      >
                        {prompt}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interactive scroll instruction pointer */}
                 
              </div>
            </div>
          </div>

          {/* Column 2: TractionFlo Brain Checklist */}
          <div className="flex flex-col border border-black/10 bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.04)] relative rounded-xl h-[480px] md:h-[510px] overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[3px]" style={{ backgroundColor: LIME }} />
            <div className="mb-5 border-b border-black/10 pb-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-black/40">Step 2 — Interpret</p>
              <h3 className="mt-1 text-xl font-black text-black">TractionFlo Brain</h3>
            </div>
            
            <div className="flex-1 flex flex-col justify-start space-y-2 overflow-y-auto pr-1">
              {[
                { step: 1, label: 'Instagram Reel comment detected' },
                { step: 2, label: 'Trigger connected to GUIDE comment' },
                { step: 3, label: 'PDF file attached from drive' },
                { step: 4, label: 'Pricing queries enabled' },
                { step: 5, label: 'FAQ knowledge linked natively' },
                { step: 6, label: 'Follow-up timeline set' },
                { step: 7, label: 'Lead database enabled' },
              ].map((item) => {
                const isCompleted = animationStep >= item.step;
                return (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0.15, x: -5 }}
                    animate={{ 
                      opacity: isCompleted ? 1 : 0.25, 
                      x: isCompleted ? 0 : -5,
                      backgroundColor: isCompleted ? 'rgba(0, 114, 87, 0.04)' : 'rgba(0,0,0,0)'
                    }}
                    transition={{ duration: 0.3 }}
                    className={`flex items-center gap-3 border ${isCompleted ? 'border-black/15' : 'border-black/5'} px-3 py-2 text-[11px] md:text-xs font-extrabold rounded-sm text-left`}
                  >
                    <div 
                      className={`flex h-5 w-5 shrink-0 items-center justify-center border transition-all duration-300 ${isCompleted ? 'border-black/15 bg-black text-white animate-pulse' : 'border-black/15 bg-white'}`}
                      style={isCompleted ? { backgroundColor: LIME, color: 'black' } : undefined}
                    >
                      {isCompleted ? (
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      ) : (
                        <div className="w-1.5 h-1.5 bg-black/10 rounded-full" />
                      )}
                    </div>
                    <span className="truncate">{item.label}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Column 3: Live Instagram Chat Simulation */}
          <div className="flex flex-col border border-black/10 bg-[#f9fafb] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.04)] relative rounded-xl h-[480px] md:h-[510px] overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[3px]" style={{ backgroundColor: LIME }} />
            
            {/* Instagram DM Mock Header */}
            <div className="mb-4 border-b border-black/10 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white">
                  {/* Instagram colorful gradient boundary ring */}
                  <div className="absolute inset-[-2px] rounded-full border border-transparent bg-gradient-to-tr from-orange-400 via-pink-500 to-orange-600 -z-10 p-[1px] scale-105" />
                  <Bot className="h-4.5 w-4.5 text-black" strokeWidth={2.5} />
                </div>
                <div className="text-left">
                  <p className="text-[11px] font-black text-black leading-tight flex items-center gap-1">
                    TractionFlo Bot
                    <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" />
                  </p>
                  <p className="text-[9px] font-bold text-black/45 leading-none">Instagram Autopilot</p>
                </div>
              </div>
             </div>

            {/* Message Bubble Feed */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 py-1 scrollbar-none flex flex-col justify-start">
              {chatMessages.map((msg, idx) => {
                const isVisible = animationStep >= msg.step;
                if (!isVisible) return null;

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 120, damping: 14 }}
                    className={`flex flex-col max-w-[85%] ${msg.sender === "bot" ? "ml-auto items-end" : "items-start"}`}
                  >
                    {msg.type === "file" ? (
                      /* Attachment layout */
                      <div className="flex items-center gap-3 border border-black/15 bg-white p-3 rounded-2xl rounded-tr-sm shadow-sm text-left">
                        <div className="flex h-8 w-8 items-center justify-center bg-black/5 text-black rounded-lg shrink-0">
                          <FileText className="h-4.5 w-4.5 text-black" strokeWidth={2.5} />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] md:text-[11px] font-black text-black leading-tight">{msg.text}</p>
                          <p className="text-[8px] md:text-[9px] font-semibold text-black/45">{msg.subtitle}</p>
                        </div>
                      </div>
                    ) : (
                      /* Regular message layout */
                      <div 
                        className={`px-3.5 py-2.5 text-[11px] font-bold text-left ${
                          msg.sender === "bot" 
                            ? "bg-gradient-to-r from-pink-500 to-blue-500 text-white rounded-2xl rounded-tr-none shadow-sm" 
                            : "bg-white text-black border border-black/15 rounded-2xl rounded-tl-none shadow-sm"
                        }`}
                      >
                        {msg.text}
                      </div>
                    )}
                    {msg.sender === "bot" && (
                      <span className="text-[7px] font-extrabold text-pink-600/75 tracking-wider mt-0.5 uppercase leading-none">Automated</span>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Mock Chat Footer Input */}
            <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-between bg-white px-2.5 py-2 rounded-lg border border-black/5">
              <div className="text-[10px] font-bold text-black/35">Instagram Message...</div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-black/40" />
                <Send className="h-4 w-4 text-black/40" />
              </div>
            </div>

            {/* Framer-Motion Active Stamp Overlay */}
            <AnimatePresence>
              {animationStep >= 8 && (
                <motion.div
                  initial={{ scale: 0, rotate: 15, opacity: 0 }}
                  animate={{ scale: 1.05, rotate: -4, opacity: 1 }}
                  exit={{ scale: 0, rotate: 15, opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] z-30"
                >
                  <div 
                    className="border-4 border-black px-6 py-3.5 text-2xl font-black tracking-widest uppercase shadow-2xl rotate-[-3deg] select-none"
                    style={{ backgroundColor: LIME, color: 'black', fontFamily: 'var(--font-handwritten)' }}
                  >
                    Active & Autopilot!
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
}
