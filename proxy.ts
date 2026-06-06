import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/proxy'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/messages (public API — no auth required)
     * - api/auth (Instagram OAuth — no auth required)
     * - api/webhooks (Meta webhook — no auth required)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/messages|api/auth|api/webhooks|api/instagram|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
