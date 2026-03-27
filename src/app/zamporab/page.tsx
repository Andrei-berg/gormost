'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import KanbanBoard from '@/components/KanbanBoard'
import RequestModal from '@/components/RequestModal'
import {
  fetchRequests, fetchCategories, fetchObjects, fetchConstructions, fetchWorkTypes,
  fetchServices, fetchUsers, approveRequest,
  fetchWorkPlans, fetchWorkPlanWithItems, fetchCrossServiceRequests,
  fetchDriverUsers, fetchVehicles,
} from '@/lib/api'
import type {
  Request, Category, GObject, Construction, WorkType, Service,
  User, AuthSession, WorkPlanWithItems, WorkPlan, CrossServiceRequest,
  UserWithAssignment, Vehicle,
} from '@/types'
import { SERVICE_META } from '@/types'
import { isWorkerOnDuty } from '@/lib/shifts'
import PlanStats from '@/components/zamporab/PlanStats'
import ZamporabPlanBoard from '@/components/zamporab/ZamporabPlanBoard'
import ZamporabReviewModal from '@/components/zamporab/ZamporabReviewModal'
import ZamporabOwnPlan from '@/components/zamporab/ZamporabOwnPlan'
import ShiftOverview from '@/components/zamporab/ShiftOverview'
import ResourceBar from '@/components/zamporab/ResourceBar'
import EmptyState from '@/components/EmptyState'
import AlertBanner from '@/components/AlertBanner'
// HEAD components
import IncomingRequests from '@/components/head/IncomingRequests'
import WorkPlanSummaryModal from '@/components/zamporab/WorkPlanSummaryModal'

export default function ZamPorabPage() {
  return (
    <AuthGuard roles={['ZAMPORAB', 'ADMIN', 'BOSS']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}

type Tab = 'plans' | 'pending' | 'kanban' | 'staff' | 'incoming'

function Content({ session }: { session: AuthSession }) {
  const [requests, setRequests] = useState<Request[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [objects, setObjects] = useState<GObject[]>([])
  const [constructions, setConstructions] = useState<Construction[]>([])
  const [workTypes, setWorkTypes] = useState<WorkType[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  // all plans (board view — no items needed)
  const [allPlans, setAllPlans] = useState<WorkPlan[]>([])
  const [incomingRequests, setIncomingRequests] = useState<CrossServiceRequest[]>([])
  const [driverUsers, setDriverUsers] = useState<UserWithAssignment[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  // plans awaiting zamporab confirmation (with items — for review modal)
  const [pendingPlans, setPendingPlans] = useState<WorkPlanWithItems[]>([])
  const [reviewPlan, setReviewPlan] = useState<WorkPlanWithItems | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [selectedReq, setSelectedReq] = useState<Request | null>(null)
  const [tab, setTab] = useState<Tab>('plans')
  const [timerText, setTimerText] = useState('')
  const [ownPlanVersion, setOwnPlanVersion] = useState(0)

  const loadData = useCallback(async () => {
    const [reqs, cats, objs, cons, wts, svcs, usrs, rawApproved, rawSubmittedStr, allRaw, drvUsers, vehs] = await Promise.all([
      fetchRequests(), fetchCategories(), fetchObjects(), fetchConstructions(),
      fetchWorkTypes(), fetchServices(), fetchUsers(),
      fetchWorkPlans({ status: 'APPROVED' }),
      fetchWorkPlans({ status: 'SUBMITTED', serviceId: 'SRV-STR' }),
      fetchWorkPlans(), // all plans for board (no items)
      fetchDriverUsers(),
      fetchVehicles(true),
    ])
    setRequests(reqs); setCategories(cats); setObjects(objs)
    setConstructions(cons); setWorkTypes(wts); setServices(svcs)
    setAllUsers(usrs); setAllPlans(allRaw)
    setDriverUsers(drvUsers); setVehicles(vehs)
    setOwnPlanVersion(v => v + 1)

    // Pending plans awaiting zamporab confirmation (load with items for review modal)
    const allPending = [...rawApproved, ...rawSubmittedStr]
    const pendingWithItems = await Promise.all(allPending.map(p => fetchWorkPlanWithItems(p.id)))
    setPendingPlans(pendingWithItems.filter(Boolean) as WorkPlanWithItems[])

    // Incoming cross-service requests
    if (session.service_id) {
      const incoming = await fetchCrossServiceRequests({ toServiceId: session.service_id })
      setIncomingRequests(incoming)
    }
  }, [session.service_id])

  useEffect(() => { loadData() }, [loadData])

  // Timer to 16:30
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
    loadData()
  }

  const unapproved = requests.filter(r => r.approved_by_head && !r.approved_by_zamporab).length
  const pendingIncoming = incomingRequests.filter(r => r.status === 'PENDING').length

  const tabCls = (t: Tab, color = 'bg-blue-600') =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${tab === t ? `${color} text-white` : 'bg-white/5 text-white/50 hover:bg-white/10'}`

  return (
    <div className="min-h-screen p-4 max-w-[1800px] mx-auto">
      <Header session={session} title="Зам/Прораб" emoji="👷" mode="PLANNING" showTimer={`До 16:30: ${timerText}`} />

      <AlertBanner session={session} />
      <PlanStats requests={requests} services={services} pendingApproval={unapproved} />

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button onClick={() => setTab('plans')} className={tabCls('plans', 'bg-blue-600')}>
          📋 Мои планы
        </button>
        <button onClick={() => setTab('pending')} className={tabCls('pending', 'bg-emerald-600')}>
          ⏳ Подтверждение
          {pendingPlans.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
              {pendingPlans.length}
            </span>
          )}
        </button>
        <button onClick={() => setTab('kanban')} className={tabCls('kanban', 'bg-blue-600')}>
          📊 Заявки
          {unapproved > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
              {unapproved}
            </span>
          )}
        </button>
        <button onClick={() => setTab('staff')} className={tabCls('staff', 'bg-blue-600')}>
          👷 Смена
        </button>
        <button onClick={() => setTab('incoming')} className={tabCls('incoming', 'bg-violet-600')}>
          🔗 Смежные
          {pendingIncoming > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
              {pendingIncoming}
            </span>
          )}
        </button>
        <button
          onClick={() => setShowSummary(true)}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30 transition-colors text-sm font-medium"
        >
          🖨 План работ
        </button>
        <button onClick={loadData} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 text-sm">↻</button>
      </div>

      {/* Tab: All plans board */}
      {tab === 'plans' && (
        <div className="space-y-4">
          {session.service_id && (
            <ZamporabOwnPlan session={session} services={services} refreshAt={ownPlanVersion} />
          )}
          <ZamporabPlanBoard
            allPlans={allPlans}
            pendingPlans={pendingPlans}
            services={services}
            session={session}
            onOpenPending={setReviewPlan}
            onRefresh={loadData}
          />
        </div>
      )}

      {/* Tab: Pending confirmation */}
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
          onSaved={() => { setReviewPlan(null); loadData() }}
        />
      )}

      {/* Tab: Kanban */}
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
                    onStatusChange={loadData}
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

      {showModal && (
        <RequestModal session={session} existingRequest={selectedReq} onClose={() => setShowModal(false)} onSaved={loadData} />
      )}
      {showSummary && (
        <WorkPlanSummaryModal session={session} onClose={() => setShowSummary(false)} />
      )}
    </div>
  )
}

// ── Resource traffic light color helper ──────────────────────────────────

function resourceColor(available: number, required: number): string {
  if (required === 0) return 'text-white/25'
  if (available >= required) return 'text-emerald-400'
  if (available >= required - 1) return 'text-amber-400'
  return 'text-red-400'
}

// ── Compact pending plan card ──────────────────────────────────────────────

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
