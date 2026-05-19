'use client'
import { useState, useEffect } from 'react'
import type { WorkPlanWithItems, AuthSession, UserWithAssignment, EmployeeStatusType } from '@/types'
import { EMPLOYEE_STATUS_CONFIG } from '@/types'
import { fetchUsersWithAssignments, fetchActiveStatusesOnDate } from '@/lib/api-client'
import { isWorkerOnDuty, getShiftNumberForDate } from '@/lib/shifts'
import { useTheme } from '@/lib/ThemeContext'

// ─── Permanent tasks defaults per service ────────────────────────────────────

const PERMANENT_TASKS: Record<string, string[]> = {
  'SRV-CCTV': [
    'Осуществлять постоянный контроль систем видеонаблюдения и слаботочных систем с АРМ оператора.',
    'По распоряжению НДС устранить выявленные во время дежурства неисправности, все недостатки по работе оборудования внести в оперативный журнал.',
    'По распоряжению НДС возможны дополнительные работы.',
  ],
  'SRV-ENG': [
    'Осуществлять постоянный контроль инженерных систем и оборудования тоннеля.',
    'По распоряжению НДС устранить выявленные неисправности, все недостатки по работе оборудования внести в оперативный журнал.',
    'По распоряжению НДС возможны дополнительные работы.',
  ],
  'SRV-FIRE': [
    'Осуществлять постоянный контроль систем пожарной безопасности и пожаротушения в автоматическом и ручном режимах.',
    'По распоряжению НДС устранить выявленные неисправности, все недостатки по работе оборудования внести в оперативный журнал.',
    'По распоряжению НДС возможны дополнительные работы.',
  ],
  'SRV-VENT': [
    'Осуществлять постоянный контроль вентиляционных систем и оборудования тоннеля.',
    'По распоряжению НДС устранить выявленные неисправности, все недостатки по работе оборудования внести в оперативный журнал.',
    'По распоряжению НДС возможны дополнительные работы.',
  ],
  'SRV-STR': [
    'Осуществлять постоянный мониторинг состояния строительных конструкций и объектов.',
    'По распоряжению НДС устранить выявленные дефекты и неисправности, все недостатки внести в оперативный журнал.',
    'По распоряжению НДС возможны дополнительные работы.',
  ],
}

const DEFAULT_TASKS = [
  'Осуществлять постоянный контроль систем и оборудования по закреплённым объектам.',
  'По распоряжению НДС устранить выявленные неисправности, все недостатки по работе оборудования внести в оперативный журнал.',
  'По распоряжению НДС возможны дополнительные работы.',
]

const SERVICE_NAMES: Record<string, string> = {
  'SRV-ENG':  'Инженерные системы',
  'SRV-STR':  'Строительная служба',
  'SRV-FIRE': 'Пожарная безопасность',
  'SRV-VENT': 'Вентиляция',
  'SRV-CCTV': 'Видеонаблюдение и слаботочные системы',
}

const STATUS_NOTES: Partial<Record<EmployeeStatusType, string>> = {
  Otpusk:         'отпуск',
  Bolnichniy:     'больничный',
  Otgul:          'отгул',
  Komandirovka:   'командировка',
  Uchebniy_otpusk:'уч. отпуск',
  Dekret:         'декрет',
  Mobilizovan:    'мобилизован',
  SVO:            'СВО',
}

// ─── Russian month names ──────────────────────────────────────────────────────

const RU_MONTHS = [
  'января','февраля','марта','апреля','мая','июня',
  'июля','августа','сентября','октября','ноября','декабря',
]

function fmtRuDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `«${d.getDate()}» ${RU_MONTHS[d.getMonth()]} ${d.getFullYear()} г.`
}

// ─── HTML generator ───────────────────────────────────────────────────────────

interface WorkerEntry {
  name: string
  position: string
  absent?: string   // status note if absent
}

interface TaskItem {
  num: number
  description: string
  location: string
  timeRange: string
}

interface SheetData {
  date: string
  shiftNum: number
  serviceName: string
  permanentTasks: string[]
  workers: WorkerEntry[]
  tasks: TaskItem[]
  signerName: string
  signerPosition: string
  brigadierName: string
  rememberNote: string
}

function generateSheetHTML(d: SheetData): string {
  const td = (content: string, style = '') =>
    `<td style="padding:3px 5px;border:1px solid #000;vertical-align:top;${style}">${content}</td>`
  const th = (content: string, style = '') =>
    `<td style="padding:3px 5px;border:1px solid #000;font-weight:bold;text-align:center;background:#e8e8e8;vertical-align:middle;${style}">${content}</td>`

  // Group workers by position
  const grouped = new Map<string, WorkerEntry[]>()
  d.workers.forEach(w => {
    const pos = w.position || 'Сотрудники'
    if (!grouped.has(pos)) grouped.set(pos, [])
    grouped.get(pos)!.push(w)
  })

  const personnelHTML = [...grouped.entries()].map(([pos, wList]) => `
    <div style="margin-bottom:5px">
      <div style="font-style:italic;font-size:10pt;color:#333">${pos}:</div>
      ${wList.map(w => `
        <div style="padding-left:10px;${w.absent ? 'color:#777;' : ''}">
          ${w.absent
            ? `<span style="text-decoration:line-through">${w.name}</span>&nbsp;<span style="font-size:9pt">(${w.absent})</span>`
            : w.name}
        </div>`).join('')}
    </div>`).join('')

  const permanentHTML = d.permanentTasks.map((t, i) => `
    <div style="margin-bottom:4px"><b>${i + 1}.</b>&nbsp;${t}</div>`).join('')

  // Task table rows — 4+ variable, then empty rows for additions
  const EMPTY_ROWS = 4
  const taskRows = d.tasks.map(t => `
    <tr style="min-height:22px">
      ${td(String(t.num), 'text-align:center;width:28px;font-weight:bold')}
      ${td(t.location ? `<b>${t.location}</b><br>${t.description}` : t.description)}
      ${td(t.timeRange, 'text-align:center;width:70px;white-space:nowrap')}
      ${td('', 'width:70px')}
      ${td('', 'width:70px')}
      ${td('', 'width:70px')}
    </tr>`).join('')

  const emptyRows = Array.from({ length: EMPTY_ROWS }, (_, i) => `
    <tr style="height:22px">
      ${td('', 'text-align:center;width:28px')}
      ${td('')}
      ${td('', 'width:70px')}
      ${td('', 'width:70px')}
      ${td('', 'width:70px')}
      ${td('', 'width:70px')}
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>План-задание ${d.date}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #000; background: #fff; }
  @page { size: A4 portrait; margin: 12mm 12mm 20mm 18mm; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    .section-title { break-after: avoid; page-break-after: avoid; }
    .no-break { break-inside: avoid; page-break-inside: avoid; }
  }
  table { border-collapse: collapse; width: 100%; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  thead { display: table-header-group; }
</style>
</head>
<body>

  <!-- HEADER -->
  <div style="text-align:center;margin-bottom:8px">
    <div style="font-size:10pt;color:#555">ГБУ «Гормост» · Участок «Гормост-Лефортово»</div>
    <div style="font-size:15pt;font-weight:bold;margin:4px 0">ПЛАН-ЗАДАНИЕ</div>
    <div style="font-size:12pt">на ${fmtRuDate(d.date)}</div>
    <div style="font-size:11pt;margin-top:2px">
      по ${d.serviceName.toLowerCase()}
      &nbsp;·&nbsp;
      <b>Смена №${d.shiftNum}</b>
    </div>
  </div>

  <!-- REMINDER BOX -->
  ${d.rememberNote ? `
  <div style="border:2px solid #c00;padding:5px 10px;margin-bottom:8px;font-weight:bold;text-align:center;font-size:10.5pt">
    ⚠&nbsp;ПОМНИТЬ: ${d.rememberNote}
  </div>` : ''}

  <!-- TWO-COLUMN: personnel + permanent tasks -->
  <table style="margin-bottom:8px">
    <tr>
      <!-- Personnel -->
      <td style="width:48%;vertical-align:top;border:1px solid #000;padding:6px">
        <div style="font-weight:bold;font-size:10pt;border-bottom:1px solid #ccc;margin-bottom:5px;padding-bottom:3px">
          КОМУ ВЫДАНО — СМЕНА №${d.shiftNum}
        </div>
        ${personnelHTML || '<div style="color:#aaa;font-style:italic">Список пуст</div>'}
      </td>
      <!-- Gap -->
      <td style="width:4%"></td>
      <!-- Permanent tasks -->
      <td style="width:48%;vertical-align:top;border:2px solid #555;padding:6px;background:#f9f9f9">
        <div style="font-weight:bold;font-size:10pt;border-bottom:1px solid #aaa;margin-bottom:5px;padding-bottom:3px">
          ПОСТОЯННЫЕ ЗАДАНИЯ
        </div>
        ${permanentHTML}
      </td>
    </tr>
  </table>

  <!-- TASK TABLE -->
  <div style="font-weight:bold;margin-bottom:4px;font-size:11pt">ЗАДАНИЯ НА СМЕНУ:</div>
  <table>
    <thead>
      <tr>
        ${th('№', 'width:28px;font-size:9pt')}
        ${th('Наименование работ')}
        ${th('Время', 'width:70px;font-size:9pt')}
        ${th('Ф.И.О.<br>инженера,<br>подпись', 'width:70px;font-size:9pt')}
        ${th('Время<br>выполнения', 'width:70px;font-size:9pt')}
        ${th('Ф.И.О.<br>исполн.,<br>подпись', 'width:70px;font-size:9pt')}
      </tr>
    </thead>
    <tbody>
      ${taskRows}
      ${emptyRows}
    </tbody>
  </table>

  <!-- SIGNATURE BLOCK -->
  <table style="margin-top:14px;border-collapse:collapse">
    <tr>
      <td style="padding:3px 0;white-space:nowrap;padding-right:8px">
        ${d.signerPosition || 'Мастер / Нач. службы'}:
      </td>
      <td style="padding:3px 8px;min-width:180px;border-bottom:1px solid #000">
        ${d.signerName}
      </td>
      <td style="padding:3px 16px;white-space:nowrap">Подпись:&nbsp;<span style="display:inline-block;min-width:80px;border-bottom:1px solid #000">&nbsp;</span></td>
      <td style="padding:3px 16px;white-space:nowrap">Дата:&nbsp;${fmtRuDate(d.date)}</td>
    </tr>
    <tr>
      <td style="padding:3px 0;white-space:nowrap;padding-right:8px">Ознакомлен:</td>
      <td style="padding:3px 8px;min-width:180px;border-bottom:1px solid #000">
        ${d.brigadierName}
      </td>
      <td style="padding:3px 16px;white-space:nowrap">Подпись:&nbsp;<span style="display:inline-block;min-width:80px;border-bottom:1px solid #000">&nbsp;</span></td>
      <td></td>
    </tr>
  </table>

</body>
</html>`
}

// ─── Modal component ──────────────────────────────────────────────────────────

interface Props {
  plans: WorkPlanWithItems[]   // all plans for this service on the selected date
  session: AuthSession
  defaultDate: string          // YYYY-MM-DD
  onClose: () => void
}

export default function PlanTaskSheetModal({ plans, session, defaultDate, onClose }: Props) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const serviceId = session.service_id ?? ''
  const serviceName = SERVICE_NAMES[serviceId] ?? serviceId

  // Permanent tasks — editable, pre-filled per service
  const defaultPermanent = PERMANENT_TASKS[serviceId] ?? DEFAULT_TASKS
  const [task1, setTask1] = useState(defaultPermanent[0] ?? '')
  const [task2, setTask2] = useState(defaultPermanent[1] ?? '')
  const [task3, setTask3] = useState(defaultPermanent[2] ?? '')

  // Reminder note
  const [rememberNote, setRememberNote] = useState(
    serviceId === 'SRV-CCTV' || serviceId === 'SRV-FIRE'
      ? 'системы Автоматического Газового Пожаротушения работают в автоматическом режиме.'
      : ''
  )

  // Signer
  const [signerName, setSignerName] = useState(session.full_name ?? '')
  const [signerPosition, setSignerPosition] = useState(session.position ?? 'Мастер участка')
  const [brigadierName, setBrigadierName] = useState('')

  // Workers state
  const [workers, setWorkers] = useState<WorkerEntry[]>([])
  const [loadingWorkers, setLoadingWorkers] = useState(true)

  const planDate = plans[0]?.plan_date ?? defaultDate
  const shiftNum = getShiftNumberForDate(new Date(planDate + 'T00:00:00'))

  // Combine all items from all plans, starting at number 4
  const allItems: TaskItem[] = plans
    .flatMap(p => p.items)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item, idx) => ({
      num: idx + 4,
      description: item.work_description,
      location: item.location,
      timeRange: item.time_start
        ? `${item.time_start}${item.time_end ? `–${item.time_end}` : ''}`
        : '',
    }))

  // Fetch workers on duty for this service + shift
  useEffect(() => {
    let cancelled = false
    setLoadingWorkers(true)

    async function load() {
      const allUsers = await fetchUsersWithAssignments()
      const serviceUsers = allUsers.filter(
        u => u.service_id === serviceId && u.is_active
      )

      const targetDate = new Date(planDate + 'T00:00:00')

      // Include workers who belong to this shift crew (shift_num match for 1/3)
      // OR who are scheduled to work that day (other schedule types)
      const onDuty = serviceUsers.filter(u => {
        if (!u.assignment) return false
        const a = u.assignment
        // For 1/3 — include if their crew matches (even if on vacation, to show with note)
        if (a.schedule_code === '1/3') return a.shift_num === shiftNum
        // For others — check isWorkerOnDuty
        return isWorkerOnDuty({ ...a, schedule_code: a.schedule_code ?? '' }, targetDate)
      })

      // Fetch absence statuses
      const ids = onDuty.map(u => u.user_id)
      const statusMap = await fetchActiveStatusesOnDate(ids, planDate)

      if (!cancelled) {
        const entries: WorkerEntry[] = onDuty.map(u => ({
          name: u.full_name,
          position: u.position ?? '',
          absent: statusMap.has(u.user_id)
            ? (STATUS_NOTES[statusMap.get(u.user_id)!] ?? statusMap.get(u.user_id)!)
            : undefined,
        }))
        // Sort: present first, then absent
        entries.sort((a, b) => {
          if (a.absent && !b.absent) return 1
          if (!a.absent && b.absent) return -1
          return 0
        })
        setWorkers(entries)

        // Pre-fill brigadier = first non-absent person
        const first = entries.find(e => !e.absent)
        if (first && !brigadierName) setBrigadierName(first.name)

        setLoadingWorkers(false)
      }
    }

    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planDate, serviceId, shiftNum])

  const handlePrint = () => {
    const html = generateSheetHTML({
      date: planDate,
      shiftNum,
      serviceName,
      permanentTasks: [task1, task2, task3].filter(Boolean),
      workers,
      tasks: allItems,
      signerName,
      signerPosition,
      brigadierName,
      rememberNote,
    })
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (!win) { URL.revokeObjectURL(url); alert('Разрешите всплывающие окна в браузере'); return }
    win.focus()
    setTimeout(() => { win.print(); setTimeout(() => URL.revokeObjectURL(url), 60000) }, 800)
  }

  const inp = isLight
    ? 'bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 w-full'
    : 'bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white/80 focus:outline-none focus:border-blue-500/50 w-full'
  const lbl = isLight
    ? 'block text-[10px] text-gray-500 uppercase tracking-wider mb-1'
    : 'block text-[10px] text-white/40 uppercase tracking-wider mb-1'
  const ta  = `${inp} resize-none`

  const presentCount = workers.filter(w => !w.absent).length
  const absentCount  = workers.filter(w =>  w.absent).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className={`relative z-10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border ${isLight ? 'bg-white border-gray-200' : 'border-white/15'}`}
        style={isLight ? {} : { background: 'rgba(15, 20, 40, 0.97)' }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
          <div>
            <div className={`text-sm font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>🖨 План-задание на смену</div>
            <div className={`text-[11px] mt-0.5 ${isLight ? 'text-gray-500' : 'text-white/40'}`}>
              {serviceName} · {planDate} · Смена №{shiftNum}
              {loadingWorkers
                ? ' · загрузка состава...'
                : ` · ${presentCount} чел. на смене${absentCount > 0 ? `, ${absentCount} отсутств.` : ''}`}
            </div>
          </div>
          <button onClick={onClose} className={`text-lg ${isLight ? 'text-gray-400 hover:text-gray-700' : 'text-white/40 hover:text-white'}`}>✕</button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">

          {/* Reminder note */}
          <div>
            <label className={lbl}>Напоминание (строка «ПОМНИТЬ:»)</label>
            <input value={rememberNote} onChange={e => setRememberNote(e.target.value)}
              placeholder="оставьте пустым если не нужно" className={inp} />
          </div>

          {/* Permanent tasks */}
          <div className="space-y-2">
            <div className={lbl}>Постоянные задания (пункты 1–3)</div>
            <div className="space-y-2">
              {[[task1, setTask1], [task2, setTask2], [task3, setTask3]].map(([val, set], i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className={`text-sm mt-2 shrink-0 ${isLight ? 'text-gray-400' : 'text-white/30'}`}>{i + 1}.</span>
                  <textarea
                    value={val as string}
                    onChange={e => (set as (v: string) => void)(e.target.value)}
                    rows={2}
                    className={ta}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Work items preview */}
          <div>
            <div className={lbl}>Задания из плана работ ({allItems.length} пунктов)</div>
            {allItems.length === 0
              ? <div className={`text-[11px] italic ${isLight ? 'text-gray-400' : 'text-white/25'}`}>Нет пунктов — план пуст</div>
              : (
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {allItems.map(item => (
                    <div key={item.num} className={`flex gap-2 text-xs ${isLight ? 'text-gray-600' : 'text-white/60'}`}>
                      <span className={`shrink-0 ${isLight ? 'text-gray-400' : 'text-white/30'}`}>{item.num}.</span>
                      <span>
                        {item.location && <span className={isLight ? 'text-gray-800' : 'text-white/80'}>{item.location}: </span>}
                        {item.description}
                        {item.timeRange && <span className={`ml-1 ${isLight ? 'text-blue-600' : 'text-cyan-400'}`}>{item.timeRange}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )
            }
          </div>

          {/* Workers preview */}
          <div>
            <div className={lbl}>Состав смены</div>
            {loadingWorkers
              ? <div className={`text-[11px] italic ${isLight ? 'text-gray-400' : 'text-white/30'}`}>Загрузка...</div>
              : workers.length === 0
                ? <div className={`text-[11px] italic ${isLight ? 'text-gray-400' : 'text-white/25'}`}>Нет сотрудников в этой смене</div>
                : (
                  <div className="flex flex-wrap gap-1.5">
                    {workers.map((w, i) => (
                      <span key={i} className={`text-[11px] px-2 py-0.5 rounded-full border ${
                        w.absent
                          ? isLight ? 'bg-gray-100 border-gray-200 text-gray-400 line-through' : 'bg-white/3 border-white/10 text-white/25 line-through'
                          : isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/15 border-emerald-500/20 text-emerald-300'
                      }`}>
                        {w.name}{w.absent ? ` (${w.absent})` : ''}
                      </span>
                    ))}
                  </div>
                )
            }
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Подписывает — ФИО</label>
              <input value={signerName} onChange={e => setSignerName(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Должность подписанта</label>
              <input value={signerPosition} onChange={e => setSignerPosition(e.target.value)} className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Ознакомлен — ФИО (бригадир)</label>
            <input value={brigadierName} onChange={e => setBrigadierName(e.target.value)} className={inp} />
          </div>

        </div>

        {/* Footer */}
        <div className={`px-5 py-4 border-t flex items-center justify-between gap-3 ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
          <div className={`text-[11px] ${isLight ? 'text-gray-400' : 'text-white/30'}`}>
            Смена №{shiftNum} · {planDate} · {allItems.length} заданий · {presentCount} чел.
          </div>
          <div className="flex gap-2">
            <button onClick={onClose}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-600' : 'bg-white/5 hover:bg-white/10 text-white/50'}`}>
              Отмена
            </button>
            <button
              onClick={handlePrint}
              disabled={loadingWorkers}
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
