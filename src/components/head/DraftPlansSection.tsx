'use client'
import { useState } from 'react'
import type { WorkPlanWithItems, AuthSession } from '@/types'
import { submitWorkPlan } from '@/lib/api'

interface Props {
  plans: WorkPlanWithItems[]
  session: AuthSession
  onRefresh: () => void
}

const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const dd = d.getDate().toString().padStart(2, '0')
  const mm = (d.getMonth() + 1).toString().padStart(2, '0')
  return `${DAY_NAMES[d.getDay()]}, ${dd}.${mm}`
}

function scrollToPlan(planId: string) {
  const el = document.getElementById(`plan-${planId}`)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

export default function DraftPlansSection({ plans, session, onRefresh }: Props) {
  const [submitting, setSubmitting] = useState<string | null>(null)

  const drafts = plans
    .filter(p => p.status === 'DRAFT')
    .sort((a, b) => a.plan_date.localeCompare(b.plan_date))

  if (drafts.length === 0) return null

  const handleSubmit = async (planId: string) => {
    setSubmitting(planId)
    try {
      await submitWorkPlan(planId, session.user_id)
      onRefresh()
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div className="mb-4">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
        </span>
        <span className="text-xs font-medium text-amber-300/90 uppercase tracking-wider">
          Черновики · {drafts.length}
        </span>
        <span className="flex-1 h-px bg-amber-500/20" />
        <span className="text-[10px] text-white/25">не отправлены на согласование</span>
      </div>

      <div className="flex flex-col gap-2">
        {drafts.map(plan => {
          const canSubmit = plan.items.length > 0
          const isSubmitting = submitting === plan.id
          const shiftEmoji = plan.shift_type === 'DAY' ? '☀️' : '🌙'
          const shiftLabel = plan.shift_type === 'DAY' ? 'День' : 'Ночь'

          return (
            <div
              key={plan.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/25 hover:bg-amber-500/12 transition-colors"
            >
              {/* Shift icon */}
              <span className="text-xl shrink-0">{shiftEmoji}</span>

              {/* Date + shift label */}
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">{formatDate(plan.plan_date)}</div>
                <div className="text-[11px] text-white/45">{shiftLabel} · черновик</div>
              </div>

              <div className="flex-1" />

              {/* Item count badge */}
              <div className="text-center shrink-0 mr-2">
                {plan.items.length > 0 ? (
                  <>
                    <div className="text-lg font-bold text-white/80">{plan.items.length}</div>
                    <div className="text-[10px] text-white/30 leading-none">
                      {plan.items.length === 1 ? 'позиция' : plan.items.length < 5 ? 'позиции' : 'позиций'}
                    </div>
                  </>
                ) : (
                  <div className="text-[11px] text-amber-400/60 italic">нет позиций</div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => scrollToPlan(plan.id)}
                  className="px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-white/60 hover:text-white/90 text-xs transition-all"
                >
                  Редактировать ↓
                </button>
                {canSubmit && (
                  <button
                    onClick={() => handleSubmit(plan.id)}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-lg bg-green-600/80 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-semibold transition-all"
                  >
                    {isSubmitting ? '⏳...' : '↑ Отправить'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
