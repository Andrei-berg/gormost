'use client'
import { useState, useEffect, useCallback } from 'react'
import type { WorkPlanWithItems, WorkPlanItem, AuthSession, Service } from '@/types'
import { shiftLabel as fmtShiftLabel } from '@/lib/workSchedule'
import { WORK_PLAN_STATUS_CONFIG, SERVICE_META } from '@/types'
import { WorkerIcon, MasterIcon } from '@/components/RoleIcons'
import SharedPlanItemForm, { type PlanItemFormData } from '@/components/shared/PlanItemForm'
import WorkPermitModal from '@/components/head/WorkPermitModal'
import {
  fetchWorkPlans, fetchWorkPlansWithItems,
  createWorkPlan, submitWorkPlan,
  createWorkPlanItem, updateWorkPlanItem, deleteWorkPlanItem,
} from '@/lib/api-client'

interface Props {
  session: AuthSession
  services: Service[]
  refreshAt?: number
}

export default function ZamporabOwnPlan({ session, services, refreshAt }: Props) {
  const [plans, setPlans] = useState<WorkPlanWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0])
  const [newShift, setNewShift] = useState<'DAY' | 'NIGHT'>('DAY')

  const serviceId = session.service_id
  const svc = services.find(s => s.service_id === serviceId)
  const meta = serviceId ? SERVICE_META[serviceId] ?? { emoji: '🔧' } : { emoji: '🔧' }

  const load = useCallback(async () => {
    if (!serviceId) { setLoading(false); return }
    setLoading(true)
    const raw = await fetchWorkPlans({
      serviceId,
      statuses: ['DRAFT', 'REJECTED', 'SUBMITTED'],
    })
    const withItems = await fetchWorkPlansWithItems(raw.map(p => p.id))
    setPlans(withItems)
    setLoading(false)
  }, [serviceId])

  useEffect(() => { load() }, [load, refreshAt])

  const handleCreate = async () => {
    if (!serviceId) return
    setCreating(true)
    const plan = await createWorkPlan(
      { service_id: serviceId, plan_date: newDate, shift_type: newShift },
      session.user_id
    )
    setCreating(false)
    if (plan) {
      setShowCreateForm(false)
      load()
    }
  }

  if (!serviceId) {
    return (
      <div className="glass rounded-xl p-6 border border-white/10 text-center text-white/30 text-sm">
        У вас не задана служба — обратитесь к администратору
      </div>
    )
  }

  if (loading) {
    return <div className="text-white/30 text-sm py-4">Загрузка...</div>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{meta.emoji}</span>
          <div>
            <div className="text-sm font-semibold text-white">{svc?.service_name ?? serviceId}</div>
            <div className="text-xs text-white/40">Мои планы (Черновик / На согласовании)</div>
          </div>
        </div>
        <button
          onClick={() => setShowCreateForm(f => !f)}
          className="px-4 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/30 text-emerald-400 text-sm font-medium transition-all"
        >
          + Создать план
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
          <div className="text-xs text-emerald-400/70 uppercase tracking-wider">Новый план работ</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1">Дата</label>
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="form-select w-full text-sm px-2.5 py-1.5"
              />
            </div>
            <div>
              <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1">Смена</label>
              <select
                value={newShift}
                onChange={e => setNewShift(e.target.value as 'DAY' | 'NIGHT')}
                className="form-select w-full text-sm px-2.5 py-1.5"
              >
                <option value="DAY">{fmtShiftLabel('DAY')}</option>
                <option value="NIGHT">{fmtShiftLabel('NIGHT')}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-medium"
            >
              {creating ? 'Создаю...' : 'Создать'}
            </button>
            <button onClick={() => setShowCreateForm(false)} className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm">
              Отмена
            </button>
          </div>
        </div>
      )}

      {plans.length === 0 && !showCreateForm && (
        <div className="glass rounded-xl p-6 border border-white/10 text-center">
          <div className="text-white/30 text-sm mb-3">Нет активных планов</div>
          <div className="text-xs text-white/20">Создайте план работ для своей службы</div>
        </div>
      )}

      {plans.map(plan => (
        <OwnPlanCard
          key={plan.id}
          plan={plan}
          session={session}
          onRefresh={load}
        />
      ))}
    </div>
  )
}

// ---- Individual own plan card ----

function OwnPlanCard({ plan, session, onRefresh }: {
  plan: WorkPlanWithItems
  session: AuthSession
  onRefresh: () => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [showAddItem, setShowAddItem] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPermit, setShowPermit] = useState(false)

  const statusCfg = WORK_PLAN_STATUS_CONFIG[plan.status]
  const shiftLabel = plan.shift_type === 'DAY' ? '☀️ День' : '🌙 Ночь'
  const isEditable = plan.status === 'DRAFT' || plan.status === 'REJECTED'

  const totalWorkers = plan.items.reduce((s, i) => s + (i.required_workers ?? 0), 0)
  const totalForemen = plan.items.reduce((s, i) => s + (i.required_foremen ?? 0), 0)
  const totalVehicles = plan.items.reduce((s, i) => s + (i.required_vehicles ?? 0), 0)

  const handleSubmit = async () => {
    setSubmitting(true)
    await submitWorkPlan(plan.id, session.user_id)
    setSubmitting(false)
    onRefresh()
  }

  const handleSaveItem = async (data: PlanItemFormData) => {
    await createWorkPlanItem({ plan_id: plan.id, sort_order: plan.items.length, ...data })
    setShowAddItem(false)
    onRefresh()
  }

  const handleUpdateItem = async (itemId: string, data: PlanItemFormData) => {
    await updateWorkPlanItem(itemId, data)
    setEditingItemId(null)
    onRefresh()
  }

  const handleDeleteItem = async (itemId: string) => {
    await deleteWorkPlanItem(itemId)
    onRefresh()
  }

  return (
    <div className={`glass rounded-xl overflow-hidden border ${
      plan.status === 'REJECTED' ? 'border-red-500/30' :
      plan.status === 'SUBMITTED' ? 'border-orange-500/30' :
      'border-emerald-500/20'
    }`}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b border-white/10 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div>
            <div className="text-sm font-semibold text-white">{shiftLabel} · {plan.plan_date}</div>
            <div className="text-xs text-white/40">{plan.items.length} позиций</div>
          </div>
          {(totalWorkers > 0 || totalForemen > 0 || totalVehicles > 0) && (
            <div className="flex gap-2 ml-1">
              {totalWorkers > 0 && (
                <span className="text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/20 px-1.5 py-0.5 rounded-full">
                  <WorkerIcon className="w-3 h-3" /> {totalWorkers} раб.
                </span>
              )}
              {totalForemen > 0 && (
                <span className="text-[10px] bg-violet-500/15 text-violet-300 border border-violet-500/20 px-1.5 py-0.5 rounded-full">
                  <MasterIcon className="w-3 h-3" /> {totalForemen} маст.
                </span>
              )}
              {totalVehicles > 0 && (
                <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                  🚛 {totalVehicles} ТС
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {plan.chief_notes && plan.status === 'REJECTED' && (
            <span className="text-xs text-red-400/80 max-w-xs truncate">⚠ {plan.chief_notes}</span>
          )}
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusCfg.bg}`} style={{ color: statusCfg.color }}>
            {statusCfg.label}
          </span>
          {isEditable && (
            <button
              onClick={handleSubmit}
              disabled={submitting || plan.items.length === 0}
              className="px-3 py-1.5 rounded-lg bg-orange-600/80 hover:bg-orange-500 disabled:opacity-40 text-white text-sm font-medium transition-all"
              title={plan.items.length === 0 ? 'Добавьте хотя бы одну позицию' : ''}
            >
              {submitting ? 'Отправляю...' : '→ На согласование'}
            </button>
          )}
          {plan.status === 'SUBMITTED' && (
            <span className="text-xs text-orange-400/70">
              {plan.service_id === 'SRV-STR' ? '⏳ Ожидает вашего подтверждения' : '⏳ Ожидает гл. инженера'}
            </span>
          )}
          <button
            onClick={e => { e.stopPropagation(); setShowPermit(true) }}
            className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/25 text-blue-300 text-[11px] transition-all"
          >
            🖨 Наряд-допуск
          </button>
          <span className="text-white/20 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Items */}
      {expanded && (
        <div className="p-4 space-y-2">
          {plan.items.length === 0 && (
            <div className="text-center text-white/30 text-sm py-3">
              Нет позиций — добавьте работы
            </div>
          )}

          {plan.items.map(item =>
            editingItemId === item.id ? (
              <SharedPlanItemForm
                key={item.id}
                initial={item}
                serviceId={plan.service_id}
                planDate={plan.plan_date}
                onSave={(data) => handleUpdateItem(item.id, data)}
                onCancel={() => setEditingItemId(null)}
              />
            ) : (
              <OwnItemRow
                key={item.id}
                item={item}
                canEdit={isEditable}
                onEdit={() => setEditingItemId(item.id)}
                onDelete={() => handleDeleteItem(item.id)}
              />
            )
          )}

          {isEditable && (
            showAddItem ? (
              <SharedPlanItemForm
                serviceId={plan.service_id}
                planDate={plan.plan_date}
                onSave={handleSaveItem}
                onCancel={() => setShowAddItem(false)}
              />
            ) : (
              <button
                onClick={() => setShowAddItem(true)}
                className="w-full py-2 rounded-lg border border-dashed border-white/20 text-white/40 hover:text-white/60 hover:border-white/30 text-sm transition-colors"
              >
                + Добавить позицию
              </button>
            )
          )}
        </div>
      )}

      {showPermit && (
        <WorkPermitModal plan={plan} session={session} onClose={() => setShowPermit(false)} />
      )}
    </div>
  )
}

function OwnItemRow({ item, canEdit, onEdit, onDelete }: {
  item: WorkPlanItem
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {item.time_start && (
            <span className="text-xs font-mono text-cyan-400 shrink-0">
              {item.time_start}{item.time_end ? `–${item.time_end}` : ''}
            </span>
          )}
          <span className="text-sm font-medium text-white truncate">{item.location}</span>
        </div>
        <div className="text-sm text-white/60">{item.work_description}</div>
        {(item.required_workers > 0 || item.required_foremen > 0 || item.required_vehicles > 0) && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.required_workers > 0 && (
              <span className="text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/20 px-1.5 py-0.5 rounded-full">
                <WorkerIcon className="w-3 h-3" /> {item.required_workers} рабочих
              </span>
            )}
            {item.required_foremen > 0 && (
              <span className="text-[10px] bg-violet-500/15 text-violet-300 border border-violet-500/20 px-1.5 py-0.5 rounded-full">
                <MasterIcon className="w-3 h-3" /> {item.required_foremen} мастеров
              </span>
            )}
            {item.required_vehicles > 0 && (
              <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                🚛 {item.required_vehicles} ТС
              </span>
            )}
          </div>
        )}
        {item.notes && <div className="text-xs text-white/30 mt-1">{item.notes}</div>}
      </div>
      {canEdit && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 text-xs">✏️</button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 text-xs">🗑️</button>
        </div>
      )}
    </div>
  )
}

