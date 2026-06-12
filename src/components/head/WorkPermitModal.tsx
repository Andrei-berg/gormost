'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { WorkPlanWithItems, AuthSession, UserWithAssignment } from '@/types'
import { fetchUsersWithAssignments, markWorkPlanPermit } from '@/lib/api-client'
import { isWorkerOnDuty } from '@/lib/shifts'
import { useConfirm } from '@/components/ConfirmDialog'

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
  'SRV-ENG':  'Гл. Энергетик',
  'SRV-STR':  'СЭИС',
  'SRV-FIRE': 'Пожарная',
  'SRV-VENT': 'ЭВС',
  'SRV-CCTV': 'ВН и СС',
}

// ─── Work type templates ───────────────────────────────────────────────────

interface WorkTypeConfig {
  label: string
  factors: string
  instructionNums: string
  /** road works → include маячки in measure 2, ГИБДД in measure 4 */
  isRoadWork: boolean
  /** work-specific PPE instruction — becomes measure 2 in "during work" table */
  duringMeasure2: string
}

const EMPTY_WORK_TYPE: WorkTypeConfig = {
  label: 'Произвольный',
  factors: '',
  instructionNums: '',
  isRoadWork: false,
  duringMeasure2: 'Соблюдать технологию выполнения работ.',
}

const WORK_TYPES_BY_SERVICE: Record<string, Record<string, WorkTypeConfig>> = {
  'SRV-STR': {
  repair: {
    label: 'Ремонт (мост, конструкции)',
    factors: 'Запылённость, отлетающие предметы, повышенный шум, возможность поражения электрическим током, работа на проезжей части, работа с АГП.',
    instructionNums: '10, 14, 17, 20, 21, 23, 30, 35, 41, 53, 60, 65, 66, 147, 190',
    isRoadWork: true,
    duringMeasure2: 'Соблюдать технологию выполнения работ. Ремонтные работы проводить в перчатках и защитных очках.',
  },
  wash: {
    label: 'Помывка / промывка',
    factors: 'Движущийся автотранспорт, повышенная загазованность, отлетающие предметы, повышенная влажность, повышенный шум, высокое давление в шлангах и струя воды под большим давлением.',
    instructionNums: '10, 14, 15, 21, 41, 43, 55, 65, 185, 190',
    isRoadWork: true,
    duringMeasure2: 'Соблюдать технологию выполнения работ. Промывочные работы проводить в костюмах ПВХ, резиновых перчатках и защитных очках.',
  },
  paint: {
    label: 'Покраска',
    factors: 'Движущийся автотранспорт, повышенная загазованность, отлетающие предметы, повышенный шум.',
    instructionNums: '3, 10, 14, 15, 17, 53, 65, 190',
    isRoadWork: true,
    duringMeasure2: 'Соблюдать технологию выполнения работ. Покрасочные работы проводить в покрасочных костюмах, резиновых перчатках и защитных очках, респираторах.',
  },
  agp: {
    label: 'Люлька / АГП (высотные работы)',
    factors: 'Движение автотранспорта, возможная повышенная загазованность, падение предметов с высоты, поражение электрическим током, работа на высоте, электрооборудование.',
    instructionNums: '10, 14, 15, 21, 65, 147, 190',
    isRoadWork: true,
    duringMeasure2: 'Соблюдать технологию выполнения работ. Работы проводить с использованием монтажных поясов с информацией о дате проверки.',
  },
  snow: {
    label: 'Уборка снега / антигололёд',
    factors: 'Движущийся автотранспорт, повышенная загазованность, отлетающие предметы, повышенный шум, низкие температуры, скользкая поверхность.',
    instructionNums: '10, 14, 15, 16, 41, 58, 65, 105, 109, 133, 185, 190',
    isRoadWork: false,
    duringMeasure2: 'Соблюдать технологию выполнения работ. Работать в утеплённой одежде, пользоваться нескользящей обувью.',
  },
  cover: {
    label: 'Прикрытие места работ',
    factors: 'Движущийся автотранспорт, отлетающие предметы, повышенный шум.',
    instructionNums: '14, 41, 65, 190',
    isRoadWork: true,
    duringMeasure2: 'Соблюдать требования по безопасному размещению транспортных средств прикрытия. Работать в сигнальном жилете.',
  },
  load: {
    label: 'Погрузка / выгрузка материалов',
    factors: 'Отлетающие предметы, повышенный шум, низкие температуры.',
    instructionNums: '6, 10, 14, 17, 41, 65, 66, 69, 190',
    isRoadWork: false,
    duringMeasure2: 'Соблюдать технологию выполнения погрузочно-разгрузочных работ. Работать в перчатках и защитной обуви.',
  },
  scaffold: {
    label: 'Ремонт подмостей / лесов',
    factors: 'Запылённость, отлетающие предметы, повышенный шум, возможность поражения электрическим током.',
    instructionNums: '10, 14, 17, 20, 23, 41, 53, 60, 65, 66, 147, 190',
    isRoadWork: true,
    duringMeasure2: 'Соблюдать технологию выполнения работ. Ремонтные работы на подмостях проводить в перчатках и защитных очках.',
  },
  insul: {
    label: 'Ремонт изоляции',
    factors: 'Движущийся автотранспорт, повышенная загазованность, запылённость, отлетающие предметы, повышенный шум, возможность поражения электрическим током, работа с пневмоинструментом, работа с газовой горелкой.',
    instructionNums: '10, 14, 15, 17, 23, 41, 42, 47, 65, 66, 82, 135, 136, 190',
    isRoadWork: true,
    duringMeasure2: 'Соблюдать технологию выполнения работ. Работу с газовой горелкой и пневмоинструментом проводить в перчатках, защитных очках и огнестойкой спецодежде.',
  },
  teplar: {
    label: 'Работа в тепляке',
    factors: 'Работа в тепляке, работа с дизельной тепловой пушкой.',
    instructionNums: '10, 14, 41, 65, 162, 164, 190',
    isRoadWork: false,
    duringMeasure2: 'Соблюдать технологию выполнения работ. Контролировать работу тепловой пушки, не оставлять без присмотра. Обеспечить вентиляцию рабочей зоны.',
  },
  roof: {
    label: 'Очистка крыш / кровли',
    factors: 'Повышенная загазованность, отлетающие предметы, работа на высоте, работа с АГП, низкие температуры.',
    instructionNums: '10, 14, 15, 21, 41, 65, 66, 109, 147, 190',
    isRoadWork: true,
    duringMeasure2: 'Соблюдать технологию выполнения работ. Работы на высоте выполнять с использованием монтажных поясов с информацией о дате проверки.',
  },
  },
  'SRV-ENG':  {},
  'SRV-FIRE': {},
  'SRV-VENT': {},
  'SRV-CCTV': {},
}

// ─── Measure builders ──────────────────────────────────────────────────────

interface Measure { num: number; text: string; deadline: string }

function buildMeasuresBefore(instructionNums: string, isRoadWork: boolean): Measure[] {
  return [
    {
      num: 1, deadline: '',
      text: isRoadWork
        ? 'Проверить и подготовить технику, оборудование и средства ограждения. Получить и проверить средства индивидуальной защиты и ТГС-3.'
        : 'Проверить и подготовить технику, оборудование и средства ограждения. Получить и проверить средства индивидуальной защиты.',
    },
    {
      num: 2, deadline: '',
      text: isRoadWork
        ? 'Проверить наличие и работу проблесковых маячков на машинах, состояние и работу импульсных дорожных знаков, наличие воды и медицинской аптечки.'
        : 'Проверить наличие воды и медицинской аптечки.',
    },
    {
      num: 3, deadline: '',
      text: `Провести целевой инструктаж по инструкциям №\u00a0${instructionNums} и требованиям «Временного порядка…» с указанием особенностей места и времени работы. Довести сигналы оповещения о возникновении опасности и определить порядок действий по ним.`,
    },
    {
      num: 4, deadline: '',
      text: isRoadWork
        ? 'Получить разрешение (оповестить) отдела ГИБДД (ЦОДД) на выполнение работ. Доложить диспетчеру ГБУ «Гормост» о выходе на выполнение работ.'
        : 'Доложить диспетчеру ГБУ «Гормост» о выходе на выполнение работ.',
    },
    { num: 5, deadline: 'По прибытии на место работ', text: 'Установить ограждение зоны производства работ согласно типовой схеме.' },
    { num: 6, deadline: 'По прибытии на место работ', text: 'Указать маршруты безопасного передвижения в зоне производства работ.' },
  ]
}

function buildMeasuresDuring(duringMeasure2: string): Measure[] {
  return [
    { num: 1, deadline: 'Постоянно, в ходе работы', text: 'Контролировать обстановку на проезжей части вблизи зоны производства работ. Немедленно подать сигнал при возникновении опасности.' },
    { num: 2, deadline: 'Постоянно, в ходе работы', text: duringMeasure2 },
    { num: 3, deadline: 'Постоянно, в ходе работы', text: 'Работать с включёнными проблесковыми маячками на машинах и импульсными дорожными знаками.' },
    { num: 4, deadline: 'Постоянно, в ходе работы', text: 'Не выходить за пределы рабочей зоны; в зоне производства работ перемещаться только с разрешения руководителя работ.' },
    { num: 5, deadline: 'Постоянно, в ходе работы', text: 'Работать в сигнальном жилете и каске, противогазы (самоспасатели) держать в машине в рабочей зоне.' },
    { num: 6, deadline: 'Постоянно, в ходе работы', text: 'Каждые полчаса контролировать состояние газовоздушной среды газосигнализатором ТГС-3.' },
  ]
}

// ─── HTML generator ────────────────────────────────────────────────────────

interface PermitFields {
  permitNumber:        string
  issueDate:           string      // YYYY-MM-DD
  validUntil:          string      // YYYY-MM-DD
  supervisor:          string
  supervisorPosition:  string
  executor:            string
  executorPosition:    string
  workItems:           Array<{ location: string; description: string; timeStart?: string; timeEnd?: string }>
  startTime:           string
  startDate:           string
  endTime:             string
  endDate:             string
  issuedBy:            string
  issuedByPosition:    string
  workers:             string[]
  vehicles:            string[]
  vehicleNotes:        string
  // work-type specific
  factors:             string
  instructionNums:     string
  isRoadWork:          boolean
  duringMeasure2:      string
  customWorkLabel:     string
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

  const measuresBefore = buildMeasuresBefore(f.instructionNums, f.isRoadWork)
  const measuresDuring = buildMeasuresDuring(f.duringMeasure2)

  const supervisorShort = f.supervisor
    ? f.supervisor.split(' ').map((p, i) => i === 0 ? p : p[0] + '.').join(' ')
    : '______'
  const bothShort = supervisorShort

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

  // Work items table (point 5 — перечень работ из плана)
  const workItemRows = f.workItems.map((item, i) => {
    const time = item.timeStart ? `${item.timeStart}${item.timeEnd ? `–${item.timeEnd}` : ''}` : ''
    return `<tr>
      ${td(String(i + 1), 'text-align:center;width:30px')}
      ${td(item.location || '', 'width:180px')}
      ${td(item.description || '')}
      ${td(time, 'width:80px;text-align:center')}
    </tr>`
  }).join('')

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

  // Vehicle table — 5 rows minimum, vehicle notes in last
  const vehicleRows = Array.from({ length: Math.max(5, f.vehicles.length + 2) }, (_, i) => {
    const v = f.vehicles[i] ?? (i === f.vehicles.length && f.vehicleNotes ? f.vehicleNotes : '')
    return `<tr style="height:22px">
      ${td(String(i + 1), 'text-align:center;width:30px')}
      ${td(v, 'min-width:140px')}
      ${td('', 'width:100px')}
      ${td('', 'min-width:140px')}
    </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Наряд-допуск</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #000; background: #fff; }
  @page { size: A4 portrait; margin: 15mm 15mm 20mm 20mm; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    /* repeat table header on every page */
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    /* never split a row across pages */
    tr { break-inside: avoid; page-break-inside: avoid; }
    /* keep section heading with the table that follows */
    .section-title { break-after: avoid; page-break-after: avoid; }
    /* signature block stays together */
    .sig-block { break-inside: avoid; page-break-inside: avoid; }
    /* small no-break helper */
    .no-break { break-inside: avoid; page-break-inside: avoid; }
  }
  table { border-collapse: collapse; width: 100%; margin-bottom: 8px; }
  /* keep rows together in screen preview too */
  tr { break-inside: avoid; page-break-inside: avoid; }
  thead { display: table-header-group; }
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

  <p style="margin-top:8px">
    <b>Опасные производственные факторы</b>, которые действуют или могут возникнуть независимо от выполняемой работы в местах её производства:
    &nbsp;${f.factors}
  </p>

  <p class="section-title" style="margin-top:8px">
    4.&nbsp;До начала производства работ необходимо выполнить следующие мероприятия:
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

  ${f.workItems.length > 0 || f.customWorkLabel ? `
  <p class="section-title">5.&nbsp;Наименование мероприятий (виды работ из плана):${f.customWorkLabel ? `&nbsp;<span style="font-weight:normal">${f.customWorkLabel}</span>` : ''}</p>
  <table>
    <thead><tr>
      ${th('№', 'width:30px')}
      ${th('Место / Объект', 'width:180px')}
      ${th('Наименование работ')}
      ${th('Время', 'width:80px')}
    </tr></thead>
    <tbody>${workItemRows}</tbody>
  </table>` : ''}

  <p class="section-title">В процессе производства работ необходимо выполнить следующие мероприятия:</p>

  <table>
    <thead><tr>
      ${th('№<br>п/п', 'width:30px')}
      ${th('Наименование мероприятия')}
      ${th('Срок выполнения', 'width:140px')}
      ${th('Руководитель работ<br>(фамилия, инициалы)', 'width:140px')}
    </tr></thead>
    <tbody>${measureDuringRows}</tbody>
  </table>

  <p class="section-title">6.&nbsp;Состав исполнителей работ:</p>
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
      <b>7.&nbsp;Наряд-допуск выдал:</b>&nbsp;${f.issuedBy || '___________________________'},&nbsp;${f.issuedByPosition || '________________________'}
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
    <p>
      <b>9.&nbsp;Разрешаю приступить к выполнению работ.</b><br>
      Руководитель работ:&nbsp;${f.supervisor || '______________________'},&nbsp;${f.supervisorPosition || '______________________'}
    </p>
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

// ─── Permit picker helpers ─────────────────────────────────────────────────

function getPermitRoleGroup(u: UserWithAssignment): 'itr' | 'master' | 'brigadier' | 'other' {
  const rl  = u.role_level.toLowerCase()
  const pos = (u.position ?? '').toLowerCase()
  if (['head', 'chief_engineer', 'specialist', 'zamporab', 'hr', 'safety_engineer'].includes(rl)) return 'itr'
  if (pos.includes('бригадир')) return 'brigadier'
  if (rl === 'foreman') return 'master'
  return 'other'
}

function isUserOnDutyDate(u: UserWithAssignment, dateStr: string): boolean {
  const a = u.assignment
  if (!a || !a.schedule_code) return false
  return isWorkerOnDuty({ ...a, schedule_code: a.schedule_code }, new Date(dateStr + 'T00:00:00'))
}

// ─── Issuer role cascade ───────────────────────────────────────────────────

type IssuerRole = 'head' | 'energetik' | 'chief'

const ISSUER_OPTIONS: Array<{ key: IssuerRole; label: string; position: string }> = [
  { key: 'head',       label: 'Начальник службы',  position: 'начальник службы' },
  { key: 'energetik',  label: 'Главный энергетик',  position: 'главный энергетик' },
  { key: 'chief',      label: 'Главный инженер',    position: 'главный инженер' },
]

// ─── Modal component ───────────────────────────────────────────────────────

interface Props {
  plan: WorkPlanWithItems
  session: AuthSession
  onClose: () => void
  onPermitPrinted?: (planId: string, permitNumber: string) => void
}

export default function WorkPermitModal({ plan, session, onClose, onPermitPrinted }: Props) {
  const confirmDialog = useConfirm()
  // Theme toggle — default light (print document form)
  const [lightMode, setLightMode] = useState(true)

  // All active users with assignments (for on-duty filtering)
  const [allUsers, setAllUsers] = useState<UserWithAssignment[]>([])
  useEffect(() => {
    fetchUsersWithAssignments().then(setAllUsers)
  }, [])

  // Work type selection
  const [workServiceId, setWorkServiceId] = useState<string>(() => plan.service_id)
  const [workTypeKey, setWorkTypeKey] = useState<string>(() => {
    const types = WORK_TYPES_BY_SERVICE[plan.service_id] ?? {}
    return Object.keys(types)[0] ?? ''
  })
  const [customWorkLabel, setCustomWorkLabel] = useState('')
  const currentTypes = WORK_TYPES_BY_SERVICE[workServiceId] ?? {}
  const workTypeCfg = currentTypes[workTypeKey] ?? EMPTY_WORK_TYPE

  const nextDay = addDay(plan.plan_date)

  // Auto-detect issuer role from session
  const defaultIssuerRole: IssuerRole =
    session.role_level === 'CHIEF_ENGINEER' ? 'chief' : 'head'

  const [issuerRole,         setIssuerRole]         = useState<IssuerRole>(defaultIssuerRole)
  const [permitNumber,       setPermitNumber]       = useState('')
  const [issueDate,          setIssueDate]          = useState(plan.plan_date)
  const [validUntil,         setValidUntil]         = useState(nextDay)
  const [supervisorUserId,   setSupervisorUserId]   = useState('')
  const [supervisor,         setSupervisor]         = useState('')
  const [supervisorPosition, setSupervisorPosition] = useState(
    plan.shift_type === 'NIGHT' ? 'сменный инженер' : 'мастер участка'
  )
  const [executorUserId,     setExecutorUserId]     = useState('')
  const [executor,           setExecutor]           = useState('')
  const [executorPosition,   setExecutorPosition]   = useState('бригадир')
  const [startTime,          setStartTime]          = useState('09:00')
  const [startDate,          setStartDate]          = useState(plan.plan_date)
  const [endTime,            setEndTime]            = useState('06:30')
  const [endDate,            setEndDate]            = useState(nextDay)
  const [vehicleNotes,       setVehicleNotes]       = useState('')

  // Issuer (point 7) — auto-fill from session when HEAD or CHIEF_ENGINEER
  const [issuedBy,           setIssuedBy]           = useState(
    (session.role_level === 'HEAD' || session.role_level === 'CHIEF_ENGINEER')
      ? (session.full_name ?? '')
      : ''
  )
  const [issuedByPosition,   setIssuedByPosition]   = useState(
    session.role_level === 'CHIEF_ENGINEER'
      ? 'главный инженер'
      : ISSUER_OPTIONS.find(o => o.key === 'head')?.position ?? ''
  )

  const handleIssuerRoleChange = (role: IssuerRole) => {
    setIssuerRole(role)
    const opt = ISSUER_OPTIONS.find(o => o.key === role)!
    setIssuedByPosition(opt.position)
    if (role === 'head' && session.role_level === 'HEAD') {
      setIssuedBy(session.full_name ?? '')
    } else if (role === 'chief' && session.role_level === 'CHIEF_ENGINEER') {
      setIssuedBy(session.full_name ?? '')
    } else {
      setIssuedBy('')
    }
  }

  const handleWorkServiceChange = (svcId: string) => {
    setWorkServiceId(svcId)
    const types = WORK_TYPES_BY_SERVICE[svcId] ?? {}
    setWorkTypeKey(Object.keys(types)[0] ?? '')
  }

  // Supervisor chip select
  const handleSupervisorSelect = (u: UserWithAssignment) => {
    setSupervisorUserId(u.user_id)
    setSupervisor(u.full_name)
    setSupervisorPosition(u.position ?? (plan.shift_type === 'NIGHT' ? 'сменный инженер' : 'мастер участка'))
  }

  // Executor chip select
  const handleExecutorSelect = (u: UserWithAssignment) => {
    setExecutorUserId(u.user_id)
    setExecutor(u.full_name)
    setExecutorPosition(u.position ?? 'бригадир')
  }

  // Derived: on-duty users grouped for permit picker
  const supervisorOwn   = allUsers.filter(u => u.service_id === plan.service_id && ['itr','master'].includes(getPermitRoleGroup(u)) && isUserOnDutyDate(u, plan.plan_date))
  const supervisorOther = allUsers.filter(u => u.service_id !== plan.service_id && ['itr','master'].includes(getPermitRoleGroup(u)) && isUserOnDutyDate(u, plan.plan_date))
  // Brigadiers = FOREMAN role (master + brigadier positions) on duty; fallback to all if none on duty
  const isBrigadierUser = (u: UserWithAssignment) => u.role_level.toLowerCase() === 'foreman'
  const brig_ownOnDuty    = allUsers.filter(u => u.service_id === plan.service_id && isBrigadierUser(u) && isUserOnDutyDate(u, plan.plan_date))
  const brig_otherOnDuty  = allUsers.filter(u => u.service_id !== plan.service_id && isBrigadierUser(u) && isUserOnDutyDate(u, plan.plan_date))
  const brig_ownAll       = allUsers.filter(u => u.service_id === plan.service_id && isBrigadierUser(u))
  const brigadierOwn   = brig_ownOnDuty.length  > 0 ? brig_ownOnDuty  : brig_ownAll
  const brigadierOther = brig_otherOnDuty.length > 0 ? brig_otherOnDuty : []

  const allWorkers  = [...new Set(plan.items.flatMap(i => i.workers))]
  const allVehicles: string[] = plan.items.flatMap(i =>
    (i as WorkPlanWithItems['items'][number] & { vehicles?: Array<{ name: string; plate?: string }> }).vehicles?.map(v =>
      [v.name, v.plate].filter(Boolean).join(' ')
    ) ?? []
  )

  const handlePrint = async () => {
    const html = generateHTML({
      permitNumber,
      issueDate,
      validUntil,
      supervisor,
      supervisorPosition,
      executor,
      executorPosition,
      workItems: plan.items.map(i => ({
        location:    i.location,
        description: i.work_description,
        timeStart:   i.time_start ?? undefined,
        timeEnd:     i.time_end   ?? undefined,
      })),
      startTime,
      startDate,
      endTime,
      endDate,
      issuedBy,
      issuedByPosition,
      workers:      allWorkers,
      vehicles:     allVehicles,
      vehicleNotes,
      factors:       workTypeCfg.factors,
      instructionNums: workTypeCfg.instructionNums,
      isRoadWork:    workTypeCfg.isRoadWork,
      duringMeasure2: workTypeCfg.duringMeasure2,
      customWorkLabel,
    })
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (!win) { URL.revokeObjectURL(url); void confirmDialog('Разрешите всплывающие окна в браузере', { alert: true }); return }
    win.focus()
    setTimeout(() => { win.print(); setTimeout(() => URL.revokeObjectURL(url), 60000) }, 800)
    // Mark permit as created in DB
    await markWorkPlanPermit(plan.id, permitNumber)
    onPermitPrinted?.(plan.id, permitNumber)
  }

  // ── Dynamic styles based on light/dark mode ─────────────────────────────
  const panelBg   = lightMode ? 'bg-white text-gray-900'                         : 'bg-[rgba(15,20,40,0.97)] text-white'
  const headerBg  = lightMode ? 'border-b border-gray-200'                       : 'border-b border-white/10'
  const footerBg  = lightMode ? 'border-t border-gray-200 bg-gray-50'            : 'border-t border-white/10'
  const inp       = lightMode
    ? 'bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 w-full'
    : 'bg-white/8 border border-white/15 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500/50 w-full [color-scheme:dark]'
  const lbl       = lightMode
    ? 'block text-[10px] text-gray-500 uppercase tracking-wider mb-1'
    : 'block text-[10px] text-white/40 uppercase tracking-wider mb-1'
  const sectionBg = lightMode ? 'rounded-xl p-3 border border-gray-200 bg-gray-50' : 'rounded-xl p-3 border border-white/8 bg-white/4'
  const titleText = lightMode ? 'text-gray-700' : 'text-white/70'
  const subtitleText = lightMode ? 'text-gray-400' : 'text-white/40'

  const serviceName   = SERVICE_NAMES[plan.service_id] ?? plan.service_id
  const issueDateFmt  = fmtDate(issueDate)

  const modal = (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel — large centered modal */}
      <div
        className={`relative z-10 w-full max-w-4xl rounded-2xl shadow-2xl border flex flex-col ${panelBg} ${lightMode ? 'border-gray-200' : 'border-white/15'}`}
        style={{ height: 'min(90vh, 900px)' }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 ${headerBg}`}>
          <div>
            <div className={`text-sm font-bold ${lightMode ? 'text-gray-900' : 'text-white'}`}>
              🖨 Наряд-допуск на производство работ
            </div>
            <div className={`text-[11px] mt-0.5 ${subtitleText}`}>
              {serviceName} · {plan.plan_date} · {plan.shift_type === 'DAY' ? '☀️ День' : '🌙 Ночь'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Light/Dark toggle */}
            <button
              onClick={() => setLightMode(v => !v)}
              title={lightMode ? 'Тёмный интерфейс' : 'Светлый интерфейс'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                lightMode
                  ? 'bg-gray-900 border-gray-700 text-white hover:bg-gray-800'
                  : 'bg-white/10 border-white/15 text-white/60 hover:bg-white/15 hover:text-white'
              }`}
            >
              {lightMode ? '🌙 Тёмный' : '☀️ Светлый'}
            </button>
            <button
              onClick={onClose}
              className={`text-lg transition-colors ${lightMode ? 'text-gray-400 hover:text-gray-700' : 'text-white/40 hover:text-white'}`}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">

          {/* Work type selector */}
          <div className={sectionBg}>
            <div className={`text-[10px] uppercase tracking-wider mb-2 ${subtitleText}`}>Вид работ — определяет факторы, инструкции, меры по безопасности</div>

            {/* Service switcher */}
            <div className="flex flex-wrap gap-1 mb-3">
              {Object.entries(WORK_TYPES_BY_SERVICE).map(([svcId, types]) => {
                const hasTypes = Object.keys(types).length > 0
                const isPlanService = svcId === plan.service_id
                const isActive = svcId === workServiceId
                return (
                  <button
                    key={svcId}
                    type="button"
                    onClick={() => handleWorkServiceChange(svcId)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all ${
                      isActive
                        ? lightMode
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-indigo-500/30 border-indigo-500/60 text-indigo-200'
                        : lightMode
                          ? 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                          : 'bg-white/4 border-white/8 text-white/40 hover:bg-white/8 hover:text-white/60'
                    }`}
                  >
                    {SERVICE_NAMES[svcId] ?? svcId}
                    {isPlanService && <span className="ml-1 opacity-60">↩</span>}
                    {!hasTypes && <span className="ml-1 opacity-40">···</span>}
                  </button>
                )
              })}
            </div>

            {/* Type chips for selected service */}
            {Object.keys(currentTypes).length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(currentTypes).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setWorkTypeKey(key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      workTypeKey === key
                        ? lightMode
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-blue-500/30 border-blue-500/60 text-blue-200'
                        : lightMode
                          ? 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                          : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70'
                    }`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className={`text-[11px] py-2 italic ${lightMode ? 'text-amber-600' : 'text-amber-400/80'}`}>
                Виды работ для этой службы будут добавлены. Используйте поле ниже для произвольного вида.
              </div>
            )}

            {workTypeKey && currentTypes[workTypeKey] && (
              <>
                <div className={`mt-2 text-[10px] leading-relaxed ${subtitleText}`}>
                  <span className="font-medium">Факторы:</span> {workTypeCfg.factors}
                </div>
                <div className={`mt-1 text-[10px] ${subtitleText}`}>
                  <span className="font-medium">Инструкции:</span> №&nbsp;{workTypeCfg.instructionNums}
                </div>
              </>
            )}
            <div className="mt-2">
              <label className={lbl}>Произвольный вид работ (вписать вручную)</label>
              <input
                value={customWorkLabel}
                onChange={e => setCustomWorkLabel(e.target.value)}
                placeholder="Например: аварийный ремонт перил моста..."
                className={inp}
              />
            </div>
          </div>

          {/* Row: number + dates */}
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

          {/* Supervisor (Руководитель работ) */}
          <div className={sectionBg}>
            <div className={`text-[10px] uppercase tracking-wider mb-3 flex items-center gap-1.5 ${subtitleText}`}>
              <span>Руководитель работ</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded ${lightMode ? 'bg-blue-50 text-blue-600' : 'bg-blue-500/10 text-blue-400'}`}>
                {plan.shift_type === 'NIGHT' ? 'ночная смена → сменный инженер / мастер (1/3)' : 'дневной наряд → мастер / инженер службы'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>ФИО руководителя работ</label>
                <select
                  value={supervisorUserId}
                  onChange={e => {
                    const u = allUsers.find(u => u.user_id === e.target.value)
                    if (u) handleSupervisorSelect(u)
                    else { setSupervisorUserId(''); setSupervisor('') }
                  }}
                  className={inp}
                >
                  <option value="">— выбрать из списка —</option>
                  {supervisorOwn.length > 0 && (
                    <optgroup label={`Своя служба — на смене (${supervisorOwn.length})`}>
                      {supervisorOwn.map(u => (
                        <option key={u.user_id} value={u.user_id}>
                          {u.full_name}{u.position ? ` (${u.position})` : ''}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {supervisorOther.length > 0 && (
                    <optgroup label={`Другие службы — на смене (${supervisorOther.length})`}>
                      {supervisorOther.map(u => (
                        <option key={u.user_id} value={u.user_id}>
                          {u.full_name}{u.position ? ` (${u.position})` : ''} — {SERVICE_NAMES[u.service_id ?? ''] ?? u.service_id}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
              <div>
                <label className={lbl}>Должность</label>
                <input value={supervisorPosition} onChange={e => setSupervisorPosition(e.target.value)} placeholder="мастер участка" className={inp} />
              </div>
            </div>
            <div className="mt-2">
              <label className={lbl}>ФИО вручную (если нет в списке)</label>
              <input value={supervisorUserId ? '' : supervisor} onChange={e => { setSupervisor(e.target.value); setSupervisorUserId('') }} placeholder="Иванов Александр Сергеевич" className={inp} />
            </div>
          </div>

          {/* Executor (п.1 — Ответственный исполнитель = бригадир) */}
          <div className={sectionBg}>
            <div className={`text-[10px] uppercase tracking-wider mb-3 flex items-center gap-1.5 ${subtitleText}`}>
              <span>1. Ответственный исполнитель работ</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded ${lightMode ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-500/10 text-emerald-400'}`}>
                бригадир службы
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>ФИО бригадира</label>
                <select
                  value={executorUserId}
                  onChange={e => {
                    const u = allUsers.find(u => u.user_id === e.target.value)
                    if (u) handleExecutorSelect(u)
                    else { setExecutorUserId(''); setExecutor('') }
                  }}
                  className={inp}
                >
                  <option value="">— выбрать из списка —</option>
                  {brigadierOwn.length > 0 && (
                    <optgroup label={brig_ownOnDuty.length > 0 ? `Своя служба — на смене (${brigadierOwn.length})` : `Своя служба — все (${brigadierOwn.length})`}>
                      {brigadierOwn.map(u => (
                        <option key={u.user_id} value={u.user_id}>
                          {u.full_name}{u.position ? ` (${u.position})` : ''}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {brigadierOther.length > 0 && (
                    <optgroup label={`Другие службы — на смене (${brigadierOther.length})`}>
                      {brigadierOther.map(u => (
                        <option key={u.user_id} value={u.user_id}>
                          {u.full_name}{u.position ? ` (${u.position})` : ''} — {SERVICE_NAMES[u.service_id ?? ''] ?? u.service_id}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
              <div>
                <label className={lbl}>Должность</label>
                <input value={executorPosition} onChange={e => setExecutorPosition(e.target.value)} placeholder="бригадир" className={inp} />
              </div>
            </div>
            <div className="mt-2">
              <label className={lbl}>ФИО вручную (если нет в списке)</label>
              <input value={executorUserId ? '' : executor} onChange={e => { setExecutor(e.target.value); setExecutorUserId('') }} placeholder="Гончаров Валерий Викторович" className={inp} />
            </div>
          </div>

          {/* Time (п.4) */}
          <div>
            <label className={`${lbl} mb-2`}>4. Время производства работ</label>
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
          </div>

          {/* Work items (п.5 — из плана) */}
          {plan.items.length > 0 && (
            <div>
              <div className={`text-[10px] uppercase tracking-wider mb-2 ${subtitleText}`}>5. Наименование мероприятий (из плана работ)</div>
              <div className={`rounded-xl border divide-y ${lightMode ? 'border-gray-200 divide-gray-100' : 'border-white/8 divide-white/5'}`}>
                {plan.items.map((item, i) => (
                  <div key={item.id} className={`flex items-start gap-2 px-3 py-2 text-xs ${lightMode ? 'text-gray-700' : 'text-white/70'}`}>
                    <span className={`shrink-0 font-mono mt-px ${lightMode ? 'text-gray-400' : 'text-white/30'}`}>{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{item.location}</span>
                      {item.work_description && <span className={lightMode ? 'text-gray-500' : 'text-white/50'}> — {item.work_description}</span>}
                    </div>
                    {item.time_start && (
                      <span className={`shrink-0 font-mono text-[10px] ${lightMode ? 'text-blue-600' : 'text-cyan-400'}`}>
                        {item.time_start}{item.time_end ? `–${item.time_end}` : ''}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Workers (п.6 — автоматически из плана) */}
          {allWorkers.length > 0 && (
            <div>
              <div className={`text-[10px] uppercase tracking-wider mb-2 ${subtitleText}`}>
                6. Состав исполнителей — инструктаж проводит руководитель работ
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allWorkers.map((w, i) => (
                  <span key={i} className={`text-[11px] px-2 py-0.5 rounded-full ${
                    lightMode ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-emerald-500/15 text-emerald-300'
                  }`}>
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Vehicle notes (п.6.1 — editable) */}
          <div>
            <label className={lbl}>6.1 Используемый транспорт / техника (вписать вручную при необходимости)</label>
            <textarea
              value={vehicleNotes}
              onChange={e => setVehicleNotes(e.target.value)}
              rows={2}
              placeholder="КамАЗ-5511 а/м АВ123, экскаватор Hitachi..."
              className={`${inp} resize-none`}
            />
            {allVehicles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {allVehicles.map((v, i) => (
                  <span key={i} className={`text-[11px] px-2 py-0.5 rounded-full ${
                    lightMode ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-amber-500/15 text-amber-300'
                  }`}>
                    {v}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Issuer (п.7) — cascade: Начальник → Гл. энергетик → Гл. инженер */}
          <div className={sectionBg}>
            <div className={`text-[10px] uppercase tracking-wider mb-3 ${subtitleText}`}>
              7. Наряд-допуск выдал — выберите кто подписывает
            </div>

            {/* Cascade toggle */}
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {ISSUER_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleIssuerRoleChange(opt.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    issuerRole === opt.key
                      ? lightMode
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-blue-500/25 border-blue-500/50 text-blue-300'
                      : lightMode
                        ? 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                        : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {issuerRole !== 'head' && (
              <div className={`text-[10px] mb-3 px-2 py-1.5 rounded-lg ${
                lightMode ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-amber-500/8 text-amber-400/80 border border-amber-500/15'
              }`}>
                {issuerRole === 'energetik'
                  ? 'Главный энергетик подписывает при отсутствии начальника службы'
                  : 'Главный инженер подписывает при отсутствии начальника службы и главного энергетика'}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>ФИО подписывающего</label>
                <input
                  value={issuedBy}
                  onChange={e => setIssuedBy(e.target.value)}
                  placeholder={issuerRole === 'head' ? session.full_name ?? 'Фамилия И.О.' : 'Фамилия И.О.'}
                  className={inp}
                />
              </div>
              <div>
                <label className={lbl}>Должность</label>
                <input value={issuedByPosition} onChange={e => setIssuedByPosition(e.target.value)} className={inp} />
              </div>
            </div>
          </div>

          {/* Info */}
          <div className={`rounded-xl p-3 border ${lightMode ? 'border-blue-200 bg-blue-50' : 'border-blue-500/15 bg-blue-500/5'}`}>
            <div className={`text-[10px] uppercase tracking-wider mb-1.5 ${lightMode ? 'text-blue-600' : 'text-blue-400/70'}`}>
              Мероприятия — 6 до начала + 6 в процессе
            </div>
            <div className={`text-[11px] leading-relaxed ${lightMode ? 'text-blue-700/70' : 'text-white/50'}`}>
              {workTypeCfg.isRoadWork
                ? 'До начала: проверка техники и маячков, инструктаж, уведомление ГИБДД, ограждение, маршруты.'
                : 'До начала: проверка техники, инструктаж, уведомление диспетчера, ограждение, маршруты.'}
              {' '}В процессе: контроль дороги, СИЗ ({workTypeCfg.label.toLowerCase()}), маячки, зона, жилет+каска, ТГС-3.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-5 py-4 flex items-center justify-between gap-3 ${footerBg}`}>
          <div className={`text-[11px] ${subtitleText}`}>
            Выдан: «{issueDateFmt.day}» {issueDateFmt.month} {issueDateFmt.year}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                lightMode ? 'bg-gray-100 hover:bg-gray-200 text-gray-600' : 'bg-white/5 hover:bg-white/10 text-white/50'
              }`}
            >
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

  if (typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}
