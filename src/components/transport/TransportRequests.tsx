import type { Request, Service } from '@/types'
import { SERVICE_META } from '@/types'
import type { Vehicle } from './VehicleGrid'

interface Props {
  requests: Request[]
  services: Service[]
  vehicles: Vehicle[]
  onAssign: (reqId: string, vehicle: string) => void
}

export default function TransportRequests({ requests, services, vehicles, onAssign }: Props) {
  if (requests.length === 0) {
    return <div className="text-center text-white/20 py-20">Все заявки обеспечены транспортом</div>
  }

  return (
    <div className="space-y-3">
      {requests.map(r => {
        const svc = services.find(s => s.service_id === r.service_id)
        const meta = r.service_id ? SERVICE_META[r.service_id] : null
        return (
          <div key={r.request_id} className="glass rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-white/30">{r.request_id}</span>
                  {meta && <span className="text-xs text-white/40">{meta.emoji} {svc?.service_name}</span>}
                </div>
                <div className="text-white/80">{r.description || 'Без описания'}</div>
                {r.transport_type && (
                  <div className="text-xs text-green-400 mt-1">🚛 {r.transport_type}</div>
                )}
              </div>
              <select
                onChange={e => { if (e.target.value) onAssign(r.request_id, e.target.value) }}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none shrink-0"
                value={r.transport_type || ''}
              >
                <option value="" disabled>Назначить</option>
                {vehicles.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
              </select>
            </div>
          </div>
        )
      })}
    </div>
  )
}
