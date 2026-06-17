import { NextResponse } from "next/server";
import { canAccessPage, getUserPermissionProfile } from "@/lib/agent-permissions";
import {
  buildKnowledgeSourceIndex,
  createKnowledgeStoragePaths,
  ensureKnowledgeBucket,
  extractKnowledgeText,
  getKnowledgeSourceKind,
  knowledgeCategoryOptions,
  knowledgeAssignmentLabels,
  knowledgeBucketName,
  listKnowledgeSourceIndexes,
  maxKnowledgeFileBytes,
  saveKnowledgeSourceIndex,
  summarizeKnowledgeSource,
  type KnowledgeAssignment,
  type KnowledgeCategoryOption,
} from "@/lib/knowledge-base";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";
import { getStoredOpenAiKey } from "@/lib/ai-integration";
import { getOrCreateAssistant, getOrCreateVectorStore, attachVectorStoreToAssistant, uploadFileToVectorStore } from "@/lib/openai-assistants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

type ManualKnowledgePayload = {
  title?: string;
  category?: string;
  content?: string;
  assignment?: string;
};

function normalizeAssignment(value: FormDataEntryValue | string | null | undefined): KnowledgeAssignment {
  return value === "default" || value === "auto" || value === "cricket" || value === "padel" || value === "general"
    ? value
    : "auto";
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
        supportedTypes: ["PDF", "TXT", "Manual text"],
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

    const contentType = request.headers.get("content-type") || "";
    const supabase = createSupabaseServiceClient();
    await ensureKnowledgeBucket(supabase);
    const existingSources = await listKnowledgeSourceIndexes(supabase, user.id);

    const metadata = (user.user_metadata || {}) as Record<string, unknown>;
    const apiKey = getStoredOpenAiKey(metadata);

    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key is missing. Please save it in Settings first to use the Assistants API." }, { status: 400 });
    }

    let assistantId = metadata.openai_assistant_id as string | undefined;
    let vectorStoreId = metadata.openai_vector_store_id as string | undefined;

    const assistant = await getOrCreateAssistant({ apiKey, assistantId });
    const vectorStore = await getOrCreateVectorStore({ apiKey, vectorStoreId });
    
    if (assistant.id !== assistantId || vectorStore.id !== vectorStoreId) {
      assistantId = assistant.id;
      vectorStoreId = vectorStore.id;
      await attachVectorStoreToAssistant({ apiKey, assistantId, vectorStoreId: vectorStoreId as string });
      
      const authSupabase = await createClient();
      await authSupabase.auth.updateUser({ 
        data: { 
          openai_assistant_id: assistantId,
          openai_vector_store_id: vectorStoreId
        } 
      });
    }

    if (contentType.includes("application/json")) {
      const payload = (await request.json()) as ManualKnowledgePayload;
      const category = normalizeManualCategory(payload.category);
      const title = normalizeManualTitle(payload.title, category);
      const content = normalizeManualContent(payload.content);

      if (content.length < 10) {
        return NextResponse.json({ error: "Add at least 10 characters of manual knowledge." }, { status: 400 });
      }

      const sourceId = globalThis.crypto.randomUUID();
      const safeTitleForFile = title.replace(/[^a-zA-Z0-9._ -]/g, "-").replace(/\s+/g, " ").trim() || category;
      const fileName = `${safeTitleForFile}.manual.txt`;
      const { indexPath } = createKnowledgeStoragePaths(user.id, sourceId, fileName);
      const indexedText = `Category: ${category}\nTitle: ${title}\n\n${content}`;
      const bytes = Buffer.from(indexedText, "utf8");

      const uploadedOpenAiFile = await uploadFileToVectorStore({
        apiKey,
        vectorStoreId: vectorStoreId!,
        fileBuffer: bytes,
        fileName,
        mimeType: "text/plain", // OpenAI doesn't like custom mimetypes
      });

      const assignment = existingSources.length === 0 ? "default" : normalizeAssignment(payload.assignment);
      const sourceIndex = buildKnowledgeSourceIndex({
        userId: user.id,
        sourceId,
        fileName,
        mimeType: "text/x-tractionflo-manual",
        fileSize: bytes.byteLength,
        filePath: "",
        indexPath,
        text: indexedText,
        assignment,
        categories: [category],
        openAiFileId: uploadedOpenAiFile.id,
      });

      await saveKnowledgeSourceIndex(supabase, sourceIndex);

      const nextSources = [sourceIndex, ...existingSources].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

      console.info("Knowledge manual source saved with assistant id:", {
        assistantId: user.id,
        assistant_id: user.id,
        sourceId,
        title,
        category,
        assignment,
      });

      return NextResponse.json({
        assistantId: user.id,
        assistant_id: user.id,
        source: summarizeKnowledgeSource(sourceIndex),
        sources: nextSources.map(summarizeKnowledgeSource),
      });
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

    const sourceId = globalThis.crypto.randomUUID();
    const { filePath, indexPath } = createKnowledgeStoragePaths(user.id, sourceId, file.name);
    const bytes = Buffer.from(await file.arrayBuffer());
    
    const uploadedOpenAiFile = await uploadFileToVectorStore({
      apiKey,
      vectorStoreId: vectorStoreId!,
      fileBuffer: bytes,
      fileName: file.name,
      mimeType,
    });

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
      openAiFileId: uploadedOpenAiFile.id,
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

    console.info("Knowledge file uploaded with assistant id:", {
      assistantId: user.id,
      assistant_id: user.id,
      sourceId,
      fileName: file.name,
      mimeType,
      assignment,
      filePath,
      indexPath,
    });

    return NextResponse.json({
      assistantId: user.id,
      assistant_id: user.id,
      source: summarizeKnowledgeSource(sourceIndex),
      sources: nextSources.map(summarizeKnowledgeSource),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not upload knowledge source";
    console.error("Knowledge source upload error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
