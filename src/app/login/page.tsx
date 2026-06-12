'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { loginWithPin, getSession } from '@/lib/auth'
import { getCurrentShift, formatDate, formatTime } from '@/lib/shifts'

export default function LoginPage() {
  const router = useRouter()
  const [tabNumber, setTabNumber] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [now, setNow] = useState(new Date())
  const pinRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const s = getSession()
    if (s) router.replace('/')
  }, [router])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const shift = getCurrentShift()

  const handleSubmit = async () => {
    if (!tabNumber.trim() || !pin.trim()) {
      setError('Введите табельный номер и PIN')
      return
    }
    setError('')
    setLoading(true)
    const result = await loginWithPin(tabNumber.trim(), pin.trim())
    setLoading(false)
    if (result.ok) {
      router.replace('/')
    } else {
      setError(result.error || 'Ошибка входа')
      setPin('')
    }
  }

  const handleTabKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') pinRef.current?.focus()
  }

  const handlePinKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏗️</div>
          <h1 className="text-3xl font-bold text-white mb-2">Гормост</h1>
          <p className="text-white/50">Система управления работами Лефортовского тоннеля</p>
        </div>

        {/* Clock + Shift */}
        <div className="glass-strong rounded-2xl p-4 mb-6 text-center">
          <div className="text-2xl font-mono font-bold text-white mb-1">
            {formatDate(now)}, {formatTime(now)}
          </div>
          <div className="flex items-center justify-center gap-2 mt-1">
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

        {/* Login form */}
        <div className="glass-strong rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Вход в систему</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-white/50 mb-1">Табельный номер</label>
              <input
                type="text"
                value={tabNumber}
                onChange={e => setTabNumber(e.target.value)}
                onKeyDown={handleTabKeyDown}
                placeholder="0000"
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-lg font-mono focus:outline-none focus:border-blue-500/50 placeholder:text-white/20"
              />
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-1">PIN-код</label>
              <input
                ref={pinRef}
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                onKeyDown={handlePinKeyDown}
                placeholder="····"
                maxLength={4}
                inputMode="numeric"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-lg font-mono tracking-[0.5em] text-center focus:outline-none focus:border-blue-500/50 placeholder:text-white/20"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </div>

          <p className="text-xs text-white/30 mt-4 text-center">
            Первый вход: табельный 0000, PIN 1234
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-white/20">
          Гормост v2.0 · 2026 · Next.js 16 + Supabase
        </div>
      </div>
    </div>
  )
}
