import type { Request, Service } from '@/types'
import { STATUS_CONFIG, SERVICE_META } from '@/types'

interface Props {
  requests: Request[]
  services: Service[]
}

export default function ServiceSummary({ requests, services }: Props) {
  if (services.length === 0) return null

  return (
    <div className="glass rounded-2xl p-5 mb-4">
      <h3 className="text-sm font-bold text-white/70 mb-4">📊 По службам</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="pb-2 text-left text-xs text-white/40">Служба</th>
              <th className="pb-2 text-center text-xs text-white/40">Всего</th>
              <th className="pb-2 text-center text-xs text-white/40">План</th>
              <th className="pb-2 text-center text-xs text-white/40">В работе</th>
              <th className="pb-2 text-center text-xs text-white/40">Готово</th>
            </tr>
          </thead>
          <tbody>
            {services.map(svc => {
              const svcReqs = requests.filter(r => r.service_id === svc.service_id)
              const meta = SERVICE_META[svc.service_id]
              const planned = svcReqs.filter(r => r.status === 'PLANNED').length
              const inProgress = svcReqs.filter(r => r.status === 'IN_PROGRESS').length
              const done = svcReqs.filter(r => r.status === 'DONE').length
              const pct = svcReqs.length > 0 ? Math.round((done / svcReqs.length) * 100) : 0
              return (
                <tr key={svc.service_id} className={`border-b border-white/5 ${svcReqs.length === 0 ? 'opacity-30' : ''}`}>
                  <td className="py-2">
                    <span className="text-white/80">{meta?.emoji} {svc.service_name}</span>
                  </td>
                  <td className="py-2 text-center font-mono text-white/60">{svcReqs.length || '—'}</td>
                  <td className="py-2 text-center font-mono" style={{ color: STATUS_CONFIG.PLANNED.color }}>{planned || '—'}</td>
                  <td className="py-2 text-center font-mono" style={{ color: STATUS_CONFIG.IN_PROGRESS.color }}>{inProgress || '—'}</td>
                  <td className="py-2 text-center">
                    {svcReqs.length > 0
                      ? <><span className="font-mono text-green-400">{done}</span><span className="text-white/20 text-xs ml-1">{pct}%</span></>
                      : <span className="text-white/20">—</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
