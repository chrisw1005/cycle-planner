'use client'

import { useTenantContext } from '@/components/tenant-provider'
import type { TenantInfo } from '@/types'

/**
 * Returns the current tenant scope for client-side queries.
 *
 * The tenant comes from the active session — JWT users carry it in their
 * cookie payload, developers inherit it from the request host.
 *
 * Always check `tenantId` before issuing queries: when null, no rows should
 * be fetched. The data hooks gate their `enabled` flag on this value.
 */
export function useTenant(): {
  tenantId: string | null
  tenantSlug: string | null
  tenantName: string | null
  tenant: TenantInfo | null
  loading: boolean
} {
  const { tenant, loading } = useTenantContext()
  return {
    tenantId: tenant?.id ?? null,
    tenantSlug: tenant?.slug ?? null,
    tenantName: tenant?.name ?? null,
    tenant,
    loading,
  }
}
