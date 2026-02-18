'use client'
import { useState, useEffect, useCallback } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import KanbanBoard from '@/components/KanbanBoard'
import RequestModal from '@/components/RequestModal'
import {
  fetchRequests, fetchCategories, fetchObjects, fetchConstructions, fetchWorkTypes,
  fetchServices, fetchStaffRequests, fetchUsers, approveRequest, createStaffRequest
} from '@/lib/api'
import type { Request, Category, GObject, Construction, WorkType, Service, StaffRequest, User, AuthSession } from '@/types'
import { SERVICE_META } from '@/types'

export default function ZamPorabPage() {
  return (
    <AuthGuard roles={['ZAMPORAB', 'ADMIN', 'BOSS']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}

function Content({ session }: { session: AuthSession }) {
  const [requests, setRequests] = useState<Request[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [objects, setObjects] = useState<GObject[]>([])
  const [constructions, setConstructions] = useState<Construction[]>([])
  const [workTypes, setWorkTypes] = useState<WorkType[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [staffReqs, setStaffReqs] = useState<StaffRequest[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [showModal, setShowModal] = useState(false)
  const [selectedReq, setSelectedReq] = useState<Request | null>(null)
  const [tab, setTab] = useState<'kanban' | 'staff'>('kanban')
  const [timerText, setTimerText] = useState('')

  const loadData = useCallback(async () => {
    const [reqs, cats, objs, cons, wts, svcs, srs, usrs] = await Promise.all([
      fetchRequests(), fetchCategories(), fetchObjects(), fetchConstructions(),
      fetchWorkTypes(), fetchServices(), fetchStaffRequests(), fetchUsers()
    ])
    setRequests(reqs); setCategories(cats); setObjects(objs)
    setConstructions(cons); setWorkTypes(wts); setServices(svcs)
    setStaffReqs(srs); setAllUsers(usrs)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Timer to 16:30
  useEffect(() => {
    const update = () => {
      const now = new Date()
      const deadline = new Date(now)
      deadline.setHours(16, 30, 0, 0)
      if (now > deadline) {
        setTimerText('Дедлайн прошёл')
        return
      }
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

  // Count unapproved
  const unapproved = requests.filter(r => r.approved_by_head && !r.approved_by_zamporab).length

  return (
    <div className="min-h-screen p-4 max-w-[1800px] mx-auto">
      <Header session={session} title="Зам/Прораб" emoji="👷" mode="PLANNING" showTimer={`До 16:30: ${timerText}`} />

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setTab('kanban')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'kanban' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50'}`}>
          Заявки по службам
        </button>
        <button onClick={() => setTab('staff')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${tab === 'staff' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50'}`}>
          Запросы людей
          {staffReqs.filter(s => s.status === 'PENDING').length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
              {staffReqs.filter(s => s.status === 'PENDING').length}
            </span>
          )}
        </button>
        {unapproved > 0 && (
          <span className="text-xs text-amber-400 ml-2">⚠ {unapproved} заявок ожидают согласования</span>
        )}
        <div className="ml-auto flex gap-2">
          <button onClick={loadData} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 text-sm">↻</button>
          <button onClick={() => { setSelectedReq(null); setShowModal(true) }}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">
            + Новая заявка
          </button>
        </div>
      </div>

      {tab === 'kanban' ? (
        <div className="overflow-x-auto pb-4">
          {/* Group by service */}
          {services.map(svc => {
            const svcReqs = requests.filter(r => r.service_id === svc.service_id)
            if (svcReqs.length === 0) return null
            const meta = SERVICE_META[svc.service_id]
            return (
              <div key={svc.service_id} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{meta?.emoji || '📋'}</span>
                  <h3 className="text-lg font-bold text-white">{svc.service_name}</h3>
                  <span className="text-xs text-white/40 font-mono">{svcReqs.length} заявок</span>
                </div>
                <KanbanBoard
                  requests={svcReqs} session={session}
                  categories={categories} objects={objects} constructions={constructions}
                  workTypes={workTypes} services={services}
                  onCardClick={r => { setSelectedReq(r); setShowModal(true) }}
                  onStatusChange={loadData}
                />
              </div>
            )
          })}
          {requests.length === 0 && (
            <div className="text-center text-white/20 py-20">Нет заявок для планирования</div>
          )}
        </div>
      ) : (
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
      {staffReqs.length === 0 && (
        <div className="text-center text-white/20 py-20">Нет запросов на людей</div>
      )}
    </div>
  )
}
