import type { Request, Category, GObject, Service } from '@/types'
import { STATUS_CONFIG } from '@/types'

interface Props {
  requests: Request[]
  categories: Category[]
  objects: GObject[]
  services: Service[]
  onRowClick: (r: Request) => void
}

export default function TableView({ requests, categories, objects, services, onRowClick }: Props) {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">ID</th>
            <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Служба</th>
            <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Категория</th>
            <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Объект</th>
            <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Статус</th>
            <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Приоритет</th>
          </tr>
        </thead>
        <tbody>
          {requests.map(r => {
            const cat = categories.find(c => c.category_id === r.category_id)
            const obj = objects.find(o => o.object_id === r.object_id)
            const svc = services.find(s => s.service_id === r.service_id)
            const st = STATUS_CONFIG[r.status]
            return (
              <tr key={r.request_id} onClick={() => onRowClick(r)} className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-all">
                <td className="px-4 py-3 font-mono text-white/50 text-xs">{r.request_id}</td>
                <td className="px-4 py-3 text-white/70">{svc?.service_name || '—'}</td>
                <td className="px-4 py-3 text-white/50">{cat?.category_name || '—'}</td>
                <td className="px-4 py-3 text-white/80">{obj?.object_name || '—'}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ color: st.color, background: st.color + '20' }}>
                    {st.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-white/60">{r.priority}</td>
              </tr>
            )
          })}
          {requests.length === 0 && (
            <tr><td colSpan={6} className="px-4 py-12 text-center text-white/20">Нет заявок</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
