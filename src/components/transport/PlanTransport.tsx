'use client'
import type { Vehicle, WorkPlan, WorkPlanItemWithVehicles } from '@/types'
import { SERVICE_META, VEHICLE_TYPE_CONFIG } from '@/types'
import { assignVehicle, unassignVehicle } from '@/lib/api'

const SERVICE_NAMES: Record<string, string> = {
  'SRV-ENG':  'Инженерные системы',
  'SRV-STR':  'Строительная служба (СЭИС)',
  'SRV-FIRE': 'Пожарная безопасность',
  'SRV-VENT': 'Вентиляция',
  'SRV-CCTV': 'Видеонаблюдение',
}

export interface PlanGroup {
  plan: WorkPlan
  items: WorkPlanItemWithVehicles[]
}

interface Props {
  plans: PlanGroup[]
  activeVehicles: Vehicle[]  // ACTIVE vehicles available for assignment
  userId: string
  onRefresh: () => void
}

export default function PlanTransport({ plans, activeVehicles, userId, onRefresh }: Props) {
  const allItems = plans.flatMap(p => p.items)
  if (allItems.length === 0) {
    return (
      <div className="text-center text-white/20 py-20">
        <div className="text-4xl mb-3">📋</div>
        <div>Согласованных планов с транспортными позициями нет</div>
      </div>
    )
  }

  const handleAssign = async (itemId: string, vehicleId: string) => {
    await assignVehicle(vehicleId, itemId, userId)
    onRefresh()
  }

  const handleUnassign = async (vehicleId: string, itemId: string) => {
    await unassignVehicle(vehicleId, itemId)
    onRefresh()
  }

  return (
    <div className="space-y-6">
      {plans.map(({ plan, items }) => {
        if (items.length === 0) return null
        const meta = SERVICE_META[plan.service_id]
        return (
          <div key={plan.id}>
            {/* Service header */}
            <div className="flex items-center gap-2 mb-3 px-1">
              {meta && <span className="text-lg">{meta.emoji}</span>}
              <span className="text-white font-semibold text-sm">{SERVICE_NAMES[plan.service_id] ?? plan.service_id}</span>
              <span className="text-white/30 text-xs ml-1">{plan.shift_type === 'DAY' ? '☀️ 07:30–19:00' : '🌙 19:00–07:00'}</span>
              {plan.plan_date && (
                <span className="text-[10px] font-mono text-white/20 ml-1">{plan.plan_date.split('-').reverse().join('.')}</span>
              )}
            </div>

            <div className="space-y-3">
              {items.map(item => {
                const assigned = item.vehicles
                const hasBroken = assigned.some(v => v.status === 'BROKEN')
                const needsVehicle = assigned.length === 0 || hasBroken

                return (
                  <div
                    key={item.id}
                    className={`glass rounded-xl p-4 border ${
                      hasBroken ? 'border-red-500/30' : needsVehicle ? 'border-amber-500/20' : 'border-transparent'
                    }`}
                  >
                    {/* Task info */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="text-white/25 text-xs font-mono mt-0.5 shrink-0 w-16">
                        {item.time_start?.slice(0, 5) || '--:--'}
                        {item.time_end ? `–${item.time_end.slice(0, 5)}` : ''}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white/90 text-sm">{item.work_description}</div>
                        <div className="text-white/35 text-xs mt-0.5">📍 {item.location}</div>
                      </div>
                    </div>

                    {/* Assigned vehicles */}
                    {assigned.map(v => (
                      <div
                        key={v.id}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 mb-2 ${
                          v.status === 'BROKEN'
                            ? 'bg-red-500/10 border border-red-500/20'
                            : 'bg-white/5 border border-transparent'
                        }`}
                      >
                        <span className="text-base shrink-0">{VEHICLE_TYPE_CONFIG[v.vehicle_type]?.emoji ?? '🚛'}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${v.status === 'BROKEN' ? 'text-red-300' : 'text-white/80'}`}>
                            {v.name}
                          </div>
                          {v.plate && (
                            <span className="font-mono text-xs bg-white/10 text-white/50 px-1.5 py-0.5 rounded tracking-wide">{v.plate}</span>
                          )}
                        </div>
                        {v.status === 'BROKEN' && (
                          <span className="text-red-400 text-xs shrink-0">нужна замена</span>
                        )}
                        <button
                          onClick={() => handleUnassign(v.id, item.id)}
                          className="ml-auto text-white/20 hover:text-white/50 text-xs px-1 shrink-0"
                          title="Снять назначение"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    {/* Assign vehicle */}
                    {needsVehicle && (
                      <select
                        onChange={e => { if (e.target.value) handleAssign(item.id, e.target.value) }}
                        className="form-select w-full text-sm px-3 py-2 border-dashed"
                        value=""
                      >
                        <option value="" disabled>
                          {hasBroken ? '+ Назначить замену' : '+ Назначить транспорт'}
                        </option>
                        {activeVehicles.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name} · {v.plate}
                          </option>
                        ))}
                        {activeVehicles.length === 0 && (
                          <option disabled>Нет свободных машин</option>
                        )}
                      </select>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Unassigned active vehicles — grouped by type */}
      {(() => {
        const assignedIds = new Set(
          plans.flatMap(p => p.items.flatMap(i => i.vehicles.map(v => v.id)))
        )
        const freeVehicles = activeVehicles.filter(v => !assignedIds.has(v.id))
        if (freeVehicles.length === 0) return null

        const byType = new Map<string, typeof freeVehicles>()
        for (const v of freeVehicles) {
          const t = v.vehicle_type ?? 'SPECIAL'
          if (!byType.has(t)) byType.set(t, [])
          byType.get(t)!.push(v)
        }

        return (
          <div className="glass rounded-xl border border-white/8 p-4 mt-2">
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-3">
              Свободная техника · {freeVehicles.length} ед.
            </div>
            <div className="space-y-3">
              {Array.from(byType.entries()).map(([type, vehicles]) => {
                const typeCfg = VEHICLE_TYPE_CONFIG[type as keyof typeof VEHICLE_TYPE_CONFIG]
                return (
                  <div key={type}>
                    <div className="text-[10px] text-white/25 mb-1.5 flex items-center gap-1">
                      <span>{typeCfg?.emoji ?? '🚛'}</span>
                      <span className="uppercase tracking-widest">{typeCfg?.label ?? type} · {vehicles.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {vehicles.map(v => (
                        <span key={v.id} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                          <span>{v.name}</span>
                          {v.plate && <span className="font-mono text-emerald-400/60 text-[10px]">{v.plate}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
