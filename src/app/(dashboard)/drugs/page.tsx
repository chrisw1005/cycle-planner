'use client'

import { useState } from 'react'
import { useDrugs, useDeleteDrug, useUpdateDrug } from '@/hooks/use-drugs'
import { useGlobalInventoryDeficits } from '@/hooks/use-inventory-deficits'
import { useAuth } from '@/hooks/use-auth'
import { DrugCard } from '@/components/drugs/drug-card'
import { InventoryBadge } from '@/components/drugs/inventory-badge'
import { DeficitActions } from '@/components/drugs/deficit-export-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, LayoutGrid, List, Search, Pencil, Trash2, Pill } from 'lucide-react'
import Link from 'next/link'
import { oralDeficitPackages } from '@/lib/utils'
import type { Drug } from '@/types'

export default function DrugsPage() {
  const { data: drugs, isLoading } = useDrugs()
  const { data: globalDeficits } = useGlobalInventoryDeficits()
  const deleteDrug = useDeleteDrug()
  const updateDrug = useUpdateDrug()
  const { isAdmin } = useAuth()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('drugs-view-mode') as 'grid' | 'list') || 'grid'
    }
    return 'grid'
  })
  const [search, setSearch] = useState('')
  const [lowStockThreshold, setLowStockThreshold] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = parseInt(localStorage.getItem('lowStockThreshold') ?? '')
      return isNaN(saved) ? 1 : saved
    }
    return 1
  })
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [inventoryTarget, setInventoryTarget] = useState<Drug | null>(null)
  const [editCount, setEditCount] = useState('')
  const [editBoxes, setEditBoxes] = useState('')
  const [editLoose, setEditLoose] = useState('')

  const handleThresholdChange = (value: number) => {
    const v = Math.max(0, value)
    setLowStockThreshold(v)
    localStorage.setItem('lowStockThreshold', v.toString())
  }

  // Build deficit map from global cycle demands
  const deficitMap = new Map<string, number>()
  globalDeficits?.forEach((d) => {
    if (d.deficit < 0) deficitMap.set(d.drug_id, d.deficit)
  })

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode)
    localStorage.setItem('drugs-view-mode', mode)
  }

  const isOralTarget = inventoryTarget?.primary_category === 'Oral' || inventoryTarget?.primary_category === 'PCT'

  const handleInventoryUpdate = () => {
    if (!inventoryTarget) return
    const count = isOralTarget
      ? (parseInt(editBoxes) || 0) * (inventoryTarget.tabs_per_box || 100) + (parseInt(editLoose) || 0)
      : parseInt(editCount) || 0
    updateDrug.mutate(
      { id: inventoryTarget.id, inventory_count: count },
      { onSuccess: () => setInventoryTarget(null) }
    )
  }

  const openInventoryEdit = (drug: Drug) => {
    setInventoryTarget(drug)
    const isOral = drug.primary_category === 'Oral' || drug.primary_category === 'PCT'
    if (isOral && drug.tabs_per_box) {
      setEditBoxes(Math.floor(drug.inventory_count / drug.tabs_per_box).toString())
      setEditLoose((drug.inventory_count % drug.tabs_per_box).toString())
    } else {
      setEditCount(drug.inventory_count.toString())
    }
  }

  const filtered = drugs?.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.primary_category.toLowerCase().includes(search.toLowerCase()) ||
    d.sub_category?.toLowerCase().includes(search.toLowerCase()) ||
    d.brand?.toLowerCase().includes(search.toLowerCase())
  )

  const lowStock = filtered?.filter((d) => d.inventory_count <= lowStockThreshold) || []
  const normalStock = filtered?.filter((d) => d.inventory_count > lowStockThreshold) || []

  const handleDelete = () => {
    if (deleteTarget) {
      deleteDrug.mutate(deleteTarget)
      setDeleteTarget(null)
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">載入中...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">藥物庫存</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9 rounded-r-none"
              onClick={() => handleViewModeChange('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9 rounded-l-none"
              onClick={() => handleViewModeChange('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          {isAdmin && (
            <Button render={<Link href="/drugs/new" />}>
                <Plus className="mr-2 h-4 w-4" />
                新增藥品
            </Button>
          )}
        </div>
      </div>

      {/* Search + Threshold */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋藥品名稱、分類..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="whitespace-nowrap">低庫存閾值 ≤</span>
          <Input
            type="number"
            min="0"
            value={lowStockThreshold}
            onChange={(e) => handleThresholdChange(parseInt(e.target.value) || 0)}
            className="w-16 h-9"
          />
        </div>
      </div>

      {/* Low Stock Section */}
      {lowStock.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-amber-500">
            庫存不足 ({lowStock.length})
          </h2>
          {viewMode === 'grid' ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {lowStock.map((drug) => (
                <DrugCard key={drug.id} drug={drug} isAdmin={isAdmin} onDelete={setDeleteTarget} onInventoryEdit={openInventoryEdit} threshold={lowStockThreshold} deficit={deficitMap.get(drug.id)} />
              ))}
            </div>
          ) : (
            <DrugTable drugs={lowStock} isAdmin={isAdmin} onDelete={setDeleteTarget} onInventoryEdit={openInventoryEdit} threshold={lowStockThreshold} deficitMap={deficitMap} />
          )}
        </section>
      )}

      {/* Cycle Demand Deficit Section */}
      {deficitMap.size > 0 && (
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-red-500">
              課表需求缺口 ({deficitMap.size})
            </h2>
            <DeficitActions deficits={globalDeficits ?? []} allDrugs={drugs ?? []} />
          </div>
          <div className="rounded-md border border-red-500/30 p-4">
            <div className="flex flex-wrap gap-2">
              {globalDeficits?.filter(d => d.deficit < 0).map((d) => {
                const isE3D = d.ester_type === 'E3D'
                const isOral = !isE3D && (d.category === 'Oral' || d.category === 'PCT')
                const shortage = isOral
                  ? `缺 ${oralDeficitPackages(d.deficit, d.tabs_per_box)} ${d.package_unit ?? '盒'}`
                  : isE3D ? `缺 ${Math.abs(d.deficit)} 瓶/劑` : `缺 ${Math.abs(d.deficit)} 瓶`
                return (
                  <Badge key={d.drug_id} variant="outline" className="border-red-500 text-red-500">
                    {d.drug_name}: {shortage}
                  </Badge>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Normal Stock Section */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-green-500">
          庫存正常 ({normalStock.length})
        </h2>
        {normalStock.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">
            {drugs?.length === 0 ? '尚未新增任何藥品' : '沒有符合搜尋的結果'}
          </p>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {normalStock.map((drug) => (
              <DrugCard key={drug.id} drug={drug} isAdmin={isAdmin} onDelete={setDeleteTarget} onInventoryEdit={openInventoryEdit} threshold={lowStockThreshold} deficit={deficitMap.get(drug.id)} />
            ))}
          </div>
        ) : (
          <DrugTable drugs={normalStock} isAdmin={isAdmin} onDelete={setDeleteTarget} onInventoryEdit={openInventoryEdit} threshold={lowStockThreshold} deficitMap={deficitMap} />
        )}
      </section>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認刪除</DialogTitle>
            <DialogDescription>此操作無法復原，確定要刪除此藥品嗎？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>刪除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inventory Quick Edit Dialog */}
      <Dialog open={!!inventoryTarget} onOpenChange={() => setInventoryTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>更新庫存 — {inventoryTarget?.name}</DialogTitle>
          </DialogHeader>
          {isOralTarget ? (
            <div className="space-y-2">
              <Label>庫存數量</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input type="number" min="0" value={editBoxes} onChange={(e) => setEditBoxes(e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-1">{inventoryTarget?.package_unit ?? '盒'}</p>
                </div>
                <div>
                  <Input type="number" min="0" value={editLoose} onChange={(e) => setEditLoose(e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-1">顆（散裝）</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-right">
                共 {(parseInt(editBoxes) || 0) * (inventoryTarget?.tabs_per_box || 100) + (parseInt(editLoose) || 0)} 顆
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="edit-inventory">庫存瓶數</Label>
              <Input
                id="edit-inventory"
                type="number"
                min="0"
                value={editCount}
                onChange={(e) => setEditCount(e.target.value)}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setInventoryTarget(null)}>取消</Button>
            <Button onClick={handleInventoryUpdate} disabled={updateDrug.isPending}>
              {updateDrug.isPending ? '更新中...' : '更新'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DrugTable({ drugs, isAdmin, onDelete, onInventoryEdit, threshold = 1, deficitMap }: { drugs: Drug[]; isAdmin: boolean; onDelete: (id: string) => void; onInventoryEdit: (drug: Drug) => void; threshold?: number; deficitMap?: Map<string, number> }) {
  const categoryColors: Record<string, string> = {
    Injectable: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    Oral: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
    PCT: 'bg-teal-500/10 text-teal-500 border-teal-500/30',
  }

  return (
    <div className="rounded-md border">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-14"></TableHead>
            <TableHead className="w-[15%]">名稱</TableHead>
            <TableHead className="w-[15%]">廠牌</TableHead>
            <TableHead className="w-[18%]">分類</TableHead>
            <TableHead className="w-[10%]">濃度</TableHead>
            <TableHead className="w-[8%]">酯類</TableHead>
            <TableHead className="w-[14%]">庫存</TableHead>
            {isAdmin && <TableHead className="w-20 text-center">操作</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {drugs.map((drug) => (
            <TableRow key={drug.id}>
              <TableCell>
                {drug.image_url ? (
                  <img src={drug.image_url} alt={drug.name} width={40} height={40} className="h-10 w-10 rounded object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                    <Pill className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </TableCell>
              <TableCell className="font-medium">{drug.name}</TableCell>
              <TableCell className="text-muted-foreground">{drug.brand || '—'}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Badge variant="outline" className={categoryColors[drug.primary_category] || ''}>
                    {drug.primary_category}
                  </Badge>
                  {drug.sub_category && (
                    <Badge variant="secondary" className="text-xs">{drug.sub_category}</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>{drug.concentration} {drug.unit || 'mg/ml'}</TableCell>
              <TableCell>{drug.ester_type === 'Long' ? '長效' : drug.ester_type === 'Short' ? '短效' : drug.ester_type === 'E3D' ? 'E3D' : '—'}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => onInventoryEdit(drug)}>
                    <InventoryBadge count={drug.inventory_count} unit={drug.primary_category !== 'Injectable' ? '顆' : ''} threshold={threshold} />
                  </button>
                  {deficitMap?.has(drug.id) && (
                    <Badge variant="outline" className="text-xs border-red-500 text-red-500">
                      缺{Math.abs(deficitMap.get(drug.id)!)}
                    </Badge>
                  )}
                </div>
              </TableCell>
              {isAdmin && (
                <TableCell>
                  <div className="flex justify-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="編輯" render={<Link href={`/drugs/${drug.id}/edit`} />}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="刪除" onClick={() => onDelete(drug.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
