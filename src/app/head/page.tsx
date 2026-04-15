'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import { fetchWorkPlans, fetchWorkPlanWithItems, fetchCrossServiceRequests, fetchServices } from '@/lib/api'
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

export default function HeadPage() {
  return (
    <AuthGuard roles={['HEAD', 'ADMIN', 'BOSS']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}

function getDeadlineTimer(): string | null {
  const now = new Date()
  const deadline = new Date(now)
  deadline.setHours(16, 0, 0, 0)
  if (now >= deadline) return null
  const diff = deadline.getTime() - now.getTime()
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `${h}ч ${m}м до совещания` : `${m} мин до совещания`
}

function Content({ session }: { session: AuthSession }) {
  const [plans, setPlans] = useState<WorkPlanWithItems[]>([])
  const [rawPlans, setRawPlans] = useState<WorkPlan[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [incomingRequests, setIncomingRequests] = useState<CrossServiceRequest[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [showTaskSheet, setShowTaskSheet] = useState(false)
  const [tab, setTab] = useState<'plans' | 'staff' | 'transport' | 'incoming'>('plans')
  const [timerLabel, setTimerLabel] = useState<string | null>(getDeadlineTimer())

  const loadData = useCallback(async () => {
    const [raw, svcs] = await Promise.all([
      fetchWorkPlans({ serviceId: session.service_id ?? undefined }),
      fetchServices(),
    ])
    setRawPlans(raw)
    setServices(svcs)
    const withItems = await Promise.all(raw.map(p => fetchWorkPlanWithItems(p.id)))
    setPlans(withItems.filter(Boolean) as WorkPlanWithItems[])
    if (session.service_id) {
      const incoming = await fetchCrossServiceRequests({ toServiceId: session.service_id })
      setIncomingRequests(incoming)
    }
  }, [session.service_id])

  useEffect(() => { loadData() }, [loadData])

  // Refresh deadline timer every minute
  useEffect(() => {
    const t = setInterval(() => setTimerLabel(getDeadlineTimer()), 60000)
    return () => clearInterval(t)
  }, [])

  const pendingCount = incomingRequests.filter(r => r.status === 'PENDING').length

  return (
    <div className="min-h-screen p-4 max-w-[1400px] mx-auto">
      <Header
        session={session}
        title="Начальник службы"
        emoji="🏢"
        mode="PLANNING"
        showTimer={timerLabel ?? undefined}
      />
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
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setTab('plans')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'plans' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
        >
          📋 Планы работ
        </button>
        <button
          onClick={() => setTab('staff')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'staff' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
        >
          👷 Состав смены
        </button>
        <button
          onClick={() => setTab('transport')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'transport' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
        >
          🚛 Транспорт
        </button>
        <button
          onClick={() => setTab('incoming')}
          className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'incoming' ? 'bg-violet-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
        >
          🔗 Запросы от служб
          {pendingCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
              {pendingCount}
            </span>
          )}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <HelpPanel panelTitle="Начальник службы" panelEmoji="🏢" sections={HEAD_HELP} showWorkflow />
          <GuidedTour steps={HEAD_TOUR} storageKey="tour_head_v1" trigger="Обучение" />
          <button
            onClick={() => setShowTaskSheet(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30 transition-colors text-sm font-medium"
          >
            🖨 План-задание
          </button>
          <Link
            href="/hr-tools"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30 transition-colors text-sm font-medium"
          >
            📊 Аналитика →
          </Link>
          <button onClick={loadData} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 text-sm">↻</button>
        </div>
      </div>

      {tab === 'plans' && (
        <>
          <DraftPlansSection plans={plans} session={session} onRefresh={loadData} />
          <PlanList
            plans={plans}
            session={session}
            onRefresh={loadData}
            onCreatePlan={() => setShowCreate(true)}
          />
          {showCreate && (
            <CreatePlanModal
              session={session}
              existingPlans={rawPlans}
              onClose={() => setShowCreate(false)}
              onSaved={loadData}
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
