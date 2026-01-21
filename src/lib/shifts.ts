// ============================================
// ОПРЕДЕЛЕНИЕ СМЕНЫ
// ============================================

export type ShiftInfo = {
  shiftNo: number;
  shiftName: string;
  shiftChief: string;
  shiftType: 'DAY' | 'NIGHT';
  startTime: string;
  endTime: string;
};

export function getCurrentShift(date: Date = new Date()): ShiftInfo {
  const hour = date.getHours();
  
  // Смена 2 и 4: 07:00-19:00 (ДЕНЬ)
  // Смена 1 и 3: 21:00-07:00 (НОЧЬ)
  
  // Определяем день недели (0 = воскресенье, 1 = понедельник, ...)
  const dayOfWeek = date.getDay();
  
  // Простая логика: чередуем смены по дням
  // Можно улучшить, добавив календарь смен
  
  if (hour >= 7 && hour < 19) {
    // Дневная смена (2 или 4)
    if (dayOfWeek % 2 === 0) {
      return {
        shiftNo: 2,
        shiftName: 'Смена 2 (Максимов И.Н.)',
        shiftChief: 'Максимов И.Н.',
        shiftType: 'DAY',
        startTime: '07:00',
        endTime: '19:00',
      };
    } else {
      return {
        shiftNo: 4,
        shiftName: 'Смена 4 (Станишевский А.В.)',
        shiftChief: 'Станишевский А.В.',
        shiftType: 'DAY',
        startTime: '07:00',
        endTime: '19:00',
      };
    }
  } else {
    // Ночная смена (1 или 3)
    if (dayOfWeek % 2 === 0) {
      return {
        shiftNo: 1,
        shiftName: 'Смена 1 (Чекин А.В.)',
        shiftChief: 'Чекин А.В.',
        shiftType: 'NIGHT',
        startTime: '21:00',
        endTime: '07:00',
      };
    } else {
      return {
        shiftNo: 3,
        shiftName: 'Смена 3 (Кожин В.М.)',
        shiftChief: 'Кожин В.М.',
        shiftType: 'NIGHT',
        startTime: '21:00',
        endTime: '07:00',
      };
    }
  }
}

// Для 21 января 2026 (вторник) возвращаем Смену 4
export function getShiftForDate(date: Date): ShiftInfo {
  return getCurrentShift(date);
}
