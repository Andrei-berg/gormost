'use client'
import { useState, useEffect, useCallback } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import KanbanBoard from '@/components/KanbanBoard'
import RequestCard from '@/components/RequestCard'
import RequestModal from '@/components/RequestModal'
import { fetchRequests, fetchCategories, fetchObjects, fetchConstructions, fetchWorkTypes, fetchServices } from '@/lib/api'
import type { Request, Category, GObject, Construction, WorkType, Service, AuthSession } from '@/types'
import { STATUS_CONFIG } from '@/types'

export default function DispatcherPage() {
  return (
    <AuthGuard roles={['DISPATCHER', 'ADMIN', 'BOSS']}>
      {(session) => <DispatcherContent session={session} />}
    </AuthGuard>
  )
}

function DispatcherContent({ session }: { session: AuthSession }) {
  const [requests, setRequests] = useState<Request[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [objects, setObjects] = useState<GObject[]>([])
  const [constructions, setConstructions] = useState<Construction[]>([])
  const [workTypes, setWorkTypes] = useState<WorkType[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [view, setView] = useState<'kanban' | 'table'>('kanban')
  const [showModal, setShowModal] = useState(false)
  const [selectedReq, setSelectedReq] = useState<Request | null>(null)
  const [filterService, setFilterService] = useState('')

  const loadData = useCallback(async () => {
    const [reqs, cats, objs, cons, wts, svcs] = await Promise.all([
      fetchRequests(filterService ? { serviceId: filterService } : undefined),
      fetchCategories(), fetchObjects(), fetchConstructions(), fetchWorkTypes(), fetchServices()
    ])
    setRequests(reqs); setCategories(cats); setObjects(objs)
    setConstructions(cons); setWorkTypes(wts); setServices(svcs)
  }, [filterService])

  useEffect(() => { loadData() }, [loadData])

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(loadData, 30000)
    return () => clearInterval(t)
  }, [loadData])

  // KPI
  const total = requests.length
  const inProgress = requests.filter(r => r.status === 'IN_PROGRESS').length
  const done = requests.filter(r => r.status === 'DONE').length
  const critical = requests.filter(r => r.priority === 'CRITICAL' || r.urgency === 'EMERGENCY').length

  return (
    <div className="min-h-screen p-4 max-w-[1800px] mx-auto">
      <Header session={session} title="Диспетчерская" emoji="🗂️" mode="LIVE" />

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KPICard label="Всего заявок" value={total} color="text-white" />
        <KPICard label="В работе" value={inProgress} color="text-violet-400" />
        <KPICard label="Выполнено" value={done} color="text-green-400" />
        <KPICard label="Критические" value={critical} color="text-red-400" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => setView('kanban')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${view === 'kanban' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
            Канбан
          </button>
          <button onClick={() => setView('table')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${view === 'table' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
            Таблица
          </button>
          <select value={filterService} onChange={e => setFilterService(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/70 focus:outline-none">
            <option value="">Все службы</option>
            {services.map(s => <option key={s.service_id} value={s.service_id}>{s.service_name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 text-sm">
            ↻ Обновить
          </button>
          <button onClick={() => { setSelectedReq(null); setShowModal(true) }}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">
            + Новая заявка
          </button>
        </div>
      </div>

      {/* Content */}
      {view === 'kanban' ? (
        <div className="overflow-x-auto pb-4">
          <KanbanBoard
            requests={requests} session={session}
            categories={categories} objects={objects} constructions={constructions}
            workTypes={workTypes} services={services}
            showService
            onCardClick={r => { setSelectedReq(r); setShowModal(true) }}
            onStatusChange={loadData}
          />
        </div>
      ) : (
        <TableView
          requests={requests} categories={categories} objects={objects}
          services={services} onRowClick={r => { setSelectedReq(r); setShowModal(true) }}
        />
      )}

      {/* Modal */}
      {showModal && (
        <RequestModal session={session} existingRequest={selectedReq} onClose={() => setShowModal(false)} onSaved={loadData} />
      )}
    </div>
  )
}

function KPICard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="text-xs text-white/40 mb-1">{label}</div>
      <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
    </div>
  )
}

function TableView({ requests, categories, objects, services, onRowClick }: {
  requests: Request[], categories: Category[], objects: GObject[], services: Service[], onRowClick: (r: Request) => void
}) {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">ID</th>
            <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Служба</th>
            <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Категория</th>
            <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Объект</th>
            <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Статус</th>
            <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Приоритет</th>
          </tr>
        </thead>
        <tbody>
          {requests.map(r => {
            const cat = categories.find(c => c.category_id === r.category_id)
            const obj = objects.find(o => o.object_id === r.object_id)
            const svc = services.find(s => s.service_id === r.service_id)
            const st = STATUS_CONFIG[r.status]
            return (
              <tr key={r.request_id} onClick={() => onRowClick(r)} className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-all">
                <td className="px-4 py-3 font-mono text-white/50 text-xs">{r.request_id}</td>
                <td className="px-4 py-3 text-white/70">{svc?.service_name || '—'}</td>
                <td className="px-4 py-3 text-white/50">{cat?.category_name || '—'}</td>
                <td className="px-4 py-3 text-white/80">{obj?.object_name || '—'}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ color: st.color, background: st.color + '20' }}>
                    {st.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-white/60">{r.priority}</td>
              </tr>
            )
          })}
          {requests.length === 0 && (
            <tr><td colSpan={6} className="px-4 py-12 text-center text-white/20">Нет заявок</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
