'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSession, logout, hasRole } from '@/lib/auth'
import { getCurrentShift, getCurrentPeriod, formatDate, formatTime, getShiftBadge } from '@/lib/shifts'
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
              <div className="text-xs text-white/40">Сейчас</div>
              <div className="text-xl font-mono font-bold text-white">
                {formatDate(now)}, {formatTime(now)}
              </div>
              <div className="flex items-center gap-2 justify-end mt-1">
                <span className="bg-blue-500/20 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded-full text-xs font-bold">
                  🔒 {getShiftBadge(shift, now)}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  period === 'day'
                    ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400'
                    : 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-400'
                }`}>
                  {period === 'day' ? '☀️ ДЕНЬ' : '🌙 НОЧЬ'}
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
