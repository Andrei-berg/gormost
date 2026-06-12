'use client'
import { useState, useEffect } from 'react'
import type { WorkPlanWithItems, WorkPlanItem, AuthSession } from '@/types'
import { fetchWorkPlans, fetchWorkPlansWithItems } from '@/lib/api-client'
import { useConfirm } from '@/components/ConfirmDialog'

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_NAMES: Record<string, string> = {
  'SRV-ENG':  'Инженерные системы',
  'SRV-STR':  'Строительная служба',
  'SRV-FIRE': 'Пожарная безопасность',
  'SRV-VENT': 'Вентиляция',
  'SRV-CCTV': 'Видеонаблюдение и СС',
}

const RU_MONTHS_GEN = [
  'января','февраля','марта','апреля','мая','июня',
  'июля','августа','сентября','октября','ноября','декабря',
]
const RU_DOW = ['ВС','ПН','ВТ','СР','ЧТ','ПТ','СБ']

function fmtDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()} ${RU_MONTHS_GEN[d.getMonth()]} ${d.getFullYear()} (${RU_DOW[d.getDay()]})`
}

function fmtRangTitle(from: string, to: string): string {
  const df = new Date(from + 'T00:00:00')
  const dt = new Date(to   + 'T00:00:00')
  if (from === to) return `${df.getDate()} ${RU_MONTHS_GEN[df.getMonth()]} ${df.getFullYear()} г.`
  if (df.getMonth() === dt.getMonth() && df.getFullYear() === dt.getFullYear())
    return `${df.getDate()} – ${dt.getDate()} ${RU_MONTHS_GEN[dt.getMonth()]} ${dt.getFullYear()} г.`
  return `${df.getDate()} ${RU_MONTHS_GEN[df.getMonth()]} – ${dt.getDate()} ${RU_MONTHS_GEN[dt.getMonth()]} ${dt.getFullYear()} г.`
}

// ─── Worker count formatting ──────────────────────────────────────────────────

function fmtStaff(item: WorkPlanItem): string {
  const parts: string[] = []
  const workers = (item.required_workers ?? 0) + (item.required_brigadiers ?? 0)
  if (workers > 0)           parts.push(`${workers}\u00a0раб.`)
  if (item.required_masters  > 0) parts.push(`${item.required_masters}\u00a0маст.`)
  if (item.required_foremen  > 0) parts.push(`${item.required_foremen}\u00a0итр`)
  if (item.required_vehicles > 0) parts.push(`${item.required_vehicles}\u00a0вод.`)
  if (parts.length === 0) return item.workers?.length ? `${item.workers.length}\u00a0чел.` : '—'
  return parts.join('+')
}

function fmtTransport(item: WorkPlanItem & { vehicles?: Array<{ fleet_number?: string | null; name?: string; plate?: string }> }): string {
  if (item.vehicles && item.vehicles.length > 0) {
    return item.vehicles.map(v => v.fleet_number ?? v.plate ?? v.name ?? '?').join(', ')
  }
  if (item.required_vehicles > 0) return `${item.required_vehicles}\u00a0ед.`
  return ''
}

// ─── Day totals ───────────────────────────────────────────────────────────────

interface DayTotals { workers: number; drivers: number; vehicles: number }

function calcTotals(items: WorkPlanItem[]): DayTotals {
  return items.reduce((acc, it) => ({
    workers:  acc.workers  + (it.required_workers ?? 0) + (it.required_brigadiers ?? 0) + (it.required_masters ?? 0) + (it.required_foremen ?? 0),
    drivers:  acc.drivers  + (it.required_vehicles ?? 0),
    vehicles: acc.vehicles + (it.required_vehicles ?? 0),
  }), { workers: 0, drivers: 0, vehicles: 0 })
}

function fmtTotals(t: DayTotals): string {
  const parts = []
  if (t.workers  > 0) parts.push(`${t.workers}\u00a0чел.`)
  if (t.vehicles > 0) parts.push(`${t.vehicles}\u00a0вод./трактор.`)
  return parts.join(' + ') || 'нет данных'
}

// ─── HTML generator ───────────────────────────────────────────────────────────

// grouped: date → service_id → plans[]
type PlanMap = Map<string, Map<string, WorkPlanWithItems[]>>

function buildMap(plans: WorkPlanWithItems[]): PlanMap {
  const map: PlanMap = new Map()
  for (const p of plans) {
    if (!map.has(p.plan_date)) map.set(p.plan_date, new Map())
    const byService = map.get(p.plan_date)!
    if (!byService.has(p.service_id)) byService.set(p.service_id, [])
    byService.get(p.service_id)!.push(p)
  }
  return map
}

function generateSummaryHTML(
  plans: WorkPlanWithItems[],
  dateFrom: string,
  dateTo: string,
  signerName: string,
  signerPosition: string,
): string {
  const map = buildMap(plans)
  const dates = [...map.keys()].sort()

  const td = (content: string, style = '') =>
    `<td style="padding:3px 6px;border:1px solid #000;vertical-align:top;${style}">${content}</td>`
  const th = (content: string, style = '') =>
    `<td style="padding:3px 6px;border:1px solid #000;font-weight:bold;text-align:center;background:#e0e0e0;${style}">${content}</td>`

  const dayBlocks = dates.map(date => {
    const byService = map.get(date)!
    const allItems = [...byService.values()].flat().flatMap(p => p.items)
    const dayTotals = calcTotals(allItems)

    const serviceBlocks = [...byService.entries()]
      .sort(([a], [b]) => (SERVICE_NAMES[a] ?? a).localeCompare(SERVICE_NAMES[b] ?? b))
      .map(([svcId, svcPlans]) => {
        const svcName = SERVICE_NAMES[svcId] ?? svcId
        const svcItems = svcPlans.flatMap(p => p.items)
        const svcTotals = calcTotals(svcItems)

        let rowNum = 0
        const rows = svcPlans
          .sort((a, b) => {
            const order = { DAY: 0, NIGHT: 1 }
            return (order[a.shift_type] ?? 0) - (order[b.shift_type] ?? 0)
          })
          .flatMap(plan => {
            const shiftBadge = plan.shift_type === 'DAY'
              ? '<span style="color:#b36b00;font-size:9pt">☀ день</span>'
              : '<span style="color:#3355aa;font-size:9pt">☾ ночь</span>'
            return plan.items.map(item => {
              rowNum++
              const staff = fmtStaff(item as WorkPlanItem & { vehicles?: Array<{ fleet_number?: string | null; name?: string; plate?: string }> })
              const transport = fmtTransport(item as WorkPlanItem & { vehicles?: Array<{ fleet_number?: string | null; name?: string; plate?: string }> })
              const timeStr = item.time_start
                ? `${item.time_start}${item.time_end ? '–' + item.time_end : ''}`
                : shiftBadge
              return `<tr>
                ${td(String(rowNum), 'text-align:center;width:24px')}
                ${td(`<b>${item.location}</b>`, 'width:170px')}
                ${td(item.work_description)}
                ${td(timeStr, 'text-align:center;width:70px;font-size:9pt')}
                ${td(staff, 'text-align:center;width:80px;white-space:nowrap')}
                ${td(transport, 'text-align:center;width:70px;font-size:9pt')}
              </tr>`
            })
          }).join('')

        const svcTotalStr = fmtTotals(svcTotals)

        return `
          <div style="margin-bottom:12px">
            <table style="width:100%;border-collapse:collapse;margin-bottom:0">
              <thead>
                <tr>
                  <td colspan="6" style="padding:4px 6px;background:#f4f4f4;border:1px solid #000;font-size:11pt">
                    <b>${svcName}</b>
                    <span style="font-size:10pt;color:#555;font-weight:normal;margin-left:12px">Ответственный:&nbsp;<span style="border-bottom:1px solid #888;display:inline-block;min-width:140px">&nbsp;</span></span>
                    <span style="font-size:9pt;color:#888;float:right">итого: ${svcTotalStr}</span>
                  </td>
                </tr>
                <tr>
                  ${th('№', 'width:24px;font-size:9pt')}
                  ${th('Объект', 'width:170px;font-size:9pt')}
                  ${th('Описание работ', 'font-size:9pt')}
                  ${th('Смена/<br>Время', 'width:70px;font-size:9pt')}
                  ${th('Состав', 'width:80px;font-size:9pt')}
                  ${th('Транспорт', 'width:70px;font-size:9pt')}
                </tr>
              </thead>
              <tbody>
                ${rows || '<tr><td colspan="6" style="color:#aaa;font-style:italic;text-align:center;padding:4px">Нет позиций</td></tr>'}
              </tbody>
            </table>
          </div>`
      }).join('')

    const d = new Date(date + 'T00:00:00')
    const isWeekend = d.getDay() === 0 || d.getDay() === 6
    const dayHeader = fmtDay(date).toUpperCase()

    return `
      <div style="margin-bottom:18px;page-break-inside:avoid">
        <div style="background:#222;color:#fff;padding:6px 10px;font-size:12pt;font-weight:bold;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
          <span>${dayHeader}${isWeekend ? ' · выходной' : ''}</span>
          <span style="font-size:10pt;font-weight:normal">${fmtTotals(dayTotals)}</span>
        </div>
        ${serviceBlocks}
      </div>`
  }).join('')

  const today = new Date().toLocaleDateString('ru-RU')

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>План работ ${dateFrom}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #000; background: #fff; }
  @page { size: A4 landscape; margin: 10mm 12mm 15mm 15mm; }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    .no-break { break-inside: avoid; page-break-inside: avoid; }
  }
</style>
</head>
<body>

  <!-- HEADER -->
  <div style="text-align:center;margin-bottom:12px;border-bottom:2px solid #000;padding-bottom:8px">
    <div style="font-size:10pt;color:#555">ГБУ «Гормост» · Участок «Гормост-Лефортово»</div>
    <div style="font-size:16pt;font-weight:bold;margin:3px 0">ПЛАН РАБОТ</div>
    <div style="font-size:12pt">${fmtRangTitle(dateFrom, dateTo)}</div>
  </div>

  ${dayBlocks.trim() || '<p style="color:#aaa;text-align:center;font-style:italic">Нет подтверждённых планов за выбранный период</p>'}

  <!-- SIGNATURE -->
  <div style="margin-top:16px;border-top:1px solid #ccc;padding-top:10px">
    <table style="width:100%">
      <tr>
        <td style="padding:2px 0">${signerPosition || 'Старший производитель работ'}:</td>
        <td style="padding:2px 12px;border-bottom:1px solid #000;min-width:200px">${signerName}</td>
        <td style="padding:2px 24px"></td>
        <td style="padding:2px 0;white-space:nowrap;color:#888;font-size:9pt">Напечатано: ${today}</td>
      </tr>
    </table>
  </div>

</body>
</html>`
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface Props {
  session: AuthSession
  onClose: () => void
}

function todayStr() { return new Date().toISOString().split('T')[0] }

function addDays(d: string, n: number): string {
  const dt = new Date(d + 'T00:00:00')
  dt.setDate(dt.getDate() + n)
  return dt.toISOString().split('T')[0]
}

export default function WorkPlanSummaryModal({ session, onClose }: Props) {
  const confirmDialog = useConfirm()
  const today = todayStr()

  const [dateFrom,   setDateFrom]   = useState(today)
  const [dateTo,     setDateTo]     = useState(addDays(today, 3))
  const [signerName, setSignerName] = useState(session.full_name ?? '')
  const [signerPos,  setSignerPos]  = useState(session.position ?? 'Старший производитель работ')

  const [plans,   setPlans]   = useState<WorkPlanWithItems[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded,  setLoaded]  = useState(false)

  // Load plans for selected range
  const loadPlans = async () => {
    setLoading(true)
    setLoaded(false)
    try {
      const raw = await fetchWorkPlans({
        dateFrom,
        dateTo,
        statuses: ['BOSS_CONFIRMED', 'ASSIGNED', 'IN_PROGRESS', 'PLANNED'],
      })
      const withItems = await fetchWorkPlansWithItems(raw.map(p => p.id))
      setPlans(withItems)
      setLoaded(true)
    } finally {
      setLoading(false)
    }
  }

  // Auto-load on date change
  useEffect(() => {
    if (dateFrom && dateTo && dateFrom <= dateTo) loadPlans()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo])

  const handlePrint = () => {
    const html = generateSummaryHTML(plans, dateFrom, dateTo, signerName, signerPos)
    const win = window.open('', '_blank')
    if (!win) { void confirmDialog('Разрешите всплывающие окна в браузере', { alert: true }); return }
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 400)
  }

  // Stats for the info block
  const daysWithPlans = new Set(plans.map(p => p.plan_date)).size
  const totalItems    = plans.reduce((s, p) => s + p.items.length, 0)
  const services      = [...new Set(plans.map(p => p.service_id))]

  const inp = 'bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white/80 focus:outline-none focus:border-blue-500/50 w-full'
  const lbl = 'block text-[10px] text-white/40 uppercase tracking-wider mb-1'

  // Quick range presets
  const presets = [
    { label: 'Сегодня',    from: today,            to: today },
    { label: 'Завтра',     from: addDays(today,1), to: addDays(today,1) },
    { label: '3 дня',      from: today,            to: addDays(today,2) },
    { label: 'Выходные',   from: (() => {
      const d = new Date(today + 'T00:00:00')
      const dow = d.getDay()
      const toFri = dow <= 5 ? 5 - dow : 0
      const fri = addDays(today, toFri)
      return addDays(fri, dow === 0 ? 0 : 1) // next Saturday
    })(), to: (() => {
      const d = new Date(today + 'T00:00:00')
      const dow = d.getDay()
      const toSun = dow === 0 ? 0 : 7 - dow
      return addDays(today, toSun)
    })() },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative z-10 w-full max-w-xl rounded-2xl shadow-2xl border border-white/15 overflow-hidden"
        style={{ background: 'rgba(15, 20, 40, 0.97)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <div className="text-sm font-bold text-white">🖨 Сводный план работ</div>
            <div className="text-[11px] text-white/40 mt-0.5">
              Для совещания 16:30 у начальника участка
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-lg">✕</button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">

          {/* Quick presets */}
          <div>
            <div className={lbl}>Быстрый выбор периода</div>
            <div className="flex gap-2 flex-wrap">
              {presets.map(p => (
                <button
                  key={p.label}
                  onClick={() => { setDateFrom(p.from); setDateTo(p.to) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                    dateFrom === p.from && dateTo === p.to
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Дата начала</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Дата окончания</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inp} />
            </div>
          </div>

          {/* Status block */}
          <div className="rounded-xl p-3 border border-white/8 space-y-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {loading && (
              <div className="text-[11px] text-white/30 italic">Загрузка планов...</div>
            )}
            {loaded && !loading && plans.length === 0 && (
              <div className="text-[11px] text-amber-400/70">
                Нет подтверждённых планов за выбранный период
              </div>
            )}
            {loaded && !loading && plans.length > 0 && (
              <>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                    📅 {daysWithPlans} {daysWithPlans === 1 ? 'день' : 'дней'}
                  </span>
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    📋 {totalItems} позиций
                  </span>
                  <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full border border-violet-500/30">
                    🏢 {services.length} служб
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {services.map(svc => (
                    <span key={svc} className="text-[10px] text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
                      {SERVICE_NAMES[svc] ?? svc}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Signer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Подписывает — ФИО</label>
              <input value={signerName} onChange={e => setSignerName(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Должность</label>
              <input value={signerPos} onChange={e => setSignerPos(e.target.value)} className={inp} />
            </div>
          </div>

          {/* Format note */}
          <div className="rounded-xl p-3 border border-blue-500/15 bg-blue-500/5">
            <div className="text-[10px] text-blue-400/70 uppercase tracking-wider mb-1">Формат печати</div>
            <div className="text-[11px] text-white/50 leading-relaxed">
              A4 альбомный · Группировка: день → служба → позиции.
              Колонка «Ответственный» — пустая строка (мастер вписывается вручную).
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 flex items-center justify-between gap-3">
          <div className="text-[11px] text-white/25">
            {loaded && plans.length > 0 ? `${plans.length} планов · ${totalItems} позиций` : ''}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm transition-colors">
              Отмена
            </button>
            <button
              onClick={handlePrint}
              disabled={loading || plans.length === 0}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
            >
              🖨 Открыть для печати
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
