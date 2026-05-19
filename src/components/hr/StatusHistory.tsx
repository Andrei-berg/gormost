'use client'
import { useState, useEffect } from 'react'
import { fetchEmployeeStatusHistory } from '@/lib/api-client'
import { EMPLOYEE_STATUS_CONFIG } from '@/types'
import type { EmployeeStatus } from '@/types'

interface Props {
  userId: string
}

export default function StatusHistory({ userId }: Props) {
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState<EmployeeStatus[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (open && !loaded) {
      fetchEmployeeStatusHistory(userId).then(data => {
        setHistory(data)
        setLoaded(true)
      })
    }
  }, [open, loaded, userId])

  return (
    <div className="mt-3 border-t border-white/10 pt-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 w-full transition-colors"
      >
        <span className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>▾</span>
        История статусов
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {!loaded && (
            <div className="text-xs text-white/30 animate-pulse">Загрузка...</div>
          )}
          {loaded && history.length === 0 && (
            <div className="text-xs text-white/30">Нет записей</div>
          )}
          {loaded && history.map(h => {
            const cfg = EMPLOYEE_STATUS_CONFIG[h.status]
            const dateRange = h.date_to && h.date_to !== h.date_from
              ? `${h.date_from} — ${h.date_to}`
              : h.date_from
            return (
              <div key={h.id} className="text-xs flex items-start gap-2 py-1">
                <span className={`px-1.5 py-0.5 rounded border shrink-0 ${cfg.bg}`} style={{ color: cfg.color }}>
                  {cfg.label}
                </span>
                <span className="text-white/40">
                  {dateRange}
                  {h.reason && (
                    <span className="ml-1 text-white/30">· {h.reason}</span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
