'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import type { AuthSession, UserWithAssignment, ShiftPhase } from '@/types'
import {
  fetchUsersWithAssignments, fetchServices, fetchSchedules,
  fetchAllShiftPhases, fetchDriverManualShifts,
  upsertDriverManualShift, deleteDriverManualShift,
} from '@/lib/api'
import type { DriverManualShift } from '@/types'
import {
  DEFAULT_SETTINGS, DEFAULT_FILTERS,
  type PlannerSettings, type PlannerFilters,
  type PlannerMode, type SpanMonths,
  type PhaseEditorState, type ScheduleEditorState,
} from './types'
import { addMonths, daysInRange, toDateStr, CYCLIC_CODES } from './utils'
import { resolveShiftStatus } from '@/lib/shifts'
import { useTheme } from '@/lib/ThemeContext'
import ShiftRotationStrip from '@/components/ShiftRotationStrip'
import PlannerToolbar from './PlannerToolbar'
import PlannerSettingsPanel from './PlannerSettings'
import PlannerGrid from './PlannerGrid'

interface Props {
  session: AuthSession
}

export default function PlannerShell({ session }: Props) {
  // ── Data ────────────────────────────────────────────────────────────────
  const [users,    setUsers]    = useState<UserWithAssignment[]>([])
  const [services, setServices] = useState<ReturnType<typeof useState<[]>>[0]>([])
  const [schedules, setSchedules] = useState<ReturnType<typeof useState<[]>>[0]>([])
  const [phases,   setPhases]   = useState<ShiftPhase[]>([])
  const [manualShifts, setManualShifts] = useState<DriverManualShift[]>([])
  const [loading,  setLoading]  = useState(true)

  // ── Period ───────────────────────────────────────────────────────────────
  const now = new Date()
  const [startYear,  setStartYear]  = useState(now.getFullYear())
  const [startMonth, setStartMonth] = useState(now.getMonth())
  const [span,       setSpan]       = useState<SpanMonths>(1)

  // ── UI state ─────────────────────────────────────────────────────────────
  const [filters,      setFilters]      = useState<PlannerFilters>(() => {
    const isHead = session.role_level === 'HEAD'
    return { ...DEFAULT_FILTERS, serviceId: isHead ? (session.service_id ?? '') : '' }
  })
  const [settings,     setSettings]     = useState<PlannerSettings>(DEFAULT_SETTINGS)
  const [mode,         setMode]         = useState<PlannerMode>('view')
  const [showSettings, setShowSettings] = useState(false)
  const [savingKey,    setSavingKey]    = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserWithAssignment | null>(null)

  // ── Editor states ────────────────────────────────────────────────────────
  const [phaseEditor,    setPhaseEditor]    = useState<PhaseEditorState | null>(null)
  const [scheduleEditor, setScheduleEditor] = useState<ScheduleEditorState | null>(null)

  // ── Role-based edit permission ───────────────────────────────────────────
  const canEdit = ['ADMIN', 'HR'].includes(session.role_level) ||
    (session.role_level === 'HEAD')

  // ── Theme ────────────────────────────────────────────────────────────────
  const { theme } = useTheme()
  const isLight = theme === 'light'

  // ── Load data ────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    const [u, svc, sch, ph] = await Promise.all([
      fetchUsersWithAssignments(),
      fetchServices(),
      fetchSchedules(),
      fetchAllShiftPhases(),
    ])
    setUsers(u)
    setServices(svc as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    setSchedules(sch as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    setPhases(ph)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ── Days in range ────────────────────────────────────────────────────────
  const days = useMemo(
    () => daysInRange(startYear, startMonth, span, settings.showWeekends),
    [startYear, startMonth, span, settings.showWeekends],
  )

  // ── Load manual shifts when period changes ───────────────────────────────
  const loadManual = useCallback(async () => {
    if (!days.length) return
    const fresh = await fetchDriverManualShifts(toDateStr(days[0]), toDateStr(days[days.length - 1]))
    setManualShifts(fresh)
  }, [days])

  useEffect(() => { loadManual() }, [loadManual])

  // ── Filter users ─────────────────────────────────────────────────────────
  const allActive = useMemo(() => users.filter(u => u.is_active), [users])

  const filteredUsers = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    return allActive.filter(u => {
      if (filters.serviceId   && u.service_id !== filters.serviceId) return false
      if (filters.scheduleCode && u.assignment?.schedule_code !== filters.scheduleCode) return false
      if (filters.shiftNum    && String(u.assignment?.shift_num) !== filters.shiftNum) return false
      if (q && !u.full_name.toLowerCase().includes(q)) return false
      if (settings.onlyWithIssues) {
        const code = u.assignment?.schedule_code ?? ''
        if (!CYCLIC_CODES.has(code)) return false
        const hasPhase = phases.some(p => p.employee_id === u.user_id)
        if (hasPhase) return false
      }
      return true
    })
  }, [allActive, filters, settings.onlyWithIssues, phases])

  const editableUsers = useMemo(() => {
    if (session.role_level === 'HEAD' && session.service_id) {
      return filteredUsers.filter(u => u.service_id === session.service_id)
    }
    return filteredUsers
  }, [filteredUsers, session.role_level, session.service_id])

  // ── Today stats (for bottom bar) ──────────────────────────────────────────
  const todayStr = toDateStr(new Date())
  const todayStats = useMemo(() => {
    let onDuty = 0
    const todayDate = new Date()
    filteredUsers.forEach(user => {
      if (!user.assignment) return
      const manualRec = manualShifts.find(m => m.user_id === user.user_id && m.shift_date === todayStr)
      if (manualRec) {
        if (manualRec.shift_type !== 'OFF') onDuty++
        return
      }
      const ap = phases.find(p =>
        p.employee_id === user.user_id &&
        p.valid_from <= todayStr &&
        (p.valid_to === null || p.valid_to >= todayStr)
      ) ?? null
      const status = resolveShiftStatus({
        schedule_code: user.assignment.schedule_code ?? '',
        shift_num: user.assignment.shift_num,
        rotation_group: user.assignment.rotation_group,
        shift_reference_date: user.assignment.shift_reference_date,
        custom_work_days: user.assignment.custom_work_days,
        custom_rest_days: user.assignment.custom_rest_days,
        active_phase: ap,
      }, todayDate)
      if (status.working) onDuty++
    })
    return { total: filteredUsers.length, onDuty, off: filteredUsers.length - onDuty }
  }, [filteredUsers, phases, manualShifts, todayStr])

  // ── Navigation ───────────────────────────────────────────────────────────
  const prev = () => { const r = addMonths(startYear, startMonth, -1); setStartYear(r.year); setStartMonth(r.month) }
  const next = () => { const r = addMonths(startYear, startMonth,  1); setStartYear(r.year); setStartMonth(r.month) }
  const goToday = () => { setStartYear(now.getFullYear()); setStartMonth(now.getMonth()) }

  // ── Cell apply handler (popover) ─────────────────────────────────────────
  const handleCellApply = useCallback(async (user: UserWithAssignment, date: Date, value: 'I' | 'II' | 'OFF' | null) => {
    if (mode !== 'edit') return
    const dateStr = toDateStr(date)
    const key = `${user.user_id}_${dateStr}`
    if (savingKey) return

    setSavingKey(key)
    if (value === null) {
      await deleteDriverManualShift(user.user_id, dateStr)
      setManualShifts(prev => prev.filter(m => !(m.user_id === user.user_id && m.shift_date === dateStr)))
    } else {
      await upsertDriverManualShift(user.user_id, dateStr, value, session.user_id)
      setManualShifts(prev => {
        const filtered = prev.filter(m => !(m.user_id === user.user_id && m.shift_date === dateStr))
        return [...filtered, {
          id: key, user_id: user.user_id, shift_date: dateStr, shift_type: value,
          notes: null, created_by: session.user_id,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }]
      })
    }
    setSavingKey(null)
  }, [mode, savingKey, session.user_id])

  // ── Phase strip click ─────────────────────────────────────────────────────
  const handlePhaseStripClick = useCallback((
    user: UserWithAssignment,
    date: Date,
    existingPhase: ShiftPhase | null,
    e: React.MouseEvent,
  ) => {
    if (mode !== 'edit') return
    setPhaseEditor({
      userId: user.user_id,
      userName: user.full_name,
      scheduleCode: user.assignment?.schedule_code ?? '',
      rotationGroup: user.assignment?.rotation_group ?? null,
      clickedDate: toDateStr(date),
      existingPhase,
      posX: e.clientX,
      posY: e.clientY,
    })
  }, [mode])

  // ── Schedule editor ──────────────────────────────────────────────────────
  const handleScheduleEditClick = useCallback((user: UserWithAssignment) => {
    if (mode !== 'edit') return
    setScheduleEditor({ userId: user.user_id, user })
  }, [mode])

  // ── User click (right panel) ─────────────────────────────────────────────
  const handleUserClick = useCallback((user: UserWithAssignment) => {
    setSelectedUser(prev => prev?.user_id === user.user_id ? null : user)
  }, [])

  // ── Reload after edits ───────────────────────────────────────────────────
  const handlePhaseEditorSaved = useCallback(async () => {
    setPhaseEditor(null)
    const ph = await fetchAllShiftPhases()
    setPhases(ph)
  }, [])

  const handleScheduleEditorSaved = useCallback(async () => {
    setScheduleEditor(null)
    const u = await fetchUsersWithAssignments()
    setUsers(u)
  }, [])

  const typedServices  = services  as any[] // eslint-disable-line @typescript-eslint/no-explicit-any
  const typedSchedules = schedules as any[] // eslint-disable-line @typescript-eslint/no-explicit-any

  // ── Selected user stats ───────────────────────────────────────────────────
  const selectedUserStats = useMemo(() => {
    if (!selectedUser) return null
    let working = 0, off = 0
    days.forEach(d => {
      const dateStr = toDateStr(d)
      const manualRec = manualShifts.find(m => m.user_id === selectedUser.user_id && m.shift_date === dateStr)
      const manual = manualRec?.shift_type ?? null
      let auto: 'I' | 'II' | null = null
      if (selectedUser.assignment) {
        const ap = phases.find(p =>
          p.employee_id === selectedUser.user_id &&
          p.valid_from <= dateStr &&
          (p.valid_to === null || p.valid_to >= dateStr)
        ) ?? null
        const status = resolveShiftStatus({
          schedule_code: selectedUser.assignment.schedule_code ?? '',
          shift_num: selectedUser.assignment.shift_num,
          rotation_group: selectedUser.assignment.rotation_group,
          shift_reference_date: selectedUser.assignment.shift_reference_date,
          custom_work_days: selectedUser.assignment.custom_work_days,
          custom_rest_days: selectedUser.assignment.custom_rest_days,
          active_phase: ap,
        }, d)
        if (status.working) auto = status.phase === 'night' ? 'II' : 'I'
      }
      const shown = manual ?? auto
      if (shown && shown !== 'OFF') working++
      else off++
    })
    return { working, off }
  }, [selectedUser, days, phases, manualShifts])

  return (
    <div className="space-y-3">
      {/* Shift rotation strip */}
      <ShiftRotationStrip />

      {/* Toolbar */}
      <PlannerToolbar
        isLight={isLight}
        startYear={startYear}
        startMonth={startMonth}
        span={span}
        onSpanChange={setSpan}
        onPrev={prev}
        onNext={next}
        onToday={goToday}
        filters={filters}
        onFilterChange={setFilters}
        services={typedServices}
        schedules={typedSchedules}
        userCount={filteredUsers.length}
        totalCount={allActive.length}
        mode={mode}
        canEdit={canEdit}
        onModeToggle={() => setMode(m => m === 'view' ? 'edit' : 'view')}
        showSettings={showSettings}
        onSettingsToggle={() => setShowSettings(v => !v)}
        onRefresh={() => { loadData(); loadManual() }}
      />

      {/* Settings panel */}
      {showSettings && (
        <div className="flex justify-end">
          <PlannerSettingsPanel
            isLight={isLight}
            settings={settings}
            onChange={setSettings}
            onClose={() => setShowSettings(false)}
          />
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className={`text-center py-20 text-sm ${isLight ? 'text-gray-400' : 'text-white/25'}`}>
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
          Загрузка…
        </div>
      ) : (
        <>
          {/* Grid + right panel */}
          <div className="flex gap-3 items-start">
            <div className="flex-1 min-w-0">
              <PlannerGrid
                isLight={isLight}
                users={editableUsers}
                services={typedServices}
                schedules={typedSchedules}
                phases={phases}
                manualShifts={manualShifts}
                days={days}
                settings={settings}
                mode={mode}
                canEdit={canEdit && mode === 'edit'}
                session={session}
                phaseEditorState={phaseEditor}
                scheduleEditorState={scheduleEditor}
                savingKey={savingKey}
                selectedUserId={selectedUser?.user_id ?? null}
                onCellApply={handleCellApply}
                onUserClick={handleUserClick}
                onPhaseStripClick={handlePhaseStripClick}
                onScheduleEditClick={handleScheduleEditClick}
                onPhaseEditorClose={() => setPhaseEditor(null)}
                onPhaseEditorSaved={handlePhaseEditorSaved}
                onScheduleEditorClose={() => setScheduleEditor(null)}
                onScheduleEditorSaved={handleScheduleEditorSaved}
              />
            </div>

            {/* Right detail panel */}
            {selectedUser && (
              <div className={`w-72 shrink-0 rounded-2xl border p-4 flex flex-col gap-3 ${isLight ? 'bg-white border-gray-200' : 'bg-white/[0.06] border-white/12'}`}>
                {/* Header */}
                <div className="flex items-start gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-gray-900 font-bold text-sm shrink-0">
                    {selectedUser.full_name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[14px] font-semibold leading-tight ${isLight ? 'text-gray-800' : 'text-white/90'}`}>
                      {selectedUser.full_name}
                    </div>
                    <div className={`text-[11px] mt-0.5 ${isLight ? 'text-gray-400' : 'text-white/40'}`}>
                      {selectedUser.position ?? 'Сотрудник'}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${isLight ? 'border-gray-200 text-gray-400 hover:text-gray-600' : 'border-white/10 text-white/30 hover:text-white/70'}`}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 1l8 8M9 1L1 9"/></svg>
                  </button>
                </div>

                {/* Schedule info */}
                <div className={`rounded-xl border p-3 ${isLight ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-white/10'}`}>
                  <div className={`text-[9px] uppercase tracking-widest font-semibold mb-2 ${isLight ? 'text-gray-400' : 'text-white/30'}`}>Текущий график</div>
                  <div className={`text-[14px] font-semibold ${isLight ? 'text-gray-800' : 'text-white/85'}`}>
                    {selectedUser.assignment?.schedule_code ?? '—'}
                    {selectedUser.assignment?.shift_num && (
                      <span className={`text-[11px] font-normal ml-2 ${isLight ? 'text-gray-400' : 'text-white/40'}`}>
                        · коллектив {selectedUser.assignment.shift_num}
                      </span>
                    )}
                  </div>
                  {selectedUserStats && (
                    <div className="flex gap-4 mt-2">
                      <div>
                        <div className={`text-[17px] font-bold font-mono leading-none ${isLight ? 'text-green-600' : 'text-green-400'}`}>{selectedUserStats.working}</div>
                        <div className={`text-[10px] mt-0.5 ${isLight ? 'text-gray-400' : 'text-white/30'}`}>рабочих</div>
                      </div>
                      <div>
                        <div className={`text-[17px] font-bold font-mono leading-none ${isLight ? 'text-gray-600' : 'text-white/60'}`}>{selectedUserStats.off}</div>
                        <div className={`text-[10px] mt-0.5 ${isLight ? 'text-gray-400' : 'text-white/30'}`}>выходных</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {canEdit && (
                  <button
                    onClick={() => { handleScheduleEditClick(selectedUser); setSelectedUser(null) }}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      mode === 'edit'
                        ? 'bg-amber-500 text-gray-900 hover:bg-amber-400'
                        : isLight ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white/5 text-white/25 cursor-not-allowed'
                    }`}
                    disabled={mode !== 'edit'}
                    title={mode !== 'edit' ? 'Включите режим правки' : undefined}
                  >
                    ✎ Изменить график
                  </button>
                )}

                <div className={`text-[10px] ${isLight ? 'text-gray-300' : 'text-white/20'}`}>
                  Нажмите на имя сотрудника в таблице для выбора · Клик ещё раз — отменить выбор
                </div>
              </div>
            )}
          </div>

          {/* Bottom summary bar */}
          <div className={`flex items-center gap-4 px-4 py-2.5 rounded-xl border text-[12px] ${isLight ? 'bg-white border-gray-200 text-gray-500' : 'bg-white/[0.04] border-white/10 text-white/50'}`}>
            <span>
              <span className={`font-mono font-bold ${isLight ? 'text-gray-800' : 'text-white/85'}`}>{todayStats.total}</span>
              {' '}сотрудников
            </span>
            <span className={isLight ? 'text-gray-200' : 'text-white/10'}>·</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
              Сегодня:
              {' '}<span className={`font-mono font-bold ${isLight ? 'text-gray-800' : 'text-white/85'}`}>{todayStats.onDuty}</span>
              {' '}на дежурстве
            </span>
            <span className={isLight ? 'text-gray-200' : 'text-white/10'}>·</span>
            <span className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${isLight ? 'bg-gray-300' : 'bg-white/20'}`} />
              <span className={`font-mono font-bold ${isLight ? 'text-gray-800' : 'text-white/85'}`}>{todayStats.off}</span>
              {' '}выходной
            </span>
            <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] font-semibold text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
              LIVE
            </span>
          </div>
        </>
      )}
    </div>
  )
}
