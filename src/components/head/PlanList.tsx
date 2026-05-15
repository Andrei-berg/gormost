import { useState } from 'react'
import type { WorkPlanWithItems, AuthSession, WorkPlanStatus } from '@/types'
import { WORK_PLAN_STATUS_CONFIG } from '@/types'
import PlanCard from './PlanCard'
import CancelPlanModal from '@/components/shared/CancelPlanModal'

interface Props {
  plans: WorkPlanWithItems[]
  session: AuthSession
  onRefresh: () => void
  onCreatePlan: () => void
}

type SectionKey = 'problem' | 'active' | 'execution' | 'done'

interface Section {
  key: SectionKey
  label: string
  icon: string
  border: string
  bg: string
  defaultOpen: boolean
}

const SECTIONS: Section[] = [
  { key: 'problem',   label: 'Требуют внимания',   icon: '🚨', border: 'border-red-500/40',    bg: 'bg-red-500/5',    defaultOpen: true  },
  { key: 'active',    label: 'В процессе',         icon: '📋', border: 'border-white/10',      bg: 'bg-white/[0.02]', defaultOpen: true  },
  { key: 'execution', label: 'Выполняются',        icon: '▶',  border: 'border-violet-500/30', bg: 'bg-violet-500/5', defaultOpen: true  },
  { key: 'done',      label: 'Завершённые',        icon: '✓',  border: 'border-white/5',       bg: 'bg-transparent',  defaultOpen: false },
]

function classifyPlan(plan: WorkPlanWithItems, today: string): SectionKey {
  if (plan.status === 'CANCELLED') return 'done'
  const isOverdue = plan.plan_date < today && !['DONE', 'REDIRECTED', 'SUSPENDED', 'CANCELLED'].includes(plan.status)
  if (plan.status === 'REJECTED' || isOverdue) return 'problem'
  if (plan.status === 'IN_PROGRESS' || plan.status === 'ASSIGNED' || plan.status === 'BOSS_CONFIRMED') return 'execution'
  if (plan.status === 'DONE' || plan.status === 'REDIRECTED') return 'done'
  // DRAFT, SUBMITTED, APPROVED, PLANNED, SUSPENDED, FAST_TRACK
  return 'active'
}

const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const dd = d.getDate().toString().padStart(2, '0')
  const mm = (d.getMonth() + 1).toString().padStart(2, '0')
  return `${DAY_NAMES[d.getDay()]}, ${dd}.${mm}.${d.getFullYear()}`
}

export default function PlanList({ plans, session, onRefresh, onCreatePlan }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [showRejectedWarning, setShowRejectedWarning] = useState(false)
  const [cancelPlanId, setCancelPlanId] = useState<string | null>(null)
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(
    new Set(SECTIONS.filter(s => s.defaultOpen).map(s => s.key))
  )

  const toggle = (key: SectionKey) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleCreateClick = () => {
    const hasRejected = plans.some(p => p.status === 'REJECTED')
    if (hasRejected) { setShowRejectedWarning(true); return }
    onCreatePlan()
  }

  const grouped: Record<SectionKey, WorkPlanWithItems[]> = {
    problem: [], active: [], execution: [], done: [],
  }
  for (const p of plans) {
    grouped[classifyPlan(p, today)].push(p)
  }

  // Sort each section by date ascending
  for (const key of Object.keys(grouped) as SectionKey[]) {
    grouped[key].sort((a, b) => a.plan_date.localeCompare(b.plan_date))
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider">Планы работ</h2>
        <button
          onClick={handleCreateClick}
          className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
        >
          + Новый план
        </button>
      </div>

      {showRejectedWarning && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25">
          <span className="text-xl shrink-0">⚠️</span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-amber-300 mb-1">Есть план, требующий доработки</div>
            <div className="text-xs text-amber-400/80">
              Внесите исправления в отклонённый план или удалите его перед созданием нового.
            </div>
          </div>
          <button onClick={() => setShowRejectedWarning(false)} className="text-amber-500/50 hover:text-amber-400 text-sm">✕</button>
        </div>
      )}

      {plans.length === 0 && (
        <div className="text-center py-16 text-white/25">
          <div className="text-5xl mb-3">📋</div>
          <div className="text-sm">Планов пока нет</div>
          <div className="text-xs mt-1">Создайте план работ на ближайшие смены</div>
        </div>
      )}

      <CancelPlanModal
        planId={cancelPlanId}
        session={session}
        onClose={() => setCancelPlanId(null)}
        onCancelled={() => { setCancelPlanId(null); onRefresh() }}
      />

      {SECTIONS.map(section => {
        const sectionPlans = grouped[section.key]
        if (sectionPlans.length === 0) return null
        const isOpen = openSections.has(section.key)

        // Group plans by date within section
        const byDate: Record<string, WorkPlanWithItems[]> = {}
        for (const p of sectionPlans) {
          if (!byDate[p.plan_date]) byDate[p.plan_date] = []
          byDate[p.plan_date].push(p)
        }
        const dates = Object.keys(byDate).sort()

        return (
          <div key={section.key} className={`rounded-xl border ${section.border} ${section.bg} overflow-hidden`}>
            {/* Section header */}
            <button
              onClick={() => toggle(section.key)}
              className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-white/5 transition-colors"
            >
              <span className="text-[11px] font-bold text-white/50 uppercase tracking-[0.08em]">{section.label}</span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/70">{sectionPlans.length}</span>
              <span className="flex-1" />
              <span className="text-white/25 text-xs">{isOpen ? '▲' : '▼'}</span>
            </button>

            {/* Plans grouped by date */}
            {isOpen && (
              <div className="border-t border-white/8 px-3 pb-3 pt-2 space-y-4">
                {dates.map(date => (
                  <div key={date}>
                    <h3 className="flex items-center gap-3 text-xs text-white/30 uppercase tracking-wider mb-2">
                      <span className="w-6 h-px bg-white/10 shrink-0" />
                      {formatDate(date)}
                      <span className="flex-1 h-px bg-white/10" />
                    </h3>
                    <div className="space-y-2">
                      {byDate[date]
                        .sort((a, b) => (a.shift_type === 'DAY' ? -1 : 1))
                        .map(plan => {
                          const isOverdue = plan.plan_date < today && !['DONE', 'REDIRECTED', 'CANCELLED'].includes(plan.status)
                          const canCancel = isOverdue && plan.status !== 'REJECTED'
                          return (
                            <div key={plan.id} id={`plan-${plan.id}`} className="relative">
                              <PlanCard plan={plan} session={session} onRefresh={onRefresh} />
                              {canCancel && (
                                <button
                                  onClick={() => setCancelPlanId(plan.id)}
                                  title="Отменить план"
                                  className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20 text-red-400/60 text-xs hover:bg-red-500/25 hover:text-red-400 transition-all z-10"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
