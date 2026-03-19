'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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

type HRSection = null | 'employees' | 'shifts'
type ShiftSubTab = 'schedules' | 'monitor'

export default function HRPage() {
  return (
    <AuthGuard roles={['ZAMPORAB', 'HEAD', 'ADMIN', 'BOSS', 'HR']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}

// Hub card component
function HubCard({
  emoji, title, description, stats, color, onClick,
}: {
  emoji: string; title: string; description: string; stats?: string; color: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative w-full text-left p-6 rounded-2xl border transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl ${color}`}
    >
      <div className="text-3xl mb-3">{emoji}</div>
      <div className="text-lg font-bold text-white mb-1">{title}</div>
      <div className="text-sm text-white/50 mb-4 leading-relaxed">{description}</div>
      {stats && (
        <div className="text-xs text-white/70 font-medium bg-white/10 px-3 py-1.5 rounded-lg inline-block">
          {stats}
        </div>
      )}
      <div className="absolute top-5 right-5 text-white/20 group-hover:text-white/50 transition-colors text-lg">→</div>
    </button>
  )
}

function Content({ session }: { session: AuthSession }) {
  const router = useRouter()
  const [section, setSection] = useState<HRSection>(null)
  const [shiftSubTab, setShiftSubTab] = useState<ShiftSubTab>('schedules')

  const [employees, setEmployees] = useState<EnrichedEmployee[]>([])
  const [dismissedUsers, setDismissedUsers] = useState<User[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [assignmentMap, setAssignmentMap] = useState<Map<string, UserWithAssignment['assignment']>>(new Map())
  const [usersWithSchedule, setUsersWithSchedule] = useState<UserWithAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [showDismissed, setShowDismissed] = useState(false)

  const [view, setView] = useState<'cards' | 'table'>('cards')
  const [search, setSearch] = useState('')
  const [filterService, setFilterService] = useState('')

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
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
    // Show all active employees including those without a service
    setEmployees(emps.filter(e => e.user.is_active !== false))
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
    return matchesSearch && matchesService
  })

  // Grouped by service — employees without service go to "Без службы" group
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

  // Hub stats
  const activeCount = employees.length
  const serviceCount = new Set(employees.map(e => e.user.service_id).filter(Boolean)).size

  const handleHubSelect = (s: HRSection | 'analytics') => {
    if (s === 'analytics') { router.push('/hr-tools'); return }
    setSection(s)
  }

  return (
    <div className="min-h-screen p-4 max-w-6xl mx-auto">
      <Header session={session} title="Кадровый центр" emoji="👥" mode="LIVE" lastUpdated={lastUpdated} />

      {/* Back button */}
      {section !== null && (
        <button
          onClick={() => setSection(null)}
          className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-5"
        >
          ← Кадровый центр
        </button>
      )}

      {/* ─── HUB ─── */}
      {section === null && (
        <div className="space-y-6">
          <p className="text-white/30 text-sm">Выберите раздел для работы</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <HubCard
              emoji="👤"
              title="Сотрудники"
              description="Статусы · Найм · Перевод · Увольнение · История"
              stats={loading ? 'загрузка...' : `${activeCount} активных · ${serviceCount} служб`}
              color="bg-teal-900/40 border-teal-500/30 hover:bg-teal-900/60 hover:border-teal-400/50"
              onClick={() => handleHubSelect('employees')}
            />
            <HubCard
              emoji="🔄"
              title="Сменность"
              description="Графики · Фазы смен · Мониторинг ошибок"
              stats={loading ? 'загрузка...' : `${usersWithSchedule.filter(u => u.assignment).length} с графиком`}
              color="bg-blue-900/40 border-blue-500/30 hover:bg-blue-900/60 hover:border-blue-400/50"
              onClick={() => handleHubSelect('shifts')}
            />
            <HubCard
              emoji="📊"
              title="Аналитика"
              description="Список сотрудников · Табель · Отчёт о покрытии"
              color="bg-violet-900/40 border-violet-500/30 hover:bg-violet-900/60 hover:border-violet-400/50"
              onClick={() => handleHubSelect('analytics')}
            />
          </div>
        </div>
      )}

      {/* ─── SHIFTS SECTION ─── */}
      {section === 'shifts' && (
        <div className="space-y-4">
          {/* Sub-tab switcher */}
          <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
            {([['schedules', '🔄 Графики и фазы'], ['monitor', '📅 Мониторинг']] as [ShiftSubTab, string][]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setShiftSubTab(id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  shiftSubTab === id ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white/60'
                }`}
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
              onRefreshUsers={loadData}
            />
          )}
        </div>
      )}

      {/* ─── EMPLOYEES SECTION ─── */}
      {section === 'employees' && (
        <>
          {loading ? (
            <div className="text-center text-white/40 py-12">Загрузка...</div>
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
                services={services}
              />

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
                  canAdmin={canAdmin}
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

                  {/* Employees without a service assignment */}
                  {noServiceEmployees.length > 0 && (
                    <ServiceSection
                      key="no-service"
                      serviceId=""
                      serviceName="Без службы"
                      employees={noServiceEmployees}
                      canEdit={canEdit}
                      currentUserId={session.user_id}
                      onRefresh={loadData}
                      onNameClick={(uid) => setSelectedUserId(uid)}
                      assignmentMap={assignmentMap}
                    />
                  )}

                  {grouped.length === 0 && noServiceEmployees.length === 0 && (
                    <div className="text-center text-white/30 py-12">Нет сотрудников для отображения</div>
                  )}
                </>
              )}

              {/* Dismissed employees */}
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
