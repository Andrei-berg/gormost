'use client'
import { useMemo } from 'react'
import type { UserWithAssignment, VehicleWithAssignments } from '@/types'
import { isWorkerOnDuty } from '@/lib/shifts'

interface Props {
  drivers: UserWithAssignment[]
  vehicles: VehicleWithAssignments[]  // to show who drives what today
  date: string                        // 'YYYY-MM-DD'
}

export default function DriverStats({ drivers, vehicles, date }: Props) {
  const target = useMemo(() => new Date(date + 'T12:00:00'), [date])

  // Drivers on duty today (by shift schedule)
  const onDuty = useMemo(() =>
    drivers.filter(d => {
      if (!d.assignment) return false
      return isWorkerOnDuty({
        shift_num: d.assignment.shift_num,
        schedule_code: d.assignment.schedule_code ?? '',
        shift_reference_date: d.assignment.shift_reference_date,
        rotation_group: d.assignment.rotation_group,
      }, target)
    }),
    [drivers, target]
  )

  // Map: driver user_id → vehicle name (from today's vehicle_assignments)
  const driverVehicleMap = useMemo(() => {
    const map = new Map<string, string>()
    vehicles.forEach(v => {
      v.assignments.forEach(a => {
        if (a.driver_user_id) map.set(a.driver_user_id, v.name)
      })
    })
    return map
  }, [vehicles])

  // Also: vehicle has assigned_driver_id — show permanently assigned driver
  const permanentMap = useMemo(() => {
    const map = new Map<string, string>()
    vehicles.forEach(v => {
      if (v.assigned_driver_id) map.set(v.assigned_driver_id, v.name)
    })
    return map
  }, [vehicles])

  const assigned = onDuty.filter(d =>
    driverVehicleMap.has(d.user_id) || permanentMap.has(d.user_id)
  )
  const free = onDuty.filter(d =>
    !driverVehicleMap.has(d.user_id) && !permanentMap.has(d.user_id)
  )


  const notOnDuty = drivers.filter(d => !onDuty.find(od => od.user_id === d.user_id))

  return (
    <div className="glass rounded-xl p-4 border border-white/10">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-white/40 font-medium uppercase tracking-wide">
          Водители · {new Date(date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', weekday: 'short' })}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/30">Всего: {drivers.length}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${
            free.length === 0
              ? 'bg-red-500/20 text-red-400'
              : free.length <= 1
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'bg-green-500/20 text-green-400'
          }`}>
            {free.length > 0 ? `+${free.length} свободных` : 'Все заняты'}
          </span>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        <div className="bg-white/5 rounded-lg p-2 text-center">
          <div className="text-xl font-bold text-blue-400 font-mono">{onDuty.length}</div>
          <div className="text-[10px] text-white/35">В смене</div>
        </div>
        <div className="bg-white/5 rounded-lg p-2 text-center">
          <div className="text-xl font-bold text-amber-400 font-mono">{assigned.length}</div>
          <div className="text-[10px] text-white/35">Назначено</div>
        </div>
        <div className={`rounded-lg p-2 text-center ${free.length === 0 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
          <div className={`text-xl font-bold font-mono ${free.length === 0 ? 'text-red-400' : 'text-green-400'}`}>
            {free.length}
          </div>
          <div className="text-[10px] text-white/35">Свободных</div>
        </div>
      </div>

      {/* On duty list */}
      {onDuty.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {onDuty.map(d => {
            const vehicleName = driverVehicleMap.get(d.user_id) || permanentMap.get(d.user_id)
            const isAssigned = !!vehicleName
            return (
              <div key={d.user_id} className="flex items-center gap-2 text-xs">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isAssigned ? 'bg-amber-400' : 'bg-green-400'}`} />
                <span className="text-white/70 flex-1 truncate">{d.full_name}</span>
                {vehicleName ? (
                  <span className="text-white/30 font-mono shrink-0">→ {vehicleName}</span>
                ) : (
                  <span className="text-green-400/60 shrink-0">свободен</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {onDuty.length === 0 && (
        <div className="text-center text-white/20 text-xs py-2">
          Водителей в смене нет
        </div>
      )}

      {/* Off duty drivers (collapsed) */}
      {notOnDuty.length > 0 && (
        <div className="pt-2 border-t border-white/5">
          <div className="text-[10px] text-white/20">
            Не в смене: {notOnDuty.map(d => d.full_name).join(', ')}
          </div>
        </div>
      )}
    </div>
  )
}
