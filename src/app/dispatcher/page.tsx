'use client'
import { useState, useEffect, useCallback } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import KanbanBoard from '@/components/KanbanBoard'
import RequestModal from '@/components/RequestModal'
import KPICards from '@/components/dispatcher/KPICards'
import Toolbar from '@/components/dispatcher/Toolbar'
import TableView from '@/components/dispatcher/TableView'
import PeopleStats from '@/components/dispatcher/PeopleStats'
import ServiceSummary from '@/components/dispatcher/ServiceSummary'
import { fetchRequests, fetchCategories, fetchObjects, fetchConstructions, fetchWorkTypes, fetchServices, fetchPeopleStats } from '@/lib/api'
import type { Request, Category, GObject, Construction, WorkType, Service, AuthSession } from '@/types'

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
  const [peopleStats, setPeopleStats] = useState<{ totalDeployed: number; byService: Record<string, number>; activeAssignments: Array<{ user_id: string; full_name: string; service_id: string | null; request_id: string; object_name?: string }> }>({ totalDeployed: 0, byService: {}, activeAssignments: [] })

  const loadData = useCallback(async () => {
    const [reqs, cats, objs, cons, wts, svcs] = await Promise.all([
      // Диспетчер видит только согласованные заявки (PLANNED и выше)
      fetchRequests(filterService ? { serviceId: filterService } : undefined),
      fetchCategories(), fetchObjects(), fetchConstructions(), fetchWorkTypes(), fetchServices()
    ])
    const approvedReqs = reqs.filter(r => r.status !== 'NEW')
    setRequests(approvedReqs); setCategories(cats); setObjects(objs)
    setConstructions(cons); setWorkTypes(wts); setServices(svcs)

    const ps = await fetchPeopleStats()
    setPeopleStats(ps)
  }, [filterService])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    const t = setInterval(loadData, 30000)
    return () => clearInterval(t)
  }, [loadData])

  const kpi = {
    total: requests.length,
    inProgress: requests.filter(r => r.status === 'IN_PROGRESS').length,
    done: requests.filter(r => r.status === 'DONE').length,
    critical: requests.filter(r => r.priority === 'CRITICAL' || r.urgency === 'EMERGENCY').length,
  }

  return (
    <div className="min-h-screen p-4 max-w-[1800px] mx-auto">
      <Header session={session} title="Диспетчерская" emoji="🗂️" mode="LIVE" />

      <KPICards {...kpi} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <PeopleStats {...peopleStats} services={services} />
        <ServiceSummary requests={requests} services={services} />
      </div>

      <Toolbar
        view={view} onViewChange={setView}
        filterService={filterService} onFilterChange={setFilterService}
        services={services}
        onRefresh={loadData}
        onNewRequest={() => { setSelectedReq(null); setShowModal(true) }}
      />

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

      {showModal && (
        <RequestModal session={session} existingRequest={selectedReq} onClose={() => setShowModal(false)} onSaved={loadData} />
      )}
    </div>
  )
}
