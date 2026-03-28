'use client'
import { useState, useEffect, useCallback } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import { fetchWorkPlans, fetchWorkPlanWithItems, fetchServices } from '@/lib/api'
import type { WorkPlanWithItems, WorkPlanStatus, Service, AuthSession } from '@/types'
import ChiefStats from '@/components/chief/ChiefStats'
import ChiefPlanCard from '@/components/chief/ChiefPlanCard'
import LiveBoard from '@/components/chief/LiveBoard'
import ChiefDirectives from '@/components/chief/ChiefDirectives'
import AlertBanner from '@/components/AlertBanner'
import { WhatNextBanner, GuidedTour, HelpPanel } from '@/components/help'
import { CHIEF_TOUR, CHIEF_HELP } from '@/components/help/tours'

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
  const [tab, setTab] = useState<'live' | 'approvals' | 'directives'>('live')

  const loadData = useCallback(async () => {
    const [raw, svcs] = await Promise.all([fetchWorkPlans(), fetchServices()])
    setServices(svcs)
    const withItems = await Promise.all(raw.map(p => fetchWorkPlanWithItems(p.id)))
    setPlans(withItems.filter(Boolean) as WorkPlanWithItems[])
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const visible = filter === 'ALL' ? plans : plans.filter(p => p.status === filter)

  const grouped = visible.reduce<Record<string, WorkPlanWithItems[]>>((acc, p) => {
    if (!acc[p.plan_date]) acc[p.plan_date] = []
    acc[p.plan_date].push(p)
    return acc
  }, {})
  const dates = Object.keys(grouped).sort()

  return (
    <div className="min-h-screen p-4 max-w-[1400px] mx-auto">
      <Header session={session} title="Главный инженер" emoji="🔧" mode="PLANNING" />

      <AlertBanner session={session} />
      <GuidedTour steps={CHIEF_TOUR} storageKey="tour_chief_v1" />
      <WhatNextBanner
        role={session.role_level}
        currentStatus={plans.some(p => p.status === 'SUBMITTED') ? 'SUBMITTED' : null}
        planCount={plans.filter(p => p.status === 'SUBMITTED').length}
        onAction={() => setTab('approvals')}
      />
      <ChiefStats plans={plans} />

      {/* Main tab switcher */}
      <div className="flex items-center gap-2 mb-4">
        <button
          data-tour="tab-live"
          onClick={() => setTab('live')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'live' ? 'bg-violet-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
        >
          🔴 Текущие работы
        </button>
        <button
          data-tour="tab-approvals"
          onClick={() => setTab('approvals')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${tab === 'approvals' ? 'bg-orange-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
        >
          📋 Согласование
          {plans.filter(p => p.status === 'SUBMITTED').length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
              {plans.filter(p => p.status === 'SUBMITTED').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('directives')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'directives' ? 'bg-rose-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
        >
          📝 Поручения
        </button>
        <div className="ml-auto flex items-center gap-2">
          <HelpPanel panelTitle="Главный инженер" panelEmoji="🔧" sections={CHIEF_HELP} showWorkflow currentStatus={plans.find(p => p.status === 'SUBMITTED')?.status} />
          <GuidedTour steps={CHIEF_TOUR} storageKey="tour_chief_v1" trigger="Обучение" />
          <button onClick={loadData} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 text-sm">↻</button>
        </div>
      </div>

      {tab === 'live' ? (
        <LiveBoard />
      ) : tab === 'directives' ? (
        <ChiefDirectives session={session} />
      ) : (
        <>
          {/* Filter tabs */}
          <div className="flex items-center gap-2 mb-4">
            {STATUS_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${
                  filter === t.key
                    ? 'bg-orange-600 text-white font-medium'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
                }`}
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
                    .sort((a, b) => (a.shift_type === 'DAY' ? -1 : 1))
                    .map(plan => (
                      <ChiefPlanCard
                        key={plan.id}
                        plan={plan}
                        session={session}
                        services={services}
                        onRefresh={loadData}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
