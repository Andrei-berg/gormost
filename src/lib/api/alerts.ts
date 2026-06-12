import { supabase } from '../supabase'
import type {
  RoleLevel, SystemAlert,
} from '@/types'
import { certStatusFromDates } from '@/types'

// ─── System Alerts ───────────────────────────────────────────────────────────

function hoursSince(ts: string | null): number {
  if (!ts) return 0
  return (Date.now() - new Date(ts).getTime()) / 3600000
}

export async function fetchSystemAlerts(opts: { role: RoleLevel; serviceId?: string | null }): Promise<SystemAlert[]> {
  const today = new Date().toISOString().split('T')[0]
  const h = new Date().getHours()

  const { data: plans } = await supabase.from('work_plans').select('*').eq('plan_date', today)
  if (!plans) return []

  const alerts: SystemAlert[] = []

  if (opts.role === 'HEAD' && opts.serviceId) {
    const myPlans = plans.filter((p) => p.service_id === opts.serviceId)
    const hasProgress = myPlans.some((p) =>
      ['SUBMITTED', 'APPROVED', 'PLANNED', 'BOSS_CONFIRMED', 'ASSIGNED', 'IN_PROGRESS', 'DONE'].includes(p.status)
    )
    if (!hasProgress) {
      if (h >= 15) alerts.push({ id: 'head-no-plan', level: 'critical', title: 'План не подан на согласование', detail: 'Срочно создайте и отправьте план до совещания' })
      else if (h >= 12) alerts.push({ id: 'head-no-plan', level: 'warning', title: 'План не создан', detail: `До совещания ${16 - h}ч — создайте план работ` })
    }
    const drafts = myPlans.filter((p) => p.status === 'DRAFT')
    if (drafts.length > 0 && h >= 14) alerts.push({ id: 'head-draft', level: 'warning', title: `${drafts.length} план(а) в черновике`, detail: 'Отправьте на согласование до 16:00' })
  }

  if (['CHIEF_ENGINEER', 'BOSS', 'ADMIN'].includes(opts.role)) {
    const submitted = plans.filter((p) => p.status === 'SUBMITTED')
    if (submitted.length > 0) {
      const oldest = submitted.reduce((a, b) => (a.submitted_at ?? '') < (b.submitted_at ?? '') ? a : b)
      const hrs = Math.floor(hoursSince(oldest.submitted_at))
      alerts.push({ id: 'chief-pending', level: hrs >= 2 ? 'critical' : 'warning', title: `${submitted.length} план(а) ждут согласования ГИ`, detail: hrs > 0 ? `Ожидание ${hrs}ч` : 'Требуется согласование' })
    }
  }

  if (['ZAMPORAB', 'BOSS', 'ADMIN'].includes(opts.role)) {
    const approved = plans.filter((p) => p.status === 'APPROVED')
    if (approved.length > 0) {
      const oldest = approved.reduce((a, b) => (a.approved_at ?? '') < (b.approved_at ?? '') ? a : b)
      const hrs = Math.floor(hoursSince(oldest.approved_at))
      alerts.push({ id: 'zamporab-pending', level: hrs >= 2 ? 'critical' : 'warning', title: `${approved.length} план(а) ждут подтверждения замзама`, detail: hrs > 0 ? `Ожидание ${hrs}ч` : 'Требуется подтверждение' })
    }
  }

  if (['BOSS', 'ADMIN'].includes(opts.role)) {
    const planned = plans.filter((p) => p.status === 'PLANNED')
    if (planned.length > 0) alerts.push({ id: 'boss-pending', level: h >= 17 ? 'critical' : 'warning', title: `${planned.length} план(а) ждут утверждения на совещании`, detail: h < 16 ? 'Совещание в 16:30' : 'Совещание прошло — утвердите планы' })
  }

  if (['FOREMAN', 'ZAMPORAB', 'BOSS', 'ADMIN'].includes(opts.role)) {
    const scope = opts.role === 'FOREMAN' && opts.serviceId ? plans.filter((p) => p.service_id === opts.serviceId) : plans
    const notAssigned = scope.filter((p) => p.status === 'BOSS_CONFIRMED')
    if (notAssigned.length > 0) alerts.push({ id: 'foreman-not-assigned', level: h >= 20 ? 'critical' : 'warning', title: `${notAssigned.length} план(а) без состава бригады`, detail: 'Назначьте работников до начала смены' })
    if (h >= 7) {
      const notStarted = scope.filter((p) => p.status === 'ASSIGNED')
      if (notStarted.length > 0) alerts.push({ id: 'foreman-not-started', level: 'warning', title: `${notStarted.length} план(а) не запущены`, detail: 'Запустите работы на объектах' })
    }
    const fastTrack = scope.filter((p) => p.status === 'FAST_TRACK')
    if (fastTrack.length > 0) alerts.push({ id: 'fast-track-unassigned', level: 'critical', title: `⚡ ${fastTrack.length} поручение(я) Fast Track — нужна бригада`, detail: 'Внеплановое задание от вышестоящей организации' })
    const needsReassign = scope.filter((p) => p.status === 'REDIRECTED')
    if (needsReassign.length > 0) alerts.push({ id: 'plan-needs-reassign', level: 'critical', title: `🚨 ${needsReassign.length} план(а) без бригады — снята по поручению`, detail: 'Назначьте замену или перенесите план' })
    const overdueResume = scope.filter((p) => p.status === 'SUSPENDED' && p.suspended_until && p.suspended_until <= today)
    if (overdueResume.length > 0) alerts.push({ id: 'plan-resume-overdue', level: 'warning', title: `${overdueResume.length} план(а) ожидают возобновления`, detail: 'Дата возобновления наступила — назначьте бригаду' })
  }

  if (['DISPATCHER', 'BOSS', 'ZAMPORAB', 'ADMIN'].includes(opts.role)) {
    const allFastTrack = plans.filter((p) => p.status === 'FAST_TRACK')
    const externalCount = allFastTrack.filter((p) => p.source !== 'INTERNAL').length
    if (externalCount > 0) {
      const sources = [...new Set(allFastTrack.map((p) => p.source).filter(Boolean))]
      alerts.push({ id: 'fast-track-external', level: 'critical', title: `⚡ ${externalCount} внешних поручений в работе сегодня`, detail: sources.includes('MAYOR') ? 'Есть поручения от Мэрии Москвы' : sources.includes('DJKH') ? 'Есть поручения от ДЖКХ' : 'Поручения от ГУ Гормост' })
    }
  }

  if (['SAFETY_ENGINEER', 'ADMIN', 'BOSS'].includes(opts.role)) {
    const { data: certs } = await supabase.from('employee_certs').select('id, expires_at').not('expires_at', 'is', null)
    if (certs && certs.length > 0) {
      let expired = 0, expiringSoon = 0
      for (const c of certs) {
        const st = certStatusFromDates(c.expires_at)
        if (st === 'EXPIRED') expired++
        else if (st === 'EXPIRING_SOON') expiringSoon++
      }
      if (expired > 0) alerts.push({ id: 'certs-expired', level: 'critical', title: `🛡️ ${expired} допуск(а) просрочено`, detail: 'Требуется переаттестация сотрудников' })
      else if (expiringSoon > 0) alerts.push({ id: 'certs-expiring', level: 'warning', title: `🛡️ ${expiringSoon} допуск(а) истекают в ближайшие 30 дней`, detail: 'Запланируйте переаттестацию' })
    }
  }

  return alerts
}
