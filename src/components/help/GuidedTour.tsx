'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'

export interface TourStep {
  target?: string          // CSS selector for spotlight (optional — null = center modal)
  title: string
  description: string
  emoji?: string
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

interface Props {
  steps: TourStep[]
  storageKey: string       // localStorage key to remember "seen"
  onComplete?: () => void
  /** If true, forces tour to show even if already seen */
  forceShow?: boolean
  trigger?: React.ReactNode // Custom trigger button (optional)
}

interface SpotlightRect {
  top: number
  left: number
  width: number
  height: number
}

const PAD = 8  // spotlight padding

function getAutoPlacement(rect: DOMRect, cardH: number, cardW: number): string {
  const spaceBottom = window.innerHeight - rect.bottom
  const spaceTop = rect.top
  const spaceRight = window.innerWidth - rect.right
  const spaceLeft = rect.left
  if (spaceBottom >= cardH + 32) return 'bottom'
  if (spaceTop >= cardH + 32) return 'top'
  if (spaceRight >= cardW + 32) return 'right'
  if (spaceLeft >= cardW + 32) return 'left'
  return 'center'
  }

export default function GuidedTour({ steps, storageKey, onComplete, forceShow, trigger }: Props) {
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null)
  const [cardPos, setCardPos] = useState({ top: 0, left: 0, placement: 'bottom' as string })
  const cardRef = useRef<HTMLDivElement>(null)
  const animFrame = useRef<number>(0)

  const currentStep = steps[step]

  // Check localStorage on mount
  useEffect(() => {
    if (forceShow) return
    const seen = localStorage.getItem(storageKey)
    if (!seen) {
      // Small delay so page renders first
      const t = setTimeout(() => setActive(true), 800)
      return () => clearTimeout(t)
    }
  }, [storageKey, forceShow])

  useEffect(() => {
    if (forceShow && !active) setActive(true)
  }, [forceShow, active])

  // Lock body scroll while tour is active
  useEffect(() => {
    if (active) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [active])

  const measureTarget = useCallback(() => {
    const s = steps[step]
    if (!s?.target) {
      setSpotlight(null)
      setCardPos({ top: window.innerHeight / 2 - 100, left: window.innerWidth / 2 - 160, placement: 'center' })
      return
    }
    const el = document.querySelector(s.target)
    if (!el) {
      setSpotlight(null)
      return
    }
    const rect = el.getBoundingClientRect()
    const sp = {
      top: rect.top - PAD,
      left: rect.left - PAD,
      width: rect.width + PAD * 2,
      height: rect.height + PAD * 2,
    }
    setSpotlight(sp)

    // Scroll element into view
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })

    // Position card
    const cardH = 220, cardW = 320
    const placement = s.position ?? getAutoPlacement(rect, cardH, cardW)
    let top = 0, left = 0

    if (placement === 'bottom') {
      top = rect.bottom + PAD + 16
      left = rect.left + rect.width / 2 - cardW / 2
    } else if (placement === 'top') {
      top = rect.top - PAD - cardH - 16
      left = rect.left + rect.width / 2 - cardW / 2
    } else if (placement === 'right') {
      top = rect.top + rect.height / 2 - cardH / 2
      left = rect.right + PAD + 16
    } else if (placement === 'left') {
      top = rect.top + rect.height / 2 - cardH / 2
      left = rect.left - cardW - PAD - 16
    } else {
      top = window.innerHeight / 2 - cardH / 2
      left = window.innerWidth / 2 - cardW / 2
    }

    left = Math.max(16, Math.min(left, window.innerWidth - cardW - 16))
    top = Math.max(16, Math.min(top, window.innerHeight - cardH - 16))
    setCardPos({ top, left, placement })
  }, [step, steps])

  useEffect(() => {
    if (!active) return
    // rAF loop so position tracks scroll/resize
    const loop = () => {
      measureTarget()
      animFrame.current = requestAnimationFrame(loop)
    }
    animFrame.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animFrame.current)
  }, [active, measureTarget])

  function handleComplete() {
    localStorage.setItem(storageKey, '1')
    setActive(false)
    setStep(0)
    onComplete?.()
  }

  function handleSkip() {
    localStorage.setItem(storageKey, '1')
    setActive(false)
    setStep(0)
  }

  function handleNext() {
    if (step < steps.length - 1) setStep(s => s + 1)
    else handleComplete()
  }

  function handlePrev() {
    if (step > 0) setStep(s => s - 1)
  }

  if (!active) {
    return trigger ? (
      <button
        onClick={() => { setStep(0); setActive(true) }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 border border-white/12 text-white/50 hover:text-white/80 text-xs transition-all"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m1.636-6.364l.707.707M6.343 17.657l.707.707m9.9 0l.707-.707M12 21v-1M12 8a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
        {typeof trigger === 'string' ? trigger : 'Обучение'}
      </button>
    ) : null
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[9990]" aria-modal aria-label="Обучение">
      {/* Dark overlay with spotlight cutout */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 9991 }}
      >
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlight && (
              <rect
                x={spotlight.left}
                y={spotlight.top}
                width={spotlight.width}
                height={spotlight.height}
                rx="10"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(0,0,0,0.78)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Spotlight border glow */}
      {spotlight && (
        <div
          className="absolute pointer-events-none rounded-xl"
          style={{
            zIndex: 9992,
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            boxShadow: '0 0 0 2px rgba(96,165,250,0.6), 0 0 24px rgba(96,165,250,0.25)',
            transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      )}

      {/* Overlay clickable background */}
      <div
        className="absolute inset-0"
        style={{ zIndex: 9992 }}
        onClick={handleSkip}
      />

      {/* Step card */}
      <div
        ref={cardRef}
        className="absolute glass-popup rounded-2xl p-5 w-80 shadow-2xl"
        style={{
          zIndex: 9993,
          top: cardPos.top,
          left: cardPos.left,
          transition: 'top 0.3s cubic-bezier(0.4,0,0.2,1), left 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-4">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-blue-400' : i < step ? 'w-1.5 bg-blue-400/40' : 'w-1.5 bg-white/15'
              }`}
            />
          ))}
          <span className="ml-auto text-[10px] text-white/30">{step + 1} / {steps.length}</span>
        </div>

        {/* Content */}
        <div className="flex items-start gap-3 mb-4">
          {currentStep.emoji && (
            <span className="text-2xl flex-shrink-0">{currentStep.emoji}</span>
          )}
          <div>
            <h3 className="text-sm font-bold text-white leading-snug mb-1">{currentStep.title}</h3>
            <p className="text-xs text-white/60 leading-relaxed">{currentStep.description}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 pt-3 border-t border-white/8">
          <button
            onClick={handleSkip}
            className="text-xs text-white/30 hover:text-white/60 transition-colors px-1 py-1"
          >
            Пропустить
          </button>

          <div className="flex gap-2 ml-auto">
            {step > 0 && (
              <button
                onClick={handlePrev}
                className="px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/12 border border-white/10 text-white/70 text-xs transition-all"
              >
                ← Назад
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-4 py-1.5 rounded-lg bg-blue-600/40 hover:bg-blue-600/60 border border-blue-500/30 text-blue-200 text-xs font-semibold transition-all"
            >
              {step === steps.length - 1 ? '✓ Готово' : 'Далее →'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
