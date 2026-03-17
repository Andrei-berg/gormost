'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSession, logout, hasRole } from '@/lib/auth'
import { getCurrentShift, getCurrentPeriod, formatDate, formatTime } from '@/lib/shifts'
import type { AuthSession, PanelConfig } from '@/types'
import { PANELS } from '@/types'

export default function HomePage() {
  const router = useRouter()
  const [session, setSession] = useState<AuthSession | null>(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const s = getSession()
    if (!s) { router.replace('/login'); return }
    setSession(s)
  }, [router])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  if (!session) return null

  const shift = getCurrentShift()
  const period = getCurrentPeriod()

  // Filter panels by role (ADMIN sees all except admin panel card — admin accesses /admin via hamburger menu)
  const visiblePanels = PANELS.filter(p => hasRole(session, p.roles) && p.id !== 'admin')

  const handleLogout = () => { logout(); router.replace('/login') }

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="glass-strong rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <span className="text-5xl">🏗️</span>
            <div>
              <h1 className="text-3xl font-bold text-white">Гормост</h1>
              <p className="text-white/50">Система управления работами Лефортовского тоннеля</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Clock */}
            <div className="text-right">
              <div className="text-xl font-mono font-bold text-white">
                {formatDate(now)}, {formatTime(now)}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-semibold">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  {shift.shiftName}
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  НДС: {shift.chiefName}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-white/50">
          Вы вошли как <span className="text-white font-medium">{session.full_name}</span>
          <span className="text-white/30"> · {session.role_level} · {session.tab_number}</span>
        </div>
        <button onClick={handleLogout} className="text-sm text-white/40 hover:text-red-400 transition-colors">
          Выход
        </button>
      </div>

      {/* Panel grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {visiblePanels.map(panel => (
          <PanelCard key={panel.id} panel={panel} onClick={() => router.push(panel.path)} />
        ))}
      </div>

      {/* Footer */}
      <div className="text-center mt-12 text-xs text-white/20">
        Система управления работами · Лефортовский тоннель<br />
        v2.0 · 2026 · Next.js 16 + Supabase
      </div>
    </div>
  )
}

function PanelCard({ panel, onClick }: { panel: PanelConfig; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`glass rounded-2xl p-5 text-left border bg-gradient-to-br ${panel.color} hover:scale-[1.02] hover:brightness-110 transition-all group`}
    >
      <div className="text-3xl mb-3">{panel.emoji}</div>
      <h3 className="text-lg font-bold text-white mb-1">{panel.title}</h3>
      <p className="text-xs text-white/50 mb-4 line-clamp-2">{panel.subtitle}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/30">{panel.roleLabel}</span>
        <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all">
          <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </button>
  )
}
