import { NextResponse } from "next/server";
import { canAccessPage, getUserPermissionProfile } from "@/lib/agent-permissions";
import {
  buildKnowledgeSourceIndex,
  knowledgeCategoryOptions,
  knowledgeBucketName,
  listKnowledgeSourceIndexes,
  saveKnowledgeSourceIndex,
  summarizeKnowledgeSource,
  type KnowledgeAssignment,
  type KnowledgeCategoryOption,
  type KnowledgeSourceIndex,
} from "@/lib/knowledge-base";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";
import { removeFileFromVectorStore, uploadFileToVectorStore } from "@/lib/openai-assistants";
import { resolvePlatformAiConfig } from "@/lib/platform-ai-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type KnowledgeSourcePatch = {
  assignment?: KnowledgeAssignment;
  active?: boolean;
  category?: string;
  content?: string;
  deleteQaPairId?: string;
  replaceCategory?: boolean;
  sections?: {
    category?: string;
    content?: string;
    title?: string;
  }[];
  title?: string;
};

type NormalizedManualSection = {
  category: KnowledgeCategoryOption;
  content: string;
  title: string;
};

function normalizeAssignment(value: unknown): KnowledgeAssignment | undefined {
  return value === "default" || value === "auto" || value === "cricket" || value === "padel" || value === "general"
    ? value
    : undefined;
}

function normalizeManualCategory(value: unknown): KnowledgeCategoryOption {
  return knowledgeCategoryOptions.includes(value as KnowledgeCategoryOption)
    ? (value as KnowledgeCategoryOption)
    : "Business Information";
}

function normalizeManualTitle(value: unknown, category: KnowledgeCategoryOption) {
  if (typeof value !== "string") {
    return category;
  }

  const title = value.trim().replace(/\s+/g, " ").slice(0, 120);
  return title || category;
}

function normalizeManualContent(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 80_000) : "";
}

function normalizeManualSections(value: unknown): NormalizedManualSection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((section) => {
      const item = section && typeof section === "object" ? section as { category?: unknown; content?: unknown; title?: unknown } : {};
      const category = normalizeManualCategory(item.category);
      const content = normalizeManualContent(item.content);

      return {
        category,
        content,
        title: normalizeManualTitle(item.title, category),
      };
    })
    .filter((section) => section.content.length > 0);
}

function normalizeIndexedKnowledgeText(value: string) {
  return value
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeKnowledgeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getManualCategoryMarkerMatches(text: string) {
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

function stripManualCategoryBlocksFromText(text: string, category: KnowledgeCategoryOption) {
  const matches = getManualCategoryMarkerMatches(text);

  if (matches.length === 0) {
    return text;
  }

  let nextText = "";
  let cursor = 0;

  matches.forEach((match, index) => {
    const blockEnd = matches[index + 1]?.start ?? text.length;

    if (match.category !== category) {
      return;
    }

    nextText += text.slice(cursor, match.start).trimEnd();
    cursor = blockEnd;
  });

  nextText += text.slice(cursor);

  return normalizeIndexedKnowledgeText(nextText);
}

function getAdjustedQaBlockStart(text: string, questionStart: number) {
  const prefix = text.slice(0, questionStart);
  const faqPrefix = prefix.match(/(?:^|\n)\s*FAQ\s*\d+[\s:.)-]*\s*$/i);

  if (!faqPrefix) {
    return questionStart;
  }

  return Math.max(0, questionStart - faqPrefix[0].length + (faqPrefix[0].startsWith("\n") ? 1 : 0));
}

function findQaBlockEnd(text: string, answerContentStart: number) {
  const rest = text.slice(answerContentStart);
  const boundaryIndex = rest.search(/\n\s*(?:FAQ\s*\d+[\s:.)-]*\s*)?(?:Question\s*:|Manual update:|Category\s*:)/i);

  return boundaryIndex >= 0 ? answerContentStart + boundaryIndex : text.length;
}

function stripQaBlocksFromText(text: string) {
  const markerPattern = /\b(Question|Answer)\s*:\s*/gi;
  const markers: { type: "question" | "answer"; start: number; contentStart: number }[] = [];
  const ranges: { start: number; end: number }[] = [];
  let markerMatch = markerPattern.exec(text);

  while (markerMatch) {
    markers.push({
      type: markerMatch[1].toLowerCase() === "question" ? "question" : "answer",
      start: markerMatch.index,
      contentStart: markerPattern.lastIndex,
    });
    markerMatch = markerPattern.exec(text);
  }

  for (let index = 0; index < markers.length; index += 1) {
    const questionMarker = markers[index];
    const answerMarker = markers[index + 1];

    if (questionMarker.type !== "question" || answerMarker?.type !== "answer") {
      continue;
    }

    ranges.push({
      start: getAdjustedQaBlockStart(text, questionMarker.start),
      end: findQaBlockEnd(text, answerMarker.contentStart),
    });
  }

  if (ranges.length === 0) {
    return text;
  }

  let nextText = "";
  let cursor = 0;

  ranges.forEach((range) => {
    if (range.start < cursor) {
      cursor = Math.max(cursor, range.end);
      return;
    }

    nextText += text.slice(cursor, range.start).trimEnd();
    cursor = range.end;
  });

  nextText += text.slice(cursor);

  return normalizeIndexedKnowledgeText(nextText.replace(/^\s*FAQ\s*\d+[\s:.)-]*\s*$/gim, ""));
}

function rebuildTextFromSource(source: KnowledgeSourceIndex) {
  const baseText = [...source.chunks]
    .sort((a, b) => a.order - b.order)
    .map((chunk) => chunk.text)
    .join("\n\n")
    .trim();
  const lowerBaseText = baseText.toLowerCase();
  const missingDirectAnswers = source.qaPairs
    .filter((pair) => !lowerBaseText.includes(pair.question.toLowerCase()))
    .map((pair) => `Question: ${pair.question}\nAnswer: ${pair.answer}`)
    .join("\n\n")
    .trim();

  return [baseText, missingDirectAnswers].filter(Boolean).join("\n\n").trim();
}

async function getAuthenticatedKnowledgeUser() {
  const authSupabase = await createClient();
  const {
    data: { user },
    error,
  } = await authSupabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    return { user: null, error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }

  const permissions = getUserPermissionProfile((user.user_metadata || {}) as Record<string, unknown>);

  if (!canAccessPage(permissions, "knowledge")) {
    return { user: null, error: NextResponse.json({ error: "Knowledge Base is not enabled for this account." }, { status: 403 }) };
  }

  return { user, error: null };
}

async function getSourceId(context: { params: { sourceId: string } | Promise<{ sourceId: string }> }) {
  const params = await context.params;
  return params.sourceId;
}

export async function GET(_request: Request, context: { params: { sourceId: string } | Promise<{ sourceId: string }> }) {
  try {
    const { user, error } = await getAuthenticatedKnowledgeUser();

    if (error || !user) {
      return error;
    }

    const sourceId = await getSourceId(context);
    const supabase = createSupabaseServiceClient();
    const sources = await listKnowledgeSourceIndexes(supabase, user.id);
    const source = sources.find((item) => item.id === sourceId);

    if (!source) {
      return NextResponse.json({ error: "Knowledge source not found." }, { status: 404 });
    }

    return NextResponse.json({
      source: summarizeKnowledgeSource(source),
      detail: {
        ...summarizeKnowledgeSource(source),
        chunks: source.chunks,
        qaPairs: source.qaPairs,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load knowledge source";
    console.error("Knowledge source detail error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: { sourceId: string } | Promise<{ sourceId: string }> }) {
  try {
    const { user, error } = await getAuthenticatedKnowledgeUser();

    if (error || !user) {
      return error;
    }

    const sourceId = await getSourceId(context);
    const payload = (await request.json()) as KnowledgeSourcePatch;
    const supabase = createSupabaseServiceClient();
    const sources = await listKnowledgeSourceIndexes(supabase, user.id);
    const source = sources.find((item) => item.id === sourceId);

    if (!source) {
      return NextResponse.json({ error: "Knowledge source not found." }, { status: 404 });
    }

    const nextAssignment = normalizeAssignment(payload.assignment);
    let nextSource = source;
    const deleteQaPairId = typeof payload.deleteQaPairId === "string" ? payload.deleteQaPairId.trim() : "";

    if (nextAssignment) {
      nextSource.assignment = nextAssignment;
    }

    if (typeof payload.active === "boolean") {
      nextSource.active = payload.active;
    }

    if (deleteQaPairId) {
      const existingQaPair = nextSource.qaPairs.find((pair) => pair.id === deleteQaPairId);

      if (!existingQaPair) {
        return NextResponse.json({ error: "Answer section not found." }, { status: 404 });
      }

      nextSource = {
        ...nextSource,
        qaPairs: nextSource.qaPairs.filter((pair) => pair.id !== deleteQaPairId),
      };
    }

    const manualContent = normalizeManualContent(payload.content);
    const manualSections = normalizeManualSections(payload.sections);
    const sectionsToSave = manualSections.length > 0
      ? manualSections
      : manualContent
        ? [
            {
              category: normalizeManualCategory(payload.category),
              content: manualContent,
              title: normalizeManualTitle(payload.title, normalizeManualCategory(payload.category)),
            },
          ]
        : [];

    if (sectionsToSave.length > 0) {
      if (sectionsToSave.some((section) => section.content.length < 10)) {
        return NextResponse.json({ error: "Each saved knowledge section needs at least 10 characters." }, { status: 400 });
      }

      const existingText = payload.replaceCategory === true
        ? sectionsToSave.reduce((text, section) => {
            if (section.category === "FAQs") {
              return stripQaBlocksFromText(text);
            }

            return stripManualCategoryBlocksFromText(text, section.category);
          }, rebuildTextFromSource(nextSource))
        : rebuildTextFromSource(nextSource);
      const manualBlocks = sectionsToSave.map((section) => `Manual update: ${section.title}\nCategory: ${section.category}\n\n${section.content}`);
      const indexedText = [existingText, ...manualBlocks].filter(Boolean).join("\n\n").trim();
      const categories = Array.from(new Set([...nextSource.categories, ...sectionsToSave.map((section) => section.category)]));

      nextSource = buildKnowledgeSourceIndex({
        userId: user.id,
        sourceId: nextSource.id,
        title: nextSource.title,
        fileName: nextSource.fileName,
        mimeType: nextSource.mimeType,
        fileSize: Math.max(nextSource.fileSize, Buffer.byteLength(indexedText, "utf8")),
        filePath: nextSource.filePath,
        indexPath: nextSource.indexPath,
        text: indexedText,
        assignment: nextAssignment || nextSource.assignment,
        categories,
        active: nextSource.active,
        status: nextSource.status,
        createdAt: nextSource.createdAt,
        updatedAt: new Date().toISOString(),
        openAiFileId: nextSource.openAiFileId,
      });

      if (nextSource.openAiFileId) {
        const metadata = (user.user_metadata || {}) as Record<string, unknown>;
        const { apiKey } = await resolvePlatformAiConfig(supabase);
        const vectorStoreId = metadata.openai_vector_store_id as string | undefined;
        if (apiKey && vectorStoreId) {
          try {
            await removeFileFromVectorStore({ apiKey, vectorStoreId, fileId: nextSource.openAiFileId });
            const newFile = await uploadFileToVectorStore({
              apiKey,
              vectorStoreId,
              fileBuffer: Buffer.from(indexedText, "utf8"),
              fileName: nextSource.fileName,
              mimeType: "text/plain",
            });
            nextSource.openAiFileId = newFile.id;
          } catch (e) {
            console.error("Failed to replace OpenAI file during PATCH", e);
          }
        }
      }
    }

    if (sectionsToSave.length === 0) {
      nextSource.updatedAt = new Date().toISOString();
    }

    await saveKnowledgeSourceIndex(supabase, nextSource);

    const nextSources = sources
      .map((item) => (item.id === nextSource.id ? nextSource : item))
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

    return NextResponse.json({
      source: summarizeKnowledgeSource(nextSource),
      detail: {
        ...summarizeKnowledgeSource(nextSource),
        chunks: nextSource.chunks,
        qaPairs: nextSource.qaPairs,
      },
      sources: nextSources.map(summarizeKnowledgeSource),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update knowledge source";
    console.error("Knowledge source update error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: { sourceId: string } | Promise<{ sourceId: string }> }) {
  try {
    const { user, error } = await getAuthenticatedKnowledgeUser();

    if (error || !user) {
      return error;
    }

    const sourceId = await getSourceId(context);
    const supabase = createSupabaseServiceClient();
    const sources = await listKnowledgeSourceIndexes(supabase, user.id);
    const source = sources.find((item) => item.id === sourceId);

    if (!source) {
      return NextResponse.json({ error: "Knowledge source not found." }, { status: 404 });
    }

    const paths = [source.indexPath, source.filePath].filter(Boolean);

    if (paths.length > 0) {
      await supabase.storage.from(knowledgeBucketName).remove(paths);
    }

    if (source.openAiFileId) {
      const metadata = (user.user_metadata || {}) as Record<string, unknown>;
      const { apiKey } = await resolvePlatformAiConfig(supabase);
      const vectorStoreId = metadata.openai_vector_store_id as string | undefined;
      if (apiKey && vectorStoreId) {
        await removeFileFromVectorStore({ apiKey, vectorStoreId, fileId: source.openAiFileId });
      }
    }

    return NextResponse.json({
      deleted: true,
      sources: sources.filter((item) => item.id !== sourceId).map(summarizeKnowledgeSource),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete knowledge source";
    console.error("Knowledge source delete error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
