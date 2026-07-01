"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  CheckCircle2,
  CircleDollarSign,
  Briefcase,
  HelpCircle as FaqIcon,
  BookOpen,
  Send
} from "lucide-react";

const ACCENT = "#d4ff00";

type FileItem = {
  name: string;
  size: string;
  type: 'pdf' | 'zip' | 'folder';
  status: 'idle' | 'scanning' | 'done';
};

const initialFiles: FileItem[] = [
  { name: "Course Guide.pdf", size: "2.4 MB", type: 'pdf', status: 'idle' },
  { name: "Pricing Sheet.pdf", size: "1.1 MB", type: 'pdf', status: 'idle' },
  { name: "FAQ Doc.pdf", size: "890 KB", type: 'pdf', status: 'idle' },
  { name: "Templates.zip", size: "3.2 MB", type: 'zip', status: 'idle' },
  { name: "Coaching Docs", size: "12 files", type: 'folder', status: 'idle' },
];

export default function KnowledgeUploader() {
  const [files, setFiles] = useState<FileItem[]>(initialFiles);
  const [chatStep, setChatStep] = useState(0); // 0: idle, 1: question, 2: thinking, 3: answered
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const loopRef = useRef<NodeJS.Timeout | null>(null);

  const startUploadSequence = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    // Reset states
    setFiles(initialFiles.map(f => ({ ...f, status: 'idle' })));
    setChatStep(0);

    // Scan files one-by-one
    let currentIdx = 0;
    
    const scanNext = () => {
      if (currentIdx < initialFiles.length) {
        // Scans for 500ms then turns done
        setFiles(prev => prev.map((f, i) => i === currentIdx ? { ...f, status: 'scanning' } : f));
        
        timerRef.current = setTimeout(() => {
          setFiles(prev => prev.map((f, i) => i === currentIdx ? { ...f, status: 'done' } : f));
          currentIdx++;
          scanNext();
        }, 550);
      } else {
        // Start Q&A chat preview on the right
        timerRef.current = setTimeout(() => {
          setChatStep(1); // Follower question
          
          timerRef.current = setTimeout(() => {
            setChatStep(2); // Bot thinking
            
            timerRef.current = setTimeout(() => {
              setChatStep(3); // Bot reply
            }, 1400);
          }, 1000);
        }, 400);
      }
    };

    scanNext();
  }, []);

  useEffect(() => {
    const startTimer = setTimeout(startUploadSequence, 0);

    loopRef.current = setInterval(() => {
      startUploadSequence();
    }, 15000); // Replay every 15s

    return () => {
      clearTimeout(startTimer);
      if (loopRef.current) clearInterval(loopRef.current);
      const timer = timerRef.current;
      if (timer) clearTimeout(timer);
    };
  }, [startUploadSequence]);

  const handleManualSync = () => {
    if (loopRef.current) clearInterval(loopRef.current);
    startUploadSequence();
    loopRef.current = setInterval(() => {
      startUploadSequence();
    }, 15000);
  };

  return (
    <div className="w-full relative py-8 text-black select-none">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] items-stretch mt-6 max-w-5xl mx-auto">

        {/* LEFT COLUMN: FILE INVENTORY & BADGES */}
        <div className="flex flex-col text-left relative items-center lg:items-start">
          
          {/* Main Upload Box */}
          <div className="w-full max-w-[480px] bg-white border border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] rounded-sm p-8 relative overflow-hidden flex flex-col justify-between h-[600px]">
            <div className="absolute top-0 left-0 w-full h-[3px]" style={{ backgroundColor: ACCENT }} />
            
            <div>
              {/* Header info */}
              <div className="flex items-center gap-3.5 mb-6 border-b border-black/10 pb-5">
                <div className="h-11 w-11 rounded-xl bg-[#d4ff00]/10 border border-[#d4ff00]/30 flex items-center justify-center text-black font-black">
                  <UploadCloudIcon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-base font-black uppercase tracking-wider leading-none">Upload any content</h4>
                  <p className="text-[11px] font-bold text-black/45 mt-1.5 leading-none">Add your files. TractionFlo learns everything.</p>
                </div>
              </div>

              {/* File lists with scan animations */}
              <div className="space-y-3">
                {files.map((file, idx) => {
                  const isDone = file.status === 'done';
                  const isScanning = file.status === 'scanning';
                  return (
                    <div
                      key={file.name}
                      className={`flex items-center justify-between p-3.5 border rounded-sm transition-all duration-300 ${
                        isDone
                          ? 'border-black/15 bg-[#007257]/[0.01]'
                          : isScanning
                          ? 'border-black bg-black/[0.02]'
                          : 'border-black/5 opacity-55'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        {/* Icon */}
                        <div 
                          className={`h-10 w-10 rounded-md flex items-center justify-center shrink-0 border shadow-sm ${
                            file.type === 'pdf' 
                              ? 'bg-red-500 border-red-600 text-white' 
                              : file.type === 'zip'
                              ? 'bg-blue-600 border-blue-700 text-white'
                              : 'bg-amber-400 border-amber-500 text-black'
                          }`}
                        >
                          <span className="text-[10px] font-black uppercase">
                            {file.type === 'pdf' ? 'PDF' : file.type === 'zip' ? 'ZIP' : 'DIR'}
                          </span>
                        </div>
                        
                        <div className="text-left">
                          <p className="text-sm font-black text-black leading-tight">{file.name}</p>
                          <p className="text-[10px] font-semibold text-black/45 mt-0.5">{file.size}</p>
                        </div>
                      </div>

                      {/* Progress check states */}
                      <div className="shrink-0">
                        {isDone ? (
                          <CheckCircle2 className="h-5.5 w-5.5 text-green-600 fill-green-500/10" strokeWidth={2.5} />
                        ) : isScanning ? (
                          <div className="h-4.5 w-4.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <div className="h-2 w-2 bg-black/10 rounded-full mr-1.5" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Simulated green handwritten curves overlay */}
            <div className="relative pointer-events-none select-none flex items-center justify-end gap-1.5 mt-2 pr-2">
              <svg className="w-14 h-9 text-green-600 shrink-0 mt-2" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 50 30">
                <path d="M5,5 C25,25 35,5 45,20" strokeLinecap="round" />
                <polygon points="45,20 38,18 43,14" fill="currentColor" stroke="none" />
              </svg>
              <span className="text-[13px] font-black text-green-600 tracking-wider rotate-[-4deg] mt-3" style={{ fontFamily: 'var(--font-handwritten)' }}>
                Learns your business
              </span>
            </div>
          </div>

          {/* Bottom sub-badges catalog row */}
          <div className="flex flex-wrap gap-2 mt-8 justify-start w-full max-w-[480px]">
            {[
              { label: "PDFs", icon: FileText },
              { label: "FAQs", icon: FaqIcon },
              { label: "Pricing", icon: CircleDollarSign },
              { label: "Docs", icon: Briefcase },
              { label: "Guides", icon: BookOpen }
            ].map((badge, idx) => {
              const Icon = badge.icon;
              return (
                <div key={idx} className="flex items-center gap-1.5 border border-black/10 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-sm text-black/60 shadow-sm hover:border-black/25 transition-colors">
                  <Icon className="h-4 w-4" strokeWidth={2.5} />
                  <span>{badge.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: HIGH-FIDELITY CHAT PREVIEW */}
        <div className="flex justify-center lg:justify-end relative items-center">
          
          <div className="relative w-full max-w-[340px]">
            {/* Backdrop glow */}
            <div className="absolute inset-0 scale-110 blur-3xl opacity-20 pointer-events-none" style={{ backgroundColor: ACCENT }} />
            
            {/* Device Container */}
            <div className="relative overflow-hidden rounded-[38px] border-[8px] border-[#1a1a1a] bg-black shadow-[0_30px_80px_rgba(0,0,0,0.18)]">
              
              {/* Phone app header */}
              <div className="border-b border-white/10 bg-[#111] px-4.5 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-orange-400 via-pink-500 to-orange-600 p-[1px]"></div>
                      <div className="h-full w-full rounded-full bg-black flex items-center justify-center border-2 border-black overflow-hidden font-black text-white text-[10px]">
                        TF
                      </div>
                    </div>
                    <div className="text-left">
                      <h4 className="text-sm font-black text-white leading-tight">yourbusiness.ai</h4>
                      <p className="text-[10px] font-bold text-green-400">Active now</p>
                    </div>
                  </div>
                  <div className="rounded-full bg-white/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-white">
                    LIVE
                  </div>
                </div>
              </div>

              {/* Chat Body Container */}
              <div className="space-y-4 bg-[#0c0c0c] px-4 py-5 min-h-[520px] flex flex-col justify-between relative">
                
                {/* Message feed log */}
                <div className="flex-1 flex flex-col gap-3.5 justify-start">
                  
                  {/* Step 1: User queries */}
                  {chatStep >= 1 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start max-w-[85%] gap-2.5 items-start"
                    >
                      <div className="h-6.5 w-6.5 rounded-full bg-white/15 border border-white/5 flex items-center justify-center shrink-0 font-bold text-[10px] text-white/70">F</div>
                      <div className="bg-[#262626] text-white px-3.5 py-2.5 text-xs md:text-[12.5px] font-bold rounded-2xl rounded-bl-sm text-left">
                        What&apos;s included in your course?
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Thinking animated bubble */}
                  {chatStep === 2 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-end"
                    >
                      <div className="flex items-center gap-1.5 rounded-[20px] rounded-br-sm px-3.5 py-2 bg-white/5 border border-white/10 text-white/60">
                        <span className="text-[11px] font-black uppercase tracking-wider">TractionFlo is thinking...</span>
                        <div className="flex gap-0.5">
                          <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="h-1 w-1 bg-white/60 rounded-full" />
                          <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.15 }} className="h-1 w-1 bg-white/60 rounded-full" />
                          <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.3 }} className="h-1 w-1 bg-white/60 rounded-full" />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Bot answers generated natively */}
                  {chatStep === 3 && (
                    <motion.div
                      initial={{ opacity: 0, y: 12, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="flex justify-end max-w-[90%] self-end items-start gap-2.5"
                    >
                      <div className="flex flex-col gap-2.5 items-end w-full">
                        <div className="bg-white text-black border border-black/10 px-4 py-3.5 rounded-2xl rounded-br-sm text-xs md:text-[12.5px] font-bold text-left leading-relaxed shadow-lg bg-white w-full">
                          <span>Includes </span>
                          <span className="text-green-700 font-extrabold underline">setup templates</span>
                          <span>, </span>
                          <span className="text-green-700 font-extrabold underline">pricing</span>
                          <span> breakdown, </span>
                          <span className="text-green-700 font-extrabold underline">onboarding guide</span>
                          <span> and </span>
                          <span className="text-green-700 font-extrabold underline font-black">bonuses</span>
                          <span> from your uploaded content.</span>
                        </div>
                        
                        {/* Synced verification label */}
                        <div className="flex items-center gap-1.5 bg-[#007257]/15 border border-[#007257]/30 text-[#d4ff00] text-[9.5px] font-black uppercase tracking-wider px-4 py-2 rounded-lg w-full justify-center">
                          <CheckCircle2 className="h-4 w-4 text-[#d4ff00]" strokeWidth={3.5} />
                          <span>Answered from your content instantly</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                </div>

                {/* Simulated handwritten captions overlay */}
                <AnimatePresence>
                  {chatStep === 3 && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute bottom-20 left-[-45px] pointer-events-none select-none flex flex-col items-center z-25 text-left"
                    >
                      <span className="text-[14px] font-black text-[#d4ff00] tracking-wider rotate-[-5deg] ml-6 leading-none" style={{ fontFamily: 'var(--font-handwritten)' }}>
                        Answers from your content
                      </span>
                      <svg className="w-14 h-9 text-[#d4ff00] mt-1.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 50 30">
                        <path d="M45,5 C25,25 15,5 5,20" strokeLinecap="round" />
                        <polygon points="5,20 12,18 7,14" fill="currentColor" stroke="none" />
                      </svg>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Input area mockup footer */}
                <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-white/30 px-1 select-none">
                  <span>Message...</span>
                  <Send className="h-4 w-4" />
                </div>

              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Custom UploadCloudIcon SVG
function UploadCloudIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M12 12v9" />
      <path d="m16 16-4-4-4 4" />
    </svg>
  );
}
