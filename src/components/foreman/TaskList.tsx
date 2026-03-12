import type { Request, Category, GObject, Construction, WorkType, Service, RequestStatus } from '@/types'
import { STATUS_CONFIG, SERVICE_META } from '@/types'

interface Props {
  requests: Request[]
  myRequestIds: Set<string>
  categories: Category[]
  objects: GObject[]
  constructions: Construction[]
  workTypes: WorkType[]
  services: Service[]
  actionLoading: string | null
  onAction: (reqId: string, status: RequestStatus) => void
}

export default function TaskList({ requests, myRequestIds, categories, objects, constructions, workTypes, services, actionLoading, onAction }: Props) {
  if (requests.length === 0) {
    return <div className="text-center text-white/20 py-20">Нет назначенных задач</div>
  }

  return (
    <div className="space-y-3">
      {requests.map(r => {
        const cat = categories.find(c => c.category_id === r.category_id)
        const obj = objects.find(o => o.object_id === r.object_id)
        const con = constructions.find(c => c.construction_id === r.construction_id)
        const wt = workTypes.find(w => w.work_type_id === r.work_type_id)
        const svc = services.find(s => s.service_id === r.service_id)
        const meta = r.service_id ? SERVICE_META[r.service_id] : null
        const st = STATUS_CONFIG[r.status]
        const isMine = myRequestIds.has(r.request_id)
        const isLoading = actionLoading === r.request_id

        return (
          <div key={r.request_id} className={`glass rounded-xl p-4 transition-all ${isMine ? 'border border-blue-500/20' : 'border border-white/5'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-mono text-white/30">{r.request_id}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ color: st.color, background: st.color + '20' }}>
                    {st.label}
                  </span>
                  {meta && <span className="text-xs text-white/40">{meta.emoji} {svc?.service_name}</span>}
                  {isMine && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">МОЯ</span>}
                </div>
                {cat && <div className="text-xs text-white/30">{cat.category_name}</div>}
                {obj && <div className="text-white/90 font-medium">{obj.object_name}</div>}
                {con && <div className="text-sm text-white/50">{con.construction_name}</div>}
                {wt && <div className="text-sm text-cyan-400/70">{wt.work_name}</div>}
                {r.description && <div className="text-xs text-white/30 mt-1">{r.description}</div>}
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                {r.status === 'PLANNED' && isMine && (
                  <button onClick={() => onAction(r.request_id, 'IN_PROGRESS')} disabled={isLoading}
                    className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-bold disabled:opacity-50">
                    {isLoading ? '...' : '▶ Начать'}
                  </button>
                )}
                {r.status === 'IN_PROGRESS' && isMine && (
                  <button onClick={() => onAction(r.request_id, 'DONE')} disabled={isLoading}
                    className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-bold disabled:opacity-50">
                    {isLoading ? '...' : '✓ Выполнено'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
