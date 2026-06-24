import { NextResponse, type NextRequest } from 'next/server'
import { compactUserAuthMetadata } from '@/lib/auth-metadata'
import {
  normalizeRevenueOutcomeProviderSettings,
  revenueOutcomeProvidersMetadataKey,
} from '@/lib/revenue-outcome-providers'
import { saveRevenueProviderConnections } from '@/lib/revenue-provider-execution'
import { createSupabaseServiceClient } from '@/lib/supabase'
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

async function migrateRevenueOutcomeProvidersFromMetadata(userId: string, metadata: Record<string, unknown>) {
  const metadataValue = metadata[revenueOutcomeProvidersMetadataKey]

  if (!metadataValue) {
    return
  }

  try {
    const settings = normalizeRevenueOutcomeProviderSettings(metadataValue)
    await saveRevenueProviderConnections({
      supabase: createSupabaseServiceClient(),
      userId,
      providers: settings.providers,
    })
  } catch (error) {
    console.error('Could not migrate revenue provider settings out of auth metadata:', error)
  }
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

      if (user) {
        const metadata = (user.user_metadata || {}) as Record<string, unknown>
        await migrateRevenueOutcomeProvidersFromMetadata(user.id, metadata)
        const compactMetadata = compactUserAuthMetadata(metadata)
        const shouldPruneMetadata =
          JSON.stringify(compactMetadata) !== JSON.stringify(metadata)
        const needsOnboarding = shouldShowOnboarding(compactMetadata)

        if (shouldPruneMetadata || needsOnboarding) {
          const { error: updateError } = await supabase.auth.updateUser({
            data: {
              ...compactMetadata,
              ...(needsOnboarding ? { onboarding_completed: false } : {}),
            },
          })

          if (!updateError) {
            await supabase.auth.refreshSession()
          }
        }

        if (needsOnboarding) {
          return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
        }
      }

      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
  }

  return NextResponse.redirect(
    new URL('/login?error=' + encodeURIComponent('Could not authenticate with Google'), requestUrl.origin)
  )
}
