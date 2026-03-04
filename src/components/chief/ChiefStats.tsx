import type { WorkPlan } from '@/types'

interface Props {
  plans: WorkPlan[]
}

export default function ChiefStats({ plans }: Props) {
  const submitted = plans.filter(p => p.status === 'SUBMITTED').length
  const approved  = plans.filter(p => p.status === 'APPROVED').length
  const rejected  = plans.filter(p => p.status === 'REJECTED').length
  const draft     = plans.filter(p => p.status === 'DRAFT').length
  const totalItems = plans.length

  return (
    <div className="grid grid-cols-5 gap-3 mb-4">
      <div className="glass rounded-xl p-3 text-center">
        <div className="text-xl font-bold text-white font-mono">{totalItems}</div>
        <div className="text-xs text-white/40">Всего планов</div>
      </div>
      <div className="glass rounded-xl p-3 text-center">
        <div className="text-xl font-bold text-orange-400 font-mono">{submitted}</div>
        <div className="text-xs text-white/40">На согл.</div>
      </div>
      <div className="glass rounded-xl p-3 text-center">
        <div className="text-xl font-bold text-green-400 font-mono">{approved}</div>
        <div className="text-xs text-white/40">Согласовано</div>
      </div>
      <div className="glass rounded-xl p-3 text-center">
        <div className="text-xl font-bold text-red-400 font-mono">{rejected}</div>
        <div className="text-xs text-white/40">Отклонено</div>
      </div>
      <div className="glass rounded-xl p-3 text-center">
        <div className="text-xl font-bold text-slate-400 font-mono">{draft}</div>
        <div className="text-xs text-white/40">Черновик</div>
      </div>
    </div>
  )
}
