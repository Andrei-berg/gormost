// Shared, app-wide badge that foregrounds a vehicle's GARAGE (fleet) number —
// the dispatcher/master's primary vehicle identifier. The number is rendered
// bold/mono in amber so it «бросается в глаза» everywhere transport appears
// (journal, наряд, plans, transport panel, brigades, boss meeting). Plate, when
// given, is shown small and muted as a secondary id.

interface Props {
  number?: string | null   // garage / fleet number (335, 533с, …)
  plate?: string | null    // license plate (secondary)
  size?: 'sm' | 'md'
  className?: string
}

export default function VehicleNumberBadge({ number, plate, size = 'md', className = '' }: Props) {
  const hasNum = !!number && number.trim() !== ''
  if (!hasNum && !plate) return null

  const numText = size === 'sm' ? 'text-xs' : 'text-sm'
  return (
    <span
      className={`inline-flex items-baseline gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 leading-none ${className}`}
      title={hasNum ? (plate ? `гаражный №${number} · ${plate}` : `гаражный №${number}`) : (plate ?? '')}
    >
      {hasNum ? (
        <>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-500/70">№</span>
          <span className={`font-mono font-bold text-amber-300 ${numText}`}>{number}</span>
        </>
      ) : (
        <span className={`font-mono font-bold text-amber-300 ${numText}`}>{plate}</span>
      )}
      {hasNum && plate && <span className="font-mono text-[10px] text-amber-200/40">{plate}</span>}
    </span>
  )
}
