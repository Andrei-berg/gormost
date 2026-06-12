'use client'
import { useState, useEffect } from 'react'
import { fetchStatusesForPeriodWithUsers } from '@/lib/api-client'
import type { StatusWithUser } from '@/lib/api-client'
import { EMPLOYEE_STATUS_CONFIG } from '@/types'
import type { AuthSession, Service } from '@/types'

interface Props {
  session: AuthSession
  services: Service[]
}

type ReportTab = 'svo' | 'mobilizovan' | 'bolnichniy' | 'komandirovka' | 'otgul' | 'otpusk' | 'uvolen' | 'voennie_sbory' | 'dokladnaya'

function fmtPeriod(dateFrom: string, dateTo: string | null): string {
  const from = new Date(dateFrom + 'T00:00:00').toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
  if (!dateTo) return `с ${from} по настоящее время`
  const to = new Date(dateTo + 'T00:00:00').toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return `с ${from} по ${to}`
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const MONTHS_RU = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
]

const MONTHS_RU_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

function getMonthLabel(yyyyMM: string): string {
  const [y, m] = yyyyMM.split('-')
  return `${MONTHS_RU[parseInt(m) - 1]} ${y} г.`
}

// Column 5 — "Причина отсутствия (б/л, справка и т.д.)" in докладная
function getDokladnayaReason(row: StatusWithUser): string {
  const meta = row.metadata
  switch (row.status) {
    case 'SVO':
      return 'Приостановка трудового договора'
    case 'Mobilizovan': {
      const num = meta?.order_number ? `Приказ № ${meta.order_number}` : 'Приказ'
      const date = meta?.order_date
        ? ` от ${new Date(meta.order_date + 'T00:00:00').toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
        : ''
      return num + date
    }
    case 'Bolnichniy': {
      const loc = meta?.sick_leave_location
        ? meta.sick_leave_location.charAt(0).toUpperCase() + meta.sick_leave_location.slice(1)
        : ''
      const num = meta?.sick_leave_number ? `б/л № ${meta.sick_leave_number}` : ''
      return [loc, num].filter(Boolean).join(' ')
    }
    case 'Voennie_sbory':
      return 'Г'
    default:
      return ''
  }
}

// Column 6 — "Примечание" in докладная
function getDokladnayaNotes(row: StatusWithUser): string {
  const meta = row.metadata
  switch (row.status) {
    case 'SVO': {
      if (meta?.volunteer_type === 'по контракту') return 'Доброволец по контракту'
      if (meta?.volunteer_type === 'доброволец') return 'Доброволец'
      return ''
    }
    case 'Mobilizovan':
      return 'Мобилизован'
    case 'Bolnichniy': {
      if (meta?.sick_leave_submitted === true) {
        const date = meta?.sick_leave_submitted_date
          ? ` ${new Date(meta.sick_leave_submitted_date + 'T00:00:00').toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
          : ''
        return `б/л сдан в отдел кадров${date}`
      }
      // Not submitted or unknown
      const parts = ['б/л не сдан']
      if (!row.date_to) parts.push('продолжает болеть')
      return parts.join(', ')
    }
    case 'Voennie_sbory':
      return 'Прохождение военно-учебных сборов'
    default:
      return row.reason ?? ''
  }
}


// СВО, Мобилизованные, Больничные, Военные сборы go into докладная
const DOKLADNAYA_STATUSES = new Set(['SVO', 'Mobilizovan', 'Bolnichniy', 'Voennie_sbory'])

function openDokladnaya(statuses: StatusWithUser[], reportMonth: string, selectedIds: Set<string>): void {
  const [y, m] = reportMonth.split('-')
  const monthWord = `${MONTHS_RU_GENITIVE[parseInt(m) - 1]} ${y}`

  const rows = statuses
    .filter(s => DOKLADNAYA_STATUSES.has(s.status) && selectedIds.has(s.id))
    .map((s, i) => `
      <tr>
        <td style="border:1px solid #000;padding:4px 8px;text-align:center;">${i + 1}</td>
        <td style="border:1px solid #000;padding:4px 8px;">${s.user_full_name}</td>
        <td style="border:1px solid #000;padding:4px 8px;">${s.user_position ?? '—'}</td>
        <td style="border:1px solid #000;padding:4px 8px;">${fmtPeriod(s.date_from, s.date_to)}</td>
        <td style="border:1px solid #000;padding:4px 8px;">${getDokladnayaReason(s)}</td>
        <td style="border:1px solid #000;padding:4px 8px;">${getDokladnayaNotes(s)}</td>
      </tr>`)
    .join('')

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8"/>
  <title>Докладная записка</title>
  <style>
    body { font-family: 'Times New Roman', serif; font-size: 14px; margin: 40px; color: #000; }
    .header-right { display: flex; justify-content: flex-end; margin-bottom: 40px; }
    .header-right-inner { text-align: left; line-height: 1.8; }
    h1 { text-align: center; font-size: 16px; font-weight: bold; margin: 30px 0; text-transform: none; }
    .body-text { margin-bottom: 20px; text-indent: 40px; line-height: 1.8; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { border: 1px solid #000; padding: 6px 8px; background: #f0f0f0; font-weight: bold; text-align: center; }
    .signature { display: flex; justify-content: space-between; margin-top: 60px; }
    @media print { body { margin: 20mm; } }
  </style>
</head>
<body>
  <div class="header-right">
    <div class="header-right-inner">
      Руководителю ГБУ "Гормост"<br/>
      Ю.А. Иванкову<br/>
      от начальника участка<br/>
      эксплуатации тоннелей<br/>
      большой протяженности<br/>
      "Гормост-Лефортово"<br/>
      В.Ю. Гурьянова
    </div>
  </div>

  <h1>Докладная записка</h1>

  <p class="body-text">
    Настоящим докладываю Вам список сотрудников участка эксплуатации тоннелей большой протяженности
    "Гормост-Лефортово", не вышедших на работу на ${monthWord}:
  </p>

  <table>
    <thead>
      <tr>
        <th style="width:40px;">№</th>
        <th>ФИО</th>
        <th>Должность</th>
        <th>Период отсутствия</th>
        <th>Причина отсутствия</th>
        <th>Примечание</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="6" style="text-align:center;padding:12px;">Нет данных</td></tr>'}
    </tbody>
  </table>

  <div class="signature">
    <span>Начальник участка эксплуатации<br/>тоннелей большой протяженности<br/>"Гормост-Лефортово"</span>
    <span>В.Ю. Гурьянов</span>
  </div>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html; charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

const REPORT_TABS: { id: ReportTab; label: string }[] = [
  { id: 'svo',           label: 'СВО' },
  { id: 'mobilizovan',   label: 'Мобилизованные' },
  { id: 'bolnichniy',    label: 'Больничные' },
  { id: 'komandirovka',  label: 'Командировочные' },
  { id: 'otgul',         label: 'Отгулы' },
  { id: 'otpusk',        label: 'Отпуска' },
  { id: 'voennie_sbory', label: 'Военные сборы' },
  { id: 'uvolen',        label: 'Уволенные' },
  { id: 'dokladnaya',    label: 'Докладная' },
]

function EmptyRow({ cols, label }: { cols: number; label: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-3 py-8 text-center text-white/30 text-xs">
        Нет данных за {label}
      </td>
    </tr>
  )
}

export default function HRReports({ services }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const currentMonth = today.slice(0, 7)

  const [reportMonth, setReportMonth] = useState(currentMonth)
  const [filterService, setFilterService] = useState('')
  const [statuses, setStatuses] = useState<StatusWithUser[]>([])
  const [loading, setLoading] = useState(false)
  const [activeReport, setActiveReport] = useState<ReportTab>('svo')

  // Selection state for докладная — individual rows
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  // Which status groups to include in докладная
  const [includedGroups, setIncludedGroups] = useState<Set<string>>(new Set(DOKLADNAYA_STATUSES))

  async function load() {
    setLoading(true)
    const [y, m] = reportMonth.split('-').map(Number)
    const dateFrom = `${reportMonth}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const dateTo = `${reportMonth}-${String(lastDay).padStart(2, '0')}`
    const data = await fetchStatusesForPeriodWithUsers(dateFrom, dateTo, filterService || undefined)
    setStatuses(data)
    // Pre-select all eligible rows for докладная
    const eligible = new Set(data.filter(s => DOKLADNAYA_STATUSES.has(s.status)).map(s => s.id))
    setSelectedIds(eligible)
    setLoading(false)
  }

  useEffect(() => { load() }, [reportMonth, filterService]) // eslint-disable-line react-hooks/exhaustive-deps

  const svo = statuses.filter(s => s.status === 'SVO')
  const mobilizovan = statuses.filter(s => s.status === 'Mobilizovan')
  const bolnichniy = statuses.filter(s => s.status === 'Bolnichniy')
  const komandirovka = statuses.filter(s => s.status === 'Komandirovka')
  const otgul = statuses.filter(s => s.status === 'Otgul')
  const otpusk = statuses.filter(s => s.status === 'Otpusk' || s.status === 'Uchebniy_otpusk')
  const uvolen = statuses.filter(s => s.status === 'Uvolen')
  const voennie_sbory = statuses.filter(s => s.status === 'Voennie_sbory')
  const dokladnayaRows = statuses.filter(s => DOKLADNAYA_STATUSES.has(s.status) && includedGroups.has(s.status))

  const thCls = 'px-3 py-2 text-left text-[10px] text-white/40 font-medium uppercase tracking-wide border-b border-white/10'
  const tdCls = 'px-3 py-2 text-xs text-white/70'

  const monthLabel = getMonthLabel(reportMonth)

  function toggleId(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    const allIds = dokladnayaRows.map(s => s.id)
    const allSelected = allIds.every(id => selectedIds.has(id))
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allIds))
    }
  }

  function toggleGroup(status: string) {
    const groupIds = statuses.filter(s => s.status === status).map(s => s.id)
    setIncludedGroups(prev => {
      const next = new Set(prev)
      if (next.has(status)) {
        next.delete(status)
        // deselect all rows of this group
        setSelectedIds(prevSel => {
          const sel = new Set(prevSel)
          groupIds.forEach(id => sel.delete(id))
          return sel
        })
      } else {
        next.add(status)
        // select all rows of this group
        setSelectedIds(prevSel => {
          const sel = new Set(prevSel)
          groupIds.forEach(id => sel.add(id))
          return sel
        })
      }
      return next
    })
  }

  const allSelected = dokladnayaRows.length > 0 && dokladnayaRows.every(s => selectedIds.has(s.id))

  const DOKLADNAYA_GROUPS: { status: string; label: string; color: string; bg: string }[] = [
    { status: 'SVO',          label: 'СВО',            color: '#991b1b', bg: 'bg-red-900/20 border-red-900/30' },
    { status: 'Mobilizovan',  label: 'Мобилизованные', color: '#dc2626', bg: 'bg-red-700/20 border-red-700/30' },
    { status: 'Bolnichniy',   label: 'Больничные',     color: '#f97316', bg: 'bg-orange-500/20 border-orange-500/30' },
    { status: 'Voennie_sbory',label: 'Военные сборы',  color: '#6366f1', bg: 'bg-indigo-500/20 border-indigo-500/30' },
  ]

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <label className="text-[10px] text-white/40 block mb-1">Месяц</label>
          <input
            type="month"
            value={reportMonth}
            onChange={e => setReportMonth(e.target.value)}
            className="text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white/80 focus:outline-none focus:border-white/30"
          />
        </div>
        <div>
          <label className="text-[10px] text-white/40 block mb-1">Служба</label>
          <select
            value={filterService}
            onChange={e => setFilterService(e.target.value)}
            className="text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white/80 focus:outline-none focus:border-white/30"
          >
            <option value="">Все службы</option>
            {services.map(s => (
              <option key={s.service_id} value={s.service_id}>{s.service_name}</option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10 text-xs transition-colors disabled:opacity-40"
          >
            {loading ? '…' : '↻ Обновить'}
          </button>
          {loading && <div className="w-3.5 h-3.5 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1">
        {REPORT_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveReport(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeReport === t.id
                ? t.id === 'dokladnaya'
                  ? 'bg-purple-600/40 text-white border border-purple-500/40'
                  : 'bg-teal-600/40 text-white border border-teal-500/40'
                : 'text-white/40 hover:text-white/70 bg-white/5 border border-transparent'
            }`}
          >
            {t.id === 'dokladnaya' ? '🖨 ' : ''}{t.label}
          </button>
        ))}
      </div>

      {/* Report content */}
      <div className="glass rounded-2xl overflow-hidden">

        {/* СВО */}
        {activeReport === 'svo' && (
          <table className="w-full">
            <thead>
              <tr>
                <th className={thCls}>№</th>
                <th className={thCls}>ФИО</th>
                <th className={thCls}>Тип</th>
                <th className={thCls}>Приостановлен ТД</th>
                <th className={thCls}>С какого числа</th>
              </tr>
            </thead>
            <tbody>
              {svo.length === 0 ? <EmptyRow cols={5} label={monthLabel} /> : svo.map((s, i) => (
                <tr key={s.id} className={i % 2 === 1 ? 'bg-white/[0.02]' : ''}>
                  <td className={tdCls}>{i + 1}</td>
                  <td className={tdCls}>{s.user_full_name}</td>
                  <td className={tdCls}>{s.metadata?.volunteer_type ?? '—'}</td>
                  <td className={tdCls}>{s.metadata?.contract_suspended ? 'Да' : 'Нет'}</td>
                  <td className={tdCls}>{fmtDate(s.date_from)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Мобилизованные */}
        {activeReport === 'mobilizovan' && (
          <table className="w-full">
            <thead>
              <tr>
                <th className={thCls}>№</th>
                <th className={thCls}>ФИО</th>
                <th className={thCls}>Должность</th>
                <th className={thCls}>№ приказа</th>
                <th className={thCls}>Дата приказа</th>
              </tr>
            </thead>
            <tbody>
              {mobilizovan.length === 0 ? <EmptyRow cols={5} label={monthLabel} /> : mobilizovan.map((s, i) => (
                <tr key={s.id} className={i % 2 === 1 ? 'bg-white/[0.02]' : ''}>
                  <td className={tdCls}>{i + 1}</td>
                  <td className={tdCls}>{s.user_full_name}</td>
                  <td className={tdCls}>{s.user_position ?? '—'}</td>
                  <td className={tdCls}>{s.metadata?.order_number ?? '—'}</td>
                  <td className={tdCls}>{fmtDate(s.metadata?.order_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Больничные */}
        {activeReport === 'bolnichniy' && (
          <table className="w-full">
            <thead>
              <tr>
                <th className={thCls}>№</th>
                <th className={thCls}>ФИО</th>
                <th className={thCls}>Должность</th>
                <th className={thCls}>№ б/л</th>
                <th className={thCls}>Место лечения</th>
                <th className={thCls}>Период</th>
                <th className={thCls}>Б/л сдан</th>
              </tr>
            </thead>
            <tbody>
              {bolnichniy.length === 0 ? <EmptyRow cols={7} label={monthLabel} /> : bolnichniy.map((s, i) => (
                <tr key={s.id} className={i % 2 === 1 ? 'bg-white/[0.02]' : ''}>
                  <td className={tdCls}>{i + 1}</td>
                  <td className={tdCls}>{s.user_full_name}</td>
                  <td className={tdCls}>{s.user_position ?? '—'}</td>
                  <td className={tdCls}>{s.metadata?.sick_leave_number ?? '—'}</td>
                  <td className={tdCls}>{s.metadata?.sick_leave_location ?? '—'}</td>
                  <td className={tdCls}>
                    <span className={!s.date_to ? 'text-amber-400' : ''}>
                      {fmtPeriod(s.date_from, s.date_to)}
                    </span>
                  </td>
                  <td className={tdCls}>
                    {s.metadata?.sick_leave_submitted === true
                      ? <span className="text-green-400">Да</span>
                      : s.metadata?.sick_leave_submitted === false
                        ? <span className="text-amber-400">Нет</span>
                        : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Командировочные */}
        {activeReport === 'komandirovka' && (
          <table className="w-full">
            <thead>
              <tr>
                <th className={thCls}>№</th>
                <th className={thCls}>ФИО</th>
                <th className={thCls}>Должность</th>
                <th className={thCls}>Период</th>
              </tr>
            </thead>
            <tbody>
              {komandirovka.length === 0 ? <EmptyRow cols={4} label={monthLabel} /> : komandirovka.map((s, i) => (
                <tr key={s.id} className={i % 2 === 1 ? 'bg-white/[0.02]' : ''}>
                  <td className={tdCls}>{i + 1}</td>
                  <td className={tdCls}>{s.user_full_name}</td>
                  <td className={tdCls}>{s.user_position ?? '—'}</td>
                  <td className={tdCls}>{fmtPeriod(s.date_from, s.date_to)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Отгулы */}
        {activeReport === 'otgul' && (
          <table className="w-full">
            <thead>
              <tr>
                <th className={thCls}>№</th>
                <th className={thCls}>ФИО</th>
                <th className={thCls}>Должность</th>
                <th className={thCls}>Основание</th>
              </tr>
            </thead>
            <tbody>
              {otgul.length === 0 ? <EmptyRow cols={4} label={monthLabel} /> : otgul.map((s, i) => (
                <tr key={s.id} className={i % 2 === 1 ? 'bg-white/[0.02]' : ''}>
                  <td className={tdCls}>{i + 1}</td>
                  <td className={tdCls}>{s.user_full_name}</td>
                  <td className={tdCls}>{s.user_position ?? '—'}</td>
                  <td className={tdCls}>
                    {s.metadata?.otgul_basis === 'za_svoy_schet'
                      ? 'За свой счёт'
                      : 'За ранее отработанное'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Отпуска */}
        {activeReport === 'otpusk' && (
          <table className="w-full">
            <thead>
              <tr>
                <th className={thCls}>№</th>
                <th className={thCls}>ФИО</th>
                <th className={thCls}>Должность</th>
                <th className={thCls}>Вид отпуска</th>
                <th className={thCls}>Период</th>
              </tr>
            </thead>
            <tbody>
              {otpusk.length === 0 ? <EmptyRow cols={5} label={monthLabel} /> : otpusk.map((s, i) => (
                <tr key={s.id} className={i % 2 === 1 ? 'bg-white/[0.02]' : ''}>
                  <td className={tdCls}>{i + 1}</td>
                  <td className={tdCls}>{s.user_full_name}</td>
                  <td className={tdCls}>{s.user_position ?? '—'}</td>
                  <td className={tdCls}>{s.metadata?.leave_type ?? '—'}</td>
                  <td className={tdCls}>{fmtPeriod(s.date_from, s.date_to)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Военные сборы */}
        {activeReport === 'voennie_sbory' && (
          <table className="w-full">
            <thead>
              <tr>
                <th className={thCls}>№</th>
                <th className={thCls}>ФИО</th>
                <th className={thCls}>Должность</th>
                <th className={thCls}>Период</th>
                <th className={thCls}>Примечание</th>
              </tr>
            </thead>
            <tbody>
              {voennie_sbory.length === 0 ? <EmptyRow cols={5} label={monthLabel} /> : voennie_sbory.map((s, i) => (
                <tr key={s.id} className={i % 2 === 1 ? 'bg-white/[0.02]' : ''}>
                  <td className={tdCls}>{i + 1}</td>
                  <td className={tdCls}>{s.user_full_name}</td>
                  <td className={tdCls}>{s.user_position ?? '—'}</td>
                  <td className={tdCls}>{fmtPeriod(s.date_from, s.date_to)}</td>
                  <td className={tdCls}>{s.reason ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Уволенные */}
        {activeReport === 'uvolen' && (
          <table className="w-full">
            <thead>
              <tr>
                <th className={thCls}>№</th>
                <th className={thCls}>ФИО</th>
                <th className={thCls}>Должность</th>
                <th className={thCls}>Дата увольнения</th>
              </tr>
            </thead>
            <tbody>
              {uvolen.length === 0 ? <EmptyRow cols={4} label={monthLabel} /> : uvolen.map((s, i) => (
                <tr key={s.id} className={i % 2 === 1 ? 'bg-white/[0.02]' : ''}>
                  <td className={tdCls}>{i + 1}</td>
                  <td className={tdCls}>{s.user_full_name}</td>
                  <td className={tdCls}>{s.user_position ?? '—'}</td>
                  <td className={tdCls}>{fmtDate(s.date_from)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Докладная */}
        {activeReport === 'dokladnaya' && (
          <div className="p-4 space-y-4">
            <div>
              <div className="text-sm text-white/70 font-medium mb-1">Докладная записка</div>
              <div className="text-xs text-white/40">
                Выберите разделы и сотрудников для включения в документ за {getMonthLabel(reportMonth)}.
              </div>
            </div>

            {/* Group toggles */}
            <div className="space-y-1.5">
              <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Разделы</div>
              <div className="flex flex-wrap gap-2">
                {DOKLADNAYA_GROUPS.map(g => {
                  const count = statuses.filter(s => s.status === g.status).length
                  const on = includedGroups.has(g.status)
                  return (
                    <button
                      key={g.status}
                      onClick={() => toggleGroup(g.status)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        on
                          ? `${g.bg} opacity-100`
                          : 'bg-white/5 border-white/10 opacity-40'
                      }`}
                      style={on ? { color: g.color } : { color: '#ffffff66' }}
                    >
                      <span className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 ${on ? 'border-current bg-current/20' : 'border-white/20'}`}>
                        {on && <span className="text-[8px] leading-none font-bold">✓</span>}
                      </span>
                      {g.label}
                      {count > 0 && (
                        <span className="ml-0.5 opacity-60">({count})</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="border-t border-white/10" />

            {dokladnayaRows.length === 0 ? (
              <div className="text-xs text-white/30 py-4">
                {includedGroups.size === 0
                  ? 'Не выбран ни один раздел'
                  : `Нет данных за ${getMonthLabel(reportMonth)}`}
              </div>
            ) : (
              <div className="space-y-1">
                {/* Select all toggle */}
                <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="accent-purple-500 w-4 h-4"
                  />
                  <span className="text-xs text-white/50 font-medium">Выбрать всех ({dokladnayaRows.length})</span>
                </label>
                <div className="border-t border-white/10 my-1" />
                {/* Individual rows */}
                {dokladnayaRows.map(s => {
                  const cfg = EMPLOYEE_STATUS_CONFIG[s.status]
                  return (
                    <label key={s.id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggleId(s.id)}
                        className="accent-purple-500 w-4 h-4 mt-0.5 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-white/80 font-medium">{s.user_full_name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded border ${cfg?.bg ?? ''}`}
                            style={{ color: cfg?.color }}
                          >
                            {cfg?.label ?? s.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-white/40 mt-0.5">
                          {fmtPeriod(s.date_from, s.date_to)}
                          {s.user_position && <span className="ml-2 text-white/30">{s.user_position}</span>}
                        </div>
                        {(getDokladnayaReason(s) || getDokladnayaNotes(s)) && (
                          <div className="text-[10px] text-white/30 mt-0.5 italic">
                            {[getDokladnayaReason(s), getDokladnayaNotes(s)].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2 border-t border-white/10">
              <span className="text-xs text-white/40">
                Выбрано: <span className="text-white/70">{selectedIds.size}</span> из {dokladnayaRows.length}
              </span>
              <button
                onClick={() => openDokladnaya(statuses, reportMonth, selectedIds)}
                disabled={selectedIds.size === 0}
                className="px-4 py-2 rounded-lg bg-purple-600/30 border border-purple-500/40 text-purple-300 hover:bg-purple-600/50 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Открыть для печати
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
