'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  fetchWorkPlans, fetchWorkPlanWithItems,
  fetchAllCurrentStatuses, fetchServices,
} from '@/lib/api'
import type { WorkPlanWithItems, EnrichedEmployee, Service } from '@/types'
import { SERVICE_META, EMPLOYEE_STATUS_CONFIG, WORK_PLAN_STATUS_CONFIG } from '@/types'

// Shows all employees grouped by service with their work assignments for today.
// Used in Zamporab panel (all services).
export default function ShiftOverview() {
  const [employees, setEmployees] = useState<EnrichedEmployee[]>([])
  const [plans, setPlans]         = useState<WorkPlanWithItems[]>([])
  const [services, setServices]   = useState<Service[]>([])
  const [loading, setLoading]     = useState(true)
  const [expanded, setExpanded]   = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]
    const [emps, svcs, raw] = await Promise.all([
      fetchAllCurrentStatuses(),
      fetchServices(),
      fetchWorkPlans({ planDate: today }),
    ])
    const withItems = await Promise.all(raw.map(p => fetchWorkPlanWithItems(p.id)))
    setEmployees(emps)
    setServices(svcs)
    setPlans(withItems.filter(Boolean) as WorkPlanWithItems[])
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

  const getAssignments = (emp: EnrichedEmployee) => {
    const results: Array<{ location: string; work: string; time: string; status: string }> = []
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
          results.push({
            location: item.location,
            work: item.work_description,
            time: item.time_start ? `${item.time_start}${item.time_end ? `–${item.time_end}` : ''}` : '',
            status: plan.status,
          })
        }
      }
    }
    return results
  }

  if (loading) return <div className="text-center text-white/40 py-8 text-sm">Загрузка...</div>

  const serviceGroups = services.map(svc => {
    const svcEmps = employees.filter(e => e.user.service_id === svc.service_id)
    const withAssignments = svcEmps.map(emp => ({ emp, assignments: getAssignments(emp) }))
    const assigned = withAssignments.filter(e => e.assignments.length > 0)
    const free      = withAssignments.filter(e => e.assignments.length === 0)
    return { svc, assigned, free, total: svcEmps.length }
  }).filter(g => g.total > 0)

  const totalAll    = employees.length
  const assignedAll = serviceGroups.reduce((s, g) => s + g.assigned.length, 0)
  const freeAll     = totalAll - assignedAll

  return (
    <div className="space-y-3">
      {/* Global summary */}
      <div className="glass rounded-xl px-5 py-4 flex items-center gap-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{totalAll}</div>
          <div className="text-[10px] text-white/35 uppercase tracking-wider mt-0.5">всего</div>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-400">{assignedAll}</div>
          <div className="text-[10px] text-white/35 uppercase tracking-wider mt-0.5">на работах</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white/30">{freeAll}</div>
          <div className="text-[10px] text-white/35 uppercase tracking-wider mt-0.5">свободны</div>
        </div>
        <button onClick={load} className="ml-auto text-white/25 hover:text-white/50 text-lg transition-colors">↻</button>
      </div>

      {serviceGroups.length === 0 && (
        <div className="text-center py-12 text-white/20 text-sm">Нет сотрудников в системе</div>
      )}

      {/* Per-service cards */}
      {serviceGroups.map(({ svc, assigned, free, total }) => {
        const meta     = SERVICE_META[svc.service_id] ?? { emoji: '🔧' }
        const isOpen   = expanded.has(svc.service_id)
        const fillPct  = total > 0 ? Math.round(assigned.length / total * 100) : 0

        return (
          <div key={svc.service_id} className="glass rounded-xl border border-white/8 overflow-hidden">
            {/* Header — always visible */}
            <button
              onClick={() => toggleService(svc.service_id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
            >
              <span className="text-xl shrink-0">{meta.emoji}</span>
              <span className="font-medium text-white text-sm flex-1 text-left">{svc.service_name}</span>

              <div className="flex items-center gap-3 text-xs shrink-0">
                <span className="text-white/35">👥 {total}</span>
                {assigned.length > 0 && (
                  <span className="text-emerald-400 font-medium">✓ {assigned.length}</span>
                )}
                {free.length > 0 && (
                  <span className="text-white/30">◦ {free.length}</span>
                )}
                {/* mini progress bar */}
                <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
              </div>

              <span className="text-white/25 ml-1 text-xs">{isOpen ? '▲' : '▼'}</span>
            </button>

            {/* Expanded detail */}
            {isOpen && (
              <div className="border-t border-white/8 px-4 py-3 space-y-4">
                {/* Assigned */}
                {assigned.length > 0 && (
                  <div>
                    <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2">
                      На работах · {assigned.length}
                    </div>
                    <div className="space-y-2">
                      {assigned.map(({ emp, assignments }) => {
                        const stCfg = EMPLOYEE_STATUS_CONFIG[emp.currentStatus]
                        return (
                          <div key={emp.user.user_id} className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold text-emerald-300 shrink-0 mt-px">
                              {emp.user.full_name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-white/80 font-medium">{emp.user.full_name}</span>
                                <span className="text-[10px]" style={{ color: stCfg.color }}>{stCfg.label}</span>
                              </div>
                              {assignments.map((a, i) => {
                                const planStCfg = WORK_PLAN_STATUS_CONFIG[a.status as keyof typeof WORK_PLAN_STATUS_CONFIG]
                                return (
                                  <div key={i} className="flex items-center gap-1.5 mt-0.5 text-xs text-white/40">
                                    {a.time && (
                                      <span className="font-mono text-cyan-400 text-[11px] bg-cyan-500/10 px-1 py-px rounded">
                                        {a.time}
                                      </span>
                                    )}
                                    <span className="truncate">{a.location} — {a.work}</span>
                                    {planStCfg && (
                                      <span
                                        className="shrink-0 text-[10px] px-1.5 py-px rounded-full border"
                                        style={{ color: planStCfg.color, borderColor: planStCfg.color + '40' }}
                                      >
                                        {planStCfg.label}
                                      </span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Free */}
                {free.length > 0 && (
                  <div>
                    <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2">
                      Свободны · {free.length}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {free.map(({ emp }) => {
                        const stCfg = EMPLOYEE_STATUS_CONFIG[emp.currentStatus]
                        return (
                          <div
                            key={emp.user.user_id}
                            className="flex items-center gap-1.5 bg-white/5 border border-white/8 rounded-lg px-2.5 py-1"
                          >
                            <span className="text-[11px] text-white/60">{emp.user.full_name}</span>
                            <span className="text-[10px] shrink-0" style={{ color: stCfg.color }}>
                              {stCfg.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
