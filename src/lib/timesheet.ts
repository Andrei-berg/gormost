/**
 * Табельный учёт рабочего времени
 * Основание: ВТР дежурной смены «Гормост-Лефортово» от 10.01.2025
 * ТК РФ: ст. 91 (учёт РВ), ст. 96 (ночное время), ст. 297–301 (вахта)
 *
 * Ключевые параметры по ВТР:
 *   Начало/конец смены: 07:30
 *   Суточная смена:     24ч (07:30 → 07:30 следующего дня)
 *   Ночное время ТК:    22:00–06:00 (8ч за сутки)
 *   Вечернее время ВТР: 18:00–22:00 (4ч, для доп. надбавки ГБУ)
 */

import { resolveShiftStatus } from './shifts'
import type { UserWithAssignment } from '@/types'

// ─────────────────────────────────────────────────────────────
// КОНСТАНТЫ
// ─────────────────────────────────────────────────────────────

/** Час и минута начала/сдачи дежурной смены по ВТР */
export const SHIFT_HANDOVER_H = 7
export const SHIFT_HANDOVER_M = 30

/** Ночное время по ТК РФ ст. 96 */
export const NIGHT_START_H = 22
export const NIGHT_END_H = 6

/** Вечернее время по ВТР объекта (для доп. надбавки) */
export const EVENING_START_H = 18

/** Часов в полной суточной смене */
export const FULL_SHIFT_HOURS = 24

/** Расписание коды, которые означают 24-часовую смену */
export const SHIFT_24H_CODES = ['1/3', '2/2', '3/3', '6/6', '15/15', 'X/Y'] as const

// ─────────────────────────────────────────────────────────────
// ТИПЫ
// ─────────────────────────────────────────────────────────────

/** Коды явки для табеля Т-13 + вахтовые расширения */
export type EntryCode =
  | 'Я'    // явка, полный рабочий день
  | 'ЯХ'  // явка-хвост: завершение переходящей суточной смены
  | 'В'   // выходной / день отдыха
  | 'МВО' // межвахтовый отдых (ТК ст.301)
  | 'ОТ'  // ежегодный оплачиваемый отпуск
  | 'ДО'  // доп. отпуск без сохранения
  | 'Б'   // больничный
  | 'НН'  // неявка по невыясненной причине
  | 'П'   // прогул

/** Одна строка табеля: один сотрудник × один день */
export interface TimesheetEntry {
  userId: string
  date: Date
  code: EntryCode
  /** Всего часов в этот день */
  hoursTotal: number
  /** Дневные часы (07:30–18:00 или 06:00–07:30) */
  hoursDay: number
  /** Ночные по ТК РФ (22:00–06:00) */
  hoursNight: number
  /** Вечерние по ВТР (18:00–22:00) */
  hoursEvening: number
  /** Сверхурочные сверх нормы периода */
  hoursOvertime: number
  /** true = этот день является хвостом смены из предыдущего месяца */
  isCrossMonthTail: boolean
  sourcePhaseId?: string
  notes?: string
}

/** Итоговая строка по сотруднику за месяц */
export interface TimesheetSummary {
  /** Количество рабочих дней (Я + ЯХ) */
  workDays: number
  hoursTotal: number
  hoursNight: number
  hoursEvening: number
  hoursOvertime: number
  /** Норма часов месяца (производственный календарь, 40ч/нед) */
  normHours: number
  /** Баланс: фактические − норма. Положительный = переработка */
  balance: number
  /** Часы хвоста переходящей смены из предыдущего месяца */
  crossMonthTailHours: number
}

/** Полный табель за месяц по одному сотруднику */
export interface MonthlyTimesheet {
  userId: string
  year: number
  /** 1–12 */
  month: number
  entries: TimesheetEntry[]
  summary: TimesheetSummary
}

/** Результат разбивки переходящей 24ч-смены по границе 00:00 */
export interface CrossMonthSplit {
  /** Часть в первом месяце: 07:30 → 00:00 = 16.5ч */
  month1: {
    date: Date
    hoursTotal: number  // 16.5
    hoursDay: number    // 10.5 (07:30–18:00)
    hoursEvening: number// 4.0  (18:00–22:00)
    hoursNight: number  // 2.0  (22:00–00:00)
  }
  /** Часть во втором месяце: 00:00 → 07:30 = 7.5ч */
  month2: {
    date: Date
    hoursTotal: number  // 7.5
    hoursDay: number    // 1.5  (06:00–07:30)
    hoursEvening: number// 0
    hoursNight: number  // 6.0  (00:00–06:00)
  }
}

// ─────────────────────────────────────────────────────────────
// РАЗБИВКА ПЕРЕХОДЯЩЕЙ СМЕНЫ
// ─────────────────────────────────────────────────────────────

/**
 * Разбивает 24ч суточную смену на два калendarных дня.
 * Граница: 00:00. Входная дата = день начала смены (07:30).
 *
 * Пример: смена начинается 31 января в 07:30
 *   М1 (31 января):  07:30–00:00 = 16.5ч (дн 10.5 + веч 4.0 + ноч 2.0)
 *   М2 (1 февраля):  00:00–07:30 =  7.5ч (ноч 6.0 + дн 1.5)
 */
export function splitCrossMonthShift(shiftStartDate: Date): CrossMonthSplit {
  const startDay = new Date(shiftStartDate)
  startDay.setHours(0, 0, 0, 0)

  // Граница: 00:00 следующего дня
  const midnight = new Date(startDay)
  midnight.setDate(midnight.getDate() + 1)
  // midnight теперь = 00:00 первого числа следующего месяца

  // М1: 07:30 → 00:00 = 16.5ч
  const m1Total   = 16.5
  const m1Day     = 10.5  // 07:30–18:00
  const m1Evening = 4.0   // 18:00–22:00
  const m1Night   = 2.0   // 22:00–00:00

  // М2: 00:00 → 07:30 = 7.5ч
  const m2Total   = 7.5
  const m2Night   = 6.0   // 00:00–06:00 (ночные по ТК)
  const m2Day     = 1.5   // 06:00–07:30
  const m2Evening = 0

  return {
    month1: { date: startDay, hoursTotal: m1Total, hoursDay: m1Day, hoursEvening: m1Evening, hoursNight: m1Night },
    month2: { date: midnight, hoursTotal: m2Total, hoursDay: m2Day, hoursEvening: m2Evening, hoursNight: m2Night },
  }
}

// ─────────────────────────────────────────────────────────────
// НОРМА ЧАСОВ
// ─────────────────────────────────────────────────────────────

/**
 * Норма рабочих часов за месяц по производственному календарю РФ.
 * Упрощённый расчёт: 40ч/нед без вычета праздников.
 * Для точного учёта замените на таблицу производственного календаря.
 */
export function calcMonthNormHours(year: number, month: number): number {
  const daysInMonth = new Date(year, month, 0).getDate()
  let workDays = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay()
    if (dow !== 0 && dow !== 6) workDays++
  }
  // 40ч/нед → 8ч/день
  return workDays * 8
}

// ─────────────────────────────────────────────────────────────
// ПОСТРОЕНИЕ ТАБЕЛЯ ЗА МЕСЯЦ
// ─────────────────────────────────────────────────────────────

/**
 * Строит табель учёта рабочего времени за указанный месяц для одного сотрудника.
 * Обрабатывает переходящую смену: последний день месяца → M1, первый день → M2.
 *
 * @param user     сотрудник с назначением графика
 * @param year     год (например, 2025)
 * @param month    месяц 1–12
 */
export function buildMonthlyTimesheet(
  user: UserWithAssignment,
  year: number,
  month: number
): MonthlyTimesheet {
  const entries: TimesheetEntry[] = []
  const daysInMonth = new Date(year, month, 0).getDate()
  const uid = user.user_id
  const assignment = user.assignment ?? null

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day)

    if (!assignment || !assignment.schedule_code) {
      entries.push(makeRestEntry(uid, date))
      continue
    }

    // resolveShiftStatus requires schedule_code as string (not undefined)
    const asgn = assignment as typeof assignment & { schedule_code: string }
    const status = resolveShiftStatus(asgn, date)
    const schedCode = assignment.schedule_code
    const is24h = SHIFT_24H_CODES.includes(schedCode as typeof SHIFT_24H_CODES[number])
    const isLastDay = day === daysInMonth
    const isFirstDay = day === 1

    // Первый день месяца: проверяем хвост переходящей смены из предыдущего месяца
    if (isFirstDay) {
      const prevMonthLastDay = new Date(year, month - 1, 0) // последний день предыдущего месяца
      const prevStatus = resolveShiftStatus(asgn, prevMonthLastDay)
      if (prevStatus.working && is24h) {
        const split = splitCrossMonthShift(prevMonthLastDay)
        entries.push({
          userId: uid,
          date,
          code: 'ЯХ',
          hoursTotal:   split.month2.hoursTotal,
          hoursDay:     split.month2.hoursDay,
          hoursNight:   split.month2.hoursNight,
          hoursEvening: split.month2.hoursEvening,
          hoursOvertime: 0,
          isCrossMonthTail: true,
          notes: 'Завершение суточной смены (00:00–07:30). Ночных по ТК: 6ч.',
        })
        continue
      }
    }

    if (!status.working) {
      entries.push(makeRestEntry(uid, date))
      continue
    }

    // Последний день месяца на 24ч-графике → только M1-часть (M2 пойдёт в следующий месяц)
    if (isLastDay && is24h) {
      const split = splitCrossMonthShift(date)
      entries.push({
        userId: uid,
        date,
        code: 'Я',
        hoursTotal:   split.month1.hoursTotal,
        hoursDay:     split.month1.hoursDay,
        hoursNight:   split.month1.hoursNight,
        hoursEvening: split.month1.hoursEvening,
        hoursOvertime: 0,
        isCrossMonthTail: false,
        notes: `Переходящая смена → хвост ${split.month2.hoursTotal}ч перейдёт в следующий месяц`,
      })
      continue
    }

    // Обычный рабочий день
    entries.push(makeWorkEntry(uid, date, schedCode))
  }

  const summary = calcSummary(entries, year, month)
  return { userId: uid, year, month, entries, summary }
}

// ─────────────────────────────────────────────────────────────
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ─────────────────────────────────────────────────────────────

function makeWorkEntry(userId: string, date: Date, scheduleCode: string): TimesheetEntry {
  const is24h = SHIFT_24H_CODES.includes(scheduleCode as typeof SHIFT_24H_CODES[number])

  if (is24h) {
    // Полная суточная смена: 24ч
    // Дн: 07:30–18:00 = 10.5ч + 06:00–07:30 = 1.5ч = 12ч
    // Веч: 18:00–22:00 = 4ч
    // Ноч: 22:00–06:00 = 8ч по ТК
    return {
      userId, date,
      code: 'Я',
      hoursTotal:    24,
      hoursDay:      12,
      hoursEvening:   4,
      hoursNight:     8,
      hoursOvertime:  0,
      isCrossMonthTail: false,
    }
  }

  // 5/2 по ВТР: 07:30–16:30, обед 45мин = 8.25ч чистого времени
  // Используем 8ч для простоты (стандарт 40ч/нед)
  return {
    userId, date,
    code: 'Я',
    hoursTotal:    8,
    hoursDay:      8,
    hoursEvening:  0,
    hoursNight:    0,
    hoursOvertime: 0,
    isCrossMonthTail: false,
  }
}

function makeRestEntry(userId: string, date: Date): TimesheetEntry {
  return {
    userId, date,
    code: 'В',
    hoursTotal: 0, hoursDay: 0, hoursNight: 0,
    hoursEvening: 0, hoursOvertime: 0,
    isCrossMonthTail: false,
  }
}

function calcSummary(entries: TimesheetEntry[], year: number, month: number): TimesheetSummary {
  const workEntries    = entries.filter(e => e.code === 'Я' || e.code === 'ЯХ')
  const workDays       = workEntries.length
  const hoursTotal     = round2(workEntries.reduce((s, e) => s + e.hoursTotal,   0))
  const hoursNight     = round2(workEntries.reduce((s, e) => s + e.hoursNight,   0))
  const hoursEvening   = round2(workEntries.reduce((s, e) => s + e.hoursEvening, 0))
  const hoursOvertime  = round2(workEntries.reduce((s, e) => s + e.hoursOvertime,0))
  const crossMonthTailHours = round2(
    entries.filter(e => e.isCrossMonthTail).reduce((s, e) => s + e.hoursTotal, 0)
  )
  const normHours = calcMonthNormHours(year, month)
  const balance   = round2(hoursTotal - normHours)

  return { workDays, hoursTotal, hoursNight, hoursEvening, hoursOvertime, normHours, balance, crossMonthTailHours }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ─────────────────────────────────────────────────────────────
// РАСЧЁТ ДОПЛАТЫ ЗА НОЧНЫЕ
// ─────────────────────────────────────────────────────────────

export interface NightPayCalc {
  userId: string
  year: number
  month: number
  nightHours: number
  eveningHours: number
  /** Доплата 35% (Московское тарифное соглашение, минимум ПП РФ №554 = 20%) */
  nightSupplementRub: number
  crossMonthNightHours: number
}

/**
 * Рассчитывает доплату за ночные часы.
 * @param ts           табель за месяц
 * @param hourlyRate   часовая тарифная ставка (оклад / норма часов месяца)
 * @param supplement   процент надбавки (по умолчанию 0.35 = 35% для ГБУ Москвы)
 */
export function calcNightPay(
  ts: MonthlyTimesheet,
  hourlyRate: number,
  supplement: number = 0.35
): NightPayCalc {
  const nightHours   = ts.summary.hoursNight
  const eveningHours = ts.summary.hoursEvening
  const crossMonthNightHours = round2(
    ts.entries.filter(e => e.isCrossMonthTail).reduce((s, e) => s + e.hoursNight, 0)
  )
  const nightSupplementRub = round2(nightHours * hourlyRate * supplement)

  return {
    userId: ts.userId,
    year:   ts.year,
    month:  ts.month,
    nightHours,
    eveningHours,
    nightSupplementRub,
    crossMonthNightHours,
  }
}
