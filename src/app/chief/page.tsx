'use client'
import { useState, useEffect, useCallback } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import { fetchWorkPlans, fetchWorkPlanWithItems, fetchServices } from '@/lib/api'
import type { WorkPlanWithItems, WorkPlanStatus, Service, AuthSession } from '@/types'
import ChiefStats from '@/components/chief/ChiefStats'
import ChiefPlanCard from '@/components/chief/ChiefPlanCard'

export default function ChiefPage() {
  return (
    <AuthGuard roles={['CHIEF_ENGINEER', 'ADMIN', 'BOSS']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}

const DAY_NAMES = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']
const STATUS_TABS: Array<{ key: WorkPlanStatus | 'ALL'; label: string }> = [
  { key: 'SUBMITTED', label: 'На согласовании' },
  { key: 'APPROVED',  label: 'Согласованы' },
  { key: 'ALL',       label: 'Все' },
]

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const dd = d.getDate().toString().padStart(2, '0')
  const mm = (d.getMonth() + 1).toString().padStart(2, '0')
  return `${DAY_NAMES[d.getDay()]}, ${dd}.${mm}.${d.getFullYear()}`
}

function Content({ session }: { session: AuthSession }) {
  const [plans, setPlans] = useState<WorkPlanWithItems[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [filter, setFilter] = useState<WorkPlanStatus | 'ALL'>('SUBMITTED')

  const loadData = useCallback(async () => {
    const [raw, svcs] = await Promise.all([fetchWorkPlans(), fetchServices()])
    setServices(svcs)
    const withItems = await Promise.all(raw.map(p => fetchWorkPlanWithItems(p.id)))
    setPlans(withItems.filter(Boolean) as WorkPlanWithItems[])
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const visible = filter === 'ALL' ? plans : plans.filter(p => p.status === filter)

  // Group by date, sorted ascending (nearest first)
  const grouped = visible.reduce<Record<string, WorkPlanWithItems[]>>((acc, p) => {
    if (!acc[p.plan_date]) acc[p.plan_date] = []
    acc[p.plan_date].push(p)
    return acc
  }, {})
  const dates = Object.keys(grouped).sort()

  return (
    <div className="min-h-screen p-4 max-w-[1400px] mx-auto">
      <Header session={session} title="Главный инженер" emoji="🔧" mode="PLANNING" />

      <ChiefStats plans={plans} />

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-4">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${
              filter === tab.key
                ? 'bg-orange-600 text-white font-medium'
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
            }`}
          >
            {tab.label}
            {tab.key !== 'ALL' && (
              <span className="ml-1.5 text-xs opacity-70">
                {plans.filter(p => p.status === tab.key).length}
              </span>
            )}
          </button>
        ))}
        <button
          onClick={loadData}
          className="ml-auto px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 text-sm"
        >
          ↻
        </button>
      </div>

      {/* Plan list grouped by date */}
      {dates.length === 0 && (
        <div className="text-center py-16 text-white/30">
          <div className="text-5xl mb-3">📋</div>
          <div className="text-sm">
            {filter === 'SUBMITTED' ? 'Нет планов на согласовании' : 'Нет планов'}
          </div>
        </div>
      )}

      <div className="space-y-8">
        {dates.map(date => (
          <div key={date}>
            <h3 className="flex items-center gap-3 text-xs text-white/40 uppercase tracking-wider mb-3">
              <span className="w-8 h-px bg-white/10 shrink-0" />
              {formatDate(date)}
              <span className="flex-1 h-px bg-white/10" />
            </h3>
            <div className="space-y-3">
              {grouped[date]
                .sort((a, b) => (a.shift_type === 'DAY' ? -1 : 1))
                .map(plan => (
                  <ChiefPlanCard
                    key={plan.id}
                    plan={plan}
                    session={session}
                    services={services}
                    onRefresh={loadData}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
