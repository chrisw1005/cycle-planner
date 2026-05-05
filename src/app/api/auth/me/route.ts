import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { resolveTenantByHost, getTenantById } from '@/lib/tenant'

/**
 * Returns the current session enriched with tenant info.
 *
 * - JWT (admin/viewer): tenant comes from the JWT claims (already validated
 *   against the host by middleware before this route is hit).
 * - Supabase Auth (developer): tenant is resolved from the request host,
 *   because developers are global super-admins not bound to a tenant.
 */
export async function GET(request: NextRequest) {
  // 1) JWT session (admin/viewer)
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (token) {
    const session = await verifySessionToken(token)
    if (session) {
      const tenant = await getTenantById(session.tenant_id)
      return NextResponse.json({
        id: session.sub,
        username: session.username,
        display_name: session.display_name,
        role: session.role,
        tenant: tenant
          ? { id: tenant.id, slug: tenant.slug, name: tenant.name }
          : null,
      })
    }
  }

  // 2) Supabase Auth (developer)
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, display_name, role')
      .eq('id', user.id)
      .single()

    if (profile) {
      const tenant = await resolveTenantByHost(request.headers.get('host'))
      return NextResponse.json({
        id: profile.id,
        email: profile.email,
        display_name: profile.display_name,
        role: profile.role,
        tenant: tenant
          ? { id: tenant.id, slug: tenant.slug, name: tenant.name }
          : null,
      })
    }
  }

  return NextResponse.json(null, { status: 401 })
}
