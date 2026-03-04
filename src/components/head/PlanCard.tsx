'use client'
import { useState } from 'react'
import type { WorkPlanWithItems, WorkPlanItem, AuthSession } from '@/types'
import { WORK_PLAN_STATUS_CONFIG } from '@/types'
import {
  createWorkPlanItem, updateWorkPlanItem, deleteWorkPlanItem,
  submitWorkPlan, deleteWorkPlan,
} from '@/lib/api'

interface Props {
  plan: WorkPlanWithItems
  session: AuthSession
  onRefresh: () => void
}

export default function PlanCard({ plan, session, onRefresh }: Props) {
  const [showAddItem, setShowAddItem] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  const canEdit = plan.status === 'DRAFT' || plan.status === 'REJECTED'
  const canSubmit = canEdit && plan.items.length > 0
  const statusCfg = WORK_PLAN_STATUS_CONFIG[plan.status]
  const shiftLabel = plan.shift_type === 'DAY' ? 'День · 07:30–19:00' : 'Ночь · 21:00–07:00'
  const shiftEmoji = plan.shift_type === 'DAY' ? '☀️' : '🌙'

  const handleSubmit = async () => {
    await submitWorkPlan(plan.id, session.user_id)
    onRefresh()
  }

  const handleDelete = async () => {
    if (!confirm('Удалить план?')) return
    await deleteWorkPlan(plan.id, session.user_id)
    onRefresh()
  }

  const handleDeleteItem = async (itemId: string) => {
    await deleteWorkPlanItem(itemId)
    onRefresh()
  }

  const handleSaveItem = async (data: Omit<WorkPlanItem, 'id' | 'plan_id' | 'created_at' | 'updated_at' | 'sort_order'>) => {
    await createWorkPlanItem({ plan_id: plan.id, sort_order: plan.items.length, ...data })
    setShowAddItem(false)
    onRefresh()
  }

  const handleUpdateItem = async (itemId: string, data: Omit<WorkPlanItem, 'id' | 'plan_id' | 'created_at' | 'updated_at' | 'sort_order'>) => {
    await updateWorkPlanItem(itemId, data)
    setEditingItemId(null)
    onRefresh()
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Plan header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-lg">{shiftEmoji}</span>
          <div>
            <div className="text-sm font-medium text-white">{shiftLabel}</div>
            <span
              className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border mt-0.5 ${statusCfg.bg}`}
              style={{ color: statusCfg.color }}
            >
              {statusCfg.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canSubmit && (
            <button
              onClick={handleSubmit}
              className="px-3 py-1.5 rounded-lg bg-green-600/80 hover:bg-green-500 text-white text-sm font-medium"
            >
              {plan.status === 'REJECTED' ? 'Отправить повторно' : 'На согласование'}
            </button>
          )}
          {plan.status === 'DRAFT' && (
            <button
              onClick={handleDelete}
              className="px-2 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm"
            >
              Удалить
            </button>
          )}
        </div>
      </div>

      {/* Chief notes if rejected */}
      {plan.status === 'REJECTED' && plan.chief_notes && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="text-[10px] text-red-400/70 uppercase tracking-wider mb-1">Комментарий гл. инженера</div>
          <div className="text-sm text-red-300">{plan.chief_notes}</div>
        </div>
      )}

      {/* Items list */}
      <div className="p-4 space-y-2">
        {plan.items.length === 0 && (
          <div className="text-center text-white/30 text-sm py-4">
            Нет позиций — добавьте работы ниже
          </div>
        )}

        {plan.items.map(item =>
          editingItemId === item.id ? (
            <PlanItemForm
              key={item.id}
              initial={item}
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

type ItemFormData = Omit<WorkPlanItem, 'id' | 'plan_id' | 'created_at' | 'updated_at' | 'sort_order'>

function PlanItemForm({ initial, onSave, onCancel }: {
  initial?: WorkPlanItem
  onSave: (data: ItemFormData) => void
  onCancel: () => void
}) {
  const [location, setLocation] = useState(initial?.location || '')
  const [workDesc, setWorkDesc] = useState(initial?.work_description || '')
  const [workersText, setWorkersText] = useState(initial?.workers.join('\n') || '')
  const [timeStart, setTimeStart] = useState(initial?.time_start || '')
  const [timeEnd, setTimeEnd] = useState(initial?.time_end || '')
  const [notes, setNotes] = useState(initial?.notes || '')

  const handleSave = () => {
    if (!location.trim() || !workDesc.trim()) return
    onSave({
      location: location.trim(),
      work_description: workDesc.trim(),
      workers: workersText.split('\n').map(w => w.trim()).filter(Boolean),
      time_start: timeStart || null,
      time_end: timeEnd || null,
      notes: notes.trim() || null,
    })
  }

  const inputCls = 'w-full px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/50'
  const labelCls = 'block text-[10px] text-white/40 uppercase tracking-wider mb-1'

  return (
    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>Место / Объект *</label>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Тоннель №3, портал..." className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Вид работ *</label>
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
      <div>
        <label className={labelCls}>Работники (каждый с новой строки)</label>
        <textarea
          value={workersText}
          onChange={e => setWorkersText(e.target.value)}
          rows={3}
          placeholder={'Иванов И.И.\nПетров П.П.'}
          className={`${inputCls} resize-none`}
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={!location.trim() || !workDesc.trim()}
          className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium"
        >
          Сохранить
        </button>
        <button onClick={onCancel} className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm">
          Отмена
        </button>
      </div>
    </div>
  )
}
