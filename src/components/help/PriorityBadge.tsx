'use client'
import { WORK_PRIORITY_CONFIG } from '@/types'
import type { WorkPriority } from '@/types'
import WithTooltip from './WithTooltip'

const PRIORITY_TIPS: Record<WorkPriority, string> = {
  ROUTINE:   'Плановая работа — стандартное расписание, нет срочности.',
  URGENT:    'Срочная — нужно выполнить в течение текущей смены.',
  EMERGENCY: 'Аварийная — немедленное устранение неисправности, угроза работоспособности объекта.',
  CRITICAL:  'Критическая — угроза безопасности людей или целостности сооружения.',
  OVERRIDE:  'Поручение сверху — поступило от руководства вне плана, выполняется вне очереди.',
}

const PRIORITY_STYLE: Record<WorkPriority, string> = {
  ROUTINE:   'bg-slate-500/20 border-slate-500/30 text-slate-300',
  URGENT:    'bg-orange-500/20 border-orange-500/30 text-orange-300',
  EMERGENCY: 'bg-red-500/20 border-red-500/30 text-red-300',
  CRITICAL:  'bg-red-700/25 border-red-600/40 text-red-200',
  OVERRIDE:  'bg-rose-500/20 border-rose-500/30 text-rose-300',
}

interface Props {
  priority: WorkPriority
  size?: 'xs' | 'sm'
  showEmoji?: boolean
  className?: string
}

export default function PriorityBadge({ priority, size = 'sm', showEmoji = true, className = '' }: Props) {
  const cfg = WORK_PRIORITY_CONFIG[priority]
  const tip = PRIORITY_TIPS[priority]
  const style = PRIORITY_STYLE[priority]
  const textSize = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'

  return (
    <WithTooltip tip={tip} title={cfg.label}>
      <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${style} ${textSize} ${className}`}>
        {showEmoji && <span>{cfg.emoji}</span>}
        {cfg.label}
      </span>
    </WithTooltip>
  )
}
