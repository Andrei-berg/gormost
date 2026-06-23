import { PHASE_SCHEDULE_CODES } from '@/lib/shifts'

export const RU_MONTHS = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь',
]
export const RU_DOW_SHORT = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']

// Derived from the эталон графиков сменности (shifts.ts): schedules needing a фаза.
export const CYCLIC_CODES = new Set(PHASE_SCHEDULE_CODES)

export function addMonths(year: number, month: number, delta: number) {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

export function daysInRange(
  startYear: number,
  startMonth: number,
  spanMonths: number,
  showWeekends = true,
): Date[] {
  const days: Date[] = []
  for (let m = 0; m < spanMonths; m++) {
    const { year, month } = addMonths(startYear, startMonth, m)
    const d = new Date(year, month, 1)
    while (d.getMonth() === month) {
      const dw = d.getDay()
      if (showWeekends || (dw !== 0 && dw !== 6)) {
        days.push(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0))
      }
      d.setDate(d.getDate() + 1)
    }
  }
  return days
}

export function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

export function isWeekend(d: Date): boolean {
  const dw = d.getDay()
  return dw === 0 || dw === 6
}

export function getMonthBoundaries(days: Date[]): { idx: number; label: string }[] {
  const result: { idx: number; label: string }[] = []
  let last = -1
  days.forEach((d, i) => {
    if (d.getMonth() !== last) {
      result.push({ idx: i, label: `${RU_MONTHS[d.getMonth()]} ${d.getFullYear()}` })
      last = d.getMonth()
    }
  })
  return result
}

type Mark = 'I' | 'II' | 'OFF' | null
const CYCLE: Record<string, Mark> = {
  'null+null': 'I',
  'I+null':    'II',
  'II+null':   'OFF',
  'OFF+null':  null,
  'null+I':    'II',
  'null+II':   'OFF',
  'null+OFF':  null,
  'I+I':       'II',
  'I+II':      'OFF',
  'I+OFF':     null,
  'II+I':      'OFF',
  'II+II':     'OFF',
  'II+OFF':    null,
}

export function nextManual(auto: Mark, manual: Mark): Mark {
  const key = `${auto ?? 'null'}+${manual ?? 'null'}`
  return CYCLE[key] ?? (manual ? null : 'I')
}

export function periodLabel(
  startYear: number,
  startMonth: number,
  span: number,
): string {
  if (span === 1) return `${RU_MONTHS[startMonth]} ${startYear}`
  const end = addMonths(startYear, startMonth, span - 1)
  return `${RU_MONTHS[startMonth]} – ${RU_MONTHS[end.month]} ${end.year}`
}
