'use client'
import { useState, useEffect, useCallback } from 'react'
import type { WorkPlanWithItems, Service, AuthSession } from '@/types'
import { SERVICE_META, WORK_PLAN_STATUS_CONFIG } from '@/types'
import {
  fetchWorkPlans, fetchWorkPlanWithItems, confirmWorkPlanBoss,
} from '@/lib/api'

interface Props {
  session: AuthSession
  services: Service[]
}

export default function WorkPlansMeeting({ session, services }: Props) {
  const [plans, setPlans] = useState<WorkPlanWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    // Load PLANNED plans (confirmed by zamporab, awaiting boss meeting)
    const raw = await fetchWorkPlans({ statuses: ['PLANNED', 'BOSS_CONFIRMED'] })
    const full = await Promise.all(raw.map(p => fetchWorkPlanWithItems(p.id)))
    setPlans(full.filter(Boolean) as WorkPlanWithItems[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const pending = plans.filter(p => p.status === 'PLANNED')
  const confirmed = plans.filter(p => p.status === 'BOSS_CONFIRMED')

  const handleConfirm = async (planId: string) => {
    setConfirming(planId)
    await confirmWorkPlanBoss(planId, session.user_id)
    setConfirming(null)
    load()
  }

  const handleConfirmAll = async () => {
    setConfirming('all')
    await Promise.all(pending.map(p => confirmWorkPlanBoss(p.id, session.user_id)))
    setConfirming(null)
    load()
  }

  if (loading) return <div className="text-center text-white/30 py-12">Загрузка планов...</div>

  return (
    <div className="space-y-6">
      {/* Meeting header */}
      <div className="glass rounded-2xl p-4 border border-purple-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <div className="text-white font-bold">Совещание 16:30 — Утверждение планов</div>
              <div className="text-xs text-white/40">
                Ожидают утверждения: <span className="text-amber-400 font-medium">{pending.length}</span>
                {confirmed.length > 0 && <span className="ml-3">Утверждены: <span className="text-green-400 font-medium">{confirmed.length}</span></span>}
              </div>
            </div>
          </div>
          {pending.length > 1 && (
            <button
              onClick={handleConfirmAll}
              disabled={confirming === 'all'}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium text-sm transition-all"
            >
              {confirming === 'all' ? '...' : `✓ Утвердить все (${pending.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Pending plans */}
      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3">
            Ожидают утверждения ({pending.length})
          </h3>
          <div className="space-y-3">
            {pending.map(plan => (
              <PlanMeetingCard
                key={plan.id}
                plan={plan}
                services={services}
                onConfirm={() => handleConfirm(plan.id)}
                confirming={confirming === plan.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Already confirmed */}
      {confirmed.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-3">
            Утверждены ({confirmed.length})
          </h3>
          <div className="space-y-3">
            {confirmed.map(plan => (
              <PlanMeetingCard
                key={plan.id}
                plan={plan}
                services={services}
                onConfirm={() => {}}
                confirming={false}
                readOnly
              />
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && confirmed.length === 0 && (
        <div className="text-center text-white/20 py-16 text-sm">
          Нет планов на согласование.<br />
          Начальники служб ещё не отправили планы или зампрораб не согласовал.
        </div>
      )}
    </div>
  )
}

function PlanMeetingCard({ plan, services, onConfirm, confirming, readOnly = false }: {
  plan: WorkPlanWithItems
  services: Service[]
  onConfirm: () => void
  confirming: boolean
  readOnly?: boolean
}) {
  const svc = services.find(s => s.service_id === plan.service_id)
  const meta = SERVICE_META[plan.service_id] ?? { emoji: '🔧' }
  const statusCfg = WORK_PLAN_STATUS_CONFIG[plan.status]
  const shiftLabel = plan.shift_type === 'DAY' ? '☀️ День' : '🌙 Ночь'

  const totalWorkers = plan.items.reduce((sum, i) => sum + (i.required_workers || 0), 0)
  const totalForemen = plan.items.reduce((sum, i) => sum + (i.required_foremen || 0), 0)
  const totalVehicles = plan.items.reduce((sum, i) => sum + (i.required_vehicles || 0), 0)

  return (
    <div className={`glass rounded-xl overflow-hidden border ${
      readOnly ? 'border-purple-500/20 opacity-80' : 'border-amber-500/20'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-xl">{meta.emoji}</span>
          <div>
            <div className="text-sm font-semibold text-white">{svc?.service_name ?? plan.service_id}</div>
            <div className="text-xs text-white/40">{shiftLabel} · {plan.plan_date}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Headcount summary */}
          <div className="flex items-center gap-2 text-xs text-white/40">
            {totalWorkers > 0 && <span>👷 {totalWorkers}</span>}
            {totalForemen > 0 && <span>🦺 {totalForemen}</span>}
            {totalVehicles > 0 && <span>🚛 {totalVehicles}</span>}
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusCfg.bg}`} style={{ color: statusCfg.color }}>
            {statusCfg.label}
          </span>
          {!readOnly && (
            <button
              onClick={onConfirm}
              disabled={confirming}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium transition-all"
            >
              {confirming ? '...' : '✓ Утвердить'}
            </button>
          )}
          {readOnly && <span className="text-xs text-purple-400">✓ Утверждён</span>}
        </div>
      </div>

      {/* Items */}
      <div className="px-4 py-3 space-y-1.5">
        {plan.items.map(item => (
          <div key={item.id} className="flex items-start gap-2 text-xs">
            {item.time_start && (
              <span className="font-mono text-cyan-400 shrink-0 pt-0.5">
                {item.time_start}{item.time_end ? `–${item.time_end}` : ''}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <span className="font-medium text-white/80">{item.location}</span>
              <span className="text-white/40 mx-1">—</span>
              <span className="text-white/60">{item.work_description}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 text-white/30">
              {item.required_workers > 0 && <span>👷×{item.required_workers}</span>}
              {item.required_foremen > 0 && <span>🦺×{item.required_foremen}</span>}
              {item.required_vehicles > 0 && <span>🚛×{item.required_vehicles}</span>}
            </div>
          </div>
        ))}
        {plan.items.length === 0 && (
          <div className="text-xs text-white/20 italic">Позиции не добавлены</div>
        )}
      </div>
    </div>
  )
}
