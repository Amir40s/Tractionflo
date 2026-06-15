import { NextResponse } from "next/server";
import { canAccessPage, getUserPermissionProfile } from "@/lib/agent-permissions";
import {
  knowledgeBucketName,
  listKnowledgeSourceIndexes,
  saveKnowledgeSourceIndex,
  summarizeKnowledgeSource,
  type KnowledgeAssignment,
} from "@/lib/knowledge-base";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type KnowledgeSourcePatch = {
  assignment?: KnowledgeAssignment;
  active?: boolean;
};

function normalizeAssignment(value: unknown): KnowledgeAssignment | undefined {
  return value === "default" || value === "auto" || value === "cricket" || value === "padel" || value === "general"
    ? value
    : undefined;
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

    if (nextAssignment) {
      source.assignment = nextAssignment;
    }

    if (typeof payload.active === "boolean") {
      source.active = payload.active;
    }

    source.updatedAt = new Date().toISOString();
    await saveKnowledgeSourceIndex(supabase, source);

    const nextSources = sources
      .map((item) => (item.id === source.id ? source : item))
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

    return NextResponse.json({
      source: summarizeKnowledgeSource(source),
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
