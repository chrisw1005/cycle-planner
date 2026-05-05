'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TenantInfo, UserRole } from '@/types'

interface AuthSession {
  id: string
  username?: string
  email?: string
  display_name: string
  role: UserRole
  tenant: TenantInfo | null
}

interface TenantContextValue {
  tenant: TenantInfo | null
  session: AuthSession | null
  loading: boolean
  refresh: () => Promise<void>
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  session: null,
  loading: true,
  refresh: async () => {},
})

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<TenantInfo | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' })
      if (res.ok) {
        const data: AuthSession | null = await res.json()
        if (data) {
          setSession(data)
          setTenant(data.tenant ?? null)
          return
        }
      }
      // Unauthenticated — try Supabase Auth fallback for cases where /api/auth/me
      // returned 401 (e.g. transient cookie state). Most paths are protected by
      // middleware so this is only relevant on /login.
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setSession(null)
        setTenant(null)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <TenantContext.Provider value={{ tenant, session, loading, refresh }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenantContext() {
  return useContext(TenantContext)
}
