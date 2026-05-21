'use client'
import type { PanelConfig } from '@/types'

interface Props {
  panel: PanelConfig
  status?: 'live' | 'warn' | 'crit'
  pill?: string
  accentColor?: string
  isLight: boolean
  disabled?: boolean
  onClick: () => void
}

export default function PanelCard({ panel, status, pill, accentColor = '#F0A500', isLight, disabled, onClick }: Props) {
  const color = accentColor

  const borderColor = status === 'warn'
    ? 'rgba(240,165,0,0.30)'
    : status === 'crit'
    ? 'rgba(248,81,73,0.25)'
    : status === 'live'
    ? 'rgba(63,185,80,0.30)'
    : undefined

  const cardBg = status === 'crit' && !isLight
    ? 'linear-gradient(135deg, rgba(248,81,73,0.07), rgba(255,255,255,0.06))'
    : undefined

  const pillCls =
    status === 'crit'
      ? 'bg-red-500/14 border border-red-500/35 text-red-400'
      : status === 'warn'
      ? 'bg-amber-500/14 border border-amber-500/30 text-amber-400'
      : 'bg-green-500/14 border border-green-500/35 text-green-400'

  if (disabled) {
    return (
      <div
        className="glass rounded-2xl p-[22px] flex flex-col gap-3.5 min-h-[180px] opacity-35 pointer-events-none"
        style={{ borderColor: borderColor ?? undefined }}
      >
        <CardBody panel={panel} status={status} pill={pill} pillCls={pillCls} color={color} isLight={isLight} disabled />
      </div>
    )
  }

  return (
    <div
      className="home-panel-card glass rounded-2xl p-[22px] flex flex-col gap-3.5 cursor-pointer min-h-[180px]"
      onClick={onClick}
      style={{
        borderColor: borderColor ?? undefined,
        background: cardBg ?? undefined,
        borderTopColor: isLight ? color : undefined,
        borderTopWidth: isLight ? '2px' : undefined,
      }}
    >
      <CardBody panel={panel} status={status} pill={pill} pillCls={pillCls} color={color} isLight={isLight} />
    </div>
  )
}

function CardBody({ panel, status, pill, pillCls, color, isLight, disabled }: {
  panel: PanelConfig
  status?: 'live' | 'warn' | 'crit'
  pill?: string
  pillCls: string
  color: string
  isLight: boolean
  disabled?: boolean
}) {
  return (
    <>
      {/* Top row: emoji + status dot */}
      <div className="flex items-start justify-between">
        <span className="text-[44px] leading-none">{panel.emoji}</span>
        <div className="flex items-center gap-2 mt-1.5">
          {status === 'live' && (
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <div className="live-ring absolute inset-[-5px] rounded-full bg-green-500 opacity-30" />
            </div>
          )}
          {status === 'warn' && <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#F0A500' }} />}
          {status === 'crit' && <div className="w-2.5 h-2.5 rounded-full bg-red-500" />}
          {disabled && (
            <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11h14v10H5zM8 11V7a4 4 0 118 0v4" />
            </svg>
          )}
        </div>
      </div>

      {/* Title + desc */}
      <div>
        <div className="text-[18px] font-bold leading-tight tracking-tight" style={{ letterSpacing: '-0.01em' }}>
          {panel.title}
        </div>
        <div className="text-[12.5px] mt-1 leading-[1.45]"
          style={{ color: isLight ? 'rgba(50,51,56,0.55)' : 'rgba(255,255,255,0.55)' }}>
          {panel.subtitle}
        </div>
      </div>

      {/* Footer: role + pill + arrow */}
      <div className="mt-auto flex items-end justify-between gap-2">
        <div>
          <div className="text-[11px]" style={{ color: isLight ? 'rgba(50,51,56,0.40)' : 'rgba(255,255,255,0.40)' }}>
            {panel.roleLabel}
          </div>
          {pill && (
            <div className="mt-1.5">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${pillCls}`}>
                {pill}
              </span>
            </div>
          )}
        </div>
        <div
          className="panel-arrow w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ background: `rgba(${hexToRgb(color)},0.12)`, border: `1px solid rgba(${hexToRgb(color)},0.30)`, color }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </div>
      </div>
    </>
  )
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  const n = parseInt(h, 16)
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
}
