'use client'
import { useEffect, useState, useCallback } from 'react'
import { fetchWorkPlans, fetchWorkPlanWithItems, fetchAllCurrentStatuses } from '@/lib/api'
import type { WorkPlanWithItems, EnrichedEmployee } from '@/types'
import { EMPLOYEE_STATUS_CONFIG, WORK_PLAN_STATUS_CONFIG } from '@/types'

interface Props {
  serviceId: string
}

export default function StaffBoard({ serviceId }: Props) {
  const [employees, setEmployees] = useState<EnrichedEmployee[]>([])
  const [plans, setPlans] = useState<WorkPlanWithItems[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]
    const [emps, raw] = await Promise.all([
      fetchAllCurrentStatuses(),
      fetchWorkPlans({ planDate: today }),
    ])
    const myEmps = emps.filter(e => e.user.service_id === serviceId)
    const withItems = await Promise.all(raw.map(p => fetchWorkPlanWithItems(p.id)))
    setEmployees(myEmps)
    setPlans(withItems.filter(Boolean) as WorkPlanWithItems[])
    setLoading(false)
  }, [serviceId])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="text-center text-white/40 py-8 text-sm">Загрузка...</div>

  const empAssignments = employees.map(emp => {
    const assignments: Array<{ plan: WorkPlanWithItems; location: string; work: string; time: string }> = []
    for (const plan of plans) {
      if (!['PLANNED', 'IN_PROGRESS', 'DONE', 'APPROVED', 'BOSS_CONFIRMED', 'ASSIGNED'].includes(plan.status)) continue
      for (const item of plan.items) {
        const lastName = emp.user.last_name?.toLowerCase() ?? ''
        const firstNamePart = emp.user.full_name.toLowerCase().split(' ')[0]
        const match = item.workers.some(w =>
          (lastName && w.toLowerCase().includes(lastName)) ||
          w.toLowerCase().includes(firstNamePart)
        )
        if (match) {
          assignments.push({
            plan,
            location: item.location,
            work: item.work_description,
            time: item.time_start ? `${item.time_start}${item.time_end ? `–${item.time_end}` : ''}` : '',
          })
        }
      }
    }
    return { emp, assignments }
  })

  const assigned   = empAssignments.filter(e => e.assignments.length > 0)
  const unassigned = empAssignments.filter(e => e.assignments.length === 0)

  if (employees.length === 0) {
    return <div className="text-center text-white/20 py-12 text-sm">Нет сотрудников в службе</div>
  }

  return (
    <div className="space-y-5">

      {/* ── Summary ── */}
      <div className="glass rounded-xl px-5 py-4 flex items-center gap-8">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{employees.length}</div>
          <div className="text-[10px] text-white/35 uppercase tracking-wider mt-0.5">всего</div>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-400">{assigned.length}</div>
          <div className="text-[10px] text-white/35 uppercase tracking-wider mt-0.5">назначены</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white/30">{unassigned.length}</div>
          <div className="text-[10px] text-white/35 uppercase tracking-wider mt-0.5">свободны</div>
        </div>
        <button onClick={load} className="ml-auto text-white/25 hover:text-white/50 text-lg transition-colors">↻</button>
      </div>

      {/* ── Assigned ── */}
      {assigned.length > 0 && (
        <div>
          <div className="text-[10px] text-white/30 uppercase tracking-widest mb-3 px-1">
            Назначены на работы
          </div>
          <div className="space-y-2">
            {assigned.map(({ emp, assignments }) => {
              const stCfg = EMPLOYEE_STATUS_CONFIG[emp.currentStatus]
              return (
                <div key={emp.user.user_id} className="glass rounded-xl overflow-hidden border border-white/8">
                  {/* Employee header */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[11px] font-bold text-emerald-300 shrink-0">
                        {emp.user.full_name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white leading-none">{emp.user.full_name}</div>
                        {emp.user.position && (
                          <div className="text-[10px] text-white/35 mt-0.5">{emp.user.position}</div>
                        )}
                      </div>
                    </div>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 shrink-0"
                      style={{ color: stCfg.color }}
                    >
                      {stCfg.label}
                    </span>
                  </div>

                  {/* Work assignments */}
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
                          <span
                            className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border border-white/8 mt-px"
                            style={{ color: planSt.color }}
                          >
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
      )}

      {/* ── Unassigned ── */}
      {unassigned.length > 0 && (
        <div>
          <div className="text-[10px] text-white/30 uppercase tracking-widest mb-3 px-1">
            Свободны · {unassigned.length}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {unassigned.map(({ emp }) => {
              const stCfg = EMPLOYEE_STATUS_CONFIG[emp.currentStatus]
              return (
                <div
                  key={emp.user.user_id}
                  className="glass rounded-xl px-3 py-2.5 border border-white/5 flex items-center gap-2.5"
                >
                  <div className="w-6 h-6 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white/40 shrink-0">
                    {emp.user.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white/70 font-medium truncate">{emp.user.full_name}</div>
                    {emp.user.position && (
                      <div className="text-[10px] text-white/30 truncate">{emp.user.position}</div>
                    )}
                  </div>
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
  )
}
