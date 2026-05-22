'use client'
import { useMemo, useEffect, useState } from 'react'
import { getShiftForDate, isWorkerOnDuty } from '@/lib/shifts'
import { useTheme } from '@/lib/ThemeContext'
import {
  fetchWorkPlans,
  fetchAllCurrentStatuses,
  fetchUsersWithAssignments,
  fetchPeopleStats,
} from '@/lib/api-client'
import { SERVICE_META, EMPLOYEE_STATUS_CONFIG, type EmployeeStatusType } from '@/types'

const DOW_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const SVC_ORDER = ['SRV-STR', 'SRV-ENG', 'SRV-VENT', 'SRV-FIRE', 'SRV-CCTV']
const SVC_SHORT: Record<string, string> = {
  'SRV-ENG': 'Инж.',
  'SRV-STR': 'Стр.',
  'SRV-FIRE': 'Пожар',
  'SRV-VENT': 'Вент.',
  'SRV-CCTV': 'КТВО',
}
const ABSENCE_ORDER: EmployeeStatusType[] = [
  'Bolnichniy', 'Otpusk', 'Otgul', 'Komandirovka',
  'Uchebniy_otpusk', 'Dekret', 'SVO', 'Mobilizovan', 'Voennie_sbory',
]

function shortDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

interface ServicePlanStats { total: number; active: number; done: number }
interface ShiftStats {
  plans: { total: number; byService: Record<string, ServicePlanStats> }
  staff: {
    total: number
    scheduledToday: number
    onDuty: number
    absent: Partial<Record<EmployeeStatusType, number>>
  }
  deployed: number
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
      const [plans, allStatuses, usersWithAsgn, people] = await Promise.all([
        fetchWorkPlans({ planDate }),
        fetchAllCurrentStatuses(),
        fetchUsersWithAssignments(),
        fetchPeopleStats(),
      ])
      if (cancelled) return

      // Plans breakdown by service
      const byService: Record<string, ServicePlanStats> = {}
      for (const plan of plans) {
        if (!plan.service_id) continue
        const s = byService[plan.service_id] ?? { total: 0, active: 0, done: 0 }
        s.total++
        if (['IN_PROGRESS', 'ASSIGNED', 'FAST_TRACK'].includes(plan.status)) s.active++
        if (plan.status === 'DONE') s.done++
        byService[plan.service_id] = s
      }

      // Staff HR statuses
      const onDuty = allStatuses.filter(e => e.currentStatus === 'Na_rabote').length
      const absent: Partial<Record<EmployeeStatusType, number>> = {}
      for (const e of allStatuses) {
        if (e.currentStatus !== 'Na_rabote' && e.currentStatus !== 'Uvolen') {
          absent[e.currentStatus] = (absent[e.currentStatus] || 0) + 1
        }
      }

      // Scheduled today by shift rotation
      const scheduledToday = usersWithAsgn.filter(u => {
        const a = u.assignment
        if (!a?.schedule_code) return false
        return isWorkerOnDuty({
          shift_num: a.shift_num,
          schedule_code: a.schedule_code,
          shift_reference_date: a.shift_reference_date,
          rotation_group: a.rotation_group,
          active_phase: a.active_phase ?? null,
          custom_work_days: a.custom_work_days,
          custom_rest_days: a.custom_rest_days,
        }, today)
      }).length

      if (!cancelled) setStats({
        plans: { total: plans.length, byService },
        staff: { total: allStatuses.length, scheduledToday, onDuty, absent },
        deployed: people.totalDeployed,
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
          <span className="font-mono font-bold uppercase tracking-wider"
            style={{ fontSize: 15, color: isLight ? '#4A5568' : 'rgba(255,255,255,0.7)' }}>
            {DOW_SHORT[yesterday.getDay()]}
          </span>
          <span className="font-mono"
            style={{ fontSize: 15, color: isLight ? '#8B95A1' : 'rgba(255,255,255,0.5)', opacity: 0.7 }}>
            {shortDate(yesterday)}
          </span>
        </div>
        <div className="font-mono leading-tight mt-0.5"
          style={{ fontSize: 22, fontWeight: 500, color: isLight ? '#4A5568' : 'rgba(255,255,255,0.8)' }}>
          {past.shiftName}
        </div>
        <div className="leading-tight mt-1"
          style={{ fontSize: 16, color: isLight ? '#4A5568' : 'rgba(255,255,255,0.7)' }}>
          {past.chiefName}
        </div>
        <div className="font-mono mt-1"
          style={{ fontSize: 13, color: isLight ? '#8B95A1' : 'rgba(255,255,255,0.5)' }}>
          07:30–07:30 · сдана
        </div>
      </div>

      {/* Today — amber glow, prominent */}
      <div
        className="relative rounded-2xl flex flex-col border-2"
        style={{
          padding: 20,
          background: isLight
            ? 'linear-gradient(180deg, rgba(240,165,0,0.08), rgba(240,165,0,0.03))'
            : 'radial-gradient(ellipse at top, rgba(240,165,0,.14), transparent 70%), linear-gradient(180deg, rgba(240,165,0,.10), rgba(240,165,0,.04))',
          borderColor: 'rgba(240,165,0,0.55)',
          boxShadow: isLight
            ? '0 0 0 1px rgba(240,165,0,.40), 0 0 20px rgba(240,165,0,.15)'
            : '0 0 0 1px rgba(240,165,0,.20), 0 0 32px rgba(240,165,0,.18), 0 4px 24px rgba(240,165,0,.15)',
        }}
      >
        {/* СЕЙЧАС badge */}
        <span className="absolute -top-px right-4 text-[10px] font-black px-2.5 py-1 rounded-b-lg tracking-[.08em] leading-none"
          style={{ background: '#F0A500', color: '#0D1117', boxShadow: '0 2px 10px rgba(240,165,0,.4)' }}>
          СЕЙЧАС
        </span>

        {/* Shift header */}
        <div className="flex items-baseline gap-2">
          <span className="font-mono font-black uppercase tracking-wider"
            style={{ fontSize: 18, color: isLight ? '#8C5A00' : '#F0A500' }}>
            {DOW_SHORT[today.getDay()]}
          </span>
          <span className="font-mono font-bold"
            style={{ fontSize: 18, color: isLight ? '#8C5A00' : 'rgba(240,165,0,0.85)' }}>
            {shortDate(today)}
          </span>
        </div>
        <div className="font-mono leading-none mt-0.5"
          style={{ fontSize: 32, fontWeight: 800, color: isLight ? '#8C5A00' : '#F0A500', letterSpacing: '-0.01em' }}>
          {now.shiftName}
        </div>
        <div className="font-bold leading-snug mt-1"
          style={{ fontSize: 20, color: isLight ? '#0D1117' : '#fff' }}>
          {now.chiefName}
        </div>
        <div className="font-mono font-medium mt-1"
          style={{ fontSize: 15, color: isLight ? '#8C5A00' : 'rgba(255,255,255,0.85)' }}>
          {dowToday} · 07:30–07:30 · НДС
        </div>

        {/* Stats panel */}
        {stats ? (
          <>
            <div className="mt-3 mb-3"
              style={{
                height: 1,
                background: isLight
                  ? 'linear-gradient(90deg, transparent, rgba(240,165,0,0.4), transparent)'
                  : 'linear-gradient(90deg, transparent, rgba(240,165,0,0.28), transparent)',
              }}
            />
            <StatsPanel stats={stats} isLight={isLight} />
          </>
        ) : (
          <div className="mt-3 flex gap-2">
            {[80, 60, 70].map((w, i) => (
              <div key={i} className="rounded animate-pulse"
                style={{ height: 8, width: w, background: isLight ? 'rgba(140,90,0,0.1)' : 'rgba(240,165,0,0.1)' }} />
            ))}
          </div>
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
          <span className="font-mono font-bold uppercase tracking-wider"
            style={{ fontSize: 15, color: isLight ? '#1F6FEB' : '#6FB5FF' }}>
            {DOW_SHORT[tomorrow.getDay()]}
          </span>
          <span className="font-mono"
            style={{ fontSize: 15, color: isLight ? '#4A5568' : 'rgba(111,181,255,0.75)' }}>
            {shortDate(tomorrow)}
          </span>
        </div>
        <div className="font-mono leading-tight mt-0.5"
          style={{ fontSize: 22, fontWeight: 500, color: isLight ? '#0D1117' : '#fff' }}>
          {next.shiftName}
        </div>
        <div className="leading-tight mt-1"
          style={{ fontSize: 16, color: isLight ? '#4A5568' : 'rgba(255,255,255,0.9)' }}>
          {next.chiefName}
        </div>
        <div className="font-mono mt-1"
          style={{ fontSize: 13, color: isLight ? '#4A5568' : 'rgba(255,255,255,0.6)' }}>
          07:30–07:30 · приёмка
        </div>
      </div>

    </div>
  )
}

// ─── Stats panel (plans + staff) ─────────────────────────────────────────────

function StatsPanel({ stats, isLight }: { stats: ShiftStats; isLight: boolean }) {
  const labelColor = isLight ? 'rgba(140,90,0,0.55)' : 'rgba(255,255,255,0.32)'
  const divColor   = isLight ? 'rgba(240,165,0,0.18)' : 'rgba(255,255,255,0.07)'

  const absences = ABSENCE_ORDER.filter(st => (stats.staff.absent[st] ?? 0) > 0)

  return (
    <div className="grid grid-cols-2 gap-0">

      {/* LEFT — Plans */}
      <div className="flex flex-col gap-0" style={{ paddingRight: 14 }}>

        {/* Section header */}
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: labelColor, textTransform: 'uppercase' }}>
            Планы
          </span>
          <span className="font-mono font-bold" style={{ fontSize: 11, color: isLight ? '#8C5A00' : '#F0A500' }}>
            {stats.plans.total} план{pluralPlan(stats.plans.total)}
          </span>
        </div>

        {/* Service rows */}
        <div className="flex flex-col gap-1.5">
          {SVC_ORDER.map(svcId => {
            const svc = stats.plans.byService[svcId] ?? { total: 0, active: 0, done: 0 }
            const meta = SERVICE_META[svcId]
            const isEmpty = svc.total === 0
            return (
              <div key={svcId} className="flex items-center gap-1.5" style={{ opacity: isEmpty ? 0.28 : 1 }}>
                <span style={{ fontSize: 13, width: 18, lineHeight: 1, flexShrink: 0 }}>{meta?.emoji}</span>
                <span style={{
                  fontSize: 11, color: isLight ? 'rgba(140,90,0,0.7)' : 'rgba(255,255,255,0.45)',
                  width: 34, flexShrink: 0, whiteSpace: 'nowrap',
                }}>
                  {SVC_SHORT[svcId]}
                </span>
                <span className="font-mono font-bold" style={{
                  fontSize: 13, color: isLight ? '#0D1117' : '#fff',
                  width: 14, flexShrink: 0, textAlign: 'right',
                }}>
                  {isEmpty ? '—' : svc.total}
                </span>
                <div className="flex items-center gap-1 ml-0.5">
                  {!isEmpty && svc.active > 0 && (
                    <span className="font-mono font-black rounded"
                      style={{
                        fontSize: 9, padding: '1px 4px',
                        background: 'rgba(240,165,0,0.18)',
                        color: '#F0A500',
                        border: '1px solid rgba(240,165,0,0.3)',
                      }}>
                      ▶{svc.active}
                    </span>
                  )}
                  {!isEmpty && svc.done > 0 && (
                    <span className="font-mono font-black rounded"
                      style={{
                        fontSize: 9, padding: '1px 4px',
                        background: 'rgba(34,197,94,0.15)',
                        color: '#22c55e',
                        border: '1px solid rgba(34,197,94,0.25)',
                      }}>
                      ✓{svc.done}
                    </span>
                  )}
                  {!isEmpty && svc.active === 0 && svc.done === 0 && (
                    <span style={{ fontSize: 9, color: isLight ? 'rgba(140,90,0,0.35)' : 'rgba(255,255,255,0.2)' }}>
                      ожид.
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Deployed people */}
        {stats.deployed > 0 && (
          <div className="mt-2 pt-2 flex items-center gap-1.5"
            style={{ borderTop: `1px solid ${divColor}` }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#22c55e', boxShadow: '0 0 5px rgba(34,197,94,0.6)', flexShrink: 0,
            }} />
            <span style={{ fontSize: 10, color: isLight ? 'rgba(140,90,0,0.65)' : 'rgba(255,255,255,0.45)' }}>
              задействовано
            </span>
            <span className="font-mono font-bold ml-auto"
              style={{ fontSize: 13, color: '#22c55e' }}>
              {stats.deployed}
            </span>
          </div>
        )}
      </div>

      {/* RIGHT — Staff */}
      <div className="flex flex-col gap-0"
        style={{ borderLeft: `1px solid ${divColor}`, paddingLeft: 14 }}>

        {/* Section header */}
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: labelColor, textTransform: 'uppercase' }}>
            Смена
          </span>
          <span className="font-mono font-bold" style={{ fontSize: 11, color: isLight ? '#8C5A00' : '#F0A500' }}>
            {stats.staff.total} чел.
          </span>
        </div>

        {/* Primary metrics */}
        <div className="flex flex-col gap-1.5">
          <StaffRow label="На смене" count={stats.staff.scheduledToday}
            color="#F0A500" isLight={isLight} glow />
          <StaffRow label="На работе" count={stats.staff.onDuty}
            color="#22c55e" isLight={isLight} />
        </div>

        {/* Absences */}
        {absences.length > 0 && (
          <>
            <div className="my-2" style={{ height: 1, background: divColor }} />
            <div className="flex flex-col gap-1.5">
              {absences.map(st => (
                <StaffRow
                  key={st}
                  label={EMPLOYEE_STATUS_CONFIG[st].label}
                  count={stats.staff.absent[st]!}
                  color={EMPLOYEE_STATUS_CONFIG[st].color}
                  isLight={isLight}
                />
              ))}
            </div>
          </>
        )}

        {/* Absent total if any */}
        {absences.length > 0 && (() => {
          const total = absences.reduce((s, st) => s + (stats.staff.absent[st] ?? 0), 0)
          return (
            <div className="mt-2 pt-2 flex items-center"
              style={{ borderTop: `1px solid ${divColor}` }}>
              <span style={{ fontSize: 10, color: isLight ? 'rgba(140,90,0,0.5)' : 'rgba(255,255,255,0.3)' }}>
                отсутствует
              </span>
              <span className="font-mono font-bold ml-auto"
                style={{ fontSize: 13, color: isLight ? '#8C5A00' : 'rgba(255,255,255,0.6)' }}>
                {total}
              </span>
            </div>
          )
        })()}
      </div>

    </div>
  )
}

function StaffRow({ label, count, color, isLight, glow = false }: {
  label: string; count: number; color: string; isLight: boolean; glow?: boolean
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span style={{
        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
        background: color,
        boxShadow: glow ? `0 0 6px ${color}70` : undefined,
      }} />
      <span style={{
        fontSize: 11,
        color: isLight ? 'rgba(140,90,0,0.75)' : 'rgba(255,255,255,0.55)',
        flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {label}
      </span>
      <span className="font-mono font-bold flex-shrink-0"
        style={{ fontSize: 13, color: isLight ? '#0D1117' : '#fff' }}>
        {count}
      </span>
    </div>
  )
}

function pluralPlan(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return ''
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'а'
  return 'ов'
}
