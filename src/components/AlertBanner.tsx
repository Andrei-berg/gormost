'use client'
import { useState, useEffect } from 'react'
import { fetchSystemAlerts, type SystemAlert } from '@/lib/alerts'
import type { AuthSession } from '@/types'

interface Props {
  session: AuthSession
}

const LEVEL_CONFIG = {
  critical: {
    bg: 'bg-red-500/10 border-red-500/30',
    icon: (
      <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
    dot: 'bg-red-500',
    title: 'text-red-400',
    detail: 'text-red-300/70',
  },
  warning: {
    bg: 'bg-amber-500/10 border-amber-500/30',
    icon: (
      <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
    dot: 'bg-amber-500',
    title: 'text-amber-300',
    detail: 'text-amber-300/60',
  },
  info: {
    bg: 'bg-blue-500/10 border-blue-500/30',
    icon: (
      <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    dot: 'bg-blue-500',
    title: 'text-blue-300',
    detail: 'text-blue-300/60',
  },
}

export default function AlertBanner({ session }: Props) {
  const [alerts, setAlerts] = useState<SystemAlert[]>([])
  const [open, setOpen] = useState(true)

  useEffect(() => {
    fetchSystemAlerts({ role: session.role_level, serviceId: session.service_id }).then(setAlerts)
    const t = setInterval(() => {
      fetchSystemAlerts({ role: session.role_level, serviceId: session.service_id }).then(setAlerts)
    }, 60000)
    return () => clearInterval(t)
  }, [session.role_level, session.service_id])

  if (alerts.length === 0) return null

  const criticalCount = alerts.filter((a) => a.level === 'critical').length
  const bannerBg = criticalCount > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'
  const headerColor = criticalCount > 0 ? 'text-red-400' : 'text-amber-300'

  return (
    <div className={`rounded-xl border mb-4 overflow-hidden ${bannerBg}`}>
      {/* Header row */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left"
      >
        <svg className={`w-4 h-4 shrink-0 ${headerColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span className={`text-sm font-semibold ${headerColor}`}>
          {alerts.length} {alerts.length === 1 ? 'предупреждение' : alerts.length < 5 ? 'предупреждения' : 'предупреждений'}
          {criticalCount > 0 && <span className="ml-2 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">{criticalCount} критич.</span>}
        </span>
        <svg
          className={`w-4 h-4 ml-auto transition-transform ${headerColor} ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Alert list */}
      {open && (
        <div className="px-4 pb-3 space-y-2">
          {alerts.map((alert) => {
            const cfg = LEVEL_CONFIG[alert.level]
            return (
              <div key={alert.id} className="flex items-start gap-2">
                {cfg.icon}
                <div>
                  <div className={`text-xs font-semibold ${cfg.title}`}>{alert.title}</div>
                  {alert.detail && <div className={`text-xs ${cfg.detail}`}>{alert.detail}</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Hook for header bell count
export function useAlertCount(session: AuthSession): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    fetchSystemAlerts({ role: session.role_level, serviceId: session.service_id }).then((a) => setCount(a.length))
    const t = setInterval(() => {
      fetchSystemAlerts({ role: session.role_level, serviceId: session.service_id }).then((a) => setCount(a.length))
    }, 60000)
    return () => clearInterval(t)
  }, [session.role_level, session.service_id])

  return count
}
