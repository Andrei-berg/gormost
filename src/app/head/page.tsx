'use client'
import { useState, useEffect, useCallback } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import KanbanBoard from '@/components/KanbanBoard'
import RequestModal from '@/components/RequestModal'
import {
  fetchRequests, fetchCategories, fetchObjects, fetchConstructions, fetchWorkTypes,
  fetchServices, fetchUsersByService, fetchAssignments, assignUsers, approveRequest
} from '@/lib/api'
import type { Request, Category, GObject, Construction, WorkType, Service, User, AuthSession, RequestAssignment } from '@/types'
import ServiceStats from '@/components/head/ServiceStats'

export default function HeadPage() {
  return (
    <AuthGuard roles={['HEAD', 'ADMIN', 'BOSS']}>
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
  const [myUsers, setMyUsers] = useState<User[]>([])
  const [showModal, setShowModal] = useState(false)
  const [selectedReq, setSelectedReq] = useState<Request | null>(null)
  const [showAssign, setShowAssign] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<Record<string, string[]>>({})

  const serviceId = session.service_id

  const loadData = useCallback(async () => {
    const filter = serviceId ? { serviceId } : undefined
    const [reqs, cats, objs, cons, wts, svcs] = await Promise.all([
      fetchRequests(filter), fetchCategories(), fetchObjects(),
      fetchConstructions(), fetchWorkTypes(), fetchServices()
    ])
    setRequests(reqs); setCategories(cats); setObjects(objs)
    setConstructions(cons); setWorkTypes(wts); setServices(svcs)

    if (serviceId) {
      const users = await fetchUsersByService(serviceId)
      setMyUsers(users)
    }

    // Load assignments for all requests
    const asMap: Record<string, string[]> = {}
    for (const r of reqs) {
      const a = await fetchAssignments(r.request_id)
      asMap[r.request_id] = a.map(x => x.user_id)
    }
    setAssignments(asMap)
  }, [serviceId])

  useEffect(() => { loadData() }, [loadData])

  const handleApprove = async (reqId: string) => {
    await approveRequest(reqId, 'head', session.user_id)
    loadData()
  }

  const handleAssign = async (reqId: string, userIds: string[]) => {
    await assignUsers(reqId, userIds, session.user_id)
    setShowAssign(null)
    loadData()
  }

  // Stats
  const unapproved = requests.filter(r => !r.approved_by_head && r.status !== 'DONE').length

  return (
    <div className="min-h-screen p-4 max-w-[1800px] mx-auto">
      <Header session={session} title="Начальник службы" emoji="🏢" mode="PLANNING" />

      <ServiceStats requests={requests} users={myUsers} assignments={assignments} />

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/50">Моя служба: <span className="text-white font-medium">{services.find(s => s.service_id === serviceId)?.service_name || 'Все'}</span></span>
          {unapproved > 0 && (
            <span className="text-xs text-amber-400">⚠ {unapproved} не согласовано</span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 text-sm">↻</button>
          <button onClick={() => { setSelectedReq(null); setShowModal(true) }}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">
            + Создать заявку
          </button>
        </div>
      </div>

      {/* Request list with assignment */}
      <div className="space-y-3">
        {requests.map(r => {
          const cat = categories.find(c => c.category_id === r.category_id)
          const obj = objects.find(o => o.object_id === r.object_id)
          const wt = workTypes.find(w => w.work_type_id === r.work_type_id)
          const assigned = (assignments[r.request_id] || []).map(uid => myUsers.find(u => u.user_id === uid)).filter(Boolean) as User[]

          return (
            <div key={r.request_id} className="glass rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 cursor-pointer" onClick={() => { setSelectedReq(r); setShowModal(true) }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-white/30">{r.request_id}</span>
                    {r.approved_by_head ? (
                      <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">✓ Согласовано</span>
                    ) : (
                      <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">Не согласовано</span>
                    )}
                  </div>
                  {obj && <div className="text-white/90 font-medium">{obj.object_name}</div>}
                  {wt && <div className="text-sm text-cyan-400/70">{wt.work_name}</div>}
                  {r.description && <div className="text-xs text-white/30 mt-1">{r.description}</div>}

                  {/* Assigned users */}
                  {assigned.length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-xs text-white/30">👥</span>
                      {assigned.map(u => (
                        <span key={u.user_id} className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full">
                          {u.full_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={() => setShowAssign(showAssign === r.request_id ? null : r.request_id)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-sm">
                    👥 Назначить
                  </button>
                  {!r.approved_by_head && (
                    <button onClick={() => handleApprove(r.request_id)}
                      className="px-3 py-1.5 rounded-lg bg-green-600/80 hover:bg-green-500 text-white text-sm">
                      ✓ Согласовать
                    </button>
                  )}
                </div>
              </div>

              {/* Assign panel */}
              {showAssign === r.request_id && (
                <AssignPanel
                  users={myUsers}
                  selected={assignments[r.request_id] || []}
                  onSave={(ids) => handleAssign(r.request_id, ids)}
                  onCancel={() => setShowAssign(null)}
                />
              )}
            </div>
          )
        })}
        {requests.length === 0 && (
          <div className="text-center text-white/20 py-20">Нет заявок по вашей службе</div>
        )}
      </div>

      {showModal && (
        <RequestModal session={session} existingRequest={selectedReq} defaultServiceId={serviceId} onClose={() => setShowModal(false)} onSaved={loadData} />
      )}
    </div>
  )
}

function AssignPanel({ users, selected, onSave, onCancel }: {
  users: User[], selected: string[], onSave: (ids: string[]) => void, onCancel: () => void
}) {
  const [sel, setSel] = useState<string[]>(selected)

  const toggle = (uid: string) => {
    setSel(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid])
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/10">
      <div className="grid grid-cols-3 gap-2 mb-3">
        {users.map(u => (
          <label key={u.user_id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm ${
            sel.includes(u.user_id) ? 'bg-blue-500/20 border border-blue-500/30 text-white' : 'bg-white/5 border border-white/5 text-white/60'
          }`}>
            <input type="checkbox" checked={sel.includes(u.user_id)} onChange={() => toggle(u.user_id)} className="sr-only" />
            <div className={`w-3 h-3 rounded flex items-center justify-center text-[8px] ${
              sel.includes(u.user_id) ? 'bg-blue-500 text-white' : 'bg-white/10'
            }`}>{sel.includes(u.user_id) && '✓'}</div>
            {u.full_name}
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSave(sel)} className="px-3 py-1 rounded-lg bg-blue-600 text-white text-sm">Сохранить</button>
        <button onClick={onCancel} className="px-3 py-1 rounded-lg bg-white/5 text-white/50 text-sm">Отмена</button>
      </div>
    </div>
  )
}
