'use client'
import type { WorkPlan, WorkRedirect } from '@/types'
import { WORK_SOURCE_CONFIG } from '@/types'

interface Props {
  redirectedPlans: WorkPlan[]
  redirects: WorkRedirect[]
}

export default function RedirectBanner({ redirectedPlans, redirects }: Props) {
  if (redirectedPlans.length === 0) return null

  return (
    <div className="space-y-2 mb-4">
      {redirectedPlans.map(plan => {
        const redirect = redirects.find(r => r.from_plan_id === plan.id)
        const srcCfg = redirect ? WORK_SOURCE_CONFIG[redirect.ordered_by_source] : null
        const isRedirected = plan.status === 'REDIRECTED'
        const isSuspended = plan.status === 'SUSPENDED'

        return (
          <div
            key={plan.id}
            className={`rounded-xl border px-4 py-3 ${
              isRedirected
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-amber-500/10 border-amber-500/30'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{isRedirected ? '🚨' : '⏸'}</span>
                <div>
                  <div className={`text-sm font-bold ${isRedirected ? 'text-red-300' : 'text-amber-300'}`}>
                    {isRedirected ? 'Бригада снята с плана' : 'План приостановлен'}
                  </div>
                  {redirect && (
                    <div className="text-xs text-white/50 mt-0.5 flex items-center gap-1.5">
                      {srcCfg && (
                        <span style={{ color: srcCfg.color }}>{srcCfg.emoji} {srcCfg.label}</span>
                      )}
                      {redirect.order_reference && (
                        <span className="text-white/30">· {redirect.order_reference}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {plan.status === 'REDIRECTED' && redirect?.original_plan_fate === 'REASSIGN' && (
                <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 font-medium">
                  Нужна замена
                </span>
              )}
              {plan.status === 'SUSPENDED' && plan.suspended_until && (
                <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300">
                  до {new Date(plan.suspended_until).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>

            {redirect?.order_text && (
              <div className="mt-2 text-xs text-white/60 pl-8">
                <span className="text-white/30">Поручение: </span>{redirect.order_text}
              </div>
            )}

            {redirect?.partial_work_done && (
              <div className="mt-1 text-xs text-white/50 pl-8">
                <span className="text-white/30">Выполнено до снятия: </span>{redirect.partial_work_done}
              </div>
            )}

            {plan.status === 'REDIRECTED' && redirect?.original_plan_fate === 'REASSIGN' && (
              <div className="mt-2 pl-8 text-xs text-orange-300/70">
                Свяжитесь с замзамом для назначения другой бригады
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
