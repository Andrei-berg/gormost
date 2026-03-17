import { supabase } from './supabase'
import type { RoleLevel } from '@/types'

export type AlertLevel = 'critical' | 'warning' | 'info'

export interface SystemAlert {
  id: string
  level: AlertLevel
  title: string
  detail?: string
}

interface AlertsOptions {
  role: RoleLevel
  serviceId?: string | null
}

function hoursSince(ts: string | null): number {
  if (!ts) return 0
  return (Date.now() - new Date(ts).getTime()) / 3600000
}

function currentHour(): number {
  return new Date().getHours()
}

export async function fetchSystemAlerts(opts: AlertsOptions): Promise<SystemAlert[]> {
  const today = new Date().toISOString().split('T')[0]

  const { data: plans } = await supabase
    .from('work_plans')
    .select('*')
    .eq('plan_date', today)

  if (!plans) return []

  const alerts: SystemAlert[] = []
  const h = currentHour()

  // --- HEAD: собственная служба не подала план ---
  if (opts.role === 'HEAD' && opts.serviceId) {
    const myPlans = plans.filter((p) => p.service_id === opts.serviceId)
    const hasProgress = myPlans.some((p) =>
      ['SUBMITTED', 'APPROVED', 'PLANNED', 'BOSS_CONFIRMED', 'ASSIGNED', 'IN_PROGRESS', 'DONE'].includes(p.status)
    )
    if (!hasProgress) {
      if (h >= 15) {
        alerts.push({ id: 'head-no-plan', level: 'critical', title: 'План не подан на согласование', detail: 'Срочно создайте и отправьте план до совещания' })
      } else if (h >= 12) {
        alerts.push({ id: 'head-no-plan', level: 'warning', title: 'План не создан', detail: `До совещания ${16 - h}ч — создайте план работ` })
      }
    }
    const drafts = myPlans.filter((p) => p.status === 'DRAFT')
    if (drafts.length > 0 && h >= 14) {
      alerts.push({ id: 'head-draft', level: 'warning', title: `${drafts.length} план(а) в черновике`, detail: 'Отправьте на согласование до 16:00' })
    }
  }

  // --- CHIEF_ENGINEER: планы ждут согласования ---
  if (['CHIEF_ENGINEER', 'BOSS', 'ADMIN'].includes(opts.role)) {
    const submitted = plans.filter((p) => p.status === 'SUBMITTED')
    if (submitted.length > 0) {
      const oldest = submitted.reduce((a, b) => (a.submitted_at ?? '') < (b.submitted_at ?? '') ? a : b)
      const hrs = Math.floor(hoursSince(oldest.submitted_at))
      alerts.push({
        id: 'chief-pending',
        level: hrs >= 2 ? 'critical' : 'warning',
        title: `${submitted.length} план(а) ждут согласования ГИ`,
        detail: hrs > 0 ? `Ожидание ${hrs}ч` : 'Требуется согласование',
      })
    }
  }

  // --- ZAMPORAB: планы ждут подтверждения ---
  if (['ZAMPORAB', 'BOSS', 'ADMIN'].includes(opts.role)) {
    const approved = plans.filter((p) => p.status === 'APPROVED')
    if (approved.length > 0) {
      const oldest = approved.reduce((a, b) => (a.approved_at ?? '') < (b.approved_at ?? '') ? a : b)
      const hrs = Math.floor(hoursSince(oldest.approved_at))
      alerts.push({
        id: 'zamporab-pending',
        level: hrs >= 2 ? 'critical' : 'warning',
        title: `${approved.length} план(а) ждут подтверждения замзама`,
        detail: hrs > 0 ? `Ожидание ${hrs}ч` : 'Требуется подтверждение',
      })
    }
  }

  // --- BOSS: планы ждут утверждения на совещании ---
  if (['BOSS', 'ADMIN'].includes(opts.role)) {
    const planned = plans.filter((p) => p.status === 'PLANNED')
    if (planned.length > 0) {
      alerts.push({
        id: 'boss-pending',
        level: h >= 17 ? 'critical' : 'warning',
        title: `${planned.length} план(а) ждут утверждения на совещании`,
        detail: h < 16 ? 'Совещание в 16:30' : 'Совещание прошло — утвердите планы',
      })
    }
  }

  // --- FOREMAN / ZAMPORAB / BOSS: бригады не сформированы ---
  if (['FOREMAN', 'ZAMPORAB', 'BOSS', 'ADMIN'].includes(opts.role)) {
    const scope = opts.role === 'FOREMAN' && opts.serviceId
      ? plans.filter((p) => p.service_id === opts.serviceId)
      : plans

    const notAssigned = scope.filter((p) => p.status === 'BOSS_CONFIRMED')
    if (notAssigned.length > 0) {
      alerts.push({
        id: 'foreman-not-assigned',
        level: h >= 20 ? 'critical' : 'warning',
        title: `${notAssigned.length} план(а) без состава бригады`,
        detail: 'Назначьте работников до начала смены',
      })
    }

    if (h >= 7) {
      const notStarted = scope.filter((p) => p.status === 'ASSIGNED')
      if (notStarted.length > 0) {
        alerts.push({
          id: 'foreman-not-started',
          level: 'warning',
          title: `${notStarted.length} план(а) не запущены`,
          detail: 'Запустите работы на объектах',
        })
      }
    }
  }

  return alerts
}
