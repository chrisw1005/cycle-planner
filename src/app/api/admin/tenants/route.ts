import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Only Developer (Supabase Auth) can manage tenants.
async function verifyDeveloper(): Promise<boolean> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return profile?.role === 'developer'
}

function normalizeDomain(domain: string | null | undefined): string | null {
  if (!domain) return null
  // Canonicalize to bare apex: drop protocol, any path, port, and a leading
  // www. so host resolution (which also strips www) always matches.
  let d = domain.toLowerCase().trim()
  d = d.replace(/^https?:\/\//, '').replace(/\/.*$/, '').split(':')[0].trim()
  if (d.startsWith('www.')) d = d.slice(4)
  return d.length === 0 ? null : d
}

export async function GET() {
  if (!(await verifyDeveloper())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const db = getServiceClient()
  const { data, error } = await db
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  if (!(await verifyDeveloper())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { slug, name, primary_domain } = await request.json()
  if (!slug || !name) {
    return NextResponse.json({ error: 'slug 與 name 為必填' }, { status: 400 })
  }

  const db = getServiceClient()
  const { data, error } = await db
    .from('tenants')
    .insert({
      slug: slug.toLowerCase().trim(),
      name,
      primary_domain: normalizeDomain(primary_domain),
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'slug 或 domain 已存在' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  if (!(await verifyDeveloper())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id, name, primary_domain } = await request.json()
  if (!id) return NextResponse.json({ error: 'id 為必填' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (typeof name === 'string') updates.name = name
  if (primary_domain !== undefined) updates.primary_domain = normalizeDomain(primary_domain)

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: '無可更新欄位' }, { status: 400 })
  }

  const db = getServiceClient()
  const { data, error } = await db
    .from('tenants')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'domain 已被其他 tenant 使用' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
