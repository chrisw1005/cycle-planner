'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useDrugs } from '@/hooks/use-drugs'
import { useGlobalInventoryDeficits } from '@/hooks/use-inventory-deficits'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { statusLabels } from '@/lib/constants/cycle-status'
import { Users, Pill, Calendar, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import type { CycleStatus } from '@/types'

interface DashboardStats {
  totalPeople: number
  totalDrugs: number
  totalCycles: number
  needsCycle: number
  lowStockDrugs: number
  cyclesByStatus: Record<string, number>
}

export default function DashboardPage() {
  const { data: allDrugs } = useDrugs()
  const { data: globalDeficits } = useGlobalInventoryDeficits()
  const [lowStockThreshold] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = parseInt(localStorage.getItem('lowStockThreshold') ?? '')
      return isNaN(saved) ? 1 : saved
    }
    return 1
  })

  const [stats, setStats] = useState<DashboardStats>({
    totalPeople: 0,
    totalDrugs: 0,
    totalCycles: 0,
    needsCycle: 0,
    lowStockDrugs: 0,
    cyclesByStatus: {},
  })
  const supabase = createClient()

  useEffect(() => {
    const fetchStats = async () => {
      const [people, drugs, cycles, needsCycle, lowStock, cycleStatuses] = await Promise.all([
        supabase.from('people').select('id', { count: 'exact', head: true }),
        supabase.from('drugs').select('id', { count: 'exact', head: true }),
        supabase.from('cycles').select('id', { count: 'exact', head: true }),
        supabase.from('people').select('id', { count: 'exact', head: true }).eq('needs_cycle', true),
        supabase.from('drugs').select('id', { count: 'exact', head: true }).lte('inventory_count', 1),
        supabase.from('cycles').select('status'),
      ])

      const byStatus: Record<string, number> = {}
      if (cycleStatuses.data) {
        for (const row of cycleStatuses.data) {
          byStatus[row.status] = (byStatus[row.status] || 0) + 1
        }
      }

      setStats({
        totalPeople: people.count || 0,
        totalDrugs: drugs.count || 0,
        totalCycles: cycles.count || 0,
        needsCycle: needsCycle.count || 0,
        lowStockDrugs: lowStock.count || 0,
        cyclesByStatus: byStatus,
      })
    }

    fetchStats()
  }, [])

  const cards = [
    {
      title: '人員總數',
      value: stats.totalPeople,
      icon: Users,
      href: '/people',
      color: 'text-blue-500',
    },
    {
      title: '藥物品項',
      value: stats.totalDrugs,
      icon: Pill,
      href: '/drugs',
      color: 'text-green-500',
    },
    {
      title: '課表總數',
      value: stats.totalCycles,
      icon: Calendar,
      href: '/cycles',
      color: 'text-purple-500',
    },
    {
      title: '待安排課表',
      value: stats.needsCycle,
      icon: AlertTriangle,
      href: '/people?filter=needs_cycle',
      color: 'text-amber-500',
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">總覽</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
        {cards.map((card) => (
          <Link key={card.title} href={card.href} className="flex">
            <Card className="transition-colors hover:bg-accent/50 flex-1 flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <card.icon className={`h-5 w-5 ${card.color}`} aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums">{card.value}</p>
                {card.title === '課表總數' && stats.totalCycles > 0 && (() => {
                  const inProgress = (stats.cyclesByStatus['Scheduled'] || 0) + (stats.cyclesByStatus['Planned'] || 0)
                  const testing = stats.cyclesByStatus['Testing'] || 0
                  const completed = stats.cyclesByStatus['Completed'] || 0
                  const items = [
                    { label: '排制中', count: inProgress, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
                    { label: '測試中', count: testing, color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
                    { label: '已完成', count: completed, color: 'bg-green-500/10 text-green-500 border-green-500/20' },
                  ].filter(i => i.count > 0)
                  if (items.length === 0) return null
                  return (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {items.map((item) => (
                        <span key={item.label} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${item.color}`}>
                          {item.label}
                          <span className="font-semibold">{item.count}</span>
                        </span>
                      ))}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {(() => {
        const lowStockCount = allDrugs ? allDrugs.filter(d => d.inventory_count <= lowStockThreshold).length : 0
        const deficitDrugs = globalDeficits?.filter(d => d.deficit < 0) || []

        return (
          <>
            {lowStockCount > 0 && (
              <Card className="border-amber-500/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-500">
                    <AlertTriangle className="h-5 w-5" />
                    庫存不足提醒
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    有 {lowStockCount} 項藥品庫存不足，
                    <Link href="/drugs" className="text-primary underline">
                      前往查看
                    </Link>
                  </p>
                </CardContent>
              </Card>
            )}

            {deficitDrugs.length > 0 && (
              <Card className="border-red-500/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-500">
                    <AlertTriangle className="h-5 w-5" />
                    課表需求缺口
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    以下藥品在所有進行中課表（排除測試中）的總需求超過現有庫存：
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {deficitDrugs.map((d) => {
                      const isE3D = d.ester_type === 'E3D'
                      const isOral = !isE3D && (d.category === 'Oral' || d.category === 'PCT')
                      return (
                        <Badge key={d.drug_id} variant="outline" className="border-red-500 text-red-500">
                          {d.drug_name}: 缺 {Math.abs(d.deficit)} {isOral ? '顆' : isE3D ? '瓶/劑' : '瓶'}
                        </Badge>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )
      })()}
    </div>
  )
}
