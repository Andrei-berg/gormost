import type { Service } from '@/types'
import { SERVICE_META } from '@/types'

interface ActiveAssignment {
  user_id: string
  full_name: string
  service_id: string | null
  request_id: string
  object_name?: string
}

interface Props {
  totalDeployed: number
  byService: Record<string, number>
  activeAssignments: ActiveAssignment[]
  services: Service[]
}

export default function PeopleStats({ totalDeployed, byService, activeAssignments, services }: Props) {
  return (
    <div className="glass rounded-2xl p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white/70">👥 Люди в работе</h3>
        <span className="text-2xl font-bold font-mono text-white">{totalDeployed}</span>
      </div>

      {totalDeployed === 0 ? (
        <div className="text-center text-white/20 py-4 text-sm">Нет активных работ</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* По службам */}
          <div>
            <div className="text-xs text-white/40 mb-2 uppercase tracking-wider">По службам</div>
            <div className="space-y-2">
              {services.map(svc => {
                const count = byService[svc.service_id] || 0
                if (count === 0) return null
                const meta = SERVICE_META[svc.service_id]
                return (
                  <div key={svc.service_id} className="flex items-center justify-between">
                    <span className="text-sm text-white/60">{meta?.emoji} {svc.service_name}</span>
                    <span className="font-mono text-sm font-bold" style={{ color: meta?.color || '#fff' }}>{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Пофамильно */}
          <div>
            <div className="text-xs text-white/40 mb-2 uppercase tracking-wider">Кто где</div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {activeAssignments.map((a, i) => (
                <div key={`${a.user_id}-${a.request_id}-${i}`} className="flex items-center justify-between text-sm">
                  <span className="text-white/80">{a.full_name}</span>
                  <span className="text-white/30 text-xs truncate max-w-[120px]">{a.object_name || a.request_id}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
