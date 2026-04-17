'use client'
// UrgentOrdersPanel — unified "поручения сверху" for chief, zamporab, dispatcher
// Shows active urgent directives, lets user create new ones with worker extraction.

import { useState, useEffect, useCallback } from 'react'
import {
  fetchDirectivesWithWorkers,
  fetchWorkPlans,
  fetchWorkPlanWithItems,
  fetchWorkAssignmentsForItems,
  fetchServiceOrderTypes,
  createDirectiveWithWorkers,
  updateDirectiveStatus,
} from '@/lib/api'
import type {
  AuthSession,
  WorkPlanWithItems,
  DirectivePriority,
  Directive,
  DirectiveWorkerAssignment,
  ServiceOrderType,
} from '@/types'
import { DIRECTIVE_PRIORITY_CONFIG, DIRECTIVE_STATUS_CONFIG, SERVICE_META } from '@/types'

// ─── Static service list (matches SERVICE_META keys) ─────────────────────────
const SERVICES = [
  { id: 'SRV-ENG',  name: 'Инженерные системы',   em: '⚡' },
  { id: 'SRV-STR',  name: 'Строительная служба',   em: '🏗️' },
  { id: 'SRV-FIRE', name: 'Пожарная безопасность', em: '🚒' },
  { id: 'SRV-VENT', name: 'Вентиляция',            em: '💨' },
  { id: 'SRV-CCTV', name: 'Видеонаблюдение',       em: '📹' },
]

// ─── Types ────────────────────────────────────────────────────────────────────
interface DirectiveWithWorkers extends Directive {
  workers: DirectiveWorkerAssignment[]
}

interface BrigadeWorker {
  userId:   string
  name:     string
  planId:   string
  planName: string
  alreadyPulled: boolean // assigned to another active directive today
}

interface BrigadeSlot {
  planId:   string
  planName: string
  service:  string
  em:       string
  foreman?: string
  workers:  BrigadeWorker[]
}

interface SelectedWorker {
  userId:   string
  name:     string
  planId:   string
  planName: string
}

// ─── Main panel ───────────────────────────────────────────────────────────────
export default function UrgentOrdersPanel({ session }: { session: AuthSession }) {
  const [directives,  setDirectives]  = useState<DirectiveWithWorkers[]>([])
  const [brigades,    setBrigades]    = useState<BrigadeSlot[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showCreate,  setShowCreate]  = useState(false)
  const [detailDir,   setDetailDir]   = useState<DirectiveWithWorkers | null>(null)

  const load = useCallback(async () => {
    const [dirs, rawPlans] = await Promise.all([
      fetchDirectivesWithWorkers(),
      fetchWorkPlans({ statuses: ['ASSIGNED', 'IN_PROGRESS', 'BOSS_CONFIRMED'] }),
    ])
    setDirectives(dirs as DirectiveWithWorkers[])

    // Build brigade slots — all workers across active plan items
    const withItems = await Promise.all(rawPlans.map(p => fetchWorkPlanWithItems(p.id)))
    const allItemIds = withItems.flatMap(p => (p?.items ?? []).map(i => i.id))
    const assignments = allItemIds.length > 0
      ? await fetchWorkAssignmentsForItems(allItemIds)
      : []

    // Workers already pulled today (active directives)
    const pulledIds = new Set(
      dirs.filter(d => !['DONE','CANCELLED'].includes(d.status))
          .flatMap(d => d.workers.map(w => w.worker_id))
    )

    const slots: BrigadeSlot[] = withItems
      .filter((p): p is WorkPlanWithItems => !!p)
      .map(plan => {
        const meta = SERVICE_META[plan.service_id] ?? { emoji: '🔧' }
        const planItemIds = plan.items.map(i => i.id)
        const planAssignments = assignments.filter(a => planItemIds.includes(a.plan_item_id))
        const uniqueWorkers = new Map<string, BrigadeWorker>()
        planAssignments.forEach(a => {
          if (!a.user) return
          if (!uniqueWorkers.has(a.user.user_id)) {
            uniqueWorkers.set(a.user.user_id, {
              userId:       a.user.user_id,
              name:         a.user.full_name,
              planId:       plan.id,
              planName:     plan.items[0]?.location ?? `${meta.emoji} ${plan.plan_date}`,
              alreadyPulled: pulledIds.has(a.user.user_id),
            })
          }
        })
        const foreman = planAssignments.find(a => a.role === 'MASTER' || a.role === 'BRIGADIER')?.user?.full_name
        return {
          planId:   plan.id,
          planName: plan.items[0]?.location ?? `${meta.emoji} план`,
          service:  plan.service_id,
          em:       meta.emoji,
          foreman,
          workers:  Array.from(uniqueWorkers.values()),
        }
      })
      .filter(s => s.workers.length > 0)

    setBrigades(slots)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const today = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const active   = directives.filter(d => !['DONE','CANCELLED'].includes(d.status))
  const archived = directives.filter(d =>  ['DONE','CANCELLED'].includes(d.status))

  // Count workers pulled today across active directives
  const pulledToday = new Set(active.flatMap(d => d.workers.map(w => w.worker_id))).size

  if (loading) return (
    <div className="text-center text-white/30 py-12 text-sm">Загрузка поручений...</div>
  )

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-pulse" />
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Поручения сверху</h3>
          <span className="text-xs text-white/30">{today}</span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition-all"
        >
          <span className="text-base leading-none">+</span>
          Создать поручение
        </button>
      </div>

      {/* Stats strip */}
      <div className="flex gap-0 border border-white/7 rounded-lg overflow-hidden">
        {[
          { val: active.length,   lbl: 'Активных',   cls: 'text-amber-400' },
          { val: archived.filter(d => d.status === 'DONE').length, lbl: 'Выполнено сегодня', cls: 'text-green-400' },
          { val: pulledToday,     lbl: 'Выведено работников', cls: 'text-red-400' },
          { val: new Set(active.flatMap(d => d.workers.map(w => w.source_plan_id))).size, lbl: 'Бригады ослаблены', cls: 'text-white/50' },
        ].map((s, i) => (
          <div key={i} className="flex-1 px-4 py-3 bg-white/[0.03] border-r border-white/7 last:border-r-0 flex items-center gap-3">
            <span className={`font-mono text-xl font-semibold ${s.cls}`}>{s.val}</span>
            <span className="text-xs text-white/40 leading-tight">{s.lbl}</span>
          </div>
        ))}
      </div>

      {/* Active directives */}
      {active.length > 0 && (
        <div className="space-y-2">
          {active.map(d => (
            <DirectiveRow
              key={d.id}
              directive={d}
              onDone={() => updateDirectiveStatus(d.id, 'DONE').then(load)}
              onClick={() => setDetailDir(d)}
            />
          ))}
        </div>
      )}

      {active.length === 0 && (
        <div className="text-center py-10 text-white/20 text-sm">
          <div className="text-3xl mb-2">📝</div>
          Поручений на сегодня нет
        </div>
      )}

      {/* Weakened brigades — only when someone was pulled */}
      {pulledToday > 0 && <WeakenedBrigades active={active} />}

      {/* Archived */}
      {archived.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs text-white/30 hover:text-white/50 transition-colors select-none py-1">
            История · {archived.length} ▼
          </summary>
          <div className="space-y-2 mt-2 opacity-50">
            {archived.map(d => (
              <DirectiveRow key={d.id} directive={d} onClick={() => setDetailDir(d)} />
            ))}
          </div>
        </details>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateDirectiveModal
          session={session}
          brigades={brigades}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
        />
      )}
      {detailDir && (
        <DirectiveDetailModal
          directive={detailDir}
          onClose={() => setDetailDir(null)}
          onDone={() => { updateDirectiveStatus(detailDir.id, 'DONE').then(load); setDetailDir(null) }}
        />
      )}
    </div>
  )
}

// ─── Directive row card ───────────────────────────────────────────────────────
function DirectiveRow({
  directive: d, onDone, onClick,
}: {
  directive: DirectiveWithWorkers
  onDone?:  () => void
  onClick:  () => void
}) {
  const prCfg = DIRECTIVE_PRIORITY_CONFIG[d.priority]
  const stCfg = DIRECTIVE_STATUS_CONFIG[d.status]
  const svc   = SERVICES.find(s => s.id === d.service_id)
  const dt    = new Date(d.created_at).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit' })

  const borderColor = d.priority === 'IMMEDIATE' ? 'border-l-red-500'
    : d.priority === 'URGENT' ? 'border-l-amber-500'
    : 'border-l-white/15'

  return (
    <div
      className={`glass rounded-xl p-4 border border-white/8 border-l-4 ${borderColor} cursor-pointer hover:bg-white/5 transition-all`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-medium text-white text-sm">{d.title}</span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full border font-semibold"
              style={{ color: prCfg.color, borderColor: prCfg.color + '50', background: prCfg.color + '18' }}
            >
              {prCfg.label}
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full border"
              style={{ color: stCfg.color, borderColor: stCfg.color + '40' }}
            >
              {stCfg.label}
            </span>
          </div>

          {d.order_type && (
            <div className="text-xs text-white/35 italic mb-1">{d.order_type}</div>
          )}

          <div className="flex items-center gap-3 text-[11px] text-white/30 flex-wrap">
            {svc && <span>{svc.em} {svc.name}</span>}
            {d.location && <span>📍 {d.location}</span>}
            <span>🕐 {dt}</span>
          </div>

          {d.workers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {d.workers.map(w => (
                <span
                  key={w.id}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/12 border border-amber-500/25 text-amber-300"
                >
                  {w.worker_name}
                </span>
              ))}
            </div>
          )}
        </div>

        {onDone && !['DONE','CANCELLED'].includes(d.status) && (
          <button
            onClick={e => { e.stopPropagation(); onDone() }}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-green-600/20 border border-green-500/30 text-green-400 text-xs hover:bg-green-600/35 transition-all"
          >
            ✓ Готово
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Weakened brigades section ────────────────────────────────────────────────
function WeakenedBrigades({ active }: { active: DirectiveWithWorkers[] }) {
  // Group pulled workers by source brigade
  const byPlan = new Map<string, { planName: string; workers: string[] }>()
  active.forEach(d =>
    d.workers.forEach(w => {
      const key = w.source_plan_id ?? w.worker_id
      if (!byPlan.has(key)) byPlan.set(key, { planName: w.source_plan_name ?? 'Бригада', workers: [] })
      byPlan.get(key)!.workers.push(w.worker_name)
    })
  )
  if (byPlan.size === 0) return null

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-amber-400 text-xs font-mono font-bold uppercase tracking-wider">⚠ Ослабленные бригады</span>
        <span className="text-xs text-white/30">— из этих бригад выведены работники</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from(byPlan.entries()).map(([key, slot]) => (
          <div key={key} className="bg-white/[0.04] border border-amber-500/20 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-white">{slot.planName}</span>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded">
                -{slot.workers.length} чел.
              </span>
            </div>
            <div className="space-y-1">
              {slot.workers.map(name => (
                <div key={name} className="flex items-center gap-1.5 text-xs">
                  <span className="text-white/30 line-through">{name}</span>
                  <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1 py-px rounded uppercase">
                    выведен
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Create directive modal (2 steps) ─────────────────────────────────────────
function CreateDirectiveModal({
  session, brigades, onClose, onCreated,
}: {
  session:    AuthSession
  brigades:   BrigadeSlot[]
  onClose:    () => void
  onCreated:  () => void
}) {
  const [step,        setStep]        = useState<1 | 2>(1)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  // Step 1 fields
  const [serviceId,   setServiceId]   = useState(session.service_id ?? '')
  const [orderTypes,  setOrderTypes]  = useState<ServiceOrderType[]>([])
  const [orderType,   setOrderType]   = useState('')
  const [title,       setTitle]       = useState('')
  const [location,    setLocation]    = useState('')
  const [description, setDescription] = useState('')
  const [priority,    setPriority]    = useState<DirectivePriority>('URGENT')

  // Step 2 — selected workers
  const [selected, setSelected] = useState<SelectedWorker[]>([])

  // Load order types when service changes
  useEffect(() => {
    if (!serviceId) { setOrderTypes([]); return }
    fetchServiceOrderTypes(serviceId).then(setOrderTypes)
    setOrderType('')
  }, [serviceId])

  const toggleWorker = (w: BrigadeWorker) => {
    const already = selected.find(s => s.userId === w.userId)
    if (already) {
      setSelected(prev => prev.filter(s => s.userId !== w.userId))
    } else {
      if (selected.length >= 3) return
      setSelected(prev => [...prev, {
        userId:   w.userId,
        name:     w.name,
        planId:   w.planId,
        planName: w.planName,
      }])
    }
  }

  const handleCreate = async () => {
    if (!title.trim()) { setError('Введите описание поручения'); return }
    setSaving(true); setError('')
    try {
      await createDirectiveWithWorkers(
        {
          title:        title.trim(),
          description:  description.trim() || null,
          priority,
          plan_id:      null,
          suspend_plan: false,
          service_id:   serviceId || null,
          order_type:   orderType || null,
          location:     location.trim() || null,
        },
        selected.map(s => ({
          worker_id:        s.userId,
          worker_name:      s.name,
          source_plan_id:   s.planId,
          source_plan_name: s.planName,
        })),
        session.user_id
      )
      onCreated()
    } catch {
      setError('Ошибка при сохранении')
    } finally {
      setSaving(false)
    }
  }

  const svc = SERVICES.find(s => s.id === serviceId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-3xl glass-popup rounded-2xl border border-white/12 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <span className="font-mono text-[13px] font-semibold tracking-widest uppercase text-white">
            {step === 1 ? 'Новое поручение — детали' : 'Выбор работников из бригад'}
          </span>
          <div className="flex items-center gap-4">
            {/* Step indicator */}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full transition-all ${step === 1 ? 'bg-amber-400 shadow-[0_0_6px_#fbbf24]' : 'bg-green-400'}`} />
              <span className="w-5 h-px bg-white/15" />
              <span className={`w-2 h-2 rounded-full transition-all ${step === 2 ? 'bg-amber-400 shadow-[0_0_6px_#fbbf24]' : 'bg-white/20'}`} />
              <span className="text-[10px] font-mono text-white/30 ml-1">Шаг {step}/2</span>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white text-xl transition-colors">✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">Служба</label>
                  <select
                    value={serviceId}
                    onChange={e => setServiceId(e.target.value)}
                    className="form-select w-full"
                  >
                    <option value="">— выберите службу —</option>
                    {SERVICES.map(s => (
                      <option key={s.id} value={s.id}>{s.em} {s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">Тип наряда</label>
                  <select
                    value={orderType}
                    onChange={e => setOrderType(e.target.value)}
                    disabled={!serviceId}
                    className="form-select w-full disabled:opacity-40"
                  >
                    <option value="">— выберите тип —</option>
                    {orderTypes.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">
                  Описание / заголовок <span className="text-red-400">*</span>
                </label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Напр.: Устранение утечки в секции Б-5"
                  className="form-input w-full"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">Объект / местоположение</label>
                  <input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Секция, тоннель, блок..."
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">Кто выдаёт</label>
                  <input value={session.full_name} disabled className="form-input w-full opacity-50" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">Подробности (необязательно)</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Дополнительные инструкции..."
                  className="form-input w-full resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-semibold uppercase tracking-widest text-white/40 mb-1.5 block">Приоритет</label>
                <div className="flex gap-2">
                  {(['NORMAL', 'URGENT', 'IMMEDIATE'] as const).map(p => {
                    const cfg = DIRECTIVE_PRIORITY_CONFIG[p]
                    const sel = priority === p
                    return (
                      <button
                        key={p}
                        onClick={() => setPriority(p)}
                        className="flex-1 py-2.5 rounded-xl text-sm border font-semibold transition-all"
                        style={sel
                          ? { color: cfg.color, borderColor: cfg.color + '60', background: cfg.color + '18' }
                          : { color: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }
                        }
                      >
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-[1fr_240px] gap-5 min-h-[360px]">
              {/* Brigade board */}
              <div>
                <div className="text-[10px] font-mono font-semibold uppercase tracking-widest text-white/30 mb-3">
                  Бригады на объектах — нажмите на работника чтобы вывести на поручение
                </div>
                {brigades.length === 0 ? (
                  <div className="text-center py-12 text-white/25 text-sm">
                    <div className="text-3xl mb-2">👷</div>
                    Нет активных бригад с назначенными работниками
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {brigades.map(brigade => {
                      const hasSelected = brigade.workers.some(w => selected.find(s => s.userId === w.userId))
                      return (
                        <div
                          key={brigade.planId}
                          className={`rounded-xl p-3 border transition-all ${
                            hasSelected
                              ? 'border-amber-500/30 bg-amber-500/[0.04]'
                              : 'border-white/8 bg-white/[0.03]'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-1.5">
                            <div className="text-xs font-medium text-white leading-snug">
                              {brigade.em} {brigade.planName}
                            </div>
                            {hasSelected && (
                              <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-px rounded uppercase">
                                выбраны ↓
                              </span>
                            )}
                          </div>
                          {brigade.foreman && (
                            <div className="text-[11px] text-white/30 mb-2">Мастер: {brigade.foreman}</div>
                          )}
                          <div className="flex flex-wrap gap-1.5">
                            {brigade.workers.map(w => {
                              const isSel     = !!selected.find(s => s.userId === w.userId)
                              const isPulled  = w.alreadyPulled
                              return (
                                <button
                                  key={w.userId}
                                  onClick={() => !isPulled && toggleWorker(w)}
                                  disabled={isPulled}
                                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition-all ${
                                    isPulled
                                      ? 'opacity-30 line-through cursor-not-allowed border-white/10 bg-white/5 text-white/40'
                                      : isSel
                                        ? 'border-amber-400 bg-amber-500/15 text-amber-300'
                                        : 'border-white/15 bg-white/[0.06] text-white/70 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-300'
                                  }`}
                                  title={isPulled ? 'Уже выведен на другое поручение' : undefined}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full transition-all ${isSel ? 'bg-amber-400' : 'bg-white/25'}`} />
                                  {w.name}
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

              {/* Staging area */}
              <div className="sticky top-0">
                <div className="text-[10px] font-mono font-semibold uppercase tracking-widest text-white/40 mb-2">
                  Назначить на поручение
                </div>
                <div className="border border-dashed border-white/15 rounded-xl p-3 min-h-[100px] mb-3">
                  {selected.length === 0 ? (
                    <div className="text-center py-5 text-white/25 text-xs italic leading-relaxed">
                      Нажмите на работника в бригаде чтобы добавить
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selected.map(s => (
                        <div key={s.userId} className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-500/12 border border-amber-500/25">
                          <div>
                            <div className="text-xs font-medium text-amber-300">{s.name}</div>
                            <div className="text-[10px] text-white/35 mt-0.5">из: {s.planName}</div>
                          </div>
                          <button
                            onClick={() => setSelected(prev => prev.filter(p => p.userId !== s.userId))}
                            className="text-white/25 hover:text-red-400 transition-colors text-sm leading-none ml-2"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-white/25 leading-relaxed mb-4">
                  Выберите 1–3 работников. После создания они будут выведены из своих бригад — мастера получат уведомление.
                </div>

                {/* Order preview */}
                <div className="bg-white/[0.04] border border-white/8 rounded-xl p-3">
                  <div className="text-[9px] font-mono text-white/25 tracking-widest mb-2">ПОРУЧЕНИЕ</div>
                  <div className="text-xs font-medium text-white mb-1 leading-snug">{title || '—'}</div>
                  {location && <div className="text-[11px] text-white/40">📍 {location}</div>}
                  {svc && (
                    <div className="text-[10px] font-mono text-white/25 mt-1.5">
                      {svc.em} {svc.id}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-xs">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/8">
          <button
            onClick={() => step === 1 ? onClose() : setStep(1)}
            className="px-4 py-2 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 text-sm transition-all"
          >
            {step === 1 ? 'Отмена' : '← Назад'}
          </button>
          {step === 1 ? (
            <button
              onClick={() => { if (!title.trim()) { setError('Введите описание поручения'); return }; setError(''); setStep(2) }}
              className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition-all"
            >
              Далее: выбрать работников →
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black text-sm font-bold transition-all"
            >
              {saving ? 'Создаём...' : `✓ Создать поручение${selected.length > 0 ? ` (${selected.length})` : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Detail modal ─────────────────────────────────────────────────────────────
function DirectiveDetailModal({
  directive: d, onClose, onDone,
}: {
  directive: DirectiveWithWorkers
  onClose:   () => void
  onDone:    () => void
}) {
  const prCfg  = DIRECTIVE_PRIORITY_CONFIG[d.priority]
  const stCfg  = DIRECTIVE_STATUS_CONFIG[d.status]
  const svc    = SERVICES.find(s => s.id === d.service_id)
  const dt     = new Date(d.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg glass-popup rounded-2xl border border-white/12 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <span className="font-mono text-[12px] font-semibold tracking-widest uppercase text-white">Поручение</span>
          <button onClick={onClose} className="text-white/30 hover:text-white text-xl">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[11px] px-2 py-1 rounded-full border font-semibold"
              style={{ color: prCfg.color, borderColor: prCfg.color + '50', background: prCfg.color + '18' }}
            >
              {prCfg.label}
            </span>
            <span
              className="text-[11px] px-2 py-1 rounded-full border"
              style={{ color: stCfg.color, borderColor: stCfg.color + '40' }}
            >
              {stCfg.label}
            </span>
          </div>

          <div>
            <div className="text-base font-semibold text-white mb-1">{d.title}</div>
            {d.order_type && <div className="text-sm text-white/40 italic">{d.order_type}</div>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {svc && (
              <div className="bg-white/[0.04] rounded-xl px-4 py-3">
                <div className="text-[9px] font-mono text-white/25 tracking-widest mb-1">СЛУЖБА</div>
                <div className="text-sm text-white">{svc.em} {svc.name}</div>
              </div>
            )}
            <div className="bg-white/[0.04] rounded-xl px-4 py-3">
              <div className="text-[9px] font-mono text-white/25 tracking-widest mb-1">СОЗДАНО</div>
              <div className="text-sm text-white">{dt}</div>
            </div>
            {d.location && (
              <div className="bg-white/[0.04] rounded-xl px-4 py-3 col-span-2">
                <div className="text-[9px] font-mono text-white/25 tracking-widest mb-1">ОБЪЕКТ</div>
                <div className="text-sm text-white">📍 {d.location}</div>
              </div>
            )}
            {d.description && (
              <div className="bg-white/[0.04] rounded-xl px-4 py-3 col-span-2">
                <div className="text-[9px] font-mono text-white/25 tracking-widest mb-1">ОПИСАНИЕ</div>
                <div className="text-sm text-white/70">{d.description}</div>
              </div>
            )}
          </div>

          {d.workers.length > 0 && (
            <div>
              <div className="text-[9px] font-mono text-white/25 tracking-widest mb-2">НАЗНАЧЕННЫЕ РАБОТНИКИ</div>
              <div className="space-y-2">
                {d.workers.map(w => (
                  <div key={w.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div>
                      <div className="text-sm font-medium text-amber-300">{w.worker_name}</div>
                      <div className="text-xs text-white/35 mt-0.5">Выведен из: {w.source_plan_name ?? '—'}</div>
                    </div>
                    <span
                      className="text-[10px] px-2 py-1 rounded-full border"
                      style={{ color: stCfg.color, borderColor: stCfg.color + '40' }}
                    >
                      {stCfg.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 text-sm transition-all">
            Закрыть
          </button>
          {!['DONE','CANCELLED'].includes(d.status) && (
            <button onClick={onDone} className="flex-1 py-2.5 rounded-xl bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600/35 text-sm font-medium transition-all">
              ✓ Завершить поручение
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
