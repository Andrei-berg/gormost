'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  fetchDirectives, createDirective, updateDirectiveStatus,
  fetchWorkPlans, fetchWorkPlanWithItems, fetchServices,
} from '@/lib/api'
import type { Directive, WorkPlanWithItems, Service, AuthSession, DirectivePriority } from '@/types'
import { DIRECTIVE_PRIORITY_CONFIG, DIRECTIVE_STATUS_CONFIG, SERVICE_META, WORK_PLAN_STATUS_CONFIG } from '@/types'

export default function ChiefDirectives({ session }: { session: AuthSession }) {
  const [directives, setDirectives]   = useState<Directive[]>([])
  const [activePlans, setActivePlans] = useState<WorkPlanWithItems[]>([])
  const [services, setServices]       = useState<Service[]>([])
  const [loading, setLoading]         = useState(true)

  // Form
  const [showCreate, setShowCreate]     = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<WorkPlanWithItems | null>(null)
  const [title, setTitle]               = useState('')
  const [description, setDescription]   = useState('')
  const [priority, setPriority]         = useState<DirectivePriority>('NORMAL')
  const [suspendPlan, setSuspendPlan]   = useState(false)
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState('')

  const load = useCallback(async () => {
    const [dirs, svcs, raw] = await Promise.all([
      fetchDirectives(),
      fetchServices(),
      fetchWorkPlans({ statuses: ['IN_PROGRESS', 'ASSIGNED', 'BOSS_CONFIRMED'] }),
    ])
    const withItems = await Promise.all(raw.map(p => fetchWorkPlanWithItems(p.id)))
    setDirectives(dirs)
    setServices(svcs)
    setActivePlans(withItems.filter(Boolean) as WorkPlanWithItems[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = (plan?: WorkPlanWithItems) => {
    setSelectedPlan(plan ?? null)
    setTitle('')
    setDescription('')
    setPriority('NORMAL')
    setSuspendPlan(false)
    setError('')
    setShowCreate(true)
  }

  const handleCreate = async () => {
    if (!title.trim()) { setError('Введите задание'); return }
    setSaving(true)
    setError('')
    try {
      await createDirective({
        title: title.trim(),
        description: description.trim() || null,
        priority,
        plan_id: selectedPlan?.id ?? null,
        suspend_plan: suspendPlan,
        service_id: null,
        order_type: null,
        location: null,
      }, session.user_id)
      setShowCreate(false)
      load()
    } catch {
      setError('Ошибка при сохранении')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center text-white/40 py-8 text-sm">Загрузка...</div>

  const active   = directives.filter(d => !['DONE', 'CANCELLED'].includes(d.status))
  const archived = directives.filter(d =>  ['DONE', 'CANCELLED'].includes(d.status))

  return (
    <div className="space-y-6">

      {/* Active brigades panel */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider">Бригады сейчас</h3>
          <button
            onClick={() => openCreate()}
            className="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-all"
          >
            📝 Выдать поручение
          </button>
        </div>

        {activePlans.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center text-white/25 text-sm">
            Нет активных бригад в работе
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {activePlans.map(plan => {
              const svc  = services.find(s => s.service_id === plan.service_id)
              const meta = SERVICE_META[plan.service_id] ?? { emoji: '🔧' }
              const stCfg = WORK_PLAN_STATUS_CONFIG[plan.status]
              const shiftEmoji = plan.shift_type === 'DAY' ? '☀️' : '🌙'
              const [y, m, d] = plan.plan_date.split('-')
              return (
                <div key={plan.id} className="glass rounded-xl p-4 border border-white/8 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{meta.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{svc?.service_name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-white/35">{shiftEmoji} {d}.{m}.{y}</span>
                        <span
                          className="text-[10px] px-1.5 py-px rounded-full border"
                          style={{ color: stCfg.color, borderColor: stCfg.color + '40' }}
                        >
                          {stCfg.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  {plan.items.length > 0 && (
                    <div className="text-xs text-white/35 space-y-0.5">
                      {plan.items.slice(0, 2).map(item => (
                        <div key={item.id} className="truncate">· {item.location}</div>
                      ))}
                      {plan.items.length > 2 && (
                        <div className="text-white/20">+{plan.items.length - 2} ещё</div>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => openCreate(plan)}
                    className="mt-auto w-full py-1.5 rounded-lg bg-orange-600/20 border border-orange-500/30 text-orange-300 text-xs font-medium hover:bg-orange-600/35 transition-all"
                  >
                    📝 Выдать поручение
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Active directives */}
      {active.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3">
            Активные поручения · {active.length}
          </h3>
          <div className="space-y-2">
            {active.map(d => <DirectiveCard key={d.id} d={d} plans={activePlans} services={services} onDone={() => { updateDirectiveStatus(d.id, 'DONE').then(load) }} />)}
          </div>
        </div>
      )}

      {active.length === 0 && archived.length === 0 && (
        <div className="text-center py-12 text-white/20 text-sm">
          <div className="text-4xl mb-2">📝</div>
          Поручений пока нет
        </div>
      )}

      {/* Archived */}
      {archived.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-white/30 hover:text-white/50 transition-colors select-none py-1">
            История · {archived.length} поручений ▼
          </summary>
          <div className="space-y-2 mt-3 opacity-50">
            {archived.map(d => <DirectiveCard key={d.id} d={d} plans={activePlans} services={services} />)}
          </div>
        </details>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 w-full max-w-lg border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">📝 Выдать поручение</h2>
              <button onClick={() => setShowCreate(false)} className="text-white/40 hover:text-white text-xl transition-colors">✕</button>
            </div>

            {/* Selected brigade preview */}
            {selectedPlan ? (
              <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                <span className="text-xl">{SERVICE_META[selectedPlan.service_id]?.emoji ?? '🔧'}</span>
                <div>
                  <div className="text-sm font-medium text-white">
                    {services.find(s => s.service_id === selectedPlan.service_id)?.service_name}
                  </div>
                  <div className="text-xs text-white/35">{selectedPlan.items.length} работ в плане</div>
                </div>
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="ml-auto text-white/30 hover:text-white/60 text-sm transition-colors"
                >✕</button>
              </div>
            ) : activePlans.length > 0 && (
              <div className="mb-4">
                <label className="text-xs text-white/45 mb-2 block">Бригада (опционально)</label>
                <div className="grid grid-cols-2 gap-2">
                  {activePlans.map(plan => {
                    const meta = SERVICE_META[plan.service_id] ?? { emoji: '🔧' }
                    const svc  = services.find(s => s.service_id === plan.service_id)
                    const selId = (selectedPlan as WorkPlanWithItems | null)?.id
                    const sel  = selId === plan.id
                    return (
                      <button
                        key={plan.id}
                        onClick={() => setSelectedPlan(sel ? null : plan)}
                        className={`p-2.5 rounded-xl text-xs text-left border transition-all ${
                          sel
                            ? 'border-orange-500/50 bg-orange-500/15 text-white'
                            : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10'
                        }`}
                      >
                        {meta.emoji} {svc?.service_name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/45 mb-1.5 block">Задание *</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Что нужно сделать"
                  className="form-input w-full"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-white/45 mb-1.5 block">Подробности</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Дополнительные инструкции, место, особенности..."
                  rows={2}
                  className="form-input w-full resize-none"
                />
              </div>

              <div>
                <label className="text-xs text-white/45 mb-1.5 block">Приоритет</label>
                <div className="flex gap-2">
                  {(['NORMAL', 'URGENT', 'IMMEDIATE'] as const).map(p => {
                    const cfg = DIRECTIVE_PRIORITY_CONFIG[p]
                    const sel = priority === p
                    return (
                      <button
                        key={p}
                        onClick={() => setPriority(p)}
                        className="flex-1 py-2 rounded-xl text-sm border transition-all font-medium"
                        style={sel
                          ? { color: cfg.color, borderColor: cfg.color + '60', background: cfg.color + '18' }
                          : { color: 'rgba(255,255,255,0.35)', borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }
                        }
                      >
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {selectedPlan && (
                <label className="flex items-center gap-3 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={suspendPlan}
                    onChange={e => setSuspendPlan(e.target.checked)}
                    className="w-4 h-4 rounded accent-orange-500"
                  />
                  <span className="text-sm text-white/65">Приостановить текущий план бригады</span>
                </label>
              )}

              {error && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreate}
                disabled={!title.trim() || saving}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-medium text-sm transition-all"
              >
                {saving ? 'Сохранение...' : '✓ Выдать поручение'}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/55 text-sm transition-all"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DirectiveCard({ d, plans, services, onDone }: {
  d: Directive
  plans: WorkPlanWithItems[]
  services: Service[]
  onDone?: () => void
}) {
  const prCfg  = DIRECTIVE_PRIORITY_CONFIG[d.priority]
  const stCfg  = DIRECTIVE_STATUS_CONFIG[d.status]
  const plan   = plans.find(p => p.id === d.plan_id)
  const svc    = plan ? services.find(s => s.service_id === plan.service_id) : null

  const dt = new Date(d.created_at)
  const dateStr = dt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="glass rounded-xl p-4 border border-white/8">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-white text-sm">{d.title}</span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full border font-medium"
              style={{ color: prCfg.color, borderColor: prCfg.color + '50', background: prCfg.color + '15' }}
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
          {d.description && <div className="text-xs text-white/40 mt-1">{d.description}</div>}
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/25">
            {svc && plan && (
              <span>{SERVICE_META[plan.service_id]?.emoji} {svc.service_name}</span>
            )}
            {d.suspend_plan && <span className="text-amber-400/60">⏸ план приостановлен</span>}
            <span>{dateStr}</span>
          </div>
        </div>
        {onDone && d.status !== 'DONE' && d.status !== 'CANCELLED' && (
          <button
            onClick={onDone}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-green-600/20 border border-green-500/30 text-green-400 text-xs hover:bg-green-600/35 transition-all"
          >
            ✓ Готово
          </button>
        )}
      </div>
    </div>
  )
}
