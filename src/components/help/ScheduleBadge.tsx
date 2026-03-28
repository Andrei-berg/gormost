'use client'
import WithTooltip from './WithTooltip'

const SCHEDULE_TIPS: Record<string, { short: string; tip: string }> = {
  '1/3':   { short: 'Сутки/3', tip: 'Сутки через трое: 24ч на работе, 72ч отдых. 4 бригады по очереди.' },
  '5/2':   { short: '5/2',     tip: 'Пятидневка: работает по будням (пн–пт), вне зависимости от смены тоннеля.' },
  '2/2':   { short: '2/2',     tip: 'Два через два: 2 рабочих дня, 2 выходных — скользящий цикл.' },
  '3/3':   { short: '3/3',     tip: 'Три через три: 3 рабочих дня, 3 выходных — скользящий цикл.' },
  '6/6':   { short: '6/6',     tip: 'Шесть через шесть: 6 рабочих дней, 6 выходных — скользящий цикл.' },
  '15/15': { short: '15/15',   tip: 'Половинный месяц: работает либо 1–15 числа, либо 16–конец месяца, чередуется.' },
}

interface Props {
  scheduleCode: string
  size?: 'xs' | 'sm'
  className?: string
}

export default function ScheduleBadge({ scheduleCode, size = 'sm', className = '' }: Props) {
  const info = SCHEDULE_TIPS[scheduleCode]
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
