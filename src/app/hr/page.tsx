'use client'
import { useState, useCallback } from 'react'
import Link from 'next/link'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import ShiftRotationStrip from '@/components/ShiftRotationStrip'
import SummaryPanel from '@/components/hr/SummaryPanel'
import ServiceSection from '@/components/hr/ServiceSection'
import EmployeeDetailCard from '@/components/hr/EmployeeDetailCard'
import HireModal from '@/components/hr/HireModal'
import DismissModal from '@/components/hr/DismissModal'
import TransferModal from '@/components/hr/TransferModal'
import { fetchAllCurrentStatuses, fetchServices, fetchUsers, fetchUsersWithAssignments } from '@/lib/api-client'
import type { AuthSession, EnrichedEmployee, Service, User, UserWithAssignment } from '@/types'
import HRToolbar from '@/components/hr/HRToolbar'
import HRTableView from '@/components/hr/HRTableView'
import ShiftMonitorTab from '@/components/admin/ShiftMonitorTab'
import ShiftTab from '@/components/admin/ShiftTab'
import HRToolsShell from '@/components/hr-tools/HRToolsShell'
import HRReports from '@/components/hr/HRReports'
import type { EmployeeStatusType } from '@/types'
import { useLoadData } from '@/lib/useLoadData'
import { DataErrorBanner } from '@/components/DataState'

type Tab = 'employees' | 'shifts' | 'analytics' | 'reports'
type ShiftSubTab = 'schedules' | 'monitor'

const TABS: { id: Tab; label: string }[] = [
  { id: 'employees', label: 'Сотрудники' },
  { id: 'shifts',    label: 'Сменность' },
  { id: 'analytics', label: 'Аналитика' },
  { id: 'reports',   label: 'Отчёты' },
]

export default function HRPage() {
  return (
    <AuthGuard roles={['ZAMPORAB', 'HEAD', 'ADMIN', 'BOSS', 'HR']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}

function Content({ session }: { session: AuthSession }) {
  const [tab, setTab] = useState<Tab>('employees')
  const [shiftSubTab, setShiftSubTab] = useState<ShiftSubTab>('schedules')

  const [employees, setEmployees] = useState<EnrichedEmployee[]>([])
  const [dismissedUsers, setDismissedUsers] = useState<User[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [assignmentMap, setAssignmentMap] = useState<Map<string, UserWithAssignment['assignment']>>(new Map())
  const [usersWithSchedule, setUsersWithSchedule] = useState<UserWithAssignment[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [showDismissed, setShowDismissed] = useState(false)

  const [view, setView] = useState<'cards' | 'table'>('cards')
  const [search, setSearch] = useState('')
  const [filterService, setFilterService] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedEditMode, setSelectedEditMode] = useState(false)
  const [selectedEditKey, setSelectedEditKey] = useState(0)
  const [showHireModal, setShowHireModal] = useState(false)
  const [dismissTarget, setDismissTarget] = useState<{ userId: string; name: string } | null>(null)
  const [transferTarget, setTransferTarget] = useState<{ userId: string; name: string } | null>(null)

  const loadData = useCallback(async () => {
    const [emps, svcs, allUsers, usersWithAssign] = await Promise.all([
      fetchAllCurrentStatuses(),
      fetchServices(),
      fetchUsers(false),
      fetchUsersWithAssignments(),
    ])
    setEmployees(emps.filter(e => e.user.is_active !== false))
    setServices(svcs)
    setDismissedUsers(allUsers.filter(u => !u.is_active))
    setUsersWithSchedule(usersWithAssign)
    const aMap = new Map<string, UserWithAssignment['assignment']>()
    usersWithAssign.forEach(u => aMap.set(u.user_id, u.assignment))
    setAssignmentMap(aMap)
    setLastUpdated(new Date())
  }, [])

  const { loading, error, reload } = useLoadData(loadData)

  const isHead = session.role_level === 'HEAD'
  const canEdit = !isHead
  const isHR = session.role_level === 'HR'
  const canAdmin = session.role_level === 'ADMIN' || isHR

  const visibleEmployees = isHead
    ? employees.filter(e => e.user.service_id === session.service_id)
    : employees

  const filteredEmployees = visibleEmployees.filter(e => {
    const matchesSearch = search.trim() === ''
      || e.user.full_name.toLowerCase().includes(search.trim().toLowerCase())
    const matchesService = filterService === ''
      || e.user.service_id === filterService
    const matchesStatus = filterStatus === ''
      || e.currentStatus === (filterStatus as EmployeeStatusType)
    return matchesSearch && matchesService && matchesStatus
  })

  const grouped = services
    .map(svc => ({
      serviceId: svc.service_id,
      serviceName: svc.service_name,
      employees: filteredEmployees.filter(e => e.user.service_id === svc.service_id),
    }))
    .filter(g => g.employees.length > 0)

  const noServiceEmployees = filteredEmployees.filter(e => !e.user.service_id)

  const findEmployee = (uid: string): EnrichedEmployee | undefined =>
    employees.find(e => e.user.user_id === uid)

  const activeCount = employees.length
  const withSchedule = usersWithSchedule.filter(u => u.assignment).length

  return (
    <div className="min-h-screen p-4 max-w-[1800px] mx-auto">
      <Header session={session} title="Кадровый центр" emoji="👥" mode="LIVE" lastUpdated={lastUpdated} />

      {error && <DataErrorBanner error={error} onRetry={reload} />}

      {/* Shift rotation strip */}
      <div className="glass rounded-xl p-2.5 mb-4 border border-white/8">
        <ShiftRotationStrip />
      </div>

      {/* Tab bar */}
      <div
        className="flex items-center gap-0.5 mb-5 rounded-xl border px-1.5 py-1.5"
        style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
      >
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all"
            style={
              tab === t.id
                ? {
                    background: 'rgba(240,165,0,0.12)',
                    color: '#F0A500',
                    border: '1px solid rgba(240,165,0,0.30)',
                  }
                : {
                    color: 'rgba(255,255,255,0.45)',
                    border: '1px solid transparent',
                  }
            }
          >
            {t.label}
            {!loading && t.id === 'employees' && (
              <span
                className="font-mono text-[10px] px-1.5 py-px rounded-full"
                style={
                  tab === t.id
                    ? { background: 'rgba(240,165,0,0.18)', color: '#F0A500' }
                    : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }
                }
              >
                {activeCount}
              </span>
            )}
            {!loading && t.id === 'shifts' && (
              <span
                className="font-mono text-[10px] px-1.5 py-px rounded-full"
                style={
                  tab === t.id
                    ? { background: 'rgba(240,165,0,0.18)', color: '#F0A500' }
                    : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }
                }
              >
                {withSchedule}
              </span>
            )}
          </button>
        ))}

        <div className="flex-1" />

        {/* Planner link */}
        <Link
          href="/planner"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
          style={{ color: 'rgba(255,255,255,0.40)' }}
        >
          Планировщик
          <span style={{ color: 'rgba(255,255,255,0.25)' }}>→</span>
        </Link>
      </div>

      {/* ─── EMPLOYEES TAB ─── */}
      {tab === 'employees' && (
        loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <SummaryPanel employees={visibleEmployees} services={services} assignmentMap={assignmentMap} />

            <HRToolbar
              view={view}
              onViewChange={setView}
              search={search}
              onSearchChange={setSearch}
              filterService={filterService}
              onFilterChange={setFilterService}
              filterStatus={filterStatus}
              onFilterStatusChange={setFilterStatus}
              services={services}
              canAdmin={canAdmin}
              onHire={() => setShowHireModal(true)}
            />

            {view === 'table' ? (
              <HRTableView
                employees={filteredEmployees}
                canEdit={canEdit}
                canAdmin={canAdmin}
                currentUserId={session.user_id}
                onNameClick={(uid) => { setSelectedEditMode(false); setSelectedUserId(uid) }}
                onNameDoubleClick={(uid) => { setSelectedEditMode(true); setSelectedEditKey(k => k + 1); setSelectedUserId(uid) }}
                onRefresh={reload}
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
                    onRefresh={reload}
                    onNameClick={(uid) => setSelectedUserId(uid)}
                    assignmentMap={assignmentMap}
                  />
                ))}
                {noServiceEmployees.length > 0 && (
                  <ServiceSection
                    key="no-service"
                    serviceId=""
                    serviceName="Без службы"
                    employees={noServiceEmployees}
                    canEdit={canEdit}
                    currentUserId={session.user_id}
                    onRefresh={reload}
                    onNameClick={(uid) => setSelectedUserId(uid)}
                    assignmentMap={assignmentMap}
                  />
                )}
                {grouped.length === 0 && noServiceEmployees.length === 0 && (
                  <div className="text-center text-white/30 py-12 text-sm">Нет сотрудников для отображения</div>
                )}
              </>
            )}

            {dismissedUsers.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setShowDismissed(!showDismissed)}
                  className="flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors mb-3"
                >
                  <span>{showDismissed ? '▲' : '▼'}</span>
                  <span className="uppercase tracking-widest font-bold">Уволенные</span>
                  <span className="text-white/20 font-mono">({dismissedUsers.length})</span>
                </button>
                {showDismissed && (
                  <div className="space-y-1.5">
                    {dismissedUsers.map(u => (
                      <div
                        key={u.user_id}
                        className="flex items-center justify-between px-4 py-2.5 rounded-xl border"
                        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}
                      >
                        <div>
                          <span className="text-sm text-white/40">{u.full_name}</span>
                          {u.tab_number && (
                            <span className="text-xs text-white/20 ml-2 font-mono">Таб. {u.tab_number}</span>
                          )}
                        </div>
                        {u.date_fired && (
                          <span className="text-xs text-white/20 font-mono">
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
        )
      )}

      {/* ─── SHIFTS TAB ─── */}
      {tab === 'shifts' && (
        <div className="space-y-4">
          <div className="flex gap-1 rounded-xl p-1 w-fit" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {([['schedules', '🔄 Графики и фазы'], ['monitor', '📅 Мониторинг']] as [ShiftSubTab, string][]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setShiftSubTab(id)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={
                  shiftSubTab === id
                    ? { background: 'rgba(240,165,0,0.20)', color: '#F0A500' }
                    : { color: 'rgba(255,255,255,0.40)' }
                }
              >
                {label}
              </button>
            ))}
          </div>
          {shiftSubTab === 'schedules' && <ShiftTab session={session} />}
          {shiftSubTab === 'monitor' && !loading && (
            <ShiftMonitorTab
              users={usersWithSchedule}
              services={services}
              session={session}
              onRefreshUsers={reload}
            />
          )}
        </div>
      )}

      {/* ─── ANALYTICS TAB ─── */}
      {tab === 'analytics' && <HRToolsShell session={session} />}

      {/* ─── REPORTS TAB ─── */}
      {tab === 'reports' && <HRReports session={session} services={services} />}

      {/* Modals */}
      {selectedUserId && (
        <EmployeeDetailCard
          key={`${selectedUserId}-${selectedEditKey}`}
          userId={selectedUserId}
          currentUserId={session.user_id}
          canAdmin={canAdmin}
          initialEditMode={selectedEditMode}
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
          onSuccess={() => { setShowHireModal(false); reload() }}
        />
      )}
      {dismissTarget && (
        <DismissModal
          userId={dismissTarget.userId}
          employeeName={dismissTarget.name}
          currentUserId={session.user_id}
          onClose={() => setDismissTarget(null)}
          onSuccess={() => { setDismissTarget(null); reload() }}
        />
      )}
      {transferTarget && (
        <TransferModal
          userId={transferTarget.userId}
          employeeName={transferTarget.name}
          currentUserId={session.user_id}
          onClose={() => setTransferTarget(null)}
          onSuccess={() => { setTransferTarget(null); reload() }}
        />
      )}
    </div>
  )
}
