'use client'
import { useState, useEffect, useCallback } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import { fetchRequests, fetchCategories, fetchObjects, fetchConstructions, fetchWorkTypes, fetchServices, updateRequestStatus, fetchAssignments } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import type { Request, Category, GObject, Construction, WorkType, Service, AuthSession, RequestStatus } from '@/types'
import { STATUS_CONFIG, PRIORITY_CONFIG, URGENCY_CONFIG, SERVICE_META } from '@/types'

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
  const [filter, setFilter] = useState<'all' | 'mine'>('mine')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [reqs, cats, objs, cons, wts, svcs] = await Promise.all([
      fetchRequests(), fetchCategories(), fetchObjects(), fetchConstructions(), fetchWorkTypes(), fetchServices()
    ])
    setAllRequests(reqs); setCategories(cats); setObjects(objs)
    setConstructions(cons); setWorkTypes(wts); setServices(svcs)

    // Find my assignments
    const { data: assignments } = await supabase.from('request_assignments').select('request_id').eq('user_id', session.user_id)
    setMyRequestIds(new Set((assignments || []).map((a: { request_id: string }) => a.request_id)))
  }, [session.user_id])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    const t = setInterval(loadData, 30000)
    return () => clearInterval(t)
  }, [loadData])

  const requests = filter === 'mine'
    ? allRequests.filter(r => myRequestIds.has(r.request_id))
    : allRequests

  const handleAction = async (reqId: string, status: RequestStatus) => {
    setActionLoading(reqId)
    await updateRequestStatus(reqId, status, session.user_id)
    await loadData()
    setActionLoading(null)
  }

  // Stats
  const myReqs = allRequests.filter(r => myRequestIds.has(r.request_id))
  const myActive = myReqs.filter(r => r.status === 'IN_PROGRESS').length
  const myDone = myReqs.filter(r => r.status === 'DONE').length
  const myTotal = myReqs.length

  return (
    <div className="min-h-screen p-4 max-w-5xl mx-auto">
      <Header session={session} title="Мастер/Бригадир" emoji="👷‍♂️" mode="LIVE" />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white font-mono">{myTotal}</div>
          <div className="text-xs text-white/40">Мои задачи</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-violet-400 font-mono">{myActive}</div>
          <div className="text-xs text-white/40">В работе</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400 font-mono">{myDone}</div>
          <div className="text-xs text-white/40">Выполнено</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setFilter('mine')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === 'mine' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50'}`}>
          Мои задачи
        </button>
        <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50'}`}>
          Все заявки
        </button>
        <button onClick={loadData} className="ml-auto px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 text-sm">↻</button>
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {requests.map(r => {
          const cat = categories.find(c => c.category_id === r.category_id)
          const obj = objects.find(o => o.object_id === r.object_id)
          const con = constructions.find(c => c.construction_id === r.construction_id)
          const wt = workTypes.find(w => w.work_type_id === r.work_type_id)
          const svc = services.find(s => s.service_id === r.service_id)
          const meta = r.service_id ? SERVICE_META[r.service_id] : null
          const st = STATUS_CONFIG[r.status]
          const isMine = myRequestIds.has(r.request_id)
          const isLoading = actionLoading === r.request_id

          return (
            <div key={r.request_id} className={`glass rounded-xl p-4 transition-all ${isMine ? 'border border-blue-500/20' : 'border border-white/5'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-white/30">{r.request_id}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ color: st.color, background: st.color + '20' }}>
                      {st.label}
                    </span>
                    {meta && <span className="text-xs text-white/40">{meta.emoji} {svc?.service_name}</span>}
                    {isMine && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">МОЯ</span>}
                  </div>
                  {cat && <div className="text-xs text-white/30">{cat.category_name}</div>}
                  {obj && <div className="text-white/90 font-medium">{obj.object_name}</div>}
                  {con && <div className="text-sm text-white/50">{con.construction_name}</div>}
                  {wt && <div className="text-sm text-cyan-400/70">{wt.work_name}</div>}
                  {r.description && <div className="text-xs text-white/30 mt-1">{r.description}</div>}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2 shrink-0">
                  {r.status === 'PLANNED' && isMine && (
                    <button onClick={() => handleAction(r.request_id, 'IN_PROGRESS')} disabled={isLoading}
                      className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-bold disabled:opacity-50">
                      {isLoading ? '...' : '▶ Начать'}
                    </button>
                  )}
                  {r.status === 'IN_PROGRESS' && isMine && (
                    <button onClick={() => handleAction(r.request_id, 'CHECKING')} disabled={isLoading}
                      className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold disabled:opacity-50">
                      {isLoading ? '...' : '⏹ Завершить'}
                    </button>
                  )}
                  {r.status === 'NEW' && isMine && (
                    <button onClick={() => handleAction(r.request_id, 'PLANNED')} disabled={isLoading}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold disabled:opacity-50">
                      {isLoading ? '...' : 'Принять'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {requests.length === 0 && (
          <div className="text-center text-white/20 py-20">{filter === 'mine' ? 'Нет назначенных задач' : 'Нет заявок'}</div>
        )}
      </div>
    </div>
  )
}
