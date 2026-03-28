'use client'
import { useState, useRef, useEffect } from 'react'

interface Props {
  text: string
  title?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  size?: 'sm' | 'md'
  className?: string
}

export default function HelpTooltip({ text, title, position = 'top', size = 'sm', className = '' }: Props) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!visible || !triggerRef.current || !tooltipRef.current) return
    const tr = triggerRef.current.getBoundingClientRect()
    const tt = tooltipRef.current.getBoundingClientRect()
    const gap = 10
    let top = 0, left = 0

    if (position === 'top') {
      top = tr.top - tt.height - gap + window.scrollY
      left = tr.left + tr.width / 2 - tt.width / 2 + window.scrollX
    } else if (position === 'bottom') {
      top = tr.bottom + gap + window.scrollY
      left = tr.left + tr.width / 2 - tt.width / 2 + window.scrollX
    } else if (position === 'left') {
      top = tr.top + tr.height / 2 - tt.height / 2 + window.scrollY
      left = tr.left - tt.width - gap + window.scrollX
    } else {
      top = tr.top + tr.height / 2 - tt.height / 2 + window.scrollY
      left = tr.right + gap + window.scrollX
    }

    // Clamp to viewport
    left = Math.max(8, Math.min(left, window.innerWidth - tt.width - 8))
    top = Math.max(8, top)
    setCoords({ top, left })
  }, [visible, position])

  const btnSize = size === 'sm' ? 'w-4 h-4 text-[10px]' : 'w-5 h-5 text-xs'

  return (
    <span className={`inline-flex items-center ${className}`}>
      <button
        ref={triggerRef}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className={`${btnSize} rounded-full border border-white/20 bg-white/8 text-white/40 hover:border-blue-400/50 hover:text-blue-300 hover:bg-blue-500/10 transition-all flex items-center justify-center font-bold leading-none flex-shrink-0`}
        aria-label="Справка"
        type="button"
      >
        ?
      </button>

      {visible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          style={{ position: 'fixed', top: coords.top, left: coords.left, zIndex: 9999 }}
          className="w-64 glass-popup rounded-xl p-3 pointer-events-none"
        >
          {/* Arrow */}
          <div className={`absolute w-2 h-2 rotate-45 bg-[rgba(8,12,28,0.96)] border border-white/18
            ${position === 'bottom' ? '-top-1 left-1/2 -translate-x-1/2 border-b-0 border-r-0' : ''}
            ${position === 'top' ? '-bottom-1 left-1/2 -translate-x-1/2 border-t-0 border-l-0' : ''}
            ${position === 'right' ? '-left-1 top-1/2 -translate-y-1/2 border-t-0 border-r-0' : ''}
            ${position === 'left' ? '-right-1 top-1/2 -translate-y-1/2 border-b-0 border-l-0' : ''}
          `} />
          {title && (
            <div className="text-xs font-semibold text-blue-300 mb-1">{title}</div>
          )}
          <p className="text-xs text-white/75 leading-relaxed">{text}</p>
        </div>
      )}
    </span>
  )
}
