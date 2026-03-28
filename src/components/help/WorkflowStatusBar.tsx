'use client'
import type { WorkPlanStatus } from '@/types'

interface StatusStep {
  status: WorkPlanStatus
  label: string
  emoji: string
  role: string
  hint: string
}

const STEPS: StatusStep[] = [
  { status: 'DRAFT',          label: 'Черновик',       emoji: '📝', role: 'Нач. службы',  hint: 'Создайте план работ до 16:00' },
  { status: 'SUBMITTED',      label: 'На согласовании', emoji: '📤', role: 'Нач. службы',  hint: 'Отправлен на проверку ГИ' },
  { status: 'APPROVED',       label: 'Одобрен ГИ',     emoji: '✅', role: 'ГИ',           hint: 'Главный инженер одобрил план' },
  { status: 'PLANNED',        label: 'Запланирован',   emoji: '📋', role: 'Замзам',       hint: 'Замзам подтвердил перечень работ' },
  { status: 'BOSS_CONFIRMED', label: 'Утверждён',      emoji: '🏛️', role: 'Руководитель', hint: 'Утверждён на совещании 16:30' },
  { status: 'ASSIGNED',       label: 'Бригада назначена', emoji: '👷', role: 'Мастер',   hint: 'Работники распределены по объектам' },
  { status: 'IN_PROGRESS',    label: 'В работе',       emoji: '⚙️', role: 'Мастер',      hint: 'Работы ведутся' },
  { status: 'DONE',           label: 'Выполнен',       emoji: '🎯', role: '',             hint: 'Все работы завершены' },
]

const STATUS_ORDER = STEPS.map(s => s.status)

interface Props {
  currentStatus: WorkPlanStatus
  compact?: boolean
  showRoles?: boolean
}

export default function WorkflowStatusBar({ currentStatus, compact = false, showRoles = true }: Props) {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus)
  const isRejected = currentStatus === 'REJECTED'
  const isCancelled = currentStatus === 'CANCELLED'
  const isFastTrack = currentStatus === 'FAST_TRACK'
  const isSpecial = currentStatus === 'REDIRECTED' || currentStatus === 'SUSPENDED'

  if (isRejected || isCancelled || isFastTrack || isSpecial) {
    const label = isRejected ? 'Отклонён' : isCancelled ? 'Отменён' : isFastTrack ? 'Fast Track ⚡' : isSpecial ? 'Особый статус' : ''
    const hint = isRejected ? 'ГИ вернул план на доработку' : isCancelled ? 'План снят с исполнения' : isFastTrack ? 'Экстренный план, минует согласование' : 'План перенаправлен или приостановлен'
    const icon = isRejected || isCancelled ? '🚫' : isFastTrack ? '⚡' : '↩️'
    const color = isFastTrack ? 'text-rose-400' : 'text-red-400'
    const bg = isFastTrack ? 'bg-rose-500/10 border-rose-500/20' : 'bg-red-500/10 border-red-500/20'
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${bg}`}>
        <span className="text-lg">{icon}</span>
        <div>
          <div className={`text-sm font-semibold ${color}`}>{label}</div>
          <div className={`text-xs ${color} opacity-60`}>{hint}</div>
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1 overflow-x-auto py-1">
        {STEPS.map((step, idx) => {
          const done = idx < currentIdx
          const active = idx === currentIdx
          const future = idx > currentIdx
          return (
            <div key={step.status} className="flex items-center gap-1 flex-shrink-0">
              <div
                title={`${step.label} — ${step.hint}`}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all
                  ${active ? 'bg-blue-500/30 border-2 border-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]' : ''}
                  ${done ? 'bg-green-500/20 border border-green-500/40' : ''}
                  ${future ? 'bg-white/5 border border-white/10' : ''}
                `}
              >
                {done ? '✓' : step.emoji}
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`w-3 h-px ${idx < currentIdx ? 'bg-green-500/40' : 'bg-white/10'}`} />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-start min-w-max gap-0">
        {STEPS.map((step, idx) => {
          const done = idx < currentIdx
          const active = idx === currentIdx
          const future = idx > currentIdx

          return (
            <div key={step.status} className="flex items-start">
              {/* Step node */}
              <div className="flex flex-col items-center w-[88px]">
                {/* Circle */}
                <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-300
                  ${active ? 'bg-blue-500/25 border-2 border-blue-400 shadow-[0_0_16px_rgba(96,165,250,0.45)]' : ''}
                  ${done ? 'bg-green-500/15 border border-green-500/30' : ''}
                  ${future ? 'bg-white/4 border border-white/10' : ''}
                `}>
                  {done ? (
                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className={future ? 'opacity-30 grayscale' : ''}>{step.emoji}</span>
                  )}
                  {active && (
                    <span className="absolute inset-0 rounded-full border-2 border-blue-400/30 animate-ping" />
                  )}
                </div>

                {/* Label */}
                <div className="mt-1.5 text-center">
                  <div className={`text-[10px] font-semibold leading-tight
                    ${active ? 'text-blue-300' : done ? 'text-green-400/70' : 'text-white/25'}
                  `}>
                    {step.label}
                  </div>
                  {showRoles && step.role && (
                    <div className={`text-[9px] mt-0.5 leading-tight
                      ${active ? 'text-blue-300/50' : done ? 'text-white/20' : 'text-white/15'}
                    `}>
                      {step.role}
                    </div>
                  )}
                </div>
              </div>

              {/* Connector line */}
              {idx < STEPS.length - 1 && (
                <div className="flex items-center mt-5 w-6 flex-shrink-0">
                  <div className={`h-px w-full transition-all duration-500
                    ${idx < currentIdx ? 'bg-green-500/40' : 'bg-white/10'}
                  `} />
                  <svg
                    className={`w-2 h-2 flex-shrink-0 -ml-0.5
                      ${idx < currentIdx ? 'text-green-500/40' : 'text-white/10'}
                    `}
                    viewBox="0 0 8 8" fill="currentColor"
                  >
                    <path d="M0 0L8 4L0 8V0z" />
                  </svg>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Active step hint */}
      {currentIdx >= 0 && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-blue-500/8 border border-blue-500/15 flex items-center gap-2">
          <span className="text-blue-400 text-sm flex-shrink-0">💡</span>
          <span className="text-xs text-blue-300/70">{STEPS[currentIdx]?.hint}</span>
        </div>
      )}
    </div>
  )
}
