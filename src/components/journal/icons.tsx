// Journal re-exports the shared role pictograms + a compact "состав" readout.
import { WorkerIcon, MasterIcon, ItrIcon, TruckIcon } from '@/components/RoleIcons'

export { WorkerIcon, MasterIcon, ItrIcon, TruckIcon } from '@/components/RoleIcons'

// Compact "состав" readout: icon + number per role, zeros hidden.
export function Counts({ workers, masters, itr, vehicles, className = '' }: {
  workers: number; masters: number; itr: number; vehicles: number; className?: string
}) {
  const cell = (icon: React.ReactNode, n: number, title: string) =>
    n > 0 && (
      <span className="inline-flex items-center gap-0.5" title={title}>
        {icon}<span className="font-mono">{n}</span>
      </span>
    )
  const ic = 'w-3.5 h-3.5'
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {cell(<WorkerIcon className={ic} />, workers, 'Рабочие')}
      {cell(<MasterIcon className={ic} />, masters, 'Мастера')}
      {cell(<ItrIcon className={ic} />, itr, 'ИТР')}
      {cell(<TruckIcon className={ic} />, vehicles, 'Техника')}
    </span>
  )
}
