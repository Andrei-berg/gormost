// Single source of truth for the internal daily work schedule (распорядок дня).
// Official: «Внутренний трудовой распорядок дня» участка «Гормост-Лефортово»,
// утв. 10.01.2025. Use these helpers everywhere instead of hardcoding hours.
//
// Дежурная смена (суточники, 07:30→07:30): день-фаза 08:00–19:00, перерыв
// 19:00–21:00 (ужин/отдых — НЕ работа), ночь-фаза 21:00–07:00.
// ИТР (дневники 5/2): 07:30–16:30, обед 12:00–12:45.

import type { ShiftType } from '@/types'

export interface ShiftHours {
  emoji: string
  label: string       // 'День' / 'Ночь'
  shiftStart: string  // заступление на смену
  shiftEnd: string
  workStart: string   // начало производства работ
  workEnd: string
}

export const SHIFT_HOURS: Record<ShiftType, ShiftHours> = {
  DAY:   { emoji: '☀️', label: 'День', shiftStart: '07:30', shiftEnd: '19:00', workStart: '08:00', workEnd: '19:00' },
  NIGHT: { emoji: '🌙', label: 'Ночь', shiftStart: '21:00', shiftEnd: '07:00', workStart: '21:00', workEnd: '07:00' },
}

// ИТР с ежедневным графиком (дневники 5/2)
export const ITR_HOURS = { start: '07:30', end: '16:30', lunch: '12:00–12:45' } as const

// Распорядок дежурной смены (для справки/отображения)
export const DUTY_ROSTER: Array<{ time: string; activity: string }> = [
  { time: '07:30–08:00', activity: 'Проверка состава смены, инструктаж, постановка задач (заступление)' },
  { time: '08:00–12:00', activity: 'Производство работ (день)' },
  { time: '12:00–13:00', activity: 'Обед, отдых' },
  { time: '13:00–19:00', activity: 'Производство работ (день)' },
  { time: '19:00–21:00', activity: 'Ужин, отдых, подготовка к ночной работе' },
  { time: '21:00–07:00', activity: 'Производство работ (ночь)' },
  { time: '07:00–07:30', activity: 'Сдача дежурства, уборка, анализ' },
]

/** '07:30–19:00' / '21:00–07:00' */
export const shiftHours = (t: ShiftType): string => `${SHIFT_HOURS[t].shiftStart}–${SHIFT_HOURS[t].shiftEnd}`

/** '☀️ 07:30–19:00' / '🌙 21:00–07:00' */
export const shiftEmojiHours = (t: ShiftType): string => `${SHIFT_HOURS[t].emoji} ${shiftHours(t)}`

/** '☀️ День · 07:30–19:00' / '🌙 Ночь · 21:00–07:00' */
export const shiftLabel = (t: ShiftType): string => `${SHIFT_HOURS[t].emoji} ${SHIFT_HOURS[t].label} · ${shiftHours(t)}`

/** Default наряд work time for a shift: day → 08:00–19:00, night → 21:00–07:00 */
export const shiftWorkTimes = (t: ShiftType): { start: string; end: string } =>
  ({ start: SHIFT_HOURS[t].workStart, end: SHIFT_HOURS[t].workEnd })
