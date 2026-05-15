import type { WorkPlan } from '@/types'

interface Props {
  plans: WorkPlan[]
}

export default function ChiefStats({ plans }: Props) {
  const submitted = plans.filter(p => p.status === 'SUBMITTED').length
  const approved  = plans.filter(p => p.status === 'APPROVED').length
  const rejected  = plans.filter(p => p.status === 'REJECTED').length
  const draft     = plans.filter(p => p.status === 'DRAFT').length
  const total = plans.length
  const pct = total > 0 ? Math.round(approved / total * 100) : 0

  return (
    <div className="grid grid-cols-5 gap-2.5 mb-4">
      <KpiCard
        label="Всего планов"
        value={total}
        delta="за сегодня"
        valueColor="text-white"
      />
      <KpiCard
        label="На согласовании"
        value={submitted}
        delta="требуют решения"
        valueColor="text-[#F0A500]"
        amber
        pulse
      />
      <KpiCard
        label="Согласовано"
        value={approved}
        delta={total > 0 ? `${pct}% плана` : '·'}
        valueColor="text-[#3FB950]"
      />
      <KpiCard
        label="Отклонено"
        value={rejected}
        delta="·"
        valueColor={rejected > 0 ? 'text-red-400' : 'text-white/35'}
      />
      <KpiCard
        label="Черновик"
        value={draft}
        delta="ожидают подачи"
        valueColor={draft > 0 ? 'text-white/70' : 'text-white/35'}
      />
    </div>
  )
}

function KpiCard({ label, value, delta, valueColor, amber, pulse }: {
  label: string
  value: number
  delta: string
  valueColor: string
  amber?: boolean
  pulse?: boolean
}) {
  return (
    <div
      className="glass rounded-[14px] p-4 relative"
      style={amber ? { background: 'rgba(240,165,0,0.06)', borderColor: 'rgba(240,165,0,0.30)' } : undefined}
    >
      <div className="flex items-center gap-1.5 text-[10.5px] text-white/40 uppercase tracking-[0.06em] font-semibold mb-1.5">
        {pulse && (
          <span className="inline-block w-2 h-2 rounded-full bg-[#F0A500] animate-pulse shrink-0" />
        )}
        {label}
      </div>
      <div className={`font-mono text-[30px] font-bold leading-[1.05] tabular-nums ${valueColor}`}>
        {value}
      </div>
      <div className="font-mono text-[11px] text-white/40 mt-1.5">{delta}</div>
    </div>
  )
}
