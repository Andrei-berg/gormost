'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import FleetBoard from '@/components/transport/FleetBoard'
import PlanTransport, { type PlanGroup } from '@/components/transport/PlanTransport'
import BreakdownJournal from '@/components/transport/BreakdownJournal'
import DriverStats from '@/components/transport/DriverStats'
import DriverList from '@/components/transport/DriverList'
import {
  fetchVehiclesWithDayAssignments,
  fetchWorkPlans,
  fetchItemsWithVehicles,
  fetchOpenBreakdowns,
  fetchVehicleBreakdowns,
  fetchDriverUsers,
} from '@/lib/api'
import type {
  AuthSession, VehicleWithAssignments, VehicleBreakdownWithVehicle,
  User, UserWithAssignment,
} from '@/types'
import { isWorkerOnDuty } from '@/lib/shifts'

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
  const [tab, setTab]                 = useState<'fleet' | 'plan' | 'defects' | 'drivers'>('fleet')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const [planDate, setPlanDate] = useState(() => new Date().toISOString().slice(0, 10))
  const todayStr = new Date().toISOString().slice(0, 10)
  const canEdit = ['TRANSPORT', 'ADMIN'].includes(session.role_level)

  const loadData = useCallback(async () => {
    const [veh, approvedPlans, bd, drivers] = await Promise.all([
      fetchVehiclesWithDayAssignments(planDate),
      fetchWorkPlans({ planDate: planDate, status: 'APPROVED' }),
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

  // KPI
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

  // Fleet KPI
  const activeCount      = vehicles.filter(v => v.status === 'ACTIVE').length
  const brokenCount      = vehicles.filter(v => v.status === 'BROKEN').length
  const maintenanceCount = vehicles.filter(v => v.status === 'MAINTENANCE').length
  const totalVehicles    = vehicles.length

  const onDutyTodayCount = useMemo(() =>
    driverUsers.filter(u => {
      const a = u.assignment
      if (!a?.schedule_code) return false
      return isWorkerOnDuty({ shift_num: a.shift_num, schedule_code: a.schedule_code, shift_reference_date: a.shift_reference_date, rotation_group: a.rotation_group, active_phase: a.active_phase ?? null, custom_work_days: a.custom_work_days ?? null, custom_rest_days: a.custom_rest_days ?? null }, new Date())
    }).length
  , [driverUsers])

  return (
    <div className="min-h-screen p-4 max-w-6xl mx-auto">
      <Header session={session} title="Транспорт" emoji="🚗" mode="LIVE" lastUpdated={lastUpdated} />

      {/* KPI */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="glass rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-green-400 font-mono">{active}</div>
          <div className="text-[11px] text-white/40">Активных</div>
        </div>
        <div className={`glass rounded-xl p-3 text-center relative ${broken > 0 ? 'border border-red-500/30' : ''}`}>
          <div className="text-xl font-bold text-red-400 font-mono">{broken}</div>
          <div className="text-[11px] text-white/40">Сломано</div>
          {brokenStale > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center text-white font-bold">!</span>
          )}
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-amber-400 font-mono">{onMaint}</div>
          <div className="text-[11px] text-white/40">На ТО</div>
        </div>
        <div className={`glass rounded-xl p-3 text-center relative ${needsCount > 0 ? 'border border-amber-500/30' : ''}`}>
          <div className="text-xl font-bold text-amber-400 font-mono">{needsCount}</div>
          <div className="text-[11px] text-white/40">Нужен транспорт</div>
        </div>
      </div>

      {/* Fleet KPI bar */}
      {vehicles.length > 0 && (
        <div className="glass rounded-xl border border-white/8 px-5 py-3 mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-white/30 uppercase tracking-widest">Парк</span>
            <span className="text-sm">
              <span className="font-semibold text-white">{totalVehicles}</span>
              <span className="text-white/35 ml-1">ед.</span>
            </span>
            <span className="flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="font-semibold text-emerald-400">{activeCount}</span>
              <span className="text-white/35">исправных</span>
            </span>
            {maintenanceCount > 0 && (
              <span className="flex items-center gap-1.5 text-sm">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span className="font-semibold text-amber-400">{maintenanceCount}</span>
                <span className="text-white/35">в ремонте</span>
              </span>
            )}
            {brokenCount > 0 && (
              <span className="flex items-center gap-1.5 text-sm">
                <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                <span className="font-semibold text-red-400">{brokenCount}</span>
                <span className="text-white/35">неисправных</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[10px] text-white/30 uppercase tracking-widest">Водители</span>
            <span className="font-semibold text-white text-sm">{driverUsers.length}</span>
            <span className="text-white/35 text-sm">всего</span>
            <span className="text-white/15 mx-1">·</span>
            <span className="font-semibold text-blue-400 text-sm">{onDutyTodayCount}</span>
            <span className="text-white/35 text-sm">на смене</span>
          </div>
          {lastUpdated && (
            <span className="text-[10px] text-white/20 ml-2">
              обновлено {lastUpdated.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      )}

      {/* Driver stats — TRANSPORT/ADMIN only */}
      {/* {canEdit && (
        <div className="mb-4">
          <DriverStats
            drivers={driverUsers}
            vehicles={vehicles}
            date={today}
          />
        </div>
      )} */}

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setTab('fleet')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'fleet' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50'}`}
        >
          Парк машин
        </button>
        <button
          onClick={() => setTab('plan')}
          className={`relative px-4 py-2 rounded-lg text-sm font-medium ${tab === 'plan' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50'}`}
        >
          План работ
          {needsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
              {needsCount}
            </span>
          )}
        </button>
        <button
          onClick={() => { setTab('defects'); loadAllBreakdowns() }}
          className={`relative px-4 py-2 rounded-lg text-sm font-medium ${tab === 'defects' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50'}`}
        >
          Дефекты
          {openDefects > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
              {openDefects}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('drivers')}
          className={`relative px-4 py-2 rounded-lg text-sm font-medium ${tab === 'drivers' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50'}`}
        >
          Водители
          {driverUsers.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
              {driverUsers.length}
            </span>
          )}
        </button>
        <button
          onClick={handleRefresh}
          className="ml-auto px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 text-sm"
        >
          ↻
        </button>
      </div>

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
          {/* Date navigation */}
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
            onRefresh={loadData}
          />
        </div>
      )}
      {tab === 'drivers' && (
        <DriverList
          drivers={driverUsers}
          vehicles={vehicles}
          date={todayStr}
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
    </div>
  )
}
