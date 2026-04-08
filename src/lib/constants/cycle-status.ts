import type { CycleStatus } from '@/types'

export const statusColors: Record<CycleStatus, string> = {
  Scheduled: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  Planned: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  Testing: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  Completed: 'bg-green-500/10 text-green-500 border-green-500/30',
  Archived: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/30',
}

export const statusLabels: Record<CycleStatus, string> = {
  Scheduled: '排制中',
  Planned: '排制中',
  Testing: '測試中',
  Completed: '已完成',
  Archived: '已封存',
}
