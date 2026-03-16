'use client'
import { useState, useEffect, useCallback } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import KanbanBoard from '@/components/KanbanBoard'
import RequestModal from '@/components/RequestModal'
import {
  fetchRequests, fetchCategories, fetchObjects, fetchConstructions, fetchWorkTypes,
  fetchServices, fetchStaffRequests, fetchUsers, approveRequest,
  fetchWorkPlans, fetchWorkPlanWithItems, fetchCrossServiceRequests,
} from '@/lib/api'
import type {
  Request, Category, GObject, Construction, WorkType, Service,
  StaffRequest, User, AuthSession, WorkPlanWithItems, WorkPlan, CrossServiceRequest,
} from '@/types'
import { SERVICE_META } from '@/types'
import PlanStats from '@/components/zamporab/PlanStats'
import ZamporabReviewModal from '@/components/zamporab/ZamporabReviewModal'
import EmptyState from '@/components/EmptyState'
// HEAD components
import ServiceStats from '@/components/head/ServiceStats'
import PlanList from '@/components/head/PlanList'
import WorkPlanModal from '@/components/head/WorkPlanModal'
import StaffBoard from '@/components/head/StaffBoard'
import IncomingRequests from '@/components/head/IncomingRequests'

export default function ZamPorabPage() {
  return (
    <AuthGuard roles={['ZAMPORAB', 'ADMIN', 'BOSS']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}

type Tab = 'plans' | 'pending' | 'kanban' | 'staff' | 'incoming' | 'staffreqs'

function Content({ session }: { session: AuthSession }) {
  const [requests, setRequests] = useState<Request[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [objects, setObjects] = useState<GObject[]>([])
  const [constructions, setConstructions] = useState<Construction[]>([])
  const [workTypes, setWorkTypes] = useState<WorkType[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [staffReqs, setStaffReqs] = useState<StaffRequest[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  // own plans (HEAD-style)
  const [ownPlans, setOwnPlans] = useState<WorkPlanWithItems[]>([])
  const [rawOwnPlans, setRawOwnPlans] = useState<WorkPlan[]>([])
  const [incomingRequests, setIncomingRequests] = useState<CrossServiceRequest[]>([])
  // plans awaiting zamporab confirmation
  const [pendingPlans, setPendingPlans] = useState<WorkPlanWithItems[]>([])
  const [reviewPlan, setReviewPlan] = useState<WorkPlanWithItems | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedReq, setSelectedReq] = useState<Request | null>(null)
  const [tab, setTab] = useState<Tab>('plans')
  const [timerText, setTimerText] = useState('')

  const loadData = useCallback(async () => {
    const [reqs, cats, objs, cons, wts, svcs, srs, usrs, rawApproved, rawSubmittedStr] = await Promise.all([
      fetchRequests(), fetchCategories(), fetchObjects(), fetchConstructions(),
      fetchWorkTypes(), fetchServices(), fetchStaffRequests(), fetchUsers(),
      fetchWorkPlans({ status: 'APPROVED' }),
      fetchWorkPlans({ status: 'SUBMITTED', serviceId: 'SRV-STR' }),
    ])
    setRequests(reqs); setCategories(cats); setObjects(objs)
    setConstructions(cons); setWorkTypes(wts); setServices(svcs)
    setStaffReqs(srs); setAllUsers(usrs)

    // Pending plans awaiting zamporab confirmation
    const allPending = [...rawApproved, ...rawSubmittedStr]
    const pendingWithItems = await Promise.all(allPending.map(p => fetchWorkPlanWithItems(p.id)))
    setPendingPlans(pendingWithItems.filter(Boolean) as WorkPlanWithItems[])

    // Own service plans (HEAD-style)
    if (session.service_id) {
      const raw = await fetchWorkPlans({ serviceId: session.service_id })
      setRawOwnPlans(raw)
      const withItems = await Promise.all(raw.map(p => fetchWorkPlanWithItems(p.id)))
      setOwnPlans(withItems.filter(Boolean) as WorkPlanWithItems[])
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
  const pendingStaff = staffReqs.filter(s => s.status === 'PENDING').length
  const pendingIncoming = incomingRequests.filter(r => r.status === 'PENDING').length

  const tabCls = (t: Tab, color = 'bg-blue-600') =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${tab === t ? `${color} text-white` : 'bg-white/5 text-white/50 hover:bg-white/10'}`

  return (
    <div className="min-h-screen p-4 max-w-[1800px] mx-auto">
      <Header session={session} title="Зам/Прораб" emoji="👷" mode="PLANNING" showTimer={`До 16:30: ${timerText}`} />

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
        <button onClick={() => setTab('staffreqs')} className={tabCls('staffreqs', 'bg-blue-600')}>
          👤 Люди
          {pendingStaff > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
              {pendingStaff}
            </span>
          )}
        </button>
        <button onClick={loadData} className="ml-auto px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 text-sm">↻</button>
      </div>

      {/* Tab: Own plans (HEAD-style) */}
      {tab === 'plans' && (
        <>
          <ServiceStats plans={ownPlans} />
          <PlanList
            plans={ownPlans}
            session={session}
            onRefresh={loadData}
            onCreatePlan={() => setShowCreate(true)}
          />
          {showCreate && (
            <WorkPlanModal
              session={session}
              existingPlans={rawOwnPlans}
              onClose={() => setShowCreate(false)}
              onSaved={loadData}
            />
          )}
        </>
      )}

      {/* Tab: Pending confirmation */}
      {tab === 'pending' && (
        <div className="space-y-3">
          {pendingPlans.length === 0 ? (
            <EmptyState message="Нет планов, ожидающих подтверждения" />
          ) : (
            pendingPlans.map(plan => (
              <PendingPlanCard
                key={plan.id}
                plan={plan}
                services={services}
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

      {tab === 'staff' && <StaffBoard serviceId={session.service_id ?? ''} />}

      {tab === 'incoming' && <IncomingRequests session={session} />}

      {tab === 'staffreqs' && (
        <StaffRequestsView staffReqs={staffReqs} services={services} users={allUsers} session={session} onRefresh={loadData} />
      )}

      {showModal && (
        <RequestModal session={session} existingRequest={selectedReq} onClose={() => setShowModal(false)} onSaved={loadData} />
      )}
    </div>
  )
}

function StaffRequestsView({ staffReqs, services, users, session, onRefresh }: {
  staffReqs: StaffRequest[], services: Service[], users: User[], session: AuthSession, onRefresh: () => void
}) {
  const { updateStaffRequestStatus } = require('@/lib/api')
  const pending = staffReqs.filter(s => s.status === 'PENDING')
  const resolved = staffReqs.filter(s => s.status !== 'PENDING')

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    await updateStaffRequestStatus(id, status, session.user_id)
    onRefresh()
  }

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-amber-400 mb-3">Ожидают решения ({pending.length})</h3>
          <div className="space-y-2">
            {pending.map(sr => {
              const from = services.find(s => s.service_id === sr.from_service_id)
              const to = services.find(s => s.service_id === sr.to_service_id)
              return (
                <div key={sr.id} className="glass rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-white">
                      <span className="font-medium">{from?.service_name || sr.from_service_id}</span>
                      <span className="text-white/40"> → </span>
                      <span className="font-medium">{to?.service_name || sr.to_service_id}</span>
                    </div>
                    {sr.reason && <div className="text-xs text-white/40 mt-1">{sr.reason}</div>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAction(sr.id, 'APPROVED')} className="px-3 py-1 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm">✓ Одобрить</button>
                    <button onClick={() => handleAction(sr.id, 'REJECTED')} className="px-3 py-1 rounded-lg bg-red-600/50 hover:bg-red-500 text-white text-sm">✗ Отклонить</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {resolved.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-white/40 mb-3">Обработанные ({resolved.length})</h3>
          <div className="space-y-2">
            {resolved.map(sr => {
              const from = services.find(s => s.service_id === sr.from_service_id)
              const to = services.find(s => s.service_id === sr.to_service_id)
              return (
                <div key={sr.id} className="glass rounded-xl p-4 opacity-60">
                  <div className="text-sm text-white">
                    {from?.service_name} → {to?.service_name}
                    <span className={`ml-2 text-xs ${sr.status === 'APPROVED' ? 'text-green-400' : 'text-red-400'}`}>
                      {sr.status === 'APPROVED' ? '✓ Одобрено' : '✗ Отклонено'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {staffReqs.length === 0 && <EmptyState message="Нет запросов на людей" />}
    </div>
  )
}

// ── Compact pending plan card ──────────────────────────────────────────────

function PendingPlanCard({ plan, services, onOpen }: {
  plan: WorkPlanWithItems
  services: Service[]
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
      </div>
      <button className="shrink-0 px-4 py-2 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-300 text-sm font-medium group-hover:bg-blue-600/50 transition-all">
        Открыть →
      </button>
    </div>
  )
}
