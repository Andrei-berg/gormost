import type { WorkPlanWithItems } from '@/types'

interface Props {
  plans: WorkPlanWithItems[]
}

function KpiCard({ label, value, color, delta, muted }: {
  label: string; value: number; color: string; delta: string; muted?: boolean
}) {
  return (
    <div className={`glass rounded-xl px-4 py-3 ${muted ? 'opacity-70' : ''}`}>
      <div className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.06em]">{label}</div>
      <div className={`font-mono text-[28px] font-bold leading-[1.05] mt-1.5 ${color}`}>{value}</div>
      <div className="text-[11px] text-white/30 mt-1.5 font-mono">{delta}</div>
    </div>
  )
}

export default function ServiceStats({ plans }: Props) {
  const total     = plans.length
  const drafts    = plans.filter(p => p.status === 'DRAFT' || p.status === 'REJECTED').length
  const submitted = plans.filter(p => p.status === 'SUBMITTED').length
  const approved  = plans.filter(p => ['APPROVED', 'PLANNED', 'BOSS_CONFIRMED'].includes(p.status)).length
  const totalItems = plans.reduce((sum, p) => sum + p.items.length, 0)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
      <KpiCard label="Всего планов"  value={total}     color="text-white"         delta="в системе" />
      <KpiCard label="Черновик"      value={drafts}    color="text-white/55"      delta="требуют действий" muted />
      <KpiCard label="На согл."      value={submitted} color="text-white/55"      delta="у гл. инженера"   muted />
      <KpiCard label="Согласовано"   value={approved}  color="text-white/55"      delta="к выполнению"     muted />
      <KpiCard label="Позиций"       value={totalItems} color="text-[#5DA8FF]"   delta="в активных планах" />
    </div>
  )
}
