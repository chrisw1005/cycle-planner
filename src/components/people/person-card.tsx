'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Trash2, CalendarPlus, Bell, CheckCircle2, XCircle } from 'lucide-react'
import type { Person, CycleStatus } from '@/types'
import Link from 'next/link'

type PersonStatus = '待排課表' | '排制中' | '已完成' | null

function getPersonStatus(person: Person): PersonStatus {
  const activeCycle = person.cycles?.find((c) =>
    c.status === 'Scheduled' || c.status === 'Planned'
  )
  if (activeCycle) return '排制中'
  if (person.needs_cycle) return '待排課表'
  const latestCompleted = person.cycles?.find((c) => c.status === 'Completed')
  if (latestCompleted) return '已完成'
  return null
}

const personStatusStyles: Record<string, string> = {
  '待排課表': 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  '排制中': 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  '已完成': 'bg-green-500/10 text-green-500 border-green-500/30',
}

interface PersonCardProps {
  person: Person
  isAdmin: boolean
  onDelete?: (id: string) => void
  onToggleNeedsCycle?: (id: string, needs: boolean) => void
}

export function PersonCard({ person, isAdmin, onDelete, onToggleNeedsCycle }: PersonCardProps) {
  const personStatus = getPersonStatus(person)

  return (
    <Link href={`/people/${person.id}`}>
      <Card className="relative group transition-colors hover:bg-accent/50 cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">{person.nickname}</CardTitle>
              {personStatus && (
                <Badge variant="outline" className={`${personStatusStyles[personStatus]} text-xs`}>
                  {personStatus}
                </Badge>
              )}
            </div>
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  onClick={(e) => e.preventDefault()}
                  render={<Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" />}
                >
                    <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => e.stopPropagation()}
                    render={<Link href={`/cycles/new?personId=${person.id}`} />}
                  >
                      <CalendarPlus className="mr-2 h-4 w-4" />
                      新建課表
                  </DropdownMenuItem>
                  {personStatus === '排制中' && (
                    <>
                      <DropdownMenuItem onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onToggleNeedsCycle?.(person.id, false)
                      }}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        排制完成
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onToggleNeedsCycle?.(person.id, false)
                      }}>
                        <XCircle className="mr-2 h-4 w-4" />
                        取消排制
                      </DropdownMenuItem>
                    </>
                  )}
                  {personStatus === '待排課表' && (
                    <DropdownMenuItem onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onToggleNeedsCycle?.(person.id, false)
                    }}>
                      <XCircle className="mr-2 h-4 w-4" />
                      取消待排
                    </DropdownMenuItem>
                  )}
                  {personStatus === '已完成' && (
                    <DropdownMenuItem onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onToggleNeedsCycle?.(person.id, true)
                    }}>
                      <Bell className="mr-2 h-4 w-4" />
                      標記待排
                    </DropdownMenuItem>
                  )}
                  {!personStatus && (
                    <DropdownMenuItem onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onToggleNeedsCycle?.(person.id, true)
                    }}>
                      <Bell className="mr-2 h-4 w-4" />
                      標記待排
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onDelete?.(person.id)
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    刪除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>年紀: {person.age ?? '—'}</span>
            <span>身高: {person.height ? `${person.height}cm` : '—'}</span>
            <span>體重: {person.weight ? `${person.weight}kg` : '—'}</span>
            <span>體脂: {person.body_fat ? `${person.body_fat}%` : '—'}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            最近課表: {person.last_cycle_date ? new Date(person.last_cycle_date).toLocaleDateString('zh-TW') : '—'}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            備注: {person.notes || '—'}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
