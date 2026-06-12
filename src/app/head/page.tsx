'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import { fetchWorkPlans, fetchWorkPlansWithItems, fetchCrossServiceRequests, fetchServices } from '@/lib/api-client'
import type { WorkPlanWithItems, WorkPlan, AuthSession, CrossServiceRequest, Service } from '@/types'
import ServiceStats from '@/components/head/ServiceStats'
import PlanList from '@/components/head/PlanList'
import CreatePlanModal from '@/components/head/CreatePlanModal'
import StaffBoard from '@/components/head/StaffBoard'
import IncomingRequests from '@/components/head/IncomingRequests'
import AlertBanner from '@/components/AlertBanner'
import { WhatNextBanner, GuidedTour, HelpPanel } from '@/components/help'
import { HEAD_TOUR, HEAD_HELP } from '@/components/help/tours'
import PlanTaskSheetModal from '@/components/head/PlanTaskSheetModal'
import HeadTransportTab from '@/components/head/HeadTransportTab'
import DraftPlansSection from '@/components/head/DraftPlansSection'
import { useLoadData } from '@/lib/useLoadData'
import { PanelLoader, DataErrorBanner } from '@/components/DataState'

export default function HeadPage() {
  return (
    <AuthGuard roles={['HEAD', 'ADMIN', 'BOSS']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}

function getDeadlineCountdown(): string | null {
  const now = new Date()
  const deadline = new Date(now)
  deadline.setHours(16, 0, 0, 0)
  const diff = deadline.getTime() - now.getTime()
  if (diff <= 0) return null
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function Content({ session }: { session: AuthSession }) {
  const [plans, setPlans] = useState<WorkPlanWithItems[]>([])
  const [rawPlans, setRawPlans] = useState<WorkPlan[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [incomingRequests, setIncomingRequests] = useState<CrossServiceRequest[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [showTaskSheet, setShowTaskSheet] = useState(false)
  const [tab, setTab] = useState<'plans' | 'staff' | 'transport' | 'incoming'>('plans')
  const [timerLabel, setTimerLabel] = useState<string | null>(getDeadlineCountdown())

  const loadData = useCallback(async () => {
    const [raw, svcs] = await Promise.all([
      fetchWorkPlans({ serviceId: session.service_id ?? undefined }),
      fetchServices(),
    ])
    setRawPlans(raw)
    setServices(svcs)
    const withItems = await fetchWorkPlansWithItems(raw.map(p => p.id))
    setPlans(withItems)
    if (session.service_id) {
      const incoming = await fetchCrossServiceRequests({ toServiceId: session.service_id })
      setIncomingRequests(incoming)
    }
  }, [session.service_id])

  const { loading, error, reload } = useLoadData(loadData)

  // Refresh deadline timer every second
  useEffect(() => {
    const t = setInterval(() => setTimerLabel(getDeadlineCountdown()), 1000)
    return () => clearInterval(t)
  }, [])

  const pendingCount = incomingRequests.filter(r => r.status === 'PENDING').length

  if (loading) return <PanelLoader />

  return (
    <div className="min-h-screen p-4 max-w-[1800px] mx-auto">
      <Header
        session={session}
        title="Начальник службы"
        emoji="🏢"
        mode="PLANNING"
        showTimer={timerLabel ?? undefined}
      />
      {error && <DataErrorBanner error={error} onRetry={reload} />}
      <AlertBanner session={session} />
      <GuidedTour steps={HEAD_TOUR} storageKey="tour_head_v1" />
      <WhatNextBanner
        role={session.role_level}
        currentStatus={plans.find(p => ['DRAFT','SUBMITTED','REJECTED'].includes(p.status))?.status ?? null}
        planCount={plans.length}
        onAction={() => setShowCreate(true)}
      />
      <ServiceStats plans={plans} />

      {/* Tabs */}
      <div className="glass rounded-xl flex items-center gap-1 p-1 mb-4 flex-wrap">
        <div className="flex items-center gap-1 flex-1 flex-wrap">
          {([
            { key: 'plans',    label: 'Планы работ',     count: plans.length },
            { key: 'staff',    label: 'Состав смены',    count: null },
            { key: 'transport',label: 'Транспорт',       count: null },
            { key: 'incoming', label: 'Запросы от служб',count: incomingRequests.length },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.key ? 'bg-white/[0.08] text-white' : 'text-white/50 hover:bg-white/[0.04] hover:text-white/80'
              }`}
            >
              {t.label}
              {t.count !== null && t.count > 0 && (
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-mono ${
                  tab === t.key ? 'bg-amber-500/20 text-amber-400' : 'bg-white/[0.06] text-white/40'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <HelpPanel panelTitle="Начальник службы" panelEmoji="🏢" sections={HEAD_HELP} showWorkflow />
          <GuidedTour steps={HEAD_TOUR} storageKey="tour_head_v1" trigger="Обучение" />
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button
            onClick={() => setShowTaskSheet(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white/60 hover:bg-white/[0.08] hover:text-white/90 transition-all"
          >
            🖨 План-задание →
          </button>
          <Link
            href="/hr-tools"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white/60 hover:bg-white/[0.08] hover:text-white/90 transition-all"
          >
            📊 Аналитика →
          </Link>
          <button
            onClick={reload}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white flex items-center justify-center text-sm transition-all"
          >
            ⟳
          </button>
        </div>
      </div>

      {tab === 'plans' && (
        <>
          <DraftPlansSection plans={plans} session={session} onRefresh={reload} />
          <PlanList
            plans={plans}
            session={session}
            onRefresh={reload}
            onCreatePlan={() => setShowCreate(true)}
          />
          {showCreate && (
            <CreatePlanModal
              session={session}
              existingPlans={rawPlans}
              onClose={() => setShowCreate(false)}
              onSaved={reload}
            />
          )}
        </>
      )}

      {tab === 'staff' && <StaffBoard serviceId={session.service_id ?? ''} />}

      {tab === 'transport' && <HeadTransportTab plans={plans} services={services} />}

      {tab === 'incoming' && <IncomingRequests session={session} />}

      {showTaskSheet && plans.length > 0 && (
        <PlanTaskSheetModal
          plans={plans}
          session={session}
          defaultDate={plans[0].plan_date}
          onClose={() => setShowTaskSheet(false)}
        />
      )}
      {showTaskSheet && plans.length === 0 && (
        <PlanTaskSheetModal
          plans={[]}
          session={session}
          defaultDate={new Date().toISOString().split('T')[0]}
          onClose={() => setShowTaskSheet(false)}
        />
      )}
    </div>
  )
}
