'use client'
import { useEffect, useState, useCallback } from 'react'
import { fetchWorkPlans, fetchWorkPlansWithItems, fetchServices, fetchUsers } from '@/lib/api-client'
import type { WorkPlanWithItems, Service, User } from '@/types'
import { SERVICE_META, WORK_PLAN_STATUS_CONFIG } from '@/types'
import { WorkerIcon } from '@/components/RoleIcons'

interface Props {
  onRefresh?: () => void
}

export default function LiveBoard({ onRefresh }: Props) {
  const [plans, setPlans] = useState<WorkPlanWithItems[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]
    const [raw, svcs, usrs] = await Promise.all([
      fetchWorkPlans({ planDate: today }),
      fetchServices(),
      fetchUsers(true),
    ])
    const withItems = await fetchWorkPlansWithItems(raw.map(p => p.id))
    setPlans(withItems)
    setServices(svcs)
    setUsers(usrs)
    setLoading(false)
    onRefresh?.()
  }, [onRefresh])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  if (loading) return <div className="text-center text-white/40 py-12">Загрузка...</div>

  const activePlans = plans.filter(p => ['PLANNED', 'IN_PROGRESS', 'DONE'].includes(p.status))
  const grouped = services.map(svc => ({
    svc,
    plans: activePlans.filter(p => p.service_id === svc.service_id),
  })).filter(g => g.plans.length > 0)

  if (grouped.length === 0) {
    return (
      <div className="text-center py-16 text-white/30">
        <div className="text-5xl mb-3">🏗️</div>
        <div className="text-sm">Нет активных планов на сегодня</div>
        <div className="text-xs text-white/20 mt-1">Планы появятся после согласования зам.прорабом</div>
      </div>
    )
  }

  const totalWorkers = activePlans.reduce((sum, p) => sum + p.items.reduce((s, i) => s + i.workers.length, 0), 0)
  const inProgress = activePlans.filter(p => p.status === 'IN_PROGRESS').length
  const done = activePlans.filter(p => p.status === 'DONE').length

  // users is fetched but available for future enrichment
  void users

  return (
    <div>
      {/* Summary bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Всего планов', value: activePlans.length, color: 'text-white' },
          { label: 'В работе', value: inProgress, color: 'text-violet-400' },
          { label: 'Выполнено', value: done, color: 'text-green-400' },
          { label: 'Человек задействовано', value: totalWorkers, color: 'text-cyan-400' },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
            <div className="text-xs text-white/40 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Plans by service */}
      <div className="space-y-6">
        {grouped.map(({ svc, plans: svcPlans }) => {
          const meta = SERVICE_META[svc.service_id] ?? { emoji: '🔧', color: '#94a3b8', bg: 'bg-slate-500/20' }
          return (
            <div key={svc.service_id}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{meta.emoji}</span>
                <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider">{svc.service_name}</h3>
                <span className="text-xs text-white/30">({svcPlans.length} план.)</span>
              </div>
              <div className="space-y-3">
                {svcPlans.map(plan => {
                  const statusCfg = WORK_PLAN_STATUS_CONFIG[plan.status]
                  const shiftLabel = plan.shift_type === 'DAY' ? '☀️ 07:30–19:00' : '🌙 21:00–07:00'
                  const totalPlanWorkers = plan.items.reduce((s, i) => s + i.workers.length, 0)
                  return (
                    <div key={plan.id} className={`glass rounded-xl overflow-hidden border ${
                      plan.status === 'IN_PROGRESS' ? 'border-violet-500/30' :
                      plan.status === 'DONE' ? 'border-green-500/20' :
                      'border-white/5'
                    }`}>
                      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-white/60">{shiftLabel}</span>
                          {plan.status === 'IN_PROGRESS' && plan.fact_start && (
                            <span className="text-xs text-violet-400">
                              начато {new Date(plan.fact_start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {plan.status === 'DONE' && plan.fact_finish && (
                            <span className="text-xs text-green-400">
                              завершено {new Date(plan.fact_finish).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {totalPlanWorkers > 0 && (
                            <span className="text-xs text-white/40"><WorkerIcon className="w-3.5 h-3.5" /> {totalPlanWorkers}</span>
                          )}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusCfg.bg}`} style={{ color: statusCfg.color }}>
                            {statusCfg.label}
                          </span>
                        </div>
                      </div>
                      <div className="px-4 py-3 space-y-2">
                        {plan.items.map(item => (
                          <div key={item.id} className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {item.time_start && (
                                  <span className="text-xs font-mono text-cyan-400 shrink-0">
                                    {item.time_start}{item.time_end ? `–${item.time_end}` : ''}
                                  </span>
                                )}
                                <span className="text-sm font-medium text-white truncate">{item.location}</span>
                                <span className="text-sm text-white/50 truncate">— {item.work_description}</span>
                              </div>
                              {item.workers.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {item.workers.map((w, i) => (
                                    <span key={i} className="text-[10px] bg-blue-500/15 text-blue-300 px-1.5 py-0.5 rounded-full border border-blue-500/20">{w}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {plan.items.length === 0 && (
                          <div className="text-xs text-white/20 italic">Позиции не добавлены</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
