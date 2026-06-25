'use client'
// UrgentOrderAlert — shown in the foreman's brigade view when workers were
// pulled off this brigade for a срочное поручение сверху.

import { useState, useEffect } from 'react'
import { fetchUrgentOrders } from '@/lib/api-client'
import type { UrgentOrderWithWorkers, UrgentOrderWorker } from '@/types'
import { DIRECTIVE_PRIORITY_CONFIG } from '@/types'

interface Props {
  // Only alert for workers in this foreman's active plan.
  planWorkerIds: string[]
}

export default function UrgentOrderAlert({ planWorkerIds }: Props) {
  const [pulled, setPulled] = useState<Array<{ worker: UrgentOrderWorker; order: UrgentOrderWithWorkers }>>([])

  useEffect(() => {
    if (!planWorkerIds.length) return
    fetchUrgentOrders().then(orders => {
      const active = orders.filter(o => o.status === 'ACTIVE')
      const hits: Array<{ worker: UrgentOrderWorker; order: UrgentOrderWithWorkers }> = []
      active.forEach(o => o.workers.forEach(w => {
        if (w.worker_id && planWorkerIds.includes(w.worker_id)) hits.push({ worker: w, order: o })
      }))
      setPulled(hits)
    })
  }, [planWorkerIds])

  if (!pulled.length) return null

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 mb-4">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-xl">⚠️</span>
        <div>
          <div className="text-sm font-semibold text-amber-300">Состав бригады изменён</div>
          <div className="text-xs text-white/40 mt-0.5">
            {pulled.length === 1 ? '1 работник снят' : `${pulled.length} работника сняты`} на срочное поручение
          </div>
        </div>
      </div>
      <div className="bg-white/[0.04] rounded-lg divide-y divide-white/5">
        {pulled.map(({ worker, order }) => {
          const pr = DIRECTIVE_PRIORITY_CONFIG[order.priority]
          const dt = new Date(order.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
          return (
            <div key={worker.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">{worker.worker_name}</div>
                <div className="text-xs text-white/35 mt-0.5 truncate">→ {order.work_text}</div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap" style={{ color: pr.color, borderColor: pr.color + '40', background: pr.color + '12' }}>{pr.label}</span>
              <span className="text-[11px] text-white/25 font-mono whitespace-nowrap">{dt}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
