'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  WorkPlanWithItems, WorkPlanItem, UserWithAssignment,
  WorkAssignmentWithUser, WorkAssignmentRole, Service, AuthSession,
} from '@/types'
import {
  fetchWorkPlans, fetchWorkPlansWithItems,
  fetchWorkAssignmentsForItems, createWorkAssignment, deleteWorkAssignment,
  markWorkPlanAssigned, startWorkPlan, completeWorkPlan,
  fetchUsersWithAssignments,
} from '@/lib/api-client'
import { isWorkerOnDuty, getShiftForDate } from '@/lib/shifts'
import { WORK_PLAN_STATUS_CONFIG } from '@/types'
import StatusPlanBadge from '@/components/help/StatusPlanBadge'
import WithTooltip from '@/components/help/WithTooltip'
import WorkPermitModal from '@/components/head/WorkPermitModal'
import DirectiveAlert from '@/components/foreman/DirectiveAlert'

const ROLE_LABELS: Record<WorkAssignmentRole, string> = {
  WORKER: 'Рабочий',
  BRIGADIER: 'Бригадир',
  MASTER: 'Мастер',
  ITR: 'ИТР',
  DRIVER: 'Водитель',
}

const ROLE_COLORS: Record<WorkAssignmentRole, string> = {
  WORKER: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  BRIGADIER: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  MASTER: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  ITR: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  DRIVER: 'bg-green-500/20 text-green-300 border-green-500/30',
}

const ROLE_ICONS: Record<WorkAssignmentRole, string> = {
  WORKER: '👷',
  BRIGADIER: '⭐',
  MASTER: '🦺',
  ITR: '📋',
  DRIVER: '🚗',
}

interface Props {
  session: AuthSession
  services: Service[]
}

export default function BrigadeAssigner({ session, services }: Props) {
  const [plans, setPlans] = useState<WorkPlanWithItems[]>([])
  const [onDutyWorkers, setOnDutyWorkers] = useState<UserWithAssignment[]>([])
  const [allAssignments, setAllAssignments] = useState<WorkAssignmentWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [workerFilter, setWorkerFilter] = useState<'all' | 'free'>('all')
  const [rosterPanel, setRosterPanel] = useState<'free' | 'assigned' | null>(null)
  const [overdueOpen, setOverdueOpen] = useState(false)

  const today = new Date()
  const shiftInfo = getShiftForDate(today)

  const load = useCallback(async () => {
    // Do NOT setLoading(true) here — that unmounts child components and resets their
    // local state (activeItemId, pickerRole). Loading spinner only shows on first mount.
    const [rawPlans, allUsers] = await Promise.all([
      fetchWorkPlans({
        statuses: ['SUBMITTED', 'APPROVED', 'PLANNED', 'BOSS_CONFIRMED', 'ASSIGNED', 'IN_PROGRESS', 'DONE'],
      }),
      fetchUsersWithAssignments(),
    ])

    const validPlans = await fetchWorkPlansWithItems(rawPlans.map(p => p.id))
    setPlans(validPlans)

    const onDuty = allUsers.filter(u => {
      if (!u.assignment) return false
      return isWorkerOnDuty({
        shift_num: u.assignment.shift_num,
        schedule_code: u.assignment.schedule_code ?? '',
        shift_reference_date: u.assignment.shift_reference_date,
        rotation_group: u.assignment.rotation_group,
      }, today)
    })
    setOnDutyWorkers(onDuty)

    // Load all assignments for all items in one query
    const allItemIds = validPlans.flatMap(p => p.items.map(i => i.id))
    const assignments = await fetchWorkAssignmentsForItems(allItemIds)
    setAllAssignments(assignments)

    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  // Map: itemId → assignments for that item
  const itemAssignmentsMap = useMemo(() => {
    const map = new Map<string, WorkAssignmentWithUser[]>()
    for (const a of allAssignments) {
      if (!map.has(a.plan_item_id)) map.set(a.plan_item_id, [])
      map.get(a.plan_item_id)!.push(a)
    }
    return map
  }, [allAssignments])

  // Map: userId → locations where this worker is assigned (across all plans today)
  const workerBusyMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const plan of plans) {
      for (const item of plan.items) {
        const assignments = itemAssignmentsMap.get(item.id) ?? []
        for (const a of assignments) {
          if (!map.has(a.user_id)) map.set(a.user_id, [])
          map.get(a.user_id)!.push(item.location)
        }
      }
    }
    return map
  }, [plans, itemAssignmentsMap])

  // All on-duty workers across all services — master sees everyone
  const serviceWorkers = useMemo(
    () => onDutyWorkers,
    [onDutyWorkers]
  )

  const assignedInServiceIds = useMemo(
    () => new Set(allAssignments.filter(a => serviceWorkers.some(w => w.user_id === a.user_id)).map(a => a.user_id)),
    [allAssignments, serviceWorkers]
  )

  const freeCount = serviceWorkers.filter(u => !assignedInServiceIds.has(u.user_id)).length
  const assignedCount = serviceWorkers.filter(u => assignedInServiceIds.has(u.user_id)).length

  const todayStr = today.toISOString().split('T')[0]

  const ASSIGNABLE_STATUSES = ['SUBMITTED', 'APPROVED', 'PLANNED', 'BOSS_CONFIRMED']
  const toAssign = plans.filter(p => ASSIGNABLE_STATUSES.includes(p.status) && p.plan_date >= todayStr)
  const inWork   = plans.filter(p => ['ASSIGNED', 'IN_PROGRESS', 'DONE'].includes(p.status) && p.plan_date >= todayStr)
  const overdue  = plans.filter(p => p.plan_date < todayStr)

  // IDs of workers assigned to this foreman's plans
  const myWorkerIds = useMemo(
    () => Array.from(new Set(allAssignments.map(a => a.user_id))),
    [allAssignments]
  )

  if (loading) return <div className="text-center text-white/30 py-12">Загрузка...</div>

  return (
    <div className="space-y-6">
      <DirectiveAlert planWorkerIds={myWorkerIds} />

      {/* Shift stats — interactive roster panel */}
      <div className="glass rounded-xl border border-cyan-500/20 overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="text-sm font-bold text-white">
            Смена №{shiftInfo.shiftNumber} · Все службы
          </div>
          <div className="text-xs text-white/30">{serviceWorkers.length} чел. на смене</div>
        </div>

        {/* Clickable stat buttons */}
        <div className="flex border-t border-white/5">
          <button
            onClick={() => {
              const next = rosterPanel === 'free' ? null : 'free'
              setRosterPanel(next)
              setWorkerFilter(next === 'free' ? 'free' : 'all')
            }}
            className={`flex-1 flex flex-col items-center py-3 gap-0.5 border-r border-white/5 transition-colors ${
              rosterPanel === 'free' ? 'bg-green-500/10' : 'hover:bg-white/3'
            }`}
          >
            <span className={`text-2xl font-bold font-mono ${freeCount > 0 ? 'text-green-400' : 'text-white/20'}`}>
              {freeCount}
            </span>
            <span className="text-[10px] text-white/40">Свободны</span>
          </button>

          <button
            onClick={() => setRosterPanel(rosterPanel === 'assigned' ? null : 'assigned')}
            className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors ${
              rosterPanel === 'assigned' ? 'bg-amber-500/10' : 'hover:bg-white/3'
            }`}
          >
            <span className={`text-2xl font-bold font-mono ${assignedCount > 0 ? 'text-amber-400' : 'text-white/20'}`}>
              {assignedCount}
            </span>
            <span className="text-[10px] text-white/40">Назначены</span>
          </button>
        </div>

        {/* Roster: free workers — grouped by service */}
        {rosterPanel === 'free' && (
          <div className="border-t border-white/5 p-3 space-y-3">
            {freeCount === 0 ? (
              <div className="text-xs text-white/20 italic py-1">Все назначены</div>
            ) : (
              services.map(svc => {
                const svcFree = serviceWorkers.filter(u =>
                  !assignedInServiceIds.has(u.user_id) && u.service_id === svc.service_id
                )
                if (svcFree.length === 0) return null
                const svcEmoji = (['SRV-ENG','SRV-STR','SRV-FIRE','SRV-VENT','SRV-CCTV'] as const)
                return (
                  <div key={svc.service_id}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-xs text-white/30 font-medium truncate">{svc.service_name}</span>
                      <span className="text-[10px] bg-green-500/15 text-green-400 rounded-full px-1.5 py-0.5 shrink-0">{svcFree.length}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {svcFree.map(u => (
                        <div key={u.user_id} className="text-xs px-2 py-1.5 rounded-lg bg-green-500/5 border border-green-500/10">
                          <div className="text-white/80 font-medium truncate">{u.full_name}</div>
                          <div className="text-[10px] text-white/30">{u.position ?? u.assignment?.schedule_code ?? '—'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Roster: assigned workers — grouped by service */}
        {rosterPanel === 'assigned' && (
          <div className="border-t border-white/5 p-3 space-y-3">
            {assignedCount === 0 ? (
              <div className="text-xs text-white/20 italic py-1">Никто ещё не назначен</div>
            ) : (
              services.map(svc => {
                const svcAssigned = serviceWorkers.filter(u =>
                  assignedInServiceIds.has(u.user_id) && u.service_id === svc.service_id
                )
                if (svcAssigned.length === 0) return null
                return (
                  <div key={svc.service_id}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-xs text-white/30 font-medium truncate">{svc.service_name}</span>
                      <span className="text-[10px] bg-amber-500/15 text-amber-400 rounded-full px-1.5 py-0.5 shrink-0">{svcAssigned.length}</span>
                    </div>
                    <div className="space-y-1">
                      {svcAssigned.map(u => {
                        const locations = workerBusyMap.get(u.user_id) ?? []
                        return (
                          <div key={u.user_id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                            <div className="text-white/80 font-medium truncate min-w-0 flex-1">{u.full_name}</div>
                            <div className="text-[10px] text-amber-400/70 truncate shrink-0 max-w-[45%]">
                              {locations[0]}{locations.length > 1 ? ` +${locations.length - 1}` : ''}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Filter hint when picker filter active */}
        {workerFilter === 'free' && (
          <div className="border-t border-white/5 px-4 py-2 flex items-center justify-between">
            <span className="text-[10px] text-green-400/60">Пикер показывает только свободных</span>
            <button onClick={() => setWorkerFilter('all')} className="text-[10px] text-white/30 hover:text-white/60">сбросить ×</button>
          </div>
        )}
      </div>

      {/* Plans awaiting brigade assignment */}
      {toAssign.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">
            Назначить людей ({toAssign.length} план{toAssign.length > 1 ? 'а' : ''})
          </h3>
          <div className="space-y-4">
            {toAssign.map(plan => (
              <PlanAssignCard
                key={plan.id}
                plan={plan}
                services={services}
                serviceWorkers={serviceWorkers}
                itemAssignmentsMap={itemAssignmentsMap}
                workerBusyMap={workerBusyMap}
                workerFilter={workerFilter}
                session={session}
                onRefresh={load}
              />
            ))}
          </div>
        </div>
      )}

      {/* Assigned / in progress / done plans */}
      {inWork.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-3">
            Назначены / В работе ({inWork.length})
          </h3>
          <div className="space-y-3">
            {inWork.map(plan => (
              <PlanAssignCard
                key={plan.id}
                plan={plan}
                services={services}
                serviceWorkers={serviceWorkers}
                itemAssignmentsMap={itemAssignmentsMap}
                workerBusyMap={workerBusyMap}
                workerFilter={workerFilter}
                session={session}
                onRefresh={load}
                compact
              />
            ))}
          </div>
        </div>
      )}

      {/* Overdue plans — collapsed accordion, read-only */}
      {overdue.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setOverdueOpen(o => !o)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/3 hover:bg-white/5 border border-white/5 transition-colors"
          >
            <span className="text-xs text-white/30 font-medium">
              ⏰ Просроченные планы ({overdue.length})
            </span>
            <span className="text-white/20 text-xs">{overdueOpen ? '▲' : '▼'}</span>
          </button>

          {overdueOpen && (
            <div className="mt-2 space-y-2">
              {overdue.map(plan => {
                const svc = services.find(s => s.service_id === plan.service_id)
                const statusCfg = WORK_PLAN_STATUS_CONFIG[plan.status]
                const itemCount = plan.items.length
                const assignedCount = plan.items.reduce((s, i) => s + (itemAssignmentsMap.get(i.id)?.length ?? 0), 0)
                return (
                  <div key={plan.id} className="glass rounded-xl border border-white/5 opacity-50 pointer-events-none">
                    <div className="flex items-center justify-between px-4 py-3">
                      <div>
                        <div className="text-sm text-white/60">{svc?.service_name ?? plan.service_id}</div>
                        <div className="text-xs text-white/30">{plan.plan_date} · {plan.shift_type === 'DAY' ? '☀️' : '🌙'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/30">{assignedCount} назн. / {itemCount} задач</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusCfg.bg}`} style={{ color: statusCfg.color }}>
                          {statusCfg.label}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {plans.length === 0 && (
        <div className="text-center text-white/20 py-16 text-sm">
          Нет утверждённых планов.<br />
          Начальник участка должен утвердить планы на совещании.
        </div>
      )}
    </div>
  )
}

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanAssignCard({
  plan, services, serviceWorkers, itemAssignmentsMap, workerBusyMap,
  workerFilter, session, onRefresh, compact = false,
}: {
  plan: WorkPlanWithItems
  services: Service[]
  serviceWorkers: UserWithAssignment[]
  itemAssignmentsMap: Map<string, WorkAssignmentWithUser[]>
  workerBusyMap: Map<string, string[]>
  workerFilter: 'all' | 'free'
  session: AuthSession
  onRefresh: () => Promise<void>
  compact?: boolean
}) {
  // Hooks must run unconditionally — keep them above the split-view early return
  const [acting, setActing] = useState(false)

  // Plan-level progress: sum of required vs assigned across all items
  const planStats = useMemo(() => {
    let totalReqWorkers = 0
    let totalReqForemen = 0
    let assignedWorkers = 0
    let assignedForemen = 0

    for (const item of plan.items) {
      totalReqWorkers += item.required_workers || 0
      totalReqForemen += item.required_foremen || 0
      const assignments = itemAssignmentsMap.get(item.id) ?? []
      for (const a of assignments) {
        if (a.role === 'WORKER' || a.role === 'ITR') assignedWorkers++
        else assignedForemen++
      }
    }

    const totalRequired = totalReqWorkers + totalReqForemen
    const totalAssigned = assignedWorkers + assignedForemen
    const deficit = Math.max(0, totalRequired - totalAssigned)
    const pct = totalRequired > 0 ? Math.min(100, Math.round(totalAssigned / totalRequired * 100)) : 100

    return { totalRequired, totalAssigned, deficit, pct, totalReqWorkers, totalReqForemen, assignedWorkers, assignedForemen }
  }, [plan.items, itemAssignmentsMap])

  // Split-view for BOSS_CONFIRMED — full interactive layout
  if (['SUBMITTED', 'APPROVED', 'PLANNED', 'BOSS_CONFIRMED'].includes(plan.status)) {
    return (
      <SplitViewPlanCard
        plan={plan}
        services={services}
        serviceWorkers={serviceWorkers}
        itemAssignmentsMap={itemAssignmentsMap}
        workerBusyMap={workerBusyMap}
        workerFilter={workerFilter}
        session={session}
        onRefresh={onRefresh}
      />
    )
  }
  const svc = services.find(s => s.service_id === plan.service_id)
  const statusCfg = WORK_PLAN_STATUS_CONFIG[plan.status]
  const shiftLabel = plan.shift_type === 'DAY' ? '☀️ День' : '🌙 Ночь'
  const canAssign = plan.status === 'ASSIGNED'

  const handleMarkAssigned = async () => {
    setActing(true)
    await markWorkPlanAssigned(plan.id, session.user_id)
    setActing(false)
    onRefresh()
  }

  const handleStart = async () => {
    setActing(true)
    await startWorkPlan(plan.id, session.user_id)
    setActing(false)
    onRefresh()
  }

  const handleComplete = async () => {
    if (!confirm('Завершить план работ?')) return
    setActing(true)
    await completeWorkPlan(plan.id, session.user_id)
    setActing(false)
    onRefresh()
  }

  return (
    <div className={`glass rounded-xl overflow-hidden border ${
      plan.status === 'ASSIGNED' ? 'border-blue-500/20' :
      plan.status === 'IN_PROGRESS' ? 'border-violet-500/20' :
      'border-green-500/10 opacity-70'
    }`}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div>
          <div className="text-sm font-semibold text-white">{svc?.service_name ?? plan.service_id}</div>
          <div className="text-xs text-white/40">{shiftLabel} · {plan.plan_date}</div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full border ${statusCfg.bg}`}
            style={{ color: statusCfg.color }}
          >
            {statusCfg.label}
          </span>
          {plan.status === 'ASSIGNED' && (
            <button
              onClick={handleStart}
              disabled={acting}
              className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-medium"
            >
              {acting ? '...' : '▶ В работу'}
            </button>
          )}
          {plan.status === 'IN_PROGRESS' && (
            <button
              onClick={handleComplete}
              disabled={acting}
              className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-medium"
            >
              {acting ? '...' : '✓ Завершить'}
            </button>
          )}
        </div>
      </div>

      {/* Plan-level progress summary (only when requirements are set and not compact) */}
      {!compact && planStats.totalRequired > 0 && (
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-3 text-xs text-white/50">
              {planStats.totalReqWorkers > 0 && (
                <span className={planStats.assignedWorkers >= planStats.totalReqWorkers ? 'text-green-400' : 'text-amber-400'}>
                  👷 {planStats.assignedWorkers}/{planStats.totalReqWorkers}
                </span>
              )}
              {planStats.totalReqForemen > 0 && (
                <span className={planStats.assignedForemen >= planStats.totalReqForemen ? 'text-green-400' : 'text-amber-400'}>
                  🦺 {planStats.assignedForemen}/{planStats.totalReqForemen}
                </span>
              )}
            </div>
            <span className={`text-xs font-bold ${planStats.pct >= 100 ? 'text-green-400' : 'text-amber-400'}`}>
              {planStats.pct}%
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${planStats.pct >= 100 ? 'bg-green-500' : 'bg-amber-500'}`}
              style={{ width: `${planStats.pct}%` }}
            />
          </div>
          {/* Deficit warning */}
          {planStats.deficit > 0 && (
            <div className="mt-2 text-xs text-amber-400/80 flex items-center gap-1">
              ⚠ Не хватает {planStats.deficit} чел.
            </div>
          )}
        </div>
      )}

      {/* Items */}
      <div className={`${compact ? 'px-3 py-2' : 'p-4'} space-y-3`}>
        {plan.items.map(item => (
          <PlanItemAssigner
            key={item.id}
            item={item}
            assignments={itemAssignmentsMap.get(item.id) ?? []}
            serviceWorkers={serviceWorkers}
            workerBusyMap={workerBusyMap}
            workerFilter={workerFilter}
            session={session}
            canAssign={canAssign}
            onRefresh={onRefresh}
            compact={compact}
          />
        ))}
        {plan.items.length === 0 && (
          <div className="text-xs text-white/20 italic">Нет позиций в плане</div>
        )}
      </div>
    </div>
  )
}

// ─── Split-view plan card (BOSS_CONFIRMED) ────────────────────────────────────

function SplitViewPlanCard({
  plan, services, serviceWorkers, itemAssignmentsMap, workerBusyMap,
  workerFilter, session, onRefresh,
}: {
  plan: WorkPlanWithItems
  services: Service[]
  serviceWorkers: UserWithAssignment[]
  itemAssignmentsMap: Map<string, WorkAssignmentWithUser[]>
  workerBusyMap: Map<string, string[]>
  workerFilter: 'all' | 'free'
  session: AuthSession
  onRefresh: () => Promise<void>
}) {
  const svc = services.find(s => s.service_id === plan.service_id)
  const shiftLabel = plan.shift_type === 'DAY' ? '☀️ День' : '🌙 Ночь'
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [pickerRole, setPickerRole] = useState<WorkAssignmentRole>('WORKER')
  const [search, setSearch] = useState('')
  const [acting, setActing] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [adding, setAdding] = useState<string | null>(null)
  const [addError, setAddError] = useState<string | null>(null)
  const [showPermit, setShowPermit] = useState(false)

  const activeItem = plan.items.find(i => i.id === activeItemId)
  const activeAssignments = itemAssignmentsMap.get(activeItemId ?? '') ?? []
  const activeAssignedIds = new Set(activeAssignments.map(a => a.user_id))

  // Detect plans pre-staffed by service head (workers[] set, no work_assignments yet)
  const headAssignedItems = plan.items.filter(i => i.workers.length > 0)
  const preStaffedByHead = headAssignedItems.length > 0 && plan.items.length > 0
    && headAssignedItems.length === plan.items.length
    && plan.items.every(i => (itemAssignmentsMap.get(i.id)?.length ?? 0) === 0)

  // Plan-level stats
  const totalItems = plan.items.length
  const itemsWithWorkers = plan.items.filter(i => (itemAssignmentsMap.get(i.id)?.length ?? 0) > 0).length
  const totalAssigned = plan.items.reduce((s, i) => s + (itemAssignmentsMap.get(i.id)?.length ?? 0), 0)
  const totalRequired = plan.items.reduce((s, i) => s + (i.required_workers || 0) + (i.required_foremen || 0), 0)
  const allFilled = totalRequired > 0 && totalAssigned >= totalRequired

  // Which role_levels correspond to each assignment role
  const ROLE_LEVEL_FILTER: Record<WorkAssignmentRole, string[]> = {
    WORKER:    ['WORKER', 'DRIVER'],
    BRIGADIER: ['FOREMAN'],
    MASTER:    ['FOREMAN', 'HEAD'],
    ITR:       ['SPECIALIST', 'CHIEF_ENGINEER', 'HEAD', 'ZAMPORAB', 'DISPATCHER', 'HR'],
    DRIVER:    ['DRIVER'],
  }

  // Workers shown in right panel (filtered by search + workerFilter + pickerRole)
  const panelWorkers = useMemo(() => {
    let list = serviceWorkers
    if (workerFilter === 'free') list = list.filter(u => !workerBusyMap.has(u.user_id))
    // Filter by role type when item is active
    if (activeItemId) {
      const allowed = ROLE_LEVEL_FILTER[pickerRole]
      list = list.filter(u => allowed.includes(u.role_level))
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(u => u.full_name.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => {
      const aInItem = activeAssignedIds.has(a.user_id) ? -1 : 0
      const bInItem = activeAssignedIds.has(b.user_id) ? -1 : 0
      if (aInItem !== bInItem) return aInItem - bInItem
      const aBusy = workerBusyMap.has(a.user_id) ? 1 : 0
      const bBusy = workerBusyMap.has(b.user_id) ? 1 : 0
      return aBusy - bBusy
    })
  }, [serviceWorkers, workerFilter, workerBusyMap, search, activeAssignedIds, pickerRole, activeItemId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async (userId: string) => {
    if (!activeItemId || activeAssignedIds.has(userId)) return
    setAdding(userId)
    setAddError(null)
    const result = await createWorkAssignment(activeItemId, userId, pickerRole, session.user_id)
    if (!result.ok) {
      setAdding(null)
      if (result.error?.includes('duplicate key') || result.error?.includes('unique')) {
        setAddError('Этот сотрудник уже назначен на данную задачу')
      } else {
        setAddError(result.error ?? 'Неизвестная ошибка')
      }
      return
    }
    await onRefresh()
    setAdding(null)
  }

  const handleRemove = async (assignmentId: string) => {
    setRemoving(assignmentId)
    await deleteWorkAssignment(assignmentId)
    await onRefresh()
    setRemoving(null)
  }

  const handleMarkAssigned = async () => {
    setActing(true)
    await markWorkPlanAssigned(plan.id, session.user_id)
    setActing(false)
    onRefresh()
  }

  return (
    <div className="glass rounded-xl overflow-hidden border border-cyan-500/30">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div>
          <div className="text-sm font-semibold text-white">{svc?.service_name ?? plan.service_id}</div>
          <div className="text-xs text-white/40">{shiftLabel} · {plan.plan_date}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPermit(true)}
            className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/25 text-blue-300 text-[11px] transition-all"
          >
            🖨 Наряд-допуск
          </button>
          <StatusPlanBadge status={plan.status} size="xs" />
        </div>
      </div>

      {/* Pre-staffed by head banner */}
      {preStaffedByHead && (
        <div className="px-4 py-2.5 border-b border-green-500/20 bg-green-500/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-green-400 text-sm">✓</span>
            <span className="text-xs text-green-400/80">Укомплектован начальником службы</span>
          </div>
          {plan.status === 'BOSS_CONFIRMED' && (
            <button
              onClick={handleMarkAssigned}
              disabled={acting}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-green-600/80 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-medium transition-colors"
            >
              {acting ? '...' : 'Принять к исполнению →'}
            </button>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div className="px-4 py-2 border-b border-white/5 flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${allFilled ? 'bg-green-500' : 'bg-cyan-500/60'}`}
            style={{ width: `${totalRequired > 0 ? Math.min(100, Math.round(totalAssigned / totalRequired * 100)) : (totalAssigned > 0 ? 100 : 0)}%` }}
          />
        </div>
        {totalRequired > 0 ? (
          <span className={`text-[10px] font-mono shrink-0 ${allFilled ? 'text-green-400' : 'text-white/40'}`}>
            {totalAssigned}/{totalRequired} чел.
          </span>
        ) : (
          <span className="text-[10px] text-white/30 shrink-0">
            {totalAssigned > 0 ? `${totalAssigned} назначено` : `${totalItems} задач`}
          </span>
        )}
      </div>

      {/* Split view */}
      <div className="grid grid-cols-2 divide-x divide-white/10 min-h-[240px]">

        {/* LEFT: tasks */}
        <div className="p-4 space-y-2 overflow-y-auto max-h-[420px]">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
            <span className="text-xs text-white/50">Выберите задачу</span>
          </div>
          {plan.items.length === 0 && (
            <div className="text-xs text-white/20 italic">Нет позиций в плане</div>
          )}
          {plan.items.map(item => {
            const itemAssignments = itemAssignmentsMap.get(item.id) ?? []
            const isActive = activeItemId === item.id
            const wCount = itemAssignments.filter(a => a.role === 'WORKER' || a.role === 'ITR').length
            const fCount = itemAssignments.filter(a => a.role === 'BRIGADIER' || a.role === 'MASTER').length
            const rw = item.required_workers || 0
            const rf = item.required_foremen || 0
            const itemDone = (rw === 0 || wCount >= rw) && (rf === 0 || fCount >= rf)

            return (
              <div
                key={item.id}
                onClick={() => setActiveItemId(isActive ? null : item.id)}
                className={`p-2.5 rounded-lg cursor-pointer transition-all border ${
                  isActive
                    ? 'bg-cyan-500/10 border-cyan-500/30'
                    : itemDone && itemAssignments.length > 0
                      ? 'bg-green-500/5 border-green-500/15 hover:bg-green-500/8'
                      : 'bg-white/3 border-transparent hover:bg-white/5 hover:border-white/10'
                }`}
              >
                {/* Location + time */}
                <div className="flex items-center gap-1.5 mb-0.5">
                  {item.time_start && (
                    <span className="text-[10px] font-mono text-cyan-400 shrink-0">{item.time_start}</span>
                  )}
                  <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-white/80'}`}>
                    {item.location}
                  </span>
                  {itemDone && itemAssignments.length > 0 && (
                    <span className="ml-auto text-green-400 text-[10px]">✓</span>
                  )}
                </div>
                <div className="text-[10px] text-white/40 mb-1.5 truncate">{item.work_description}</div>

                {/* Requirements */}
                {(rw > 0 || rf > 0) && (
                  <div className="flex gap-2 text-[10px] mb-1.5">
                    {rw > 0 && (
                      <span className={wCount >= rw ? 'text-green-400' : 'text-amber-400'}>
                        👷 {wCount}/{rw}
                      </span>
                    )}
                    {rf > 0 && (
                      <span className={fCount >= rf ? 'text-green-400' : 'text-amber-400'}>
                        🦺 {fCount}/{rf}
                      </span>
                    )}
                  </div>
                )}

                {/* Assigned workers chips (from work_assignments by brigadier) */}
                {itemAssignments.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {itemAssignments.map(a => (
                      <span
                        key={a.id}
                        className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border ${ROLE_COLORS[a.role]}`}
                      >
                        <span>{ROLE_ICONS[a.role]}</span>
                        <span>{a.user?.full_name?.split(' ')[0] ?? '—'}</span>
                        <button
                          onClick={e => { e.stopPropagation(); handleRemove(a.id) }}
                          disabled={removing === a.id}
                          className="ml-0.5 hover:text-red-400"
                        >
                          {removing === a.id ? '…' : '×'}
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {/* Workers assigned by service head (item.workers[]) — shown when no work_assignments yet */}
                {itemAssignments.length === 0 && item.workers.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.workers.map((w, idx) => (
                      <span key={idx} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border bg-green-500/10 text-green-300 border-green-500/20">
                        👷 {w}
                      </span>
                    ))}
                  </div>
                )}

                {!isActive && itemAssignments.length === 0 && (
                  <div className="text-[10px] text-white/30">нажмите чтобы открыть</div>
                )}
              </div>
            )
          })}
        </div>

        {/* RIGHT: workers panel */}
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 transition-colors ${
              activeItem ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/10 text-white/30'
            }`}>2</span>
            <span className={`text-xs transition-colors ${activeItem ? 'text-white/50' : 'text-white/25'}`}>
              {activeItem ? `Добавить в: ${activeItem.location}` : 'Нажмите задачу слева'}
            </span>
          </div>

          {/* Role selector */}
          {activeItem && (
            <div className="flex flex-wrap gap-1">
              {(['WORKER', 'BRIGADIER', 'MASTER', 'ITR'] as WorkAssignmentRole[]).map(role => {
                const TIPS: Record<string, string> = {
                  WORKER: 'Рядовой работник — выполняет физическую работу на объекте.',
                  BRIGADIER: 'Бригадир — старший рабочий, организует команду и отвечает за выполнение задания.',
                  MASTER: 'Мастер — технический руководитель, ставит задачи, контролирует ТБ.',
                  ITR: 'ИТР — инженерно-технический работник, надзор и проектирование.',
                }
                return (
                  <WithTooltip key={role} tip={TIPS[role]} delay={300}>
                    <button
                      type="button"
                      onClick={() => setPickerRole(role)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                        pickerRole === role ? ROLE_COLORS[role] : 'border-white/10 text-white/30 hover:border-white/20'
                      }`}
                    >
                      {ROLE_ICONS[role]} {ROLE_LABELS[role]}
                    </button>
                  </WithTooltip>
                )
              })}
            </div>
          )}

          {/* Error message */}
          {addError && (
            <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {addError}
            </div>
          )}

          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по имени..."
            className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/20 outline-none focus:border-cyan-500/40"
          />

          {/* Workers list */}
          <div className="space-y-1 overflow-y-auto max-h-[280px] flex-1">
            {panelWorkers.map(u => {
              const busyLocations = workerBusyMap.get(u.user_id)
              const isInItem = activeAssignedIds.has(u.user_id)
              const isAdding = adding === u.user_id
              const noActive = !activeItemId

              return (
                <button
                  key={u.user_id}
                  onClick={() => handleAdd(u.user_id)}
                  disabled={noActive || isInItem || isAdding}
                  className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors text-xs border ${
                    isInItem
                      ? 'bg-green-500/10 border-green-500/20 text-green-300 cursor-default'
                      : noActive
                        ? 'bg-white/3 border-transparent text-white/30 cursor-default'
                        : busyLocations
                          ? 'bg-amber-500/5 border-amber-500/10 hover:bg-amber-500/10 text-white/60 hover:text-white/80'
                          : 'bg-white/5 border-transparent hover:bg-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  {isAdding ? (
                    <div className="flex items-center gap-2 text-cyan-400">
                      <span className="animate-pulse">●</span> добавляю...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {/* Status dot */}
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isInItem ? 'bg-green-400' : busyLocations ? 'bg-amber-400' : 'bg-green-400/40'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{u.full_name}</div>
                        <div className={`text-[10px] truncate ${busyLocations && !isInItem ? 'text-amber-400/70' : 'text-white/25'}`}>
                          {isInItem ? 'уже в этой задаче' : busyLocations ? `занят: ${busyLocations[0]}` : (u.assignment?.schedule_code ?? '—')}
                        </div>
                      </div>
                      {/* Action badge */}
                      {!isInItem && !noActive && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                          busyLocations ? 'bg-amber-500/20 text-amber-300' : 'bg-cyan-500/20 text-cyan-300'
                        }`}>
                          + добавить
                        </span>
                      )}
                      {isInItem && (
                        <span className="text-green-400 text-xs shrink-0">✓</span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
            {panelWorkers.length === 0 && (
              <div className="text-xs text-white/20 italic py-2">
                {workerFilter === 'free' ? 'Нет свободных сотрудников' : 'Нет сотрудников на смене'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Finalization block */}
      <div className="border-t border-white/10 px-4 py-3 flex items-center justify-between gap-4">
        <div className="text-xs text-white/50">
          {allFilled ? (
            <span className="text-green-400 font-medium">✓ Все позиции закрыты</span>
          ) : (
            <span>
              Задач: <span className="text-white/70">{itemsWithWorkers}/{totalItems}</span>
              {totalRequired > 0 && (
                <span> · Людей: <span className={totalAssigned >= totalRequired ? 'text-green-400' : 'text-amber-400'}>{totalAssigned}/{totalRequired}</span></span>
              )}
              {totalRequired === 0 && totalAssigned > 0 && (
                <span className="ml-2 text-white/40">назначено {totalAssigned} чел.</span>
              )}
            </span>
          )}
        </div>
        {plan.status === 'BOSS_CONFIRMED' && (
          <button
            onClick={handleMarkAssigned}
            disabled={acting}
            className="shrink-0 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-medium transition-colors"
          >
            {acting ? '...' : '✓ Отметить «НАЗНАЧЕН»'}
          </button>
        )}
        {plan.status !== 'BOSS_CONFIRMED' && (
          <span className="text-[10px] text-white/25 italic">
            Назначение будет доступно после утверждения на совещании
          </span>
        )}
      </div>

      {showPermit && (
        <WorkPermitModal plan={plan} session={session} onClose={() => setShowPermit(false)} />
      )}
    </div>
  )
}

// ─── Plan item assigner (for non-BOSS_CONFIRMED plans) ───────────────────────

function PlanItemAssigner({
  item, assignments, serviceWorkers, workerBusyMap,
  workerFilter, session, canAssign, onRefresh, compact,
}: {
  item: WorkPlanItem
  assignments: WorkAssignmentWithUser[]
  serviceWorkers: UserWithAssignment[]
  workerBusyMap: Map<string, string[]>
  workerFilter: 'all' | 'free'
  session: AuthSession
  canAssign: boolean
  onRefresh: () => Promise<void>
  compact: boolean
}) {
  const [showPicker, setShowPicker] = useState(false)
  const [pickerRole, setPickerRole] = useState<WorkAssignmentRole>('WORKER')
  const [pickerSearch, setPickerSearch] = useState('')
  const [removing, setRemoving] = useState<string | null>(null)
  const [adding, setAdding] = useState<string | null>(null)

  const assignedInItemIds = new Set(assignments.map(a => a.user_id))

  const handleAdd = async (userId: string, role: WorkAssignmentRole) => {
    setAdding(userId)
    await createWorkAssignment(item.id, userId, role, session.user_id)
    await onRefresh()
    setAdding(null)
    setShowPicker(false)
    setPickerSearch('')
  }

  const handleRemove = async (assignmentId: string) => {
    setRemoving(assignmentId)
    await deleteWorkAssignment(assignmentId)
    await onRefresh()
    setRemoving(null)
  }

  // Workers to show in picker
  const pickerWorkers = useMemo(() => {
    let workers = serviceWorkers

    // If "free" filter is active, show only workers not assigned anywhere
    if (workerFilter === 'free') {
      workers = workers.filter(u => !workerBusyMap.has(u.user_id))
    }

    // Apply search
    if (pickerSearch.trim()) {
      const q = pickerSearch.toLowerCase()
      workers = workers.filter(u => u.full_name.toLowerCase().includes(q))
    }

    // Sort: free first, then busy
    return [...workers].sort((a, b) => {
      const aBusy = workerBusyMap.has(a.user_id) ? 1 : 0
      const bBusy = workerBusyMap.has(b.user_id) ? 1 : 0
      return aBusy - bBusy
    })
  }, [serviceWorkers, workerFilter, workerBusyMap, pickerSearch])

  const reqWorkers = item.required_workers || 0
  const reqForemen = item.required_foremen || 0
  const reqVehicles = item.required_vehicles || 0
  const hasRequirements = reqWorkers > 0 || reqForemen > 0 || reqVehicles > 0

  const workerCount = assignments.filter(a => a.role === 'WORKER' || a.role === 'ITR').length
  const foremanCount = assignments.filter(a => a.role === 'BRIGADIER' || a.role === 'MASTER').length

  return (
    <div className={`rounded-lg ${compact ? 'py-1' : 'p-3 bg-white/3'}`}>
      {/* Item header */}
      <div className="flex items-start gap-2 mb-2">
        {item.time_start && (
          <span className="text-xs font-mono text-cyan-400 shrink-0 pt-0.5">
            {item.time_start}{item.time_end ? `–${item.time_end}` : ''}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-white/80">{item.location}</span>
          <span className="text-white/30 mx-1">—</span>
          <span className="text-xs text-white/60">{item.work_description}</span>
        </div>
        {hasRequirements && (
          <div className="flex items-center gap-1.5 text-[10px] shrink-0">
            {reqWorkers > 0 && (
              <span className={workerCount >= reqWorkers ? 'text-green-400' : 'text-amber-400'}>
                👷 {workerCount}/{reqWorkers}
              </span>
            )}
            {reqForemen > 0 && (
              <span className={foremanCount >= reqForemen ? 'text-green-400' : 'text-amber-400'}>
                🦺 {foremanCount}/{reqForemen}
              </span>
            )}
            {reqVehicles > 0 && <span className="text-white/30">🚛×{reqVehicles}</span>}
          </div>
        )}
      </div>

      {/* Assigned workers */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {assignments.map(a => (
          <span
            key={a.id}
            className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${ROLE_COLORS[a.role]}`}
          >
            <span>{ROLE_ICONS[a.role]}</span>
            <span>{a.user?.full_name?.split(' ')[0] ?? '—'}</span>
            {canAssign && (
              <button
                onClick={() => handleRemove(a.id)}
                disabled={removing === a.id}
                className="ml-0.5 hover:text-red-400 transition-colors"
              >
                {removing === a.id ? '…' : '×'}
              </button>
            )}
          </span>
        ))}
        {assignments.length === 0 && !showPicker && (
          <span className="text-[10px] text-white/20 italic">Никто не назначен</span>
        )}
        {canAssign && (
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-white/20 text-white/40 hover:text-white/60 hover:border-white/30 transition-colors"
          >
            {showPicker ? '✕ закрыть' : '+ добавить'}
          </button>
        )}
      </div>

      {/* Worker picker */}
      {showPicker && (
        <div className="mt-2 p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
          {/* Role selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-white/40">Роль:</span>
            {(['WORKER', 'BRIGADIER', 'MASTER', 'ITR'] as WorkAssignmentRole[]).map(role => (
              <button
                key={role}
                onClick={() => setPickerRole(role)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                  pickerRole === role ? ROLE_COLORS[role] : 'border-white/10 text-white/30'
                }`}
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            value={pickerSearch}
            onChange={e => setPickerSearch(e.target.value)}
            placeholder="Поиск по имени..."
            className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/20 outline-none focus:border-cyan-500/40"
          />

          {/* Worker list */}
          <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
            {pickerWorkers.map(u => {
              const isAlreadyInItem = assignedInItemIds.has(u.user_id)
              const busyLocations = workerBusyMap.get(u.user_id)
              const isBusy = !!busyLocations && !isAlreadyInItem
              const isAdding = adding === u.user_id

              return (
                <button
                  key={u.user_id}
                  onClick={() => !isAlreadyInItem && handleAdd(u.user_id, pickerRole)}
                  disabled={isAlreadyInItem || isAdding}
                  className={`text-left text-xs px-2 py-1.5 rounded-lg transition-colors ${
                    isAlreadyInItem
                      ? 'bg-white/3 text-white/20 cursor-default'
                      : isBusy
                        ? 'bg-amber-500/5 hover:bg-amber-500/10 text-white/60 hover:text-white/80 border border-amber-500/10'
                        : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  {isAdding ? (
                    <div className="text-cyan-400">добавляю...</div>
                  ) : (
                    <>
                      <div className="font-medium truncate">
                        {isAlreadyInItem && <span className="mr-1 text-green-400">✓</span>}
                        {u.full_name}
                      </div>
                      {busyLocations && !isAlreadyInItem && (
                        <div className="text-[10px] text-amber-400/70 truncate">
                          занят: {busyLocations[0]}{busyLocations.length > 1 ? ` +${busyLocations.length - 1}` : ''}
                        </div>
                      )}
                      {!busyLocations && (
                        <div className="text-[10px] text-white/25">{u.assignment?.schedule_code ?? '—'}</div>
                      )}
                    </>
                  )}
                </button>
              )
            })}
            {pickerWorkers.length === 0 && (
              <div className="col-span-2 text-xs text-white/20 italic py-2">
                {workerFilter === 'free' ? 'Нет свободных сотрудников' : 'Нет сотрудников на смене'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
