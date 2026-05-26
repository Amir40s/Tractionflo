"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  FileText,
  CircleDollarSign,
  UserPlus,
  Gift,
  Megaphone,
  type LucideIcon,
} from "lucide-react";

const ACCENT = "#CCFF00";
const SCROLL_TRIGGER_RATIO = 0.42;

type CreatorFeature = {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  videoUrl: string;
};

const creatorFeatures: CreatorFeature[] = [
  {
    id: "comment-dm",
    label: "Comment -> DM",
    icon: MessageCircle,
    description:
      "Instantly launch automated DMs from Reel or Post comments.",
    videoUrl:
      "https://mccdn.me/martcdn/next-lp/contents/home-redesign/features_01v1.webm",
  },
  {
    id: "guide-delivery",
    label: "Guide delivery",
    icon: FileText,
    description:
      "Instantly send free guides, lead magnets, or checklists.",
    videoUrl:
      "https://mccdn.me/martcdn/next-lp/contents/home-redesign/features_02v2.webm",
  },
  {
    id: "pricing-q",
    label: "Pricing questions",
    icon: CircleDollarSign,
    description:
      "Answer product pricing queries directly with structured PDFs.",
    videoUrl:
      "https://mccdn.me/martcdn/next-lp/contents/home-redesign/features_03v1.webm",
  },
  {
    id: "welcome",
    label: "Welcome followers",
    icon: UserPlus,
    description:
      "Welcome new followers automatically with special greetings.",
    videoUrl:
      "https://mccdn.me/martcdn/next-lp/contents/home-redesign/features_04v1.webm",
  },
  {
    id: "giveaway",
    label: "Giveaways & campaigns",
    icon: Gift,
    description: "Drive high engagement by running giveaways inside DMs.",
    videoUrl:
      "https://mccdn.me/martcdn/next-lp/contents/home-redesign/features_01v1.webm",
  },
  {
    id: "broadcasts",
    label: "Broadcast campaigns",
    icon: Megaphone,
    description:
      "Blast notifications directly to all leads without algorithm filters.",
    videoUrl:
      "https://mccdn.me/martcdn/next-lp/contents/home-redesign/features_03v1.webm",
  },
];

function DevicePreview({
  videoUrl,
  activeId,
  compact = false,
}: {
  videoUrl?: string;
  activeId: string;
  compact?: boolean;
}) {
  return (
    <div className="relative flex justify-center">
      <div
        className={`pointer-events-none absolute inset-0 opacity-80 ${
          compact
            ? "-m-3 rounded-[28px] blur-[24px]"
            : "-m-6 rounded-[40px] blur-[40px] lg:-m-10 lg:rounded-[60px] lg:blur-[60px]"
        } bg-gradient-to-tr from-[#CCFF00]/10 via-emerald-500/5 to-cyan-500/10`}
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

        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
          <motion.video
            key={activeId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        </div>

        <div className="absolute inset-x-0 bottom-2.5 z-25 flex justify-center">
          <div
            className={`rounded-full bg-white/40 ${compact ? "h-px w-12" : "h-1 w-28"}`}
          />
        </div>
      </div>
    </div>
  );
}

const STICKY_TOP_PX = 96;
const PHONE_HEIGHT_PX = 600;
const PHONE_WIDTH_PX = 290;

export default function CreatorWorkflows() {
  const [activeTab, setActiveTab] = useState(creatorFeatures[0].id);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);
  const stepsTrackRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const rafRef = useRef<number | null>(null);
  const [phonePin, setPhonePin] = useState<"flow" | "fixed" | "end">("flow");
  const [phoneBox, setPhoneBox] = useState({ left: 0, width: 320 });

  const updateActiveFromScroll = useCallback(() => {
    const triggerY = window.innerHeight * SCROLL_TRIGGER_RATIO;
    let nextActive = creatorFeatures[0].id;

    creatorFeatures.forEach((feat, index) => {
      const el = stepRefs.current[index];
      if (!el) return;
      const { top } = el.getBoundingClientRect();
      if (top <= triggerY) {
        nextActive = feat.id;
      }
    });

    setActiveTab((prev) => (prev === nextActive ? prev : nextActive));
  }, []);

  const scheduleScrollUpdate = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      updateActiveFromScroll();
    });
  }, [updateActiveFromScroll]);

  const updatePhonePin = useCallback(() => {
    if (window.innerWidth < 1024) {
      setPhonePin("flow");
      return;
    }

    const section = sectionRef.current;
    const aside = asideRef.current;
    if (!section || !aside) return;

    const sectionRect = section.getBoundingClientRect();
    const asideRect = aside.getBoundingClientRect();
    const centeredLeft =
      asideRect.left + Math.max(0, (asideRect.width - PHONE_WIDTH_PX) / 2);
    setPhoneBox({ left: centeredLeft, width: PHONE_WIDTH_PX });

    if (sectionRect.top > STICKY_TOP_PX) {
      setPhonePin("flow");
    } else if (sectionRect.bottom < STICKY_TOP_PX + PHONE_HEIGHT_PX) {
      setPhonePin("end");
    } else {
      setPhonePin("fixed");
    }
  }, []);

  useEffect(() => {
    updateActiveFromScroll();
    updatePhonePin();
    const t = window.setTimeout(() => {
      updateActiveFromScroll();
      updatePhonePin();
    }, 150);

    const onScroll = () => {
      scheduleScrollUpdate();
      updatePhonePin();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    const track = stepsTrackRef.current;
    const observer =
      track &&
      new IntersectionObserver(scheduleScrollUpdate, {
        root: null,
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      });

    if (observer && track) observer.observe(track);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      observer?.disconnect();
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, [scheduleScrollUpdate, updateActiveFromScroll, updatePhonePin]);

  const activeFeature =
    creatorFeatures.find((f) => f.id === activeTab) ?? creatorFeatures[0];

  const scrollToStep = (index: number) => {
    stepRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const phonePinStyle =
    phonePin === "fixed"
      ? {
          position: "fixed" as const,
          top: STICKY_TOP_PX,
          left: phoneBox.left,
          width: phoneBox.width,
          zIndex: 5,
        }
      : phonePin === "end"
        ? {
            position: "absolute" as const,
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: PHONE_WIDTH_PX,
            zIndex: 5,
          }
        : undefined;

  return (
    <div ref={sectionRef} className="relative w-full text-left text-black">
      {/* Grid: left = header + steps (tall). Right aside stretches to same height → sticky works. */}
      <div className="grid grid-cols-[minmax(0,1fr)_clamp(112px,30vw,168px)] gap-x-3 sm:gap-x-5 lg:grid-cols-2 lg:gap-x-16">
        <div className="relative min-w-0 lg:border-r-2 lg:border-dotted lg:border-black/15 lg:pr-12">
          <div className="max-w-lg pt-10">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-black/50">
              CREATOR CONTEXT
            </p>
            <h2 className="mb-6 text-4xl font-black leading-[0.95] tracking-tight md:text-5xl lg:text-6xl">
              Same features creators already use.
            </h2>
            <p className="text-base font-medium leading-7 text-black/60">
              TractionFlo doesn&apos;t limit your growth. Keep all the core
              automation rules, lists, triggers, and sequences that you loved in
              flow builders, but trigger them by just chatting.
            </p>
          </div>

          <div
            ref={stepsTrackRef}
            className="mt-10 max-w-lg space-y-3 pb-[min(55vh,480px)] sm:mt-16 sm:space-y-4 lg:space-y-5 lg:pb-[42vh]"
          >
            {creatorFeatures.map((feat, index) => {
              const isActive = activeTab === feat.id;
              const Icon = feat.icon;
              return (
                <div
                  key={feat.id}
                  ref={(el) => {
                    stepRefs.current[index] = el;
                  }}
                  data-feature-id={feat.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setActiveTab(feat.id);
                    scrollToStep(index);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveTab(feat.id);
                      scrollToStep(index);
                    }
                  }}
                  className={`group relative flex min-h-[112px] w-full cursor-pointer items-start gap-3 rounded-xl p-4 text-left transition-all duration-300 sm:min-h-[128px] sm:gap-5 sm:p-6 ${
                    isActive
                      ? "border-l-[3px] bg-white shadow-[0_15px_40px_rgba(0,0,0,0.04)]"
                      : "border-l-[3px] border-transparent bg-transparent opacity-45"
                  }`}
                  style={
                    isActive ? { borderLeftColor: ACCENT } : undefined
                  }
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 sm:h-12 sm:w-12 ${
                      isActive
                        ? "border-black text-black shadow-sm"
                        : "border-black/10 bg-black/5 text-black/40"
                    }`}
                    style={
                      isActive
                        ? { backgroundColor: ACCENT, color: "black" }
                        : undefined
                    }
                  >
                    <Icon
                      className="h-5 w-5 sm:h-6 sm:w-6"
                      strokeWidth={isActive ? 2.5 : 2.2}
                    />
                  </div>
                  <div className="min-w-0">
                    <h4
                      className={`text-base font-black tracking-tight transition-colors duration-250 sm:text-lg ${
                        isActive ? "text-black" : "text-black/80"
                      }`}
                    >
                      {feat.label}
                    </h4>
                    <p className="mt-1.5 text-xs font-semibold leading-relaxed text-black/50 sm:mt-2 sm:text-sm">
                      {feat.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: full-height track; only inner phone is sticky */}
        <aside
          ref={asideRef}
          className="workflows-sticky-aside relative flex min-h-full flex-col items-center lg:pl-6 lg:pr-2"
        >
          {/* Mobile: CSS sticky */}
          <div className="workflows-sticky-preview flex w-full justify-center lg:hidden">
            <DevicePreview
              activeId={activeTab}
              videoUrl={activeFeature.videoUrl}
              compact
            />
          </div>
          {/* Desktop: placeholder reserves space when phone is position:fixed */}
          {phonePin === "fixed" && (
            <div
              className="hidden h-[580px] w-[290px] shrink-0 lg:block"
              aria-hidden
            />
          )}
          <div
            className="hidden shrink-0 justify-center lg:flex"
            style={phonePinStyle}
          >
            <DevicePreview
              activeId={activeTab}
              videoUrl={activeFeature.videoUrl}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
