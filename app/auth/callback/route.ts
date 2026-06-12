import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'

function shouldShowOnboarding(metadata: Record<string, unknown>) {
  const role = typeof metadata.role === 'string' ? metadata.role.toLowerCase() : ''
  const accountRole = typeof metadata.account_role === 'string' ? metadata.account_role.toLowerCase() : ''
  const isSuperAdmin =
    metadata.is_superadmin === true ||
    role === 'super admin' ||
    role === 'superadmin' ||
    accountRole === 'superadmin'
  const isAgent = metadata.is_agent === true || role === 'agent' || accountRole === 'agent'

  return !isSuperAdmin && !isAgent && metadata.onboarding_completed !== true
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user && shouldShowOnboarding(user.user_metadata || {})) {
        await supabase.auth.updateUser({
          data: {
            ...user.user_metadata,
            onboarding_completed: false,
          },
        })

        return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
      }

      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
  }

  return NextResponse.redirect(
    new URL('/login?error=' + encodeURIComponent('Could not authenticate with Google'), requestUrl.origin)
  )
}
