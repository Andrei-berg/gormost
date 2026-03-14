'use client'
import { useState, useEffect, useCallback } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import FleetBoard from '@/components/transport/FleetBoard'
import PlanTransport, { type PlanGroup } from '@/components/transport/PlanTransport'
import BreakdownJournal from '@/components/transport/BreakdownJournal'
import DriverStats from '@/components/transport/DriverStats'
import {
  fetchVehiclesWithDayAssignments,
  fetchVehicles,
  fetchWorkPlans,
  fetchItemsWithVehicles,
  fetchOpenBreakdowns,
  fetchVehicleBreakdowns,
  fetchDriverUsers,
} from '@/lib/api'
import type {
  AuthSession, VehicleWithAssignments, VehicleBreakdownWithVehicle, User,
} from '@/types'

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
  const [driverUsers, setDriverUsers] = useState<User[]>([])
  const [tab, setTab]                 = useState<'fleet' | 'plan' | 'defects'>('fleet')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const today   = new Date().toISOString().slice(0, 10)
  const canEdit = ['TRANSPORT', 'ADMIN'].includes(session.role_level)

  const loadData = useCallback(async () => {
    const [veh, approvedPlans, bd, drivers] = await Promise.all([
      fetchVehiclesWithDayAssignments(today),
      fetchWorkPlans({ planDate: today, status: 'APPROVED' }),
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
    setDriverUsers(drivers as User[])
    setLastUpdated(new Date())
  }, [today])

  // When switching to defects tab — load full history (not just open)
  const loadAllBreakdowns = useCallback(async () => {
    const bd = await fetchVehicleBreakdowns()
    setBreakdowns(bd)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleRefresh = () => {
    if (tab === 'defects') {
      loadAllBreakdowns()
    } else {
      loadData()
    }
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

  const allItems         = plans.flatMap(p => p.items)
  const needsCount       = allItems.filter(i =>
    i.vehicles.length === 0 || i.vehicles.some(v => v.status === 'BROKEN')
  ).length
  const vehiclesAssigned = allItems.filter(i => i.vehicles.length > 0 && !i.vehicles.some(v => v.status === 'BROKEN')).length

  const openDefects = breakdowns.filter(b => b.status === 'OPEN').length

  // All vehicles (flat, for breakdown form)
  const allVehicles = vehicles

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

      {/* Driver stats — only for TRANSPORT/ADMIN */}
      {canEdit && (
        <div className="mb-4">
          <DriverStats
            drivers={driverUsers}
            vehiclesAssignedCount={vehiclesAssigned}
          />
        </div>
      )}

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
          onClick={handleRefresh}
          className="ml-auto px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 text-sm"
        >
          ↻
        </button>
      </div>

      {tab === 'fleet' && (
        <FleetBoard
          vehicles={vehicles}
          drivers={driverUsers as import('@/types').User[]}
          canEdit={canEdit}
          onRefresh={loadData}
        />
      )}
      {tab === 'plan' && (
        <PlanTransport
          plans={plans}
          activeVehicles={vehicles.filter(v => v.status === 'ACTIVE')}
          userId={session.user_id}
          onRefresh={loadData}
        />
      )}
      {tab === 'defects' && (
        <BreakdownJournal
          breakdowns={breakdowns}
          vehicles={allVehicles}
          currentUser={{ ...session, is_active: true } as unknown as import('@/types').User}
          canEdit={canEdit}
          onRefresh={loadAllBreakdowns}
        />
      )}
    </div>
  )
}
