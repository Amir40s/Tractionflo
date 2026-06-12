import { NextResponse } from 'next/server';
import { getUserPermissionProfile } from '@/lib/agent-permissions';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

type ProfilePayload = {
  name?: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  timeZone?: string;
  language?: string;
  currency?: string;
};

function getProfileFromUser(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}) {
  const metadata = user.user_metadata || {};
  const permissions = getUserPermissionProfile(metadata);
  const role = typeof metadata.role === 'string' ? metadata.role : 'Creator';
  const accountRole = typeof metadata.account_role === 'string' ? metadata.account_role : '';
  const isSuperAdmin =
    metadata.is_superadmin === true ||
    role.toLowerCase() === 'super admin' ||
    accountRole.toLowerCase() === 'superadmin';
  const name =
    typeof metadata.full_name === 'string'
      ? metadata.full_name
      : typeof metadata.name === 'string'
        ? metadata.name
        : user.email?.split('@')[0] || 'TractionFlo user';

  return {
    id: user.id,
    name,
    email: user.email || '',
    role,
    isSuperAdmin,
    avatarUrl:
      typeof metadata.avatar_url === 'string'
        ? metadata.avatar_url
        : typeof metadata.picture === 'string'
          ? metadata.picture
          : '',
    timeZone: typeof metadata.time_zone === 'string' ? metadata.time_zone : '(GMT-5) Eastern Time',
    language: typeof metadata.language === 'string' ? metadata.language : 'English',
    currency: typeof metadata.currency === 'string' ? metadata.currency : 'USD ($)',
    accountId: `acct_${user.id.replace(/-/g, '').slice(0, 10)}`,
    isAgent: permissions.isAgent,
    allowedPages: permissions.allowedPages,
    assignedConversationIds: permissions.assignedConversationIds,
    humanEscalation: permissions.humanEscalation,
  };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    return NextResponse.json({ profile: getProfileFromUser(user) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load account profile';
    console.error('Account profile load error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ProfilePayload;
    const supabase = await createClient();
    const {
      data: { user },
      error: currentUserError,
    } = await supabase.auth.getUser();

    if (currentUserError) {
      throw currentUserError;
    }

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const name = payload.name?.trim();
    const email = payload.email?.trim();
    const role = payload.role?.trim();
    const avatarUrl = payload.avatarUrl?.trim();
    const timeZone = payload.timeZone?.trim();
    const language = payload.language?.trim();
    const currency = payload.currency?.trim();
    const currentPermissions = getUserPermissionProfile((user.user_metadata || {}) as Record<string, unknown>);
    const nextRole = currentPermissions.isAgent ? 'Agent' : role || user.user_metadata?.role || 'Creator';

    const updatePayload: Parameters<typeof supabase.auth.updateUser>[0] = {
      data: {
        ...user.user_metadata,
        full_name: name || user.user_metadata?.full_name || user.user_metadata?.name || '',
        name: name || user.user_metadata?.name || user.user_metadata?.full_name || '',
        role: nextRole,
        avatar_url: avatarUrl || '',
        time_zone: timeZone || user.user_metadata?.time_zone || '(GMT-5) Eastern Time',
        language: language || user.user_metadata?.language || 'English',
        currency: currency || user.user_metadata?.currency || 'USD ($)',
        account_role: user.user_metadata?.account_role,
        is_agent: user.user_metadata?.is_agent,
        status: user.user_metadata?.status,
        allowed_pages: user.user_metadata?.allowed_pages,
        assigned_conversation_ids: user.user_metadata?.assigned_conversation_ids,
        human_escalation: user.user_metadata?.human_escalation,
      },
    };

    if (email && email !== user.email) {
      updatePayload.email = email;
    }

    const { data, error } = await supabase.auth.updateUser(updatePayload);

    if (error) {
      throw error;
    }

    const updatedUser = data.user || user;

    return NextResponse.json({
      profile: getProfileFromUser(updatedUser),
      pendingEmail: email && email !== updatedUser.email ? email : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update account profile';
    console.error('Account profile update error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
