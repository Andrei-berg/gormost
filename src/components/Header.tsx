'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getCurrentShift, getCurrentPeriod, formatDate, formatTime } from '@/lib/shifts'
import { logout, hasRole } from '@/lib/auth'
import type { AuthSession } from '@/types'
import { PANELS } from '@/types'
import { useAlertCount } from '@/components/AlertBanner'

interface Props {
  session: AuthSession
  title: string
  emoji: string
  mode?: 'LIVE' | 'PLANNING' | 'REVIEW'
  showTimer?: string | null
  lastUpdated?: Date | null  // timestamp of last data load for LIVE panels
}

export default function Header({ session, title, emoji, mode = 'LIVE', showTimer, lastUpdated }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [now, setNow] = useState(new Date())
  const [menuOpen, setMenuOpen] = useState(false)
  const [secondsAgo, setSecondsAgo] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const shift = getCurrentShift()
  const period = getCurrentPeriod()
  const alertCount = useAlertCount(session)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Reset counter when new data arrives
  useEffect(() => {
    setSecondsAgo(0)
  }, [lastUpdated])

  // Count up every second while in LIVE mode
  useEffect(() => {
    if (mode !== 'LIVE') return
    const t = setInterval(() => setSecondsAgo(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [mode])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const visiblePanels = PANELS.filter(p => hasRole(session, p.roles))
  const regularPanels = visiblePanels.filter(p => p.id !== 'admin')
  const systemPanels = visiblePanels.filter(p => p.id === 'admin')

  const handleLogout = () => {
    logout()
    router.replace('/login')
  }

  return (
    <header className="glass-strong rounded-2xl p-4 mb-6 relative z-50">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Left: Panel info */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="text-3xl hover:scale-110 transition-transform" title="На главную">
            {emoji}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{title}</h1>
              {mode === 'LIVE' && (
                <span className="flex items-center gap-1 bg-red-500/20 border border-red-500/30 text-red-400 px-2 py-0.5 rounded-full text-xs font-bold">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  LIVE{lastUpdated != null ? ` · ${secondsAgo}с` : ''}
                </span>
              )}
              {mode === 'PLANNING' && (
                <span className="bg-blue-500/20 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded-full text-xs font-bold">
                  ПЛАНИРОВАНИЕ
                </span>
              )}
              {mode === 'REVIEW' && (
                <span className="bg-amber-500/20 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded-full text-xs font-bold">
                  ОБЗОР
                </span>
              )}
            </div>
            <p className="text-sm text-white/50">
              {session.full_name} · {session.position || session.role_level}
            </p>
          </div>
        </div>

        {/* Center: Timer */}
        {showTimer && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2 text-center">
            <div className="text-xs text-amber-400/70">Дедлайн</div>
            <div className="text-lg font-mono font-bold text-amber-400">{showTimer}</div>
          </div>
        )}

        {/* Right: Clock + Shift */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <div className="text-lg font-mono font-bold text-white">
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
          {/* Alert bell */}
          {alertCount > 0 && (
            <div className="relative">
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                {alertCount}
              </span>
            </div>
          )}

          {/* Nav menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="ml-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-white/50 hover:text-white"
              title="Панели"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-12 z-[999] w-56 glass-strong rounded-2xl p-2 border border-white/10 shadow-2xl max-h-[80vh] overflow-y-auto">
                <div className="text-[10px] text-white/30 px-2 py-1 uppercase tracking-widest mb-1">Панели</div>
                {regularPanels.map(p => {
                  const isActive = pathname === p.path
                  return (
                    <button
                      key={p.id}
                      onClick={() => { router.push(p.path); setMenuOpen(false) }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all text-left ${
                        isActive
                          ? 'bg-blue-600/30 text-white border border-blue-500/30'
                          : 'text-white/90 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="text-base">{p.emoji}</span>
                      <span>{p.title}</span>
                      {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
                    </button>
                  )
                })}
                {systemPanels.length > 0 && (
                  <div className="border-t border-white/10 mt-2 pt-2">
                    <div className="text-[10px] text-white/30 px-2 py-1 uppercase tracking-widest mb-1">Система</div>
                    {systemPanels.map(p => {
                      const isActive = pathname === p.path
                      return (
                        <button
                          key={p.id}
                          onClick={() => { router.push(p.path); setMenuOpen(false) }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all text-left ${
                            isActive
                              ? 'bg-blue-600/30 text-white border border-blue-500/30'
                              : 'text-white/90 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span className="text-base">{p.emoji}</span>
                          <span>{p.title}</span>
                          {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
                        </button>
                      )
                    })}
                  </div>
                )}
                <div className="border-t border-white/10 mt-2 pt-2">
                  <button
                    onClick={() => { router.push('/'); setMenuOpen(false) }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/40 hover:bg-white/5 hover:text-white transition-all text-left"
                  >
                    <span className="text-base">🏠</span>
                    <span>Главная</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="ml-2 p-2 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 transition-all text-white/50 hover:text-red-400"
            title="Выход"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
