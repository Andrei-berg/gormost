'use client'
import { useMemo, useCallback, useRef } from 'react'
import type { UserWithAssignment, ShiftPhase, DriverManualShift, Schedule, Service } from '@/types'
import type { PlannerSettings, PlannerMode, PhaseEditorState, ScheduleEditorState, CellState } from './types'
import { CYCLIC_CODES, toDateStr, isWeekend, getMonthBoundaries, nextManual } from './utils'
import { resolveShiftStatus } from '@/lib/shifts'
import PlannerPhaseEditor from './PlannerPhaseEditor'
import PlannerScheduleEditor from './PlannerScheduleEditor'
import type { AuthSession } from '@/types'

// ─── DayCell ────────────────────────────────────────────────────────────────

function DayCell({
  cell, isToday, saving, compact, canEdit, isLight, onClick,
}: {
  cell: CellState
  isToday: boolean
  saving: boolean
  compact: boolean
  canEdit: boolean
  isLight: boolean
  onClick: () => void
}) {
  const shown = cell.manual ?? cell.auto
  const isManual = cell.manual !== null

  let cls = `relative w-full rounded text-[10px] font-medium transition-all select-none ${compact ? 'h-5' : 'h-7'} `

  if (shown === 'I') {
    cls += isManual
      ? isLight ? 'bg-amber-200 text-amber-800 border border-amber-400' : 'bg-amber-500/30 text-amber-200 border border-amber-500/50'
      : isLight ? 'bg-amber-50 text-amber-400 border border-transparent' : 'bg-amber-500/10 text-amber-400/40 border border-transparent'
    if (canEdit) cls += isLight ? ' hover:bg-amber-100 cursor-pointer' : ' hover:bg-amber-500/40 cursor-pointer'
  } else if (shown === 'II') {
    cls += isManual
      ? isLight ? 'bg-blue-200 text-blue-800 border border-blue-400' : 'bg-blue-500/30 text-blue-200 border border-blue-500/50'
      : isLight ? 'bg-blue-50 text-blue-400 border border-transparent' : 'bg-blue-500/10 text-blue-400/40 border border-transparent'
    if (canEdit) cls += isLight ? ' hover:bg-blue-100 cursor-pointer' : ' hover:bg-blue-500/40 cursor-pointer'
  } else if (shown === 'OFF') {
    cls += isLight ? 'bg-gray-100 text-gray-400 border border-gray-200' : 'bg-white/5 text-white/20 border border-white/10'
    if (canEdit) cls += isLight ? ' hover:bg-gray-200 cursor-pointer' : ' hover:bg-white/15 cursor-pointer'
  } else {
    cls += 'bg-transparent text-transparent border border-transparent'
    if (canEdit) cls += isLight ? ' hover:bg-gray-100 cursor-pointer' : ' hover:bg-white/5 cursor-pointer'
  }

  if (isToday) cls += ' ring-1 ring-green-400/60'
  if (saving)  cls += ' opacity-40 pointer-events-none'

  const label = shown === 'I' ? 'I' : shown === 'II' ? 'II' : shown === 'OFF' ? '—' : ''

  return (
    <button className={cls} onClick={canEdit ? onClick : undefined} title={isManual ? '✏ вручную' : 'авто'}>
      <span className="flex items-center justify-center h-full">{label}</span>
      {isManual && (
        <span className="absolute top-0 right-0 w-1 h-1 rounded-full bg-amber-400 m-0.5" />
      )}
    </button>
  )
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
  isLight: boolean
  onCellClick: (user: UserWithAssignment, date: Date) => void
  onPhaseStripClick: (user: UserWithAssignment, date: Date, phase: ShiftPhase | null, e: React.MouseEvent) => void
  onScheduleEditClick: (user: UserWithAssignment) => void
  onPhaseEditorClose: () => void
  onPhaseEditorSaved: () => void
  onScheduleEditorClose: () => void
  onScheduleEditorSaved: () => void
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function PlannerGrid({
  users, services, schedules, phases, manualShifts, days, settings, mode, canEdit, session,
  phaseEditorState, scheduleEditorState, savingKey, isLight,
  onCellClick, onPhaseStripClick, onScheduleEditClick,
  onPhaseEditorClose, onPhaseEditorSaved,
  onScheduleEditorClose, onScheduleEditorSaved,
}: Props) {
  // ── Theme tokens ─────────────────────────────────────────────────────────
  const stickyBg  = isLight ? 'bg-white'              : 'bg-[#0f1428]'
  const tableBdr  = isLight ? 'border-gray-200'        : 'border-white/10'
  const hdrBg     = isLight ? 'bg-gray-50'             : 'bg-white/5'
  const mutedTxt  = isLight ? 'text-gray-400'          : 'text-white/35'
  const bodyTxt   = isLight ? 'text-gray-800'          : 'text-white/80'
  const dimTxt    = isLight ? 'text-gray-300'          : 'text-white/20'
  const rowAlt    = isLight ? 'bg-gray-50/60'          : 'bg-white/[0.012]'
  const groupBg   = isLight ? 'bg-gray-100'            : 'bg-white/[0.03]'
  const groupTxt  = isLight ? 'text-gray-500'          : 'text-white/40'
  const cycTxt    = isLight ? 'text-violet-600/80'     : 'text-violet-400/60'
  const normSched = isLight ? 'text-gray-400'          : 'text-white/30'
  const weBg      = isLight ? 'bg-gray-100/60'         : 'bg-white/[0.01]'
  const editBtn   = isLight ? 'text-gray-300 hover:text-gray-600' : 'text-white/15 hover:text-white/60'
  const phaseLbl  = isLight ? 'text-gray-400 italic'   : 'text-white/15 italic'
  const mbBorder  = isLight ? 'border-l-gray-300'      : 'border-l-white/20'
  const phaseStart= isLight ? 'border-l-gray-400'      : 'border-l-white/40'
  const sumTxt    = isLight ? 'text-gray-600'          : 'text-white/45'
  const dayTxt    = isLight ? 'text-amber-600/80'      : 'text-amber-400/55'
  const nightTxt  = isLight ? 'text-blue-600/80'       : 'text-blue-400/55'
  const ovdTxt    = isLight ? 'text-gray-300'          : 'text-white/20'
  const today = toDateStr(new Date())
  const scrollRef = useRef<HTMLDivElement>(null)

  const monthBoundaries = useMemo(() => getMonthBoundaries(days), [days])

  // Service map
  const serviceMap = useMemo(() => {
    const m = new Map<string, string>()
    services.forEach(s => m.set(s.service_id, s.service_name))
    return m
  }, [services])

  // Phase index: userId → ShiftPhase[]
  const phasesByUser = useMemo(() => {
    const idx = new Map<string, ShiftPhase[]>()
    phases.forEach(p => {
      const arr = idx.get(p.employee_id) ?? []
      arr.push(p)
      idx.set(p.employee_id, arr)
    })
    return idx
  }, [phases])

  // Manual index: userId_date → DriverManualShift
  const manualIndex = useMemo(() => {
    const idx = new Map<string, DriverManualShift>()
    manualShifts.forEach(m => idx.set(`${m.user_id}_${m.shift_date}`, m))
    return idx
  }, [manualShifts])

  const getActivePhase = useCallback((userId: string, dateStr: string): ShiftPhase | null => {
    const ps = phasesByUser.get(userId) ?? []
    return ps.find(p => p.valid_from <= dateStr && (p.valid_to === null || p.valid_to >= dateStr)) ?? null
  }, [phasesByUser])

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
      if (status.working) auto = status.phase === 'night' ? 'II' : 'I'
    }

    return { auto, manual: manual ? manual.shift_type : null }
  }, [manualIndex, getActivePhase])

  const userSummary = useCallback((user: UserWithAssignment) => {
    let working = 0, day = 0, night = 0, overrides = 0
    days.forEach(d => {
      const c = getCell(user, d)
      const shown = c.manual ?? c.auto
      if (shown === 'I')   { working++; day++ }
      if (shown === 'II')  { working++; night++ }
      if (c.manual !== null) overrides++
    })
    return { working, day, night, overrides }
  }, [days, getCell])

  // Group by service if setting enabled
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

  const cellW = 30
  const nameW = 210
  const sumW  = settings.showSummaryCol ? 100 : 0
  const totalW = nameW + days.length * cellW + sumW

  if (days.length === 0) {
    return <div className={`text-center py-16 text-sm ${dimTxt}`}>Нет дней в выбранном периоде</div>
  }

  return (
    <div className="relative">
      {/* ── Table ── */}
      <div ref={scrollRef} className={`overflow-x-auto rounded-xl border ${tableBdr}`}>
        <table className="border-collapse" style={{ minWidth: totalW }}>
          {/* Month header */}
          <thead>
            <tr className={hdrBg}>
              <th
                className={`sticky left-0 z-20 ${stickyBg} px-3 py-2 text-left text-xs ${mutedTxt} border-r ${tableBdr}`}
                style={{ minWidth: nameW }}
              >
                Сотрудник
              </th>
              {days.map((d, i) => {
                const mb   = monthBoundaries.find(b => b.idx === i)
                const isWE = isWeekend(d)
                const isTd = toDateStr(d) === today
                return (
                  <th
                    key={i}
                    className={`text-center text-[10px] font-medium border-b ${tableBdr} ${
                      mb   ? `border-l-2 ${mbBorder}` : ''
                    } ${isWE ? `${weBg} ${dimTxt}` : mutedTxt} ${isTd ? '!text-green-500' : ''}`}
                    style={{ width: cellW, minWidth: cellW }}
                  >
                    {mb && (
                      <div className={`text-[9px] border-b ${tableBdr} pb-0.5 mb-0.5 whitespace-nowrap px-1 ${isLight ? 'text-gray-400' : 'text-white/25'}`}>
                        {mb.label}
                      </div>
                    )}
                    <div>{d.getDate()}</div>
                    <div className={`text-[9px] ${isWE ? 'text-red-400/60' : dimTxt}`}>
                      {['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][d.getDay()]}
                    </div>
                  </th>
                )
              })}
              {settings.showSummaryCol && (
                <th
                  className={`sticky right-0 z-20 ${stickyBg} px-2 py-2 text-xs ${mutedTxt} border-l ${tableBdr}`}
                  style={{ minWidth: sumW }}
                >
                  Итого
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {grouped.map(group => (
              <>
                {/* Service group header */}
                {settings.groupByService && group.label && (
                  <tr key={`grp_${group.serviceId}`} className={groupBg}>
                    <td
                      colSpan={days.length + (settings.showSummaryCol ? 2 : 1)}
                      className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider border-b ${tableBdr} ${groupTxt}`}
                    >
                      {group.label}
                      <span className={`ml-2 font-normal normal-case ${dimTxt}`}>{group.users.length} чел.</span>
                    </td>
                  </tr>
                )}

                {/* Employee rows */}
                {group.users.length === 0 && (
                  <tr key={`empty_${group.serviceId}`}>
                    <td colSpan={days.length + (settings.showSummaryCol ? 2 : 1)} className={`px-3 py-4 text-center text-xs ${dimTxt}`}>
                      Нет сотрудников
                    </td>
                  </tr>
                )}
                {group.users.map((user, ri) => {
                  const schedCode   = user.assignment?.schedule_code ?? ''
                  const hasCyclic   = CYCLIC_CODES.has(schedCode)
                  const userPhases  = phasesByUser.get(user.user_id) ?? []
                  const { working, day, night, overrides } = userSummary(user)
                  const rowBg = ri % 2 === 0 ? '' : rowAlt
                  const hasIssue = hasCyclic && userPhases.length === 0 && canEdit

                  return (
                    <>
                      {/* Main employee row */}
                      <tr
                        key={user.user_id}
                        className={`${rowBg} ${settings.showPhaseStrips && hasCyclic ? 'border-b-0' : `border-b ${tableBdr}`}`}
                      >
                        {/* Employee name cell */}
                        <td className={`sticky left-0 z-10 ${stickyBg} px-3 py-1 border-r ${tableBdr}`} style={{ minWidth: nameW }}>
                          <div className="flex items-center gap-1.5">
                            {hasIssue && <span title="Нет фаз для циклического графика" className="text-amber-400 text-[10px]">⚠️</span>}
                            <div className={`text-xs truncate max-w-[155px] ${bodyTxt}`}>{user.full_name}</div>
                            {canEdit && (
                              <button
                                onClick={() => onScheduleEditClick(user)}
                                className={`ml-auto text-[10px] shrink-0 transition-colors ${editBtn}`}
                                title="Изменить график"
                              >✎</button>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {schedCode && (
                              <span className={`text-[10px] font-medium ${hasCyclic ? cycTxt : normSched}`}>{schedCode}</span>
                            )}
                            {user.assignment?.shift_num && (
                              <span className={`text-[10px] ${dimTxt}`}>С{user.assignment.shift_num}</span>
                            )}
                          </div>
                        </td>

                        {/* Day cells */}
                        {days.map((d, di) => {
                          const dateStr = toDateStr(d)
                          const key = `${user.user_id}_${dateStr}`
                          const cell = getCell(user, d)
                          const mb = monthBoundaries.find(b => b.idx === di)
                          return (
                            <td
                              key={di}
                              className={`p-0.5 ${mb ? `border-l-2 ${mbBorder}` : ''} ${isWeekend(d) ? weBg : ''}`}
                            >
                              <DayCell
                                cell={cell}
                                isToday={dateStr === today}
                                saving={savingKey === key}
                                compact={settings.compactRows}
                                canEdit={canEdit}
                                isLight={isLight}
                                onClick={() => onCellClick(user, d)}
                              />
                            </td>
                          )
                        })}

                        {/* Summary */}
                        {settings.showSummaryCol && (
                          <td className={`sticky right-0 z-10 ${stickyBg} px-2 py-1 border-l ${tableBdr}`} style={{ minWidth: sumW }}>
                            <div className="text-[10px] space-y-0.5">
                              <div className={`font-medium ${sumTxt}`}>{working}р</div>
                              {(day > 0 || night > 0) && (
                                <div className="flex gap-1.5">
                                  {day   > 0 && <span className={dayTxt}>I:{day}</span>}
                                  {night > 0 && <span className={nightTxt}>II:{night}</span>}
                                </div>
                              )}
                              {overrides > 0 && <div className={ovdTxt}>✏{overrides}</div>}
                            </div>
                          </td>
                        )}
                      </tr>

                      {/* Phase strip */}
                      {settings.showPhaseStrips && hasCyclic && (
                        <tr
                          key={`${user.user_id}_strip`}
                          className={`${rowBg} border-b ${tableBdr}`}
                        >
                          <td className={`sticky left-0 z-10 ${stickyBg} border-r ${tableBdr} px-3 py-0`} style={{ minWidth: nameW }}>
                            <span className={`text-[9px] ${phaseLbl}`}>
                              {userPhases.length === 0
                                ? (canEdit ? '+ добавить фазу' : 'нет фаз')
                                : `${userPhases.length} фаз`}
                            </span>
                          </td>
                          {days.map((d, di) => {
                            const dateStr = toDateStr(d)
                            const phase = getActivePhase(user.user_id, dateStr)
                            const mb = monthBoundaries.find(b => b.idx === di)
                            const isStart = phase?.valid_from === dateStr

                            // Only color when the worker is actually on duty that day
                            const cell = getCell(user, d)
                            const isWorking = (cell.manual ?? cell.auto) !== null

                            let bgCls = 'bg-transparent'
                            if (phase && isWorking) {
                              if (phase.phase === 'day')   bgCls = 'bg-amber-500/35'
                              if (phase.phase === 'night') bgCls = 'bg-blue-500/35'
                            }

                            return (
                              <td
                                key={di}
                                className={`p-0 ${bgCls} ${isStart ? `border-l-2 ${phaseStart}` : ''} ${mb ? `border-l-2 ${mbBorder}` : ''} ${
                                  canEdit ? 'cursor-pointer hover:brightness-125' : ''
                                }`}
                                style={{ height: 6 }}
                                title={
                                  phase
                                    ? `${phase.phase === 'day' ? '☀️ День' : '🌙 Ночь'} · с ${phase.valid_from}${phase.valid_to ? ` по ${phase.valid_to}` : ''}`
                                    : canEdit ? 'Нажмите чтобы добавить фазу' : 'Нет фазы'
                                }
                                onClick={canEdit ? e => onPhaseStripClick(user, d, phase, e) : undefined}
                              />
                            )
                          })}
                          {settings.showSummaryCol && (
                            <td className={`sticky right-0 z-10 ${stickyBg} border-l ${tableBdr} p-0`} style={{ minWidth: sumW }} />
                          )}
                        </tr>
                      )}
                    </>
                  )
                })}
              </>
            ))}

            {users.length === 0 && (
              <tr>
                <td colSpan={days.length + (settings.showSummaryCol ? 2 : 1)} className={`px-4 py-12 text-center text-sm ${dimTxt}`}>
                  Нет сотрудников по выбранным фильтрам
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Phase editor popup ── */}
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

      {/* ── Schedule editor popup ── */}
      {scheduleEditorState && (
        <div
          className="fixed z-9999 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ zIndex: 9999 }}
        >
          <PlannerScheduleEditor
            user={scheduleEditorState.user}
            schedules={schedules}
            session={session}
            onClose={onScheduleEditorClose}
            onSaved={onScheduleEditorSaved}
          />
        </div>
      )}

      {/* backdrop for schedule editor */}
      {scheduleEditorState && (
        <div
          className="fixed inset-0 bg-black/40 z-[9998]"
          onClick={onScheduleEditorClose}
        />
      )}
    </div>
  )
}
