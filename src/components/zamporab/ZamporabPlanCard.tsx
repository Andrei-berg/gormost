'use client'
import { useState } from 'react'
import type { WorkPlanWithItems, WorkPlanItem, WorkPlanItemWithVehicles, CrossServiceRequest, Service, AuthSession } from '@/types'
import { SERVICE_META, WORK_PLAN_STATUS_CONFIG, CROSS_SERVICE_STATUS_CONFIG } from '@/types'
import {
  createWorkPlanItem, updateWorkPlanItem, deleteWorkPlanItem,
  confirmWorkPlanZamporab, returnWorkPlanZamporab, approveWorkPlanDirect,
  createCrossServiceRequest,
} from '@/lib/api'

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
    onRefresh()
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
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-white/[0.02]">
        <button
          onClick={handleConfirm}
          disabled={confirming}
          className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition-all"
        >
          {confirming ? '...' : '✓ Подтвердить'}
        </button>
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
                planServiceId={plan.service_id}
                existingCrossRequest={item.cross_requests?.[0] ?? null}
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
              planServiceId={plan.service_id}
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

type ItemFormData = Omit<WorkPlanItem, 'id' | 'plan_id' | 'created_at' | 'updated_at' | 'sort_order'>

function PlanItemForm({ initial, planServiceId, existingCrossRequest, onSave, onCancel }: {
  initial?: WorkPlanItem
  planServiceId: string
  existingCrossRequest?: CrossServiceRequest | null
  onSave: (data: ItemFormData, crossDraft: CrossServiceDraft | null) => void
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
      required_workers: Number(reqWorkers) || 0,
      required_brigadiers: 0,
      required_masters: 0,
      required_foremen: Number(reqForemen) || 0,
      required_vehicles: Number(reqVehicles) || 0,
      is_redirected: initial?.is_redirected ?? false,
      redirect_reason: initial?.redirect_reason ?? null,
    }, crossDraft)
  }

  const toggleCross = () => {
    if (crossDraft) {
      setShowCross(v => !v)
    } else {
      const draft = initCross()
      setCrossDraft(draft)
      setShowCross(true)
    }
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

      {/* Cross-service toggle */}
      <div>
        <button
          type="button"
          onClick={toggleCross}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
            crossDraft
              ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
              : 'bg-violet-500/8 border-violet-500/20 text-violet-400/70 hover:text-violet-300 hover:bg-violet-500/15 hover:border-violet-500/35'
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

      {/* Cross-service expanded form */}
      {crossDraft && showCross && (
        <div className="rounded-lg bg-violet-500/5 border border-violet-500/20 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-violet-300 uppercase tracking-wider">🔗 Запрос смежной службе</span>
            <button
              type="button"
              onClick={() => { setCrossDraft(null); setShowCross(false) }}
              className="text-white/25 hover:text-red-400 text-xs transition-colors px-1"
            >
              ✕ убрать
            </button>
          </div>
          <div>
            <div className="text-[10px] text-white/35 mb-1.5">Кому направляем запрос</div>
            <div className="flex flex-wrap gap-1.5">
              {otherServices.map(sid => (
                <button
                  key={sid}
                  type="button"
                  onClick={() => setCrossDraft(d => d ? { ...d, to_service_id: sid } : d)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    crossDraft.to_service_id === sid
                      ? 'bg-violet-600/40 border-violet-500/60 text-white'
                      : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80'
                  }`}
                >
                  <span>{SERVICE_META[sid]?.emoji ?? ''}</span>
                  <span>{SERVICE_NAMES[sid] ?? sid}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/40">Людей</span>
              <div className="flex items-center gap-0.5">
                <button type="button"
                  onClick={() => setCrossDraft(d => d ? { ...d, needed_count: Math.max(1, d.needed_count - 1) } : d)}
                  className="w-6 h-6 rounded bg-white/8 border border-white/10 text-white/50 hover:text-white hover:bg-white/15 text-xs font-bold flex items-center justify-center">−</button>
                <span className="w-7 text-center text-sm font-semibold text-white">{crossDraft.needed_count}</span>
                <button type="button"
                  onClick={() => setCrossDraft(d => d ? { ...d, needed_count: Math.min(20, d.needed_count + 1) } : d)}
                  className="w-6 h-6 rounded bg-white/8 border border-white/10 text-white/50 hover:text-white hover:bg-white/15 text-xs font-bold flex items-center justify-center">+</button>
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
          <input
            type="text"
            value={crossDraft.description}
            onChange={e => setCrossDraft(d => d ? { ...d, description: e.target.value } : d)}
            placeholder="Что нужно сделать (опишите задачу для другой службы)…"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50"
          />
        </div>
      )}

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
