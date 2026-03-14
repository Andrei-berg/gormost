'use client'
import type { User } from '@/types'

interface Props {
  drivers: User[]                // users with is_driver=true (active)
  vehiclesAssignedCount: number  // vehicles assigned to jobs today
}

export default function DriverStats({ drivers, vehiclesAssignedCount }: Props) {
  const driverCount = drivers.length
  const delta       = driverCount - vehiclesAssignedCount

  const deltaColor = delta > 0 ? 'text-green-400' : delta === 0 ? 'text-yellow-400' : 'text-red-400'
  const deltaLabel =
    delta > 0  ? `+${delta} свободных`  :
    delta === 0 ? 'Водителей впритык'    :
                  `${Math.abs(delta)} нехватка`

  return (
    <div className="glass rounded-xl p-4 border border-white/10">
      <div className="text-xs text-white/40 mb-3 font-medium uppercase tracking-wide">
        Водители
      </div>
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400 font-mono">{driverCount}</div>
          <div className="text-[11px] text-white/40">Всего водителей</div>
        </div>
        <div className="text-white/20 text-xl">→</div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white/60 font-mono">{vehiclesAssignedCount}</div>
          <div className="text-[11px] text-white/40">Машин назначено</div>
        </div>
        <div className={`ml-auto text-sm font-medium ${deltaColor}`}>
          {deltaLabel}
        </div>
      </div>

      {/* Driver list */}
      {drivers.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-x-4 gap-y-1">
          {drivers.map(u => (
            <div key={u.user_id} className="text-xs text-white/40 flex items-center gap-1">
              <span className="text-white/20">👤</span>
              {u.full_name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
