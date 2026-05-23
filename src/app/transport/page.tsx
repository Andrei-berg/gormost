'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import ShiftRotationStrip from '@/components/ShiftRotationStrip'
import FleetBoard from '@/components/transport/FleetBoard'
import PlanTransport, { type PlanGroup } from '@/components/transport/PlanTransport'
import BreakdownJournal from '@/components/transport/BreakdownJournal'
import DriverList from '@/components/transport/DriverList'
import {
  fetchVehiclesWithDayAssignments,
  fetchWorkPlans,
  fetchItemsWithVehicles,
  fetchOpenBreakdowns,
  fetchVehicleBreakdowns,
  fetchDriverUsers,
} from '@/lib/api-client'
import type {
  AuthSession, VehicleWithAssignments, VehicleBreakdownWithVehicle,
  User, UserWithAssignment,
} from '@/types'
import { isWorkerOnDuty } from '@/lib/shifts'

type TabId = 'fleet' | 'plan' | 'defects' | 'drivers'
type DriverFilterInit = 'all' | 'onshift' | 'offshift' | 'vac'

export default function TransportPage() {
  return (
    <AuthGuard roles={['TRANSPORT', 'ADMIN', 'BOSS', 'ZAMPORAB']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}

function Content({ session }: { session: AuthSession }) {
  const [vehicles, setVehicles]       = useState<VehicleWithAssignments[]>([])
  const [plans, setPlans]             = useState<PlanGroup[]>([])
  const [breakdowns, setBreakdowns]   = useState<VehicleBreakdownWithVehicle[]>([])
  const [driverUsers, setDriverUsers] = useState<UserWithAssignment[]>([])
  const [tab, setTab]                 = useState<TabId>('fleet')
  const [driverFilter, setDriverFilter] = useState<DriverFilterInit>('all')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const [planDate, setPlanDate] = useState(() => new Date().toISOString().slice(0, 10))
  const todayStr = new Date().toISOString().slice(0, 10)
  const canEdit = ['TRANSPORT', 'ADMIN'].includes(session.role_level)

  const loadData = useCallback(async () => {
    const [veh, approvedPlans, bd, drivers] = await Promise.all([
      fetchVehiclesWithDayAssignments(planDate),
      fetchWorkPlans({ planDate: planDate, statuses: ['APPROVED', 'PLANNED', 'BOSS_CONFIRMED', 'ASSIGNED', 'IN_PROGRESS'] }),
      fetchOpenBreakdowns(),
      fetchDriverUsers(),
    ])
    const planGroups = await Promise.all(
      approvedPlans.map(async plan => ({
        plan,
        items: await fetchItemsWithVehicles(plan.id),
      }))
    )
    setVehicles(veh)
    setPlans(planGroups)
    setBreakdowns(bd)
    setDriverUsers(drivers)
    setLastUpdated(new Date())
  }, [planDate])

  const loadAllBreakdowns = useCallback(async () => {
    const bd = await fetchVehicleBreakdowns()
    setBreakdowns(bd)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleRefresh = () => {
    if (tab === 'defects') loadAllBreakdowns()
    else loadData()
  }

  // KPI counts
  const broken      = vehicles.filter(v => v.status === 'BROKEN').length
  const active      = vehicles.filter(v => v.status === 'ACTIVE').length
  const onMaint     = vehicles.filter(v => v.status === 'MAINTENANCE').length
  const brokenStale = vehicles.filter(v => {
    if (v.status !== 'BROKEN') return false
    const since = v.status_changed_at || v.updated_at
    return Math.floor((Date.now() - new Date(since).getTime()) / 86_400_000) >= 3
  }).length

  const allItems   = plans.flatMap(p => p.items)
  const needsCount = allItems.filter(i =>
    i.vehicles.length === 0 || i.vehicles.some(v => v.status === 'BROKEN')
  ).length
  const openDefects = breakdowns.filter(b => b.status === 'OPEN').length
  const totalVehicles = vehicles.length

  const onDutyTodayCount = useMemo(() =>
    driverUsers.filter(u => {
      const a = u.assignment
      if (!a?.schedule_code) return false
      return isWorkerOnDuty({
        shift_num: a.shift_num,
        schedule_code: a.schedule_code,
        shift_reference_date: a.shift_reference_date,
        rotation_group: a.rotation_group,
        active_phase: a.active_phase ?? null,
        custom_work_days: a.custom_work_days ?? null,
        custom_rest_days: a.custom_rest_days ?? null,
      }, new Date())
    }).length
  , [driverUsers])

  const jumpToDriversOnshift = () => {
    setTab('drivers')
    setDriverFilter('onshift')
  }

  const tabs: { id: TabId; label: string; badge: number | null }[] = [
    { id: 'fleet',   label: 'Парк машин', badge: totalVehicles || null },
    { id: 'plan',    label: 'План работ',  badge: plans.length || null },
    { id: 'defects', label: 'Дефекты',    badge: openDefects || null },
    { id: 'drivers', label: 'Водители',   badge: driverUsers.length || null },
  ]

  return (
    <div className="min-h-screen p-4 max-w-[1800px] mx-auto space-y-3">
      <Header session={session} title="Транспорт" emoji="🚗" mode="LIVE" lastUpdated={lastUpdated} />

      {/* Shift rotation strip */}
      <ShiftRotationStrip />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass rounded-xl p-4 flex flex-col gap-1">
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">Активных</div>
          <div className="text-[36px] font-bold font-mono text-emerald-400 leading-none mt-1">{active}</div>
          <div className="text-[11px] text-white/30 font-mono mt-1">из {totalVehicles} ед. парка</div>
        </div>
        <div className={`glass rounded-xl p-4 flex flex-col gap-1 relative ${broken > 0 ? 'border border-red-500/30' : ''}`}>
          {broken > 0 && (
            <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-red-500 animate-ping opacity-75" />
          )}
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">Сломано</div>
          <div className="text-[36px] font-bold font-mono text-red-400 leading-none mt-1">{broken}</div>
          <div className="text-[11px] text-white/30 font-mono mt-1">
            {brokenStale > 0 ? `${brokenStale} долго в ремонте` : 'в ремонте'}
          </div>
        </div>
        <div className="glass rounded-xl p-4 flex flex-col gap-1">
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">На ТО / Ремонте</div>
          <div className="text-[36px] font-bold font-mono text-white/30 leading-none mt-1">{onMaint}</div>
          <div className="text-[11px] text-white/30 font-mono mt-1">плановое</div>
        </div>
        <div className={`glass rounded-xl p-4 flex flex-col gap-1 ${needsCount > 0 ? 'border border-amber-500/30' : ''}`}>
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">Нужен транспорт</div>
          <div className={`text-[36px] font-bold font-mono leading-none mt-1 ${needsCount > 0 ? 'text-amber-400' : 'text-white/30'}`}>{needsCount}</div>
          <div className="text-[11px] text-white/30 font-mono mt-1">
            {needsCount > 0 ? 'заявок ждут' : 'все покрыты'}
          </div>
        </div>
      </div>

      {/* Fleet summary bar */}
      {vehicles.length > 0 && (
        <div className="glass rounded-xl border border-white/8 px-5 py-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Парк</span>
            <span>
              <span className="font-semibold text-white font-mono">{totalVehicles}</span>
              <span className="text-white/30 ml-1">ед.</span>
              <span className="text-white/15 mx-1.5">·</span>
              <span className="font-semibold text-emerald-400 font-mono">{active}</span>
              <span className="text-white/30 ml-1">исправных</span>
              {broken > 0 && (
                <>
                  <span className="text-white/15 mx-1.5">·</span>
                  <span className="font-semibold text-red-400 font-mono">{broken}</span>
                  <span className="text-white/30 ml-1">неисправных</span>
                </>
              )}
            </span>
          </div>
          <div className="w-px h-4 bg-white/8 shrink-0" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Водители</span>
            <span>
              <span className="font-semibold text-white font-mono">{driverUsers.length}</span>
              <span className="text-white/30 ml-1">всего</span>
              <span className="text-white/15 mx-1.5">·</span>
              <button
                onClick={jumpToDriversOnshift}
                className="font-semibold text-blue-400 font-mono underline underline-offset-2 decoration-blue-400/40 hover:decoration-blue-400 transition-all"
              >
                {onDutyTodayCount} на смене
              </button>
            </span>
          </div>
          {lastUpdated && (
            <div className="ml-auto flex items-center gap-1.5 font-mono text-[11px] text-white/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              обновлено {lastUpdated.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="glass rounded-xl p-1.5 flex items-center gap-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => {
              if (t.id === 'defects') loadAllBreakdowns()
              setTab(t.id)
            }}
            className={`relative flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 ${
              tab === t.id
                ? 'bg-amber-500/14 text-amber-400'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {t.label}
            {t.badge != null && (
              <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                tab === t.id
                  ? 'bg-amber-500/25 text-amber-400'
                  : 'bg-white/8 text-white/50'
              }`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
        <button
          onClick={handleRefresh}
          className="ml-auto px-3 py-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors text-sm"
          title="Обновить"
        >
          ↻
        </button>
      </div>

      {/* Tab content */}
      {tab === 'fleet' && (
        <FleetBoard
          vehicles={vehicles}
          drivers={driverUsers as User[]}
          canEdit={canEdit}
          onRefresh={loadData}
        />
      )}

      {tab === 'plan' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => { const d = new Date(planDate); d.setDate(d.getDate()-1); setPlanDate(d.toISOString().slice(0,10)) }}
              className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 text-sm"
            >←</button>
            <span className="text-sm text-white/70 font-medium min-w-[130px] text-center">
              {new Date(planDate + 'T00:00:00').toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })}
            </span>
            <button
              onClick={() => { const d = new Date(planDate); d.setDate(d.getDate()+1); setPlanDate(d.toISOString().slice(0,10)) }}
              className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 text-sm"
            >→</button>
            {planDate !== todayStr && (
              <button onClick={() => setPlanDate(todayStr)} className="px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs ml-1">
                сегодня
              </button>
            )}
            <button onClick={loadData} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 text-sm ml-auto">↻</button>
          </div>
          <PlanTransport
            plans={plans}
            activeVehicles={vehicles.filter(v => v.status === 'ACTIVE')}
            userId={session.user_id}
            planDate={planDate}
            driverUsers={driverUsers}
            onRefresh={loadData}
          />
        </div>
      )}

      {tab === 'drivers' && (
        <DriverList
          drivers={driverUsers}
          vehicles={vehicles}
          date={todayStr}
          initialFilter={driverFilter}
        />
      )}

      {tab === 'defects' && (
        <BreakdownJournal
          breakdowns={breakdowns}
          vehicles={vehicles}
          currentUser={{ ...session, is_active: true } as unknown as User}
          canEdit={canEdit}
          onRefresh={loadAllBreakdowns}
        />
      )}

      {/* Status bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`rounded-xl px-4 py-3 border flex items-center gap-3 text-sm font-semibold ${
          broken > 0
            ? 'bg-red-500/8 border-red-500/30 text-red-400'
            : 'bg-white/4 border-white/8 text-white/30'
        }`}>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 9v2m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h16.9a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/>
          </svg>
          <span className="font-mono font-bold">{broken}</span>
          <span>единиц в ремонте</span>
        </div>
        <div className={`rounded-xl px-4 py-3 border flex items-center gap-3 text-sm font-semibold ${
          needsCount > 0
            ? 'bg-amber-500/8 border-amber-500/30 text-amber-400'
            : 'bg-white/4 border-white/8 text-white/30'
        }`}>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
          </svg>
          <span className="font-mono font-bold">{needsCount}</span>
          <span>заявок ждут транспорт</span>
        </div>
        <div className="bg-emerald-500/8 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-3 flex items-center gap-3 text-sm font-semibold">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/>
          </svg>
          <span className="font-mono font-bold">{onDutyTodayCount}</span>
          <span>водитель на смене</span>
        </div>
      </div>
    </div>
  )
}
