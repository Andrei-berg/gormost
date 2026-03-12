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

  if (loading) return <div className="text-center text-white/40 py-8">Загрузка...</div>

  const empAssignments = employees.map(emp => {
    const assignments: Array<{ plan: WorkPlanWithItems; location: string; work: string; time: string }> = []
    for (const plan of plans) {
      if (!['PLANNED', 'IN_PROGRESS', 'DONE', 'APPROVED'].includes(plan.status)) continue
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

  const assigned = empAssignments.filter(e => e.assignments.length > 0)
  const unassigned = empAssignments.filter(e => e.assignments.length === 0)

  return (
    <div className="space-y-4">
      {assigned.length > 0 && (
        <div>
          <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Назначены на работы ({assigned.length})</div>
          <div className="space-y-2">
            {assigned.map(({ emp, assignments }) => {
              const stCfg = EMPLOYEE_STATUS_CONFIG[emp.currentStatus]
              return (
                <div key={emp.user.user_id} className="glass rounded-xl p-3 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium text-white">{emp.user.full_name}</span>
                      {emp.user.position && <span className="text-xs text-white/40 ml-2">{emp.user.position}</span>}
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-lg border border-white/10" style={{ color: stCfg.color }}>
                      {stCfg.label}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {assignments.map((a, i) => {
                      const planSt = WORK_PLAN_STATUS_CONFIG[a.plan.status]
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          {a.time && <span className="font-mono text-cyan-400 shrink-0">{a.time}</span>}
                          <span className="text-white/80 font-medium">{a.location}</span>
                          <span className="text-white/50">— {a.work}</span>
                          <span className="ml-auto shrink-0 px-1.5 py-0.5 rounded-full text-[10px] border border-white/10" style={{ color: planSt.color }}>
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

      {unassigned.length > 0 && (
        <div>
          <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Не назначены ({unassigned.length})</div>
          <div className="flex flex-wrap gap-2">
            {unassigned.map(({ emp }) => {
              const stCfg = EMPLOYEE_STATUS_CONFIG[emp.currentStatus]
              return (
                <div key={emp.user.user_id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass border border-white/5">
                  <span className="text-sm text-white/70">{emp.user.full_name}</span>
                  <span className="text-xs" style={{ color: stCfg.color }}>{stCfg.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {employees.length === 0 && (
        <div className="text-center text-white/20 py-8">Нет сотрудников в службе</div>
      )}
    </div>
  )
}
