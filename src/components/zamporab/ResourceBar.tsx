'use client'
import { useState, useMemo } from 'react'
import type { UserWithAssignment, Vehicle } from '@/types'
import { VEHICLE_STATUS_CONFIG } from '@/types'
import { isWorkerOnDuty } from '@/lib/shifts'

interface Props {
  driverUsers: UserWithAssignment[]
  vehicles: Vehicle[]
}

function classifyDriver(user: UserWithAssignment) {
  const pos = (user.position ?? '').toLowerCase()
  if (pos.includes('тракторист') || pos.includes('машинист')) return 'operator'
  return 'driver'
}

function isOnDuty(user: UserWithAssignment): boolean {
  const a = user.assignment
  if (!a || !a.schedule_code) return false
  return isWorkerOnDuty(
    {
      shift_num: a.shift_num,
      schedule_code: a.schedule_code,
      shift_reference_date: a.shift_reference_date,
      rotation_group: a.rotation_group,
      active_phase: a.active_phase ?? null,
      custom_work_days: a.custom_work_days ?? null,
      custom_rest_days: a.custom_rest_days ?? null,
    },
    new Date()
  )
}

export default function ResourceBar({ driverUsers, vehicles }: Props) {
  const [expanded, setExpanded] = useState(false)

  const { onDutyDrivers, onDutyOperators, totalDrivers, totalOperators } = useMemo(() => {
    const drivers   = driverUsers.filter(u => classifyDriver(u) === 'driver')
    const operators = driverUsers.filter(u => classifyDriver(u) === 'operator')
    return {
      onDutyDrivers:   drivers.filter(isOnDuty),
      onDutyOperators: operators.filter(isOnDuty),
      totalDrivers:    drivers.length,
      totalOperators:  operators.length,
    }
  }, [driverUsers])

  const activeVehicles  = vehicles.filter(v => v.status === 'ACTIVE')
  const brokenVehicles  = vehicles.filter(v => v.status !== 'ACTIVE')

  const metricCls = 'flex items-center gap-2 text-sm'

  return (
    <div className="glass rounded-xl border border-white/8 mb-3 overflow-hidden">
      {/* Compact bar — always visible */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-5 px-4 py-2.5 hover:bg-white/[0.02] transition-colors text-left"
      >
        <span className="text-[10px] text-white/30 uppercase tracking-widest shrink-0">
          Ресурсы смены
        </span>

        <div className={metricCls}>
          <span>🚗</span>
          <span className="text-white font-semibold">{onDutyDrivers.length}</span>
          <span className="text-white/35">/ {totalDrivers} вод.</span>
        </div>

        <div className={metricCls}>
          <span>🚜</span>
          <span className="text-white font-semibold">{onDutyOperators.length}</span>
          <span className="text-white/35">/ {totalOperators} трактор.</span>
        </div>

        <div className={metricCls}>
          <span>🔧</span>
          <span className={activeVehicles.length > 0 ? 'text-emerald-400 font-semibold' : 'text-white/30 font-semibold'}>
            {activeVehicles.length}
          </span>
          <span className="text-white/35">исправна</span>
          {brokenVehicles.length > 0 && (
            <span className="text-red-400/70 text-xs">({brokenVehicles.length} неиспр.)</span>
          )}
        </div>

        <span className="ml-auto text-white/25 text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-white/8 px-4 py-3 grid grid-cols-3 gap-4">

          {/* Drivers */}
          <div>
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2">
              🚗 Водители на смене · {onDutyDrivers.length}
            </div>
            {onDutyDrivers.length === 0 ? (
              <div className="text-xs text-white/20">Нет на смене</div>
            ) : (
              <div className="space-y-1">
                {onDutyDrivers.map(u => (
                  <div key={u.user_id} className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400/60 shrink-0" />
                    <span className="text-xs text-white/70">{u.full_name}</span>
                  </div>
                ))}
                {driverUsers.filter(u => classifyDriver(u) === 'driver' && !isOnDuty(u)).map(u => (
                  <div key={u.user_id} className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/15 shrink-0" />
                    <span className="text-xs text-white/25">{u.full_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Operators / tractoristi */}
          <div>
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2">
              🚜 Трактористы / машинисты · {onDutyOperators.length}
            </div>
            {onDutyOperators.length === 0 ? (
              <div className="text-xs text-white/20">Нет на смене</div>
            ) : (
              <div className="space-y-1">
                {onDutyOperators.map(u => (
                  <div key={u.user_id} className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400/60 shrink-0" />
                    <span className="text-xs text-white/70">{u.full_name}</span>
                  </div>
                ))}
                {driverUsers.filter(u => classifyDriver(u) === 'operator' && !isOnDuty(u)).map(u => (
                  <div key={u.user_id} className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/15 shrink-0" />
                    <span className="text-xs text-white/25">{u.full_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vehicles */}
          <div>
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2">
              🔧 Техника · {activeVehicles.length} исправна
            </div>
            <div className="space-y-1">
              {vehicles.map(v => {
                const stCfg = VEHICLE_STATUS_CONFIG[v.status]
                return (
                  <div key={v.id} className="flex items-center gap-1.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: stCfg.color + 'aa' }}
                    />
                    <span className={`text-xs ${v.status === 'ACTIVE' ? 'text-white/70' : 'text-white/25'}`}>
                      {v.name}
                    </span>
                    {v.plate && (
                      <span className="text-[10px] text-white/20 font-mono ml-auto">{v.plate}</span>
                    )}
                  </div>
                )
              })}
              {vehicles.length === 0 && (
                <div className="text-xs text-white/20">Нет техники</div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
