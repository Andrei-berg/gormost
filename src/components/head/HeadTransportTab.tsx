'use client'
import type { WorkPlanWithItems } from '@/types'
import { SERVICE_META, VEHICLE_STATUS_CONFIG } from '@/types'
import type { Service } from '@/types'

interface Props {
  plans: WorkPlanWithItems[]
  services: Service[]
}

export default function HeadTransportTab({ plans }: Props) {
  // Only plans that have at least one item with assigned vehicles
  const plansWithVehicles = plans.filter(p =>
    p.items.some(i => i.vehicles && i.vehicles.length > 0)
  )

  if (plansWithVehicles.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <div className="text-4xl mb-3">🚛</div>
        <div className="text-white/40 text-sm">Техника ещё не назначена на планы работ</div>
        <div className="text-white/25 text-xs mt-1">Назначение выполняет замполаб при подтверждении плана</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {plansWithVehicles.map(plan => {
        const meta = SERVICE_META[plan.service_id]
        const shiftLabel = plan.shift_type === 'DAY' ? '☀️ День' : '🌙 Ночь'
        const [yy, mm, dd] = plan.plan_date.split('-')
        const dateLabel = `${dd}.${mm}.${yy}`

        // Count total assigned vehicles across all items
        const totalVehicles = plan.items.reduce((s, i) => s + (i.vehicles?.length ?? 0), 0)
        const totalRequired = plan.items.reduce((s, i) => s + (i.required_vehicles ?? 0), 0)

        return (
          <div key={plan.id} className="glass rounded-2xl overflow-hidden border border-white/8">
            {/* Plan header */}
            <div className="px-5 py-3 flex items-center gap-3 bg-white/[0.02] border-b border-white/6">
              <span className="text-xl">{meta?.emoji ?? '🔧'}</span>
              <div className="flex-1">
                <span className="font-semibold text-white text-sm">{shiftLabel} · {dateLabel}</span>
                <span className="text-white/40 text-xs ml-2">{plan.items.length} поз.</span>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-lg border ${
                totalVehicles >= totalRequired && totalRequired > 0
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                  : totalVehicles > 0
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                  : 'bg-white/5 text-white/30 border-white/10'
              }`}>
                🚛 {totalVehicles}{totalRequired > 0 ? `/${totalRequired}` : ''} ед.
              </span>
            </div>

            {/* Items with vehicles */}
            <div className="divide-y divide-white/4">
              {plan.items.map(item => {
                if (!item.required_vehicles || item.required_vehicles === 0) return null
                const assigned = item.vehicles ?? []

                return (
                  <div key={item.id} className="px-5 py-3">
                    {/* Work item description */}
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-white/60 text-sm font-medium flex-1">{item.work_description}</span>
                      <span className="text-xs text-white/30 shrink-0">
                        нужно {item.required_vehicles} ед.
                      </span>
                    </div>

                    {/* Assigned vehicles */}
                    {assigned.length === 0 ? (
                      <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-red-500/8 border border-red-500/15">
                        <span className="text-xs text-red-400/70">⚠ Техника не назначена</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {assigned.map((v, idx) => {
                          const stCfg = v.status ? VEHICLE_STATUS_CONFIG[v.status] : null
                          return (
                            <div key={v.id ?? idx} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                              <span className="text-sm">🚛</span>
                              <div>
                                <div className="text-sm font-medium text-white/85">{v.name}</div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {v.plate && (
                                    <span className="text-xs font-mono text-white/50 bg-white/5 px-1.5 py-0.5 rounded">
                                      {v.plate}
                                    </span>
                                  )}
                                  {stCfg && (
                                    <span className="text-xs font-medium" style={{ color: stCfg.color }}>
                                      {stCfg.label}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        {/* Unassigned slots */}
                        {Array.from({ length: Math.max(0, item.required_vehicles - assigned.length) }).map((_, i) => (
                          <div key={`empty-${i}`} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/3 border border-dashed border-white/15">
                            <span className="text-sm opacity-30">🚛</span>
                            <span className="text-xs text-white/25">ожидается</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
