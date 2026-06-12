'use client'
import { useState } from 'react'
import type { WorkPlan, WorkPlanWithItems, Service, AuthSession } from '@/types'
import { SERVICE_META } from '@/types'
import StatusPlanBadge from '@/components/help/StatusPlanBadge'
import CreatePlanModal from '@/components/head/CreatePlanModal'
import CancelPlanModal from '@/components/shared/CancelPlanModal'

interface Props {
  allPlans: WorkPlan[]
  pendingPlans: WorkPlanWithItems[]
  services: Service[]
  session: AuthSession
  onOpenPending: (plan: WorkPlanWithItems) => void
  onRefresh: () => void
}

type GroupKey = 'overdue' | 'old_overdue' | 'action' | 'active' | 'assigned' | 'upcoming' | 'draft' | 'done'

interface Group {
  key: GroupKey
  label: string
  icon: string
  border: string
  bg: string
  defaultOpen: boolean
}

const GROUPS: Group[] = [
  { key: 'overdue',     label: 'Просроченные',          icon: '🔴', border: 'border-red-500/40',    bg: 'bg-red-500/5',    defaultOpen: true  },
  { key: 'old_overdue', label: 'Старые просроченные',    icon: '🗄', border: 'border-white/8',       bg: 'bg-transparent',  defaultOpen: false },
  { key: 'action',      label: 'Требуют действия',       icon: '⚡', border: 'border-amber-500/40',  bg: 'bg-amber-500/5',  defaultOpen: true  },
  { key: 'active',      label: 'В работе',               icon: '▶',  border: 'border-violet-500/30', bg: 'bg-violet-500/5', defaultOpen: true  },
  { key: 'assigned',    label: 'Назначены / Готовы',     icon: '✅', border: 'border-cyan-500/30',   bg: 'bg-cyan-500/5',   defaultOpen: true  },
  { key: 'upcoming',    label: 'Предстоящие',            icon: '📅', border: 'border-white/10',      bg: 'bg-white/[0.02]', defaultOpen: false },
  { key: 'draft',       label: 'Черновики',              icon: '✏️', border: 'border-white/8',       bg: 'bg-transparent',  defaultOpen: false },
  { key: 'done',        label: 'Завершённые / Отменённые', icon: '✓', border: 'border-white/5',     bg: 'bg-transparent',  defaultOpen: false },
]

// Plans older than 14 days go to old_overdue (collapsed, gray)
const ARCHIVE_THRESHOLD_DAYS = 14

function classifyPlan(plan: WorkPlan, today: string, archiveDate: string): GroupKey {
  if (plan.status === 'CANCELLED') return 'done'
  const isOverdue = plan.plan_date < today && !['DONE', 'REDIRECTED', 'SUSPENDED', 'CANCELLED'].includes(plan.status)
  if (isOverdue) {
    return plan.plan_date < archiveDate ? 'old_overdue' : 'overdue'
  }
  switch (plan.status) {
    case 'REJECTED':        return 'action'
    case 'APPROVED':        return 'action'
    case 'FAST_TRACK':      return 'action'
    case 'IN_PROGRESS':     return 'active'
    case 'ASSIGNED':        return 'assigned'
    case 'BOSS_CONFIRMED':  return 'upcoming'
    case 'PLANNED':         return 'upcoming'
    case 'SUBMITTED':       return 'upcoming'
    case 'SUSPENDED':       return 'upcoming'
    case 'DRAFT':           return 'draft'
    case 'DONE':            return 'done'
    case 'REDIRECTED':      return 'done'
    default:                return 'upcoming'
  }
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}.${m}.${y}`
}

export default function ZamporabPlanBoard({
  allPlans, pendingPlans, services, session, onOpenPending, onRefresh,
}: Props) {
  const today = new Date().toISOString().split('T')[0]
  const archiveDate = new Date(Date.now() - ARCHIVE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  const [openGroups, setOpenGroups] = useState<Set<GroupKey>>(
    new Set(GROUPS.filter(g => g.defaultOpen).map(g => g.key))
  )
  const [showCreate, setShowCreate] = useState(false)
  const [cancelPlanId, setCancelPlanId] = useState<string | null>(null)

  const toggle = (key: GroupKey) => {
    setOpenGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const grouped: Record<GroupKey, WorkPlan[]> = {
    overdue: [], old_overdue: [], action: [], active: [], assigned: [],
    upcoming: [], draft: [], done: [],
  }
  for (const p of allPlans) {
    grouped[classifyPlan(p, today, archiveDate)].push(p)
  }

  // Sort each group by date
  for (const key of Object.keys(grouped) as GroupKey[]) {
    grouped[key].sort((a, b) => a.plan_date.localeCompare(b.plan_date))
  }

  return (
    <div className="space-y-3">
      {/* Summary row */}
      <div className="flex items-center gap-4 px-1 mb-1">
        <span className="text-sm text-white/40">
          Всего планов: <span className="text-white/70 font-medium">{allPlans.length}</span>
        </span>
        {grouped.overdue.length > 0 && (
          <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-medium">
            ⚠ {grouped.overdue.length} просроч.
          </span>
        )}
        {grouped.action.length > 0 && (
          <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
            ⚡ {grouped.action.length} действий
          </span>
        )}
        <button
          onClick={() => setShowCreate(true)}
          className="ml-auto px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
        >
          + Новый план
        </button>
      </div>

      {allPlans.length === 0 && (
        <div className="text-center py-16 text-white/25">
          <div className="text-5xl mb-3">📋</div>
          <div className="text-sm">Планов нет</div>
        </div>
      )}

      {GROUPS.map(group => {
        const plans = grouped[group.key]
        if (plans.length === 0) return null
        const isOpen = openGroups.has(group.key)
        const isOldOverdue = group.key === 'old_overdue'

        return (
          <div key={group.key} className={`rounded-xl border ${group.border} ${group.bg} overflow-hidden`}>
            {/* Group header */}
            <button
              onClick={() => toggle(group.key)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
            >
              <span className="text-base">{group.icon}</span>
              <span className={`font-medium text-sm flex-1 text-left ${isOldOverdue ? 'text-white/40' : 'text-white'}`}>
                {group.label}
              </span>
              <span className="text-xs text-white/35 bg-white/8 px-2 py-0.5 rounded-full">{plans.length}</span>
              {isOldOverdue && (
                <span className="text-[10px] text-white/25 mr-1">&gt;{ARCHIVE_THRESHOLD_DAYS}д</span>
              )}
              <span className="text-white/25 ml-1 text-xs">{isOpen ? '▲' : '▼'}</span>
            </button>

            {/* Plans list */}
            {isOpen && (
              <div className="border-t border-white/8 divide-y divide-white/5">
                {plans.map(plan => (
                  <PlanBoardCard
                    key={plan.id}
                    plan={plan}
                    services={services}
                    today={today}
                    pendingPlan={pendingPlans.find(p => p.id === plan.id)}
                    onConfirm={() => {
                      const full = pendingPlans.find(p => p.id === plan.id)
                      if (full) onOpenPending(full)
                    }}
                    onCancel={
                      plan.plan_date < today && !['DONE', 'REDIRECTED', 'CANCELLED'].includes(plan.status)
                        ? () => setCancelPlanId(plan.id)
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {showCreate && (
        <CreatePlanModal
          session={session}
          existingPlans={allPlans.filter(p => p.service_id === session.service_id)}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); onRefresh() }}
        />
      )}

      <CancelPlanModal
        planId={cancelPlanId}
        session={session}
        onClose={() => setCancelPlanId(null)}
        onCancelled={() => { setCancelPlanId(null); onRefresh() }}
      />
    </div>
  )
}

function PlanBoardCard({ plan, services, today, pendingPlan, onConfirm, onCancel }: {
  plan: WorkPlan
  services: Service[]
  today: string
  pendingPlan?: WorkPlanWithItems
  onConfirm?: () => void
  onCancel?: () => void
}) {
  const svc = services.find(s => s.service_id === plan.service_id)
  const meta = SERVICE_META[plan.service_id] ?? { emoji: '🔧', color: '#64748b' }
  const shiftEmoji = plan.shift_type === 'DAY' ? '☀️' : '🌙'
  const dateLabel = formatDate(plan.plan_date)
  const isOverdue = plan.plan_date < today && !['DONE', 'REDIRECTED', 'SUSPENDED', 'CANCELLED'].includes(plan.status)

  const canConfirm =
    plan.status === 'APPROVED' ||
    (plan.service_id === 'SRV-STR' && plan.status === 'SUBMITTED')

  return (
    <div className={`flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors ${isOverdue ? 'bg-red-500/5' : ''}`}>
      <span className="text-xl shrink-0">{meta.emoji}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-white truncate">{svc?.service_name || plan.service_id}</span>
          <span className="text-xs text-white/40">{shiftEmoji} {dateLabel}</span>
          {isOverdue && (
            <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full">⚠ просроч.</span>
          )}
          {pendingPlan && (
            <span className="text-[10px] text-white/30">{pendingPlan.items.length} поз.</span>
          )}
        </div>
        <StatusPlanBadge status={plan.status} size="xs" className="mt-0.5" />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {canConfirm && onConfirm && (
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 rounded-lg bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-medium hover:bg-emerald-600/50 transition-all"
          >
            Подтвердить →
          </button>
        )}
        {onCancel && (
          <button
            onClick={onCancel}
            title="Отменить план"
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20 text-red-400/60 text-xs hover:bg-red-500/25 hover:text-red-400 transition-all"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
