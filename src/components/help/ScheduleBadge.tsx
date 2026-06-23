'use client'
import WithTooltip from './WithTooltip'
import { scheduleMeta } from '@/lib/shifts'

interface Props {
  scheduleCode: string
  size?: 'xs' | 'sm'
  className?: string
}

export default function ScheduleBadge({ scheduleCode, size = 'sm', className = '' }: Props) {
  const info = scheduleMeta(scheduleCode) // эталон графиков сменности (shifts.ts)
  const textSize = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'

  const badge = (
    <span className={`inline-flex items-center rounded-full border bg-indigo-500/15 border-indigo-500/25 text-indigo-300 font-medium ${textSize} ${className}`}>
      {info?.short ?? scheduleCode}
    </span>
  )

  if (!info) return badge
  return (
    <WithTooltip tip={info.tip} title={`График ${info.short}`}>
      {badge}
    </WithTooltip>
  )
}
