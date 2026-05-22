'use client'
import { useMemo, useEffect, useState } from 'react'
import { getShiftForDate } from '@/lib/shifts'
import { useTheme } from '@/lib/ThemeContext'
import { fetchWorkPlans, fetchPeopleStats } from '@/lib/api-client'
import { SERVICE_META } from '@/types'

const DOW_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const SVC_ORDER = ['SRV-STR', 'SRV-ENG', 'SRV-VENT', 'SRV-FIRE', 'SRV-CCTV']

function shortDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

interface ShiftStats {
  totalPlans: number
  inProgress: number
  deployed: number
  byService: Record<string, number>
}

interface Props {
  referenceDate?: Date
  compact?: boolean
}

export default function ShiftRotationStrip({ referenceDate, compact = false }: Props) {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [stats, setStats] = useState<ShiftStats | null>(null)

  const today = useMemo(() => {
    const d = new Date(referenceDate ?? new Date())
    d.setHours(12, 0, 0, 0)
    return d
  }, [referenceDate])

  const yesterday = useMemo(() => {
    const d = new Date(today); d.setDate(d.getDate() - 1); return d
  }, [today])

  const tomorrow = useMemo(() => {
    const d = new Date(today); d.setDate(d.getDate() + 1); return d
  }, [today])

  const past = getShiftForDate(yesterday)
  const now  = getShiftForDate(today)
  const next = getShiftForDate(tomorrow)

  const dowToday = DOW_SHORT[today.getDay()].toLowerCase()
  const p = compact ? 'p-3' : 'p-4'

  useEffect(() => {
    let cancelled = false

    async function load() {
      const planDate = today.toISOString().split('T')[0]
      const [plans, people] = await Promise.all([
        fetchWorkPlans({ planDate }),
        fetchPeopleStats(),
      ])
      if (cancelled) return

      const byService: Record<string, number> = {}
      for (const plan of plans) {
        if (plan.service_id) byService[plan.service_id] = (byService[plan.service_id] || 0) + 1
      }

      setStats({
        totalPlans: plans.length,
        inProgress: plans.filter(p => ['IN_PROGRESS', 'ASSIGNED'].includes(p.status)).length,
        deployed: people.totalDeployed,
        byService,
      })
    }

    load()
    const t = setInterval(load, 30000)
    return () => { cancelled = true; clearInterval(t) }
  }, [today])

  return (
    <div className="grid grid-cols-[1fr_1.55fr_1fr] gap-2.5">
      {/* Yesterday — muted */}
      <div
        className={`relative rounded-2xl ${p} flex flex-col gap-1 border min-h-[90px]`}
        style={{
          background: isLight ? '#F8F9FB' : 'rgba(255,255,255,0.025)',
          borderColor: isLight ? '#E2E8F0' : 'rgba(255,255,255,0.06)',
          opacity: isLight ? 0.55 : 0.42,
        }}
      >
        <div className="flex items-baseline gap-2">
          <span
            className="font-mono font-bold uppercase tracking-wider"
            style={{ fontSize: 15, color: isLight ? '#4A5568' : 'rgba(255,255,255,0.7)' }}
          >
            {DOW_SHORT[yesterday.getDay()]}
          </span>
          <span
            className="font-mono"
            style={{ fontSize: 15, color: isLight ? '#8B95A1' : 'rgba(255,255,255,0.5)', opacity: 0.7 }}
          >
            {shortDate(yesterday)}
          </span>
        </div>
        <div
          className="font-mono leading-tight mt-0.5"
          style={{ fontSize: 22, fontWeight: 500, color: isLight ? '#4A5568' : 'rgba(255,255,255,0.8)' }}
        >
          {past.shiftName}
        </div>
        <div
          className="leading-tight mt-1"
          style={{ fontSize: 16, color: isLight ? '#4A5568' : 'rgba(255,255,255,0.7)' }}
        >
          {past.chiefName}
        </div>
        <div
          className="font-mono mt-1"
          style={{ fontSize: 13, color: isLight ? '#8B95A1' : 'rgba(255,255,255,0.5)' }}
        >
          07:30–07:30 · сдана
        </div>
      </div>

      {/* Today — amber glow, prominent */}
      <div
        className="relative rounded-2xl flex flex-col gap-1 border-2 min-h-[110px]"
        style={{
          padding: 20,
          background: isLight
            ? 'linear-gradient(180deg, rgba(240,165,0,0.08), rgba(240,165,0,0.03))'
            : 'radial-gradient(ellipse at top, rgba(240,165,0,.14), transparent 70%), linear-gradient(180deg, rgba(240,165,0,.10), rgba(240,165,0,.04))',
          borderColor: isLight ? 'rgba(240,165,0,0.55)' : 'rgba(240,165,0,0.55)',
          boxShadow: isLight
            ? '0 0 0 1px rgba(240,165,0,.40), 0 0 20px rgba(240,165,0,.15)'
            : '0 0 0 1px rgba(240,165,0,.20), 0 0 32px rgba(240,165,0,.18), 0 4px 24px rgba(240,165,0,.15)',
        }}
      >
        {/* СЕЙЧАС badge */}
        <span
          className="absolute -top-px right-4 text-[10px] font-black px-2.5 py-1 rounded-b-lg tracking-[.08em] leading-none"
          style={{
            background: '#F0A500',
            color: '#0D1117',
            boxShadow: '0 2px 10px rgba(240,165,0,.4)',
          }}
        >
          СЕЙЧАС
        </span>

        <div className="flex items-baseline gap-2">
          <span
            className="font-mono font-black uppercase tracking-wider"
            style={{ fontSize: 18, color: isLight ? '#8C5A00' : '#F0A500' }}
          >
            {DOW_SHORT[today.getDay()]}
          </span>
          <span
            className="font-mono font-bold"
            style={{ fontSize: 18, color: isLight ? '#8C5A00' : 'rgba(240,165,0,0.85)' }}
          >
            {shortDate(today)}
          </span>
        </div>

        <div
          className="font-mono leading-none mt-0.5"
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: isLight ? '#8C5A00' : '#F0A500',
            letterSpacing: '-0.01em',
          }}
        >
          {now.shiftName}
        </div>

        <div
          className="font-bold leading-snug mt-1"
          style={{ fontSize: 20, color: isLight ? '#0D1117' : '#fff' }}
        >
          {now.chiefName}
        </div>

        <div
          className="font-mono font-medium mt-1"
          style={{ fontSize: 15, color: isLight ? '#8C5A00' : 'rgba(255,255,255,0.85)' }}
        >
          {dowToday} · 07:30–07:30 · НДС
        </div>

        {/* Stats section */}
        {stats && (
          <>
            {/* Divider */}
            <div
              className="mt-3 mb-2"
              style={{
                height: 1,
                background: isLight
                  ? 'linear-gradient(90deg, transparent, rgba(240,165,0,0.35), transparent)'
                  : 'linear-gradient(90deg, transparent, rgba(240,165,0,0.25), transparent)',
              }}
            />

            {/* KPI row */}
            <div className="grid grid-cols-3 gap-1">
              <StatCell
                value={stats.totalPlans}
                label="планов"
                isLight={isLight}
                accent={false}
              />
              <StatCell
                value={stats.inProgress}
                label="в работе"
                isLight={isLight}
                accent={stats.inProgress > 0}
              />
              <StatCell
                value={stats.deployed}
                label="людей"
                isLight={isLight}
                accent={false}
              />
            </div>

            {/* Service dots */}
            {stats.totalPlans > 0 && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {SVC_ORDER.filter(svc => stats.byService[svc]).map(svc => {
                  const meta = SERVICE_META[svc]
                  const count = stats.byService[svc]
                  return (
                    <span
                      key={svc}
                      className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5"
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        background: isLight
                          ? `${meta.color}18`
                          : `${meta.color}20`,
                        color: isLight ? meta.color : meta.color,
                        border: `1px solid ${meta.color}35`,
                      }}
                    >
                      <span style={{ fontSize: 11 }}>{meta.emoji}</span>
                      <span className="font-mono">{count}</span>
                    </span>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Tomorrow — blue tint */}
      <div
        className={`relative rounded-2xl ${p} flex flex-col gap-1 border min-h-[90px]`}
        style={{
          background: isLight ? '#FFFFFF' : 'rgba(56,139,253,0.06)',
          borderColor: isLight ? 'rgba(56,139,253,0.40)' : 'rgba(56,139,253,0.40)',
        }}
      >
        <div className="flex items-baseline gap-2">
          <span
            className="font-mono font-bold uppercase tracking-wider"
            style={{ fontSize: 15, color: isLight ? '#1F6FEB' : '#6FB5FF' }}
          >
            {DOW_SHORT[tomorrow.getDay()]}
          </span>
          <span
            className="font-mono"
            style={{ fontSize: 15, color: isLight ? '#4A5568' : 'rgba(111,181,255,0.75)' }}
          >
            {shortDate(tomorrow)}
          </span>
        </div>
        <div
          className="font-mono leading-tight mt-0.5"
          style={{ fontSize: 22, fontWeight: 500, color: isLight ? '#0D1117' : '#fff' }}
        >
          {next.shiftName}
        </div>
        <div
          className="leading-tight mt-1"
          style={{ fontSize: 16, color: isLight ? '#4A5568' : 'rgba(255,255,255,0.9)' }}
        >
          {next.chiefName}
        </div>
        <div
          className="font-mono mt-1"
          style={{ fontSize: 13, color: isLight ? '#4A5568' : 'rgba(255,255,255,0.6)' }}
        >
          07:30–07:30 · приёмка
        </div>
      </div>
    </div>
  )
}

function StatCell({
  value,
  label,
  isLight,
  accent,
}: {
  value: number
  label: string
  isLight: boolean
  accent: boolean
}) {
  const numColor = accent
    ? '#F0A500'
    : isLight ? '#0D1117' : 'rgba(255,255,255,0.95)'
  const labelColor = isLight ? 'rgba(140,90,0,0.7)' : 'rgba(255,255,255,0.45)'

  return (
    <div className="flex flex-col items-center gap-0">
      <span
        className="font-mono font-black leading-none"
        style={{ fontSize: 22, color: numColor, letterSpacing: '-0.02em' }}
      >
        {value}
      </span>
      <span
        style={{ fontSize: 10, color: labelColor, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}
      >
        {label}
      </span>
    </div>
  )
}
