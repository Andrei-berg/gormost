'use client'
// DirectiveAlert — shown in foreman's brigade view when workers were pulled
// for urgent orders (поручения сверху).

import { useState, useEffect } from 'react'
import { fetchDirectivesWithWorkers } from '@/lib/api-client'
import type { Directive, DirectiveWorkerAssignment } from '@/types'
import { DIRECTIVE_PRIORITY_CONFIG } from '@/types'

interface DirectiveWithWorkers extends Directive {
  workers: DirectiveWorkerAssignment[]
}

interface Props {
  // Only show alerts for workers in this foreman's active plan
  planWorkerIds: string[]
}

export default function DirectiveAlert({ planWorkerIds }: Props) {
  const [pulledWorkers, setPulledWorkers] = useState<
    Array<{ worker: DirectiveWorkerAssignment; directive: DirectiveWithWorkers }>
  >([])

  useEffect(() => {
    if (!planWorkerIds.length) return
    fetchDirectivesWithWorkers().then(dirs => {
      const active = dirs.filter(
        (d): d is DirectiveWithWorkers => !['DONE','CANCELLED'].includes(d.status)
      ) as DirectiveWithWorkers[]
      const hits: Array<{ worker: DirectiveWorkerAssignment; directive: DirectiveWithWorkers }> = []
      active.forEach(d => {
        d.workers.forEach(w => {
          if (planWorkerIds.includes(w.worker_id)) {
            hits.push({ worker: w, directive: d })
          }
        })
      })
      setPulledWorkers(hits)
    })
  }, [planWorkerIds])

  if (!pulledWorkers.length) return null

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 mb-4">
      {/* Top bar */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-xl">⚠️</span>
        <div>
          <div className="text-sm font-semibold text-amber-300">Состав бригады изменён</div>
          <div className="text-xs text-white/40 mt-0.5">
            {pulledWorkers.length === 1 ? '1 работник переведён' : `${pulledWorkers.length} работника переведены`} на экстренное поручение
          </div>
        </div>
      </div>

      {/* Workers list */}
      <div className="bg-white/[0.04] rounded-lg divide-y divide-white/5">
        {pulledWorkers.map(({ worker, directive }) => {
          const prCfg = DIRECTIVE_PRIORITY_CONFIG[directive.priority]
          const dt    = new Date(directive.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
          return (
            <div key={worker.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">{worker.worker_name}</div>
                <div className="text-xs text-white/35 mt-0.5 truncate">→ {directive.title}</div>
              </div>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap"
                style={{ color: prCfg.color, borderColor: prCfg.color + '40', background: prCfg.color + '12' }}
              >
                {prCfg.label}
              </span>
              <span className="text-[11px] text-white/25 font-mono whitespace-nowrap">{dt}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
