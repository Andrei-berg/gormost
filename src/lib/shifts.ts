// Утилита для расчёта смен
// База: 2 января 2025 = 4 смена (Станишевский А.В.)

export interface ShiftInfo {
  shiftNumber: 1 | 2 | 3 | 4
  shiftName: string        // "Смена №N"
  shiftStartDate: Date     // working day date at 07:30
  chiefName: string        // full name: "Фамилия Имя Отчество"
  chiefTabNumber: string
  isWorking: boolean
  period: 'day' | 'night' | 'both'
}

// Смена заступает в 07:30
const SHIFT_HOUR = 7
const SHIFT_MINUTE = 30

// ⚠️ Укажите полные ФИО начальников дежурной смены
const SHIFT_CHIEFS = [
  { no: 1, fullName: 'Чекин А.В.',           tab: '0000-00001' },
  { no: 2, fullName: 'Максимов И.Н.',         tab: '0000-00002' },
  { no: 3, fullName: 'Кожин В.М.',            tab: '0000-00003' },
  { no: 4, fullName: 'Станишевский А.В.',     tab: '0000-00004' },
]

// Базовая дата: 2 января 2025 = смена 4
const BASE_DATE = new Date('2025-01-02')
const BASE_SHIFT = 4

/**
 * Получить информацию о дежурной смене на конкретную дату.
 * Каждый календарный день дежурит ровно одна смена (сутки/трое, 4 смены).
 * Смена заступает в 07:30 и сдаёт дежурство следующим утром в 07:30.
 */
export function getShiftForDate(date: Date): ShiftInfo {
  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)

  const baseDate = new Date(BASE_DATE)
  baseDate.setHours(0, 0, 0, 0)

  const daysDiff = Math.floor((targetDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))

  // Каждый день принадлежит одной из 4 смен (0→BASE_SHIFT, 1→+1, 2→+2, 3→+3)
  const cyclePosition = ((daysDiff % 4) + 4) % 4
  const shiftNumber = (((BASE_SHIFT - 1 + cyclePosition) % 4) + 1) as 1 | 2 | 3 | 4

  const chief = SHIFT_CHIEFS.find(c => c.no === shiftNumber)!

  const shiftStartDate = new Date(targetDate)
  shiftStartDate.setHours(SHIFT_HOUR, SHIFT_MINUTE, 0, 0)

  return {
    shiftNumber,
    shiftName: `Смена №${shiftNumber}`,
    shiftStartDate,
    chiefName: chief.fullName,
    chiefTabNumber: chief.tab,
    isWorking: true,
    period: 'both'
  }
}

/**
 * Получить текущую дежурную смену.
 * До 07:30 дежурит смена, заступившая вчера в 07:30.
 */
export function getCurrentShift(): ShiftInfo {
  const now = new Date()
  const beforeHandover = now.getHours() < SHIFT_HOUR || (now.getHours() === SHIFT_HOUR && now.getMinutes() < SHIFT_MINUTE)
  if (beforeHandover) {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    return getShiftForDate(yesterday)
  }
  return getShiftForDate(now)
}


/**
 * Определить период дня (день/ночь)
 */
export function getCurrentPeriod(): 'day' | 'night' {
  const hour = new Date().getHours()
  // День: 07:00-19:00, Ночь: 19:00-07:00
  return (hour >= 7 && hour < 19) ? 'day' : 'night'
}

/**
 * Получить текст периода
 */
export function getPeriodText(period: 'day' | 'night'): string {
  return period === 'day' ? 'ДНЕВНАЯ (07:00-19:00)' : 'НОЧНАЯ (19:00-07:00)'
}

/**
 * Форматировать дату для отображения
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)
}

/**
 * Форматировать время для отображения
 */
export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date)
}

// ============================================
// Phase 04: Employee schedule resolution
// ============================================

export interface ShiftResolution {
  isWorking: boolean
  shiftType: 'DAY' | 'NIGHT' | null  // null when isWorking=false
}

/**
 * Determine if an employee is working on a given date and whether it is DAY or NIGHT.
 * Uses the employee's schedule type and shift_reference_date anchor.
 * Follows the same date normalization pattern as getShiftForDate (setHours(0,0,0,0)).
 */
export function resolveShiftForDate(
  assignment: {
    schedule_code: string
    shift_reference_date: string | null
    rotation_group: string | null
    is_driver: boolean
  },
  date: Date
): ShiftResolution {
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)

  const { schedule_code, shift_reference_date, rotation_group } = assignment

  if (schedule_code === '5/2') {
    const dow = target.getDay()  // 0=Sun, 6=Sat
    const isWorking = dow !== 0 && dow !== 6
    return { isWorking, shiftType: isWorking ? 'DAY' : null }
  }

  // All other schedules require shift_reference_date
  if (!shift_reference_date) {
    return { isWorking: false, shiftType: null }
  }

  const ref = new Date(shift_reference_date)
  ref.setHours(0, 0, 0, 0)
  const daysElapsed = Math.floor((target.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24))

  if (schedule_code === 'сутки/3' || schedule_code === '1/3') {
    const isWorking = daysElapsed % 4 === 0
    return { isWorking, shiftType: isWorking ? 'NIGHT' : null }
  }

  if (schedule_code === '3/3') {
    const isWorking = daysElapsed % 6 < 3
    return { isWorking, shiftType: isWorking ? 'DAY' : null }
  }

  if (schedule_code === '6/6') {
    const periodDay = daysElapsed % 12
    const isWorking = periodDay < 6
    // Drivers: alternating day/night (placeholder — is_driver deferred, treat as DAY)
    return { isWorking, shiftType: isWorking ? 'DAY' : null }
  }

  if (schedule_code === '15/15') {
    const dayOfMonth = target.getDate()
    let isWorking: boolean
    if (rotation_group === '2') {
      isWorking = dayOfMonth >= 16
    } else if (rotation_group === '2_1') {
      isWorking = daysElapsed % 30 < 15
    } else {
      // group '1' and bare '15/15'
      isWorking = dayOfMonth >= 1 && dayOfMonth <= 15
    }
    return { isWorking, shiftType: isWorking ? 'DAY' : null }
  }

  // Unknown schedule code — conservative fallback
  return { isWorking: false, shiftType: null }
}
