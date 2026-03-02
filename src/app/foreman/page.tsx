'use client'
import { useState, useEffect, useCallback } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import TaskList from '@/components/foreman/TaskList'
import { fetchRequests, fetchCategories, fetchObjects, fetchConstructions, fetchWorkTypes, fetchServices, updateRequestStatus } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import type { Request, Category, GObject, Construction, WorkType, Service, AuthSession, RequestStatus } from '@/types'

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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadData = useCallback(async () => {
    const [reqs, cats, objs, cons, wts, svcs] = await Promise.all([
      fetchRequests(), fetchCategories(), fetchObjects(), fetchConstructions(), fetchWorkTypes(), fetchServices()
    ])
    setAllRequests(reqs); setCategories(cats); setObjects(objs)
    setConstructions(cons); setWorkTypes(wts); setServices(svcs)

    const { data: assignments } = await supabase.from('request_assignments').select('request_id').eq('user_id', session.user_id)
    setMyRequestIds(new Set((assignments || []).map((a: { request_id: string }) => a.request_id)))
    setLastUpdated(new Date())
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

  const myReqs = allRequests.filter(r => myRequestIds.has(r.request_id))

  return (
    <div className="min-h-screen p-4 max-w-5xl mx-auto">
      <Header session={session} title="Мастер/Бригадир" emoji="👷‍♂️" mode="LIVE" lastUpdated={lastUpdated} />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
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

      <TaskList
        requests={requests}
        myRequestIds={myRequestIds}
        categories={categories} objects={objects} constructions={constructions}
        workTypes={workTypes} services={services}
        actionLoading={actionLoading}
        onAction={handleAction}
      />
    </div>
  )
}
