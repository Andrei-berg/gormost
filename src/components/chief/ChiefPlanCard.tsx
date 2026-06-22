'use client'
import { useState } from 'react'
import type { WorkPlanWithItems, WorkPlanItem, AuthSession, Service } from '@/types'
import { shiftHours as fmtShiftHours } from '@/lib/workSchedule'
import { WORK_PLAN_STATUS_CONFIG, SERVICE_META } from '@/types'
import {
  approveWorkPlan, rejectWorkPlan,
  createWorkPlanItem, updateWorkPlanItem, deleteWorkPlanItem,
} from '@/lib/api-client'
import SharedPlanItemForm, { type PlanItemFormData } from '@/components/shared/PlanItemForm'
import { WorkerIcon, BrigadierIcon } from '@/components/RoleIcons'

const SVC_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  'SRV-ENG':  { color: '#F0A500', bg: 'rgba(240,165,0,0.15)',  border: 'rgba(240,165,0,0.40)' },
  'SRV-STR':  { color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.40)' },
  'SRV-FIRE': { color: '#F85149', bg: 'rgba(248,81,73,0.15)',  border: 'rgba(248,81,73,0.40)' },
  'SRV-VENT': { color: '#22D3EE', bg: 'rgba(34,211,238,0.15)', border: 'rgba(34,211,238,0.40)' },
  'SRV-CCTV': { color: '#3FB950', bg: 'rgba(63,185,80,0.15)',  border: 'rgba(63,185,80,0.40)' },
}

interface Props {
  plan: WorkPlanWithItems
  session: AuthSession
  services: Service[]
  onRefresh: () => void
}

export default function ChiefPlanCard({ plan, session, services, onRefresh }: Props) {
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectNotes, setRejectNotes] = useState('')
  const [comment, setComment] = useState('')
  const [showAddItem, setShowAddItem] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const service = services.find(s => s.service_id === plan.service_id)
  const meta = SERVICE_META[plan.service_id] ?? { emoji: '🔧', color: '#94a3b8', bg: 'bg-slate-500/20' }
  const svc = SVC_COLORS[plan.service_id] ?? { color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.40)' }
  const statusCfg = WORK_PLAN_STATUS_CONFIG[plan.status]
  const isNight = plan.shift_type === 'NIGHT'
  const shiftLabel = isNight ? 'ночь' : 'день'
  const shiftTime = fmtShiftHours(isNight ? 'NIGHT' : 'DAY')
  const canEdit = plan.status === 'SUBMITTED'

  const dateStr = (() => {
    const d = new Date(plan.plan_date + 'T00:00:00')
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`
  })()

  const totalWorkers = plan.items.reduce((s, i) => s + (i.required_workers ?? 0), 0)
  const totalVehicles = plan.items.reduce((s, i) => s + (i.required_vehicles ?? 0), 0)

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
    setShowRejectModal(false)
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
    <div className="glass rounded-2xl p-4 flex flex-col gap-3 relative">
      {/* Header row */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <span
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold border"
          style={{ color: svc.color, background: svc.bg, borderColor: svc.border }}
        >
          <span>{meta.emoji}</span>
          {plan.service_id}
        </span>
        <span className="text-[13px] text-white font-semibold">
          {service?.service_name ?? plan.service_id}
        </span>
        <div className="flex-1" />
        <span
          className="font-mono text-[11px] px-2.5 py-1 rounded-lg border"
          style={{ background: 'rgba(0,0,0,0.25)', borderColor: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.6)' }}
        >
          {dateStr} · <span style={{ color: isNight ? '#8B5CF6' : '#F0A500', fontWeight: 700 }}>{shiftLabel}</span> · {shiftTime}
        </span>
        {plan.status !== 'SUBMITTED' && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full border"
            style={{ color: statusCfg.color, borderColor: 'currentColor', background: statusCfg.bg }}
          >
            {statusCfg.label}
          </span>
        )}
        {plan.status === 'APPROVED' && (
          <span className="text-[10px] text-white/40">✓ Гл. инженер · ⏳ Зам/Прораб ожидает</span>
        )}
        {plan.status === 'PLANNED' && (
          <span className="text-[10px] text-white/40">✓ Гл. инженер · ✓ Зам/Прораб</span>
        )}
      </div>

      {/* Plan items */}
      <div className="rounded-[10px] p-3 flex flex-col gap-2" style={{ background: 'rgba(0,0,0,0.20)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="text-[10px] text-white/40 uppercase tracking-[0.08em] font-bold mb-1">
          Позиции плана — {plan.items.length}
        </div>
        {plan.items.length === 0 && (
          <div className="text-sm text-white/30 text-center py-2">Нет позиций</div>
        )}
        {plan.items.map((item, idx) =>
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
            <ItemRow
              key={item.id}
              item={item}
              idx={idx + 1}
              canEdit={canEdit}
              onEdit={() => setEditingItemId(item.id)}
              onDelete={() => handleDeleteItem(item.id)}
            />
          )
        )}
        {canEdit && !showAddItem && (
          <button
            onClick={() => setShowAddItem(true)}
            className="w-full py-2 rounded-lg border border-dashed text-[12px] transition-colors"
            style={{ borderColor: 'rgba(255,255,255,0.20)', color: 'rgba(255,255,255,0.40)' }}
          >
            + Добавить позицию
          </button>
        )}
        {showAddItem && (
          <SharedPlanItemForm
            serviceId={plan.service_id}
            planDate={plan.plan_date}
            onSave={handleSaveItem}
            onCancel={() => setShowAddItem(false)}
          />
        )}
      </div>

      {/* Totals */}
      {plan.items.length > 0 && (
        <div
          className="flex items-center gap-4 text-[12px] text-white/55 pt-1 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.05)', borderStyle: 'dashed' }}
        >
          {totalWorkers > 0 && (
            <span><b className="font-mono text-white font-bold mr-1">{totalWorkers}</b>чел.</span>
          )}
          {totalVehicles > 0 && (
            <span><b className="font-mono text-white font-bold mr-1">{totalVehicles}</b>ед. техники</span>
          )}
          <span className="text-[#3FB950] ml-auto text-[11.5px]">✓ Допуски в порядке</span>
        </div>
      )}

      {/* Chief notes (already saved) */}
      {plan.chief_notes && plan.status !== 'SUBMITTED' && (
        <div className="p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.20)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Комментарий главного инженера</div>
          <div className="text-sm text-white/60">{plan.chief_notes}</div>
        </div>
      )}

      {/* Comment input for pending plans */}
      {canEdit && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-white/40 uppercase tracking-[0.08em] font-bold">
            Комментарий главного инженера
          </label>
          <input
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Замечания, корректировки, условия согласования…"
            className="w-full px-3 py-2 rounded-xl text-[12.5px] text-white placeholder-white/25 focus:outline-none"
            style={{ background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(255,255,255,0.10)' }}
          />
        </div>
      )}

      {/* Actions */}
      {canEdit && (
        <div className="flex items-center gap-2 pt-0.5">
          <div className="flex-1" />
          <button
            onClick={() => { setShowRejectModal(true); setRejectNotes('') }}
            disabled={saving}
            className="px-3 py-2 rounded-xl text-[12.5px] font-semibold border transition-colors disabled:opacity-40"
            style={{ background: 'rgba(248,81,73,0.08)', color: '#F85149', borderColor: 'rgba(248,81,73,0.40)' }}
          >
            ✗ Отклонить
          </button>
          <button
            onClick={handleApprove}
            disabled={saving}
            className="px-3 py-2 rounded-xl text-[12.5px] font-bold border disabled:opacity-40 transition-all"
            style={{
              background: '#F0A500', color: '#0D1117', borderColor: '#F0A500',
              boxShadow: '0 1px 0 rgba(255,255,255,0.15) inset, 0 2px 8px rgba(240,165,0,0.22)',
            }}
          >
            ✓ Согласовать
          </button>
        </div>
      )}

      {/* Rejection modal overlay */}
      {showRejectModal && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-2xl z-10"
          style={{ background: 'rgba(8,12,28,0.72)', backdropFilter: 'blur(2px)' }}
        >
          <div
            className="w-[420px] rounded-2xl p-6 flex flex-col gap-4"
            style={{
              background: 'rgba(15,20,40,0.96)',
              border: '1px solid rgba(248,81,73,0.40)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.65)',
            }}
          >
            <h3 className="text-lg font-bold text-white flex items-center gap-2 m-0">
              <span style={{ color: '#F85149' }}>⚠</span> Отклонить план
            </h3>
            <div
              className="rounded-xl p-3 flex flex-col gap-1"
              style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold border"
                  style={{ color: svc.color, background: svc.bg, borderColor: svc.border }}
                >
                  {meta.emoji} {plan.service_id}
                </span>
                <span className="text-[13px] font-semibold text-white">
                  {service?.service_name ?? plan.service_id}
                </span>
              </div>
              <div className="font-mono text-[12px] text-white/55">{dateStr} · {shiftLabel}</div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase tracking-[0.06em] font-semibold text-white/60">
                Причина отклонения <span style={{ color: '#F85149' }}>*</span>
              </label>
              <textarea
                value={rejectNotes}
                onChange={e => setRejectNotes(e.target.value)}
                rows={3}
                placeholder="Укажите причину отклонения…"
                className="w-full px-3 py-2.5 rounded-xl text-[13px] text-white placeholder-white/35 focus:outline-none resize-none"
                style={{ background: 'rgba(0,0,0,0.40)', border: '1px solid rgba(255,255,255,0.10)', lineHeight: '1.4' }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl text-[12.5px] font-semibold border"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.85)', borderColor: 'rgba(255,255,255,0.20)' }}
              >
                Отмена
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectNotes.trim() || saving}
                className="px-4 py-2 rounded-xl text-[12.5px] font-bold text-white disabled:opacity-40"
                style={{ background: '#DC2626', border: '1px solid #DC2626' }}
              >
                Отклонить план
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ItemRow({ item, idx, canEdit, onEdit, onDelete }: {
  item: WorkPlanItem
  idx: number
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const hasResources = (item.required_workers ?? 0) > 0 || (item.required_foremen ?? 0) > 0
    || (item.required_vehicles ?? 0) > 0 || item.workers.length > 0

  return (
    <div
      className="flex flex-col gap-1 py-2 border-b group last:border-b-0"
      style={{ borderColor: 'rgba(255,255,255,0.05)' }}
    >
      <div className="flex items-start gap-2">
        <span className="font-mono text-[11px] text-white/40 shrink-0 mt-0.5">{idx}.</span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] text-white font-medium leading-snug">
            {item.location}
            {item.work_description && (
              <span className="text-white/55 font-normal"> · {item.work_description}</span>
            )}
          </div>
          {hasResources && (
            <div className="flex flex-wrap gap-2.5 mt-1 text-[11px] text-white/55">
              {(item.required_workers ?? 0) > 0 && <span><WorkerIcon className="w-3.5 h-3.5" /> {item.required_workers} чел.</span>}
              {(item.required_foremen ?? 0) > 0 && <span><BrigadierIcon className="w-3.5 h-3.5" /> {item.required_foremen} бригадир</span>}
              {(item.required_vehicles ?? 0) > 0 && <span>🚛 {item.required_vehicles} ТС</span>}
              {item.workers.length > 0 && (item.required_workers ?? 0) === 0 && (
                <span><WorkerIcon className="w-3.5 h-3.5" /> {item.workers.length} чел.</span>
              )}
              {item.time_start && (
                <span className="text-cyan-400 font-mono">
                  ⏱ {item.time_start}{item.time_end ? `–${item.time_end}` : ''}
                </span>
              )}
            </div>
          )}
          {item.notes && <div className="text-[11px] text-white/30 mt-0.5">{item.notes}</div>}
        </div>
        {canEdit && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 text-xs">✏️</button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 text-xs">🗑️</button>
          </div>
        )}
      </div>
    </div>
  )
}
