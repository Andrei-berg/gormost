'use client'
import { useState, useEffect, useCallback } from 'react'
import type { WorkPlan, WorkPlanWithItems, AuthSession, Service } from '@/types'
import { WORK_PLAN_STATUS_CONFIG, SERVICE_META } from '@/types'
import { fetchWorkPlans, fetchWorkPlanWithItems } from '@/lib/api'
import WorkPermitModal from './WorkPermitModal'

const PERMIT_ELIGIBLE_STATUSES = [
  'SUBMITTED', 'APPROVED', 'PLANNED', 'BOSS_CONFIRMED',
  'ASSIGNED', 'IN_PROGRESS', 'DONE',
]

interface Props {
  session: AuthSession
  services: Service[]
  /** If provided — only show plans for this service. If omitted — show selector for all services */
  serviceId?: string
}

export default function WorkPermitLauncher({ session, services, serviceId }: Props) {
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [plans,        setPlans]        = useState<WorkPlan[]>([])
  const [loading,      setLoading]      = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<WorkPlanWithItems | null>(null)
  const [loadingPlan,  setLoadingPlan]  = useState<string | null>(null)
  const [filterSvc,    setFilterSvc]    = useState<string>(serviceId ?? '')

  const effectiveServiceId = serviceId ?? filterSvc

  const loadPlans = useCallback(async () => {
    setLoading(true)
    const data = await fetchWorkPlans({
      serviceId: effectiveServiceId || undefined,
      statuses:  PERMIT_ELIGIBLE_STATUSES as WorkPlan['status'][],
    })
    setPlans(data)
    setLoading(false)
  }, [effectiveServiceId])

  useEffect(() => {
    if (selectorOpen) loadPlans()
  }, [selectorOpen, loadPlans])

  const handleSelectPlan = async (planId: string) => {
    setLoadingPlan(planId)
    const full = await fetchWorkPlanWithItems(planId)
    setLoadingPlan(null)
    if (full) {
      setSelectedPlan(full)
      setSelectorOpen(false)
    }
  }

  const handlePermitPrinted = () => {
    loadPlans() // refresh badges
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setSelectorOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/30 border border-blue-500/20 text-blue-300 hover:text-blue-200 text-xs font-medium transition-all"
      >
        🖨 Наряд-допуск
      </button>

      {/* Plan selector modal */}
      {selectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectorOpen(false)} />
          <div className="relative z-10 w-full max-w-lg bg-[rgba(15,20,40,0.97)] border border-white/15 rounded-2xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <div className="text-sm font-bold text-white">🖨 Создать наряд-допуск</div>
                <div className="text-[11px] text-white/40 mt-0.5">Выберите план работ</div>
              </div>
              <button onClick={() => setSelectorOpen(false)} className="text-white/30 hover:text-white text-lg transition-colors">✕</button>
            </div>

            {/* Service filter (only if no fixed serviceId) */}
            {!serviceId && (
              <div className="px-5 pt-4">
                <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Служба</label>
                <select
                  value={filterSvc}
                  onChange={e => setFilterSvc(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="">Все службы</option>
                  {services.map(s => (
                    <option key={s.service_id} value={s.service_id}>{s.service_name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Plans list */}
            <div className="px-5 py-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {loading && (
                <div className="text-center text-white/30 py-8 text-sm">Загрузка планов...</div>
              )}
              {!loading && plans.length === 0 && (
                <div className="text-center text-white/20 py-8 text-sm">
                  Нет подходящих планов.<br />
                  <span className="text-[10px]">Нужен статус: согласован начальником службы или выше.</span>
                </div>
              )}
              {!loading && plans.map(plan => {
                const svc = services.find(s => s.service_id === plan.service_id)
                const meta = SERVICE_META[plan.service_id] ?? { emoji: '🔧' }
                const statusCfg = WORK_PLAN_STATUS_CONFIG[plan.status]
                const shiftLabel = plan.shift_type === 'DAY' ? '☀️ День' : '🌙 Ночь'
                const isLoading = loadingPlan === plan.id

                return (
                  <button
                    key={plan.id}
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={!!loadingPlan}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-white/4 hover:bg-white/8 border border-white/8 hover:border-white/15 transition-all text-left group disabled:opacity-50"
                  >
                    <span className="text-xl shrink-0">{meta.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium truncate">
                        {svc?.service_name ?? plan.service_id}
                      </div>
                      <div className="text-[10px] text-white/40">
                        {shiftLabel} · {plan.plan_date}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Has permit badge */}
                      {plan.has_permit && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-medium">
                          ✓ Наряд создан{plan.permit_number ? ` №${plan.permit_number}` : ''}
                        </span>
                      )}
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ color: statusCfg?.color, background: (statusCfg?.color ?? '#888') + '20' }}
                      >
                        {statusCfg?.label ?? plan.status}
                      </span>
                      {isLoading ? (
                        <span className="text-white/30 text-xs">...</span>
                      ) : (
                        <span className="text-white/20 group-hover:text-white/50 transition-colors text-xs">→</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Footer note */}
            <div className="px-5 py-3 border-t border-white/8">
              <div className="text-[10px] text-white/20">
                Отображаются планы со статусом «Отправлен» и выше — начальник службы подписал.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Work permit modal */}
      {selectedPlan && (
        <WorkPermitModal
          plan={selectedPlan}
          session={session}
          onClose={() => setSelectedPlan(null)}
          onPermitPrinted={handlePermitPrinted}
        />
      )}
    </>
  )
}
