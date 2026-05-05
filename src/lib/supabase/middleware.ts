import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth'
import {
  resolveTenantByHost,
  TENANT_HEADER_ID,
  TENANT_HEADER_SLUG,
} from '@/lib/tenant'

export async function updateSession(request: NextRequest) {
  // Resolve tenant from host (single lookup per request)
  const host = request.headers.get('host')
  const tenant = await resolveTenantByHost(host)

  // Carry tenant info forward via request headers so downstream API routes
  // and Server Components can read it without re-querying.
  const forwardedHeaders = new Headers(request.headers)
  if (tenant) {
    forwardedHeaders.set(TENANT_HEADER_ID, tenant.id)
    forwardedHeaders.set(TENANT_HEADER_SLUG, tenant.slug)
  } else {
    forwardedHeaders.delete(TENANT_HEADER_ID)
    forwardedHeaders.delete(TENANT_HEADER_SLUG)
  }

  let supabaseResponse = NextResponse.next({ request: { headers: forwardedHeaders } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request: { headers: forwardedHeaders } })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname

  // Public paths — always accessible regardless of tenant resolution status.
  if (
    pathname.startsWith('/login') ||
    pathname === '/dev' ||
    pathname.startsWith('/api/auth')
  ) {
    return supabaseResponse
  }

  // Redirect /signup to /login
  if (pathname.startsWith('/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Developer dashboard — Supabase Auth (developer role) only, tenant-agnostic.
  if (pathname.startsWith('/dev/dashboard')) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/dev'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // API routes (non-auth) — let them handle their own auth.
  if (pathname.startsWith('/api')) {
    return supabaseResponse
  }

  // Below here we are protecting tenant-scoped pages. If the host is not
  // mapped to any tenant, bounce the user back to /login (the login page
  // itself doesn't strictly require a tenant — login route validates host).
  if (!tenant) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // JWT session (admin/viewer) — must match the host's tenant exactly.
  const jwtToken = request.cookies.get(COOKIE_NAME)?.value
  const jwtSession = jwtToken ? await verifySessionToken(jwtToken) : null

  if (jwtSession) {
    if (jwtSession.tenant_id === tenant.id) {
      return supabaseResponse
    }
    // Cross-tenant cookie attempt: scrub session and redirect to login.
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const res = NextResponse.redirect(url)
    res.cookies.delete(COOKIE_NAME)
    return res
  }

  // Supabase Auth session (developer) — tenant-agnostic, allowed everywhere.
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    return supabaseResponse
  }

  // Not authenticated — redirect to login.
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  return NextResponse.redirect(url)
}
