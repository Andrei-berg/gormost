'use client'
import { useState, useCallback } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import { fetchWorkPlans, fetchWorkPlansWithItems, fetchServices, approveWorkPlan } from '@/lib/api-client'
import type { WorkPlanWithItems, WorkPlanStatus, Service, AuthSession } from '@/types'
import ChiefStats from '@/components/chief/ChiefStats'
import ChiefPlanCard from '@/components/chief/ChiefPlanCard'
import LiveBoard from '@/components/chief/LiveBoard'
import UrgentOrdersPanel from '@/components/shared/UrgentOrdersPanel'
import AlertBanner from '@/components/AlertBanner'
import { WhatNextBanner, GuidedTour, HelpPanel } from '@/components/help'
import { CHIEF_TOUR, CHIEF_HELP } from '@/components/help/tours'
import { useLoadData } from '@/lib/useLoadData'
import { PanelLoader, DataErrorBanner } from '@/components/DataState'
import WorkPermitLauncher from '@/components/head/WorkPermitLauncher'
import WorkPermitCatalogEditor from '@/components/head/WorkPermitCatalogEditor'

export default function ChiefPage() {
  return (
    <AuthGuard roles={['CHIEF_ENGINEER', 'ADMIN', 'BOSS']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}

const DAY_NAMES = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']

const STATUS_TABS: Array<{ key: WorkPlanStatus | 'ALL'; label: string }> = [
  { key: 'SUBMITTED', label: 'На согласовании' },
  { key: 'APPROVED',  label: 'Согласованы' },
  { key: 'ALL',       label: 'Все' },
]

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const dd = d.getDate().toString().padStart(2, '0')
  const mm = (d.getMonth() + 1).toString().padStart(2, '0')
  return `${DAY_NAMES[d.getDay()]}, ${dd}.${mm}.${d.getFullYear()}`
}

function Content({ session }: { session: AuthSession }) {
  const [plans, setPlans] = useState<WorkPlanWithItems[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [filter, setFilter] = useState<WorkPlanStatus | 'ALL'>('SUBMITTED')
  const [tab, setTab] = useState<'live' | 'approvals' | 'directives'>('approvals')
  const [savingAll, setSavingAll] = useState(false)

  const loadData = useCallback(async () => {
    const [raw, svcs] = await Promise.all([fetchWorkPlans(), fetchServices()])
    setServices(svcs)
    const withItems = await fetchWorkPlansWithItems(raw.map(p => p.id))
    setPlans(withItems)
  }, [])

  const { loading, error, reload } = useLoadData(loadData)

  const submittedPlans = plans.filter(p => p.status === 'SUBMITTED')
  const approvedPlans  = plans.filter(p => p.status === 'APPROVED')
  const livePlans      = plans.filter(p => ['IN_PROGRESS', 'ASSIGNED', 'BOSS_CONFIRMED'].includes(p.status))

  const visible = filter === 'ALL' ? plans : plans.filter(p => p.status === filter)
  const grouped = visible.reduce<Record<string, WorkPlanWithItems[]>>((acc, p) => {
    if (!acc[p.plan_date]) acc[p.plan_date] = []
    acc[p.plan_date].push(p)
    return acc
  }, {})
  const dates = Object.keys(grouped).sort()

  const handleApproveAll = async () => {
    if (submittedPlans.length === 0) return
    setSavingAll(true)
    await Promise.all(submittedPlans.map(p => approveWorkPlan(p.id, session.user_id)))
    setSavingAll(false)
    reload()
  }

  if (loading) return <PanelLoader />

  return (
    <div className="min-h-screen p-4 max-w-[1800px] mx-auto">
      <Header session={session} title="Главный инженер" emoji="🔧" mode="PLANNING" />

      {error && <DataErrorBanner error={error} onRetry={reload} />}

      <AlertBanner session={session} />
      <GuidedTour steps={CHIEF_TOUR} storageKey="tour_chief_v1" />
      <WhatNextBanner
        role={session.role_level}
        currentStatus={submittedPlans.length > 0 ? 'SUBMITTED' : null}
        planCount={submittedPlans.length}
        onAction={() => setTab('approvals')}
      />
      <ChiefStats plans={plans} />

      {/* Tab bar */}
      <div
        className="flex items-center gap-1 p-1.5 rounded-xl mb-4"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
      >
        <TabBtn
          active={tab === 'live'}
          onClick={() => setTab('live')}
          count={livePlans.length}
        >
          🛠 Текущие работы
        </TabBtn>
        <TabBtn
          active={tab === 'approvals'}
          onClick={() => setTab('approvals')}
          count={submittedPlans.length}
          data-tour="tab-approvals"
        >
          📋 Согласование
        </TabBtn>
        <TabBtn
          active={tab === 'directives'}
          onClick={() => setTab('directives')}
        >
          📌 Поручения
        </TabBtn>

        <div className="ml-auto flex items-center gap-1">
          <WorkPermitLauncher session={session} services={services} />
          <WorkPermitCatalogEditor session={session} services={services} />
          <HelpPanel panelTitle="Главный инженер" panelEmoji="🔧" sections={CHIEF_HELP} showWorkflow currentStatus={plans.find(p => p.status === 'SUBMITTED')?.status} />
          <GuidedTour steps={CHIEF_TOUR} storageKey="tour_chief_v1" trigger="Обучение" />
          <button
            onClick={reload}
            className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors text-sm"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
            title="Обновить"
          >
            ↻
          </button>
        </div>
      </div>

      {tab === 'live' ? (
        <LiveBoard />
      ) : tab === 'directives' ? (
        <UrgentOrdersPanel session={session} />
      ) : (
        <>
          {/* Section header */}
          <div className="flex items-center gap-2.5 mb-4 px-1">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: '#F0A500', boxShadow: '0 0 12px rgba(240,165,0,0.7)' }}
            />
            <span className="text-[11px] font-bold tracking-[0.10em] text-white/75 uppercase">
              На согласовании
            </span>
            <span
              className="font-mono text-[11px] px-2 py-0.5 rounded-full border"
              style={{ background: 'rgba(240,165,0,0.12)', color: '#F0A500', borderColor: 'rgba(240,165,0,0.30)' }}
            >
              {submittedPlans.length}
            </span>
            <div className="flex-1" />
            {submittedPlans.length > 1 && (
              <button
                onClick={handleApproveAll}
                disabled={savingAll}
                className="px-3 py-1.5 rounded-[9px] text-[12px] font-bold disabled:opacity-40 transition-all"
                style={{
                  background: '#F0A500', color: '#0D1117',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.15) inset, 0 2px 8px rgba(240,165,0,0.25)',
                  border: '1px solid #F0A500',
                }}
              >
                ✓ Согласовать все
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-2 mb-4">
            {STATUS_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${
                  filter === t.key
                    ? 'text-white font-medium'
                    : 'text-white/50 hover:text-white/70 hover:bg-white/10'
                }`}
                style={filter === t.key ? { background: 'rgba(240,165,0,0.12)', border: '1px solid rgba(240,165,0,0.30)', color: '#F0A500' } : { background: 'rgba(255,255,255,0.05)', border: '1px solid transparent' }}
              >
                {t.label}
                {t.key !== 'ALL' && (
                  <span className="ml-1.5 text-xs opacity-70">
                    {plans.filter(p => p.status === t.key).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {dates.length === 0 && (
            <div className="text-center py-16 text-white/30">
              <div className="text-5xl mb-3">📋</div>
              <div className="text-sm">
                {filter === 'SUBMITTED' ? 'Нет планов на согласовании' : 'Нет планов'}
              </div>
            </div>
          )}

          <div className="space-y-8">
            {dates.map(date => (
              <div key={date}>
                <h3 className="flex items-center gap-3 text-xs text-white/40 uppercase tracking-wider mb-3">
                  <span className="w-8 h-px bg-white/10 shrink-0" />
                  {formatDate(date)}
                  <span className="flex-1 h-px bg-white/10" />
                </h3>
                <div className="space-y-3">
                  {grouped[date]
                    .sort((a) => (a.shift_type === 'DAY' ? -1 : 1))
                    .map(plan => (
                      <ChiefPlanCard
                        key={plan.id}
                        plan={plan}
                        session={session}
                        services={services}
                        onRefresh={reload}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>

          {/* Status bar */}
          <div
            className="grid grid-cols-3 gap-0 mt-6 px-4 py-2.5 rounded-xl text-[12px] items-center"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <div className="flex items-center gap-1.5" style={{ color: '#F0A500' }}>
              <span className="w-[7px] h-[7px] rounded-full bg-current" />
              <b className="font-mono">{submittedPlans.length}</b>
              <span className="text-white/60">планов ждут согласования</span>
            </div>
            <div className="flex items-center justify-center gap-1 text-white/55">
              <b className="font-mono font-bold" style={{ color: '#3FB950' }}>{approvedPlans.length}</b>
              <span>план{approvedPlans.length === 1 ? '' : 'а'} согласован{approvedPlans.length === 1 ? '' : 'о'} сегодня</span>
            </div>
            <div className="flex items-center justify-end gap-1" style={{ color: '#388BFD' }}>
              <b className="font-mono">{livePlans.length}</b>
              <span>в работе</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function TabBtn({ children, active, onClick, count, ...rest }: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  count?: number
  [key: string]: unknown
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-[9px] text-[13px] font-semibold transition-all"
      style={
        active
          ? { background: 'rgba(240,165,0,0.12)', color: '#F0A500', border: '1px solid rgba(240,165,0,0.30)' }
          : { color: 'rgba(255,255,255,0.60)', border: '1px solid transparent' }
      }
      {...rest}
    >
      {children}
      {count !== undefined && (
        <span
          className="font-mono text-[11px] px-1.5 py-0.5 rounded-full"
          style={
            active
              ? { background: '#F0A500', color: '#0D1117' }
              : { background: 'rgba(255,255,255,0.10)', color: '#fff' }
          }
        >
          {count}
        </span>
      )}
    </button>
  )
}
