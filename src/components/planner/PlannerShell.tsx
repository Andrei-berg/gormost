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
import { addMonths, daysInRange, toDateStr, nextManual, CYCLIC_CODES } from './utils'
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

  // ── Editor states ────────────────────────────────────────────────────────
  const [phaseEditor,    setPhaseEditor]    = useState<PhaseEditorState | null>(null)
  const [scheduleEditor, setScheduleEditor] = useState<ScheduleEditorState | null>(null)

  // ── Role-based edit permission ───────────────────────────────────────────
  const canEdit = ['ADMIN', 'HR'].includes(session.role_level) ||
    (session.role_level === 'HEAD')

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setServices(svc as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setSchedules(sch as any)
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
        // check if they have no phases
        const hasPhase = phases.some(p => p.employee_id === u.user_id)
        if (hasPhase) return false
      }
      return true
    })
  }, [allActive, filters, settings.onlyWithIssues, phases])

  // HEAD can only edit their own service
  const editableUsers = useMemo(() => {
    if (session.role_level === 'HEAD' && session.service_id) {
      return filteredUsers.filter(u => u.service_id === session.service_id)
    }
    return filteredUsers
  }, [filteredUsers, session.role_level, session.service_id])

  // ── Navigation ───────────────────────────────────────────────────────────
  const prev = () => { const r = addMonths(startYear, startMonth, -1); setStartYear(r.year); setStartMonth(r.month) }
  const next = () => { const r = addMonths(startYear, startMonth,  1); setStartYear(r.year); setStartMonth(r.month) }
  const goToday = () => { setStartYear(now.getFullYear()); setStartMonth(now.getMonth()) }

  // ── Cell click handler ───────────────────────────────────────────────────
  const handleCellClick = useCallback(async (user: UserWithAssignment, date: Date) => {
    if (mode !== 'edit') return
    const dateStr = toDateStr(date)
    const key = `${user.user_id}_${dateStr}`
    if (savingKey) return

    const manual = manualShifts.find(m => m.user_id === user.user_id && m.shift_date === dateStr)?.shift_type ?? null

    // Compute auto
    let auto: 'I' | 'II' | null = null
    if (user.assignment) {
      const ap = phases.find(p =>
        p.employee_id === user.user_id &&
        p.valid_from <= dateStr &&
        (p.valid_to === null || p.valid_to >= dateStr)
      ) ?? null
      // Import resolveShiftStatus inline here via the api is complex; we'll let PlannerGrid handle it
      // For cycling we just use what's visible. Use a simplified approach:
      // We pass the cell click event and let the grid compute it.
      // Actually, to get the auto value we need resolveShiftStatus here too.
      // Let's import it:
      const { resolveShiftStatus } = await import('@/lib/shifts')
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

    const next = nextManual(auto, manual)
    setSavingKey(key)
    if (next === null) {
      await deleteDriverManualShift(user.user_id, dateStr)
      setManualShifts(prev => prev.filter(m => !(m.user_id === user.user_id && m.shift_date === dateStr)))
    } else {
      await upsertDriverManualShift(user.user_id, dateStr, next, session.user_id)
      setManualShifts(prev => {
        const filtered = prev.filter(m => !(m.user_id === user.user_id && m.shift_date === dateStr))
        return [...filtered, {
          id: key, user_id: user.user_id, shift_date: dateStr, shift_type: next,
          notes: null, created_by: session.user_id,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }]
      })
    }
    setSavingKey(null)
  }, [mode, savingKey, manualShifts, phases, session.user_id])

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

  // ── services/schedules typed ─────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedServices  = services  as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedSchedules = schedules as any[]

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <PlannerToolbar
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
            settings={settings}
            onChange={setSettings}
            onClose={() => setShowSettings(false)}
          />
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="text-center text-white/25 py-20 text-sm">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
          Загрузка…
        </div>
      ) : (
        <>
          <PlannerGrid
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
            onCellClick={handleCellClick}
            onPhaseStripClick={handlePhaseStripClick}
            onScheduleEditClick={handleScheduleEditClick}
            onPhaseEditorClose={() => setPhaseEditor(null)}
            onPhaseEditorSaved={handlePhaseEditorSaved}
            onScheduleEditorClose={() => setScheduleEditor(null)}
            onScheduleEditorSaved={handleScheduleEditorSaved}
          />

          <p className="text-[11px] text-white/15 text-center">
            {mode === 'edit'
              ? 'Клик по ячейке: авто → I → II → OFF → авто. Клик по полоске фазы — редактор фаз.'
              : 'Переключите в режим правки для редактирования.'}
          </p>
        </>
      )}
    </div>
  )
}
