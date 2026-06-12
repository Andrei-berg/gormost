'use client'
import { useState, useEffect } from 'react'
import type { WorkPlanStatus } from '@/types'

type RoleLevel = string

interface NextAction {
  emoji: string
  title: string
  description: string
  urgency: 'normal' | 'warning' | 'critical'
  actionLabel?: string
}

function getNextAction(role: RoleLevel, status: WorkPlanStatus | null, count: number): NextAction | null {
  const n = count > 0 ? `(${count})` : ''

  if (role === 'HEAD') {
    if (!status || status === 'DRAFT')
      return { emoji: '📝', title: 'Создайте план работ', description: 'Добавьте объекты и работы до 16:00, затем отправьте на согласование.', urgency: 'normal', actionLabel: 'Создать план' }
    if (status === 'REJECTED')
      return { emoji: '❌', title: 'План отклонён — доработайте', description: 'ГИ вернул план. Исправьте замечания и отправьте снова.', urgency: 'critical', actionLabel: 'Открыть план' }
    if (status === 'SUBMITTED')
      return { emoji: '⏳', title: 'Ожидание согласования ГИ', description: 'План отправлен. Главный инженер должен его рассмотреть.', urgency: 'normal' }
    return null
  }

  if (role === 'CHIEF_ENGINEER') {
    if (status === 'SUBMITTED')
      return { emoji: '📋', title: `Планы ожидают вашего согласования ${n}`, description: 'Рассмотрите и одобрите (или отклоните) планы служб до начала совещания.', urgency: count > 3 ? 'warning' : 'normal', actionLabel: 'Рассмотреть' }
    return null
  }

  if (role === 'ZAMPORAB') {
    if (status === 'APPROVED')
      return { emoji: '📋', title: `Планы готовы к подтверждению ${n}`, description: 'Одобренные ГИ планы ждут вашей отметки. Внесите правки при необходимости.', urgency: 'normal', actionLabel: 'Подтвердить' }
    return null
  }

  if (role === 'BOSS') {
    if (status === 'PLANNED')
      return { emoji: '🏛️', title: `Совещание 16:30 — утвердите планы ${n}`, description: 'Планы, согласованные замзамом, ожидают вашего финального утверждения.', urgency: 'warning', actionLabel: 'Утвердить' }
    return null
  }

  if (role === 'FOREMAN') {
    if (status === 'BOSS_CONFIRMED')
      return { emoji: '👷', title: `Назначьте бригады ${n}`, description: 'Утверждённые планы ожидают распределения работников. Перейдите на вкладку «Бригады».', urgency: 'warning', actionLabel: 'Назначить' }
    if (status === 'ASSIGNED')
      return { emoji: '▶️', title: 'Начните работы', description: 'Все бригады укомплектованы. Нажмите «В работу» чтобы запустить смену.', urgency: 'normal', actionLabel: 'В работу' }
    if (status === 'IN_PROGRESS')
      return { emoji: '⚙️', title: 'Работы ведутся', description: 'Следите за ходом выполнения. Завершите план когда все работы сделаны.', urgency: 'normal' }
    return null
  }

  return null
}

const URGENCY_STYLES: Record<string, string> = {
  normal:   'bg-blue-500/10 border-blue-500/20 text-blue-300',
  warning:  'bg-amber-500/10 border-amber-500/25 text-amber-300',
  critical: 'bg-red-500/10 border-red-500/25 text-red-300',
}
const URGENCY_BTN: Record<string, string> = {
  normal:   'bg-blue-600/30 hover:bg-blue-600/50 border-blue-500/30 text-blue-200',
  warning:  'bg-amber-600/30 hover:bg-amber-600/50 border-amber-500/30 text-amber-200',
  critical: 'bg-red-600/30 hover:bg-red-600/50 border-red-500/30 text-red-200',
}

interface Props {
  role: RoleLevel
  currentStatus: WorkPlanStatus | null
  planCount?: number
  storageKey?: string
  onAction?: () => void
}

export default function WhatNextBanner({ role, currentStatus, planCount = 0, onAction }: Props) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Re-show if status/count changed (new work to do)
    setDismissed(false)
  }, [currentStatus, planCount])

  const action = getNextAction(role, currentStatus, planCount)
  if (!action || dismissed) return null

  const styles = URGENCY_STYLES[action.urgency]
  const btnStyles = URGENCY_BTN[action.urgency]

  return (
    <div className={`rounded-xl border px-4 py-3 mb-4 flex items-start gap-3 ${styles}`}>
      <span className="text-xl flex-shrink-0 mt-0.5">{action.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm leading-snug">{action.title}</div>
        <div className="text-xs opacity-70 mt-0.5 leading-relaxed">{action.description}</div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        {action.actionLabel && onAction && (
          <button
            onClick={onAction}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${btnStyles}`}
          >
            {action.actionLabel}
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="opacity-40 hover:opacity-70 transition-opacity p-1"
          title="Скрыть"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
