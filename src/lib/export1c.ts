/**
 * Экспорт табеля в форматы 1С:ЗУП и Excel (CSV)
 *
 * XML-формат совместим с загрузкой через «Обмен данными» 1С:ЗУП 3.x
 * (документ «Табель учёта рабочего времени», вид учёта СУРВ).
 *
 * CSV-формат: структура Т-13, открывается в Excel напрямую.
 */

import type { MonthlyTimesheet, TimesheetEntry, EntryCode } from './timesheet'

// ─────────────────────────────────────────────────────────────
// МАППИНГ КОДОВ: внутренние → 1С:ЗУП
// ─────────────────────────────────────────────────────────────

/** Соответствие внутренних кодов кодам 1С:ЗУП */
const CODE_MAP_1C: Record<EntryCode, string> = {
  'Я'  : 'Я',   // явка
  'ЯХ' : 'Я',   // хвост переходящей смены = явка в 1С (с атрибутом ПереходящаяСмена)
  'В'  : 'В',   // выходной
  'МВО': 'ОВ',  // межвахтовый отдых → дополнительный выходной
  'ОТ' : 'ОТ',  // отпуск
  'ДО' : 'ДО',  // доп. отпуск
  'Б'  : 'Б',   // больничный
  'НН' : 'НН',  // неявка невыяснена
  'П'  : 'П',   // прогул
}

// ─────────────────────────────────────────────────────────────
// ВСПОМОГАТЕЛЬНЫЕ
// ─────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function padMonth(n: number): string {
  return String(n).padStart(2, '0')
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${padMonth(d.getMonth() + 1)}-${padMonth(d.getDate())}`
}

// ─────────────────────────────────────────────────────────────
// XML-ЭКСПОРТ (1С:ЗУП «Табель учёта рабочего времени»)
// ─────────────────────────────────────────────────────────────

export interface UserMeta {
  fullName: string
  tabNumber: string
  serviceId: string
  serviceName?: string
}

/**
 * Строит XML-файл обмена данными с 1С:ЗУП.
 *
 * Загрузка в 1С:
 *   Зарплата и управление персоналом → Администрирование →
 *   Обмен данными → Загрузить данные из файла XML
 *
 * @param timesheets   список табелей (один на сотрудника)
 * @param usersMap     метаданные сотрудников (имя, таб.номер)
 * @param orgName      наименование организации
 */
export function buildTimesheetXML(
  timesheets: MonthlyTimesheet[],
  usersMap: Record<string, UserMeta>,
  orgName: string = 'ГБУ «Гормост – Лефортово»'
): string {
  if (timesheets.length === 0) return ''

  const { year, month } = timesheets[0]
  const periodStart  = `${year}-${padMonth(month)}-01`
  const lastDay      = new Date(year, month, 0).getDate()
  const periodEnd    = `${year}-${padMonth(month)}-${padMonth(lastDay)}`
  const generatedAt  = new Date().toISOString()

  const employeeRows = timesheets
    .map(ts => buildEmployeeXML(ts, usersMap[ts.userId]))
    .filter(Boolean)
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<!--
  1С:ЗУП — Табель учёта рабочего времени (форма Т-13)
  Организация: ${esc(orgName)}
  Период: ${periodStart} — ${periodEnd}
  Сформирован: ${generatedAt}
  Источник: Gormost Web System
  Вид учёта: СУРВ (суммированный учёт)
  Ночное время: ТК РФ ст.96 (22:00–06:00)
-->
<ФайлОбмена
  ВерсияФормата="2.1"
  ТипДокумента="ТабельУчетаРабочегоВремени"
  Источник="GormostWeb"
  ДатаФормирования="${generatedAt}">

  <ТабельУчетаРабочегоВремени
    Организация="${esc(orgName)}"
    Период="${periodStart}"
    ПериодПо="${periodEnd}"
    ВидУчета="СУРВ"
    УчетныйПериод="Квартал"
    КолвоСотрудников="${timesheets.length}">

${employeeRows}

  </ТабельУчетаРабочегоВремени>

</ФайлОбмена>`
}

function buildEmployeeXML(ts: MonthlyTimesheet, meta: UserMeta | undefined): string {
  if (!meta) return ''

  const s = ts.summary
  const days = ts.entries
    .map(e => buildDayXML(e))
    .join('\n      ')

  return `    <Сотрудник
      Код="${esc(meta.tabNumber)}"
      ФИО="${esc(meta.fullName)}"
      ТабНомер="${esc(meta.tabNumber)}"
      Подразделение="${esc(meta.serviceName ?? '')}"
      НормаЧасов="${s.normHours}"
      ФактЧасов="${s.hoursTotal}"
      НочныхЧасов="${s.hoursNight}"
      ВечернихЧасов="${s.hoursEvening}"
      СверхурочноЧасов="${s.hoursOvertime}"
      Баланс="${s.balance}"
      РабочихДней="${s.workDays}">
      ${days}
      <ПереходящаяСмена ЧасовВМесяце="${s.crossMonthTailHours}"
        Примечание="Часы завершения суточной смены, перешедшие из предыдущего месяца"/>
    </Сотрудник>`
}

function buildDayXML(e: TimesheetEntry): string {
  const dateStr  = toISODate(e.date)
  const code1c   = CODE_MAP_1C[e.code as EntryCode] ?? e.code
  const tailAttr = e.isCrossMonthTail ? ' ПереходящаяСмена="true"' : ''
  const notes    = e.notes ? ` Примечание="${esc(e.notes)}"` : ''

  if (e.hoursTotal === 0) {
    return `<День Дата="${dateStr}" ВидВремени="${code1c}"${tailAttr}/>`
  }

  return `<День Дата="${dateStr}" ВидВремени="${code1c}"
        ЧасовВсего="${e.hoursTotal}"
        ЧасовДневных="${e.hoursDay}"
        ЧасовВечерних="${e.hoursEvening}"
        ЧасовНочных="${e.hoursNight}"
        ЧасовСверхурочных="${e.hoursOvertime}"${tailAttr}${notes}/>`
}

// ─────────────────────────────────────────────────────────────
// CSV-ЭКСПОРТ (Т-13, открывается в Excel)
// ─────────────────────────────────────────────────────────────

/**
 * Строит CSV-файл в структуре Т-13 для ручной загрузки в 1С или Excel.
 * Разделитель: точка с запятой (стандарт для Excel с русской локалью).
 *
 * Структура строки:
 *   Таб.№ | ФИО | Служба | Норма ч | Факт ч | Ночные ч | Баланс |
 *   [1_код ; 1_ч] [2_код ; 2_ч] … [31_код ; 31_ч]
 */
export function buildTimesheetCSV(
  timesheets: MonthlyTimesheet[],
  usersMap: Record<string, UserMeta>,
  year: number,
  month: number
): string {
  const daysInMonth = new Date(year, month, 0).getDate()
  const BOM = '\uFEFF' // UTF-8 BOM для корректного открытия в Excel

  // Шапка
  const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month - 1, i + 1)
    const dow = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][d.getDay()]
    return `${i + 1} ${dow} (код);${i + 1} ${dow} (ч)`
  }).join(';')

  const header = `Таб.№;ФИО;Служба;Норма ч;Факт ч;Ночные ч;Вечерних ч;Баланс;${dayHeaders}`

  const rows = timesheets.map(ts => {
    const meta = usersMap[ts.userId]
    if (!meta) return null

    const s = ts.summary
    const cells = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1
      const e = ts.entries.find(x => x.date.getDate() === dayNum)
      if (!e || e.hoursTotal === 0) {
        const code1c = e ? CODE_MAP_1C[e.code as EntryCode] : 'В'
        return `${code1c};`
      }
      const code1c = CODE_MAP_1C[e.code as EntryCode] ?? e.code
      const suffix = e.isCrossMonthTail ? '*' : ''
      return `${code1c}${suffix};${e.hoursTotal}`
    }).join(';')

    return `${meta.tabNumber};"${meta.fullName}";"${meta.serviceName ?? ''}";${s.normHours};${s.hoursTotal};${s.hoursNight};${s.hoursEvening};${s.balance};${cells}`
  }).filter(Boolean)

  const legend = [
    '',
    '* — хвост переходящей суточной смены из предыдущего месяца (00:00–07:30)',
    'Ночные часы: 22:00–06:00 (ТК РФ ст.96)',
    'Вечерние часы: 18:00–22:00 (ВТР «Гормост-Лефортово»)',
    `Сформирован: ${new Date().toLocaleString('ru-RU')} | Gormost Web System`,
  ]

  return BOM + [header, ...rows, ...legend].join('\n')
}

// ─────────────────────────────────────────────────────────────
// ЭКСПОРТ РАСЧЁТНОГО ЛИСТКА (ночные доплаты для 1С)
// ─────────────────────────────────────────────────────────────

export interface NightPayRow {
  tabNumber: string
  fullName: string
  nightHours: number
  /** Надбавка 35% (Московское тарифное соглашение) */
  supplement35pct: number
  crossMonthNightHours: number
  month: number
  year: number
}

/**
 * Формирует CSV с ночными доплатами для ручного ввода в 1С:Зарплата.
 * Строки группируются по подразделениям.
 */
export function buildNightPayCSV(
  rows: NightPayRow[],
  year: number,
  month: number
): string {
  const BOM = '\uFEFF'
  const header = 'Таб.№;ФИО;Ночных ч (всего);В т.ч. из переходящей смены;Надбавка 35% (руб.)'

  const dataRows = rows.map(r =>
    `${r.tabNumber};"${r.fullName}";${r.nightHours};${r.crossMonthNightHours};${r.supplement35pct}`
  )

  const meta = [
    '',
    `Период: ${padMonth(month)}.${year}`,
    'Надбавка: 35% (Московское тарифное соглашение о минимальной заработной плате)',
    'Основание: ТК РФ ст.96 + ПП РФ №554 от 22.07.2008',
  ]

  return BOM + [header, ...dataRows, ...meta].join('\n')
}
