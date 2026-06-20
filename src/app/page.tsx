'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getSession, logout, hasRole } from '@/lib/auth'
import { getCurrentShift, formatDate, formatTime } from '@/lib/shifts'
import { fetchHomeCounters } from '@/lib/api-client'
import type { AuthSession, HomeCounters } from '@/types'
import { PANELS } from '@/types'
import ShiftRotationStrip from '@/components/ShiftRotationStrip'
import PanelCard from '@/components/home/PanelCard'
import { useTheme } from '@/lib/ThemeContext'

type PanelStatus = 'live' | 'warn' | 'crit'
type GroupName = 'Оперативные' | 'Аналитика' | 'Сервисы'

interface HomeMeta { group: GroupName; status?: PanelStatus; pill?: string; accentColor: string }

const HOME_META: Record<string, HomeMeta> = {
  dispatcher: { group: 'Оперативные', status: 'live', accentColor: '#F0A500' },
  zamporab:   { group: 'Оперативные', accentColor: '#F0A500' },
  foreman:    { group: 'Оперативные', accentColor: '#8B5CF6' },
  head:       { group: 'Оперативные', accentColor: '#8B5CF6' },
  journal:    { group: 'Оперативные', accentColor: '#F0A500' },
  driver:     { group: 'Оперативные', accentColor: '#388BFD' },
  boss:       { group: 'Аналитика',   accentColor: '#388BFD' },
  transport:  { group: 'Аналитика',   accentColor: '#F85149' },
  complaints: { group: 'Аналитика',   accentColor: '#F0A500' },
  chief:      { group: 'Аналитика',   accentColor: '#22D3EE' },
  hr:         { group: 'Сервисы',     accentColor: '#F85149' },
  safety:     { group: 'Сервисы',     accentColor: '#F85149' },
  planner:    { group: 'Сервисы',     accentColor: '#3FB950' },
  admin:      { group: 'Сервисы',     accentColor: '#64748B' },
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10, mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

/** Live status + pill per panel, computed from real counters */
function liveMeta(id: string, c: HomeCounters | null): { status?: PanelStatus; pill?: string } {
  if (!c) return {}
  switch (id) {
    case 'zamporab':
      return c.plansApproved > 0
        ? { status: 'warn', pill: `${c.plansApproved} ${plural(c.plansApproved, 'план', 'плана', 'планов')}` }
        : {}
    case 'chief':
      return c.plansSubmitted > 0 ? { status: 'warn', pill: `${c.plansSubmitted} на согл.` } : {}
    case 'boss':
      return c.plansPlanned > 0 ? { status: 'warn', pill: `${c.plansPlanned} к совещанию` } : {}
    case 'transport':
      return c.brokenVehicles > 0 ? { status: 'crit', pill: `${c.brokenVehicles} сломано` } : {}
    case 'complaints':
      return c.newComplaints > 0
        ? { status: 'warn', pill: `${c.newComplaints} ${plural(c.newComplaints, 'новая', 'новые', 'новых')}` }
        : {}
    case 'hr':
      return c.expiredCerts > 0
        ? { status: 'crit', pill: `${c.expiredCerts} ${plural(c.expiredCerts, 'допуск', 'допуска', 'допусков')}` }
        : {}
    case 'safety':
      if (c.expiredCerts > 0) return { status: 'crit', pill: 'критично' }
      if (c.expiringSoonCerts > 0) return { status: 'warn', pill: `${c.expiringSoonCerts} истекают` }
      return {}
    default:
      return {}
  }
}

const GROUPS: GroupName[] = ['Оперативные', 'Аналитика', 'Сервисы']
const DOW = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

export default function HomePage() {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [session, setSession] = useState<AuthSession | null>(null)
  const [now, setNow] = useState(new Date())
  const [menuOpen, setMenuOpen] = useState(false)
  const [counters, setCounters] = useState<HomeCounters | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const s = getSession()
    if (!s) { router.replace('/login'); return }
    setSession(s)
    fetchHomeCounters().then(setCounters).catch(() => setCounters(null))
  }, [router])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  if (!session) return null

  const shift = getCurrentShift()
  const visiblePanels = PANELS.filter(p => hasRole(session, p.roles))
  const navPanels = visiblePanels.filter(p => p.id !== 'admin')
  const adminPanel = visiblePanels.filter(p => p.id === 'admin')

  const handleLogout = () => { logout(); router.replace('/login') }

  const muted = 'var(--text-muted)'
  const subtle = 'var(--border)'

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-[1280px] mx-auto flex flex-col gap-4">

        {/* ── HEADER ── */}
        <header className="glass-strong rounded-2xl px-5 py-3.5 flex items-center gap-4">
          {/* Hamburger / nav menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-white/50 hover:text-white"
              title="Меню"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute left-0 top-12 z-[999] w-56 glass-popup rounded-2xl p-2 max-h-[80vh] overflow-y-auto">
                <div className="text-[10px] px-2 py-1 uppercase tracking-widest mb-1" style={{ color: muted }}>
                  Панели
                </div>
                {navPanels.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { router.push(p.path); setMenuOpen(false) }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all text-left text-white/90 hover:bg-white/10 hover:text-white"
                  >
                    <span className="text-base">{p.emoji}</span>
                    <span>{p.title}</span>
                  </button>
                ))}
                {adminPanel.length > 0 && (
                  <div className="border-t mt-2 pt-2" style={{ borderColor: subtle }}>
                    {adminPanel.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { router.push(p.path); setMenuOpen(false) }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all text-left text-white/90 hover:bg-white/10 hover:text-white"
                      >
                        <span className="text-base">{p.emoji}</span>
                        <span>{p.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Brand */}
          <div className="flex items-center gap-3 select-none">
            <span className="text-[36px] leading-none">🏗</span>
            <div>
              <div className="font-mono text-[22px] font-extrabold leading-none" style={{ letterSpacing: '-0.02em' }}>
                Гормост
              </div>
              <div className="text-[11px] mt-1" style={{ color: muted }}>
                Система управления работами · Лефортовский тоннель
              </div>
            </div>
          </div>

          <div className="flex-1" />

          {/* Clock */}
          <div className="text-right hidden sm:block">
            <div className="text-[11px] font-mono" style={{ color: muted }}>
              {formatDate(now)}, {DOW[now.getDay()]}
            </div>
            <div className="text-[26px] font-mono font-bold leading-tight tabular-nums">
              {formatTime(now)}
            </div>
          </div>

          {/* Shift badge */}
          <div className="text-right hidden md:block">
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full font-mono text-[11px] font-bold tracking-wider"
              style={{ background: 'rgba(240,165,0,0.10)', border: '1px solid rgba(240,165,0,0.30)', color: '#F0A500' }}
            >
              {shift.shiftName.toUpperCase()}
            </span>
            <div className="text-[11px] mt-1" style={{ color: muted }}>
              НДС: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{shift.chiefName}</span>
            </div>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-white/50 hover:text-white"
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </header>

        {/* ── USER BAR ── */}
        <div
          className="flex items-center gap-3 px-4 py-2 rounded-xl text-[12px]"
          style={{ background: 'var(--bg-subtle)', border: `1px solid ${subtle}`, color: muted }}
        >
          <span>
            Вы вошли как{' '}
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {session.full_name}
            </span>
          </span>
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[10px] font-bold tracking-wider"
            style={{ background: 'rgba(240,165,0,0.12)', border: '1px solid rgba(240,165,0,0.30)', color: '#F0A500' }}
          >
            {session.role_level}
          </span>
          <span className="font-mono opacity-50">· {session.tab_number}</span>
          <LogoutBtn onLogout={handleLogout} />
        </div>

        {/* ── SHIFT ROTATION STRIP ── */}
        <div>
          <SectionEyebrow>Ротация смен</SectionEyebrow>
          <ShiftRotationStrip />
        </div>

        {/* ── ALERT BANNERS ── */}
        {counters && (counters.expiredCerts > 0 || counters.brokenVehicles > 0) && (
          <div className="flex flex-col gap-2">
            {counters.expiredCerts > 0 && (
              <AlertBanner variant="red" onClick={() => router.push('/safety')}>
                <strong>
                  {counters.expiredCerts} {plural(counters.expiredCerts, 'допуск просрочен', 'допуска просрочено', 'допусков просрочено')}
                </strong>{' '}
                · ТБиОТ требует внимания
              </AlertBanner>
            )}
            {counters.brokenVehicles > 0 && (
              <AlertBanner variant="amber" onClick={() => router.push('/transport')}>
                <strong>{counters.brokenVehicles} ед. техники сломано</strong> · Транспорт
                {counters.maintenanceVehicles > 0 && <> · {counters.maintenanceVehicles} на обслуживании</>}
              </AlertBanner>
            )}
          </div>
        )}

        {/* ── PANEL GRID ── */}
        {GROUPS.map(group => {
          const panels = visiblePanels.filter(p => HOME_META[p.id]?.group === group)
          if (panels.length === 0) return null
          return (
            <div key={group}>
              <SectionEyebrow>{group}</SectionEyebrow>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {panels.map(p => {
                  const m = HOME_META[p.id]
                  const live = liveMeta(p.id, counters)
                  return (
                    <PanelCard
                      key={p.id}
                      panel={p}
                      status={live.status ?? m?.status}
                      pill={live.pill}
                      accentColor={m?.accentColor}
                      onClick={() => router.push(p.path)}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* ── STATUS BAR ── */}
        <div
          className="flex items-center gap-4 px-4 py-2.5 rounded-xl font-mono text-[11px]"
          style={{
            background: 'var(--bg-inset)',
            border: `1px solid ${subtle}`,
            color: muted,
            letterSpacing: '0.02em',
          }}
        >
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(63,185,80,0.7)]" />
            Гормост
          </span>
          <span className="opacity-35">·</span>
          <span>Лефортовский тоннель</span>
          <span className="opacity-35">·</span>
          <button onClick={() => router.push('/planner')} className="hover:opacity-80 transition-opacity">
            {shift.shiftName}
          </button>
          <span className="ml-auto">{formatTime(now)}</span>
        </div>

      </div>
    </div>
  )
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-widest font-bold px-1 mb-2 text-white/40">
      {children}
    </div>
  )
}

function AlertBanner({ variant, onClick, children }: {
  variant: 'red' | 'amber'
  onClick: () => void
  children: React.ReactNode
}) {
  const s = variant === 'red'
    ? { background: 'rgba(248,81,73,0.10)', border: '1px solid rgba(248,81,73,0.35)', color: '#F85149' }
    : { background: 'rgba(240,165,0,0.08)', border: '1px solid rgba(240,165,0,0.30)', color: '#F0A500' }
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-opacity hover:opacity-80"
      style={s}
      onClick={onClick}
    >
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h16.9a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
      </svg>
      <span className="text-[13px] font-medium leading-snug">{children}</span>
      <span className="ml-auto font-mono text-[11px] opacity-65 flex items-center gap-1 whitespace-nowrap">
        Открыть
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </div>
  )
}

function LogoutBtn({ onLogout }: { onLogout: () => void }) {
  return (
    <button
      onClick={onLogout}
      className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] transition-all text-white/40 hover:text-red-400 hover:bg-red-500/8"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H3M9 6l-6 6 6 6M21 4v16" />
      </svg>
      Выход
    </button>
  )
}
