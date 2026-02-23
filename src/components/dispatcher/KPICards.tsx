interface Props {
  total: number
  inProgress: number
  done: number
  critical: number
}

export default function KPICards({ total, inProgress, done, critical }: Props) {
  return (
    <div className="grid grid-cols-4 gap-3 mb-4">
      <KPICard label="Всего заявок" value={total} color="text-white" />
      <KPICard label="В работе" value={inProgress} color="text-violet-400" />
      <KPICard label="Выполнено" value={done} color="text-green-400" />
      <KPICard label="Критические" value={critical} color="text-red-400" />
    </div>
  )
}

function KPICard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="text-xs text-white/40 mb-1">{label}</div>
      <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
    </div>
  )
}
