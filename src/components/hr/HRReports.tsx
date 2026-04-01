'use client'
import { useState, useEffect } from 'react'
import { fetchStatusesForPeriodWithUsers } from '@/lib/api'
import type { StatusWithUser } from '@/lib/api'
import { EMPLOYEE_STATUS_CONFIG } from '@/types'
import type { AuthSession, Service } from '@/types'

interface Props {
  session: AuthSession
  services: Service[]
}

type ReportTab = 'svo' | 'mobilizovan' | 'bolnichniy' | 'komandirovka' | 'otgul' | 'otpusk' | 'uvolen' | 'dokladnaya'

function fmtPeriod(dateFrom: string, dateTo: string | null): string {
  const from = new Date(dateFrom + 'T00:00:00').toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
  if (!dateTo) return `с ${from}`
  const to = new Date(dateTo + 'T00:00:00').toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return `${from} — ${to}`
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

function getReasonLabel(row: StatusWithUser): string {
  const meta = row.metadata
  switch (row.status) {
    case 'Bolnichniy':
      return meta?.sick_leave_number ? `б/л №${meta.sick_leave_number}` : 'больничный'
    case 'SVO':
      return 'СВО'
    case 'Mobilizovan':
      return meta?.order_number ? `мобилизация, пр. №${meta.order_number}` : 'мобилизация'
    case 'Komandirovka':
      return 'командировка'
    case 'Otgul': {
      const basis = meta?.otgul_basis
      return basis === 'za_svoy_schet' ? 'отгул (за свой счёт)' : 'отгул (за отработанное)'
    }
    case 'Otpusk':
    case 'Uchebniy_otpusk':
      return meta?.leave_type ? `отпуск (${meta.leave_type})` : 'отпуск'
    case 'Dekret':
      return 'декрет'
    case 'Troydoustroyen_s_SVO':
      return 'трудоустроен с СВО'
    default:
      return EMPLOYEE_STATUS_CONFIG[row.status]?.label ?? row.status
  }
}

// Statuses included in the докладная записка (all non-working, non-dismissed)
const DOKLADNAYA_STATUSES = new Set([
  'Otgul', 'Bolnichniy', 'Otpusk', 'Komandirovka', 'Uchebniy_otpusk',
  'Dekret', 'Mobilizovan', 'SVO', 'Troydoustroyen_s_SVO',
])

function openDokladnaya(statuses: StatusWithUser[], reportMonth: string): void {
  const [y, m] = reportMonth.split('-')
  const monthWord = `${MONTHS_RU_GENITIVE[parseInt(m) - 1]} ${y}`

  const rows = statuses
    .filter(s => DOKLADNAYA_STATUSES.has(s.status))
    .map((s, i) => `
      <tr>
        <td style="border:1px solid #000;padding:4px 8px;text-align:center;">${i + 1}</td>
        <td style="border:1px solid #000;padding:4px 8px;">${s.user_full_name}</td>
        <td style="border:1px solid #000;padding:4px 8px;">${s.user_position ?? '—'}</td>
        <td style="border:1px solid #000;padding:4px 8px;">${fmtPeriod(s.date_from, s.date_to)}</td>
        <td style="border:1px solid #000;padding:4px 8px;">${getReasonLabel(s)}</td>
        <td style="border:1px solid #000;padding:4px 8px;">${s.reason ?? ''}</td>
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
  { id: 'svo',          label: 'СВО' },
  { id: 'mobilizovan',  label: 'Мобилизованные' },
  { id: 'bolnichniy',   label: 'Больничные' },
  { id: 'komandirovka', label: 'Командировочные' },
  { id: 'otgul',        label: 'Отгулы' },
  { id: 'otpusk',       label: 'Отпуска' },
  { id: 'uvolen',       label: 'Уволенные' },
  { id: 'dokladnaya',   label: 'Докладная' },
]

export default function HRReports({ session, services }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const currentMonth = today.slice(0, 7) // YYYY-MM

  const [reportMonth, setReportMonth] = useState(currentMonth)
  const [filterService, setFilterService] = useState('')
  const [statuses, setStatuses] = useState<StatusWithUser[]>([])
  const [loading, setLoading] = useState(false)
  const [activeReport, setActiveReport] = useState<ReportTab>('svo')

  async function load() {
    setLoading(true)
    const [y, m] = reportMonth.split('-').map(Number)
    const dateFrom = `${reportMonth}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const dateTo = `${reportMonth}-${String(lastDay).padStart(2, '0')}`
    const data = await fetchStatusesForPeriodWithUsers(dateFrom, dateTo, filterService || undefined)
    setStatuses(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [reportMonth, filterService]) // eslint-disable-line react-hooks/exhaustive-deps

  // Filter helpers
  const svo = statuses.filter(s => s.status === 'SVO')
  const mobilizovan = statuses.filter(s => s.status === 'Mobilizovan')
  const bolnichniy = statuses.filter(s => s.status === 'Bolnichniy')
  const komandirovka = statuses.filter(s => s.status === 'Komandirovka')
  const otgul = statuses.filter(s => s.status === 'Otgul')
  const otpusk = statuses.filter(s => s.status === 'Otpusk' || s.status === 'Uchebniy_otpusk')
  const uvolen = statuses.filter(s => s.status === 'Uvolen')

  const thCls = 'px-3 py-2 text-left text-[10px] text-white/40 font-medium uppercase tracking-wide border-b border-white/10'
  const tdCls = 'px-3 py-2 text-xs text-white/70'

  function EmptyRow({ cols }: { cols: number }) {
    return (
      <tr>
        <td colSpan={cols} className="px-3 py-8 text-center text-white/30 text-xs">
          Нет данных за {getMonthLabel(reportMonth)}
        </td>
      </tr>
    )
  }

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

        {/* SVO */}
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
              {svo.length === 0 ? <EmptyRow cols={5} /> : svo.map((s, i) => (
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
              {mobilizovan.length === 0 ? <EmptyRow cols={5} /> : mobilizovan.map((s, i) => (
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
                <th className={thCls}>№ б/л</th>
                <th className={thCls}>Период</th>
                <th className={thCls}>Должность</th>
              </tr>
            </thead>
            <tbody>
              {bolnichniy.length === 0 ? <EmptyRow cols={5} /> : bolnichniy.map((s, i) => (
                <tr key={s.id} className={i % 2 === 1 ? 'bg-white/[0.02]' : ''}>
                  <td className={tdCls}>{i + 1}</td>
                  <td className={tdCls}>{s.user_full_name}</td>
                  <td className={tdCls}>{s.metadata?.sick_leave_number ?? '—'}</td>
                  <td className={tdCls}>{fmtPeriod(s.date_from, s.date_to)}</td>
                  <td className={tdCls}>{s.user_position ?? '—'}</td>
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
              {komandirovka.length === 0 ? <EmptyRow cols={4} /> : komandirovka.map((s, i) => (
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
              {otgul.length === 0 ? <EmptyRow cols={4} /> : otgul.map((s, i) => (
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
              {otpusk.length === 0 ? <EmptyRow cols={5} /> : otpusk.map((s, i) => (
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
              {uvolen.length === 0 ? <EmptyRow cols={4} /> : uvolen.map((s, i) => (
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
          <div className="p-6 space-y-4">
            <div>
              <div className="text-sm text-white/70 font-medium mb-1">Докладная записка</div>
              <div className="text-xs text-white/40">
                Список сотрудников, не вышедших на работу за {getMonthLabel(reportMonth)}.
                Включает все статусы отсутствия (кроме Уволен и На работе).
              </div>
            </div>
            <div className="text-xs text-white/50">
              Всего записей: <span className="text-white/80">{statuses.filter(s => DOKLADNAYA_STATUSES.has(s.status)).length}</span>
            </div>
            <button
              onClick={() => openDokladnaya(statuses, reportMonth)}
              className="px-4 py-2 rounded-lg bg-purple-600/30 border border-purple-500/40 text-purple-300 hover:bg-purple-600/50 text-sm font-medium transition-colors"
            >
              Открыть для печати
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
