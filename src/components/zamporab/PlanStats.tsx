import type { Request, Service } from '@/types'
import { SERVICE_META } from '@/types'

interface Props {
  requests: Request[]
  services: Service[]
  pendingApproval: number
}

export default function PlanStats({ requests, services, pendingApproval }: Props) {
  const total = requests.length
  const approvedByHead = requests.filter(r => r.approved_by_head).length
  const approvedByMe = requests.filter(r => r.approved_by_zamporab).length
  const done = requests.filter(r => r.status === 'DONE').length
  const inProgress = requests.filter(r => r.status === 'IN_PROGRESS').length

  return (
    <div className="space-y-4 mb-6">
      {/* KPI row */}
      <div className="grid grid-cols-5 gap-3">
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white font-mono">{total}</div>
          <div className="text-xs text-white/40">Всего заявок</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-400 font-mono">{pendingApproval}</div>
          <div className="text-xs text-white/40">Ждут согл.</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400 font-mono">{approvedByMe}</div>
          <div className="text-xs text-white/40">Согл. мной</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-violet-400 font-mono">{inProgress}</div>
          <div className="text-xs text-white/40">В работе</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400 font-mono">{done}</div>
          <div className="text-xs text-white/40">Выполнено</div>
        </div>
      </div>

      {/* По службам */}
      <div className="glass rounded-2xl p-4">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Заявки по службам</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {services.map(svc => {
            const svcReqs = requests.filter(r => r.service_id === svc.service_id)
            const meta = SERVICE_META[svc.service_id]
            const svcDone = svcReqs.filter(r => r.status === 'DONE').length
            const pct = svcReqs.length > 0 ? Math.round((svcDone / svcReqs.length) * 100) : 0
            return (
              <div key={svc.service_id} className={`glass rounded-xl p-3 text-center ${svcReqs.length === 0 ? 'opacity-40' : ''}`}>
                <div className="text-2xl mb-1">{meta?.emoji || '📋'}</div>
                <div className="text-xs text-white/60 mb-2 truncate">{svc.service_name}</div>
                <div className="text-lg font-bold font-mono" style={{ color: meta?.color || '#fff' }}>
                  {svcReqs.length > 0 ? svcReqs.length : '—'}
                </div>
                <div className="text-[10px] text-white/30">{svcReqs.length > 0 ? `${pct}% готово` : 'нет плана'}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
