'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import KanbanBoard from '@/components/KanbanBoard'
import RequestModal from '@/components/RequestModal'
import ShiftRotationStrip from '@/components/ShiftRotationStrip'
import {
  fetchRequests, fetchCategories, fetchObjects, fetchConstructions, fetchWorkTypes,
  fetchServices, approveRequest,
  fetchWorkPlans, fetchWorkPlansWithItems, fetchCrossServiceRequests,
  fetchDriverUsers, fetchVehicles,
  confirmWorkPlanZamporab, approveWorkPlanDirect, } from '@/lib/api-client'
import type {
  Request, Category, GObject, Construction, WorkType, Service,
  AuthSession, WorkPlanWithItems, WorkPlan, CrossServiceRequest,
  UserWithAssignment, Vehicle, WorkPlanItem,
} from '@/types'
import { SERVICE_META } from '@/types'
import { isWorkerOnDuty } from '@/lib/shifts'
import PlanStats from '@/components/zamporab/PlanStats'
import ZamporabReviewModal from '@/components/zamporab/ZamporabReviewModal'
import ZamporabOwnPlan from '@/components/zamporab/ZamporabOwnPlan'
import ShiftOverview from '@/components/zamporab/ShiftOverview'
import ResourceBar from '@/components/zamporab/ResourceBar'
import EmptyState from '@/components/EmptyState'
import AlertBanner from '@/components/AlertBanner'
import { WhatNextBanner, GuidedTour, HelpPanel } from '@/components/help'
import { ZAMPORAB_TOUR, ZAMPORAB_HELP } from '@/components/help/tours'
import IncomingRequests from '@/components/head/IncomingRequests'
import WorkPlanSummaryModal from '@/components/zamporab/WorkPlanSummaryModal'
import UrgentOrdersPanel from '@/components/shared/UrgentOrdersPanel'
import { useLoadData } from '@/lib/useLoadData'
import { PanelLoader, DataErrorBanner } from '@/components/DataState'

export default function ZamPorabPage() {
  return (
    <AuthGuard roles={['ZAMPORAB', 'ADMIN', 'BOSS']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}

type Tab = 'plans' | 'pending' | 'kanban' | 'staff' | 'incoming' | 'directives'

function isOverduePlan(dateStr: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(dateStr) < today
}

function Content({ session }: { session: AuthSession }) {
  const [requests, setRequests] = useState<Request[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [objects, setObjects] = useState<GObject[]>([])
  const [constructions, setConstructions] = useState<Construction[]>([])
  const [workTypes, setWorkTypes] = useState<WorkType[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [allPlans, setAllPlans] = useState<WorkPlan[]>([])
  const [incomingRequests, setIncomingRequests] = useState<CrossServiceRequest[]>([])
  const [driverUsers, setDriverUsers] = useState<UserWithAssignment[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [pendingPlans, setPendingPlans] = useState<WorkPlanWithItems[]>([])
  const [reviewPlan, setReviewPlan] = useState<WorkPlanWithItems | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [selectedReq, setSelectedReq] = useState<Request | null>(null)
  const [tab, setTab] = useState<Tab>('plans')
  const [timerText, setTimerText] = useState('')
  const [ownPlanVersion, setOwnPlanVersion] = useState(0)
  const [showDone, setShowDone] = useState(false)

  const loadData = useCallback(async () => {
    const [reqs, cats, objs, cons, wts, svcs, rawApproved, rawSubmittedStr, allRaw, drvUsers, vehs] = await Promise.all([
      fetchRequests(), fetchCategories(), fetchObjects(), fetchConstructions(),
      fetchWorkTypes(), fetchServices(),
      fetchWorkPlans({ status: 'APPROVED' }),
      fetchWorkPlans({ status: 'SUBMITTED', serviceId: 'SRV-STR' }),
      fetchWorkPlans(),
      fetchDriverUsers(),
      fetchVehicles(true),
    ])
    setRequests(reqs); setCategories(cats); setObjects(objs)
    setConstructions(cons); setWorkTypes(wts); setServices(svcs)
    setAllPlans(allRaw)
    setDriverUsers(drvUsers); setVehicles(vehs)
    setOwnPlanVersion(v => v + 1)

    const allPending = [...rawApproved, ...rawSubmittedStr]
    const pendingWithItems = await fetchWorkPlansWithItems(allPending.map(p => p.id))
    setPendingPlans(pendingWithItems)

    if (session.service_id) {
      const incoming = await fetchCrossServiceRequests({ toServiceId: session.service_id })
      setIncomingRequests(incoming)
    }
  }, [session.service_id])

  const { loading, error, reload } = useLoadData(loadData)

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const deadline = new Date(now)
      deadline.setHours(16, 30, 0, 0)
      if (now > deadline) { setTimerText('Дедлайн прошёл'); return }
      const diff = deadline.getTime() - now.getTime()
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimerText(`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [])

  const handleApprove = async (reqId: string) => {
    await approveRequest(reqId, 'zamporab', session.user_id)
    reload()
  }

  const unapproved = requests.filter(r => r.approved_by_head && !r.approved_by_zamporab).length
  const pendingIncoming = incomingRequests.filter(r => r.status === 'PENDING').length
  const donePlans = allPlans.filter(p => p.status === 'DONE' || p.status === 'REJECTED')
  const overdueCount = pendingPlans.filter(p => isOverduePlan(p.plan_date)).length

  const tabDefs: { id: Tab; label: string; count?: number }[] = [
    { id: 'plans', label: 'Мои планы', count: pendingPlans.length + donePlans.length },
    { id: 'pending', label: 'Подтверждение', count: pendingPlans.length },
    { id: 'kanban', label: 'Заявки', count: unapproved || undefined },
    { id: 'staff', label: 'Смена' },
    { id: 'incoming', label: 'Смежные', count: pendingIncoming || undefined },
    { id: 'directives', label: 'Поручения' },
  ]

  if (loading) return <PanelLoader />

  return (
    <div className="min-h-screen p-4 max-w-[1800px] mx-auto">
      <Header session={session} title="Зам/Прораб" emoji="👷" mode="PLANNING" showTimer={`До 16:30: ${timerText}`} />

      {/* Shift rotation strip */}
      <div className="mb-3">
        <ShiftRotationStrip />
      </div>

      {error && <DataErrorBanner error={error} onRetry={reload} />}

      <AlertBanner session={session} />
      <GuidedTour steps={ZAMPORAB_TOUR} storageKey="tour_zamporab_v1" />
      <WhatNextBanner
        role={session.role_level}
        currentStatus={pendingPlans.length > 0 ? 'APPROVED' : null}
        planCount={pendingPlans.length}
        onAction={() => setTab('pending')}
      />

      <PlanStats allPlans={allPlans} pendingPlans={pendingPlans} services={services} />

      {/* Tab bar — amber underline style */}
      <div className="glass-strong rounded-2xl p-1.5 mb-4 flex items-center gap-1">
        <div className="flex flex-1 gap-0.5 overflow-x-auto">
          {tabDefs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap rounded-lg border-b-2 transition-all
                ${tab === t.id
                  ? 'text-amber-400 border-amber-400'
                  : 'text-white/45 border-transparent hover:text-white'}`}
            >
              {t.label}
              {t.count != null && t.count > 0 && (
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.5 rounded-full ${
                    tab === t.id ? 'bg-amber-500/15 text-amber-400' : 'bg-white/[0.06] text-white/35'
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 ml-2 shrink-0">
          <HelpPanel panelTitle="Зам/Прораб" panelEmoji="👷" sections={ZAMPORAB_HELP} showWorkflow currentStatus={pendingPlans[0]?.status} />
          <GuidedTour steps={ZAMPORAB_TOUR} storageKey="tour_zamporab_v1" trigger="Обучение" />
          <button
            onClick={() => setShowSummary(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors text-[12px] font-bold"
          >
            → План работ
          </button>
          <button onClick={reload} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 text-sm border border-white/10">↻</button>
        </div>
      </div>

      {/* Tab: Мои планы — new list design */}
      {tab === 'plans' && (
        <div className="space-y-4">
          {/* Own-service plan editor (SRV-STR zamporab) */}
          {session.service_id && (
            <ZamporabOwnPlan session={session} services={services} refreshAt={ownPlanVersion} />
          )}

          {/* Section: НА СОГЛАСОВАНИИ */}
          <div>
            <div className="flex items-center gap-2 px-1 py-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(240,165,0,0.55)] animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">На согласовании</span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-amber-500/16 border border-amber-500/35 text-amber-400">
                {pendingPlans.length}
              </span>
              <span className="ml-auto text-[11px] text-white/30 font-mono">до 16:30</span>
            </div>

            {pendingPlans.length === 0 ? (
              <EmptyState message="Нет планов, ожидающих согласования" />
            ) : (
              <div className="flex flex-col gap-2">
                {pendingPlans.map(plan => (
                  <PendingPlanRow
                    key={plan.id}
                    plan={plan}
                    services={services}
                    session={session}
                    onOpen={() => setReviewPlan(plan)}
                    onRefresh={reload}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Section: Завершённые / Отменённые */}
          <div>
            <div className="flex items-center gap-2 px-1 py-2">
              <span className="w-2 h-2 rounded-full bg-white/25" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/40">Завершённые / Отменённые</span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/15 text-white/35">
                {donePlans.length}
              </span>
              <button
                onClick={() => setShowDone(v => !v)}
                className="ml-auto text-white/35 font-mono text-[11px] flex items-center gap-1 hover:text-white/60 transition-colors"
              >
                {showDone ? 'Свернуть' : 'Развернуть'}
                <span style={{ display: 'inline-block', transform: showDone ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
              </button>
            </div>
            {showDone && donePlans.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-1">
                {donePlans.map(plan => {
                  const svc = services.find(s => s.service_id === plan.service_id)
                  const meta = SERVICE_META[plan.service_id]
                  const [yy, mm, dd] = plan.plan_date.split('-')
                  return (
                    <div key={plan.id} className="glass rounded-xl px-4 py-3 flex items-center gap-3 opacity-60">
                      <span className="text-lg">{meta?.emoji ?? '📋'}</span>
                      <span className="text-[13px] text-white/70 flex-1">{svc?.service_name ?? plan.service_id}</span>
                      <span className="font-mono text-[11px] text-white/40">{dd}.{mm}.{yy}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                          plan.status === 'DONE'
                            ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                            : 'text-red-400 border-red-500/30 bg-red-500/10'
                        }`}
                      >
                        {plan.status === 'DONE' ? 'Выполнено' : 'Отклонён'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Подтверждение — detailed approval with resource check */}
      {tab === 'pending' && (
        <div className="space-y-3">
          <ResourceBar driverUsers={driverUsers} vehicles={vehicles} />
          {pendingPlans.length === 0 ? (
            <EmptyState message="Нет планов, ожидающих подтверждения" />
          ) : (
            pendingPlans.map(plan => (
              <PendingPlanCard
                key={plan.id}
                plan={plan}
                services={services}
                driverUsers={driverUsers}
                vehicles={vehicles}
                onOpen={() => setReviewPlan(plan)}
              />
            ))
          )}
        </div>
      )}

      {reviewPlan && (
        <ZamporabReviewModal
          plan={reviewPlan}
          services={services}
          session={session}
          driverUsers={driverUsers}
          vehicles={vehicles}
          onClose={() => setReviewPlan(null)}
          onSaved={() => { setReviewPlan(null); reload() }}
        />
      )}

      {/* Tab: Заявки */}
      {tab === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          {(() => {
            const pending = requests.filter(r => r.approved_by_head && !r.approved_by_zamporab)
            if (pending.length === 0) return null
            return (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">⏳</span>
                  <h3 className="text-lg font-bold text-amber-400">Ожидают вашего согласования</h3>
                  <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">{pending.length}</span>
                </div>
                <div className="space-y-2">
                  {pending.map(r => {
                    const obj = objects.find(o => o.object_id === r.object_id)
                    const svc = services.find(s => s.service_id === r.service_id)
                    const cat = categories.find(c => c.category_id === r.category_id)
                    return (
                      <div key={r.request_id} className="glass rounded-xl p-4 border border-amber-500/20 flex items-center justify-between gap-4">
                        <div className="flex-1 cursor-pointer" onClick={() => { setSelectedReq(r); setShowModal(true) }}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-white/30">{r.request_id}</span>
                            <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">✓ Согл. нач.службы</span>
                          </div>
                          <div className="text-white font-medium">{obj?.object_name || '—'}</div>
                          <div className="text-xs text-white/40 mt-0.5">{svc?.service_name} · {cat?.category_name}</div>
                          {r.description && <div className="text-xs text-white/30 mt-1">{r.description}</div>}
                        </div>
                        <button onClick={() => handleApprove(r.request_id)} className="shrink-0 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-all">
                          ✓ Согласовать
                        </button>
                      </div>
                    )
                  })}
                </div>
                <div className="border-b border-white/10 mt-6 mb-6" />
              </div>
            )
          })()}
          {services.map(svc => {
            const svcReqs = requests.filter(r => r.service_id === svc.service_id)
            const meta = SERVICE_META[svc.service_id]
            return (
              <div key={svc.service_id} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{meta?.emoji || '📋'}</span>
                  <h3 className="text-lg font-bold text-white">{svc.service_name}</h3>
                  <span className="text-xs text-white/40 font-mono">{svcReqs.length} заявок</span>
                </div>
                {svcReqs.length > 0 ? (
                  <KanbanBoard
                    requests={svcReqs} session={session}
                    categories={categories} objects={objects} constructions={constructions}
                    workTypes={workTypes} services={services}
                    onCardClick={r => { setSelectedReq(r); setShowModal(true) }}
                    onStatusChange={reload}
                  />
                ) : (
                  <EmptyState message="Нет заявок" />
                )}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'staff' && <ShiftOverview />}
      {tab === 'incoming' && <IncomingRequests session={session} />}
      {tab === 'directives' && <UrgentOrdersPanel session={session} />}

      {showModal && (
        <RequestModal session={session} existingRequest={selectedReq} onClose={() => setShowModal(false)} onSaved={reload} />
      )}
      {showSummary && (
        <WorkPlanSummaryModal session={session} onClose={() => setShowSummary(false)} />
      )}

      {/* Bottom status bar */}
      {(overdueCount > 0 || pendingPlans.length > 0 || pendingIncoming > 0) && (
        <div className="glass rounded-xl border border-white/10 grid grid-cols-3 gap-3 px-4 py-3 mt-6">
          <div className="flex items-center gap-2.5 text-[12px]">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 border"
              style={{ background: 'rgba(248,81,73,0.15)', borderColor: 'rgba(248,81,73,0.40)' }}>
              ⚠
            </div>
            <div>
              <div className="font-bold text-[11px] uppercase tracking-widest text-red-400">Просрочка</div>
              <div className="font-mono text-[11px] text-white/40">
                {overdueCount > 0 ? `${overdueCount} план(а) просрочено` : 'Просрочек нет'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-[12px]">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 border"
              style={{ background: 'rgba(240,165,0,0.15)', borderColor: 'rgba(240,165,0,0.40)' }}>
              📋
            </div>
            <div>
              <div className="font-bold text-[11px] uppercase tracking-widest text-amber-400">Согласования</div>
              <div className="font-mono text-[11px] text-white/40">
                {pendingPlans.length} план(а) ждут до 16:30
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-[12px]">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 border"
              style={{ background: 'rgba(56,139,253,0.15)', borderColor: 'rgba(56,139,253,0.40)' }}>
              👥
            </div>
            <div>
              <div className="font-bold text-[11px] uppercase tracking-widest text-blue-300">Смежные</div>
              <div className="font-mono text-[11px] text-white/40">
                {pendingIncoming > 0 ? `${pendingIncoming} заявк(и) ждут ответа` : 'Нет новых заявок'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Expandable pending plan row (Мои планы tab) ──────────────────────────────

function PendingPlanRow({ plan, services, session, onOpen, onRefresh }: {
  plan: WorkPlanWithItems
  services: Service[]
  session: AuthSession
  onOpen: () => void
  onRefresh: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [approving, setApproving] = useState(false)

  const svc = services.find(s => s.service_id === plan.service_id)
  const meta = SERVICE_META[plan.service_id] ?? { emoji: '🔧', color: '#fff', bg: 'bg-white/10' }
  const [yy, mm, dd] = plan.plan_date.split('-')
  const dateLabel = `${dd}.${mm}.${yy}`
  const overdue = isOverduePlan(plan.plan_date)
  const isDirect = plan.service_id === 'SRV-STR' && plan.status === 'SUBMITTED'
  const shortCode = plan.service_id.replace('SRV-', '')

  const planTitle = plan.items[0]?.work_description
    ? plan.items.length > 1
      ? `${plan.items[0].work_description} · +${plan.items.length - 1} поз.`
      : plan.items[0].work_description
    : `План работ от ${dateLabel}`

  const handleApprove = async () => {
    setApproving(true)
    if (isDirect) {
      await approveWorkPlanDirect(plan.id, session.user_id)
    } else {
      await confirmWorkPlanZamporab(plan.id, session.user_id)
    }
    setApproving(false)
    onRefresh()
  }

  return (
    <div
      className={`glass rounded-xl border transition-all ${
        overdue ? 'border-red-500/30' : 'border-white/10 hover:border-white/20'
      }`}
      style={overdue ? { background: 'linear-gradient(90deg, rgba(248,81,73,0.07), rgba(255,255,255,0.03))' } : {}}
    >
      <div className="grid items-center gap-4 p-4" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
        {/* Service tag */}
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-mono text-[11px] font-bold whitespace-nowrap"
          style={{ color: meta.color, background: `${meta.color}28`, borderColor: `${meta.color}72` }}
        >
          {meta.emoji} {shortCode}
        </span>

        {/* Plan info */}
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-white leading-snug truncate">{planTitle}</div>
          <div className="flex items-center gap-2.5 flex-wrap mt-1">
            <span className="text-[12px] text-white/40">{svc?.service_name}</span>
            <span className="font-mono text-[12px] text-white/35">плановая дата · {dateLabel}</span>
            {overdue && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold border bg-red-500/18 text-red-400 border-red-500/45">
                Просрочен
              </span>
            )}
            <span
              className="px-1.5 py-0.5 rounded-full text-[10px] font-bold border"
              style={plan.status === 'SUBMITTED'
                ? { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.2)' }
                : { background: 'rgba(240,165,0,0.16)', color: '#F0A500', borderColor: 'rgba(240,165,0,0.40)' }
              }
            >
              {plan.status === 'SUBMITTED' ? 'Черновик' : 'На согл.'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleApprove}
            disabled={approving}
            className="px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all disabled:opacity-50
              bg-emerald-500/20 text-emerald-400 border-emerald-500/40
              hover:bg-emerald-500 hover:text-black hover:border-emerald-500"
          >
            ✓ Согласовать
          </button>
          <button
            onClick={onOpen}
            className="px-2.5 py-1.5 rounded-lg text-[12px] font-bold border text-red-400 border-red-500/35 hover:bg-red-500/18 transition-all"
            title="Открыть для проверки / отклонения"
          >
            ✗
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            className={`px-2.5 py-1.5 rounded-lg border transition-all text-[12px] ${
              expanded
                ? 'text-amber-400 border-amber-500/35'
                : 'text-white/40 border-white/15 hover:text-white hover:border-white/30'
            }`}
            style={{ background: expanded ? 'rgba(240,165,0,0.12)' : 'transparent', transform: expanded ? 'rotate(180deg)' : 'none' }}
          >
            ▼
          </button>
        </div>
      </div>

      {/* Expanded items */}
      {expanded && plan.items.length > 0 && (
        <div className="px-4 pb-4">
          <div className="border-t border-white/[0.07] pt-3 flex flex-col">
            {plan.items.map((item, idx) => (
              <PlanItemRow key={item.id} item={item} idx={idx} total={plan.items.length} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PlanItemRow({ item, idx, total }: { item: WorkPlanItem; idx: number; total: number }) {
  return (
    <div
      className={`grid items-center gap-3 py-2 ${idx < total - 1 ? 'border-b border-dashed border-white/[0.05]' : ''}`}
      style={{ gridTemplateColumns: '22px 1fr auto auto auto' }}
    >
      <span className="font-mono text-[10px] text-white/30">{String(idx + 1).padStart(2, '0')}</span>
      <span className="text-[13px] font-medium text-white">{item.work_description}</span>
      <span className="font-mono text-[11px] text-white/40">{item.location}</span>
      {item.required_workers > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-mono text-[11px] font-semibold"
          style={{ background: 'rgba(56,139,253,0.10)', borderColor: 'rgba(56,139,253,0.30)', color: '#6FA8FF' }}>
          👥 {item.required_workers} чел.
        </span>
      )}
      {item.time_start ? (
        <span className="font-mono text-[11px] text-white/30">{item.time_start}</span>
      ) : (
        <span />
      )}
    </div>
  )
}

// ── Resource traffic light color helper ──────────────────────────────────────

function resourceColor(available: number, required: number): string {
  if (required === 0) return 'text-white/25'
  if (available >= required) return 'text-emerald-400'
  if (available >= required - 1) return 'text-amber-400'
  return 'text-red-400'
}

// ── Compact pending plan card (Подтверждение tab) ─────────────────────────────

function PendingPlanCard({ plan, services, driverUsers, vehicles, onOpen }: {
  plan: WorkPlanWithItems
  services: Service[]
  driverUsers: UserWithAssignment[]
  vehicles: Vehicle[]
  onOpen: () => void
}) {
  const svc  = services.find(s => s.service_id === plan.service_id)
  const meta = SERVICE_META[plan.service_id] ?? { emoji: '🔧' }
  const shiftEmoji = plan.shift_type === 'DAY' ? '☀️' : '🌙'
  const [yy, mm, dd] = plan.plan_date.split('-')
  const dateLabel = `${dd}.${mm}.${yy}`

  const totalWorkers  = plan.items.reduce((s, i) => s + (i.required_workers ?? 0), 0)
  const totalVehicles = plan.items.reduce((s, i) => s + (i.required_vehicles ?? 0), 0)
  const crossCount    = plan.items.reduce((s, i) => s + (i.cross_requests?.length ?? 0), 0)

  const isDirect = plan.service_id === 'SRV-STR' && plan.status === 'SUBMITTED'

  const planDate = new Date(plan.plan_date + 'T00:00:00')

  const onDutyDrivers = useMemo(() => driverUsers.filter(u => {
    const pos = (u.position ?? '').toLowerCase()
    if (pos.includes('тракторист') || pos.includes('машинист')) return false
    const a = u.assignment
    if (!a?.schedule_code) return false
    return isWorkerOnDuty({ shift_num: a.shift_num, schedule_code: a.schedule_code, shift_reference_date: a.shift_reference_date, rotation_group: a.rotation_group, active_phase: a.active_phase ?? null, custom_work_days: a.custom_work_days ?? null, custom_rest_days: a.custom_rest_days ?? null }, planDate)
  }), [driverUsers, plan.plan_date]) // eslint-disable-line react-hooks/exhaustive-deps

  const onDutyOperators = useMemo(() => driverUsers.filter(u => {
    const pos = (u.position ?? '').toLowerCase()
    if (!pos.includes('тракторист') && !pos.includes('машинист')) return false
    const a = u.assignment
    if (!a?.schedule_code) return false
    return isWorkerOnDuty({ shift_num: a.shift_num, schedule_code: a.schedule_code, shift_reference_date: a.shift_reference_date, rotation_group: a.rotation_group, active_phase: a.active_phase ?? null, custom_work_days: a.custom_work_days ?? null, custom_rest_days: a.custom_rest_days ?? null }, planDate)
  }), [driverUsers, plan.plan_date]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeVehicles = vehicles.filter(v => v.status === 'ACTIVE')

  const reqWorkers  = plan.items.reduce((s, i) => s + (i.required_workers ?? 0), 0)
  const reqVehicles = plan.items.reduce((s, i) => s + (i.required_vehicles ?? 0), 0)
  const reqForemen  = plan.items.reduce((s, i) => s + (i.required_foremen ?? 0), 0)
  const reqOps      = reqForemen

  return (
    <div
      onClick={onOpen}
      className="glass rounded-xl border border-blue-500/20 p-4 flex items-center gap-4 cursor-pointer hover:border-blue-500/40 hover:bg-white/[0.03] transition-all group"
    >
      <span className="text-2xl shrink-0">{meta.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-white">{svc?.service_name ?? plan.service_id}</span>
          <span className="text-xs text-white/40">{shiftEmoji} {dateLabel}</span>
          {!isDirect && <span className="text-[10px] text-green-400/70">✓ Гл. инженер</span>}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-[11px] text-white/40">{plan.items.length} поз.</span>
          {totalWorkers > 0 && (
            <span className="text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/20 px-1.5 py-0.5 rounded-full">
              👷 {totalWorkers}
            </span>
          )}
          {totalVehicles > 0 && (
            <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
              🚛 {totalVehicles}
            </span>
          )}
          {crossCount > 0 && (
            <span className="text-[10px] bg-violet-500/15 text-violet-300 border border-violet-500/20 px-1.5 py-0.5 rounded-full">
              🔗 {crossCount} смежн.
            </span>
          )}
        </div>
        {(reqWorkers > 0 || reqVehicles > 0 || reqOps > 0) && (
          <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-white/5">
            {reqWorkers > 0 && (
              <span className={`flex items-center gap-1 text-[11px] font-medium ${resourceColor(onDutyDrivers.length, reqWorkers)}`}>
                🚗 {onDutyDrivers.length}<span className="text-white/25">/{reqWorkers}</span>
              </span>
            )}
            {reqOps > 0 && (
              <span className={`flex items-center gap-1 text-[11px] font-medium ${resourceColor(onDutyOperators.length, reqOps)}`}>
                🚜 {onDutyOperators.length}<span className="text-white/25">/{reqOps}</span>
              </span>
            )}
            {reqVehicles > 0 && (
              <span className={`flex items-center gap-1 text-[11px] font-medium ${resourceColor(activeVehicles.length, reqVehicles)}`}>
                🔧 {activeVehicles.length}<span className="text-white/25">/{reqVehicles}</span>
              </span>
            )}
          </div>
        )}
      </div>
      <button className="shrink-0 px-4 py-2 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-300 text-sm font-medium group-hover:bg-blue-600/50 transition-all">
        Открыть →
      </button>
    </div>
  )
}
