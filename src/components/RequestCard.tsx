'use client'
import type { Request, Category, GObject, Construction, WorkType, Service } from '@/types'
import { PRIORITY_CONFIG, URGENCY_CONFIG, SERVICE_META } from '@/types'

interface Props {
  request: Request
  categories?: Category[]
  objects?: GObject[]
  constructions?: Construction[]
  workTypes?: WorkType[]
  services?: Service[]
  onClick?: () => void
  showService?: boolean
}

export default function RequestCard({
  request: r, categories = [], objects = [], constructions = [], workTypes = [], services = [], onClick, showService = false
}: Props) {
  const cat = categories.find(c => c.category_id === r.category_id)
  const obj = objects.find(o => o.object_id === r.object_id)
  const con = constructions.find(c => c.construction_id === r.construction_id)
  const wt = workTypes.find(w => w.work_type_id === r.work_type_id)
  const svc = services.find(s => s.service_id === r.service_id)
  const svcMeta = r.service_id ? SERVICE_META[r.service_id] : null
  const pri = PRIORITY_CONFIG[r.priority]
  const urg = URGENCY_CONFIG[r.urgency]

  return (
    <div
      onClick={onClick}
      className="glass rounded-xl p-3 hover:bg-white/10 transition-all cursor-pointer group border border-white/5 hover:border-white/20"
    >
      {/* Top: ID + badges */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-white/40">{r.request_id}</span>
        <div className="flex items-center gap-1">
          {r.urgency !== 'NORMAL' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ color: urg.color, background: urg.color + '20', border: `1px solid ${urg.color}40` }}>
              {urg.label}
            </span>
          )}
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ color: pri.color, background: pri.color + '20', border: `1px solid ${pri.color}40` }}>
            {pri.label}
          </span>
        </div>
      </div>

      {/* Service badge */}
      {showService && svc && svcMeta && (
        <div className="flex items-center gap-1.5 mb-2">
          <span>{svcMeta.emoji}</span>
          <span className="text-xs text-white/60">{svc.service_name}</span>
        </div>
      )}

      {/* Content */}
      {cat && <div className="text-xs text-white/40 mb-0.5">{cat.category_name}</div>}
      {obj && <div className="text-sm text-white/80 font-medium mb-0.5">{obj.object_name}</div>}
      {con && <div className="text-xs text-white/50">{con.construction_name}</div>}
      {wt && <div className="text-xs text-cyan-400/70 mt-1">{wt.work_name}</div>}
      {r.description && <div className="text-xs text-white/40 mt-1 line-clamp-2">{r.description}</div>}

      {/* Bottom: Transport + Fact */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
        {r.transport_type ? (
          <span className="text-[10px] text-white/40">🚗 {r.transport_type}</span>
        ) : <span />}
        {r.fact_start && !r.fact_finish && (
          <span className="text-[10px] text-green-400">▶ В работе</span>
        )}
        {r.fact_finish && (
          <span className="text-[10px] text-green-400">✓ Завершена</span>
        )}
      </div>
    </div>
  )
}
