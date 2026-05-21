'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { logout, hasRole } from '@/lib/auth'
import type { AuthSession } from '@/types'
import { PANELS } from '@/types'
import { useTheme } from '@/lib/ThemeContext'
import { fetchVehicles, fetchAllCertsWithEmployees } from '@/lib/api-client'
import type { Vehicle } from '@/types'

interface Props {
  session: AuthSession
  title: string
  emoji: string
  mode?: 'LIVE' | 'PLANNING' | 'REVIEW'
  showTimer?: string | null
  lastUpdated?: Date | null
}

type SysState = 'ok' | 'warn' | 'crit'

// ── Live clock ─────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0')
const DOW_RU = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

function useLiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

// ── Status chip data ───────────────────────────────────────────────
function useStatusChips() {
  const [brokenCount, setBrokenCount] = useState(0)
  const [expiredCount, setExpiredCount] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const [vehicles, certs] = await Promise.all([
          fetchVehicles(false),
          fetchAllCertsWithEmployees(),
        ])
        const today = new Date().toISOString().split('T')[0]
        setBrokenCount((vehicles as Vehicle[]).filter(v => v.status === 'BROKEN').length)
        setExpiredCount(
          certs.filter(c => !c.is_indefinite && c.expires_at && c.expires_at < today && c.employee_id).length
        )
      } catch {
        // keep last values on error
      }
    }
    load()
    const t = setInterval(load, 120_000)
    return () => clearInterval(t)
  }, [])

  const sysState: SysState =
    brokenCount === 0 && expiredCount === 0 ? 'ok'
    : (brokenCount >= 5 || expiredCount >= 20) ? 'crit'
    : 'warn'

  return { brokenCount, expiredCount, sysState }
}

// ── Status chip component ──────────────────────────────────────────
interface ChipProps {
  tone: SysState
  icon: string
  count?: number
  label: string
  title: string
  onClick: () => void
}

function StatusChip({ tone, icon, count, label, title, onClick }: ChipProps) {
  const base = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-semibold transition-all whitespace-nowrap cursor-pointer'
  const styles: Record<SysState, string> = {
    ok:   'bg-green-500/8 border-green-500/30 text-green-400',
    warn: 'bg-amber-500/10 border-amber-500/40 text-amber-300 chip-pulse-amber',
    crit: 'bg-red-500/12 border-red-500/45 text-red-300 chip-pulse-red',
  }
  const dotColor: Record<SysState, string> = {
    ok: 'bg-green-500',
    warn: 'bg-amber-500',
    crit: 'bg-red-500',
  }

  return (
    <button type="button" onClick={onClick} title={title} className={`${base} ${styles[tone]}`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor[tone]}`} />
      <span className="text-[13px] leading-none">{icon}</span>
      {typeof count !== 'undefined' && (
        <span className="font-mono font-bold tabular-nums">{count}</span>
      )}
      <span className="text-[11px] hidden lg:inline">{label}</span>
    </button>
  )
}

// ── Notification popover ───────────────────────────────────────────
function NotificationPopover({ sysState, expiredCount, brokenCount }: {
  sysState: SysState
  expiredCount: number
  brokenCount: number
}) {
  const items: { ic: string; ttl: string; meta: string }[] = []
  if (sysState === 'crit') items.push({ ic: '🔴', ttl: 'Критическое состояние системы', meta: 'Требуется немедленное внимание' })
  if (sysState !== 'ok')   items.push({ ic: '🟡', ttl: '2 плана не согласованы', meta: '16:00 · совещание у зам/прораба' })
  items.push({ ic: '🕒', ttl: 'Совещание у зам/прораба', meta: '16:00 · каб. 204 · подача планов' })
  items.push({ ic: '🕒', ttl: 'Совещание у начальника', meta: '16:30 · каб. 301 · утверждение планов' })
  if (expiredCount > 0) items.push({ ic: '🛡', ttl: `${expiredCount} допусков с истёкшим сроком`, meta: 'ТБиОТ · требуется продление' })
  if (brokenCount > 0)  items.push({ ic: '🚗', ttl: `${brokenCount} ед. техники на ремонте`, meta: 'Транспорт · назначьте замену' })

  return (
    <div className="absolute right-0 top-[calc(100%+8px)] z-[60] w-[340px] glass-popup rounded-2xl p-3 shadow-2xl">
      <h4 className="flex items-center gap-2 text-[13px] text-white font-bold px-1.5 mb-2">
        🔔 Уведомления
        <span className="ml-auto font-mono text-[11px] text-white/40">{items.length}</span>
      </h4>
      {items.map((it, i) => (
        <div key={i} className="flex gap-2.5 items-start px-2 py-2.5 rounded-xl border-b border-white/5 last:border-b-0">
          <span className="text-base mt-0.5 flex-shrink-0">{it.ic}</span>
          <div>
            <div className="text-[12px] text-white font-semibold leading-snug">{it.ttl}</div>
            <div className="text-[11px] text-white/40 mt-0.5 font-mono">{it.meta}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Nav drawer ─────────────────────────────────────────────────────
const DRAWER_SECTIONS = [
  { label: 'Основное',    ids: ['dispatcher'] },
  { label: 'Операции',   ids: ['zamporab', 'foreman', 'head', 'chief', 'planner'] },
  { label: 'Руководство', ids: ['boss'] },
  { label: 'Сервисы',    ids: ['transport', 'complaints', 'hr', 'safety'] },
  { label: 'Система',    ids: ['admin', 'driver'] },
]

function NavDrawer({ open, onClose, visiblePanels, pathname, onNavigate }: {
  open: boolean
  onClose: () => void
  visiblePanels: typeof PANELS
  pathname: string
  onNavigate: (path: string) => void
}) {
  return (
    <>
      <div
        className={`fixed inset-0 bg-[rgba(8,12,28,.6)] backdrop-blur-sm z-[90] transition-opacity duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 left-0 bottom-0 w-72 glass-popup border-r border-white/10 z-[91] flex flex-col p-4 transition-transform duration-[250ms] ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center gap-2.5 px-2 pb-4 mb-2 border-b border-white/8">
          <span className="text-2xl">🏗️</span>
          <div>
            <div className="text-[17px] font-bold text-white">Гормост</div>
            <div className="text-[10px] text-white/40 font-mono uppercase tracking-[.08em]">Лефортовский тоннель</div>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 space-y-0.5 pb-4">
          <button
            onClick={() => onNavigate('/')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium transition-all text-left border ${
              pathname === '/' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'text-white/60 hover:bg-white/6 hover:text-white border-transparent'
            }`}
          >
            <span className="text-base w-5 text-center">🏠</span>
            <span>Главная</span>
            {pathname === '/' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />}
          </button>

          {DRAWER_SECTIONS.map(sec => {
            const panels = visiblePanels.filter(p => sec.ids.includes(p.id))
            if (!panels.length) return null
            return (
              <div key={sec.label}>
                <div className="text-[10px] text-white/30 font-bold uppercase tracking-[.08em] px-2.5 pt-3 pb-1.5">{sec.label}</div>
                {panels.map(p => {
                  const isActive = pathname === p.path
                  return (
                    <button
                      key={p.id}
                      onClick={() => onNavigate(p.path)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium mb-0.5 transition-all text-left border ${
                        isActive
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'text-white/60 hover:bg-white/6 hover:text-white border-transparent'
                      }`}
                    >
                      <span className="text-base w-5 text-center">{p.emoji}</span>
                      <span>{p.title}</span>
                      {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </aside>
    </>
  )
}

// ── Main Header component ──────────────────────────────────────────
export default function Header({ session, title, emoji, mode = 'LIVE', showTimer, lastUpdated: _lastUpdated }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const now = useLiveClock()
  const { brokenCount, expiredCount, sysState } = useStatusChips()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  // Close bell popover on outside click
  useEffect(() => {
    if (!bellOpen) return
    const close = (e: MouseEvent) => {
      if (!bellRef.current?.contains(e.target as Node)) setBellOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [bellOpen])

  // Close drawer on navigation
  useEffect(() => { setDrawerOpen(false) }, [pathname])

  const visiblePanels = PANELS.filter(p => hasRole(session, p.roles))

  // Clock display
  const dateStr = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}, ${DOW_RU[now.getDay()]}`
  const hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`
  const ss = pad(now.getSeconds())

  // Mode badge styles
  const modeCls = mode === 'LIVE'
    ? 'bg-green-500/18 border-green-500/35 text-green-400'
    : mode === 'PLANNING'
    ? 'bg-blue-500/18 border-blue-500/35 text-blue-400'
    : 'bg-violet-500/18 border-violet-500/35 text-violet-400'
  const modeLabel = mode === 'LIVE' ? 'LIVE' : mode === 'PLANNING' ? 'ПЛАН' : 'ОБЗОР'

  // System health chip
  const sysIcon = { ok: '🟢', warn: '🟡', crit: '🔴' }[sysState]
  const sysLabel = { ok: 'НОРМА', warn: 'ВНИМАНИЕ', crit: 'КРИТИЧНО' }[sysState]

  // Safety chip tone
  const safetyTone: SysState = expiredCount >= 20 ? 'crit' : expiredCount > 0 ? 'warn' : 'ok'

  // Transport chip tone
  const transportTone: SysState = brokenCount >= 5 ? 'crit' : brokenCount > 0 ? 'warn' : 'ok'

  const iconBtn = 'w-[34px] h-[34px] rounded-xl bg-white/4 border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-all flex-shrink-0'

  return (
    <>
      <header className="glass-strong rounded-2xl px-4 py-3 relative z-50 mb-4">
        <div className="hdr-grid">
          {/* LEFT: hamburger + brand + sep + panel title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setDrawerOpen(v => !v)}
              className={`${iconBtn} flex-shrink-0`}
              aria-label="Меню"
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>

            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2.5 px-2 py-1 -mx-2 -my-1 rounded-xl border border-transparent hover:bg-white/5 hover:border-white/10 transition-all text-left flex-shrink-0"
              title="На главную"
            >
              <span className="text-[26px] leading-none">🏗️</span>
              <div className="flex flex-col">
                <span className="text-[18px] font-bold text-white leading-tight">Гормост</span>
                <span className="text-[9px] font-mono text-white/40 uppercase tracking-[.08em] hidden xl:block">Лефортовский тоннель</span>
              </div>
            </button>

            <div className="w-px h-7 bg-white/10 flex-shrink-0 hidden sm:block" />

            <button
              onClick={() => setDrawerOpen(v => !v)}
              className="hidden sm:flex flex-col min-w-0 px-2 py-1 -mx-2 -my-1 rounded-xl border border-transparent hover:bg-white/5 hover:border-white/10 transition-all text-left"
              title="Сменить панель"
            >
              <span className="text-base font-bold text-white truncate leading-tight">{emoji} {title}</span>
              <div className="flex items-center gap-2 mt-1">
                <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-[.08em] ${modeCls}`}>
                  {modeLabel}
                </span>
                {showTimer && (
                  <span className="text-[10px] font-mono text-amber-400 font-medium">{showTimer}</span>
                )}
              </div>
            </button>
          </div>

          {/* CENTER: date + clock */}
          <div className="flex items-center justify-center">
            <div className="flex items-baseline gap-3 px-3.5 py-1.5 rounded-xl border border-white/8" style={{ background: 'rgba(0,0,0,.30)' }}>
              <span className="font-mono text-[11px] text-white/50 uppercase tracking-[.06em] font-medium whitespace-nowrap hidden md:block">{dateStr}</span>
              <span className="font-mono text-[20px] font-bold text-white tabular-nums leading-none whitespace-nowrap">
                {hm}<span className="text-amber-400">:{ss}</span>
              </span>
            </div>
          </div>

          {/* RIGHT: 3 chips + bell + theme + logout */}
          <div className="flex items-center gap-1.5 justify-end">
            {/* Status chips */}
            <div className="flex items-center gap-1.5 pr-2 border-r border-white/10 mr-1">
              <StatusChip
                tone={sysState}
                icon={sysIcon}
                label={sysLabel}
                title={`Состояние системы → Босс`}
                onClick={() => router.push('/boss')}
              />
              <StatusChip
                tone={safetyTone}
                icon="🛡"
                count={expiredCount}
                label={expiredCount > 0 ? 'просроч.' : 'допусков'}
                title={expiredCount > 0 ? `${expiredCount} просроченных допусков → ТБиОТ` : 'Все допуски действительны → ТБиОТ'}
                onClick={() => router.push('/safety')}
              />
              <StatusChip
                tone={transportTone}
                icon="🚗"
                count={brokenCount}
                label={brokenCount > 0 ? 'сломано' : 'на ходу'}
                title={brokenCount > 0 ? `${brokenCount} ед. техники неисправны → Транспорт` : 'Парк в норме → Транспорт'}
                onClick={() => router.push('/transport')}
              />
            </div>

            {/* Bell / notifications */}
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setBellOpen(v => !v)}
                className={`${iconBtn} relative`}
                title="Уведомления"
              >
                <svg className="w-[17px] h-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" style={{ boxShadow: '0 0 0 2px rgba(8,12,28,.8)' }} />
              </button>
              {bellOpen && (
                <NotificationPopover sysState={sysState} expiredCount={expiredCount} brokenCount={brokenCount} />
              )}
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
              className={iconBtn}
            >
              {theme === 'dark' ? (
                <svg className="w-[17px] h-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>
                </svg>
              ) : (
                <svg className="w-[17px] h-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
                </svg>
              )}
            </button>

            {/* Logout */}
            <button
              onClick={() => { logout(); router.replace('/login') }}
              title="Выйти"
              className="w-[34px] h-[34px] rounded-xl bg-white/4 border border-white/10 flex items-center justify-center text-white/50 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400 transition-all flex-shrink-0"
            >
              <svg className="w-[17px] h-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <NavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        visiblePanels={visiblePanels}
        pathname={pathname}
        onNavigate={(path) => { router.push(path); setDrawerOpen(false) }}
      />
    </>
  )
}
