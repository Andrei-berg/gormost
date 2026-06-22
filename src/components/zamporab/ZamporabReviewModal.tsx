'use client'
import { useState, useMemo, useEffect } from 'react'
import type {
  WorkPlanWithItems, WorkPlanItemWithVehicles, Service, AuthSession, CrossServiceRequest,
  UserWithAssignment, Vehicle, VehicleType,
} from '@/types'
import { shiftLabel as fmtShiftLabel } from '@/lib/workSchedule'
import {
  SERVICE_META, WORK_PLAN_STATUS_CONFIG, CROSS_SERVICE_STATUS_CONFIG, VEHICLE_TYPE_CONFIG,
} from '@/types'
import {
  confirmWorkPlanZamporab, returnWorkPlanZamporab, approveWorkPlanDirect,
  createWorkPlanItem, updateWorkPlanItem, deleteWorkPlanItem,
  createCrossServiceRequest, assignVehicle, unassignVehicle, fetchWorkPlanWithItems,
} from '@/lib/api-client'
import { isWorkerOnDuty } from '@/lib/shifts'
import WorkPermitModal from '@/components/head/WorkPermitModal'
import { WorkerIcon, BrigadierIcon, MasterIcon, ItrIcon } from '@/components/RoleIcons'
import VehicleNumberBadge from '@/components/VehicleNumberBadge'

// ── Constants ─────────────────────────────────────────────────────────────

const ZAMPORAB_OWN_SERVICE = 'SRV-STR'

const ALL_SERVICES = Object.keys(SERVICE_META)

const SERVICE_NAMES: Record<string, string> = {
  'SRV-ENG':  'Инженерные системы',
  'SRV-STR':  'Строительная служба',
  'SRV-FIRE': 'Пожарная безопасность',
  'SRV-VENT': 'Вентиляция',
  'SRV-CCTV': 'Видеонаблюдение',
}

interface CrossServiceDraft {
  to_service_id: string
  description: string
  needed_count: number
  time_start: string
  time_end: string
}

// ── Props ─────────────────────────────────────────────────────────────────

interface Props {
  plan: WorkPlanWithItems
  services: Service[]
  session: AuthSession
  driverUsers?: UserWithAssignment[]
  vehicles?: Vehicle[]
  onClose: () => void
  onSaved: () => void
}

// ── Main component ────────────────────────────────────────────────────────

export default function ZamporabReviewModal({ plan, services, session, driverUsers = [], vehicles = [], onClose, onSaved }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [showReturnForm, setShowReturnForm] = useState(false)
  const [returnNotes, setReturnNotes] = useState('')
  const [returning, setReturning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPermit, setShowPermit] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  // Local items state so vehicle assignments can refresh without full modal reload
  const [localItems, setLocalItems] = useState<WorkPlanItemWithVehicles[]>(plan.items)
  useEffect(() => { setLocalItems(plan.items) }, [plan.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const refreshItems = async () => {
    const updated = await fetchWorkPlanWithItems(plan.id)
    if (updated) setLocalItems(updated.items)
  }

  const handleAssignVehicle = async (vehicleId: string, planItemId: string) => {
    await assignVehicle(vehicleId, planItemId, session.user_id)
    await refreshItems()
  }

  const handleUnassignVehicle = async (vehicleId: string, planItemId: string) => {
    await unassignVehicle(vehicleId, planItemId)
    await refreshItems()
  }

  const activeVehicles = useMemo(() =>
    (vehicles ?? []).filter(v => v.status === 'ACTIVE'),
    [vehicles]
  )

  const svc = services.find(s => s.service_id === plan.service_id)
  const meta = SERVICE_META[plan.service_id] ?? { emoji: '🔧' }
  const statusCfg = WORK_PLAN_STATUS_CONFIG[plan.status]
  const isOwnService = plan.service_id === ZAMPORAB_OWN_SERVICE
  const isDirect = isOwnService && plan.status === 'SUBMITTED'

  const shiftLabel = fmtShiftLabel(plan.shift_type)

  const [d, m, y] = (() => {
    const parts = plan.plan_date.split('-')
    return [parts[2], parts[1], parts[0]]
  })()
  const dateLabel = `${d}.${m}.${y}`

  // Totals
  const totalWorkers    = localItems.reduce((s, i) => s + (i.required_workers ?? 0), 0)
  const totalBrigadiers = localItems.reduce((s, i) => s + (i.required_brigadiers ?? 0), 0)
  const totalMasters    = localItems.reduce((s, i) => s + (i.required_masters ?? 0), 0)
  const totalForemen    = localItems.reduce((s, i) => s + (i.required_foremen ?? 0), 0)
  const totalVehicles   = localItems.reduce((s, i) => s + (i.required_vehicles ?? 0), 0)

  // Resource availability for this plan's date
  const planDate = new Date(plan.plan_date + 'T00:00:00')

  const onDutyDriverCount = useMemo(() =>
    driverUsers.filter(u => {
      const a = u.assignment
      if (!a || !a.schedule_code) return false
      const pos = (u.position ?? '').toLowerCase()
      if (pos.includes('тракторист') || pos.includes('машинист')) return false
      return isWorkerOnDuty({
        shift_num: a.shift_num, schedule_code: a.schedule_code,
        shift_reference_date: a.shift_reference_date, rotation_group: a.rotation_group,
        active_phase: a.active_phase ?? null, custom_work_days: a.custom_work_days ?? null,
        custom_rest_days: a.custom_rest_days ?? null,
      }, planDate)
    }).length
  , [driverUsers, plan.plan_date]) // eslint-disable-line react-hooks/exhaustive-deps

  const onDutyOperatorCount = useMemo(() =>
    driverUsers.filter(u => {
      const a = u.assignment
      if (!a || !a.schedule_code) return false
      const pos = (u.position ?? '').toLowerCase()
      if (!pos.includes('тракторист') && !pos.includes('машинист')) return false
      return isWorkerOnDuty({
        shift_num: a.shift_num, schedule_code: a.schedule_code,
        shift_reference_date: a.shift_reference_date, rotation_group: a.rotation_group,
        active_phase: a.active_phase ?? null, custom_work_days: a.custom_work_days ?? null,
        custom_rest_days: a.custom_rest_days ?? null,
      }, planDate)
    }).length
  , [driverUsers, plan.plan_date]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeVehicleCount = vehicles.filter(v => v.status === 'ACTIVE').length

  const handleConfirm = async () => {
    setConfirming(true)
    setError(null)
    const ok = isDirect
      ? await approveWorkPlanDirect(plan.id, session.user_id)
      : await confirmWorkPlanZamporab(plan.id, session.user_id)
    if (ok) {
      onSaved()
      onClose()
    } else {
      setError('Ошибка при подтверждении. Убедитесь что миграция 018 выполнена в Supabase.')
      setConfirming(false)
    }
  }

  const handleReturn = async () => {
    if (!returnNotes.trim()) return
    setReturning(true)
    await returnWorkPlanZamporab(plan.id, session.user_id, returnNotes.trim())
    onSaved()
    onClose()
  }

  const handleSaveItem = async (data: ItemFormData, crossDraft: CrossServiceDraft | null) => {
    const item = await createWorkPlanItem({ plan_id: plan.id, sort_order: plan.items.length, ...data })
    if (item && crossDraft && session.service_id) {
      await createCrossServiceRequest({
        from_plan_item_id: item.id,
        from_plan_id: plan.id,
        from_service_id: session.service_id,
        to_service_id: crossDraft.to_service_id,
        description: crossDraft.description,
        needed_count: crossDraft.needed_count,
        time_start: crossDraft.time_start || null,
        time_end: crossDraft.time_end || null,
        created_by: session.user_id,
      })
    }
    setShowAddItem(false)
    onSaved()
  }

  const handleUpdateItem = async (itemId: string, data: ItemFormData, crossDraft: CrossServiceDraft | null) => {
    await updateWorkPlanItem(itemId, data)
    if (crossDraft && session.service_id) {
      await createCrossServiceRequest({
        from_plan_item_id: itemId,
        from_plan_id: plan.id,
        from_service_id: session.service_id,
        to_service_id: crossDraft.to_service_id,
        description: crossDraft.description,
        needed_count: crossDraft.needed_count,
        time_start: crossDraft.time_start || null,
        time_end: crossDraft.time_end || null,
        created_by: session.user_id,
      })
    }
    setEditingItemId(null)
    onSaved()
  }

  const handleDeleteItem = async (itemId: string) => {
    await deleteWorkPlanItem(itemId)
    onSaved()
  }


  return (
    <>
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[999] flex items-start justify-center p-3 pt-4 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="glass-strong rounded-2xl w-full max-w-3xl border border-white/10 shadow-2xl flex flex-col mb-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-xl">{meta.emoji}</span>
            <div>
              <div className="text-sm font-semibold text-white">
                {svc?.service_name ?? plan.service_id}
              </div>
              <div className="text-[11px] text-white/40">{dateLabel} · {shiftLabel}</div>
            </div>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full border"
              style={{ color: statusCfg.color, borderColor: statusCfg.color + '40' }}
            >
              {statusCfg.label}
            </span>
            {!isDirect && (
              <span className="text-[10px] text-green-400/70">✓ Гл. инженер</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all text-lg leading-none"
          >✕</button>
        </div>

        {/* ── Items ── */}
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/35 uppercase tracking-widest">
              Позиции плана
              {plan.items.length > 0 && <span className="text-white/50"> · {plan.items.length}</span>}
            </span>
            {!showAddItem && (
              <button
                onClick={() => setShowAddItem(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 text-xs font-medium transition-all"
              >
                + Добавить позицию
              </button>
            )}
          </div>

          {localItems.length === 0 && !showAddItem && (
            <div className="text-center text-white/30 text-sm py-6">Нет позиций в плане</div>
          )}

          {localItems.map(item =>
            editingItemId === item.id ? (
              <PlanItemForm
                key={item.id}
                initial={item}
                planServiceId={plan.service_id}
                existingCrossRequest={item.cross_requests?.[0] ?? null}
                onSave={(data, cross) => handleUpdateItem(item.id, data, cross)}
                onCancel={() => setEditingItemId(null)}
              />
            ) : (
              <ReviewItemCard
                key={item.id}
                item={item}
                activeVehicles={activeVehicles}
                onEdit={() => setEditingItemId(item.id)}
                onDelete={() => handleDeleteItem(item.id)}
                onAssignVehicle={handleAssignVehicle}
                onUnassignVehicle={handleUnassignVehicle}
              />
            )
          )}

          {showAddItem && (
            <PlanItemForm
              planServiceId={plan.service_id}
              onSave={handleSaveItem}
              onCancel={() => setShowAddItem(false)}
            />
          )}
        </div>

        {/* ── Totals bar ── */}
        {plan.items.length > 0 && (
          <div className="mx-5 mb-3 px-4 py-2.5 rounded-xl bg-white/4 border border-white/8 flex items-center gap-4 flex-wrap">
            <span className="text-[10px] text-white/35 uppercase tracking-widest">Итого</span>
            <TotalBadge icon={<WorkerIcon className="w-4 h-4" />}    count={totalWorkers}    label="рабочих" />
            <TotalBadge icon={<BrigadierIcon className="w-4 h-4" />} count={totalBrigadiers} label="бригадир" />
            <TotalBadge icon={<MasterIcon className="w-4 h-4" />}    count={totalMasters}    label="мастер" />
            {totalForemen > 0 && <TotalBadge icon={<ItrIcon className="w-4 h-4" />} count={totalForemen} label="ИТР" />}
            <TotalBadge icon="🚗" count={totalVehicles}   label="техника" />
          </div>
        )}

        {/* ── Resource availability ── */}
        {(driverUsers.length > 0 || vehicles.length > 0) && (
          <div className="mx-5 mb-4">
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2 px-1">
              Ресурсы на {new Date(plan.plan_date + 'T00:00:00').toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' })}
            </div>
            <div className="rounded-xl border border-white/8 overflow-hidden divide-y divide-white/[0.06]">

              {/* Drivers row */}
              <ResourceRow
                icon="🚗"
                label="Водители"
                available={onDutyDriverCount}
                required={totalWorkers}
                names={driverUsers
                  .filter(u => {
                    const pos = (u.position ?? '').toLowerCase()
                    if (pos.includes('тракторист') || pos.includes('машинист')) return false
                    const a = u.assignment
                    if (!a?.schedule_code) return false
                    return isWorkerOnDuty({ shift_num: a.shift_num, schedule_code: a.schedule_code, shift_reference_date: a.shift_reference_date, rotation_group: a.rotation_group, active_phase: a.active_phase ?? null, custom_work_days: a.custom_work_days ?? null, custom_rest_days: a.custom_rest_days ?? null }, planDate)
                  })
                  .map(u => u.full_name)}
              />

              {/* Operators row */}
              <ResourceRow
                icon="🚜"
                label="Трактористы"
                available={onDutyOperatorCount}
                required={totalForemen}
                names={driverUsers
                  .filter(u => {
                    const pos = (u.position ?? '').toLowerCase()
                    if (!pos.includes('тракторист') && !pos.includes('машинист')) return false
                    const a = u.assignment
                    if (!a?.schedule_code) return false
                    return isWorkerOnDuty({ shift_num: a.shift_num, schedule_code: a.schedule_code, shift_reference_date: a.shift_reference_date, rotation_group: a.rotation_group, active_phase: a.active_phase ?? null, custom_work_days: a.custom_work_days ?? null, custom_rest_days: a.custom_rest_days ?? null }, planDate)
                  })
                  .map(u => u.full_name)}
              />

              {/* Vehicles row */}
              <ResourceRow
                icon="🔧"
                label="Техника"
                available={activeVehicleCount}
                required={totalVehicles}
                names={vehicles.filter(v => v.status === 'ACTIVE').map(v => v.name + (v.plate ? ` (${v.plate})` : ''))}
              />

            </div>
          </div>
        )}

        {/* ── Return form ── */}
        {showReturnForm && (
          <div className="mx-5 mb-3 p-4 rounded-xl bg-yellow-500/8 border border-yellow-500/20 space-y-3">
            <div className="text-[11px] font-semibold text-yellow-400/80 uppercase tracking-wider">
              Вернуть на доработку
            </div>
            <textarea
              value={returnNotes}
              onChange={e => setReturnNotes(e.target.value)}
              rows={3}
              placeholder="Укажите замечания для начальника службы…"
              className="w-full px-3 py-2 rounded-lg bg-white/8 border border-white/10 text-white text-sm placeholder-white/25 focus:outline-none focus:border-yellow-500/40 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleReturn}
                disabled={!returnNotes.trim() || returning}
                className="px-4 py-2 rounded-lg bg-yellow-600/70 hover:bg-yellow-500/80 disabled:opacity-40 text-white text-sm font-medium transition-all"
              >
                {returning ? '...' : '↩ Отправить замечания'}
              </button>
              <button
                onClick={() => setShowReturnForm(false)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm transition-all"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="px-5 pb-5">
          {error && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}
          <div className="flex gap-2.5">
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/20"
            >
              {confirming ? '⏳ Подтверждается...' : `✓ Подтвердить план · ${localItems.length} поз.`}
            </button>
            {!isDirect && (
              <button
                onClick={() => setShowReturnForm(f => !f)}
                className="px-5 py-2.5 rounded-xl bg-yellow-600/20 hover:bg-yellow-600/35 border border-yellow-500/25 text-yellow-400 hover:text-yellow-300 text-sm font-medium transition-all"
              >
                ↩ Вернуть
              </button>
            )}
            <button
              onClick={() => setShowPermit(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/25 text-blue-300 text-sm font-medium transition-all"
            >
              🖨 Наряд-допуск
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/70 text-sm transition-all"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>

    {showPermit && (
      <WorkPermitModal plan={{ ...plan, items: localItems }} session={session} onClose={() => setShowPermit(false)} />
    )}
  </>
  )
}

// ── TotalBadge ─────────────────────────────────────────────────────────────

function TotalBadge({ icon, count, label }: { icon: React.ReactNode; count: number; label: string }) {
  if (count === 0) return null
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-base">{icon}</span>
      <span className="text-white font-semibold text-sm">{count}</span>
      <span className="text-white/40 text-xs">{label}</span>
    </div>
  )
}

// ── ReviewItemCard — read-only item in WorkPlanModal style ─────────────────

function ReviewItemCard({ item, activeVehicles, onEdit, onDelete, onAssignVehicle, onUnassignVehicle }: {
  item: WorkPlanItemWithVehicles
  activeVehicles: Vehicle[]
  onEdit: () => void
  onDelete: () => void
  onAssignVehicle: (vehicleId: string, planItemId: string) => Promise<void>
  onUnassignVehicle: (vehicleId: string, planItemId: string) => Promise<void>
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden group">
      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] border-b border-white/8">
        {item.time_start && (
          <span className="text-xs font-mono text-cyan-400 shrink-0">
            {item.time_start}{item.time_end ? `–${item.time_end}` : ''}
          </span>
        )}
        <span className="flex-1 text-sm font-medium text-white truncate">{item.location}</span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onEdit}   className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 text-xs">✏️</button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 text-xs">🗑️</button>
        </div>
      </div>

      {/* Card body */}
      <div className="px-3 py-2.5 space-y-2">
        {item.work_description && (
          <div className="text-sm text-white/70">{item.work_description}</div>
        )}

        {/* Headcount row */}
        {(item.required_workers > 0 || item.required_brigadiers > 0 ||
          item.required_masters > 0 || item.required_foremen > 0 || item.required_vehicles > 0) && (
          <div className="flex flex-wrap gap-2">
            <HeadcountBadge icon={<WorkerIcon className="w-3.5 h-3.5" />}    count={item.required_workers}    label="рабочих" color="blue" />
            <HeadcountBadge icon={<BrigadierIcon className="w-3.5 h-3.5" />} count={item.required_brigadiers} label="бригадир" color="amber" />
            <HeadcountBadge icon={<MasterIcon className="w-3.5 h-3.5" />}    count={item.required_masters}    label="мастер"   color="violet" />
            <HeadcountBadge icon={<ItrIcon className="w-3.5 h-3.5" />}       count={item.required_foremen}    label="ИТР"      color="cyan" />
            <HeadcountBadge icon="🚗" count={item.required_vehicles}   label="техника"  color="emerald" />
          </div>
        )}

        {/* Named workers */}
        {item.workers.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.workers.map((w, i) => (
              <span key={i} className="text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded-full">
                {w}
              </span>
            ))}
          </div>
        )}

        {/* Cross-service requests */}
        {item.cross_requests?.length > 0 && (
          <div className="space-y-1">
            {item.cross_requests.map(r => {
              const cfg = CROSS_SERVICE_STATUS_CONFIG[r.status]
              const toMeta = SERVICE_META[r.to_service_id]
              return (
                <div key={r.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-violet-500/8 border border-violet-500/15">
                  <span className="text-violet-400 text-xs">🔗</span>
                  <span className="text-xs text-violet-300 font-medium">
                    {toMeta?.emoji ?? ''} {SERVICE_NAMES[r.to_service_id] ?? r.to_service_id}
                  </span>
                  <span className="text-xs text-white/40">· {r.needed_count} чел.</span>
                  {r.time_start && (
                    <span className="text-xs font-mono text-white/35">{r.time_start}{r.time_end ? `–${r.time_end}` : ''}</span>
                  )}
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full border" style={{ color: cfg.color, borderColor: cfg.color + '40' }}>
                    {cfg.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {item.notes && (
          <div className="text-xs text-white/30 italic">{item.notes}</div>
        )}

        {/* Vehicle picker — only for items that require vehicles */}
        {item.required_vehicles > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {/* Assigned vehicle chips */}
            {item.vehicles.map(v => (
              <span key={v.id} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/25">
                {VEHICLE_TYPE_CONFIG[v.vehicle_type]?.emoji ?? '🚛'} {v.name}
                <VehicleNumberBadge number={v.fleet_number} plate={v.plate} size="sm" />
                <button
                  onClick={() => onUnassignVehicle(v.id, item.id)}
                  className="text-blue-400/50 hover:text-red-400 ml-0.5 transition-colors"
                >×</button>
              </span>
            ))}

            {/* Add vehicle dropdown — filtered by required vehicle types if set */}
            {item.vehicles.length < item.required_vehicles && (() => {
              const reqTypes = item.required_vehicle_types ?? []
              const available = activeVehicles.filter(av => !item.vehicles.some(v => v.id === av.id))
              // Filter by required types when specified
              const filtered = reqTypes.length > 0
                ? available.filter(av => reqTypes.some(r => r.type === av.vehicle_type))
                : available
              // Group by type for optgroups
              const byType = new Map<string, typeof filtered>()
              for (const v of filtered) {
                if (!byType.has(v.vehicle_type)) byType.set(v.vehicle_type, [])
                byType.get(v.vehicle_type)!.push(v)
              }
              return (
                <div className="flex items-center gap-2 flex-wrap">
                  {reqTypes.length > 0 && (
                    <span className="text-[10px] text-amber-400/60">
                      нужны: {reqTypes.map(r => `${VEHICLE_TYPE_CONFIG[r.type]?.emoji ?? ''} ${VEHICLE_TYPE_CONFIG[r.type]?.label ?? r.type} ×${r.count}`).join(', ')}
                    </span>
                  )}
                  <select
                    className="form-select text-xs py-1 h-auto"
                    value=""
                    onChange={e => { if (e.target.value) onAssignVehicle(e.target.value, item.id) }}
                  >
                    <option value="">+ авто ({item.vehicles.length}/{item.required_vehicles})</option>
                    {byType.size > 1
                      ? Array.from(byType.entries()).map(([type, vehicles]) => (
                        <optgroup key={type} label={`${VEHICLE_TYPE_CONFIG[type as VehicleType]?.emoji ?? ''} ${VEHICLE_TYPE_CONFIG[type as VehicleType]?.label ?? type}`}>
                          {vehicles.map(av => (
                            <option key={av.id} value={av.id}>{av.name}{av.plate ? ` · ${av.plate}` : ''}</option>
                          ))}
                        </optgroup>
                      ))
                      : filtered.map(av => (
                        <option key={av.id} value={av.id}>{av.name}{av.plate ? ` · ${av.plate}` : ''}</option>
                      ))
                    }
                    {filtered.length === 0 && <option disabled>Нет подходящих ТС</option>}
                  </select>
                </div>
              )
            })()}

            {/* All slots filled */}
            {item.vehicles.length >= item.required_vehicles && item.required_vehicles > 0 && (
              <span className="text-xs text-emerald-400/70">✓ укомплектовано</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── HeadcountBadge ─────────────────────────────────────────────────────────

const BADGE_COLORS: Record<string, string> = {
  blue:    'bg-blue-500/15 text-blue-300 border-blue-500/20',
  amber:   'bg-amber-500/15 text-amber-300 border-amber-500/20',
  violet:  'bg-violet-500/15 text-violet-300 border-violet-500/20',
  cyan:    'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
}

function HeadcountBadge({ icon, count, label, color }: { icon: React.ReactNode; count: number; label: string; color: string }) {
  if (count === 0) return null
  return (
    <span className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${BADGE_COLORS[color]}`}>
      {icon} {count} {label}
    </span>
  )
}

// ── ResourceRow ─────────────────────────────────────────────────────────────

function ResourceRow({ icon, label, available, required, names }: {
  icon: string; label: string; available: number; required: number; names: string[]
}) {
  const [expanded, setExpanded] = useState(false)

  const color = required === 0
    ? 'text-white/40'
    : available >= required
      ? 'text-emerald-400'
      : available >= required - 1
        ? 'text-amber-400'
        : 'text-red-400'

  const statusIcon = required === 0 ? '—' : available >= required ? '✓' : available >= required - 1 ? '⚠' : '✗'
  const statusLabel = required === 0
    ? 'не требуется'
    : available >= required
      ? 'достаточно'
      : `не хватает ${required - available}`

  return (
    <div>
      <button
        onClick={() => names.length > 0 && setExpanded(v => !v)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${names.length > 0 ? 'hover:bg-white/[0.02] cursor-pointer' : 'cursor-default'} transition-colors`}
      >
        <span className="text-base shrink-0">{icon}</span>
        <span className="text-sm text-white/70 w-28 shrink-0">{label}</span>
        <span className={`text-sm font-semibold ${color}`}>{available}</span>
        {required > 0 && (
          <>
            <span className="text-white/20 text-xs">/ нужно {required}</span>
            <span className={`ml-auto text-xs font-medium ${color}`}>{statusIcon} {statusLabel}</span>
          </>
        )}
        {names.length > 0 && (
          <span className={`text-white/20 text-xs ml-1 transition-transform ${expanded ? 'rotate-180' : ''} ${required > 0 ? '' : 'ml-auto'}`}>▾</span>
        )}
      </button>
      {expanded && names.length > 0 && (
        <div className="px-4 pb-2.5 flex flex-wrap gap-1.5">
          {names.map((name, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/55 border border-white/8">
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── PlanItemForm — reused from ZamporabPlanCard ────────────────────────────

import type { WorkPlanItem } from '@/types'

type ItemFormData = Omit<WorkPlanItem, 'id' | 'plan_id' | 'created_at' | 'updated_at' | 'sort_order'>

function PlanItemForm({ initial, planServiceId, existingCrossRequest, onSave, onCancel }: {
  initial?: WorkPlanItem
  planServiceId: string
  existingCrossRequest?: CrossServiceRequest | null
  onSave: (data: ItemFormData, crossDraft: CrossServiceDraft | null) => void
  onCancel: () => void
}) {
  const [location, setLocation]       = useState(initial?.location || '')
  const [workDesc, setWorkDesc]       = useState(initial?.work_description || '')
  const [workersText, setWorkersText] = useState(initial?.workers.join('\n') || '')
  const [timeStart, setTimeStart]     = useState(initial?.time_start || '')
  const [timeEnd, setTimeEnd]         = useState(initial?.time_end || '')
  const [notes, setNotes]             = useState(initial?.notes || '')
  const [reqWorkers, setReqWorkers]   = useState(String(initial?.required_workers ?? 0))
  const [reqBrigadiers, setReqBrig]   = useState(String(initial?.required_brigadiers ?? 0))
  const [reqMasters, setReqMasters]   = useState(String(initial?.required_masters ?? 0))
  const [reqForemen, setReqForemen]   = useState(String(initial?.required_foremen ?? 0))
  const [reqVehicles, setReqVehicles] = useState(String(initial?.required_vehicles ?? 0))

  const otherServices = ALL_SERVICES.filter(id => id !== planServiceId)

  const initCross = (): CrossServiceDraft => existingCrossRequest ? {
    to_service_id: existingCrossRequest.to_service_id,
    description: existingCrossRequest.description,
    needed_count: existingCrossRequest.needed_count,
    time_start: existingCrossRequest.time_start || '',
    time_end: existingCrossRequest.time_end || '',
  } : {
    to_service_id: otherServices[0] ?? '',
    description: '',
    needed_count: 1,
    time_start: initial?.time_start || '',
    time_end: initial?.time_end || '',
  }

  const [crossDraft, setCrossDraft] = useState<CrossServiceDraft | null>(
    existingCrossRequest ? initCross() : null
  )
  const [showCross, setShowCross] = useState(!!existingCrossRequest)

  const handleSave = () => {
    if (!location.trim() || !workDesc.trim()) return
    onSave({
      location: location.trim(),
      work_description: workDesc.trim(),
      workers: workersText.split('\n').map(w => w.trim()).filter(Boolean),
      time_start: timeStart || null,
      time_end: timeEnd || null,
      notes: notes.trim() || null,
      required_workers:    Number(reqWorkers)    || 0,
      required_brigadiers: Number(reqBrigadiers) || 0,
      required_masters:    Number(reqMasters)    || 0,
      required_foremen:    Number(reqForemen)    || 0,
      required_vehicles:   Number(reqVehicles)   || 0,
      required_vehicle_types: [],
      is_redirected:  initial?.is_redirected  ?? false,
      redirect_reason: initial?.redirect_reason ?? null,
    }, crossDraft)
  }

  const toggleCross = () => {
    if (crossDraft) { setShowCross(v => !v) }
    else { setCrossDraft(initCross()); setShowCross(true) }
  }

  const inputCls = 'w-full px-2.5 py-1.5 rounded-lg bg-white/8 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/50'
  const labelCls = 'block text-[10px] text-white/40 uppercase tracking-wider mb-1'
  const numCls   = 'w-full px-2 py-1.5 rounded-lg bg-white/8 border border-white/10 text-white text-sm text-center focus:outline-none focus:border-blue-500/50'

  return (
    <div className="rounded-xl border border-blue-500/25 bg-blue-500/5 overflow-hidden">
      <div className="px-3 py-2 bg-blue-500/10 border-b border-blue-500/15">
        <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
          {initial ? '✏️ Редактирование позиции' : '+ Новая позиция'}
        </span>
      </div>
      <div className="p-3 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>📍 Место / Объект *</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Тоннель №3, портал..." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>🔧 Вид работ *</label>
            <input value={workDesc} onChange={e => setWorkDesc(e.target.value)} placeholder="Замена ламп, ревизия..." className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={labelCls}>С</label>
            <input type="time" value={timeStart} onChange={e => setTimeStart(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>До</label>
            <input type="time" value={timeEnd} onChange={e => setTimeEnd(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Примечание</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="..." className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2">
          <div><label className={labelCls + ' inline-flex items-center gap-1'}><WorkerIcon className="w-3.5 h-3.5" /> Рабочих</label><input type="number" min="0" value={reqWorkers}    onChange={e => setReqWorkers(e.target.value)}   className={numCls} /></div>
          <div><label className={labelCls + ' inline-flex items-center gap-1'}><BrigadierIcon className="w-3.5 h-3.5" /> Бригадир</label><input type="number" min="0" value={reqBrigadiers} onChange={e => setReqBrig(e.target.value)}      className={numCls} /></div>
          <div><label className={labelCls + ' inline-flex items-center gap-1'}><MasterIcon className="w-3.5 h-3.5" /> Мастер</label>  <input type="number" min="0" value={reqMasters}   onChange={e => setReqMasters(e.target.value)}   className={numCls} /></div>
          <div><label className={labelCls + ' inline-flex items-center gap-1'}><ItrIcon className="w-3.5 h-3.5" /> ИТР</label>     <input type="number" min="0" value={reqForemen}   onChange={e => setReqForemen(e.target.value)}   className={numCls} /></div>
          <div><label className={labelCls}>🚗 Техника</label> <input type="number" min="0" value={reqVehicles}  onChange={e => setReqVehicles(e.target.value)}  className={numCls} /></div>
        </div>
        <div>
          <label className={labelCls}>Работники (каждый с новой строки)</label>
          <textarea value={workersText} onChange={e => setWorkersText(e.target.value)} rows={2}
            placeholder={'Иванов И.И.\nПетров П.П.'} className={`${inputCls} resize-none`} />
        </div>

        {/* Cross-service toggle */}
        <div className="flex items-center gap-2">
          <button type="button" onClick={toggleCross}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
              crossDraft
                ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                : 'bg-violet-500/8 border-violet-500/20 text-violet-400/70 hover:text-violet-300 hover:bg-violet-500/15'
            }`}
          >
            <span>🔗</span>
            <span>
              {crossDraft
                ? `${SERVICE_META[crossDraft.to_service_id]?.emoji ?? ''} ${SERVICE_NAMES[crossDraft.to_service_id] ?? crossDraft.to_service_id} ${showCross ? '▾' : '▸'}`
                : 'Смежная служба'}
            </span>
          </button>
        </div>

        {/* Cross-service form */}
        {crossDraft && showCross && (
          <div className="rounded-lg bg-violet-500/5 border border-violet-500/20 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-violet-300 uppercase tracking-wider">🔗 Запрос смежной службе</span>
              <button type="button" onClick={() => { setCrossDraft(null); setShowCross(false) }}
                className="text-white/25 hover:text-red-400 text-xs transition-colors px-1">✕ убрать</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {otherServices.map(sid => (
                <button key={sid} type="button"
                  onClick={() => setCrossDraft(d => d ? { ...d, to_service_id: sid } : d)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    crossDraft.to_service_id === sid
                      ? 'bg-violet-600/40 border-violet-500/60 text-white'
                      : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                  }`}
                >
                  <span>{SERVICE_META[sid]?.emoji ?? ''}</span>
                  <span>{SERVICE_NAMES[sid] ?? sid}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white/40">Людей</span>
                <div className="flex items-center gap-0.5">
                  <button type="button" onClick={() => setCrossDraft(d => d ? { ...d, needed_count: Math.max(1, d.needed_count - 1) } : d)}
                    className="w-6 h-6 rounded bg-white/8 border border-white/10 text-white/50 hover:text-white text-xs font-bold flex items-center justify-center">−</button>
                  <span className="w-7 text-center text-sm font-semibold text-white">{crossDraft.needed_count}</span>
                  <button type="button" onClick={() => setCrossDraft(d => d ? { ...d, needed_count: Math.min(20, d.needed_count + 1) } : d)}
                    className="w-6 h-6 rounded bg-white/8 border border-white/10 text-white/50 hover:text-white text-xs font-bold flex items-center justify-center">+</button>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-white/40">с</span>
                <input type="time" value={crossDraft.time_start}
                  onChange={e => setCrossDraft(d => d ? { ...d, time_start: e.target.value } : d)}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50" />
                <span className="text-white/30 text-xs">–</span>
                <input type="time" value={crossDraft.time_end}
                  onChange={e => setCrossDraft(d => d ? { ...d, time_end: e.target.value } : d)}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50" />
              </div>
            </div>
            <input type="text" value={crossDraft.description}
              onChange={e => setCrossDraft(d => d ? { ...d, description: e.target.value } : d)}
              placeholder="Что нужно сделать (опишите задачу для другой службы)…"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50" />
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={handleSave} disabled={!location.trim() || !workDesc.trim()}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium">
            Сохранить
          </button>
          <button onClick={onCancel} className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm">
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}
