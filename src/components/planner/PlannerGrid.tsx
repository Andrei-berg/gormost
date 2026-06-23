'use client'
import { useState, useCallback, useMemo, useEffect } from 'react'
import type { UserWithAssignment, ShiftPhase, DriverManualShift, Schedule, Service } from '@/types'
import type { PlannerSettings, PlannerMode, PhaseEditorState, ScheduleEditorState, CellState } from './types'
import { CYCLIC_CODES, toDateStr, isWeekend, getMonthBoundaries } from './utils'
import { resolveShiftStatus, getShiftForDate } from '@/lib/shifts'
import { phaseMeta } from '@/lib/workSchedule'
import PlannerPhaseEditor from './PlannerPhaseEditor'
import PlannerScheduleEditor from './PlannerScheduleEditor'
import type { AuthSession } from '@/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const DOW = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const MONTH_GEN = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

const NAME_W = 220
const DAY_W  = 32
const TOTAL_W = 92

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cellTypeLabel(shown: 'I' | 'II' | 'OFF', isManual: boolean): string {
  const src = isManual ? 'вручную' : 'авто'
  if (shown === 'I')   return `ДЕНЬ · ${src}`
  if (shown === 'II')  return `НОЧЬ · ${src}`
  if (shown === 'OFF') return `ВЫХ · ${src}`
  return '—'
}

function blockColor(shown: 'I' | 'II' | 'OFF', isManual: boolean): string {
  if (shown === 'I')   return isManual ? 'rgba(240,165,0,0.92)'   : 'rgba(249,115,22,0.85)'
  if (shown === 'II')  return isManual ? 'rgba(111,168,255,0.92)' : 'rgba(56,139,253,0.78)'
  return 'transparent'
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  users: UserWithAssignment[]
  services: Service[]
  schedules: Schedule[]
  phases: ShiftPhase[]
  manualShifts: DriverManualShift[]
  days: Date[]
  settings: PlannerSettings
  mode: PlannerMode
  canEdit: boolean
  session: AuthSession
  phaseEditorState: PhaseEditorState | null
  scheduleEditorState: ScheduleEditorState | null
  savingKey: string | null
  selectedUserId: string | null
  onCellApply: (user: UserWithAssignment, date: Date, value: 'I' | 'II' | 'OFF' | null) => void
  onUserClick: (user: UserWithAssignment) => void
  onPhaseStripClick: (user: UserWithAssignment, date: Date, phase: ShiftPhase | null, e: React.MouseEvent) => void
  onScheduleEditClick: (user: UserWithAssignment) => void
  onPhaseEditorClose: () => void
  onPhaseEditorSaved: () => void
  onScheduleEditorClose: () => void
  onScheduleEditorSaved: () => void
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function PlannerGrid({
  users, services, schedules, phases, manualShifts, days, settings, canEdit, session,
  phaseEditorState, scheduleEditorState, savingKey, selectedUserId,
  onCellApply, onUserClick, onPhaseStripClick, onScheduleEditClick,
  onPhaseEditorClose, onPhaseEditorSaved,
  onScheduleEditorClose, onScheduleEditorSaved,
}: Props) {
  const today = toDateStr(new Date())

  // ── Tooltip + popover state ───────────────────────────────────────────────
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)
  const [popover, setPopover] = useState<{
    x: number; y: number
    user: UserWithAssignment; date: Date; current: 'I' | 'II' | 'OFF' | null
  } | null>(null)

  const closePopover = useCallback(() => setPopover(null), [])
  useEffect(() => {
    if (!popover) return
    const handler = () => closePopover()
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [popover, closePopover])

  // ── Indexes ───────────────────────────────────────────────────────────────
  const phasesByUser = useMemo(() => {
    const idx = new Map<string, ShiftPhase[]>()
    phases.forEach(p => {
      const arr = idx.get(p.employee_id) ?? []
      arr.push(p)
      idx.set(p.employee_id, arr)
    })
    return idx
  }, [phases])

  const manualIndex = useMemo(() => {
    const idx = new Map<string, DriverManualShift>()
    manualShifts.forEach(m => idx.set(`${m.user_id}_${m.shift_date}`, m))
    return idx
  }, [manualShifts])

  const serviceMap = useMemo(() => {
    const m = new Map<string, string>()
    services.forEach(s => m.set(s.service_id, s.service_name))
    return m
  }, [services])

  const monthBoundaries = useMemo(() => getMonthBoundaries(days), [days])

  // ── Cell computation ──────────────────────────────────────────────────────
  const getActivePhase = useCallback((userId: string, dateStr: string): ShiftPhase | null => {
    const ps = phasesByUser.get(userId) ?? []
    return ps.find(p => p.valid_from <= dateStr && (p.valid_to === null || p.valid_to >= dateStr)) ?? null
  }, [phasesByUser])

  const getCell = useCallback((user: UserWithAssignment, date: Date): CellState => {
    const dateStr = toDateStr(date)
    const manualRec = manualIndex.get(`${user.user_id}_${dateStr}`)
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
      if (status.working) auto = status.phase === 'night' ? 'II' : 'I'
    }
    return { auto, manual: manualRec ? manualRec.shift_type : null }
  }, [manualIndex, getActivePhase])

  const userSummary = useCallback((user: UserWithAssignment, rowCells: CellState[]) => {
    let working = 0, day = 0, night = 0, overrides = 0
    rowCells.forEach(c => {
      const shown = c.manual ?? c.auto
      if (shown === 'I')   { working++; day++ }
      if (shown === 'II')  { working++; night++ }
      if (c.manual !== null) overrides++
    })
    return { working, day, night, overrides }
  }, [])

  // ── Group by service ──────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    if (!settings.groupByService) return [{ serviceId: '', label: '', users }]
    const order: string[] = []
    const map = new Map<string, UserWithAssignment[]>()
    users.forEach(u => {
      const sid = u.service_id ?? '__none__'
      if (!map.has(sid)) { map.set(sid, []); order.push(sid) }
      map.get(sid)!.push(u)
    })
    return order.map(sid => ({
      serviceId: sid,
      label: sid === '__none__' ? 'Без службы' : (serviceMap.get(sid) ?? sid),
      users: map.get(sid)!,
    }))
  }, [users, settings.groupByService, serviceMap])

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const t = {
    border:    'border-white/10',
    hdrBg:     'bg-black/40',
    hdrTxt:    'text-white/35',
    rowHover:  'hover:bg-white/[0.02]',
    nameCol:   'bg-transparent border-white/[0.04]',
    stickyBg:  'bg-[#0d1117]',
    svcBar:    'bg-black/25',
    svcTxt:    'text-white/50',
    rowBdr:    'border-white/[0.04]',
    nameTxt:   'text-white/85',
    mutedTxt:  'text-white/35',
    dimTxt:    'text-white/20',
    totalBdr:  'border-white/10',
    weBg:      'bg-white/[0.01]',
    todayBg:   'bg-amber-500/10',
    todayBdr:  'border-amber-400/50',
    gridLine:  'border-white/5',
    editBtn:   'text-white/10 hover:text-white/60',
    phaseLbl:  'text-white/15 italic',
    phaseStart: 'border-l-white/40',
    mbBorder:  'border-l-white/20',
    cycTxt:    'text-violet-400/60',
    normSched: 'text-white/30',
    sumTxt:    'text-white/50',
    warningTxt: 'text-amber-400',
  }

  const totalGridW = NAME_W + days.length * DAY_W + TOTAL_W

  if (days.length === 0) {
    return <div className={`text-center py-16 text-sm ${t.dimTxt}`}>Нет дней в выбранном периоде</div>
  }

  return (
    <div className="relative">
      {/* ── Scrollable grid ── */}
      <div className={`overflow-x-auto rounded-xl border ${t.border}`}>
        <div style={{ minWidth: totalGridW }}>

          {/* ── Sticky header ── */}
          <div
            className={`sticky top-0 z-10 flex border-b ${t.border} ${t.hdrBg} font-mono`}
          >
            {/* Name col */}
            <div
              style={{ width: NAME_W, minWidth: NAME_W }}
              className={`px-4 py-2.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest ${t.hdrTxt} sticky left-0 ${t.hdrBg} z-10 border-r ${t.border}`}
            >
              Сотрудник <span className={`text-[9px] ${t.dimTxt}`}>▾</span>
            </div>

            {/* Day columns */}
            {days.map((d, di) => {
              const isWE = isWeekend(d)
              const isTd = toDateStr(d) === today
              const mb = monthBoundaries.find(b => b.idx === di)
              const shiftNum = getShiftForDate(d).shiftNumber
              // Mark shift change (when shift wraps 4→1)
              const prevShift = di > 0 ? getShiftForDate(days[di - 1]).shiftNumber : null
              const isShiftChange = prevShift !== null && shiftNum !== prevShift

              return (
                <div
                  key={di}
                  style={{ width: DAY_W, minWidth: DAY_W }}
                  className={`relative flex flex-col items-center justify-center py-1.5 border-l ${t.gridLine} text-[10px]
                    ${isWE ? t.weBg : ''}
                    ${isTd ? t.todayBg : ''}
                    ${mb ? `border-l-2 ${t.mbBorder}` : ''}
                  `}
                >
                  {mb && (
                    <div className={`absolute top-0 left-0 right-0 text-[8px] text-center pb-0.5 border-b ${t.border} ${t.dimTxt} whitespace-nowrap overflow-hidden`}>
                      {mb.label}
                    </div>
                  )}
                  <span className={`text-[12px] font-semibold leading-none ${isTd ? 'text-amber-400' : isWE ? t.dimTxt : t.hdrTxt}`}>
                    {d.getDate()}
                  </span>
                  <span className={`text-[9px] mt-0.5 ${isTd ? 'text-amber-400/70' : isWE ? 'text-red-400/50' : t.dimTxt}`}>
                    {DOW[d.getDay()]}
                  </span>
                  {isShiftChange && (
                    <span className="absolute top-0.5 right-0.5 text-[7px] font-bold text-white/20">С{shiftNum}</span>
                  )}
                  {isTd && (
                    <span className={`absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400/50`} />
                  )}
                </div>
              )
            })}

            {/* Total col */}
            <div
              style={{ width: TOTAL_W, minWidth: TOTAL_W }}
              className={`flex items-center justify-center text-[11px] font-semibold uppercase tracking-widest ${t.hdrTxt} border-l ${t.totalBdr}`}
            >
              Итого
            </div>
          </div>

          {/* ── Body ── */}
          {grouped.map(group => (
            <div key={group.serviceId}>
              {/* Service bar */}
              {settings.groupByService && group.label && (
                <div className={`flex items-center gap-2 px-4 py-2 border-b ${t.border} border-t ${t.border} ${t.svcBar}`}>
                  <span className={`text-[11px] font-bold uppercase tracking-widest ${t.svcTxt}`}>{group.label}</span>
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full border ${t.border} ${t.mutedTxt} font-medium normal-case tracking-normal bg-white/5`}>
                    {group.users.length} чел.
                  </span>
                  <span className={`ml-auto ${t.dimTxt} text-[11px]`}>▾</span>
                </div>
              )}

              {/* Rows */}
              {group.users.length === 0 && (
                <div className={`px-4 py-6 text-center text-xs ${t.dimTxt}`}>Нет сотрудников</div>
              )}

              {group.users.map((user) => {
                const schedCode   = user.assignment?.schedule_code ?? ''
                const hasCyclic   = CYCLIC_CODES.has(schedCode)
                const userPhases  = phasesByUser.get(user.user_id) ?? []
                const hasIssue    = hasCyclic && userPhases.length === 0 && canEdit
                const isSelected  = user.user_id === selectedUserId
                const rowCells    = days.map(d => getCell(user, d))
                const { working, day, night, overrides } = userSummary(user, rowCells)
                const isSaving    = savingKey?.startsWith(user.user_id)

                return (
                  <div key={user.user_id}>
                    {/* Main employee row */}
                    <div
                      className={`flex border-b ${t.rowBdr} ${t.rowHover} ${isSaving ? 'opacity-60' : ''}`}
                      style={{ height: settings.compactRows ? 32 : 44 }}
                    >
                      {/* Name cell */}
                      <div
                        style={{ width: NAME_W, minWidth: NAME_W }}
                        className={`sticky left-0 z-[5] px-3 flex flex-col justify-center gap-0.5 border-r ${t.rowBdr} cursor-pointer ${isSelected ? 'bg-amber-500/10' : t.stickyBg}`}
                        onClick={() => onUserClick(user)}
                      >
                        <div className="flex items-center gap-1.5">
                          {hasIssue && (
                            <span className={`text-[10px] shrink-0 ${t.warningTxt}`} title="Нет фаз для циклического графика">⚠</span>
                          )}
                          <span className={`text-[13px] font-medium truncate ${isSelected ? 'text-amber-400' : t.nameTxt}`}>
                            {user.full_name}
                          </span>
                          {canEdit && (
                            <button
                              onClick={e => { e.stopPropagation(); onScheduleEditClick(user) }}
                              className={`ml-auto text-[10px] shrink-0 transition-colors ${t.editBtn}`}
                              title="Изменить график"
                            >✎</button>
                          )}
                        </div>
                        <div className={`flex items-center gap-1.5`}>
                          {schedCode && (
                            <span className={`text-[10px] font-mono font-medium ${hasCyclic ? t.cycTxt : t.normSched}`}>
                              {schedCode}
                            </span>
                          )}
                          {user.assignment?.shift_num && (
                            <span className={`text-[10px] font-mono ${t.dimTxt}`}>С{user.assignment.shift_num}</span>
                          )}
                        </div>
                      </div>

                      {/* Day cells */}
                      {days.map((d, di) => {
                        const cell = rowCells[di]
                        const shown = cell.manual ?? cell.auto
                        const isManual = cell.manual !== null
                        const isOff = shown === 'OFF'
                        const blockShown = (!isOff && shown) ? shown as 'I' | 'II' : null
                        const isWE = isWeekend(d)
                        const isTd = toDateStr(d) === today
                        const mb = monthBoundaries.find(b => b.idx === di)
                        const isActive = popover?.user.user_id === user.user_id && popover?.date === d

                        // Block joining (visual merge of adjacent same-type cells)
                        const leftShown  = di > 0 ? (rowCells[di - 1].manual ?? rowCells[di - 1].auto) : null
                        const rightShown = di < days.length - 1 ? (rowCells[di + 1].manual ?? rowCells[di + 1].auto) : null
                        const joinsLeft  = shown !== null && !isOff && leftShown === shown
                        const joinsRight = shown !== null && !isOff && rightShown === shown

                        const dateStr = toDateStr(d)
                        const isSavingCell = savingKey === `${user.user_id}_${dateStr}`

                        return (
                          <div
                            key={di}
                            style={{ width: DAY_W, minWidth: DAY_W }}
                            className={`relative border-l ${t.gridLine} flex items-center justify-center
                              ${isWE ? t.weBg : ''}
                              ${mb ? `border-l-2 ${t.mbBorder}` : ''}
                              ${canEdit ? 'cursor-pointer' : ''}
                              ${isSavingCell ? 'opacity-30' : ''}
                              ${isActive ? 'bg-amber-500/10' : ''}
                            `}
                            onMouseEnter={(e) => {
                              if (isActive) return
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                              const shiftNum = getShiftForDate(d).shiftNumber
                              const txt = `${d.getDate()} ${MONTH_GEN[d.getMonth()]} · ${DOW[d.getDay()]}${shown && !isOff ? ` · ${cellTypeLabel(shown as 'I' | 'II' | 'OFF', isManual)}` : shown === 'OFF' ? ' · ВЫХ · вручную' : ' · ВЫХ'} · Смена ${shiftNum}`
                              setTooltip({ x: rect.left + rect.width / 2, y: rect.top, text: txt })
                            }}
                            onMouseLeave={() => setTooltip(null)}
                            onClick={(e) => {
                              if (!canEdit) return
                              e.stopPropagation()
                              setTooltip(null)
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                              setPopover({ x: rect.left + rect.width / 2, y: rect.bottom + 4, user, date: d, current: shown as 'I' | 'II' | 'OFF' | null })
                            }}
                          >
                            {/* Today column borders */}
                            {isTd && <span className={`absolute inset-y-0 left-0 w-px bg-amber-400/50`} />}
                            {isTd && <span className={`absolute inset-y-0 right-0 w-px bg-amber-400/50`} />}

                            {/* Work block */}
                            {blockShown && (
                              <div
                                className="absolute flex items-center justify-center"
                                style={{
                                  left:   joinsLeft  ? -1    : 2,
                                  right:  joinsRight ? -1    : 2,
                                  top: settings.compactRows ? 3 : 6,
                                  bottom: settings.compactRows ? 3 : 6,
                                  backgroundColor: blockColor(blockShown, isManual),
                                  borderRadius: `${joinsLeft ? 0 : 4}px ${joinsRight ? 0 : 4}px ${joinsRight ? 0 : 4}px ${joinsLeft ? 0 : 4}px`,
                                  outline: isManual ? '1px dashed rgba(255,255,255,0.5)' : 'none',
                                  outlineOffset: -2,
                                }}
                              >
                                {isManual && <span className="absolute top-0.5 right-0.5 text-[7px] text-white/70 leading-none">✎</span>}
                              </div>
                            )}

                            {/* OFF manual marker */}
                            {isOff && (
                              <div
                                className="absolute inset-x-0.5 text-center"
                                style={{ top: settings.compactRows ? 3 : 6, bottom: settings.compactRows ? 3 : 6 }}
                              >
                                <span className={`text-[9px] font-mono text-red-400/60`}>—</span>
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* Total cell */}
                      <div
                        style={{ width: TOTAL_W, minWidth: TOTAL_W }}
                        className={`sticky right-0 z-[5] flex flex-col items-center justify-center border-l ${t.totalBdr} font-mono gap-0.5 ${t.stickyBg}`}
                      >
                        <span className={`text-[12px] font-bold leading-none ${working === 0 ? t.dimTxt : t.sumTxt}`}>{working}р</span>
                        {(day > 0 || night > 0) && (
                          <span className={`text-[9px] ${t.dimTxt}`}>
                            {day > 0 ? `I:${day}` : ''}{day > 0 && night > 0 ? ' ' : ''}{night > 0 ? `II:${night}` : ''}
                          </span>
                        )}
                        {overrides > 0 && <span className={`text-[8px] ${t.mutedTxt}`}>✎{overrides}</span>}
                      </div>
                    </div>

                    {/* Phase strip */}
                    {settings.showPhaseStrips && hasCyclic && (
                      <div className={`flex border-b ${t.rowBdr}`} style={{ height: 6 }}>
                        <div
                          style={{ width: NAME_W, minWidth: NAME_W }}
                          className={`sticky left-0 z-[5] px-3 flex items-center border-r ${t.rowBdr} ${t.stickyBg}`}
                        >
                          {userPhases.length === 0 && canEdit && (
                            <span className={`text-[8px] ${t.phaseLbl}`}>+ фаза</span>
                          )}
                        </div>
                        {days.map((d, di) => {
                          const dateStr = toDateStr(d)
                          const phase = getActivePhase(user.user_id, dateStr)
                          const mb = monthBoundaries.find(b => b.idx === di)
                          const isStart = phase?.valid_from === dateStr
                          const cell = rowCells[di]
                          const isWorking = (cell.manual ?? cell.auto) !== null && (cell.manual ?? cell.auto) !== 'OFF'

                          // Phase fill colour from the эталон (phaseMeta), ~35% alpha
                          const cellStyle: React.CSSProperties = { width: DAY_W, minWidth: DAY_W }
                          if (phase && isWorking) cellStyle.background = phaseMeta(phase.phase).color + '59'
                          const pm = phase ? phaseMeta(phase.phase) : null

                          return (
                            <div
                              key={di}
                              style={cellStyle}
                              className={`${isStart ? `border-l-2 ${t.phaseStart}` : `border-l ${t.gridLine}`} ${mb ? `border-l-2 ${t.mbBorder}` : ''} ${canEdit ? 'cursor-pointer hover:brightness-125' : ''}`}
                              title={pm ? `${pm.emoji} ${pm.label} · с ${phase!.valid_from}${phase!.valid_to ? ` по ${phase!.valid_to}` : ''}` : canEdit ? 'Нажмите чтобы добавить фазу' : 'Нет фазы'}
                              onClick={canEdit ? e => onPhaseStripClick(user, d, phase, e) : undefined}
                            />
                          )
                        })}
                        <div style={{ width: TOTAL_W, minWidth: TOTAL_W }} className={`sticky right-0 z-[5] border-l ${t.totalBdr} ${t.stickyBg}`} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}

          {users.length === 0 && (
            <div className={`px-4 py-12 text-center text-sm ${t.dimTxt}`}>
              Нет сотрудников по выбранным фильтрам
            </div>
          )}
        </div>
      </div>

      {/* ── Fixed tooltip ── */}
      {tooltip && (
        <div
          style={{ position: 'fixed', top: tooltip.y - 36, left: tooltip.x, transform: 'translateX(-50%)', zIndex: 300, pointerEvents: 'none' }}
          className="bg-[rgba(8,12,28,0.96)] border border-white/18 text-white/90 text-[11px] font-mono px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-2xl"
        >
          {tooltip.text}
        </div>
      )}

      {/* ── Cell popover ── */}
      {popover && canEdit && (
        <div
          style={{ position: 'fixed', top: popover.y, left: popover.x, transform: 'translateX(-50%)', zIndex: 300 }}
          className="bg-[rgba(8,12,28,0.97)] border border-white/18 rounded-xl p-2 flex gap-1 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => { onCellApply(popover.user, popover.date, 'I'); closePopover() }}
            className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-gray-900 cursor-pointer border-0"
            style={{ background: 'rgba(249,115,22,0.85)' }}
          >
            День
          </button>
          <button
            onClick={() => { onCellApply(popover.user, popover.date, 'II'); closePopover() }}
            className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-white cursor-pointer border-0"
            style={{ background: 'rgba(56,139,253,0.78)' }}
          >
            Ночь
          </button>
          <button
            onClick={() => { onCellApply(popover.user, popover.date, 'OFF'); closePopover() }}
            className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-white/50 cursor-pointer border border-white/15 bg-transparent"
          >
            Выходной
          </button>
          <button
            onClick={() => { onCellApply(popover.user, popover.date, null); closePopover() }}
            className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-red-400 cursor-pointer border border-red-500/30 bg-transparent"
          >
            × Отменить
          </button>
        </div>
      )}

      {/* ── Phase editor ── */}
      {phaseEditorState && (
        <PlannerPhaseEditor
          userId={phaseEditorState.userId}
          userName={phaseEditorState.userName}
          scheduleCode={phaseEditorState.scheduleCode}
          rotationGroup={phaseEditorState.rotationGroup}
          clickedDate={phaseEditorState.clickedDate}
          existingPhase={phaseEditorState.existingPhase}
          posX={phaseEditorState.posX}
          posY={phaseEditorState.posY}
          session={session}
          onClose={onPhaseEditorClose}
          onSaved={onPhaseEditorSaved}
        />
      )}

      {/* ── Schedule editor ── */}
      {scheduleEditorState && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[9998]" onClick={onScheduleEditorClose} />
          <div className="fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <PlannerScheduleEditor
              user={scheduleEditorState.user}
              schedules={schedules}
              session={session}
              onClose={onScheduleEditorClose}
              onSaved={onScheduleEditorSaved}
            />
          </div>
        </>
      )}
    </div>
  )
}
