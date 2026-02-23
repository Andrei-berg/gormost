import type { Request } from '@/types'

export interface Vehicle {
  id: string
  name: string
  plate: string
  type: string
}

interface Props {
  vehicles: Vehicle[]
  requests: Request[]
}

export default function VehicleGrid({ vehicles, requests }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {vehicles.map(v => {
        const assigned = requests.filter(r => r.transport_type === v.name && r.status !== 'DONE')
        const isBusy = assigned.length > 0
        return (
          <div key={v.id} className="glass rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">🚛</span>
              <div>
                <div className="text-white font-medium">{v.name}</div>
                <div className="text-xs text-white/40">{v.plate} · {v.type}</div>
              </div>
            </div>
            <div className={`text-xs px-2 py-1 rounded-lg ${isBusy ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'}`}>
              {isBusy ? `Занят: ${assigned.length} заявок` : 'Свободен'}
            </div>
            {isBusy && (
              <div className="mt-2 space-y-1">
                {assigned.map(r => (
                  <div key={r.request_id} className="text-xs text-white/40 truncate">
                    · {r.description || r.request_id}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
