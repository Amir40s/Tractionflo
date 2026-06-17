import type { SupabaseClient } from "@supabase/supabase-js";

export const knowledgeBucketName = "knowledge-sources";
export const maxKnowledgeFileBytes = 50 * 1024 * 1024;

export type KnowledgeAssignment = "default" | "auto" | "cricket" | "padel" | "general";

export type KnowledgeSourceKind = "pdf" | "txt" | "manual";

export type KnowledgeSourceChunk = {
  id: string;
  order: number;
  text: string;
  terms: string[];
};

export type KnowledgeQaPair = {
  id: string;
  question: string;
  answer: string;
  terms: string[];
};

export type KnowledgeSourceIndex = {
  version: 1;
  id: string;
  userId: string;
  title: string;
  fileName: string;
  mimeType: string;
  kind: KnowledgeSourceKind;
  filePath: string;
  indexPath: string;
  assignment: KnowledgeAssignment;
  active: boolean;
  status: "ready" | "needs_review";
  categories: string[];
  wordCount: number;
  characterCount: number;
  chunkCount: number;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
  chunks: KnowledgeSourceChunk[];
  qaPairs: KnowledgeQaPair[];
};

export type KnowledgeSourceSummary = Omit<KnowledgeSourceIndex, "chunks" | "qaPairs"> & {
  directAnswerCount: number;
};

export type KnowledgeSearchMatch = {
  sourceId: string;
  sourceTitle: string;
  assignment: KnowledgeAssignment;
  chunkId: string;
  text: string;
  score: number;
};

export type KnowledgeSearchResult = {
  mode: "none" | "direct" | "context";
  directAnswer?: string;
  context?: string;
  matches: KnowledgeSearchMatch[];
  sourceTitle?: string;
  totalSources: number;
};

const supportedTextMimeTypes = new Set(["text/plain", "text/markdown", "application/octet-stream"]);

const stopWords = new Set([
  "a",
  "about",
  "after",
  "all",
  "also",
  "am",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "before",
  "by",
  "can",
  "do",
  "does",
  "for",
  "from",
  "give",
  "have",
  "how",
  "i",
  "if",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "our",
  "please",
  "provide",
  "tell",
  "that",
  "the",
  "their",
  "there",
  "this",
  "to",
  "we",
  "what",
  "when",
  "where",
  "with",
  "you",
  "your",
]);

const categoryKeywordMap: Record<string, string[]> = {
  FAQs: ["question", "answer", "faq", "common customer", "asked"],
  Products: ["product", "kit", "equipment", "racket", "bat", "ball", "membership"],
  Services: ["service", "booking", "coaching", "practice", "corporate", "event"],
  Pricing: ["price", "pricing", "cost", "fee", "package", "pkr", "payment", "deposit"],
  Courses: ["course", "academy", "training", "lesson", "class"],
  "Business Information": ["business", "company", "brand", "about us", "location", "hours", "contact", "address", "mission"],
  "Lead Qualification": ["lead", "qualification", "qualify", "budget", "timeline", "decision", "intent", "requirement", "phone", "email"],
  Policies: ["policy", "cancel", "refund", "reschedule", "rain", "rules"],
  Website: ["website", "link", "online", "form"],
  PDFs: ["pdf"],
};

export const knowledgeCategoryOptions = [
  "FAQs",
  "Products",
  "Services",
  "Pricing",
  "Courses",
  "Business Information",
  "Lead Qualification",
] as const;

export type KnowledgeCategoryOption = (typeof knowledgeCategoryOptions)[number];

export const knowledgeAssignmentLabels: Record<KnowledgeAssignment, string> = {
  default: "Default chatbot",
  auto: "Auto detect",
  cricket: "Cricket booking",
  padel: "Padel booking",
  general: "General support",
};

export function sanitizeKnowledgeFileName(fileName: string) {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "knowledge-source";
}

export function getKnowledgeSourceKind(fileName: string, mimeType: string): KnowledgeSourceKind {
  const normalizedName = fileName.toLowerCase();
  const normalizedMime = mimeType.toLowerCase();

  if (normalizedMime === "application/pdf" || normalizedName.endsWith(".pdf")) {
    return "pdf";
  }

  if (normalizedMime === "text/x-tractionflo-manual" || normalizedName.endsWith(".manual.txt")) {
    return "manual";
  }

  if (supportedTextMimeTypes.has(normalizedMime) || normalizedName.endsWith(".txt") || normalizedName.endsWith(".md")) {
    return "txt";
  }

  throw new Error("Upload a PDF or TXT knowledge file.");
}

export async function ensureKnowledgeBucket(supabase: Pick<SupabaseClient, "storage">) {
  const { data: bucket } = await supabase.storage.getBucket(knowledgeBucketName);

  if (bucket) {
    return;
  }

  const { error } = await supabase.storage.createBucket(knowledgeBucketName, {
    public: false,
    fileSizeLimit: maxKnowledgeFileBytes,
    allowedMimeTypes: ["application/pdf", "text/plain", "text/markdown", "application/octet-stream"],
  });

  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw new Error(`Could not prepare knowledge storage: ${error.message}`);
  }
}

type PdfReaderTextItem = {
  page?: number;
  text?: string;
  x?: number;
  y?: number;
} | null;

async function extractPdfReaderText(buffer: Buffer) {
  const { PdfReader } = await import("pdfreader");

  return new Promise<string>((resolve, reject) => {
    const pages = new Map<number, Array<{ text: string; x: number; y: number }>>();
    let currentPage = 1;

    new PdfReader().parseBuffer(buffer, (error: string | null, item: PdfReaderTextItem) => {
      if (error) {
        reject(new Error(error));
        return;
      }

      if (!item) {
        const pageTexts = Array.from(pages.entries())
          .sort(([pageA], [pageB]) => pageA - pageB)
          .map(([, items]) => {
            const rows: Array<{ y: number; items: Array<{ text: string; x: number }> }> = [];

            for (const textItem of items.sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y))) {
              const row = rows.find((candidate) => Math.abs(candidate.y - textItem.y) <= 0.35);

              if (row) {
                row.items.push({ text: textItem.text, x: textItem.x });
              } else {
                rows.push({ y: textItem.y, items: [{ text: textItem.text, x: textItem.x }] });
              }
            }

            return rows
              .sort((a, b) => a.y - b.y)
              .map((row) =>
                row.items
                  .sort((a, b) => a.x - b.x)
                  .map((textItem) => textItem.text)
                  .join(" ")
              )
              .join("\n");
          })
          .filter(Boolean);

        resolve(pageTexts.join("\n\n"));
        return;
      }

      if (typeof item.page === "number") {
        currentPage = item.page;
      }

      if (typeof item.text === "string" && item.text.trim()) {
        const pageItems = pages.get(currentPage) || [];
        pageItems.push({
          text: item.text.trim(),
          x: typeof item.x === "number" ? item.x : 0,
          y: typeof item.y === "number" ? item.y : pageItems.length,
        });
        pages.set(currentPage, pageItems);
      }
    });
  });
}

export async function extractKnowledgeText({
  buffer,
  fileName,
  mimeType,
}: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}) {
  const kind = getKnowledgeSourceKind(fileName, mimeType);

  if (kind === "txt" || kind === "manual") {
    return buffer.toString("utf8");
  }

  return extractPdfReaderText(buffer);
}

export function normalizeKnowledgeText(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function tokenizeKnowledgeText(text: string) {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9$]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token.length > 1 || /\d/.test(token))
    .filter((token) => !stopWords.has(token));

  return Array.from(new Set(tokens));
}

function getWordCount(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

function getSourceTitle(fileName: string) {
  return fileName
    .replace(/\.manual\.txt$/i, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Knowledge Source";
}

function getCategories(text: string, fileName: string, kind: KnowledgeSourceKind) {
  const searchable = `${fileName}\n${text.slice(0, 80_000)}`.toLowerCase();
  const categories = Object.entries(categoryKeywordMap)
    .filter(([, keywords]) => keywords.some((keyword) => searchable.includes(keyword)))
    .map(([category]) => category);

  if (kind === "pdf" && !categories.includes("PDFs")) {
    categories.push("PDFs");
  }

  return categories.length > 0 ? categories : ["Services"];
}

function mergeKnowledgeCategories(detectedCategories: string[], selectedCategories?: string[]) {
  const validSelectedCategories = (selectedCategories || [])
    .map((category) => category.trim())
    .filter((category) => knowledgeCategoryOptions.includes(category as KnowledgeCategoryOption));

  return Array.from(new Set([...validSelectedCategories, ...detectedCategories]));
}

function chunkKnowledgeText(text: string) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;

    if (next.length <= 1200) {
      current = next;
      continue;
    }

    if (current) {
      chunks.push(current);
    }

    if (paragraph.length <= 1200) {
      current = paragraph;
      continue;
    }

    const sentences = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [paragraph];
    current = "";

    for (const sentence of sentences) {
      const sentenceText = sentence.trim();
      const sentenceNext = current ? `${current} ${sentenceText}` : sentenceText;

      if (sentenceNext.length <= 1200) {
        current = sentenceNext;
      } else {
        if (current) {
          chunks.push(current);
        }
        current = sentenceText.slice(0, 1200);
      }
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.slice(0, 600);
}

function extractQaPairs(text: string) {
  const pairs: { question: string; answer: string }[] = [];
  const pattern = /Question:\s*([\s\S]*?)\nAnswer:\s*([\s\S]*?)(?=\n\s*Question:|\n\s*[A-Z][A-Za-z ]+\n|$)/gi;
  let match = pattern.exec(text);

  while (match) {
    const question = match[1]?.trim().replace(/\s+/g, " ");
    const answer = match[2]?.trim().replace(/\s+/g, " ");

    if (question && answer) {
      pairs.push({ question, answer });
    }

    match = pattern.exec(text);
  }

  return pairs.slice(0, 200);
}

export function buildKnowledgeSourceIndex({
  userId,
  sourceId,
  title,
  fileName,
  mimeType,
  fileSize,
  filePath,
  indexPath,
  text,
  assignment,
  categories,
  active,
  status,
  createdAt,
  updatedAt,
}: {
  userId: string;
  sourceId: string;
  title?: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  indexPath: string;
  text: string;
  assignment: KnowledgeAssignment;
  categories?: string[];
  active?: boolean;
  status?: KnowledgeSourceIndex["status"];
  createdAt?: string;
  updatedAt?: string;
}): KnowledgeSourceIndex {
  const normalizedText = normalizeKnowledgeText(text);
  const kind = getKnowledgeSourceKind(fileName, mimeType);
  const now = new Date().toISOString();
  const chunks = chunkKnowledgeText(normalizedText).map((chunk, index) => ({
    id: `${sourceId}-chunk-${index + 1}`,
    order: index + 1,
    text: chunk,
    terms: tokenizeKnowledgeText(chunk).slice(0, 120),
  }));
  const qaPairs = extractQaPairs(normalizedText).map((pair, index) => ({
    id: `${sourceId}-qa-${index + 1}`,
    question: pair.question,
    answer: pair.answer,
    terms: tokenizeKnowledgeText(`${pair.question} ${pair.answer}`).slice(0, 120),
  }));

  if (chunks.length === 0) {
    throw new Error("No readable text was found in this knowledge file.");
  }

  return {
    version: 1,
    id: sourceId,
    userId,
    title: title?.trim() || getSourceTitle(fileName),
    fileName,
    mimeType,
    kind,
    filePath,
    indexPath,
    assignment,
    active: typeof active === "boolean" ? active : true,
    status: status || "ready",
    categories: mergeKnowledgeCategories(getCategories(normalizedText, fileName, kind), categories),
    wordCount: getWordCount(normalizedText),
    characterCount: normalizedText.length,
    chunkCount: chunks.length,
    fileSize,
    createdAt: createdAt || now,
    updatedAt: updatedAt || now,
    chunks,
    qaPairs,
  };
}

export function summarizeKnowledgeSource(index: KnowledgeSourceIndex): KnowledgeSourceSummary {
  return {
    version: index.version,
    id: index.id,
    userId: index.userId,
    title: index.title,
    fileName: index.fileName,
    mimeType: index.mimeType,
    kind: index.kind,
    filePath: index.filePath,
    indexPath: index.indexPath,
    assignment: index.assignment,
    active: index.active,
    status: index.status,
    categories: index.categories,
    wordCount: index.wordCount,
    characterCount: index.characterCount,
    chunkCount: index.chunkCount,
    fileSize: index.fileSize,
    createdAt: index.createdAt,
    updatedAt: index.updatedAt,
    directAnswerCount: index.qaPairs.length,
  };
}

function getIndexPath(userId: string, sourceId: string) {
  return `users/${userId}/sources/${sourceId}.json`;
}

export function createKnowledgeStoragePaths(userId: string, sourceId: string, fileName: string) {
  const safeFileName = sanitizeKnowledgeFileName(fileName);

  return {
    filePath: `users/${userId}/files/${sourceId}-${safeFileName}`,
    indexPath: getIndexPath(userId, sourceId),
  };
}

function normalizeAssignment(value: unknown): KnowledgeAssignment {
  if (value === "default" || value === "auto" || value === "cricket" || value === "padel" || value === "general") {
    return value;
  }

  return "auto";
}

export function normalizeKnowledgeSourceIndex(value: unknown): KnowledgeSourceIndex | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Partial<KnowledgeSourceIndex>;

  if (!source.id || !source.userId || !source.indexPath || !Array.isArray(source.chunks)) {
    return null;
  }

  return {
    version: 1,
    id: String(source.id),
    userId: String(source.userId),
    title: typeof source.title === "string" && source.title ? source.title : "Knowledge Source",
    fileName: typeof source.fileName === "string" && source.fileName ? source.fileName : "knowledge-source",
    mimeType: typeof source.mimeType === "string" ? source.mimeType : "application/octet-stream",
    kind: source.kind === "pdf" || source.kind === "manual" ? source.kind : "txt",
    filePath: typeof source.filePath === "string" ? source.filePath : "",
    indexPath: String(source.indexPath),
    assignment: normalizeAssignment(source.assignment),
    active: typeof source.active === "boolean" ? source.active : true,
    status: source.status === "needs_review" ? "needs_review" : "ready",
    categories: Array.isArray(source.categories) ? source.categories.filter((item): item is string => typeof item === "string") : [],
    wordCount: typeof source.wordCount === "number" ? source.wordCount : 0,
    characterCount: typeof source.characterCount === "number" ? source.characterCount : 0,
    chunkCount: typeof source.chunkCount === "number" ? source.chunkCount : source.chunks.length,
    fileSize: typeof source.fileSize === "number" ? source.fileSize : 0,
    createdAt: typeof source.createdAt === "string" ? source.createdAt : new Date().toISOString(),
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : new Date().toISOString(),
    chunks: source.chunks
      .filter((chunk): chunk is KnowledgeSourceChunk => Boolean(chunk && typeof chunk === "object" && typeof chunk.text === "string"))
      .map((chunk, index) => ({
        id: typeof chunk.id === "string" ? chunk.id : `${source.id}-chunk-${index + 1}`,
        order: typeof chunk.order === "number" ? chunk.order : index + 1,
        text: chunk.text,
        terms: Array.isArray(chunk.terms) ? chunk.terms.filter((item): item is string => typeof item === "string") : tokenizeKnowledgeText(chunk.text),
      })),
    qaPairs: Array.isArray(source.qaPairs)
      ? source.qaPairs
          .filter((pair): pair is KnowledgeQaPair => Boolean(pair && typeof pair === "object" && typeof pair.question === "string" && typeof pair.answer === "string"))
          .map((pair, index) => ({
            id: typeof pair.id === "string" ? pair.id : `${source.id}-qa-${index + 1}`,
            question: pair.question,
            answer: pair.answer,
            terms: Array.isArray(pair.terms) ? pair.terms.filter((item): item is string => typeof item === "string") : tokenizeKnowledgeText(`${pair.question} ${pair.answer}`),
          }))
      : [],
  };
}

export async function listKnowledgeSourceIndexes(supabase: Pick<SupabaseClient, "storage">, userId: string) {
  await ensureKnowledgeBucket(supabase);

  const prefix = `users/${userId}/sources`;
  const { data, error } = await supabase.storage.from(knowledgeBucketName).list(prefix, {
    limit: 100,
    sortBy: { column: "created_at", order: "desc" },
  });

  if (error) {
    throw new Error(`Could not load knowledge sources: ${error.message}`);
  }

  const sourceFiles = (data || []).filter((item) => item.name.endsWith(".json"));
  const sources = await Promise.all(
    sourceFiles.map(async (item) => {
      const path = `${prefix}/${item.name}`;
      const { data: file, error: downloadError } = await supabase.storage.from(knowledgeBucketName).download(path);

      if (downloadError || !file) {
        return null;
      }

      try {
        return normalizeKnowledgeSourceIndex(JSON.parse(await file.text()));
      } catch {
        return null;
      }
    })
  );

  return sources
    .filter((source): source is KnowledgeSourceIndex => Boolean(source))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export async function saveKnowledgeSourceIndex(supabase: Pick<SupabaseClient, "storage">, source: KnowledgeSourceIndex) {
  await ensureKnowledgeBucket(supabase);

  const { error } = await supabase.storage.from(knowledgeBucketName).upload(
    source.indexPath,
    Buffer.from(JSON.stringify(source, null, 2), "utf8"),
    {
      contentType: "text/plain",
      upsert: true,
    }
  );

  if (error) {
    throw new Error(`Could not save knowledge source index: ${error.message}`);
  }
}

function scoreTerms(queryTerms: string[], documentTerms: string[]) {
  if (queryTerms.length === 0 || documentTerms.length === 0) {
    return 0;
  }

  const documentTermSet = new Set(documentTerms);
  const matches = queryTerms.filter((term) => documentTermSet.has(term));
  const numberMatches = matches.filter((term) => /\d/.test(term)).length;
  const moneyMatches = matches.filter((term) => term.includes("$") || term === "pkr").length;

  return matches.length * 2 + numberMatches * 2 + moneyMatches * 3;
}

function getAssignmentScoreMultiplier(source: KnowledgeSourceIndex, queryTerms: string[], totalSources: number) {
  if (totalSources <= 1 || source.assignment === "default") {
    return 1.25;
  }

  if (source.assignment === "general" || source.assignment === "auto") {
    return 1;
  }

  const hasCricket = queryTerms.some((term) => ["cricket", "bat", "ball", "wicket", "ground", "umpire"].includes(term));
  const hasPadel = queryTerms.some((term) => ["padel", "racket", "court", "coach", "indoor", "outdoor"].includes(term));

  if (source.assignment === "cricket") {
    return hasCricket ? 1.35 : hasPadel ? 0.55 : 0.9;
  }

  if (source.assignment === "padel") {
    return hasPadel ? 1.35 : hasCricket ? 0.55 : 0.9;
  }

  return 1;
}

function scoreBody(query: string, queryTerms: string[], body: string, terms: string[]) {
  const normalizedBody = body.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  const exactPhraseBonus = normalizedQuery.length > 12 && normalizedBody.includes(normalizedQuery) ? 8 : 0;
  const priceIntentBonus =
    queryTerms.some((term) => ["price", "pricing", "cost", "fee", "much", "pkr"].includes(term)) &&
    (normalizedBody.includes("pkr") || normalizedBody.includes("price"))
      ? 4
      : 0;
  const policyIntentBonus =
    queryTerms.some((term) => ["rain", "cancel", "refund", "reschedule", "policy"].includes(term)) &&
    ["rain", "cancel", "refund", "reschedule", "policy"].some((term) => normalizedBody.includes(term))
      ? 4
      : 0;

  return scoreTerms(queryTerms, terms) + exactPhraseBonus + priceIntentBonus + policyIntentBonus;
}

export async function searchKnowledgeSources({
  supabase,
  userId,
  question,
  maxMatches = 4,
}: {
  supabase: Pick<SupabaseClient, "storage">;
  userId: string;
  question: string;
  maxMatches?: number;
}): Promise<KnowledgeSearchResult> {
  const query = question.trim();

  if (!query) {
    return { mode: "none", matches: [], totalSources: 0 };
  }

  const sources = (await listKnowledgeSourceIndexes(supabase, userId)).filter((source) => source.active);
  const queryTerms = tokenizeKnowledgeText(query);

  if (sources.length === 0 || queryTerms.length === 0) {
    return { mode: "none", matches: [], totalSources: sources.length };
  }

  const directMatches = sources
    .flatMap((source) =>
      source.qaPairs.map((pair) => {
        const baseScore = scoreBody(query, queryTerms, `${pair.question}\n${pair.answer}`, pair.terms);
        const score = baseScore * getAssignmentScoreMultiplier(source, queryTerms, sources.length);

        return { source, pair, score };
      })
    )
    .filter((match) => match.score >= 5)
    .sort((a, b) => b.score - a.score);

  if (directMatches[0]?.score >= 8) {
    const topDirect = directMatches[0];

    return {
      mode: "direct",
      directAnswer: topDirect.pair.answer,
      sourceTitle: topDirect.source.title,
      totalSources: sources.length,
      matches: [
        {
          sourceId: topDirect.source.id,
          sourceTitle: topDirect.source.title,
          assignment: topDirect.source.assignment,
          chunkId: topDirect.pair.id,
          text: `${topDirect.pair.question}\n${topDirect.pair.answer}`,
          score: topDirect.score,
        },
      ],
    };
  }

  const matches = sources
    .flatMap((source) =>
      source.chunks.map((chunk) => {
        const baseScore = scoreBody(query, queryTerms, chunk.text, chunk.terms);
        const score = baseScore * getAssignmentScoreMultiplier(source, queryTerms, sources.length);

        return {
          sourceId: source.id,
          sourceTitle: source.title,
          assignment: source.assignment,
          chunkId: chunk.id,
          text: chunk.text,
          score,
        } satisfies KnowledgeSearchMatch;
      })
    )
    .filter((match) => match.score >= 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxMatches);

  if (matches.length === 0) {
    return { mode: "none", matches: [], totalSources: sources.length };
  }

  return {
    mode: "context",
    context: matches
      .map((match, index) => `Source ${index + 1}: ${match.sourceTitle}\n${match.text}`)
      .join("\n\n---\n\n")
      .slice(0, 5000),
    sourceTitle: matches[0].sourceTitle,
    totalSources: sources.length,
    matches,
  };
}
