'use client'
import type { WorkPlanWithItems } from '@/types'
import { SERVICE_META, VEHICLE_STATUS_CONFIG } from '@/types'
import type { Service } from '@/types'
import VehicleNumberBadge from '@/components/VehicleNumberBadge'

interface Props {
  plans: WorkPlanWithItems[]
  services: Service[]
}

export default function HeadTransportTab({ plans }: Props) {
  const plansWithVehicles = plans.filter(p =>
    p.items.some(i => i.required_vehicles && i.required_vehicles > 0)
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
    <div className="space-y-5">
      {plansWithVehicles.map(plan => {
        const meta = SERVICE_META[plan.service_id]
        const shiftLabel = plan.shift_type === 'DAY' ? '☀️ День' : '🌙 Ночь'
        const [yy, mm, dd] = plan.plan_date.split('-')
        const dateLabel = `${dd}.${mm}.${yy}`

        const itemsNeedVehicle = plan.items.filter(i => i.required_vehicles && i.required_vehicles > 0)
        const totalAssigned = itemsNeedVehicle.reduce((s, i) => s + (i.vehicles?.length ?? 0), 0)
        const totalRequired = itemsNeedVehicle.reduce((s, i) => s + (i.required_vehicles ?? 0), 0)
        const allFilled = totalAssigned >= totalRequired && totalRequired > 0

        return (
          <div key={plan.id} className="glass rounded-2xl overflow-hidden border border-white/8">

            {/* Plan header */}
            <div className="px-5 py-3 flex items-center gap-3 bg-white/[0.02] border-b border-white/8">
              <span className="text-xl">{meta?.emoji ?? '🔧'}</span>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-white">{shiftLabel} · {dateLabel}</span>
                <span className="text-white/35 text-xs ml-2">{itemsNeedVehicle.length} поз. с техникой</span>
              </div>
              <span className={`text-sm font-semibold px-3 py-1 rounded-lg border ${
                allFilled
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                  : totalAssigned > 0
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                  : 'bg-red-500/10 text-red-400/70 border-red-500/15'
              }`}>
                🚛 {totalAssigned} / {totalRequired}
              </span>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto] px-5 py-2 border-b border-white/6 bg-white/[0.01]">
              <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium">Работа</span>
              <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium">Назначенная техника</span>
            </div>

            {/* Items */}
            <div className="divide-y divide-white/5">
              {itemsNeedVehicle.map((item, idx) => {
                const assigned = item.vehicles ?? []
                const missing = Math.max(0, (item.required_vehicles ?? 0) - assigned.length)
                const filled = assigned.length >= (item.required_vehicles ?? 0)

                return (
                  <div key={item.id} className="grid grid-cols-[1fr_auto] gap-6 px-5 py-3.5 items-start">

                    {/* Left: work description */}
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] text-white/25 font-mono">#{idx + 1}</span>
                        <span className="text-sm font-medium text-white/80">
                          {item.work_description || '—'}
                        </span>
                      </div>
                      {item.location && (
                        <span className="text-xs text-white/35">📍 {item.location}</span>
                      )}
                      {item.time_start && item.time_end && (
                        <span className="text-xs text-white/30 ml-3">
                          🕐 {item.time_start}–{item.time_end}
                        </span>
                      )}
                    </div>

                    {/* Right: assigned vehicles */}
                    <div className="flex flex-col gap-1.5 min-w-[280px]">
                      {assigned.length === 0 ? (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/15">
                          <span className="text-red-400/60 text-sm">⚠</span>
                          <span className="text-sm text-red-400/70">Техника не назначена</span>
                        </div>
                      ) : (
                        <>
                          {assigned.map((v, i) => {
                            const stCfg = v.status ? VEHICLE_STATUS_CONFIG[v.status] : null
                            const isBroken = v.status && v.status !== 'ACTIVE'
                            return (
                              <div
                                key={v.id ?? i}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${
                                  isBroken
                                    ? 'bg-red-500/8 border-red-500/20'
                                    : 'bg-blue-500/8 border-blue-500/20'
                                }`}
                              >
                                <span className="text-base shrink-0">🚛</span>
                                <div className="flex-1 min-w-0">
                                  {/* Vehicle name — prominent */}
                                  <div className="font-semibold text-white/90 text-sm leading-tight">
                                    {v.name}
                                  </div>
                                  {/* Plate + status on second line */}
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {(v.fleet_number || v.plate) ? (
                                      <VehicleNumberBadge number={v.fleet_number} plate={v.plate} size="sm" />
                                    ) : (
                                      <span className="text-xs text-white/25">б/н</span>
                                    )}
                                    {stCfg && isBroken && (
                                      <span className="text-xs font-medium" style={{ color: stCfg.color }}>
                                        ⚠ {stCfg.label}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                          {/* Placeholder slots for missing vehicles */}
                          {missing > 0 && Array.from({ length: missing }).map((_, i) => (
                            <div key={`slot-${i}`} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/3 border border-dashed border-white/12">
                              <span className="text-base opacity-25">🚛</span>
                              <span className="text-xs text-white/30">ожидается назначение</span>
                            </div>
                          ))}
                        </>
                      )}

                      {/* Summary chip */}
                      {(item.required_vehicles ?? 0) > 0 && (
                        <div className={`text-right text-[11px] font-medium mt-0.5 ${
                          filled ? 'text-emerald-400/70' : 'text-amber-400/70'
                        }`}>
                          {filled ? '✓ укомплектовано' : `${assigned.length} из ${item.required_vehicles} назначено`}
                        </div>
                      )}
                    </div>

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
