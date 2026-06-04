'use client'

import { use, useState } from 'react'
import { usePerson, useUpdatePerson } from '@/hooks/use-people'
import { useDrugs } from '@/hooks/use-drugs'
import { useAuth } from '@/hooks/use-auth'
import { CycleStatusSelect } from '@/components/cycles/cycle-status-select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PersonForm } from '@/components/people/person-form'
import { CalendarPlus, Pencil, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { statusColors, statusLabels } from '@/lib/constants/cycle-status'
import type { CycleStatus } from '@/types'

export default function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: person, isLoading } = usePerson(id)
  const { data: allDrugs } = useDrugs()
  const updatePerson = useUpdatePerson()
  const { isAdmin } = useAuth()
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">載入中...</div>
  }

  if (!person) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">找不到人員</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" render={<Link href="/people" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{person.nickname}</h1>
            {person.needs_cycle && (
              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30">待排課表</Badge>
            )}
          </div>
          {person.cycle_goal_notes && (
            <p className="text-sm text-muted-foreground mt-1">目標: {person.cycle_goal_notes}</p>
          )}
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              編輯
            </Button>
            <Button size="sm" render={<Link href={`/cycles/new?personId=${id}`} />}>
                <CalendarPlus className="mr-2 h-4 w-4" />
                新建課表
            </Button>
          </div>
        )}
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">個人資料</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">身高</p>
              <p className="font-medium">{person.height ? `${person.height} cm` : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">體重</p>
              <p className="font-medium">{person.weight ? `${person.weight} kg` : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">體脂</p>
              <p className="font-medium">{person.body_fat ? `${person.body_fat}%` : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">年紀</p>
              <p className="font-medium">{person.age || '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cycle History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">課表歷史</CardTitle>
        </CardHeader>
        <CardContent>
          {!person.cycles?.length ? (
            <p className="text-muted-foreground text-center py-8">尚無課表紀錄</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名稱</TableHead>
                    <TableHead>週數</TableHead>
                    <TableHead>開始日期</TableHead>
                    <TableHead>藥物</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead className="w-20">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {person.cycles.map((cycle) => (
                    <TableRow key={cycle.id} className={cycle.status === 'Archived' ? 'opacity-60' : ''}>
                      <TableCell className="font-medium">
                        {cycle.name || `Cycle ${new Date(cycle.created_at).toLocaleDateString('zh-TW')}`}
                      </TableCell>
                      <TableCell>{cycle.total_weeks} 週</TableCell>
                      <TableCell>
                        {cycle.start_date
                          ? new Date(cycle.start_date).toLocaleDateString('zh-TW')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const seen = new Set<string>()
                            return cycle.cycle_drugs?.filter((cd: any) => {
                              if (seen.has(cd.drug_id)) return false
                              seen.add(cd.drug_id)
                              return true
                            }).map((cd: any) => (
                              <Badge key={cd.drug_id} variant="secondary" className="text-xs">
                                {cd.drug?.name}
                              </Badge>
                            ))
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <CycleStatusSelect cycle={cycle as { id: string; status: CycleStatus }} allDrugs={allDrugs ?? []} />
                        ) : (
                          <Badge variant="outline" className={statusColors[cycle.status as CycleStatus]}>
                            {statusLabels[cycle.status as CycleStatus]}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" render={<Link href={`/cycles/${cycle.id}`} />}>
                          查看
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯人員</DialogTitle>
          </DialogHeader>
          <PersonForm
            initialData={person}
            onSubmit={(data) => {
              updatePerson.mutate(
                { id, ...data },
                { onSuccess: () => setEditOpen(false) }
              )
            }}
            loading={updatePerson.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
