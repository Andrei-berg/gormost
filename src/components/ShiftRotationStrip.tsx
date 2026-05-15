'use client'
import { useMemo } from 'react'
import { getShiftForDate } from '@/lib/shifts'
import { useTheme } from '@/lib/ThemeContext'

const DOW_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

function shortDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

interface Props {
  /** Reference date for the "today" slot. Defaults to current date. */
  referenceDate?: Date
  /** Compact mode for narrow contexts */
  compact?: boolean
}

export default function ShiftRotationStrip({ referenceDate, compact = false }: Props) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const today = useMemo(() => {
    const d = new Date(referenceDate ?? new Date())
    d.setHours(12, 0, 0, 0)
    return d
  }, [referenceDate])

  const yesterday = useMemo(() => {
    const d = new Date(today)
    d.setDate(d.getDate() - 1)
    return d
  }, [today])

  const tomorrow = useMemo(() => {
    const d = new Date(today)
    d.setDate(d.getDate() + 1)
    return d
  }, [today])

  const past = getShiftForDate(yesterday)
  const now  = getShiftForDate(today)
  const next = getShiftForDate(tomorrow)

  const dowToday = DOW_SHORT[today.getDay()].toLowerCase()
  const p = compact ? 'p-1.5' : 'p-2'

  return (
    <div className="grid grid-cols-[1fr_1.25fr_1fr] gap-1.5">
      {/* Yesterday — muted */}
      <div
        className={`relative rounded-xl ${p} flex flex-col gap-0.5 opacity-35 border`}
        style={{
          background: isLight ? '#F8F9FB' : 'rgba(255,255,255,0.02)',
          borderColor: isLight ? '#E2E8F0' : 'rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex items-baseline gap-1.5">
          <span
            className="font-mono text-[10px] font-bold uppercase tracking-wider"
            style={{ color: isLight ? '#4A5568' : 'rgba(255,255,255,0.65)' }}
          >
            {DOW_SHORT[yesterday.getDay()]}
          </span>
          <span
            className="font-mono text-[10px]"
            style={{ color: isLight ? '#8B95A1' : 'rgba(255,255,255,0.45)' }}
          >
            {shortDate(yesterday)}
          </span>
        </div>
        <div
          className="text-[11px] font-semibold leading-tight"
          style={{ color: isLight ? '#4A5568' : 'rgba(255,255,255,0.65)' }}
        >
          {past.shiftName}
        </div>
        <div
          className="text-[10px] leading-tight"
          style={{ color: isLight ? '#8B95A1' : 'rgba(255,255,255,0.45)' }}
        >
          {past.chiefName}
        </div>
      </div>

      {/* Today — amber glow */}
      <div
        className={`relative rounded-xl ${p} flex flex-col gap-0.5 border`}
        style={{
          background: 'rgba(240,165,0,0.10)',
          borderColor: isLight ? 'rgba(240,165,0,0.55)' : 'rgba(240,165,0,0.50)',
          boxShadow: isLight
            ? '0 0 0 1px rgba(240,165,0,.40), 0 0 20px rgba(240,165,0,.20)'
            : '0 0 0 1px rgba(240,165,0,.30), 0 0 24px rgba(240,165,0,.30), 0 4px 20px rgba(240,165,0,.22)',
        }}
      >
        <span
          className="absolute -top-2 right-2 text-[9px] font-bold px-1.5 py-px rounded-full tracking-wide leading-none"
          style={{
            background: '#F0A500',
            color: '#0D1117',
            boxShadow: '0 2px 8px rgba(240,165,0,.35)',
          }}
        >
          СЕЙЧАС
        </span>
        <div className="flex items-baseline gap-1.5">
          <span
            className="font-mono text-[10px] font-bold uppercase tracking-wider"
            style={{ color: isLight ? '#8C5A00' : '#F0A500' }}
          >
            {DOW_SHORT[today.getDay()]}
          </span>
          <span
            className="font-mono text-[10px]"
            style={{ color: isLight ? '#8C5A00' : 'rgba(255,255,255,0.60)' }}
          >
            {shortDate(today)}
          </span>
        </div>
        <div
          className="text-[11px] font-bold leading-tight"
          style={{ color: isLight ? '#0D1117' : '#fff' }}
        >
          {now.shiftName}
        </div>
        <div
          className="text-[11px] font-semibold leading-tight"
          style={{ color: isLight ? '#0D1117' : '#fff' }}
        >
          {now.chiefName}
        </div>
        <div
          className="font-mono text-[10px] font-medium mt-0.5"
          style={{ color: isLight ? '#8C5A00' : 'rgba(240,165,0,0.85)' }}
        >
          {dowToday} · 07:30–07:30
        </div>
      </div>

      {/* Tomorrow — blue tint */}
      <div
        className={`relative rounded-xl ${p} flex flex-col gap-0.5 border`}
        style={{
          background: isLight ? '#FFFFFF' : 'rgba(56,139,253,0.06)',
          borderColor: isLight ? 'rgba(56,139,253,0.40)' : 'rgba(56,139,253,0.45)',
        }}
      >
        <div className="flex items-baseline gap-1.5">
          <span
            className="font-mono text-[10px] font-bold uppercase tracking-wider"
            style={{ color: isLight ? '#1F6FEB' : '#388BFD' }}
          >
            {DOW_SHORT[tomorrow.getDay()]}
          </span>
          <span
            className="font-mono text-[10px]"
            style={{ color: isLight ? '#4A5568' : 'rgba(255,255,255,0.60)' }}
          >
            {shortDate(tomorrow)}
          </span>
        </div>
        <div
          className="text-[11px] font-semibold leading-tight"
          style={{ color: isLight ? '#0D1117' : '#fff' }}
        >
          {next.shiftName}
        </div>
        <div
          className="text-[10px] leading-tight"
          style={{ color: isLight ? '#4A5568' : 'rgba(255,255,255,0.80)' }}
        >
          {next.chiefName}
        </div>
      </div>
    </div>
  )
}
