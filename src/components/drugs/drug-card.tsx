'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { InventoryBadge } from './inventory-badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Trash2, Pill } from 'lucide-react'
import type { Drug } from '@/types'
import Link from 'next/link'

interface DrugCardProps {
  drug: Drug
  isAdmin: boolean
  onDelete?: (id: string) => void
  onInventoryEdit?: (drug: Drug) => void
}

const categoryColors: Record<string, string> = {
  Injectable: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  Oral: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  PCT: 'bg-teal-500/10 text-teal-500 border-teal-500/30',
}

export function DrugCard({ drug, isAdmin, onDelete, onInventoryEdit }: DrugCardProps) {
  return (
    <Card className="relative group overflow-hidden rounded-xl">
      {/* Cover image — flush with top rounded corners */}
      {drug.image_url ? (
        <div className="h-40 w-full bg-white">
          <img
            src={drug.image_url}
            alt={drug.name}
            width={300}
            height={160}
            className="h-full w-full object-contain"
          />
        </div>
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-muted/50">
          <Pill className="h-10 w-10 text-muted-foreground/30" />
        </div>
      )}

      <CardHeader className="pb-1 pt-1">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-bold">{drug.name}</CardTitle>
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" />}
              >
                  <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem render={<Link href={`/drugs/${drug.id}/edit`} />}>
                    <Pencil className="mr-2 h-4 w-4" />
                    編輯
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete?.(drug.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  刪除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-0.5">
          <Badge variant="outline" className={categoryColors[drug.primary_category] || ''}>
            {drug.primary_category}
          </Badge>
          {drug.sub_category && (
            <Badge variant="secondary" className="text-xs">{drug.sub_category}</Badge>
          )}
          {drug.ester_type && (
            <Badge variant="secondary" className="text-xs">
              {drug.ester_type === 'Long' ? '長效' : '短效'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {drug.brand && (
          <p className="text-sm text-muted-foreground">
            廠牌: <span className="font-medium text-foreground">{drug.brand}</span>
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          濃度: <span className="font-medium text-foreground">{drug.concentration} {drug.unit || 'mg/ml'}</span>
        </p>
        <div className="pt-1.5">
          <button type="button" onClick={() => onInventoryEdit?.(drug)}>
            <InventoryBadge count={drug.inventory_count} unit={drug.primary_category !== 'Injectable' ? '顆' : ''} />
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
