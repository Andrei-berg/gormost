'use client'
import { useState, useEffect, useCallback } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import KanbanBoard from '@/components/KanbanBoard'
import RequestModal from '@/components/RequestModal'
import {
  fetchRequests, fetchCategories, fetchObjects, fetchConstructions, fetchWorkTypes,
  fetchServices, fetchStaffRequests, fetchUsers, approveRequest,
  fetchWorkPlans, fetchWorkPlanWithItems, approveWorkPlanDirect,
} from '@/lib/api'
import type { Request, Category, GObject, Construction, WorkType, Service, StaffRequest, User, AuthSession, WorkPlanWithItems } from '@/types'
import { SERVICE_META } from '@/types'
import PlanStats from '@/components/zamporab/PlanStats'
import ZamporabPlanCard from '@/components/zamporab/ZamporabPlanCard'
import ZamporabOwnPlan from '@/components/zamporab/ZamporabOwnPlan'
import EmptyState from '@/components/EmptyState'

export default function ZamPorabPage() {
  return (
    <AuthGuard roles={['ZAMPORAB', 'ADMIN', 'BOSS']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}

type Tab = 'plans' | 'kanban' | 'staff'

function Content({ session }: { session: AuthSession }) {
  const [requests, setRequests] = useState<Request[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [objects, setObjects] = useState<GObject[]>([])
  const [constructions, setConstructions] = useState<Construction[]>([])
  const [workTypes, setWorkTypes] = useState<WorkType[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [staffReqs, setStaffReqs] = useState<StaffRequest[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [pendingPlans, setPendingPlans] = useState<WorkPlanWithItems[]>([])
  const [showModal, setShowModal] = useState(false)
  const [selectedReq, setSelectedReq] = useState<Request | null>(null)
  const [tab, setTab] = useState<Tab>('plans')
  const [timerText, setTimerText] = useState('')

  const loadData = useCallback(async () => {
    const [reqs, cats, objs, cons, wts, svcs, srs, usrs, rawPlans, ownPlans] = await Promise.all([
      fetchRequests(), fetchCategories(), fetchObjects(), fetchConstructions(),
      fetchWorkTypes(), fetchServices(), fetchStaffRequests(), fetchUsers(),
      fetchWorkPlans({ status: 'APPROVED' }),
      fetchWorkPlans({ status: 'SUBMITTED', serviceId: 'SRV-STR' }), // SRV-STR bypasses chief engineer
    ])
    setRequests(reqs); setCategories(cats); setObjects(objs)
    setConstructions(cons); setWorkTypes(wts); setServices(svcs)
    setStaffReqs(srs); setAllUsers(usrs)
    const allRaw = [...rawPlans, ...ownPlans]
    const plansWithItems = await Promise.all(allRaw.map(p => fetchWorkPlanWithItems(p.id)))
    setPendingPlans(plansWithItems.filter(Boolean) as WorkPlanWithItems[])
  }, [])

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

  return (
    <div className="min-h-screen p-4 max-w-[1800px] mx-auto">
      <Header session={session} title="Зам/Прораб" emoji="👷" mode="PLANNING" showTimer={`До 16:30: ${timerText}`} />

      <PlanStats
        requests={requests}
        services={services}
        pendingApproval={unapproved}
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setTab('plans')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${tab === 'plans' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
        >
          Планы работ
          {pendingPlans.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
              {pendingPlans.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('kanban')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${tab === 'kanban' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
        >
          Заявки по службам
          {unapproved > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
              {unapproved}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('staff')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${tab === 'staff' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
        >
          Запросы людей
          {pendingStaff > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
              {pendingStaff}
            </span>
          )}
        </button>
        <div className="ml-auto">
          <button onClick={loadData} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 text-sm">↻</button>
        </div>
      </div>

      {/* Tab: Plans */}
      {tab === 'plans' && (
        <div className="space-y-8">
          {/* Own plan creation section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📋</span>
              <h3 className="text-base font-bold text-emerald-400">Мой план работ</h3>
            </div>
            <ZamporabOwnPlan session={session} services={services} />
          </div>

          {/* Plans from other services awaiting confirmation */}
          {pendingPlans.length > 0 && (
            <div>
              <div className="border-t border-white/10 pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">⏳</span>
                  <h3 className="text-base font-bold text-blue-400">
                    Ожидают вашего подтверждения ({pendingPlans.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {pendingPlans.map(plan => (
                    <ZamporabPlanCard
                      key={plan.id}
                      plan={plan}
                      services={services}
                      session={session}
                      onRefresh={loadData}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Kanban */}
      {tab === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          {/* Requests pending zamporab approval */}
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
                        <button
                          onClick={() => handleApprove(r.request_id)}
                          className="shrink-0 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-all"
                        >
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

          {/* All services kanban */}
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

      {/* Tab: Staff requests */}
      {tab === 'staff' && (
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
