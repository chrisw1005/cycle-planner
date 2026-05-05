import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth'
import { resolveTenantByHost } from '@/lib/tenant'

const BUCKET = 'drug-images'

async function resolveTenantSlugForRequest(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (token) {
    const session = await verifySessionToken(token)
    if (session) return session.tenant_slug
  }
  // Fallback: developer (Supabase Auth) — use host
  const tenant = await resolveTenantByHost(request.headers.get('host'))
  return tenant?.slug ?? null
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  const session = token ? await verifySessionToken(token) : null

  // Allow either JWT session or developer (host-based)
  const tenantSlug = await resolveTenantSlugForRequest(request)
  if (!session && !tenantSlug) {
    return NextResponse.json({ error: '未登入' }, { status: 401 })
  }
  if (!tenantSlug) {
    return NextResponse.json({ error: '無法解析 tenant' }, { status: 400 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: '未提供檔案' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()
  const path = `drugs/${tenantSlug}/${crypto.randomUUID()}.${ext}`

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.json({ error: '未登入' }, { status: 401 })
  }

  const session = await verifySessionToken(token)
  if (!session) {
    return NextResponse.json({ error: '登入已過期' }, { status: 401 })
  }

  const { url } = await request.json()
  const path = url?.split(`/${BUCKET}/`)[1]
  if (!path) {
    return NextResponse.json({ error: '無效的 URL' }, { status: 400 })
  }

  // Tenant safety check: only allow deletion of files under your own tenant prefix.
  // Legacy uploads (no tenant prefix, format `drugs/<uuid>.<ext>`) are allowed for
  // backwards compatibility with images uploaded before multi-tenant rollout.
  const isLegacyPath = path.startsWith('drugs/') && path.split('/').length === 2
  const expectedPrefix = `drugs/${session.tenant_slug}/`
  if (!isLegacyPath && !path.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: '無權刪除此檔案' }, { status: 403 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  await supabase.storage.from(BUCKET).remove([path])
  return NextResponse.json({ success: true })
}
