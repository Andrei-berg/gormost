// Утилита для расчёта смен
// База: 2 января 2025 = 4 смена (Станишевский А.В.)

export interface ShiftInfo {
  shiftNumber: 1 | 2 | 3 | 4
  shiftName: string
  chiefName: string
  chiefTabNumber: string
  isWorking: boolean
  period: 'day' | 'night' | 'both'
}

const SHIFT_CHIEFS = [
  { no: 1, name: 'Чекин А.В.', tab: '0000-00001' },
  { no: 2, name: 'Максимов И.Н.', tab: '0000-00002' },
  { no: 3, name: 'Кожин В.М.', tab: '0000-00003' },
  { no: 4, name: 'Станишевский А.В.', tab: '0000-00004' }
]

// Базовая дата: 2 января 2025 = смена 4
const BASE_DATE = new Date('2025-01-02')
const BASE_SHIFT = 4

/**
 * Получить информацию о смене на конкретную дату
 */
export function getShiftForDate(date: Date): ShiftInfo {
  // Обнуляем время для точного расчёта дней
  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)
  
  const baseDate = new Date(BASE_DATE)
  baseDate.setHours(0, 0, 0, 0)
  
  // Разница в днях
  const daysDiff = Math.floor((targetDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // Определяем позицию в 4-дневном цикле (сутки/трое)
  const cyclePosition = daysDiff % 4
  
  // Рабочий день (0-й день цикла)
  const isWorking = cyclePosition === 0
  
  // Номер смены (сдвиг от базовой)
  let shiftNumber: 1 | 2 | 3 | 4
  if (isWorking) {
    const shiftsCycled = Math.floor(daysDiff / 4)
    shiftNumber = ((BASE_SHIFT - 1 + shiftsCycled) % 4 + 1) as 1 | 2 | 3 | 4
  } else {
    // В дни отдыха показываем следующую рабочую смену
    const daysUntilWork = 4 - cyclePosition
    const nextWorkDate = new Date(targetDate)
    nextWorkDate.setDate(targetDate.getDate() + daysUntilWork)
    return getShiftForDate(nextWorkDate)
  }
  
  const chief = SHIFT_CHIEFS.find(c => c.no === shiftNumber)!
  
  // SHIFT-DA-1-3 работает КРУГЛОСУТОЧНО (день + ночь)
  return {
    shiftNumber,
    shiftName: `SHIFT-DA-${shiftNumber}-3`,
    chiefName: chief.name,
    chiefTabNumber: chief.tab,
    isWorking,
    period: 'both' // сутки
  }
}

/**
 * Получить текущую смену
 */
export function getCurrentShift(): ShiftInfo {
  return getShiftForDate(new Date())
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
