import type { WorkPlanWithItems, AuthSession } from '@/types'
import PlanCard from './PlanCard'

interface Props {
  plans: WorkPlanWithItems[]
  session: AuthSession
  onRefresh: () => void
  onCreatePlan: () => void
}

const DAY_NAMES = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const dd = d.getDate().toString().padStart(2, '0')
  const mm = (d.getMonth() + 1).toString().padStart(2, '0')
  return `${DAY_NAMES[d.getDay()]}, ${dd}.${mm}.${d.getFullYear()}`
}

export default function PlanList({ plans, session, onRefresh, onCreatePlan }: Props) {
  const grouped = plans.reduce<Record<string, WorkPlanWithItems[]>>((acc, p) => {
    if (!acc[p.plan_date]) acc[p.plan_date] = []
    acc[p.plan_date].push(p)
    return acc
  }, {})

  const dates = Object.keys(grouped).sort()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider">Планы работ</h2>
        <button
          onClick={onCreatePlan}
          className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
        >
          + Новый план
        </button>
      </div>

      {dates.length === 0 && (
        <div className="text-center py-16 text-white/30">
          <div className="text-5xl mb-3">📋</div>
          <div className="text-sm">Планов пока нет</div>
          <div className="text-xs mt-1">Создайте план работ на ближайшие смены</div>
        </div>
      )}

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
                <PlanCard key={plan.id} plan={plan} session={session} onRefresh={onRefresh} />
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
