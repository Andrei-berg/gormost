'use client'
import { useState } from 'react'
import type { AuthSession, WorkPlanWithItems, Service, WorkSource, OriginalPlanFate, ShiftType } from '@/types'
import { WORK_SOURCE_CONFIG } from '@/types'
import { createOverrideOrder } from '@/lib/api'

interface Props {
  session: AuthSession
  activePlans: WorkPlanWithItems[]
  services: Service[]
  onClose: () => void
  onSuccess: () => void
}

const FATE_OPTIONS: { value: OriginalPlanFate; label: string; desc: string; color: string }[] = [
  { value: 'REASSIGN', label: 'Переназначить другую бригаду', desc: 'Срочно выслать замену — алерт мастеру и замзаму', color: 'border-orange-500/50 bg-orange-500/10' },
  { value: 'POSTPONE', label: 'Отложить на следующую смену', desc: 'План будет заморожен и возобновлён', color: 'border-blue-500/50 bg-blue-500/10' },
  { value: 'CANCEL', label: 'Отменить план', desc: 'Работы не будут выполнены в этот период', color: 'border-red-500/50 bg-red-500/10' },
]

export default function OverrideModal({ session, activePlans, services, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1 — authority + new task
  const [source, setSource] = useState<WorkSource>('MAYOR')
  const [sourceRef, setSourceRef] = useState('')
  const [sourceOrg, setSourceOrg] = useState('')
  const [orderText, setOrderText] = useState('')
  const [location, setLocation] = useState('')
  const [serviceId, setServiceId] = useState(session.service_id ?? '')
  const [shiftType, setShiftType] = useState<ShiftType>('DAY')

  // Step 2 — affected plan
  const [fromPlanId, setFromPlanId] = useState<string>('none')
  const [partialWorkDone, setPartialWorkDone] = useState('')

  // Step 3 — fate of original plan
  const [fate, setFate] = useState<OriginalPlanFate>('REASSIGN')
  const [suspendedUntil, setSuspendedUntil] = useState('')

  const selectedPlan = activePlans.find(p => p.id === fromPlanId) ?? null

  const step1Valid = source && orderText.trim() && location.trim() && serviceId
  const step2Valid = true // fromPlanId can be 'none'
  const step3Valid = fate && (fate !== 'POSTPONE' || suspendedUntil)

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)
    try {
      const result = await createOverrideOrder({
        serviceId,
        planDate: new Date().toISOString().split('T')[0],
        shiftType,
        location: location.trim(),
        workDescription: orderText.trim(),
        source,
        sourceRef: sourceRef.trim() || null,
        sourceOrg: sourceOrg.trim() || null,
        fastTrackReason: `Поручение от ${WORK_SOURCE_CONFIG[source].label}: ${sourceRef || '—'}`,
        fromPlanId: fromPlanId !== 'none' ? fromPlanId : null,
        fromPlanStatus: selectedPlan?.status ?? null,
        partialWorkDone: partialWorkDone.trim() || null,
        originalPlanFate: fate,
        suspendedUntil: suspendedUntil || null,
        orderedBySource: source,
        orderReference: sourceRef.trim() || null,
        orderText: orderText.trim(),
        affectedUsers: [],
        fullBrigade: true,
        createdBy: session.user_id,
      })
      if (!result) throw new Error('Ошибка создания поручения')
      onSuccess()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  const sourceCfg = WORK_SOURCE_CONFIG[source]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg glass rounded-2xl overflow-hidden shadow-2xl border border-red-500/30">

        {/* Header */}
        <div className="px-5 py-4 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <div className="font-bold text-white">Поручение сверху</div>
              <div className="text-xs text-white/50">Внеплановое задание — Fast Track</div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 text-xl">✕</button>
        </div>

        {/* Step indicator */}
        <div className="flex border-b border-white/5">
          {(['Источник', 'Бригада', 'Последствия'] as const).map((label, i) => (
            <div
              key={i}
              className={`flex-1 py-2.5 text-center text-xs font-medium transition-colors ${
                step === i + 1 ? 'text-red-400 border-b-2 border-red-400' : 'text-white/30'
              }`}
            >
              {i + 1}. {label}
            </div>
          ))}
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">

          {/* STEP 1 — Authority + Task */}
          {step === 1 && (
            <>
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Источник поручения</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(WORK_SOURCE_CONFIG) as [WorkSource, typeof WORK_SOURCE_CONFIG[WorkSource]][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setSource(key)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        source === key ? `${cfg.bg} border-current` : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                      style={source === key ? { color: cfg.color } : {}}
                    >
                      <div className="text-base mb-0.5">{cfg.emoji}</div>
                      <div className="text-xs font-medium text-white">{cfg.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">№ поручения / письма</label>
                  <input
                    value={sourceRef}
                    onChange={e => setSourceRef(e.target.value)}
                    placeholder="№ или пометка"
                    className="w-full form-input text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Организация</label>
                  <input
                    value={sourceOrg}
                    onChange={e => setSourceOrg(e.target.value)}
                    placeholder="Кто выдал"
                    className="w-full form-input text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-white/50 mb-1 block">Суть работ <span className="text-red-400">*</span></label>
                <textarea
                  value={orderText}
                  onChange={e => setOrderText(e.target.value)}
                  rows={3}
                  placeholder="Что необходимо выполнить..."
                  className="w-full form-input text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Объект / место <span className="text-red-400">*</span></label>
                  <input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Адрес, км, объект"
                    className="w-full form-input text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Служба</label>
                  <select value={serviceId} onChange={e => setServiceId(e.target.value)} className="w-full form-select text-sm">
                    {services.map(s => <option key={s.service_id} value={s.service_id}>{s.service_name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-white/50 mb-1 block">Смена</label>
                <div className="flex gap-2">
                  {(['DAY', 'NIGHT'] as ShiftType[]).map(st => (
                    <button
                      key={st}
                      onClick={() => setShiftType(st)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        shiftType === st ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-white/5 text-white/40 border border-white/10'
                      }`}
                    >
                      {st === 'DAY' ? '☀️ День' : '🌙 Ночь'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* STEP 2 — Affected brigade */}
          {step === 2 && (
            <>
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Какая бригада снимается?</label>
                <div className="space-y-2">
                  <button
                    onClick={() => setFromPlanId('none')}
                    className={`w-full p-3 rounded-xl border text-left text-sm transition-all ${
                      fromPlanId === 'none' ? 'border-green-500/50 bg-green-500/10 text-green-300' : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    <div className="font-medium">Свободная бригада</div>
                    <div className="text-xs opacity-60">Назначить из доступных сотрудников</div>
                  </button>
                  {activePlans.map(plan => {
                    const svc = services.find(s => s.service_id === plan.service_id)
                    const isSelected = fromPlanId === plan.id
                    const statusColors: Record<string, string> = {
                      IN_PROGRESS: 'text-violet-400',
                      ASSIGNED: 'text-cyan-400',
                      BOSS_CONFIRMED: 'text-purple-400',
                    }
                    return (
                      <button
                        key={plan.id}
                        onClick={() => setFromPlanId(plan.id)}
                        className={`w-full p-3 rounded-xl border text-left transition-all ${
                          isSelected ? 'border-red-500/50 bg-red-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-white">{svc?.service_name ?? plan.service_id}</span>
                          <span className={`text-xs font-mono ${statusColors[plan.status] ?? 'text-white/40'}`}>
                            {plan.status === 'IN_PROGRESS' ? '▶ В работе' : plan.status === 'ASSIGNED' ? '✓ Назначен' : plan.status}
                          </span>
                        </div>
                        {plan.items.slice(0, 2).map(item => (
                          <div key={item.id} className="text-xs text-white/50 truncate">
                            {item.location} — {item.work_description}
                          </div>
                        ))}
                        {plan.items.length > 2 && (
                          <div className="text-xs text-white/30">+{plan.items.length - 2} позиций</div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {selectedPlan?.status === 'IN_PROGRESS' && (
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Что успели сделать до снятия?</label>
                  <textarea
                    value={partialWorkDone}
                    onChange={e => setPartialWorkDone(e.target.value)}
                    rows={2}
                    placeholder="Частичное выполнение: объём, процент готовности..."
                    className="w-full form-input text-sm resize-none"
                  />
                </div>
              )}
            </>
          )}

          {/* STEP 3 — Fate of original plan */}
          {step === 3 && fromPlanId !== 'none' && (
            <>
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Что делать с прерванным планом?</label>
                <div className="space-y-2">
                  {FATE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFate(opt.value)}
                      className={`w-full p-3 rounded-xl border text-left transition-all ${
                        fate === opt.value ? opt.color : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-sm font-medium text-white">{opt.label}</div>
                      <div className="text-xs text-white/40 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              {fate === 'POSTPONE' && (
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Возобновить не ранее</label>
                  <input
                    type="date"
                    value={suspendedUntil}
                    onChange={e => setSuspendedUntil(e.target.value)}
                    className="form-input text-sm w-48"
                  />
                </div>
              )}
            </>
          )}

          {step === 3 && fromPlanId === 'none' && (
            <div className="py-8 text-center">
              <div className="text-3xl mb-3">✓</div>
              <div className="text-white font-medium">Свободная бригада — план снимать не нужно</div>
              <div className="text-sm text-white/40 mt-1">Задача будет создана как Fast Track для назначения мастером</div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between">
          <button
            onClick={() => step > 1 ? setStep((step - 1) as 1 | 2 | 3) : onClose()}
            className="px-4 py-2 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 text-sm"
          >
            {step === 1 ? 'Отмена' : '← Назад'}
          </button>

          <div className="flex items-center gap-2">
            {/* Source badge */}
            <span className="text-xs px-2 py-1 rounded-full border" style={{ color: sourceCfg.color, borderColor: sourceCfg.color + '40' }}>
              {sourceCfg.emoji} {sourceCfg.label}
            </span>

            {step < 3 ? (
              <button
                onClick={() => setStep((step + 1) as 2 | 3)}
                disabled={step === 1 ? !step1Valid : !step2Valid}
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-medium"
              >
                Далее →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={saving || !step3Valid}
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-bold"
              >
                {saving ? 'Создаём...' : '⚡ Создать поручение'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
