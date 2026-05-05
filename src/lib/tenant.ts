import { createClient } from '@supabase/supabase-js'
import type { TenantInfo } from '@/types'

export const TENANT_HEADER_ID = 'x-tenant-id'
export const TENANT_HEADER_SLUG = 'x-tenant-slug'
export const DEFAULT_TENANT_SLUG = 'default'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function normalizeHost(host: string | null | undefined): string {
  if (!host) return ''
  return host.toLowerCase().split(':')[0].trim()
}

function isLocalOrPreviewHost(host: string): boolean {
  if (!host) return true
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return true
  if (host.endsWith('.local')) return true
  if (host.endsWith('.vercel.app')) return true
  return false
}

export async function resolveTenantByHost(rawHost: string | null | undefined): Promise<TenantInfo | null> {
  const host = normalizeHost(rawHost)
  const db = getServiceClient()

  if (host) {
    const { data } = await db
      .from('tenants')
      .select('id, slug, name')
      .eq('primary_domain', host)
      .maybeSingle()
    if (data) return data as TenantInfo
  }

  if (isLocalOrPreviewHost(host)) {
    return getDefaultTenant()
  }

  return null
}

export async function getDefaultTenant(): Promise<TenantInfo | null> {
  const db = getServiceClient()
  const { data } = await db
    .from('tenants')
    .select('id, slug, name')
    .eq('slug', DEFAULT_TENANT_SLUG)
    .maybeSingle()
  return (data as TenantInfo | null) ?? null
}

export async function getTenantById(id: string): Promise<TenantInfo | null> {
  const db = getServiceClient()
  const { data } = await db
    .from('tenants')
    .select('id, slug, name')
    .eq('id', id)
    .maybeSingle()
  return (data as TenantInfo | null) ?? null
}
