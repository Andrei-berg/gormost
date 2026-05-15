'use client'
import type { WorkPlan, WorkPlanWithItems, Service } from '@/types'
import { SERVICE_META } from '@/types'

interface Props {
  allPlans: WorkPlan[]
  pendingPlans: WorkPlanWithItems[]
  services: Service[]
}

function isOverdue(dateStr: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(dateStr) < today
}

export default function PlanStats({ allPlans, pendingPlans, services }: Props) {
  const total = allPlans.length
  const awaiting = pendingPlans.length
  const overdueCount = pendingPlans.filter(p => isOverdue(p.plan_date)).length
  const approvedByMe = allPlans.filter(p => p.zamporab_approved_by != null).length
  const inProgress = allPlans.filter(p => p.status === 'IN_PROGRESS').length
  const done = allPlans.filter(p => p.status === 'DONE').length

  return (
    <div className="space-y-2.5 mb-4">
      {/* KPI strip — 5 cards */}
      <div className="grid grid-cols-5 gap-2.5">
        <div className="glass rounded-2xl px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">Всего планов</div>
          <div className="font-mono text-[30px] font-bold leading-none text-white tabular-nums">{total}</div>
          <div className="font-mono text-[11px] text-white/35 mt-1">все службы</div>
        </div>

        <div
          className="glass rounded-2xl px-4 py-3 border"
          style={{ background: 'rgba(240,165,0,0.06)', borderColor: 'rgba(240,165,0,0.40)' }}
        >
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(240,165,0,0.6)]" />
            Ждут согл.
          </div>
          <div className="font-mono text-[30px] font-bold leading-none text-amber-400 tabular-nums">{awaiting}</div>
          <div className="font-mono text-[11px] text-white/35 mt-1">
            {overdueCount > 0 ? `${overdueCount} просрочено` : 'нет просрочек'}
          </div>
        </div>

        <div className="glass rounded-2xl px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">Согласовано</div>
          <div className="font-mono text-[30px] font-bold leading-none text-emerald-400 tabular-nums">{approvedByMe}</div>
          <div className="font-mono text-[11px] text-white/35 mt-1">за смену</div>
        </div>

        <div className="glass rounded-2xl px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">В работе</div>
          <div className="font-mono text-[30px] font-bold leading-none text-violet-400 tabular-nums">{inProgress}</div>
          <div className="font-mono text-[11px] text-white/35 mt-1">из них планов</div>
        </div>

        <div className="glass rounded-2xl px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">Выполнено</div>
          <div
            className="font-mono text-[30px] font-bold leading-none tabular-nums"
            style={{ color: 'rgba(63,185,80,0.8)' }}
          >
            {done}
          </div>
          <div className="font-mono text-[11px] text-white/35 mt-1">
            {total > 0 ? `${Math.round(done / total * 100)}% плана` : '—'}
          </div>
        </div>
      </div>

      {/* Service grid — 3 columns */}
      <div className="grid grid-cols-3 gap-2.5">
        {services.map(svc => {
          const meta = SERVICE_META[svc.service_id]
          const svcPlans = allPlans.filter(p => p.service_id === svc.service_id)
          const svcDone = svcPlans.filter(p => p.status === 'DONE').length
          const pct = svcPlans.length > 0 ? Math.round(svcDone / svcPlans.length * 100) : 0
          const svcPending = pendingPlans.filter(p => p.service_id === svc.service_id).length

          return (
            <div
              key={svc.service_id}
              className="glass rounded-2xl px-4 py-3 relative overflow-hidden transition-all hover:border-white/20"
              style={svcPlans.length === 0 ? { opacity: 0.45 } : {}}
            >
              {/* Left color accent bar */}
              <div
                className="absolute left-0 top-0 bottom-0 w-[3px]"
                style={{ background: meta?.color ?? 'transparent', borderRadius: '16px 0 0 16px' }}
              />

              <div className="flex items-center gap-2 mb-2">
                <span className="text-[18px]">{meta?.emoji ?? '📋'}</span>
                <span className="text-[12px] font-semibold text-white leading-tight truncate">{svc.service_name}</span>
              </div>

              <div className="flex items-end gap-2 mb-2">
                <span
                  className="font-mono text-[26px] font-bold leading-none tabular-nums"
                  style={{ color: svcPlans.length > 0 ? (meta?.color ?? '#fff') : 'rgba(255,255,255,0.25)' }}
                >
                  {svcPlans.length}
                </span>
                <span className="font-mono text-[10px] text-white/35 mb-0.5">
                  {svcPlans.length > 0 ? `планов · ${pct}%` : 'планов'}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: meta?.color ?? 'rgba(255,255,255,0.4)' }}
                />
              </div>

              {/* Status label */}
              {svcPlans.length === 0 ? (
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  <span className="font-mono text-[11px] text-white/25">нет планов</span>
                </div>
              ) : svcPending > 0 ? (
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(240,165,0,0.6)]" />
                  <span className="font-mono text-[11px] text-amber-400">на согласовании {svcPending}</span>
                </div>
              ) : pct === 100 ? (
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="font-mono text-[11px] text-emerald-400">100% готово</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta?.color ?? '#fff' }} />
                  <span className="font-mono text-[11px] text-white/45">{svcDone}/{svcPlans.length} выполнено</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
