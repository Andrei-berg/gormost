'use client'
import { useMemo } from 'react'
import type { UserWithAssignment, VehicleWithAssignments } from '@/types'
import { isWorkerOnDuty } from '@/lib/shifts'

interface Props {
  drivers: UserWithAssignment[]
  vehicles: VehicleWithAssignments[]
  date: string  // 'YYYY-MM-DD'
}

export default function DriverList({ drivers, vehicles, date }: Props) {
  const target = useMemo(() => new Date(date + 'T12:00:00'), [date])

  // Permanent driver → vehicle map
  const permanentMap = useMemo(() => {
    const map = new Map<string, string>()
    vehicles.forEach(v => { if (v.assigned_driver_id) map.set(v.assigned_driver_id, v.name) })
    return map
  }, [vehicles])

  // Drivers on duty today
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

  const offDuty = drivers.filter(d => !onDuty.find(od => od.user_id === d.user_id))

  if (drivers.length === 0) {
    return (
      <div className="text-center text-white/20 py-20">
        <div className="text-4xl mb-3">👤</div>
        <div>Водители не назначены</div>
        <div className="text-xs mt-2 text-white/15">
          Отметьте &quot;водитель&quot; в Админ → Смены для нужных сотрудников
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-white/80 font-mono">{drivers.length}</div>
          <div className="text-[11px] text-white/40">Всего водителей</div>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-blue-400 font-mono">{onDuty.length}</div>
          <div className="text-[11px] text-white/40">В смене сегодня</div>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-white/30 font-mono">{offDuty.length}</div>
          <div className="text-[11px] text-white/40">Не в смене</div>
        </div>
      </div>

      {/* On duty */}
      {onDuty.length > 0 && (
        <div>
          <div className="text-xs text-white/30 font-medium uppercase tracking-wide mb-2 px-1">
            В смене сегодня
          </div>
          <div className="space-y-2">
            {onDuty.map(d => {
              const vehicle = permanentMap.get(d.user_id)
              return (
                <div key={d.user_id} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium">{d.full_name}</div>
                    <div className="text-white/30 text-xs">
                      {d.position || '—'}
                      {d.assignment?.schedule_code && (
                        <span className="ml-2 text-white/20">· {d.assignment.schedule_code}</span>
                      )}
                    </div>
                  </div>
                  {vehicle ? (
                    <div className="text-right shrink-0">
                      <div className="text-amber-400 text-xs font-medium">🚛 {vehicle}</div>
                      <div className="text-white/20 text-[10px]">закреплён</div>
                    </div>
                  ) : (
                    <span className="text-green-400 text-xs shrink-0">свободен</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Off duty */}
      {offDuty.length > 0 && (
        <div>
          <div className="text-xs text-white/20 font-medium uppercase tracking-wide mb-2 px-1">
            Не в смене
          </div>
          <div className="space-y-1.5">
            {offDuty.map(d => (
              <div key={d.user_id} className="glass rounded-xl px-4 py-2.5 flex items-center gap-3 opacity-40">
                <span className="w-2 h-2 rounded-full bg-white/20 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm">{d.full_name}</div>
                  <div className="text-white/30 text-xs">
                    {d.position || '—'}
                    {d.assignment?.schedule_code && (
                      <span className="ml-2">· {d.assignment.schedule_code}</span>
                    )}
                  </div>
                </div>
                {permanentMap.get(d.user_id) && (
                  <span className="text-white/30 text-xs shrink-0">🚛 {permanentMap.get(d.user_id)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
