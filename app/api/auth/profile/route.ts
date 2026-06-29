import { NextResponse } from 'next/server';
import { getUserPermissionProfile } from '@/lib/agent-permissions';
import { compactUserAuthMetadata } from '@/lib/auth-metadata';
import { getSuperAdminChannel, getUserChannel, triggerRealtimeNotification } from '@/lib/pusher';
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
    const metadata = compactUserAuthMetadata(user.user_metadata);
    const currentPermissions = getUserPermissionProfile(metadata);
    const currentRole = typeof metadata.role === 'string' ? metadata.role : 'Creator';
    const currentName = typeof metadata.name === 'string' ? metadata.name : '';
    const currentFullName = typeof metadata.full_name === 'string' ? metadata.full_name : '';
    const currentTimeZone = typeof metadata.time_zone === 'string' ? metadata.time_zone : '(GMT-5) Eastern Time';
    const currentLanguage = typeof metadata.language === 'string' ? metadata.language : 'English';
    const currentCurrency = typeof metadata.currency === 'string' ? metadata.currency : 'USD ($)';
    const nextRole = currentPermissions.isAgent ? 'Agent' : role || currentRole;

    const updatePayload: Parameters<typeof supabase.auth.updateUser>[0] = {
      data: {
        ...metadata,
        full_name: name || currentFullName || currentName || '',
        name: name || currentName || currentFullName || '',
        role: nextRole,
        avatar_url: avatarUrl || '',
        time_zone: timeZone || currentTimeZone,
        language: language || currentLanguage,
        currency: currency || currentCurrency,
        account_role: metadata.account_role,
        is_agent: metadata.is_agent,
        status: metadata.status,
        allowed_pages: metadata.allowed_pages,
        assigned_conversation_ids: metadata.assigned_conversation_ids,
        human_escalation: metadata.human_escalation,
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

    await triggerRealtimeNotification([getUserChannel(user.id), getSuperAdminChannel()], {
      type: 'profile',
      title: 'Profile updated',
      body: `${name || getProfileFromUser(updatedUser).name} profile settings were saved.`,
      url: '/settings',
      metadata: {
        emailChanged: Boolean(email && email !== user.email),
      },
    }).catch((notificationError) => {
      console.error('Realtime profile notification error:', notificationError);
    });

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
