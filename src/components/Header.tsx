'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentShift, getCurrentPeriod, formatDate, formatTime } from '@/lib/shifts'
import { logout } from '@/lib/auth'
import type { AuthSession } from '@/types'

interface Props {
  session: AuthSession
  title: string
  emoji: string
  mode?: 'LIVE' | 'PLANNING' | 'REVIEW'
  showTimer?: string | null
}

export default function Header({ session, title, emoji, mode = 'LIVE', showTimer }: Props) {
  const router = useRouter()
  const [now, setNow] = useState(new Date())
  const shift = getCurrentShift()
  const period = getCurrentPeriod()

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const handleLogout = () => {
    logout()
    router.replace('/login')
  }

  return (
    <header className="glass-strong rounded-2xl p-4 mb-6">
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
                  LIVE
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
          <div className="text-right">
            <div className="text-xs text-white/40">Сейчас</div>
            <div className="text-lg font-mono font-bold text-white">
              {formatDate(now)}, {formatTime(now)}
            </div>
            <div className="flex items-center gap-2 justify-end mt-1">
              <span className="bg-blue-500/20 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded-full text-xs font-bold">
                🔒 {shift.shiftName}
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
