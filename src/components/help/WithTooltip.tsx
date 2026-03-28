'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  tip: string
  title?: string
  children: React.ReactNode
  delay?: number          // ms before showing (default 400)
  maxWidth?: number       // tooltip max-width in px (default 240)
}

export default function WithTooltip({ tip, title, children, delay = 400, maxWidth = 190 }: Props) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, placement: 'top' as 'top' | 'bottom' })
  const wrapRef = useRef<HTMLSpanElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const compute = useCallback(() => {
    if (!wrapRef.current) return
    const r = wrapRef.current.getBoundingClientRect()
    const gap = 6
    const tipH = title ? 48 : 32
    const spaceAbove = r.top
    const placement = spaceAbove >= tipH + gap + 16 ? 'top' : 'bottom'
    const top = placement === 'top'
      ? r.top - tipH - gap + window.scrollY
      : r.bottom + gap + window.scrollY
    let left = r.left + r.width / 2 - maxWidth / 2 + window.scrollX
    left = Math.max(8, Math.min(left, window.innerWidth - maxWidth - 8))
    setPos({ top, left, placement })
  }, [maxWidth, title])

  function show() {
    timerRef.current = setTimeout(() => {
      compute()
      setVisible(true)
    }, delay)
  }

  function hide() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }

  return (
    <span
      ref={wrapRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      className="inline-flex"
      style={{ cursor: 'default' }}
    >
      {children}

      {mounted && visible && createPortal(
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            top: pos.top,
            left: pos.left,
            width: maxWidth,
            zIndex: 9998,
            pointerEvents: 'none',
          }}
          className="glass-popup rounded-lg px-2.5 py-1.5 shadow-lg"
        >
          {/* Arrow */}
          <div
            className="absolute w-1.5 h-1.5 rotate-45 bg-[rgba(8,12,28,0.96)] border border-white/18 left-1/2 -translate-x-1/2"
            style={pos.placement === 'top'
              ? { bottom: -4, borderTop: 'none', borderLeft: 'none' }
              : { top: -4, borderBottom: 'none', borderRight: 'none' }
            }
          />
          {title && (
            <div className="text-[10px] font-semibold text-blue-300 mb-0.5 leading-tight">{title}</div>
          )}
          <p className="text-[10px] text-white/70 leading-snug">{tip}</p>
        </div>,
        document.body
      )}
    </span>
  )
}
