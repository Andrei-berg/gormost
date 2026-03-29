/**
 * Print form generators for HR Tools.
 * Each function returns a complete HTML document string
 * that is opened in a new window and printed.
 */

import type { UserWithAssignment, ShiftPhase, Schedule, Service, EnrichedEmployee } from '@/types'
import { resolveShiftStatus } from '@/lib/shifts'

export interface PrintOptions {
  orgName: string
  serviceName: string
  period: { start: string; end: string }
  showSignatureLines: boolean
  showDate: boolean
  rosterCols: string[]
}

// ─── Shared helpers ────────────────────────────────────────────────────────

const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #000; background: #fff; }
  h1 { font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 4px; }
  h2 { font-size: 12pt; font-weight: bold; text-align: center; margin-bottom: 2px; }
  .subtitle { font-size: 10pt; text-align: center; color: #444; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { border: 1px solid #555; padding: 3px 5px; vertical-align: middle; }
  th { background: #f0f0f0; font-weight: bold; text-align: center; font-size: 9pt; }
  td { font-size: 10pt; }
  td.center { text-align: center; }
  td.small { font-size: 8pt; }
  .page-header { margin-bottom: 12px; }
  .org { font-size: 10pt; text-align: center; }
  .sig-block { margin-top: 24px; display: flex; justify-content: space-between; gap: 40px; }
  .sig-item { flex: 1; border-top: 1px solid #000; padding-top: 4px; font-size: 9pt; text-align: center; }
  .print-date { font-size: 8pt; color: #666; text-align: right; margin-top: 8px; }
  .work-d { background: #dbeafe; }
  .work-n { background: #e0e7ff; }
  .weekend { background: #fafafa; color: #bbb; }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  @media print {
    @page { margin: 15mm 12mm; }
    body { font-size: 10pt; }
    .no-print { display: none !important; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    h1, h2 { break-after: avoid; page-break-after: avoid; }
    .sig-block { break-inside: avoid; page-break-inside: avoid; }
  }
`

function baseHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>${BASE_CSS}</style>
</head>
<body>${body}</body>
</html>`
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtDateLong(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

function signatureBlock(opts: PrintOptions): string {
  if (!opts.showSignatureLines && !opts.showDate) return ''
  const sigs = opts.showSignatureLines
    ? `<div class="sig-block">
        <div class="sig-item">Составил ___________________ / _________________ /</div>
        <div class="sig-item">Проверил ___________________ / _________________ /</div>
        <div class="sig-item">Утверждаю ___________________ / _________________ /</div>
       </div>`
    : ''
  const dt = opts.showDate
    ? `<div class="print-date">Распечатано: ${new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>`
    : ''
  return sigs + dt
}

function pageHeader(title: string, opts: PrintOptions, subtitle?: string): string {
  return `
  <div class="page-header">
    <div class="org">${opts.orgName}</div>
    ${opts.serviceName ? `<div class="org">${opts.serviceName}</div>` : ''}
    <h1>${title}</h1>
    <div class="subtitle">${subtitle ?? `Период: ${fmtDate(opts.period.start)} — ${fmtDate(opts.period.end)}`}</div>
  </div>`
}

function getPhaseForDate(phases: ShiftPhase[], userId: string, dateStr: string) {
  return phases.find(p =>
    p.employee_id === userId &&
    p.valid_from <= dateStr &&
    (p.valid_to === null || p.valid_to >= dateStr)
  ) ?? null
}

function getDates(start: string, end: string): Date[] {
  const dates: Date[] = []
  const cur = new Date(start + 'T12:00:00')
  const endDate = new Date(end + 'T12:00:00')
  while (cur <= endDate) {
    dates.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

const DOW = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const SHIFT_LABELS = ['', 'Смена 1', 'Смена 2', 'Смена 3', 'Смена 4']

// ─── Form 1: Roster ────────────────────────────────────────────────────────

export function printRoster(
  users: UserWithAssignment[],
  phases: ShiftPhase[],
  opts: PrintOptions,
): string {
  const today = new Date()
  const cols = opts.rosterCols

  const colDefs: Record<string, { label: string; width?: string; render: (u: UserWithAssignment, i: number) => string }> = {
    num:      { label: '№',         width: '30px',  render: (_, i) => `<td class="center">${i + 1}</td>` },
    name:     { label: 'ФИО',       width: '200px', render: u => `<td>${u.full_name}</td>` },
    position: { label: 'Должность', width: '160px', render: u => `<td>${u.position ?? '—'}</td>` },
    schedule: { label: 'График',    width: '60px',  render: u => `<td class="center">${u.assignment?.schedule_code ?? '—'}</td>` },
    shift:    { label: 'Смена',     width: '70px',  render: u => `<td class="center">${u.assignment?.shift_num ? SHIFT_LABELS[u.assignment.shift_num] : '—'}</td>` },
    phone:    { label: 'Телефон',   width: '110px', render: u => `<td class="center">${(u as UserWithAssignment & { phone?: string }).phone ?? '—'}</td>` },
    status: {
      label: 'Сегодня', width: '70px',
      render: u => {
        if (!u.assignment) return '<td class="center small">—</td>'
        const phase = getPhaseForDate(phases, u.user_id, today.toISOString().split('T')[0])
        const st = resolveShiftStatus({
          schedule_code: u.assignment.schedule_code ?? '',
          shift_num: u.assignment.shift_num,
          rotation_group: u.assignment.rotation_group,
          shift_reference_date: u.assignment.shift_reference_date,
          active_phase: phase ? { phase: phase.phase, anchor_date: phase.anchor_date, schedule_code: phase.schedule_code } : null,
        }, today)
        return `<td class="center small">${st.working ? (st.phase === 'day' ? 'ДЕНЬ' : 'НОЧЬ') : 'выходной'}</td>`
      }
    },
  }

  const activeCols = cols.filter(k => colDefs[k])

  const thead = `<tr>${activeCols.map(k => `<th style="width:${colDefs[k].width ?? 'auto'}">${colDefs[k].label}</th>`).join('')}</tr>`
  const tbody = users.map((u, i) =>
    `<tr>${activeCols.map(k => colDefs[k].render(u, i)).join('')}</tr>`
  ).join('')

  const body = `
  ${pageHeader('Список сотрудников', opts)}
  <table>
    <thead>${thead}</thead>
    <tbody>${tbody}
    ${users.length === 0 ? '<tr><td colspan="' + activeCols.length + '" style="text-align:center">Нет данных</td></tr>' : ''}
    </tbody>
  </table>
  <div style="font-size:9pt;color:#666">Итого: ${users.length} чел.</div>
  ${signatureBlock(opts)}`

  return baseHtml('Список сотрудников', body)
}

// ─── Form 2: Tabel (Timesheet) ─────────────────────────────────────────────

export function printTabel(
  users: UserWithAssignment[],
  phases: ShiftPhase[],
  period: { start: string; end: string },
  opts: PrintOptions,
): string {
  const dates = getDates(period.start, period.end)

  // Split into two halves if more than 16 days (classic T-13 style)
  const half = Math.ceil(dates.length / 2)
  const firstHalf  = dates.slice(0, half)
  const secondHalf = dates.slice(half)

  function renderCell(u: UserWithAssignment, date: Date): string {
    if (!u.assignment) return '<td class="center small">?</td>'
    const dateStr = date.toISOString().split('T')[0]
    const dow = date.getDay()
    const isWeekend = dow === 0 || dow === 6
    const phase = getPhaseForDate(phases, u.user_id, dateStr)
    const st = resolveShiftStatus({
      schedule_code: u.assignment.schedule_code ?? '',
      shift_num: u.assignment.shift_num,
      rotation_group: u.assignment.rotation_group,
      shift_reference_date: u.assignment.shift_reference_date,
      active_phase: phase ? { phase: phase.phase, anchor_date: phase.anchor_date, schedule_code: phase.schedule_code } : null,
    }, date)
    if (isWeekend && !st.working) return '<td class="center small weekend">—</td>'
    if (st.working) {
      const cls = st.phase === 'day' ? 'work-d' : 'work-n'
      return `<td class="center small ${cls}">${st.phase === 'day' ? 'Д' : 'Н'}</td>`
    }
    return '<td class="center small">—</td>'
  }

  function renderHalf(halfDates: Date[], label: string): string {
    const dayNums = halfDates.map(d => `<th style="width:22px">${d.getDate()}</th>`).join('')
    const dayNames = halfDates.map(d => {
      const dow = d.getDay()
      const cls = (dow === 0 || dow === 6) ? ' style="color:#999"' : ''
      return `<th${cls}>${DOW[dow]}</th>`
    }).join('')

    const rows = users.map((u, i) => {
      const cells = halfDates.map(d => renderCell(u, d)).join('')
      const workDays = halfDates.filter(d => {
        if (!u.assignment) return false
        const dateStr = d.toISOString().split('T')[0]
        const phase = getPhaseForDate(phases, u.user_id, dateStr)
        const st = resolveShiftStatus({
          schedule_code: u.assignment.schedule_code ?? '',
          shift_num: u.assignment.shift_num,
          rotation_group: u.assignment.rotation_group,
          shift_reference_date: u.assignment.shift_reference_date,
          active_phase: phase ? { phase: phase.phase, anchor_date: phase.anchor_date, schedule_code: phase.schedule_code } : null,
        }, d)
        return st.working
      }).length
      return `<tr>
        <td class="center small">${i + 1}</td>
        <td>${u.full_name}</td>
        <td class="center small">${u.assignment?.schedule_code ?? '—'}</td>
        ${cells}
        <td class="center" style="font-weight:bold">${workDays}</td>
      </tr>`
    }).join('')

    return `
    <div style="font-size:9pt;font-weight:bold;margin:8px 0 4px">${label}</div>
    <table style="font-size:8pt">
      <thead>
        <tr>
          <th style="width:25px">№</th>
          <th style="width:180px">ФИО</th>
          <th style="width:45px">График</th>
          ${dayNums}
          <th style="width:30px">Дней</th>
        </tr>
        <tr>
          <th></th><th></th><th></th>
          ${dayNames}
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
  }

  const totalWorkMap = new Map<string, number>()
  users.forEach(u => {
    const total = dates.filter(d => {
      if (!u.assignment) return false
      const dateStr = d.toISOString().split('T')[0]
      const phase = getPhaseForDate(phases, u.user_id, dateStr)
      const st = resolveShiftStatus({
        schedule_code: u.assignment.schedule_code ?? '',
        shift_num: u.assignment.shift_num,
        rotation_group: u.assignment.rotation_group,
        shift_reference_date: u.assignment.shift_reference_date,
        active_phase: phase ? { phase: phase.phase, anchor_date: phase.anchor_date, schedule_code: phase.schedule_code } : null,
      }, d)
      return st.working
    }).length
    totalWorkMap.set(u.user_id, total)
  })

  const periodLabel = `${fmtDateLong(period.start)} — ${fmtDateLong(period.end)}`

  const legend = `
  <div style="font-size:8pt;color:#555;margin-top:8px">
    Условные обозначения: <span style="background:#dbeafe;padding:1px 4px">Д</span> — дневная смена &nbsp;
    <span style="background:#e0e7ff;padding:1px 4px">Н</span> — ночная смена &nbsp; — — выходной
  </div>`

  const body = `
  ${pageHeader('ТАБЕЛЬ УЧЁТА РАБОЧЕГО ВРЕМЕНИ', opts, periodLabel)}
  ${renderHalf(firstHalf, dates.length > half ? `Первая половина (${firstHalf[0].getDate()}–${firstHalf[firstHalf.length - 1].getDate()})` : '')}
  ${secondHalf.length > 0 ? renderHalf(secondHalf, `Вторая половина (${secondHalf[0].getDate()}–${secondHalf[secondHalf.length - 1].getDate()})`) : ''}
  ${legend}
  ${signatureBlock(opts)}`

  return baseHtml('Табель рабочего времени', body)
}

// ─── Form 3: Coverage Report ───────────────────────────────────────────────

export function printCoverage(
  users: UserWithAssignment[],
  phases: ShiftPhase[],
  period: { start: string; end: string },
  schedules: Schedule[],
  opts: PrintOptions,
): string {
  const dates = getDates(period.start, period.end)

  const usedCodes = (() => {
    const codes = new Set(users.map(u => u.assignment?.schedule_code).filter(Boolean) as string[])
    return schedules.map(s => s.code).filter(c => codes.has(c))
  })()

  function median(arr: number[]): number {
    if (!arr.length) return 0
    const s = [...arr].sort((a, b) => a - b)
    const m = Math.floor(s.length / 2)
    return s.length % 2 === 0 ? Math.round((s[m - 1] + s[m]) / 2) : s[m]
  }

  const rows = dates.map(date => {
    const dateStr = date.toISOString().split('T')[0]
    const byCode: Record<string, number> = {}
    let total = 0
    users.forEach(u => {
      if (!u.assignment) return
      const phase = getPhaseForDate(phases, u.user_id, dateStr)
      const st = resolveShiftStatus({
        schedule_code: u.assignment.schedule_code ?? '',
        shift_num: u.assignment.shift_num,
        rotation_group: u.assignment.rotation_group,
        shift_reference_date: u.assignment.shift_reference_date,
        active_phase: phase ? { phase: phase.phase, anchor_date: phase.anchor_date, schedule_code: phase.schedule_code } : null,
      }, date)
      if (st.working) {
        total++
        const code = u.assignment.schedule_code ?? 'other'
        byCode[code] = (byCode[code] ?? 0) + 1
      }
    })
    return { date, dateStr, total, byCode }
  })

  const norm = median(rows.map(r => r.total))
  const maxTotal = Math.max(...rows.map(r => r.total), 1)
  const avgTotal = rows.length ? (rows.reduce((s, r) => s + r.total, 0) / rows.length).toFixed(1) : '0'

  const summaryTable = `
  <table style="width:auto;margin-bottom:12px">
    <tr><th>Сотрудников</th><th>Дней в периоде</th><th>Норма в день</th><th>Среднее в день</th></tr>
    <tr>
      <td class="center">${users.length}</td>
      <td class="center">${dates.length}</td>
      <td class="center">${norm}</td>
      <td class="center">${avgTotal}</td>
    </tr>
  </table>`

  const thead = `<tr>
    <th style="width:90px">Дата</th>
    <th style="width:30px">День</th>
    <th style="width:50px;font-weight:bold">Всего</th>
    ${usedCodes.map(c => `<th style="width:45px">${c}</th>`).join('')}
    <th style="width:45px">Норма</th>
    <th style="width:45px">Дельта</th>
  </tr>`

  const tbody = rows.map(({ date, dateStr, total, byCode }) => {
    const dow = date.getDay()
    const isWeekend = dow === 0 || dow === 6
    const delta = total - norm
    const pct = norm > 0 ? total / norm : 1
    const rowStyle = pct < 0.8 ? ' style="background:#fee2e2"' : pct < 0.95 ? ' style="background:#fef9c3"' : ''
    const totalStyle = pct < 0.8 ? ' style="color:#dc2626;font-weight:bold"' : pct < 0.95 ? ' style="color:#d97706;font-weight:bold"' : ' style="font-weight:bold"'
    const weekendStyle = isWeekend ? ' style="color:#aaa"' : ''
    return `<tr${rowStyle}>
      <td${weekendStyle}>${date.getDate()} ${date.toLocaleDateString('ru-RU', { month: 'short' })}</td>
      <td class="center small"${weekendStyle}>${DOW[dow]}</td>
      <td class="center"${totalStyle}>${total}</td>
      ${usedCodes.map(c => `<td class="center small">${byCode[c] ?? '—'}</td>`).join('')}
      <td class="center small">${norm}</td>
      <td class="center small" style="color:${delta >= 0 ? '#166534' : '#dc2626'}">${delta > 0 ? '+' + delta : delta}</td>
    </tr>`
  }).join('')

  const legend = `
  <div style="font-size:8pt;color:#555;margin-top:4px">
    <span style="background:#fee2e2;padding:1px 4px">красный</span> — меньше 80% нормы &nbsp;
    <span style="background:#fef9c3;padding:1px 4px">жёлтый</span> — 80–95% нормы
  </div>`

  const body = `
  ${pageHeader('Отчёт о покрытии сменами', opts)}
  ${summaryTable}
  <table>
    <thead>${thead}</thead>
    <tbody>${tbody}</tbody>
  </table>
  ${legend}
  ${signatureBlock(opts)}`

  return baseHtml('Отчёт о покрытии', body)
}

// ─── Form 4: Строевая записка ──────────────────────────────────────────────

export interface StroevayaOptions {
  orgName: string
  dateStr: string              // 'YYYY-MM-DD' — date for the report (default: today)
  showItrBreakdown: boolean    // show штат ИТР / Рабочие columns
  showParkovschiki: boolean    // show Парковщики column (role_level === 'DRIVER')
  showSvoSplit: boolean        // split СВО into Москва / Регионы by svo_type
  showTrudSvo: boolean         // show Труд.СВО column
  showUvolenySvo: boolean      // show Уволены СВО column
  showShiftTotals: boolean     // show ИТОГО День / Ночь columns
  showSignatureLines: boolean
  showDate: boolean
}

export interface StroevayaRow {
  serviceId: string
  serviceName: string
  total: number
  itr: number
  workers: number
  parkovschiki: number
  bolnichniy: number
  otgul: number
  otpusk: number
  uchebniy: number
  dekret: number
  komandirovka: number
  svoMoscow: number
  svoRegion: number
  mobilizovan: number
  trudSvo: number
  uvolenySvo: number
  vacancies: number
  day: number
  night: number
}

function makeEmptyRow(serviceId: string, serviceName: string): StroevayaRow {
  return {
    serviceId, serviceName,
    total: 0, itr: 0, workers: 0, parkovschiki: 0,
    bolnichniy: 0, otgul: 0, otpusk: 0, uchebniy: 0, dekret: 0, komandirovka: 0,
    svoMoscow: 0, svoRegion: 0, mobilizovan: 0, trudSvo: 0, uvolenySvo: 0,
    vacancies: 0, day: 0, night: 0,
  }
}

/** Build service-level rows for Строевая записка. Shared by screen view and print form. */
export function buildStroevayaRows(
  enrichedUsers: EnrichedEmployee[],
  usersWithAssignment: UserWithAssignment[],
  phases: ShiftPhase[],
  services: Service[],
  dateStr: string,
  showSvoSplit: boolean,
): { rows: StroevayaRow[], totals: StroevayaRow } {
  const date = new Date(dateStr + 'T12:00:00')
  const assignmentMap = new Map(usersWithAssignment.map(u => [u.user_id, u.assignment]))

  const rowMap = new Map<string, StroevayaRow>()
  for (const svc of services) rowMap.set(svc.service_id, makeEmptyRow(svc.service_id, svc.service_name))

  for (const eu of enrichedUsers) {
    const { user, currentStatus } = eu
    const svcId = user.service_id ?? '__other__'
    if (!rowMap.has(svcId)) rowMap.set(svcId, makeEmptyRow(svcId, 'Прочие'))
    const r = rowMap.get(svcId)!

    r.total++
    if (user.category === 'ИТР') r.itr++
    else r.workers++
    if (user.role_level === 'DRIVER') r.parkovschiki++

    switch (currentStatus) {
      case 'Bolnichniy':           r.bolnichniy++; break
      case 'Otgul':                r.otgul++; break
      case 'Otpusk':               r.otpusk++; break
      case 'Uchebniy_otpusk':      r.uchebniy++; break
      case 'Dekret':               r.dekret++; break
      case 'Komandirovka':         r.komandirovka++; break
      case 'Mobilizovan':          r.mobilizovan++; break
      case 'Troydoustroyen_s_SVO': r.trudSvo++; break
      case 'SVO':
        if (showSvoSplit && user.svo_type === 'через_регион') r.svoRegion++
        else r.svoMoscow++
        break
    }

    const assignment = assignmentMap.get(user.user_id)
    if (assignment) {
      const phase = getPhaseForDate(phases, user.user_id, dateStr)
      const st = resolveShiftStatus({
        schedule_code: assignment.schedule_code ?? '',
        shift_num: assignment.shift_num,
        rotation_group: assignment.rotation_group,
        shift_reference_date: assignment.shift_reference_date,
        active_phase: phase ? { phase: phase.phase, anchor_date: phase.anchor_date, schedule_code: phase.schedule_code } : null,
      }, date)
      if (st.working) {
        if (st.phase === 'day') r.day++
        else r.night++
      }
    }
  }

  const rows = [...rowMap.values()].filter(r => r.total > 0)
  const totals = makeEmptyRow('ИТОГО', 'ИТОГО:')
  for (const r of rows) {
    totals.total       += r.total
    totals.itr         += r.itr
    totals.workers     += r.workers
    totals.parkovschiki+= r.parkovschiki
    totals.bolnichniy  += r.bolnichniy
    totals.otgul       += r.otgul
    totals.otpusk      += r.otpusk
    totals.uchebniy    += r.uchebniy
    totals.dekret      += r.dekret
    totals.komandirovka+= r.komandirovka
    totals.svoMoscow   += r.svoMoscow
    totals.svoRegion   += r.svoRegion
    totals.mobilizovan += r.mobilizovan
    totals.trudSvo     += r.trudSvo
    totals.day         += r.day
    totals.night       += r.night
  }
  return { rows, totals }
}

export function printStroevaiya(
  enrichedUsers: EnrichedEmployee[],
  usersWithAssignment: UserWithAssignment[],
  phases: ShiftPhase[],
  services: Service[],
  opts: StroevayaOptions,
): string {
  const { rows, totals } = buildStroevayaRows(enrichedUsers, usersWithAssignment, phases, services, opts.dateStr, opts.showSvoSplit)
  const date = new Date(opts.dateStr + 'T12:00:00')

  // Column definitions
  type Col = { label: string; get: (r: StroevayaRow) => number }
  const cols: Col[] = [
    { label: 'Штат',        get: r => r.total    },
    ...(opts.showItrBreakdown ? [
      { label: 'ИТР',       get: (r: StroevayaRow) => r.itr     },
      { label: 'Рабочие',   get: (r: StroevayaRow) => r.workers  },
    ] : []),
    { label: 'По списку',   get: r => r.total    },
    ...(opts.showItrBreakdown ? [
      { label: 'ИТР',       get: (r: StroevayaRow) => r.itr     },
      { label: 'Рабочие',   get: (r: StroevayaRow) => r.workers  },
    ] : []),
    ...(opts.showParkovschiki ? [
      { label: 'Паркинг',   get: (r: StroevayaRow) => r.parkovschiki },
    ] : []),
    { label: 'Больн.<br>Лист',     get: r => r.bolnichniy   },
    { label: 'Отс.по<br>Акту',     get: r => r.otgul        },
    { label: 'Отпуск',             get: r => r.otpusk       },
    { label: 'Учеб.<br>отпуск',    get: r => r.uchebniy     },
    { label: 'Декр.<br>Отпуск',    get: r => r.dekret       },
    { label: 'Командиров',         get: r => r.komandirovka },
    ...(opts.showSvoSplit ? [
      { label: 'СВО<br>Москва',    get: (r: StroevayaRow) => r.svoMoscow },
      { label: 'СВО<br>Регионы',   get: (r: StroevayaRow) => r.svoRegion },
    ] : [
      { label: 'СВО',              get: (r: StroevayaRow) => r.svoMoscow },
    ]),
    { label: 'Мобили-<br>зов',     get: r => r.mobilizovan  },
    ...(opts.showTrudSvo ? [
      { label: 'Труд.<br>СВО',     get: (r: StroevayaRow) => r.trudSvo   },
    ] : []),
    ...(opts.showUvolenySvo ? [
      { label: 'Уволены<br>СВО',   get: (r: StroevayaRow) => r.uvolenySvo },
    ] : []),
    { label: 'Вакансии',           get: r => r.vacancies    },
    ...(opts.showShiftTotals ? [
      { label: 'ИТОГО<br>День',    get: (r: StroevayaRow) => r.day   },
      { label: 'ИТОГО<br>Ночь',    get: (r: StroevayaRow) => r.night },
    ] : []),
  ]

  const dateFormatted = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })

  const thead = `<tr>
    <th style="min-width:140px;text-align:left;padding:4px 6px">Участки</th>
    ${cols.map(c => `<th>${c.label}</th>`).join('')}
  </tr>`

  const renderRow = (r: StroevayaRow, isTotals = false): string =>
    `<tr${isTotals ? ' class="totals-row"' : ''}>
      <td style="text-align:left;padding:3px 6px">${r.serviceName}</td>
      ${cols.map(c => `<td class="center">${c.get(r) || '—'}</td>`).join('')}
    </tr>`

  const tbody = rows.map(r => renderRow(r)).join('')
  const tfoot = renderRow(totals, true)

  const sig = opts.showSignatureLines
    ? `<div class="sig-block">
        <div class="sig-item">Составил ___________________ / _________________ /</div>
        <div class="sig-item">Проверил ___________________ / _________________ /</div>
        <div class="sig-item">Утверждаю ___________________ / _________________ /</div>
       </div>`
    : ''
  const printDt = opts.showDate
    ? `<div class="print-date">Распечатано: ${new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>`
    : ''

  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 9pt; color: #000; background: #fff; }
    h1 { font-size: 13pt; font-weight: bold; text-align: center; margin-bottom: 4px; }
    .org { font-size: 9pt; text-align: center; }
    .subtitle { font-size: 10pt; text-align: center; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th, td { border: 1px solid #555; padding: 3px 4px; vertical-align: middle; font-size: 8pt; }
    th { background: #e8e8e8; font-weight: bold; text-align: center; }
    td { text-align: center; }
    td.center { text-align: center; }
    .totals-row { background: #f0f0f0; font-weight: bold; }
    .page-header { margin-bottom: 12px; }
    .sig-block { margin-top: 24px; display: flex; justify-content: space-between; gap: 40px; }
    .sig-item { flex: 1; border-top: 1px solid #000; padding-top: 4px; font-size: 9pt; text-align: center; }
    .print-date { font-size: 8pt; color: #666; text-align: right; margin-top: 8px; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    @media print {
      @page { size: A4 landscape; margin: 8mm 10mm; }
      body { font-size: 8pt; }
      .no-print { display: none !important; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      tr { break-inside: avoid; page-break-inside: avoid; }
    }
  `

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Строевая записка — ${dateFormatted}</title>
  <style>${css}</style>
</head>
<body>
  <div class="page-header">
    <div class="org">${opts.orgName}</div>
    <h1>СТРОЕВАЯ ЗАПИСКА</h1>
    <div class="subtitle">${dateFormatted}</div>
  </div>
  <table>
    <thead>${thead}</thead>
    <tbody>${tbody}${tfoot}</tbody>
  </table>
  ${sig}${printDt}
</body>
</html>`
}
