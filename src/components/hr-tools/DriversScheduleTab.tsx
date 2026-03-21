'use client'
import { useMemo, useState } from 'react'
import type { UserWithAssignment, Service, ShiftPhase } from '@/types'
import { resolveShiftStatus } from '@/lib/shifts'

interface Props {
  users: UserWithAssignment[]
  phases: ShiftPhase[]
  services: Service[]
}

// Hours per working day by schedule type
function hoursPerShiftDay(code: string): number {
  if (code === '1/3') return 24
  if (code === '5/2') return 8
  return 12  // 2/2, 3/3, 6/6, 15/15
}

// Standard monthly norm in hours.
// Shift workers: 176h (40h/week basis over 4.4 weeks).
// 5/2: calculated from business days below; this value is used for all others.
const SHIFT_NORM_HOURS = 176

// КЗоТ thresholds (per month)
const WARN_HOURS  = 188   // > norm + ~12h
const CRIT_HOURS  = 208   // > norm + 32h (roughly 120h/yr annual overtime cap ÷ 12)

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    days.push(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0))
    d.setDate(d.getDate() + 1)
  }
  return days
}

function getPhaseForDate(phases: ShiftPhase[], userId: string, dateStr: string) {
  return phases.find(p =>
    p.employee_id === userId &&
    p.valid_from <= dateStr &&
    (p.valid_to === null || p.valid_to >= dateStr)
  ) ?? null
}

function businessDaysInMonth(year: number, month: number): number {
  return getDaysInMonth(year, month).filter(d => {
    const dow = d.getDay()
    return dow !== 0 && dow !== 6
  }).length
}

interface DriverRow {
  user: UserWithAssignment
  workDays: number
  hours: number
  norm: number
  delta: number
  schedule: string
  serviceName: string
  dayBreakdown: { date: Date; working: boolean; phase: 'day' | 'night' | null }[]
}

export default function DriversScheduleTab({ users, phases, services }: Props) {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())   // 0-indexed
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const days = useMemo(() => getDaysInMonth(year, month), [year, month])

  // Filter: is_driver=true OR role=DRIVER
  const drivers = useMemo(() =>
    users.filter(u => u.assignment?.is_driver || u.role_level === 'DRIVER'),
    [users]
  )

  const rows = useMemo<DriverRow[]>(() => {
    const bizDays = businessDaysInMonth(year, month)
    return drivers.map(u => {
      const code = u.assignment?.schedule_code ?? ''
      const norm = code === '5/2' ? bizDays * 8 : SHIFT_NORM_HOURS
      const hpd  = hoursPerShiftDay(code)
      const svcName = services.find(s => s.service_id === u.service_id)?.service_name ?? '—'

      const dayBreakdown = days.map(date => {
        if (!u.assignment) return { date, working: false, phase: null }
        const dateStr = date.toISOString().split('T')[0]
        const phase   = getPhaseForDate(phases, u.user_id, dateStr)
        const result  = resolveShiftStatus({
          schedule_code:        u.assignment.schedule_code ?? '',
          shift_num:            u.assignment.shift_num,
          rotation_group:       u.assignment.rotation_group,
          shift_reference_date: u.assignment.shift_reference_date,
          active_phase: phase
            ? { phase: phase.phase, anchor_date: phase.anchor_date, schedule_code: phase.schedule_code }
            : null,
        }, date)
        return { date, working: result.working, phase: result.phase }
      })

      const workDays = dayBreakdown.filter(d => d.working).length
      const hours    = workDays * hpd
      return { user: u, workDays, hours, norm, delta: hours - norm, schedule: code, serviceName: svcName, dayBreakdown }
    })
  }, [drivers, phases, days, year, month, services])

  const monthLabel = new Date(year, month, 1).toLocaleString('ru', { month: 'long', year: 'numeric' })

  function hoursColor(hours: number, norm: number): string {
    if (hours > CRIT_HOURS)   return 'text-red-400'
    if (hours > WARN_HOURS)   return 'text-amber-400'
    if (hours < norm - 20)    return 'text-blue-400'
    return 'text-white/80'
  }

  function deltaLabel(delta: number): string {
    if (delta === 0) return '±0'
    return delta > 0 ? `+${delta}` : String(delta)
  }

  function deltaColor(delta: number): string {
    if (delta > CRIT_HOURS - SHIFT_NORM_HOURS) return 'text-red-400'
    if (delta > WARN_HOURS - SHIFT_NORM_HOURS) return 'text-amber-400'
    if (delta < -20) return 'text-blue-400'
    return 'text-white/30'
  }

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  const DAY_ABBR = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']

  return (
    <div className="space-y-4">
      {/* Month navigator */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm">‹</button>
          <span className="text-white font-medium text-sm capitalize min-w-[160px] text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm">›</button>
          <div className="ml-auto flex items-center gap-4 text-xs text-white/25">
            <span>Норма 5/2 = {businessDaysInMonth(year, month) * 8} ч</span>
            <span>Норма смены = {SHIFT_NORM_HOURS} ч</span>
            <span className="text-amber-400/50">⚠ &gt;{WARN_HOURS} ч</span>
            <span className="text-red-400/50">🚨 &gt;{CRIT_HOURS} ч</span>
          </div>
        </div>
      </div>

      {drivers.length === 0 ? (
        <div className="text-center text-white/20 py-16 text-sm">
          Нет водителей.<br />
          <span className="text-xs">Отметьте сотрудника флагом «Водитель» в назначениях или задайте роль DRIVER.</span>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-white/30">
                <th className="px-4 py-2.5 text-left">ФИО</th>
                <th className="px-3 py-2.5 text-left">Служба</th>
                <th className="px-3 py-2.5 text-left">График</th>
                <th className="px-3 py-2.5 text-center">Рабочих дней</th>
                <th className="px-3 py-2.5 text-center">Часов факт</th>
                <th className="px-3 py-2.5 text-center">Норма</th>
                <th className="px-3 py-2.5 text-center">Δ</th>
                <th className="px-3 py-2.5 text-center">КЗоТ</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <>
                  <tr
                    key={row.user.user_id}
                    className="border-b border-white/5 hover:bg-white/3 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === row.user.user_id ? null : row.user.user_id)}
                  >
                    <td className="px-4 py-2.5 text-white/80">{row.user.full_name}</td>
                    <td className="px-3 py-2.5 text-white/40 text-xs">{row.serviceName}</td>
                    <td className="px-3 py-2.5 text-white/50 text-xs">{row.schedule || '—'}</td>
                    <td className="px-3 py-2.5 text-center text-white/60">{row.workDays}</td>
                    <td className={`px-3 py-2.5 text-center font-medium ${hoursColor(row.hours, row.norm)}`}>
                      {row.hours} ч
                    </td>
                    <td className="px-3 py-2.5 text-center text-white/30">{row.norm} ч</td>
                    <td className={`px-3 py-2.5 text-center text-xs font-medium ${deltaColor(row.delta)}`}>
                      {deltaLabel(row.delta)} ч
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {row.hours > CRIT_HOURS  && <span className="text-red-400 text-xs font-bold" title="Превышение лимита переработки">🚨 Крит.</span>}
                      {row.hours > WARN_HOURS && row.hours <= CRIT_HOURS && <span className="text-amber-400 text-xs" title="Приближение к лимиту">⚠ Перераб.</span>}
                      {row.hours <= WARN_HOURS && <span className="text-green-400/50 text-xs">✓</span>}
                    </td>
                    <td className="px-3 py-2.5 text-white/20 text-xs">
                      {expandedId === row.user.user_id ? '▲' : '▼'}
                    </td>
                  </tr>

                  {expandedId === row.user.user_id && (
                    <tr key={`${row.user.user_id}-detail`} className="border-b border-white/5 bg-white/2">
                      <td colSpan={9} className="px-4 py-3">
                        <div className="text-[10px] text-white/30 mb-2">
                          Посменный план · {row.schedule} · {hoursPerShiftDay(row.schedule)} ч/смена
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {row.dayBreakdown.map(d => {
                            const dd  = d.date.getDate()
                            const dow = d.date.getDay()
                            const isWeekend = dow === 0 || dow === 6
                            return (
                              <div
                                key={dd}
                                title={`${dd} (${DAY_ABBR[dow]}) — ${d.working ? (d.phase === 'day' ? '☀ День' : d.phase === 'night' ? '🌙 Ночь' : 'Работает') : 'Выходной'}`}
                                className={`w-7 h-7 rounded-md flex flex-col items-center justify-center text-[9px] font-medium border transition-colors
                                  ${d.working
                                    ? d.phase === 'night'
                                      ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                                      : 'bg-amber-500/15 border-amber-500/25 text-amber-300'
                                    : isWeekend
                                      ? 'bg-white/3 border-white/5 text-white/15'
                                      : 'bg-white/2 border-white/5 text-white/20'
                                  }`}
                              >
                                <span>{dd}</span>
                                {d.working && <span>{d.phase === 'day' ? '☀' : d.phase === 'night' ? '🌙' : '·'}</span>}
                              </div>
                            )
                          })}
                        </div>
                        <div className="mt-2 flex gap-4 text-[10px] text-white/25">
                          <span>☀ День: {row.dayBreakdown.filter(d => d.working && d.phase === 'day').length} смен</span>
                          <span>🌙 Ночь: {row.dayBreakdown.filter(d => d.working && d.phase === 'night').length} смен</span>
                          <span>Итого: {row.workDays} дней · {row.hours} ч</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
