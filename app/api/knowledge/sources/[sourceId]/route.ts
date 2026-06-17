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

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type KnowledgeSourcePatch = {
  assignment?: KnowledgeAssignment;
  active?: boolean;
  category?: string;
  content?: string;
  deleteQaPairId?: string;
  title?: string;
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

    if (manualContent) {
      if (manualContent.length < 10) {
        return NextResponse.json({ error: "Add at least 10 characters of manual knowledge." }, { status: 400 });
      }

      const category = normalizeManualCategory(payload.category);
      const manualTitle = normalizeManualTitle(payload.title, category);
      const existingText = rebuildTextFromSource(nextSource);
      const manualBlock = `Manual update: ${manualTitle}\nCategory: ${category}\n\n${manualContent}`;
      const indexedText = [existingText, manualBlock].filter(Boolean).join("\n\n").trim();
      const categories = Array.from(new Set([...nextSource.categories, category]));

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
      });
    }

    if (!manualContent) {
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
