'use client'
// UrgentOrders — the single mechanism for «срочное поручение сверху».
// One entry point, one 3-step wizard: ① что и от кого, ② кого снимаем (вся бригада
// ⇄ поимённо) + сборка состава нового задания, ③ судьба исходного плана.
// Replaces the old Fast Track (OverrideModal) and Поручения (UrgentOrdersPanel).

import { useState, useEffect, useCallback } from 'react'
import {
  fetchUrgentOrders, fetchWorkPlans, fetchWorkPlansWithItems,
  fetchWorkAssignmentsForItems, fetchServiceOrderTypes, fetchPulledWorkerIds,
  createUrgentOrder, updateUrgentOrderStatus,
} from '@/lib/api-client'
import type {
  AuthSession, WorkPlanWithItems, UrgentOrderWithWorkers, UrgentOrderCrewMember,
  UrgentOrderFate, UrgentOrderPullMode, DirectivePriority, WorkSource, JournalPeriod,
} from '@/types'
import {
  DIRECTIVE_PRIORITY_CONFIG, WORK_SOURCE_CONFIG, SERVICE_META,
} from '@/types'
import { useConfirm } from '@/components/ConfirmDialog'
import WorkerPicker from '@/components/journal/WorkerPicker'
import { SERVICES } from '@/components/journal/data'

const FATE_LABELS: Record<UrgentOrderFate, { label: string; desc: string; color: string }> = {
  REASSIGN: { label: 'Переназначить другую бригаду', desc: 'Срочно выслать замену — алерт мастеру', color: '#fb923c' },
  POSTPONE: { label: 'Отложить план', desc: 'Заморозить до указанной даты', color: '#60a5fa' },
  CANCEL:   { label: 'Отменить план', desc: 'Работы в этот период не будут выполнены', color: '#f87171' },
  WEAKENED: { label: 'Продолжить ослабленной', desc: 'План идёт оставшимся составом', color: '#a3a3a3' },
}

interface BrigadeWorker { userId: string; name: string; planId: string; planName: string; alreadyPulled: boolean }
interface BrigadeSlot { planId: string; planName: string; service: string; em: string; foreman?: string; workers: BrigadeWorker[] }

const todayISO = () => new Date().toISOString().split('T')[0]

export default function UrgentOrders({ session }: { session: AuthSession }) {
  const [orders,    setOrders]    = useState<UrgentOrderWithWorkers[]>([])
  const [brigades,  setBrigades]  = useState<BrigadeSlot[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const notify = useConfirm()

  const load = useCallback(async () => {
    const [ords, rawPlans, pulled] = await Promise.all([
      fetchUrgentOrders(),
      fetchWorkPlans({ statuses: ['ASSIGNED', 'IN_PROGRESS', 'BOSS_CONFIRMED'] }),
      fetchPulledWorkerIds(todayISO()),
    ])
    setOrders(ords)
    const pulledSet = new Set(pulled)

    const withItems = await fetchWorkPlansWithItems(rawPlans.map(p => p.id))
    const allItemIds = withItems.flatMap(p => (p?.items ?? []).map(i => i.id))
    const assignments = allItemIds.length > 0 ? await fetchWorkAssignmentsForItems(allItemIds) : []

    const slots: BrigadeSlot[] = withItems
      .filter((p): p is WorkPlanWithItems => !!p)
      .map(plan => {
        const meta = SERVICE_META[plan.service_id] ?? { emoji: '🔧' }
        const planItemIds = plan.items.map(i => i.id)
        const planAssignments = assignments.filter(a => planItemIds.includes(a.plan_item_id))
        const uniq = new Map<string, BrigadeWorker>()
        planAssignments.forEach(a => {
          if (!a.user || uniq.has(a.user.user_id)) return
          uniq.set(a.user.user_id, {
            userId: a.user.user_id, name: a.user.full_name, planId: plan.id,
            planName: plan.items[0]?.location ?? `${meta.emoji} ${plan.plan_date}`,
            alreadyPulled: pulledSet.has(a.user.user_id),
          })
        })
        const foreman = planAssignments.find(a => a.role === 'MASTER' || a.role === 'BRIGADIER')?.user?.full_name
        return {
          planId: plan.id, planName: plan.items[0]?.location ?? `${meta.emoji} план`,
          service: plan.service_id, em: meta.emoji, foreman, workers: Array.from(uniq.values()),
        }
      })
      .filter(s => s.workers.length > 0)

    setBrigades(slots)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const active   = orders.filter(o => o.status === 'ACTIVE')
  const archived = orders.filter(o => o.status !== 'ACTIVE')
  const pulledToday = new Set(active.flatMap(o => o.workers.map(w => w.worker_id).filter(Boolean))).size

  const markDone = async (id: string) => {
    try { await updateUrgentOrderStatus(id, 'DONE'); await load() }
    catch (e) { await notify(e instanceof Error ? e.message : 'Ошибка', { alert: true }) }
  }

  if (loading) return <div className="text-center text-white/30 py-12 text-sm">Загрузка поручений…</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-pulse" />
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Срочные поручения сверху</h3>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition-all">
          <span className="text-base leading-none">⚡</span> Срочное поручение
        </button>
      </div>

      <div className="flex border border-white/[0.07] rounded-lg overflow-hidden">
        {[
          { val: active.length, lbl: 'Активных', cls: 'text-amber-400' },
          { val: archived.filter(o => o.status === 'DONE').length, lbl: 'Выполнено', cls: 'text-green-400' },
          { val: pulledToday, lbl: 'Снято работников', cls: 'text-red-400' },
          { val: new Set(active.flatMap(o => o.workers.map(w => w.source_plan_id).filter(Boolean))).size, lbl: 'Бригады ослаблены', cls: 'text-white/50' },
        ].map((s, i) => (
          <div key={i} className="flex-1 px-4 py-3 bg-white/[0.03] border-r border-white/[0.07] last:border-r-0 flex items-center gap-3">
            <span className={`font-mono text-xl font-semibold ${s.cls}`}>{s.val}</span>
            <span className="text-xs text-white/40 leading-tight">{s.lbl}</span>
          </div>
        ))}
      </div>

      {active.length > 0 ? (
        <div className="space-y-2">{active.map(o => <OrderRow key={o.id} order={o} onDone={() => markDone(o.id)} />)}</div>
      ) : (
        <div className="text-center py-10 text-white/20 text-sm"><div className="text-3xl mb-2">⚡</div>Поручений на сегодня нет</div>
      )}

      {pulledToday > 0 && <WeakenedBrigades active={active} />}

      {archived.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs text-white/30 hover:text-white/50 py-1 select-none">История · {archived.length} ▼</summary>
          <div className="space-y-2 mt-2 opacity-50">{archived.map(o => <OrderRow key={o.id} order={o} />)}</div>
        </details>
      )}

      {showCreate && (
        <UrgentOrderWizard
          session={session} brigades={brigades}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
        />
      )}
    </div>
  )
}

// ─── Order row ────────────────────────────────────────────────────────────────
function OrderRow({ order: o, onDone }: { order: UrgentOrderWithWorkers; onDone?: () => void }) {
  const pr  = DIRECTIVE_PRIORITY_CONFIG[o.priority]
  const src = WORK_SOURCE_CONFIG[o.source]
  const svc = SERVICES.find(s => s.id === o.service_id)
  const dt  = new Date(o.created_at).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const border = o.priority === 'IMMEDIATE' ? 'border-l-red-500' : o.priority === 'URGENT' ? 'border-l-amber-500' : 'border-l-white/15'

  return (
    <div className={`glass rounded-xl p-4 border border-white/[0.08] border-l-4 ${border}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-medium text-white text-sm">{o.work_text}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full border font-semibold" style={{ color: pr.color, borderColor: pr.color + '50', background: pr.color + '18' }}>{pr.label}</span>
            {src && <span className="text-[10px] px-1.5 py-0.5 rounded-full border" style={{ color: src.color, borderColor: src.color + '40' }}>{src.emoji} {src.label}{o.source_ref ? ` №${o.source_ref}` : ''}</span>}
          </div>
          {o.order_type && <div className="text-xs text-white/35 italic mb-1">{o.order_type}</div>}
          <div className="flex items-center gap-3 text-[11px] text-white/30 flex-wrap">
            {svc && <span>{svc.em} {svc.name}</span>}
            {o.location && <span>📍 {o.location}</span>}
            <span>🕐 {dt}</span>
          </div>
          {o.workers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {o.workers.map(w => (
                <span key={w.id} className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/12 border border-amber-500/25 text-amber-300">{w.worker_name}</span>
              ))}
            </div>
          )}
        </div>
        {onDone && (
          <button onClick={onDone} className="shrink-0 px-3 py-1.5 rounded-lg bg-green-600/20 border border-green-500/30 text-green-400 text-xs hover:bg-green-600/35 transition-all">✓ Готово</button>
        )}
      </div>
    </div>
  )
}

// ─── Weakened brigades ──────────────────────────────────────────────────────
function WeakenedBrigades({ active }: { active: UrgentOrderWithWorkers[] }) {
  const byPlan = new Map<string, { name: string; workers: string[] }>()
  active.forEach(o => o.workers.forEach(w => {
    if (!w.source_plan_id) return
    const cur = byPlan.get(w.source_plan_id) ?? { name: w.source_plan_name ?? 'Бригада', workers: [] }
    cur.workers.push(w.worker_name)
    byPlan.set(w.source_plan_id, cur)
  }))
  if (byPlan.size === 0) return null
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-amber-400 text-xs font-mono font-bold uppercase tracking-wider">⚠ Ослабленные бригады</span>
        <span className="text-xs text-white/30">— из них сняты работники на поручения</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {[...byPlan.entries()].map(([id, slot]) => (
          <div key={id} className="bg-white/[0.04] border border-amber-500/20 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-white">{slot.name}</span>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded">-{slot.workers.length} чел.</span>
            </div>
            <div className="space-y-1">
              {slot.workers.map(n => (
                <div key={n} className="flex items-center gap-1.5 text-xs">
                  <span className="text-white/30 line-through">{n}</span>
                  <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1 py-px rounded uppercase">снят</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Wizard ──────────────────────────────────────────────────────────────────
function UrgentOrderWizard({
  session, brigades, onClose, onCreated,
}: {
  session: AuthSession
  brigades: BrigadeSlot[]
  onClose: () => void
  onCreated: () => void
}) {
  const notify = useConfirm()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [saving, setSaving] = useState(false)

  // ① что и от кого
  const [source, setSource]       = useState<WorkSource>('MAYOR')
  const [sourceRef, setSourceRef] = useState('')
  const [sourceOrg, setSourceOrg] = useState('')
  const [serviceId, setServiceId] = useState(session.service_id ?? '')
  const [orderType, setOrderType] = useState('')
  const [orderTypes, setOrderTypes] = useState<{ id: string; name: string }[]>([])
  const [workText, setWorkText]   = useState('')
  const [location, setLocation]   = useState('')
  const [shiftType, setShiftType] = useState<JournalPeriod>('DAY')
  const [priority, setPriority]   = useState<DirectivePriority>('URGENT')

  // ② кого снимаем + состав
  const [pullMode, setPullMode] = useState<UrgentOrderPullMode>('NAMED')
  const [crew, setCrew] = useState<UrgentOrderCrewMember[]>([])

  // ③ судьба плана
  const [fate, setFate] = useState<UrgentOrderFate>('WEAKENED')
  const [suspendedUntil, setSuspendedUntil] = useState('')

  useEffect(() => {
    if (!serviceId) { setOrderTypes([]); return }
    fetchServiceOrderTypes(serviceId).then(ts => setOrderTypes(ts.map(t => ({ id: t.id, name: t.name }))))
    setOrderType('')
  }, [serviceId])

  // Distinct source plans among pulled crew → the affected plan(s).
  const sourcePlanIds = [...new Set(crew.map(c => c.sourcePlanId).filter((x): x is string => !!x))]
  const affectedPlanId = sourcePlanIds.length === 1 ? sourcePlanIds[0] : null
  const planAffected = sourcePlanIds.length > 0

  // Smart default fate when entering step 3.
  useEffect(() => {
    if (step === 3) setFate(pullMode === 'BRIGADE' ? 'REASSIGN' : 'WEAKENED')
  }, [step, pullMode])

  const inCrew = (userId: string) => crew.some(c => c.workerId === userId)
  const toggleWorker = (w: BrigadeWorker) => {
    if (w.alreadyPulled) return
    setCrew(prev => inCrew(w.userId)
      ? prev.filter(c => c.workerId !== w.userId)
      : [...prev, { workerId: w.userId, workerName: w.name, role: 'WORKER', sourcePlanId: w.planId, sourcePlanName: w.planName }])
  }
  const addBrigade = (b: BrigadeSlot) => {
    const additions = b.workers.filter(w => !w.alreadyPulled && !inCrew(w.userId))
      .map(w => ({ workerId: w.userId, workerName: w.name, role: 'WORKER' as const, sourcePlanId: b.planId, sourcePlanName: b.planName }))
    setCrew(prev => [...prev, ...additions])
  }
  const removeCrew = (idx: number) => setCrew(prev => prev.filter((_, i) => i !== idx))

  // Free additions from the service roster (not pulled off a brigade).
  const freeNames = crew.filter(c => !c.sourcePlanId).map(c => ({ user_id: c.workerId, name: c.workerName, role: c.role ?? 'WORKER' }))
  const setFreeNames = (list: { user_id: string | null; name: string; role: 'WORKER' | 'BRIGADIER' | 'MASTER' | 'ITR' | 'DRIVER' }[]) =>
    setCrew(prev => [
      ...prev.filter(c => c.sourcePlanId),
      ...list.map(n => ({ workerId: n.user_id, workerName: n.name, role: n.role, sourcePlanId: null, sourcePlanName: null })),
    ])

  const step1Valid = !!source && !!workText.trim() && !!serviceId
  const step3Valid = !planAffected || fate !== 'POSTPONE' || !!suspendedUntil

  const submit = async () => {
    setSaving(true)
    try {
      await createUrgentOrder({
        source, sourceRef: sourceRef.trim() || null, sourceOrg: sourceOrg.trim() || null,
        priority, serviceId: serviceId || null, orderType: orderType || null,
        location: location.trim() || null, workText: workText.trim(),
        planDate: todayISO(), shiftType, pullMode,
        affectedPlanId, fate: planAffected ? fate : null,
        suspendedUntil: fate === 'POSTPONE' ? (suspendedUntil || null) : null,
        partialWorkDone: null, crew, createdBy: session.user_id,
      })
      onCreated()
    } catch (e) {
      await notify(e instanceof Error ? e.message : 'Не удалось создать поручение', { alert: true })
    } finally {
      setSaving(false)
    }
  }

  const next = () => {
    if (step === 1 && !step1Valid) return
    // Skip fate step entirely when no plan is affected (free crew only).
    if (step === 2 && !planAffected) { submit(); return }
    setStep((step + 1) as 1 | 2 | 3)
  }

  const srcCfg = WORK_SOURCE_CONFIG[source]
  const lbl = 'text-[10px] font-mono font-semibold uppercase tracking-widest text-white/40 mb-1.5 block'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-3xl glass-popup rounded-2xl border border-amber-500/25 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        <div className="px-6 py-4 bg-amber-500/[0.07] border-b border-amber-500/15 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <div className="font-bold text-white">Срочное поручение сверху</div>
              <div className="text-xs text-white/50">Единый механизм — переформирование бригад</div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white text-xl">✕</button>
        </div>

        <div className="flex border-b border-white/5">
          {(['Что и от кого', 'Кого снимаем', 'Судьба плана'] as const).map((l, i) => (
            <div key={i} className={`flex-1 py-2.5 text-center text-xs font-medium ${step === i + 1 ? 'text-amber-400 border-b-2 border-amber-400' : 'text-white/30'}`}>{i + 1}. {l}</div>
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className={lbl}>Источник поручения</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.entries(WORK_SOURCE_CONFIG) as [WorkSource, typeof WORK_SOURCE_CONFIG[WorkSource]][]).map(([key, cfg]) => (
                    <button key={key} onClick={() => setSource(key)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${source === key ? 'border-current' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                      style={source === key ? { color: cfg.color, background: cfg.color + '18' } : {}}>
                      <div className="text-base mb-0.5">{cfg.emoji}</div>
                      <div className="text-[11px] font-medium text-white">{cfg.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>№ поручения / письма</label><input value={sourceRef} onChange={e => setSourceRef(e.target.value)} placeholder="№ или пометка" className="form-input w-full text-sm" /></div>
                <div><label className={lbl}>Организация</label><input value={sourceOrg} onChange={e => setSourceOrg(e.target.value)} placeholder="Кто выдал" className="form-input w-full text-sm" /></div>
              </div>
              <div><label className={lbl}>Суть работ <span className="text-red-400">*</span></label>
                <textarea value={workText} onChange={e => setWorkText(e.target.value)} rows={2} placeholder="Что необходимо выполнить…" className="form-input w-full text-sm resize-none" autoFocus /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Служба <span className="text-red-400">*</span></label>
                  <select value={serviceId} onChange={e => setServiceId(e.target.value)} className="form-select w-full text-sm">
                    <option value="">— выберите —</option>
                    {SERVICES.map(s => <option key={s.id} value={s.id}>{s.em} {s.name}</option>)}
                  </select></div>
                <div><label className={lbl}>Тип наряда</label>
                  <select value={orderType} onChange={e => setOrderType(e.target.value)} disabled={!serviceId} className="form-select w-full text-sm disabled:opacity-40">
                    <option value="">— выберите —</option>
                    {orderTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Объект / место</label><input value={location} onChange={e => setLocation(e.target.value)} placeholder="Адрес, км, объект" className="form-input w-full text-sm" /></div>
                <div><label className={lbl}>Смена</label>
                  <div className="flex gap-1.5">
                    {(['DAY', 'NIGHT', 'AROUND'] as JournalPeriod[]).map(st => (
                      <button key={st} onClick={() => setShiftType(st)} className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${shiftType === st ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-white/5 text-white/40 border-white/10'}`}>
                        {st === 'DAY' ? '☀️ День' : st === 'NIGHT' ? '🌙 Ночь' : '🌗 Сутки'}
                      </button>
                    ))}
                  </div></div>
              </div>
              <div><label className={lbl}>Приоритет</label>
                <div className="flex gap-2">
                  {(['NORMAL', 'URGENT', 'IMMEDIATE'] as const).map(p => {
                    const cfg = DIRECTIVE_PRIORITY_CONFIG[p]; const sel = priority === p
                    return <button key={p} onClick={() => setPriority(p)} className="flex-1 py-2.5 rounded-xl text-sm border font-semibold transition-all"
                      style={sel ? { color: cfg.color, borderColor: cfg.color + '60', background: cfg.color + '18' } : { color: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.08)' }}>{cfg.label}</button>
                  })}
                </div></div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {/* Mode toggle */}
              <div className="flex gap-2">
                {([['NAMED', '👤 Поимённо'], ['BRIGADE', '👥 Вся бригада']] as [UrgentOrderPullMode, string][]).map(([m, l]) => (
                  <button key={m} onClick={() => setPullMode(m)} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${pullMode === m ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-white/5 text-white/40 border-white/10'}`}>{l}</button>
                ))}
              </div>

              <div className="grid grid-cols-[1fr_240px] gap-5">
                <div>
                  <div className={lbl}>{pullMode === 'BRIGADE' ? 'Нажмите на бригаду — снимутся все' : 'Нажмите на работника, чтобы снять на поручение'}</div>
                  {brigades.length === 0 ? (
                    <div className="text-center py-10 text-white/25 text-sm"><div className="text-3xl mb-2">👷</div>Нет активных бригад</div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {brigades.map(b => {
                        const has = b.workers.some(w => inCrew(w.userId))
                        return (
                          <div key={b.planId} className={`rounded-xl p-3 border transition-all ${has ? 'border-amber-500/30 bg-amber-500/[0.04]' : 'border-white/[0.08] bg-white/[0.03]'}`}>
                            <button disabled={pullMode !== 'BRIGADE'} onClick={() => addBrigade(b)}
                              className={`flex items-start justify-between w-full mb-1.5 text-left ${pullMode === 'BRIGADE' ? 'hover:text-amber-300' : ''}`}>
                              <span className="text-xs font-medium text-white leading-snug">{b.em} {b.planName}</span>
                              {pullMode === 'BRIGADE' && <span className="text-[9px] text-amber-400">снять всех ↓</span>}
                            </button>
                            {b.foreman && <div className="text-[11px] text-white/30 mb-2">Мастер: {b.foreman}</div>}
                            <div className="flex flex-wrap gap-1.5">
                              {b.workers.map(w => {
                                const sel = inCrew(w.userId)
                                return (
                                  <button key={w.userId} onClick={() => toggleWorker(w)} disabled={w.alreadyPulled}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition-all ${
                                      w.alreadyPulled ? 'opacity-30 line-through cursor-not-allowed border-white/10 bg-white/5 text-white/40'
                                      : sel ? 'border-amber-400 bg-amber-500/15 text-amber-300'
                                      : 'border-white/15 bg-white/[0.06] text-white/70 hover:border-amber-500/40 hover:text-amber-300'}`}
                                    title={w.alreadyPulled ? 'Уже снят на другое поручение' : undefined}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${sel ? 'bg-amber-400' : 'bg-white/25'}`} />{w.name}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {serviceId && (
                    <div className="mt-3">
                      <div className={lbl}>+ свободные сотрудники службы (не из бригад)</div>
                      <WorkerPicker serviceId={serviceId} date={todayISO()} value={freeNames} onChange={setFreeNames} />
                    </div>
                  )}
                </div>

                <div>
                  <div className={lbl}>Состав нового задания · {crew.length}</div>
                  <div className="border border-dashed border-white/15 rounded-xl p-3 min-h-[100px]">
                    {crew.length === 0 ? (
                      <div className="text-center py-5 text-white/25 text-xs italic">Снимите работников или добавьте свободных</div>
                    ) : (
                      <div className="space-y-2">
                        {crew.map((c, i) => (
                          <div key={`${c.workerId ?? 'h'}-${i}`} className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-500/12 border border-amber-500/25">
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-amber-300 truncate">{c.workerName}</div>
                              <div className="text-[10px] text-white/35 mt-0.5 truncate">{c.sourcePlanName ? `из: ${c.sourcePlanName}` : 'свободный'}</div>
                            </div>
                            <button onClick={() => removeCrew(i)} className="text-white/25 hover:text-red-400 text-sm ml-2">×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {planAffected ? (
                <>
                  <div className={lbl}>Что делать с исходным планом{affectedPlanId ? '' : ' (затронуто несколько — применится к каждому)'}?</div>
                  <div className="space-y-2">
                    {(Object.keys(FATE_LABELS) as UrgentOrderFate[]).map(f => {
                      const o = FATE_LABELS[f]; const sel = fate === f
                      return (
                        <button key={f} onClick={() => setFate(f)} className="w-full p-3 rounded-xl border text-left transition-all"
                          style={sel ? { borderColor: o.color + '80', background: o.color + '14' } : { borderColor: 'rgba(255,255,255,0.1)' }}>
                          <div className="text-sm font-medium text-white">{o.label}</div>
                          <div className="text-xs text-white/40 mt-0.5">{o.desc}</div>
                        </button>
                      )
                    })}
                  </div>
                  {fate === 'POSTPONE' && (
                    <div><label className={lbl}>Возобновить не ранее</label>
                      <input type="date" value={suspendedUntil} onChange={e => setSuspendedUntil(e.target.value)} className="form-input text-sm w-48" /></div>
                  )}
                </>
              ) : (
                <div className="py-8 text-center"><div className="text-3xl mb-3">✓</div>
                  <div className="text-white font-medium">Свободный состав — план снимать не нужно</div>
                  <div className="text-sm text-white/40 mt-1">Поручение будет создано со своей бригадой</div></div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/8 flex items-center justify-between">
          <button onClick={() => step > 1 ? setStep((step - 1) as 1 | 2 | 3) : onClose()} className="px-4 py-2 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 text-sm">
            {step === 1 ? 'Отмена' : '← Назад'}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded-full border" style={{ color: srcCfg.color, borderColor: srcCfg.color + '40' }}>{srcCfg.emoji} {srcCfg.label}</span>
            {step < 3 && !(step === 2 && !planAffected) ? (
              <button onClick={next} disabled={step === 1 ? !step1Valid : false} className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black text-sm font-bold">Далее →</button>
            ) : (
              <button onClick={submit} disabled={saving || !step3Valid} className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black text-sm font-bold">{saving ? 'Создаём…' : '⚡ Создать поручение'}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
