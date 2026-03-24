'use client'
import { useState, useCallback } from 'react'
import type { WorkPlanWithItems, WorkPlanItem, WorkPlanItemWithVehicles, AuthSession, UserWithAssignment, VehicleRequirement } from '@/types'
import { WORK_PLAN_STATUS_CONFIG, CROSS_SERVICE_STATUS_CONFIG, SERVICE_META, VEHICLE_TYPE_CONFIG, VehicleType } from '@/types'
import WorkPermitModal from './WorkPermitModal'
import {
  createWorkPlanItem, updateWorkPlanItem, deleteWorkPlanItem,
  submitWorkPlan, deleteWorkPlan, recallWorkPlan,
  fetchUsersWithAssignments,
} from '@/lib/api'
import { isWorkerOnDuty } from '@/lib/shifts'

const SERVICE_NAMES: Record<string, string> = {
  'SRV-ENG':  'Инженерные системы',
  'SRV-STR':  'Строительная служба',
  'SRV-FIRE': 'Пожарная безопасность',
  'SRV-VENT': 'Вентиляция',
  'SRV-CCTV': 'Видеонаблюдение',
}

interface Props {
  plan: WorkPlanWithItems
  session: AuthSession
  onRefresh: () => void
}

export default function PlanCard({ plan, session, onRefresh }: Props) {
  const [showAddItem, setShowAddItem] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [acting, setActing] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showPermit, setShowPermit] = useState(false)

  const canEdit = plan.status === 'DRAFT' || plan.status === 'REJECTED'
  const canSubmit = canEdit && plan.items.length > 0
  const statusCfg = WORK_PLAN_STATUS_CONFIG[plan.status]
  const shiftLabel = plan.shift_type === 'DAY' ? '☀️ День · 07:30–19:00' : '🌙 Ночь · 19:00–07:00'

  // Totals
  const totalWorkers    = plan.items.reduce((s, it) => s + (it.required_workers    ?? 0), 0)
  const totalBrigadiers = plan.items.reduce((s, it) => s + (it.required_brigadiers ?? 0), 0)
  const totalMasters    = plan.items.reduce((s, it) => s + (it.required_masters    ?? 0), 0)
  const totalForemen    = plan.items.reduce((s, it) => s + (it.required_foremen    ?? 0), 0)
  const totalVehicles   = plan.items.reduce((s, it) => s + (it.required_vehicles   ?? 0), 0)

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      await submitWorkPlan(plan.id, session.user_id)
      onRefresh()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Ошибка при отправке')
    } finally {
      setSubmitting(false)
    }
  }

  // Recall from SUBMITTED → DRAFT for editing
  const handleRecall = async () => {
    if (!confirm('Отозвать план на доработку? Он вернётся в черновики.')) return
    setActing(true)
    try {
      await recallWorkPlan(plan.id, session.user_id)
      onRefresh()
    } finally {
      setActing(false)
    }
  }

  // Delete only DRAFT/REJECTED plans
  const handleDelete = async () => {
    if (!confirm('Удалить план?')) return
    setActing(true)
    try {
      await deleteWorkPlan(plan.id, session.user_id)
      onRefresh()
    } finally {
      setActing(false)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    await deleteWorkPlanItem(itemId)
    onRefresh()
  }

  type ItemFormData = Omit<WorkPlanItemWithVehicles, 'id' | 'plan_id' | 'created_at' | 'updated_at' | 'sort_order' | 'vehicles' | 'cross_requests'>

  const handleSaveItem = async (data: ItemFormData) => {
    await createWorkPlanItem({ plan_id: plan.id, sort_order: plan.items.length, ...data })
    setShowAddItem(false)
    onRefresh()
  }

  const handleUpdateItem = async (itemId: string, data: ItemFormData) => {
    await updateWorkPlanItem(itemId, data)
    setEditingItemId(null)
    onRefresh()
  }

  return (
    <>
    <div className="glass rounded-xl overflow-hidden">
      {/* Rejected banner */}
      {plan.status === 'REJECTED' && plan.chief_notes && (
        <div className="px-4 pt-3 pb-0">
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="text-[10px] text-red-400/70 uppercase tracking-wider mb-1">Возвращён с комментарием</div>
            <div className="text-sm text-red-300">{plan.chief_notes}</div>
          </div>
        </div>
      )}

      <div className="flex gap-0 divide-x divide-white/8">

        {/* ── Left: items list ── */}
        <div className="flex-1 min-w-0 p-4 space-y-2">
          <div className="text-sm font-semibold text-white mb-3">{shiftLabel}</div>

          {plan.items.length === 0 && (
            <div className="text-center text-white/25 text-sm py-6 border border-dashed border-white/10 rounded-lg">
              Нет позиций — добавьте работы
            </div>
          )}

          {plan.items.map(item =>
            editingItemId === item.id ? (
              <PlanItemForm
                key={item.id}
                initial={item}
                serviceId={plan.service_id}
                onSave={(data) => handleUpdateItem(item.id, data)}
                onCancel={() => setEditingItemId(null)}
              />
            ) : (
              <ItemRow
                key={item.id}
                item={item}
                canEdit={canEdit}
                onEdit={() => setEditingItemId(item.id)}
                onDelete={() => handleDeleteItem(item.id)}
              />
            )
          )}

          {canEdit && (
            showAddItem ? (
              <PlanItemForm
                serviceId={plan.service_id}
                onSave={handleSaveItem}
                onCancel={() => setShowAddItem(false)}
              />
            ) : (
              <button
                onClick={() => setShowAddItem(true)}
                className="w-full py-2 rounded-lg border border-dashed border-white/15 text-white/35 hover:text-white/60 hover:border-white/25 text-sm transition-colors"
              >
                + Добавить позицию
              </button>
            )
          )}
        </div>

        {/* ── Right: status + totals + actions ── */}
        <div className="w-44 shrink-0 p-4 flex flex-col gap-3">

          {/* Status */}
          <div>
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5">Статус</div>
            <span
              className={`inline-flex items-center text-[11px] px-2.5 py-1 rounded-full border font-medium ${statusCfg.bg}`}
              style={{ color: statusCfg.color }}
            >
              {statusCfg.label}
            </span>
          </div>

          {/* Headcount totals */}
          {(totalWorkers > 0 || totalBrigadiers > 0 || totalMasters > 0 || totalForemen > 0 || totalVehicles > 0) && (
            <div className="space-y-1.5">
              <div className="text-[10px] text-white/30 uppercase tracking-widest">Всего</div>
              {totalWorkers    > 0 && <TotalRow icon="👷" label="Рабочих"   count={totalWorkers} />}
              {totalBrigadiers > 0 && <TotalRow icon="⭐" label="Бригадир"  count={totalBrigadiers} />}
              {totalMasters    > 0 && <TotalRow icon="🎓" label="Мастер"    count={totalMasters} />}
              {totalForemen    > 0 && <TotalRow icon="📋" label="ИТР"       count={totalForemen} />}
              {totalVehicles   > 0 && <TotalRow icon="🚛" label="Техника"   count={totalVehicles} />}
            </div>
          )}

          <div className="flex-1" />

          {submitError && (
            <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
              {submitError}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            {canSubmit && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-2 rounded-lg bg-green-600/80 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-semibold transition-all"
              >
                {submitting
                  ? '⏳ Отправка...'
                  : plan.status === 'REJECTED'
                    ? '↑ Повторно'
                    : '↑ На согласование'
                }
              </button>
            )}
            <button
              onClick={() => setShowPermit(true)}
              className="w-full py-1.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/30 text-blue-300 text-xs transition-all"
            >
              🖨 Наряд-допуск
            </button>
            {/* Recall submitted plan for editing */}
            {plan.status === 'SUBMITTED' && (
              <button
                onClick={handleRecall}
                disabled={acting}
                className="w-full py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/35 text-amber-300 text-xs transition-all disabled:opacity-50"
              >
                {acting ? '...' : '↩ Отозвать'}
              </button>
            )}
            {/* Delete only DRAFT/REJECTED */}
            {(plan.status === 'DRAFT' || plan.status === 'REJECTED') && (
              <button
                onClick={handleDelete}
                disabled={acting}
                className="w-full py-1.5 rounded-lg bg-red-600/15 hover:bg-red-600/30 text-red-400 text-xs transition-all disabled:opacity-50"
              >
                {acting ? '...' : 'Удалить'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>

    {showPermit && (
      <WorkPermitModal plan={plan} session={session} onClose={() => setShowPermit(false)} />
    )}
    </>
  )
}

// ── Item row ───────────────────────────────────────────────────────────────

function ItemRow({ item, canEdit, onEdit, onDelete }: {
  item: WorkPlanItemWithVehicles
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const hasVehicles = item.vehicles && item.vehicles.length > 0
  const vehicleTypes: VehicleRequirement[] = item.required_vehicle_types ?? []

  return (
    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white/4 group hover:bg-white/6 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {item.time_start && (
            <span className="text-[11px] font-mono text-cyan-400 shrink-0 bg-cyan-500/10 px-1.5 py-0.5 rounded">
              {item.time_start}{item.time_end ? `–${item.time_end}` : ''}
            </span>
          )}
          <span className="text-sm font-medium text-white/90">{item.location}</span>
        </div>
        <div className="text-xs text-white/55 mt-0.5 leading-relaxed">{item.work_description}</div>

        {/* Headcount + vehicle type badges */}
        {(item.required_workers > 0 || item.required_brigadiers > 0 || item.required_masters > 0 || item.required_foremen > 0 || vehicleTypes.length > 0 || item.required_vehicles > 0) && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.required_workers    > 0 && <span className="text-[10px] bg-blue-500/15    text-blue-300    px-1.5 py-0.5 rounded">👷 {item.required_workers}</span>}
            {item.required_brigadiers > 0 && <span className="text-[10px] bg-yellow-500/15  text-yellow-300  px-1.5 py-0.5 rounded">⭐ {item.required_brigadiers}</span>}
            {item.required_masters    > 0 && <span className="text-[10px] bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 rounded">🎓 {item.required_masters}</span>}
            {item.required_foremen    > 0 && <span className="text-[10px] bg-purple-500/15  text-purple-300  px-1.5 py-0.5 rounded">📋 {item.required_foremen}</span>}
            {/* Vehicle types (new) */}
            {vehicleTypes.map((vr, i) => {
              const cfg = VEHICLE_TYPE_CONFIG[vr.type]
              return (
                <span key={i} className="text-[10px] bg-amber-500/15 text-amber-300 px-1.5 py-0.5 rounded">
                  {cfg.emoji} {cfg.label} ×{vr.count}
                </span>
              )
            })}
            {/* Fallback: old items with only required_vehicles count */}
            {vehicleTypes.length === 0 && item.required_vehicles > 0 && !hasVehicles && (
              <span className="text-[10px] bg-amber-500/15 text-amber-300 px-1.5 py-0.5 rounded">🚛 нужно {item.required_vehicles}</span>
            )}
          </div>
        )}

        {/* Assigned vehicles from transport module */}
        {hasVehicles && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {item.vehicles.map(v => (
              <div key={v.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/25">
                <span className="text-sm">🚗</span>
                <div className="flex flex-col leading-none">
                  <span className="text-[11px] font-semibold text-amber-200">{v.name}</span>
                  <span className="text-[10px] text-amber-400 font-mono">{v.plate}{v.fleet_number ? ` · гар.${v.fleet_number}` : ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Named workers */}
        {item.workers.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {item.workers.map((w, i) => (
              <span key={i} className="text-[10px] bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 rounded-full">{w}</span>
            ))}
          </div>
        )}

        {/* Cross-service requests status */}
        {item.cross_requests && item.cross_requests.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {item.cross_requests.map(r => {
              const cfg = CROSS_SERVICE_STATUS_CONFIG[r.status]
              const toMeta = SERVICE_META[r.to_service_id]
              return (
                <div key={r.id} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] ${cfg.bg}`} style={{ color: cfg.color }}>
                  <span>🔗</span>
                  <span className="font-medium">{toMeta?.emoji ?? ''} {SERVICE_NAMES[r.to_service_id] ?? r.to_service_id}</span>
                  <span className="opacity-70">· {r.needed_count} чел.</span>
                  <span className="font-semibold">· {cfg.label}</span>
                  {r.response_note && <span className="opacity-60 ml-1">"{r.response_note}"</span>}
                </div>
              )
            })}
          </div>
        )}

        {item.notes && <div className="text-[11px] text-white/30 mt-1 italic">{item.notes}</div>}
      </div>

      {canEdit && (
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
          <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-white/10 text-white/30 hover:text-white/70 text-xs transition-colors">✏️</button>
          <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-red-500/15 text-white/30 hover:text-red-400 text-xs transition-colors">✕</button>
        </div>
      )}
    </div>
  )
}

// ── Item edit / create form ─────────────────────────────────────────────────

type ItemFormData = Omit<WorkPlanItemWithVehicles, 'id' | 'plan_id' | 'created_at' | 'updated_at' | 'sort_order' | 'vehicles' | 'cross_requests'>

// Grouping for worker picker
const ROLE_GROUPS: Array<{ key: string; label: string; levels: string[] }> = [
  { key: 'foreman',  label: 'Мастера / Бригадиры', levels: ['FOREMAN'] },
  { key: 'itr',      label: 'ИТР / Специалисты',   levels: ['HEAD', 'SPECIALIST', 'CHIEF_ENGINEER', 'ZAMPORAB', 'DISPATCHER', 'HR', 'SAFETY_ENGINEER'] },
  { key: 'worker',   label: 'Рабочие',              levels: ['WORKER'] },
  { key: 'driver',   label: 'Водители',             levels: ['DRIVER'] },
]

function PlanItemForm({ initial, serviceId, onSave, onCancel }: {
  initial?: WorkPlanItem
  serviceId: string
  onSave: (data: ItemFormData) => void
  onCancel: () => void
}) {
  const [location, setLocation]   = useState(initial?.location || '')
  const [workDesc, setWorkDesc]   = useState(initial?.work_description || '')
  const [timeStart, setTimeStart] = useState(initial?.time_start || '')
  const [timeEnd, setTimeEnd]     = useState(initial?.time_end || '')
  const [notes, setNotes]         = useState(initial?.notes || '')
  const [reqWorkers,    setReqWorkers]    = useState(initial?.required_workers    ?? 0)
  const [reqBrigadiers, setReqBrigadiers] = useState(initial?.required_brigadiers ?? 0)
  const [reqMasters,    setReqMasters]    = useState(initial?.required_masters    ?? 0)
  const [reqForemen,    setReqForemen]    = useState(initial?.required_foremen    ?? 0)

  // Vehicle type requirements (replaces single count stepper)
  const [vehicleReqs, setVehicleReqs] = useState<VehicleRequirement[]>(
    initial?.required_vehicle_types ?? []
  )
  const [showVehicleMenu, setShowVehicleMenu] = useState(false)

  // Named workers (smart picker)
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>(initial?.workers ?? [])
  const [showWorkerPicker, setShowWorkerPicker] = useState(false)
  const [pickerWorkers, setPickerWorkers] = useState<UserWithAssignment[]>([])
  const [pickerLoading, setPickerLoading] = useState(false)

  // Vehicle type helpers
  const addVehicleType = (type: VehicleType) => {
    setShowVehicleMenu(false)
    if (vehicleReqs.find(r => r.type === type)) return
    setVehicleReqs(prev => [...prev, { type, count: 1 }])
  }
  const changeVehicleCount = (type: VehicleType, delta: number) => {
    setVehicleReqs(prev => prev.map(r =>
      r.type === type ? { ...r, count: Math.max(1, r.count + delta) } : r
    ))
  }
  const removeVehicleType = (type: VehicleType) => {
    setVehicleReqs(prev => prev.filter(r => r.type !== type))
  }

  // Worker picker helpers
  const loadWorkers = useCallback(async () => {
    if (pickerWorkers.length > 0 || pickerLoading) return
    setPickerLoading(true)
    const today = new Date()
    const all = await fetchUsersWithAssignments()
    const onDuty = all.filter(u => {
      if (u.service_id !== serviceId) return false
      if (!u.assignment) return false
      return isWorkerOnDuty({
        shift_num: u.assignment.shift_num,
        schedule_code: u.assignment.schedule_code ?? '',
        shift_reference_date: u.assignment.shift_reference_date,
        rotation_group: u.assignment.rotation_group,
      }, today)
    })
    setPickerWorkers(onDuty)
    setPickerLoading(false)
  }, [serviceId, pickerWorkers.length, pickerLoading])

  const toggleWorkerPicker = () => {
    if (!showWorkerPicker) loadWorkers()
    setShowWorkerPicker(prev => !prev)
  }

  const toggleWorker = (name: string) => {
    setSelectedWorkers(prev =>
      prev.includes(name) ? prev.filter(w => w !== name) : [...prev, name]
    )
  }

  const handleSave = () => {
    if (!location.trim() || !workDesc.trim()) return
    const totalVehicles = vehicleReqs.reduce((s, r) => s + r.count, 0)
    onSave({
      location: location.trim(),
      work_description: workDesc.trim(),
      workers: selectedWorkers,
      time_start: timeStart || null,
      time_end: timeEnd || null,
      notes: notes.trim() || null,
      required_workers:       reqWorkers,
      required_brigadiers:    reqBrigadiers,
      required_masters:       reqMasters,
      required_foremen:       reqForemen,
      required_vehicles:      totalVehicles,
      required_vehicle_types: vehicleReqs,
      is_redirected: false,
      redirect_reason: null,
    })
  }

  const inp = 'form-input w-full text-sm px-2.5 py-1.5 placeholder-white/30'
  const lbl = 'block text-[10px] text-white/40 uppercase tracking-wider mb-1'

  // Vehicle types not yet selected
  const usedTypes = new Set(vehicleReqs.map(r => r.type))
  const availableTypes = (Object.keys(VEHICLE_TYPE_CONFIG) as VehicleType[]).filter(t => !usedTypes.has(t))

  return (
    <div className="p-3 rounded-xl bg-blue-500/8 border border-blue-500/20 space-y-3">

      {/* Location + work description */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={lbl}>Место *</label>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Тоннель, портал..." className={inp} />
        </div>
        <div>
          <label className={lbl}>Вид работ *</label>
          <input value={workDesc} onChange={e => setWorkDesc(e.target.value)} placeholder="Замена ламп..." className={inp} />
        </div>
      </div>

      {/* Time + headcount steppers */}
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className={lbl}>С</label>
          <input type="time" value={timeStart} onChange={e => setTimeStart(e.target.value)} className="form-input text-sm px-2 py-1.5" />
        </div>
        <div>
          <label className={lbl}>До</label>
          <input type="time" value={timeEnd} onChange={e => setTimeEnd(e.target.value)} className="form-input text-sm px-2 py-1.5" />
        </div>
        <div className="flex items-end gap-2 ml-2 flex-wrap">
          <MiniStepper label="👷" value={reqWorkers}    onChange={setReqWorkers} />
          <MiniStepper label="⭐" value={reqBrigadiers} onChange={setReqBrigadiers} />
          <MiniStepper label="🎓" value={reqMasters}    onChange={setReqMasters} />
          <MiniStepper label="📋" value={reqForemen}    onChange={setReqForemen} />
        </div>
        <div className="flex-1 min-w-32">
          <label className={lbl}>Примечание</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="..." className={inp} />
        </div>
      </div>

      {/* ── Vehicle type picker ── */}
      <div>
        <label className={lbl}>🚛 Спецтехника</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {vehicleReqs.map(vr => {
            const cfg = VEHICLE_TYPE_CONFIG[vr.type]
            return (
              <div key={vr.type} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-200 text-xs">
                <span>{cfg.emoji}</span>
                <span>{cfg.label}</span>
                <button onClick={() => changeVehicleCount(vr.type, -1)} className="w-4 h-4 flex items-center justify-center hover:bg-amber-500/20 rounded text-[10px] font-bold">−</button>
                <span className="font-mono font-semibold">{vr.count}</span>
                <button onClick={() => changeVehicleCount(vr.type, +1)} className="w-4 h-4 flex items-center justify-center hover:bg-amber-500/20 rounded text-[10px] font-bold">+</button>
                <button onClick={() => removeVehicleType(vr.type)} className="ml-0.5 hover:text-red-400 text-amber-400/60 text-[11px] leading-none">✕</button>
              </div>
            )
          })}
        </div>

        {/* Add vehicle button + dropdown */}
        {availableTypes.length > 0 && (
          <div className="relative inline-block">
            <button
              type="button"
              onClick={() => setShowVehicleMenu(v => !v)}
              className="text-xs px-2.5 py-1 rounded-lg border border-dashed border-amber-500/30 text-amber-400/70 hover:text-amber-300 hover:border-amber-500/50 transition-colors"
            >
              + Добавить технику
            </button>
            {showVehicleMenu && (
              <div className="absolute z-20 top-full mt-1 left-0 glass rounded-xl border border-white/10 shadow-2xl py-1 min-w-[180px]">
                {availableTypes.map(type => {
                  const cfg = VEHICLE_TYPE_CONFIG[type]
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addVehicleType(type)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/8 text-left text-sm text-white/80 hover:text-white transition-colors"
                    >
                      <span>{cfg.emoji}</span>
                      <span>{cfg.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Smart worker picker ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={lbl + ' mb-0'}>👷 Работники поимённо</label>
          <button
            type="button"
            onClick={toggleWorkerPicker}
            className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
              showWorkerPicker
                ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                : 'border-white/15 text-white/40 hover:text-white/60 hover:border-white/25'
            }`}
          >
            {showWorkerPicker ? '▲ Скрыть' : '▼ Выбрать со смены'}
          </button>
        </div>

        {/* Selected workers chips */}
        {selectedWorkers.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {selectedWorkers.map((w, i) => (
              <span
                key={i}
                onClick={() => toggleWorker(w)}
                className="flex items-center gap-1 text-[11px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 px-2 py-0.5 rounded-full cursor-pointer hover:bg-red-500/15 hover:text-red-300 hover:border-red-500/25 transition-colors"
                title="Нажмите чтобы убрать"
              >
                {w} <span className="text-[9px] opacity-60">✕</span>
              </span>
            ))}
          </div>
        )}

        {/* Worker picker panel */}
        {showWorkerPicker && (
          <div className="rounded-xl bg-white/4 border border-white/8 p-3 space-y-3 max-h-64 overflow-y-auto">
            {pickerLoading && (
              <div className="text-xs text-white/30 text-center py-2">Загрузка сотрудников...</div>
            )}
            {!pickerLoading && pickerWorkers.length === 0 && (
              <div className="text-xs text-white/25 text-center py-2 italic">
                Нет сотрудников на смене сегодня
              </div>
            )}
            {!pickerLoading && ROLE_GROUPS.map(group => {
              const groupWorkers = pickerWorkers.filter(u => group.levels.includes(u.role_level))
              if (groupWorkers.length === 0) return null
              return (
                <div key={group.key}>
                  <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5 font-medium">
                    {group.label} · {groupWorkers.length}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {groupWorkers.map(u => {
                      const selected = selectedWorkers.includes(u.full_name)
                      return (
                        <button
                          key={u.user_id}
                          type="button"
                          onClick={() => toggleWorker(u.full_name)}
                          className={`text-left flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                            selected
                              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                              : 'bg-white/4 border border-transparent hover:bg-white/8 text-white/70 hover:text-white'
                          }`}
                        >
                          <span className={`w-3 h-3 rounded-sm border flex-shrink-0 flex items-center justify-center text-[9px] ${
                            selected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-white/20'
                          }`}>
                            {selected ? '✓' : ''}
                          </span>
                          <span className="truncate">{u.full_name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!location.trim() || !workDesc.trim()}
          className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium transition-colors"
        >
          Сохранить
        </button>
        <button onClick={onCancel} className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm transition-colors">
          Отмена
        </button>
      </div>
    </div>
  )
}

function TotalRow({ icon, label, count }: { icon: string; label: string; count: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-white/50">{icon} {label}</span>
      <span className="text-sm font-semibold text-white">{count}</span>
    </div>
  )
}

function MiniStepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[11px]">{label}</span>
      <div className="flex items-center gap-0.5">
        <button onClick={() => onChange(Math.max(0, value - 1))} className="w-5 h-5 rounded bg-white/8 border border-white/10 text-white/50 hover:text-white hover:bg-white/15 text-xs font-bold flex items-center justify-center transition-colors">−</button>
        <span className="w-6 text-center text-sm text-white font-semibold">{value}</span>
        <button onClick={() => onChange(Math.min(50, value + 1))} className="w-5 h-5 rounded bg-white/8 border border-white/10 text-white/50 hover:text-white hover:bg-white/15 text-xs font-bold flex items-center justify-center transition-colors">+</button>
      </div>
    </div>
  )
}
