import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifySessionToken, hashPassword, COOKIE_NAME } from '@/lib/auth'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { resolveTenantByHost } from '@/lib/tenant'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

interface Caller {
  role: 'developer' | 'admin'
  tenantId: string | null  // null for developer (super admin); always set for admin
}

async function verifyAdminOrDeveloper(request: NextRequest): Promise<Caller | null> {
  // Developer (Supabase Auth) takes priority and is tenant-agnostic.
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role === 'developer') return { role: 'developer', tenantId: null }
  }

  // Admin (custom JWT) — tenant-bound.
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (token) {
    const session = await verifySessionToken(token)
    if (session && session.role === 'admin') {
      return { role: 'admin', tenantId: session.tenant_id }
    }
  }

  return null
}

// GET — list accounts. Admin sees only viewers in their tenant.
// Developer sees all accounts; can filter via ?tenant_id=...
export async function GET(request: NextRequest) {
  const caller = await verifyAdminOrDeveloper(request)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const db = getServiceClient()
  let query = db.from('accounts').select('id, tenant_id, username, display_name, role, created_at, updated_at').order('created_at', { ascending: false })

  if (caller.role === 'admin') {
    query = query.eq('role', 'viewer').eq('tenant_id', caller.tenantId!)
  } else {
    // Developer: optional tenant filter
    const tenantFilter = request.nextUrl.searchParams.get('tenant_id')
    if (tenantFilter) query = query.eq('tenant_id', tenantFilter)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

// POST — create account.
// - Admin can only create viewers in their own tenant.
// - Developer can create any role in any tenant; defaults to current host's tenant.
export async function POST(request: NextRequest) {
  const caller = await verifyAdminOrDeveloper(request)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { username, password, display_name, role, tenant_id: bodyTenantId } = await request.json()

  if (!username || !password) {
    return NextResponse.json({ error: '帳號和密碼為必填' }, { status: 400 })
  }

  let targetTenantId: string | null
  let targetRole: 'admin' | 'viewer'

  if (caller.role === 'admin') {
    targetTenantId = caller.tenantId
    targetRole = 'viewer'
    if (role && role !== 'viewer') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }
  } else {
    // Developer: tenant_id from body, fallback to host
    targetRole = (role as 'admin' | 'viewer') || 'admin'
    if (bodyTenantId) {
      targetTenantId = bodyTenantId
    } else {
      const tenant = await resolveTenantByHost(request.headers.get('host'))
      targetTenantId = tenant?.id ?? null
    }
    if (!targetTenantId) {
      return NextResponse.json({ error: 'Developer 建立帳號時需指定 tenant_id' }, { status: 400 })
    }
  }

  const password_hash = await hashPassword(password)
  const db = getServiceClient()
  const { data, error } = await db
    .from('accounts')
    .insert({
      tenant_id: targetTenantId,
      username: username.toLowerCase().trim(),
      password_hash,
      display_name: display_name || username,
      role: targetRole,
    })
    .select('id, tenant_id, username, display_name, role, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '帳號已存在於此 tenant' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE — delete account. Admin can only delete viewers in their tenant.
export async function DELETE(request: NextRequest) {
  const caller = await verifyAdminOrDeveloper(request)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { accountId } = await request.json()
  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 })

  const db = getServiceClient()
  const { data: target } = await db.from('accounts').select('role, tenant_id').eq('id', accountId).single()
  if (!target) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  if (caller.role === 'admin') {
    if (target.role !== 'viewer' || target.tenant_id !== caller.tenantId) {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }
  }

  const { error } = await db.from('accounts').delete().eq('id', accountId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
