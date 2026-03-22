'use client'
import { useState } from 'react'
import type { WorkPlanWithItems, AuthSession } from '@/types'

// ─── Russian month names ───────────────────────────────────────────────────
const RU_MONTHS = [
  'января','февраля','марта','апреля','мая','июня',
  'июля','августа','сентября','октября','ноября','декабря',
]

function fmtDate(dateStr: string): { day: string; month: string; year: string } {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    day:   String(d.getDate()).padStart(2, '0'),
    month: RU_MONTHS[d.getMonth()],
    year:  String(d.getFullYear()),
  }
}

function addDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

const SERVICE_NAMES: Record<string, string> = {
  'SRV-ENG':  'Инженерные системы',
  'SRV-STR':  'Строительная служба',
  'SRV-FIRE': 'Пожарная безопасность',
  'SRV-VENT': 'Вентиляция',
  'SRV-CCTV': 'Видеонаблюдение',
}

// ─── Standard templates ────────────────────────────────────────────────────

const STANDARD_FACTORS =
  'Движущиеся транспортные средства; повышенный уровень загазованности; ' +
  'отлетающие предметы; падение предметов с высоты; повышенный уровень шума; ' +
  'недостаточная освещённость рабочей зоны.'

interface Measure { num: number; text: string; deadline: string }

function buildMeasuresBefore(supervisor: string): Measure[] {
  return [
    { num: 1, deadline: '',                        text: 'Проверить и подготовить технику, оборудование и средства ограждения. Получить и проверить средства индивидуальной защиты и ТГС-3.' },
    { num: 2, deadline: '',                        text: 'Проверить наличие и работу проблесковых маячков на машинах, состояние и работу импульсных дорожных знаков, наличие воды и медицинской аптечки.' },
    { num: 3, deadline: '',                        text: 'Провести целевой инструктаж по инструкциям №\u202014,\u202015,\u202023,\u202041,\u202059,\u202065,\u202066,\u2020103,\u2020190 и требованиям «Временного порядка…» с указанием особенностей места и времени работы. Довести сигналы оповещения о возникновении опасности и определить порядок действий по ним.' },
    { num: 4, deadline: '',                        text: 'Получить разрешение (оповестить) отдела ГИБДД на выполнение работ. Доложить диспетчеру ГБУ «Гормост» о выходе на выполнение работ.' },
    { num: 5, deadline: 'По прибытии на место работ', text: 'Установить ограждение зоны производства работ согласно типовой схеме.' },
    { num: 6, deadline: 'По прибытии на место работ', text: 'Указать маршруты безопасного передвижения в зоне производства работ.' },
  ]
}

function buildMeasuresDuring(supervisor: string, executor: string): Measure[] {
  const resp = [supervisor, executor].filter(Boolean).join(', ')
  return [
    { num: 1, deadline: 'Постоянно, в ходе работы', text: 'Контролировать обстановку на проезжей части вблизи зоны производства работ. Немедленно подать сигнал при возникновении опасности.' },
    { num: 2, deadline: 'Постоянно, в ходе работы', text: 'Соблюдать технологию выполнения работ, правила выполнения работ на высоте, использовать комплект защитных средств.' },
    { num: 3, deadline: 'Постоянно, в ходе работы', text: 'Работать с включёнными проблесковыми маячками на машинах и импульсными дорожными знаками.' },
    { num: 4, deadline: 'Постоянно, в ходе работы', text: 'Не выходить за пределы рабочей зоны; в зоне производства работ перемещаться только с разрешения руководителя работ.' },
    { num: 5, deadline: 'Постоянно, в ходе работы', text: 'Работать в сигнальном жилете и каске, противогазы (самоспасатели) держать в машине в рабочей зоне.' },
    { num: 6, deadline: 'Постоянно, в ходе работы', text: 'Каждые полчаса контролировать состояние газовоздушной среды газосигнализатором ТГС-3.' },
  ]
}

// ─── HTML generator ────────────────────────────────────────────────────────

interface PermitFields {
  permitNumber: string
  issueDate: string      // YYYY-MM-DD
  validUntil: string     // YYYY-MM-DD
  supervisor: string
  supervisorPosition: string
  executor: string
  executorPosition: string
  workLocation: string
  workDescription: string
  startTime: string
  startDate: string
  endTime: string
  endDate: string
  issuedBy: string
  issuedByPosition: string
  workers: string[]
  vehicles: string[]
}

function generateHTML(f: PermitFields): string {
  const td = (content: string, extra = '') =>
    `<td style="padding:4px 6px;border:1px solid #000;${extra}">${content}</td>`
  const th = (content: string, extra = '') =>
    `<td style="padding:4px 6px;border:1px solid #000;font-weight:bold;text-align:center;background:#f0f0f0;${extra}">${content}</td>`

  const issueD = fmtDate(f.issueDate)
  const validD = fmtDate(f.validUntil)
  const startD = fmtDate(f.startDate)
  const endD   = fmtDate(f.endDate)

  const measuresBefore = buildMeasuresBefore(f.supervisor)
  const measuresDuring = buildMeasuresDuring(f.supervisor, f.executor)

  const supervisorShort = f.supervisor ? f.supervisor.split(' ').map((p, i) => i === 0 ? p : p[0] + '.').join(' ') : '______'
  const executorShort   = f.executor   ? f.executor.split(' ').map((p, i) => i === 0 ? p : p[0] + '.').join(' ') : '______'
  const bothShort = [supervisorShort, executorShort].filter(s => s !== '______').join(', ') || '______'

  const measureBeforeRows = measuresBefore.map(m => `
    <tr>
      ${td(String(m.num), 'text-align:center;width:30px')}
      ${td(m.text)}
      ${td(m.deadline, 'width:140px')}
      ${td(supervisorShort, 'width:100px;text-align:center')}
    </tr>`).join('')

  const measureDuringRows = measuresDuring.map(m => `
    <tr>
      ${td(String(m.num), 'text-align:center;width:30px')}
      ${td(m.text)}
      ${td(m.deadline, 'width:140px')}
      ${td(bothShort, 'width:120px')}
    </tr>`).join('')

  // Workers table — 8 rows minimum
  const workerRows = Array.from({ length: Math.max(8, f.workers.length + 2) }, (_, i) => {
    const name = f.workers[i] ?? ''
    return `<tr style="height:22px">
      ${td(String(i + 1), 'text-align:center;width:30px')}
      ${td(name, 'min-width:160px')}
      ${td('', 'min-width:140px')}
      ${td(name ? supervisorShort : '', 'width:100px;text-align:center')}
      ${td('', 'width:120px')}
    </tr>`
  }).join('')

  // Vehicles table — 8 rows minimum
  const vehicleRows = Array.from({ length: Math.max(8, f.vehicles.length + 2) }, (_, i) => {
    const v = f.vehicles[i] ?? ''
    return `<tr style="height:22px">
      ${td(String(i + 1), 'text-align:center;width:30px')}
      ${td(v, 'min-width:140px')}
      ${td('', 'width:100px')}
      ${td('', 'min-width:140px')}
    </tr>`
  }).join('')

  const sig = (label: string) =>
    `<div style="display:flex;align-items:flex-end;gap:8px;margin-bottom:8px">
       <span style="white-space:nowrap">${label}</span>
       <span style="flex:1;border-bottom:1px solid #000;min-width:120px"></span>
       <span style="white-space:nowrap;font-size:10px;color:#666">(подпись)</span>
     </div>`

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Наряд-допуск</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #000; background: #fff; }
  @page { size: A4 portrait; margin: 15mm 15mm 15mm 20mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  table { border-collapse: collapse; width: 100%; margin-bottom: 8px; }
  h2 { font-size: 14pt; text-align: center; font-weight: bold; margin: 10px 0 4px; }
  p { margin-bottom: 5px; }
  .section-title { font-weight: bold; margin: 8px 0 4px; }
  .underline { border-bottom: 1px solid #000; display: inline-block; min-width: 40px; }
  .sig-block { margin-top: 12px; }
  .app-label { text-align: right; font-size: 10pt; margin-bottom: 4px; }
  .footer-note { text-align: right; font-size: 9pt; color: #555; margin-top: 16px; }
</style>
</head>
<body>
  <div class="app-label">Приложение 1</div>

  <h2>НАРЯД – ДОПУСК &nbsp;№&nbsp;<span class="underline">&nbsp;${f.permitNumber || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}&nbsp;</span>&nbsp;&nbsp; Экз. №&nbsp;<span class="underline">&nbsp;1&nbsp;</span></h2>
  <p style="text-align:center;margin-bottom:10px">на производство работ повышенной опасности</p>

  <p>
    Выдан &laquo;<span class="underline">&nbsp;${issueD.day}&nbsp;</span>&raquo;&nbsp;${issueD.month}&nbsp;${issueD.year}&nbsp;г.
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
    Действителен до &laquo;<span class="underline">&nbsp;${validD.day}&nbsp;</span>&raquo;&nbsp;${validD.month}&nbsp;${validD.year}&nbsp;г.
  </p>

  <p style="margin-top:8px">
    <b>Руководитель работ:</b>&nbsp;${f.supervisor || '___________________________'},&nbsp;${f.supervisorPosition || '________________________'}
    <br><span style="font-size:9pt;color:#555;padding-left:140px">(Ф.И.О, должность)</span>
  </p>

  <p>
    <b>1.&nbsp;Ответственный исполнитель работ:</b>&nbsp;${f.executor || '___________________________'},&nbsp;${f.executorPosition || '________________________'}
    <br><span style="font-size:9pt;color:#555;padding-left:200px">(Ф.И.О, должность)</span>
  </p>

  <p><b>2.&nbsp;На выполнение работ:</b>&nbsp;${f.workDescription || '________________________________________________'}</p>
  <p style="font-size:9pt;color:#555;padding-left:16px">(наименование работ, место, условия их выполнения)</p>

  <p style="margin-top:6px">
    <b>Опасные производственные факторы</b>, которые действуют или могут возникнуть независимо от выполняемой работы в местах её производства:
    &nbsp;${STANDARD_FACTORS}
  </p>

  <p class="section-title" style="margin-top:8px">
    До начала производства работ необходимо выполнить следующие мероприятия:
  </p>
  <p>
    Начало работ в&nbsp;<b><span class="underline">&nbsp;${f.startTime || '__'}&nbsp;</span></b>&nbsp;
    &laquo;<span class="underline">&nbsp;${startD.day}&nbsp;</span>&raquo;&nbsp;${startD.month}&nbsp;${startD.year}&nbsp;г.
  </p>

  <table>
    <thead><tr>
      ${th('№<br>п/п', 'width:30px')}
      ${th('Наименование мероприятия')}
      ${th('Срок выполнения', 'width:140px')}
      ${th('Ответственный руководитель<br>(фамилия, инициалы)', 'width:120px')}
    </tr></thead>
    <tbody>${measureBeforeRows}</tbody>
  </table>

  <p>
    Окончание работ:&nbsp;<b><span class="underline">&nbsp;${f.endTime || '__'}&nbsp;</span></b>&nbsp;
    &laquo;<span class="underline">&nbsp;${endD.day}&nbsp;</span>&raquo;&nbsp;${endD.month}&nbsp;${endD.year}&nbsp;г.
  </p>

  <p class="section-title">В процессе производства работ необходимо выполнить следующие мероприятия:</p>

  <table>
    <thead><tr>
      ${th('№<br>п/п', 'width:30px')}
      ${th('Наименование мероприятия')}
      ${th('Срок выполнения', 'width:140px')}
      ${th('Руководитель работ,<br>(отв. исполнитель) фамилия, инициалы', 'width:140px')}
    </tr></thead>
    <tbody>${measureDuringRows}</tbody>
  </table>

  <p class="section-title">Состав исполнителей работ:</p>
  <table>
    <thead><tr>
      ${th('№<br>п/п', 'width:30px')}
      ${th('Фамилия, инициалы')}
      ${th('Профессия, должность')}
      ${th('С условиями работы ознакомил,<br>инструктаж провёл (роспись, ФИО)', 'width:140px')}
      ${th('С условиями работ ознакомлен,<br>инструктаж получил (подпись)', 'width:120px')}
    </tr></thead>
    <tbody>${workerRows}</tbody>
  </table>

  <p class="section-title">6.1&nbsp;Используемый транспорт, средства механизации и оборудование:</p>
  <table>
    <thead><tr>
      ${th('№<br>п/п', 'width:30px')}
      ${th('Марка машины, средств механизации, оборудования')}
      ${th('№ машины /<br>оборудования', 'width:100px')}
      ${th('Фамилия, инициалы работника,<br>за кем закреплено')}
    </tr></thead>
    <tbody>${vehicleRows}</tbody>
  </table>

  <div class="sig-block">
    <p>
      <b>Наряд-допуск выдал</b>&nbsp;${f.issuedBy || '___________________________'},&nbsp;${f.issuedByPosition || '________________________'}
      <br><span style="font-size:9pt;color:#555;padding-left:160px">(уполномоченный приказом руководителя организации, Ф.И.О, должность, подпись)</span>
    </p>
    <div style="display:flex;gap:60px;align-items:flex-end;margin-top:6px">
      <span style="flex:1;border-bottom:1px solid #000"></span>
      <span style="white-space:nowrap;font-size:9pt;color:#666">(подпись)</span>
    </div>

    <p style="margin-top:10px">
      <b>Наряд-допуск принял:</b>&nbsp;${f.supervisorPosition || '________________________'},&nbsp;${f.supervisor || '___________________________'}
      <br><span style="font-size:9pt;color:#555;padding-left:140px">(должность, Ф.И.О, подпись)</span>
    </p>
    <div style="display:flex;gap:60px;align-items:flex-end;margin-top:6px">
      <span style="flex:1;border-bottom:1px solid #000"></span>
      <span style="white-space:nowrap;font-size:9pt;color:#666">(подпись)</span>
    </div>

    <p style="margin-top:10px">Письменное разрешение действующей организации (эксплуатирующей организации) на производство работ имеется.</p>
    <p>Мероприятия по безопасности производства (в том числе строительного) согласованы&nbsp;<span style="border-bottom:1px solid #000;display:inline-block;flex:1;min-width:200px">&nbsp;</span></p>
    <p style="font-size:9pt;color:#555">(должность, Ф.И.О., подпись уполномоченного представителя действующего предприятия или эксплуатирующей организации)</p>

    <p style="margin-top:8px">Рабочее место и условия труда проверил. Мероприятия по безопасности работ, указанные в наряде-допуске, выполнены.</p>
    <p><b>Разрешаю приступить к выполнению работ:</b>&nbsp;${f.supervisor || '______________________'},&nbsp;${f.supervisorPosition || '______________________'}</p>
    <div style="display:flex;gap:60px;align-items:flex-end;margin-top:4px">
      <span style="white-space:nowrap;font-size:9pt;color:#666">(Ф.И.О., должность, подпись, дата)</span>
      <span style="flex:1;border-bottom:1px solid #000"></span>
    </div>

    <p style="margin-top:10px">Наряд-допуск продлён до&nbsp;<span style="border-bottom:1px solid #000;display:inline-block;min-width:200px">&nbsp;</span></p>
    <p style="font-size:9pt;color:#555">(дата, подпись лица, выдавшего наряд-допуск)</p>

    <p style="margin-top:8px">Работа выполнена в полном объёме. Материал, инструмент, приспособления убраны. Люди выведены. Наряд-допуск закрыт.</p>
    <div style="display:flex;gap:40px;margin-top:6px">
      <div style="flex:1">
        <div>Руководитель работ</div>
        <div style="border-bottom:1px solid #000;min-height:20px;margin-top:4px"></div>
        <div style="font-size:9pt;color:#555">(дата, подпись)</div>
      </div>
      <div style="flex:1">
        <div>Лицо, выдавшее наряд-допуск</div>
        <div style="border-bottom:1px solid #000;min-height:20px;margin-top:4px"></div>
        <div style="font-size:9pt;color:#555">(дата, подпись)</div>
      </div>
    </div>

    <p style="margin-top:8px">Примечания:&nbsp;<span style="border-bottom:1px solid #000;display:inline-block;min-width:300px">&nbsp;</span></p>
  </div>

  <div class="footer-note">
    К приказу ГБУ «Гормост» от «09» января 2025 г. № 1
  </div>
</body>
</html>`
}

// ─── Modal component ───────────────────────────────────────────────────────

interface Props {
  plan: WorkPlanWithItems
  session: AuthSession
  onClose: () => void
}

export default function WorkPermitModal({ plan, session, onClose }: Props) {
  // Derive defaults from plan
  const nextDay = addDay(plan.plan_date)
  const firstStart = plan.items.find(i => i.time_start)?.time_start ?? '07:40'
  const lastEnd    = plan.items.find(i => i.time_end)?.time_end   ?? '08:00'

  const combinedLocation = plan.items.map(i => i.location).filter(Boolean).join('; ')
  const combinedWork     = plan.items.map(i =>
    i.location && i.work_description ? `${i.location}: ${i.work_description}` : (i.work_description || i.location)
  ).filter(Boolean).join('. ')

  const allWorkers = [...new Set(plan.items.flatMap(i => i.workers))]
  const allVehicles: string[] = plan.items.flatMap(i =>
    (i as WorkPlanWithItems['items'][number] & { vehicles?: Array<{ name: string; plate?: string }> }).vehicles?.map(v =>
      [v.name, v.plate].filter(Boolean).join(' ')
    ) ?? []
  )

  // Editable fields
  const [permitNumber,       setPermitNumber]       = useState('')
  const [issueDate,          setIssueDate]          = useState(plan.plan_date)
  const [validUntil,         setValidUntil]         = useState(nextDay)
  const [supervisor,         setSupervisor]         = useState('')
  const [supervisorPosition, setSupervisorPosition] = useState('мастер участка')
  const [executor,           setExecutor]           = useState('')
  const [executorPosition,   setExecutorPosition]   = useState('бригадир')
  const [workDesc,           setWorkDesc]           = useState(combinedWork)
  const [startTime,          setStartTime]          = useState(firstStart)
  const [startDate,          setStartDate]          = useState(plan.plan_date)
  const [endTime,            setEndTime]            = useState(lastEnd)
  const [endDate,            setEndDate]            = useState(nextDay)

  const handlePrint = () => {
    const html = generateHTML({
      permitNumber,
      issueDate,
      validUntil,
      supervisor,
      supervisorPosition,
      executor,
      executorPosition,
      workLocation: combinedLocation,
      workDescription: workDesc,
      startTime,
      startDate,
      endTime,
      endDate,
      issuedBy:         session.full_name ?? '',
      issuedByPosition: session.position  ?? '',
      workers:  allWorkers,
      vehicles: allVehicles,
    })
    const win = window.open('', '_blank')
    if (!win) { alert('Разрешите всплывающие окна в браузере'); return }
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 400)
  }

  const inp = 'bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white/80 focus:outline-none focus:border-blue-500/50 w-full'
  const lbl = 'block text-[10px] text-white/40 uppercase tracking-wider mb-1'
  const serviceName = SERVICE_NAMES[plan.service_id] ?? plan.service_id
  const issueDateFmt = fmtDate(issueDate)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-2xl rounded-2xl shadow-2xl border border-white/15 overflow-hidden"
        style={{ background: 'rgba(15, 20, 40, 0.97)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <div className="text-sm font-bold text-white">🖨 Наряд-допуск на производство работ</div>
            <div className="text-[11px] text-white/40 mt-0.5">{serviceName} · {plan.plan_date}</div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-lg transition-colors">✕</button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">

          {/* Row 1: number + dates */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>№ наряда-допуска</label>
              <input value={permitNumber} onChange={e => setPermitNumber(e.target.value)} placeholder="Например: 42" className={inp} />
            </div>
            <div>
              <label className={lbl}>Дата выдачи</label>
              <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Действителен до</label>
              <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className={inp} />
            </div>
          </div>

          {/* Row 2: supervisor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Руководитель работ — ФИО</label>
              <input value={supervisor} onChange={e => setSupervisor(e.target.value)} placeholder="Иванов Александр Сергеевич" className={inp} />
            </div>
            <div>
              <label className={lbl}>Должность руководителя</label>
              <input value={supervisorPosition} onChange={e => setSupervisorPosition(e.target.value)} className={inp} />
            </div>
          </div>

          {/* Row 3: executor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Ответственный исполнитель — ФИО</label>
              <input value={executor} onChange={e => setExecutor(e.target.value)} placeholder="Гончаров Валерий Викторович" className={inp} />
            </div>
            <div>
              <label className={lbl}>Должность исполнителя</label>
              <input value={executorPosition} onChange={e => setExecutorPosition(e.target.value)} className={inp} />
            </div>
          </div>

          {/* Work description */}
          <div>
            <label className={lbl}>Наименование и место работ</label>
            <textarea
              value={workDesc}
              onChange={e => setWorkDesc(e.target.value)}
              rows={3}
              className={`${inp} resize-none`}
            />
          </div>

          {/* Start / end time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Начало работ</label>
              <div className="flex gap-2">
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={`${inp} w-28`} />
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inp} />
              </div>
            </div>
            <div>
              <label className={lbl}>Окончание работ</label>
              <div className="flex gap-2">
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={`${inp} w-28`} />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inp} />
              </div>
            </div>
          </div>

          {/* Workers & vehicles info */}
          <div className="rounded-xl p-3 border border-white/8 space-y-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Из плана работ (автоматически)</div>
            <div className="flex flex-wrap gap-2">
              <div className="text-xs text-white/60">
                <span className="text-white/30">Выдал наряд:</span> {session.full_name} — {session.position}
              </div>
            </div>
            {allWorkers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[11px] text-white/30">Исполнители:</span>
                {allWorkers.map((w, i) => (
                  <span key={i} className="text-[11px] bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full">{w}</span>
                ))}
              </div>
            )}
            {allVehicles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[11px] text-white/30">Техника:</span>
                {allVehicles.map((v, i) => (
                  <span key={i} className="text-[11px] bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-full">{v}</span>
                ))}
              </div>
            )}
            {allWorkers.length === 0 && allVehicles.length === 0 && (
              <div className="text-[11px] text-white/25 italic">Список исполнителей и техники из позиций плана</div>
            )}
          </div>

          {/* Standard measures notice */}
          <div className="rounded-xl p-3 border border-blue-500/15 bg-blue-500/5">
            <div className="text-[10px] text-blue-400/70 uppercase tracking-wider mb-1.5">Стандартные мероприятия (6 + 6)</div>
            <div className="text-[11px] text-white/50 leading-relaxed">
              Мероприятия до начала и в ходе работ подставляются автоматически по типовому шаблону для работ в тоннеле (ПБО, ограждения, инструктаж, ГИБДД, маячки, ТГС-3).
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 flex items-center justify-between gap-3">
          <div className="text-[11px] text-white/30">
            Выдан: «{issueDateFmt.day}» {issueDateFmt.month} {issueDateFmt.year} · Смена: {plan.shift_type === 'DAY' ? '☀️ День' : '🌙 Ночь'}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm transition-colors">
              Отмена
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
            >
              🖨 Открыть для печати
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
