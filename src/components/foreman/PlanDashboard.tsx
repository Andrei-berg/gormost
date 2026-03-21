'use client'
import { useState, useEffect, useCallback } from 'react'
import type { WorkPlanWithItems, WorkAssignmentWithUser, Service, AuthSession } from '@/types'
import { fetchWorkPlans, fetchWorkPlanWithItems, fetchWorkAssignmentsForItems } from '@/lib/api'
import { WORK_PLAN_STATUS_CONFIG } from '@/types'

const SERVICE_EMOJI: Record<string, string> = {
  'SRV-ENG':  '⚡',
  'SRV-STR':  '🏗️',
  'SRV-FIRE': '🚒',
  'SRV-VENT': '💨',
  'SRV-CCTV': '📹',
}

interface PlanStats {
  totalItems: number
  reqWorkers: number
  reqForemen: number
  reqVehicles: number
  assignedWorkers: number
  assignedForemen: number
  assigned: number
  reqTotal: number
  pct: number
  fillStatus: 'empty' | 'partial' | 'full'
}

interface Props {
  session: AuthSession
  services: Service[]
  onOpenAssigner: () => void
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

function calcStats(plan: WorkPlanWithItems, map: Map<string, WorkAssignmentWithUser[]>): PlanStats {
  let reqWorkers = 0, reqForemen = 0, reqVehicles = 0
  let assignedWorkers = 0, assignedForemen = 0

  for (const item of plan.items) {
    reqWorkers  += item.required_workers || 0
    reqForemen  += (item.required_foremen || 0) + (item.required_brigadiers || 0) + (item.required_masters || 0)
    reqVehicles += item.required_vehicles || 0

    for (const a of (map.get(item.id) ?? [])) {
      if (['WORKER', 'ITR', 'DRIVER'].includes(a.role)) assignedWorkers++
      else assignedForemen++
    }
  }

  const reqTotal  = reqWorkers + reqForemen
  const assigned  = assignedWorkers + assignedForemen
  const pct       = reqTotal > 0 ? Math.min(100, Math.round(assigned / reqTotal * 100)) : (assigned > 0 ? 100 : 0)
  const fillStatus: PlanStats['fillStatus'] = assigned === 0 ? 'empty' : pct >= 100 ? 'full' : 'partial'

  return {
    totalItems: plan.items.length,
    reqWorkers, reqForemen, reqVehicles,
    assignedWorkers, assignedForemen,
    assigned, reqTotal, pct, fillStatus,
  }
}

export default function PlanDashboard({ session, services, onOpenAssigner }: Props) {
  const [plans, setPlans] = useState<WorkPlanWithItems[]>([])
  const [assignmentsMap, setAssignmentsMap] = useState<Map<string, WorkAssignmentWithUser[]>>(new Map())
  const [loading, setLoading] = useState(true)

  const today    = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const load = useCallback(async () => {
    const rawPlans = await fetchWorkPlans({
      statuses: ['BOSS_CONFIRMED', 'ASSIGNED', 'IN_PROGRESS', 'PLANNED', 'FAST_TRACK'],
    })

    // Keep only today + tomorrow
    const relevant = rawPlans.filter(p => p.plan_date === todayStr || p.plan_date === tomorrowStr)
    const full = await Promise.all(relevant.map(p => fetchWorkPlanWithItems(p.id)))
    const validPlans = full.filter(Boolean) as WorkPlanWithItems[]
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
    }

    setLoading(false)
  }, [session.service_id, todayStr, tomorrowStr]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  if (loading) return <div className="text-center text-white/30 py-12">Загрузка планов...</div>

  if (plans.length === 0) {
    return (
      <div className="text-center text-white/20 py-16 text-sm">
        Нет утверждённых планов.<br />
        Начальник участка должен утвердить планы на совещании (16:30).
      </div>
    )
  }

  // Group plans into sections
  const tonightPlans    = plans.filter(p => p.shift_type === 'NIGHT')
  const tomorrowDayPlans = plans.filter(p => p.shift_type === 'DAY' && p.plan_date === tomorrowStr)
  const todayDayPlans   = plans.filter(p => p.shift_type === 'DAY' && p.plan_date === todayStr)

  return (
    <div className="space-y-6">
      {/* Global summary */}
      <DashboardSummary plans={plans} assignmentsMap={assignmentsMap} onOpenAssigner={onOpenAssigner} />

      {todayDayPlans.length > 0 && (
        <PlanGroup
          title="☀️ Дневная смена — сегодня"
          subtitle={formatDate(todayStr)}
          plans={todayDayPlans}
          services={services}
          assignmentsMap={assignmentsMap}
          onOpenAssigner={onOpenAssigner}
        />
      )}

      {tonightPlans.length > 0 && (
        <PlanGroup
          title="🌙 Ночная смена"
          subtitle={`${formatDate(todayStr)} → ${formatDate(tomorrowStr)}`}
          plans={tonightPlans}
          services={services}
          assignmentsMap={assignmentsMap}
          onOpenAssigner={onOpenAssigner}
        />
      )}

      {tomorrowDayPlans.length > 0 && (
        <PlanGroup
          title="☀️ Дневная смена — завтра"
          subtitle={formatDate(tomorrowStr)}
          plans={tomorrowDayPlans}
          services={services}
          assignmentsMap={assignmentsMap}
          onOpenAssigner={onOpenAssigner}
        />
      )}
    </div>
  )
}

// ─── Summary bar ────────────────────────────────────────────────────────────────

function DashboardSummary({
  plans, assignmentsMap, onOpenAssigner,
}: {
  plans: WorkPlanWithItems[]
  assignmentsMap: Map<string, WorkAssignmentWithUser[]>
  onOpenAssigner: () => void
}) {
  let totalItems = 0, totalAssigned = 0, totalRequired = 0, totalVehicles = 0
  let fullyAssigned = 0, partlyAssigned = 0, notAssigned = 0

  for (const plan of plans) {
    const s = calcStats(plan, assignmentsMap)
    totalItems    += s.totalItems
    totalAssigned += s.assigned
    totalRequired += s.reqTotal
    totalVehicles += s.reqVehicles
    if (s.fillStatus === 'full')    fullyAssigned++
    else if (s.fillStatus === 'partial') partlyAssigned++
    else                            notAssigned++
  }

  const overallPct = totalRequired > 0
    ? Math.min(100, Math.round(totalAssigned / totalRequired * 100))
    : (totalAssigned > 0 ? 100 : 0)

  return (
    <div className="glass rounded-xl border border-white/10 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white">Сводка по планам</h3>
        <button
          onClick={onOpenAssigner}
          className="text-xs px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors"
        >
          👷 Назначить бригады →
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <StatChip label="Планов" value={plans.length} color="text-white/80" />
        <StatChip label="Работ" value={totalItems} color="text-white/80" />
        <StatChip
          label="Людей"
          value={`${totalAssigned}${totalRequired > 0 ? `/${totalRequired}` : ''}`}
          color={totalAssigned >= totalRequired && totalRequired > 0 ? 'text-green-400' : 'text-amber-400'}
        />
        {totalVehicles > 0 && (
          <StatChip label="Машин" value={`🚛 ${totalVehicles}`} color="text-white/60" />
        )}
      </div>

      {/* Progress bar */}
      {totalRequired > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex gap-3 text-[10px]">
              {fullyAssigned > 0 && <span className="text-green-400">🟢 {fullyAssigned} готово</span>}
              {partlyAssigned > 0 && <span className="text-amber-400">🟡 {partlyAssigned} частично</span>}
              {notAssigned > 0 && <span className="text-red-400">🔴 {notAssigned} не назначено</span>}
            </div>
            <span className={`text-xs font-bold ${overallPct >= 100 ? 'text-green-400' : 'text-amber-400'}`}>
              {overallPct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${overallPct >= 100 ? 'bg-green-500' : 'bg-amber-500'}`}
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Plan group ─────────────────────────────────────────────────────────────────

function PlanGroup({
  title, subtitle, plans, services, assignmentsMap, onOpenAssigner,
}: {
  title: string
  subtitle: string
  plans: WorkPlanWithItems[]
  services: Service[]
  assignmentsMap: Map<string, WorkAssignmentWithUser[]>
  onOpenAssigner: () => void
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <span className="text-xs text-white/30">{subtitle}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {plans.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            stats={calcStats(plan, assignmentsMap)}
            services={services}
            assignmentsMap={assignmentsMap}
            onOpenAssigner={onOpenAssigner}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Plan card ───────────────────────────────────────────────────────────────────

function PlanCard({
  plan, stats, services, assignmentsMap, onOpenAssigner,
}: {
  plan: WorkPlanWithItems
  stats: PlanStats
  services: Service[]
  assignmentsMap: Map<string, WorkAssignmentWithUser[]>
  onOpenAssigner: () => void
}) {
  const svc = services.find(s => s.service_id === plan.service_id)
  const statusCfg = WORK_PLAN_STATUS_CONFIG[plan.status]
  const emoji = SERVICE_EMOJI[plan.service_id] ?? '🏢'

  const borderClass =
    plan.status === 'IN_PROGRESS'  ? 'border-violet-500/40' :
    plan.status === 'ASSIGNED'     ? 'border-blue-500/30' :
    stats.fillStatus === 'full'    ? 'border-green-500/35' :
    stats.fillStatus === 'partial' ? 'border-amber-500/30' :
                                     'border-red-500/25'

  const statusDot =
    plan.status === 'IN_PROGRESS'  ? '🟣' :
    plan.status === 'ASSIGNED'     ? '🔵' :
    stats.fillStatus === 'full'    ? '🟢' :
    stats.fillStatus === 'partial' ? '🟡' :
                                     '🔴'

  const statusText =
    plan.status === 'IN_PROGRESS'  ? 'В работе' :
    plan.status === 'ASSIGNED'     ? 'Назначен' :
    stats.fillStatus === 'full'    ? 'Все назначены' :
    stats.fillStatus === 'partial' ? 'Частично' :
                                     'Не назначено'

  // All assigned workers across items
  const assignedWorkers = plan.items.flatMap(i => assignmentsMap.get(i.id) ?? [])
  const uniqueWorkerNames = [...new Set(assignedWorkers.map(a => a.user?.full_name?.split(' ')[0] ?? '—'))]

  return (
    <div className={`glass rounded-xl border ${borderClass} overflow-hidden flex flex-col`}>
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <div>
            <div className="text-sm font-semibold text-white leading-tight">
              {svc?.service_name ?? plan.service_id}
            </div>
            <div className="text-[10px] text-white/30 mt-0.5">
              {formatDate(plan.plan_date)}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusCfg.bg}`} style={{ color: statusCfg.color }}>
            {statusCfg.label}
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <div className="flex items-center gap-1.5 text-white/50">
          <span>📋</span>
          <span>{stats.totalItems} {stats.totalItems === 1 ? 'работа' : stats.totalItems < 5 ? 'работы' : 'работ'}</span>
        </div>

        {stats.reqTotal > 0 ? (
          <div className="flex items-center gap-1.5">
            <span>👷</span>
            <span className={stats.assigned >= stats.reqTotal ? 'text-green-400 font-medium' : 'text-amber-400'}>
              {stats.assigned}/{stats.reqTotal} чел.
            </span>
          </div>
        ) : stats.assigned > 0 ? (
          <div className="flex items-center gap-1.5 text-white/50">
            <span>👷</span>
            <span>{stats.assigned} назн.</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-white/20">
            <span>👷</span>
            <span>не назначено</span>
          </div>
        )}

        {stats.reqWorkers > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-white/30">рабочих:</span>
            <span className={stats.assignedWorkers >= stats.reqWorkers ? 'text-green-400 text-[10px]' : 'text-amber-400 text-[10px]'}>
              {stats.assignedWorkers}/{stats.reqWorkers}
            </span>
          </div>
        )}

        {stats.reqForemen > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-white/30">бриг/мастер:</span>
            <span className={stats.assignedForemen >= stats.reqForemen ? 'text-green-400 text-[10px]' : 'text-amber-400 text-[10px]'}>
              {stats.assignedForemen}/{stats.reqForemen}
            </span>
          </div>
        )}

        {stats.reqVehicles > 0 && (
          <div className="flex items-center gap-1.5 text-white/50 col-span-2">
            <span>🚛</span>
            <span>{stats.reqVehicles} {stats.reqVehicles === 1 ? 'единица' : 'единицы'} техники</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {stats.reqTotal > 0 && (
        <div className="px-4 pb-3">
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                stats.pct >= 100 ? 'bg-green-500' : stats.pct > 0 ? 'bg-amber-500' : 'bg-red-500/40'
              }`}
              style={{ width: `${Math.max(stats.pct, stats.pct > 0 ? 5 : 0)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-white/25">{statusDot} {statusText}</span>
            <span className={`text-[10px] font-bold ${stats.pct >= 100 ? 'text-green-400' : 'text-amber-400'}`}>
              {stats.pct}%
            </span>
          </div>
        </div>
      )}

      {/* Assigned workers preview */}
      {uniqueWorkerNames.length > 0 && (
        <div className="px-4 pb-3">
          <div className="text-[10px] text-white/20 mb-1">Назначены:</div>
          <div className="flex flex-wrap gap-1">
            {uniqueWorkerNames.slice(0, 6).map((name, i) => (
              <span key={i} className="text-[10px] bg-white/5 text-white/50 rounded px-1.5 py-0.5">{name}</span>
            ))}
            {uniqueWorkerNames.length > 6 && (
              <span className="text-[10px] text-white/25">+{uniqueWorkerNames.length - 6}</span>
            )}
          </div>
        </div>
      )}

      {/* Footer action */}
      <div className="mt-auto px-4 pb-4 pt-2 border-t border-white/5">
        {['BOSS_CONFIRMED', 'PLANNED', 'ASSIGNED'].includes(plan.status) ? (
          <button
            onClick={onOpenAssigner}
            className="w-full py-2 rounded-lg bg-cyan-600/80 hover:bg-cyan-500 text-white text-xs font-medium transition-colors"
          >
            {plan.status === 'ASSIGNED' ? '✏️ Изменить назначение' : '👷 Назначить бригаду →'}
          </button>
        ) : plan.status === 'IN_PROGRESS' ? (
          <button
            onClick={onOpenAssigner}
            className="w-full py-2 rounded-lg bg-violet-600/60 hover:bg-violet-500/80 text-white text-xs font-medium transition-colors"
          >
            ▶ Смотреть выполнение →
          </button>
        ) : (
          <div className="text-[10px] text-white/20 text-center italic">
            Ожидание утверждения на совещании
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function StatChip({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white/3 rounded-lg px-3 py-2 text-center">
      <div className={`text-xl font-bold font-mono ${color}`}>{value}</div>
      <div className="text-[10px] text-white/30 mt-0.5">{label}</div>
    </div>
  )
}
