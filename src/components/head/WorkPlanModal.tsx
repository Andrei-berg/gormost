'use client'
import { useState, useEffect, useCallback } from 'react'
import { createWorkPlan, createWorkPlanItem, createCrossServiceRequest, fetchUsers } from '@/lib/api'
import type { WorkPlan, AuthSession, ShiftType, User } from '@/types'
import { SERVICE_META } from '@/types'

// ── Shift slot helpers ─────────────────────────────────────────────────────

interface SlotOption {
  date: string
  shift: ShiftType
  label: string
  shortLabel: string
}

function getPlanOptions(existing: WorkPlan[]): SlotOption[] {
  const taken = new Set(existing.map(p => `${p.plan_date}_${p.shift_type}`))
  const options: SlotOption[] = []
  const today = new Date()
  const dow = today.getDay()
  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

  const add = (offset: number, shift: ShiftType) => {
    const d = new Date(today)
    d.setDate(d.getDate() + offset)
    const dateStr = d.toISOString().split('T')[0]
    if (taken.has(`${dateStr}_${shift}`)) return
    const dd = d.getDate().toString().padStart(2, '0')
    const mm = (d.getMonth() + 1).toString().padStart(2, '0')
    const dayName = dayNames[d.getDay()]
    const isDay = shift === 'DAY'
    options.push({
      date: dateStr,
      shift,
      label: `${dayName} ${dd}.${mm} · ${isDay ? '☀️ 07:30–19:00' : '🌙 19:00–07:00'}`,
      shortLabel: `${isDay ? '☀️' : '🌙'} ${dd}.${mm}`,
    })
  }

  add(0, 'NIGHT')
  add(1, 'DAY'); add(1, 'NIGHT')
  if (dow === 5) { add(2, 'DAY'); add(2, 'NIGHT'); add(3, 'DAY'); add(3, 'NIGHT') }

  return options
}

function getDeadlineCountdown(): { label: string; passed: boolean } {
  const now = new Date()
  const deadline = new Date(now)
  deadline.setHours(16, 0, 0, 0)
  if (now >= deadline) return { label: 'Срок истёк', passed: true }
  const diff = deadline.getTime() - now.getTime()
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const label = h > 0 ? `${h}ч ${m}м` : `${m} мин`
  return { label, passed: false }
}

// ── Draft item types ───────────────────────────────────────────────────────

interface CrossServiceDraft {
  to_service_id: string
  description: string
  needed_count: number
  time_start: string
  time_end: string
}

interface DraftItem {
  _id: string
  location: string
  work_description: string
  time_start: string
  time_end: string
  required_workers: number
  required_brigadiers: number
  required_masters: number
  required_foremen: number
  required_vehicles: number
  named_workers: string[]
  cross_service: CrossServiceDraft | null
  showNamed: boolean
  showCross: boolean
}

function emptyItem(): DraftItem {
  return {
    _id: Math.random().toString(36).slice(2),
    location: '',
    work_description: '',
    time_start: '07:30',
    time_end: '16:00',
    required_workers: 2,
    required_brigadiers: 1,
    required_masters: 1,
    required_foremen: 0,
    required_vehicles: 0,
    named_workers: [],
    cross_service: null,
    showNamed: false,
    showCross: false,
  }
}

const ALL_SERVICES = Object.entries(SERVICE_META).map(([id]) => id)

const SERVICE_NAMES: Record<string, string> = {
  'SRV-ENG':  'Инженерные системы',
  'SRV-STR':  'Строительная служба',
  'SRV-FIRE': 'Пожарная безопасность',
  'SRV-VENT': 'Вентиляция',
  'SRV-CCTV': 'Видеонаблюдение',
}

// ── Main component ─────────────────────────────────────────────────────────

interface Props {
  session: AuthSession
  existingPlans: WorkPlan[]
  onClose: () => void
  onSaved: () => void
}

export default function WorkPlanModal({ session, existingPlans, onClose, onSaved }: Props) {
  const options = getPlanOptions(existingPlans)
  const [selected, setSelected] = useState(options[0] ? `${options[0].date}_${options[0].shift}` : '')
  const [items, setItems] = useState<DraftItem[]>([emptyItem()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serviceUsers, setServiceUsers] = useState<User[]>([])
  const [countdown, setCountdown] = useState(getDeadlineCountdown())

  useEffect(() => {
    const t = setInterval(() => setCountdown(getDeadlineCountdown()), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    fetchUsers(true).then(all => {
      setServiceUsers(all.filter(u => u.service_id === session.service_id))
    })
  }, [session.service_id])

  const updateItem = useCallback((id: string, patch: Partial<DraftItem>) => {
    setItems(prev => prev.map(it => it._id === id ? { ...it, ...patch } : it))
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(it => it._id !== id))
  }, [])

  const addNamedWorker = useCallback((itemId: string, name: string) => {
    if (!name.trim()) return
    setItems(prev => prev.map(it =>
      it._id === itemId && !it.named_workers.includes(name)
        ? { ...it, named_workers: [...it.named_workers, name] }
        : it
    ))
  }, [])

  const removeNamedWorker = useCallback((itemId: string, name: string) => {
    setItems(prev => prev.map(it =>
      it._id === itemId ? { ...it, named_workers: it.named_workers.filter(w => w !== name) } : it
    ))
  }, [])

  const handleCreate = async () => {
    if (!selected) return
    if (!session.service_id) {
      setError('У вашего аккаунта не указана служба. Назначьте в Админ-панели.')
      return
    }
    const filledItems = items.filter(it => it.location.trim() || it.work_description.trim())
    setError(null)
    setSaving(true)
    try {
      const [date, shift] = selected.split('_') as [string, ShiftType]
      const plan = await createWorkPlan(
        { service_id: session.service_id, plan_date: date, shift_type: shift },
        session.user_id
      )
      if (!plan) throw new Error('Не удалось создать план')

      for (let i = 0; i < filledItems.length; i++) {
        const it = filledItems[i]
        const item = await createWorkPlanItem({
          plan_id: plan.id,
          location: it.location.trim() || '—',
          work_description: it.work_description.trim() || '—',
          time_start: it.time_start || null,
          time_end: it.time_end || null,
          sort_order: i,
          notes: null,
          workers: it.named_workers,
          required_workers: it.required_workers,
          required_brigadiers: it.required_brigadiers,
          required_masters: it.required_masters,
          required_foremen: it.required_foremen,
          required_vehicles: it.required_vehicles,
          required_vehicle_types: [],
          is_redirected: false,
          redirect_reason: null,
        })
        if (item && it.cross_service) {
          await createCrossServiceRequest({
            from_plan_item_id: item.id,
            from_plan_id: plan.id,
            from_service_id: session.service_id,
            to_service_id: it.cross_service.to_service_id,
            description: it.cross_service.description,
            needed_count: it.cross_service.needed_count,
            time_start: it.cross_service.time_start || null,
            time_end: it.cross_service.time_end || null,
            created_by: session.user_id,
          })
        }
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка при создании плана')
    } finally {
      setSaving(false)
    }
  }

  const otherServices = ALL_SERVICES.filter(id => id !== session.service_id)
  const serviceMeta = session.service_id ? SERVICE_META[session.service_id] : null
  const filledCount = items.filter(it => it.location.trim() || it.work_description.trim()).length

  // Totals
  const totalWorkers    = items.reduce((s, it) => s + it.required_workers, 0)
  const totalBrigadiers = items.reduce((s, it) => s + it.required_brigadiers, 0)
  const totalMasters    = items.reduce((s, it) => s + it.required_masters, 0)
  const totalForemen    = items.reduce((s, it) => s + it.required_foremen, 0)
  const totalVehicles   = items.reduce((s, it) => s + it.required_vehicles, 0)

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[999] flex items-start justify-center p-3 pt-4 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="glass-strong rounded-2xl w-full max-w-3xl border border-white/10 shadow-2xl flex flex-col mb-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{serviceMeta?.emoji ?? '📋'}</span>
              <span className="text-white font-semibold text-sm">Новый план работ</span>
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              countdown.passed
                ? 'bg-red-500/20 border-red-500/30 text-red-400'
                : 'bg-amber-500/15 border-amber-500/25 text-amber-400'
            }`}>
              ⏰ {countdown.passed ? 'Срок истёк' : `до 16:00 · ${countdown.label}`}
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all text-lg leading-none">✕</button>
        </div>

        {/* ── Shift selector ── */}
        <div className="px-5 py-3 border-b border-white/10">
          <div className="text-[10px] text-white/35 uppercase tracking-widest mb-2">Смена</div>
          {options.length === 0 ? (
            <div className="text-white/30 text-sm">Все ближайшие смены уже запланированы</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {options.map(opt => {
                const key = `${opt.date}_${opt.shift}`
                const isSelected = selected === key
                return (
                  <button
                    key={key}
                    onClick={() => setSelected(key)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-blue-600/40 border-blue-500/60 text-white shadow-sm shadow-blue-500/20'
                        : 'bg-white/5 border-white/10 text-white/55 hover:bg-white/10 hover:text-white/80'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>


        {/* ── Items ── */}
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/35 uppercase tracking-widest">
              Позиции плана {items.length > 0 && <span className="text-white/50">· {items.length}</span>}
            </span>
            <button
              onClick={() => setItems(prev => [...prev, emptyItem()])}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 hover:border-blue-500/50 text-xs font-medium transition-all"
            >
              + Добавить позицию
            </button>
          </div>

          {items.map((item, idx) => {
            const takenByOther = new Set(
              items.flatMap(it => it._id !== item._id ? it.named_workers : [])
            )
            return (
              <ItemCard
                key={item._id}
                item={item}
                index={idx}
                serviceUsers={serviceUsers}
                otherServices={otherServices}
                takenByOther={takenByOther}
                onUpdate={patch => updateItem(item._id, patch)}
                onRemove={() => removeItem(item._id)}
                onAddWorker={name => addNamedWorker(item._id, name)}
                onRemoveWorker={name => removeNamedWorker(item._id, name)}
              />
            )
          })}

          {items.length === 0 && (
            <button
              onClick={() => setItems([emptyItem()])}
              className="w-full py-8 border-2 border-dashed border-white/10 rounded-xl text-white/30 text-sm hover:border-blue-500/30 hover:text-blue-400/60 transition-all"
            >
              + Нажмите, чтобы добавить первую позицию
            </button>
          )}
        </div>

        {/* ── Totals bar ── */}
        {items.length > 0 && (
          <div className="mx-5 mb-3 px-4 py-2.5 rounded-xl bg-white/4 border border-white/8 flex items-center gap-4 flex-wrap">
            <span className="text-[10px] text-white/35 uppercase tracking-widest">Итого</span>
            <TotalBadge icon="👷" count={totalWorkers}    label="рабочих" />
            <TotalBadge icon="⭐" count={totalBrigadiers} label="бригадир" />
            <TotalBadge icon="🎓" count={totalMasters}    label="мастер" />
            {totalForemen > 0 && <TotalBadge icon="📋" count={totalForemen} label="ИТР" />}
            <TotalBadge icon="🚗" count={totalVehicles}   label="техника" />
          </div>
        )}

        {/* ── Footer ── */}
        <div className="px-5 pb-5">
          {error && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}
          <div className="flex gap-2.5">
            <button
              onClick={handleCreate}
              disabled={!selected || saving || options.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/20"
            >
              {saving
                ? '⏳ Создаётся...'
                : filledCount > 0
                  ? `✓ Создать план · ${filledCount} поз.`
                  : 'Создать план'
              }
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/70 text-sm transition-all"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Total badge ───────────────────────────────────────────────────────────

function TotalBadge({ icon, count, label }: { icon: string; count: number; label: string }) {
  if (count === 0) return null
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-base">{icon}</span>
      <span className="text-white font-semibold text-sm">{count}</span>
      <span className="text-white/40 text-xs">{label}</span>
    </div>
  )
}

// ── Item card ──────────────────────────────────────────────────────────────

interface ItemCardProps {
  item: DraftItem
  index: number
  serviceUsers: User[]
  otherServices: string[]
  takenByOther: Set<string>
  onUpdate: (patch: Partial<DraftItem>) => void
  onRemove: () => void
  onAddWorker: (name: string) => void
  onRemoveWorker: (name: string) => void
}

function ItemCard({
  item, index, serviceUsers, otherServices, takenByOther,
  onUpdate, onRemove, onAddWorker, onRemoveWorker
}: ItemCardProps) {

  const initCrossService = () => {
    if (item.cross_service) {
      // toggle visibility only, don't delete
      onUpdate({ showCross: !item.showCross })
      return
    }
    onUpdate({
      cross_service: {
        to_service_id: otherServices[0] ?? '',
        description: '',
        needed_count: 1,
        time_start: item.time_start,
        time_end: item.time_end,
      },
      showCross: true,
    })
  }

  const removeCrossService = () => onUpdate({ cross_service: null, showCross: false })

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] border-b border-white/8">
        <span className="text-[11px] font-bold text-white/25 w-5 shrink-0 text-center">
          {index + 1}
        </span>
        <input
          type="text"
          value={item.location}
          onChange={e => onUpdate({ location: e.target.value })}
          placeholder="📍 Объект / место работ"
          className="flex-1 bg-transparent text-sm text-white placeholder-white/25 focus:outline-none min-w-0"
        />
        <button
          onClick={onRemove}
          className="w-6 h-6 flex items-center justify-center rounded-md text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm shrink-0"
          title="Удалить позицию"
        >
          ✕
        </button>
      </div>

      {/* Card body */}
      <div className="px-3 py-3 space-y-2.5">
        {/* Work description */}
        <textarea
          value={item.work_description}
          onChange={e => onUpdate({ work_description: e.target.value })}
          placeholder="Описание работ…"
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500/40 resize-none transition-colors"
        />

        {/* Time + Headcount row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* Times */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-white/35">с</span>
            <input
              type="time"
              value={item.time_start}
              onChange={e => onUpdate({ time_start: e.target.value })}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/40 transition-colors"
            />
            <span className="text-[11px] text-white/35">до</span>
            <input
              type="time"
              value={item.time_end}
              onChange={e => onUpdate({ time_end: e.target.value })}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/40 transition-colors"
            />
          </div>

          {/* Headcount steppers */}
          <div className="flex items-center gap-3 ml-auto flex-wrap">
            <Stepper icon="👷" label="Рабочих"   value={item.required_workers}    onChange={v => onUpdate({ required_workers: v })} />
            <Stepper icon="⭐" label="Бригадир"   value={item.required_brigadiers} onChange={v => onUpdate({ required_brigadiers: v })} />
            <Stepper icon="🎓" label="Мастер"     value={item.required_masters}    onChange={v => onUpdate({ required_masters: v })} />
            <Stepper icon="📋" label="ИТР"        value={item.required_foremen}    onChange={v => onUpdate({ required_foremen: v })} />
            <Stepper icon="🚗" label="Техника"    value={item.required_vehicles}   onChange={v => onUpdate({ required_vehicles: v })} />
          </div>
        </div>

        {/* Optional sections row */}
        <div className="flex flex-wrap gap-2 pt-0.5">
          {/* Named workers toggle */}
          <button
            onClick={() => onUpdate({ showNamed: !item.showNamed })}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
              item.named_workers.length > 0
                ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400'
                : 'bg-white/5 border-white/8 text-white/35 hover:text-white/60 hover:bg-white/8'
            }`}
          >
            <span>{item.showNamed ? '▾' : '▸'}</span>
            <span>Поимённо{item.named_workers.length > 0 ? ` · ${item.named_workers.length}` : ''}</span>
          </button>

          {/* Cross-service toggle */}
          <button
            onClick={initCrossService}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
              item.cross_service
                ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                : 'bg-violet-500/8 border-violet-500/20 text-violet-400/70 hover:text-violet-300 hover:bg-violet-500/15 hover:border-violet-500/35'
            }`}
          >
            <span>🔗</span>
            <span>
              {item.cross_service
                ? `${SERVICE_META[item.cross_service.to_service_id]?.emoji ?? ''} ${SERVICE_NAMES[item.cross_service.to_service_id] ?? item.cross_service.to_service_id} ${item.showCross ? '▾' : '▸'}`
                : 'Смежная служба'
              }
            </span>
          </button>
        </div>

        {/* Named workers expanded — clickable roster */}
        {item.showNamed && (
          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/15 p-3">
            {serviceUsers.length === 0 ? (
              <div className="text-[11px] text-white/25 text-center py-2">Нет сотрудников в службе</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {serviceUsers.map(u => {
                  const added = item.named_workers.includes(u.full_name)
                  const busy  = !added && takenByOther.has(u.full_name)
                  return (
                    <button
                      key={u.user_id}
                      disabled={busy}
                      onClick={() => added ? onRemoveWorker(u.full_name) : onAddWorker(u.full_name)}
                      title={busy ? 'Уже назначен в другой позиции' : undefined}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                        added
                          ? 'bg-emerald-500/25 border-emerald-500/50 text-emerald-200'
                          : busy
                            ? 'bg-white/3 border-white/5 text-white/20 cursor-not-allowed line-through'
                            : 'bg-white/5 border-white/8 text-white/50 hover:bg-emerald-500/10 hover:border-emerald-500/25 hover:text-emerald-300'
                      }`}
                    >
                      {added && <span className="text-emerald-400 text-[10px]">✓</span>}
                      <span>{u.full_name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Cross-service expanded */}
        {item.cross_service && item.showCross && (
          <div className="rounded-lg bg-violet-500/5 border border-violet-500/20 p-3 space-y-2.5">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-violet-300 uppercase tracking-wider">🔗 Запрос смежной службе</span>
              <button onClick={removeCrossService} className="text-white/25 hover:text-red-400 text-xs transition-colors px-1">✕ убрать</button>
            </div>

            {/* Service selector as buttons */}
            <div>
              <div className="text-[10px] text-white/35 mb-1.5">Кому направляем запрос</div>
              <div className="flex flex-wrap gap-1.5">
                {otherServices.map(sid => (
                  <button
                    key={sid}
                    onClick={() => onUpdate({ cross_service: { ...item.cross_service!, to_service_id: sid } })}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      item.cross_service!.to_service_id === sid
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

            {/* Count + time */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white/40">Людей</span>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => onUpdate({ cross_service: { ...item.cross_service!, needed_count: Math.max(1, item.cross_service!.needed_count - 1) } })}
                    className="w-6 h-6 rounded bg-white/8 border border-white/10 text-white/50 hover:text-white hover:bg-white/15 text-xs font-bold flex items-center justify-center">−</button>
                  <span className="w-7 text-center text-sm font-semibold text-white">{item.cross_service.needed_count}</span>
                  <button onClick={() => onUpdate({ cross_service: { ...item.cross_service!, needed_count: Math.min(20, item.cross_service!.needed_count + 1) } })}
                    className="w-6 h-6 rounded bg-white/8 border border-white/10 text-white/50 hover:text-white hover:bg-white/15 text-xs font-bold flex items-center justify-center">+</button>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-white/40">с</span>
                <input type="time" value={item.cross_service.time_start}
                  onChange={e => onUpdate({ cross_service: { ...item.cross_service!, time_start: e.target.value } })}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50" />
                <span className="text-white/30 text-xs">–</span>
                <input type="time" value={item.cross_service.time_end}
                  onChange={e => onUpdate({ cross_service: { ...item.cross_service!, time_end: e.target.value } })}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50" />
              </div>
            </div>

            <input
              type="text"
              value={item.cross_service.description}
              onChange={e => onUpdate({ cross_service: { ...item.cross_service!, description: e.target.value } })}
              placeholder="Что нужно сделать (опишите задачу для другой службы)…"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50"
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Stepper control ────────────────────────────────────────────────────────

function Stepper({ icon, label, value, onChange }: {
  icon: string
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-white/30">{label}</span>
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-6 h-6 rounded-md bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 text-sm font-bold transition-all flex items-center justify-center leading-none"
        >
          −
        </button>
        <div className="w-7 text-center text-sm font-semibold text-white leading-none py-1.5">
          {value}
        </div>
        <button
          onClick={() => onChange(Math.min(50, value + 1))}
          className="w-6 h-6 rounded-md bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 text-sm font-bold transition-all flex items-center justify-center leading-none"
        >
          +
        </button>
      </div>
      <span className="text-base leading-none">{icon}</span>
    </div>
  )
}
