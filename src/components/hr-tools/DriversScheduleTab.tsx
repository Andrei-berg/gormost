'use client'
import { useMemo, useState } from 'react'
import type { UserWithAssignment, Service, ShiftPhase, AuthSession, Schedule } from '@/types'
import { resolveShiftStatus, isPhaseSchedule, isCustomSchedule, customScheduleLabel } from '@/lib/shifts'
import { openShiftPhase, closeShiftPhase, deleteShiftPhase, upsertEmployeeAssignment } from '@/lib/api-client'
import { useConfirm } from '@/components/ConfirmDialog'

interface Props {
  users: UserWithAssignment[]
  phases: ShiftPhase[]
  services: Service[]
  schedules: Schedule[]
  session?: AuthSession
  onPhasesChanged?: () => void
}

const PHASE_LABEL: Record<'day' | 'night', string> = { day: '☀ ДЕНЬ', night: '🌙 НОЧЬ' }
const PHASE_COLOR: Record<'day' | 'night', string> = {
  day:   'bg-amber-500/20 text-amber-300 border-amber-500/30',
  night: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
}

function hoursPerShiftDay(code: string): number {
  if (code === '1/3') return 24
  if (code === '5/2') return 8
  return 12
}

const SHIFT_NORM_HOURS = 176
const WARN_HOURS  = 188
const CRIT_HOURS  = 208

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
  displayCode: string
  serviceName: string
  dayBreakdown: { date: Date; working: boolean; phase: 'day' | 'night' | null }[]
}

export default function DriversScheduleTab({ users, phases, services, schedules, session, onPhasesChanged }: Props) {
  const confirmDialog = useConfirm()
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [phaseFormFor, setPhaseFormFor] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState<'analytics' | 'schedules'>('analytics')
  const today = now.toISOString().split('T')[0]

  const days = useMemo(() => getDaysInMonth(year, month), [year, month])

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
          custom_work_days:     u.assignment.custom_work_days,
          custom_rest_days:     u.assignment.custom_rest_days,
          active_phase: phase
            ? { phase: phase.phase, anchor_date: phase.anchor_date, schedule_code: phase.schedule_code, is_alternating: phase.is_alternating }
            : null,
        }, date)
        return { date, working: result.working, phase: result.phase }
      })

      const workDays = dayBreakdown.filter(d => d.working).length
      const hours    = workDays * hpd
      // Display code: X/Y → actual "4/4", "5/3" etc.
      const displayCode = code === 'X/Y'
        ? customScheduleLabel(u.assignment?.custom_work_days, u.assignment?.custom_rest_days)
        : code
      return { user: u, workDays, hours, norm, delta: hours - norm, schedule: code, displayCode, serviceName: svcName, dayBreakdown }
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
      {/* Toolbar: mode switcher + month navigator */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Mode switcher */}
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            {([['analytics', '📊 Аналитика'], ['schedules', '⚙️ Графики']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => { setMode(key); setEditingId(null); setExpandedId(null) }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  mode === key ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white/60'
                }`}
              >{label}</button>
            ))}
          </div>

          {/* Month navigator (analytics only) */}
          {mode === 'analytics' && (
            <>
              <button onClick={prevMonth} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm">‹</button>
              <span className="text-white font-medium text-sm capitalize min-w-[160px] text-center">{monthLabel}</span>
              <button onClick={nextMonth} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm">›</button>
              <div className="ml-auto flex items-center gap-4 text-xs text-white/25">
                <span>Норма 5/2 = {businessDaysInMonth(year, month) * 8} ч</span>
                <span>Норма смены = {SHIFT_NORM_HOURS} ч</span>
                <span className="text-amber-400/50">⚠ &gt;{WARN_HOURS} ч</span>
                <span className="text-red-400/50">🚨 &gt;{CRIT_HOURS} ч</span>
              </div>
            </>
          )}
          {mode === 'schedules' && (
            <span className="text-white/30 text-xs ml-2">Настройка графиков сменности для каждого водителя</span>
          )}
        </div>
      </div>

      {/* ── SCHEDULES MODE ── */}
      {mode === 'schedules' && (
        drivers.length === 0 ? (
          <div className="text-center text-white/20 py-16 text-sm">Нет водителей.</div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-white/30">
                  <th className="px-4 py-2.5 text-left">ФИО</th>
                  <th className="px-3 py-2.5 text-left">Служба</th>
                  <th className="px-3 py-2.5 text-left">Текущий график</th>
                  <th className="px-3 py-2.5 text-left">Раб / Вых</th>
                  <th className="px-3 py-2.5 text-left">Якорная дата</th>
                  <th className="px-3 py-2.5 text-left">Смена</th>
                  {session && <th className="px-3 py-2.5" />}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const a = row.user.assignment
                  const isEditing = editingId === row.user.user_id
                  return (
                    <>
                      {!isEditing ? (
                        <tr key={row.user.user_id} className="border-b border-white/5 hover:bg-white/3">
                          <td className="px-4 py-2.5 text-white/80">{row.user.full_name}</td>
                          <td className="px-3 py-2.5 text-white/40 text-xs">{row.serviceName}</td>
                          <td className="px-3 py-2.5">
                            {row.displayCode ? (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                                row.schedule === 'X/Y'
                                  ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                                  : 'bg-white/5 text-white/60 border-white/10'
                              }`}>{row.displayCode}</span>
                            ) : (
                              <span className="text-white/20 text-xs">не задан</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-white/50 text-xs">
                            {row.schedule === 'X/Y' && a?.custom_work_days && a?.custom_rest_days
                              ? <span className="font-mono">{a.custom_work_days} раб / {a.custom_rest_days} вых</span>
                              : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-white/40 text-xs font-mono">
                            {a?.shift_reference_date ?? '—'}
                          </td>
                          <td className="px-3 py-2.5 text-white/40 text-xs">
                            {a?.shift_num ? `Смена ${a.shift_num}` : '—'}
                          </td>
                          {session && (
                            <td className="px-3 py-2.5">
                              <button
                                onClick={() => { setEditingId(row.user.user_id); setExpandedId(null) }}
                                className="px-3 py-1 rounded-lg bg-blue-600/40 hover:bg-blue-600 text-white text-xs font-medium transition-colors"
                              >
                                Изменить
                              </button>
                            </td>
                          )}
                        </tr>
                      ) : (
                        <tr key={`${row.user.user_id}-edit`} className="border-b border-blue-500/20 bg-blue-500/5">
                          <td colSpan={session ? 7 : 6} className="px-4 py-3">
                            <DriverEditForm
                              user={row.user}
                              schedules={schedules}
                              session={session!}
                              today={today}
                              saving={saving}
                              onSave={async (data, phaseData) => {
                                setSaving(true)
                                await upsertEmployeeAssignment(row.user.user_id, data, session!.user_id)
                                if (phaseData) await openShiftPhase(row.user.user_id, phaseData, session!.user_id)
                                setSaving(false)
                                setEditingId(null)
                                onPhasesChanged?.()
                              }}
                              onCancel={() => setEditingId(null)}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── ANALYTICS MODE ── */}
      {mode === 'analytics' && drivers.length === 0 ? (
        <div className="text-center text-white/20 py-16 text-sm">
          Нет водителей.<br />
          <span className="text-xs">Отметьте сотрудника флагом «Водитель» в назначениях или задайте роль DRIVER.</span>
        </div>
      ) : mode === 'analytics' && (
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
                  {/* Main row */}
                  <tr
                    key={row.user.user_id}
                    className="border-b border-white/5 hover:bg-white/3 cursor-pointer group"
                    onClick={() => {
                      if (editingId !== row.user.user_id) {
                        setExpandedId(expandedId === row.user.user_id ? null : row.user.user_id)
                      }
                    }}
                  >
                    <td className="px-4 py-2.5 text-white/80">{row.user.full_name}</td>
                    <td className="px-3 py-2.5 text-white/40 text-xs">{row.serviceName}</td>
                    <td className="px-3 py-2.5 text-white/50 text-xs">{row.displayCode || '—'}</td>
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
                      <div className="flex items-center gap-2 justify-end">
                        {session && (
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              setEditingId(editingId === row.user.user_id ? null : row.user.user_id)
                              setExpandedId(null)
                            }}
                            className="opacity-0 group-hover:opacity-100 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white/40 text-[10px] transition-opacity"
                            title="Редактировать назначение"
                          >
                            ✏️
                          </button>
                        )}
                        {editingId !== row.user.user_id && (
                          <span>{expandedId === row.user.user_id ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Inline assignment edit row */}
                  {editingId === row.user.user_id && session && (
                    <tr key={`${row.user.user_id}-edit`} className="border-b border-blue-500/20 bg-blue-500/5">
                      <td colSpan={9} className="px-4 py-3">
                        <DriverEditForm
                          user={row.user}
                          schedules={schedules}
                          session={session}
                          today={today}
                          saving={saving}
                          onSave={async (data, phaseData) => {
                            setSaving(true)
                            await upsertEmployeeAssignment(row.user.user_id, data, session.user_id)
                            if (phaseData) {
                              await openShiftPhase(row.user.user_id, phaseData, session.user_id)
                            }
                            setSaving(false)
                            setEditingId(null)
                            onPhasesChanged?.()
                          }}
                          onCancel={() => setEditingId(null)}
                        />
                      </td>
                    </tr>
                  )}

                  {/* Expanded calendar detail row */}
                  {expandedId === row.user.user_id && editingId !== row.user.user_id && (
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

                        {/* Phase management (only for cyclic schedules) */}
                        {isPhaseSchedule(row.schedule) && (
                          <div className="mt-3 border-t border-white/5 pt-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] text-white/30 uppercase tracking-wider">Фазы смены</span>
                              {(() => {
                                const active = phases.find(p => p.employee_id === row.user.user_id && (!p.valid_to || p.valid_to >= today))
                                return active ? (
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PHASE_COLOR[active.phase]}`}>
                                    {PHASE_LABEL[active.phase]}{active.is_alternating ? ' ⟳' : ''} с {active.valid_from}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-red-400/70 px-2 py-0.5 rounded-full border border-red-500/20">нет фазы</span>
                                )
                              })()}
                              {session && (
                                <button
                                  onClick={() => setPhaseFormFor(phaseFormFor === row.user.user_id ? null : row.user.user_id)}
                                  className="ml-auto px-2 py-0.5 rounded bg-blue-600/60 hover:bg-blue-600 text-white text-[10px]"
                                >
                                  + фаза
                                </button>
                              )}
                            </div>

                            {/* Phase history */}
                            {phases.filter(p => p.employee_id === row.user.user_id).length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {phases.filter(p => p.employee_id === row.user.user_id).map(p => (
                                  <div key={p.id} className="flex items-center gap-1 text-[10px] bg-white/5 rounded px-1.5 py-0.5 border border-white/10">
                                    <span className={`font-bold ${p.phase === 'day' ? 'text-amber-300' : 'text-blue-300'}`}>{p.phase === 'day' ? '☀' : '🌙'}</span>
                                    <span className="text-white/40">{p.valid_from}→{p.valid_to ?? 'сейчас'}</span>
                                    {p.is_alternating && <span className="text-amber-400/60">⟳</span>}
                                    {session && !p.valid_to && (
                                      <button
                                        onClick={async () => {
                                          const d = prompt('Закрыть фазу. Дата окончания (YYYY-MM-DD):', today)
                                          if (d) { await closeShiftPhase(p.id, d, session.user_id); onPhasesChanged?.() }
                                        }}
                                        className="text-white/20 hover:text-amber-400 ml-1 transition-colors"
                                        title="Закрыть фазу"
                                      >✕</button>
                                    )}
                                    {session && (
                                      <button
                                        onClick={async () => {
                                          if (await confirmDialog(`Удалить фазу ${p.phase === 'day' ? '☀ день' : '🌙 ночь'} (${p.valid_from}→${p.valid_to ?? 'сейчас'})?`, { confirmLabel: 'Удалить' })) {
                                            await deleteShiftPhase(p.id, session.user_id)
                                            onPhasesChanged?.()
                                          }
                                        }}
                                        className="text-white/20 hover:text-red-400 ml-0.5 transition-colors"
                                        title="Удалить фазу"
                                      >🗑</button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Mini new phase form */}
                            {phaseFormFor === row.user.user_id && session && (
                              <DriverPhaseForm
                                user={row.user}
                                scheduleCode={row.schedule}
                                session={session}
                                today={today}
                                onSaved={() => { setPhaseFormFor(null); onPhasesChanged?.() }}
                                onCancel={() => setPhaseFormFor(null)}
                              />
                            )}
                          </div>
                        )}
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

// ---- Inline assignment edit form ----

function DriverEditForm({ user, schedules, today, saving, onSave, onCancel }: {
  user: UserWithAssignment
  schedules: Schedule[]
  session: AuthSession
  today: string
  saving: boolean
  onSave: (
    data: { schedule_id: string; shift_num: 1|2|3|4|null; rotation_group: string|null; shift_reference_date: string|null; is_driver: boolean; custom_work_days?: number|null; custom_rest_days?: number|null },
    phaseData: { phase: 'day'|'night'; anchor_date: string; valid_from: string; schedule_code: string; is_alternating: boolean } | null
  ) => Promise<void>
  onCancel: () => void
}) {
  const [scheduleCode, setScheduleCode] = useState(user.assignment?.schedule_code ?? '')
  const [scheduleId,   setScheduleId]   = useState(user.assignment?.schedule_id ?? '')
  const [shiftNum,     setShiftNum]     = useState<string>(String(user.assignment?.shift_num ?? ''))
  const [rotationGroup, setRotationGroup] = useState(user.assignment?.rotation_group ?? '')
  const [refDate,      setRefDate]      = useState(user.assignment?.shift_reference_date ?? '')
  const isDriver = true  // always true in drivers tab
  const [customWork,   setCustomWork]   = useState<string>(String(user.assignment?.custom_work_days ?? ''))
  const [customRest,   setCustomRest]   = useState<string>(String(user.assignment?.custom_rest_days ?? ''))
  const [createPhase,  setCreatePhase]  = useState(false)
  const [phaseVal,     setPhaseVal]     = useState<'day'|'night'>(user.assignment?.active_phase?.phase ?? 'day')
  const [phaseFrom,    setPhaseFrom]    = useState(today)
  const [phaseAlt,     setPhaseAlt]     = useState(false)

  const handleScheduleChange = (code: string) => {
    setScheduleCode(code)
    const found = schedules.find(s => s.code === code)
    setScheduleId(found?.id ?? '')
    setShiftNum(''); setRotationGroup(''); setRefDate('')
    setCustomWork(''); setCustomRest('')
    setCreatePhase(isPhaseSchedule(code))
  }

  const requiresShift = scheduleCode === '1/3'
  const needsRefDate  = scheduleCode === '2/2' || scheduleCode === '3/3' || scheduleCode === '6/6' || scheduleCode === '15/15'
  const needsHalf     = scheduleCode === '15/15'
  const needsCustom   = isCustomSchedule(scheduleCode)

  const customWorkNum = customWork ? parseInt(customWork) : null
  const customRestNum = customRest ? parseInt(customRest) : null
  const customValid   = !needsCustom || (!!customWorkNum && !!customRestNum && customWorkNum > 0 && customRestNum > 0)

  const sel = 'form-select text-xs px-1.5 py-1'
  const inp = 'form-input text-xs px-1.5 py-1'

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-white/80 text-sm font-medium mr-1">{user.full_name}</span>
        <span className="text-white/20 text-xs">— редактирование назначения</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Schedule */}
        <select value={scheduleCode} onChange={e => handleScheduleChange(e.target.value)} className={sel}>
          <option value="">— график —</option>
          {schedules.map(s => <option key={s.id} value={s.code}>{s.code} · {s.name}</option>)}
        </select>

        {/* Shift number */}
        <select value={shiftNum} onChange={e => setShiftNum(e.target.value)} className={sel} disabled={!scheduleCode}>
          <option value="">{requiresShift ? '— смена (обяз.) —' : '— смена (опц.) —'}</option>
          {[1,2,3,4].map(n => <option key={n} value={n}>Смена {n}</option>)}
        </select>

        {/* X/Y: custom work/rest days + anchor date */}
        {needsCustom && (
          <>
            <div className="flex items-center gap-1">
              <input
                type="number" min={1} max={30} value={customWork}
                onChange={e => setCustomWork(e.target.value)}
                className={`${inp} w-14 text-center`}
                placeholder="раб."
                title="Рабочих дней"
              />
              <span className="text-white/30 text-xs">/</span>
              <input
                type="number" min={1} max={30} value={customRest}
                onChange={e => setCustomRest(e.target.value)}
                className={`${inp} w-14 text-center`}
                placeholder="вых."
                title="Выходных дней"
              />
            </div>
            <input
              type="date" value={refDate} onChange={e => setRefDate(e.target.value)}
              className={inp} title="Дата начала первой рабочей вахты (якорная дата)"
            />
            {customWorkNum && customRestNum && (
              <span className="text-xs text-white/25">
                = цикл {customWorkNum}/{customRestNum} ({customWorkNum + customRestNum} дн.)
              </span>
            )}
          </>
        )}

        {/* Anchor date for 2/2, 3/3, 6/6 */}
        {needsRefDate && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-white/30">Якорная дата</span>
            <input type="date" value={refDate} onChange={e => setRefDate(e.target.value)} className={inp} />
          </div>
        )}

        {/* Rotation group for 15/15 */}
        {needsHalf && (
          <select value={rotationGroup} onChange={e => setRotationGroup(e.target.value)} className={sel}>
            <option value="">— группа —</option>
            <option value="1">1–15 числа</option>
            <option value="2">16–30 числа</option>
          </select>
        )}

        {/* Phase for cyclic schedules */}
        {isPhaseSchedule(scheduleCode) && (
          <>
            <span className="text-white/20 text-xs mx-1">|</span>
            <label className="flex items-center gap-1 text-xs text-white/50 cursor-pointer">
              <input type="checkbox" checked={createPhase} onChange={e => setCreatePhase(e.target.checked)} className="accent-indigo-400" />
              Фаза
            </label>
            {createPhase && (
              <>
                <select value={phaseVal} onChange={e => setPhaseVal(e.target.value as 'day'|'night')} className={sel}>
                  <option value="day">☀ День</option>
                  <option value="night">🌙 Ночь</option>
                </select>
                <input type="date" value={phaseFrom} onChange={e => setPhaseFrom(e.target.value)} className={inp} title="Начало фазы" />
                {scheduleCode === '15/15' && (
                  <label className="flex items-center gap-1 text-xs text-white/50 cursor-pointer" title="Автоматически чередовать фазу каждый месяц">
                    <input type="checkbox" checked={phaseAlt} onChange={e => setPhaseAlt(e.target.checked)} className="accent-indigo-400" />
                    чередование
                  </label>
                )}
              </>
            )}
          </>
        )}

        <button
          disabled={saving || !scheduleId || !customValid}
          onClick={() => onSave(
            {
              schedule_id: scheduleId,
              shift_num: shiftNum ? (Number(shiftNum) as 1|2|3|4) : null,
              rotation_group: rotationGroup || null,
              shift_reference_date: refDate || null,
              is_driver: isDriver,
              custom_work_days: needsCustom ? customWorkNum : null,
              custom_rest_days: needsCustom ? customRestNum : null,
            },
            createPhase && isPhaseSchedule(scheduleCode)
              ? { phase: phaseVal, anchor_date: phaseFrom, valid_from: phaseFrom, schedule_code: scheduleCode, is_alternating: phaseAlt }
              : null
          )}
          className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium"
        >
          {saving ? '...' : 'Сохранить'}
        </button>
        <button onClick={onCancel} className="px-2 py-1 rounded bg-white/5 text-white/40 text-xs">✕</button>
      </div>
    </div>
  )
}

// ---- Standalone phase-add form (inside expanded row) ----

function DriverPhaseForm({ user, scheduleCode, session, today, onSaved, onCancel }: {
  user: UserWithAssignment; scheduleCode: string; session: AuthSession
  today: string; onSaved: () => void; onCancel: () => void
}) {
  const [phase, setPhase] = useState<'day' | 'night'>('day')
  const [validFrom, setValidFrom] = useState(today)
  const [anchorDate, setAnchorDate] = useState(today)
  const [isAlternating, setIsAlternating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inp = 'bg-gray-900 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500/50 w-full'
  const handleSave = async () => {
    if (anchorDate > validFrom) { setError('Якорная дата не может быть позже начала фазы'); return }
    setSaving(true); setError(null)
    const r = await openShiftPhase(user.user_id, { phase, anchor_date: anchorDate, valid_from: validFrom, schedule_code: scheduleCode, is_alternating: isAlternating }, session.user_id)
    setSaving(false)
    if (r.ok) onSaved(); else setError(r.error ?? 'Ошибка')
  }
  return (
    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 space-y-2">
      <div className="flex gap-2 flex-wrap">
        <div>
          <div className="text-[10px] text-white/30 mb-1">{isAlternating ? 'Стартовая фаза' : 'Фаза'}</div>
          <div className="flex gap-1">
            {(['day', 'night'] as const).map(p => (
              <button key={p} onClick={() => setPhase(p)} className={`px-2 py-1 rounded text-[10px] font-bold border ${phase === p ? PHASE_COLOR[p] : 'bg-white/5 border-white/10 text-white/30'}`}>{PHASE_LABEL[p]}</button>
            ))}
          </div>
        </div>
        <div className="w-32"><div className="text-[10px] text-white/30 mb-1">Начало фазы</div><input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} className={inp} /></div>
        <div className="w-32"><div className="text-[10px] text-white/30 mb-1">Якорная дата</div><input type="date" value={anchorDate} onChange={e => setAnchorDate(e.target.value)} className={inp} /></div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer text-[10px] text-white/50">
        <input type="checkbox" checked={isAlternating} onChange={e => setIsAlternating(e.target.checked)} className="accent-amber-500" />
        Чередовать фазы каждый цикл (день→ночь→день...)
      </label>
      {error && <div className="text-[10px] text-red-400">{error}</div>}
      <div className="flex gap-2">
        <button disabled={saving} onClick={handleSave} className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-[10px] font-medium">{saving ? '...' : 'Сохранить'}</button>
        <button onClick={onCancel} className="px-3 py-1 rounded bg-white/5 text-white/40 text-[10px]">Отмена</button>
      </div>
    </div>
  )
}
