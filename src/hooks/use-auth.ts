'use client'

import { useTenantContext } from '@/components/tenant-provider'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types'

interface AuthUser {
  id: string
  username?: string
  email?: string
  display_name: string
  role: UserRole
}

export function useAuth() {
  const { session, loading } = useTenantContext()

  const user: AuthUser | null = session
    ? {
        id: session.id,
        username: session.username,
        email: session.email,
        display_name: session.display_name,
        role: session.role,
      }
    : null

  const isDeveloper = user?.role === 'developer'
  const isAdmin = user?.role === 'admin' || isDeveloper

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {
      // ignore
    }
    window.location.href = '/login'
  }

  return { user, loading, isAdmin, isDeveloper, logout }
}
