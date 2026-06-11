'use client'
import { useState, useCallback } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import OverviewCharts from '@/components/boss/OverviewCharts'
import WorkPlansMeeting from '@/components/boss/WorkPlansMeeting'
import ShiftRoster from '@/components/ShiftRoster'
import { fetchRequests, fetchServices, fetchRequestStats, approveRequest, fetchChangelog, fetchPeopleStats, fetchUsersWithAssignments } from '@/lib/api-client'
import type { Request, Service, ChangelogEntry, AuthSession, UserWithAssignment } from '@/types'
import EmptyState from '@/components/EmptyState'
import AlertBanner from '@/components/AlertBanner'
import { WhatNextBanner, GuidedTour, HelpPanel } from '@/components/help'
import { BOSS_TOUR, BOSS_HELP } from '@/components/help/tours'
import { useLoadData } from '@/lib/useLoadData'
import { PanelLoader, DataErrorBanner } from '@/components/DataState'

export default function BossPage() {
  return (
    <AuthGuard roles={['BOSS', 'ADMIN']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}

// ── Journal action type → color ────────────────────────────────────
const ACTION_COLORS: Record<string, { label: string; color: string }> = {
  CREATE:    { label: 'CREATE', color: '#E3B341' },
  CREATED:   { label: 'CREATE', color: '#E3B341' },
  ASSIGN:    { label: 'ASSIGN', color: '#388BFD' },
  ASSIGNED:  { label: 'ASSIGN', color: '#388BFD' },
  START:     { label: 'START',  color: '#8B5CF6' },
  IN_PROGRESS: { label: 'START', color: '#8B5CF6' },
  CHECK:     { label: 'CHECK',  color: '#F97316' },
  CHECKING:  { label: 'CHECK',  color: '#F97316' },
  DONE:      { label: 'DONE',   color: '#3FB950' },
  COMPLETED: { label: 'DONE',   color: '#3FB950' },
  CLOSE:     { label: 'DONE',   color: '#3FB950' },
  ALERT:     { label: 'ALERT',  color: '#F85149' },
  CRITICAL:  { label: 'ALERT',  color: '#F85149' },
  OVERDUE:   { label: 'ALERT',  color: '#F85149' },
  APPROVE:   { label: 'APPROVE', color: '#3FB950' },
  APPROVED:  { label: 'APPROVE', color: '#3FB950' },
  REJECT:    { label: 'REJECT', color: '#F85149' },
  REJECTED:  { label: 'REJECT', color: '#F85149' },
}

function getActionStyle(actionType: string) {
  const upper = actionType.toUpperCase()
  for (const [key, val] of Object.entries(ACTION_COLORS)) {
    if (upper.includes(key)) return val
  }
  return { label: actionType, color: 'rgba(255,255,255,0.5)' }
}

// ── Health Indicator ───────────────────────────────────────────────
function HealthIndicator({ criticalCount, donePercent, pendingCount, overdueCount }: {
  criticalCount: number; donePercent: number; pendingCount: number; overdueCount: number
}) {
  const health = criticalCount === 0 && donePercent >= 50 ? 'green' : criticalCount > 3 ? 'red' : 'yellow'
  const cfg = {
    green: { label: 'ЗЕЛЁНЫЙ · НОРМА', sub: 'Все заявки в норме', dotStyle: 'radial-gradient(circle at 30% 30%, #6EE7B7, #3FB950 60%, #1a8a35)', borderColor: 'rgba(63,185,80,0.35)', bg: 'linear-gradient(135deg, rgba(63,185,80,0.10), rgba(63,185,80,0.02))', glow: 'rgba(63,185,80,0.10)', eyebrow: 'rgba(63,185,80,0.8)', accent: '#3FB950' },
    yellow: { label: 'ЖЁЛТЫЙ · ВНИМАНИЕ', sub: '', dotStyle: 'radial-gradient(circle at 30% 30%, #FFD166, #F0A500 60%, #B97900)', borderColor: 'rgba(240,165,0,0.35)', bg: 'linear-gradient(135deg, rgba(240,165,0,0.10), rgba(240,165,0,0.02))', glow: 'rgba(240,165,0,0.10)', eyebrow: 'rgba(240,165,0,0.8)', accent: '#F0A500' },
    red:    { label: 'КРАСНЫЙ · ТРЕВОГА', sub: 'Критические заявки требуют немедленных действий', dotStyle: 'radial-gradient(circle at 30% 30%, #FF9393, #F85149 60%, #a51a0d)', borderColor: 'rgba(248,81,73,0.35)', bg: 'linear-gradient(135deg, rgba(248,81,73,0.10), rgba(248,81,73,0.02))', glow: 'rgba(248,81,73,0.10)', eyebrow: 'rgba(248,81,73,0.8)', accent: '#F85149' },
  }[health]

  const subParts: string[] = []
  if (criticalCount > 0) subParts.push(`${criticalCount} критических заявок`)
  if (pendingCount > 0)  subParts.push(`${pendingCount} планов не согласованы`)
  if (overdueCount > 0)  subParts.push(`${overdueCount} заявка просрочена`)
  const subText = subParts.length > 0 ? subParts.join(' · ') : 'Все заявки в норме'

  return (
    <div className="rounded-2xl p-5 flex items-center gap-6"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.borderColor}`,
        boxShadow: `0 0 0 1px ${cfg.glow}, 0 0 40px ${cfg.glow}`,
      }}>
      {/* Light */}
      <div className="flex-shrink-0 rounded-full" style={{
        width: 64, height: 64,
        background: cfg.dotStyle,
        boxShadow: `0 0 0 1px ${cfg.accent}99, 0 0 32px ${cfg.accent}88, inset 0 -6px 12px rgba(0,0,0,0.3)`,
      }} />
      {/* Core */}
      <div className="flex-1 flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-[0.12em] font-bold font-mono" style={{ color: cfg.eyebrow }}>
          Здоровье участка · LIVE
        </span>
        <span className="text-2xl font-extrabold text-white leading-tight" style={{ letterSpacing: '-0.01em' }}>
          <span style={{ color: cfg.accent }}>{cfg.label.split(' · ')[0]}</span>
          {' · '}
          <span className="text-white">{cfg.label.split(' · ')[1]}</span>
        </span>
        <span className="text-[13px] text-white/70 mt-0.5">{subText}</span>
      </div>
      {/* Quick stats */}
      <div className="flex items-stretch gap-0 flex-shrink-0">
        {[
          { k: 'Критич.',  v: criticalCount, cls: '#F85149' },
          { k: 'Просрочка', v: overdueCount,  cls: '#F0A500' },
          { k: 'Ожидают',  v: pendingCount,   cls: '#388BFD' },
        ].map((item, i) => (
          <div key={i} className="flex flex-col gap-0.5 items-start px-5"
            style={{ borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.10)' : undefined }}>
            <span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-white/40">{item.k}</span>
            <span className="font-mono text-[22px] font-bold leading-none" style={{ color: item.cls }}>{item.v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Bottom status bar ──────────────────────────────────────────────
function BottomStatusBar({ overdueCount, pendingCount, safetyCount }: {
  overdueCount: number; pendingCount: number; safetyCount: number
}) {
  const cells = [
    { color: 'red', emoji: '⚠', title: 'Просрочка по заявкам', sub: overdueCount > 0 ? `${overdueCount} заявок в работе >6ч` : 'Нет просроченных', count: overdueCount, bg: 'rgba(248,81,73,0.10)', border: 'rgba(248,81,73,0.35)', text: '#F85149', ctBg: '#F85149', ctText: '#fff' },
    { color: 'amb', emoji: '📋', title: 'Согласования', sub: `планы работ · до 16:30`, count: pendingCount, bg: 'rgba(240,165,0,0.10)', border: 'rgba(240,165,0,0.35)', text: '#F0A500', ctBg: '#F0A500', ctText: '#0D1117' },
    { color: 'blu', emoji: '👥', title: 'Кадры · уведомление', sub: safetyCount > 0 ? `${safetyCount} допусков просрочено` : 'Нет уведомлений', count: safetyCount, bg: 'rgba(56,139,253,0.10)', border: 'rgba(56,139,253,0.35)', text: '#388BFD', ctBg: '#388BFD', ctText: '#fff' },
  ]
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cells.map((c, i) => (
        <div key={i} className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
          style={{ background: c.bg, border: `1px solid ${c.border}` }}>
          <span className="text-lg">{c.emoji}</span>
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <span className="text-xs font-bold" style={{ color: c.text }}>{c.title}</span>
            <span className="text-[11px] opacity-75" style={{ color: c.text }}>{c.sub}</span>
          </div>
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: c.ctBg, color: c.ctText }}>
            {c.count}
          </span>
        </div>
      ))}
    </div>
  )
}

function Content({ session }: { session: AuthSession }) {
  const [requests, setRequests] = useState<Request[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [allUsers, setAllUsers] = useState<UserWithAssignment[]>([])
  const [stats, setStats] = useState<{ total: number; byStatus: Record<string, number>; byService: Record<string, number>; byPriority: Record<string, number> }>({ total: 0, byStatus: {}, byService: {}, byPriority: {} })
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([])
  const [totalDeployed, setTotalDeployed] = useState(0)
  const [tab, setTab] = useState<'overview' | 'plans' | 'roster' | 'approve' | 'log'>('overview')

  const loadData = useCallback(async () => {
    const [reqs, svcs, st, log, ps, users] = await Promise.all([
      fetchRequests(), fetchServices(), fetchRequestStats(), fetchChangelog(30), fetchPeopleStats(),
      fetchUsersWithAssignments(),
    ])
    setRequests(reqs); setServices(svcs); setStats(st); setChangelog(log)
    setTotalDeployed(ps.totalDeployed); setAllUsers(users)
  }, [])

  const { loading, error, reload } = useLoadData(loadData)

  const pendingApproval = requests.filter(r => r.approved_by_zamporab && !r.approved_by_boss)
  const donePercent = stats.total > 0 ? Math.round(((stats.byStatus['DONE'] || 0) / stats.total) * 100) : 0
  const criticalCount = requests.filter(r => r.priority === 'CRITICAL' || r.urgency === 'EMERGENCY').length

  const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000
  const overdueCount = requests.filter(r =>
    r.status === 'IN_PROGRESS' && new Date(r.updated_at || r.created_at).getTime() < sixHoursAgo
  ).length

  const handleApprove = async (reqId: string) => {
    await approveRequest(reqId, 'boss', session.user_id)
    reload()
  }

  const TABS: { id: typeof tab; label: string; badge?: number }[] = [
    { id: 'overview', label: 'Обзор' },
    { id: 'plans',   label: 'Совещание', badge: pendingApproval.length },
    { id: 'roster',  label: 'Смена' },
    { id: 'approve', label: 'Заявки',    badge: pendingApproval.length },
    { id: 'log',     label: 'Журнал' },
  ]

  if (loading) return <PanelLoader />

  return (
    <div className="min-h-screen p-4 max-w-[1800px] mx-auto space-y-3">
      <Header session={session} title="Начальник участка" emoji="🏠" mode="REVIEW" />

      {error && <DataErrorBanner error={error} onRetry={reload} />}

      <AlertBanner session={session} />
      <GuidedTour steps={BOSS_TOUR} storageKey="tour_boss_v1" />
      <WhatNextBanner
        role={session.role_level}
        currentStatus={requests.some(r => r.status === 'PLANNED') ? 'PLANNED' : null}
        planCount={requests.filter(r => r.status === 'PLANNED').length}
        onAction={() => setTab('plans')}
      />

      {/* Health Indicator */}
      <HealthIndicator
        criticalCount={criticalCount}
        donePercent={donePercent}
        pendingCount={pendingApproval.length}
        overdueCount={overdueCount}
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Health */}
        <div className="glass rounded-xl p-4">
          <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2">Здоровье</div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3.5 h-3.5 rounded-full flex-shrink-0" style={{
              background: criticalCount === 0 && donePercent >= 50 ? '#3FB950' : criticalCount > 3 ? '#F85149' : '#F0A500',
              boxShadow: `0 0 0 3px ${criticalCount === 0 && donePercent >= 50 ? 'rgba(63,185,80,0.18)' : criticalCount > 3 ? 'rgba(248,81,73,0.18)' : 'rgba(240,165,0,0.18)'}, 0 0 16px ${criticalCount === 0 && donePercent >= 50 ? 'rgba(63,185,80,0.6)' : criticalCount > 3 ? 'rgba(248,81,73,0.6)' : 'rgba(240,165,0,0.6)'}`,
            }} />
            <span className="font-mono text-sm font-bold" style={{
              color: criticalCount === 0 && donePercent >= 50 ? '#3FB950' : criticalCount > 3 ? '#F85149' : '#F0A500',
              letterSpacing: '0.06em',
            }}>
              {criticalCount === 0 && donePercent >= 50 ? 'ЗЕЛЁН.' : criticalCount > 3 ? 'КРАСН.' : 'ЖЁЛТ.'}
            </span>
          </div>
          <div className="text-[11px] text-white/30 mt-1.5">требует внимания</div>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2">Всего заявок</div>
          <div className="font-mono text-[28px] font-bold text-white leading-none">{stats.total}</div>
          <div className="text-[11px] text-white/30 mt-1.5">за смену</div>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2">Выполнено</div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-[28px] font-bold leading-none" style={{ color: '#3FB950' }}>{donePercent}</span>
            <span className="font-mono text-sm font-semibold text-white/40">%</span>
          </div>
          <div className="text-[11px] mt-1.5" style={{ color: '#3FB950' }}>{stats.byStatus['DONE'] || 0} из {stats.total} заявок</div>
        </div>

        <div className="glass rounded-xl p-4 relative">
          {criticalCount > 0 && (
            <span className="absolute top-2.5 right-3 w-2 h-2 rounded-full" style={{
              background: '#F85149',
              animation: 'pulseDot 1.8s infinite',
            }} />
          )}
          <style>{`@keyframes pulseDot{0%{box-shadow:0 0 0 0 rgba(248,81,73,.6)}70%{box-shadow:0 0 0 9px rgba(248,81,73,0)}100%{box-shadow:0 0 0 0 rgba(248,81,73,0)}}`}</style>
          <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2">Критических</div>
          <div className="font-mono text-[28px] font-bold leading-none" style={{ color: '#F85149' }}>{criticalCount}</div>
          <div className="text-[11px] mt-1.5" style={{ color: '#F85149' }}>требуют решения</div>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2">На утверждении</div>
          <div className="font-mono text-[28px] font-bold leading-none" style={{ color: '#F0A500' }}>{pendingApproval.length}</div>
          <div className="text-[11px] text-white/30 mt-1.5">до 16:30 · совещание</div>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2">Людей в работе</div>
          <div className="font-mono text-[28px] font-bold leading-none text-white/40">{totalDeployed}</div>
          <div className="text-[11px] text-white/30 mt-1.5">смена принята</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass rounded-xl px-2 py-1.5 flex items-center gap-0.5">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all"
            style={tab === t.id ? {
              background: 'rgba(240,165,0,0.12)',
              color: '#F0A500',
              border: '1px solid rgba(240,165,0,0.30)',
            } : {
              color: 'rgba(255,255,255,0.45)',
            }}>
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span className="font-mono text-[10px] px-1.5 rounded-full"
                style={tab === t.id
                  ? { background: 'rgba(240,165,0,0.18)', color: '#F0A500' }
                  : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
        <div className="flex-1" />
        <HelpPanel panelTitle="Начальник участка" panelEmoji="🏠" sections={BOSS_HELP} />
        <GuidedTour steps={BOSS_TOUR} storageKey="tour_boss_v1" trigger="Обучение" />
        <button onClick={reload}
          className="px-2.5 py-1.5 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/10 transition-all">
          🔄
        </button>
      </div>

      {tab === 'overview' && <OverviewCharts stats={stats} services={services} requests={requests} />}
      {tab === 'plans' && <WorkPlansMeeting session={session} services={services} />}
      {tab === 'roster' && <ShiftRoster users={allUsers} services={services} />}

      {tab === 'approve' && (
        <div className="space-y-3">
          {pendingApproval.map(r => (
            <div key={r.request_id} className="glass rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-white/30 mr-2">{r.request_id}</span>
                <span className="text-white/80">{r.description || 'Без описания'}</span>
                <div className="text-xs text-white/40 mt-1">
                  {r.approved_by_head && <span className="text-green-400 mr-2">✓ НС</span>}
                  {r.approved_by_zamporab && <span className="text-green-400 mr-2">✓ Прораб</span>}
                </div>
              </div>
              <button onClick={() => handleApprove(r.request_id)}
                className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                style={{ background: 'rgba(63,185,80,0.12)', border: '1px solid rgba(63,185,80,0.40)', color: '#3FB950' }}>
                ✓ Утвердить
              </button>
            </div>
          ))}
          {pendingApproval.length === 0 && <EmptyState message="Нет заявок на утверждение" />}
        </div>
      )}

      {tab === 'log' && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-[11px] font-bold uppercase tracking-[0.10em] text-white/40 font-mono">Журнал смены</span>
            <span className="ml-auto text-[10px] text-white/30 font-mono">
              <b className="text-white">{changelog.length}</b> событий
            </span>
          </div>
          {changelog.length === 0 ? (
            <div className="px-5 py-12 text-center text-white/20 text-sm">Нет записей</div>
          ) : (
            changelog.slice(0, 30).map((e, i) => {
              const style = getActionStyle(e.action_type)
              return (
                <div key={e.id}
                  className="grid items-center gap-4 px-5 py-2.5 font-mono text-xs"
                  style={{
                    gridTemplateColumns: '90px 80px 120px 1fr',
                    background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : undefined,
                  }}>
                  <span className="text-white/35">
                    {new Date(e.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className="font-bold" style={{ color: style.color }}>{style.label}</span>
                  <span className="text-white/45">{e.user_id || 'система'}</span>
                  <span className="font-sans text-xs text-white/60">
                    {e.entity_type && (
                      <code className="font-mono text-[11px] px-1 py-0.5 rounded mr-1"
                        style={{ background: 'rgba(240,165,0,0.08)', color: '#F0A500' }}>
                        {e.entity_type} {e.entity_id}
                      </code>
                    )}
                    {e.action_type}
                  </span>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Bottom Status Bar */}
      <BottomStatusBar
        overdueCount={overdueCount}
        pendingCount={pendingApproval.length}
        safetyCount={0}
      />
    </div>
  )
}
