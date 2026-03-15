'use client'
import { useState } from 'react'
import type { WorkPlanWithItems, WorkPlanItem, Service, AuthSession } from '@/types'
import { SERVICE_META, WORK_PLAN_STATUS_CONFIG } from '@/types'
import {
  createWorkPlanItem, updateWorkPlanItem, deleteWorkPlanItem,
  confirmWorkPlanZamporab, returnWorkPlanZamporab, approveWorkPlanDirect,
} from '@/lib/api'

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
  const [showReturnForm, setShowReturnForm] = useState(false)
  const [returnNotes, setReturnNotes] = useState('')
  const [returning, setReturning] = useState(false)

  const svc = services.find(s => s.service_id === plan.service_id)
  const meta = SERVICE_META[plan.service_id] ?? { emoji: '🔧' }
  const shiftLabel = plan.shift_type === 'DAY' ? '☀️ День · 07:30–19:00' : '🌙 Ночь · 21:00–07:00'
  const statusCfg = WORK_PLAN_STATUS_CONFIG[plan.status]

  // Headcount totals across all items
  const totalWorkers = plan.items.reduce((s, i) => s + (i.required_workers ?? 0), 0)
  const totalForemen = plan.items.reduce((s, i) => s + (i.required_foremen ?? 0), 0)
  const totalVehicles = plan.items.reduce((s, i) => s + (i.required_vehicles ?? 0), 0)

  const isOwnService = plan.service_id === ZAMPORAB_OWN_SERVICE
  const isDirect = isOwnService && plan.status === 'SUBMITTED'

  const handleConfirm = async () => {
    setConfirming(true)
    if (isDirect) {
      await approveWorkPlanDirect(plan.id, session.user_id)
    } else {
      await confirmWorkPlanZamporab(plan.id, session.user_id)
    }
    onRefresh()
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
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusCfg.bg}`} style={{ color: statusCfg.color }}>
            {statusCfg.label}
          </span>
          <span className="text-white/20 text-xs ml-1">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Action buttons bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
        <button
          onClick={handleConfirm}
          disabled={confirming}
          className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold transition-all"
        >
          {confirming ? 'Подтверждаю...' : '✓ Подтвердить план'}
        </button>
        <button
          onClick={() => { setShowReturnForm(f => !f); setReturnNotes('') }}
          className="px-4 py-2.5 rounded-xl bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 text-sm font-medium transition-all"
        >
          Вернуть на доработку
        </button>
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
                onSave={(data) => handleUpdateItem(item.id, data)}
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
  item: WorkPlanItem
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
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 text-xs">✏️</button>
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 text-xs">🗑️</button>
      </div>
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
  const [reqWorkers, setReqWorkers] = useState(String(initial?.required_workers ?? 0))
  const [reqForemen, setReqForemen] = useState(String(initial?.required_foremen ?? 0))
  const [reqVehicles, setReqVehicles] = useState(String(initial?.required_vehicles ?? 0))

  const handleSave = () => {
    if (!location.trim() || !workDesc.trim()) return
    onSave({
      location: location.trim(),
      work_description: workDesc.trim(),
      workers: workersText.split('\n').map(w => w.trim()).filter(Boolean),
      time_start: timeStart || null,
      time_end: timeEnd || null,
      notes: notes.trim() || null,
      required_workers: Number(reqWorkers) || 0,
      required_foremen: Number(reqForemen) || 0,
      required_vehicles: Number(reqVehicles) || 0,
      is_redirected: initial?.is_redirected ?? false,
      redirect_reason: initial?.redirect_reason ?? null,
    })
  }

  const inputCls = 'w-full px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/50'
  const labelCls = 'block text-[10px] text-white/40 uppercase tracking-wider mb-1'
  const numCls = 'w-full px-2 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white text-sm text-center focus:outline-none focus:border-blue-500/50'

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
      {/* Headcount planning */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className={labelCls}>👷 Рабочих</label>
          <input type="number" min="0" value={reqWorkers} onChange={e => setReqWorkers(e.target.value)} className={numCls} />
        </div>
        <div>
          <label className={labelCls}>🦺 Мастеров</label>
          <input type="number" min="0" value={reqForemen} onChange={e => setReqForemen(e.target.value)} className={numCls} />
        </div>
        <div>
          <label className={labelCls}>🚛 ТС</label>
          <input type="number" min="0" value={reqVehicles} onChange={e => setReqVehicles(e.target.value)} className={numCls} />
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
