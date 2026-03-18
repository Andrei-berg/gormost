'use client'
import { useState, useEffect } from 'react'
import type { UserWithAssignment, Service, EnrichedEmployee, EmployeeStatusType, AuthSession, Schedule } from '@/types'
import { SERVICE_META, EMPLOYEE_STATUS_CONFIG } from '@/types'
import { fetchAllCurrentStatuses, fetchSchedules, openShiftPhase, upsertEmployeeAssignment } from '@/lib/api'
import { isWorkerOnDuty, resolveShiftStatus, isPhaseSchedule } from '@/lib/shifts'

const ABSENCE_STATUSES: EmployeeStatusType[] = [
  'Bolnichniy', 'Otpusk', 'Uchebniy_otpusk', 'Dekret',
  'Mobilizovan', 'SVO', 'Komandirovka', 'Otgul',
]

type ValidationCode =
  | 'NO_ASSIGNMENT'
  | 'MISSING_SHIFT_NUM'
  | 'MISSING_ANCHOR'
  | 'MISSING_ROTATION_GROUP'
  | 'NO_ACTIVE_PHASE'
  | 'STATUS_CONFLICT'

interface ValidationIssue {
  code: ValidationCode
  severity: 'error' | 'warning'
  userId: string
  userName: string
  message: string
}

type Section = 'validation' | 'coverage' | 'roster' | 'summary'
type Period = 7 | 14 | 30

const PHASE_COLOR: Record<'day' | 'night', string> = {
  day:   'bg-amber-500/20 text-amber-300 border-amber-500/30',
  night: 'bg-blue-500/20  text-blue-300  border-blue-500/30',
}
const PHASE_LABEL: Record<'day' | 'night', string> = { day: 'ДЕНЬ', night: 'НОЧЬ' }

// Fix button label per error code
const FIX_LABEL: Partial<Record<ValidationCode, string>> = {
  NO_ASSIGNMENT:          '+ Назначить график',
  MISSING_SHIFT_NUM:      '✏ Указать смену',
  MISSING_ANCHOR:         '✏ Указать дату',
  MISSING_ROTATION_GROUP: '✏ Указать группу',
  NO_ACTIVE_PHASE:        '+ Назначить фазу',
}

interface Props {
  users: UserWithAssignment[]
  services: Service[]
  session?: AuthSession
  onRefreshUsers?: () => void
}

export default function ShiftMonitorTab({ users, services, session, onRefreshUsers }: Props) {
  const [statuses, setStatuses] = useState<EnrichedEmployee[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState<Section>('validation')
  const [periodDays, setPeriodDays] = useState<Period>(7)
  // key = `${userId}_${errorCode}` — which fix form is open
  const [fixingKey, setFixingKey] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchAllCurrentStatuses(), fetchSchedules()]).then(([s, sc]) => {
      setStatuses(s)
      setSchedules(sc)
      setLoading(false)
    })
  }, [])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days = Array.from({ length: periodDays }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return d
  })

  const statusMap = new Map(statuses.map(e => [e.user.user_id, e.currentStatus]))

  // ── VALIDATION ────────────────────────────────────────────────────
  const issues: ValidationIssue[] = []
  for (const u of users) {
    const { assignment } = u

    if (!assignment) {
      issues.push({ code: 'NO_ASSIGNMENT', severity: 'error', userId: u.user_id, userName: u.full_name, message: 'График не назначен' })
      continue
    }

    const code = assignment.schedule_code ?? ''

    if ((code === '1/3' || code === '5/2') && !assignment.shift_num) {
      issues.push({ code: 'MISSING_SHIFT_NUM', severity: 'error', userId: u.user_id, userName: u.full_name, message: `График ${code} — не указана смена (1–4)` })
    }

    if (['2/2', '3/3', '6/6'].includes(code) && !assignment.shift_reference_date && !assignment.active_phase) {
      issues.push({ code: 'MISSING_ANCHOR', severity: 'error', userId: u.user_id, userName: u.full_name, message: `График ${code} — не задана дата привязки` })
    }

    if (code === '15/15' && !assignment.rotation_group) {
      issues.push({ code: 'MISSING_ROTATION_GROUP', severity: 'error', userId: u.user_id, userName: u.full_name, message: 'График 15/15 — не указана группа ротации (1 или 2)' })
    }

    if (isPhaseSchedule(code) && !assignment.active_phase && (assignment.shift_reference_date || code === '15/15')) {
      issues.push({
        code: 'NO_ACTIVE_PHASE', severity: 'warning',
        userId: u.user_id, userName: u.full_name,
        message: `График ${code} — нет активной фазы (день/ночь)`,
      })
    }

    const isOnDuty = isWorkerOnDuty({
      shift_num: assignment.shift_num,
      schedule_code: code,
      shift_reference_date: assignment.shift_reference_date,
      rotation_group: assignment.rotation_group,
      active_phase: assignment.active_phase,
    }, today)
    const empStatus = statusMap.get(u.user_id)
    if (isOnDuty && empStatus && ABSENCE_STATUSES.includes(empStatus)) {
      issues.push({
        code: 'STATUS_CONFLICT', severity: 'warning',
        userId: u.user_id, userName: u.full_name,
        message: `По графику на дежурстве — статус: ${EMPLOYEE_STATUS_CONFIG[empStatus].label}`,
      })
    }
  }

  const errors = issues.filter(i => i.severity === 'error')
  const warnings = issues.filter(i => i.severity === 'warning')

  // ── COVERAGE by service ───────────────────────────────────────────
  const coverage = services
    .filter(svc => users.some(u => u.service_id === svc.service_id))
    .map(svc => {
      const svcUsers = users.filter(u => u.service_id === svc.service_id)
      const onDuty = svcUsers.filter(u => {
        if (!u.assignment) return false
        const a = u.assignment
        return isWorkerOnDuty({
          shift_num: a.shift_num,
          schedule_code: a.schedule_code ?? '',
          shift_reference_date: a.shift_reference_date,
          rotation_group: a.rotation_group,
          active_phase: a.active_phase,
        }, today)
      })
      return { svc, total: svcUsers.length, onDuty: onDuty.length }
    })

  const totalOnDuty = coverage.reduce((s, c) => s + c.onDuty, 0)

  // ── SUMMARY TABLE DATA ────────────────────────────────────────────
  const summaryRows = services
    .filter(svc => users.some(u => u.service_id === svc.service_id))
    .map(svc => {
      const svcUsers = users.filter(u => u.service_id === svc.service_id)
      let onDutyCount = 0, offCount = 0, absentCount = 0, noScheduleCount = 0
      for (const u of svcUsers) {
        if (!u.assignment) { noScheduleCount++; continue }
        const a = u.assignment
        const working = isWorkerOnDuty({
          shift_num: a.shift_num,
          schedule_code: a.schedule_code ?? '',
          shift_reference_date: a.shift_reference_date,
          rotation_group: a.rotation_group,
          active_phase: a.active_phase,
        }, today)
        const empStatus = statusMap.get(u.user_id)
        const isAbsent = empStatus && ABSENCE_STATUSES.includes(empStatus)
        if (isAbsent) absentCount++
        else if (working) onDutyCount++
        else offCount++
      }
      const svcIssues = issues.filter(i => svcUsers.some(u => u.user_id === i.userId))
      return {
        svc, total: svcUsers.length,
        onDutyCount, offCount, absentCount, noScheduleCount,
        errCount: svcIssues.filter(i => i.severity === 'error').length,
        warnCount: svcIssues.filter(i => i.severity === 'warning').length,
      }
    })

  const totals = summaryRows.reduce(
    (acc, r) => ({
      total: acc.total + r.total,
      onDutyCount: acc.onDutyCount + r.onDutyCount,
      offCount: acc.offCount + r.offCount,
      absentCount: acc.absentCount + r.absentCount,
      noScheduleCount: acc.noScheduleCount + r.noScheduleCount,
      errCount: acc.errCount + r.errCount,
      warnCount: acc.warnCount + r.warnCount,
    }),
    { total: 0, onDutyCount: 0, offCount: 0, absentCount: 0, noScheduleCount: 0, errCount: 0, warnCount: 0 }
  )

  const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

  const handleFixed = () => {
    setFixingKey(null)
    onRefreshUsers?.()
  }

  if (loading) return (
    <div className="text-white/40 text-sm py-12 text-center">Загрузка данных мониторинга...</div>
  )

  const tileBase = 'rounded-xl p-4 text-left transition-all border cursor-pointer'
  const tileActive = 'border-blue-500/50 bg-blue-500/10'
  const tileIdle = 'border-white/5 bg-white/5 hover:bg-white/8'

  // ── Render one issue row (shared for errors and warnings) ─────────
  const renderIssueRow = (issue: ValidationIssue, i: number) => {
    const key = `${issue.userId}_${issue.code}`
    const isOpen = fixingKey === key
    const canFix = !!session && issue.code !== 'STATUS_CONFLICT'
    const fixLabel = FIX_LABEL[issue.code]
    const isError = issue.severity === 'error'
    const rowBg = isError ? 'bg-red-500/8 border-red-500/20' : 'bg-amber-500/8 border-amber-500/20'
    const icon = isError ? <span className="text-red-400 shrink-0">✗</span> : <span className="text-amber-400 shrink-0">⚠</span>
    const badgeCls = isError
      ? 'bg-red-500/20 text-red-400'
      : 'bg-amber-500/20 text-amber-400'

    const user = users.find(u => u.user_id === issue.userId)

    return (
      <div key={i} className="rounded-lg border overflow-hidden">
        {/* Row */}
        <div className={`flex items-center gap-3 ${rowBg} px-4 py-3`}>
          {icon}
          <div className="flex-1 min-w-0">
            <span className="text-white/80 text-sm font-medium">{issue.userName}</span>
            <span className="text-white/40 text-xs ml-2">{issue.message}</span>
          </div>
          {canFix && fixLabel && (
            <button
              onClick={() => setFixingKey(isOpen ? null : key)}
              className={`shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-colors border ${
                isOpen
                  ? 'bg-white/10 text-white/50 border-white/10'
                  : isError
                    ? 'bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/25'
                    : 'bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25'
              }`}
            >
              {isOpen ? '✕ Закрыть' : fixLabel}
            </button>
          )}
          <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-mono ${badgeCls}`}>
            {issue.code}
          </span>
        </div>

        {/* Inline fix form */}
        {isOpen && user && session && (
          issue.code === 'NO_ACTIVE_PHASE'
            ? <InlinePhaseForm user={user} session={session} onSaved={handleFixed} onCancel={() => setFixingKey(null)} />
            : <InlineAssignmentForm
                user={user}
                errorCode={issue.code}
                schedules={schedules}
                session={session}
                onSaved={handleFixed}
                onCancel={() => setFixingKey(null)}
              />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── TILES ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button onClick={() => setSection('validation')} className={`${tileBase} ${section === 'validation' ? tileActive : tileIdle}`}>
          <div className={`text-2xl font-bold ${errors.length > 0 ? 'text-red-400' : 'text-green-400'}`}>{errors.length}</div>
          <div className="text-xs text-white/50 mt-1">Ошибок конфигурации</div>
          {warnings.length > 0 && <div className="text-xs text-amber-400 mt-0.5">+ {warnings.length} предупреждений</div>}
        </button>

        <button onClick={() => setSection('coverage')} className={`${tileBase} ${section === 'coverage' ? tileActive : tileIdle}`}>
          <div className="text-2xl font-bold text-green-400">{totalOnDuty}</div>
          <div className="text-xs text-white/50 mt-1">Сегодня на смене</div>
          <div className="text-xs text-white/30 mt-0.5">из {users.length} сотрудников</div>
        </button>

        <button onClick={() => setSection('summary')} className={`${tileBase} ${section === 'summary' ? tileActive : tileIdle}`}>
          <div className="text-2xl font-bold text-violet-400">{summaryRows.length}</div>
          <div className="text-xs text-white/50 mt-1">Служб в системе</div>
          {totals.absentCount > 0 && <div className="text-xs text-amber-400 mt-0.5">{totals.absentCount} отсутствуют</div>}
        </button>

        <button onClick={() => setSection('roster')} className={`${tileBase} ${section === 'roster' ? tileActive : tileIdle}`}>
          <div className="text-2xl font-bold text-blue-400">{periodDays}</div>
          <div className="text-xs text-white/50 mt-1">Дней расписания</div>
          {users.filter(u => !u.assignment).length > 0 && (
            <div className="text-xs text-red-400/70 mt-0.5">{users.filter(u => !u.assignment).length} без графика</div>
          )}
        </button>
      </div>

      {/* ── VALIDATION ─────────────────────────────────────────── */}
      {section === 'validation' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="text-xs text-white/30 uppercase tracking-wider">Проверка конфигурации графиков</div>
            {session && issues.some(i => i.code !== 'STATUS_CONFLICT') && (
              <div className="text-xs text-white/25">— нажмите кнопку в строке ошибки чтобы исправить</div>
            )}
          </div>

          {issues.length === 0 && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5 text-green-400 text-sm">
              ✓ Ошибок не найдено — все графики настроены корректно
            </div>
          )}

          {errors.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs text-red-400/60 uppercase tracking-wider">Критические — {errors.length}</div>
              {errors.map((issue, i) => renderIssueRow(issue, i))}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="space-y-1.5 mt-4">
              <div className="text-xs text-amber-400/60 uppercase tracking-wider">Предупреждения — {warnings.length}</div>
              {warnings.map((issue, i) => renderIssueRow(issue, i + errors.length))}
            </div>
          )}
        </div>
      )}

      {/* ── COVERAGE ───────────────────────────────────────────── */}
      {section === 'coverage' && (
        <div className="space-y-3">
          <div className="text-xs text-white/30 uppercase tracking-wider">
            Явка — {today.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {coverage.map(({ svc, total, onDuty }) => {
              const pct = total > 0 ? Math.round(onDuty / total * 100) : 0
              const meta = SERVICE_META[svc.service_id]
              const statusColor = pct === 0 ? 'text-red-400' : pct < 40 ? 'text-amber-400' : 'text-green-400'
              const barColor = pct === 0 ? 'bg-red-500' : pct < 40 ? 'bg-amber-500' : 'bg-green-500'
              return (
                <div key={svc.service_id} className="bg-white/5 border border-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-white/80">{meta?.emoji ?? '🔧'} {svc.service_name}</div>
                    <div className={`text-xl font-bold ${statusColor}`}>{onDuty}/{total}</div>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5 mb-1.5">
                    <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-white/30">{pct}% присутствует</div>
                </div>
              )
            })}
          </div>
          {coverage.length === 0 && <div className="text-white/30 text-sm py-4">Нет сотрудников со службой</div>}
        </div>
      )}

      {/* ── SUMMARY TABLE ──────────────────────────────────────── */}
      {section === 'summary' && (
        <div className="space-y-3">
          <div className="text-xs text-white/30 uppercase tracking-wider">
            Сводная таблица — {today.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/40 font-normal pb-2 pr-6">Служба</th>
                  <th className="text-right text-white/40 font-normal pb-2 px-3">Всего</th>
                  <th className="text-right text-green-400/60 font-normal pb-2 px-3">На смене</th>
                  <th className="text-right text-white/30 font-normal pb-2 px-3">Выходной</th>
                  <th className="text-right text-amber-400/60 font-normal pb-2 px-3">Отсутств.</th>
                  <th className="text-right text-red-400/60 font-normal pb-2 px-3">Без графика</th>
                  <th className="text-right text-red-400/60 font-normal pb-2 px-3">Ошибки</th>
                  <th className="text-right text-amber-400/60 font-normal pb-2 pl-3">Предупр.</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map(r => {
                  const meta = SERVICE_META[r.svc.service_id]
                  return (
                    <tr key={r.svc.service_id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-2.5 pr-6 text-white/70 whitespace-nowrap">{meta?.emoji ?? '🔧'} {r.svc.service_name}</td>
                      <td className="py-2.5 px-3 text-right text-white/50 font-medium">{r.total}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={r.onDutyCount > 0 ? 'text-green-400 font-medium' : 'text-white/25'}>{r.onDutyCount}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-white/30">{r.offCount}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={r.absentCount > 0 ? 'text-amber-400' : 'text-white/25'}>{r.absentCount}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={r.noScheduleCount > 0 ? 'text-red-400' : 'text-white/25'}>{r.noScheduleCount}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={r.errCount > 0 ? 'text-red-400 font-bold' : 'text-white/25'}>{r.errCount}</span>
                      </td>
                      <td className="py-2.5 pl-3 text-right">
                        <span className={r.warnCount > 0 ? 'text-amber-400' : 'text-white/25'}>{r.warnCount}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-white/10">
                  <td className="py-2.5 pr-6 text-white/50 font-medium text-xs uppercase tracking-wider">Итого</td>
                  <td className="py-2.5 px-3 text-right text-white/70 font-bold">{totals.total}</td>
                  <td className="py-2.5 px-3 text-right text-green-400 font-bold">{totals.onDutyCount}</td>
                  <td className="py-2.5 px-3 text-right text-white/40">{totals.offCount}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={totals.absentCount > 0 ? 'text-amber-400 font-bold' : 'text-white/25'}>{totals.absentCount}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={totals.noScheduleCount > 0 ? 'text-red-400 font-bold' : 'text-white/25'}>{totals.noScheduleCount}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={totals.errCount > 0 ? 'text-red-400 font-bold' : 'text-white/25'}>{totals.errCount}</span>
                  </td>
                  <td className="py-2.5 pl-3 text-right">
                    <span className={totals.warnCount > 0 ? 'text-amber-400 font-bold' : 'text-white/25'}>{totals.warnCount}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── ROSTER ─────────────────────────────────────────────── */}
      {section === 'roster' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-white/30 uppercase tracking-wider">Расписание</div>
            <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
              {([7, 14, 30] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriodDays(p)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    periodDays === p ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  {p} дн.
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="text-left text-white/40 font-normal pb-3 pr-4 whitespace-nowrap">Сотрудник</th>
                  <th className="text-left text-white/40 font-normal pb-3 pr-3 whitespace-nowrap">График</th>
                  {days.map((d, i) => (
                    <th key={i} className={`text-center pb-3 px-0.5 whitespace-nowrap ${i === 0 ? 'text-blue-400' : 'text-white/35'}`}
                      style={{ minWidth: periodDays === 30 ? 24 : 28 }}>
                      {periodDays <= 14 && <div className="font-medium">{DAY_NAMES[d.getDay()]}</div>}
                      <div className={`font-normal ${periodDays === 30 ? 'text-[9px]' : 'text-[10px]'}`}>
                        {d.getDate()}{periodDays <= 14 ? `.${String(d.getMonth() + 1).padStart(2, '0')}` : ''}
                      </div>
                    </th>
                  ))}
                  <th className="text-left text-white/40 font-normal pb-3 pl-3 whitespace-nowrap">Статус</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const empStatus = statusMap.get(u.user_id)
                  const isAbsent = empStatus && ABSENCE_STATUSES.includes(empStatus)
                  return (
                    <tr key={u.user_id} className="border-t border-white/5 hover:bg-white/[0.02]">
                      <td className="py-1.5 pr-4 text-white/70 whitespace-nowrap">{u.full_name}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap">
                        {u.assignment?.schedule_code
                          ? <span className="text-white/50">{u.assignment.schedule_code}</span>
                          : <span className="text-red-400/60">—</span>}
                      </td>
                      {days.map((d, i) => {
                        if (!u.assignment) return <td key={i} className="py-1.5 px-0.5 text-center text-white/10">·</td>
                        const a = u.assignment
                        const status = resolveShiftStatus({
                          schedule_code: a.schedule_code ?? '',
                          shift_num: a.shift_num,
                          rotation_group: a.rotation_group,
                          shift_reference_date: a.shift_reference_date,
                          active_phase: a.active_phase,
                        }, d)
                        if (isAbsent && status.working) {
                          return (
                            <td key={i} className="py-1.5 px-0.5 text-center">
                              <span title={`Конфликт: ${EMPLOYEE_STATUS_CONFIG[empStatus as EmployeeStatusType]?.label}`}
                                className="inline-flex items-center justify-center w-5 h-4 rounded bg-amber-500/20 text-amber-400 font-bold text-[9px]">!</span>
                            </td>
                          )
                        }
                        if (!status.working) return <td key={i} className="py-1.5 px-0.5 text-center text-white/15 text-[10px]">—</td>
                        const cell = status.phase === 'day'
                          ? { cls: 'bg-sky-500/20 text-sky-300', label: 'Д' }
                          : status.phase === 'night'
                            ? { cls: 'bg-violet-500/20 text-violet-300', label: 'Н' }
                            : { cls: 'bg-white/10 text-white/50', label: '✓' }
                        return (
                          <td key={i} className="py-1.5 px-0.5 text-center">
                            <span className={`inline-flex items-center justify-center w-5 h-4 rounded text-[9px] font-semibold ${cell.cls}`}>{cell.label}</span>
                          </td>
                        )
                      })}
                      <td className="py-1.5 pl-3 whitespace-nowrap">
                        {empStatus && empStatus !== 'Na_rabote'
                          ? <span style={{ color: EMPLOYEE_STATUS_CONFIG[empStatus].color }} className="text-xs">{EMPLOYEE_STATUS_CONFIG[empStatus].label}</span>
                          : <span className="text-white/25 text-xs">на работе</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/30 pt-2 border-t border-white/5">
            <span><span className="inline-flex items-center justify-center w-4 h-3.5 rounded bg-sky-500/20 text-sky-300 text-[9px] font-semibold mr-1">Д</span>День 07:45–19:45</span>
            <span><span className="inline-flex items-center justify-center w-4 h-3.5 rounded bg-violet-500/20 text-violet-300 text-[9px] font-semibold mr-1">Н</span>Ночь 19:45–07:45</span>
            <span><span className="inline-flex items-center justify-center w-4 h-3.5 rounded bg-amber-500/20 text-amber-400 font-bold mr-1 text-[9px]">!</span>Конфликт статуса</span>
            <span><span className="text-white/15 mr-1">—</span>Выходной</span>
            <span><span className="text-white/15 mr-1">·</span>Нет графика</span>
          </div>
        </div>
      )}

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// InlineAssignmentForm — fix schedule config errors inline
// ─────────────────────────────────────────────────────────────────────

function InlineAssignmentForm({
  user,
  errorCode,
  schedules,
  session,
  onSaved,
  onCancel,
}: {
  user: UserWithAssignment
  errorCode: ValidationCode
  schedules: Schedule[]
  session: AuthSession
  onSaved: () => void
  onCancel: () => void
}) {
  const a = user.assignment
  const [scheduleCode, setScheduleCode] = useState(a?.schedule_code ?? '')
  const [scheduleId, setScheduleId]     = useState(a?.schedule_id ?? '')
  const [shiftNum, setShiftNum]         = useState(String(a?.shift_num ?? ''))
  const [rotationGroup, setRotationGroup] = useState(a?.rotation_group ?? '')
  const [refDate, setRefDate]           = useState(a?.shift_reference_date ?? '')
  const [isDriver]                      = useState(a?.is_driver ?? false)
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState<string | null>(null)

  const handleScheduleChange = (code: string) => {
    setScheduleCode(code)
    const found = schedules.find(s => s.code === code)
    setScheduleId(found?.id ?? '')
    setShiftNum(''); setRotationGroup(''); setRefDate('')
  }

  const needsShift   = scheduleCode === '1/3' || scheduleCode === '5/2'
  const needsRefDate = ['2/2', '3/3', '6/6'].includes(scheduleCode)
  const needsHalf    = scheduleCode === '15/15'

  const handleSave = async () => {
    if (!scheduleId) { setError('Выберите график'); return }
    if (needsShift && !shiftNum) { setError('Укажите смену (1–4)'); return }
    if (needsRefDate && !refDate) { setError('Укажите дату привязки'); return }
    if (needsHalf && !rotationGroup) { setError('Укажите группу ротации'); return }
    setSaving(true)
    setError(null)
    const ok = await upsertEmployeeAssignment(
      user.user_id,
      {
        schedule_id: scheduleId,
        shift_num: shiftNum ? (Number(shiftNum) as 1 | 2 | 3 | 4) : null,
        rotation_group: rotationGroup || null,
        shift_reference_date: refDate || null,
        is_driver: isDriver,
      },
      session.user_id
    )
    setSaving(false)
    if (ok) onSaved()
    else setError('Ошибка сохранения')
  }

  const sel = 'bg-gray-900 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500/50'
  const inp = 'bg-gray-900 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500/50 w-full'
  // Highlight the field that corresponds to the specific error
  const hlSel = 'bg-gray-900 border border-blue-400/60 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none ring-1 ring-blue-500/30'
  const hlInp = 'bg-gray-900 border border-blue-400/60 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none ring-1 ring-blue-500/30 w-full'

  const scheduleHl = errorCode === 'NO_ASSIGNMENT' ? hlSel : sel
  const shiftHl    = errorCode === 'MISSING_SHIFT_NUM' ? hlSel : sel
  const refDateHl  = errorCode === 'MISSING_ANCHOR' ? hlInp : inp
  const rotHl      = errorCode === 'MISSING_ROTATION_GROUP' ? hlSel : sel

  // Hint shown above the highlighted field
  const fieldHint: Partial<Record<ValidationCode, string>> = {
    NO_ASSIGNMENT:          'Выберите график и заполните обязательные поля',
    MISSING_SHIFT_NUM:      'Укажите номер смены для этого графика',
    MISSING_ANCHOR:         'Укажите якорную дату — первый рабочий день отсчёта',
    MISSING_ROTATION_GROUP: 'Укажите группу: 1–15 числа или 16–31 числа',
  }

  return (
    <div className="border-t border-blue-500/20 bg-blue-500/5 px-4 py-3 space-y-3">
      <div className="flex items-center gap-2">
        <div className="text-xs text-blue-300/70 font-medium">
          Редактировать назначение: <span className="text-white/60">{user.full_name}</span>
        </div>
        {fieldHint[errorCode] && (
          <div className="text-xs text-blue-400/50 ml-2">← {fieldHint[errorCode]}</div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Schedule selector */}
        <div>
          <label className="block text-[10px] text-white/30 mb-1">
            График
            {errorCode === 'NO_ASSIGNMENT' && <span className="text-blue-400 ml-1">*</span>}
          </label>
          <select value={scheduleCode} onChange={e => handleScheduleChange(e.target.value)} className={scheduleHl}>
            <option value="">— не задан —</option>
            {schedules.map(s => <option key={s.id} value={s.code}>{s.code} · {s.name}</option>)}
          </select>
        </div>

        {/* Shift number — shown when needed or when editing MISSING_SHIFT_NUM */}
        {(needsShift || errorCode === 'MISSING_SHIFT_NUM') && (
          <div>
            <label className="block text-[10px] text-white/30 mb-1">
              Смена
              {errorCode === 'MISSING_SHIFT_NUM' && <span className="text-blue-400 ml-1">*</span>}
            </label>
            <select value={shiftNum} onChange={e => setShiftNum(e.target.value)} className={shiftHl}>
              <option value="">—</option>
              {[1, 2, 3, 4].map(n => <option key={n} value={n}>Смена {n}</option>)}
            </select>
          </div>
        )}

        {/* Anchor date — shown when needed or when editing MISSING_ANCHOR */}
        {(needsRefDate || errorCode === 'MISSING_ANCHOR') && (
          <div>
            <label className="block text-[10px] text-white/30 mb-1">
              Якорная дата
              {errorCode === 'MISSING_ANCHOR' && <span className="text-blue-400 ml-1">*</span>}
            </label>
            <input type="date" value={refDate} onChange={e => setRefDate(e.target.value)} className={refDateHl} />
          </div>
        )}

        {/* Rotation group — shown when needed or when editing MISSING_ROTATION_GROUP */}
        {(needsHalf || errorCode === 'MISSING_ROTATION_GROUP') && (
          <div>
            <label className="block text-[10px] text-white/30 mb-1">
              Группа ротации
              {errorCode === 'MISSING_ROTATION_GROUP' && <span className="text-blue-400 ml-1">*</span>}
            </label>
            <select value={rotationGroup} onChange={e => setRotationGroup(e.target.value)} className={rotHl}>
              <option value="">—</option>
              <option value="1">1–15 числа</option>
              <option value="2">16–31 числа</option>
            </select>
          </div>
        )}
      </div>

      {error && <div className="text-xs text-red-400">{error}</div>}

      <div className="flex gap-2">
        <button
          disabled={saving || !scheduleId}
          onClick={handleSave}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium transition-colors"
        >
          {saving ? 'Сохраняю...' : 'Сохранить'}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs hover:bg-white/10 transition-colors"
        >
          Отмена
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// InlinePhaseForm — fix NO_ACTIVE_PHASE inline
// ─────────────────────────────────────────────────────────────────────

function InlinePhaseForm({
  user,
  session,
  onSaved,
  onCancel,
}: {
  user: UserWithAssignment
  session: AuthSession
  onSaved: () => void
  onCancel: () => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [phase, setPhase]         = useState<'day' | 'night'>('day')
  const [validFrom, setValidFrom] = useState(today)
  const [anchorDate, setAnchorDate] = useState(today)
  const [notes, setNotes]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const scheduleCode = user.assignment?.schedule_code ?? ''

  const handleSave = async () => {
    if (!validFrom || !anchorDate) { setError('Заполните все поля'); return }
    if (anchorDate > validFrom) { setError('Якорная дата не может быть позже начала фазы'); return }
    setSaving(true)
    setError(null)
    const ok = await openShiftPhase(
      user.user_id,
      { phase, anchor_date: anchorDate, valid_from: validFrom, schedule_code: scheduleCode, notes: notes || undefined },
      session.user_id
    )
    setSaving(false)
    if (ok) onSaved()
    else setError('Ошибка сохранения')
  }

  const inp = 'bg-gray-900 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500/50 w-full'

  return (
    <div className="border-t border-blue-500/20 bg-blue-500/5 px-4 py-3 space-y-3">
      <div className="text-xs text-blue-300/70 font-medium">
        Назначить фазу: <span className="text-white/60">{user.full_name}</span>
        <span className="ml-2 text-white/30">• {scheduleCode}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-[10px] text-white/30 mb-1">Фаза <span className="text-blue-400">*</span></label>
          <div className="flex gap-1">
            {(['day', 'night'] as const).map(p => (
              <button key={p} onClick={() => setPhase(p)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  phase === p ? PHASE_COLOR[p] : 'bg-white/5 border-white/10 text-white/30'
                }`}>
                {PHASE_LABEL[p]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-white/30 mb-1">Начало фазы</label>
          <input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} className={inp} />
        </div>
        <div>
          <label className="block text-[10px] text-white/30 mb-1">Якорная дата <span className="text-white/20">(1-й рабочий день)</span></label>
          <input type="date" value={anchorDate} onChange={e => setAnchorDate(e.target.value)} className={inp} />
        </div>
        <div>
          <label className="block text-[10px] text-white/30 mb-1">Заметки</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="необязательно" className={inp} />
        </div>
      </div>

      {error && <div className="text-xs text-red-400">{error}</div>}

      <div className="flex gap-2">
        <button disabled={saving} onClick={handleSave}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium transition-colors">
          {saving ? 'Сохраняю...' : 'Сохранить фазу'}
        </button>
        <button onClick={onCancel}
          className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs hover:bg-white/10 transition-colors">
          Отмена
        </button>
      </div>
    </div>
  )
}
