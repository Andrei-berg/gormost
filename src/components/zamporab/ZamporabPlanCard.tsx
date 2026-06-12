'use client'
import { useState } from 'react'
import type { WorkPlanWithItems, WorkPlanItemWithVehicles, CrossServiceDraft, Service, AuthSession } from '@/types'
import { SERVICE_META, CROSS_SERVICE_STATUS_CONFIG } from '@/types'
import StatusPlanBadge from '@/components/help/StatusPlanBadge'
import PlanItemForm, { PlanItemFormData } from '@/components/shared/PlanItemForm'
import {
  createWorkPlanItem, updateWorkPlanItem, deleteWorkPlanItem,
  confirmWorkPlanZamporab, returnWorkPlanZamporab, approveWorkPlanDirect,
  createCrossServiceRequest,
} from '@/lib/api-client'

const SERVICE_NAMES: Record<string, string> = {
  'SRV-ENG':  'Инженерные системы',
  'SRV-STR':  'Строительная служба',
  'SRV-FIRE': 'Пожарная безопасность',
  'SRV-VENT': 'Вентиляция',
  'SRV-CCTV': 'Видеонаблюдение',
}

// SRV-STR (СЭИС) is managed by Zamporab — skips chief engineer
const ZAMPORAB_OWN_SERVICE = 'SRV-STR'

interface Props {
  plan: WorkPlanWithItems
  services: Service[]
  session: AuthSession
  onRefresh: () => void
}

export default function ZamporabPlanCard({ plan, services, session, onRefresh }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [showAddItem, setShowAddItem] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [showReturnForm, setShowReturnForm] = useState(false)
  const [returnNotes, setReturnNotes] = useState('')
  const [returning, setReturning] = useState(false)

  const svc = services.find(s => s.service_id === plan.service_id)
  const meta = SERVICE_META[plan.service_id] ?? { emoji: '🔧' }
  const shiftLabel = plan.shift_type === 'DAY' ? '☀️ День · 07:30–19:00' : '🌙 Ночь · 21:00–07:00'

  // Headcount totals across all items
  const totalWorkers = plan.items.reduce((s, i) => s + (i.required_workers ?? 0), 0)
  const totalForemen = plan.items.reduce((s, i) => s + (i.required_foremen ?? 0), 0)
  const totalVehicles = plan.items.reduce((s, i) => s + (i.required_vehicles ?? 0), 0)

  const isOwnService = plan.service_id === ZAMPORAB_OWN_SERVICE
  const isDirect = isOwnService && plan.status === 'SUBMITTED'

  const handleConfirm = async () => {
    setConfirming(true)
    setConfirmError(null)
    const ok = isDirect
      ? await approveWorkPlanDirect(plan.id, session.user_id)
      : await confirmWorkPlanZamporab(plan.id, session.user_id)
    if (ok) {
      onRefresh()
    } else {
      setConfirmError('Ошибка при подтверждении. Попробуйте ещё раз.')
      setConfirming(false)
    }
  }

  const handleReturn = async () => {
    if (!returnNotes.trim()) return
    setReturning(true)
    await returnWorkPlanZamporab(plan.id, session.user_id, returnNotes.trim())
    setReturning(false)
    setShowReturnForm(false)
    setReturnNotes('')
    onRefresh()
  }

  const handleDeleteItem = async (itemId: string) => {
    await deleteWorkPlanItem(itemId)
    onRefresh()
  }

  const handleSaveItem = async (data: PlanItemFormData, crossDraft: CrossServiceDraft | null) => {
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
    onRefresh()
  }

  const handleUpdateItem = async (itemId: string, data: PlanItemFormData, crossDraft: CrossServiceDraft | null) => {
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
    onRefresh()
  }

  return (
    <div className="glass rounded-xl overflow-hidden border border-blue-500/20">
      {/* Header — clickable to collapse/expand */}
      <div
        className="flex items-center justify-between p-4 border-b border-white/10 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{meta.emoji}</span>
          <div>
            <div className="text-sm font-semibold text-white">{svc?.service_name ?? plan.service_id}</div>
            <div className="text-xs text-white/40">{shiftLabel} · {plan.plan_date}</div>
          </div>
          {/* Headcount summary */}
          {(totalWorkers > 0 || totalForemen > 0 || totalVehicles > 0) && (
            <div className="flex gap-2 ml-2">
              {totalWorkers > 0 && (
                <span className="text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/20 px-1.5 py-0.5 rounded-full">
                  👷 {totalWorkers} раб.
                </span>
              )}
              {totalForemen > 0 && (
                <span className="text-[10px] bg-violet-500/15 text-violet-300 border border-violet-500/20 px-1.5 py-0.5 rounded-full">
                  🦺 {totalForemen} маст.
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
          {!isDirect && <span className="text-[10px] text-green-400">✓ Гл. инженер согласовал</span>}
          <StatusPlanBadge status={plan.status} size="xs" />
          <span className="text-white/20 text-xs ml-1">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Action buttons bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-white/[0.02] flex-wrap">
        <button
          onClick={handleConfirm}
          disabled={confirming}
          className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition-all"
        >
          {confirming ? '...' : '✓ Подтвердить'}
        </button>
        {confirmError && (
          <span className="text-xs text-red-400">{confirmError}</span>
        )}
        {!isDirect && (
          <button
            onClick={() => { setShowReturnForm(f => !f); setReturnNotes('') }}
            className="px-3 py-1.5 rounded-lg bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 text-sm transition-all"
          >
            Вернуть на доработку
          </button>
        )}
      </div>

      {/* Return form */}
      {showReturnForm && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 space-y-2">
          <div className="text-xs text-yellow-400/70 uppercase tracking-wider">Что нужно исправить</div>
          <textarea
            value={returnNotes}
            onChange={e => setReturnNotes(e.target.value)}
            rows={2}
            placeholder="Укажите замечания для начальника службы..."
            className="w-full px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-yellow-500/50 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleReturn}
              disabled={!returnNotes.trim() || returning}
              className="px-4 py-1.5 rounded-lg bg-yellow-600/80 hover:bg-yellow-500 disabled:opacity-40 text-white text-sm font-medium"
            >
              Вернуть на доработку
            </button>
            <button
              onClick={() => setShowReturnForm(false)}
              className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Items — collapsible */}
      {expanded && (
        <div className="p-4 space-y-2">
          {plan.items.length === 0 && (
            <div className="text-center text-white/30 text-sm py-3">Нет позиций в плане</div>
          )}

          {plan.items.map(item =>
            editingItemId === item.id ? (
              <PlanItemForm
                key={item.id}
                initial={item}
                serviceId={plan.service_id}
                planDate={plan.plan_date}
                existingCrossRequest={item.cross_requests?.[0] ?? null}
                withCrossService
                onSave={(data, crossDraft) => handleUpdateItem(item.id, data, crossDraft)}
                onCancel={() => setEditingItemId(null)}
              />
            ) : (
              <ItemRow
                key={item.id}
                item={item}
                onEdit={() => setEditingItemId(item.id)}
                onDelete={() => handleDeleteItem(item.id)}
              />
            )
          )}

          {showAddItem ? (
            <PlanItemForm
              serviceId={plan.service_id}
              planDate={plan.plan_date}
              withCrossService
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
          )}
        </div>
      )}
    </div>
  )
}

function ItemRow({ item, onEdit, onDelete }: {
  item: WorkPlanItemWithVehicles
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

        {/* Required headcount badges */}
        {(item.required_workers > 0 || item.required_foremen > 0 || item.required_vehicles > 0) && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.required_workers > 0 && (
              <span className="text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/20 px-1.5 py-0.5 rounded-full">
                👷 {item.required_workers} рабочих
              </span>
            )}
            {item.required_foremen > 0 && (
              <span className="text-[10px] bg-violet-500/15 text-violet-300 border border-violet-500/20 px-1.5 py-0.5 rounded-full">
                🦺 {item.required_foremen} мастеров
              </span>
            )}
            {item.required_vehicles > 0 && (
              <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                🚛 {item.required_vehicles} ТС
              </span>
            )}
          </div>
        )}

        {item.workers.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.workers.map((w, i) => (
              <span key={i} className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full">{w}</span>
            ))}
          </div>
        )}
        {item.notes && <div className="text-xs text-white/30 mt-1">{item.notes}</div>}

        {/* Cross-service request badges */}
        {item.cross_requests?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.cross_requests.map(r => {
              const cfg = CROSS_SERVICE_STATUS_CONFIG[r.status]
              return (
                <span key={r.id} className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${cfg.bg}`} style={{ color: cfg.color }}>
                  🔗 {SERVICE_META[r.to_service_id]?.emoji ?? ''} {SERVICE_NAMES[r.to_service_id] ?? r.to_service_id} · {r.needed_count} чел. · {cfg.label}
                </span>
              )
            })}
          </div>
        )}
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 text-xs">✏️</button>
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 text-xs">🗑️</button>
      </div>
    </div>
  )
}

