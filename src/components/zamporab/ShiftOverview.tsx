'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  fetchWorkPlans, fetchWorkPlansWithItems,
  fetchAllCurrentStatuses, fetchServices, fetchUsersWithAssignments,
} from '@/lib/api-client'
import type { WorkPlanWithItems, EnrichedEmployee, Service, EmployeeStatusType, UserWithAssignment } from '@/types'
import { SERVICE_META, EMPLOYEE_STATUS_CONFIG, WORK_PLAN_STATUS_CONFIG } from '@/types'
import { isWorkerOnDuty } from '@/lib/shifts'

// Shows all employees grouped by service → role → status.
// Used in Zamporab panel (all services).

// ── Absent statuses ───────────────────────────────────────────────────────────
const ABSENT_STATUSES = new Set<EmployeeStatusType>([
  'Otgul', 'Bolnichniy', 'Otpusk', 'Komandirovka',
  'Uchebniy_otpusk', 'Dekret', 'Mobilizovan', 'SVO', 'Troydoustroyen_s_SVO',
])

// ── Role grouping ─────────────────────────────────────────────────────────────
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
  const rl  = (emp.user.role_level ?? '').toLowerCase()
  const pos = (emp.user.position ?? '').toLowerCase()
  if (['head', 'chief_engineer', 'specialist', 'zamporab', 'hr', 'safety_engineer', 'boss', 'admin'].includes(rl)) return 'itr'
  if (rl === 'foreman')          return 'master'
  if (rl === 'driver')           return 'driver'
  if (pos.includes('бригадир')) return 'brigadier'
  if (rl === 'worker')           return 'worker'
  return 'other'
}

type EmpWithDuty = { emp: EnrichedEmployee; onDuty: boolean; assignments: Assignment[] }
type Assignment  = { location: string; work: string; time: string; status: string }

export default function ShiftOverview() {
  const [empData, setEmpData]   = useState<EmpWithDuty[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    const today    = new Date()
    const todayStr = today.toISOString().split('T')[0]

    const [emps, svcs, raw, userAssignments] = await Promise.all([
      fetchAllCurrentStatuses(),
      fetchServices(),
      fetchWorkPlans({ planDate: todayStr }),
      fetchUsersWithAssignments(),
    ])
    const plans = await fetchWorkPlansWithItems(raw.map(p => p.id))

    const assignmentMap = new Map<string, UserWithAssignment>(
      userAssignments.map(u => [u.user_id, u])
    )

    const data: EmpWithDuty[] = emps.map(emp => {
      const ua = assignmentMap.get(emp.user.user_id)
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

      const assignments: Assignment[] = []
      for (const plan of plans) {
        if (!['PLANNED', 'IN_PROGRESS', 'DONE', 'APPROVED', 'BOSS_CONFIRMED', 'ASSIGNED'].includes(plan.status)) continue
        for (const item of plan.items) {
          const lastName  = emp.user.last_name?.toLowerCase() ?? ''
          const firstPart = emp.user.full_name.toLowerCase().split(' ')[0]
          const match = item.workers.some(w =>
            (lastName && w.toLowerCase().includes(lastName)) ||
            w.toLowerCase().includes(firstPart)
          )
          if (match) {
            assignments.push({
              location: item.location,
              work:     item.work_description,
              time:     item.time_start ? `${item.time_start}${item.time_end ? `–${item.time_end}` : ''}` : '',
              status:   plan.status,
            })
          }
        }
      }
      return { emp, onDuty, assignments }
    })

    setEmpData(data)
    setServices(svcs)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const toggleService = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading) return <div className="text-center text-white/40 py-8 text-sm">Загрузка...</div>

  const serviceGroups = services.map(svc => {
    const list = empData.filter(e => e.emp.user.service_id === svc.service_id)
    const onDutyCount  = list.filter(e => e.onDuty && !ABSENT_STATUSES.has(e.emp.currentStatus)).length
    const absentCount  = list.filter(e => ABSENT_STATUSES.has(e.emp.currentStatus)).length
    const assignedCount = list.filter(e => e.assignments.length > 0).length
    return { svc, list, onDutyCount, absentCount, assignedCount, total: list.length }
  }).filter(g => g.total > 0)

  const totalAll    = empData.length
  const onDutyAll   = empData.filter(e => e.onDuty && !ABSENT_STATUSES.has(e.emp.currentStatus)).length
  const absentAll   = empData.filter(e => ABSENT_STATUSES.has(e.emp.currentStatus)).length
  const assignedAll = empData.filter(e => e.assignments.length > 0).length

  return (
    <div className="space-y-3">
      {/* Global summary */}
      <div className="glass rounded-xl px-5 py-4 flex flex-wrap items-center gap-5">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{totalAll}</div>
          <div className="text-[10px] text-white/35 uppercase tracking-wider mt-0.5">всего</div>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-400">{onDutyAll}</div>
          <div className="text-[10px] text-white/35 uppercase tracking-wider mt-0.5">на смене</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{assignedAll}</div>
          <div className="text-[10px] text-white/35 uppercase tracking-wider mt-0.5">на работах</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-400">{absentAll}</div>
          <div className="text-[10px] text-white/35 uppercase tracking-wider mt-0.5">отсутствуют</div>
        </div>
        <button onClick={load} className="ml-auto text-white/25 hover:text-white/50 text-lg transition-colors">↻</button>
      </div>

      {serviceGroups.length === 0 && (
        <div className="text-center py-12 text-white/20 text-sm">Нет сотрудников в системе</div>
      )}

      {/* Per-service cards */}
      {serviceGroups.map(({ svc, list, onDutyCount, absentCount, assignedCount, total }) => {
        const meta   = SERVICE_META[svc.service_id] ?? { emoji: '🔧' }
        const isOpen = expanded.has(svc.service_id)
        const fillPct = total > 0 ? Math.round(onDutyCount / total * 100) : 0

        // Group by role
        const byRole = new Map<RoleGroup, EmpWithDuty[]>()
        for (const item of list) {
          const g = getRoleGroup(item.emp)
          if (!byRole.has(g)) byRole.set(g, [])
          byRole.get(g)!.push(item)
        }
        const roleGroups = ROLE_GROUP_ORDER
          .filter(g => byRole.has(g))
          .map(g => ({ group: g, items: byRole.get(g)! }))

        return (
          <div key={svc.service_id} className="glass rounded-xl border border-white/8 overflow-hidden">
            {/* Header */}
            <button
              onClick={() => toggleService(svc.service_id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
            >
              <span className="text-xl shrink-0">{meta.emoji}</span>
              <span className="font-medium text-white text-sm flex-1 text-left">{svc.service_name}</span>

              <div className="flex items-center gap-3 text-xs shrink-0">
                <span className="text-white/35">👥 {total}</span>
                {onDutyCount > 0 && (
                  <span className="text-emerald-400 font-medium">☀ {onDutyCount}</span>
                )}
                {assignedCount > 0 && (
                  <span className="text-blue-400">✓ {assignedCount}</span>
                )}
                {absentCount > 0 && (
                  <span className="text-orange-400">⊘ {absentCount}</span>
                )}
                <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${fillPct}%` }} />
                </div>
              </div>

              <span className="text-white/25 ml-1 text-xs">{isOpen ? '▲' : '▼'}</span>
            </button>

            {/* Expanded: role groups */}
            {isOpen && (
              <div className="border-t border-white/8 px-4 py-3 space-y-4">
                {roleGroups.map(({ group, items }) => (
                  <div key={group}>
                    {/* Role heading */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">{ROLE_GROUP_ICON[group]}</span>
                      <span className="text-[10px] font-semibold text-white/45 uppercase tracking-wider">{ROLE_GROUP_LABELS[group]}</span>
                      <span className="text-[10px] text-white/20">· {items.length}</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                      {items.map(({ emp, onDuty, assignments }) => {
                        const stCfg  = EMPLOYEE_STATUS_CONFIG[emp.currentStatus]
                        const absent = ABSENT_STATUSES.has(emp.currentStatus)
                        const working = assignments.length > 0

                        return (
                          <div key={emp.user.user_id} className={`rounded-lg border px-3 py-2 ${
                            absent          ? 'bg-orange-500/5 border-orange-500/15'
                            : working       ? 'bg-blue-500/5 border-blue-500/15'
                            : onDuty        ? 'bg-emerald-500/5 border-emerald-500/10'
                            :                 'bg-white/2 border-white/5'
                          }`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${
                                  absent   ? 'bg-orange-400'
                                  : working ? 'bg-blue-400'
                                  : onDuty  ? 'bg-emerald-400'
                                  :           'bg-white/20'
                                }`} />
                                <div className="min-w-0">
                                  <div className={`text-sm font-medium leading-none truncate ${absent ? 'text-white/45' : 'text-white/85'}`}>
                                    {emp.user.full_name}
                                  </div>
                                  {emp.user.position && (
                                    <div className="text-[10px] text-white/30 mt-0.5 truncate">{emp.user.position}</div>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-0.5 shrink-0">
                                {onDuty && !absent && (
                                  <span className="text-[9px] px-1 py-px rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 whitespace-nowrap">
                                    смена
                                  </span>
                                )}
                                <span
                                  className="text-[9px] px-1 py-px rounded-full border whitespace-nowrap"
                                  style={{ color: stCfg.color, borderColor: stCfg.color + '40' }}
                                >
                                  {stCfg.label}
                                </span>
                              </div>
                            </div>

                            {/* Work assignments */}
                            {assignments.map((a, i) => {
                              const planStCfg = WORK_PLAN_STATUS_CONFIG[a.status as keyof typeof WORK_PLAN_STATUS_CONFIG]
                              return (
                                <div key={i} className="mt-1.5 text-[10px] text-white/40 border-t border-white/5 pt-1">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {a.time && (
                                      <span className="font-mono text-cyan-400 bg-cyan-500/10 px-1 py-px rounded shrink-0">
                                        {a.time}
                                      </span>
                                    )}
                                    {planStCfg && (
                                      <span
                                        className="shrink-0 px-1 py-px rounded-full border"
                                        style={{ color: planStCfg.color, borderColor: planStCfg.color + '40' }}
                                      >
                                        {planStCfg.label}
                                      </span>
                                    )}
                                  </div>
                                  <div className="truncate mt-0.5">{a.location}{a.location && ' — '}{a.work}</div>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
