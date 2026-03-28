'use client'
import WithTooltip from './WithTooltip'

type BrigadeRole = 'WORKER' | 'BRIGADIER' | 'MASTER' | 'DRIVER' | 'ITR'
type AppRole = 'DISPATCHER' | 'FOREMAN' | 'HEAD' | 'CHIEF_ENGINEER' | 'ZAMPORAB' | 'BOSS' | 'TRANSPORT' | 'COMPLAINTS' | 'SAFETY_ENGINEER' | 'HR' | 'DRIVER' | 'ADMIN'

const BRIGADE_TIPS: Record<BrigadeRole, { label: string; tip: string; style: string }> = {
  WORKER:    { label: 'Рабочий',   tip: 'Рядовой член бригады — выполняет физическую работу на объекте.',                              style: 'bg-slate-500/15 border-slate-500/25 text-slate-300' },
  BRIGADIER: { label: 'Бригадир',  tip: 'Старший рабочий: организует команду и отвечает за выполнение задания на месте.',               style: 'bg-blue-500/15 border-blue-500/25 text-blue-300' },
  MASTER:    { label: 'Мастер',    tip: 'Технический руководитель работ: ставит задачи, контролирует соблюдение ТБ и качество.',        style: 'bg-violet-500/15 border-violet-500/25 text-violet-300' },
  DRIVER:    { label: 'Водитель',  tip: 'Обеспечивает технику: управляет специализированным транспортом или механизмом.',               style: 'bg-amber-500/15 border-amber-500/25 text-amber-300' },
  ITR:       { label: 'ИТР',       tip: 'Инженерно-технический работник: специалист с техническим образованием, надзор и проектирование.', style: 'bg-cyan-500/15 border-cyan-500/25 text-cyan-300' },
}

const APP_ROLE_TIPS: Record<AppRole, { label: string; tip: string }> = {
  DISPATCHER:      { label: 'Диспетчер',   tip: 'Принимает заявки, ведёт журнал, координирует срочные задачи.' },
  FOREMAN:         { label: 'Мастер',       tip: 'Формирует бригады и ведёт план работ на объекте.' },
  HEAD:            { label: 'Нач. службы',  tip: 'Создаёт и согласует ежедневный план работ до 16:00.' },
  CHIEF_ENGINEER:  { label: 'ГИ',           tip: 'Главный инженер — согласует все планы служб до совещания.' },
  ZAMPORAB:        { label: 'Замзам',       tip: 'Зам. начальника / прораб — подтверждает планы после ГИ.' },
  BOSS:            { label: 'Руководитель', tip: 'Финально утверждает все планы на совещании в 16:30.' },
  TRANSPORT:       { label: 'Транспорт',   tip: 'Управляет парком техники: статусы, заявки, расписание водителей.' },
  COMPLAINTS:      { label: 'Жалобы',      tip: 'Обрабатывает обращения и жалобы от жителей и организаций.' },
  SAFETY_ENGINEER: { label: 'ТБиОТ',       tip: 'Инженер по технике безопасности и охране труда.' },
  HR:              { label: 'Кадры',        tip: 'Кадровая служба: найм, увольнение, графики сменности.' },
  DRIVER:          { label: 'Водитель',    tip: 'Водитель — видит своё закреплённое авто и задания.' },
  ADMIN:           { label: 'Админ',        tip: 'Системный администратор — полный доступ ко всем функциям.' },
}

interface BrigadeProps {
  role: BrigadeRole
  size?: 'xs' | 'sm'
  className?: string
}

export function BrigadeRoleBadge({ role, size = 'sm', className = '' }: BrigadeProps) {
  const info = BRIGADE_TIPS[role]
  const textSize = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
  return (
    <WithTooltip tip={info.tip} title={info.label}>
      <span className={`inline-flex items-center rounded-full border font-medium ${info.style} ${textSize} ${className}`}>
        {info.label}
      </span>
    </WithTooltip>
  )
}

interface AppRoleProps {
  role: AppRole
  size?: 'xs' | 'sm'
  className?: string
}

export function AppRoleBadge({ role, size = 'sm', className = '' }: AppRoleProps) {
  const info = APP_ROLE_TIPS[role] ?? { label: role, tip: '' }
  const textSize = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
  return (
    <WithTooltip tip={info.tip} title={info.label}>
      <span className={`inline-flex items-center rounded-full border bg-white/8 border-white/12 text-white/60 font-medium ${textSize} ${className}`}>
        {info.label}
      </span>
    </WithTooltip>
  )
}
