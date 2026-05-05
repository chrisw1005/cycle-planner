import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyPassword, createSessionToken, COOKIE_NAME } from '@/lib/auth'
import { resolveTenantByHost } from '@/lib/tenant'

export async function POST(request: NextRequest) {
  const { username, password } = await request.json()

  if (!username || !password) {
    return NextResponse.json({ error: '帳號和密碼為必填' }, { status: 400 })
  }

  // Resolve tenant from host. Tenant-scoped login: an account is only valid
  // on the domain that maps to its tenant.
  const tenant = await resolveTenantByHost(request.headers.get('host'))
  if (!tenant) {
    return NextResponse.json({ error: '此網域尚未啟用，請聯絡系統管理員' }, { status: 403 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: account, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('username', username.toLowerCase().trim())
    .maybeSingle()

  if (error || !account) {
    return NextResponse.json({ error: '帳號或密碼錯誤' }, { status: 401 })
  }

  const valid = await verifyPassword(password, account.password_hash)
  if (!valid) {
    return NextResponse.json({ error: '帳號或密碼錯誤' }, { status: 401 })
  }

  const token = await createSessionToken({
    sub: account.id,
    username: account.username,
    display_name: account.display_name,
    role: account.role,
    tenant_id: tenant.id,
    tenant_slug: tenant.slug,
  })

  const { count } = await supabase
    .from('webauthn_credentials')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', account.id)

  const response = NextResponse.json({
    id: account.id,
    username: account.username,
    display_name: account.display_name,
    role: account.role,
    has_passkeys: (count ?? 0) > 0,
    tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
  })

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })

  return response
}
