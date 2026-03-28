'use client'
import { WORK_PLAN_STATUS_CONFIG } from '@/types'
import type { WorkPlanStatus } from '@/types'
import WithTooltip from './WithTooltip'

const STATUS_TIPS: Record<WorkPlanStatus, { title: string; tip: string }> = {
  DRAFT:          { title: 'Черновик',        tip: 'Нач. службы ещё заполняет план. Нужно добавить объекты работ и отправить на согласование до 16:00.' },
  SUBMITTED:      { title: 'На согласовании', tip: 'Отправлен ГИ на проверку. Ожидайте решения главного инженера.' },
  APPROVED:       { title: 'Согласован ГИ',   tip: 'ГИ одобрил план. Следующий шаг — подтверждение замзамом перед совещанием.' },
  REJECTED:       { title: 'Отклонён ГИ',     tip: 'ГИ вернул план на доработку. Нач. службы должен исправить замечания и отправить снова.' },
  PLANNED:        { title: 'Подтверждён замзамом', tip: 'Замзам проверил план. Ожидает утверждения руководителем на совещании 16:30.' },
  BOSS_CONFIRMED: { title: 'Утверждён руководителем', tip: 'Руководитель дал добро. Мастер может назначить бригаду на этот план.' },
  ASSIGNED:       { title: 'Бригада назначена', tip: 'Все работники распределены по объектам. Мастер запустит работы утром.' },
  IN_PROGRESS:    { title: 'В работе',         tip: 'Бригада работает прямо сейчас. Мастер закроет план по завершении.' },
  DONE:           { title: 'Выполнен',         tip: 'Все работы по плану завершены.' },
  FAST_TRACK:     { title: 'Fast Track ⚡',    tip: 'Экстренное поручение: минует стандартное согласование, выполняется немедленно.' },
  REDIRECTED:     { title: 'Бригада снята',    tip: 'Бригада снята с плана и перенаправлена на другой объект. Возможна замена ресурсов.' },
  SUSPENDED:      { title: 'Приостановлен',    tip: 'Работы временно приостановлены. Ожидается восстановление.' },
  CANCELLED:      { title: 'Отменён',          tip: 'План отменён. Больше не будет исполняться.' },
}

interface Props {
  status: WorkPlanStatus
  size?: 'xs' | 'sm'
  className?: string
}

export default function StatusPlanBadge({ status, size = 'sm', className = '' }: Props) {
  const cfg = WORK_PLAN_STATUS_CONFIG[status]
  const tip = STATUS_TIPS[status]
  const textSize = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'

  return (
    <WithTooltip tip={tip.tip} title={tip.title}>
      <span
        className={`inline-flex items-center rounded-full border font-medium ${cfg.bg} ${textSize} ${className}`}
        style={{ color: cfg.color }}
      >
        {cfg.label}
      </span>
    </WithTooltip>
  )
}
