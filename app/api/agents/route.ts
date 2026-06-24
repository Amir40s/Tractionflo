import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getUserPermissionProfile, normalizeAllowedPages, type PagePermissionId } from "@/lib/agent-permissions";
import { compactUserAuthMetadata } from "@/lib/auth-metadata";
import { getSuperAdminChannel, getUserChannel, triggerRealtimeNotification } from "@/lib/pusher";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type AgentPayload = {
  action?: "create" | "update" | "suspend";
  id?: string;
  name?: string;
  email?: string;
  password?: string;
  allowedPages?: PagePermissionId[];
  assignedConversationIds?: string[];
  humanEscalation?: boolean;
};

function getMetadata(user: User) {
  return compactUserAuthMetadata(user.user_metadata);
}

function getAgentName(user: User) {
  const metadata = getMetadata(user);

  return (
    (typeof metadata.full_name === "string" && metadata.full_name) ||
    (typeof metadata.name === "string" && metadata.name) ||
    user.email?.split("@")[0] ||
    "Agent"
  );
}

function toAgent(user: User) {
  const metadata = getMetadata(user);
  const permissions = getUserPermissionProfile(metadata);

  return {
    id: user.id,
    name: getAgentName(user),
    email: user.email || "",
    status: permissions.status,
    allowedPages: permissions.allowedPages,
    assignedConversationIds: permissions.assignedConversationIds,
    humanEscalation: permissions.humanEscalation,
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at,
  };
}

function isAgentUser(user: User) {
  return getUserPermissionProfile(getMetadata(user)).isAgent;
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    return { user: null, response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }

  const permissions = getUserPermissionProfile((user.user_metadata || {}) as Record<string, unknown>);

  if (permissions.isAgent) {
    return { user: null, response: NextResponse.json({ error: "Only admins can manage agents." }, { status: 403 }) };
  }

  return { user, response: null };
}

function cleanAssignedConversationIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function buildAgentMetadata(
  existing: Record<string, unknown>,
  payload: AgentPayload,
  fallbackName: string
) {
  const name = payload.name?.trim() || fallbackName || "Agent";

  return {
    ...existing,
    full_name: name,
    name,
    role: "Agent",
    account_role: "agent",
    is_agent: true,
    status: "Active",
    allowed_pages: normalizeAllowedPages(payload.allowedPages, ["inbox"]),
    assigned_conversation_ids: cleanAssignedConversationIds(payload.assignedConversationIds),
    human_escalation: payload.humanEscalation !== false,
  };
}

export async function GET() {
  try {
    const { response } = await requireAdmin();

    if (response) {
      return response;
    }

    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

    if (error) {
      throw error;
    }

    const agents = (data.users || []).filter(isAgentUser).map(toAgent);

    return NextResponse.json({ agents });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load agents";
    console.error("Agent list error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user: adminUser, response } = await requireAdmin();

    if (response) {
      return response;
    }

    const payload = (await request.json()) as AgentPayload;
    const action = payload.action || (payload.id ? "update" : "create");
    const supabase = createSupabaseServiceClient();

    if (action === "create") {
      const email = payload.email?.trim();
      const password = payload.password?.trim();
      const name = payload.name?.trim();

      if (!email || !password || !name) {
        return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
      }

      if (password.length < 8) {
        return NextResponse.json({ error: "Use at least 8 characters for the agent password." }, { status: 400 });
      }

      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: buildAgentMetadata({}, payload, name),
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        return NextResponse.json({ error: "Agent was not created." }, { status: 500 });
      }

      await triggerRealtimeNotification(
        [adminUser ? getUserChannel(adminUser.id) : "", getSuperAdminChannel(), getUserChannel(data.user.id)],
        {
          type: "agent",
          title: "Agent created",
          body: `${getAgentName(data.user)} can now log in and use assigned permissions.`,
          url: "/settings",
          metadata: {
            agentId: data.user.id,
            action: "create",
          },
        }
      ).catch((notificationError) => {
        console.error("Realtime agent create notification error:", notificationError);
      });

      return NextResponse.json({ agent: toAgent(data.user) });
    }

    if (!payload.id) {
      return NextResponse.json({ error: "Agent ID is required." }, { status: 400 });
    }

    const { data: currentAgent, error: currentAgentError } = await supabase.auth.admin.getUserById(payload.id);

    if (currentAgentError) {
      throw currentAgentError;
    }

    if (!currentAgent.user || !isAgentUser(currentAgent.user)) {
      return NextResponse.json({ error: "Agent not found." }, { status: 404 });
    }

    const existingMetadata = getMetadata(currentAgent.user);

    if (action === "suspend") {
      const { data, error } = await supabase.auth.admin.updateUserById(payload.id, {
        user_metadata: {
          ...existingMetadata,
          status: "Suspended",
          allowed_pages: [],
          assigned_conversation_ids: [],
          human_escalation: false,
        },
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        return NextResponse.json({ error: "Agent was not suspended." }, { status: 500 });
      }

      await triggerRealtimeNotification(
        [adminUser ? getUserChannel(adminUser.id) : "", getSuperAdminChannel(), getUserChannel(data.user.id)],
        {
          type: "agent",
          title: "Agent suspended",
          body: `${getAgentName(data.user)} no longer has dashboard access.`,
          url: "/settings",
          metadata: {
            agentId: data.user.id,
            action: "suspend",
          },
        }
      ).catch((notificationError) => {
        console.error("Realtime agent suspend notification error:", notificationError);
      });

      return NextResponse.json({ agent: toAgent(data.user) });
    }

    const updatePayload: Parameters<typeof supabase.auth.admin.updateUserById>[1] = {
      user_metadata: buildAgentMetadata(existingMetadata, payload, getAgentName(currentAgent.user)),
    };

    const nextEmail = payload.email?.trim();
    const nextPassword = payload.password?.trim();

    if (nextEmail && nextEmail !== currentAgent.user.email) {
      updatePayload.email = nextEmail;
    }

    if (nextPassword) {
      if (nextPassword.length < 8) {
        return NextResponse.json({ error: "Use at least 8 characters for the agent password." }, { status: 400 });
      }

      updatePayload.password = nextPassword;
    }

    const { data, error } = await supabase.auth.admin.updateUserById(payload.id, updatePayload);

    if (error) {
      throw error;
    }

    if (!data.user) {
      return NextResponse.json({ error: "Agent was not updated." }, { status: 500 });
    }

    await triggerRealtimeNotification(
      [adminUser ? getUserChannel(adminUser.id) : "", getSuperAdminChannel(), getUserChannel(data.user.id)],
      {
        type: "agent",
        title: "Agent updated",
        body: `${getAgentName(data.user)} permissions were updated.`,
        url: "/settings",
        metadata: {
          agentId: data.user.id,
          action: "update",
        },
      }
    ).catch((notificationError) => {
      console.error("Realtime agent update notification error:", notificationError);
    });

    return NextResponse.json({ agent: toAgent(data.user) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save agent";
    console.error("Agent save error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
