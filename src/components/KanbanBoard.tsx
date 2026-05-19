'use client'
import { useState } from 'react'
import { updateRequestStatus } from '@/lib/api-client'
import RequestCard from './RequestCard'
import EmptyState from './EmptyState'
import type { Request, RequestStatus, Category, GObject, Construction, WorkType, Service, AuthSession } from '@/types'
import { STATUS_CONFIG, STATUS_ORDER } from '@/types'

interface Props {
  requests: Request[]
  session: AuthSession
  categories?: Category[]
  objects?: GObject[]
  constructions?: Construction[]
  workTypes?: WorkType[]
  services?: Service[]
  onCardClick?: (r: Request) => void
  onStatusChange?: () => void
  showService?: boolean
  statuses?: RequestStatus[]
}

export default function KanbanBoard({
  requests, session, categories = [], objects = [], constructions = [], workTypes = [], services = [],
  onCardClick, onStatusChange, showService = false, statuses,
}: Props) {
  const [dragOver, setDragOver] = useState<string | null>(null)
  const cols = statuses || STATUS_ORDER

  const handleDragStart = (e: React.DragEvent, requestId: string) => {
    e.dataTransfer.setData('requestId', requestId)
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: RequestStatus) => {
    e.preventDefault()
    setDragOver(null)
    const requestId = e.dataTransfer.getData('requestId')
    if (!requestId) return
    const req = requests.find(r => r.request_id === requestId)
    if (!req || req.status === targetStatus) return

    await updateRequestStatus(requestId, targetStatus, session.user_id)
    onStatusChange?.()
  }

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(240px, 1fr))` }}>
      {cols.map(status => {
        const cfg = STATUS_CONFIG[status]
        const cards = requests.filter(r => r.status === status)
        return (
          <div
            key={status}
            className={`rounded-2xl border transition-all ${dragOver === status ? 'border-white/30 bg-white/5' : 'border-white/5'}`}
            onDragOver={e => { e.preventDefault(); setDragOver(status) }}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => handleDrop(e, status)}
          >
            {/* Column header */}
            <div className={`flex items-center justify-between px-4 py-3 rounded-t-2xl ${cfg.bg}`}>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.color }} />
                <span className="text-sm font-bold text-white/90">{cfg.label}</span>
              </div>
              <span className="text-xs font-mono bg-white/10 px-2 py-0.5 rounded-full text-white/60">{cards.length}</span>
            </div>

            {/* Cards */}
            <div className="p-3 space-y-3 min-h-[100px]">
              {cards.length === 0 && <EmptyState message="Нет заявок" />}
              {cards.map(r => (
                <div key={r.request_id} draggable onDragStart={e => handleDragStart(e, r.request_id)}>
                  <RequestCard
                    request={r}
                    categories={categories}
                    objects={objects}
                    constructions={constructions}
                    workTypes={workTypes}
                    services={services}
                    onClick={() => onCardClick?.(r)}
                    showService={showService}
                  />
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
