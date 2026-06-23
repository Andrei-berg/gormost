'use client'
import { useState, useMemo, useCallback, useRef } from 'react'
import type { UserWithAssignment, ShiftPhase, AuthSession, DriverManualShift, Service, Schedule } from '@/types'
import { resolveShiftStatus, PHASE_SCHEDULE_CODES } from '@/lib/shifts'
import { upsertDriverManualShift, deleteDriverManualShift, fetchDriverManualShifts } from '@/lib/api-client'

// ─── helpers ────────────────────────────────────────────────────────────────

const RU_MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                   'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const RU_DOW_SHORT = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']

// Из эталона графиков (shifts.ts): графики, которым нужна фаза.
const CYCLIC_CODES = new Set(PHASE_SCHEDULE_CODES)

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

function daysInRange(startYear: number, startMonth: number, spanMonths: number): Date[] {
  const days: Date[] = []
  for (let m = 0; m < spanMonths; m++) {
    const { year, month } = addMonths(startYear, startMonth, m)
    const d = new Date(year, month, 1)
    while (d.getMonth() === month) {
      days.push(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0))
      d.setDate(d.getDate() + 1)
    }
  }
  return days
}

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

function isWeekend(d: Date) { const dw = d.getDay(); return dw === 0 || dw === 6 }

// ─── types ─────────────────────────────────────────────────────────────────

type SpanOption = 1 | 2 | 3

interface CellState {
  auto: 'I' | 'II' | null
  manual: 'I' | 'II' | 'OFF' | null
}

const CYCLE: Record<string, 'I' | 'II' | 'OFF' | null> = {
  'null+null': 'I',
  'I+null':    'II',
  'II+null':   'OFF',
  'OFF+null':  null,
  'null+I':    'II',
  'null+II':   'OFF',
  'null+OFF':  null,
  'I+I':       'II',
  'I+II':      'OFF',
  'I+OFF':     null,
  'II+I':      'OFF',
  'II+II':     'OFF',
  'II+OFF':    null,
}

function nextManual(cell: CellState): 'I' | 'II' | 'OFF' | null {
  const key = `${cell.auto ?? 'null'}+${cell.manual ?? 'null'}`
  return CYCLE[key] ?? (cell.manual ? null : 'I')
}

// ─── PlanCell ───────────────────────────────────────────────────────────────

interface CellProps {
  cell: CellState
  isToday: boolean
  saving: boolean
  onClick: () => void
}

function PlanCell({ cell, isToday, saving, onClick }: CellProps) {
  const displayed = cell.manual ?? cell.auto
  const isManual = cell.manual !== null

  let cls = 'relative w-full h-7 rounded text-[10px] font-medium transition-all select-none '
  let label = ''

  if (displayed === 'I') {
    cls += isManual
      ? 'bg-amber-500/30 text-amber-200 border border-amber-500/50 hover:bg-amber-500/45'
      : 'bg-amber-500/10 text-amber-400/40 border border-transparent hover:bg-amber-500/20'
    label = 'I'
  } else if (displayed === 'II') {
    cls += isManual
      ? 'bg-blue-500/30 text-blue-200 border border-blue-500/50 hover:bg-blue-500/45'
      : 'bg-blue-500/10 text-blue-400/40 border border-transparent hover:bg-blue-500/20'
    label = 'II'
  } else if (displayed === 'OFF') {
    cls += 'bg-white/5 text-white/20 border border-white/10 hover:bg-white/10'
    label = '—'
  } else {
    cls += 'bg-transparent text-transparent border border-transparent hover:bg-white/5'
  }

  if (isToday) cls += ' ring-1 ring-green-400/60'
  if (saving) cls += ' opacity-50 pointer-events-none'

  return (
    <button className={cls} onClick={onClick} title={isManual ? '✏ вручную' : 'авто'}>
      <span className="flex items-center justify-center h-full">{label}</span>
      {isManual && (
        <span className="absolute top-0 right-0 w-1 h-1 rounded-full bg-amber-400 m-0.5" title="ручной" />
      )}
    </button>
  )
}

// ─── main component ─────────────────────────────────────────────────────────

interface Props {
  users: UserWithAssignment[]
  phases: ShiftPhase[]
  services: Service[]
  schedules: Schedule[]
  session: AuthSession
}

export default function ShiftPlannerBoard({ users, phases, services, schedules, session }: Props) {
  const now = new Date()
  const [startYear, setStartYear]   = useState(now.getFullYear())
  const [startMonth, setStartMonth] = useState(now.getMonth())
  const [span, setSpan]             = useState<SpanOption>(1)
  const [manualShifts, setManualShifts] = useState<DriverManualShift[]>([])
  const [savingKey, setSavingKey]   = useState<string | null>(null)
  const [showPhaseStrip, setShowPhaseStrip] = useState(true)

  // Filters
  const [filterService,  setFilterService]  = useState('')
  const [filterSchedule, setFilterSchedule] = useState('')
  const [filterShift,    setFilterShift]    = useState('')
  const [filterSearch,   setFilterSearch]   = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)
  const today = toDateStr(now)

  // Active employees
  const activeUsers = useMemo(() =>
    users.filter(u => u.is_active),
    [users]
  )

  // Apply filters
  const filteredUsers = useMemo(() => {
    const q = filterSearch.trim().toLowerCase()
    return activeUsers.filter(u => {
      if (filterService  && u.service_id !== filterService) return false
      if (filterSchedule && u.assignment?.schedule_code !== filterSchedule) return false
      if (filterShift    && String(u.assignment?.shift_num) !== filterShift) return false
      if (q && !u.full_name.toLowerCase().includes(q)) return false
      return true
    })
  }, [activeUsers, filterService, filterSchedule, filterShift, filterSearch])

  // Days in visible range
  const days = useMemo(() =>
    daysInRange(startYear, startMonth, span),
    [startYear, startMonth, span]
  )

  // Month boundary indices for header separators
  const monthBoundaries = useMemo(() => {
    const boundaries: { idx: number; label: string }[] = []
    let lastMonth = -1
    days.forEach((d, i) => {
      if (d.getMonth() !== lastMonth) {
        boundaries.push({ idx: i, label: `${RU_MONTHS[d.getMonth()]} ${d.getFullYear()}` })
        lastMonth = d.getMonth()
      }
    })
    return boundaries
  }, [days])

  // Manual shifts indexed by "userId_date"
  const manualIndex = useMemo(() => {
    const idx = new Map<string, DriverManualShift>()
    manualShifts.forEach(m => idx.set(`${m.user_id}_${m.shift_date}`, m))
    return idx
  }, [manualShifts])

  // Phase index by userId → phases array
  const phasesByUser = useMemo(() => {
    const idx = new Map<string, ShiftPhase[]>()
    phases.forEach(p => {
      const arr = idx.get(p.employee_id) ?? []
      arr.push(p)
      idx.set(p.employee_id, arr)
    })
    return idx
  }, [phases])

  // Get active phase for user on date
  const getActivePhase = useCallback((userId: string, dateStr: string) => {
    const ps = phasesByUser.get(userId) ?? []
    return ps.find(p => p.valid_from <= dateStr && (p.valid_to === null || p.valid_to >= dateStr)) ?? null
  }, [phasesByUser])

  // Compute cell state
  const getCell = useCallback((user: UserWithAssignment, date: Date): CellState => {
    const dateStr = toDateStr(date)
    const manual = manualIndex.get(`${user.user_id}_${dateStr}`)

    let auto: 'I' | 'II' | null = null
    if (user.assignment) {
      const ap = getActivePhase(user.user_id, dateStr)
      const status = resolveShiftStatus({
        schedule_code: user.assignment.schedule_code ?? '',
        shift_num: user.assignment.shift_num,
        rotation_group: user.assignment.rotation_group,
        shift_reference_date: user.assignment.shift_reference_date,
        custom_work_days: user.assignment.custom_work_days,
        custom_rest_days: user.assignment.custom_rest_days,
        active_phase: ap,
      }, date)
      if (status.working) {
        auto = status.phase === 'night' ? 'II' : 'I'
      }
    }

    return {
      auto,
      manual: manual ? manual.shift_type : null,
    }
  }, [manualIndex, getActivePhase])

  // Navigation
  const prev = () => { const r = addMonths(startYear, startMonth, -1); setStartYear(r.year); setStartMonth(r.month) }
  const next = () => { const r = addMonths(startYear, startMonth, 1);  setStartYear(r.year); setStartMonth(r.month) }
  const goToday = () => { setStartYear(now.getFullYear()); setStartMonth(now.getMonth()) }

  // Cell click
  const handleCellClick = useCallback(async (user: UserWithAssignment, date: Date) => {
    const dateStr = toDateStr(date)
    const key = `${user.user_id}_${dateStr}`
    if (savingKey) return

    const cell = getCell(user, date)
    const next = nextManual(cell)

    setSavingKey(key)
    if (next === null) {
      await deleteDriverManualShift(user.user_id, dateStr)
      setManualShifts(prev => prev.filter(m => !(m.user_id === user.user_id && m.shift_date === dateStr)))
    } else {
      await upsertDriverManualShift(user.user_id, dateStr, next, session.user_id)
      setManualShifts(prev => {
        const filtered = prev.filter(m => !(m.user_id === user.user_id && m.shift_date === dateStr))
        return [...filtered, {
          id: key, user_id: user.user_id, shift_date: dateStr,
          shift_type: next, notes: null, created_by: session.user_id,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }]
      })
    }
    setSavingKey(null)
  }, [savingKey, getCell, session.user_id])

  // Per-user summary
  const userSummary = useCallback((user: UserWithAssignment) => {
    let working = 0, dayShifts = 0, nightShifts = 0, overrides = 0
    days.forEach(d => {
      const c = getCell(user, d)
      const shown = c.manual ?? c.auto
      if (shown === 'I')   { working++; dayShifts++ }
      if (shown === 'II')  { working++; nightShifts++ }
      if (shown === 'OFF') overrides++
      if (c.manual && shown !== 'OFF') overrides++
    })
    return { working, dayShifts, nightShifts, overrides }
  }, [days, getCell])

  // Reload manual shifts when period changes
  const reloadManual = useCallback(async () => {
    if (!days.length) return
    const dateFrom = toDateStr(days[0])
    const dateTo   = toDateStr(days[days.length - 1])
    const fresh = await fetchDriverManualShifts(dateFrom, dateTo)
    setManualShifts(fresh)
  }, [days])

  // Unique schedule codes
  const scheduleCodes = useMemo(() =>
    [...new Set(schedules.map(s => s.code))].sort(),
    [schedules]
  )

  // Service map
  const serviceMap = useMemo(() => {
    const m = new Map<string, string>()
    services.forEach(s => m.set(s.service_id, s.service_name))
    return m
  }, [services])

  const periodLabel = span === 1
    ? `${RU_MONTHS[startMonth]} ${startYear}`
    : `${RU_MONTHS[startMonth]} – ${RU_MONTHS[addMonths(startYear, startMonth, span - 1).month]} ${addMonths(startYear, startMonth, span - 1).year}`

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* ── Toolbar ── */}
      <div className="glass rounded-2xl p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Span selector */}
          <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
            {([1, 2, 3] as SpanOption[]).map(s => (
              <button
                key={s}
                onClick={() => setSpan(s)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  span === s ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white/70'
                }`}
              >{s} мес</button>
            ))}
          </div>

          {/* Month navigation */}
          <div className="flex items-center gap-1.5">
            <button onClick={prev} className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/60 text-sm">‹</button>
            <span className="text-sm font-medium text-white/80 min-w-[180px] text-center">{periodLabel}</span>
            <button onClick={next} className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/60 text-sm">›</button>
            <button onClick={goToday} className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/40 text-xs">сегодня</button>
          </div>

          {/* Phase strip toggle */}
          <button
            onClick={() => setShowPhaseStrip(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
              showPhaseStrip
                ? 'bg-violet-600/30 text-violet-300 border border-violet-500/30'
                : 'bg-white/5 text-white/30 hover:text-white/50'
            }`}
            title="Показать полосы фаз (день/ночь)"
          >
            🌗 Фазы
          </button>

          <button
            onClick={reloadManual}
            className="ml-auto px-2 py-1 text-xs bg-white/5 rounded hover:bg-white/10 text-white/40"
          >↻</button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Name search */}
          <input
            type="text"
            placeholder="Поиск по имени..."
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            className="form-input text-xs w-44"
          />

          {/* Service filter */}
          <select value={filterService} onChange={e => setFilterService(e.target.value)} className="form-select text-xs">
            <option value="">Все службы</option>
            {services.map(s => <option key={s.service_id} value={s.service_id}>{s.service_name}</option>)}
          </select>

          {/* Schedule filter */}
          <select value={filterSchedule} onChange={e => setFilterSchedule(e.target.value)} className="form-select text-xs">
            <option value="">Все графики</option>
            {scheduleCodes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Shift filter */}
          <select value={filterShift} onChange={e => setFilterShift(e.target.value)} className="form-select text-xs">
            <option value="">Все смены</option>
            {[1, 2, 3, 4].map(n => <option key={n} value={n}>Смена {n}</option>)}
          </select>

          <span className="text-xs text-white/25 ml-auto">
            {filteredUsers.length} из {activeUsers.length} сотр.
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] text-white/35 flex-wrap">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500/30 inline-block" /> I день (авто)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500/60 inline-block border border-amber-500/50" /> I день (вручную)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500/30 inline-block" /> II ночь (авто)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500/60 inline-block border border-blue-500/50" /> II ночь (вручную)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white/10 inline-block" /> OFF</span>
          {showPhaseStrip && <>
            <span className="flex items-center gap-1"><span className="w-8 h-1.5 rounded bg-amber-500/50 inline-block" /> фаза день</span>
            <span className="flex items-center gap-1"><span className="w-8 h-1.5 rounded bg-blue-500/50 inline-block" /> фаза ночь</span>
          </>}
        </div>
      </div>

      {/* ── Grid ── */}
      <div ref={scrollRef} className="overflow-x-auto rounded-xl border border-white/10">
        <table className="border-collapse" style={{ minWidth: `${200 + days.length * 30 + 110}px` }}>
          {/* Header row */}
          <thead>
            <tr className="bg-white/5">
              <th className="sticky left-0 z-20 bg-[#0f1428] px-3 py-1.5 text-left text-xs text-white/40 border-r border-white/10 min-w-[200px]">
                Сотрудник
              </th>
              {days.map((d, i) => {
                const mb = monthBoundaries.find(b => b.idx === i)
                const isWE = isWeekend(d)
                const isTod = toDateStr(d) === today
                return (
                  <th
                    key={i}
                    className={`text-center text-[10px] font-medium border-b border-white/10 ${
                      mb ? 'border-l-2 border-l-white/20' : ''
                    } ${isWE ? 'bg-white/[0.02] text-white/25' : 'text-white/40'} ${isTod ? 'text-green-400' : ''}`}
                    style={{ width: 30, minWidth: 30 }}
                  >
                    {mb && (
                      <div className="text-[9px] text-white/30 border-b border-white/10 pb-0.5 mb-0.5 whitespace-nowrap px-1">
                        {mb.label}
                      </div>
                    )}
                    <div>{d.getDate()}</div>
                    <div className={`text-[9px] ${isWE ? 'text-red-400/50' : 'text-white/20'}`}>
                      {RU_DOW_SHORT[d.getDay()]}
                    </div>
                  </th>
                )
              })}
              <th className="sticky right-0 z-20 bg-[#0f1428] px-2 py-1.5 text-xs text-white/40 border-l border-white/10 min-w-[110px]">
                Итого
              </th>
            </tr>
          </thead>

          {/* Employee rows */}
          <tbody>
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={days.length + 2} className="px-4 py-8 text-center text-white/20 text-sm">
                  Нет сотрудников по выбранным фильтрам
                </td>
              </tr>
            )}
            {filteredUsers.map((user, ri) => {
              const { working, dayShifts, nightShifts, overrides } = userSummary(user)
              const schedCode = user.assignment?.schedule_code ?? ''
              const hasCyclic = CYCLIC_CODES.has(schedCode)
              const userPhases = phasesByUser.get(user.user_id) ?? []
              const svcName = user.service_id ? serviceMap.get(user.service_id) : undefined
              // Shorten service name for display
              const svcShort = svcName
                ? svcName.length > 20 ? svcName.slice(0, 18) + '…' : svcName
                : null

              return (
                <>
                  {/* Main row */}
                  <tr
                    key={user.user_id}
                    className={`border-b ${showPhaseStrip && hasCyclic ? 'border-white/0' : 'border-white/5'} ${ri % 2 === 0 ? '' : 'bg-white/[0.012]'}`}
                  >
                    {/* Employee name */}
                    <td className="sticky left-0 z-10 bg-[#0f1428] px-3 py-1 border-r border-white/10">
                      <div className="text-xs text-white/80 truncate max-w-[190px]">{user.full_name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {svcShort && (
                          <span className="text-[10px] text-white/30 truncate max-w-[120px]">{svcShort}</span>
                        )}
                        {schedCode && (
                          <span className="text-[10px] text-violet-400/60 font-medium">{schedCode}</span>
                        )}
                        {user.assignment?.shift_num && (
                          <span className="text-[10px] text-white/25">С{user.assignment.shift_num}</span>
                        )}
                      </div>
                    </td>

                    {/* Day cells */}
                    {days.map((d, di) => {
                      const cell = getCell(user, d)
                      const dateStr = toDateStr(d)
                      const key = `${user.user_id}_${dateStr}`
                      const isTod = dateStr === today
                      const mb = monthBoundaries.find(b => b.idx === di)
                      return (
                        <td
                          key={di}
                          className={`p-0.5 ${mb ? 'border-l-2 border-l-white/20' : ''} ${isWeekend(d) ? 'bg-white/[0.01]' : ''}`}
                        >
                          <PlanCell
                            cell={cell}
                            isToday={isTod}
                            saving={savingKey === key}
                            onClick={() => handleCellClick(user, d)}
                          />
                        </td>
                      )
                    })}

                    {/* Summary */}
                    <td className="sticky right-0 z-10 bg-[#0f1428] px-2 py-1 border-l border-white/10">
                      <div className="text-[10px] space-y-0.5">
                        <div className="text-white/50 font-medium">{working}р</div>
                        {(dayShifts > 0 || nightShifts > 0) && (
                          <div className="flex gap-1">
                            {dayShifts > 0  && <span className="text-amber-400/60">I:{dayShifts}</span>}
                            {nightShifts > 0 && <span className="text-blue-400/60">II:{nightShifts}</span>}
                          </div>
                        )}
                        {overrides > 0 && <div className="text-white/25">✏{overrides}</div>}
                      </div>
                    </td>
                  </tr>

                  {/* Phase strip row — only for cyclic schedules */}
                  {showPhaseStrip && hasCyclic && (
                    <tr key={`${user.user_id}_strip`} className={`border-b border-white/5 ${ri % 2 === 0 ? '' : 'bg-white/[0.012]'}`}>
                      <td className="sticky left-0 z-10 bg-[#0f1428] border-r border-white/10 px-3 py-0">
                        <span className="text-[9px] text-white/20 italic">
                          {userPhases.length === 0 ? 'нет фаз' : `фазы: ${userPhases.length}`}
                        </span>
                      </td>
                      {days.map((d, di) => {
                        const dateStr = toDateStr(d)
                        const phase = getActivePhase(user.user_id, dateStr)
                        const mb = monthBoundaries.find(b => b.idx === di)

                        // Check if this day is the start of a phase
                        const isPhaseStart = phase?.valid_from === dateStr

                        let bgCls = 'bg-transparent'
                        if (phase?.phase === 'day')   bgCls = 'bg-amber-500/40'
                        if (phase?.phase === 'night') bgCls = 'bg-blue-500/40'

                        return (
                          <td
                            key={di}
                            className={`p-0 ${bgCls} ${
                              isPhaseStart ? 'border-l-2 border-l-white/50' : ''
                            } ${mb ? 'border-l-2 border-l-white/20' : ''}`}
                            style={{ height: 5 }}
                            title={phase ? `Фаза: ${phase.phase === 'day' ? 'день' : 'ночь'} с ${phase.valid_from}` : 'нет фазы'}
                          />
                        )
                      })}
                      <td className="sticky right-0 z-10 bg-[#0f1428] border-l border-white/10 p-0" />
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer hint */}
      <p className="text-[11px] text-white/20 text-center">
        Клик по ячейке: пустая → I → II → OFF → авто. Тусклые ячейки — авто, яркие — вручную.
        {showPhaseStrip && <span className="ml-2">Тонкая полоска — период фазы (янтарь=день, синий=ночь).</span>}
      </p>
    </div>
  )
}
