import { NextResponse } from "next/server";
import { canAccessPage, getUserPermissionProfile } from "@/lib/agent-permissions";
import {
  buildKnowledgeSourceIndex,
  createKnowledgeStoragePaths,
  ensureKnowledgeBucket,
  extractKnowledgeText,
  getKnowledgeSourceKind,
  knowledgeAssignmentLabels,
  knowledgeBucketName,
  listKnowledgeSourceIndexes,
  maxKnowledgeFileBytes,
  saveKnowledgeSourceIndex,
  summarizeKnowledgeSource,
  type KnowledgeAssignment,
} from "@/lib/knowledge-base";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function normalizeAssignment(value: FormDataEntryValue | null): KnowledgeAssignment {
  return value === "default" || value === "auto" || value === "cricket" || value === "padel" || value === "general"
    ? value
    : "auto";
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

export async function GET() {
  try {
    const { user, error } = await getAuthenticatedKnowledgeUser();

    if (error || !user) {
      return error;
    }

    const supabase = createSupabaseServiceClient();
    const sources = await listKnowledgeSourceIndexes(supabase, user.id);

    return NextResponse.json({
      sources: sources.map(summarizeKnowledgeSource),
      assignmentLabels: knowledgeAssignmentLabels,
      limits: {
        maxFileBytes: maxKnowledgeFileBytes,
        supportedTypes: ["PDF", "TXT"],
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load knowledge sources";
    console.error("Knowledge source list error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, error } = await getAuthenticatedKnowledgeUser();

    if (error || !user) {
      return error;
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!isUploadFile(file)) {
      return NextResponse.json({ error: "Choose a PDF or TXT file to upload." }, { status: 400 });
    }

    if (file.size > maxKnowledgeFileBytes) {
      return NextResponse.json({ error: "Keep knowledge files under 50MB." }, { status: 400 });
    }

    const mimeType = file.type || "application/octet-stream";

    try {
      getKnowledgeSourceKind(file.name, mimeType);
    } catch (validationError) {
      const message = validationError instanceof Error ? validationError.message : "Upload a PDF or TXT knowledge file.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    await ensureKnowledgeBucket(supabase);

    const existingSources = await listKnowledgeSourceIndexes(supabase, user.id);
    const sourceId = globalThis.crypto.randomUUID();
    const { filePath, indexPath } = createKnowledgeStoragePaths(user.id, sourceId, file.name);
    const bytes = Buffer.from(await file.arrayBuffer());
    const extractedText = await extractKnowledgeText({
      buffer: bytes,
      fileName: file.name,
      mimeType,
    });
    const assignment = existingSources.length === 0 ? "default" : normalizeAssignment(formData.get("assignment"));
    const sourceIndex = buildKnowledgeSourceIndex({
      userId: user.id,
      sourceId,
      fileName: file.name,
      mimeType,
      fileSize: file.size,
      filePath,
      indexPath,
      text: extractedText,
      assignment,
    });

    const upload = await supabase.storage.from(knowledgeBucketName).upload(filePath, bytes, {
      contentType: mimeType,
      upsert: false,
    });

    if (upload.error) {
      throw new Error(`Could not save knowledge file: ${upload.error.message}`);
    }

    try {
      await saveKnowledgeSourceIndex(supabase, sourceIndex);
    } catch (indexError) {
      await supabase.storage.from(knowledgeBucketName).remove([filePath]).catch((cleanupError) => {
        console.error("Knowledge file cleanup error:", cleanupError);
      });

      throw indexError;
    }

    const nextSources = [sourceIndex, ...existingSources].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

    return NextResponse.json({
      source: summarizeKnowledgeSource(sourceIndex),
      sources: nextSources.map(summarizeKnowledgeSource),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not upload knowledge source";
    console.error("Knowledge source upload error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
