/**
 * GET /api/timesheet/export
 *
 * Query params:
 *   year       — год (default: текущий)
 *   month      — месяц 1–12 (default: текущий)
 *   serviceId  — фильтр по службе (опционально)
 *   format     — 'xml' | 'csv' | 'night_pay_csv' (default: 'xml')
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildMonthlyTimesheet } from '@/lib/timesheet'
import { buildTimesheetXML, buildTimesheetCSV, buildNightPayCSV, type UserMeta } from '@/lib/export1c'
import { verifySessionToken } from '@/lib/session-token'
import type { UserWithAssignment } from '@/types'

// Server-side Supabase client (secret key для обхода RLS при экспорте).
// Supabase 2026: `sb_secret_…` заменяет service_role; legacy-имена — как fallback.
function getSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL!
  const key =
    process.env.SUPABASE_SECRET_KEY
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? process.env.SUPABASE_PUBLISHABLE_KEY
    ?? process.env.SUPABASE_ANON_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export async function GET(req: NextRequest) {
  if (!verifySessionToken(req.cookies.get('gormost_token')?.value)) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const now    = new Date()
  const year   = parseInt(searchParams.get('year')  ?? String(now.getFullYear()), 10)
  const month  = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1), 10)
  const svcId  = searchParams.get('serviceId') ?? undefined
  const format = (searchParams.get('format') ?? 'xml') as 'xml' | 'csv' | 'night_pay_csv'

  if (month < 1 || month > 12 || year < 2020 || year > 2100) {
    return NextResponse.json({ error: 'Некорректный год или месяц' }, { status: 400 })
  }

  try {
    const supabase = getSupabase()

    const today = new Date().toISOString().split('T')[0]

    // Загружаем сотрудников с назначениями. FK employee_assignments→users
    // неоднозначен (user_id + created_by) — указываем связь по имени constraint.
    // shift_phases не имеет FK на employee_assignments (только на users),
    // поэтому грузим фазы отдельным запросом ниже и сшиваем по employee_id.
    let q = supabase
      .from('users')
      .select(`
        *,
        assignment:employee_assignments!employee_assignments_user_id_fkey!inner(
          *,
          schedule:schedules(code, name, work_days, rest_days, default_day_night, is_shift_based)
        )
      `)
      .eq('is_active', true)
      .order('last_name', { ascending: true })

    if (svcId) q = q.eq('service_id', svcId)

    const { data: rawUsers, error } = await q

    if (error) {
      console.error('timesheet/export: DB error', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Активные фазы день/ночь на сегодня — по одной (самой свежей) на сотрудника
    type RawPhase = {
      id: string; employee_id: string; phase: 'day' | 'night'; anchor_date: string
      schedule_code: string; is_alternating?: boolean; valid_from: string; valid_to: string | null
    }
    const { data: rawPhases, error: phaseErr } = await supabase
      .from('shift_phases')
      .select('id, employee_id, phase, anchor_date, schedule_code, is_alternating, valid_from, valid_to')
      .lte('valid_from', today)
      .or(`valid_to.is.null,valid_to.gte.${today}`)
      .order('valid_from', { ascending: false })

    if (phaseErr) {
      console.error('timesheet/export: shift_phases error', phaseErr)
      return NextResponse.json({ error: phaseErr.message }, { status: 500 })
    }

    const phaseByUser = new Map<string, RawPhase>()
    for (const p of (rawPhases ?? []) as RawPhase[]) {
      if (!phaseByUser.has(p.employee_id)) phaseByUser.set(p.employee_id, p)
    }

    // Нормализуем в UserWithAssignment — добавляем schedule_code на верхний уровень assignment
    type RawAssignment = NonNullable<UserWithAssignment['assignment']> & {
      schedule?: { code?: string; name?: string } | null
    }
    type RawUserRow = Omit<UserWithAssignment, 'assignment'> & {
      assignment: RawAssignment | RawAssignment[] | null
    }
    const users: UserWithAssignment[] = ((rawUsers ?? []) as RawUserRow[]).map(u => {
      const asgn = Array.isArray(u.assignment) ? u.assignment[0] : u.assignment
      if (!asgn) return { ...u, assignment: null }

      const activePhase = phaseByUser.get(u.user_id) ?? null

      return {
        ...u,
        assignment: {
          ...asgn,
          schedule_code: asgn.schedule?.code ?? '',
          schedule_name: asgn.schedule?.name ?? '',
          active_phase: activePhase ? {
            id:             activePhase.id,
            phase:          activePhase.phase,
            anchor_date:    activePhase.anchor_date,
            schedule_code:  activePhase.schedule_code,
            is_alternating: activePhase.is_alternating ?? false,
            valid_from:     activePhase.valid_from,
          } : null,
        },
      }
    })

    // Загружаем службы для подстановки названий
    const { data: services } = await supabase.from('services').select('service_id, service_name')
    const serviceNames: Record<string, string> = {}
    for (const svc of services ?? []) serviceNames[svc.service_id] = svc.service_name

    // Строим табели
    const timesheets = users.map(u => buildMonthlyTimesheet(u, year, month))

    // Метаданные сотрудников
    const usersMap: Record<string, UserMeta> = {}
    for (const u of users) {
      const nameParts = [u.last_name, u.first_name, u.middle_name].filter(Boolean)
      const uid = u.user_id
      usersMap[uid] = {
        fullName:    nameParts.join(' ') || u.full_name || uid,
        tabNumber:   u.tab_number ?? uid.slice(0, 8).toUpperCase(),
        serviceId:   u.service_id ?? '',
        serviceName: serviceNames[u.service_id ?? ''] ?? '',
      }
    }

    const mmStr   = String(month).padStart(2, '0')
    const orgName = 'ГБУ «Гормост – Лефортово»'

    if (format === 'csv') {
      const csv = buildTimesheetCSV(timesheets, usersMap, year, month)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="tabel_${year}_${mmStr}.csv"`,
        },
      })
    }

    if (format === 'night_pay_csv') {
      const nightRows = timesheets
        .map(ts => {
          const meta = usersMap[ts.userId]
          if (!meta) return null
          const crossNight = ts.entries
            .filter(e => e.isCrossMonthTail)
            .reduce((s, e) => s + e.hoursNight, 0)
          // Часовую ставку не знаем — оставляем supplement как кол-во*0 для ручного заполнения
          return {
            tabNumber: meta.tabNumber,
            fullName:  meta.fullName,
            nightHours: ts.summary.hoursNight,
            supplement35pct: 0, // заполняется в 1С по ставке сотрудника
            crossMonthNightHours: crossNight,
            month,
            year,
          }
        })
        .filter(Boolean) as Parameters<typeof buildNightPayCSV>[0]

      const csv = buildNightPayCSV(nightRows, year, month)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="night_pay_${year}_${mmStr}.csv"`,
        },
      })
    }

    // XML (default)
    const xml = buildTimesheetXML(timesheets, usersMap, orgName)
    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="tabel_1c_${year}_${mmStr}.xml"`,
      },
    })

  } catch (err) {
    console.error('timesheet/export: unexpected error', err)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
