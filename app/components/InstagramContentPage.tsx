"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Bot,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  Play,
  RefreshCw,
  Send,
  Sparkles,
  TriangleAlert,
  UploadCloud,
  UserCheck,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  defaultInstagramWelcomeAutomation,
  renderInstagramWelcomeMessage,
  type InstagramWelcomeAutomationSettings,
} from "@/lib/instagram-welcome-automation";

type InstagramFollowerPoint = {
  date: string;
  newFollowers: number;
};

type InstagramAccount = {
  id: string;
  username?: string;
  name?: string;
  accountType?: string;
  mediaCount?: number;
  followersCount?: number | null;
  followingCount?: number | null;
  followerHistory?: InstagramFollowerPoint[];
  followerHistoryError?: string;
};

type InstagramContentItem = {
  id: string;
  kind: "post" | "story";
  caption: string;
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl: string;
  permalink: string;
  timestamp: string;
  commentsCount: number;
  likeCount: number | null;
};

type InstagramComment = {
  id: string;
  text: string;
  timestamp: string;
  username: string;
  likeCount: number;
  replies: InstagramComment[];
};

type InstagramContentResponse = {
  account?: InstagramAccount | null;
  posts?: InstagramContentItem[];
  stories?: InstagramContentItem[];
  error?: string;
  postError?: string;
  storyError?: string;
};


type InstagramCommentsResponse = {
  comments?: InstagramComment[];
  error?: string;
};

type DraftState = {
  text: string;
  knowledgeLabel: string;
  status: string;
};

type CommentTakeoverMode = "ai" | "human";
type InstagramContentTab = "posts" | "stories" | "followers";
type ContentPageSize = 5 | 10 | 20 | 30 | 50 | "all";

const commentAutomationStorageKey = "tractionflo.instagram.commentAutomation";
const commentTakeoverStorageKey = "tractionflo.instagram.commentTakeover";
const contentPageSizeOptions: ContentPageSize[] = [5, 10, 20, 30, 50, "all"];

function parseContentPageSize(value: string): ContentPageSize {
  if (value === "all") {
    return "all";
  }

  if (value === "10") {
    return 10;
  }

  if (value === "20") {
    return 20;
  }

  if (value === "30") {
    return 30;
  }

  if (value === "50") {
    return 50;
  }

  return 5;
}

function readStoredRecord<T extends string | boolean>(key: string) {
  if (typeof window === "undefined") {
    return {} as Record<string, T>;
  }

  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as Record<string, T>) : {};
  } catch {
    return {} as Record<string, T>;
  }
}

function writeStoredRecord<T extends string | boolean>(key: string, value: Record<string, T>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function InstagramDot() {
  return (
    <span className="relative h-3.5 w-3.5 rounded-[4px] bg-gradient-to-tr from-[#ffb000] via-[#ff3e8a] to-[#7b39ff]">
      <span className="absolute left-[3.5px] top-[3.5px] h-[6px] w-[6px] rounded-full border border-white" />
      <span className="absolute right-[2px] top-[2px] h-[2.5px] w-[2.5px] rounded-full bg-white" />
    </span>
  );
}

function formatDate(value: string) {
  if (!value) {
    return "No date";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "No date";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trim()}...`;
}

function getKnowledgeLabel(knowledge?: { mode?: string; sourceTitle?: string; matches?: number }) {
  if (!knowledge?.mode || knowledge.mode === "none") {
    return "No knowledge match";
  }

  return knowledge.sourceTitle ? `Used ${knowledge.sourceTitle}` : `${knowledge.matches || 0} knowledge match${knowledge.matches === 1 ? "" : "es"}`;
}

function formatCompactNumber(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/A";
  }

  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function getStoryMediaTypeFromFile(file: File): "image" | "video" | "" {
  if (file.type.startsWith("image/")) {
    return "image";
  }

  if (file.type.startsWith("video/")) {
    return "video";
  }

  return "";
}

function getMonthKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "";
  }

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);

  if (!year || !month) {
    return monthKey;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function formatDateInputValue(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "";
  }

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function shiftMonth(date: Date, offset: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
}

function buildFollowerDateBounds(history: InstagramFollowerPoint[]) {
  const now = new Date();
  const fallbackStart = shiftMonth(now, -5);
  const fallbackEnd = now;
  const sortedDates = history
    .map((point) => formatDateInputValue(point.date))
    .filter(Boolean)
    .sort();

  return {
    start: sortedDates[0] || formatDateInputValue(fallbackStart),
    end: sortedDates[sortedDates.length - 1] || formatDateInputValue(fallbackEnd),
  };
}

function getDateFromInput(value: string, endOfDay = false) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0));
}

function isDateInRange(value: string, startDate: string, endDate: string) {
  const date = new Date(value);
  const start = getDateFromInput(startDate);
  const end = getDateFromInput(endDate, true);

  if (!Number.isFinite(date.getTime()) || !start || !end) {
    return false;
  }

  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

function getMonthsBetweenDates(startDate: string, endDate: string) {
  const start = getDateFromInput(startDate);
  const end = getDateFromInput(endDate);

  if (!start || !end) {
    return [];
  }

  const months = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const endCursor = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));

  while (cursor.getTime() <= endCursor.getTime()) {
    const value = getMonthKey(cursor);
    months.push({
      value,
      label: getMonthLabel(value),
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months;
}

function sumFollowerPoints(history: InstagramFollowerPoint[], predicate: (point: InstagramFollowerPoint) => boolean) {
  return history.reduce((sum, point) => {
    return predicate(point) ? sum + Math.max(0, Number(point.newFollowers || 0)) : sum;
  }, 0);
}

function InstagramVideoPlayer({ src, poster }: { src: string; poster?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => setIsPlaying(false));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration || 1;
      setProgress((current / duration) * 100);
    }
  };

  return (
    <div
      onClick={togglePlay}
      className="relative h-full w-full bg-black cursor-pointer group select-none"
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        loop
        muted={isMuted}
        autoPlay
        playsInline
        onTimeUpdate={handleTimeUpdate}
        className="h-full w-full object-cover"
      />

      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-all">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm animate-in zoom-in-90 duration-150">
            <Play size={26} fill="currentColor" className="ml-1" />
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-between pointer-events-none">
        <div />
        <button
          type="button"
          onClick={toggleMute}
          className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 active:scale-95"
          aria-label={isMuted ? "Unmute video" : "Mute video"}
        >
          {isMuted ? (
            <VolumeX size={15} strokeWidth={2.4} />
          ) : (
            <Volume2 size={15} strokeWidth={2.4} />
          )}
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
        <div
          className="h-full bg-[#4b3cff] transition-[width] duration-75"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function MediaPreview({ item, play = false }: { item: InstagramContentItem; play?: boolean }) {
  const previewUrl = item.thumbnailUrl || item.mediaUrl;
  const isVideo = item.mediaType.toLowerCase().includes("video") || item.mediaType.toLowerCase().includes("reel");

  return (
    <div className="relative aspect-square overflow-hidden rounded-[8px] bg-[#f0f2f7]">
      {play && isVideo && item.mediaUrl ? (
        <InstagramVideoPlayer src={item.mediaUrl} poster={item.thumbnailUrl} />
      ) : previewUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${previewUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[#7a8295]">
          <ImageIcon size={30} strokeWidth={2.2} />
        </div>
      )}
      {(!play || !isVideo) && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent px-3 pb-3 pt-10 text-white">
          <span className="flex items-center gap-1.5 rounded-[7px] bg-white/18 px-2 py-1 text-[10px] font-extrabold uppercase backdrop-blur">
            {isVideo ? <Play size={12} fill="currentColor" strokeWidth={2.1} /> : <ImageIcon size={12} strokeWidth={2.1} />}
            {item.mediaType || item.kind}
          </span>
          {item.kind === "post" ? (
            <span className="flex items-center gap-1.5 text-[11px] font-extrabold">
              <MessageCircle size={13} strokeWidth={2.25} />
              {item.commentsCount}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ContentCard({
  item,
  active,
  onSelect,
}: {
  item: InstagramContentItem;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-[10px] border bg-white p-3 text-left shadow-[0_18px_48px_rgba(20,28,53,0.035)] transition ${active ? "border-[#4b3cff] ring-2 ring-[#4b3cff]/10" : "border-[#e6eaf2] hover:border-[#cfd6e6]"
        }`}
    >
      <MediaPreview item={item} />
      <div className="mt-3 flex items-center gap-2 text-[11px] font-bold text-[#596175]">
        <InstagramDot />
        <span>{formatDate(item.timestamp)}</span>
      </div>
      <p className="mt-2 min-h-[40px] text-[12px] font-semibold leading-relaxed text-[#253049]">
        {item.caption ? truncateText(item.caption, 106) : item.kind === "story" ? "Active story" : "No caption"}
      </p>
      <div className="mt-3 flex items-center justify-between text-[11px] font-extrabold text-[#46506a]">
        <span className="flex items-center gap-1.5">
          <MessageCircle size={13} strokeWidth={2.25} />
          {item.kind === "post" ? `${item.commentsCount} comments` : "Story replies"}
        </span>
        {typeof item.likeCount === "number" ? (
          <span className="flex items-center gap-1.5">
            <Heart size={13} strokeWidth={2.25} />
            {item.likeCount}
          </span>
        ) : null}
      </div>
    </button>
  );
}

function ContentPagination({
  totalItems,
  startItem,
  endItem,
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  totalItems: number;
  startItem: number;
  endItem: number;
  page: number;
  totalPages: number;
  pageSize: ContentPageSize;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: ContentPageSize) => void;
}) {
  const canGoBack = page > 1;
  const canGoForward = page < totalPages;

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-[10px] border border-[#e6eaf2] bg-white p-3 shadow-[0_14px_34px_rgba(20,28,53,0.03)] sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[12px] font-bold text-[#596175]">
        Showing <span className="text-[#253049]">{startItem}-{endItem}</span> of <span className="text-[#253049]">{totalItems}</span>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-[12px] font-extrabold text-[#596175]">
          Show
          <select
            value={String(pageSize)}
            onChange={(event) => onPageSizeChange(parseContentPageSize(event.target.value))}
            className="h-9 w-[92px] rounded-[8px] border border-[#dce2ee] bg-white px-3 text-[12px] font-extrabold text-[#253049] outline-none transition focus:border-[#4b3cff] focus:ring-2 focus:ring-[#4b3cff]/15"
            aria-label="Select Instagram content page size"
          >
            {contentPageSizeOptions.map((option) => (
              <option key={String(option)} value={String(option)}>
                {option === "all" ? "All" : option}
              </option>
            ))}
          </select>
        </label>

        <div className="flex h-9 items-center overflow-hidden rounded-[8px] border border-[#dce2ee] bg-white">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={!canGoBack}
            className="flex h-9 w-9 items-center justify-center text-[#253049] transition hover:bg-[#f6f7fb] disabled:cursor-not-allowed disabled:text-[#aab1c0]"
            aria-label="Previous page"
          >
            <ChevronLeft size={16} strokeWidth={2.4} />
          </button>
          <span className="min-w-[86px] border-x border-[#dce2ee] px-3 text-center text-[12px] font-extrabold text-[#253049]">
            {pageSize === "all" ? "All" : `${page} / ${totalPages}`}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={!canGoForward}
            className="flex h-9 w-9 items-center justify-center text-[#253049] transition hover:bg-[#f6f7fb] disabled:cursor-not-allowed disabled:text-[#aab1c0]"
            aria-label="Next page"
          >
            <ChevronRight size={16} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-[12px] border border-dashed border-[#d7deeb] bg-white p-8 text-center shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <TriangleAlert className="mx-auto text-[#4b3cff]" size={28} strokeWidth={2.35} />
      <h2 className="mt-3 text-[15px] font-extrabold text-black">{title}</h2>
      <p className="mx-auto mt-2 max-w-[460px] text-[12px] font-medium leading-relaxed text-[#596175]">{detail}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}


function FollowersTab({
  account,
  loadingContent,
  startDate,
  endDate,
  welcomeAutomation,
  welcomeSaving,
  welcomeStatus,
  onStartDateChange,
  onEndDateChange,
  onWelcomeChange,
  onSaveWelcome,
}: {
  account: InstagramAccount | null;
  loadingContent: boolean;
  startDate: string;
  endDate: string;
  welcomeAutomation: InstagramWelcomeAutomationSettings;
  welcomeSaving: boolean;
  welcomeStatus: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onWelcomeChange: (settings: InstagramWelcomeAutomationSettings) => void;
  onSaveWelcome: () => void;
}) {
  const history = account?.followerHistory || [];
  const rows = getMonthsBetweenDates(startDate, endDate);
  const newFollowersInRange = sumFollowerPoints(history, (point) => isDateInRange(point.date, startDate, endDate));
  const newFollowersSinceRangeStart = sumFollowerPoints(history, (point) => {
    const date = new Date(point.date);
    const start = getDateFromInput(startDate);

    return Boolean(start && Number.isFinite(date.getTime()) && date.getTime() >= start.getTime());
  });
  const oldFollowersBeforeRange =
    typeof account?.followersCount === "number" ? Math.max(0, account.followersCount - newFollowersSinceRangeStart) : null;
  const welcomePreview = renderInstagramWelcomeMessage({
    template: welcomeAutomation.message,
    name: "Sarah Khan",
    username: "sarah.creator",
  });

  if (loadingContent) {
    return (
      <section className="mt-5">
        <EmptyState title="Loading followers" detail="Reading Instagram profile counts and follower insights." />
      </section>
    );
  }

  if (!account) {
    return (
      <section className="mt-5">
        <EmptyState title="No Instagram account connected" detail="Connect an Instagram account to see follower and following counts." />
      </section>
    );
  }

  return (
    <section className="mt-5 space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Current followers",
            value: formatCompactNumber(account.followersCount),
            icon: <Users size={16} strokeWidth={2.35} />,
          },
          {
            label: "Following",
            value: formatCompactNumber(account.followingCount),
            icon: <UserCheck size={16} strokeWidth={2.35} />,
          },
          {
            label: "New followers",
            value: formatCompactNumber(newFollowersInRange),
            icon: <UserPlus size={16} strokeWidth={2.35} />,
          },
          {
            label: "Old followers",
            value: formatCompactNumber(oldFollowersBeforeRange),
            icon: <CalendarDays size={16} strokeWidth={2.35} />,
          },
        ].map((metric) => (
          <article key={metric.label} className="rounded-[10px] border border-[#e6eaf2] bg-white p-4 shadow-[0_18px_48px_rgba(20,28,53,0.035)]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#697083]">{metric.label}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#f0edff] text-[#4b3cff]">
                {metric.icon}
              </span>
            </div>
            <p className="mt-3 text-[18px] font-extrabold text-black">{metric.value}</p>
          </article>
        ))}
      </div>

      <section className="rounded-[12px] border border-[#e6eaf2] bg-white p-4 shadow-[0_18px_48px_rgba(20,28,53,0.035)]">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <h2 className="text-[18px] font-extrabold text-black">Followers by month</h2>
            <p className="mt-1 max-w-[640px] text-[12px] font-semibold leading-relaxed text-[#596175]">
              Showing aggregate follower and following counts from Instagram. Individual follower usernames are not returned by the official API.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-[11px] font-extrabold uppercase tracking-wide text-[#697083]">
              From
              <span className="mt-1 flex h-11 items-center gap-2 rounded-[8px] border border-[#dfe4ef] bg-white px-3 text-black outline-none focus-within:border-[#4b3cff] focus-within:ring-2 focus-within:ring-[#4b3cff]/10">
                <CalendarDays size={15} className="text-[#4b3cff]" strokeWidth={2.3} />
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => onStartDateChange(event.target.value)}
                  className="h-full min-w-0 flex-1 bg-transparent text-[12px] font-extrabold text-black outline-none"
                />
              </span>
            </label>

            <label className="text-[11px] font-extrabold uppercase tracking-wide text-[#697083]">
              To
              <span className="mt-1 flex h-11 items-center gap-2 rounded-[8px] border border-[#dfe4ef] bg-white px-3 text-black outline-none focus-within:border-[#4b3cff] focus-within:ring-2 focus-within:ring-[#4b3cff]/10">
                <CalendarDays size={15} className="text-[#4b3cff]" strokeWidth={2.3} />
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => onEndDateChange(event.target.value)}
                  className="h-full min-w-0 flex-1 bg-transparent text-[12px] font-extrabold text-black outline-none"
                />
              </span>
            </label>
          </div>
        </div>

        {account.followerHistoryError ? (
          <p className="mt-4 rounded-[8px] border border-[#ffe5b8] bg-[#fffaf0] p-3 text-[12px] font-semibold leading-relaxed text-[#8a5a00]">
            {account.followerHistoryError}
          </p>
        ) : null}

        <div className="mt-4 overflow-hidden rounded-[10px] border border-[#e6eaf2]">
          <div className="grid grid-cols-[1fr_120px_150px] bg-[#f7f8fc] px-4 py-3 text-[11px] font-extrabold uppercase tracking-wide text-[#697083]">
            <span>Month</span>
            <span className="text-right">New</span>
            <span className="text-right">Existing before</span>
          </div>
          {rows.map((month) => {
            const newFollowers = sumFollowerPoints(
              history,
              (point) => getMonthKey(point.date) === month.value && isDateInRange(point.date, startDate, endDate)
            );
            const monthStartDate = `${month.value}-01`;
            const newFollowersFromMonthToNow = sumFollowerPoints(history, (point) => {
              const date = new Date(point.date);
              const monthStart = getDateFromInput(monthStartDate);

              return Boolean(monthStart && Number.isFinite(date.getTime()) && date.getTime() >= monthStart.getTime());
            });
            const existingBeforeMonth =
              typeof account.followersCount === "number" ? Math.max(0, account.followersCount - newFollowersFromMonthToNow) : null;

            return (
              <div key={month.value} className="grid grid-cols-[1fr_120px_150px] border-t border-[#eef1f6] px-4 py-3 text-[12px] font-semibold text-[#253049]">
                <span className="font-extrabold text-black">{month.label}</span>
                <span className="text-right">{formatCompactNumber(newFollowers)}</span>
                <span className="text-right">{formatCompactNumber(existingBeforeMonth)}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <article className="rounded-[10px] border border-[#e6eaf2] bg-[#fbfcff] p-4">
            <h3 className="text-[13px] font-extrabold text-black">Follower groups</h3>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between rounded-[8px] bg-white px-3 py-2 text-[12px] font-bold text-[#253049]">
                <span>New followers in range</span>
                <span>{formatCompactNumber(newFollowersInRange)}</span>
              </div>
              <div className="flex items-center justify-between rounded-[8px] bg-white px-3 py-2 text-[12px] font-bold text-[#253049]">
                <span>Old followers before range</span>
                <span>{formatCompactNumber(oldFollowersBeforeRange)}</span>
              </div>
            </div>
          </article>

          <article className="rounded-[10px] border border-[#e6eaf2] bg-[#fbfcff] p-4">
            <h3 className="text-[13px] font-extrabold text-black">Following</h3>
            <p className="mt-3 text-[28px] font-extrabold text-black">{formatCompactNumber(account.followingCount)}</p>
            <p className="mt-2 text-[12px] font-semibold leading-relaxed text-[#596175]">
              Instagram exposes the following count for this connected account, but not a browsable list of every followed profile.
            </p>
          </article>
        </div>
      </section>


    </section>
  );
}

function StoryToolsPanel({
  mediaFile,
  mediaPreviewUrl,
  mediaType,
  publishing,
  status,
  onMediaFileChange,
  onClearMedia,
  onPublish,
}: {
  mediaFile: File | null;
  mediaPreviewUrl: string;
  mediaType: "image" | "video" | "";
  publishing: boolean;
  status: string;
  onMediaFileChange: (file: File | null) => void;
  onClearMedia: () => void;
  onPublish: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-[10px] border border-[#e6eaf2] bg-white p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#f0edff] text-[#4b3cff]">
            <MessageCircle size={19} strokeWidth={2.35} />
          </span>
          <div>
            <h2 className="text-[15px] font-extrabold text-black">Story replies use the Inbox AI</h2>
            <p className="mt-2 text-[12px] font-semibold leading-relaxed text-[#596175]">
              Story replies and story mentions arrive as Instagram DMs. When AI auto-send is active, the webhook drafts and sends replies in Conversations using the same OpenAI key and knowledge base.
            </p>
            <a
              href="/conversations"
              className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-[8px] bg-[#4b3cff] px-3 text-[11px] font-extrabold text-white"
            >
              Open conversations
            </a>
          </div>
        </div>
      </div>

      <div className="rounded-[10px] border border-[#e6eaf2] bg-white p-4">
        <h2 className="text-[15px] font-extrabold text-black">Publish story</h2>
        <p className="mt-2 text-[12px] font-semibold leading-relaxed text-[#596175]">
          Upload an image or video Story. TractionFlo detects the media type and prepares a public media URL for Instagram automatically.
        </p>

        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-[10px] border border-dashed border-[#cfd6e6] bg-[#fbfcff] px-4 py-5 text-center transition hover:border-[#4b3cff] hover:bg-[#f8f7ff]">
          <input
            type="file"
            accept="image/*,video/*"
            onChange={(event) => {
              onMediaFileChange(event.target.files?.[0] || null);
              event.currentTarget.value = "";
            }}
            disabled={publishing}
            className="sr-only"
          />
          <span className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#f0edff] text-[#4b3cff]">
            <UploadCloud size={22} strokeWidth={2.35} />
          </span>
          <span className="mt-3 text-[12px] font-extrabold text-black">
            {mediaFile ? "Change story media" : "Upload story image or video"}
          </span>
          <span className="mt-1 text-[11px] font-semibold leading-relaxed text-[#596175]">
            JPG, PNG, GIF, WebP, MP4, or MOV up to 20MB. Type is detected automatically.
          </span>
        </label>

        {mediaFile ? (
          <div className="mt-3 rounded-[10px] border border-[#e1e5ef] bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[12px] font-extrabold text-black">{mediaFile.name}</p>
                <p className="mt-1 text-[11px] font-semibold text-[#596175]">
                  {mediaType ? `${mediaType === "video" ? "Video" : "Image"} detected` : "Unsupported media"} • {formatFileSize(mediaFile.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={onClearMedia}
                disabled={publishing}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[#dfe4ef] bg-white text-[#46506a] transition hover:bg-[#f7f8fc] disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Remove story media"
              >
                <X size={14} strokeWidth={2.4} />
              </button>
            </div>
            {mediaPreviewUrl ? (
              <div className="mt-3 overflow-hidden rounded-[8px] bg-[#0d1020]">
                {mediaType === "video" ? (
                  <video src={mediaPreviewUrl} controls muted className="max-h-[260px] w-full bg-black object-contain" />
                ) : (
                  <div
                    className="h-[220px] w-full bg-contain bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${mediaPreviewUrl})` }}
                    aria-label="Selected story preview"
                  />
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onPublish}
          disabled={publishing || !mediaFile || !mediaType}
          className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#4b3cff] px-4 text-[12px] font-extrabold text-white shadow-[0_14px_30px_rgba(75,60,255,0.2)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {publishing ? <RefreshCw size={14} className="animate-spin" strokeWidth={2.25} /> : <Send size={14} strokeWidth={2.25} />}
          {publishing ? "Publishing..." : "Publish story"}
        </button>

        {status ? (
          <p className="mt-3 rounded-[8px] bg-[#f7f8fc] px-3 py-2 text-[12px] font-semibold leading-relaxed text-[#46506a]">
            {status}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function StoryDetailPanel({
  story,
  replies,
  loadingReplies,
  repliesError,
  onRefreshReplies,
}: {
  story?: InstagramContentItem;
  replies: any[];
  loadingReplies: boolean;
  repliesError: string;
  onRefreshReplies: () => void;
}) {
  if (!story) {
    return (
      <EmptyState
        title="Select a story"
        detail="Choose a story to inspect its media, settings, and reply handling."
      />
    );
  }

  const detailRows = [
    { label: "Status", value: "Active story" },
    { label: "Media type", value: story.mediaType || "Story media" },
    { label: "Published", value: formatDate(story.timestamp) },
    { label: "Story ID", value: story.id },
    { label: "Replies", value: "Handled in Conversations" },
    { label: "Mentions", value: "Prepared when publishing media" },
  ];

  return (
    <section className="rounded-[12px] border border-[#e6eaf2] bg-white p-4 shadow-[0_18px_48px_rgba(20,28,53,0.035)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wide text-[#596175]">
            <Play size={13} className="text-[#4b3cff]" strokeWidth={2.4} />
            Story details
          </p>
          <h2 className="mt-1 text-[16px] font-extrabold text-black">
            {story.caption ? truncateText(story.caption, 58) : "Active story"}
          </h2>
        </div>
        <span className="rounded-full bg-[#eafaf0] px-3 py-1 text-[11px] font-extrabold text-[#10873b]">
          Live
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-[10px] border border-[#e6eaf2]">
        <MediaPreview item={story} play />
      </div>

      <div className="mt-4 grid gap-2">
        {detailRows.map((row) => (
          <div key={row.label} className="rounded-[8px] border border-[#eef1f6] bg-[#fbfcff] px-3 py-2">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#697083]">{row.label}</p>
            <p className="mt-1 break-words text-[12px] font-bold text-[#253049]">{row.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <a
          href="/conversations"
          className="flex h-9 items-center justify-center gap-2 rounded-[8px] bg-[#4b3cff] px-3 text-[11px] font-extrabold text-white"
        >
          <MessageCircle size={14} strokeWidth={2.35} />
          Conversations
        </a>
        {story.permalink ? (
          <a
            href={story.permalink}
            target="_blank"
            rel="noreferrer"
            className="flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#dfe4ef] bg-white px-3 text-[11px] font-extrabold text-black"
          >
            <ExternalLink size={14} strokeWidth={2.35} />
            Instagram
          </a>
        ) : (
          <span className="flex h-9 items-center justify-center rounded-[8px] border border-[#dfe4ef] bg-[#f7f8fc] px-3 text-[11px] font-extrabold text-[#697083]">
            No public link
          </span>
        )}
      </div>

      <div className="mt-4 rounded-[10px] border border-[#e7eaf2] bg-[#fbfcff] p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-[12px] font-extrabold text-black">
            <MessageCircle size={15} className="text-[#4b3cff]" strokeWidth={2.3} />
            Story replies
          </p>
          <button
            type="button"
            onClick={onRefreshReplies}
            disabled={loadingReplies}
            className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-[#dfe4ef] bg-white text-black disabled:opacity-60"
            aria-label="Refresh story replies"
          >
            <RefreshCw size={11} className={loadingReplies ? "animate-spin" : ""} strokeWidth={2.5} />
          </button>
        </div>

        {repliesError ? (
          <p className="mt-2 text-[11px] font-semibold text-[#b4233c]">{repliesError}</p>
        ) : null}

        {loadingReplies ? (
          <div className="mt-3 rounded-[8px] border border-dashed border-[#d7deeb] bg-white p-4 text-center text-[11px] font-semibold text-[#596175]">
            Loading replies...
          </div>
        ) : replies.length === 0 ? (
          <p className="mt-3 rounded-[8px] border border-dashed border-[#d7deeb] bg-white p-3 text-center text-[11px] font-semibold text-[#596175]">
            No story replies yet. Replies sent by users will appear here.
          </p>
        ) : (
          <div className="mt-3 max-h-[260px] space-y-2.5 overflow-y-auto pr-1">
            {replies.map((reply) => (
              <div key={reply.id} className="rounded-[8px] border border-[#e6eaf2] bg-white p-2.5 shadow-[0_4px_12px_rgba(20,28,53,0.015)]">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {reply.profilePic ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={reply.profilePic}
                        alt={reply.username}
                        className="h-5 w-5 rounded-full object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-white text-[8px] font-extrabold">
                        {reply.username.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span className="truncate text-[11px] font-extrabold text-black">@{reply.username}</span>
                  </div>
                  <span className="shrink-0 text-[9px] font-semibold text-[#697083]">{formatDate(reply.timestamp)}</span>
                </div>
                <p className="mt-1 text-[11px] font-semibold leading-relaxed text-[#253049] break-words">{reply.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function PostPublisherPanel({
  mediaFile,
  mediaPreviewUrl,
  mediaType,
  caption,
  publishing,
  status,
  onMediaFileChange,
  onClearMedia,
  onCaptionChange,
  onPublish,
}: {
  mediaFile: File | null;
  mediaPreviewUrl: string;
  mediaType: "image" | "video" | "";
  caption: string;
  publishing: boolean;
  status: string;
  onMediaFileChange: (file: File | null) => void;
  onClearMedia: () => void;
  onCaptionChange: (value: string) => void;
  onPublish: () => void;
}) {
  return (
    <div className="rounded-[10px] border border-[#e6eaf2] bg-white p-4">
      <h2 className="text-[15px] font-extrabold text-black">Publish post</h2>
      <p className="mt-2 text-[12px] font-semibold leading-relaxed text-[#596175]">
        Upload an image or video from your device. TractionFlo prepares the media for Instagram automatically.
      </p>

      <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-[10px] border border-dashed border-[#cfd6e6] bg-[#fbfcff] px-4 py-5 text-center transition hover:border-[#4b3cff] hover:bg-[#f8f7ff]">
        <input
          type="file"
          accept="image/*,video/*"
          onChange={(event) => {
            onMediaFileChange(event.target.files?.[0] || null);
            event.currentTarget.value = "";
          }}
          disabled={publishing}
          className="sr-only"
        />
        <span className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#f0edff] text-[#4b3cff]">
          <UploadCloud size={22} strokeWidth={2.35} />
        </span>
        <span className="mt-3 text-[12px] font-extrabold text-black">
          {mediaFile ? "Change post media" : "Upload post image or video"}
        </span>
        <span className="mt-1 text-[11px] font-semibold leading-relaxed text-[#596175]">
          JPG, PNG, GIF, WebP, MP4, or MOV up to 50MB.
        </span>
      </label>

      {mediaFile ? (
        <div className="mt-3 rounded-[10px] border border-[#e1e5ef] bg-white p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-extrabold text-black">{mediaFile.name}</p>
              <p className="mt-1 text-[11px] font-semibold text-[#596175]">
                {mediaType ? `${mediaType === "video" ? "Video" : "Image"} detected` : "Unsupported media"} • {formatFileSize(mediaFile.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClearMedia}
              disabled={publishing}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[#dfe4ef] bg-white text-[#46506a] transition hover:bg-[#f7f8fc] disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Remove post media"
            >
              <X size={14} strokeWidth={2.4} />
            </button>
          </div>
          {mediaPreviewUrl ? (
            <div className="mt-3 overflow-hidden rounded-[8px] bg-[#0d1020]">
              {mediaType === "video" ? (
                <video src={mediaPreviewUrl} controls muted className="max-h-[260px] w-full bg-black object-contain" />
              ) : (
                <div
                  className="h-[220px] w-full bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${mediaPreviewUrl})` }}
                  aria-label="Selected post preview"
                />
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      <textarea
        value={caption}
        onChange={(event) => onCaptionChange(event.target.value)}
        placeholder="Write a caption for this post..."
        className="mt-3 min-h-[90px] w-full resize-none rounded-[8px] border border-[#dde3ee] bg-white px-3 py-2 text-[12px] font-semibold leading-relaxed text-black outline-none focus:border-[#4b3cff] focus:ring-2 focus:ring-[#4b3cff]/10"
      />

      <button
        type="button"
        onClick={onPublish}
        disabled={publishing || !mediaFile || !mediaType}
        className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#4b3cff] px-4 text-[12px] font-extrabold text-white shadow-[0_14px_30px_rgba(75,60,255,0.2)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {publishing ? <RefreshCw size={14} className="animate-spin" strokeWidth={2.25} /> : <Send size={14} strokeWidth={2.25} />}
        {publishing ? "Publishing..." : "Publish post"}
      </button>

      {status ? (
        <p className="mt-3 rounded-[8px] bg-[#f7f8fc] px-3 py-2 text-[12px] font-semibold leading-relaxed text-[#46506a]">
          {status}
        </p>
      ) : null}
    </div>
  );
}

function CommentCard({
  comment,
  media,
  draft,
  loading,
  posting,
  latest,
  takeoverMode,
  commentsActive,
  onDraftChange,
  onDraft,
  onPost,
}: {
  comment: InstagramComment;
  media: InstagramContentItem;
  draft?: DraftState;
  loading: boolean;
  posting: boolean;
  latest: boolean;
  takeoverMode: CommentTakeoverMode;
  commentsActive: boolean;
  onDraftChange: (text: string) => void;
  onDraft: () => void;
  onPost: () => void;
}) {
  const isAiTakeover = takeoverMode === "ai";

  return (
    <article className="rounded-[10px] border border-[#e6eaf2] bg-white p-4 shadow-[0_16px_38px_rgba(20,28,53,0.025)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-[13px] font-extrabold text-black">@{comment.username}</h3>
            {latest ? (
              <span className="rounded-full bg-[#fff1db] px-2 py-0.5 text-[10px] font-extrabold text-[#a85500]">Latest</span>
            ) : null}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-[#697083]">
            <Clock size={12} strokeWidth={2.2} />
            {formatDate(comment.timestamp)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-[#f7f8fb] px-2.5 py-1 text-[10px] font-extrabold text-[#46506a]">
            <Heart size={12} strokeWidth={2.2} />
            {comment.likeCount}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${isAiTakeover ? "bg-[#f0edff] text-[#4b3cff]" : "bg-[#eafaf0] text-[#13823b]"}`}>
            {isAiTakeover ? "AI takeover" : "Human takeover"}
          </span>
        </div>
      </div>

      <p className="mt-3 text-[13px] font-semibold leading-relaxed text-[#253049]">{comment.text}</p>

      {comment.replies.length > 0 ? (
        <div className="mt-4 space-y-2 border-l-2 border-[#e8e4ff] pl-3">
          {comment.replies.slice(0, 3).map((reply) => (
            <div key={reply.id} className="rounded-[8px] bg-[#f7f6ff] p-3">
              <p className="text-[11px] font-extrabold text-[#4b3cff]">@{reply.username}</p>
              <p className="mt-1 text-[12px] font-semibold leading-relaxed text-[#253049]">{reply.text}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 rounded-[10px] border border-[#e7eaf2] bg-[#fbfcff] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wide text-[#596175]">
            {isAiTakeover ? <Sparkles size={13} className="text-[#4b3cff]" strokeWidth={2.3} /> : <UserCheck size={13} className="text-[#13823b]" strokeWidth={2.3} />}
            {isAiTakeover ? "AI takeover reply" : "Human takeover reply"}
          </p>
          {draft?.knowledgeLabel ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eff1f6] px-2 py-1 text-[10px] font-extrabold text-[#46506a]">
              <BookOpen size={11} strokeWidth={2.2} />
              {draft.knowledgeLabel}
            </span>
          ) : null}
        </div>
        <textarea
          value={draft?.text || ""}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder={commentsActive ? "Draft or generate a comment reply..." : "Comment automation is inactive for this post."}
          disabled={!commentsActive}
          className="mt-3 min-h-[88px] w-full resize-none rounded-[8px] border border-[#dde3ee] bg-white px-3 py-2 text-[12px] font-semibold leading-relaxed text-black outline-none transition focus:border-[#4b3cff] focus:ring-2 focus:ring-[#4b3cff]/10"
        />
        {draft?.status ? <p className="mt-2 text-[11px] font-semibold text-[#596175]">{draft.status}</p> : null}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onDraft}
            disabled={loading || !commentsActive}
            className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#dfe4ef] bg-white px-3 text-[12px] font-extrabold text-black transition hover:bg-[#f7f8fc] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" strokeWidth={2.25} /> : <Bot size={14} strokeWidth={2.25} />}
            {loading ? "Drafting..." : isAiTakeover ? "Regenerate AI reply" : "Draft with AI"}
          </button>
          <button
            type="button"
            onClick={onPost}
            disabled={posting || !commentsActive || !draft?.text.trim()}
            className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#4b3cff] px-3 text-[12px] font-extrabold text-white shadow-[0_14px_30px_rgba(75,60,255,0.2)] transition hover:bg-[#3f32e6] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {posting ? <RefreshCw size={14} className="animate-spin" strokeWidth={2.25} /> : <Send size={14} strokeWidth={2.25} />}
            {posting ? "Posting..." : "Post reply"}
          </button>
        </div>
        {media.permalink ? (
          <a
            href={media.permalink}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#4b3cff]"
          >
            Open on Instagram
            <ExternalLink size={12} strokeWidth={2.4} />
          </a>
        ) : null}
      </div>
    </article>
  );
}

function TakeoverControls({
  commentsActive,
  takeoverMode,
  onToggleActive,
  onChangeMode,
}: {
  commentsActive: boolean;
  takeoverMode: CommentTakeoverMode;
  onToggleActive: () => void;
  onChangeMode: (mode: CommentTakeoverMode) => void;
}) {
  return (
    <div className="mt-4 rounded-[10px] border border-[#e7eaf2] bg-[#fbfcff] p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#697083]">Comment automation</p>
          <p className="mt-1 text-[12px] font-semibold text-[#253049]">
            {commentsActive ? "Active for this post" : "Inactive for this post"}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleActive}
          className={`relative h-7 w-12 rounded-full transition ${commentsActive ? "bg-[#4b3cff]" : "bg-[#cfd5e3]"}`}
          aria-pressed={commentsActive}
          aria-label={commentsActive ? "Turn comment automation off" : "Turn comment automation on"}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${commentsActive ? "left-6" : "left-1"}`} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 rounded-[8px] border border-[#e1e5ef] bg-white p-1">
        {(["ai", "human"] as const).map((mode) => {
          const isActive = takeoverMode === mode;

          return (
            <button
              key={mode}
              type="button"
              onClick={() => onChangeMode(mode)}
              className={`flex h-9 items-center justify-center gap-2 rounded-[7px] text-[11px] font-extrabold transition ${isActive ? "bg-[#4b3cff] text-white" : "text-[#46506a] hover:bg-[#f7f8fc]"
                }`}
            >
              {mode === "ai" ? <Sparkles size={13} strokeWidth={2.3} /> : <UserCheck size={13} strokeWidth={2.3} />}
              {mode === "ai" ? "AI takeover" : "Human takeover"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LatestCommentSummary({ comment }: { comment?: InstagramComment }) {
  if (!comment) {
    return null;
  }

  return (
    <div className="mt-4 rounded-[10px] border border-[#f2d7a8] bg-[#fffaf2] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#a85500]">Latest comment</p>
        <span className="text-[11px] font-semibold text-[#7a5631]">{formatDate(comment.timestamp)}</span>
      </div>
      <p className="mt-2 text-[12px] font-extrabold text-black">@{comment.username}</p>
      <p className="mt-1 text-[12px] font-semibold leading-relaxed text-[#253049]">{truncateText(comment.text, 120)}</p>
    </div>
  );
}

function CommentsList({
  comments,
  selectedPost,
  drafts,
  draftingId,
  postingId,
  latestCommentId,
  takeoverMode,
  commentsActive,
  onDraftChange,
  onDraft,
  onPost,
}: {
  comments: InstagramComment[];
  selectedPost: InstagramContentItem;
  drafts: Record<string, DraftState>;
  draftingId: string;
  postingId: string;
  latestCommentId?: string;
  takeoverMode: CommentTakeoverMode;
  commentsActive: boolean;
  onDraftChange: (commentId: string, text: string) => void;
  onDraft: (comment: InstagramComment) => void;
  onPost: (comment: InstagramComment) => void;
}) {
  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <CommentCard
          key={comment.id}
          comment={comment}
          media={selectedPost}
          draft={drafts[comment.id]}
          loading={draftingId === comment.id}
          posting={postingId === comment.id}
          latest={latestCommentId === comment.id}
          takeoverMode={takeoverMode}
          commentsActive={commentsActive}
          onDraftChange={(text) => onDraftChange(comment.id, text)}
          onDraft={() => onDraft(comment)}
          onPost={() => onPost(comment)}
        />
      ))}
    </div>
  );
}

function PostDetailView({
  post,
  comments,
  commentsActive,
  takeoverMode,
  latestComment,
  loadingComments,
  commentsError,
  drafts,
  draftingId,
  postingId,
  onToggleActive,
  onChangeTakeover,
  onRefreshComments,
  onDraftChange,
  onDraft,
  onPost,
}: {
  post: InstagramContentItem;
  comments: InstagramComment[];
  commentsActive: boolean;
  takeoverMode: CommentTakeoverMode;
  latestComment?: InstagramComment;
  loadingComments: boolean;
  commentsError: string;
  drafts: Record<string, DraftState>;
  draftingId: string;
  postingId: string;
  onToggleActive: () => void;
  onChangeTakeover: (mode: CommentTakeoverMode) => void;
  onRefreshComments: () => void;
  onDraftChange: (commentId: string, text: string) => void;
  onDraft: (comment: InstagramComment) => void;
  onPost: (comment: InstagramComment) => void;
}) {
  return (
    <section className="mt-6">
      <Link href="/instagram-content" className="inline-flex items-center gap-2 text-[12px] font-extrabold text-[#4b3cff]">
        <ArrowLeft size={15} strokeWidth={2.4} />
        Back to posts
      </Link>

      <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
        <article className="rounded-[12px] border border-[#e6eaf2] bg-white p-4 shadow-[0_18px_48px_rgba(20,28,53,0.035)]">
          <MediaPreview item={post} play />
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] font-bold text-[#596175]">
            <span className="flex items-center gap-2">
              <InstagramDot />
              {formatDate(post.timestamp)}
            </span>
            <span className="flex items-center gap-1.5">
              <MessageCircle size={14} strokeWidth={2.25} />
              {post.commentsCount} comments
            </span>
            {typeof post.likeCount === "number" ? (
              <span className="flex items-center gap-1.5">
                <Heart size={14} strokeWidth={2.25} />
                {post.likeCount} likes
              </span>
            ) : null}
          </div>
          <h2 className="mt-4 text-[22px] font-extrabold text-black">Post details</h2>
          <p className="mt-3 whitespace-pre-wrap text-[13px] font-semibold leading-relaxed text-[#253049]">
            {post.caption || "No description available for this post."}
          </p>
          {post.permalink ? (
            <a
              href={post.permalink}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#dfe4ef] bg-white px-4 text-[12px] font-extrabold text-black"
            >
              Open on Instagram
              <ExternalLink size={13} strokeWidth={2.4} />
            </a>
          ) : null}
        </article>

        <section className="rounded-[12px] border border-[#e6eaf2] bg-white p-4 shadow-[0_18px_48px_rgba(20,28,53,0.035)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[20px] font-extrabold text-black">All comments</h2>
              <p className="mt-1 text-[12px] font-semibold text-[#596175]">
                {comments.length} loaded comment{comments.length === 1 ? "" : "s"} • {commentsActive ? "active" : "inactive"}
              </p>
            </div>
            <button
              type="button"
              onClick={onRefreshComments}
              disabled={loadingComments}
              className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#dfe4ef] bg-white text-black disabled:opacity-60"
              aria-label="Refresh comments"
            >
              <RefreshCw size={15} className={loadingComments ? "animate-spin" : ""} strokeWidth={2.3} />
            </button>
          </div>

          <TakeoverControls
            commentsActive={commentsActive}
            takeoverMode={takeoverMode}
            onToggleActive={onToggleActive}
            onChangeMode={onChangeTakeover}
          />
          <LatestCommentSummary comment={latestComment} />

          {commentsError ? (
            <p className="mt-4 rounded-[8px] border border-[#ffd8df] bg-[#fff6f8] p-3 text-[12px] font-semibold text-[#b4233c]">{commentsError}</p>
          ) : null}

          {loadingComments ? (
            <div className="mt-5 rounded-[10px] border border-dashed border-[#d7deeb] p-6 text-center text-[12px] font-semibold text-[#596175]">
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <div className="mt-5">
              <EmptyState title="No comments yet" detail="New comments on this post will appear here after refresh." />
            </div>
          ) : (
            <div className="mt-5">
              <CommentsList
                comments={comments}
                selectedPost={post}
                drafts={drafts}
                draftingId={draftingId}
                postingId={postingId}
                latestCommentId={latestComment?.id}
                takeoverMode={takeoverMode}
                commentsActive={commentsActive}
                onDraftChange={onDraftChange}
                onDraft={onDraft}
                onPost={onPost}
              />
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function getPostDetailIdFromPath() {
  if (typeof window === "undefined") {
    return "";
  }

  const match = window.location.pathname.match(/^\/instagram-content\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

export default function InstagramContentPage() {
  const [activeTab, setActiveTab] = useState<InstagramContentTab>("posts");
  const [followerStartDate, setFollowerStartDate] = useState("");
  const [followerEndDate, setFollowerEndDate] = useState("");
  const [welcomeAutomation, setWelcomeAutomation] = useState<InstagramWelcomeAutomationSettings>(
    defaultInstagramWelcomeAutomation
  );
  const [account, setAccount] = useState<InstagramAccount | null>(null);
  const [posts, setPosts] = useState<InstagramContentItem[]>([]);
  const [stories, setStories] = useState<InstagramContentItem[]>([]);
  const [selectedPostId, setSelectedPostId] = useState("");
  const [selectedStoryId, setSelectedStoryId] = useState("");
  const [contentPageSize, setContentPageSize] = useState<ContentPageSize>(5);
  const [contentPage, setContentPage] = useState(1);
  const [detailPostId, setDetailPostId] = useState("");
  const [comments, setComments] = useState<InstagramComment[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [storyReplies, setStoryReplies] = useState<any[]>([]);
  const [loadingStoryReplies, setLoadingStoryReplies] = useState(false);
  const [storyRepliesError, setStoryRepliesError] = useState("");
  const [activeModal, setActiveModal] = useState<"details" | "publish" | null>(null);
  const [commentAutomation, setCommentAutomation] = useState<Record<string, boolean>>(() =>
    readStoredRecord<boolean>(commentAutomationStorageKey)
  );
  const [commentTakeoverModes, setCommentTakeoverModes] = useState<Record<string, string>>(() =>
    readStoredRecord<string>(commentTakeoverStorageKey)
  );
  const [autoDraftedKeys, setAutoDraftedKeys] = useState<Record<string, boolean>>({});
  const [loadingContent, setLoadingContent] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [draftingId, setDraftingId] = useState("");
  const [postingId, setPostingId] = useState("");
  const [error, setError] = useState("");
  const [commentsError, setCommentsError] = useState("");
  const [storyNotice, setStoryNotice] = useState("");
  const [welcomeSaving, setWelcomeSaving] = useState(false);
  const [welcomeStatus, setWelcomeStatus] = useState("");
  const [storyMediaFile, setStoryMediaFile] = useState<File | null>(null);
  const [storyMediaPreviewUrl, setStoryMediaPreviewUrl] = useState("");
  const [storyMediaType, setStoryMediaType] = useState<"image" | "video" | "">("");
  const [storyPublishing, setStoryPublishing] = useState(false);
  const [storyPublishStatus, setStoryPublishStatus] = useState("");

  const isDetailPage = Boolean(detailPostId);
  const currentItems = useMemo(() => {
    if (activeTab === "stories") {
      return stories;
    }

    if (activeTab === "posts") {
      return posts;
    }

    return [];
  }, [activeTab, posts, stories]);
  const contentTotalPages = contentPageSize === "all" ? 1 : Math.max(1, Math.ceil(currentItems.length / contentPageSize));
  const safeContentPage = Math.min(contentPage, contentTotalPages);
  const resolvedContentPageSize = contentPageSize === "all" ? Math.max(currentItems.length, 1) : contentPageSize;
  const contentPageStartIndex = contentPageSize === "all" ? 0 : (safeContentPage - 1) * resolvedContentPageSize;
  const paginatedItems = useMemo(
    () => currentItems.slice(contentPageStartIndex, contentPageStartIndex + resolvedContentPageSize),
    [contentPageStartIndex, currentItems, resolvedContentPageSize]
  );
  const visibleContentStart = currentItems.length === 0 ? 0 : contentPageStartIndex + 1;
  const visibleContentEnd = Math.min(currentItems.length, contentPageStartIndex + paginatedItems.length);
  const selectedPost = useMemo(() => {
    const explicitPost = posts.find((post) => post.id === selectedPostId);

    if (isDetailPage) {
      return explicitPost;
    }

    if (activeTab === "posts") {
      const explicitPostIsVisible = explicitPost ? paginatedItems.some((item) => item.id === explicitPost.id) : false;
      return explicitPostIsVisible ? explicitPost : paginatedItems.find((item) => item.kind === "post") || posts[0];
    }

    return explicitPost || posts[0];
  }, [activeTab, isDetailPage, paginatedItems, posts, selectedPostId]);
  const selectedStory = useMemo(() => {
    const explicitStory = stories.find((story) => story.id === selectedStoryId);

    if (activeTab === "stories") {
      const explicitStoryIsVisible = explicitStory ? paginatedItems.some((item) => item.id === explicitStory.id) : false;
      return explicitStoryIsVisible ? explicitStory : paginatedItems.find((item) => item.kind === "story") || stories[0];
    }

    return explicitStory || stories[0];
  }, [activeTab, paginatedItems, selectedStoryId, stories]);
  const followerDateBounds = useMemo(() => buildFollowerDateBounds(account?.followerHistory || []), [account?.followerHistory]);
  const commentsActive = selectedPost ? commentAutomation[selectedPost.id] !== false : true;
  const takeoverMode = (selectedPost ? commentTakeoverModes[selectedPost.id] : "ai") === "human" ? "human" : "ai";
  const latestComment = comments[0];

  const loadContent = useCallback(async () => {
    setLoadingContent(true);
    setError("");
    setStoryNotice("");

    try {
      const response = await fetch("/api/instagram/content", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = (await response.json()) as InstagramContentResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error || "Could not load Instagram content");
      }

      const nextPosts = data.posts || [];
      const nextStories = data.stories || [];
      setAccount(data.account || null);
      setPosts(nextPosts);
      setStories(nextStories);
      setStoryNotice(data.storyError || "");

      setSelectedPostId((current) =>
        nextPosts.length > 0 && !nextPosts.some((post) => post.id === current) ? nextPosts[0].id : current
      );
      setSelectedStoryId((current) => {
        if (nextStories.length === 0) {
          return "";
        }

        return nextStories.some((story) => story.id === current) ? current : nextStories[0].id;
      });
    } catch (loadError) {
      setAccount(null);
      setPosts([]);
      setStories([]);
      setSelectedStoryId("");
      setComments([]);
      setError(loadError instanceof Error ? loadError.message : "Could not load Instagram content");
    } finally {
      setLoadingContent(false);
    }
  }, []);

  const loadWelcomeAutomation = useCallback(async () => {
    try {
      const response = await fetch("/api/instagram/welcome-automation", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = (await response.json()) as {
        automation?: InstagramWelcomeAutomationSettings;
        error?: string;
      };

      if (!response.ok || data.error) {
        throw new Error(data.error || "Could not load welcome automation");
      }

      setWelcomeAutomation(data.automation || defaultInstagramWelcomeAutomation);
    } catch (loadError) {
      setWelcomeStatus(loadError instanceof Error ? loadError.message : "Could not load welcome automation");
    }
  }, []);


  const loadComments = useCallback(async (mediaId: string) => {
    if (!mediaId) {
      setComments([]);
      return;
    }

    setLoadingComments(true);
    setCommentsError("");

    try {
      const response = await fetch(`/api/instagram/content/comments?mediaId=${encodeURIComponent(mediaId)}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = (await response.json()) as InstagramCommentsResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error || "Could not load comments");
      }

      const nextComments = [...(data.comments || [])].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setComments(nextComments);
    } catch (loadError) {
      setComments([]);
      setCommentsError(loadError instanceof Error ? loadError.message : "Could not load comments");
    } finally {
      setLoadingComments(false);
    }
  }, []);

  const loadStoryReplies = useCallback(async (storyId: string) => {
    if (!storyId) {
      setStoryReplies([]);
      return;
    }

    setLoadingStoryReplies(true);
    setStoryRepliesError("");

    try {
      const response = await fetch(`/api/instagram/content/stories/replies?storyId=${encodeURIComponent(storyId)}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Could not load story replies");
      }

      setStoryReplies(data.replies || []);
    } catch (loadError) {
      setStoryReplies([]);
      setStoryRepliesError(loadError instanceof Error ? loadError.message : "Could not load story replies");
    } finally {
      setLoadingStoryReplies(false);
    }
  }, []);

  const changeContentTab = useCallback((tab: InstagramContentTab) => {
    setActiveTab(tab);
    setContentPage(1);
  }, []);

  const changeContentPageSize = useCallback((pageSize: ContentPageSize) => {
    setContentPageSize(pageSize);
    setContentPage(1);
  }, []);

  const clearStoryMedia = useCallback((resetStatus = true) => {
    if (storyMediaPreviewUrl) {
      URL.revokeObjectURL(storyMediaPreviewUrl);
    }

    setStoryMediaFile(null);
    setStoryMediaPreviewUrl("");
    setStoryMediaType("");
    if (resetStatus) {
      setStoryPublishStatus("");
    }
  }, [storyMediaPreviewUrl]);

  const selectStoryMediaFile = useCallback((file: File | null) => {
    if (storyMediaPreviewUrl) {
      URL.revokeObjectURL(storyMediaPreviewUrl);
    }

    if (!file) {
      setStoryMediaFile(null);
      setStoryMediaPreviewUrl("");
      setStoryMediaType("");
      return;
    }

    const detectedType = getStoryMediaTypeFromFile(file);

    if (!detectedType) {
      setStoryMediaFile(null);
      setStoryMediaPreviewUrl("");
      setStoryMediaType("");
      setStoryPublishStatus("Upload an image or video file for the story.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setStoryMediaFile(null);
      setStoryMediaPreviewUrl("");
      setStoryMediaType("");
      setStoryPublishStatus("Keep story uploads under 20MB.");
      return;
    }

    setStoryMediaFile(file);
    setStoryMediaPreviewUrl(URL.createObjectURL(file));
    setStoryMediaType(detectedType);
    setStoryPublishStatus("");
  }, [storyMediaPreviewUrl]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadContent();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadContent]);

  useEffect(() => {
    return () => {
      if (storyMediaPreviewUrl) {
        URL.revokeObjectURL(storyMediaPreviewUrl);
      }
    };
  }, [storyMediaPreviewUrl]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadWelcomeAutomation();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadWelcomeAutomation]);


  useEffect(() => {
    const syncDetailPost = () => {
      const postId = getPostDetailIdFromPath();
      setDetailPostId(postId);

      if (postId) {
        setActiveTab("posts");
        setSelectedPostId(postId);
      }
    };

    const timeout = window.setTimeout(syncDetailPost, 0);
    window.addEventListener("popstate", syncDetailPost);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("popstate", syncDetailPost);
    };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (selectedPost?.id) {
        void loadComments(selectedPost.id);
      } else {
        setComments([]);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadComments, selectedPost?.id]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (selectedStory?.id) {
        void loadStoryReplies(selectedStory.id);
      } else {
        setStoryReplies([]);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadStoryReplies, selectedStory?.id]);

  const updateDraft = useCallback((commentId: string, patch: Partial<DraftState>) => {
    setDrafts((current) => {
      const previous = current[commentId] || {
        text: "",
        knowledgeLabel: "",
        status: "",
      };

      return {
        ...current,
        [commentId]: {
          ...previous,
          ...patch,
        },
      };
    });
  }, []);

  const draftReply = useCallback(async (comment: InstagramComment, media = selectedPost, options: { automatic?: boolean } = {}) => {
    if (!media) {
      return;
    }

    setDraftingId(comment.id);
    updateDraft(comment.id, {
      status: options.automatic ? "AI takeover active. Drafting the latest comment..." : "Reading knowledge and drafting...",
    });

    try {
      const response = await fetch("/api/instagram/content/comments/draft", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commentId: comment.id,
          commentText: comment.text,
          authorUsername: comment.username,
          mediaCaption: media.caption,
          mediaPermalink: media.permalink,
        }),
      });
      const data = (await response.json()) as {
        reply?: string;
        error?: string;
        knowledge?: { mode?: string; sourceTitle?: string; matches?: number };
      };

      if (!response.ok || data.error || !data.reply) {
        throw new Error(data.error || "Could not draft a reply");
      }

      updateDraft(comment.id, {
        text: data.reply,
        knowledgeLabel: getKnowledgeLabel(data.knowledge),
        status: options.automatic ? "AI takeover drafted the latest comment. Review before posting." : "AI draft ready. Review before posting.",
      });
    } catch (draftError) {
      updateDraft(comment.id, {
        status: draftError instanceof Error ? draftError.message : "Could not draft a reply",
      });
    } finally {
      setDraftingId("");
    }
  }, [selectedPost, updateDraft]);

  function setPostAutomation(postId: string, active: boolean) {
    setCommentAutomation((current) => {
      const next = { ...current, [postId]: active };
      writeStoredRecord(commentAutomationStorageKey, next);
      return next;
    });
  }

  function setPostTakeoverMode(postId: string, mode: CommentTakeoverMode) {
    setCommentTakeoverModes((current) => {
      const next = { ...current, [postId]: mode };
      writeStoredRecord(commentTakeoverStorageKey, next);
      return next;
    });
  }

  useEffect(() => {
    if (!selectedPost || !latestComment || !commentsActive || takeoverMode !== "ai") {
      return;
    }

    const autoDraftKey = `${selectedPost.id}:${latestComment.id}`;

    if (autoDraftedKeys[autoDraftKey] || drafts[latestComment.id]?.text) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setAutoDraftedKeys((current) => ({ ...current, [autoDraftKey]: true }));
      void draftReply(latestComment, selectedPost, { automatic: true });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [autoDraftedKeys, commentsActive, draftReply, drafts, latestComment, selectedPost, takeoverMode]);

  async function postReply(comment: InstagramComment) {
    const draft = drafts[comment.id]?.text.trim();

    if (!draft) {
      return;
    }

    setPostingId(comment.id);
    updateDraft(comment.id, { status: "Posting reply to Instagram..." });

    try {
      const response = await fetch("/api/instagram/content/comments/reply", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commentId: comment.id,
          message: draft,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || data.error || !data.ok) {
        throw new Error(data.error || "Could not post reply");
      }

      updateDraft(comment.id, { status: "Reply posted. Refreshing comments..." });
      if (selectedPost?.id) {
        await loadComments(selectedPost.id);
      }
    } catch (postError) {
      updateDraft(comment.id, {
        status: postError instanceof Error ? postError.message : "Could not post reply",
      });
    } finally {
      setPostingId("");
    }
  }

  const totalComments = posts.reduce((sum, post) => sum + post.commentsCount, 0);
  const safeFollowerStartDate = followerStartDate || followerDateBounds.start;
  const safeFollowerEndDate = followerEndDate || followerDateBounds.end;
  const normalizedFollowerStartDate =
    safeFollowerStartDate && safeFollowerEndDate && safeFollowerStartDate > safeFollowerEndDate
      ? safeFollowerEndDate
      : safeFollowerStartDate;
  const normalizedFollowerEndDate =
    safeFollowerStartDate && safeFollowerEndDate && safeFollowerStartDate > safeFollowerEndDate
      ? safeFollowerStartDate
      : safeFollowerEndDate;

  function handleFollowerStartDateChange(value: string) {
    setFollowerStartDate(value);
    setFollowerEndDate((current) => (current && current < value ? value : current));
  }

  function handleFollowerEndDateChange(value: string) {
    setFollowerEndDate(value);
    setFollowerStartDate((current) => (current && current > value ? value : current));
  }

  async function saveWelcomeAutomation() {
    setWelcomeSaving(true);
    setWelcomeStatus("");

    try {
      const response = await fetch("/api/instagram/welcome-automation", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(welcomeAutomation),
      });
      const data = (await response.json()) as {
        automation?: InstagramWelcomeAutomationSettings;
        error?: string;
      };

      if (!response.ok || data.error) {
        throw new Error(data.error || "Could not save welcome automation");
      }

      setWelcomeAutomation(data.automation || welcomeAutomation);
      setWelcomeStatus(
        data.automation?.enabled
          ? "Welcome automation saved. It will run on first inbound Instagram DMs while AI auto-send is enabled."
          : "Welcome automation saved but currently turned off."
      );
    } catch (saveError) {
      setWelcomeStatus(saveError instanceof Error ? saveError.message : "Could not save welcome automation");
    } finally {
      setWelcomeSaving(false);
    }
  }

  async function publishStory() {
    if (!storyMediaFile || !storyMediaType) {
      setStoryPublishStatus("Choose an image or video file to publish.");
      return;
    }

    setStoryPublishing(true);
    setStoryPublishStatus("");

    try {
      const formData = new FormData();
      formData.append("media", storyMediaFile);

      const response = await fetch("/api/instagram/content/stories/publish", {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: formData,
      });
      const data = (await response.json()) as { ok?: boolean; storyId?: string; error?: string };

      if (!response.ok || data.error || !data.ok) {
        throw new Error(data.error || "Could not publish story");
      }

      setStoryPublishStatus("Story published.");
      clearStoryMedia(false);
      void loadContent();
    } catch (publishError) {
      setStoryPublishStatus(publishError instanceof Error ? publishError.message : "Could not publish story");
    } finally {
      setStoryPublishing(false);
    }
  }

  return (
    <main className="h-dvh flex-1 overflow-y-auto bg-[#fdfdff] px-4 pb-24 pt-4 text-black sm:px-6 lg:px-8 lg:py-6 xl:px-10">
      <div className="mx-auto max-w-[1320px]">
        <header className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-wide text-[#596175]">
              <InstagramDot />
              Instagram content
            </div>
            <h1 className="mt-2 text-[30px] font-extrabold leading-none text-black sm:text-[32px]">Posts, Stories & Followers</h1>
            <p className="mt-3 max-w-[720px] text-[13px] font-medium leading-relaxed text-[#596175]">
              Review Instagram content, follower growth, and answer messages or comments with AI using your saved key and uploaded knowledge.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {activeTab === "stories" && account && (
              <button
                type="button"
                onClick={() => setActiveModal("publish")}
                className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#4b3cff] px-4 text-[12px] font-extrabold text-white shadow-[0_16px_36px_rgba(75,60,255,0.22)] transition hover:bg-[#3f32e6]"
              >
                <UploadCloud size={15} strokeWidth={2.35} />
                Create story
              </button>
            )}
            <button
              type="button"
              onClick={() => void loadContent()}
              disabled={loadingContent}
              className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#dfe4ef] bg-white px-4 text-[12px] font-extrabold text-black shadow-[0_12px_28px_rgba(20,28,53,0.035)] disabled:opacity-60"
            >
              <RefreshCw size={15} className={loadingContent ? "animate-spin" : ""} strokeWidth={2.35} />
              Refresh
            </button>
            <a
              href="/api/auth/instagram?next=/instagram-content"
              className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#4b3cff] px-4 text-[12px] font-extrabold text-white shadow-[0_16px_36px_rgba(75,60,255,0.22)]"
            >
              <InstagramDot />
              Connect account
            </a>
          </div>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              label: "Connected account",
              value: account?.username ? `@${account.username}` : account ? "Connected" : "Not connected",
              icon: <InstagramDot />,
            },
            { label: "Loaded posts", value: loadingContent ? "..." : String(posts.length), icon: <ImageIcon size={15} strokeWidth={2.35} /> },
            { label: "Active stories", value: loadingContent ? "..." : String(stories.length), icon: <Play size={15} strokeWidth={2.35} /> },
            { label: "Followers", value: loadingContent ? "..." : formatCompactNumber(account?.followersCount), icon: <Users size={15} strokeWidth={2.35} /> },
            { label: "Post comments", value: loadingContent ? "..." : String(totalComments), icon: <MessageCircle size={15} strokeWidth={2.35} /> },
          ].map((metric: { label: string; value: string; icon: ReactNode }) => (
            <article key={metric.label} className="rounded-[10px] border border-[#e6eaf2] bg-white p-4 shadow-[0_18px_48px_rgba(20,28,53,0.035)]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#697083]">{metric.label}</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#f0edff] text-[#4b3cff]">
                  {metric.icon}
                </span>
              </div>
              <p className="mt-3 truncate text-[18px] font-extrabold text-black">{metric.value}</p>
            </article>
          ))}
        </section>

        {error ? (
          <div className="mt-6">
            <EmptyState
              title={error === "No Instagram account connected" ? "No Instagram account connected" : "Instagram content unavailable"}
              detail={
                error === "No Instagram account connected"
                  ? "Connect an Instagram Business account before loading posts, stories, and comments."
                  : error
              }
              action={
                <a
                  href="/api/auth/instagram?next=/instagram-content"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#4b3cff] px-4 text-[12px] font-extrabold text-white"
                >
                  Connect Instagram
                </a>
              }
            />
          </div>
        ) : isDetailPage ? (
          selectedPost ? (
            <PostDetailView
              post={selectedPost}
              comments={comments}
              commentsActive={commentsActive}
              takeoverMode={takeoverMode}
              latestComment={latestComment}
              loadingComments={loadingComments}
              commentsError={commentsError}
              drafts={drafts}
              draftingId={draftingId}
              postingId={postingId}
              onToggleActive={() => setPostAutomation(selectedPost.id, !commentsActive)}
              onChangeTakeover={(mode) => setPostTakeoverMode(selectedPost.id, mode)}
              onRefreshComments={() => void loadComments(selectedPost.id)}
              onDraftChange={(commentId, text) => updateDraft(commentId, { text, status: "" })}
              onDraft={(comment) => void draftReply(comment, selectedPost)}
              onPost={(comment) => void postReply(comment)}
            />
          ) : (
            <div className="mt-6">
              <EmptyState
                title={loadingContent ? "Loading post details" : "Post details unavailable"}
                detail={
                  loadingContent
                    ? "Reading the connected Instagram account."
                    : "This post was not found in the latest loaded Instagram media. Refresh the page or open it from the posts list."
                }
                action={
                  <Link href="/instagram-content" className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#4b3cff] px-4 text-[12px] font-extrabold text-white">
                    Back to posts
                  </Link>
                }
              />
            </div>
          )
        ) : (
          <>
            <div className="mt-6 flex w-full max-w-[520px] rounded-[10px] border border-[#e1e5ef] bg-white p-1 shadow-[0_14px_36px_rgba(20,28,53,0.035)]">
              {(["posts", "stories", "followers"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => changeContentTab(tab)}
                  className={`flex h-9 flex-1 items-center justify-center rounded-[8px] text-[12px] font-extrabold capitalize transition ${activeTab === tab ? "bg-[#4b3cff] text-white" : "text-[#46506a] hover:bg-[#f7f8fc]"
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === "followers" ? (
              <FollowersTab
                account={account}
                loadingContent={loadingContent}
                startDate={normalizedFollowerStartDate}
                endDate={normalizedFollowerEndDate}
                welcomeAutomation={welcomeAutomation}
                welcomeSaving={welcomeSaving}
                welcomeStatus={welcomeStatus}
                onStartDateChange={handleFollowerStartDateChange}
                onEndDateChange={handleFollowerEndDateChange}
                onWelcomeChange={(settings) => {
                  setWelcomeAutomation(settings);
                  setWelcomeStatus("");
                }}
                onSaveWelcome={() => void saveWelcomeAutomation()}
              />
            ) : (
              <>
                <section className="mt-5 w-full">
                  {loadingContent ? (
                    <EmptyState title="Loading Instagram content" detail="Reading the connected account posts and stories." />
                  ) : currentItems.length === 0 ? (
                    <EmptyState
                      title={activeTab === "posts" ? "No posts found" : "No active stories found"}
                      detail={
                        activeTab === "posts"
                          ? "Published Instagram media will appear here after the account is connected and permissions are approved."
                          : storyNotice || "Instagram only returns active stories that are currently available."
                      }
                      action={
                        activeTab === "stories" && account ? (
                          <button
                            type="button"
                            onClick={() => setActiveModal("publish")}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#4b3cff] px-4 text-[12px] font-extrabold text-white hover:bg-[#3f32e6]"
                          >
                            <UploadCloud size={15} strokeWidth={2.35} />
                            Create story
                          </button>
                        ) : undefined
                      }
                    />
                  ) : (
                    <>
                      <ContentPagination
                        totalItems={currentItems.length}
                        startItem={visibleContentStart}
                        endItem={visibleContentEnd}
                        page={safeContentPage}
                        totalPages={contentTotalPages}
                        pageSize={contentPageSize}
                        onPageChange={setContentPage}
                        onPageSizeChange={changeContentPageSize}
                      />
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                        {paginatedItems.map((item) => (
                          <ContentCard
                            key={item.id}
                            item={item}
                            active={
                              activeTab === "posts"
                                ? selectedPost?.id === item.id
                                : activeTab === "stories" && selectedStory?.id === item.id
                            }
                            onSelect={() => {
                              if (item.kind === "post") {
                                setSelectedPostId(item.id);
                              } else {
                                setSelectedStoryId(item.id);
                              }
                              setActiveModal("details");
                            }}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </section>

                {activeModal === "details" && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className={`relative flex h-[90dvh] w-full flex-col overflow-hidden rounded-[16px] bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${activeTab === "posts" ? "max-w-6xl" : "max-w-2xl"
                      }`}>
                      {/* Modal Header */}
                      <header className="flex items-center justify-between border-b border-[#e6eaf2] px-6 py-4">
                        <h2 className="text-[18px] font-extrabold text-black">
                          {activeTab === "posts" ? "Post Details & Comments" : "Story Details & Replies"}
                        </h2>
                        <button
                          type="button"
                          onClick={() => setActiveModal(null)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[#697083] transition hover:bg-[#f3f4f8] hover:text-black"
                          aria-label="Close details modal"
                        >
                          <X size={18} strokeWidth={2.4} />
                        </button>
                      </header>

                      {/* Modal Body */}
                      <div className="flex-1 overflow-y-auto p-6 bg-[#fdfdff]">
                        {activeTab === "posts" && selectedPost ? (
                          <div className="grid gap-6 lg:grid-cols-[480px_1fr]">
                            {/* Left Side: Post Media & Info */}
                            <div className="space-y-4">
                              <div className="rounded-[12px] border border-[#e6eaf2] bg-white p-4 shadow-[0_10px_30px_rgba(20,28,53,0.02)]">
                                <MediaPreview item={selectedPost} play />
                                <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] font-bold text-[#596175]">
                                  <span className="flex items-center gap-2">
                                    <InstagramDot />
                                    {formatDate(selectedPost.timestamp)}
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <MessageCircle size={14} strokeWidth={2.25} />
                                    {selectedPost.commentsCount} comments
                                  </span>
                                  {typeof selectedPost.likeCount === "number" ? (
                                    <span className="flex items-center gap-1.5">
                                      <Heart size={14} strokeWidth={2.25} />
                                      {selectedPost.likeCount} likes
                                    </span>
                                  ) : null}
                                </div>
                                <h3 className="mt-4 text-[15px] font-extrabold text-black">Caption</h3>
                                <p className="mt-2 whitespace-pre-wrap text-[13px] font-semibold leading-relaxed text-[#253049]">
                                  {selectedPost.caption || "No description available for this post."}
                                </p>
                                {selectedPost.permalink ? (
                                  <a
                                    href={selectedPost.permalink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#dfe4ef] bg-white px-4 text-[12px] font-extrabold text-black"
                                  >
                                    Open on Instagram
                                    <ExternalLink size={12} strokeWidth={2.4} />
                                  </a>
                                ) : null}
                              </div>
                            </div>

                            {/* Right Side: Comments and Takeover Controls */}
                            <div className="rounded-[12px] border border-[#e6eaf2] bg-white p-4 shadow-[0_10px_30px_rgba(20,28,53,0.02)] flex flex-col h-full overflow-hidden">
                              <div className="flex items-start justify-between gap-3 shrink-0">
                                <div>
                                  <h3 className="text-[16px] font-extrabold text-black">Comments</h3>
                                  <p className="mt-1 text-[12px] font-semibold text-[#596175]">
                                    {comments.length} loaded comment{comments.length === 1 ? "" : "s"} • {commentsActive ? "active" : "inactive"}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => void loadComments(selectedPost.id)}
                                  disabled={loadingComments}
                                  className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#dfe4ef] bg-white text-black disabled:opacity-60"
                                  aria-label="Refresh comments"
                                >
                                  <RefreshCw size={14} className={loadingComments ? "animate-spin" : ""} strokeWidth={2.3} />
                                </button>
                              </div>

                              <TakeoverControls
                                commentsActive={commentsActive}
                                takeoverMode={takeoverMode}
                                onToggleActive={() => setPostAutomation(selectedPost.id, !commentsActive)}
                                onChangeMode={(mode) => setPostTakeoverMode(selectedPost.id, mode)}
                              />
                              <LatestCommentSummary comment={latestComment} />

                              {commentsError ? (
                                <p className="mt-4 rounded-[8px] border border-[#ffd8df] bg-[#fff6f8] p-3 text-[12px] font-semibold text-[#b4233c]">{commentsError}</p>
                              ) : null}

                              <div className="flex-1 overflow-y-auto mt-4 pr-1 min-h-[300px]">
                                {loadingComments ? (
                                  <div className="rounded-[10px] border border-dashed border-[#d7deeb] p-8 text-center text-[12px] font-semibold text-[#596175]">
                                    Loading comments...
                                  </div>
                                ) : comments.length === 0 ? (
                                  <EmptyState title="No comments yet" detail="New comments on this post will appear here after refresh." />
                                ) : (
                                  <div className="space-y-4">
                                    <CommentsList
                                      comments={comments}
                                      selectedPost={selectedPost}
                                      drafts={drafts}
                                      draftingId={draftingId}
                                      postingId={postingId}
                                      latestCommentId={latestComment?.id}
                                      takeoverMode={takeoverMode}
                                      commentsActive={commentsActive}
                                      onDraftChange={(commentId, text) => updateDraft(commentId, { text, status: "" })}
                                      onDraft={(comment) => void draftReply(comment, selectedPost)}
                                      onPost={(comment) => void postReply(comment)}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : activeTab === "stories" && selectedStory ? (
                          <div className="w-full">
                            <StoryDetailPanel
                              story={selectedStory}
                              replies={storyReplies}
                              loadingReplies={loadingStoryReplies}
                              repliesError={storyRepliesError}
                              onRefreshReplies={() => {
                                if (selectedStory?.id) {
                                  void loadStoryReplies(selectedStory.id);
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <div className="text-center py-12 text-[#596175]">No details available</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeModal === "publish" && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="relative flex h-[80dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[16px] bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                      {/* Modal Header */}
                      <header className="flex items-center justify-between border-b border-[#e6eaf2] px-6 py-4">
                        <h2 className="text-[18px] font-extrabold text-black">Create Story</h2>
                        <button
                          type="button"
                          onClick={() => setActiveModal(null)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[#697083] transition hover:bg-[#f3f4f8] hover:text-black"
                          aria-label="Close publish modal"
                        >
                          <X size={18} strokeWidth={2.4} />
                        </button>
                      </header>

                      {/* Modal Body */}
                      <div className="flex-1 overflow-y-auto p-6 bg-[#fdfdff]">
                        <StoryToolsPanel
                          mediaFile={storyMediaFile}
                          mediaPreviewUrl={storyMediaPreviewUrl}
                          mediaType={storyMediaType}
                          publishing={storyPublishing}
                          status={storyPublishStatus}
                          onMediaFileChange={selectStoryMediaFile}
                          onClearMedia={() => clearStoryMedia()}
                          onPublish={() => void publishStory()}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
