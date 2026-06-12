'use client'
import { useEffect, useState, useCallback } from 'react'
import { fetchWorkPlans, fetchWorkPlansWithItems, fetchAllCurrentStatuses, fetchUsersWithAssignments } from '@/lib/api-client'
import type { WorkPlanWithItems, EnrichedEmployee, EmployeeStatusType } from '@/types'
import { EMPLOYEE_STATUS_CONFIG, WORK_PLAN_STATUS_CONFIG } from '@/types'
import { isWorkerOnDuty } from '@/lib/shifts'

type FilterMode = 'all' | 'on_duty' | 'absent'

const FILTER_LABELS: Record<FilterMode, string> = {
  all:     'Вся служба',
  on_duty: 'Сегодня на смене',
  absent:  'Отсутствуют',
}

// ── Role grouping ──────────────────────────────────────────────
type RoleGroup = 'itr' | 'master' | 'brigadier' | 'worker' | 'driver' | 'other'

const ROLE_GROUP_ORDER: RoleGroup[] = ['itr', 'master', 'brigadier', 'worker', 'driver', 'other']

const ROLE_GROUP_LABELS: Record<RoleGroup, string> = {
  itr:       'ИТР',
  master:    'Мастер',
  brigadier: 'Бригадир',
  worker:    'Рабочий',
  driver:    'Водитель',
  other:     'Прочие',
}

const ROLE_GROUP_ICON: Record<RoleGroup, string> = {
  itr:       '🔧',
  master:    '👷',
  brigadier: '⭐',
  worker:    '👤',
  driver:    '🚗',
  other:     '•',
}

function getRoleGroup(emp: EnrichedEmployee): RoleGroup {
  const rl  = emp.user.role_level
  const pos = (emp.user.position ?? '').toLowerCase()
  if (['head', 'chief_engineer', 'specialist', 'zamporab', 'hr', 'safety_engineer', 'boss', 'admin'].includes(rl.toLowerCase())) return 'itr'
  if (rl.toLowerCase() === 'foreman') return 'master'
  if (rl.toLowerCase() === 'driver')  return 'driver'
  if (pos.includes('бригадир'))       return 'brigadier'
  if (rl.toLowerCase() === 'worker')  return 'worker'
  return 'other'
}

// Statuses that mean the employee is unavailable/absent today
const ABSENT_STATUSES = new Set<EmployeeStatusType>([
  'Otgul', 'Bolnichniy', 'Otpusk', 'Komandirovka',
  'Uchebniy_otpusk', 'Dekret', 'Mobilizovan', 'SVO', 'Troydoustroyen_s_SVO',
])

interface Props {
  serviceId: string
}

type EnrichedWithDuty = EnrichedEmployee & { onDuty: boolean }

export default function StaffBoard({ serviceId }: Props) {
  const [employees, setEmployees] = useState<EnrichedWithDuty[]>([])
  const [plans, setPlans]         = useState<WorkPlanWithItems[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState<FilterMode>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const today    = new Date()
    const todayStr = today.toISOString().split('T')[0]

    const [emps, raw, userAssignments] = await Promise.all([
      fetchAllCurrentStatuses(),
      fetchWorkPlans({ planDate: todayStr }),
      fetchUsersWithAssignments(),
    ])

    const myEmps = emps.filter(e => e.user.service_id === serviceId)

    const myEmpsWithDuty: EnrichedWithDuty[] = myEmps.map(emp => {
      const ua = userAssignments.find(u => u.user_id === emp.user.user_id)
      const onDuty = ua?.assignment
        ? isWorkerOnDuty({
            shift_num:            ua.assignment.shift_num,
            schedule_code:        ua.assignment.schedule_code ?? '',
            shift_reference_date: ua.assignment.shift_reference_date,
            rotation_group:       ua.assignment.rotation_group,
            active_phase:         ua.assignment.active_phase ?? null,
            custom_work_days:     ua.assignment.custom_work_days,
            custom_rest_days:     ua.assignment.custom_rest_days,
          }, today)
        : false
      return { ...emp, onDuty }
    })

    const withItems = await fetchWorkPlansWithItems(raw.map(p => p.id))
    setEmployees(myEmpsWithDuty)
    setPlans(withItems.filter(Boolean) as WorkPlanWithItems[])
    setLoading(false)
  }, [serviceId])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="text-center text-white/40 py-8 text-sm">Загрузка...</div>

  // Apply filter
  const filteredEmps = employees.filter(e => {
    if (filter === 'on_duty') return e.onDuty && !ABSENT_STATUSES.has(e.currentStatus)
    if (filter === 'absent')  return ABSENT_STATUSES.has(e.currentStatus)
    return true
  })

  // Build assignment map
  const empAssignments = filteredEmps.map(emp => {
    const assignments: Array<{ plan: WorkPlanWithItems; location: string; work: string; time: string }> = []
    for (const plan of plans) {
      if (!['PLANNED', 'IN_PROGRESS', 'DONE', 'APPROVED', 'BOSS_CONFIRMED', 'ASSIGNED'].includes(plan.status)) continue
      for (const item of plan.items) {
        const lastName      = emp.user.last_name?.toLowerCase() ?? ''
        const firstNamePart = emp.user.full_name.toLowerCase().split(' ')[0]
        const match = item.workers.some(w =>
          (lastName && w.toLowerCase().includes(lastName)) ||
          w.toLowerCase().includes(firstNamePart)
        )
        if (match) {
          assignments.push({
            plan,
            location: item.location,
            work:     item.work_description,
            time:     item.time_start ? `${item.time_start}${item.time_end ? `–${item.time_end}` : ''}` : '',
          })
        }
      }
    }
    return { emp, assignments }
  })

  const assigned   = empAssignments.filter(e => e.assignments.length > 0)
  const unassigned = empAssignments.filter(e => e.assignments.length === 0)

  // Group helpers
  function groupByRole<T extends { emp: EnrichedEmployee }>(list: T[]) {
    const map = new Map<RoleGroup, T[]>()
    for (const item of list) {
      const g = getRoleGroup(item.emp)
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(item)
    }
    return ROLE_GROUP_ORDER.filter(g => map.has(g)).map(g => ({ group: g, items: map.get(g)! }))
  }

  // Counts for filter badges
  const countAll     = employees.length
  const countOnDuty  = employees.filter(e => e.onDuty && !ABSENT_STATUSES.has(e.currentStatus)).length
  const countAbsent  = employees.filter(e => ABSENT_STATUSES.has(e.currentStatus)).length

  if (employees.length === 0) {
    return <div className="text-center text-white/20 py-12 text-sm">Нет сотрудников в службе</div>
  }

  return (
    <div className="space-y-4">

      {/* ── Filter bar ── */}
      <div className="glass rounded-xl px-4 py-3 flex flex-wrap items-center gap-2">
        {(['all', 'on_duty', 'absent'] as FilterMode[]).map(mode => {
          const count = mode === 'all' ? countAll : mode === 'on_duty' ? countOnDuty : countAbsent
          const active = filter === mode
          return (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? mode === 'absent'
                    ? 'bg-orange-500/20 border border-orange-500/30 text-orange-300'
                    : mode === 'on_duty'
                    ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                    : 'bg-blue-500/20 border border-blue-500/30 text-blue-300'
                  : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70'
              }`}
            >
              {FILTER_LABELS[mode]}
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                active
                  ? 'bg-white/20 text-current'
                  : 'bg-white/8 text-white/30'
              }`}>
                {count}
              </span>
            </button>
          )
        })}

        {/* Summary counters */}
        <div className="ml-auto flex items-center gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-white leading-none">{assigned.length}</div>
            <div className="text-[10px] text-white/35 uppercase tracking-wider mt-0.5">в работах</div>
          </div>
          <div className="w-px h-7 bg-white/10" />
          <div className="text-center">
            <div className="text-lg font-bold text-white/30 leading-none">{unassigned.length}</div>
            <div className="text-[10px] text-white/35 uppercase tracking-wider mt-0.5">свободны</div>
          </div>
          <button onClick={load} className="text-white/25 hover:text-white/50 text-lg transition-colors ml-2">↻</button>
        </div>
      </div>

      {/* Empty state for filter */}
      {filteredEmps.length === 0 && (
        <div className="text-center text-white/25 py-10 text-sm">
          {filter === 'on_duty' ? 'Никто не дежурит сегодня' : 'Нет отсутствующих'}
        </div>
      )}

      {/* ── Assigned ── */}
      {assigned.length > 0 && (
        <div>
          <div className="text-[10px] text-white/30 uppercase tracking-widest mb-3 px-1">
            Назначены на работы · {assigned.length}
          </div>
          <div className="space-y-4">
            {groupByRole(assigned).map(({ group, items }) => (
              <div key={group}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-sm">{ROLE_GROUP_ICON[group]}</span>
                  <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">{ROLE_GROUP_LABELS[group]}</span>
                  <span className="text-[10px] text-white/25">· {items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map(({ emp, assignments }) => {
                    const stCfg  = EMPLOYEE_STATUS_CONFIG[emp.currentStatus]
                    const absent = ABSENT_STATUSES.has(emp.currentStatus)
                    return (
                      <div key={emp.user.user_id} className="glass rounded-xl overflow-hidden border border-white/8">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-[11px] font-bold shrink-0 ${
                              absent ? 'bg-orange-500/15 border-orange-500/25 text-orange-300' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                            }`}>
                              {emp.user.full_name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white leading-none">{emp.user.full_name}</div>
                              {emp.user.position && (
                                <div className="text-[10px] text-white/35 mt-0.5">{emp.user.position}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {emp.onDuty && !absent && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
                                на смене
                              </span>
                            )}
                            <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10" style={{ color: stCfg.color }}>
                              {stCfg.label}
                            </span>
                          </div>
                        </div>
                        <div className="px-4 py-2 space-y-1.5">
                          {assignments.map((a, i) => {
                            const planSt = WORK_PLAN_STATUS_CONFIG[a.plan.status]
                            return (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                {a.time && (
                                  <span className="font-mono text-cyan-400 shrink-0 bg-cyan-500/10 px-1.5 py-0.5 rounded mt-px">
                                    {a.time}
                                  </span>
                                )}
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium text-white/85">{a.location}</span>
                                  <span className="text-white/40"> — {a.work}</span>
                                </div>
                                <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border border-white/8 mt-px" style={{ color: planSt.color }}>
                                  {planSt.label}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Unassigned ── */}
      {unassigned.length > 0 && (
        <div>
          <div className="text-[10px] text-white/30 uppercase tracking-widest mb-3 px-1">
            Свободны · {unassigned.length}
          </div>
          <div className="space-y-4">
            {groupByRole(unassigned).map(({ group, items }) => (
              <div key={group}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-sm">{ROLE_GROUP_ICON[group]}</span>
                  <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">{ROLE_GROUP_LABELS[group]}</span>
                  <span className="text-[10px] text-white/25">· {items.length}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {items.map(({ emp }) => {
                    const stCfg  = EMPLOYEE_STATUS_CONFIG[emp.currentStatus]
                    const absent = ABSENT_STATUSES.has(emp.currentStatus)
                    return (
                      <div
                        key={emp.user.user_id}
                        className={`glass rounded-xl px-3 py-2.5 border flex items-center gap-2.5 ${
                          absent ? 'border-orange-500/15' : 'border-white/5'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          absent        ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                          : emp.onDuty  ? 'bg-emerald-500/12 border-emerald-500/20 text-emerald-400'
                          :               'bg-white/8 border-white/10 text-white/40'
                        }`}>
                          {emp.user.full_name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-white/70 font-medium truncate">{emp.user.full_name}</div>
                          {emp.user.position && (
                            <div className="text-[10px] text-white/30 truncate">{emp.user.position}</div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          <span className="text-[10px]" style={{ color: stCfg.color }}>{stCfg.label}</span>
                          {emp.onDuty && !absent && (
                            <span className="text-[9px] text-emerald-400/70">на смене</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
