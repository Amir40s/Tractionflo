import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  formatMissingSupabasePublicEnv,
  getMissingSupabasePublicEnv,
  getSupabasePublicEnv,
} from './env'

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/signup',
  '/privacy',
  '/terms',
  '/contact',
  '/auth',
  '/tractionflo-notifications-sw.js',
  '/api/messages',
  '/api/auth',
]

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    pathname.startsWith('/api/webhooks')
  )
}

function isApiPath(pathname: string) {
  return pathname.startsWith('/api/')
}

function createApiAuthError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const missingEnv = getMissingSupabasePublicEnv()

  if (missingEnv.length > 0) {
    if (isPublicPath(request.nextUrl.pathname)) {
      return supabaseResponse
    }

    if (isApiPath(request.nextUrl.pathname)) {
      return createApiAuthError(formatMissingSupabasePublicEnv(missingEnv), 500)
    }

    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', formatMissingSupabasePublicEnv(missingEnv))
    return NextResponse.redirect(url)
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicEnv()

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    if (isApiPath(request.nextUrl.pathname)) {
      return createApiAuthError('Not authenticated', 401)
    }

    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
