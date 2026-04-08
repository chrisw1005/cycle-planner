'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import {
  LayoutDashboard,
  Users,
  Pill,
  Calendar,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { DrugGuideModal } from '@/components/guide/drug-guide-modal'

const navigation = [
  { name: '總覽', href: '/', icon: LayoutDashboard },
  { name: '人員管理', href: '/people', icon: Users },
  { name: '藥物庫存', href: '/drugs', icon: Pill },
  { name: '課表管理', href: '/cycles', icon: Calendar },
]

const adminNavigation = [
  { name: '帳號管理', href: '/admin/users', icon: Shield },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, isAdmin, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-border bg-card transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight">
            Cycle Planner
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-2">
        {navigation.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}

        {/* Admin Nav */}
        {isAdmin && (
          <>
            {!collapsed && (
              <div className="px-3 pt-4 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                管理
              </div>
            )}
            {adminNavigation.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Guide */}
      <div className="border-t border-border px-2 py-2">
        <button
          onClick={() => setGuideOpen(true)}
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors w-full',
            'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <BookOpen className="h-4 w-4 shrink-0" />
          {!collapsed && <span>藥物指南</span>}
        </button>
      </div>

      {/* User */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2">
          {!collapsed && (
            <div className="flex-1 min-w-0 flex items-center gap-1.5">
              <p className="truncate text-sm font-medium">
                {user?.display_name || user?.username}
              </p>
              <Badge variant={isAdmin ? 'default' : 'secondary'} className="text-xs shrink-0">
                {user?.role === 'developer' ? 'Dev' : isAdmin ? 'Admin' : 'Viewer'}
              </Badge>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <DrugGuideModal open={guideOpen} onOpenChange={setGuideOpen} />
    </aside>
  )
}
