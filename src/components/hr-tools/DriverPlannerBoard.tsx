'use client'
import { useState, useMemo, useCallback, useRef } from 'react'
import type { UserWithAssignment, ShiftPhase, AuthSession, DriverManualShift } from '@/types'
import { resolveShiftStatus } from '@/lib/shifts'
import { upsertDriverManualShift, deleteDriverManualShift, fetchDriverManualShifts } from '@/lib/api-client'

// ─── helpers ────────────────────────────────────────────────────────────────

const RU_MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                   'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const RU_DOW_SHORT = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']

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

// ─── types ────────────────────────────────────────────────────────────────

type SpanOption = 1 | 2 | 3

interface CellState {
  auto: 'I' | 'II' | null      // computed from schedule
  manual: 'I' | 'II' | 'OFF' | null  // override stored in DB
}

// Cell click cycles: auto→I→II→OFF→(clear manual)→auto
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

// ─── sub-components ────────────────────────────────────────────────────────

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
  session: AuthSession
  initialManualShifts?: DriverManualShift[]
}

export default function DriverPlannerBoard({ users, phases, session, initialManualShifts = [] }: Props) {
  const now = new Date()
  const [startYear, setStartYear]   = useState(now.getFullYear())
  const [startMonth, setStartMonth] = useState(now.getMonth())
  const [span, setSpan]             = useState<SpanOption>(1)
  const [manualShifts, setManualShifts] = useState<DriverManualShift[]>(initialManualShifts)
  const [savingKey, setSavingKey]   = useState<string | null>(null)
  const [filterGroup, setFilterGroup] = useState<string>('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const today = toDateStr(now)

  // All drivers
  const drivers = useMemo(() =>
    users.filter(u => u.assignment?.is_driver && u.is_active),
    [users]
  )

  const filteredDrivers = useMemo(() => {
    if (!filterGroup) return drivers
    return drivers.filter(u => String(u.assignment?.driver_group_number) === filterGroup)
  }, [drivers, filterGroup])

  // Days in the visible range
  const days = useMemo(() =>
    daysInRange(startYear, startMonth, span),
    [startYear, startMonth, span]
  )

  // Build month boundary indices for header separators
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

  // Phase index by userId → active phases array
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

  // Compute cell state for a driver × day
  const getCell = useCallback((user: UserWithAssignment, date: Date): CellState => {
    const dateStr = toDateStr(date)
    const manual = manualIndex.get(`${user.user_id}_${dateStr}`)

    // Auto compute from schedule
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

  // Cell click handler
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

  // Per-driver summary
  const driverSummary = useCallback((user: UserWithAssignment) => {
    let dayShifts = 0, nightShifts = 0, offOverrides = 0
    days.forEach(d => {
      const c = getCell(user, d)
      const shown = c.manual ?? c.auto
      if (shown === 'I')   dayShifts++
      if (shown === 'II')  nightShifts++
      if (shown === 'OFF') offOverrides++
    })
    const totalHours = (dayShifts + nightShifts) * 12
    return { dayShifts, nightShifts, offOverrides, totalHours }
  }, [days, getCell])

  // Reload manual shifts when period changes
  const reloadManual = useCallback(async () => {
    const dateFrom = toDateStr(days[0])
    const dateTo   = toDateStr(days[days.length - 1])
    const fresh = await fetchDriverManualShifts(dateFrom, dateTo)
    setManualShifts(fresh)
  }, [days])

  // Group options for filter
  const groupOptions = useMemo(() => {
    const groups = new Set<number>()
    drivers.forEach(u => { if (u.assignment?.driver_group_number) groups.add(u.assignment.driver_group_number) })
    return Array.from(groups).sort((a, b) => a - b)
  }, [drivers])

  const periodLabel = span === 1
    ? `${RU_MONTHS[startMonth]} ${startYear}`
    : `${RU_MONTHS[startMonth]} – ${RU_MONTHS[addMonths(startYear, startMonth, span - 1).month]} ${addMonths(startYear, startMonth, span - 1).year}`

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Period span */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
          {([1, 2, 3] as SpanOption[]).map(s => (
            <button
              key={s}
              onClick={() => setSpan(s)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                span === s ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >{s} {s === 1 ? 'мес' : 'мес'}</button>
          ))}
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <button onClick={prev} className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/60 text-sm">‹</button>
          <span className="text-sm font-medium text-white/80 min-w-[180px] text-center">{periodLabel}</span>
          <button onClick={next} className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/60 text-sm">›</button>
          <button onClick={goToday} className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/40 text-xs">сегодня</button>
        </div>

        {/* Group filter */}
        {groupOptions.length > 0 && (
          <select
            value={filterGroup}
            onChange={e => setFilterGroup(e.target.value)}
            className="form-select text-xs"
          >
            <option value="">Все группы</option>
            {groupOptions.map(g => <option key={g} value={g}>Группа {g}</option>)}
          </select>
        )}

        <button
          onClick={reloadManual}
          className="ml-auto px-2 py-1 text-xs bg-white/5 rounded hover:bg-white/10 text-white/40"
        >↻ обновить</button>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-white/40">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500/30 inline-block" /> I день</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500/30 inline-block" /> II ночь</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white/10 inline-block" /> OFF</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> вручную</span>
        </div>
      </div>

      {/* ── Grid ── */}
      <div ref={scrollRef} className="overflow-x-auto rounded-xl border border-white/10">
        <table className="border-collapse" style={{ minWidth: `${160 + days.length * 30 + 100}px` }}>
          {/* Month header row */}
          <thead>
            <tr className="bg-white/5">
              <th className="sticky left-0 z-20 bg-[#0f1428] px-3 py-1.5 text-left text-xs text-white/40 border-r border-white/10 min-w-[160px]">
                Водитель
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
                    } ${isWE ? 'bg-white/3 text-white/25' : 'text-white/40'} ${isTod ? 'text-green-400' : ''}`}
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
              <th className="sticky right-0 z-20 bg-[#0f1428] px-2 py-1.5 text-xs text-white/40 border-l border-white/10 min-w-[100px]">
                Итого
              </th>
            </tr>
          </thead>

          {/* Driver rows */}
          <tbody>
            {filteredDrivers.length === 0 && (
              <tr>
                <td colSpan={days.length + 2} className="px-4 py-8 text-center text-white/20 text-sm">
                  Нет водителей с назначенным графиком
                </td>
              </tr>
            )}
            {filteredDrivers.map((user, ri) => {
              const { dayShifts, nightShifts, offOverrides, totalHours } = driverSummary(user)
              const grp = user.assignment?.driver_group_number
              return (
                <tr
                  key={user.user_id}
                  className={`border-b border-white/5 ${ri % 2 === 0 ? '' : 'bg-white/[0.015]'}`}
                >
                  {/* Driver name */}
                  <td className="sticky left-0 z-10 bg-[#0f1428] px-3 py-1 border-r border-white/10">
                    <div className="text-xs text-white/80 truncate max-w-[150px]">{user.full_name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {grp && (
                        <span className="text-[10px] text-amber-400/60 font-medium">Гр.{grp}</span>
                      )}
                      <span className="text-[10px] text-white/25">
                        {user.assignment?.schedule_code === 'X/Y'
                          ? `${user.assignment.custom_work_days}/${user.assignment.custom_rest_days}`
                          : user.assignment?.schedule_code ?? '—'}
                      </span>
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
                        className={`p-0.5 ${mb ? 'border-l-2 border-l-white/20' : ''} ${isWeekend(d) ? 'bg-white/[0.015]' : ''}`}
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
                      <div className="flex gap-2">
                        <span className="text-amber-400/70">I:{dayShifts}</span>
                        <span className="text-blue-400/70">II:{nightShifts}</span>
                      </div>
                      <div className={`font-medium ${
                        totalHours > 208 ? 'text-red-400' :
                        totalHours > 188 ? 'text-amber-400' : 'text-white/40'
                      }`}>{totalHours}ч</div>
                      {offOverrides > 0 && <div className="text-white/25">off:{offOverrides}</div>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer hint */}
      <p className="text-[11px] text-white/20 text-center">
        Клик по ячейке: пустая → I → II → OFF → авто. Тусклые ячейки — авто по графику, яркие — ручное.
        <span className="ml-2 text-amber-400/40">● ручная отметка</span>
      </p>
    </div>
  )
}
