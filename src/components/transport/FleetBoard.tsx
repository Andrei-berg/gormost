'use client'
import { useState } from 'react'
import type { Vehicle, VehicleStatus, VehicleWithAssignments, User } from '@/types'
import { VEHICLE_STATUS_CONFIG, VEHICLE_TYPE_CONFIG } from '@/types'
import { updateVehicleStatus } from '@/lib/api'
import VehicleStatusModal from './VehicleStatusModal'
import VehicleForm from './VehicleForm'

interface Props {
  vehicles: VehicleWithAssignments[]
  drivers: User[]     // users with is_driver=true (for VehicleForm)
  canEdit: boolean
  onRefresh: () => void
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

function daysLabel(n: number): string {
  if (n === 0) return 'с сегодня'
  if (n === 1) return '1 день'
  if (n < 5) return `${n} дня`
  return `${n} дней`
}

// Compact vehicle characteristics line
function VehicleSpecs({ v }: { v: Vehicle }) {
  const parts: string[] = []
  if (v.year)        parts.push(String(v.year))
  if (v.payload_kg)  parts.push(`${(v.payload_kg / 1000).toFixed(1)} т`)
  if (v.seats)       parts.push(`${v.seats} мест`)
  if (v.max_height_m) parts.push(`↑${v.max_height_m} м`)
  if (v.has_water_tank) parts.push('цистерна')
  if (v.garage_location) parts.push(v.garage_location)
  if (parts.length === 0) return null
  return <div className="text-[11px] text-white/25 mt-0.5">{parts.join(' · ')}</div>
}

export default function FleetBoard({ vehicles, drivers, canEdit, onRefresh }: Props) {
  const [statusVehicle, setStatusVehicle] = useState<Vehicle | null>(null)
  const [editVehicle, setEditVehicle]     = useState<Vehicle | null>(null)
  const [showAddForm, setShowAddForm]     = useState(false)

  // Sort: BROKEN first → MAINTENANCE → ACTIVE
  const sorted = [...vehicles].sort((a, b) => {
    const order: Record<VehicleStatus, number> = { BROKEN: 0, MAINTENANCE: 1, ACTIVE: 2 }
    return order[a.status] - order[b.status]
  })

  const handleSaveStatus = async (
    status: VehicleStatus,
    breakdown: string | null,
    maintenanceUntil: string | null
  ) => {
    if (!statusVehicle) return
    await updateVehicleStatus(statusVehicle.id, status, breakdown, maintenanceUntil)
    onRefresh()
  }

  return (
    <>
      {/* Add vehicle button */}
      {canEdit && (
        <div className="flex justify-end mb-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-sm hover:bg-blue-600/30 transition-colors"
          >
            + Добавить ТС
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map(v => {
          const cfg     = VEHICLE_STATUS_CONFIG[v.status]
          const typeCfg = VEHICLE_TYPE_CONFIG[v.vehicle_type]
          const since   = v.status_changed_at || v.updated_at
          const days    = daysSince(since)
          const isStale = v.status !== 'ACTIVE' && days >= 3

          return (
            <div
              key={v.id}
              className={`glass rounded-xl p-4 border ${
                isStale ? 'border-red-500/40' : v.status === 'BROKEN' ? 'border-red-500/20' : 'border-transparent'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-2xl shrink-0">{typeCfg.emoji}</span>
                  <div className="min-w-0">
                    <div className="text-white font-medium text-sm truncate">{v.name}</div>
                    <div className="text-xs text-white/30">
                      {v.plate}
                      {v.fleet_number ? ` · №${v.fleet_number}` : ''}
                      {' · '}{typeCfg.label}
                    </div>
                    <VehicleSpecs v={v} />
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-lg border shrink-0 ${cfg.bg}`}
                  style={{ color: cfg.color }}
                >
                  {cfg.label}
                </span>
              </div>

              {/* Breakdown / maintenance info */}
              {v.status !== 'ACTIVE' && (
                <div className={`rounded-lg px-3 py-2 mb-3 text-xs space-y-1 ${
                  isStale ? 'bg-red-500/10 border border-red-500/30' : 'bg-white/5'
                }`}>
                  {v.breakdown_details && (
                    <div className="text-white/70">{v.breakdown_details}</div>
                  )}
                  <div className="flex items-center justify-between text-white/40">
                    <span>{daysLabel(days)}</span>
                    {isStale && <span className="text-red-400 font-medium">⚠ Долго в ремонте</span>}
                  </div>
                  {v.maintenance_until && v.status === 'MAINTENANCE' && (
                    <div className="text-blue-400">
                      Возврат: {new Date(v.maintenance_until).toLocaleDateString('ru-RU')}
                    </div>
                  )}
                </div>
              )}

              {/* Today's assignments (ACTIVE vehicles) */}
              {v.status === 'ACTIVE' && (
                <div className="mb-3">
                  {v.assignments.length > 0 ? (
                    <div className="space-y-1">
                      {v.assignments.map(a => (
                        <div key={a.id} className="bg-white/5 rounded-lg px-2 py-1.5 text-xs text-white/60 flex items-center gap-2">
                          <span className="text-white/30 font-mono shrink-0">
                            {a.plan_item?.time_start?.slice(0, 5) || '?'}–{a.plan_item?.time_end?.slice(0, 5) || '?'}
                          </span>
                          <span className="truncate">{a.plan_item?.location}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-green-400">Свободен сегодня</div>
                  )}
                </div>
              )}

              {/* Buttons */}
              {canEdit && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setStatusVehicle(v)}
                    className="flex-1 py-1.5 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 text-xs transition-colors"
                  >
                    Статус
                  </button>
                  <button
                    onClick={() => setEditVehicle(v)}
                    className="flex-1 py-1.5 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 text-xs transition-colors"
                  >
                    Изменить
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {vehicles.length === 0 && (
          <div className="col-span-3 text-center text-white/20 py-20">
            <div className="text-4xl mb-3">🚗</div>
            <div>Автопарк пуст</div>
            {canEdit && (
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-4 px-4 py-2 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-sm"
              >
                + Добавить первое ТС
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {statusVehicle && (
        <VehicleStatusModal
          vehicle={statusVehicle}
          onSave={handleSaveStatus}
          onClose={() => setStatusVehicle(null)}
        />
      )}
      {(showAddForm || editVehicle) && (
        <VehicleForm
          vehicle={editVehicle ?? undefined}
          drivers={drivers}
          onSave={onRefresh}
          onClose={() => { setShowAddForm(false); setEditVehicle(null) }}
        />
      )}
    </>
  )
}
