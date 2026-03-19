'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import SummaryPanel from '@/components/hr/SummaryPanel'
import ServiceSection from '@/components/hr/ServiceSection'
import EmployeeDetailCard from '@/components/hr/EmployeeDetailCard'
import HireModal from '@/components/hr/HireModal'
import DismissModal from '@/components/hr/DismissModal'
import TransferModal from '@/components/hr/TransferModal'
import { fetchAllCurrentStatuses, fetchServices, fetchUsers, fetchUsersWithAssignments } from '@/lib/api'
import type { AuthSession, EnrichedEmployee, Service, User, UserWithAssignment } from '@/types'

import HRToolbar from '@/components/hr/HRToolbar'
import HRTableView from '@/components/hr/HRTableView'
import ShiftMonitorTab from '@/components/admin/ShiftMonitorTab'
import ShiftTab from '@/components/admin/ShiftTab'

type HRTab = 'employees' | 'monitor' | 'shifts'

export default function HRPage() {
  return (
    <AuthGuard roles={['ZAMPORAB', 'HEAD', 'ADMIN', 'BOSS', 'HR']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}

function Content({ session }: { session: AuthSession }) {
  const [tab, setTab] = useState<HRTab>('employees')
  const [employees, setEmployees] = useState<EnrichedEmployee[]>([])
  const [dismissedUsers, setDismissedUsers] = useState<User[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [assignmentMap, setAssignmentMap] = useState<Map<string, UserWithAssignment['assignment']>>(new Map())
  const [usersWithSchedule, setUsersWithSchedule] = useState<UserWithAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [showDismissed, setShowDismissed] = useState(false)

  // View, search, and filter state
  const [view, setView] = useState<'cards' | 'table'>('cards')
  const [search, setSearch] = useState('')
  const [filterService, setFilterService] = useState('')

  // Modal state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [showHireModal, setShowHireModal] = useState(false)
  const [dismissTarget, setDismissTarget] = useState<{ userId: string; name: string } | null>(null)
  const [transferTarget, setTransferTarget] = useState<{ userId: string; name: string } | null>(null)

  const loadData = useCallback(async () => {
    const [emps, svcs, allUsers, usersWithAssign] = await Promise.all([
      fetchAllCurrentStatuses(),
      fetchServices(),
      fetchUsers(false), // all users including inactive
      fetchUsersWithAssignments(),
    ])
    setEmployees(emps.filter(e => e.user.service_id !== null))
    setServices(svcs)
    setDismissedUsers(allUsers.filter(u => !u.is_active))
    setUsersWithSchedule(usersWithAssign)
    const aMap = new Map<string, UserWithAssignment['assignment']>()
    usersWithAssign.forEach(u => aMap.set(u.user_id, u.assignment))
    setAssignmentMap(aMap)
    setLastUpdated(new Date())
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const isHead = session.role_level === 'HEAD'
  const canEdit = !isHead  // HEAD sees only own service, no editing
  const isHR = session.role_level === 'HR'
  const canAdmin = session.role_level === 'ADMIN' || isHR  // HR can hire/dismiss/transfer

  const visibleEmployees = isHead
    ? employees.filter(e => e.user.service_id === session.service_id)
    : employees

  // Apply search + service filter simultaneously (AND logic)
  const filteredEmployees = visibleEmployees.filter(e => {
    const matchesSearch = search.trim() === ''
      || e.user.full_name.toLowerCase().includes(search.trim().toLowerCase())
    const matchesService = filterService === ''
      || e.user.service_id === filterService
    return matchesSearch && matchesService
  })

  const grouped = services
    .map(svc => ({
      serviceId: svc.service_id,
      serviceName: svc.service_name,
      employees: filteredEmployees.filter(e => e.user.service_id === svc.service_id),
    }))
    .filter(g => g.employees.length > 0)

  // Find employee by userId across all loaded enriched employees
  const findEmployee = (uid: string): EnrichedEmployee | undefined =>
    employees.find(e => e.user.user_id === uid)

  return (
    <div className="min-h-screen p-4 max-w-6xl mx-auto">
      <Header session={session} title="Кадры" emoji="👥" mode="LIVE" lastUpdated={lastUpdated} />

      {/* Top-level tab switcher + analytics link */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
        {([['employees', '👥 Сотрудники'], ['shifts', '🔄 Смены'], ['monitor', '📅 Мониторинг']] as [HRTab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === id ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white/60'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <Link
        href="/hr-tools"
        className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30 transition-colors text-xs font-medium"
      >
        📊 Кадровая аналитика →
      </Link>
      </div>

      {/* Shifts tab — full schedule assignment + phase management */}
      {tab === 'shifts' && <ShiftTab session={session} />}

      {/* Monitor tab */}
      {tab === 'monitor' && !loading && (
        <ShiftMonitorTab
          users={usersWithSchedule}
          services={services}
          session={session}
          onRefreshUsers={loadData}
        />
      )}

      {/* Employees tab */}
      {tab === 'employees' && loading ? (
        <div className="text-center text-white/40 py-12">Загрузка...</div>
      ) : tab === 'employees' && (
        <>
          <SummaryPanel employees={visibleEmployees} services={services} assignmentMap={assignmentMap} />

          <HRToolbar
            view={view}
            onViewChange={setView}
            search={search}
            onSearchChange={setSearch}
            filterService={filterService}
            onFilterChange={setFilterService}
            services={services}
          />

          {/* Hire button — ADMIN only */}
          {canAdmin && (
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setShowHireModal(true)}
                className="px-4 py-2 rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-400 hover:bg-teal-500/30 text-sm font-medium transition-colors"
              >
                + Нанять сотрудника
              </button>
            </div>
          )}

          {view === 'table' ? (
            <HRTableView
              employees={filteredEmployees}
              canEdit={canEdit}
              currentUserId={session.user_id}
              onNameClick={(uid) => setSelectedUserId(uid)}
              onRefresh={loadData}
              services={services}
              assignmentMap={assignmentMap}
            />
          ) : (
            <>
              {grouped.map(g => (
                <ServiceSection
                  key={g.serviceId}
                  serviceId={g.serviceId}
                  serviceName={g.serviceName}
                  employees={g.employees}
                  canEdit={canEdit}
                  currentUserId={session.user_id}
                  onRefresh={loadData}
                  onNameClick={(uid) => setSelectedUserId(uid)}
                  assignmentMap={assignmentMap}
                />
              ))}
              {grouped.length === 0 && (
                <div className="text-center text-white/30 py-12">Нет сотрудников для отображения</div>
              )}
            </>
          )}

          {/* Dismissed employees section */}
          {dismissedUsers.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowDismissed(!showDismissed)}
                className="flex items-center gap-2 text-sm text-white/30 hover:text-white/60 transition-colors mb-3"
              >
                <span className="text-xs">{showDismissed ? '▲' : '▼'}</span>
                <span className="uppercase tracking-wider font-bold">Уволенные</span>
                <span className="text-white/20">({dismissedUsers.length})</span>
              </button>
              {showDismissed && (
                <div className="space-y-2">
                  {dismissedUsers.map(u => (
                    <div
                      key={u.user_id}
                      className="flex items-center justify-between px-4 py-2.5 bg-white/3 border border-white/5 rounded-lg"
                    >
                      <div>
                        <span className="text-sm text-white/40">{u.full_name}</span>
                        {u.tab_number && (
                          <span className="text-xs text-white/20 ml-2">Таб. {u.tab_number}</span>
                        )}
                      </div>
                      {u.date_fired && (
                        <span className="text-xs text-white/20">
                          {new Date(u.date_fired).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {selectedUserId && (
        <EmployeeDetailCard
          userId={selectedUserId}
          currentUserId={session.user_id}
          canAdmin={canAdmin}
          onClose={() => setSelectedUserId(null)}
          onDismiss={(uid) => {
            const emp = findEmployee(uid)
            setDismissTarget({ userId: uid, name: emp?.user.full_name ?? uid })
            setSelectedUserId(null)
          }}
          onTransfer={(uid) => {
            const emp = findEmployee(uid)
            setTransferTarget({ userId: uid, name: emp?.user.full_name ?? uid })
            setSelectedUserId(null)
          }}
        />
      )}
      {showHireModal && (
        <HireModal
          currentUserId={session.user_id}
          onClose={() => setShowHireModal(false)}
          onSuccess={() => { setShowHireModal(false); loadData() }}
        />
      )}
      {dismissTarget && (
        <DismissModal
          userId={dismissTarget.userId}
          employeeName={dismissTarget.name}
          currentUserId={session.user_id}
          onClose={() => setDismissTarget(null)}
          onSuccess={() => { setDismissTarget(null); loadData() }}
        />
      )}
      {transferTarget && (
        <TransferModal
          userId={transferTarget.userId}
          employeeName={transferTarget.name}
          currentUserId={session.user_id}
          onClose={() => setTransferTarget(null)}
          onSuccess={() => { setTransferTarget(null); loadData() }}
        />
      )}
    </div>
  )
}
