'use client'
import { useState, useEffect, useCallback } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import { fetchWorkPlans, fetchWorkPlanWithItems } from '@/lib/api'
import type { WorkPlanWithItems, WorkPlan, AuthSession } from '@/types'
import ServiceStats from '@/components/head/ServiceStats'
import PlanList from '@/components/head/PlanList'
import CreatePlanModal from '@/components/head/CreatePlanModal'
import StaffBoard from '@/components/head/StaffBoard'

export default function HeadPage() {
  return (
    <AuthGuard roles={['HEAD', 'ADMIN', 'BOSS']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}

function Content({ session }: { session: AuthSession }) {
  const [plans, setPlans] = useState<WorkPlanWithItems[]>([])
  const [rawPlans, setRawPlans] = useState<WorkPlan[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [tab, setTab] = useState<'plans' | 'staff'>('plans')

  const loadData = useCallback(async () => {
    const raw = await fetchWorkPlans({ serviceId: session.service_id ?? undefined })
    setRawPlans(raw)
    const withItems = await Promise.all(raw.map(p => fetchWorkPlanWithItems(p.id)))
    setPlans(withItems.filter(Boolean) as WorkPlanWithItems[])
  }, [session.service_id])

  useEffect(() => { loadData() }, [loadData])

  return (
    <div className="min-h-screen p-4 max-w-[1400px] mx-auto">
      <Header session={session} title="Начальник службы" emoji="🏢" mode="PLANNING" />
      <ServiceStats plans={plans} />

      {/* Tab switcher */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setTab('plans')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'plans' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
        >
          📋 Планы работ
        </button>
        <button
          onClick={() => setTab('staff')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'staff' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
        >
          👷 Состав смены
        </button>
        <button onClick={loadData} className="ml-auto px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 text-sm">↻</button>
      </div>

      {tab === 'plans' ? (
        <>
          <PlanList
            plans={plans}
            session={session}
            onRefresh={loadData}
            onCreatePlan={() => setShowCreate(true)}
          />
          {showCreate && (
            <CreatePlanModal
              session={session}
              existingPlans={rawPlans}
              onClose={() => setShowCreate(false)}
              onSaved={loadData}
            />
          )}
        </>
      ) : (
        <StaffBoard serviceId={session.service_id ?? ''} />
      )}
    </div>
  )
}
