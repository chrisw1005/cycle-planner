import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface InventoryBadgeProps {
  count: number
  unit?: string
  threshold?: number
  className?: string
}

export function InventoryBadge({ count, unit, threshold = 1, className }: InventoryBadgeProps) {
  const status = count === 0 ? 'empty' : count <= threshold ? 'low' : 'ok'
  const suffix = unit || ''

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs cursor-pointer',
        status === 'empty' && 'border-red-500 text-red-500 bg-red-500/10',
        status === 'low' && 'border-amber-500 text-amber-500 bg-amber-500/10',
        status === 'ok' && 'border-green-500 text-green-500 bg-green-500/10',
        className
      )}
    >
      {status === 'empty' ? '無庫存' : status === 'low' ? `庫存不足 (${count}${suffix})` : `庫存 ${count}${suffix}`}
    </Badge>
  )
}
