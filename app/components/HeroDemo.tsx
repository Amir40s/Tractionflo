"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Send, RefreshCw, ArrowRight } from "lucide-react";

const LIME = '#d4ff00';

type PresetKey = 'Sell my course' | 'Send my PDF' | 'Webinar funnel' | 'Giveaway campaign' | 'FAQ assistant';

const presets: Record<PresetKey, string> = {
  'Sell my course': "When someone comments COURSE, send the signup link, reply to pricing questions and follow up next week.",
  'Send my PDF': "When someone comments GUIDE, send my PDF, answer pricing questions and follow up tomorrow.",
  'Webinar funnel': "When someone comments WEBINAR, register them automatically, send the Zoom link and follow up 2 hours before.",
  'Giveaway campaign': "When someone comments WIN, enter them into the raffle, send a ticket and follow up in 24 hours.",
  'FAQ assistant': "When someone comments SUPPORT, answer their pricing questions and save details to CRM."
};

const checklistItems = [
  "Comment trigger connected",
  "Guide attached",
  "FAQ connected",
  "Follow-up added",
  "Lead capture enabled"
];

const workflowSteps = [
  { label: "DM starts", icon: "💬" },
  { label: "PDF sent", icon: "📄" },
  { label: "Question answered", icon: "❓" },
  { label: "Follow-up tomorrow", icon: "🕒" },
  { label: "Lead saved ✓", icon: "👤", success: true }
];

export default function HeroDemo() {
  const [inputText, setInputText] = useState(presets['Send my PDF']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visibleChecksCount, setVisibleChecksCount] = useState(0);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [activePreset, setActivePreset] = useState<PresetKey>('Send my PDF');
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const loopRef = useRef<NodeJS.Timeout | null>(null);

  const handlePresetClick = (preset: PresetKey) => {
    setActivePreset(preset);
    setInputText(presets[preset]);
    setIsGenerating(false);
    setProgress(0);
    setVisibleChecksCount(0);
    setShowWorkflow(false);
  };

  const handleGenerate = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsGenerating(true);
    setProgress(0);
    setVisibleChecksCount(0);
    setShowWorkflow(false);

    // Progress simulation: 15% -> 40% -> 70% -> 100%
    const progressSteps = [15, 40, 70, 100];
    let step = 0;

    const interval = setInterval(() => {
      if (step < progressSteps.length) {
        setProgress(progressSteps[step]);
        step++;
      } else {
        clearInterval(interval);
        
        // Checklist appears one-by-one
        let checkIndex = 0;
        const checkInterval = setInterval(() => {
          if (checkIndex < checklistItems.length) {
            setVisibleChecksCount(prev => prev + 1);
            checkIndex++;
          } else {
            clearInterval(checkInterval);
            
            // Show logical workflow output
            setTimeout(() => {
              setShowWorkflow(true);
            }, 300);
          }
        }, 220);
      }
    }, 250); // Total loading takes 1 second
  }, []);

  // Auto replay loop every 15 seconds
  useEffect(() => {
    const startTimer = setTimeout(handleGenerate, 0);

    loopRef.current = setInterval(() => {
      handleGenerate();
    }, 15000);

    return () => {
      clearTimeout(startTimer);
      if (loopRef.current) clearInterval(loopRef.current);
      const timer = timerRef.current;
      if (timer) clearTimeout(timer);
    };
  }, [activePreset, handleGenerate]);

  const handleManualClick = useCallback(() => {
    if (loopRef.current) clearInterval(loopRef.current);
    handleGenerate();
    loopRef.current = setInterval(() => {
      handleGenerate();
    }, 15000);
  }, [handleGenerate]);

  return (
    <div className="w-full relative flex flex-col gap-6 text-black select-none">
      
      {/* Central Dotted Connection Track (centered behind a w-14 container at left-27px) */}
      <div className="absolute left-[27px] top-6 bottom-6 w-0.5 border-l-2 border-dashed border-black/15 z-0" />

      {/* STEP 1: YOU DESCRIBE */}
      <div className="relative z-10 flex gap-4 items-start">
        
        {/* Step Marker Container (Circle + wrapped label outside circle) */}
        <div className="flex flex-col items-center shrink-0 w-14 text-center">
          <div className="h-8.5 w-8.5 rounded-full border border-black bg-white flex items-center justify-center shadow-sm font-black text-sm select-none">
            1
          </div>
          <span className="text-[8px] font-black uppercase tracking-tight text-black/60 mt-1 leading-tight w-14 text-center">
            You<br />describe
          </span>
        </div>

        {/* Card Component */}
        <div className="flex-1 flex flex-col border border-black bg-white p-5 shadow-[6px_6px_0px_rgba(0,0,0,1)] rounded-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px]" style={{ backgroundColor: LIME }} />
          
          <div className="flex gap-3.5 items-start">
            {/* Avatar */}
            <div className="h-9 w-9 rounded-full bg-black/10 flex items-center justify-center shrink-0 border border-black/5 overflow-hidden">
              <span className="text-xs font-black text-black/70">CF</span>
            </div>
            
            {/* Chat Bubble Prompt Box */}
            <div className="flex-1 bg-black/[0.02] border border-black/10 rounded-xl p-3 text-xs font-bold text-left relative leading-relaxed pr-8">
              <span>{inputText}</span>
              <Send className="absolute right-3.5 bottom-3.5 h-3.5 w-3.5 text-black/35" />
            </div>
          </div>

          {/* Clickable Preset templates selector */}
          <div className="mt-4 pt-3.5 border-t border-black/5">
            <p className="text-[9px] font-black uppercase tracking-wider text-black/45 mb-2">Preset Templates</p>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(presets) as PresetKey[]).map((presetName) => {
                const isActive = activePreset === presetName;
                return (
                  <button
                    key={presetName}
                    onClick={() => handlePresetClick(presetName)}
                    className={`text-[9px] font-black border px-2 py-1 rounded-sm select-none transition-all duration-300 hover:border-black ${
                      isActive
                        ? "bg-black text-white border-black" 
                        : "bg-white text-black/60 border-black/10"
                    }`}
                  >
                    {presetName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Trigger Button */}
          <button
            onClick={handleManualClick}
            className="mt-4 w-full flex items-center justify-center gap-1.5 border border-black bg-black text-white hover:bg-[#d4ff00] hover:text-black py-2.5 text-[10px] font-black uppercase tracking-wider transition-all duration-300 rounded-sm cursor-pointer shadow-sm premium-glow"
          >
            <span>Generate Automation</span>
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* STEP 2: TRACTIONFLO BUILDS */}
      <div className="relative z-10 flex gap-4 items-start">
        
        {/* Step Marker Container */}
        <div className="flex flex-col items-center shrink-0 w-14 text-center">
          <div className="h-8.5 w-8.5 rounded-full border border-black bg-white flex items-center justify-center shadow-sm font-black text-sm select-none">
            2
          </div>
          <span className="text-[8px] font-black uppercase tracking-tight text-black/60 mt-1 leading-tight w-14 text-center">
            TractionFlo<br />builds
          </span>
        </div>

        {/* Card Component */}
        <div className="flex-1 flex flex-col border border-black bg-white p-5 shadow-[6px_6px_0px_rgba(0,0,0,1)] rounded-sm relative overflow-hidden text-left min-h-[160px] justify-center">
          <div className="absolute top-0 left-0 w-full h-[3px]" style={{ backgroundColor: LIME }} />
          
          <AnimatePresence mode="wait">
            {!isGenerating ? (
              <motion.div key="idle" className="text-center py-2 text-xs font-semibold text-black/40">
                Click Generate above to build triggers
              </motion.div>
            ) : (
              <motion.div
                key="active"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col gap-4"
              >
                {/* Generating Loading header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className={`h-4 w-4 text-black ${progress < 100 ? "animate-spin" : ""}`} strokeWidth={2.5} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-black">
                      {progress < 100 ? "Generating..." : "Automation Ready!"}
                    </span>
                  </div>
                  <span className="text-[10px] font-black tracking-widest text-black/55">{progress}%</span>
                </div>

                {/* Sleek Line progress indicator */}
                <div className="w-full bg-black/10 h-1.5 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-black transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Step checklist */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {checklistItems.map((item, idx) => {
                    const isCheckVisible = visibleChecksCount > idx;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-1.5 transition-all duration-300 ${
                          isCheckVisible ? "opacity-100" : "opacity-15"
                        }`}
                      >
                        <div 
                          className="flex h-4.5 w-4.5 shrink-0 items-center justify-center border border-black rounded-sm"
                          style={isCheckVisible ? { backgroundColor: LIME } : undefined}
                        >
                          {isCheckVisible && <Check className="h-3 w-3 text-black" strokeWidth={3.5} />}
                        </div>
                        <span className="text-[10px] font-black text-black/80 truncate leading-none">{item}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* STEP 3: SEE IT LIVE */}
      <div className="relative z-10 flex gap-4 items-start">
        
        {/* Step Marker Container */}
        <div className="flex flex-col items-center shrink-0 w-14 text-center">
          <div className="h-8.5 w-8.5 rounded-full border border-black bg-white flex items-center justify-center shadow-sm font-black text-sm select-none">
            3
          </div>
          <span className="text-[8px] font-black uppercase tracking-tight text-black/60 mt-1 leading-tight w-14 text-center">
            See it<br />live
          </span>
        </div>

        {/* Card Component */}
        <div className="flex-1 flex flex-col border border-black bg-white p-5 shadow-[6px_6px_0px_rgba(0,0,0,1)] rounded-sm relative overflow-hidden min-h-[140px] justify-center text-left">
          <div className="absolute top-0 left-0 w-full h-[3px]" style={{ backgroundColor: LIME }} />
          
          <AnimatePresence mode="wait">
            {!showWorkflow ? (
              <motion.div key="idle" className="text-center py-2 text-xs font-semibold text-black/40">
                Waiting for engine to build...
              </motion.div>
            ) : (
              <motion.div
                key="active"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3.5 relative"
              >
                {/* Header */}
                <div className="flex items-center gap-1.5 text-xs font-black text-black/75">
                  <span className="text-pink-600 font-bold">Instagram comment:</span>
                  <span className="text-[#007257] font-black underline">GUIDE 👆</span>
                </div>

                {/* Steps flowchart horizontal */}
                <div className="flex flex-wrap items-center gap-1.5 py-1">
                  {workflowSteps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <div 
                        className={`flex items-center gap-1 border px-2 py-1.5 rounded-sm text-[9px] font-black uppercase tracking-wider select-none shadow-sm ${
                          step.success
                            ? 'border-[#007257] text-[#007257] bg-[#007257]/5'
                            : 'bg-black text-white border-black'
                        }`}
                      >
                        <span className="text-[11px] leading-none shrink-0">{step.icon}</span>
                        <span className="truncate max-w-[84px]">{step.label}</span>
                      </div>
                      
                      {idx < workflowSteps.length - 1 && (
                        <span className="text-black/35 font-bold text-xs shrink-0">→</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Big handwritten DONE stamp overlay */}
                <motion.div 
                  initial={{ scale: 0, rotate: 20, opacity: 0 }}
                  animate={{ scale: 1, rotate: -4, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 140, damping: 10, delay: 0.2 }}
                  className="absolute bottom-[-15px] right-[-10px] text-2xl font-black tracking-widest text-green-600 select-none border-2 border-green-600 rounded-md px-3 py-1 bg-white shadow-lg"
                  style={{ fontFamily: 'var(--font-handwritten)' }}
                >
                  Done ✓
                </motion.div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}
