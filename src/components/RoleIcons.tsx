// Shared role pictograms for the whole app.
// Hard-hat colour convention (as on site):
//   рабочий — оранжевая каска
//   мастер  — белая каска
//   ИТР     — белая каска + золотой козырёк и эмблема (инженер, ранг выше)
//   бригадир — оранжевая каска со звездой (старший рабочий)

interface IconProps { className?: string }

const BODY = '#64748b' // neutral figure colour — visible on both themes
// Size comes from `className`; inline alignment is always applied so the icons
// drop into text spans cleanly across the app.
const box = (className?: string) => `inline-block shrink-0 align-[-2px] ${className ?? 'w-[18px] h-[18px]'}`

// A little worker: head + shoulders wearing a coloured hard hat.
// The figure body makes the (otherwise pale) white helmet clearly readable.
function PersonHat({ helmet, stroke, accent, star, className }: {
  helmet: string; stroke: string; accent?: string; star?: string; className?: string
}) {
  return (
    <svg viewBox="0 0 24 24" className={box(className)} aria-hidden="true">
      {/* shoulders / torso */}
      <path d="M3.5 21.5 a8.5 8.5 0 0 1 17 0 Z" fill={BODY} />
      {/* head */}
      <circle cx="12" cy="11.6" r="3.6" fill={BODY} />
      {/* helmet brim — accent colour for ИТР */}
      <rect x="6.4" y="8.2" width="11.2" height="1.9" rx="0.95" fill={accent ?? helmet} stroke={stroke} strokeWidth="0.8" />
      {/* helmet dome */}
      <path d="M8.2 8.6 a3.8 3.8 0 0 1 7.6 0 Z" fill={helmet} stroke={stroke} strokeWidth="0.8" strokeLinejoin="round" />
      {/* rank emblem on the dome (ИТР) */}
      {accent && <circle cx="12" cy="6.4" r="1.55" fill={accent} stroke="rgba(0,0,0,.3)" strokeWidth="0.5" />}
      {/* star on the dome (бригадир) */}
      {star && <path d="M12 4.4 l0.95 1.95 2.15 0.3 -1.55 1.5 0.37 2.13 -1.92 -1.0 -1.92 1.0 0.37 -2.13 -1.55 -1.5 2.15 -0.3 Z" fill={star} stroke="rgba(0,0,0,.25)" strokeWidth="0.3" />}
    </svg>
  )
}

export const WorkerIcon = ({ className }: IconProps) =>
  <PersonHat helmet="#f97316" stroke="#c2410c" className={className} />              // оранжевая каска

export const MasterIcon = ({ className }: IconProps) =>
  <PersonHat helmet="#f8fafc" stroke="#64748b" className={className} />              // белая каска

export const ItrIcon = ({ className }: IconProps) =>
  <PersonHat helmet="#f8fafc" stroke="#64748b" accent="#f59e0b" className={className} /> // белая + золотой козырёк/эмблема

export const BrigadierIcon = ({ className }: IconProps) =>
  <PersonHat helmet="#f97316" stroke="#c2410c" star="#fde047" className={className} />   // оранжевая + звезда

export const TruckIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={box(className)} aria-hidden="true">
    <path d="M1.5 6 h11 v9 H1.5 Z" fill="#64748b" />
    <path d="M12.5 9 h4 l3.5 3.2 v2.8 h-7.5 Z" fill="#94a3b8" />
    <circle cx="6" cy="16.4" r="1.9" fill="#0f172a" stroke="#64748b" strokeWidth="0.8" />
    <circle cx="16.6" cy="16.4" r="1.9" fill="#0f172a" stroke="#64748b" strokeWidth="0.8" />
  </svg>
)
