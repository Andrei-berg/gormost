'use client'
import { useState } from 'react'
import type { WorkPlanWithItems, WorkPlanItem, AuthSession, Service } from '@/types'
import { WORK_PLAN_STATUS_CONFIG, SERVICE_META } from '@/types'
import {
  approveWorkPlan, rejectWorkPlan,
  createWorkPlanItem, updateWorkPlanItem, deleteWorkPlanItem,
} from '@/lib/api'
import SharedPlanItemForm, { type PlanItemFormData } from '@/components/shared/PlanItemForm'

interface Props {
  plan: WorkPlanWithItems
  session: AuthSession
  services: Service[]
  onRefresh: () => void
}

export default function ChiefPlanCard({ plan, session, services, onRefresh }: Props) {
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectNotes, setRejectNotes] = useState('')
  const [showAddItem, setShowAddItem] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const service = services.find(s => s.service_id === plan.service_id)
  const meta = SERVICE_META[plan.service_id] ?? { emoji: '🔧', color: '#94a3b8', bg: 'bg-slate-500/20' }
  const statusCfg = WORK_PLAN_STATUS_CONFIG[plan.status]
  const shiftLabel = plan.shift_type === 'DAY' ? '☀️ День · 07:30–19:00' : '🌙 Ночь · 21:00–07:00'
  const canEdit = plan.status === 'SUBMITTED'

  const handleApprove = async () => {
    setSaving(true)
    await approveWorkPlan(plan.id, session.user_id)
    setSaving(false)
    onRefresh()
  }

  const handleReject = async () => {
    if (!rejectNotes.trim()) return
    setSaving(true)
    await rejectWorkPlan(plan.id, session.user_id, rejectNotes.trim())
    setSaving(false)
    setShowRejectForm(false)
    setRejectNotes('')
    onRefresh()
  }

  const handleDeleteItem = async (itemId: string) => {
    await deleteWorkPlanItem(itemId)
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

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-xl">{meta.emoji}</span>
          <div>
            <div className="text-sm font-semibold text-white">
              {service?.service_name ?? plan.service_id}
            </div>
            <div className="text-xs text-white/50">{shiftLabel}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {plan.status === 'APPROVED' && (
            <span className="text-[10px] text-white/40">✓ Гл. инженер согл. · ⏳ Зам/Прораб ожидает</span>
          )}
          {plan.status === 'PLANNED' && (
            <span className="text-[10px] text-white/40">✓ Гл. инженер · ✓ Зам/Прораб</span>
          )}
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full border ${statusCfg.bg}`}
            style={{ color: statusCfg.color }}
          >
            {statusCfg.label}
          </span>
          {plan.status === 'SUBMITTED' && (
            <>
              <button
                onClick={handleApprove}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg bg-green-600/80 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-medium"
              >
                ✓ Согласовать
              </button>
              <button
                onClick={() => { setShowRejectForm(!showRejectForm); setRejectNotes('') }}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg bg-yellow-600/20 hover:bg-yellow-600/40 disabled:opacity-40 text-yellow-400 text-sm"
              >
                Вернуть на доработку
              </button>
            </>
          )}
        </div>
      </div>

      {/* Reject form */}
      {showRejectForm && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 space-y-2">
          <div className="text-xs text-yellow-400/70 uppercase tracking-wider">Что нужно исправить</div>
          <textarea
            value={rejectNotes}
            onChange={e => setRejectNotes(e.target.value)}
            rows={2}
            placeholder="Укажите что нужно исправить..."
            className="w-full px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-yellow-500/50 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={!rejectNotes.trim() || saving}
              className="px-4 py-1.5 rounded-lg bg-yellow-600/80 hover:bg-yellow-500 disabled:opacity-40 text-white text-sm font-medium"
            >
              Вернуть на доработку
            </button>
            <button
              onClick={() => setShowRejectForm(false)}
              className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Chief notes (approved/rejected) */}
      {plan.chief_notes && plan.status !== 'SUBMITTED' && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Ваш комментарий</div>
          <div className="text-sm text-white/60">{plan.chief_notes}</div>
        </div>
      )}

      {/* Items */}
      <div className="p-4 space-y-2">
        {plan.items.length === 0 && (
          <div className="text-center text-white/30 text-sm py-4">Нет позиций</div>
        )}

        {plan.items.map(item =>
          editingItemId === item.id ? (
            <SharedPlanItemForm
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
            <SharedPlanItemForm
              serviceId={plan.service_id}
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
    </div>
  )
}

function ItemRow({ item, canEdit, onEdit, onDelete }: {
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
        {item.workers.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.workers.map((w, i) => (
              <span key={i} className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full">{w}</span>
            ))}
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

