'use client'
import { useState, useEffect, useCallback } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import SummaryPanel from '@/components/hr/SummaryPanel'
import ServiceSection from '@/components/hr/ServiceSection'
import { fetchAllCurrentStatuses, fetchServices } from '@/lib/api'
import type { AuthSession, EnrichedEmployee, Service } from '@/types'

export default function HRPage() {
  return (
    <AuthGuard roles={['ZAMPORAB', 'HEAD', 'ADMIN', 'BOSS']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}

function Content({ session }: { session: AuthSession }) {
  const [employees, setEmployees] = useState<EnrichedEmployee[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadData = useCallback(async () => {
    const [emps, svcs] = await Promise.all([
      fetchAllCurrentStatuses(),
      fetchServices(),
    ])
    // Filter out employees with no service_id (ADMIN users, etc.)
    setEmployees(emps.filter(e => e.user.service_id !== null))
    setServices(svcs)
    setLastUpdated(new Date())
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // HEAD sees only their own service; ZAMPORAB/ADMIN/BOSS see all
  const isHead = session.role_level === 'HEAD'
  const canEdit = !isHead  // ADMIN, BOSS, ZAMPORAB can edit; HEAD is read-only

  const visibleEmployees = isHead
    ? employees.filter(e => e.user.service_id === session.service_id)
    : employees

  // Group by service_id — use services array order (not SERVICE_META key order)
  const grouped = services
    .map(svc => ({
      serviceId: svc.service_id,
      serviceName: svc.service_name,
      employees: visibleEmployees.filter(e => e.user.service_id === svc.service_id),
    }))
    .filter(g => g.employees.length > 0)

  return (
    <div className="min-h-screen p-4 max-w-6xl mx-auto">
      <Header session={session} title="Кадры" emoji="👥" mode="LIVE" lastUpdated={lastUpdated} />
      {loading ? (
        <div className="text-center text-white/40 py-12">Загрузка...</div>
      ) : (
        <>
          <SummaryPanel employees={visibleEmployees} services={services} />
          {grouped.map(g => (
            <ServiceSection
              key={g.serviceId}
              serviceId={g.serviceId}
              serviceName={g.serviceName}
              employees={g.employees}
              canEdit={canEdit}
              currentUserId={session.user_id}
              onRefresh={loadData}
            />
          ))}
          {grouped.length === 0 && (
            <div className="text-center text-white/30 py-12">Нет сотрудников для отображения</div>
          )}
        </>
      )}
    </div>
  )
}
