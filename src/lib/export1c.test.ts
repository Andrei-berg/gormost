import { describe, it, expect } from 'vitest'
import { buildTimesheetXML, buildTimesheetCSV, buildNightPayCSV, type UserMeta, type NightPayRow } from './export1c'
import type { MonthlyTimesheet, TimesheetEntry } from './timesheet'

// ─── Fixtures ────────────────────────────────────────────────

function entry(over: Partial<TimesheetEntry>): TimesheetEntry {
  return {
    userId: 'u1',
    date: new Date(2026, 0, 1),
    code: 'В',
    hoursTotal: 0, hoursDay: 0, hoursNight: 0, hoursEvening: 0, hoursOvertime: 0,
    isCrossMonthTail: false,
    ...over,
  }
}

function makeTimesheet(): MonthlyTimesheet {
  return {
    userId: 'u1',
    year: 2026,
    month: 1,
    entries: [
      entry({ date: new Date(2026, 0, 1), code: 'ЯХ', hoursTotal: 7.5, hoursNight: 6, hoursDay: 1.5, isCrossMonthTail: true }),
      entry({ date: new Date(2026, 0, 2), code: 'Я', hoursTotal: 24, hoursDay: 12, hoursEvening: 4, hoursNight: 8 }),
      entry({ date: new Date(2026, 0, 3), code: 'В' }),
      entry({ date: new Date(2026, 0, 4), code: 'МВО' }),
    ],
    summary: {
      workDays: 2, hoursTotal: 31.5, hoursNight: 14, hoursEvening: 4,
      hoursOvertime: 0, normHours: 176, balance: -144.5, crossMonthTailHours: 7.5,
    },
  }
}

const META: Record<string, UserMeta> = {
  u1: { fullName: 'Иванов "Иван" <И&О>', tabNumber: '0042', serviceId: 'SRV-ENG', serviceName: 'Инженерные системы' },
}

// ─── buildTimesheetXML ───────────────────────────────────────

describe('buildTimesheetXML', () => {
  const xml = buildTimesheetXML([makeTimesheet()], META)

  it('пустой список → пустая строка', () => {
    expect(buildTimesheetXML([], META)).toBe('')
  })

  it('содержит атрибуты сотрудника и итоги', () => {
    expect(xml).toContain('ТабНомер="0042"')
    expect(xml).toContain('ФактЧасов="31.5"')
    expect(xml).toContain('НочныхЧасов="14"')
    expect(xml).toContain('КолвоСотрудников="1"')
  })

  it('экранирует спецсимволы XML в ФИО', () => {
    expect(xml).toContain('Иванов &quot;Иван&quot; &lt;И&amp;О&gt;')
    expect(xml).not.toContain('<И&О>')
  })

  it('ЯХ маппится в Я с атрибутом ПереходящаяСмена', () => {
    expect(xml).toMatch(/ВидВремени="Я"[\s\S]{0,200}?ПереходящаяСмена="true"/)
    expect(xml).not.toContain('ВидВремени="ЯХ"')
  })

  it('МВО маппится в ОВ (доп. выходной 1С)', () => {
    expect(xml).toContain('ВидВремени="ОВ"')
  })

  it('период January 2026: 01 по 31', () => {
    expect(xml).toContain('Период="2026-01-01"')
    expect(xml).toContain('ПериодПо="2026-01-31"')
  })

  it('сотрудник без метаданных пропускается', () => {
    const xml2 = buildTimesheetXML([{ ...makeTimesheet(), userId: 'unknown' }], META)
    expect(xml2).not.toContain('<Сотрудник')
  })
})

// ─── buildTimesheetCSV ───────────────────────────────────────

describe('buildTimesheetCSV', () => {
  const csv = buildTimesheetCSV([makeTimesheet()], META, 2026, 1)

  it('начинается с UTF-8 BOM (для Excel)', () => {
    expect(csv.charCodeAt(0)).toBe(0xFEFF)
  })

  it('шапка содержит колонки итогов и 31 день', () => {
    const header = csv.split('\n')[0]
    expect(header).toContain('Таб.№;ФИО;Служба;Норма ч;Факт ч')
    expect(header).toContain('31 ')
  })

  it('строка сотрудника: таб.номер, итоги, хвост помечен *', () => {
    const row = csv.split('\n')[1]
    expect(row.startsWith('0042;')).toBe(true)
    expect(row).toContain(';176;31.5;14;')
    expect(row).toContain('Я*;7.5') // ЯХ → Я* (хвост)
  })

  it('день без записи — код В без часов', () => {
    const row = csv.split('\n')[1]
    // день 5 и далее отсутствуют в entries → 'В;'
    expect(row).toContain('В;')
  })
})

// ─── buildNightPayCSV ────────────────────────────────────────

describe('buildNightPayCSV', () => {
  const rows: NightPayRow[] = [{
    tabNumber: '0042', fullName: 'Иванов И.И.',
    nightHours: 14, supplement35pct: 980, crossMonthNightHours: 6,
    month: 1, year: 2026,
  }]
  const csv = buildNightPayCSV(rows, 2026, 1)

  it('BOM + шапка + строка данных', () => {
    expect(csv.charCodeAt(0)).toBe(0xFEFF)
    const lines = csv.split('\n')
    expect(lines[0]).toContain('Надбавка 35%')
    expect(lines[1]).toBe('0042;"Иванов И.И.";14;6;980')
  })

  it('подвал содержит период', () => {
    expect(csv).toContain('Период: 01.2026')
  })
})
