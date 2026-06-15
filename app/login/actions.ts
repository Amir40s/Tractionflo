'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

function redirectToAuthConfigError(pathname: '/login' | '/signup', error: unknown): never {
  const message = error instanceof Error ? error.message : 'Supabase is not configured'
  redirect(`${pathname}?error=${encodeURIComponent(message)}`)
}

function shouldShowOnboarding(metadata: Record<string, unknown> = {}) {
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

function normalizeOrigin(value?: string | null) {
  if (!value) {
    return null
  }

  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

async function getAppOrigin() {
  const requestHeaders = await headers()
  const requestOrigin = normalizeOrigin(requestHeaders.get('origin'))

  if (requestOrigin) {
    return requestOrigin
  }

  const forwardedHost = requestHeaders.get('x-forwarded-host')?.split(',')[0]?.trim()
  const host = forwardedHost || requestHeaders.get('host')
  const forwardedProto = requestHeaders.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const protocol = forwardedProto || (host?.startsWith('localhost') || host?.startsWith('127.0.0.1') ? 'http' : 'https')
  const requestHostOrigin = host ? normalizeOrigin(`${protocol}://${host}`) : null

  return (
    requestHostOrigin ||
    normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL) ||
    normalizeOrigin(process.env.ORIGIN)
  )
}

export async function login(formData: FormData) {
  const supabase = await createClient().catch((error) => redirectToAuthConfigError('/login', error))

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return redirect('/login?error=Email and password are required')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return redirect('/login?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/dashboard', 'layout')

  if (shouldShowOnboarding(data.user?.user_metadata)) {
    redirect('/onboarding')
  }

  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient().catch((error) => redirectToAuthConfigError('/signup', error))

  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password || !name) {
    return redirect('/signup?error=Name, Email, and Password are required')
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        phone: phone || '',
        onboarding_completed: false,
      }
    }
  })

  if (error) {
    return redirect('/signup?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/', 'layout')

  if (data.session) {
    redirect('/onboarding')
  }

  redirect('/login?message=Check your email to continue sign in process')
}

async function signInWithGoogle(errorPath: '/login' | '/signup') {
  const supabase = await createClient().catch((error) => redirectToAuthConfigError('/login', error))
  const origin = await getAppOrigin()

  if (!origin) {
    redirect(`${errorPath}?error=` + encodeURIComponent('Could not determine app URL for Google sign in'))
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=/dashboard`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) {
    redirect(`${errorPath}?error=` + encodeURIComponent(error.message))
  }

  if (!data.url) {
    redirect(`${errorPath}?error=` + encodeURIComponent('Could not start Google sign in'))
  }

  redirect(data.url)
}

export async function loginWithGoogle() {
  await signInWithGoogle('/login')
}

export async function signupWithGoogle() {
  await signInWithGoogle('/signup')
}

export async function signout() {
  const supabase = await createClient().catch((error) => redirectToAuthConfigError('/login', error))
  await supabase.auth.signOut()
  redirect('/login')
}
