"use client";

import { useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  Box,
  BrainCircuit,
  BriefcaseBusiness,
  Check,
  CircleHelp,
  Database,
  DollarSign,
  Eye,
  FileText,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import NotificationBell from "../../components/NotificationBell";
import type { KnowledgeQaPair, KnowledgeSourceSummary } from "@/lib/knowledge-base";
import { SettingsToggle } from "../SettingsPage";
import { BrandMark } from "./BrandMark";
import { KnowledgeAssistantChat } from "./KnowledgeAssistantChat";
import type {
  CreatorLiveSummary,
  KnowledgeAssignmentValue,
  KnowledgeInsight,
  KnowledgeSource,
  KnowledgeSourceDetail,
  KnowledgeSourceDetailResponse,
  KnowledgeSourcesResponse,
  KnowledgeTab,
  KnowledgeTabLabel,
  KnowledgeUpdate,
  KnowledgeViewTab,
  ManualFaqPair,
  ManualKnowledgeDraft,
  ManualKnowledgeSectionPayload,
} from "./types";

const knowledgeCategoryOptions = [
  "FAQs",
  "Products",
  "Services",
  "Pricing",
  "Business Information",
] as const;

function createManualFaqPair(): ManualFaqPair {
  return {
    id: `faq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    question: "",
    answer: "",
  };
}

function getEmptyManualCategoryContent() {
  return knowledgeCategoryOptions.reduce<Record<string, string>>((contentByCategory, category) => {
    contentByCategory[category] = "";
    return contentByCategory;
  }, {});
}

function normalizeManualFaqPairs(pairs: ManualFaqPair[]) {
  return pairs.length > 0 ? pairs : [createManualFaqPair()];
}

function createManualKnowledgeDraft(source?: { title?: string } | null): ManualKnowledgeDraft {
  const faqPairs = [createManualFaqPair()];

  return {
    title: source?.title || "",
    category: "FAQs",
    content: "",
    faqPairs,
    categoryContent: getEmptyManualCategoryContent(),
    categoryFaqPairs: {
      FAQs: faqPairs,
    },
  };
}

function getManualDraftCategoryContent(draft: ManualKnowledgeDraft, category = draft.category) {
  return draft.categoryContent[category] ?? (category === draft.category ? draft.content : "");
}

function getManualDraftCategoryFaqPairs(draft: ManualKnowledgeDraft, category = draft.category) {
  return normalizeManualFaqPairs(draft.categoryFaqPairs[category] || (category === draft.category ? draft.faqPairs : []));
}

function setManualDraftCategoryContent(draft: ManualKnowledgeDraft, category: string, content: string): ManualKnowledgeDraft {
  return {
    ...draft,
    content: category === draft.category ? content : draft.content,
    categoryContent: {
      ...draft.categoryContent,
      [category]: content,
    },
  };
}

function setManualDraftCategoryFaqPairs(draft: ManualKnowledgeDraft, category: string, faqPairs: ManualFaqPair[]): ManualKnowledgeDraft {
  const nextPairs = normalizeManualFaqPairs(faqPairs);

  return {
    ...draft,
    faqPairs: category === draft.category ? nextPairs : draft.faqPairs,
    categoryFaqPairs: {
      ...draft.categoryFaqPairs,
      [category]: nextPairs,
    },
  };
}

function switchManualKnowledgeDraftCategory(draft: ManualKnowledgeDraft, category: string): ManualKnowledgeDraft {
  const categoryContent = {
    ...draft.categoryContent,
    [draft.category]: draft.content,
  };
  const categoryFaqPairs = {
    ...draft.categoryFaqPairs,
    [draft.category]: draft.faqPairs,
  };
  const nextFaqPairs = normalizeManualFaqPairs(categoryFaqPairs[category] || []);

  return {
    ...draft,
    category,
    content: categoryContent[category] || "",
    faqPairs: nextFaqPairs,
    categoryContent,
    categoryFaqPairs,
  };
}

function getManualKnowledgeDraftContent(draft: ManualKnowledgeDraft) {
  if (draft.category !== "FAQs") {
    return getManualDraftCategoryContent(draft).trim();
  }

  return getManualDraftCategoryFaqPairs(draft)
    .map((pair) => ({
      question: pair.question.trim(),
      answer: pair.answer.trim(),
    }))
    .filter((pair) => pair.question || pair.answer)
    .map((pair) => `Question: ${pair.question}\nAnswer: ${pair.answer}`)
    .join("\n\n")
    .trim();
}

function getManualKnowledgeDraftCategoryContent(draft: ManualKnowledgeDraft, category: string) {
  if (category !== "FAQs") {
    return getManualDraftCategoryContent(draft, category).trim();
  }

  return getManualDraftCategoryFaqPairs(draft, category)
    .map((pair) => ({
      question: pair.question.trim(),
      answer: pair.answer.trim(),
    }))
    .filter((pair) => pair.question || pair.answer)
    .map((pair) => `Question: ${pair.question}\nAnswer: ${pair.answer}`)
    .join("\n\n")
    .trim();
}

function getManualKnowledgeDraftSections(draft: ManualKnowledgeDraft): ManualKnowledgeSectionPayload[] {
  return knowledgeCategoryOptions
    .map((category) => ({
      category,
      title: draft.title || category,
      content: getManualKnowledgeDraftCategoryContent(draft, category),
    }))
    .filter((section) => section.content.length >= 10);
}


function formatKnowledgeInteger(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatKnowledgeBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatInstagramRelativeTime(value?: string) {
  if (!value) {
    return "No activity";
  }

  const diff = Date.now() - new Date(value).getTime();

  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function formatKnowledgeUpdated(value: string) {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return "Just now";
  }

  return formatInstagramRelativeTime(value);
}

function getKnowledgeSourceIcon(source: KnowledgeSourceSummary) {
  if (source.categories.includes("FAQs")) {
    return CircleHelp;
  }

  if (source.categories.includes("Pricing")) {
    return DollarSign;
  }

  if (source.categories.includes("Products")) {
    return Box;
  }

  if (source.categories.includes("Business Information")) {
    return BriefcaseBusiness;
  }

  if (source.categories.includes("Services")) {
    return Sparkles;
  }

  return FileText;
}

function mapKnowledgeSourceSummary(source: KnowledgeSourceSummary): KnowledgeSource {
  const isPdf = source.kind === "pdf";
  const isManual = source.kind === "manual";
  const activeStatus = source.active ? "Ready" : "Inactive";
  const answerCount = source.directAnswerCount || 0;

  return {
    id: source.id,
    title: source.title,
    subtitle: `${formatKnowledgeInteger(source.wordCount)} words • ${formatKnowledgeInteger(source.chunkCount)} chunks${answerCount > 0 ? ` • ${formatKnowledgeInteger(answerCount)} answer${answerCount === 1 ? "" : "s"}` : ""} • ${formatKnowledgeBytes(source.fileSize)}`,
    type: isPdf ? "PDF" : isManual ? "Manual" : "TXT",
    kind: source.kind,
    fileName: source.fileName,
    mimeType: source.mimeType,
    fileSize: source.fileSize,
    characterCount: source.characterCount,
    sourceMode: isManual ? "manual" : "auto",
    sourceModeLabel: isManual ? "Manual entry" : "Auto scanned",
    status: activeStatus,
    statusTone: source.active ? "bg-[#e7f8ed] text-[#0a9b3f]" : "bg-[#eff1f6] text-[#596175]",
    updated: formatKnowledgeUpdated(source.updatedAt),
    tone: isPdf ? "bg-[#fff0f3] text-[#df405b]" : isManual ? "bg-[#f0edff] text-[#4b3cff]" : "bg-[#eef4ff] text-[#246bff]",
    typeTone: isPdf ? "bg-[#fff0f3] text-[#df405b]" : isManual ? "bg-[#f0edff] text-[#4b3cff]" : "bg-[#eef4ff] text-[#246bff]",
    icon: getKnowledgeSourceIcon(source),
    directAnswerCount: answerCount,
    active: source.active,
    wordCount: source.wordCount,
    chunkCount: source.chunkCount,
    categories: source.categories,
  };
}

function buildKnowledgeTabsFromSources(sources: KnowledgeSourceSummary[]): KnowledgeTab[] {
  return [
    { label: "All Sources", count: formatKnowledgeInteger(sources.length), icon: Bot },
    { label: "FAQs", count: formatKnowledgeInteger(sources.filter((source) => source.directAnswerCount > 0 || source.categories.includes("FAQs")).length), icon: CircleHelp },
    { label: "Products", count: formatKnowledgeInteger(sources.filter((source) => source.categories.includes("Products")).length), icon: Box },
    { label: "Services", count: formatKnowledgeInteger(sources.filter((source) => source.categories.includes("Services")).length), icon: Sparkles },
    { label: "Pricing", count: formatKnowledgeInteger(sources.filter((source) => source.categories.includes("Pricing")).length), icon: DollarSign },
    { label: "Business Info", count: formatKnowledgeInteger(sources.filter((source) => source.categories.includes("Business Information")).length), icon: BriefcaseBusiness },
    { label: "PDFs", count: formatKnowledgeInteger(sources.filter((source) => source.kind === "pdf").length), icon: FileText },
  ];
}

function isKnowledgeSourceInTab(source: KnowledgeSource, tab: KnowledgeTabLabel) {
  switch (tab) {
    case "All Sources":
      return true;
    case "FAQs":
      return source.directAnswerCount > 0 || source.categories.includes("FAQs");
    case "Products":
      return source.categories.includes("Products");
    case "Services":
      return source.categories.includes("Services");
    case "Pricing":
      return source.categories.includes("Pricing");
    case "Business Info":
      return source.categories.includes("Business Information");
    case "PDFs":
      return source.kind === "pdf";
    default:
      return true;
  }
}

function isKnowledgeSectionTab(tab: KnowledgeTabLabel) {
  return tab !== "All Sources" && tab !== "PDFs";
}

function getKnowledgeSectionDisplayLabel(tab: KnowledgeTabLabel) {
  return tab === "Business Info" ? "Business information" : tab;
}

function getKnowledgeSectionRowIcon(tab: KnowledgeTabLabel): LucideIcon {
  switch (tab) {
    case "FAQs":
      return CircleHelp;
    case "Products":
      return Box;
    case "Services":
      return Sparkles;
    case "Pricing":
      return DollarSign;
    case "Business Info":
      return BriefcaseBusiness;
    default:
      return BookOpen;
  }
}

function buildKnowledgeInsightsFromSources(sources: KnowledgeSourceSummary[], fallback: KnowledgeInsight[]) {
  if (sources.length === 0) {
    return fallback;
  }

  const activeSources = sources.filter((source) => source.active);
  const totalChunks = activeSources.reduce((sum, source) => sum + source.chunkCount, 0);
  const directAnswers = activeSources.reduce((sum, source) => sum + source.directAnswerCount, 0);

  return [
    {
      title: "Saved retrieval",
      detail: `${formatKnowledgeInteger(totalChunks)} searchable chunks available`,
      tone: "bg-[#f0edff] text-[#4b3cff]",
      icon: Database,
    },
    {
      title: "Direct answers",
      detail: `${formatKnowledgeInteger(directAnswers)} FAQ answers can skip OpenAI`,
      tone: "bg-[#eafaf0] text-[#13a84f]",
      icon: Check,
    },
    {
      title: "Active sources",
      detail: `${formatKnowledgeInteger(activeSources.length)} sources enabled for AI replies`,
      tone: "bg-[#eef4ff] text-[#246bff]",
      icon: BookOpen,
    },
  ];
}

function buildKnowledgeUpdatesFromSources(sources: KnowledgeSourceSummary[]): KnowledgeUpdate[] {
  return sources.slice(0, 4).map((source) => ({
    title: `${source.title} indexed`,
    detail: `${formatKnowledgeInteger(source.chunkCount)} searchable chunks saved`,
    time: formatKnowledgeUpdated(source.updatedAt),
    tone: source.kind === "pdf" ? "bg-[#fff0f3] text-[#df405b]" : "bg-[#eef4ff] text-[#246bff]",
    icon: source.kind === "pdf" ? FileText : Database,
  }));
}

function KnowledgeTabs({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: KnowledgeTab[];
  activeTab: KnowledgeTabLabel;
  onTabChange: (tab: KnowledgeTabLabel) => void;
}) {
  return (
    <div className="-mx-4 mt-8 overflow-x-auto px-4 no-scrollbar sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
      <div className="grid w-max grid-flow-col auto-cols-max">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.label === activeTab;

          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => onTabChange(tab.label)}
              aria-pressed={isActive}
              className={`relative flex h-11 items-center gap-2 border-r border-[#e2e6f0] px-3 text-[12px] font-extrabold last:border-r-0 ${
                isActive ? "text-[#3044ff]" : "text-black"
              }`}
            >
              <Icon size={16} strokeWidth={isActive ? 2.45 : 2.1} />
              <span>{tab.label}</span>
              <span className="rounded-full bg-[#eff1f6] px-2 py-0.5 text-[10px] font-extrabold text-[#596175]">
                {tab.count}
              </span>
              {isActive ? <span className="absolute bottom-0 left-2 right-2 h-[3px] rounded-full bg-[#3044ff]" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const manualKnowledgePlaceholders: Record<string, string> = {
  FAQs: "Question: What is included?\nAnswer: Include the exact answer customers should receive.\n\nQuestion: How do I book?\nAnswer: Explain the booking steps.",
  Products:
    "Product name:\nDescription:\nSizes or variants:\nBest for:\nPrice or price range:\nAvailability:\nHow to order:\nCare or usage notes:",
  Services:
    "Service name:\nWhat is included:\nWho it is for:\nAvailability:\nHow to book:\nDelivery or fulfillment time:\nNext step:",
  Pricing:
    "Plan or package:\nPrice:\nWhat is included:\nPayment methods:\nDeposit or advance payment:\nDelivery charges:\nRefund or exchange note:",
  "Business Information":
    "Business name:\nLocation:\nOpening hours:\nContact number:\nInstagram or website link:\nDelivery cities:\nBrand tone:\nImportant notes:",
};

const knowledgeSectionHeadingMap: Record<string, string[]> = {
  Products: ["Product Categories", "Product name:"],
  Services: ["Services", "Service name:", "Ordering, Delivery, and Exchanges"],
  Pricing: ["Pricing and Bundles", "Pricing", "Plan or package:"],
  "Business Information": ["Business Overview", "Business Information", "Business Info", "Business name:", "Lead Qualification Rules"],
};

const knowledgeSectionBreakHeadings = Array.from(new Set([
  ...Object.values(knowledgeSectionHeadingMap).flat(),
  "Sizing Guidance",
  "Fabric and Care",
  "Materials and Finish Guidance",
  "Care Instructions",
  "Sizing and Fit",
  "Pricing, Packaging, and Delivery",
  "Returns and Exchanges",
  "Direct FAQ Answers",
]));

type KnowledgeSourceSection = {
  category: string;
  content: string;
  qaPairs: KnowledgeQaPair[];
  available: boolean;
};

function escapeKnowledgeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeKnowledgeSectionText(value: string) {
  return value
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getKnowledgeDetailText(source: KnowledgeSourceDetail) {
  return [...source.chunks]
    .sort((a, b) => a.order - b.order)
    .map((chunk) => chunk.text)
    .join("\n\n")
    .trim();
}

function getKnowledgeMarkerMatches(text: string) {
  const categories = knowledgeCategoryOptions.map(escapeKnowledgeRegExp).join("|");
  const markerPattern = new RegExp(`(?:^|\\n)(?:Manual update:[^\\n]*\\n)?Category:\\s*(${categories})\\s*(?:\\nTitle:[^\\n]*)?\\n*`, "gi");
  const matches: { category: string; start: number; end: number }[] = [];
  let match = markerPattern.exec(text);

  while (match) {
    matches.push({
      category: match[1],
      start: match.index,
      end: markerPattern.lastIndex,
    });
    match = markerPattern.exec(text);
  }

  return matches;
}

function extractMarkedKnowledgeCategoryContent(text: string, category: string) {
  const matches = getKnowledgeMarkerMatches(text);

  if (matches.length === 0) {
    return "";
  }

  return matches
    .map((match, index) => {
      const nextMatch = matches[index + 1];

      return {
        category: match.category,
        content: text.slice(match.end, nextMatch?.start ?? text.length),
      };
    })
    .filter((block) => block.category === category)
    .map((block) => normalizeKnowledgeSectionText(block.content))
    .filter(Boolean)
    .join("\n\n");
}

function getKnowledgeHeadingCategory(line: string) {
  const normalizedLine = line.trim().replace(/\s+/g, " ").toLowerCase();

  if (!normalizedLine || /^faq\s*\d*$/i.test(normalizedLine) || normalizedLine.startsWith("question:") || normalizedLine.startsWith("answer:")) {
    return "";
  }

  for (const [category, headings] of Object.entries(knowledgeSectionHeadingMap)) {
    if (
      headings.some((heading) => {
        const normalizedHeading = heading.trim().replace(/\s+/g, " ").toLowerCase();
        return normalizedLine === normalizedHeading || normalizedLine.startsWith(normalizedHeading);
      })
    ) {
      return category;
    }
  }

  return "";
}

function isKnowledgeSectionBreakLine(line: string) {
  const normalizedLine = line.trim().replace(/\s+/g, " ").toLowerCase();

  if (!normalizedLine || /^faq\s*\d*$/i.test(normalizedLine) || normalizedLine.startsWith("question:") || normalizedLine.startsWith("answer:")) {
    return true;
  }

  return knowledgeSectionBreakHeadings.some((heading) => {
    const normalizedHeading = heading.trim().replace(/\s+/g, " ").toLowerCase();
    return normalizedLine === normalizedHeading || normalizedLine.startsWith(normalizedHeading);
  });
}

function extractHeadingKnowledgeCategoryContent(text: string, category: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const blocks: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const headingCategory = getKnowledgeHeadingCategory(lines[index]);

    if (!headingCategory) {
      continue;
    }

    const blockLines = [lines[index]];
    let cursor = index + 1;

    while (cursor < lines.length && !isKnowledgeSectionBreakLine(lines[cursor])) {
      blockLines.push(lines[cursor]);
      cursor += 1;
    }

    if (headingCategory === category) {
      blocks.push(blockLines.join("\n"));
    }

    index = cursor - 1;
  }

  return blocks.map(normalizeKnowledgeSectionText).filter(Boolean).join("\n\n");
}

function extractKnowledgeCategoryContent(source: KnowledgeSourceDetail, category: string) {
  if (category === "FAQs") {
    return "";
  }

  const text = getKnowledgeDetailText(source);
  const markedContent = extractMarkedKnowledgeCategoryContent(text, category);

  if (markedContent) {
    return markedContent;
  }

  return extractHeadingKnowledgeCategoryContent(text, category);
}

function buildKnowledgeSourceSections(source: KnowledgeSourceDetail): KnowledgeSourceSection[] {
  return knowledgeCategoryOptions.map((category) => {
    const qaPairs = category === "FAQs" ? source.qaPairs : [];
    const content = extractKnowledgeCategoryContent(source, category);

    return {
      category,
      content,
      qaPairs,
      available: qaPairs.length > 0 || Boolean(content) || source.categories.includes(category),
    };
  });
}

function getKnowledgeSectionTabId(category: string): KnowledgeViewTab {
  switch (category) {
    case "FAQs":
      return "section:FAQs";
    case "Products":
      return "section:Products";
    case "Services":
      return "section:Services";
    case "Pricing":
      return "section:Pricing";
    case "Business Information":
      return "section:Business Information";
    default:
      return "section:Business Information";
  }
}

function getKnowledgeViewSectionCategory(tab: KnowledgeViewTab) {
  switch (tab) {
    case "section:FAQs":
      return "FAQs";
    case "section:Products":
      return "Products";
    case "section:Services":
      return "Services";
    case "section:Pricing":
      return "Pricing";
    case "section:Business Information":
      return "Business Information";
    default:
      return "";
  }
}

function getKnowledgeSectionTabLabel(section: KnowledgeSourceSection) {
  const label = section.category === "Business Information" ? "Business Info" : section.category;

  if (section.category === "FAQs") {
    return `${label} (${section.qaPairs.length})`;
  }

  return label;
}

function createManualKnowledgeDraftFromDetail(source: KnowledgeSourceDetail): ManualKnowledgeDraft {
  const categoryContent = getEmptyManualCategoryContent();
  const sourceSections = buildKnowledgeSourceSections(source);
  const faqPairs = source.qaPairs.length > 0
    ? source.qaPairs.map((pair) => ({
        id: pair.id,
        question: pair.question,
        answer: pair.answer,
      }))
    : [createManualFaqPair()];

  sourceSections.forEach((section) => {
    if (section.category !== "FAQs") {
      categoryContent[section.category] = section.content;
    }
  });

  return {
    title: source.title,
    category: "FAQs",
    content: "",
    faqPairs,
    categoryContent,
    categoryFaqPairs: {
      FAQs: faqPairs,
    },
  };
}

function KnowledgeManualSourceForm({
  draft,
  isSaving,
  isLoadingSourceDetail,
  sourceContext,
  onClose,
  onChange,
  onSave,
}: {
  draft: ManualKnowledgeDraft;
  isSaving: boolean;
  isLoadingSourceDetail: boolean;
  sourceContext?: KnowledgeSource | null;
  onClose?: () => void;
  onChange: (draft: ManualKnowledgeDraft) => void;
  onSave: () => void;
}) {
  const categoryPlaceholder = manualKnowledgePlaceholders[draft.category] || manualKnowledgePlaceholders["Business Information"];
  const isFaqCategory = draft.category === "FAQs";
  const savedSections = sourceContext ? getManualKnowledgeDraftSections(draft) : [];
  const compiledContent = sourceContext
    ? savedSections.map((section) => section.content).join("\n\n").trim()
    : getManualKnowledgeDraftContent(draft);
  const activeFaqPairs = getManualDraftCategoryFaqPairs(draft);
  const activeContent = getManualDraftCategoryContent(draft);

  function updateFaqPair(pairId: string, patch: Partial<ManualFaqPair>) {
    onChange(setManualDraftCategoryFaqPairs(
      draft,
      draft.category,
      activeFaqPairs.map((pair) => (pair.id === pairId ? { ...pair, ...patch } : pair))
    ));
  }

  function addFaqPair() {
    onChange(setManualDraftCategoryFaqPairs(draft, draft.category, [...activeFaqPairs, createManualFaqPair()]));
  }

  function removeFaqPair(pairId: string) {
    onChange(setManualDraftCategoryFaqPairs(draft, draft.category, activeFaqPairs.filter((pair) => pair.id !== pairId)));
  }

  return (
    <section className="rounded-[12px] border border-[#e7eaf2] bg-white p-4 shadow-[0_18px_45px_rgba(20,28,53,0.025)]">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-black">
            <PencilLine size={17} className="text-[#3044ff]" strokeWidth={2.35} />
            {sourceContext ? "Edit source knowledge" : "Add knowledge manually"}
          </h2>
          <p className="mt-1 max-w-[660px] text-[12px] font-semibold leading-relaxed text-[#596175]">
            {sourceContext
              ? "Review or paste into any tab, then save all filled sections into this source at once."
              : "Add FAQs, products, services, pricing, or business information. Active manual sources are used by chat, inbox, and Instagram comment answers."}
          </p>
          {sourceContext ? (
            <p className="mt-2 inline-flex rounded-[7px] bg-[#f0edff] px-2.5 py-1 text-[11px] font-extrabold text-[#3044ff]">
              {isLoadingSourceDetail ? "Loading existing sections..." : `Updating existing source: ${sourceContext.title}`}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#dfe4ef] bg-white px-4 text-[12px] font-extrabold text-[#31394f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X size={15} strokeWidth={2.35} />
              Close
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || isLoadingSourceDetail || compiledContent.length < 10}
            className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#3044ff] px-4 text-[12px] font-extrabold text-white shadow-[0_18px_36px_rgba(48,68,255,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? <RefreshCw size={15} className="animate-spin" strokeWidth={2.35} /> : <Check size={15} strokeWidth={2.35} />}
            {isSaving ? "Saving..." : sourceContext ? `Save ${savedSections.length || "all"} section${savedSections.length === 1 ? "" : "s"}` : "Save manual source"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="space-y-2">
          {knowledgeCategoryOptions.map((category) => {
            const isActive = draft.category === category;

            return (
              <button
                key={category}
                type="button"
                onClick={() => onChange(switchManualKnowledgeDraftCategory(draft, category))}
                className={`flex h-9 w-full items-center justify-between rounded-[8px] border px-3 text-left text-[12px] font-extrabold transition ${
                  isActive ? "border-[#3044ff] bg-[#f0edff] text-[#3044ff]" : "border-[#e2e6f0] bg-white text-[#31394f] hover:border-[#cbd2e2]"
                }`}
              >
                <span>{category}</span>
                {isActive ? <Check size={14} strokeWidth={2.45} /> : null}
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          <input
            value={draft.title}
            onChange={(event) => onChange({ ...draft, title: event.target.value })}
            placeholder={`${draft.category} title`}
            className="h-10 w-full rounded-[8px] border border-[#dfe4ef] bg-white px-3 text-[12px] font-semibold text-black outline-none transition focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
          />
          {isFaqCategory ? (
            <div className="space-y-3">
              {activeFaqPairs.map((pair, index) => (
                <div key={pair.id} className="rounded-[10px] border border-[#dfe4ef] bg-[#fbfcff] p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#697083]">
                      FAQ {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeFaqPair(pair.id)}
                      disabled={activeFaqPairs.length === 1 && !pair.question.trim() && !pair.answer.trim()}
                      className="flex h-7 items-center justify-center gap-1 rounded-[7px] border border-[#ffd1dc] bg-white px-2 text-[10px] font-extrabold text-[#df405b] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <X size={12} strokeWidth={2.4} />
                      Remove
                    </button>
                  </div>
                  <input
                    value={pair.question}
                    onChange={(event) => updateFaqPair(pair.id, { question: event.target.value })}
                    placeholder="Question"
                    className="h-10 w-full rounded-[8px] border border-[#dfe4ef] bg-white px-3 text-[12px] font-semibold text-black outline-none transition focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
                  />
                  <textarea
                    value={pair.answer}
                    onChange={(event) => updateFaqPair(pair.id, { answer: event.target.value })}
                    placeholder="Answer"
                    className="mt-2 min-h-[96px] w-full resize-y rounded-[8px] border border-[#dfe4ef] bg-white px-3 py-3 text-[12px] font-semibold leading-relaxed text-black outline-none transition focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={addFaqPair}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-[#3044ff] bg-white px-3 text-[12px] font-extrabold text-[#3044ff] transition hover:bg-[#f5f7ff]"
              >
                <Plus size={15} strokeWidth={2.35} />
                Add more FAQ
              </button>
              <p className="text-[11px] font-semibold leading-relaxed text-[#596175]">
                Each question and answer is saved as a direct answer, so matching customer questions can be answered from knowledge immediately.
              </p>
            </div>
          ) : (
            <>
              <textarea
                value={activeContent}
                onChange={(event) => onChange(setManualDraftCategoryContent(draft, draft.category, event.target.value))}
                placeholder={categoryPlaceholder}
                className="min-h-[190px] w-full resize-y rounded-[10px] border border-[#dfe4ef] bg-white px-3 py-3 text-[12px] font-semibold leading-relaxed text-black outline-none transition focus:border-[#3044ff] focus:ring-2 focus:ring-[#3044ff]/10"
              />
              <p className="text-[11px] font-semibold leading-relaxed text-[#596175]">
                Other categories can be plain text, lists, or pasted notes.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function KnowledgeManualSourceModal({
  draft,
  isSaving,
  isLoadingSourceDetail,
  sourceContext,
  onChange,
  onClose,
  onSave,
}: {
  draft: ManualKnowledgeDraft;
  isSaving: boolean;
  isLoadingSourceDetail: boolean;
  sourceContext: KnowledgeSource | null;
  onChange: (draft: ManualKnowledgeDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/32 px-4 py-5 backdrop-blur-sm">
      <button type="button" aria-label="Close manual knowledge modal" className="absolute inset-0 cursor-default" onClick={isSaving ? undefined : onClose} />
      <div className="relative max-h-[90vh] w-[min(1040px,100%)] overflow-y-auto rounded-[14px] bg-white p-3 shadow-[0_32px_90px_rgba(12,18,38,0.24)]">
        <KnowledgeManualSourceForm
          draft={draft}
          isSaving={isSaving}
          isLoadingSourceDetail={isLoadingSourceDetail}
          sourceContext={sourceContext}
          onChange={onChange}
          onClose={onClose}
          onSave={onSave}
        />
      </div>
    </div>
  );
}

function KnowledgeSourceViewModal({
  source,
  isLoading,
  error,
  activeTab,
  onTabChange,
  onClose,
  onDeleteAnswer,
  deletingSourceId,
  deletingAnswerId,
}: {
  source: KnowledgeSourceDetail | null;
  isLoading: boolean;
  error: string;
  activeTab: KnowledgeViewTab;
  onTabChange: (tab: KnowledgeViewTab) => void;
  onClose: () => void;
  onDeleteAnswer: (sourceId: string, qaPairId: string) => void;
  deletingSourceId: string;
  deletingAnswerId: string;
}) {
  const sourceSections = source ? buildKnowledgeSourceSections(source) : [];
  const activeSectionCategory = getKnowledgeViewSectionCategory(activeTab);
  const activeSection = activeSectionCategory
    ? sourceSections.find((section) => section.category === activeSectionCategory) || null
    : null;
  const tabs: { id: KnowledgeViewTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    ...sourceSections.map((section) => ({
      id: getKnowledgeSectionTabId(section.category),
      label: getKnowledgeSectionTabLabel(section),
    })),
    { id: "text", label: `PDF text (${source?.chunks.length || 0})` },
    { id: "details", label: "Details" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/32 px-4 py-5 backdrop-blur-sm">
      <button type="button" aria-label="Close source view" className="absolute inset-0 cursor-default" onClick={onClose} />
      <section className="relative flex max-h-[90vh] w-[min(980px,100%)] flex-col overflow-hidden rounded-[14px] border border-[#e1e5ef] bg-white shadow-[0_32px_90px_rgba(12,18,38,0.24)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#edf0f6] p-5">
          <div>
            <h2 className="text-[20px] font-extrabold leading-tight text-black">{source?.title || "Knowledge source"}</h2>
            <p className="mt-1 text-[12px] font-semibold text-[#596175]">
              {isLoading ? "Loading indexed source data..." : source ? `${source.fileName || source.title} • ${formatKnowledgeBytes(source.fileSize)}` : "Source details"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-[9px] border border-[#dfe4ef] bg-white text-black"
              aria-label="Close source view"
            >
              <X size={18} strokeWidth={2.35} />
            </button>
          </div>
        </div>

        <div className="border-b border-[#edf0f6] px-5 py-3">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`h-9 rounded-[8px] px-3 text-[12px] font-extrabold transition ${
                  activeTab === tab.id ? "bg-[#3044ff] text-white" : "border border-[#dfe4ef] bg-white text-[#46506a] hover:bg-[#f8f9fc]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[360px] overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex h-[260px] items-center justify-center gap-3 rounded-[12px] bg-[#f8f9fc] text-[13px] font-extrabold text-[#46506a]">
              <RefreshCw size={18} className="animate-spin text-[#3044ff]" strokeWidth={2.35} />
              Loading source...
            </div>
          ) : error ? (
            <div className="rounded-[10px] border border-[#ffd1dc] bg-[#fff7f9] px-4 py-3 text-[12px] font-extrabold text-[#df405b]">{error}</div>
          ) : source ? (
            <>
              {activeTab === "overview" ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ["Type", source.kind.toUpperCase()],
                    ["Status", source.active ? "Active" : "Inactive"],
                    ["Words", formatKnowledgeInteger(source.wordCount)],
                    ["Characters", formatKnowledgeInteger(source.characterCount)],
                    ["Chunks", formatKnowledgeInteger(source.chunkCount)],
                    ["Direct answers", formatKnowledgeInteger(source.qaPairs.length || source.directAnswerCount)],
                    ["File size", formatKnowledgeBytes(source.fileSize)],
                    ["Created", formatKnowledgeUpdated(source.createdAt)],
                    ["Updated", formatKnowledgeUpdated(source.updatedAt)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[10px] border border-[#edf0f6] bg-[#fbfcff] p-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#697083]">{label}</p>
                      <p className="mt-1 text-[13px] font-extrabold text-black">{value}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {activeSectionCategory ? (
                <div className="space-y-3">
                  {activeSection?.category === "FAQs" ? (
                    activeSection.qaPairs.length === 0 ? (
                      <p className="rounded-[10px] bg-[#f8f9fc] px-4 py-5 text-[12px] font-semibold text-[#596175]">No direct FAQ answers were extracted from this source.</p>
                    ) : (
                      activeSection.qaPairs.map((pair, index) => (
                        <article key={pair.id} className="rounded-[10px] border border-[#edf0f6] bg-white p-4">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#697083]">FAQ {index + 1}</p>
                            <button
                              type="button"
                              onClick={() => onDeleteAnswer(source.id, pair.id)}
                              disabled={Boolean(deletingSourceId) || Boolean(deletingAnswerId)}
                              className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-[8px] border border-[#ffd1dc] bg-[#fff7f9] px-3 text-[11px] font-extrabold text-[#df405b] transition hover:bg-[#fff0f4] disabled:cursor-not-allowed disabled:opacity-60"
                              aria-label={`Delete FAQ ${index + 1}`}
                            >
                              {deletingAnswerId === pair.id ? <RefreshCw size={13} className="animate-spin" strokeWidth={2.35} /> : <Trash2 size={13} strokeWidth={2.35} />}
                              Delete
                            </button>
                          </div>
                          <h3 className="mt-2 text-[13px] font-extrabold text-black">{pair.question}</h3>
                          <p className="mt-2 whitespace-pre-wrap text-[12px] font-medium leading-relaxed text-[#31394f]">{pair.answer}</p>
                        </article>
                      ))
                    )
                  ) : activeSection?.content ? (
                    <article className="rounded-[10px] border border-[#edf0f6] bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-[13px] font-extrabold text-black">{activeSection.category}</h3>
                        <span className="rounded-[7px] bg-[#f0edff] px-2.5 py-1 text-[10px] font-extrabold text-[#3044ff]">Section text</span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-[12px] font-medium leading-relaxed text-[#31394f]">{activeSection.content}</p>
                    </article>
                  ) : (
                    <p className="rounded-[10px] bg-[#f8f9fc] px-4 py-5 text-[12px] font-semibold text-[#596175]">
                      No {activeSectionCategory === "Business Information" ? "business info" : activeSectionCategory.toLowerCase()} section text was found in this source.
                    </p>
                  )}
                </div>
              ) : null}

              {activeTab === "text" ? (
                <div className="space-y-3">
                  {source.chunks.length === 0 ? (
                    <p className="rounded-[10px] bg-[#f8f9fc] px-4 py-5 text-[12px] font-semibold text-[#596175]">No searchable text chunks were found.</p>
                  ) : (
                    source.chunks.map((chunk) => (
                      <article key={chunk.id} className="rounded-[10px] border border-[#edf0f6] bg-white p-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#697083]">Chunk {chunk.order + 1}</p>
                        <p className="mt-2 whitespace-pre-wrap text-[12px] font-medium leading-relaxed text-[#31394f]">{chunk.text}</p>
                      </article>
                    ))
                  )}
                </div>
              ) : null}

              {activeTab === "details" ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <section className="rounded-[10px] border border-[#edf0f6] bg-white p-4">
                    <h3 className="text-[13px] font-extrabold text-black">Categories</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {source.categories.length > 0 ? (
                        source.categories.map((category) => (
                          <span key={category} className="rounded-[7px] bg-[#f0edff] px-2.5 py-1 text-[11px] font-extrabold text-[#3044ff]">
                            {category}
                          </span>
                        ))
                      ) : (
                        <span className="text-[12px] font-semibold text-[#596175]">No categories detected.</span>
                      )}
                    </div>
                  </section>
                  <section className="rounded-[10px] border border-[#edf0f6] bg-white p-4">
                    <h3 className="text-[13px] font-extrabold text-black">File details</h3>
                    <dl className="mt-3 space-y-2 text-[12px]">
                      {[
                        ["File name", source.fileName || source.title],
                        ["MIME type", source.mimeType || "text/plain"],
                        ["Source ID", source.id],
                      ].map(([label, value]) => (
                        <div key={label} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3">
                          <dt className="font-extrabold text-[#46506a]">{label}</dt>
                          <dd className="min-w-0 break-words font-semibold text-black">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function KnowledgeSourceRows({
  sources,
  totalSourceCount,
  activeTab,
  pdfSources,
  selectedPdfId,
  onPdfSelectionChange,
  onUploadClick,
  onDropFiles,
  onActiveChange,
  onView,
  onAddManual,
  onDelete,
  deletingSourceId,
  isUploading,
  uploadMessage,
  onScrapeUrl,
  isScrapingUrl,
  onSourcesSaved,
}: {
  sources: KnowledgeSource[];
  totalSourceCount: number;
  activeTab: KnowledgeTabLabel;
  pdfSources: KnowledgeSource[];
  selectedPdfId: string;
  onPdfSelectionChange: (sourceId: string) => void;
  onUploadClick: () => void;
  onDropFiles: (files: FileList | null) => void;
  onActiveChange: (sourceId: string, active: boolean) => void;
  onView: (sourceId: string) => void;
  onAddManual: (source: KnowledgeSource) => void;
  onDelete: (sourceId: string) => void;
  deletingSourceId: string;
  isUploading: boolean;
  uploadMessage: string;
  onScrapeUrl: (url: string) => void;
  isScrapingUrl: boolean;
  onSourcesSaved: () => void;
}) {
  const [scrapeUrlInput, setScrapeUrlInput] = useState("");

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    onDropFiles(event.dataTransfer.files);
  }
  const selectedPdf = pdfSources.find((source) => source.id === selectedPdfId) || null;
  const isFilteredView = activeTab !== "All Sources";
  const tabSourceTitle =
    activeTab === "FAQs"
      ? "FAQ sources"
      : activeTab === "PDFs"
        ? "PDF sources"
        : activeTab === "Business Info"
          ? "Business info sources"
          : `${activeTab} sources`;
  const emptyTitle = isFilteredView ? `No ${tabSourceTitle.toLowerCase()} found` : "No saved knowledge sources yet";
  const emptyDetail = isFilteredView
    ? "Switch to All Sources or add a matching knowledge source."
    : "Add FAQs, products, services, pricing, business information, or PDFs to train the AI.";
  const sectionTitle = selectedPdf
    ? selectedPdf.title
    : isFilteredView
      ? tabSourceTitle
      : "Saved knowledge sources";
  const sectionDetail = isFilteredView
    ? `Showing ${formatKnowledgeInteger(sources.length)} of ${formatKnowledgeInteger(totalSourceCount)} saved source${totalSourceCount === 1 ? "" : "s"}.`
    : "PDF/TXT and manual sources are listed here. Active sources are available to AI replies.";

  return (
    <section>
      <div className="mb-3 flex flex-col gap-2 rounded-[10px] border border-[#e7eaf2] bg-white p-3 shadow-[0_18px_45px_rgba(20,28,53,0.025)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[13px] font-extrabold text-black">{sectionTitle}</h2>
          <p className="mt-1 text-[11px] font-medium text-[#596175]">
            {sectionDetail}
          </p>
        </div>
        {activeTab === "PDFs" && pdfSources.length > 1 ? (
          <label className="flex h-9 min-w-[220px] items-center gap-2 rounded-[8px] border border-[#dfe4ef] bg-white px-3 text-[11px] font-extrabold text-[#31394f]">
            <span className="shrink-0 text-[#596175]">PDF</span>
            <select
              value={selectedPdfId}
              onChange={(event) => onPdfSelectionChange(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-[12px] font-extrabold text-black outline-none"
            >
              <option value="all">All PDFs</option>
              {pdfSources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="overflow-x-auto overflow-y-hidden rounded-[12px] border border-[#e7eaf2] bg-white shadow-[0_18px_45px_rgba(20,28,53,0.025)]">
        <div className="hidden min-w-[1180px] grid-cols-[minmax(260px,1fr)_82px_120px_150px_120px_360px] border-b border-[#edf0f6] bg-[#fbfcff] px-4 py-3 text-[11px] font-semibold text-[#46506a] md:grid">
          <span>Source</span>
          <span>Type</span>
          <span>Status</span>
          <span>Active</span>
          <span>Last updated</span>
          <span>Actions</span>
        </div>

        {sources.length === 0 ? (
          <div className="border border-dashed border-[#d7deeb] px-5 py-10 text-center">
            <BookOpen className="mx-auto text-[#3044ff]" size={30} strokeWidth={2.35} />
            <h2 className="mt-3 text-[15px] font-extrabold text-black">{emptyTitle}</h2>
            <p className="mx-auto mt-2 max-w-[480px] text-[12px] font-medium leading-relaxed text-[#596175]">
              {emptyDetail}
            </p>
          </div>
        ) : (
          <div className="min-w-[1180px] divide-y divide-[#edf0f6]">
            {sources.map((source) => {
              const isSectionRow = isKnowledgeSectionTab(activeTab);
              const Icon = isSectionRow ? getKnowledgeSectionRowIcon(activeTab) : source.icon;
              const sectionLabel = getKnowledgeSectionDisplayLabel(activeTab);
              const displayTitle = isSectionRow ? `${sectionLabel} section` : source.title;
              const displaySubtitle = isSectionRow
                ? `From ${source.title} • ${source.subtitle}`
                : source.subtitle;
              const displayTone = isSectionRow ? "bg-[#f0edff] text-[#4b3cff]" : source.tone;
              const displayType = isSectionRow ? "SECTION" : source.type;
              const displayTypeTone = isSectionRow ? "bg-[#f0edff] text-[#4b3cff]" : source.typeTone;
              const displayModeLabel = isSectionRow ? `${sectionLabel} knowledge` : source.sourceModeLabel;
              const displayModeTone = isSectionRow
                ? "bg-[#f0edff] text-[#4b3cff]"
                : source.sourceMode === "auto"
                  ? "bg-[#eef4ff] text-[#246bff]"
                  : "bg-[#f0edff] text-[#4b3cff]";

              return (
	                <article
	                  key={source.id}
	                  className="grid gap-3 px-4 py-4 transition hover:bg-[#fbfcff] md:grid-cols-[minmax(260px,1fr)_82px_120px_150px_120px_360px] md:items-center"
	                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] ${displayTone}`}>
                      <Icon size={21} strokeWidth={2.25} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-extrabold text-black">{displayTitle}</span>
                      <span className="mt-1 block truncate text-[12px] font-medium text-[#46506a]">{displaySubtitle}</span>
                      <span className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex h-6 items-center rounded-[7px] px-2 text-[10px] font-extrabold ${displayModeTone}`}>
                          {displayModeLabel}
                        </span>
                        {source.directAnswerCount > 0 ? (
                          <span className="inline-flex h-6 items-center rounded-[7px] bg-[#eafaf0] px-2 text-[10px] font-extrabold text-[#0a9b3f]">
                            {formatKnowledgeInteger(source.directAnswerCount)} answer{source.directAnswerCount === 1 ? "" : "s"}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 md:block">
                    <span className="text-[10px] font-extrabold uppercase text-[#7b8498] md:hidden">Type</span>
                    <span className={`inline-flex h-6 items-center rounded-[7px] px-2.5 text-[11px] font-bold ${displayTypeTone}`}>
                      {displayType}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 md:block">
                    <span className="text-[10px] font-extrabold uppercase text-[#7b8498] md:hidden">Status</span>
                    <span className={`inline-flex h-6 items-center gap-2 rounded-[7px] px-2.5 text-[11px] font-bold ${source.statusTone}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {source.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 md:block">
                    <span className="text-[10px] font-extrabold uppercase text-[#7b8498] md:hidden">Active</span>
                    <SettingsToggle
                      ariaLabel={`${source.title} knowledge source ${source.active ? "active" : "inactive"}`}
                      checked={source.active}
                      onChange={(checked) => onActiveChange(source.id, checked)}
                      showStateLabel
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 md:block">
                    <span className="text-[10px] font-extrabold uppercase text-[#7b8498] md:hidden">Last updated</span>
                    <p className="whitespace-pre-line text-right text-[12px] font-medium leading-[1.35] text-[#46506a] md:text-left">
                      {source.updated}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 md:block">
                    <span className="text-[10px] font-extrabold uppercase text-[#7b8498] md:hidden">Actions</span>
                    <div className="flex flex-wrap items-center justify-end gap-2 md:justify-start">
                      <button
                        type="button"
                        onClick={() => onView(source.id)}
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[8px] border border-[#dfe4ef] bg-white px-3 text-[11px] font-extrabold text-[#31394f] transition hover:bg-[#f8f9fc]"
                      >
                        <Eye size={13} strokeWidth={2.35} />
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => onAddManual(source)}
                        disabled={isUploading}
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[8px] border border-[#d7d5ff] bg-[#f5f3ff] px-3 text-[11px] font-extrabold text-[#3044ff] transition hover:bg-[#efedff] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <PencilLine size={13} strokeWidth={2.35} />
                        Edit sections
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(source.id)}
                        disabled={isUploading || deletingSourceId === source.id}
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[8px] border border-[#ffd1dc] bg-[#fff7f9] px-3 text-[11px] font-extrabold text-[#df405b] transition hover:bg-[#fff0f4] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingSourceId === source.id ? (
                          <RefreshCw size={13} className="animate-spin" strokeWidth={2.35} />
                        ) : (
                          <Trash2 size={13} strokeWidth={2.35} />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <KnowledgeAssistantChat onSourcesSaved={onSourcesSaved} />
      </div>
    </section>
  );
}

function TrainingStatusCard({ percent, sourceCount }: { percent: number; sourceCount: number }) {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const trainedDegrees = Math.round((clampedPercent / 100) * 360);

  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-black">
          <BrainCircuit size={16} className="text-[#6d3cff]" strokeWidth={2.35} />
          AI Training Status
        </h2>
        <button type="button" className="text-[12px] font-extrabold text-[#3044ff]">Learn more</button>
      </div>

      <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
        <div
          className="relative mx-auto flex h-[96px] w-[96px] shrink-0 items-center justify-center rounded-full sm:mx-0"
          style={{
            background: `conic-gradient(#3044ff 0deg ${trainedDegrees}deg, #eef0fb ${trainedDegrees}deg 360deg)`,
          }}
        >
          <div className="absolute inset-[8px] flex flex-col items-center justify-center rounded-full bg-white">
            <span className="text-[20px] font-extrabold leading-none text-black">{clampedPercent}%</span>
            <span className="mt-1.5 text-[10px] font-semibold text-[#596175]">Trained</span>
          </div>
        </div>
        <p className="text-[14px] font-medium leading-[1.55] text-black">
          {sourceCount > 0
            ? "Your AI has saved knowledge sources available."
            : "No saved knowledge sources are connected yet."}
        </p>
      </div>

      <div className="mt-5 space-y-4 border-t border-[#edf0f6] pt-4">
        {[
          ["Sources synced", `${sourceCount} / ${sourceCount}`, sourceCount > 0 ? "text-[#0a9b3f]" : "text-[#596175]"],
          ["Up to date", String(sourceCount), sourceCount > 0 ? "text-[#0a9b3f]" : "text-[#596175]"],
          ["Needs review", "0", "text-[#596175]"],
        ].map(([label, value, tone]) => (
          <div key={label} className="flex items-center justify-between text-[12px]">
            <span className="font-medium text-[#31394f]">{label}</span>
            <span className={`font-extrabold ${tone}`}>{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function KnowledgeInsightsCard({ insights }: { insights: KnowledgeInsight[] }) {
  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-black">
        <BarChart3 size={15} strokeWidth={2.35} />
        Knowledge Insights
      </h2>

      <div className="mt-4 space-y-3">
        {insights.map((insight) => {
          const Icon = insight.icon;
          return (
            <button key={insight.title} type="button" className="flex w-full items-center gap-3 rounded-[9px] py-1.5 text-left">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] ${insight.tone}`}>
                <Icon size={15} strokeWidth={2.25} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-extrabold text-black">{insight.title}</span>
                <span className="mt-1 block truncate text-[11px] font-medium text-[#596175]">{insight.detail}</span>
              </span>
              <ArrowRight size={15} strokeWidth={2.25} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function KnowledgeUpdatesCard({ updates }: { updates: KnowledgeUpdate[] }) {
  return (
    <section className="rounded-[12px] border border-[#e5e8f0] bg-white p-5 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-extrabold text-black">Recent updates</h2>
        <button type="button" className="text-[12px] font-extrabold text-[#3044ff]">View all</button>
      </div>

      <div className="mt-4 space-y-4">
        {updates.length === 0 ? (
          <p className="rounded-[9px] bg-[#f8f9fc] px-3 py-4 text-[12px] font-medium leading-relaxed text-[#596175]">
            No real knowledge updates have been recorded yet.
          </p>
        ) : updates.map((update) => {
          const Icon = update.icon;
          return (
            <div key={update.title} className="flex items-center gap-3">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${update.tone}`}>
                <Icon size={16} strokeWidth={2.25} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-extrabold text-black">{update.title}</span>
                <span className="mt-1 block truncate text-[11px] font-medium text-[#46506a]">{update.detail}</span>
              </span>
              <span className="shrink-0 text-right text-[10px] font-medium text-[#596175]">{update.time}</span>
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#13a84f]" />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function KnowledgeBasePage({ summary, isLoading, error }: { summary: CreatorLiveSummary; isLoading: boolean; error: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSourceSummary[]>([]);
  const [isKnowledgeLoading, setIsKnowledgeLoading] = useState(true);
  const [isUploadingKnowledge, setIsUploadingKnowledge] = useState(false);
  const [isSavingManualKnowledge, setIsSavingManualKnowledge] = useState(false);
  const [deletingKnowledgeSourceId, setDeletingKnowledgeSourceId] = useState("");
  const [deletingKnowledgeAnswerId, setDeletingKnowledgeAnswerId] = useState("");
  const [knowledgeError, setKnowledgeError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [isManualKnowledgeModalOpen, setIsManualKnowledgeModalOpen] = useState(false);
  const [isLoadingManualKnowledgeDetail, setIsLoadingManualKnowledgeDetail] = useState(false);
  const [manualKnowledgeSourceContext, setManualKnowledgeSourceContext] = useState<KnowledgeSource | null>(null);
  const [viewingKnowledgeSourceId, setViewingKnowledgeSourceId] = useState("");
  const [viewingKnowledgeSource, setViewingKnowledgeSource] = useState<KnowledgeSourceDetail | null>(null);
  const [knowledgeViewError, setKnowledgeViewError] = useState("");
  const [knowledgeViewTab, setKnowledgeViewTab] = useState<KnowledgeViewTab>("overview");
  const [activeKnowledgeTab, setActiveKnowledgeTab] = useState<KnowledgeTabLabel>("All Sources");
  const [selectedKnowledgePdfId, setSelectedKnowledgePdfId] = useState("all");
  const [manualKnowledgeDraft, setManualKnowledgeDraft] = useState<ManualKnowledgeDraft>(() => createManualKnowledgeDraft());
  const [isScrapingUrl, setIsScrapingUrl] = useState(false);

  const loadKnowledgeSources = async () => {
    try {
      const response = await fetch("/api/knowledge/sources", { cache: "no-store" });
      const payload = (await response.json()) as KnowledgeSourcesResponse;

      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Could not load knowledge sources");
      }

      setKnowledgeSources(payload.sources || []);
      setKnowledgeError("");
    } catch (loadError) {
      setKnowledgeError(loadError instanceof Error ? loadError.message : "Could not load knowledge sources");
    } finally {
      setIsKnowledgeLoading(false);
    }
  };

  useEffect(() => {
    void loadKnowledgeSources();
  }, []);

  function resetManualKnowledgeDraft(source?: KnowledgeSource | null) {
    setManualKnowledgeDraft(createManualKnowledgeDraft(source));
  }

  async function openManualKnowledgeModal(source?: KnowledgeSource | null) {
    const nextSource = source || null;

    setManualKnowledgeSourceContext(nextSource);
    resetManualKnowledgeDraft(nextSource);
    setIsManualKnowledgeModalOpen(true);
    setIsLoadingManualKnowledgeDetail(Boolean(nextSource?.id));

    if (!nextSource?.id) {
      return;
    }

    try {
      const response = await fetch(`/api/knowledge/sources/${nextSource.id}`, { cache: "no-store" });
      const payload = (await response.json()) as KnowledgeSourceDetailResponse;

      if (!response.ok || payload.error || !payload.detail) {
        throw new Error(payload.error || "Could not load source sections");
      }

      setManualKnowledgeDraft(createManualKnowledgeDraftFromDetail(payload.detail));
      setKnowledgeError("");
    } catch (detailError) {
      const message = detailError instanceof Error ? detailError.message : "Could not load source sections";
      setKnowledgeError(message);
      setUploadMessage(message);
    } finally {
      setIsLoadingManualKnowledgeDetail(false);
    }
  }

  function closeManualKnowledgeModal() {
    if (isSavingManualKnowledge) {
      return;
    }

    setIsManualKnowledgeModalOpen(false);
    setIsLoadingManualKnowledgeDetail(false);
    setManualKnowledgeSourceContext(null);
  }

  function changeKnowledgeTab(tab: KnowledgeTabLabel) {
    setActiveKnowledgeTab(tab);
    setSelectedKnowledgePdfId("all");
  }

  async function openKnowledgeSourceView(sourceId: string) {
    setViewingKnowledgeSourceId(sourceId);
    setViewingKnowledgeSource(null);
    setKnowledgeViewError("");
    setKnowledgeViewTab("overview");

    try {
      const response = await fetch(`/api/knowledge/sources/${sourceId}`, { cache: "no-store" });
      const payload = (await response.json()) as KnowledgeSourceDetailResponse;

      if (!response.ok || payload.error || !payload.detail) {
        throw new Error(payload.error || "Could not load knowledge source");
      }

      setViewingKnowledgeSource(payload.detail);
    } catch (viewError) {
      setKnowledgeViewError(viewError instanceof Error ? viewError.message : "Could not load knowledge source");
    }
  }

  function closeKnowledgeSourceView() {
    setViewingKnowledgeSourceId("");
    setViewingKnowledgeSource(null);
    setKnowledgeViewError("");
  }

  async function uploadKnowledgeFiles(files: FileList | null) {
    const file = files?.[0];

    if (!file || isUploadingKnowledge) {
      return;
    }

    setIsUploadingKnowledge(true);
    setKnowledgeError("");
    setUploadMessage(`Uploading ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("assignment", knowledgeSources.length === 0 ? "default" : "auto");

      const response = await fetch("/api/knowledge/sources", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as KnowledgeSourcesResponse;

      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Could not upload knowledge source");
      }

      console.log("Knowledge upload assistant id:", {
        assistantId: payload.assistantId || payload.assistant_id || "",
        assistant_id: payload.assistant_id || payload.assistantId || "",
        sourceId: payload.source?.id || "",
        fileName: file.name,
      });

      setKnowledgeSources(payload.sources || []);
      setUploadMessage(`${file.name} indexed and ready.`);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Could not upload knowledge source";
      setKnowledgeError(message);
      setUploadMessage(message);
    } finally {
      setIsUploadingKnowledge(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleScrapeUrl(url: string) {
    if (!url || isScrapingUrl) return;

    setIsScrapingUrl(true);
    setUploadMessage(`Scraping ${url}...`);
    try {
      const response = await fetch("/api/knowledge/sources/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Could not scrape URL");
      }
      
      const newDraft = createManualKnowledgeDraft();
      newDraft.title = `Website: ${url.replace(/^https?:\/\//, "")}`;
      newDraft.category = "Business Information";
      const finalDraft = switchManualKnowledgeDraftCategory(newDraft, "Business Information");
      const updatedDraft = setManualDraftCategoryContent(finalDraft, "Business Information", data.text || "");
      
      setManualKnowledgeDraft(updatedDraft);
      setIsManualKnowledgeModalOpen(true);
      setUploadMessage("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Scraping failed";
      setUploadMessage(message);
    } finally {
      setIsScrapingUrl(false);
    }
  }

  async function saveManualKnowledgeSource() {
    const isAppendingToSource = Boolean(manualKnowledgeSourceContext?.id);
    const manualSections = isAppendingToSource ? getManualKnowledgeDraftSections(manualKnowledgeDraft) : [];
    const manualContent = isAppendingToSource
      ? manualSections.map((section) => section.content).join("\n\n").trim()
      : getManualKnowledgeDraftContent(manualKnowledgeDraft);

    if (isSavingManualKnowledge || isLoadingManualKnowledgeDetail || manualContent.length < 10) {
      return;
    }

    const endpoint = isAppendingToSource
      ? `/api/knowledge/sources/${manualKnowledgeSourceContext?.id}`
      : "/api/knowledge/sources";

    setIsSavingManualKnowledge(true);
    setKnowledgeError("");
    setUploadMessage(
      isAppendingToSource
        ? `Saving ${manualSections.length} section${manualSections.length === 1 ? "" : "s"} to ${manualKnowledgeSourceContext?.title}...`
        : `Saving ${manualKnowledgeDraft.category} knowledge...`
    );

    try {
      const response = await fetch(endpoint, {
        method: isAppendingToSource ? "PATCH" : "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: manualKnowledgeDraft.title,
          category: manualKnowledgeDraft.category,
          content: isAppendingToSource ? undefined : manualContent,
          sections: isAppendingToSource ? manualSections : undefined,
          replaceCategory: isAppendingToSource,
          assignment: knowledgeSources.length === 0 ? "default" : "auto",
        }),
      });
      const payload = (await response.json()) as KnowledgeSourcesResponse;

      if (!response.ok || payload.error) {
        throw new Error(
          payload.error || (isAppendingToSource ? "Could not add knowledge to this source" : "Could not save manual knowledge source")
        );
      }

      setKnowledgeSources(payload.sources || []);
      setUploadMessage(
        isAppendingToSource
          ? `${manualSections.length} section${manualSections.length === 1 ? "" : "s"} saved to ${manualKnowledgeSourceContext?.title}.`
          : `${manualKnowledgeDraft.title || manualKnowledgeDraft.category} saved and ready for AI replies.`
      );
      setManualKnowledgeDraft((current) => ({
        ...createManualKnowledgeDraft(),
        title: current.title && isAppendingToSource ? current.title : "",
      }));
      setIsManualKnowledgeModalOpen(false);
      setIsLoadingManualKnowledgeDetail(false);
      setManualKnowledgeSourceContext(null);
    } catch (saveError) {
      const message = saveError instanceof Error
        ? saveError.message
        : isAppendingToSource
          ? "Could not add knowledge to this source"
          : "Could not save manual knowledge source";
      setKnowledgeError(message);
      setUploadMessage(message);
    } finally {
      setIsSavingManualKnowledge(false);
    }
  }

  async function updateKnowledgeSource(sourceId: string, partial: { active?: boolean; assignment?: KnowledgeAssignmentValue }) {
    setKnowledgeError("");

    try {
      const response = await fetch(`/api/knowledge/sources/${sourceId}`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(partial),
      });
      const payload = (await response.json()) as KnowledgeSourcesResponse;

      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Could not update knowledge source");
      }

      setKnowledgeSources(payload.sources || []);
      setUploadMessage("Knowledge source updated.");
    } catch (updateError) {
      setKnowledgeError(updateError instanceof Error ? updateError.message : "Could not update knowledge source");
    }
  }

  async function deleteKnowledgeSource(sourceId: string) {
    if (deletingKnowledgeSourceId) {
      return;
    }

    const source = knowledgeSources.find((item) => item.id === sourceId) || (viewingKnowledgeSource?.id === sourceId ? viewingKnowledgeSource : null);
    const shouldDelete = window.confirm(`Delete ${source?.title || "this knowledge source"}?`);

    if (!shouldDelete) {
      return;
    }

    setDeletingKnowledgeSourceId(sourceId);
    setKnowledgeError("");
    setUploadMessage("");

    try {
      const response = await fetch(`/api/knowledge/sources/${sourceId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as KnowledgeSourcesResponse & { deleted?: boolean };

      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Could not delete knowledge source");
      }

      setKnowledgeSources((currentSources) => currentSources.filter((item) => item.id !== sourceId));
      if (viewingKnowledgeSourceId === sourceId) {
        closeKnowledgeSourceView();
      }
      setUploadMessage(`${source?.title || "Knowledge source"} deleted.`);
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Could not delete knowledge source";
      setKnowledgeError(message);
      setUploadMessage(message);
    } finally {
      setDeletingKnowledgeSourceId("");
    }
  }

  async function deleteKnowledgeAnswer(sourceId: string, qaPairId: string) {
    if (deletingKnowledgeAnswerId) {
      return;
    }

    const answer = viewingKnowledgeSource?.id === sourceId
      ? viewingKnowledgeSource.qaPairs.find((pair) => pair.id === qaPairId)
      : null;
    const shouldDelete = window.confirm(`Delete this answer section${answer?.question ? `: ${answer.question.slice(0, 80)}` : ""}?`);

    if (!shouldDelete) {
      return;
    }

    setDeletingKnowledgeAnswerId(qaPairId);
    setKnowledgeError("");
    setKnowledgeViewError("");
    setUploadMessage("");

    try {
      const response = await fetch(`/api/knowledge/sources/${sourceId}`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deleteQaPairId: qaPairId }),
      });
      const payload = (await response.json()) as KnowledgeSourcesResponse & KnowledgeSourceDetailResponse;

      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Could not delete answer section");
      }

      if (payload.sources) {
        setKnowledgeSources(payload.sources);
      }

      if (payload.detail) {
        setViewingKnowledgeSource(payload.detail);
      } else {
        setViewingKnowledgeSource((current) =>
          current?.id === sourceId
            ? {
                ...current,
                qaPairs: current.qaPairs.filter((pair) => pair.id !== qaPairId),
                directAnswerCount: Math.max(0, current.directAnswerCount - 1),
                updatedAt: new Date().toISOString(),
              }
            : current
        );
      }

      setUploadMessage("Answer section deleted.");
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Could not delete answer section";
      setKnowledgeViewError(message);
      setKnowledgeError(message);
    } finally {
      setDeletingKnowledgeAnswerId("");
    }
  }

  const sourceRows = knowledgeSources.map(mapKnowledgeSourceSummary);
  const pdfSourceRows = sourceRows.filter((source) => source.kind === "pdf");
  const effectiveSelectedKnowledgePdfId =
    selectedKnowledgePdfId !== "all" && pdfSourceRows.some((source) => source.id === selectedKnowledgePdfId)
      ? selectedKnowledgePdfId
      : "all";
  const tabFilteredSourceRows = sourceRows.filter((source) => isKnowledgeSourceInTab(source, activeKnowledgeTab));
  const filteredSourceRows =
    activeKnowledgeTab === "PDFs" && effectiveSelectedKnowledgePdfId !== "all"
      ? tabFilteredSourceRows.filter((source) => source.id === effectiveSelectedKnowledgePdfId)
      : tabFilteredSourceRows;
  const knowledgeTabs = isKnowledgeLoading && knowledgeSources.length === 0 ? summary.knowledgeTabs : buildKnowledgeTabsFromSources(knowledgeSources);
  const knowledgeInsights = buildKnowledgeInsightsFromSources(knowledgeSources, summary.knowledgeInsights);
  const knowledgeUpdates = buildKnowledgeUpdatesFromSources(knowledgeSources);
  const activeKnowledgeCount = knowledgeSources.filter((source) => source.active).length;
  const trainingPercent = knowledgeSources.length > 0 ? Math.round((activeKnowledgeCount / knowledgeSources.length) * 100) : 0;
  const visibleStatusMessage = isLoading
    ? "Loading real workspace data..."
    : isKnowledgeLoading
      ? "Loading saved knowledge sources..."
      : error || knowledgeError;

  return (
    <main className="h-dvh flex-1 overflow-y-auto bg-[#fdfdff] px-4 pb-24 pt-4 text-black sm:px-6 lg:px-8 lg:py-6 xl:px-10">
      <div className="mx-auto max-w-[1286px]">
        <div className="mb-5 lg:hidden">
          <BrandMark />
        </div>

        <header className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:gap-8">
          <div>
            <h1 className="text-[28px] font-extrabold leading-none text-black sm:text-[30px]">Knowledge Base</h1>
            <p className="mt-3 text-[12px] font-medium leading-[1.4] text-[#596175]">
              Your AI is only as good as the knowledge you give it.
            </p>
          </div>

          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 sm:flex sm:w-auto sm:gap-5">
            <div className="flex h-10 min-w-0 items-center gap-3 rounded-[9px] border border-[#e0e4ef] bg-white px-3 text-[#596175] shadow-[0_12px_36px_rgba(20,28,53,0.025)] sm:w-[218px]">
              <Search size={16} strokeWidth={2.2} />
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium">Search knowledge...</span>
              <span className="hidden rounded bg-[#eff1f6] px-1.5 py-0.5 text-[11px] font-extrabold text-[#8b92a6] sm:inline">⌘K</span>
            </div>

            <NotificationBell />
          </div>
        </header>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain,text/markdown"
          className="hidden"
          onChange={(event) => void uploadKnowledgeFiles(event.target.files)}
        />

        <KnowledgeTabs tabs={knowledgeTabs} activeTab={activeKnowledgeTab} onTabChange={changeKnowledgeTab} />

        {visibleStatusMessage && (
          <div className="mt-4 rounded-[10px] border border-[#edf0f6] bg-white px-4 py-3 text-[12px] font-semibold text-[#46506a] shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
            {visibleStatusMessage}
          </div>
        )}

        <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_344px]">
          <div>
            <KnowledgeSourceRows
              sources={filteredSourceRows}
              totalSourceCount={sourceRows.length}
              activeTab={activeKnowledgeTab}
              pdfSources={pdfSourceRows}
              selectedPdfId={effectiveSelectedKnowledgePdfId}
              onPdfSelectionChange={setSelectedKnowledgePdfId}
              onUploadClick={() => fileInputRef.current?.click()}
              onDropFiles={(files) => void uploadKnowledgeFiles(files)}
              onActiveChange={(sourceId, active) => void updateKnowledgeSource(sourceId, { active })}
              onView={(sourceId) => void openKnowledgeSourceView(sourceId)}
              onAddManual={(source) => void openManualKnowledgeModal(source)}
              onDelete={(sourceId) => void deleteKnowledgeSource(sourceId)}
              deletingSourceId={deletingKnowledgeSourceId}
              isUploading={isUploadingKnowledge}
              uploadMessage={uploadMessage}
              onScrapeUrl={handleScrapeUrl}
              isScrapingUrl={isScrapingUrl}
              onSourcesSaved={loadKnowledgeSources}
            />
          </div>

          <aside className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
            <TrainingStatusCard percent={trainingPercent} sourceCount={knowledgeSources.length} />
            <KnowledgeInsightsCard insights={knowledgeInsights} />
            <KnowledgeUpdatesCard updates={knowledgeUpdates} />
          </aside>
        </div>

        {isManualKnowledgeModalOpen ? (
          <KnowledgeManualSourceModal
            draft={manualKnowledgeDraft}
            isSaving={isSavingManualKnowledge}
            isLoadingSourceDetail={isLoadingManualKnowledgeDetail}
            sourceContext={manualKnowledgeSourceContext}
            onChange={setManualKnowledgeDraft}
            onClose={closeManualKnowledgeModal}
            onSave={() => void saveManualKnowledgeSource()}
          />
        ) : null}

        {viewingKnowledgeSourceId ? (
          <KnowledgeSourceViewModal
            source={viewingKnowledgeSource}
            isLoading={!viewingKnowledgeSource && !knowledgeViewError}
            error={knowledgeViewError}
            activeTab={knowledgeViewTab}
            onTabChange={setKnowledgeViewTab}
            onClose={closeKnowledgeSourceView}
            onDeleteAnswer={(sourceId, qaPairId) => void deleteKnowledgeAnswer(sourceId, qaPairId)}
            deletingSourceId={deletingKnowledgeSourceId}
            deletingAnswerId={deletingKnowledgeAnswerId}
          />
        ) : null}
      </div>
    </main>
  );
}
