'use client'
import { useState, useEffect, useCallback } from 'react'
import type { WorkPlanWithItems, WorkPlanItem, UserWithAssignment, WorkAssignmentWithUser, WorkAssignmentRole, Service, AuthSession } from '@/types'
import {
  fetchWorkPlans, fetchWorkPlanWithItems,
  fetchWorkAssignments, createWorkAssignment, deleteWorkAssignment,
  markWorkPlanAssigned, startWorkPlan,
  fetchUsersWithAssignments,
} from '@/lib/api'
import { isWorkerOnDuty, getShiftForDate } from '@/lib/shifts'
import { WORK_PLAN_STATUS_CONFIG } from '@/types'

interface Props {
  session: AuthSession
  services: Service[]
}

const ROLE_LABELS: Record<WorkAssignmentRole, string> = {
  WORKER: 'Рабочий',
  BRIGADIER: 'Бригадир',
  MASTER: 'Мастер',
  DRIVER: 'Водитель',
}

const ROLE_COLORS: Record<WorkAssignmentRole, string> = {
  WORKER: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  BRIGADIER: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  MASTER: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  DRIVER: 'bg-green-500/20 text-green-300 border-green-500/30',
}

export default function BrigadeAssigner({ session, services }: Props) {
  const [plans, setPlans] = useState<WorkPlanWithItems[]>([])
  const [onDutyWorkers, setOnDutyWorkers] = useState<UserWithAssignment[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date()
  const shiftInfo = getShiftForDate(today)

  const load = useCallback(async () => {
    setLoading(true)
    const planDate = today.toISOString().split('T')[0]

    const [rawPlans, allUsers] = await Promise.all([
      fetchWorkPlans({
        serviceId: session.service_id ?? undefined,
        planDate,
        statuses: ['BOSS_CONFIRMED', 'ASSIGNED', 'IN_PROGRESS', 'DONE'],
      }),
      fetchUsersWithAssignments(),
    ])

    const full = await Promise.all(rawPlans.map(p => fetchWorkPlanWithItems(p.id)))
    setPlans(full.filter(Boolean) as WorkPlanWithItems[])

    // Workers on duty today
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
    setLoading(false)
  }, [session.service_id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const toAssign = plans.filter(p => p.status === 'BOSS_CONFIRMED')
  const assigned = plans.filter(p => p.status === 'ASSIGNED' || p.status === 'IN_PROGRESS' || p.status === 'DONE')

  if (loading) return <div className="text-center text-white/30 py-12">Загрузка...</div>

  return (
    <div className="space-y-6">
      {/* Shift header */}
      <div className="glass rounded-xl p-4 border border-cyan-500/20">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👥</span>
          <div>
            <div className="text-white font-bold">Смена №{shiftInfo.shiftNumber} · Назначение бригад</div>
            <div className="text-xs text-white/40">
              На смене сегодня: <span className="text-cyan-400 font-medium">{onDutyWorkers.length} чел.</span>
              {session.service_id && (
                <span className="ml-2 text-white/30">
                  · в вашей службе: {onDutyWorkers.filter(u => u.service_id === session.service_id).length}
                </span>
              )}
            </div>
          </div>
        </div>
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
                onDutyWorkers={onDutyWorkers}
                session={session}
                onRefresh={load}
              />
            ))}
          </div>
        </div>
      )}

      {/* Assigned / in progress plans */}
      {assigned.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-3">
            Назначены / В работе ({assigned.length})
          </h3>
          <div className="space-y-3">
            {assigned.map(plan => (
              <PlanAssignCard
                key={plan.id}
                plan={plan}
                services={services}
                onDutyWorkers={onDutyWorkers}
                session={session}
                onRefresh={load}
                compact
              />
            ))}
          </div>
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

function PlanAssignCard({ plan, services, onDutyWorkers, session, onRefresh, compact = false }: {
  plan: WorkPlanWithItems
  services: Service[]
  onDutyWorkers: UserWithAssignment[]
  session: AuthSession
  onRefresh: () => void
  compact?: boolean
}) {
  const svc = services.find(s => s.service_id === plan.service_id)
  const statusCfg = WORK_PLAN_STATUS_CONFIG[plan.status]
  const shiftLabel = plan.shift_type === 'DAY' ? '☀️ День' : '🌙 Ночь'
  const canAssign = plan.status === 'BOSS_CONFIRMED' || plan.status === 'ASSIGNED'
  const [markingDone, setMarkingDone] = useState(false)

  const handleMarkAssigned = async () => {
    setMarkingDone(true)
    await markWorkPlanAssigned(plan.id, session.user_id)
    setMarkingDone(false)
    onRefresh()
  }

  const handleStart = async () => {
    setMarkingDone(true)
    await startWorkPlan(plan.id, session.user_id)
    setMarkingDone(false)
    onRefresh()
  }

  return (
    <div className={`glass rounded-xl overflow-hidden border ${
      plan.status === 'BOSS_CONFIRMED' ? 'border-cyan-500/20' :
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
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusCfg.bg}`} style={{ color: statusCfg.color }}>
            {statusCfg.label}
          </span>
          {plan.status === 'BOSS_CONFIRMED' && (
            <button
              onClick={handleMarkAssigned}
              disabled={markingDone}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-medium"
            >
              {markingDone ? '...' : '✓ Люди назначены'}
            </button>
          )}
          {plan.status === 'ASSIGNED' && (
            <button
              onClick={handleStart}
              disabled={markingDone}
              className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-medium"
            >
              {markingDone ? '...' : '▶ В работу'}
            </button>
          )}
        </div>
      </div>

      {/* Items */}
      <div className={`${compact ? 'px-3 py-2' : 'p-4'} space-y-3`}>
        {plan.items.map(item => (
          <PlanItemAssigner
            key={item.id}
            item={item}
            onDutyWorkers={onDutyWorkers}
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

function PlanItemAssigner({ item, onDutyWorkers, session, canAssign, onRefresh, compact }: {
  item: WorkPlanItem
  onDutyWorkers: UserWithAssignment[]
  session: AuthSession
  canAssign: boolean
  onRefresh: () => void
  compact: boolean
}) {
  const [assignments, setAssignments] = useState<WorkAssignmentWithUser[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [pickerRole, setPickerRole] = useState<WorkAssignmentRole>('WORKER')
  const [removing, setRemoving] = useState<string | null>(null)

  const loadAssignments = useCallback(async () => {
    const data = await fetchWorkAssignments(item.id)
    setAssignments(data)
  }, [item.id])

  useEffect(() => { loadAssignments() }, [loadAssignments])

  const handleAdd = async (userId: string, role: WorkAssignmentRole) => {
    await createWorkAssignment(item.id, userId, role, session.user_id)
    await loadAssignments()
    setShowPicker(false)
    onRefresh()
  }

  const handleRemove = async (assignmentId: string) => {
    setRemoving(assignmentId)
    await deleteWorkAssignment(assignmentId)
    await loadAssignments()
    setRemoving(null)
  }

  const assignedUserIds = new Set(assignments.map(a => a.user_id))
  const available = onDutyWorkers.filter(u => !assignedUserIds.has(u.user_id))

  const reqWorkers = item.required_workers || 0
  const reqForemen = item.required_foremen || 0
  const reqVehicles = item.required_vehicles || 0
  const hasRequirements = reqWorkers > 0 || reqForemen > 0 || reqVehicles > 0

  const workerCount = assignments.filter(a => a.role === 'WORKER').length
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
            <span>{ROLE_LABELS[a.role][0]}</span>
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
        {assignments.length === 0 && (
          <span className="text-[10px] text-white/20 italic">Никто не назначен</span>
        )}
        {canAssign && (
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-white/20 text-white/40 hover:text-white/60 hover:border-white/30 transition-colors"
          >
            + добавить
          </button>
        )}
      </div>

      {/* Worker picker */}
      {showPicker && (
        <div className="mt-2 p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">Роль:</span>
            {(['WORKER', 'BRIGADIER', 'MASTER', 'DRIVER'] as WorkAssignmentRole[]).map(role => (
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
            <button onClick={() => setShowPicker(false)} className="ml-auto text-white/30 hover:text-white/50 text-xs">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
            {available.map(u => (
              <button
                key={u.user_id}
                onClick={() => handleAdd(u.user_id, pickerRole)}
                className="text-left text-xs px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                <div className="font-medium">{u.full_name}</div>
                <div className="text-[10px] text-white/30">{u.assignment?.schedule_code ?? '—'}</div>
              </button>
            ))}
            {available.length === 0 && (
              <div className="col-span-2 text-xs text-white/20 italic py-2">Все на смене уже назначены</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
