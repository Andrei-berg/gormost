import type { Service } from '@/types'
import { STATUS_CONFIG, SERVICE_META } from '@/types'

interface Stats {
  total: number
  byStatus: Record<string, number>
  byService: Record<string, number>
}

interface Props {
  stats: Stats
  services: Service[]
}

export default function OverviewCharts({ stats, services }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* По статусам */}
      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white/70 mb-4">По статусам</h3>
        <div className="space-y-3">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = stats.byStatus[key] || 0
            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0
            return (
              <div key={key}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-white/70">{cfg.label}</span>
                  <span className="font-mono text-white/50">{count}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: cfg.color }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* По службам */}
      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white/70 mb-4">По службам</h3>
        <div className="space-y-3">
          {services.map(svc => {
            const count = stats.byService[svc.service_id] || 0
            const meta = SERVICE_META[svc.service_id]
            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0
            return (
              <div key={svc.service_id}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-white/70">{meta?.emoji} {svc.service_name}</span>
                  <span className="font-mono text-white/50">{count}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: meta?.color || '#64748b' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
