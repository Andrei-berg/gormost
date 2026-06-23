'use client'
import { useMemo, useState } from 'react'
import type { UserWithAssignment, Service, ShiftPhase, Schedule } from '@/types'
import { resolveShiftStatus, isPhaseSchedule } from '@/lib/shifts'

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  users: UserWithAssignment[]
  phases: ShiftPhase[]
  services: Service[]
  schedules: Schedule[]
}

type SubView = 'heatmap' | 'gantt' | 'validator' | 'labor'

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const DOW_SHORT = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']

// ── Shared helpers ─────────────────────────────────────────────────────────

function getDays(year: number, month: number): Date[] {
  const days: Date[] = []
  const d = new Date(year, month, 1, 12)
  while (d.getMonth() === month) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

function getActivePhase(phases: ShiftPhase[], userId: string, dateStr: string) {
  return phases.find(p =>
    p.employee_id === userId &&
    p.valid_from <= dateStr &&
    (p.valid_to === null || p.valid_to >= dateStr)
  ) ?? null
}

interface DayStatus {
  working: boolean
  phase: 'day' | 'night' | 'round' | null
  noSchedule: boolean
  missingPhase: boolean
}

function getUserDayStatus(user: UserWithAssignment, phases: ShiftPhase[], date: Date): DayStatus {
  if (!user.assignment?.schedule_code) {
    return { working: false, phase: null, noSchedule: true, missingPhase: false }
  }
  const dateStr = date.toISOString().split('T')[0]
  const phase = getActivePhase(phases, user.user_id, dateStr)
  const needsPhase = isPhaseSchedule(user.assignment.schedule_code) || user.assignment.schedule_code === 'X/Y'
  const result = resolveShiftStatus({
    schedule_code:        user.assignment.schedule_code,
    shift_num:            user.assignment.shift_num,
    rotation_group:       user.assignment.rotation_group,
    shift_reference_date: user.assignment.shift_reference_date,
    custom_work_days:     user.assignment.custom_work_days,
    custom_rest_days:     user.assignment.custom_rest_days,
    active_phase: phase ? {
      phase: phase.phase,
      anchor_date: phase.anchor_date,
      schedule_code: phase.schedule_code,
      is_alternating: phase.is_alternating ?? false,
    } : null,
  }, date)
  return { working: result.working, phase: result.phase, noSchedule: false, missingPhase: needsPhase && !phase }
}

function hoursPerDay(code: string): number {
  if (code === '1/3') return 24
  if (code === '5/2') return 8
  return 12
}

function businessDays(days: Date[]): number {
  return days.filter(d => d.getDay() !== 0 && d.getDay() !== 6).length
}

function monthNorm(code: string, days: Date[]): number {
  return code === '5/2' ? businessDays(days) * 8 : 176
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ScheduleCheckTab({ users, phases, services, schedules }: Props) {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [subView, setSubView] = useState<SubView>('heatmap')

  const days = useMemo(() => getDays(year, month), [year, month])
  const monthLabel = `${MONTHS[month]} ${year}`

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  const SUB_TABS: { key: SubView; label: string }[] = [
    { key: 'heatmap',   label: '🗓 Покрытие'   },
    { key: 'gantt',     label: '📊 Гант'        },
    { key: 'validator', label: '🔍 Валидатор'   },
    { key: 'labor',     label: '⚖️ КЗоТ'        },
  ]

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="glass rounded-2xl p-4 flex items-center gap-4 flex-wrap">
        {/* Sub-view switcher */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {SUB_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setSubView(t.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                subView === t.key ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >{t.label}</button>
          ))}
        </div>

        {/* Month navigator */}
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={prevMonth} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm">‹</button>
          <span className="text-white font-medium text-sm min-w-[150px] text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm">›</button>
        </div>
      </div>

      {subView === 'heatmap'   && <HeatmapView   users={users} phases={phases} services={services} days={days} />}
      {subView === 'gantt'     && <GanttView     users={users} phases={phases} services={services} days={days} year={year} month={month} />}
      {subView === 'validator' && <ValidatorView users={users} phases={phases} services={services} days={days} year={year} month={month} />}
      {subView === 'labor'     && <LaborView     users={users} phases={phases} services={services} days={days} schedules={schedules} />}
    </div>
  )
}

// ── A: Heatmap — service × day coverage ────────────────────────────────────

function HeatmapView({ users, phases, services, days }: {
  users: UserWithAssignment[]; phases: ShiftPhase[]
  services: Service[]; days: Date[]
}) {
  const [expandedCell, setExpandedCell] = useState<string | null>(null) // "svcId_dayIdx"
  const today = new Date().toISOString().split('T')[0]

  const matrix = useMemo(() => services.map(svc => {
    const svcUsers = users.filter(u => u.service_id === svc.service_id)
    return {
      service: svc,
      cells: days.map((day, di) => {
        const onDuty = svcUsers.filter(u => getUserDayStatus(u, phases, day).working)
        return { day, di, count: onDuty.length, total: svcUsers.length, workers: onDuty }
      }),
    }
  }), [users, phases, services, days])

  function cellCls(count: number, total: number) {
    if (total === 0) return 'bg-white/3 text-white/15'
    if (count === 0) return 'bg-red-500/25 text-red-400 border border-red-500/30'
    const r = count / total
    if (r >= 0.7) return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/25'
    if (r >= 0.35) return 'bg-amber-500/20 text-amber-300 border border-amber-500/25'
    return 'bg-red-500/15 text-red-400 border border-red-500/20'
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="sticky left-0 bg-slate-900/80 backdrop-blur px-3 py-2 text-left text-white/30 font-normal min-w-[140px]">Служба</th>
              {days.map((d, i) => {
                const ds = d.toISOString().split('T')[0]
                const dow = d.getDay()
                const isToday = ds === today
                const isWknd = dow === 0 || dow === 6
                return (
                  <th key={i} className={`px-0.5 py-2 text-center min-w-[30px] font-normal ${
                    isToday ? 'text-blue-400' : isWknd ? 'text-white/20' : 'text-white/30'
                  }`}>
                    <div>{d.getDate()}</div>
                    <div className="text-[9px]">{DOW_SHORT[dow]}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {matrix.map(({ service, cells }) => (
              <>
                <tr key={service.service_id} className="border-b border-white/5">
                  <td className="sticky left-0 bg-slate-900/80 backdrop-blur px-3 py-1.5 text-white/70 font-medium">
                    {service.service_name}
                  </td>
                  {cells.map(({ day, di, count, total, workers }) => {
                    const key = `${service.service_id}_${di}`
                    const isOpen = expandedCell === key
                    const ds = day.toISOString().split('T')[0]
                    const isToday = ds === today
                    return (
                      <td key={di} className={`px-0.5 py-1 text-center ${isToday ? 'bg-blue-500/5' : ''}`}>
                        <button
                          onClick={() => setExpandedCell(isOpen ? null : key)}
                          className={`w-7 h-7 rounded text-[11px] font-semibold transition-all ${cellCls(count, total)} ${isOpen ? 'ring-1 ring-white/30' : ''}`}
                          title={workers.map(w => w.full_name).join(', ') || 'Никого'}
                        >
                          {total > 0 ? count : '—'}
                        </button>
                      </td>
                    )
                  })}
                </tr>
                {/* Expanded row */}
                {cells.some((_, di) => expandedCell === `${service.service_id}_${di}`) && (() => {
                  const di = cells.findIndex((_, i) => expandedCell === `${service.service_id}_${i}`)
                  const cell = cells[di]
                  return (
                    <tr key={`${service.service_id}_exp`} className="bg-white/[0.02] border-b border-white/5">
                      <td className="sticky left-0 bg-slate-900/80 backdrop-blur px-3 py-2 text-[10px] text-white/30">
                        {cell.day.getDate()}.{(cell.day.getMonth()+1).toString().padStart(2,'0')}
                      </td>
                      <td colSpan={days.length} className="px-3 py-2">
                        {cell.workers.length === 0 ? (
                          <span className="text-red-400/60 text-[11px]">Никто не работает</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {cell.workers.map(w => {
                              const st = getUserDayStatus(w, phases, cell.day)
                              return (
                                <span key={w.user_id} className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                  st.phase === 'night' ? 'bg-blue-500/15 border-blue-500/25 text-blue-300' : st.phase === 'round' ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300' : 'bg-amber-500/15 border-amber-500/25 text-amber-300'
                                }`}>
                                  {st.phase === 'day' ? '☀' : st.phase === 'round' ? '🌗' : '🌙'} {w.full_name}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })()}
              </>
            ))}
          </tbody>
        </table>
      </div>
      {/* Legend */}
      <div className="px-4 py-3 border-t border-white/8 flex items-center gap-6 text-[11px] text-white/30">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/25 border border-emerald-500/30 inline-block" /> ≥70%</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/30 inline-block" /> 35–70%</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30 inline-block" /> &lt;35%</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500/25 border border-red-500/40 inline-block" /> 0 чел.</span>
        <span className="ml-auto">Клик на ячейку — список</span>
      </div>
    </div>
  )
}

// ── B: Gantt — employee × day grid ─────────────────────────────────────────

function GanttView({ users, phases, services, days }: {
  users: UserWithAssignment[]; phases: ShiftPhase[]
  services: Service[]; days: Date[]; year: number; month: number
}) {
  const [serviceId, setServiceId] = useState(services[0]?.service_id ?? '')
  const today = new Date().toISOString().split('T')[0]

  const filtered = useMemo(() =>
    users.filter(u => u.service_id === serviceId),
    [users, serviceId]
  )

  const rows = useMemo(() => filtered.map(user => ({
    user,
    days: days.map(day => getUserDayStatus(user, phases, day)),
  })), [filtered, phases, days])

  const anomalies = useMemo(() => {
    let count = 0
    rows.forEach(({ user, days: ddays }) => {
      if (!user.assignment?.schedule_code) { count++; return }
      ddays.forEach(d => { if (d.missingPhase) count++ })
    })
    return count
  }, [rows])

  return (
    <div className="space-y-3">
      {/* Service selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {services.map(s => (
            <button
              key={s.service_id}
              onClick={() => setServiceId(s.service_id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                serviceId === s.service_id ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >{s.service_name}</button>
          ))}
        </div>
        {anomalies > 0 && (
          <span className="text-xs text-amber-400/70 flex items-center gap-1">
            ⚠ {anomalies} аномали{anomalies === 1 ? 'я' : anomalies < 5 ? 'и' : 'й'}
          </span>
        )}
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="sticky left-0 bg-slate-900/80 backdrop-blur px-3 py-2 text-left text-white/30 font-normal min-w-[160px]">Сотрудник</th>
                <th className="px-2 py-2 text-white/25 font-normal min-w-[50px]">График</th>
                {days.map((d, i) => {
                  const dow = d.getDay()
                  const isToday = d.toISOString().split('T')[0] === today
                  return (
                    <th key={i} className={`px-0 py-1 text-center min-w-[26px] font-normal ${
                      isToday ? 'text-blue-400 bg-blue-500/5' : dow === 0 || dow === 6 ? 'text-white/15' : 'text-white/25'
                    }`}>
                      <div className="text-[10px]">{d.getDate()}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={days.length + 2} className="text-center text-white/20 py-10 text-sm">Нет сотрудников</td></tr>
              )}
              {rows.map(({ user, days: ddays }) => {
                const code = user.assignment?.schedule_code ?? ''
                return (
                  <tr key={user.user_id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="sticky left-0 bg-slate-900/80 backdrop-blur px-3 py-1.5 text-white/80">
                      <div className="truncate max-w-[150px]">{user.full_name}</div>
                      {user.position && <div className="text-[10px] text-white/30 truncate">{user.position}</div>}
                    </td>
                    <td className="px-2 py-1 text-center">
                      {code ? (
                        <span className="text-[10px] text-white/50 font-mono">{code}</span>
                      ) : (
                        <span className="text-[10px] text-red-400/60">—</span>
                      )}
                    </td>
                    {ddays.map((st, di) => {
                      const d = days[di]
                      const isToday = d.toISOString().split('T')[0] === today
                      let cellCls = ''
                      let content: string = ''
                      if (st.noSchedule) {
                        cellCls = 'bg-white/5 text-white/15'
                        content = '—'
                      } else if (st.missingPhase) {
                        cellCls = 'bg-red-500/20 text-red-400 border border-red-500/30'
                        content = '?'
                      } else if (st.working && st.phase === 'day') {
                        cellCls = 'bg-amber-500/25 text-amber-300'
                        content = '☀'
                      } else if (st.working && st.phase === 'night') {
                        cellCls = 'bg-blue-500/25 text-blue-300'
                        content = '🌙'
                      } else if (st.working && st.phase === 'round') {
                        cellCls = 'bg-emerald-500/25 text-emerald-300'
                        content = '🌗'
                      } else if (st.working) {
                        cellCls = 'bg-white/15 text-white/60'
                        content = '·'
                      } else {
                        content = ''
                      }
                      return (
                        <td key={di} className={`px-0 py-0 text-center ${isToday ? 'bg-blue-500/5' : ''}`}>
                          <div className={`w-[26px] h-7 flex items-center justify-center text-[11px] mx-auto rounded-sm ${cellCls}`}>
                            {content}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/8 flex items-center gap-6 text-[11px] text-white/30">
          <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-amber-500/25 inline-flex items-center justify-center text-[9px]">☀</span> День</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-blue-500/25 inline-flex items-center justify-center text-[9px]">🌙</span> Ночь</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-white/15 inline-block" /> Работа (без фазы)</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-red-500/20 border border-red-500/30 inline-flex items-center justify-center text-[9px] text-red-400">?</span> Нет фазы</span>
        </div>
      </div>
    </div>
  )
}

// ── C: Validator — one employee, detailed calendar ─────────────────────────

function ValidatorView({ users, phases, services, days }: {
  users: UserWithAssignment[]; phases: ShiftPhase[]
  services: Service[]; days: Date[]; year: number; month: number
}) {
  const [userId, setUserId] = useState(users[0]?.user_id ?? '')
  const today = new Date().toISOString().split('T')[0]

  const user = users.find(u => u.user_id === userId)

  const calDays = useMemo(() => {
    if (!days.length) return []
    // Pad to start on Monday
    const firstDow = (days[0].getDay() + 6) % 7 // 0=Mon
    const padded: (Date | null)[] = Array(firstDow).fill(null)
    return [...padded, ...days]
  }, [days])

  const dayStatuses = useMemo(() => {
    if (!user) return {}
    const map: Record<string, DayStatus> = {}
    days.forEach(d => {
      const ds = d.toISOString().split('T')[0]
      map[ds] = getUserDayStatus(user, phases, d)
    })
    return map
  }, [user, phases, days])

  const workDays  = Object.values(dayStatuses).filter(s => s.working).length
  const missingCount = Object.values(dayStatuses).filter(s => s.missingPhase).length

  const service = user ? services.find(s => s.service_id === user.service_id) : null
  const code = user?.assignment?.schedule_code ?? ''

  return (
    <div className="space-y-4">
      {/* Employee picker */}
      <div className="glass rounded-2xl p-4 flex items-center gap-4 flex-wrap">
        <select
          value={userId}
          onChange={e => setUserId(e.target.value)}
          className="form-select text-sm min-w-[220px]"
        >
          {users.map(u => (
            <option key={u.user_id} value={u.user_id}>{u.full_name}</option>
          ))}
        </select>

        {user && (
          <div className="flex items-center gap-4 text-xs text-white/40 flex-wrap">
            {service && <span>{service.service_name}</span>}
            {code && <span className="font-mono text-white/60">{code}</span>}
            {user.assignment?.shift_num && <span>Смена {user.assignment.shift_num}</span>}
            {user.assignment?.rotation_group && <span>Группа {user.assignment.rotation_group}</span>}
            {user.assignment?.shift_reference_date && <span>Якорь {user.assignment.shift_reference_date}</span>}
          </div>
        )}
      </div>

      {user ? (
        <>
          {/* Summary */}
          <div className="flex items-center gap-6 px-1">
            <div className="text-center">
              <div className="text-xl font-bold text-white">{workDays}</div>
              <div className="text-[10px] text-white/35 uppercase tracking-wider">рабочих дней</div>
            </div>
            <div className="text-center">
              <div className={`text-xl font-bold ${missingCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{missingCount}</div>
              <div className="text-[10px] text-white/35 uppercase tracking-wider">без фазы</div>
            </div>
            {code && (
              <div className="text-center">
                <div className="text-xl font-bold text-white">
                  {workDays * hoursPerDay(code)}
                </div>
                <div className="text-[10px] text-white/35 uppercase tracking-wider">часов</div>
              </div>
            )}
            {missingCount > 0 && (
              <div className="ml-4 text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                ⚠ Для графика {code} нужны фазы. {missingCount} дн. без записи в shift_phases.
              </div>
            )}
          </div>

          {/* Calendar grid */}
          <div className="glass rounded-2xl p-4">
            {/* Week day headers */}
            <div className="grid grid-cols-7 mb-2">
              {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
                <div key={d} className={`text-center text-[10px] text-white/25 pb-1 ${d === 'Сб' || d === 'Вс' ? 'text-white/15' : ''}`}>{d}</div>
              ))}
            </div>
            {/* Days */}
            <div className="grid grid-cols-7 gap-1">
              {calDays.map((day, i) => {
                if (!day) return <div key={`pad-${i}`} />
                const ds = day.toISOString().split('T')[0]
                const st = dayStatuses[ds]
                const isToday = ds === today
                const dow = day.getDay()
                const isWknd = dow === 0 || dow === 6

                let bg = ''
                let icon = ''
                let textCls = 'text-white/20'
                if (st?.noSchedule) {
                  bg = 'bg-white/3'
                  textCls = 'text-white/20'
                } else if (st?.missingPhase) {
                  bg = 'bg-red-500/20 border border-red-500/30'
                  textCls = 'text-red-300'
                  icon = '?'
                } else if (st?.working && st.phase === 'day') {
                  bg = 'bg-amber-500/20 border border-amber-500/25'
                  textCls = 'text-amber-200'
                  icon = '☀'
                } else if (st?.working && st.phase === 'night') {
                  bg = 'bg-blue-500/20 border border-blue-500/25'
                  textCls = 'text-blue-200'
                  icon = '🌙'
                } else if (st?.working && st.phase === 'round') {
                  bg = 'bg-emerald-500/20 border border-emerald-500/25'
                  textCls = 'text-emerald-200'
                  icon = '🌗'
                } else if (st?.working) {
                  bg = 'bg-white/12 border border-white/15'
                  textCls = 'text-white/70'
                  icon = '·'
                } else {
                  bg = ''
                  textCls = isWknd ? 'text-white/15' : 'text-white/30'
                }

                return (
                  <div
                    key={ds}
                    className={`rounded-lg p-1.5 text-center ${bg} ${isToday ? 'ring-1 ring-blue-400/50' : ''}`}
                  >
                    <div className={`text-[11px] font-medium ${textCls}`}>{day.getDate()}</div>
                    <div className="text-[13px] leading-none mt-0.5">{icon}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center text-white/20 py-12 text-sm">Выберите сотрудника</div>
      )}
    </div>
  )
}

// ── D: Labor — КЗоТ hours monitoring for all employees ─────────────────────

const NORM_HOURS  = 176
const WARN_HOURS  = 188
const CRIT_HOURS  = 208

function LaborView({ users, phases, services, days }: {
  users: UserWithAssignment[]; phases: ShiftPhase[]
  services: Service[]; days: Date[]; schedules: Schedule[]
}) {
  const [filterServiceId, setFilterServiceId] = useState('')

  const filtered = useMemo(() =>
    users.filter(u => !filterServiceId || u.service_id === filterServiceId),
    [users, filterServiceId]
  )

  const rows = useMemo(() => filtered.map(user => {
    const code = user.assignment?.schedule_code ?? ''
    const norm = code ? monthNorm(code, days) : NORM_HOURS
    const hpd  = code ? hoursPerDay(code) : 0
    const workDays = code ? days.filter(d => getUserDayStatus(user, phases, d).working).length : 0
    const hours = workDays * hpd
    const delta = hours - norm
    const svc = services.find(s => s.service_id === user.service_id)
    return { user, code, norm, hours, delta, workDays, svcName: svc?.service_name ?? '—' }
  }).sort((a, b) => b.hours - a.hours), [filtered, phases, days, services])

  const critCount = rows.filter(r => r.hours > CRIT_HOURS).length
  const warnCount = rows.filter(r => r.hours > WARN_HOURS && r.hours <= CRIT_HOURS).length
  const okCount   = rows.filter(r => r.hours > 0 && r.hours <= WARN_HOURS).length

  return (
    <div className="space-y-4">
      {/* Summary + filter */}
      <div className="glass rounded-2xl p-4 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-xl font-bold text-red-400">{critCount}</div>
            <div className="text-[10px] text-white/35 uppercase tracking-wider">критично &gt;{CRIT_HOURS}ч</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-amber-400">{warnCount}</div>
            <div className="text-[10px] text-white/35 uppercase tracking-wider">превышение &gt;{WARN_HOURS}ч</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-emerald-400">{okCount}</div>
            <div className="text-[10px] text-white/35 uppercase tracking-wider">в норме</div>
          </div>
        </div>
        <div className="ml-auto">
          <select value={filterServiceId} onChange={e => setFilterServiceId(e.target.value)} className="form-select text-sm">
            <option value="">Все службы</option>
            {services.map(s => <option key={s.service_id} value={s.service_id}>{s.service_name}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs text-white/30">
              <th className="px-4 py-2.5 text-left">Сотрудник</th>
              <th className="px-3 py-2.5 text-left">Служба</th>
              <th className="px-3 py-2.5 text-center">График</th>
              <th className="px-3 py-2.5 text-center">Раб. дней</th>
              <th className="px-3 py-2.5 text-center">Часов</th>
              <th className="px-3 py-2.5 text-center">Норма</th>
              <th className="px-3 py-2.5 text-center">Дельта</th>
              <th className="px-3 py-2.5 text-center">Статус</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ user, code, norm, hours, delta, workDays, svcName }) => {
              const isCrit = hours > CRIT_HOURS
              const isWarn = hours > WARN_HOURS && !isCrit
              const noWork = hours === 0

              return (
                <tr key={user.user_id} className={`border-b border-white/5 ${isCrit ? 'bg-red-500/5' : isWarn ? 'bg-amber-500/5' : ''}`}>
                  <td className="px-4 py-2.5">
                    <div className="text-white/85 font-medium">{user.full_name}</div>
                    {user.position && <div className="text-[10px] text-white/30">{user.position}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-white/40">{svcName}</td>
                  <td className="px-3 py-2.5 text-center">
                    {code ? (
                      <span className="text-xs font-mono text-white/60">{code}</span>
                    ) : (
                      <span className="text-xs text-white/20">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center text-white/60">{workDays || '—'}</td>
                  <td className={`px-3 py-2.5 text-center font-semibold ${isCrit ? 'text-red-400' : isWarn ? 'text-amber-400' : noWork ? 'text-white/20' : 'text-white/80'}`}>
                    {hours || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-center text-white/40 text-sm">{norm}</td>
                  <td className={`px-3 py-2.5 text-center text-sm font-medium ${
                    delta > 32 ? 'text-red-400' : delta > 12 ? 'text-amber-400' : delta > 0 ? 'text-white/50' : delta < 0 ? 'text-blue-400/70' : 'text-white/30'
                  }`}>
                    {hours > 0 ? (delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '=') : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {noWork ? (
                      <span className="text-[10px] text-white/20">нет данных</span>
                    ) : isCrit ? (
                      <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">🚨 Критично</span>
                    ) : isWarn ? (
                      <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full">⚠ Превышение</span>
                    ) : (
                      <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full">✓ Норма</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="text-center text-white/20 py-10">Нет сотрудников</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
