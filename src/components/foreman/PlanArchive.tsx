'use client'
import { useState, useEffect, useCallback } from 'react'
import type { WorkPlanWithItems, WorkAssignmentWithUser, Service, AuthSession } from '@/types'
import { fetchWorkPlans, fetchWorkPlansWithItems, fetchWorkAssignmentsForItems } from '@/lib/api-client'
import { WORK_PLAN_STATUS_CONFIG } from '@/types'

const SERVICE_EMOJI: Record<string, string> = {
  'SRV-ENG':  '⚡',
  'SRV-STR':  '🏗️',
  'SRV-FIRE': '🚒',
  'SRV-VENT': '💨',
  'SRV-CCTV': '📹',
}

const MONTH_NAMES_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

const DAY_NAMES_RU = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()} ${MONTH_NAMES_RU[d.getMonth()].toLowerCase()}, ${DAY_NAMES_RU[d.getDay()]}`
}

const ROLE_ICONS: Record<string, string> = {
  WORKER: '👷', BRIGADIER: '⭐', MASTER: '🦺', ITR: '📋', DRIVER: '🚗',
}
const ROLE_LABELS: Record<string, string> = {
  WORKER: 'Рабочий', BRIGADIER: 'Бригадир', MASTER: 'Мастер', ITR: 'ИТР', DRIVER: 'Водитель',
}

interface Props {
  session: AuthSession
  services: Service[]
}

export default function PlanArchive({ session, services }: Props) {
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth())
  const [year, setYear]   = useState(today.getFullYear())
  const [filterService, setFilterService] = useState('')
  const [plans, setPlans] = useState<WorkPlanWithItems[]>([])
  const [assignmentsMap, setAssignmentsMap] = useState<Map<string, WorkAssignmentWithUser[]>>(new Map())
  const [loading, setLoading] = useState(false)
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null)

  const dateFrom = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay  = new Date(year, month + 1, 0).getDate()
  const dateTo   = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  const todayStr = today.toISOString().split('T')[0]

  const load = useCallback(async () => {
    setLoading(true)
    setExpandedPlanId(null)

    const rawPlans = await fetchWorkPlans({
      serviceId: filterService || undefined,
      dateFrom,
      dateTo,
    })

    // Exclude today and future — this is an archive
    const pastPlans = rawPlans.filter(p => p.plan_date < todayStr)

    const validPlans = await fetchWorkPlansWithItems(pastPlans.map(p => p.id))
    setPlans(validPlans)

    const allItemIds = validPlans.flatMap(p => p.items.map(i => i.id))
    if (allItemIds.length > 0) {
      const asgns = await fetchWorkAssignmentsForItems(allItemIds)
      const map = new Map<string, WorkAssignmentWithUser[]>()
      for (const a of asgns) {
        if (!map.has(a.plan_item_id)) map.set(a.plan_item_id, [])
        map.get(a.plan_item_id)!.push(a)
      }
      setAssignmentsMap(map)
    } else {
      setAssignmentsMap(new Map())
    }

    setLoading(false)
  }, [filterService, dateFrom, dateTo, todayStr]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    const nextM = month === 11 ? 0 : month + 1
    const nextY = month === 11 ? year + 1 : year
    // Don't navigate beyond current month
    if (nextY > today.getFullYear() || (nextY === today.getFullYear() && nextM >= today.getMonth())) return
    setMonth(nextM); if (month === 11) setYear(y => y + 1)
  }
  const isNextDisabled = year > today.getFullYear() ||
    (year === today.getFullYear() && month >= today.getMonth() - 1)

  // Group by date descending
  const byDate = plans.reduce<Record<string, WorkPlanWithItems[]>>((acc, p) => {
    if (!acc[p.plan_date]) acc[p.plan_date] = []
    acc[p.plan_date].push(p)
    return acc
  }, {})
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  // Stats for the month
  const totalPlans = plans.length
  const donePlans  = plans.filter(p => p.status === 'DONE').length
  const totalItems = plans.reduce((s, p) => s + p.items.length, 0)
  const totalWorkers = [...assignmentsMap.values()].reduce((s, a) => s + a.length, 0)

  return (
    <div className="space-y-4">
      {/* Navigation header */}
      <div className="glass rounded-xl border border-white/10 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Month navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors flex items-center justify-center text-sm"
            >
              ‹
            </button>
            <span className="text-sm font-semibold text-white min-w-[130px] text-center">
              {MONTH_NAMES_RU[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              disabled={isNextDisabled}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-sm"
            >
              ›
            </button>
          </div>

          {/* Service filter */}
          <select
            value={filterService}
            onChange={e => setFilterService(e.target.value)}
            className="form-select"
          >
            <option value="">Все службы</option>
            {services.map(s => (
              <option key={s.service_id} value={s.service_id}>{s.service_name}</option>
            ))}
          </select>

          <button
            onClick={load}
            className="ml-auto px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm transition-colors"
          >
            ↻
          </button>
        </div>

        {/* Month stats */}
        {!loading && totalPlans > 0 && (
          <div className="flex gap-4 mt-3 pt-3 border-t border-white/5 text-xs text-white/40">
            <span>Планов: <span className="text-white/70 font-medium">{totalPlans}</span></span>
            <span>Выполнено: <span className="text-green-400 font-medium">{donePlans}</span></span>
            <span>Работ: <span className="text-white/70 font-medium">{totalItems}</span></span>
            <span>Назначений: <span className="text-white/70 font-medium">{totalWorkers}</span></span>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center text-white/30 py-12">Загрузка архива...</div>
      ) : plans.length === 0 ? (
        <div className="text-center text-white/20 py-12 text-sm">
          Нет планов за {MONTH_NAMES_RU[month].toLowerCase()} {year}
        </div>
      ) : (
        <div className="space-y-4">
          {dates.map(date => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                  {formatDay(date)}
                </span>
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[10px] text-white/20">{byDate[date].length} план{byDate[date].length > 1 ? 'а' : ''}</span>
              </div>

              {/* Plans for this date */}
              <div className="space-y-2">
                {byDate[date].map(plan => {
                  const isExpanded = expandedPlanId === plan.id
                  const svc = services.find(s => s.service_id === plan.service_id)
                  const statusCfg = WORK_PLAN_STATUS_CONFIG[plan.status]
                  const shiftLabel = plan.shift_type === 'DAY' ? '☀️ День' : '🌙 Ночь'
                  const emoji = SERVICE_EMOJI[plan.service_id] ?? '🏢'
                  const totalAssigned = plan.items.reduce(
                    (s, i) => s + (assignmentsMap.get(i.id)?.length ?? 0), 0
                  )

                  return (
                    <div
                      key={plan.id}
                      className={`glass rounded-xl border transition-all ${
                        plan.status === 'DONE'
                          ? 'border-green-500/20'
                          : plan.status === 'IN_PROGRESS'
                          ? 'border-violet-500/20'
                          : 'border-white/8'
                      } ${isExpanded ? 'shadow-lg' : ''}`}
                    >
                      {/* Plan header — clickable */}
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3 text-left"
                        onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                      >
                        <span className="text-lg shrink-0">{emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-white/80 truncate">
                              {svc?.service_name ?? plan.service_id}
                            </span>
                            <span className="text-[10px] text-white/30">{shiftLabel}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-[10px] text-white/25">
                            <span>{plan.items.length} работ{plan.items.length === 1 ? 'а' : ''}</span>
                            {totalAssigned > 0 && <span>👷 {totalAssigned} назначено</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border ${statusCfg.bg}`}
                            style={{ color: statusCfg.color }}
                          >
                            {statusCfg.label}
                          </span>
                          <span className="text-white/20 text-xs">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </button>

                      {/* Expanded: items + assignments */}
                      {isExpanded && (
                        <div className="border-t border-white/5 px-4 py-3 space-y-3">
                          {plan.items.length === 0 ? (
                            <div className="text-xs text-white/20 italic">Нет позиций</div>
                          ) : (
                            plan.items.map(item => {
                              const itemAssignments = assignmentsMap.get(item.id) ?? []
                              return (
                                <div key={item.id} className="rounded-lg bg-white/3 p-3">
                                  {/* Item header */}
                                  <div className="flex items-start gap-2 mb-2">
                                    {item.time_start && (
                                      <span className="text-[10px] font-mono text-cyan-400 shrink-0 pt-0.5">
                                        {item.time_start}{item.time_end ? `–${item.time_end}` : ''}
                                      </span>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <span className="text-xs font-semibold text-white/80">{item.location}</span>
                                      {item.work_description && (
                                        <span className="text-[10px] text-white/40 ml-2">{item.work_description}</span>
                                      )}
                                    </div>
                                    {/* Requirements summary */}
                                    <div className="flex gap-2 shrink-0 text-[10px] text-white/30">
                                      {item.required_workers > 0 && <span>👷×{item.required_workers}</span>}
                                      {item.required_foremen > 0 && <span>🦺×{item.required_foremen}</span>}
                                      {item.required_vehicles > 0 && <span>🚛×{item.required_vehicles}</span>}
                                    </div>
                                  </div>

                                  {/* Assigned workers */}
                                  {itemAssignments.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {itemAssignments.map(a => (
                                        <span
                                          key={a.id}
                                          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60"
                                          title={ROLE_LABELS[a.role] ?? a.role}
                                        >
                                          <span>{ROLE_ICONS[a.role] ?? '👤'}</span>
                                          <span>{a.user?.full_name ?? '—'}</span>
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-white/20 italic">Никто не назначен</div>
                                  )}

                                  {/* Notes */}
                                  {item.notes && (
                                    <div className="mt-2 text-[10px] text-white/30 italic border-t border-white/5 pt-2">
                                      {item.notes}
                                    </div>
                                  )}
                                </div>
                              )
                            })
                          )}

                          {/* Plan timing info */}
                          {(plan.fact_start || plan.fact_finish || plan.completed_at) && (
                            <div className="flex gap-4 text-[10px] text-white/25 pt-1 border-t border-white/5">
                              {plan.fact_start && (
                                <span>
                                  Начало: <span className="text-white/40">
                                    {new Date(plan.fact_start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </span>
                              )}
                              {(plan.fact_finish || plan.completed_at) && (
                                <span>
                                  Окончание: <span className="text-white/40">
                                    {new Date((plan.fact_finish ?? plan.completed_at)!).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
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
}
