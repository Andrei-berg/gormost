'use client'
import { useConfirm } from '@/components/ConfirmDialog'
import { useState, useEffect } from 'react'
import type { WorkPlanWithItems, WorkPlanItemWithVehicles, AuthSession, CrossServiceDraft, VehicleRequirement, WorkAssignmentWithUser } from '@/types'
import { shiftLabel as fmtShiftLabel } from '@/lib/workSchedule'
import { WORK_PLAN_STATUS_CONFIG, CROSS_SERVICE_STATUS_CONFIG, SERVICE_META, VEHICLE_TYPE_CONFIG } from '@/types'
import WorkPermitModal from './WorkPermitModal'
import PlanItemForm, { PlanItemFormData } from '@/components/shared/PlanItemForm'
import { WorkerIcon, BrigadierIcon, MasterIcon, ItrIcon } from '@/components/RoleIcons'
import VehicleNumberBadge from '@/components/VehicleNumberBadge'
import { requiresWorkPermit, matchedHighRiskCategories } from '@/lib/highRiskWorks'
import {
  createWorkPlanItem, updateWorkPlanItem, deleteWorkPlanItem,
  submitWorkPlan, deleteWorkPlan, recallWorkPlan,
  fetchWorkAssignmentsForItems,
} from '@/lib/api-client'

function roleGlyph(role: string) {
  switch (role) {
    case 'WORKER':    return <WorkerIcon className="w-3.5 h-3.5" />
    case 'BRIGADIER': return <BrigadierIcon className="w-3.5 h-3.5" />
    case 'MASTER':    return <MasterIcon className="w-3.5 h-3.5" />
    case 'ITR':       return <ItrIcon className="w-3.5 h-3.5" />
    case 'DRIVER':    return <span>🚗</span>
    default:          return <span>👤</span>
  }
}
const BRIGADE_ROLE_LABELS: Record<string, string> = {
  WORKER: 'Рабочий', BRIGADIER: 'Бригадир', MASTER: 'Мастер', ITR: 'ИТР', DRIVER: 'Водитель',
}

const SERVICE_NAMES: Record<string, string> = {
  'SRV-ENG':  'Инженерные системы',
  'SRV-STR':  'Строительная служба',
  'SRV-FIRE': 'Пожарная безопасность',
  'SRV-VENT': 'Вентиляция',
  'SRV-CCTV': 'Видеонаблюдение',
}

const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const dd = d.getDate().toString().padStart(2, '0')
  const mm = (d.getMonth() + 1).toString().padStart(2, '0')
  return `${DAY_NAMES[d.getDay()]} ${dd}.${mm}`
}

interface Props {
  plan: WorkPlanWithItems
  session: AuthSession
  onRefresh: () => void
}

export default function PlanCard({ plan, session, onRefresh }: Props) {
  const confirmDialog = useConfirm()
  const [showAddItem, setShowAddItem] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [acting, setActing] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showPermit, setShowPermit] = useState(false)

  // Expand DRAFT/REJECTED by default so user can add items; others collapsed
  const [isExpanded, setIsExpanded] = useState(
    ['DRAFT', 'REJECTED'].includes(plan.status)
  )

  const canEdit = ['DRAFT', 'REJECTED', 'SUBMITTED', 'APPROVED', 'PLANNED', 'BOSS_CONFIRMED'].includes(plan.status)
  const canSubmit = canEdit && plan.items.length > 0
  const statusCfg = WORK_PLAN_STATUS_CONFIG[plan.status]
  const shiftLabel = fmtShiftLabel(plan.shift_type)
  const shiftShort = plan.shift_type === 'DAY' ? 'день' : 'ночь'

  // Load brigade assignments when plan is in execution phase
  const [brigadeMap, setBrigadeMap] = useState<Map<string, WorkAssignmentWithUser[]>>(new Map())
  useEffect(() => {
    if (!['ASSIGNED', 'IN_PROGRESS', 'DONE'].includes(plan.status)) return
    const ids = plan.items.map(i => i.id)
    if (!ids.length) return
    fetchWorkAssignmentsForItems(ids).then(list => {
      const map = new Map<string, WorkAssignmentWithUser[]>()
      for (const a of list) {
        if (!map.has(a.plan_item_id)) map.set(a.plan_item_id, [])
        map.get(a.plan_item_id)!.push(a)
      }
      setBrigadeMap(map)
    })
  }, [plan.id, plan.status]) // eslint-disable-line

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
    if (!(await confirmDialog('Отозвать план на доработку? Он вернётся в черновики.', { confirmLabel: 'Отозвать', danger: false }))) return
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
    if (!(await confirmDialog('Удалить план?', { confirmLabel: 'Удалить' }))) return
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

  const handleSaveItem = async (data: PlanItemFormData, _cross: CrossServiceDraft | null) => {
    await createWorkPlanItem({ plan_id: plan.id, sort_order: plan.items.length, ...data })
    setShowAddItem(false)
    onRefresh()
  }

  const handleUpdateItem = async (itemId: string, data: PlanItemFormData, _cross: CrossServiceDraft | null) => {
    await updateWorkPlanItem(itemId, data)
    setEditingItemId(null)
    onRefresh()
  }

  // Derive display title from first item
  const planTitle = plan.items.length > 0
    ? [plan.items[0].work_description, plan.items[0].location].filter(Boolean).join(' · ')
    : `Новый план · ${plan.shift_type === 'DAY' ? 'день' : 'ночь'}`

  const svcMeta = SERVICE_META[plan.service_id]
  const svcCode = plan.service_id.replace('SRV-', '')
  const totalPeople = totalWorkers + totalBrigadiers + totalMasters + totalForemen

  return (
    <>
    <div className="glass rounded-xl overflow-hidden">
      {/* ── Compact header row ── */}
      <div className="grid grid-cols-[minmax(120px,auto)_1fr_auto_auto] items-center gap-3 px-4 py-3">

        {/* Status chip */}
        <span
          className={`inline-flex items-center text-[11px] px-2.5 py-1 rounded-full border font-bold whitespace-nowrap ${statusCfg.bg}`}
          style={{ color: statusCfg.color }}
        >
          {statusCfg.label}
        </span>

        {/* Title + meta */}
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate">{planTitle}</div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="font-mono text-[11px] text-white/50">{fmtDate(plan.plan_date)} · {shiftShort}</span>
            {svcMeta && (
              <>
                <span className="text-white/20">·</span>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                  style={{ color: svcMeta.color, borderColor: `${svcMeta.color}40`, background: `${svcMeta.color}18` }}
                >
                  {svcMeta.emoji} {svcCode}
                </span>
              </>
            )}
            {plan.items.length > 0 && (
              <>
                <span className="text-white/20">·</span>
                <span className="text-[11px] text-white/50">
                  <b className="font-mono text-white/80">{plan.items.length}</b> {plan.items.length === 1 ? 'позиция' : plan.items.length < 5 ? 'позиции' : 'позиций'}
                </span>
              </>
            )}
            {totalPeople > 0 && (
              <>
                <span className="text-white/20">·</span>
                <span className="text-[11px] text-white/50">
                  <b className="font-mono text-white/80">{totalPeople}</b> чел.
                </span>
              </>
            )}
            {totalVehicles > 0 && (
              <>
                <span className="text-white/20">·</span>
                <span className="text-[11px] text-white/50">
                  <b className="font-mono text-white/80">{totalVehicles}</b> ед. техники
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {submitError && (
            <span className="text-[10px] text-red-400">Ошибка</span>
          )}
          {canSubmit && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-[#0D1117] disabled:opacity-50 transition-all"
            >
              {submitting ? '⏳' : '✓'} {submitting ? 'Отправка...' : plan.status === 'REJECTED' ? 'Повторно' : 'Подать на согл.'}
            </button>
          )}
          {plan.status === 'SUBMITTED' && (
            <button
              onClick={handleRecall}
              disabled={acting}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-white/[0.05] border border-white/15 text-white/70 hover:bg-white/10 transition-all disabled:opacity-50"
            >
              {acting ? '...' : '↩ Отозвать'}
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => setIsExpanded(v => !v)}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-white/[0.05] border border-white/15 text-white/60 hover:bg-white/10 transition-all"
            >
              ✎ Редактировать
            </button>
          )}
          {(plan.status === 'DRAFT' || plan.status === 'REJECTED') && (
            <button
              onClick={handleDelete}
              disabled={acting}
              title="Удалить план"
              className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400/60 text-xs hover:bg-red-500/25 hover:text-red-400 transition-all disabled:opacity-50 flex items-center justify-center"
            >
              ✕
            </button>
          )}
          <button
            onClick={() => setShowPermit(true)}
            title="Наряд-допуск"
            className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400/60 text-xs hover:bg-blue-500/25 hover:text-blue-400 transition-all flex items-center justify-center"
          >
            🖨
          </button>
        </div>

        {/* Expand chevron */}
        <button
          onClick={() => setIsExpanded(v => !v)}
          className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${
            isExpanded
              ? 'bg-amber-500/12 border-amber-500/30 text-amber-400'
              : 'bg-white/[0.05] border-white/10 text-white/30 hover:bg-white/10 hover:text-white/60'
          }`}
          title={isExpanded ? 'Свернуть' : 'Развернуть'}
        >
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" strokeWidth="2.5">
            <path d={isExpanded ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} />
          </svg>
        </button>
      </div>

      {/* ── Rejected banner (only when expanded) ── */}
      {isExpanded && plan.status === 'REJECTED' && plan.chief_notes && (
        <div className="px-4 pb-0">
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="text-[10px] text-red-400/70 uppercase tracking-wider mb-1">Возвращён с комментарием</div>
            <div className="text-sm text-red-300">{plan.chief_notes}</div>
          </div>
        </div>
      )}

      {/* ── Expanded detail ── */}
      {isExpanded && (
        <div className="border-t border-white/[0.06] px-4 py-3 space-y-2">
          <div className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">{shiftLabel}</div>

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
                planDate={plan.plan_date}
                allPlanWorkers={plan.items.filter(i => i.id !== item.id).flatMap(i => i.workers)}
                onSave={(data, cross) => handleUpdateItem(item.id, data, cross)}
                onCancel={() => setEditingItemId(null)}
              />
            ) : (
              <ItemRow
                key={item.id}
                item={item}
                canEdit={canEdit}
                brigadeAssignments={brigadeMap.get(item.id)}
                onEdit={() => setEditingItemId(item.id)}
                onDelete={() => handleDeleteItem(item.id)}
              />
            )
          )}

          {canEdit && (
            showAddItem ? (
              <PlanItemForm
                serviceId={plan.service_id}
                planDate={plan.plan_date}
                allPlanWorkers={plan.items.flatMap(i => i.workers)}
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

          {/* Footer totals */}
          {(totalWorkers > 0 || totalBrigadiers > 0 || totalMasters > 0 || totalForemen > 0 || totalVehicles > 0) && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/[0.05] text-[12px] text-white/50">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Итого:</span>
              {totalWorkers    > 0 && <span><WorkerIcon className="w-3.5 h-3.5" /> <b className="font-mono text-white/70">{totalWorkers}</b> рабочих</span>}
              {totalBrigadiers > 0 && <span><BrigadierIcon className="w-3.5 h-3.5" /> <b className="font-mono text-white/70">{totalBrigadiers}</b> бригадир</span>}
              {totalMasters    > 0 && <span><MasterIcon className="w-3.5 h-3.5" /> <b className="font-mono text-white/70">{totalMasters}</b> мастер</span>}
              {totalForemen    > 0 && <span><ItrIcon className="w-3.5 h-3.5" /> <b className="font-mono text-white/70">{totalForemen}</b> ИТР</span>}
              {totalVehicles   > 0 && <span>🚛 <b className="font-mono text-white/70">{totalVehicles}</b> техника</span>}
            </div>
          )}

          {submitError && (
            <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
              {submitError}
            </div>
          )}
        </div>
      )}
    </div>

    {showPermit && (
      <WorkPermitModal plan={plan} session={session} onClose={() => setShowPermit(false)} />
    )}
    </>
  )
}

// ── Item row ───────────────────────────────────────────────────────────────

function ItemRow({ item, canEdit, brigadeAssignments, onEdit, onDelete }: {
  item: WorkPlanItemWithVehicles
  canEdit: boolean
  brigadeAssignments?: WorkAssignmentWithUser[]
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
          {requiresWorkPermit(item.work_description ?? '') && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25 shrink-0"
              title={`Работы повышенной опасности (п.15) — требуется наряд-допуск:\n${matchedHighRiskCategories(item.work_description ?? '').map(c => '• ' + c.label).join('\n')}`}
            >
              🔺 наряд
            </span>
          )}
        </div>
        <div className="text-xs text-white/55 mt-0.5 leading-relaxed">{item.work_description}</div>

        {/* Headcount + vehicle type badges */}
        {(item.required_workers > 0 || item.required_brigadiers > 0 || item.required_masters > 0 || item.required_foremen > 0 || vehicleTypes.length > 0 || item.required_vehicles > 0) && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.required_workers    > 0 && <span className="text-[10px] bg-blue-500/15    text-blue-300    px-1.5 py-0.5 rounded inline-flex items-center gap-1"><WorkerIcon className="w-3 h-3" /> {item.required_workers}</span>}
            {item.required_brigadiers > 0 && <span className="text-[10px] bg-yellow-500/15  text-yellow-300  px-1.5 py-0.5 rounded inline-flex items-center gap-1"><BrigadierIcon className="w-3 h-3" /> {item.required_brigadiers}</span>}
            {item.required_masters    > 0 && <span className="text-[10px] bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 rounded inline-flex items-center gap-1"><MasterIcon className="w-3 h-3" /> {item.required_masters}</span>}
            {item.required_foremen    > 0 && <span className="text-[10px] bg-purple-500/15  text-purple-300  px-1.5 py-0.5 rounded inline-flex items-center gap-1"><ItrIcon className="w-3 h-3" /> {item.required_foremen}</span>}
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
              <div key={v.id} className="flex items-center gap-1.5">
                <VehicleNumberBadge number={v.fleet_number} plate={v.plate} size="sm" />
                <span className="text-[11px] text-white/55">{v.name}</span>
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
                  {r.response_note && <span className="opacity-60 ml-1">«{r.response_note}»</span>}
                </div>
              )
            })}
          </div>
        )}

        {item.notes && <div className="text-[11px] text-white/30 mt-1 italic">{item.notes}</div>}

        {/* Brigade assignments — shown when plan is ASSIGNED/IN_PROGRESS/DONE */}
        {brigadeAssignments && brigadeAssignments.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/8">
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Бригада</div>
            <div className="flex flex-wrap gap-1">
              {brigadeAssignments.map(a => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/8 border border-white/12"
                >
                  {roleGlyph(a.role)}
                  <span className="text-white/75 font-medium">{a.user?.full_name?.split(' ').slice(0, 2).join(' ') ?? '—'}</span>
                  <span className="text-white/35">·{BRIGADE_ROLE_LABELS[a.role] ?? a.role}</span>
                </span>
              ))}
            </div>
          </div>
        )}
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


