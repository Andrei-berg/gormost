'use client'
import { useState, useEffect, useCallback } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import TaskList from '@/components/foreman/TaskList'
import BrigadeAssigner from '@/components/foreman/BrigadeAssigner'
import PlanDashboard from '@/components/foreman/PlanDashboard'
import PlanArchive from '@/components/foreman/PlanArchive'
import RedirectBanner from '@/components/foreman/RedirectBanner'
import {
  fetchRequests, fetchCategories, fetchObjects, fetchConstructions,
  fetchWorkTypes, fetchServices, updateRequestStatus,
  fetchWorkPlans, fetchWorkPlansWithItems, startWorkPlan, completeWorkPlan,
  fetchWorkRedirects, fetchUserRequestIds,
} from '@/lib/api-client'
import type { Request, Category, GObject, Construction, WorkType, Service, AuthSession, RequestStatus, WorkPlanWithItems, WorkRedirect } from '@/types'
import { WORK_PLAN_STATUS_CONFIG } from '@/types'
import AlertBanner from '@/components/AlertBanner'
import { WhatNextBanner, GuidedTour, HelpPanel } from '@/components/help'
import { FOREMAN_TOUR, FOREMAN_HELP } from '@/components/help/tours'
import WorkPermitLauncher from '@/components/head/WorkPermitLauncher'
import { useLoadData } from '@/lib/useLoadData'
import { PanelLoader, DataErrorBanner } from '@/components/DataState'

export default function ForemanPage() {
  return (
    <AuthGuard roles={['FOREMAN', 'ADMIN', 'BOSS', 'ZAMPORAB']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}

function Content({ session }: { session: AuthSession }) {
  const [allRequests, setAllRequests] = useState<Request[]>([])
  const [myRequestIds, setMyRequestIds] = useState<Set<string>>(new Set())
  const [categories, setCategories] = useState<Category[]>([])
  const [objects, setObjects] = useState<GObject[]>([])
  const [constructions, setConstructions] = useState<Construction[]>([])
  const [workTypes, setWorkTypes] = useState<WorkType[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [myPlans, setMyPlans] = useState<WorkPlanWithItems[]>([])
  const [redirectedPlans, setRedirectedPlans] = useState<WorkPlanWithItems[]>([])
  const [redirects, setRedirects] = useState<WorkRedirect[]>([])
  const [filter, setFilter] = useState<'all' | 'mine'>('mine')
  const [tab, setTab] = useState<'plans' | 'brigade' | 'archive' | 'tasks'>('plans')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [planLoading, setPlanLoading] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadData = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]
    const [reqs, cats, objs, cons, wts, svcs, rawPlans] = await Promise.all([
      fetchRequests(), fetchCategories(), fetchObjects(), fetchConstructions(),
      fetchWorkTypes(), fetchServices(),
      fetchWorkPlans({
        serviceId: session.service_id ?? undefined,
        planDate: today,
        statuses: ['BOSS_CONFIRMED', 'ASSIGNED', 'PLANNED', 'FAST_TRACK', 'IN_PROGRESS', 'DONE'],
      }),
    ])
    setAllRequests(reqs); setCategories(cats); setObjects(objs)
    setConstructions(cons); setWorkTypes(wts); setServices(svcs)

    const plansWithItems = await fetchWorkPlansWithItems(rawPlans.map(p => p.id))
    setMyPlans(plansWithItems)

    // Load redirected/suspended plans for this service
    const rawRedirected = await fetchWorkPlans({
      serviceId: session.service_id ?? undefined,
      planDate: today,
      statuses: ['REDIRECTED', 'SUSPENDED', 'FAST_TRACK'],
    })
    const redirectedWithItems = await fetchWorkPlansWithItems(rawRedirected.map(p => p.id))
    setRedirectedPlans(redirectedWithItems)

    // Load redirect records
    const allRedirects = await fetchWorkRedirects()
    setRedirects(allRedirects)

    const assignedIds = await fetchUserRequestIds(session.user_id)
    setMyRequestIds(new Set(assignedIds))
    setLastUpdated(new Date())
  }, [session.user_id, session.service_id])

  const { loading, error, reload } = useLoadData(loadData)
  useEffect(() => {
    const t = setInterval(reload, 30000)
    return () => clearInterval(t)
  }, [reload])

  const requests = filter === 'mine'
    ? allRequests.filter(r => myRequestIds.has(r.request_id))
    : allRequests

  const handleAction = async (reqId: string, status: RequestStatus) => {
    setActionLoading(reqId)
    await updateRequestStatus(reqId, status, session.user_id)
    await reload()
    setActionLoading(null)
  }

  const handlePlanAction = async (planId: string, action: 'start' | 'complete') => {
    setPlanLoading(planId)
    if (action === 'start') await startWorkPlan(planId, session.user_id)
    else await completeWorkPlan(planId, session.user_id)
    await reload()
    setPlanLoading(null)
  }

  const myReqs = allRequests.filter(r => myRequestIds.has(r.request_id))
  const activePlans = myPlans.filter(p => p.status !== 'DONE')

  if (loading) return <PanelLoader />

  return (
    <div className="min-h-screen p-4 max-w-[1800px] mx-auto">
      <Header session={session} title="Мастер/Бригадир" emoji="👷‍♂️" mode="LIVE" lastUpdated={lastUpdated} />

      {error && <DataErrorBanner error={error} onRetry={reload} />}

      <AlertBanner session={session} />

      {/* Guided onboarding tour */}
      <GuidedTour steps={FOREMAN_TOUR} storageKey="tour_foreman_v1" />

      {/* Smart "what to do next" hint */}
      <WhatNextBanner
        role={session.role_level}
        currentStatus={activePlans[0]?.status ?? null}
        planCount={activePlans.length}
        onAction={() => setTab('brigade')}
      />

      <RedirectBanner redirectedPlans={redirectedPlans} redirects={redirects} />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white font-mono">{myReqs.length}</div>
          <div className="text-xs text-white/40">Мои задачи</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-violet-400 font-mono">{myReqs.filter(r => r.status === 'IN_PROGRESS').length}</div>
          <div className="text-xs text-white/40">В работе</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400 font-mono">{myReqs.filter(r => r.status === 'DONE').length}</div>
          <div className="text-xs text-white/40">Выполнено</div>
        </div>
      </div>

      {/* Work plans section */}
      {myPlans.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-3">Планы смены</h2>
          <div className="space-y-3">
            {myPlans.map(plan => {
              const statusCfg = WORK_PLAN_STATUS_CONFIG[plan.status]
              const shiftLabel = plan.shift_type === 'DAY' ? '☀️ День' : '🌙 Ночь'
              const isLoading = planLoading === plan.id
              return (
                <div key={plan.id} className={`glass rounded-xl overflow-hidden border ${
                  plan.status === 'IN_PROGRESS' ? 'border-violet-500/30' :
                  plan.status === 'DONE' ? 'border-green-500/20' :
                  plan.status === 'FAST_TRACK' ? 'border-rose-500/40' :
                  'border-blue-500/20'
                }`}>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-white/60">{shiftLabel}</span>
                      {plan.status === 'IN_PROGRESS' && plan.fact_start && (
                        <span className="text-xs text-violet-400">
                          начато {new Date(plan.fact_start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusCfg.bg}`} style={{ color: statusCfg.color }}>
                        {statusCfg.label}
                      </span>
                      {['PLANNED', 'ASSIGNED', 'BOSS_CONFIRMED', 'FAST_TRACK'].includes(plan.status) && (
                        <button
                          onClick={() => handlePlanAction(plan.id, 'start')}
                          disabled={isLoading}
                          className={`px-3 py-1.5 rounded-lg text-white text-sm font-medium disabled:opacity-50 ${
                            plan.status === 'FAST_TRACK' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-violet-600 hover:bg-violet-500'
                          }`}
                        >
                          {isLoading ? '...' : plan.status === 'FAST_TRACK' ? '⚡ Срочно в работу' : '▶ В работу'}
                        </button>
                      )}
                      {plan.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => handlePlanAction(plan.id, 'complete')}
                          disabled={isLoading}
                          className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium disabled:opacity-50"
                        >
                          {isLoading ? '...' : '✓ Выполнено'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="px-4 py-3 space-y-1">
                    {plan.items.map(item => (
                      <div key={item.id} className="flex items-center gap-2 text-xs">
                        {item.time_start && (
                          <span className="font-mono text-cyan-400 shrink-0">{item.time_start}{item.time_end ? `–${item.time_end}` : ''}</span>
                        )}
                        <span className="font-medium text-white/80">{item.location}</span>
                        <span className="text-white/40">—</span>
                        <span className="text-white/60">{item.work_description}</span>
                        {item.workers.length > 0 && (
                          <div className="ml-auto flex flex-wrap gap-1">
                            {item.workers.map((w, i) => (
                              <span key={i} className="text-[10px] bg-blue-500/15 text-blue-300 px-1.5 py-0.5 rounded-full border border-blue-500/20">{w}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {plan.items.length === 0 && <div className="text-xs text-white/20 italic">Позиции не добавлены</div>}
                  </div>
                </div>
              )
            })}
          </div>
          {activePlans.length === 0 && myPlans.length > 0 && (
            <div className="text-xs text-green-400/60 mt-2">Все планы выполнены</div>
          )}
        </div>
      )}

      {/* Main tabs */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button data-tour="tab-plans" onClick={() => setTab('plans')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'plans' ? 'bg-violet-600 text-white' : 'bg-white/5 text-white/50'}`}>
          📊 Планы смены
        </button>
        <button data-tour="tab-brigade" onClick={() => setTab('brigade')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'brigade' ? 'bg-cyan-600 text-white' : 'bg-white/5 text-white/50'}`}>
          👷 Бригады
        </button>
        <button onClick={() => setTab('archive')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'archive' ? 'bg-slate-600 text-white' : 'bg-white/5 text-white/50'}`}>
          🗂 Архив
        </button>
        <button onClick={() => setTab('tasks')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'tasks' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50'}`}>
          Заявки
        </button>
        <div className="flex items-center gap-2 ml-auto">
          <WorkPermitLauncher session={session} services={services} serviceId={session.service_id ?? undefined} />
          <HelpPanel
            panelTitle="Мастер / Бригадир"
            panelEmoji="👷‍♂️"
            sections={FOREMAN_HELP}
            currentStatus={activePlans[0]?.status}
            showWorkflow
          />
          <GuidedTour steps={FOREMAN_TOUR} storageKey="tour_foreman_v1" trigger="Обучение" />
          <button onClick={reload} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 text-sm">↻</button>
        </div>
      </div>

      {tab === 'plans' && (
        <PlanDashboard
          session={session}
          services={services}
          onOpenAssigner={() => setTab('brigade')}
        />
      )}

      {tab === 'archive' && <PlanArchive session={session} services={services} />}

      {tab === 'brigade' && <BrigadeAssigner session={session} services={services} />}

      {tab === 'tasks' && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setFilter('mine')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === 'mine' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50'}`}>Мои задачи</button>
            <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50'}`}>Все заявки</button>
          </div>
          <TaskList
            requests={requests}
            myRequestIds={myRequestIds}
            categories={categories} objects={objects} constructions={constructions}
            workTypes={workTypes} services={services}
            actionLoading={actionLoading}
            onAction={handleAction}
          />
        </>
      )}

    </div>
  )
}
